from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Service
from ..llm_service import classify_service

router = APIRouter()


class ClassifyRequest(BaseModel):
    description: str
    clarification_answer: str | None = None


class ClassifyResponse(BaseModel):
    status: str                  # "classified" | "needs_clarification"
    service_id: int | None = None
    service_name: str | None = None
    confidence: float | None = None
    clarification_question: str | None = None


@router.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest, db: Session = Depends(get_db)):
    services = db.query(Service).all()
    service_list = [
        {"id": s.id, "name": s.name, "description": s.description}
        for s in services
    ]

    full_text = req.description
    if req.clarification_answer:
        full_text = f"{req.description}. Уточнення: {req.clarification_answer}"

    result = classify_service(full_text, service_list)
    return result
