"""Початкове наповнення таблиці сервісів."""
from app.database import SessionLocal
from app.models import Service

SERVICES = [
    {"name": "Сантехніка", "category": "Дім",
     "description": "Ремонт труб, кранів, бойлерів, унітазів"},
    {"name": "Електрика", "category": "Дім",
     "description": "Електромонтаж, заміна проводки, розеток"},
    {"name": "Ремонт побутової техніки", "category": "Дім",
     "description": "Холодильники, пральні машини, плити"},
    {"name": "Ремонт меблів", "category": "Дім",
     "description": "Реставрація, збірка, перетяжка"},
    {"name": "Малярні роботи", "category": "Ремонт",
     "description": "Фарбування, шпаклівка, шпалери"},
    {"name": "Ремонт квартир", "category": "Ремонт",
     "description": "Комплексний ремонт приміщень"},
    {"name": "Ремонт авто", "category": "Авто",
     "description": "Діагностика та ремонт автомобілів"},
    {"name": "Комп'ютерний ремонт", "category": "Електроніка",
     "description": "Ремонт ПК, ноутбуків, чистка"},
    {"name": "Ремонт телефонів", "category": "Електроніка",
     "description": "Заміна екранів, акумуляторів"},
    {"name": "Кондиціонери", "category": "Дім",
     "description": "Установка, чистка, заправка фреоном"},
]


def seed_services() -> None:
    db = SessionLocal()
    try:
        if db.query(Service).count() == 0:
            for s in SERVICES:
                db.add(Service(**s))
            db.commit()
            print(f"✓ Seeded {len(SERVICES)} services")
    finally:
        db.close()
