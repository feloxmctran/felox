// src/api/duello.js
const API = import.meta.env?.VITE_API_URL || "https://felox-backend.onrender.com";

async function req(path, { method="GET", body, params } = {}) {
  const url = new URL(API + path);
  if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = `${r.status}`;
    try { const j = await r.json(); msg = j.error || JSON.stringify(j); } catch {}
    throw new Error(msg);
  }
  return r.json();
}

/* --- profile --- */
export const getProfile     = (userId) => req(`/api/duello/profile/${userId}`);
export const setReady       = ({user_id, ready}) => req(`/api/duello/ready`, { method:"POST", body:{user_id, ready} });
export const setVisibility  = ({user_id, visibility_mode}) => req(`/api/duello/visibility`, { method:"POST", body:{user_id, visibility_mode} });

/* --- invites --- */
export const createInvite   = ({from_user_id, to_user_id, to_user_code, mode}) =>
  req(`/api/duello/invite`, { method:"POST", body:{ from_user_id, to_user_id, to_user_code, mode } });
export const inbox          = (userId) => req(`/api/duello/inbox/${userId}`);
export const outbox         = (userId) => req(`/api/duello/outbox/${userId}`);
export const respondInvite  = ({invite_id, user_id, action}) =>
  req(`/api/duello/invite/respond`, { method:"POST", body:{ invite_id, user_id, action } });

/* --- match flow --- */
export const getMatchStatus = ({matchId, user_id}) =>
  req(`/api/duello/match/${matchId}/status`, { params:{ user_id } });
export const sendAnswer     = ({matchId, user_id, answer, time_left_seconds, max_time_seconds}) =>
  req(`/api/duello/match/${matchId}/answer`, { method:"POST", body:{ user_id, answer, time_left_seconds, max_time_seconds } });
export const revealNext     = ({matchId, user_id}) =>
  req(`/api/duello/match/${matchId}/reveal`, { method:"POST", body:{ user_id } });
export const getSummary     = ({matchId, user_id}) =>
  req(`/api/duello/match/${matchId}/summary`, { params:{ user_id } });
