import json
import re
from functools import lru_cache

import google.generativeai as genai

from app.config import get_settings

CATEGORIES = ["Billing", "Technical", "Account", "General"]
SENTIMENTS = ["Positive", "Neutral", "Negative"]

FALLBACK_RESPONSE = (
    "I wasn't able to find enough information in our documentation to fully resolve your "
    "specific situation. I've escalated this ticket to a human support specialist who will "
    "review your case and respond with personalized guidance within our standard SLA window. "
    "If you have screenshots, error messages, or account details, please reply here to speed "
    "up resolution."
)

GENERIC_PHRASES = [
    "thank you for contacting",
    "thank you for reaching out",
    "we've received your request",
    "we have received your request",
    "our team is reviewing",
    "our team will review",
    "will follow up shortly",
    "follow up with personalized",
    "a human agent will",
    "support specialist will review your ticket shortly",
]


@lru_cache(maxsize=1)
def _configure():
    settings = get_settings()
    if settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)


def _model():
    _configure()
    settings = get_settings()
    return genai.GenerativeModel(settings.gemini_model)


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def classify_and_sentiment(title: str, description: str) -> tuple[str, str]:
    settings = get_settings()
    if not settings.gemini_api_key:
        return _heuristic_category(description), _heuristic_sentiment(description)

    prompt = f"""Analyze this support ticket and respond ONLY with JSON:
{{"category": "Billing|Technical|Account|General", "sentiment": "Positive|Neutral|Negative"}}

Title: {title}
Description: {description}"""

    try:
        response = _model().generate_content(prompt)
        data = _extract_json(response.text or "")
        category = data.get("category", "General")
        sentiment = data.get("sentiment", "Neutral")
        if category not in CATEGORIES:
            category = "General"
        if sentiment not in SENTIMENTS:
            sentiment = "Neutral"
        return category, sentiment
    except Exception:
        return _heuristic_category(description), _heuristic_sentiment(description)


def generate_grounded_response(
    title: str,
    description: str,
    context_chunks: list[dict],
) -> str:
    settings = get_settings()
    if not context_chunks:
        return FALLBACK_RESPONSE
    if not settings.gemini_api_key:
        return _actionable_from_chunks(title, description, context_chunks)

    context = "\n".join(
        f"- [{c['filename']}]: {c['text'][:500]}" for c in context_chunks[:4]
    )
    prompt = f"""You are a senior SupportAI support engineer. Write a solution-oriented reply using ONLY the reference notes below.

Your goal: help the customer fix or progress their issue NOW — not merely acknowledge it.

REQUIRED structure (use these section labels):
**Understanding your issue** — One sentence naming their specific problem (from the ticket).

**Steps to resolve** — Numbered list (minimum 2 items) of concrete troubleshooting steps, settings to check, or actions to take. Each step must come from the reference notes (paraphrased, not copied verbatim).

**Recommendations** — 1–2 best-practice tips relevant to their case.

**What to do next** — One clear next action for the customer (e.g. verify result, retry, gather logs). Only mention human escalation if notes are insufficient.

Rules:
- Be specific: include paths (Settings > …), timeframes, limits, or policies from the notes when available.
- Do NOT write generic acknowledgments ("thank you for contacting us", "we've received your request", "our team is reviewing").
- Do NOT paste raw documentation or mention file names / knowledge base.
- Under 220 words.
- If reference notes cannot answer this specific ticket, respond EXACTLY with:
"{FALLBACK_RESPONSE}"

Customer ticket:
Title: {title}
Issue: {description}

Reference notes (grounding only):
{context}

Write the customer-facing reply:"""

    try:
        response = _model().generate_content(prompt)
        text = (response.text or "").strip()
        if not text or _looks_like_raw_chunk_dump(text):
            return _actionable_from_chunks(title, description, context_chunks)
        text = _polish_response(text)
        if text == FALLBACK_RESPONSE:
            return text
        if _looks_like_generic_ack(text):
            return _actionable_from_chunks(title, description, context_chunks)
        return text
    except Exception:
        return _actionable_from_chunks(title, description, context_chunks)


def _looks_like_raw_chunk_dump(text: str) -> bool:
    markers = [
        "SupportAI Billing -",
        "SupportAI Technical -",
        "SupportAI Account -",
        "SupportAI General -",
    ]
    if any(m in text for m in markers):
        return True
    if text.count("---") >= 2 and len(text) > 400:
        return True
    return False


def _looks_like_generic_ack(text: str) -> bool:
    lower = text.lower()
    generic_hits = sum(1 for p in GENERIC_PHRASES if p in lower)
    has_numbered_steps = bool(re.search(r"(^\s*\d+[\.)]|^\s*[-*•]\s)", text, re.MULTILINE))
    has_steps_section = "steps to resolve" in lower or "**steps" in lower
    if generic_hits >= 2 and not has_numbered_steps and not has_steps_section:
        return True
    if len(text) < 120 and generic_hits >= 1:
        return True
    return False


def _polish_response(text: str) -> str:
    text = text.strip()
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1].strip()
    if FALLBACK_RESPONSE[:40] in text:
        return FALLBACK_RESPONSE
    return text or FALLBACK_RESPONSE


def _extract_action_lines(text: str, max_lines: int = 4) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.replace("\n", " "))
    lines = []
    for s in sentences:
        s = s.strip()
        if len(s) < 25 or len(s) > 200:
            continue
        lower = s.lower()
        if any(skip in lower for skip in ("supportai", "copyright", "document")):
            continue
        lines.append(s)
        if len(lines) >= max_lines:
            break
    return lines


def _actionable_from_chunks(title: str, description: str, chunks: list[dict]) -> str:
    """Build a structured actionable reply when Gemini is unavailable or too generic."""
    if not chunks:
        return FALLBACK_RESPONSE

    actions: list[str] = []
    for chunk in chunks[:3]:
        for line in _extract_action_lines(chunk["text"], max_lines=2):
            if line not in actions:
                actions.append(line)
            if len(actions) >= 4:
                break
        if len(actions) >= 4:
            break

    if not actions:
        return FALLBACK_RESPONSE

    steps = "\n".join(f"{i}. {a}" for i, a in enumerate(actions, 1))
    issue = title.strip() or "your request"
    return (
        f"**Understanding your issue**\n"
        f"You asked about: {issue}.\n\n"
        f"**Steps to resolve**\n"
        f"{steps}\n\n"
        f"**What to do next**\n"
        f"Try the steps above in order. If the issue persists, reply on this ticket with "
        f"what you tried and any error messages so we can assist further."
    )


def _heuristic_category(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ["bill", "payment", "invoice", "refund", "charge"]):
        return "Billing"
    if any(w in lower for w in ["login", "password", "account", "profile", "email"]):
        return "Account"
    if any(w in lower for w in ["error", "bug", "api", "server", "crash", "install"]):
        return "Technical"
    return "General"


def _heuristic_sentiment(text: str) -> str:
    lower = text.lower()
    negative = ["angry", "frustrated", "terrible", "worst", "broken", "urgent", "unacceptable"]
    positive = ["thank", "great", "appreciate", "excellent", "love"]
    if any(w in lower for w in negative):
        return "Negative"
    if any(w in lower for w in positive):
        return "Positive"
    return "Neutral"
