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

/* -----------------------------------------------------------
   Bitince görünen panel (sadece toplam puan + isimler)
----------------------------------------------------------- */
function DuelWinnerPanel({ matchId, viewer, onBack, fallback }) {
  const [sum, setSum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const d = await getSummary({ matchId, user_id: viewer.id });
        if (!abort) setSum(d);
      } catch {
        if (!abort) setSum(null);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [matchId, viewer.id]);

  // ---- Özet varsa onu, yoksa status fallback'ini normalize et
  const S = (sum && (sum.summary || sum)) || null; // bazı backend'ler summary döndürüyor
  const F = fallback || {};
  const FM = F.match || {};
  const FS = F.scores || {};

  const A = S?.users?.a || {};
  const B = S?.users?.b || {};

  const aId = Number(A.user_id ?? A.id ?? FM.user_a_id);
  const bId = Number(B.user_id ?? B.id ?? FM.user_b_id);

  // viewer A mı B mi?
  const viewerIsA =
    Number(viewer.id) === aId ? true : Number(viewer.id) === bId ? false : true;

  // Kişiler
  const you =
    S?.you ||
    (viewerIsA ? (Object.keys(A).length ? A : F.you || {}) : (Object.keys(B).length ? B : F.you || {}));
  const opp =
    S?.opponent ||
    (viewerIsA ? (Object.keys(B).length ? B : F.opponent || {}) : (Object.keys(A).length ? A : F.opponent || {}));

  // Skorlar (istatistik yoksa status skorunu kullan)
  const myScore =
    (viewerIsA ? A.stats?.score : B.stats?.score) ??
    (viewerIsA ? Number(FS.score_a ?? 0) : Number(FS.score_b ?? 0));
  const oppScore =
    (viewerIsA ? B.stats?.score : A.stats?.score) ??
    (viewerIsA ? Number(FS.score_b ?? 0) : Number(FS.score_a ?? 0));

  // Kazanan / kaybeden
  const rawResult =
    S?.result?.code ||
    (myScore === oppScore
      ? "draw"
      : myScore > oppScore
      ? viewerIsA
        ? "a_win"
        : "b_win"
      : viewerIsA
      ? "b_win"
      : "a_win");

  const isDraw = rawResult === "draw";
  const winnerIsA = rawResult === "a_win";
  const winner = isDraw ? null : winnerIsA ? A : B;
  const loser = isDraw ? null : winnerIsA ? B : A;

  const rawMode = S?.match?.mode || S?.mode || FM.mode || "info";
  const modeText = rawMode === "speed" ? "Hız" : "Bilgi";
  const totalQ =
    S?.match?.total_questions ??
    S?.total_questions ??
    FM.total_questions ??
    (S?.questions?.length ?? "-");

  const askRematch = async () => {
    try {
      setSending(true);
      await createInvite({
        from_user_id: viewer.id,
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

  // --- UI
  if (loading) {
    return (
      <div className="w-full rounded-3xl bg-white/90 p-6 text-center shadow-xl">
        <div className="text-gray-600 text-sm">Özet yükleniyor…</div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-3xl bg-white/95 p-6 shadow-2xl overflow-hidden">
      {/* Kupa – tam görünmesi için üst padding verip kupayı hafif yukarı taşıyoruz */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2">
        <div className="w-16 h-16 rounded-full bg-amber-400 shadow-lg flex items-center justify-center animate-bounce">
          <span className="text-3xl">🏆</span>
        </div>
      </div>

      {/* Başlık ve isimler */}
      <div className="pt-10 text-center">
        <div className="text-2xl font-black text-cyan-800">
          {isDraw ? "Berabere !" : "Tebrikler !"}
        </div>

        {/* Kazanan adı (beraberelikte iki isim yan yana) */}
        {!isDraw ? (
          <div className="text-2xl font-black text-gray-900 mt-1">
            {(winner?.ad || "") + " " + (winner?.soyad || "")}
          </div>
        ) : (
          <div className="text-xl font-extrabold text-gray-800 mt-1">
            {(A?.ad || "") + " " + (A?.soyad || "")} &nbsp;—&nbsp;
            {(B?.ad || "") + " " + (B?.soyad || "")}
          </div>
        )}

        {/* Mesajlar */}
        {!isDraw ? (
          <>
            <div className="text-sm text-gray-600 mt-2">
              Müthiş bir galibiyet aldın 🥳
            </div>
            <div className="text-sm text-gray-600">
              Fena yarışmadın ama olmadı,
            </div>
            <div className="text-base font-semibold text-gray-800 mt-0.5">
              {(loser?.ad || "") + " " + (loser?.soyad || "")}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600 mt-2">
            Harika mücadele! Skorlar eşit.
          </div>
        )}

        <div className="text-xs text-gray-400 mt-2">
          Mod: {modeText} • Toplam Soru: {totalQ}
        </div>
      </div>

      {/* Skor kartları – sadece TOPLAM puan */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Kazanan/Kaybeden kartı 1 */}
        <div
          className={`rounded-2xl border p-4 bg-white ${
            !isDraw && winnerIsA ? "border-emerald-300" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-gray-800 truncate">
              {(A?.ad || "") + " " + (A?.soyad || "")}
            </div>
            {!isDraw && (
              <div
                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  winnerIsA ? "bg-emerald-600 text-white" : "bg-rose-200 text-rose-800"
                }`}
              >
                {winnerIsA ? "KAZANAN" : "KAYBEDEN"}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Toplam
            </div>
            <div className="text-3xl font-black text-cyan-700 tabular-nums">
              {Number.isFinite(Number(winnerIsA ? myScore : oppScore))
                ? winnerIsA
                  ? myScore
                  : oppScore
                : 0}
            </div>
          </div>
        </div>

        {/* Kazanan/Kaybeden kartı 2 */}
        <div
          className={`rounded-2xl border p-4 bg-white ${
            !isDraw && !winnerIsA ? "border-emerald-300" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-gray-800 truncate">
              {(B?.ad || "") + " " + (B?.soyad || "")}
            </div>
            {!isDraw && (
              <div
                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  !winnerIsA ? "bg-emerald-600 text-white" : "bg-rose-200 text-rose-800"
                }`}
              >
                {!winnerIsA ? "KAZANAN" : "KAYBEDEN"}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Toplam
            </div>
            <div className="text-3xl font-black text-cyan-700 tabular-nums">
              {Number.isFinite(Number(winnerIsA ? oppScore : myScore))
                ? winnerIsA
                  ? oppScore
                  : myScore
                : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Butonlar */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => navigate(`/duello/${matchId}/summary`)}
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

/* -----------------------------------------------------------
   Ana maç bileşeni (mevcut akışları koruyor)
----------------------------------------------------------- */
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
      const opp = !!data?.answers?.opponent;

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
        !data.finished &&
        ((isSpeed && (mine || opp)) || (!isSpeed && mine && opp));

      if (canReveal && !revealGuardRef.current) {
        revealGuardRef.current = true;
        try {
          await revealNext({ matchId, user_id: userId });
        } catch {
          /* sessiz geç */
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
        answer: val, // "evet" | "hayır" | "bilmem"
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

  // --- basit özet (debug butonu için bırakıldı)
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

  // --- revanş iste (oyun içi)
  const rematch = async () => {
    try {
      const code = st?.opponent?.user_code;
      const mode = st?.match?.mode || "info";
      if (!code) {
        setInfo("Rakip kodu alınamadı.");
        return;
      }
      const d = await createInvite({
        from_user_id: userId,
        to_user_code: code,
        mode,
      });
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
  const myScore = isA
    ? st?.scores?.score_a ?? 0
    : st?.scores?.score_b ?? 0;
  const oppScore = isA
    ? st?.scores?.score_b ?? 0
    : st?.scores?.score_a ?? 0;
  const mode = st?.match?.mode;
  const canBilmem = mode === "info";
  const disabled = answered || locked || sec <= 0;

  const btnBase =
    "px-4 py-3 rounded-2xl font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition";

  // --- render
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
            viewer={{ id: st?.you?.id, ad: st?.you?.ad, soyad: st?.you?.soyad }}
            fallback={st}
            onBack={() => (window.location.href = "/duello")}
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
              Maç #{st.match?.id} • Soru{" "}
              {Number(st.match?.current_index) + 1}/{st.match?.total_questions}
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
              <div>
                Hız modunda kilitlendi; rakibe sistem “bilmem” yazıldı.
              </div>
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
            <div className="text-[15px] font-semibold text-gray-800">
              Rakip
            </div>
            <div className="text-sm text-gray-600">
              {st.opponent?.ad} {st.opponent?.soyad} ({st.opponent?.user_code})
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-600">
              {oppScore}
            </div>
          </div>
        </div>

        {/* Alt aksiyonlar */}
        <div className="mt-5 flex gap-2 justify-between">
          <button
            onClick={toSummary}
            className="flex-1 text-center py-2 rounded-2xl font-semibold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95 transition"
          >
            Özeti Gör
          </button>
          <button
            onClick={rematch}
            className="flex-1 text-center py-2 rounded-2xl font-semibold bg-emerald-600 text-white hover:bg-emerald-800 active:scale-95 transition"
          >
            Revanş İste
          </button>
          <Link
            to="/duello"
            className="flex-1 text-center py-2 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition"
          >
            ← Lobiye Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
