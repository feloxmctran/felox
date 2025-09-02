// src/api/duello.js

// Varsayılan Render; .env ile override edilebilir (VITE_API_URL / REACT_APP_API_URL)
export const API = (
  import.meta.env?.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://felox-backend.onrender.com"
).replace(/\/$/, "");

async function req(path, { method = "GET", body, params } = {}) {
  const url = new URL(path, API + "/");
  if (params) Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!r.ok) {
    let msg = `${r.status}`;
    try {
      const j = await r.json();
      msg = j?.error || JSON.stringify(j);
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

/* --- profile --- */
export const getProfile    = (userId) => req(`/api/duello/profile/${userId}`);
export const setReady      = ({ user_id, ready }) =>
  req(`/api/duello/ready`, { method: "POST", body: { user_id, ready } });
export const setVisibility = ({ user_id, visibility_mode }) =>
  req(`/api/duello/visibility`, { method: "POST", body: { user_id, visibility_mode } });
export const getUserCode   = (userId) => req(`/api/user/${userId}/user-code`);

/* --- invites --- */
export const createInvite  = ({ from_user_id, to_user_id, to_user_code, mode = "info" }) =>
  req(`/api/duello/invite`, { method: "POST", body: { from_user_id, to_user_id, to_user_code, mode } });
export const cancelInvite  = ({ invite_id, user_id }) =>
  req(`/api/duello/invite/cancel`, { method: "POST", body: { invite_id, user_id } });
export const inbox         = (userId) => req(`/api/duello/inbox/${userId}`);
export const outbox        = (userId) => req(`/api/duello/outbox/${userId}`);
export const respondInvite = ({ invite_id, user_id, action }) =>
  req(`/api/duello/invite/respond`, { method: "POST", body: { invite_id, user_id, action } });

/* --- active match poll --- */
export const activeMatch   = (userId) => req(`/api/duello/active/${userId}`);

/* --- random ready (yeni akış: önce bul, sonra davet gönder) --- */
/** Sadece hazır bir rakip döner (maç BAŞLATMAZ). */
export const getRandomReadyOpponent = ({ exclude_user_id }) =>
  req(`/api/duello/random-ready`, { params: { exclude_user_id } });

/** (Opsiyonel) Eski davranış: rastgele rakiple maçı hemen başlatır. */
export const randomReadyStart = ({ user_id, mode = "info" }) =>
  req(`/api/duello/random-ready/start`, { method: "POST", body: { user_id, mode } });

/** (GERİYE DÖNÜK) Eski isme dokunmak isteyenler için: maçı direkt başlatır. */
export const randomReady = ({ user_id, mode = "info" }) =>
  req(`/api/duello/random-ready`, { method: "POST", body: { user_id, mode } });

/* --- recents (ad/soyad için) --- */
export const getRecents    = (userId, limit = 12) =>
  req(`/api/duello/user/${userId}/recents`, { params: { limit } });

/* --- match flow --- */
export const getMatchStatus = ({ matchId, user_id }) =>
  req(`/api/duello/match/${matchId}/status`, { params: { user_id } });
export const sendAnswer = ({ matchId, user_id, answer, time_left_seconds, max_time_seconds }) =>
  req(`/api/duello/match/${matchId}/answer`, {
    method: "POST",
    body: { user_id, answer, time_left_seconds, max_time_seconds }
  });
export const revealNext = ({ matchId, user_id }) =>
  req(`/api/duello/match/${matchId}/reveal`, { method: "POST", body: { user_id } });
export const getSummary = ({ matchId, user_id }) =>
  req(`/api/duello/match/${matchId}/summary`, { params: { user_id } });

/* --- (İsteğe bağlı) SSE: canlı davet/match olayları --- */
/**
 * Server-Sent Events aboneliği açar.
 * Kullanım:
 *   const es = openEvents(userId);
 *   es.addEventListener('invite:new', (e) => { const data = JSON.parse(e.data); ... });
 *   es.addEventListener('invite:accepted', ...);
 *   es.onmessage = (e) => { const data = JSON.parse(e.data); /* fallback */ /* };
 *   es.onerror = () => es.close();
 */
export function openEvents(userId) {
  const url = `${API}/api/duello/events/${userId}`;
  return new EventSource(url, { withCredentials: false });
}
