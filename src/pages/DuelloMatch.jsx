// src/pages/DuelloMatch.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMatchStatus, sendAnswer, revealNext, getSummary, createInvite } from "../api/duello";

export default function DuelloMatch({ matchId, userId }) {
  const [st, setSt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sec, setSec] = useState(16);
  const [answered, setAnswered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [info, setInfo] = useState("");

  // timer & polling
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const lastIndexRef = useRef(null);
  const revealGuardRef = useRef(false);

  const perQ = Number(st?.ui?.per_question_seconds || 16);

  // --- yardımcı: görsel sayacı yeniden başlat
  const restartTick = (start) => {
    clearInterval(timerRef.current);
    setSec(start);
    timerRef.current = setInterval(() => {
      setSec((p) => (p > 0 ? p - 1 : 0)); // sadece görsel, reveal yok
    }, 1000);
  };

function DuelWinnerPanel({ matchId, user, onBack }) {
  const [sum, setSum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const d = await getSummary({ matchId, user_id: user.id });
        if (!stop) setSum(d);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [matchId, user.id]);

  if (loading) {
    return (
      <div className="w-full rounded-3xl bg-white/90 p-6 text-center shadow-xl">
        <div className="text-gray-600 text-sm">Özet yükleniyor…</div>
      </div>
    );
  }
  if (!sum?.success) {
    return (
      <div className="w-full rounded-3xl bg-white/90 p-6 text-center shadow-xl">
        <div className="text-gray-600 text-sm">Özet alınamadı.</div>
        <div className="mt-3">
          <button onClick={onBack} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold">
            Lobiye Dön
          </button>
        </div>
      </div>
    );
  }

  const A = sum.users?.a || {};
const B = sum.users?.b || {};
const aStats = A.stats || { correct:0, wrong:0, bilmem:0, score:0 };
const bStats = B.stats || { correct:0, wrong:0, bilmem:0, score:0 };

// Ben A mıyım? (id alan adı A.user_id / A.id olabilir)
const meIsA = Number(A.user_id ?? A.id) === Number(user.id);

// Panelde kullanılacak kişiler (özetten "you/opponent" gelmiyorsa A/B'den türet)
const you = sum.you || (meIsA ? A : B);
const opp = sum.opponent || (meIsA ? B : A);

const myStats = meIsA ? aStats : bStats;
const opStats = meIsA ? bStats : aStats;


  const meWon  = (sum.result?.code === "a_win" && meIsA) || (sum.result?.code === "b_win" && !meIsA);
  const isDraw = sum.result?.code === "draw";
  const title = isDraw ? "Berabere!" : meWon ? `Tebrikler ${you.ad} ${you.soyad}!` : `${opp.ad} ${opp.soyad} kazandı`;
  const subtitle = isDraw ? "İnanılmaz bir mücadele, skorlar eşit!" : meWon ? "Müthiş bir galibiyet aldın 🎉" : "Bir dahakine sen alacaksın 💪";

  const ScoreBadge = ({ value, label, good, neutral }) => (
    <div className="px-3 py-2 rounded-xl bg-white/70 border border-gray-200 text-center">
      <div className={`text-xl font-extrabold ${neutral ? "text-gray-700" : good ? "text-emerald-700" : "text-rose-700"}`}>{value}</div>
      <div className="text-[11px] tracking-wide text-gray-500">{label}</div>
    </div>
  );

  const askRematch = async () => {
    try {
      setSending(true);
      await createInvite({
  from_user_id: you.id,
  to_user_id: opp?.user_id ?? opp?.id,
  to_user_code: opp?.user_code,       // varsa gönder
  mode: sum.match?.mode || sum.mode || "info",
});

      navigate("/duello");                 // Lobi yolunu projene göre değiştir
    } catch (e) {
      alert(e?.message || "Revanş daveti gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-b from-emerald-50 to-white p-6 shadow-2xl overflow-hidden">
      {/* Kupa */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <div className={`${meWon ? "bg-amber-400" : isDraw ? "bg-gray-300" : "bg-rose-300"} w-16 h-16 rounded-full shadow-lg flex items-center justify-center animate-bounce`}>
          <span className="text-3xl">🏆</span>
        </div>
      </div>

      {/* Başlık */}
      <div className="pt-6 text-center">
        <div className="text-2xl font-black text-cyan-800">{title}</div>
        <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
        <div className="text-xs text-gray-400 mt-1">
          {(() => {
  const rawMode = sum.match?.mode || sum.mode || "info";
  const modeText = rawMode === "speed" ? "Hız" : "Bilgi";
  const totalQ = sum.match?.total_questions ?? sum.total_questions ?? "-";
  return <>Mod: {modeText} • Toplam Soru: {totalQ}</>;
})()}

        </div>
      </div>

      {/* İki kolon sonuç */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sen */}
        <div className={`rounded-2xl border p-4 bg-white/80 ${meWon ? "border-emerald-300" : isDraw ? "border-gray-200" : "border-rose-200"}`}>
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-gray-800 truncate">{you.ad} {you.soyad}</div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${meWon ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {meWon ? "KAZANAN" : isDraw ? "—" : "KAYBEDEN"}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <ScoreBadge value={myStats.correct} label="Doğru" good />
            <ScoreBadge value={myStats.wrong}   label="Yanlış" />
            <ScoreBadge value={myStats.bilmem}  label="Bilmem" neutral />
            <ScoreBadge value={myStats.score}   label="Toplam" good={myStats.score>=0} />
          </div>
        </div>

        {/* Rakip */}
        <div className={`rounded-2xl border p-4 bg-white/80 ${(!meWon && !isDraw) ? "border-emerald-300" : isDraw ? "border-gray-200" : "border-rose-200"}`}>
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-gray-800 truncate">{opp.ad} {opp.soyad}</div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${(!meWon && !isDraw) ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {(!meWon && !isDraw) ? "KAZANAN" : isDraw ? "—" : "KAYBEDEN"}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <ScoreBadge value={opStats.correct} label="Doğru" good />
            <ScoreBadge value={opStats.wrong}   label="Yanlış" />
            <ScoreBadge value={opStats.bilmem}  label="Bilmem" neutral />
            <ScoreBadge value={opStats.score}   label="Toplam" good={opStats.score>=0} />
          </div>
        </div>
      </div>

      {/* Butonlar */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
       <button
  onClick={async () => {
    try {
      const s = await getSummary({ matchId, user_id: user.id });
      const a = s.users?.a?.stats || { score:0 };
      const b = s.users?.b?.stats || { score:0 };
      alert(`Özet\nA: ${a.score} — B: ${b.score}\nSonuç: ${s.result?.code || "-"}`);
    } catch (e) {
      alert(e?.message || "Özet alınamadı.");
    }
  }}
  className="px-4 py-2 rounded-xl bg-cyan-700 text-white font-bold hover:bg-cyan-800 active:scale-95"
>
  Özeti Gör
</button>

        <button
          onClick={askRematch}
          disabled={sending}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
        >
          {sending ? "Revanş daveti…" : "Revanş İste"}
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 active:scale-95"
        >
          Lobiye Dön
        </button>
      </div>
    </div>
  );
}



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
        restartTick(Number(data?.ui?.per_question_seconds || 16));
      }

      // kendi kurallarımıza göre reveal kararı
const canReveal =
  (!data.finished) && (
    (isSpeed && (mine || opp)) ||       // hiz: biri cevap verdiyse
    (!isSpeed && mine && opp)          // bilgi: ikisi de cevap verdiyse
  );

if (canReveal && !revealGuardRef.current) {
  revealGuardRef.current = true;
  try {
    await revealNext({ matchId, user_id: userId });
  } catch (_) {
    // sessiz geç
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

  // süre 0 olunca (bitmediyse) tek sefer reveal
useEffect(() => {
  if (!st || finished) return;
  if (sec === 0 && !revealGuardRef.current) {
    revealGuardRef.current = true;
    revealNext({ matchId, user_id: userId })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          revealGuardRef.current = false;
          fetchStatus();
        }, 250);
      });
  }
}, [sec, finished]); // st'yi eklemeye gerek yok


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

// --- revanş iste
const rematch = async () => {
  try {
    const code = st?.opponent?.user_code;
    const mode = st?.match?.mode || "info";
    if (!code) {
      setInfo("Rakip kodu alınamadı.");
      return;
    }
    const d = await createInvite({ from_user_id: userId, to_user_code: code, mode });
    if (d?.success) {
      setInfo("Revanş daveti gönderildi! Lobiye dönüp bekleyebilirsin.");
    } else {
      setInfo(d?.error || "Revanş daveti gönderilemedi.");
    }
  } catch (e) {
    setInfo("revanş hata: " + e.message);
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
      <div className="w-full max-w-2xl">
        <DuelWinnerPanel
          matchId={matchId}
          user={{ id: st?.you?.id, ad: st?.you?.ad, soyad: st?.you?.soyad }}
          onBack={() => (window.location.href = "/duello")} // Lobi rotanı gerekiyorsa değiştir
        />
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
