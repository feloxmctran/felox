// src/lib/duelloSSE.js
export function openDuelloEventStream({ apiUrl, userId, handlers = {}, withCredentials = false }) {
  if (!apiUrl || !userId) throw new Error("openDuelloEventStream: apiUrl ve userId zorunlu");

  const url = `${apiUrl.replace(/\/+$/,'')}/api/duello/events/${userId}`;
  const es = new EventSource(url, { withCredentials });

  // Genel loglar (istersen yorum satırı yap)
  es.onopen = () => console.debug("[SSE] open", url);
  es.onerror = (e) => console.debug("[SSE] error", e);

  // Fallback: backend aynı olayı "message" olarak da gönderiyor (data.type ile)
  es.onmessage = (e) => {
    try {
      const data = e?.data ? JSON.parse(e.data) : {};
      const t = data?.type; // örn: "invite:cancelled"
      if (t && handlers?.[t]) {
        handlers[t](data, e);
      }
    } catch (_) { /* yut */ }
  };


  // Backend’in gönderdiği isimli event’leri dinle
  const listen = (evt) => {
    es.addEventListener(evt, (ev) => {
      try {
        const data = ev?.data ? JSON.parse(ev.data) : {};
        handlers?.[evt]?.(data, ev);
      } catch (_) {
        handlers?.[evt]?.({}, ev);
      }
    });
  };

  // Olası event isimleri (ihtiyacın olmayanı dinlememiş olursun)
  ["ready", "invite:new", "invite:accepted", "invite:rejected", "invite:cancelled"].forEach((evt) => {
    if (handlers?.[evt]) listen(evt);
  });

  return {
    close: () => {
      try { es.close(); } catch {}
    }
  };
}
