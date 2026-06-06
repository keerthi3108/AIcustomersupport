import time
from datetime import datetime, timezone

from pymongo.database import Database

from app.config import get_settings
from app.rag.chroma_store import get_chroma_store
from app.repositories import tickets_repo, users_repo
from app.services.gemini_service import classify_and_sentiment, generate_grounded_response
from app.utils.audit import log_action
from app.utils.sla import compute_sla_deadline, sla_status_label


def create_ticket_with_ai(
    db: Database, user, title: str, description: str, priority: str
) -> tuple[dict, float]:
    start = time.perf_counter()
    category, sentiment = classify_and_sentiment(title, description)

    settings = get_settings()
    store = get_chroma_store()
    query = f"{title}\n{description}"
    chunks = store.query(query, top_k=settings.rag_top_k, category=None)
    relevant = [c for c in chunks if c["score"] >= 0.35]

    ai_response = generate_grounded_response(title, description, relevant)

    ticket = tickets_repo.create(
        db,
        {
            "title": title,
            "description": description,
            "category": category,
            "priority": priority,
            "status": "Open",
            "sentiment": sentiment,
            "ai_response": ai_response,
            "user_id": user.id,
            "sla_deadline": compute_sla_deadline(priority),
        },
    )

    tickets_repo.add_message(db, ticket["id"], "user", description)
    if ai_response:
        tickets_repo.add_message(db, ticket["id"], "ai", ai_response)

    if relevant:
        tickets_repo.add_sources(
            db,
            ticket["id"],
            [
                {
                    "filename": c["filename"],
                    "chunk_preview": c["text"][:300],
                    "relevance_score": c["score"],
                }
                for c in relevant
            ],
        )

    ticket = tickets_repo.find_by_id(db, ticket["id"])
    log_action(db, f"Ticket created: #{ticket['id']}", user.id)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return ticket, elapsed_ms


def _parse_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    return value


def ticket_to_detail(ticket: dict, db: Database) -> dict:
    user = users_repo.find_by_id(db, ticket["user_id"])
    created_at = _parse_dt(ticket.get("created_at"))
    resolved_at = _parse_dt(ticket.get("resolved_at"))
    resolution_hours = None
    if resolved_at and created_at:
        resolution_hours = round((resolved_at - created_at).total_seconds() / 3600, 2)

    messages = sorted(
        ticket.get("messages", []),
        key=lambda m: m.get("created_at") or datetime.min.replace(tzinfo=timezone.utc),
    )

    return {
        "id": ticket["id"],
        "title": ticket["title"],
        "description": ticket["description"],
        "category": ticket["category"],
        "priority": ticket["priority"],
        "status": ticket["status"],
        "sentiment": ticket["sentiment"],
        "ai_response": ticket.get("ai_response"),
        "user_id": ticket["user_id"],
        "sla_deadline": ticket.get("sla_deadline"),
        "resolved_at": ticket.get("resolved_at"),
        "sla_breached": ticket.get("sla_breached", False),
        "feedback_rating": ticket.get("feedback_rating"),
        "created_at": ticket["created_at"],
        "updated_at": ticket["updated_at"],
        "messages": messages,
        "sources": ticket.get("sources", []),
        "sla_status": sla_status_label(
            ticket.get("sla_deadline"),
            ticket.get("resolved_at"),
            ticket.get("sla_breached", False),
        ),
        "sla_hours_remaining": _sla_hours_remaining(
            ticket.get("sla_deadline"), ticket.get("resolved_at")
        ),
        "resolution_hours": resolution_hours,
        "user_name": user["name"] if user else None,
    }


def _sla_hours_remaining(deadline, resolved_at) -> float | None:
    if resolved_at or not deadline:
        return None
    now = datetime.now(timezone.utc)
    dl = _parse_dt(deadline)
    if not dl:
        return None
    return round((dl - now).total_seconds() / 3600, 1)


def _conversation_context(ticket: dict, latest_user_msg: str) -> str:
    lines = [f"Subject: {ticket['title']}", f"Original issue: {ticket['description']}"]
    for m in sorted(ticket.get("messages", []), key=lambda x: x.get("created_at") or ""):
        role = {"user": "Customer", "ai": "AI", "admin": "Agent"}.get(m["sender"], m["sender"])
        lines.append(f"{role}: {m['content'][:500]}")
    lines.append(f"Customer (latest): {latest_user_msg}")
    return "\n".join(lines)


def add_user_followup(db: Database, ticket: dict, content: str, user_id: int) -> dict:
    if ticket.get("status") == "Resolved":
        raise ValueError("Cannot send messages on a resolved ticket")

    ticket = tickets_repo.add_message(db, ticket["id"], "user", content)
    ticket = tickets_repo.find_by_id(db, ticket["id"])

    settings = get_settings()
    store = get_chroma_store()
    convo = _conversation_context(ticket, content)
    chunks = store.query(convo, top_k=settings.rag_top_k, category=None)
    relevant = [c for c in chunks if c["score"] >= 0.35]

    ai_response = generate_grounded_response(ticket["title"], convo, relevant)
    if ai_response:
        tickets_repo.add_message(db, ticket["id"], "ai", ai_response)
        tickets_repo.update(db, ticket["id"], {"ai_response": ai_response})
        if relevant:
            tickets_repo.add_sources(
                db,
                ticket["id"],
                [
                    {
                        "filename": c["filename"],
                        "chunk_preview": c["text"][:300],
                        "relevance_score": c["score"],
                    }
                    for c in relevant
                ],
            )

    log_action(db, f"User follow-up on ticket #{ticket['id']}", user_id)
    return tickets_repo.find_by_id(db, ticket["id"])


def add_admin_reply(db: Database, ticket: dict, content: str, admin_id: int) -> dict:
    ticket = tickets_repo.add_message(db, ticket["id"], "admin", content)
    if ticket and ticket.get("status") == "Open":
        ticket = tickets_repo.update(db, ticket["id"], {"status": "In Progress"})
    log_action(db, f"Admin reply on ticket #{ticket['id']}", admin_id)
    return ticket


def update_ticket_status(db: Database, ticket: dict, status: str, admin_id: int) -> dict:
    updates: dict = {"status": status}
    if status == "Resolved":
        updates["resolved_at"] = datetime.now(timezone.utc)
        dl = _parse_dt(ticket.get("sla_deadline"))
        if dl:
            updates["sla_breached"] = datetime.now(timezone.utc) > dl
    if status == "Escalated":
        updates["priority"] = "High"
        updates["sla_deadline"] = compute_sla_deadline("High")
    log_action(db, f"Ticket #{ticket['id']} status -> {status}", admin_id)
    return tickets_repo.update(db, ticket["id"], updates)
