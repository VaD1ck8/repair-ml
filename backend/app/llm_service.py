import os
import json
import re
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

FALLBACK_QUESTIONS = [
    {"id": "q1", "label": "Опишіть проблему детальніше", "type": "textarea"},
    {"id": "q2", "label": "Коли виникла проблема?", "type": "text"},
    {"id": "q3", "label": "Ваш бюджет (грн)", "type": "number"},
    {"id": "q4", "label": "Зручний час для майстра", "type": "text"},
]


def _call_llm(prompt: str) -> str:
    msg = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()


def classify_service(description: str, services: list[dict]) -> dict:
    service_lines = "\n".join(
        f"  {s['id']}. {s['name']} — {s['description']}" for s in services
    )
    prompt = f"""Ти — класифікатор заявок сервісного маркетплейсу.

Список категорій:
{service_lines}

Заявка клієнта: «{description}»

Твоє завдання:
1. Якщо заявка чітко відповідає одній з категорій — відповідай JSON:
   {{"status": "classified", "service_id": <id>, "service_name": "<назва>", "confidence": <0.0-1.0>}}

2. Якщо незрозуміло яка категорія — відповідай JSON:
   {{"status": "needs_clarification", "clarification_question": "<одне коротке питання>"}}

Правила:
- confidence >= 0.75 → classified
- confidence < 0.75 → needs_clarification
- Відповідай ТІЛЬКИ JSON, без пояснень і markdown.
"""
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
            }
        return {
            "status": "needs_clarification",
            "service_id": None,
            "service_name": None,
            "confidence": None,
            "clarification_question": data.get(
                "clarification_question", "Уточніть, будь ласка, що саме потрібно відремонтувати?"
            ),
        }
    except Exception:
        return {
            "status": "needs_clarification",
            "service_id": None,
            "service_name": None,
            "confidence": None,
            "clarification_question": "Уточніть, будь ласка, що саме потрібно відремонтувати?",
        }


def generate_questions(service_name: str, description: str) -> list[dict]:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return FALLBACK_QUESTIONS

    prompt = f"""Ти — помічник сервісного маркетплейсу.
Сервіс: «{service_name}»
Опис проблеми клієнта: «{description}»

Згенеруй 4-6 уточнюючих питань для клієнта у форматі JSON-масиву:
[
  {{"id": "q1", "label": "Питання", "type": "text|textarea|select|number",
    "options": ["варіант1", "варіант2"]}}
]
"options" — тільки для type=select.
Відповідай ТІЛЬКИ JSON-масивом без markdown.
"""
    try:
        raw = _call_llm(prompt)
        raw = re.sub(r"```json|```", "", raw).strip()
        questions = json.loads(raw)
        if isinstance(questions, list) and questions:
            return questions
    except Exception:
        pass
    return FALLBACK_QUESTIONS
