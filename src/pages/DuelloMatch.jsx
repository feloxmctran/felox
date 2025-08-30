// src/pages/DuelloMatch.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMatchStatus, sendAnswer, revealNext, getSummary } from "../api/duello";

export default function DuelloMatch({ matchId, userId }) {
  const [st, setSt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sec, setSec] = useState(24);
  const [answered, setAnswered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [info, setInfo] = useState("");

  // timer & polling
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const lastIndexRef = useRef(null);
  const revealGuardRef = useRef(false);

  const perQ = Number(st?.ui?.per_question_seconds || 24);

  // --- yardımcı: görsel sayacı yeniden başlat
  const restartTick = (start) => {
    clearInterval(timerRef.current);
    setSec(start);
    timerRef.current = setInterval(() => {
      setSec((p) => (p > 0 ? p - 1 : 0)); // sadece görsel, reveal yok
    }, 1000);
  };

  // --- status çek + sunucuya uy
  const fetchStatus = async () => {
    try {
      const data = await getMatchStatus({ matchId, user_id: userId });
      setSt(data);
      setFinished(!!data.finished);
      setInfo("");

      const idx = Number(data?.match?.current_index ?? 0);
      const isSpeed = String(data?.match?.mode) === "speed";

      // mevcut soruda benim/ rakibin cevap durumu
      const mine = !!data?.answers?.mine;
      const opp  = !!data?.answers?.opponent;

      setAnswered(mine);
      setLocked(isSpeed && (mine || opp));

      // soru değiştiyse UI reset
      if (lastIndexRef.current !== idx) {
        lastIndexRef.current = idx;
        setAnswered(false);
        setLocked(false);
        restartTick(Number(data?.ui?.per_question_seconds || 24));
      }

      // sunucu "geçilebilir" diyorsa tek sefer reveal
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
          setTimeout(() => {
            revealGuardRef.current = false;
            fetchStatus();
          }, 250);
        }
      }
    } catch (e) {
      setInfo("status hata: " + e.message);
    }
  };

  // --- ilk yükleme
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchStatus();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 1 sn'de bir statü al (server doğrusu)
    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, 1000);

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId]);

  // --- bitince sayaç/poll durdur
  useEffect(() => {
    if (finished) {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    }
  }, [finished]);

  // --- cevap gönder
  const submitAnswer = async (val) => {
    if (!st || answered || locked || sec <= 0) return;
    try {
      const res = await sendAnswer({
        matchId,
        user_id: userId,
        answer: val,                // "evet" | "hayır" | "bilmem"
        time_left_seconds: sec,
        max_time_seconds: perQ,
      });
      setAnswered(true);
      if (res?.locked) setLocked(true);
      // İLERLEME YOK: sunucu can_reveal dediğinde geçilecek
    } catch (e) {
      setInfo("cevap hata: " + e.message);
    }
  };

  // --- özet
  const toSummary = async () => {
    try {
      const sum = await getSummary({ matchId, user_id: userId });
      const a = sum.users?.a?.stats || { score: 0 };
      const b = sum.users?.b?.stats || { score: 0 };
      const code = String(sum.result?.code || "pending");
      alert(`Bitti!\nSkor A:${a.score} - B:${b.score}\nSonuç: ${code}`);
    } catch (e) {
      setInfo("özet hata: " + e.message);
    }
  };

  // --- View helpers
  const progressPct = (() => {
    if (!st?.match) return 0;
    const cur = Number(st.match.current_index || 0);
    const tot = Number(st.match.total_questions || 1);
    return Math.min(100, Math.max(0, Math.round(((cur + 1) / tot) * 100)));
  })();

  const isA = Number(st?.match?.user_a_id) === Number(userId);
  const myScore  = isA ? (st?.scores?.score_a ?? 0) : (st?.scores?.score_b ?? 0);
  const oppScore = isA ? (st?.scores?.score_b ?? 0) : (st?.scores?.score_a ?? 0);
  const mode = st?.match?.mode;
  const canBilmem = mode === "info";
  const disabled = answered || locked || sec <= 0;

  const btnBase =
    "px-4 py-3 rounded-2xl font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 flex items-center justify-center">
        <div className="text-white font-semibold">Yükleniyor…</div>
      </div>
    );
  }

  if (!st) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 flex items-center justify-center">
        <div className="text-white font-semibold">Veri yok</div>
      </div>
    );
  }

  if (st.finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-lg p-6 text-center">
          <h2 className="text-2xl font-extrabold text-cyan-700">Maç bitti</h2>
          <p className="text-gray-600 mt-2">Skorun: <b>{myScore}</b> — Rakip: <b>{oppScore}</b></p>
          <div className="mt-5 flex gap-3 justify-center">
            <button onClick={toSummary} className={`${btnBase} bg-cyan-600 hover:bg-cyan-800`}>Özeti Gör</button>
            <Link to="/duello" className={`${btnBase} bg-gray-400 hover:bg-gray-500`}>Lobiye Dön</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
      <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-xl p-6">
        {/* Başlık */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold text-cyan-700">Düello</div>
            <div className="text-xs text-gray-500">
              Maç #{st.match?.id} • Soru {Number(st.match?.current_index) + 1}/{st.match?.total_questions}
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            Mod: {mode === "speed" ? "Hız" : "Bilgi"}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4 w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-2 bg-cyan-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Soru kartı */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mt-4">
          <div className="text-[15px] font-semibold text-gray-800">Soru</div>
          <div className="mt-2 text-lg font-bold text-gray-900">{st.question?.question}</div>
          <div className="mt-1 text-sm text-gray-600">
            Puan: <b>{st.question?.point}</b> • Kategori: {st.question?.survey_title || "-"}
          </div>

          {/* Sayaç */}
          <div className="mt-4 text-center">
            <div className="text-3xl font-extrabold text-cyan-700 tabular-nums">⏱ {sec}s</div>
          </div>

          {/* Butonlar */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              className={`${btnBase} bg-emerald-600 hover:bg-emerald-800`}
              disabled={disabled}
              onClick={() => submitAnswer("evet")}
            >
              Evet
            </button>
            <button
              className={`${btnBase} bg-rose-500 hover:bg-rose-700`}
              disabled={disabled}
              onClick={() => submitAnswer("hayır")}
            >
              Hayır
            </button>
            <button
              className={`${btnBase} ${canBilmem ? "bg-gray-400 hover:bg-gray-500" : "bg-gray-300"} `}
              disabled={disabled || !canBilmem}
              onClick={() => submitAnswer("bilmem")}
            >
              Bilmem
            </button>
          </div>

          {/* Bilgi satırı */}
          <div className="mt-3 text-sm text-gray-600">
            {sec <= 0 && !st?.finished && <div>Süre doldu. Karşı taraf bekleniyor…</div>}
            {locked && <div>Hız modunda kilitlendi; rakibe sistem “bilmem” yazıldı.</div>}
            {answered && !locked && <div>Cevabın kaydedildi. Karşı tarafı bekliyoruz…</div>}
            {info && <div className="text-red-600">{info}</div>}
          </div>
        </div>

        {/* Skor kutuları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-[15px] font-semibold text-gray-800">Sen</div>
            <div className="text-sm text-gray-600">{st.you?.ad} {st.you?.soyad} ({st.you?.user_code})</div>
            <div className="mt-2 text-2xl font-extrabold text-cyan-700">{myScore}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-[15px] font-semibold text-gray-800">Rakip</div>
            <div className="text-sm text-gray-600">{st.opponent?.ad} {st.opponent?.soyad} ({st.opponent?.user_code})</div>
            <div className="mt-2 text-2xl font-extrabold text-rose-600">{oppScore}</div>
          </div>
        </div>

        {/* Alt aksiyonlar */}
        <div className="mt-5">
          <Link
            to="/duello"
            className="block w-full text-center py-2 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition"
          >
            ← Lobiye Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
