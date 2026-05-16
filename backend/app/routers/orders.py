from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order, Service
from app.schemas import OrderCreate, OrderOut, OrderAccept

router = APIRouter(prefix="/orders", tags=["orders"])


def to_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        service_id=order.service_id,
        service_name=order.service.name if order.service else None,
        client_name=order.client_name,
        client_contact=order.client_contact or "",
        description=order.description or "",
        questions=order.questions or [],
        answers=order.answers or {},
        status=order.status,
        contractor_name=order.contractor_name,
        created_at=order.created_at,
    )


@router.post("", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    """Створення нової заявки клієнтом (з відповідями на ML-питання)."""
    service = db.query(Service).get(payload.service_id)
    if not service:
        raise HTTPException(404, "Service not found")

    order = Order(
        service_id=payload.service_id,
        client_name=payload.client_name,
        client_contact=payload.client_contact or "",
        description=payload.description or "",
        questions=payload.questions,
        answers=payload.answers,
        status="new",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return to_out(order)


@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = Query(None, description="new | accepted | done"),
    db: Session = Depends(get_db),
):
    """Список заявок (для виконавця). Опціональний фільтр за статусом."""
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    orders = q.order_by(Order.created_at.desc()).all()
    return [to_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return to_out(order)


@router.post("/{order_id}/accept", response_model=OrderOut)
def accept_order(order_id: int, payload: OrderAccept, db: Session = Depends(get_db)):
    """Виконавець приймає заявку в роботу."""
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "new":
        raise HTTPException(400, f"Order is in status '{order.status}', cannot accept")

    order.status = "accepted"
    order.contractor_name = payload.contractor_name
    db.commit()
    db.refresh(order)
    return to_out(order)


@router.post("/{order_id}/complete", response_model=OrderOut)
def complete_order(order_id: int, db: Session = Depends(get_db)):
    """Позначити заявку виконаною."""
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "accepted":
        raise HTTPException(400, f"Order is in status '{order.status}', cannot complete")

    order.status = "done"
    db.commit()
    db.refresh(order)
    return to_out(order)
