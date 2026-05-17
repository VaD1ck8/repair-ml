import os
import json
import traceback
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

async def generate_questions(service_name: str, description: str = "") -> list[dict]:
    try:
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

        prompt = f"""
Ти — асистент для сервісу ремонту. Згенеруй 6-8 уточнюючих питань для заявки.
Сервіс: {service_name}
Опис проблеми: {description or "не вказано"}

Відповідай ТІЛЬКИ валідним JSON масивом без жодного тексту до або після. Без markdown.
Формат — кожен елемент ОБОВ'ЯЗКОВО має поля id, label, type, required.

Правила для типів:
- "yesno" — питання з відповіддю Так/Ні
- "select_other" — список варіантів + "Інше (вказати)" де юзер пише своє
- "select" — список варіантів без поля "інше"
- "textarea" — вільний текст
- "text" — короткий текст
- "number" — число

Приклад:
[
  {{"id": "q1", "label": "Проблема виникла вперше?", "type": "yesno", "required": true}},
  {{"id": "q2", "label": "Що саме не працює?", "type": "select_other", "options": ["Розетка", "Вимикач", "Проводка"], "required": true}},
  {{"id": "q3", "label": "Коли виникла проблема?", "type": "select", "options": ["Сьогодні", "Кілька днів тому", "Тиждень і більше"], "required": true}},
  {{"id": "q4", "label": "Опишіть детальніше", "type": "textarea", "required": false}}
]

Генеруй питання максимально релевантні до сервісу "{service_name}".
"""

        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        text = response.choices[0].message.content.strip()

        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        questions = json.loads(text)
        return questions

    except Exception as e:
        print(f"Groq error: {e}")
        traceback.print_exc()
        return [
            {"id": "q1", "label": "Опишіть проблему детальніше", "type": "textarea", "required": True},
            {"id": "q2", "label": "Коли виникла проблема?", "type": "text", "required": True},
            {"id": "q3", "label": "Ваш телефон для зв'язку", "type": "text", "required": True},
        ]