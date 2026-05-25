from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator


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
    type: str
    options: Optional[List[str]] = None


class QuestionsResponse(BaseModel):
    service_id: int
    questions: List[Question]


class OrderCreate(BaseModel):
    service_id: Optional[int] = None
    client_name: str = Field(min_length=1)
    client_contact: Optional[str] = ""
    client_phone: Optional[str] = None
    description: Optional[str] = ""
    questions: Optional[List[Dict[str, Any]]] = []
    answers: Optional[Dict[str, Any]] = {}

    @model_validator(mode="after")
    def fill_contact(self):
        if not self.client_contact and self.client_phone:
            self.client_contact = self.client_phone
        return self


class OrderOut(BaseModel):
    id: int
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    client_name: str
    client_contact: Optional[str] = ""
    description: Optional[str] = ""
    questions: Optional[List[Dict[str, Any]]] = []
    answers: Optional[Dict[str, Any]] = {}
    status: str
    contractor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderAccept(BaseModel):
    contractor_name: Optional[str] = "Виконавець"