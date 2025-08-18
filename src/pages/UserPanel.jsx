import React, { useState, useEffect, useMemo, useRef } from "react";

/* -------------------- Universal User Storage -------------------- */
async function getFeloxUser() {
  let userStr = localStorage.getItem("felox_user");
  if (
    !userStr &&
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  ) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key: "felox_user" });
      userStr = value;
    } catch {}
  }
  return userStr ? JSON.parse(userStr) : null;
}

async function removeFeloxUser() {
  localStorage.removeItem("felox_user");
  if (
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  ) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key: "felox_user" });
    } catch {}
  }
}

/* -------------------- Config -------------------- */
const apiUrl =
  process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

const PERIODS = [
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" },
  { key: "year", label: "Bu Yıl" },
];

/* -------------------- Rastgele karıştırma -------------------- */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* -------------------- Stars (puan kadar) -------------------- */
const Stars = ({ count = 1 }) => (
  <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
    {Array.from({ length: Math.max(1, Math.min(count, 10)) }).map((_, i) => (
      <span
        key={i}
        className="star-fx absolute text-yellow-400 text-5xl"
        style={{
          left: `${35 + Math.random() * 30}%`,
          top: `${20 + Math.random() * 50}%`,
          animationDelay: `${i * 0.08}s`,
        }}
      >
        ⭐
      </span>
    ))}
    <style>
      {`
        .star-fx {
          animation: star-pop 1s cubic-bezier(.66,0,.34,1.11);
          opacity: 0.95;
        }
        @keyframes star-pop {
          0%   { transform: scale(0.5) translateY(0); opacity:0.5; }
          35%  { transform: scale(1.15) translateY(-18px); }
          70%  { transform: scale(1.0) translateY(-40px); }
          100% { transform: scale(0.7) translateY(-60px); opacity:0; }
        }
      `}
    </style>
  </div>
);

/* -------------------- Küçük yardımcı UI bileşenleri -------------------- */
const COLOR_CLASSES = {
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
  gray: "bg-gray-100 text-gray-700",
};

const StatusBadge = ({ text, color = "emerald" }) => {
  const cls = COLOR_CLASSES[color] || COLOR_CLASSES.emerald;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {text}
    </span>
  );
};

const StatCard = ({ label, children }) => (
  <div className="flex-1 min-w-[30%] bg-white/80 rounded-2xl shadow p-4 text-center h-[91px]">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-2xl font-extrabold text-emerald-700 leading-none whitespace-nowrap overflow-hidden text-ellipsis tabular-nums">
      {children}
    </div>
  </div>
);

