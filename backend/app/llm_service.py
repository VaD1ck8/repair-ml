import os
import json
import re
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

FALLBACK_QUESTIONS = [
    {"id": "q1", "label": "Опишіть проблему детальніше", "type": "textarea"},
    {"id": "q2", "label": "Коли виникла проблема?", "type": "text"},
    {"id": "q3", "label": "Ваш бюджет (грн)", "type": "number"},
    {"id": "q4", "label": "Зручний час для майстра", "type": "text"},
]


def _call_llm(prompt: str) -> str:
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()


def classify_service(description: str, services: list[dict]) -> dict:
    service_lines = "\n".join(
        f"  {s['id']}. {s['name']} — {s['description']}" for s in services
    )
    prompt = f"""Ти — класифікатор заявок сервісного маркетплейсу.

Список категорій:
{service_lines}

Заявка клієнта: «{description}»

Якщо заявка чітко відповідає одній категорії (confidence >= 0.75):
{{"status": "classified", "service_id": <id>, "service_name": "<назва>", "confidence": <float>}}

Якщо незрозуміло — постав одне коротке питання і дай 3-5 варіантів відповідей:
{{"status": "needs_clarification", "clarification_question": "<питання>", "clarification_options": ["варіант1", "варіант2", "варіант3"]}}

Відповідай ТІЛЬКИ JSON, без markdown і пояснень."""

    try:
        raw = _call_llm(prompt)
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        if data.get("status") == "classified":
            return {
                "status": "classified",
                "service_id": data["service_id"],
                "service_name": data["service_name"],
                "confidence": data.get("confidence", 0.9),
                "clarification_question": None,
                "clarification_options": None,
            }
        return {
            "status": "needs_clarification",
            "service_id": None,
            "service_name": None,
            "confidence": None,
            "clarification_question": data.get("clarification_question", "Що саме потрібно відремонтувати?"),
            "clarification_options": data.get("clarification_options", []),
        }
    except Exception:
        return {
            "status": "needs_clarification",
            "service_id": None,
            "service_name": None,
            "confidence": None,
            "clarification_question": "Що саме потрібно відремонтувати?",
            "clarification_options": [],
        }


def generate_questions(service_name: str, description: str) -> list[dict]:
    if not os.getenv("GROQ_API_KEY"):
        return FALLBACK_QUESTIONS

    prompt = f"""Ти — помічник сервісного маркетплейсу.
Сервіс: «{service_name}»
Опис проблеми клієнта: «{description}»

Згенеруй 4-6 уточнюючих питань у форматі JSON-масиву:
[
  {{"id": "q1", "label": "Питання", "type": "text|textarea|select|number|yesno",
    "options": ["варіант1", "варіант2"]}}
]
"options" — тільки для type=select або type=yesno.
Відповідай ТІЛЬКИ JSON-масивом без markdown."""

    try:
        raw = _call_llm(prompt)
        raw = re.sub(r"```json|```", "", raw).strip()
        questions = json.loads(raw)
        if isinstance(questions, list) and questions:
            return questions
    except Exception:
        pass
    return FALLBACK_QUESTIONS
