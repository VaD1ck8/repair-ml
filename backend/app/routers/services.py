from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Service
from app.schemas import ServiceOut

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=List[ServiceOut])
def list_services(db: Session = Depends(get_db)):
    """Повертає каталог доступних сервісів."""
    return db.query(Service).order_by(Service.category, Service.name).all()