/* -------------------- Puanlarım Modal (başlık bazlı) -------------------- */
function PointsTable({ show, onClose, loading, error, data }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-4 relative">
        <button
          className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500"
          onClick={onClose}
          title="Kapat"
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-3 text-purple-700 text-center">
          Puanlarım (Başlık Bazında)
        </h3>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Yükleniyor…</div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : !data?.length ? (
          <div className="text-center text-gray-500 py-6">Henüz veriniz yok.</div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-xl border">
            <table className="min-w-full text-xs">
              <thead className="bg-purple-100 sticky top-0">
                <tr>
                  <th className="p-2 border">Başlık</th>
                  <th className="p-2 border" title="Denenen (bilmem hariç) / Cevaplanan">
                    Den./Cev.
                  </th>
                  <th className="p-2 border">Doğru</th>
                  <th className="p-2 border">Yanlış</th>
                  <th className="p-2 border">Bilmem</th>
                  <th className="p-2 border">Net Puan</th>
                  <th className="p-2 border" title="(Doğru / Denenen) × 100">Başarı %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr
                    key={r?.survey_id ?? i}
                    className={i === 0 ? "bg-green-50" : i === data.length - 1 ? "bg-red-50" : ""}
                  >
                    <td className="p-2 border text-left">{r?.title}</td>
                    <td className="p-2 border text-center">
                      {r?.attempted}/{r?.answered}
                    </td>
                    <td className="p-2 border text-center">{r?.correct}</td>
                    <td className="p-2 border text-center">{r?.wrong}</td>
                    <td className="p-2 border text-center">{r?.bilmem}</td>
                    <td
                      className={`p-2 border text-center ${
                        (r?.net_points || 0) > 0
                          ? "text-emerald-700 font-bold"
                          : (r?.net_points || 0) < 0
                          ? "text-red-600 font-bold"
                          : ""
                      }`}
                    >
                      {r?.net_points}
                    </td>
                    <td className="p-2 border text-center font-bold">
                      {typeof r?.score_percent === "number"
                        ? `${r.score_percent}%`
                        : (() => {
                            const den = Number(r?.attempted) || 0;
                            const dogru = Number(r?.correct) || 0;
                            const pct = den > 0 ? Math.round((dogru / den) * 100) : 0;
                            return `${pct}%`;
                          })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================== */
export default function UserPanel() {
  const [user, setUser] = useState(null);

  // Kullanıcı skor ve durum
  const [totalPoints, setTotalPoints] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  // BUGÜN sıralaması
  const [todayRank, setTodayRank] = useState(null);
  const [todayRankLoading, setTodayRankLoading] = useState(false);

  // Görünüm modu
  const [mode, setMode] = useState("panel"); // panel | today | solve | dailySolve | thankyou | genius

  // Sorular (normal/serbest/kademeli)
  const [questions, setQuestions] = useState([]);

  // Doğru sorular (id listesi)
  const [correctAnswered, setCorrectAnswered] = useState([]);

  // Soru çözümü (ortak)
  const [currentIdx, setCurrentIdx] = useState(0);
  const [info, setInfo] = useState("");
  const [timeLeft, setTimeLeft] = useState(24);
  const [timerActive, setTimerActive] = useState(false);

  // Genel puan tablosu
  const [leaderboards, setLeaderboards] = useState({});
  const [activePeriod, setActivePeriod] = useState("today");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Feedback & yıldız
  const [feedback, setFeedback] = useState("");
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [starsCount, setStarsCount] = useState(1);

  // Puanlarım (performans)
  const [showMyPerf, setShowMyPerf] = useState(false);
  const [myPerf, setMyPerf] = useState([]);
  const [myPerfLoading, setMyPerfLoading] = useState(false);
  const [myPerfError, setMyPerfError] = useState("");

  // En iyi başlık (avatar için) + başarı yüzdesi
  const [bestTitle, setBestTitle] = useState("");
  const [bestTitlePercent, setBestTitlePercent] = useState(null);

  // Avatar manifest
  const [avatarManifest, setAvatarManifest] = useState(null);

  // Kademeli Yarış
  const [ladderActive, setLadderActive] = useState(false);
  const [ladderLevel, setLadderLevel] = useState(1); // 1..10
  const [ladderAttempts, setLadderAttempts] = useState(0);
  const [ladderCorrect, setLadderCorrect] = useState(0);
  const [showLevelUpPrompt, setShowLevelUpPrompt] = useState(false);
  const [loadingLevelQuestions, setLoadingLevelQuestions] = useState(false);

  // TEŞEKKÜRLER ekranı için alıntı
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Günün Yarışması
  const [dailyStatus, setDailyStatus] = useState(null); // {success, day_key, finished, index, size, question?}
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [dailyPoints, setDailyPoints] = useState(0);

  // Günlük Puan Durumu (Leaderboard)
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);

  // Güvenli setState için
  const feedbackTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  /* -------------------- Yardımcılar -------------------- */
  const fetchRandomQuote = async () => {
    setQuoteLoading(true);
    try {
      const r = await fetch(`${apiUrl}/api/quotes/random`);
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.text) setQuote({ text: d.text, author: d.author || "" });
      else setQuote(null);
    } catch {
      if (!isMountedRef.current) return;
      setQuote(null);
    } finally {
      if (!isMountedRef.current) return;
      setQuoteLoading(false);
    }
  };

  const gender = useMemo(() => {
    const raw = String(user?.cinsiyet ?? "")
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "");
    const s = raw
      .replace(/ı/g, "i")
      .replace(/i̇/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ç/g, "c")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/â/g, "a");

    if (/(^|[\s_/.-])(erkek|bay|male|man)([\s_/.-]|$)/.test(s)) return "male";
    if (/(^|[\s_/.-])(kadin|bayan|female|woman)([\s_/.-]|$)/.test(s)) return "female";
    return "unknown";
  }, [user?.cinsiyet]);

  /* -------------------- Kullanıcıyı yükle -------------------- */
  useEffect(() => {
    getFeloxUser().then((u) => {
      if (u) setUser(u);
      else window.location.href = "/login";
    });
  }, []);

  /* -------------------- Manifesti yükle -------------------- */
  useEffect(() => {
    fetch("/avatars/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAvatarManifest(d))
      .catch(() => {});
  }, []);

  /* -------------------- Kullanıcıya ait verileri çek -------------------- */
  useEffect(() => {
    if (!user) return;

    // Doğru cevap id'leri
    fetch(`${apiUrl}/api/user/${user.id}/answers`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (data?.success && Array.isArray(data.answers)) {
          setCorrectAnswered(
            data.answers
              .filter((ans) => ans?.is_correct === 1 && ans?.question_id != null)
              .map((ans) => ans.question_id)
          );
        }
      })
      .catch(() => {});

    // Toplam puan ve cevap sayısı
    fetch(`${apiUrl}/api/user/${user.id}/total-points`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (data?.success) {
          setTotalPoints(data.totalPoints ?? 0);
          setAnsweredCount(data.answeredCount ?? 0);
        }
      })
      .catch(() => {});

    // BUGÜN sıralaması
    setTodayRankLoading(true);
    fetch(`${apiUrl}/api/user/${user.id}/rank?period=today`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMountedRef.current) return;
        setTodayRank(d?.success ? d.rank : null);
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setTodayRank(null);
      })
      .finally(() => {
        if (!isMountedRef.current) return;
        setTodayRankLoading(false);
      });

    // Genel puan tabloları (ön doldurma)
    PERIODS.forEach((p) => {
      fetch(`${apiUrl}/api/leaderboard?period=${p.key}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMountedRef.current) return;
          const raw = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
          const filtered = raw.filter(
            (u) => u && (u.total_points || 0) > 0
          );
          setLeaderboards((prev) => ({ ...prev, [p.key]: filtered }));
        })
        .catch(() => {});
    });

    // Avatar için en iyi başlık ve yüzdesi
    fetch(`${apiUrl}/api/user/${user.id}/performance`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMountedRef.current) return;
        if (d?.success && Array.isArray(d.performance) && d.performance.length) {
          setBestTitle(d.performance[0]?.title || "");
          const pct =
            typeof d.performance[0]?.score_percent === "number"
              ? d.performance[0].score_percent
              : null;
          setBestTitlePercent(pct);
        } else {
          setBestTitle("");
          setBestTitlePercent(null);
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setBestTitle("");
        setBestTitlePercent(null);
      });

    // Günün Yarışması
    fetchDailyStatus();

    // eslint-disable-next-line
  }, [user]);

  // thankyou moduna her girişte yeni söz çek
  useEffect(() => {
    if (mode === "thankyou") fetchRandomQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* -------------------- Günlük Puan Durumu -------------------- */
  const fetchDailyLeaderboard = async (dayKey) => {
    try {
      const r = await fetch(`${apiUrl}/api/daily/leaderboard?day=${encodeURIComponent(dayKey)}`);
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.success && Array.isArray(d.leaderboard)) {
        setDailyLeaderboard(d.leaderboard.filter(Boolean));
      } else {
        setDailyLeaderboard([]);
      }
    } catch {
      if (!isMountedRef.current) return;
      setDailyLeaderboard([]);
    }
  };

  /* -------------------- Rastgele soru (serbest) -------------------- */
  const startRandom = async () => {
    const res = await fetch(`${apiUrl}/api/user/approved-surveys`);
    const data = await res.json();
    let allQuestions = [];
    for (const survey of data?.surveys || []) {
      const qRes = await fetch(`${apiUrl}/api/surveys/${survey.id}/questions`).catch(() => null);
      const qData = qRes ? await qRes.json().catch(() => null) : null;
      if (qData?.success && Array.isArray(qData.questions)) {
        allQuestions = allQuestions.concat(qData.questions);
      }
    }
    const filtered = allQuestions.filter(
      (q) => q && !correctAnswered.includes(q.id)
    );
    shuffleInPlace(filtered);

    setQuestions(filtered);
    setCurrentIdx(0);
    setMode("solve");
    setLadderActive(false);
    setDailyActive(false);
  };

  /* -------------------- Kademeli Yarış -------------------- */
  const loadLevelQuestions = async (level) => {
    setLoadingLevelQuestions(true);
    try {
      const r = await fetch(
        `${apiUrl}/api/user/${user.id}/kademeli-questions?point=${level}`
      );
      const d = await r.json();
      const all = Array.isArray(d?.questions) ? d.questions.filter(Boolean) : [];

      setQuestions(all);
      setCurrentIdx(0);
      setMode("solve");
      setLadderActive(true);
      setDailyActive(false);
    } finally {
      setLoadingLevelQuestions(false);
    }
  };

  const startLadder = async () => {
    setLadderLevel(1);
    setLadderAttempts(0);
    setLadderCorrect(0);
    await loadLevelQuestions(1);
  };

  const checkLadderProgress = async () => {
    try {
      const r = await fetch(
        `${apiUrl}/api/user/${user.id}/kademeli-next?point=${ladderLevel}`
      );
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.success && d.can_level_up) {
        if (d.status === "genius") {
          setMode("genius");
          setLadderActive(false);
          return;
        }
        setShowLevelUpPrompt(true);
      } else {
        await loadLevelQuestions(ladderLevel);
      }
    } catch {
      // sessiz
    }
  };

  /* -------------------- Günün Yarışması: durum & puan -------------------- */
  async function fetchMyDailyPoints(dayKey) {
    if (!user || !dayKey) return;
    try {
      const r = await fetch(`${apiUrl}/api/daily/leaderboard?day=${encodeURIComponent(dayKey)}`);
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.success && Array.isArray(d.leaderboard)) {
        const me = d.leaderboard.find((u) => String(u?.id) === String(user?.id));
        setDailyPoints(me?.total_points || 0);
      }
    } catch {
      /* sessizce geç */
    }
  }

  async function fetchDailyStatus() {
    if (!user) return;
    try {
      const r = await fetch(`${apiUrl}/api/daily/status?user_id=${user.id}`);
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.success) {
        setDailyStatus(d);
        if (d.day_key) {
          fetchMyDailyPoints(d.day_key);
          fetchDailyLeaderboard(d.day_key);
        }
      } else {
        setDailyStatus(null);
      }
    } catch {
      if (!isMountedRef.current) return;
      setDailyStatus(null);
    }
  }

  async function startOrContinueDaily() {
    if (!user) return;
    setDailyLoading(true);
    setDailyError("");
    try {
      const r = await fetch(`${apiUrl}/api/daily/status?user_id=${user.id}`);
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.success && !d.finished && d.question) {
        setDailyQuestion(d.question);
        setMode("dailySolve");
        setDailyActive(true);
        setLadderActive(false);
      } else if (d?.success && d.finished) {
        await fetchDailyStatus();
      } else {
        setDailyError(d?.error || "Yarışma bilgisi alınamadı.");
      }
    } catch (e) {
      if (!isMountedRef.current) return;
      setDailyError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      if (!isMountedRef.current) return;
      setDailyLoading(false);
    }
  }

  /* -------------------- Zamanlayıcı -------------------- */
  useEffect(() => {
    const hasQuestion =
      (mode === "solve" && questions.length > 0) ||
      (mode === "dailySolve" && dailyQuestion);
    if (hasQuestion) {
      setTimeLeft(24);
      setTimerActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, mode, questions, dailyQuestion]);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(t);
    }
    if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      handleAnswer("bilmem");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timerActive]);

  /* -------------------- Cevap işle -------------------- */
  const getSuccessMsg = (puan) => {
    if (puan <= 3) return "TEBRİKLER";
    if (puan <= 6) return "HARİKASIN";
    if (puan <= 9) return "SÜPERSİN";
    return "MUHTEŞEMSİN";
  };

  const refreshUserStats = async () => {
    try {
      const r = await fetch(`${apiUrl}/api/user/${user.id}/total-points`);
      const data = await r.json();
      if (data?.success) {
        setTotalPoints(data.totalPoints ?? 0);
        setAnsweredCount(data.answeredCount ?? 0);
      }
    } catch {}
    try {
      const d = await fetch(`${apiUrl}/api/user/${user.id}/rank?period=today`).then((x) =>
        x.json()
      );
      setTodayRank(d?.success ? d.rank : null);
    } catch {}
  };

  const handleDailyAnswer = (cevap, opts = { exitAfter: false }) => () => {
    handleAnswer(cevap, opts);
  };

  const handleAnswer = (cevap, opts = { exitAfter: false }) => {
    setTimerActive(false);
    setInfo("");

    // GÜNLÜK YARIŞMASI
    if (mode === "dailySolve" && dailyActive && dailyQuestion && dailyQuestion?.id != null) {
      const q = dailyQuestion;
      fetch(`${apiUrl}/api/daily/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          question_id: q.id,
          answer: cevap,
          time_left_seconds: timeLeft,
          max_time_seconds: 24,
        }),
      })
        .then((res) => res.json())
        .then(async (d) => {
          let msg = "";
          let stars = false;
          let starCount = 1;
          if (cevap === "bilmem") msg = "ÖĞREN DE GEL";
          else if (d?.is_correct === 1) {
            msg = getSuccessMsg(q.point);
            stars = true;
            starCount = Math.max(1, Math.min(q.point || 1, 10));
          } else msg = "BİLEMEDİN";

          setFeedback(msg);
          setStarsCount(starCount);
          setShowStars(stars && d?.is_correct === 1);
          setFeedbackActive(true);

          await refreshUserStats();
          await fetchDailyStatus();

          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(async () => {
            if (!isMountedRef.current) return;
            setFeedbackActive(false);
            setShowStars(false);

            const r2 = await fetch(`${apiUrl}/api/daily/status?user_id=${user.id}`).catch(()=>null);
            const nx = r2 ? await r2.json().catch(()=>null) : null;

            if (!isMountedRef.current) return;

            if (nx?.success && !nx.finished && nx.question) {
              setDailyQuestion(nx.question);
              if (opts.exitAfter) {
                setDailyActive(false);
                setMode("today");
              }
            } else {
              await fetchDailyStatus();
              setDailyActive(false);
              setMode("today");
            }
          }, 3200);
        })
        .catch(() => setInfo("Cevap kaydedilemedi! (İletişim hatası)"));
      return;
    }

    // NORMAL / KADEMELİ
    const q = questions[currentIdx];
    if (!q || q?.id == null) {
      // beklenmedik durum; güvenli çık
      setMode("thankyou");
      return;
    }

    fetch(`${apiUrl}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        question_id: q.id,
        answer: cevap,
        time_left_seconds: timeLeft,
        max_time_seconds: 24,
      }),
    })
      .then((res) => res.json())
      .then((d) => {
        if (d?.success) {
          let msg = "";
          let stars = false;
          if (cevap === "bilmem") msg = "ÖĞREN DE GEL";
          else if (d.is_correct === 1) {
            msg = getSuccessMsg(q.point);
            stars = true;
          } else msg = "BİLEMEDİN";

          setFeedback(msg);
          setStarsCount(stars ? Math.max(1, Math.min(q.point || 1, 10)) : 1);
          setShowStars(stars && d.is_correct === 1);
          setFeedbackActive(true);

          if (ladderActive && cevap !== "bilmem") {
            setLadderAttempts((prev) => prev + 1);
            if (d.is_correct === 1) setLadderCorrect((prev) => prev + 1);
          }

          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(async () => {
            if (!isMountedRef.current) return;
            setFeedbackActive(false);
            setShowStars(false);

            if (d.is_correct === 1) {
              setCorrectAnswered((prev) => (q?.id ? [...prev, q.id] : prev));
            }

            refreshUserStats();

            if (currentIdx < questions.length - 1) {
              setCurrentIdx((prev) => prev + 1);
            } else {
              if (ladderActive) {
                await checkLadderProgress();
              } else {
                setMode("thankyou");
              }
            }
          }, 3200);
        } else {
          setInfo(d?.error || "Cevap kaydedilemedi!");
        }
      })
      .catch(() => setInfo("Cevap kaydedilemedi! (İletişim hatası)"));
  };

  /* --- Günlük: Şimdilik bu kadar (skip endpoint) --- */
  const handleDailySkip = async () => {
    try {
      if (!dailyQuestion || dailyQuestion?.id == null) {
        // soru yoksa doğrudan dön
        await fetchDailyStatus();
        setDailyActive(false);
        setMode("today");
        return;
      }
      await fetch(`${apiUrl}/api/daily/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          question_id: dailyQuestion.id,
          time_left_seconds: timeLeft,
          max_time_seconds: 24,
        }),
      });
    } catch {}
    await fetchDailyStatus();
    setDailyActive(false);
    setMode("today");
  };

  /* -------------------- Çıkış -------------------- */
  const handleLogout = async () => {
    try {
      await removeFeloxUser();
    } finally {
      window.location.href = "/login";
    }
  };

  /* -------------------- "Puanlarım" performansını yükle -------------------- */
  const loadMyPerformance = async () => {
    if (!user) return;
    setMyPerfLoading(true);
    setMyPerfError("");
    try {
      const res = await fetch(`${apiUrl}/api/user/${user.id}/performance`);
      const data = await res.json();
      if (data?.success) {
        const list = Array.isArray(data.performance) ? data.performance : [];
        setMyPerf(list);
        if (list.length) {
          setBestTitle(list[0]?.title || "");
          const pct =
            typeof list[0]?.score_percent === "number" ? list[0].score_percent : null;
          setBestTitlePercent(pct);
        }
      } else {
        setMyPerfError(data?.error || "Veri alınamadı");
      }
    } catch (e) {
      setMyPerfError("Bağlantı hatası");
    } finally {
      setMyPerfLoading(false);
    }
  };

  /* -------------------- Avatar URL seçimi -------------------- */
  const getAvatarUrl = () => {
    const normalizedTitle = String(bestTitle || "").trim().toLowerCase();

    let entry = {};
    if (avatarManifest) {
      const foundKey = Object.keys(avatarManifest).find(
        (k) => k.trim().toLowerCase() === normalizedTitle
      );
      entry = foundKey ? avatarManifest[foundKey] : {};
    }

    if (gender === "male") {
      return `/avatars/${entry.male || "default-male.png"}`;
    }
    if (gender === "female") {
      return `/avatars/${entry.female || "default-female.png"}`;
    }
    return `/avatars/${entry.neutral || entry.female || entry.male || "default-female.png"}`;
  };

  /* -------------------- Panelde başlık etiketi -------------------- */
  const renderBestTitleBadge = () => {
    if (!bestTitle) {
      return <div className="text-xs text-gray-400">Henüz en iyi başlık yok</div>;
    }

    const pct = typeof bestTitlePercent === "number" ? bestTitlePercent : null;
    if (pct == null) {
      return (
        <div className="text-xs text-gray-600">
          En iyi olduğun başlık: <b className="text-gray-800">{bestTitle}</b>
        </div>
      );
    }

    const titleForSentence = String(bestTitle).toLocaleLowerCase("tr-TR");
    let phrase;
    if (pct < 40) {
      phrase = `sen ${titleForSentence} konusunda iyisin.`;
    } else if (pct <= 80) {
      phrase = `sen ${titleForSentence} konusunda bir uzmansın.`;
    } else {
      phrase = `sen ${titleForSentence} konusunda bir dehasın.`;
    }

    return <div className="text-xs text-gray-700 font-medium">{phrase}</div>;
  };

  /* --- Tek dönemlik leaderboard çekme yardımcı fonksiyonu --- */
  const fetchLeaderboard = async (periodKey) => {
    try {
      const res = await fetch(`${apiUrl}/api/leaderboard?period=${periodKey}`);
      const data = await res.json();
      const raw = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
      const filtered = raw.filter(
        (u) => u && (u.total_points || 0) > 0
      );
      setLeaderboards((prev) => ({ ...prev, [periodKey]: filtered }));
    } catch {}
  };

  /* --- DÖNEM DEĞİŞİNCE VEYA MODAL AÇILINCA GÜNCEL VERİYİ ÇEK --- */
  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard(activePeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriod, showLeaderboard]);

  /* -------------------- Render -------------------- */
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-700">
        <span className="animate-spin text-4xl text-white">⏳</span>
      </div>
    );

  /* -------------------- PANEL -------------------- */
  if (mode === "panel") {
    const Box = ({ title, value, caption }) => (
      <div className="flex-1 min-w-[30%] bg-white/80 rounded-2xl shadow p-4 text-center h-[91px]">
        <div className="text-xs text-gray-500 mb-1">{title}</div>
        <div className="text-2xl font-extrabold text-emerald-700">{value}</div>
        {caption ? (
          <div className="text-[11px] text-gray-500 mt-0.5">{caption}</div>
        ) : null}
      </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6">
          <div className="flex flex-col items-center gap-2">
            {/* Avatar */}
            <div className="rounded-full bg-gray-100 p-1 shadow-md mb-2">
              <img
                src={getAvatarUrl()}
                alt="avatar"
                width={140}
                height={140}
                className="w-[140px] h-[140px] rounded-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-extrabold text-cyan-700 text-center">
              {user.ad} {user.soyad}
            </h1>

            {/* Başlık etiketi */}
            {renderBestTitleBadge()}

            <div className="w-full flex gap-3 mt-3 flex-wrap">
              <Box title="Puanın" value={totalPoints} />
              <Box title="Cevapladığın" value={answeredCount} />
              <Box
                title="Bugün"
                value={
                  todayRankLoading
                    ? "—"
                    : todayRank != null
                    ? `${todayRank}.`
                    : "-"
                }
                caption={todayRankLoading ? "" : "sıradasın"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            {/* Günün Yarışması */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-800 text-white shadow-lg active:scale-95 transition"
              onClick={() => {
                fetchDailyStatus();
                setMode("today");
              }}
              title="Günün yarışmasına git"
            >
              <span className="mr-2">🌞</span> Günün Yarışması
            </button>

            {/* Kademeli Yarış */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:to-fuchsia-800 text-white shadow-lg active:scale-95 transition"
              onClick={startLadder}
              disabled={loadingLevelQuestions}
              title="1 puanlık sorulardan başlayarak seviyeni yükselt!"
            >
              {loadingLevelQuestions ? "Yükleniyor…" : "⚡ Kademeli Yarış"}
            </button>

            {/* Rastgele Soru */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 hover:to-emerald-800 text-white shadow-lg active:scale-95 transition"
              onClick={startRandom}
            >
              <span className="mr-2">🎲</span> Rastgele Soru
            </button>

            {/* Genel Puan Tablosu */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-700 text-white shadow-lg active:scale-95 transition"
              onClick={() => {
                setShowLeaderboard(true);
                fetchLeaderboard(activePeriod);
              }}
            >
              <span className="mr-2">🏆</span> Genel Puan Tablosu
            </button>

            {/* Puanlarım */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:to-purple-800 text-white shadow-lg active:scale-95 transition"
              onClick={() => {
                setShowMyPerf(true);
                loadMyPerformance();
              }}
            >
              <span className="mr-2">📈</span> Puanlarım
            </button>
          </div>

          <button
            className="w-full py-2 mt-3 rounded-2xl text-sm bg-gray-200 text-gray-600 hover:bg-gray-300 font-semibold"
            onClick={handleLogout}
          >
            Çıkış Yap
          </button>

          {/* Genel puan tablosu modalı */}
          {showLeaderboard && (
            <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-3">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-4 relative">
                <button
                  className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500"
                  onClick={() => setShowLeaderboard(false)}
                >
                  &times;
                </button>
                <h3 className="text-xl font-bold mb-3 text-orange-700 text-center">
                  Genel Puan Tablosu
                </h3>
                <div className="flex justify-center gap-1 mb-2 flex-wrap">
                  {PERIODS.map((p) => (
                    <button
                      key={p.key}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        activePeriod === p.key
                          ? "bg-orange-600 text-white"
                          : "bg-orange-100 text-orange-800 hover:bg-orange-300"
                      }`}
                      onClick={() => {
                        setActivePeriod(p.key);
                        fetchLeaderboard(p.key);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <table className="min-w-full border text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 border">#</th>
                      <th className="p-1 border">Ad</th>
                      <th className="p-1 border">Soyad</th>
                      <th className="p-1 border">Puan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(leaderboards[activePeriod]) &&
                    leaderboards[activePeriod].length > 0 ? (
                      leaderboards[activePeriod].slice(0, 10).map((u, i) => (
                        <tr
                          key={`${u?.id ?? "row"}-${i}`}
                          className={String(u?.id) === String(user?.id) ? "bg-yellow-100 font-bold" : ""}
                        >
                          <td className="p-1 border">{i + 1}</td>
                          <td className="p-1 border">{u?.ad ?? "-"}</td>
                          <td className="p-1 border">{u?.soyad ?? "-"}</td>
                          <td className="p-1 border">{u?.total_points ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-gray-400 text-center py-2">
                          Veri yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Puanlarım modalı */}
          <PointsTable
            show={showMyPerf}
            onClose={() => setShowMyPerf(false)}
            loading={myPerfLoading}
            error={myPerfError}
            data={myPerf}
          />

          {/* Kademeli: seviye artırım promptu */}
          {showLevelUpPrompt && (
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-3">
              <div className="bg-white rounded-3xl shadow-2xl p-5 w-full max-w-sm text-center relative">
                <button
                  className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500"
                  onClick={() => setShowLevelUpPrompt(false)}
                  title="Kapat"
                >
                  &times;
                </button>
                <div className="text-2xl font-bold text-emerald-700 mb-2">
                  Soruları biraz zorlaştıralım mı?
                </div>
                <div className="text-gray-600 mb-4">
                  Harika gidiyorsun! {ladderLevel}. seviyeyi başarıyla geçtin.
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    className="px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-800"
                    onClick={async () => {
                      setShowLevelUpPrompt(false);
                      const next = Math.min(10, ladderLevel + 1);
                      setLadderLevel(next);
                      setLadderAttempts(0);
                      setLadderCorrect(0);
                      await loadLevelQuestions(next);
                    }}
                  >
                    Evet, zorlaştır
                  </button>
                  <button
                    className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-700 hover:bg-gray-300"
                    onClick={() => {
                      setShowLevelUpPrompt(false);
                      loadLevelQuestions(ladderLevel);
                    }}
                  >
                    Hayır, böyle iyi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* -------------------- GÜNÜN YARIŞMASI (dashboard) -------------------- */
  if (mode === "today") {
    const idx = Number(dailyStatus?.index ?? 0);
    const size = Number.isFinite(Number(dailyStatus?.size)) ? Number(dailyStatus.size) : 0;
    const finished = !!dailyStatus?.finished;
    const started = !finished && idx > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6">
          <div className="flex flex-col items-center gap-2">
            {/* Avatar */}
            <div className="rounded-full bg-gray-100 p-1 shadow-md mb-2">
              <img
                src={getAvatarUrl()}
                alt="avatar"
                width={140}
                height={140}
                className="w-[140px] h-[140px] rounded-full object-contain"
              />
            </div>

            {/* İsim */}
            <h1 className="text-2xl font-extrabold text-cyan-700 text-center">
              {user.ad} {user.soyad}
            </h1>

            {/* Üst kutular */}
            <div className="w-full flex gap-3 mt-3 flex-wrap">
              {/* İLERLEME */}
              <StatCard label="İlerleme">
                <span className="font-mono">
                  {idx} / {size}
                </span>
              </StatCard>

              {/* DURUM */}
              <StatCard label="Durum">
                <StatusBadge
                  color="blue"
                  text={finished ? "Tamamlandı" : started ? "Devam Ediyor" : "Hazır"}
                />
              </StatCard>

              {/* BUGÜN (rank) */}
              <StatCard label="Bugün">
                {todayRankLoading ? "—" : todayRank != null ? `${todayRank}.` : "-"}
                <div className="text-[11px] text-gray-500 mt-0.5">sıradasın</div>
              </StatCard>

              {/* PUAN (günün yarışı) */}
              <StatCard label="Puan">{dailyPoints}</StatCard>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex flex-col gap-2 mt-6">
            <button
              className="w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-800 text-white shadow-lg active:scale-95 transition"
              onClick={startOrContinueDaily}
              title={started ? "Devam Et" : "Yarışmaya Başla"}
              disabled={dailyLoading || finished}
            >
              <span className="mr-2">🏁</span>
              {started ? "Devam Et" : "Yarışmaya Başla"}
            </button>

            {dailyError && (
              <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {dailyError}
              </div>
            )}

            {/* Bugünün Puan Durumu */}
            <div className="mt-4">
              <div className="text-sm font-bold text-gray-700 mb-2">Bugünün Puan Durumu</div>
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="p-2 border">#</th>
                      <th className="p-2 border text-left">Ad</th>
                      <th className="p-2 border">Soru</th>
                      <th className="p-2 border">Puan</th>
                      <th className="p-2 border">Saniye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(dailyLeaderboard) ? dailyLeaderboard.filter(Boolean) : []).map((u, i) => (
                      <tr
                        key={`${u?.id ?? "row"}-${i}`}
                        className={String(u?.id) === String(user?.id) ? "bg-yellow-50" : ""}
                      >
                        <td className="p-2 border text-center">{i + 1}</td>
                        <td className="p-2 border">{u?.ad ?? "-"}</td>
                        <td className="p-2 border text-center">{u?.answered_count ?? 0}</td>
                        <td className="p-2 border text-center">{u?.total_points ?? 0}</td>
                        <td className="p-2 border text-center">{u?.time_spent ?? 0}</td>
                      </tr>
                    ))}
                    {(!Array.isArray(dailyLeaderboard) || dailyLeaderboard.length === 0) && (
                      <tr>
                        <td className="p-2 border text-center text-gray-400" colSpan={5}>
                          Henüz katılım yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              className="w-full py-2 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition"
              onClick={() => setMode("panel")}
              title="Panele dön"
            >
              ← Panele Dön
            </button>

            {finished && (
              <div className="mt-1 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
                Bugünün yarışmasını tamamladın 🎉 Puanların genel puanlarına eklendi.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- SORU ÇÖZ (NORMAL/KADEMELİ) -------------------- */
  if (mode === "solve" && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
          <h2 className="text-xl font-bold text-cyan-700 mb-3">
            Soru {currentIdx + 1} / {questions.length}
          </h2>
          <div className="text-sm text-gray-600 mb-1">
            {ladderActive
              ? `Kademeli Yarış • Seviye ${ladderLevel} • Deneme ${ladderAttempts} • Doğru ${ladderCorrect}`
              : "Standart Mod"}
          </div>
          <div className="text-4xl font-mono text-emerald-700 mb-2 select-none">
            {timeLeft}
          </div>
          <div className="text-lg font-semibold mb-4">{q?.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q?.point}
          </div>
          <div className="flex flex-col gap-3 mb-4">
            <button
              className="py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
              onClick={() => handleAnswer("evet")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Evet
            </button>
            <button
              className="py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
              onClick={() => handleAnswer("hayır")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Hayır
            </button>
            <button
              className="py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
              onClick={() => handleAnswer("bilmem")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Bilmem
            </button>
          </div>
          <button
            className="mt-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-2xl hover:bg-gray-400"
            onClick={() => setMode("thankyou")}
          >
            Şimdilik bu kadar yeter
          </button>
          {info && <div className="text-red-600 mt-2">{info}</div>}

          {feedbackActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/92 rounded-3xl text-3xl font-extrabold text-emerald-700 animate-pulse z-10">
              {feedback}
              {showStars && <Stars count={starsCount} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* -------------------- SORU ÇÖZ (GÜNLÜK) -------------------- */
  if (mode === "dailySolve" && dailyQuestion) {
    const q = dailyQuestion;
    const sIdx = Number(dailyStatus?.index ?? 0);
    const sSize = Number.isFinite(Number(dailyStatus?.size)) ? Number(dailyStatus.size) : 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
          <h2 className="text-xl font-bold text-cyan-700 mb-1">Günün Yarışması</h2>
          <div className="text-sm text-gray-600 mb-1">
            {sIdx} / {sSize}
          </div>
          <div className="text-4xl font-mono text-emerald-700 mb-2 select-none">
            {timeLeft}
          </div>
          <div className="text-lg font-semibold mb-4">{q?.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q?.point}
          </div>
          <div className="flex flex-col gap-3 mb-4">
            <button
              className="py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
              onClick={handleDailyAnswer("evet")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Evet
            </button>
            <button
              className="py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
              onClick={handleDailyAnswer("hayır")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Hayır
            </button>
            <button
              className="py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
              onClick={handleDailyAnswer("bilmem")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Bilmem
            </button>
          </div>
          <button
            className="mt-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-2xl hover:bg-gray-400"
            onClick={handleDailySkip}
          >
            Şimdilik bu kadar yeter
          </button>
          {info && <div className="text-red-600 mt-2">{info}</div>}

          {feedbackActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/92 rounded-3xl text-3xl font-extrabold text-emerald-700 animate-pulse z-10">
              {feedback}
              {showStars && <Stars count={starsCount} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* -------------------- DAHİ (kademeli final) -------------------- */
  if (mode === "genius") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center">
          <h2 className="text-3xl font-extrabold text-orange-700 mb-3">
            Tamam artık ben sana daha ne sorayım, sen bir dahisin! 🎉
          </h2>
          <p className="text-gray-700 mb-4">
            10. seviyede de %80 başarıyı geçtin. Muhteşemsin!
          </p>
          <button
            className="px-4 py-2 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-800"
            onClick={() => setMode("panel")}
          >
            Panele Dön
          </button>
        </div>
      </div>
    );
  }

  /* -------------------- TEŞEKKÜRLER -------------------- */
  if (mode === "thankyou") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">
            TEŞEKKÜRLER
          </h2>
          <p className="text-lg text-gray-700 mb-4">
            Yine bekleriz! Dilediğin zaman yeni sorular çözebilirsin.
          </p>

          <div className="mt-1 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            {quoteLoading ? (
              <div className="text-sm text-gray-500">Yükleniyor…</div>
            ) : quote ? (
              <>
                <div className="text-sm text-gray-700 italic">“{quote.text}”</div>
                {quote.author ? (
                  <div className="text-[11px] text-gray-500 mt-1">— {quote.author}</div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">
                “Bugün için bir söz bulunamadı.”
              </div>
            )}
          </div>

          <button
            className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-800"
            onClick={() => setMode("panel")}
          >
            Panele Dön
          </button>
        </div>
      </div>
    );
  }

  /* -------------------- Hiç soru kalmadı (fallback) -------------------- */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center">
        <h2 className="text-xl font-bold text-cyan-700 mb-2">
          Çözülecek soru kalmadı!
        </h2>
        <button
          className="px-4 py-2 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-800"
          onClick={() => setMode("panel")}
        >
          Panele Dön
        </button>
      </div>
    </div>
  );
}
