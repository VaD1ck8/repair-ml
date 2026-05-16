import { useState, useEffect } from 'react'
import { api } from './api'

export default function App() {
  const [role, setRole] = useState('client')

  return (
    <div className="app">
      <header className="header">
        <h1>🔧 Repair Services</h1>
        <div className="role-toggle">
          <button
            className={role === 'client' ? 'active' : ''}
            onClick={() => setRole('client')}
          >
            Клієнт
          </button>
          <button
            className={role === 'contractor' ? 'active' : ''}
            onClick={() => setRole('contractor')}
          >
            Виконавець
          </button>
        </div>
      </header>

      <main className="container">
        {role === 'client' ? <ClientView /> : <ContractorView />}
      </main>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* КЛІЄНТ: вибір сервісу → ML-питання → відправка заявки         */
/* ────────────────────────────────────────────────────────────── */
function ClientView() {
  const [services, setServices] = useState([])
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getServices()
      .then(setServices)
      .catch((e) => setError(e.message))
  }, [])

  const handleGenerate = async () => {
    if (!selectedService) return
    setLoading(true)
    setError(null)
    try {
      const r = await api.generateQuestions(selectedService.id, description)
      setQuestions(r.questions)
      setAnswers({})
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setError('Введіть ваше імʼя')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const order = await api.createOrder({
        service_id: selectedService.id,
        client_name: clientName,
        client_contact: clientContact,
        description,
        questions,
        answers,
      })
      setSuccess(order)
      setStep(3)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1)
    setSelectedService(null)
    setDescription('')
    setQuestions([])
    setAnswers({})
    setClientName('')
    setClientContact('')
    setSuccess(null)
    setError(null)
  }

  if (step === 3 && success) {
    return (
      <div className="card success">
        <div className="success-icon">✅</div>
        <h2>Заявка створена</h2>
        <p>
          Номер заявки: <strong>#{success.id}</strong>
        </p>
        <p className="muted">Очікуйте, поки виконавець прийме її в роботу.</p>
        <button className="btn-primary" onClick={reset}>
          Створити ще одну
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Сервіс</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Деталі</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Готово</div>
      </div>

      {error && <div className="error">{error}</div>}

      {step === 1 && (
        <div className="card">
          <h2>Оберіть сервіс</h2>
          <div className="service-grid">
            {services.map((s) => (
              <div
                key={s.id}
                className={`service-card ${selectedService?.id === s.id ? 'selected' : ''}`}
                onClick={() => setSelectedService(s)}
              >
                <div className="service-name">{s.name}</div>
                <div className="service-desc">{s.description}</div>
                <div className="service-cat">{s.category}</div>
              </div>
            ))}
          </div>

          {selectedService && (
            <>
              <hr />
              <div className="form-group">
                <label>Коротко опишіть проблему (опціонально)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Напр.: тече кран на кухні, потрібно замінити прокладку або весь кран"
                  rows={3}
                />
              </div>
              <div className="actions">
                <button
                  className="btn-primary"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? '⏳ Генерую питання...' : 'Далі →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Уточнення по «{selectedService.name}»</h2>
          <p className="muted">
            AI згенерував питання, відповіді на які допоможуть виконавцю.
          </p>

          <div className="questions">
            {questions.map((q) => (
              <div key={q.id} className="form-group">
                <label>{q.label}</label>
                {q.type === 'text' && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}
                {q.type === 'textarea' && (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}
                {q.type === 'number' && (
                  <input
                    type="number"
                    value={answers[q.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}
                {q.type === 'select' && (
                  <select
                    value={answers[q.id] || ''}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  >
                    <option value="">— Оберіть —</option>
                    {(q.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <hr />
          <h3>Контактні дані</h3>
          <div className="form-group">
            <label>Імʼя *</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Як до вас звертатись"
            />
          </div>
          <div className="form-group">
            <label>Телефон / месенджер</label>
            <input
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              placeholder="+380…"
            />
          </div>

          <div className="actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              ← Назад
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Відправляю...' : 'Відправити заявку'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* ВИКОНАВЕЦЬ: список заявок, прийняття в роботу                  */
/* ────────────────────────────────────────────────────────────── */
function ContractorView() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('new')
  const [selected, setSelected] = useState(null)
  const [contractorName, setContractorName] = useState(
    localStorage.getItem('contractor_name') || ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    api
      .listOrders(filter === 'all' ? null : filter)
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleAccept = async (orderId) => {
    if (!contractorName.trim()) {
      setError('Спочатку введіть ваше імʼя')
      return
    }
    localStorage.setItem('contractor_name', contractorName)
    try {
      const updated = await api.acceptOrder(orderId, contractorName)
      setSelected(updated)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleComplete = async (orderId) => {
    try {
      const updated = await api.completeOrder(orderId)
      setSelected(updated)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  /* Деталі однієї заявки */
  if (selected) {
    return (
      <div className="card">
        <button className="btn-link" onClick={() => setSelected(null)}>
          ← До списку
        </button>
        <div className="order-detail-header">
          <h2>
            Заявка #{selected.id} — {selected.service_name}
          </h2>
          <span className={`badge badge-${selected.status}`}>
            {statusLabel(selected.status)}
          </span>
        </div>

        <div className="info-grid">
          <div>
            <strong>Клієнт:</strong> {selected.client_name}
          </div>
          <div>
            <strong>Контакт:</strong> {selected.client_contact || '—'}
          </div>
          <div>
            <strong>Створено:</strong>{' '}
            {new Date(selected.created_at).toLocaleString('uk-UA')}
          </div>
          {selected.contractor_name && (
            <div>
              <strong>Виконавець:</strong> {selected.contractor_name}
            </div>
          )}
        </div>

        {selected.description && (
          <div className="block">
            <h3>Опис від клієнта</h3>
            <p>{selected.description}</p>
          </div>
        )}

        <div className="block">
          <h3>Відповіді на уточнюючі питання</h3>
          {selected.questions.map((q) => (
            <div key={q.id} className="qa">
              <div className="q">{q.label}</div>
              <div className="a">
                {selected.answers[q.id] ? (
                  String(selected.answers[q.id])
                ) : (
                  <em className="muted">— не відповіли —</em>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {selected.status === 'new' && (
          <div className="actions">
            <button
              className="btn-primary"
              onClick={() => handleAccept(selected.id)}
            >
              Прийняти в роботу
            </button>
          </div>
        )}
        {selected.status === 'accepted' &&
          selected.contractor_name === contractorName && (
            <div className="actions">
              <button
                className="btn-primary"
                onClick={() => handleComplete(selected.id)}
              >
                Позначити виконаною
              </button>
            </div>
          )}
      </div>
    )
  }

  /* Список заявок */
  return (
    <div className="card">
      <div className="form-group">
        <label>Ваше імʼя як виконавця</label>
        <input
          value={contractorName}
          onChange={(e) => {
            setContractorName(e.target.value)
            localStorage.setItem('contractor_name', e.target.value)
          }}
          placeholder="Напр.: Іван Петренко"
        />
      </div>

      <div className="filters">
        {[
          ['new', 'Нові'],
          ['accepted', 'В роботі'],
          ['done', 'Виконані'],
          ['all', 'Всі'],
        ].map(([f, label]) => (
          <button
            key={f}
            className={`filter ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {label}
          </button>
        ))}
        <button className="filter" onClick={load} title="Оновити">
          ↻
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <p className="muted">Завантаження...</p>}

      <div className="orders-list">
        {orders.length === 0 && !loading && (
          <p className="muted">Заявок поки немає</p>
        )}
        {orders.map((o) => (
          <div
            key={o.id}
            className="order-card"
            onClick={() => setSelected(o)}
          >
            <div className="order-header">
              <div className="order-title">
                #{o.id} — {o.service_name}
              </div>
              <span className={`badge badge-${o.status}`}>
                {statusLabel(o.status)}
              </span>
            </div>
            <div className="order-meta">
              Клієнт: {o.client_name} •{' '}
              {new Date(o.created_at).toLocaleDateString('uk-UA')}
              {o.contractor_name && ` • Виконавець: ${o.contractor_name}`}
            </div>
            {o.description && <div className="order-desc">{o.description}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function statusLabel(s) {
  return { new: 'Нова', accepted: 'В роботі', done: 'Виконана' }[s] || s
}
