from datetime import datetime, timedelta, timezone

from app.config import get_settings


def sla_hours_for_priority(priority: str) -> int:
    settings = get_settings()
    mapping = {
        "Low": settings.sla_hours_low,
        "Medium": settings.sla_hours_medium,
        "High": settings.sla_hours_high,
    }
    return mapping.get(priority, settings.sla_hours_medium)


def compute_sla_deadline(priority: str, created_at: datetime | None = None) -> datetime:
    base = created_at or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    return base + timedelta(hours=sla_hours_for_priority(priority))


def sla_status_label(deadline: datetime | None, resolved_at: datetime | None, breached: bool) -> str:
    if resolved_at:
        return "Breached" if breached else "Met"
    if not deadline:
        return "On Track"
    now = datetime.now(timezone.utc)
    dl = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    if now > dl:
        return "Breached"
    hours_left = (dl - now).total_seconds() / 3600
    if hours_left < 6:
        return "At Risk"
    return "On Track"
