// src/pages/DuelloMatch.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { getMatchStatus, sendAnswer, revealNext, getSummary } from "../api/duello";

export default function DuelloMatch({ matchId, userId }) {
  const [st, setSt] = useState(null);          // status payload (server truth)
  const [loading, setLoading] = useState(true);
  const [sec, setSec] = useState(24);          // sadece görsel sayaç
  const [answered, setAnswered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  // guard/ref'ler
  const tickRef = useRef(null);                // görsel sayaç
  const pollRef = useRef(null);                // status polling
  const lastIndexRef = useRef(null);
  const revealGuardRef = useRef(false);        // aynı anda birden fazla reveal engeli
  const lastStatusHashRef = useRef("");

  // ---- Yardımcılar
  const perQSec = useMemo(() => Number(st?.ui?.per_question_seconds || 24), [st?.ui?.per_question_seconds]);

  const hashStatus = (data) => {
    // basit bir değişim algılayıcı (index + skor + answered bayrakları)
    const idx = data?.match?.current_index ?? -1;
    const sa = data?.scores?.score_a ?? 0;
    const sb = data?.scores?.score_b ?? 0;
    const ya = data?.you?.answered ? 1 : 0;
    const oa = data?.opponent?.answered ? 1 : 0;
    return `${idx}|${sa}|${sb}|${ya}|${oa}|${data?.finished ? 1 : 0}`;
  };

  // ---- Server'dan status çek
  const fetchStatus = async () => {
    try {
      const data = await getMatchStatus({ matchId, user_id: userId });

      // değişim yoksa gereksiz state set etme
      const h = hashStatus(data);
      if (h === lastStatusHashRef.current) return;
      lastStatusHashRef.current = h;

      setSt(data);
      setFinished(!!data.finished);

      // soru değişti mi?
      const currentIndex = data?.match?.current_index ?? 0;
      if (lastIndexRef.current !== currentIndex) {
        lastIndexRef.current = currentIndex;
        // yeni soru -> görsel sayaç reset ve butonlar açılır
        setSec(perQSec);
        setAnswered(false);
        setLocked(false);
        restartTick(perQSec);
      }

      // server "geçilebilir" diyorsa (farklı isimleri destekliyoruz)
      const canReveal =
        !!(data?.ui?.can_reveal ??
           data?.can_reveal ??
           data?.everyone_answered ??
           data?.both_answered);

      if (!data.finished && canReveal && !revealGuardRef.current) {
        revealGuardRef.current = true;
        try {
          await revealNext({ matchId, user_id: userId });
        } catch (e) {
          // sessiz geç
          console.error("revealNext error:", e);
        } finally {
          // kısa bir bekleme ardından tekrar status
          setTimeout(() => { revealGuardRef.current = false; fetchStatus(); }, 250);
        }
      }
    } catch (e) {
      console.error("status hata:", e);
    }
  };

  // ---- Görsel sayaç (sadece UI)
  const restartTick = (start) => {
    clearInterval(tickRef.current);
    setSec(start);
    tickRef.current = setInterval(() => {
      setSec((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
  };

  // ---- İlk yükleme
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchStatus();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 1 sn'lik polling ile sunucuya uy
    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, 1000);

    return () => {
      mounted = false;
      clearInterval(tickRef.current);
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId]);

  // maç bitti ise sayaç/polling'i kapat
  useEffect(() => {
    if (finished) {
      clearInterval(tickRef.current);
      clearInterval(pollRef.current);
    }
  }, [finished]);

  // ---- Cevap gönder
  const submitAnswer = async (val) => {
    if (!st || answered || locked || sec <= 0) return;

    const body = {
      matchId,
      user_id: userId,
      answer: val,                       // "evet" | "hayır" | "bilmem"
      time_left_seconds: sec,
      max_time_seconds: perQSec,
    };

    try {
      const res = await sendAnswer(body);
      setAnswered(true);
      if (res?.locked) setLocked(true);  // speed modunda olabilir
      // cevap sonrası sadece bekle -> ilerlemeyi server belirlesin
    } catch (e) {
      alert("Cevap gönderilemedi: " + e.message);
    }
  };

  // ---- Özet
  const toSummary = async () => {
    try {
      const sum = await getSummary({ matchId, user_id: userId });
      alert(
        `Bitti!\nSkor A:${sum.users.a.stats.score} - B:${sum.users.b.stats.score}\nSonuç: ${sum.result.code}`
      );
    } catch (e) {
      alert("Özet alınamadı: " + e.message);
    }
  };

  // ---- UI
  if (loading) return <div style={{ padding: 16 }}>Yükleniyor…</div>;
  if (!st) return <div style={{ padding: 16 }}>Veri yok</div>;
  if (st.finished) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Maç bitti</h2>
        <button onClick={toSummary}>Özeti Gör</button>
      </div>
    );
  }

  const q = st.question;
  const mode = st.match?.mode; // 'info' | 'speed'
  const canBilmem = mode === "info";
  const disabled = answered || locked || sec <= 0;

  return (
    <div style={{ maxWidth: 820, margin: "20px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>Maç #{st.match?.id} — Mod: <b>{mode}</b></div>
        <div>Soru: {st.match?.current_index + 1} / {st.match?.total_questions}</div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, margin: "12px 0" }}>{q?.question}</div>
      <div style={{ marginBottom: 12 }}>Puan: <b>{q?.point}</b> • Kategori: {q?.survey_title || "-"}</div>

      <div style={{ fontSize: 28, fontVariantNumeric: "tabular-nums", margin: "12px 0" }}>
        ⏱️ {sec}s
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button disabled={disabled} onClick={() => submitAnswer("evet")}>Evet</button>
        <button disabled={disabled} onClick={() => submitAnswer("hayır")}>Hayır</button>
        <button disabled={disabled || !canBilmem} onClick={() => submitAnswer("bilmem")}>Bilmem</button>
      </div>

      <div style={{ marginTop: 8, opacity: 0.8 }}>
        {sec <= 0 && !st?.finished && <div>Süre doldu. Karşı taraf bekleniyor…</div>}
        {locked && <div>Hız modunda kilitlendi; rakibe sistem “bilmem” yazıldı.</div>}
        {answered && !locked && <div>Cevabın kaydedildi. Karşı tarafı bekliyoruz…</div>}
      </div>

      <hr style={{ margin: "20px 0" }} />

      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <div>SEN: {st.you?.ad} {st.you?.soyad} ({st.you?.user_code})</div>
          <div>Skor: <b>{st.scores?.score_a ?? 0}</b> / <b>{st.scores?.score_b ?? 0}</b> (A/B)</div>
        </div>
        <div>
          <div>RAKİP: {st.opponent?.ad} {st.opponent?.soyad} ({st.opponent?.user_code})</div>
        </div>
      </div>
    </div>
  );
}
