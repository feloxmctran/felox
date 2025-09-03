// src/pages/DuelloMatch.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMatchStatus,
  sendAnswer,
  revealNext,
  getSummary,
  createInvite,
} from "../api/duello";

/* ---------------------- FINISH PANEL ---------------------- */
function FinishPanel({ matchId, liveStatus, userId, onBack }) {
  const navigate = useNavigate();
  const [sum, setSum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Özet çek (başarısız olursa liveStatus ile devam)
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const d = await getSummary({ matchId, user_id: userId });
        if (!stop) setSum(d || null);
      } catch {
        if (!stop) setSum(null);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [matchId, userId]);

  // ---- normalize
  const S = (sum && (sum.summary || sum)) || null;
  const st = liveStatus || {};

  // Kim kim?
  const aId = Number(S?.users?.a?.user_id ?? S?.users?.a?.id ?? st.match?.user_a_id);
  const bId = Number(S?.users?.b?.user_id ?? S?.users?.b?.id ?? st.match?.user_b_id);

  const meIsA =
    Number(userId) === aId ? true : Number(userId) === bId ? false : true;

  const you =
    S?.you ??
    st.you ??
    (meIsA ? S?.users?.a : S?.users?.b) ??
    (meIsA ? st.you : st.opponent) ??
    {};
  const opp =
    S?.opponent ??
    st.opponent ??
    (meIsA ? S?.users?.b : S?.users?.a) ??
    (meIsA ? st.opponent : st.you) ??
    {};

  // Skor
  const aScore =
    S?.users?.a?.stats?.score ??
    S?.scores?.a ??
    st?.scores?.score_a ??
    0;
  const bScore =
    S?.users?.b?.stats?.score ??
    S?.scores?.b ??
    st?.scores?.score_b ??
    0;
  const myScore = meIsA ? aScore : bScore;
  const opScore = meIsA ? bScore : aScore;

  // Sonuç
  const draw = myScore === opScore;
  const meWon = !draw && myScore > opScore;
  const rawMode = S?.match?.mode || S?.mode || st?.match?.mode || "info";
  const modeText = rawMode === "speed" ? "Hız" : "Bilgi";
  const totalQ =
    S?.match?.total_questions ?? S?.total_questions ?? st?.match?.total_questions ?? "-";

  // Revanş
  const askRematch = async () => {
    try {
      setSending(true);
      await createInvite({
        from_user_id: userId,
        to_user_id: opp?.user_id ?? opp?.id,
        to_user_code: opp?.user_code,
        mode: rawMode,
      });
      navigate("/duello");
    } catch (e) {
      alert(e?.message || "Revanş daveti gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-6 sm:p-7">
        {/* Kupa */}
        <div className="w-full flex justify-center mb-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md"
               style={{ backgroundColor: meWon ? "#FBBF24" : draw ? "#D1D5DB" : "#FCA5A5" }}>
            <span className="text-3xl">🏆</span>
          </div>
        </div>

        {/* Başlık + İsimler */}
        <div className="text-center">
          <div className="text-2xl font-black text-cyan-800">Tebrikler !</div>

          {!draw && (
            <div className="mt-1 text-2xl font-extrabold text-gray-900">
              {meWon
                ? `${you?.ad ?? ""} ${you?.soyad ?? ""}`.trim()
                : `${opp?.ad ?? ""} ${opp?.soyad ?? ""}`.trim()}
            </div>
          )}

          <div className="mt-1 text-sm text-gray-600">
            {draw ? "İnanılmaz bir mücadele, skorlar eşit!" : "Müthiş bir galibiyet aldın 🥳"}
          </div>

          {!draw && (
            <div className="mt-1 text-xs text-gray-500">
              {`Fena yarışmadın ama olmadı, ${meWon
                ? `${opp?.ad ?? ""} ${opp?.soyad ?? ""}`.trim()
                : `${you?.ad ?? ""} ${you?.soyad ?? ""}`.trim()
              }`}
            </div>
          )}

          <div className="mt-1 text-xs text-gray-400">
            Mod: {modeText} • Toplam Soru: {totalQ}
          </div>
        </div>

        {/* İki kutu – sadece TOPLAM */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Sen */}
          <div
            className={`rounded-2xl border bg-white p-4 ${
              meWon ? "border-emerald-300" : draw ? "border-gray-200" : "border-rose-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-700 truncate">
                {you?.ad} {you?.soyad}
              </div>
              {!draw && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                    meWon ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {meWon ? "KAZANAN" : "KAYBEDEN"}
                </span>
              )}
            </div>

            <div className="mt-3">
              <div className="text-3xl font-black tabular-nums">
                {myScore}
              </div>
              <div className="text-[11px] text-gray-500">Toplam</div>
            </div>
          </div>

          {/* Rakip */}
          <div
            className={`rounded-2xl border bg-white p-4 ${
              !draw && !meWon ? "border-emerald-300" : draw ? "border-gray-200" : "border-rose-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-700 truncate">
                {opp?.ad} {opp?.soyad}
              </div>
              {!draw && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                    !meWon ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {!meWon ? "KAZANAN" : "KAYBEDEN"}
                </span>
              )}
            </div>

            <div className="mt-3">
              <div className="text-3xl font-black tabular-nums">
                {opScore}
              </div>
              <div className="text-[11px] text-gray-500">Toplam</div>
            </div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={async () => {
              try {
                const s = await getSummary({ matchId, user_id: userId });
                const a = s?.users?.a?.stats?.score ?? 0;
                const b = s?.users?.b?.stats?.score ?? 0;
                alert(`Özet\nA: ${a} — B: ${b}\nSonuç: ${s?.result?.code || "-"}`);
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

        {loading && (
          <div className="mt-3 text-center text-xs text-gray-400">
            Özet yükleniyor…
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------- MATCH PAGE ---------------------- */
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

  // sayaç
  const restartTick = (start) => {
    clearInterval(timerRef.current);
    setSec(start);
    timerRef.current = setInterval(() => {
      setSec((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
  };

  // status
  const fetchStatus = async () => {
    try {
      const data = await getMatchStatus({ matchId, user_id: userId });
      setSt(data);
      setFinished(!!data.finished);
      setInfo("");

      const idx = Number(data?.match?.current_index ?? 0);
      const isSpeed = String(data?.match?.mode) === "speed";

      const mine = !!data?.answers?.mine;
      const opp = !!data?.answers?.opponent;

      setAnswered(mine);
      setLocked(isSpeed && (mine || opp));

      if (lastIndexRef.current !== idx) {
        lastIndexRef.current = idx;
        setAnswered(false);
        setLocked(false);
        restartTick(Number(data?.ui?.per_question_seconds || 16));
      }

      const canReveal =
        !data.finished &&
        ((isSpeed && (mine || opp)) || (!isSpeed && mine && opp));

      if (canReveal && !revealGuardRef.current) {
        revealGuardRef.current = true;
        try {
          await revealNext({ matchId, user_id: userId });
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

  // ilk yükleme + poll
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchStatus();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, 1000);

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId]);

  // süre 0 -> reveal
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, finished]);

  // finished olunca sayaç/poll dursun
  useEffect(() => {
    if (finished) {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    }
  }, [finished]);

  // cevap
  const submitAnswer = async (val) => {
    if (!st || answered || locked || sec <= 0) return;
    try {
      const res = await sendAnswer({
        matchId,
        user_id: userId,
        answer: val, // "evet" | "hayır" | "bilmem"
        time_left_seconds: sec,
        max_time_seconds: perQ,
      });
      setAnswered(true);
      if (res?.locked) setLocked(true);
    } catch (e) {
      setInfo("cevap hata: " + e.message);
    }
  };

  // view helpers
  const progressPct = (() => {
    if (!st?.match) return 0;
    const cur = Number(st.match.current_index || 0);
    const tot = Number(st.match.total_questions || 1);
    return Math.min(100, Math.max(0, Math.round(((cur + 1) / tot) * 100)));
  })();

  const isA = Number(st?.match?.user_a_id) === Number(userId);
  const myScore = isA ? st?.scores?.score_a ?? 0 : st?.scores?.score_b ?? 0;
  const oppScore = isA ? st?.scores?.score_b ?? 0 : st?.scores?.score_a ?? 0;
  const mode = st?.match?.mode;
  const canBilmem = mode === "info";
  const disabled = answered || locked || sec <= 0;

  const btnBase =
    "px-4 py-3 rounded-2xl font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition";

  // ---- render
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

  // ----- FINISH PANEL -----
  if (st.finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <FinishPanel
          matchId={matchId}
          liveStatus={st}
          userId={userId}
          onBack={() => (window.location.href = "/duello")}
        />
      </div>
    );
  }

  // ----- MATCH PLAY VIEW -----
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
      <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-xl p-6">
        {/* Başlık */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold text-cyan-700">Düello</div>
            <div className="text-xs text-gray-500">
              Maç #{st.match?.id} • Soru {Number(st.match?.current_index) + 1}/
              {st.match?.total_questions}
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
          <div className="mt-2 text-lg font-bold text-gray-900">
            {st.question?.question}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Puan: <b>{st.question?.point}</b> • Kategori:{" "}
            {st.question?.survey_title || "-"}
          </div>

          {/* Sayaç */}
          <div className="mt-4 text-center">
            <div className="text-3xl font-extrabold text-cyan-700 tabular-nums">
              ⏱ {sec}s
            </div>
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
              className={`${btnBase} ${
                canBilmem ? "bg-gray-400 hover:bg-gray-500" : "bg-gray-300"
              } `}
              disabled={disabled || !canBilmem}
              onClick={() => submitAnswer("bilmem")}
            >
              Bilmem
            </button>
          </div>

          {/* Bilgi satırı */}
          <div className="mt-3 text-sm text-gray-600">
            {sec <= 0 && !st?.finished && (
              <div>Süre doldu. Karşı taraf bekleniyor…</div>
            )}
            {locked && (
              <div>Hız modunda kilitlendi; rakibe sistem “bilmem” yazıldı.</div>
            )}
            {answered && !locked && (
              <div>Cevabın kaydedildi. Karşı tarafı bekliyoruz…</div>
            )}
            {info && <div className="text-red-600">{info}</div>}
          </div>
        </div>

        {/* Skor kutuları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-[15px] font-semibold text-gray-800">Sen</div>
            <div className="text-sm text-gray-600">
              {st.you?.ad} {st.you?.soyad} ({st.you?.user_code})
            </div>
            <div className="mt-2 text-2xl font-extrabold text-cyan-700">
              {myScore}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-[15px] font-semibold text-gray-800">Rakip</div>
            <div className="text-sm text-gray-600">
              {st.opponent?.ad} {st.opponent?.soyad} ({st.opponent?.user_code})
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-600">
              {oppScore}
            </div>
          </div>
        </div>

        {/* Alt aksiyonlar – OYUN SIRASINDA sadece Lobiye Dön */}
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
