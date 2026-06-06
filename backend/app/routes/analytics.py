from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.auth.dependencies import get_current_user, require_admin
from app.database.mongodb import get_db
from app.schemas.analytics import AnalyticsOverview, EvaluationMetrics
from app.services.analytics_service import get_analytics, get_evaluation_metrics

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(admin=Depends(require_admin), db: Database = Depends(get_db)):
    return get_analytics(db)


@router.get("/evaluation", response_model=EvaluationMetrics)
def evaluation_metrics(
    user=Depends(get_current_user),
    db: Database = Depends(get_db),
):
    return get_evaluation_metrics(db)
