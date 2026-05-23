import { useState, useEffect } from "react"
import { api } from "./api"

const SCREENS = {
  ROLE: "role",
  DESCRIBE: "describe",
  CLARIFY: "clarify",
  QUESTIONS: "questions",
  CONTACT: "contact",
  DONE: "done",
  CONTRACTOR: "contractor",
  ORDER_DETAIL: "order_detail",
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.ROLE)
  const [description, setDescription] = useState("")
  const [clarificationQ, setClarificationQ] = useState("")
  const [clarificationA, setClarificationA] = useState("")
  const [service, setService] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [contact, setContact] = useState({ name: "", phone: "" })
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDescribe() {
    if (!description.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await api.post("/classify", { description })
      if (res.status === "classified") {
        setService({ id: res.service_id, name: res.service_name })
        await loadQuestions(res.service_id)
      } else {
        setClarificationQ(res.clarification_question)
        setScreen(SCREENS.CLARIFY)
      }
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.")
    }
    setLoading(false)
  }

  async function handleClarify() {
    if (!clarificationA.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await api.post("/classify", {
        description,
        clarification_answer: clarificationA,
      })
      if (res.status === "classified") {
        setService({ id: res.service_id, name: res.service_name })
        await loadQuestions(res.service_id)
      } else {
        setError("Не вдалося визначити сервіс. Спробуйте описати детальніше.")
        setScreen(SCREENS.DESCRIBE)
      }
    } catch {
      setError("Помилка з'єднання.")
    }
    setLoading(false)
  }

  async function loadQuestions(serviceId) {
    const qs = await api.post("/questions/generate", {
      service_id: serviceId,
      description,
    })
    setQuestions(qs.questions || qs)
    setScreen(SCREENS.QUESTIONS)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await api.post("/orders", {
        service_id: service.id,
        description,
        answers,
        client_name: contact.name,
        client_phone: contact.phone,
      })
      setScreen(SCREENS.DONE)
    } catch {
      setError("Помилка при відправці.")
    }
    setLoading(false)
  }

  async function loadOrders() {
    const data = await api.get("/orders")
    setOrders(data)
  }

  async function acceptOrder(id) {
    await api.post(`/orders/${id}/accept`)
    loadOrders()
  }

  async function completeOrder(id) {
    await api.post(`/orders/${id}/complete`)
    setSelectedOrder(null)
    loadOrders()
  }

  function reset() {
    setScreen(SCREENS.DESCRIBE)
    setDescription("")
    setClarificationA("")
    setClarificationQ("")
    setService(null)
    setQuestions([])
    setAnswers({})
    setContact({ name: "", phone: "" })
    setError("")
  }

  if (screen === SCREENS.ROLE) {
    return (
      <div className="center">
        <h1>Repair Services</h1>
        <button onClick={() => setScreen(SCREENS.DESCRIBE)}>Я клієнт</button>
        <button onClick={() => { setScreen(SCREENS.CONTRACTOR); loadOrders() }}>
          Я виконавець
        </button>
      </div>
    )
  }

  if (screen === SCREENS.DESCRIBE) {
    return (
      <div className="card">
        <h2>Опишіть вашу проблему</h2>
        <p className="hint">AI сама визначить потрібний сервіс</p>
        <textarea
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Наприклад: тече кран на кухні, не вмикається холодильник..."
        />
        {error && <p className="error">{error}</p>}
        <button onClick={handleDescribe} disabled={loading || !description.trim()}>
          {loading ? "Визначаємо сервіс..." : "Далі →"}
        </button>
        <button className="back" onClick={() => setScreen(SCREENS.ROLE)}>← Назад</button>
      </div>
    )
  }

  if (screen === SCREENS.CLARIFY) {
    return (
      <div className="card">
        <h2>Уточнення</h2>
        <p className="hint">AI не впевнена. Допоможіть уточнити:</p>
        <p className="question">{clarificationQ}</p>
        <input
          value={clarificationA}
          onChange={e => setClarificationA(e.target.value)}
          placeholder="Ваша відповідь..."
        />
        {error && <p className="error">{error}</p>}
        <button onClick={handleClarify} disabled={loading || !clarificationA.trim()}>
          {loading ? "Визначаємо..." : "Далі →"}
        </button>
        <button className="back" onClick={() => setScreen(SCREENS.DESCRIBE)}>← Назад</button>
      </div>
    )
  }

  if (screen === SCREENS.QUESTIONS) {
    return (
      <div className="card">
        <h2>{service?.name}</h2>
        <p className="hint">Кілька питань для уточнення:</p>
        {questions.map(q => (
          <div key={q.id} className="field">
            <label>{q.label}</label>
            {q.type === "textarea" ? (
              <textarea
                rows={3}
                value={answers[q.id] || ""}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            ) : q.type === "select" ? (
              <select
                value={answers[q.id] || ""}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              >
                <option value="">— оберіть —</option>
                {(q.options || []).map(o => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={q.type === "number" ? "number" : "text"}
                value={answers[q.id] || ""}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            )}
          </div>
        ))}
        <button onClick={() => setScreen(SCREENS.CONTACT)}>Далі →</button>
        <button className="back" onClick={reset}>← Спочатку</button>
      </div>
    )
  }

  if (screen === SCREENS.CONTACT) {
    return (
      <div className="card">
        <h2>Контактні дані</h2>
        <div className="field">
          <label>Ім'я</label>
          <input value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Телефон</label>
          <input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} />
        </div>
        {error && <p className="error">{error}</p>}
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Відправляємо..." : "Відправити заявку"}
        </button>
        <button className="back" onClick={() => setScreen(SCREENS.QUESTIONS)}>← Назад</button>
      </div>
    )
  }

  if (screen === SCREENS.DONE) {
    return (
      <div className="center">
        <h2>✓ Заявку прийнято</h2>
        <p>Виконавець зв'яжеться з вами найближчим часом.</p>
        <button onClick={reset}>Нова заявка</button>
        <button className="back" onClick={() => setScreen(SCREENS.ROLE)}>На початок</button>
      </div>
    )
  }

  if (screen === SCREENS.CONTRACTOR) {
    return (
      <div className="card">
        <h2>Заявки</h2>
        <button className="refresh" onClick={loadOrders}>↻ Оновити</button>
        {orders.length === 0 && <p>Немає заявок</p>}
        {orders.map(o => (
          <div
            key={o.id}
            className={`order-item status-${o.status}`}
            onClick={() => setSelectedOrder(o) || setScreen(SCREENS.ORDER_DETAIL)}
          >
            <strong>{o.service_name || o.service_id}</strong>
            <span className="badge">{o.status}</span>
            <br />
            <small>{o.client_name} · {o.client_phone}</small>
          </div>
        ))}
        <button className="back" onClick={() => setScreen(SCREENS.ROLE)}>← Назад</button>
      </div>
    )
  }

  if (screen === SCREENS.ORDER_DETAIL && selectedOrder) {
    const o = selectedOrder
    return (
      <div className="card">
        <h2>Заявка #{o.id}</h2>
        <p><strong>Сервіс:</strong> {o.service_name || o.service_id}</p>
        <p><strong>Опис:</strong> {o.description}</p>
        <p><strong>Клієнт:</strong> {o.client_name}, {o.client_phone}</p>
        <p><strong>Статус:</strong> {o.status}</p>
        {o.answers && (
          <div>
            <strong>Відповіді:</strong>
            <pre>{JSON.stringify(JSON.parse(o.answers || "{}"), null, 2)}</pre>
          </div>
        )}
        {o.status === "new" && (
          <button onClick={() => acceptOrder(o.id)}>Прийняти в роботу</button>
        )}
        {o.status === "in_progress" && (
          <button onClick={() => completeOrder(o.id)}>Позначити виконаною</button>
        )}
        <button className="back" onClick={() => { setSelectedOrder(null); setScreen(SCREENS.CONTRACTOR) }}>← Назад</button>
      </div>
    )
  }

  return null
}
