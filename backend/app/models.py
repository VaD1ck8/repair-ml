from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Service(Base):
    """Каталог сервісів ремонту."""
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    description = Column(Text)
    category = Column(String(100))


class Order(Base):
    """Заявка від клієнта."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    service = relationship("Service")

    client_name = Column(String(200), nullable=False)
    client_contact = Column(String(200), default="")
    description = Column(Text, default="")

    # ML-згенеровані питання та відповіді клієнта на них
    questions = Column(JSON, default=list)   # [{id, label, type, options?}, ...]
    answers = Column(JSON, default=dict)     # {q_id: answer}

    status = Column(String(50), default="new")  # new | accepted | done
    contractor_name = Column(String(200), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
