from pydantic import BaseModel


class ChartPoint(BaseModel):
    label: str
    value: float


class AnalyticsOverview(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    escalated_tickets: int
    sla_compliance_percent: float
    sentiment_overview: dict[str, int]
    category_distribution: dict[str, int]
    monthly_trends: list[ChartPoint]
    sentiment_distribution: list[ChartPoint]
    category_chart: list[ChartPoint]
    resolution_time_analysis: list[ChartPoint]
    sla_performance: list[ChartPoint]
    avg_resolution_hours: float


class EvaluationMetrics(BaseModel):
    classification_accuracy: float
    retrieval_accuracy: float
    avg_response_time_ms: float
    avg_feedback_rating: float
