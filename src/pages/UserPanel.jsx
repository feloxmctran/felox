// src/pages/UserPanel.jsx
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

/* --- Performance sort helper: net_points DESC, then success % DESC --- */
const sortPerformanceRows = (rows = []) => {
  const getPct = (r) =>
    typeof r.score_percent === "number"
      ? r.score_percent
      : (Number(r.attempted) || 0) > 0
      ? Math.round(((Number(r.correct) || 0) * 100) / Number(r.attempted))
      : 0;

  return [...rows].sort((A, B) => {
    const an = Number(A.net_points) || 0;
    const bn = Number(B.net_points) || 0;
    if (bn !== an) return bn - an; // 1) Net puan
    const ap = getPct(A);
    const bp = getPct(B);
    if (bp !== ap) return bp - ap; // 2) Başarı yüzdesi
    return (A.title || "").localeCompare(B.title || "", "tr"); // 3) Alfabetik
  });
};

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
                    key={r.survey_id || i}
                    className={i === 0 ? "bg-green-50" : i === data.length - 1 ? "bg-red-50" : ""}
                  >
                    <td className="p-2 border text-left">{r.title}</td>
                    <td className="p-2 border text-center">
                      {r.attempted}/{r.answered}
                    </td>
                    <td className="p-2 border text-center">{r.correct}</td>
                    <td className="p-2 border text-center">{r.wrong}</td>
                    <td className="p-2 border text-center">{r.bilmem}</td>
                    <td
                      className={`p-2 border text-center ${
                        (r.net_points || 0) > 0
                          ? "text-emerald-700 font-bold"
                          : (r.net_points || 0) < 0
                          ? "text-red-600 font-bold"
                          : ""
                      }`}
                    >
                      {r.net_points}
                    </td>
                    <td className="p-2 border text-center font-bold">
                      {typeof r.score_percent === "number"
                        ? `${r.score_percent}%`
                        : (() => {
                            const den = Number(r.attempted) || 0;
                            const dogru = Number(r.correct) || 0;
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

  // BUGÜN sıralaması (genel tablo için)
  const [todayRank, setTodayRank] = useState(null);
  const [todayRankLoading, setTodayRankLoading] = useState(false);

  // Görünüm modu
  const [mode, setMode] = useState("panel"); // panel | list | today | solve | dailySolve | thankyou | genius

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

  // Günün Yarışması
  const [dailyStatus, setDailyStatus] = useState(null); // {success, day_key, finished, index, size, question?}
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [dailyPoints, setDailyPoints] = useState(0);

  // Günlük Puan Durumu (Leaderboard)
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);

// === IMPDAY: state START ===
const [impDay, setImpDay] = useState(null);          // {prettyDate, daytitle, description}
const [impDayLoading, setImpDayLoading] = useState(false);
// === IMPDAY: state END ===


  // === FEL0X: BOOKS STATE START ===
const [books, setBooks] = useState(0);
const [spending, setSpending] = useState(false);
const [revealed, setRevealed] = useState({ qid: null, answer: "" }); // {qid, 'evet'|'hayır'|'bilmem'}

const fetchBooks = async () => {
  if (!user) return;
  try {
    const r = await fetch(`${apiUrl}/api/user/${user.id}/books`);
    const d = await r.json();
    if (d?.success) setBooks(d.books || 0);
  } catch {}
};

// Aktif soru (solve/dailySolve)
const getActiveQuestion = () => {
  if (mode === "dailySolve" && dailyQuestion) return dailyQuestion;
  if (mode === "solve" && questions.length > 0) return questions[currentIdx];
  return null;
};

// “Kitap İpucu” (1 kitap harcar, doğru cevabı döner ve butonu parlatır)
const spendBookAndReveal = async () => {
  const q = getActiveQuestion();
  if (!q || books <= 0 || spending) return;
  setSpending(true);
  try {
    const r = await fetch(`${apiUrl}/api/books/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, question_id: q.id }),
    });
    const d = await r.json();
    if (d?.success) {
      setBooks(typeof d.remaining === "number" ? d.remaining : Math.max(0, books - 1));
      setRevealed({ qid: q.id, answer: d.correct_answer });
    } else {
      setInfo(d?.error || "Kitap kullanılamadı.");
    }
  } catch {
    setInfo("Kitap kullanılamadı! (İletişim hatası)");
  } finally {
    setSpending(false);
  }
};

// Cevap butonuna highlight ekle
const highlightBtn = (ans, q) =>
  revealed.qid === q?.id && revealed.answer === ans ? " ring-4 ring-yellow-400 animate-pulse " : "";

// Kullanıcı yüklenince kitap sayısını çek
useEffect(() => { if (user) fetchBooks(); }, [user]);

// Soru/değişimlerde ipucunu sıfırla
useEffect(() => { setRevealed({ qid: null, answer: "" }); }, [currentIdx, mode, dailyQuestion]);

// Küçük kitap rozeti
const BookCountPill = ({ count }) => (
  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-xl text-xs font-bold border border-yellow-300 shadow-sm">
    <span role="img" aria-label="book">📚</span> {count}
  </div>
);
// === FEL0X: BOOKS STATE END ===


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

  

  // --- Kategoriler (yeni/geri geldi) ---
  const [surveys, setSurveys] = useState([]);
  const [showSurveyLeaderboard, setShowSurveyLeaderboard] = useState(false);
  const [surveyLeaderboard, setSurveyLeaderboard] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  // ---- NEW: Survey başlığı göstermek için meta & önbellekler ----
  const surveysCacheRef = useRef([]);                     // [{id,title,...}]
  const [surveyTitleById, setSurveyTitleById] = useState({}); // {survey_id: title}
  const questionSurveyMapRef = useRef({});                // {question_id: survey_id}
  const surveyQuestionsCacheRef = useRef({});             // {survey_id: Set(question_ids)}
  const [dailySurveyTitle, setDailySurveyTitle] = useState("");

  // Güvenli setState için
 const feedbackTimeoutRef = useRef(null);
const isMountedRef = useRef(false);
useEffect(() => {
  isMountedRef.current = true;          // mount
  return () => {
    isMountedRef.current = false;       // unmount
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  };
}, []);

useEffect(() => {
  if (!feedbackActive) return;
  const safety = setTimeout(() => {
    if (!isMountedRef.current) return;
    setFeedbackActive(false);
    setShowStars(false);
  }, 5000); // 5 sn sonra her durumda kapat
  return () => clearTimeout(safety);
}, [feedbackActive]);

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

  /* -------- NEW: Onaylı kategorileri ve başlık haritasını önden al -------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const r = await fetch(`${apiUrl}/api/user/approved-surveys`);
        const d = await r.json();
        if (!isMountedRef.current) return;
        if (d?.success && Array.isArray(d.surveys)) {
          surveysCacheRef.current = d.surveys;
          // { id: title } haritası
          const map = {};
          d.surveys.forEach((s) => (map[s.id] = s.title));
          setSurveyTitleById(map);
        } else {
          surveysCacheRef.current = [];
          setSurveyTitleById({});
        }
      } catch {
        if (!isMountedRef.current) return;
        surveysCacheRef.current = [];
        setSurveyTitleById({});
      }
    })();
  }, [user]);

  // ---- NEW: Soru->Anket önbelleği kurucu ----
  const indexQuestionsIntoCaches = (qs = []) => {
    const q2s = questionSurveyMapRef.current;
    const sCache = surveyQuestionsCacheRef.current;
    qs.forEach((q) => {
      if (!q || q.id == null) return;
      if (q.survey_id != null) {
        q2s[q.id] = q.survey_id;
        if (!sCache[q.survey_id]) sCache[q.survey_id] = new Set();
        sCache[q.survey_id].add(q.id);
      }
    });
  };

  const ensureSurveyLoadedFor = async (surveyId) => {
    if (!surveyId) return;
    if (!surveyQuestionsCacheRef.current[surveyId]) {
      const r = await fetch(`${apiUrl}/api/surveys/${surveyId}/questions`);
      const d = await r.json();
      if (!isMountedRef.current) return;
      if (d?.success && Array.isArray(d.questions)) {
        indexQuestionsIntoCaches(d.questions);
      }
    }
  };

  // Gerekirse sorunun anketini bul (günlük yarışma için özellikle)
  const resolveSurveyIdForQuestion = async (questionId) => {
    if (!questionId) return null;
    if (questionSurveyMapRef.current[questionId])
      return questionSurveyMapRef.current[questionId];

    // onaylı kategoriler arasında tara, gerekirse soruları indir
    for (const s of surveysCacheRef.current) {
      await ensureSurveyLoadedFor(s.id);
      if (surveyQuestionsCacheRef.current[s.id]?.has(questionId)) {
        return questionSurveyMapRef.current[questionId] || s.id;
      }
    }
    return null;
  };

  const getSurveyTitleForQuestionSync = (q) => {
    if (!q) return "";
    const sid = q.survey_id || questionSurveyMapRef.current[q.id];
    return sid ? (surveyTitleById[sid] || "") : "";
  };

  /* -------------------- Kullanıcıya ait verileri çek -------------------- */
  useEffect(() => {
    if (!user) return;

    // Doğru cevap id'leri
    fetch(`${apiUrl}/api/user/${user.id}/answers`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (data.success) {
          setCorrectAnswered(
            data.answers
              .filter((ans) => ans.is_correct === 1)
              .map((ans) => ans.question_id)
          );
        }
      });

    // Toplam puan ve cevap sayısı
    fetch(`${apiUrl}/api/user/${user.id}/total-points`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (data.success) {
          setTotalPoints(data.totalPoints);
          setAnsweredCount(data.answeredCount);
        }
      });

    // BUGÜN sıralaması (genel leaderboard)
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
          const filtered = (data.leaderboard || []).filter(
            (u) => (u.total_points || 0) > 0
          );
          setLeaderboards((prev) => ({ ...prev, [p.key]: filtered }));
        });
    });

    // Avatar için en iyi başlık ve yüzdesi (sıralı)
    fetch(`${apiUrl}/api/user/${user.id}/performance`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMountedRef.current) return;
        if (d?.success && Array.isArray(d.performance) && d.performance.length) {
          const sorted = sortPerformanceRows(d.performance);
          const top = sorted[0];
          setBestTitle(top.title || "");
          const pct =
            typeof top.score_percent === "number"
              ? top.score_percent
              : (Number(top.attempted) || 0) > 0
              ? Math.round(((Number(top.correct) || 0) * 100) / Number(top.attempted))
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

// === IMPDAY: auto fetch by day_key START ===
useEffect(() => {
  const dk = dailyStatus?.day_key;
  if (dk) fetchImpDay(dk);
}, [dailyStatus?.day_key]);
// === IMPDAY: auto fetch by day_key END ===



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
// === IMPDAY: fetch START ===
const fetchImpDay = async (dayKey) => {
  if (!dayKey) return;
  setImpDayLoading(true);
  try {
    const r = await fetch(`${apiUrl}/api/daily/impday?day=${encodeURIComponent(dayKey)}`);
    const d = await r.json();
    if (!isMountedRef.current) return;

    const pretty = new Date(dayKey).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
    });

    if (d?.success && d?.record) {
      setImpDay({
        prettyDate: pretty,
        daytitle: d.record.daytitle || "",
        description: d.record.description || d.record.desc || "",
      });
    } else {
      // Kayıt yoksa sadece tarihi göster
      setImpDay({ prettyDate: pretty, daytitle: "", description: "" });
    }
  } catch {
    if (!isMountedRef.current) return;
    setImpDay(null);
  } finally {
    if (!isMountedRef.current) return;
    setImpDayLoading(false);
  }
};
// === IMPDAY: fetch END ===




  /* -------------------- Kategoriler -------------------- */
  const fetchSurveys = () => {
    fetch(`${apiUrl}/api/user/approved-surveys`)
      .then((res) => res.json())
      .then((d) => {
        if (!isMountedRef.current) return;
        if (d.success) {
          setSurveys(Array.isArray(d.surveys) ? d.surveys : []);
          // başlık haritasını güncelle
          const map = {};
          (d.surveys || []).forEach((s) => (map[s.id] = s.title));
          setSurveyTitleById((prev) => ({ ...prev, ...map }));
          surveysCacheRef.current = d.surveys || [];
        } else setSurveys([]);
      })
      .catch(() => setSurveys([]));
  };

  const fetchQuestions = (surveyId) => {
    fetch(`${apiUrl}/api/surveys/${surveyId}/questions`)
      .then((res) => res.json())
      .then((d) => {
        if (!isMountedRef.current) return;
        if (d.success) {
          const filtered = (d.questions || []).filter(
            (q) => !correctAnswered.includes(q.id)
          );
          // önbelleklere işle
          indexQuestionsIntoCaches(d.questions || []);
          shuffleInPlace(filtered);
          setQuestions(filtered);
          setCurrentIdx(0);
          setMode("solve");
          setLadderActive(false);
          setDailyActive(false);
        }
      });
  };

  const fetchSurveyLeaderboard = async (surveyId) => {
    try {
      setSelectedSurvey(surveys.find((s) => String(s.id) === String(surveyId)) || null);
      setSurveyLeaderboard([]);
      const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/leaderboard`);
      const data = await res.json();
      if (!isMountedRef.current) return;
      if (data.success) {
        const rows = (data.leaderboard || []).filter((u) => (u.total_points || 0) > 0);
        setSurveyLeaderboard(rows);
      } else {
        setSurveyLeaderboard([]);
      }
      setShowSurveyLeaderboard(true);
    } catch {
      if (!isMountedRef.current) return;
      setSurveyLeaderboard([]);
      setShowSurveyLeaderboard(true);
    }
  };

  /* -------------------- Rastgele soru (serbest) -------------------- */
  const startRandom = async () => {
    const res = await fetch(`${apiUrl}/api/user/approved-surveys`);
    const data = await res.json();

    // başlık haritasını güncelle
    if (data?.surveys) {
      const map = {};
      data.surveys.forEach((s) => (map[s.id] = s.title));
      setSurveyTitleById((prev) => ({ ...prev, ...map }));
      surveysCacheRef.current = data.surveys || [];
    }

    let allQuestions = [];
    for (const survey of data.surveys || []) {
      const qRes = await fetch(`${apiUrl}/api/surveys/${survey.id}/questions`);
      const qData = await qRes.json();
      if (qData.success) {
        allQuestions = allQuestions.concat(qData.questions);
      }
    }
    // önbellekleri doldur
    indexQuestionsIntoCaches(allQuestions);

    const filtered = allQuestions.filter(
      (q) => !correctAnswered.includes(q.id)
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
      // backend’ten hızlı/tekrarsız al
      const r = await fetch(
        `${apiUrl}/api/user/${user.id}/kademeli-questions?point=${level}`
      );
      const d = await r.json();
      const all = Array.isArray(d?.questions) ? d.questions : [];

      // önbelleğe işle
      indexQuestionsIntoCaches(all);

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
        // aynı levelde devam soruları
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
        const me = d.leaderboard.find((u) => String(u.id) === String(user.id));
        setDailyPoints(me?.total_points || 0);
      }
    } catch {}
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
          fetchDailyLeaderboard(d.day_key); // tabloyu getir
            fetchImpDay(d.day_key); // important day'i getir
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

  // NEW: Günlük sorunun başlığını çöz ve sakla
   // === FEL0X: DAILY TITLE RESOLVER START ===
  useEffect(() => {
    (async () => {
      if (!dailyQuestion) {
        setDailySurveyTitle("");
        return;
      }
      const t0 = getSurveyTitleForQuestionSync(dailyQuestion);
      if (t0) {
        setDailySurveyTitle(t0);
        return;
      }
      const sid = await resolveSurveyIdForQuestion(dailyQuestion.id);
      if (!isMountedRef.current) return;
      if (sid) setDailySurveyTitle(surveyTitleById[sid] || "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyQuestion, surveyTitleById]);
   // === FEL0X: DAILY TITLE RESOLVER END ===

  /* -------------------- Zamanlayıcı -------------------- */
// === FEL0X: TIMER BLOCK START ===
useEffect(() => {
  // Sadece ekranda gerçekten bir soru varsa süreyi başlat
  const hasQuestion =
    (mode === "solve" && questions.length > 0 && !!questions[currentIdx]) ||
    (mode === "dailySolve" && !!dailyQuestion);

  if (hasQuestion) {
    setTimeLeft(24);
    setTimerActive(true);
  } else {
    setTimerActive(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentIdx, mode, questions, dailyQuestion]);

useEffect(() => {
  if (!timerActive) return;

  if (timeLeft > 0) {
    const t = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }

  if (timeLeft === 0) {
    setTimerActive(false);

    // Zaman dolduğunda gerçekten bir soru varsa “bilmem” gönder
    const hasQ =
      (mode === "dailySolve" && !!dailyQuestion) ||
      (mode === "solve" && !!questions[currentIdx]);

    if (hasQ) handleAnswer("bilmem");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [timeLeft, timerActive]);
// === FEL0X: TIMER BLOCK END ===


  /* -------------------- Cevap işle -------------------- */
   // === FEL0X: ANSWER HANDLERS START ===
const getSuccessMsg = (puan) => {
  if (puan <= 3) return "TEBRİKLER";
  if (puan <= 6) return "HARİKASIN";
  if (puan <= 9) return "SÜPERSİN";
  return "MUHTEŞEMSİN";
};

const refreshUserStats = async () => {
  if (!user) return;
  try {
    const r = await fetch(`${apiUrl}/api/user/${user.id}/total-points`);
    const data = await r.json();
    if (data.success) {
      setTotalPoints(data.totalPoints);
      setAnsweredCount(data.answeredCount);
    }
  } catch {}
  try {
    const d = await fetch(`${apiUrl}/api/user/${user.id}/rank?period=today`).then((x) => x.json());
    setTodayRank(d?.success ? d.rank : null);
  } catch {}
};

const handleDailyAnswer = (cevap, opts = { exitAfter: false }) => () => {
  handleAnswer(cevap, opts);
};

const handleAnswer = (cevap, opts = { exitAfter: false }) => {
  if (!user) return;

  setTimerActive(false);
  setInfo("");

  const isDaily = mode === "dailySolve" && dailyActive;
  const q = isDaily ? dailyQuestion : questions[currentIdx];

  // Kritik koruma: soru yoksa (race/yenileme vb.) hiçbir şey yapma
  if (!q || q.id == null) return;

  // --------- GÜNLÜK YARIŞMA ---------
  if (isDaily) {
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
        else if (d.is_correct === 1) {
          msg = getSuccessMsg(q.point);
          stars = true;
          starCount = Math.max(1, Math.min(q.point || 1, 10));
        } else msg = "BİLEMEDİN";

        setFeedback(msg);
        setStarsCount(starCount);
        setShowStars(stars && d.is_correct === 1);
        setFeedbackActive(true);

        await refreshUserStats();
        await fetchDailyStatus();

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(async () => {
          if (!isMountedRef.current) return;
          setFeedbackActive(false);
          setShowStars(false);

          const r2 = await fetch(`${apiUrl}/api/daily/status?user_id=${user.id}`);
          const nx = await r2.json();

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

  // --------- NORMAL / KADEMELİ ---------
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
      if (d.success) {
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
            setCorrectAnswered((prev) => [...prev, q.id]);
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
        setInfo(d.error || "Cevap kaydedilemedi!");
      }
    })
    .catch(() => setInfo("Cevap kaydedilemedi! (İletişim hatası)"));
};

/* --- Günlük: Şimdilik bu kadar (skip endpoint) --- */
const handleDailySkip = async () => {
  if (!user || !dailyQuestion) return;
  try {
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
// === FEL0X: ANSWER HANDLERS END ===

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
      if (data.success) {
        const list = data.performance || [];
        const sorted = sortPerformanceRows(list);
        setMyPerf(sorted);
        if (sorted.length) {
          setBestTitle(sorted[0].title || "");
          const pct =
            typeof sorted[0].score_percent === "number"
              ? sorted[0].score_percent
              : (Number(sorted[0].attempted) || 0) > 0
              ? Math.round(((Number(sorted[0].correct) || 0) * 100) / Number(sorted[0].attempted))
              : null;
          setBestTitlePercent(pct);
        }
      } else {
        setMyPerfError(data.error || "Veri alınamadı");
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
      const filtered = (data.leaderboard || []).filter(
        (u) => (u.total_points || 0) > 0
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
           {/* === FEL0X: TODAY AVATAR BLOCK START === */}
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-full bg-gray-100 p-1 shadow-md">
              <img
                src={getAvatarUrl()}
                alt="avatar"
                width={140}
                height={140}
                className="w-[140px] h-[140px] rounded-full object-contain"
              />
            </div>
            <BookCountPill count={books} />
          </div>
{/* === FEL0X: TODAY AVATAR BLOCK END === */}


            <h1 className="text-2xl font-extrabold text-cyan-700 text-center">
              {user.ad} {user.soyad}
            </h1>

            {/* Başlık etiketi */}
            {renderBestTitleBadge()}

            <div className="w-full flex gap-3 mt-3 flex-wrap">
              <Box title="Puanın" value={totalPoints} />
              <Box title="Cevapladığın" value={answeredCount} />
              <Box
                title="Bugün yarışlarda"
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

            {/* Kategoriler */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-cyan-600 hover:bg-cyan-800 text-white shadow-lg active:scale-95 transition"
              onClick={() => { fetchSurveys(); setMode("list"); }}
              title="Onaylı Kategoriler"
            >
              <span className="mr-2">📚</span> Kategoriler
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
                          className={u.id === user.id ? "bg-yellow-100 font-bold" : ""}
                        >
                          <td className="p-1 border">{i + 1}</td>
                          <td className="p-1 border">{u.ad}</td>
                          <td className="p-1 border">{u.soyad}</td>
                          <td className="p-1 border">{u.total_points}</td>
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

          {/* (Not: Puanlarım modalı artık Kategoriler ekranından açılıyor) */}

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

  /* -------------------- KATEGORİ LİSTESİ (kompakt + "Puanlarım" en üstte) -------------------- */
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6">
          <h2 className="text-xl font-extrabold text-cyan-700 text-center mb-3">
            Onaylı Kategoriler
          </h2>

          {/* Puanlarım butonu (üstte) */}
          <button
            className="w-full mb-4 py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:to-purple-800 text-white shadow-lg active:scale-95 transition"
            onClick={() => {
              setShowMyPerf(true);
              loadMyPerformance();
            }}
            title="Kategori bazında kendi performansın"
          >
            <span className="mr-2">📈</span> Puanlarım
          </button>

          {surveys.length === 0 ? (
            <div className="text-center text-gray-600">Hiç onaylanmış kategori yok.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {surveys.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[15px] font-semibold text-gray-800 line-clamp-2">
                      {s.title}
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100">
                      {(s.question_count ?? "?")} soru
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="flex-1 px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-800 active:scale-95"
                      onClick={() => fetchQuestions(s.id)}
                    >
                      Soruları Çöz
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-700 active:scale-95"
                      onClick={() => fetchSurveyLeaderboard(s.id)}
                    >
                      Puan Tablosu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="w-full mt-4 py-2 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={() => setMode("panel")}
          >
            ← Panele Dön
          </button>

          {/* Kategori puan tablosu modalı */}
          {showSurveyLeaderboard && (
            <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center p-3">
              <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto relative">
                <button
                  className="absolute top-2 right-3 text-2xl font-bold text-gray-500 hover:text-red-600"
                  onClick={() => setShowSurveyLeaderboard(false)}
                  title="Kapat"
                >
                  &times;
                </button>
                <h3 className="text-xl font-bold mb-3 text-orange-700 text-center">
                  {selectedSurvey?.title || "Kategori"} — Puan Tablosu
                </h3>
                <table className="min-w-full border text-sm">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="p-1 border">#</th>
                      <th className="p-1 border">Ad</th>
                      <th className="p-1 border">Soyad</th>
                      <th className="p-1 border">Puan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveyLeaderboard.length > 0 ? (
                      surveyLeaderboard.slice(0, 20).map((u, i) => (
                        <tr
                          key={`${u?.id ?? "row"}-${i}`}
                          className={String(u?.id) === String(user.id) ? "bg-yellow-100 font-bold" : ""}
                        >
                          <td className="p-1 border text-center">{i + 1}</td>
                          <td className="p-1 border">{u.ad}</td>
                          <td className="p-1 border">{u.soyad}</td>
                          <td className="p-1 border text-center">{u.total_points}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-gray-500 text-center py-2">
                          Veri yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Puanlarım modalı (buradan açılıyor) */}
          <PointsTable
            show={showMyPerf}
            onClose={() => setShowMyPerf(false)}
            loading={myPerfLoading}
            error={myPerfError}
            data={myPerf}
          />
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

    // Günlük rank: bugünün leaderboard'undaki sıran
    const dailyRank =
      (dailyLeaderboard.findIndex((u) => String(u?.id) === String(user.id)) + 1) || null;

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

{/* === IMPDAY: banner START === */}
<div className="w-full text-center mt-1">
  {impDayLoading ? (
    <div className="text-xs text-gray-400">—</div>
  ) : (
    <>
      {/* 1) Tarih (yıl yok) */}
      {impDay?.prettyDate ? (
        <div className="text-sm font-semibold text-emerald-700">
          {impDay.prettyDate}
        </div>
      ) : null}

      {/* 2) Günün başlığı */}
      {impDay?.daytitle ? (
        <div className="text-base font-bold text-gray-800 mt-0.5">
          {impDay.daytitle}
        </div>
      ) : null}

      {/* 3) Açıklama */}
      {impDay?.description ? (
        <div className="text-xs text-gray-600 mt-1 leading-relaxed">
          {impDay.description}
        </div>
      ) : null}
    </>
  )}
</div>
{/* === IMPDAY: banner END === */}

<div className="text-sm text-gray-600 mt-2">Günün Yarışmasında başarılar</div>

                       {/* Üst kutular */}
            <div className="w-full flex gap-3 mt-3 flex-wrap">
              {/* CEVAPLANAN */}
              <StatCard label="Cevapladığın">{idx}</StatCard>

              {/* PUAN */}
              <StatCard label="Puan">
                {dailyPoints}
              </StatCard>

              {/* BUGÜN (günlük yarışma rank'ı) */}
              <StatCard label="Bugün">
                {dailyRank ? `${dailyRank}.` : "-"}
                <div className="text-[11px] text-gray-500 mt-0.5">sıradasın</div>
              </StatCard>
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
              <div className="text-sm font-bold text-gray-700 mb-2">Günün Yarışması Puan Durumu</div>
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="p-2 border">#</th>
                      <th className="p-2 border text-left">Ad</th>
                      <th className="p-2 border text-left">Soyad</th> {/* eklendi */}
                      <th className="p-2 border">Soru</th>
                      <th className="p-2 border">Puan</th>
                      <th className="p-2 border">Saniye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(dailyLeaderboard) ? dailyLeaderboard.filter(Boolean) : []).map((u, i) => (
                      <tr
                        key={`${u?.id ?? "row"}-${i}`}
                        className={String(u?.id) === String(user.id) ? "bg-yellow-50" : ""}
                      >
                        <td className="p-2 border text-center">{i + 1}</td>
                        <td className="p-2 border">{u?.ad ?? "-"}</td>
                        <td className="p-2 border">{u?.soyad ?? "-"}</td> {/* eklendi */}
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
    const surveyTitleHere = getSurveyTitleForQuestionSync(q);
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

          {/* NEW: Survey başlığı (saniyenin hemen altında, sorunun üstünde) */}
          {surveyTitleHere ? (
            <div className="mb-2">
              <StatusBadge text={surveyTitleHere} color="blue" />
            </div>
          ) : null}

          <div className="text-lg font-semibold mb-4">{q.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q.point}
          </div>
         {/* === FEL0X: SOLVE ANSWER BUTTONS START === */}
<div className="flex flex-col gap-3 mb-4">
  <button
    className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("evet", q)}`}
    onClick={() => handleAnswer("evet")}
    disabled={timeLeft === 0 || feedbackActive}
  >
    Evet
  </button>
  <button
    className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("hayır", q)}`}
    onClick={() => handleAnswer("hayır")}
    disabled={timeLeft === 0 || feedbackActive}
  >
    Hayır
  </button>
  <button
    className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("bilmem", q)}`}
    onClick={() => handleAnswer("bilmem")}
    disabled={timeLeft === 0 || feedbackActive}
  >
    Bilmem
  </button>

  {/* Kitap İpucu */}
  <button
    className="py-2 rounded-2xl font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 active:scale-95 disabled:opacity-50"
    onClick={spendBookAndReveal}
    disabled={timeLeft === 0 || feedbackActive || books <= 0 || spending || (revealed.qid === q.id)}
    title={books > 0 ? "1 kitap harcar, doğru cevabı gösterir" : "Kitabın yok"}
  >
    <span className="mr-1">📚</span> Kitap İpucu {`(${books})`}
  </button>
</div>
{/* === FEL0X: SOLVE ANSWER BUTTONS END === */}


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

          {/* NEW: Survey başlığı (saniyenin hemen altında, sorunun üstünde) */}
          {dailySurveyTitle ? (
            <div className="mb-2">
              <StatusBadge text={dailySurveyTitle} color="blue" />
            </div>
          ) : null}

          <div className="text-lg font-semibold mb-4">{q.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q.point}
          </div>
          {/* === FEL0X: DAILYSOLVE ANSWER BUTTONS START === */}
<div className="flex flex-col gap-3 mb-4">
  <button
    className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("evet", q)}`}
    onClick={handleDailyAnswer("evet")}
    disabled={timeLeft === 0 || feedbackActive}
  >
    Evet
  </button>
  <button
    className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("hayır", q)}`}
    onClick={handleDailyAnswer("hayır")}
    disabled={timeLeft === 0 || feedbackActive}
  >
    Hayır
  </button>
  <button
    className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("bilmem", q)}`}
    onClick={handleDailyAnswer("bilmem")}
    disabled={timeLeft === 0 || feedbackActive}
  >
    Bilmem
  </button>

  {/* Kitap İpucu */}
  <button
    className="py-2 rounded-2xl font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 active:scale-95 disabled:opacity-50"
    onClick={spendBookAndReveal}
    disabled={timeLeft === 0 || feedbackActive || books <= 0 || spending || (revealed.qid === q.id)}
    title={books > 0 ? "1 kitap harcar, doğru cevabı gösterir" : "Kitabın yok"}
  >
    <span className="mr-1">📚</span> Kitap İpucu {`(${books})`}
  </button>
</div>
{/* === FEL0X: DAILYSOLVE ANSWER BUTTONS END === */}


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