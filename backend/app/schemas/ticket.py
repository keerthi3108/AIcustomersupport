from datetime import datetime
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10, max_length=5000)
    priority: str | None = "Medium"


class TicketUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    category: str | None = None


class MessageRequest(BaseModel):
    content: str = Field(min_length=2, max_length=5000)


class AdminReplyRequest(MessageRequest):
    content: str = Field(min_length=5, max_length=5000)


class TicketMessageResponse(BaseModel):
    id: int
    sender: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class TicketSourceResponse(BaseModel):
    id: int
    filename: str
    chunk_preview: str
    relevance_score: float

    class Config:
        from_attributes = True


class TicketListItem(BaseModel):
    id: int
    title: str
    category: str
    priority: str
    status: str
    sentiment: str
    sla_breached: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TicketResponse(TicketListItem):
    description: str
    ai_response: str | None
    user_id: int
    sla_deadline: datetime | None
    resolved_at: datetime | None
    feedback_rating: int | None

    class Config:
        from_attributes = True


class TicketDetailResponse(TicketResponse):
    messages: list[TicketMessageResponse] = []
    sources: list[TicketSourceResponse] = []
    sla_status: str = "On Track"
    sla_hours_remaining: float | None = None
    resolution_hours: float | None = None
    user_name: str | None = None


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
