const BASE = "/api"

export const api = {
  get: (path) =>
    fetch(BASE + path).then(r => {
      if (!r.ok) throw new Error(r.statusText)
      return r.json()
    }),
  post: (path, body) =>
    fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => {
      if (!r.ok) throw new Error(r.statusText)
      return r.json()
    }),
}
