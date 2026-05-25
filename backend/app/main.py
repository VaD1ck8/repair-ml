from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .seed import seed_services
from .routers import services, orders, analyze

Base.metadata.create_all(bind=engine)
seed_services()

app = FastAPI(title="Repair Services API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services.router)
app.include_router(orders.router)
app.include_router(analyze.router)
