from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ServiceOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionRequest(BaseModel):
    service_id: int
    description: Optional[str] = ""


class Question(BaseModel):
    id: str
    label: str
    type: str  # text | textarea | select | number
    options: Optional[List[str]] = None


class QuestionsResponse(BaseModel):
    service_id: int
    questions: List[Question]


class OrderCreate(BaseModel):
    service_id: int
    client_name: str = Field(min_length=1)
    client_contact: Optional[str] = ""
    description: Optional[str] = ""
    questions: List[Dict[str, Any]]
    answers: Dict[str, Any]


class OrderOut(BaseModel):
    id: int
    service_id: int
    service_name: Optional[str] = None
    client_name: str
    client_contact: Optional[str] = ""
    description: Optional[str] = ""
    questions: List[Dict[str, Any]] = []
    answers: Dict[str, Any] = {}
    status: str
    contractor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderAccept(BaseModel):
    contractor_name: str = Field(min_length=1)
