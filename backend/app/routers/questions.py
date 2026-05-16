from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Service
from app.schemas import QuestionRequest, QuestionsResponse
from app.llm_service import generate_questions

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/generate", response_model=QuestionsResponse)
async def generate(req: QuestionRequest, db: Session = Depends(get_db)):
    service = db.query(Service).get(req.service_id)
    if not service:
        raise HTTPException(404, "Service not found")

    questions = await generate_questions(service.name, req.description or "")
    return QuestionsResponse(service_id=service.id, questions=questions)