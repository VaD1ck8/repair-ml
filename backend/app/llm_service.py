import os
import json
import re
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

FALLBACK = {
    "service_name": "Загальний ремонт",
    "service_id": None,
    "questions": [
        {"id": "q1", "label": "Опишіть проблему детальніше", "type": "textarea"},
        {"id": "q2", "label": "Коли це сталося?", "type": "text"},
        {"id": "q3", "label": "Були подібні проблеми раніше?", "type": "yesno"},
        {"id": "q4", "label": "Бюджет на ремонт (грн)", "type": "number"},
    ]
}


def _call_llm(prompt: str) -> str:
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=900,
        temperature=0.4,
    )
    return resp.choices[0].message.content.strip()


def analyze_problem(description: str, services: list[dict]) -> dict:
    service_lines = "\n".join(
        f"  {s['id']}. {s['name']} — {s['description']}" for s in services
    )

    prompt = f"""Ти — розумний диспетчер сервісного центру. Клієнт описав проблему.

Твоя задача:
1. Визначити до якої категорії відноситься поломка (з наданого списку)
2. Придумати 4-8 уточнюючих питань саме під цю конкретну поломку

Список категорій сервісу:
{service_lines}

Проблема клієнта: «{description}»

Правила для питань:
- Питання мають бути конкретними під цю поломку, не загальними
- Типи питань: "yesno" (Так/Ні), "select" (варіанти), "text" (короткий текст), "textarea" (довгий текст), "number" (число)
- Для "select" і "yesno" обов'язково вкажи "options"
- Питання мають допомогти майстру зрозуміти масштаб і характер проблеми

Відповідай ТІЛЬКИ валідним JSON без markdown:
{{
  "service_id": <id з списку або null>,
  "service_name": "<назва категорії>",
  "questions": [
    {{"id": "q1", "label": "Текст питання", "type": "yesno", "options": ["Так", "Ні"]}},
    {{"id": "q2", "label": "Текст питання", "type": "select", "options": ["варіант1", "варіант2", "варіант3"]}},
    {{"id": "q3", "label": "Текст питання", "type": "text"}},
    {{"id": "q4", "label": "Текст питання", "type": "number"}}
  ]
}}"""

    try:
        raw = _call_llm(prompt)
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        if "questions" in data and isinstance(data["questions"], list):
            return {
                "service_id": data.get("service_id"),
                "service_name": data.get("service_name", "Ремонт"),
                "questions": data["questions"],
            }
    except Exception as e:
        print(f"[LLM ERROR] {e}")

    return FALLBACK
