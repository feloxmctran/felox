// src/pages/DuelloMatch.jsx
import { useEffect, useRef, useState } from "react";
import { getMatchStatus, sendAnswer, revealNext, getSummary } from "../api/duello";

// Router'dan :matchId'yi ve global auth'tan userId'yi alacağını varsayıyorum.
// Bu örnekte props ile geliyor:
export default function DuelloMatch({ matchId, userId }) {
  const [st, setSt] = useState(null);     // status payload
  const [loading, setLoading] = useState(true);
  const [sec, setSec] = useState(24);     // sayaç
  const [answered, setAnswered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  const fetchStatus = async () => {
    const data = await getMatchStatus({ matchId, user_id: userId });
    setSt(data);
    setFinished(!!data.finished);
    if (!data.finished) {
      const s = Number(data.ui?.per_question_seconds || 24);
      setSec(s);
      setAnswered(false);
      setLocked(false);
    }
  };

  // ilk yükleme
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await fetchStatus(); } catch (e) { alert("status hata: " + e.message); }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; clearInterval(timerRef.current); };
  }, [matchId, userId]);

  // sayaç
  useEffect(() => {
    if (loading || finished || !st || st.finished) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSec((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // süre bittiğinde reveal
          reveal().catch(console.error);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, finished, st?.match?.current_index]);

  const submitAnswer = async (val) => {
    if (!st || answered || locked) return;
    const max = Number(st.ui?.per_question_seconds || 24);
    const body = { matchId, user_id: userId, answer: val, time_left_seconds: sec, max_time_seconds: max };
    try {
      const res = await sendAnswer(body);
      setAnswered(true);
      if (res.locked) setLocked(true); // speed modunda kilitleyebilir
    } catch (e) {
      alert("cevap hata: " + e.message);
    }
  };

  const reveal = async () => {
    try {
      await revealNext({ matchId, user_id: userId });
      // kısa bekleme sonrası status yenile
      setTimeout(fetchStatus, 250);
    } catch (e) { alert("reveal hata: " + e.message); }
  };

  const toSummary = async () => {
    const sum = await getSummary({ matchId, user_id: userId });
    // basitçe ekrana bas
    alert(`Bitti!\nSkor A:${sum.users.a.stats.score} - B:${sum.users.b.stats.score}\nSonuç: ${sum.result.code}`);
  };

  if (loading) return <div style={{padding:16}}>Yükleniyor…</div>;
  if (!st) return <div style={{padding:16}}>Veri yok</div>;
  if (st.finished) return (
    <div style={{padding:16}}>
      <h2>Maç bitti</h2>
      <button onClick={toSummary}>Özeti Gör</button>
    </div>
  );

  const q = st.question;
  const mode = st.match?.mode; // 'info' | 'speed'
  const canBilmem = mode === "info";
  const disabled = answered || locked || sec<=0;

  return (
    <div style={{maxWidth:780, margin:"20px auto", padding:16}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
        <div>Maç #{st.match?.id} — Mod: <b>{mode}</b></div>
        <div>Soru: {st.match?.current_index + 1} / {st.match?.total_questions}</div>
      </div>
      <div style={{fontSize:22, fontWeight:700, margin:"12px 0"}}>{q?.question}</div>
      <div style={{marginBottom:12}}>Puan: <b>{q?.point}</b> | Kategori: {q?.survey_title || "-"}</div>

      <div style={{fontSize:28, fontVariantNumeric:"tabular-nums", margin:"12px 0"}}>⏱️ {sec}s</div>

      <div style={{display:"flex", gap:12, marginBottom:12}}>
        <button disabled={disabled} onClick={()=>submitAnswer("evet")}>Evet</button>
        <button disabled={disabled} onClick={()=>submitAnswer("hayır")}>Hayır</button>
        <button disabled={disabled || !canBilmem} onClick={()=>submitAnswer("bilmem")}>Bilmem</button>
      </div>

      <div style={{marginTop:8, opacity:0.8}}>
        {locked && <div>Hız modunda kilitlendi; rakibe sistem “bilmem” yazıldı.</div>}
        {answered && !locked && <div>Cevabın kaydedildi. Süre bitince otomatik geçilecek.</div>}
      </div>

      <hr style={{margin:"20px 0"}}/>

      <div style={{display:"flex", gap:24}}>
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
