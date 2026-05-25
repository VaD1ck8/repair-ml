import { useState } from "react"
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
  const [clarificationOptions, setClarificationOptions] = useState([])
  const [clarificationA, setClarificationA] = useState("")
  const [service, setService] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [contact, setContact] = useState({ name: "", phone: "" })
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function runClassify(body) {
    setLoading(true)
    setError("")
    try {
      const res = await api.post("/classify", body)
      if (res.status === "classified") {
        setService({ id: res.service_id, name: res.service_name })
        const qs = await api.post("/questions/generate", {
          service_id: res.service_id,
          description,
        })
        setQuestions(qs.questions || qs)
        setScreen(SCREENS.QUESTIONS)
      } else {
        setClarificationQ(res.clarification_question)
        setClarificationOptions(res.clarification_options || [])
        setClarificationA("")
        setScreen(SCREENS.CLARIFY)
      }
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.")
    }
    setLoading(false)
  }

  function handleDescribe() {
    if (!description.trim()) return
    runClassify({ description })
  }

  function handleClarify(answer) {
    const a = answer || clarificationA
    if (!a.trim()) return
    runClassify({ description, clarification_answer: a })
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
    setClarificationOptions([])
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
        <p className="question">{clarificationQ}</p>

        {clarificationOptions.length > 0 ? (
          <div className="options">
            {clarificationOptions.map(opt => (
              <button
                key={opt}
                className={`option-btn ${clarificationA === opt ? "selected" : ""}`}
                onClick={() => {
                  setClarificationA(opt)
                  handleClarify(opt)
                }}
                disabled={loading}
              >
                {opt}
              </button>
            ))}
            <div className="divider">або напишіть свій варіант</div>
            <input
              value={clarificationA}
              onChange={e => setClarificationA(e.target.value)}
              placeholder="Свій варіант..."
              onKeyDown={e => e.key === "Enter" && handleClarify()}
            />
            <button onClick={() => handleClarify()} disabled={loading || !clarificationA.trim()}>
              {loading ? "Визначаємо..." : "Далі →"}
            </button>
          </div>
        ) : (
          <>
            <input
              value={clarificationA}
              onChange={e => setClarificationA(e.target.value)}
              placeholder="Ваша відповідь..."
            />
            <button onClick={() => handleClarify()} disabled={loading || !clarificationA.trim()}>
              {loading ? "Визначаємо..." : "Далі →"}
            </button>
          </>
        )}

        {error && <p className="error">{error}</p>}
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
            {q.type === "yesno" ? (
              <div className="options">
                {["Так", "Ні"].map(opt => (
                  <button
                    key={opt}
                    className={`option-btn ${answers[q.id] === opt ? "selected" : ""}`}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : q.type === "textarea" ? (
              <textarea
                rows={3}
                value={answers[q.id] || ""}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
            ) : q.type === "select" || q.type === "select_other" ? (
              <div className="options">
                {(q.options || []).map(opt => (
                  <button
                    key={opt}
                    className={`option-btn ${answers[q.id] === opt ? "selected" : ""}`}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  >
                    {opt}
                  </button>
                ))}
                <input
                  placeholder="Інший варіант..."
                  value={["Так","Ні",...(q.options||[])].includes(answers[q.id]) ? "" : (answers[q.id] || "")}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              </div>
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
            onClick={() => { setSelectedOrder(o); setScreen(SCREENS.ORDER_DETAIL) }}
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
