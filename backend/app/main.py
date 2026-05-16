"""FastAPI ентрі-поінт."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.seed import seed_services
from app.routers import services, questions, orders

# Створюємо таблиці і сидимо сервіси
Base.metadata.create_all(bind=engine)
seed_services()

app = FastAPI(
    title="Repair Services ML API",
    description="Бекенд маркетплейсу ремонтних послуг з ML-генерацією уточнюючих питань",
    version="0.1.0",
)

# CORS — дозволяємо фронт з Vite (5173) та інші локальні origin'и
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services.router)
app.include_router(questions.router)
app.include_router(orders.router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Repair ML API",
        "docs": "/docs",
    }
