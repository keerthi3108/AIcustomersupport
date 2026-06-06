from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.auth.dependencies import get_current_user, require_admin
from app.database.mongodb import get_db
from app.repositories import tickets_repo
from app.schemas.ticket import (
    AdminReplyRequest,
    FeedbackRequest,
    MessageRequest,
    TicketCreate,
    TicketDetailResponse,
    TicketListItem,
    TicketUpdate,
)
from app.services.ticket_service import (
    add_admin_reply,
    add_user_followup,
    create_ticket_with_ai,
    ticket_to_detail,
    update_ticket_status,
)
from app.utils.audit import log_action

router = APIRouter()


@router.post("", response_model=TicketDetailResponse)
def create_ticket(
    payload: TicketCreate,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    priority = payload.priority or "Medium"
    if priority not in ("Low", "Medium", "High"):
        priority = "Medium"
    ticket, _ = create_ticket_with_ai(db, user, payload.title, payload.description, priority)
    return TicketDetailResponse(**ticket_to_detail(ticket, db))


@router.get("/my", response_model=list[TicketListItem])
def my_tickets(
    status: str | None = None,
    category: str | None = None,
    search: str | None = None,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    tickets = tickets_repo.find_all(
        db, {"user_id": user.id, "status": status, "category": category, "search": search}
    )
    return [TicketListItem(**tickets_repo.ticket_list_item(t)) for t in tickets]


@router.get("/all", response_model=list[TicketListItem])
def all_tickets(
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    search: str | None = None,
    admin=Depends(require_admin),
    db: Database = Depends(get_db),
):
    tickets = tickets_repo.find_all(
        db, {"status": status, "priority": priority, "category": category, "search": search}
    )
    return [TicketListItem(**tickets_repo.ticket_list_item(t)) for t in tickets]


@router.get("/dashboard/summary")
def user_dashboard_summary(user=Depends(get_current_user), db: Database = Depends(get_db)):
    tickets = tickets_repo.find_all(db, {"user_id": user.id})
    return {
        "total": len(tickets),
        "open": sum(1 for t in tickets if t["status"] in ("Open", "In Progress")),
        "resolved": sum(1 for t in tickets if t["status"] == "Resolved"),
        "escalated": sum(1 for t in tickets if t["status"] == "Escalated"),
    }


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(
    ticket_id: int,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    ticket = tickets_repo.find_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user.role != "admin" and ticket["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return TicketDetailResponse(**ticket_to_detail(ticket, db))


@router.patch("/{ticket_id}", response_model=TicketDetailResponse)
def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    admin=Depends(require_admin),
    db: Database = Depends(get_db),
):
    ticket = tickets_repo.find_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updates = {}
    if payload.priority:
        updates["priority"] = payload.priority
    if payload.category:
        updates["category"] = payload.category
    if updates:
        ticket = tickets_repo.update(db, ticket_id, updates)
    if payload.status:
        ticket = update_ticket_status(db, ticket, payload.status, admin.id)
    log_action(db, f"Ticket #{ticket_id} updated by admin", admin.id)
    return TicketDetailResponse(**ticket_to_detail(ticket, db))


@router.post("/{ticket_id}/messages", response_model=TicketDetailResponse)
def user_message(
    ticket_id: int,
    payload: MessageRequest,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    ticket = tickets_repo.find_by_id(db, ticket_id)
    if not ticket or ticket["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.get("status") == "Resolved":
        raise HTTPException(status_code=400, detail="This ticket is resolved. Open a new ticket for further help.")
    try:
        ticket = add_user_followup(db, ticket, payload.content.strip(), user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TicketDetailResponse(**ticket_to_detail(ticket, db))


@router.post("/{ticket_id}/reply", response_model=TicketDetailResponse)
def admin_reply(
    ticket_id: int,
    payload: AdminReplyRequest,
    admin=Depends(require_admin),
    db: Database = Depends(get_db),
):
    ticket = tickets_repo.find_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket = add_admin_reply(db, ticket, payload.content.strip(), admin.id)
    return TicketDetailResponse(**ticket_to_detail(ticket, db))


@router.post("/{ticket_id}/feedback")
def submit_feedback(
    ticket_id: int,
    payload: FeedbackRequest,
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    ticket = tickets_repo.find_by_id(db, ticket_id)
    if not ticket or ticket["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    tickets_repo.update(db, ticket_id, {"feedback_rating": payload.rating})
    return {"message": "Feedback recorded", "rating": payload.rating}
