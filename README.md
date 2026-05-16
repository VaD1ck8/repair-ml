# 🔧 Repair Services — ML Pipeline

Маркетплейс ремонтних послуг з автоматичною генерацією уточнюючих питань
через LLM. Складається з:

- **Backend** — FastAPI + SQLAlchemy + SQLite
- **Frontend** — React (Vite)
- **ML-компонент** — Anthropic Claude API для динамічної генерації питань

## 📋 Архітектура

```
┌──────────┐  1. вибір сервісу    ┌──────────┐  2. /questions/generate  ┌──────────┐
│  Клієнт  │ ───────────────────► │ FastAPI  │ ───────────────────────► │ Anthropic│
│ (React)  │                      │ Backend  │                          │   API    │
│          │ ◄─────────────────── │          │ ◄─────────────────────── │          │
│          │  3. динамічна форма  │          │   4. JSON з питаннями    └──────────┘
│          │ ────відповіді──────► │          │
└──────────┘                      │          │
                                  │  SQLite  │
┌──────────┐                      │          │
│Виконавець│ ◄── 5. список зая─── │          │
│ (React)  │ ─── 6. accept ─────► │          │
└──────────┘                      └──────────┘
```

## 🚀 Запуск

### Backend (порт 8000)

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# відкрий .env і встав ANTHROPIC_API_KEY (опціонально — без нього
# модель віддасть fallback-питання)

uvicorn app.main:app --reload --port 8000
```

Swagger UI: <http://localhost:8000/docs>

### Frontend (порт 5173)

```bash
cd frontend
npm install
npm run dev
```

Відкрий <http://localhost:5173>

> Vite автоматично проксює `/api/*` на бекенд (`localhost:8000`).

## 🧪 Сценарій тестування

1. **Клієнт** → обирає сервіс (напр. «Сантехніка»)
2. Опціонально пише короткий опис проблеми
3. Тисне «Далі» → бек викликає LLM, повертає 4-6 уточнюючих питань
4. Клієнт заповнює відповіді + контактні дані → «Відправити»
5. Перемикаємось на **Виконавця** → бачимо нову заявку у списку
6. Виконавець відкриває заявку → бачить всі відповіді → «Прийняти в роботу»
7. Виконавець може позначити її «Виконаною»

## 📁 Структура

```
repair-ml/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models.py            # ORM моделі: Service, Order
│   │   ├── schemas.py           # Pydantic схеми
│   │   ├── llm_service.py       # ★ ML-компонент (генерація питань)
│   │   ├── seed.py              # Початкові дані
│   │   └── routers/
│   │       ├── services.py      # GET /services
│   │       ├── questions.py     # POST /questions/generate
│   │       └── orders.py        # CRUD заявок
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx              # Усі екрани (Client / Contractor)
    │   ├── api.js               # Обгортка над fetch
    │   ├── main.jsx
    │   └── styles.css
    ├── package.json
    └── vite.config.js
```

## 🔌 API endpoints

| Метод | Шлях                          | Опис                                |
| ----- | ----------------------------- | ----------------------------------- |
| GET   | `/services`                   | Список доступних сервісів           |
| POST  | `/questions/generate`         | Згенерувати питання під сервіс (ML) |
| POST  | `/orders`                     | Створити нову заявку                |
| GET   | `/orders?status=new`          | Список заявок (фільтр опціональний) |
| GET   | `/orders/{id}`                | Деталі заявки                       |
| POST  | `/orders/{id}/accept`         | Виконавець приймає в роботу         |
| POST  | `/orders/{id}/complete`       | Позначити виконаною                 |

Приклад запиту до ML:

```bash
curl -X POST http://localhost:8000/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"service_id": 1, "description": "тече кран на кухні"}'
```

## 🧠 Як працює ML-компонент

Файл: `backend/app/llm_service.py`

1. Приймає назву сервісу + опис проблеми
2. Формує prompt з інструкцією генерувати 4-6 питань у JSON-форматі
3. Викликає Anthropic Claude API (`claude-haiku-4-5`)
4. Парсить JSON-відповідь, валідує типи питань (`text`/`textarea`/`select`/`number`)
5. Якщо щось пішло не так — повертає fallback-набір

**Замінити модель / провайдера** легко: вся логіка інкапсульована в одній функції
`generate_questions()`. Можна підключити локальну HuggingFace-модель, OpenAI, тощо.

## 🛠 Куди розширювати

- **Авторизація** — JWT, окремі ролі client/contractor у БД
- **Матчинг** — вектор сервіс+опис, шукати найближчих виконавців
- **Класифікатор сервісу** — нехай користувач описує проблему вільним
  текстом, а sklearn/sentence-transformers сам визначає категорію
- **PostgreSQL** замість SQLite — просто змініть `DATABASE_URL` у `.env`
- **Telegram-нотифікації** виконавцям про нові заявки
