import { useState } from "react"
import { api } from "./api"

const S = {
  ROLE: "role",
  DESCRIBE: "describe",
  QUESTIONS: "questions",
  CONTACT: "contact",
  DONE: "done",
  CONTRACTOR: "contractor",
  ORDER_DETAIL: "order_detail",
}

export default function App() {
  const [screen, setScreen] = useState(S.ROLE)
  const [description, setDescription] = useState("")
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
      const res = await api.post("/analyze", { description })
      setService({ id: res.service_id, name: res.service_name })
      setQuestions(res.questions)
      setAnswers({})
      setScreen(S.QUESTIONS)
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.")
    }
    setLoading(false)
  }

  async function handleSubmit() {
    setLoading(true)
    setError("")
    try {
      await api.post("/orders", {
        service_id: service.id,
        description,
        answers,
        client_name: contact.name,
        client_phone: contact.phone,
      })
      setScreen(S.DONE)
    } catch {
      setError("Помилка при відправці.")
    }
    setLoading(false)
  }

  async function loadOrders() {
    try {
      const data = await api.get("/orders")
      setOrders(data)
    } catch {
      setError("Не вдалось завантажити заявки.")
    }
  }

  function setAnswer(id, val) {
    setAnswers(a => ({ ...a, [id]: val }))
  }

  function reset() {
    setScreen(S.DESCRIBE)
    setDescription("")
    setService(null)
    setQuestions([])
    setAnswers({})
    setContact({ name: "", phone: "" })
    setError("")
  }

  // --- ROLE ---
  if (screen === S.ROLE) return (
    <div className="center">
      <h1>🔧 Repair Services</h1>
      <button onClick={() => setScreen(S.DESCRIBE)}>Я клієнт</button>
      <button onClick={() => { setScreen(S.CONTRACTOR); loadOrders() }}>
        Я виконавець
      </button>
    </div>
  )

  // --- DESCRIBE ---
  if (screen === S.DESCRIBE) return (
    <div className="card">
      <h2>Що сталося?</h2>
      <p className="hint">Опишіть поломку — AI підбере потрібні питання</p>
      <textarea
        rows={5}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Наприклад: тече кран на кухні, скрипить гальмо, не вмикається пральна машина..."
        autoFocus
      />
      {error && <p className="error">{error}</p>}
      <button onClick={handleDescribe} disabled={loading || !description.trim()}>
        {loading ? "AI аналізує..." : "Далі →"}
      </button>
      <button className="back" onClick={() => setScreen(S.ROLE)}>← Назад</button>
    </div>
  )

  // --- QUESTIONS ---
  if (screen === S.QUESTIONS) return (
    <div className="card">
      <div className="service-tag">{service?.name}</div>
      <h2>Розкажіть більше</h2>
      <p className="hint">Це допоможе майстру краще підготуватись</p>

      {questions.map(q => (
        <div key={q.id} className="field">
          <label>{q.label}</label>

          {(q.type === "yesno") && (
            <div className="btn-group">
              {(q.options || ["Так", "Ні"]).map(opt => (
                <button
                  key={opt}
                  className={`opt ${answers[q.id] === opt ? "opt-active" : ""}`}
                  onClick={() => setAnswer(q.id, opt)}
                >{opt}</button>
              ))}
            </div>
          )}

          {(q.type === "select" || q.type === "select_other") && (
            <div className="btn-group wrap">
              {(q.options || []).map(opt => (
                <button
                  key={opt}
                  className={`opt ${answers[q.id] === opt ? "opt-active" : ""}`}
                  onClick={() => setAnswer(q.id, opt)}
                >{opt}</button>
              ))}
              <input
                className="other-input"
                placeholder="Інший варіант..."
                value={(q.options || []).includes(answers[q.id]) ? "" : (answers[q.id] || "")}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            </div>
          )}

          {q.type === "textarea" && (
            <textarea
              rows={3}
              value={answers[q.id] || ""}
              onChange={e => setAnswer(q.id, e.target.value)}
            />
          )}

          {q.type === "text" && (
            <input
              type="text"
              value={answers[q.id] || ""}
              onChange={e => setAnswer(q.id, e.target.value)}
            />
          )}

          {q.type === "number" && (
            <input
              type="number"
              value={answers[q.id] || ""}
              onChange={e => setAnswer(q.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <button onClick={() => setScreen(S.CONTACT)}>Далі →</button>
      <button className="back" onClick={reset}>← Переписати проблему</button>
    </div>
  )

  // --- CONTACT ---
  if (screen === S.CONTACT) return (
    <div className="card">
      <h2>Контактні дані</h2>
      <div className="field">
        <label>Ім'я</label>
        <input
          value={contact.name}
          onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
          placeholder="Як до вас звертатись?"
        />
      </div>
      <div className="field">
        <label>Телефон</label>
        <input
          type="tel"
          value={contact.phone}
          onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
          placeholder="+380..."
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || !contact.name.trim() || !contact.phone.trim()}
      >
        {loading ? "Відправляємо..." : "Відправити заявку ✓"}
      </button>
      <button className="back" onClick={() => setScreen(S.QUESTIONS)}>← Назад</button>
    </div>
  )

  // --- DONE ---
  if (screen === S.DONE) return (
    <div className="center">
      <div className="done-icon">✓</div>
      <h2>Заявку прийнято!</h2>
      <p>Виконавець зв'яжеться з вами найближчим часом.</p>
      <button onClick={reset}>Нова заявка</button>
      <button className="back" onClick={() => setScreen(S.ROLE)}>На початок</button>
    </div>
  )

  // --- CONTRACTOR ---
  if (screen === S.CONTRACTOR) return (
    <div className="card">
      <h2>Заявки</h2>
      <button className="btn-refresh" onClick={loadOrders}>↻ Оновити</button>
      {orders.length === 0
        ? <p className="hint">Немає заявок</p>
        : orders.map(o => (
          <div
            key={o.id}
            className={`order-item s-${o.status}`}
            onClick={() => { setSelectedOrder(o); setScreen(S.ORDER_DETAIL) }}
          >
            <div className="order-top">
              <strong>{o.service_name || "Сервіс"}</strong>
              <span className={`badge b-${o.status}`}>{o.status}</span>
            </div>
            <p className="order-desc">{o.description}</p>
            <small>{o.client_name} · {o.client_phone}</small>
          </div>
        ))
      }
      <button className="back" onClick={() => setScreen(S.ROLE)}>← Назад</button>
    </div>
  )

  // --- ORDER DETAIL ---
  if (screen === S.ORDER_DETAIL && selectedOrder) {
    const o = selectedOrder
    let parsedAnswers = {}
    try { parsedAnswers = JSON.parse(o.answers || "{}") } catch {}
    return (
      <div className="card">
        <h2>Заявка #{o.id}</h2>
        <div className="detail-row"><span>Сервіс</span><strong>{o.service_name || o.service_id}</strong></div>
        <div className="detail-row"><span>Проблема</span><strong>{o.description}</strong></div>
        <div className="detail-row"><span>Клієнт</span><strong>{o.client_name}</strong></div>
        <div className="detail-row"><span>Телефон</span><strong>{o.client_phone}</strong></div>
        <div className="detail-row"><span>Статус</span><span className={`badge b-${o.status}`}>{o.status}</span></div>

        {Object.keys(parsedAnswers).length > 0 && (
          <div className="answers-block">
            <p className="hint">Відповіді клієнта:</p>
            {Object.entries(parsedAnswers).map(([k, v]) => (
              <div key={k} className="answer-row">
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        )}

        {o.status === "new" && (
          <button onClick={async () => { await api.post(`/orders/${o.id}/accept`); loadOrders(); setScreen(S.CONTRACTOR) }}>
            Прийняти в роботу
          </button>
        )}
        {o.status === "in_progress" && (
          <button onClick={async () => { await api.post(`/orders/${o.id}/complete`); loadOrders(); setScreen(S.CONTRACTOR) }}>
            Позначити виконаною
          </button>
        )}
        <button className="back" onClick={() => { setSelectedOrder(null); setScreen(S.CONTRACTOR) }}>← Назад</button>
      </div>
    )
  }

  return null
}
