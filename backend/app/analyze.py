from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Service
from ..llm_service import analyze_problem

router = APIRouter()


class AnalyzeRequest(BaseModel):
    description: str


class Question(BaseModel):
    id: str
    label: str
    type: str
    options: list[str] | None = None


class AnalyzeResponse(BaseModel):
    service_id: int | None
    service_name: str
    questions: list[Question]


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, db: Session = Depends(get_db)):
    services = db.query(Service).all()
    service_list = [
        {"id": s.id, "name": s.name, "description": s.description}
        for s in services
    ]
    return analyze_problem(req.description, service_list)
