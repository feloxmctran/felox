// src/pages/UserPanel.jsx
import React, { useState, useEffect, useMemo } from "react";

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
const StatusBadge = ({ text, color = "emerald" }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full bg-${color}-50 text-${color}-700 text-xs font-semibold`}
  >
    {text}
  </span>
);

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

  // BUGÜN sıralaması (panelde & Günün Yarışması kutusunda)
  const [todayRank, setTodayRank] = useState(null);
  const [todayRankLoading, setTodayRankLoading] = useState(false);

  // Görünüm modu
  const [mode, setMode] = useState("panel"); // panel | today | list | solve | dailySolve | thankyou | genius

  // Kategoriler & sorular (normal/serbest/kademeli)
  const [surveys, setSurveys] = useState([]);
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

  // Kategori bazlı leaderboard (periyodik)
  const [showSurveyLeaderboard, setShowSurveyLeaderboard] = useState(false);
  const [surveyLeaderboard, setSurveyLeaderboard] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyActivePeriod, setSurveyActivePeriod] = useState("today");
  const [surveyLoading, setSurveyLoading] = useState(false);

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
  const [bestTitlePercent, setBestTitlePercent] = useState(null); // number | null

  // Avatar manifest
  const [avatarManifest, setAvatarManifest] = useState(null);

  // Kademeli Yarış
  const [ladderActive, setLadderActive] = useState(false);
  const [ladderLevel, setLadderLevel] = useState(1); // 1..10
  const [ladderAttempts, setLadderAttempts] = useState(0); // bilmem hariç
  const [ladderCorrect, setLadderCorrect] = useState(0);
  const [showLevelUpPrompt, setShowLevelUpPrompt] = useState(false);
  const [loadingLevelQuestions, setLoadingLevelQuestions] = useState(false);

  // TEŞEKKÜRLER ekranı için alıntı
  const [quote, setQuote] = useState(null); // { text, author } | null
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Günün Yarışması (durum + soru)
  const [dailyStatus, setDailyStatus] = useState(null);
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");

  const fetchRandomQuote = async () => {
    setQuoteLoading(true);
    try {
      const r = await fetch(`${apiUrl}/api/quotes/random`);
      const d = await r.json();
      if (d?.text) setQuote({ text: d.text, author: d.author || "" });
      else setQuote(null);
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  // --- CİNSİYET: güçlü normalize (TR harfleri için özel map) ---
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
        if (data.success) {
          setTotalPoints(data.totalPoints);
          setAnsweredCount(data.answeredCount);
        }
      });

    // BUGÜN sıralaması
    setTodayRankLoading(true);
    fetch(`${apiUrl}/api/user/${user.id}/rank?period=today`)
      .then((r) => r.json())
      .then((d) => setTodayRank(d?.success ? d.rank : null))
      .catch(() => setTodayRank(null))
      .finally(() => setTodayRankLoading(false));

    // Genel puan tabloları (önceden doldurma)
    PERIODS.forEach((p) => {
      fetch(`${apiUrl}/api/leaderboard?period=${p.key}`)
        .then((res) => res.json())
        .then((data) => {
          const filtered = (data.leaderboard || []).filter(
            (u) => (u.total_points || 0) > 0
          );
          setLeaderboards((prev) => ({ ...prev, [p.key]: filtered }));
        });
    });

    // Avatar için en iyi başlık ve yüzdesi
    fetch(`${apiUrl}/api/user/${user.id}/performance`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.performance) && d.performance.length) {
          setBestTitle(d.performance[0].title || "");
          const pct =
            typeof d.performance[0].score_percent === "number"
              ? d.performance[0].score_percent
              : null;
          setBestTitlePercent(pct);
        } else {
          setBestTitle("");
          setBestTitlePercent(null);
        }
      })
      .catch(() => {
        setBestTitle("");
        setBestTitlePercent(null);
      });

    // Günün Yarışması durumu
    fetchDailyStatus();

    // eslint-disable-next-line
  }, [user]);

  // thankyou moduna her girişte yeni söz çek
  useEffect(() => {
    if (mode === "thankyou") fetchRandomQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* -------------------- Kategorileri (onaylı) çek -------------------- */
  const fetchSurveys = () => {
    fetch(`${apiUrl}/api/user/approved-surveys`)
      .then((res) => res.json())
      .then((d) => d.success && setSurveys(d.surveys));
  };

  /* -------------------- Bir kategorinin sorularını çek -------------------- */
  const fetchQuestions = (surveyId) => {
    fetch(`${apiUrl}/api/surveys/${surveyId}/questions`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          const filtered = d.questions.filter(
            (q) => !correctAnswered.includes(q.id)
          );
          shuffleInPlace(filtered); // karıştır

          setQuestions(filtered);
          setCurrentIdx(0);
          setMode("solve");
          setLadderActive(false);
          setDailyActive(false);
        }
      });
  };

  /* -------------------- Kategori Leaderboard (periyodik) -------------------- */
  const loadSurveyLeaderboard = async (surveyId, periodKey) => {
    setSurveyLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/surveys/${surveyId}/leaderboard?period=${periodKey}`
      );
      const data = await res.json();
      const filtered = (data.leaderboard || []).filter(
        (u) => (u.total_points || 0) > 0
      );
      setSurveyLeaderboard(filtered);
    } catch (e) {
      setSurveyLeaderboard([]);
    } finally {
      setSurveyLoading(false);
    }
  };

  const openSurveyLeaderboard = (survey) => {
    setSelectedSurvey(survey);
    setSurveyActivePeriod("today");
    setSurveyLeaderboard([]);
    setShowSurveyLeaderboard(true);
    loadSurveyLeaderboard(survey.id, "today");
  };

  const handleSurveyPeriodChange = (periodKey) => {
    setSurveyActivePeriod(periodKey);
    if (selectedSurvey?.id) {
      loadSurveyLeaderboard(selectedSurvey.id, periodKey);
    }
  };

  /* -------------------- Rastgele soru (serbest) -------------------- */
  const startRandom = async () => {
    const res = await fetch(`${apiUrl}/api/user/approved-surveys`);
    const data = await res.json();
    let allQuestions = [];
    for (const survey of data.surveys) {
      const qRes = await fetch(`${apiUrl}/api/surveys/${survey.id}/questions`);
      const qData = await qRes.json();
      if (qData.success) {
        allQuestions = allQuestions.concat(qData.questions);
      }
    }
    const filtered = allQuestions.filter(
      (q) => !correctAnswered.includes(q.id)
    );

    shuffleInPlace(filtered); // karıştır

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
      const res = await fetch(`${apiUrl}/api/user/approved-surveys`);
      const data = await res.json();
      let all = [];
      for (const survey of data.surveys) {
        const qRes = await fetch(
          `${apiUrl}/api/surveys/${survey.id}/questions`
        );
        const qData = await qRes.json();
        if (qData.success) {
          all = all.concat(
            qData.questions.filter(
              (qq) => qq.point === level && !correctAnswered.includes(qq.id)
            )
          );
        }
      }
      shuffleInPlace(all); // karıştır

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

  const checkLadderProgress = () => {
    if (ladderAttempts >= 100) {
      const acc = ladderAttempts > 0 ? ladderCorrect / ladderAttempts : 0;
      if (acc >= 0.8) {
        if (ladderLevel < 10) {
          setShowLevelUpPrompt(true);
        } else {
          setMode("genius");
          setLadderActive(false);
        }
      }
    }
  };

  /* -------------------- Günün Yarışması: durum & akış -------------------- */
  async function fetchDailyStatus() {
    if (!user) return;
    try {
      const r = await fetch(`${apiUrl}/api/daily/status?userId=${user.id}`);
      const d = await r.json();
      if (d?.success) {
        setDailyStatus(d);
      } else {
        setDailyStatus(null);
      }
    } catch {
      setDailyStatus(null);
    }
  }

  // Return true if a question is loaded.
  async function startDaily() {
    if (!user) return false;
    setDailyLoading(true);
    setDailyError("");
    try {
      const r = await fetch(`${apiUrl}/api/daily/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Her iki formatı da gönder (backend uyumsuzluğu ihtimaline karşı)
        body: JSON.stringify({ user_id: user.id, userId: user.id }),
      });
      const d = await r.json();
      // Bazı backend'ler sadece 'success' işaretler, bazıları direkt question döner
      if (d?.question) {
        setDailyQuestion(d.question);
        setMode("dailySolve");
        setDailyActive(true);
        setLadderActive(false);
        return true;
      }
      if (d?.success) {
        // Hemen devamı çekmeyi dene (ilk tıkta görünür olsun)
        const ok = await resumeDaily();
        if (!ok) {
          await fetchDailyStatus();
        }
        return ok;
      }
      await fetchDailyStatus();
      setDailyError(d?.error || "Yarışma başlatılamadı.");
      return false;
    } catch (e) {
      setDailyError("Sunucuya ulaşılamadı. İnternet bağlantısını veya API URL'ini kontrol et.");
      return false;
    } finally {
      setDailyLoading(false);
    }
  }

  // Return true if a question is loaded.
  async function resumeDaily() {
    if (!user) return false;
    setDailyLoading(true);
    setDailyError("");
    try {
      const r = await fetch(`${apiUrl}/api/daily/next?userId=${user.id}`);
      const d = await r.json();
      if (d?.success && d.question) {
        setDailyQuestion(d.question);
        setMode("dailySolve");
        setDailyActive(true);
        setLadderActive(false);
        return true;
      }
      if (d?.done) {
        await fetchDailyStatus();
        setMode("today");
        return false;
      }
      await fetchDailyStatus();
      setDailyError(d?.error || "Yarışma devam ettirilemedi.");
      return false;
    } catch (e) {
      setDailyError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
      return false;
    } finally {
      setDailyLoading(false);
    }
  }

  /* -------------------- Zamanlayıcı -------------------- */
  useEffect(() => {
    // normal & kademeli & günlük hepsinde soru değişince 24s
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
    const r = await fetch(`${apiUrl}/api/user/${user.id}/total-points`);
    const data = await r.json();
    if (data.success) {
      setTotalPoints(data.totalPoints);
      setAnsweredCount(data.answeredCount);
    }
    // Bugün sıralamasını da tazele
    try {
      const d = await fetch(`${apiUrl}/api/user/${user.id}/rank?period=today`).then((x) =>
        x.json()
      );
      setTodayRank(d?.success ? d.rank : null);
    } catch {
      /* yoksun */
    }
  };

  // Eğer bu yardımcıya ihtiyaç olursa: onClick={handleDailyAnswer("evet")}
  const handleDailyAnswer = (cevap, opts = { exitAfter: false }) => () => {
    handleAnswer(cevap, opts);
  };

  const handleAnswer = (cevap, opts = { exitAfter: false }) => {
    setTimerActive(false);
    setInfo("");

    // GÜNLÜK YARIŞMASI
    if (mode === "dailySolve" && dailyActive && dailyQuestion) {
      const q = dailyQuestion;
      fetch(`${apiUrl}/api/daily/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          userId: user.id, // uyumluluk
          question_id: q.id,
          answer: cevap,
          time_left_seconds: timeLeft,
          max_time_seconds: 24,
        }),
      })
        .then((res) => res.json())
        .then(async (d) => {
          // geri bildirim (puan mesajı)
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

          // toplam/puan/rank/statüsü yenile
          await refreshUserStats();
          await fetchDailyStatus();

          setTimeout(async () => {
            setFeedbackActive(false);
            setShowStars(false);

            // Sıradaki soruyu al veya bitirdiyse 'today'
            const r = await fetch(`${apiUrl}/api/daily/next?userId=${user.id}`);
            const nx = await r.json();

            if (nx?.success && nx.question) {
              setDailyQuestion(nx.question);
              if (opts.exitAfter) {
                // kullanıcı “şimdilik bu kadar” dedi → today’e dön, ama soru 'bilmem' olarak kaydedildi
                setDailyActive(false);
                setMode("today");
              }
            } else {
              // bitti
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
    fetch(`${apiUrl}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        userId: user.id, // uyumluluk
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

          // Kademeli istatistik
          if (ladderActive && cevap !== "bilmem") {
            setLadderAttempts((prev) => prev + 1);
            if (d.is_correct === 1) setLadderCorrect((prev) => prev + 1);
          }

          setTimeout(() => {
            setFeedbackActive(false);
            setShowStars(false);

            // doğruysa tekrar gelmesin
            if (d.is_correct === 1) {
              setCorrectAnswered((prev) => [...prev, q.id]);
            }

            // kullanıcı üst bilgi tazele (ve bugün sıralaması)
            refreshUserStats();

            if (currentIdx < questions.length - 1) {
              setCurrentIdx((prev) => prev + 1);
            } else {
              if (ladderActive) {
                checkLadderProgress();
                if (!showLevelUpPrompt) {
                  loadLevelQuestions(ladderLevel);
                }
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
        setMyPerf(list);
        if (list.length) {
          setBestTitle(list[0].title || "");
          const pct =
            typeof list[0].score_percent === "number" ? list[0].score_percent : null;
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
    // bestTitle normalizasyonu (manifest key eşleşmesi için)
    const normalizedTitle = String(bestTitle || "").trim().toLowerCase();

    let entry = {};
    if (avatarManifest) {
      const foundKey = Object.keys(avatarManifest).find(
        (k) => k.trim().toLowerCase() === normalizedTitle
      );
      entry = foundKey ? avatarManifest[foundKey] : {};
    }

    // Dosya seçiminde gender öncelikli ve doğru default:
    if (gender === "male") {
      return `/avatars/${entry.male || "default-male.png"}`;
    }
    if (gender === "female") {
      return `/avatars/${entry.female || "default-female.png"}`;
    }
    // unknown → neutral > female > male > default-female (kadın ağırlıklı)
    return `/avatars/${entry.neutral || entry.female || entry.male || "default-female.png"}`;
  };

  /* -------------------- Panelde başlık etiketi -------------------- */
  const renderBestTitleBadge = () => {
    if (!bestTitle) {
      return <div className="text-xs text-gray-400">Henüz en iyi başlık yok</div>;
    }

    const pct = typeof bestTitlePercent === "number" ? bestTitlePercent : null;
    // Başarı yüzdesi yoksa eski metin
    if (pct == null) {
      return (
        <div className="text-xs text-gray-600">
          En iyi olduğun başlık: <b className="text-gray-800">{bestTitle}</b>
        </div>
      );
    }

    // <40  → "sen {title} konusunda iyisin."
    // 40..80 → "sen {title} konusunda bir uzmansın."
    // >80  → "sen {title} konusunda bir dehasın."
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
    // Box artık opsiyonel "caption" destekliyor
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
            {/* Avatar (%20 büyütüldü) */}
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

            {/* Başlık etiketi: başarı yüzdesine göre */}
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

            <button
              className="w-full py-3 rounded-2xl font-bold bg-cyan-600 hover:bg-cyan-800 text-white shadow-lg active:scale-95 transition"
              onClick={() => {
                fetchSurveys();
                setMode("list");
              }}
            >
              <span className="mr-2">📚</span>Kategoriler
            </button>
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 hover:to-emerald-800 text-white shadow-lg active:scale-95 transition"
              onClick={startRandom}
            >
              <span className="mr-2">🎲</span> Rastgele Soru
            </button>
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
                        fetchLeaderboard(p.key); // tıklandığında anında güncelle
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
                          key={u.id}
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
                  {(dailyStatus?.progress ?? 0)} / {(dailyStatus?.size ?? 128)}
                </span>
              </StatCard>

              {/* DURUM */}
              <StatCard label="Durum">
                <StatusBadge
                  text={
                    dailyStatus?.done
                      ? "Tamamlandı"
                      : dailyStatus?.started
                      ? "Devam Ediyor"
                      : "Hazır"
                  }
                />
              </StatCard>

              {/* BUGÜN (rank) */}
              <StatCard label="Bugün">
                {todayRankLoading ? "—" : todayRank != null ? `${todayRank}.` : "-"}
                <div className="text-[11px] text-gray-500 mt-0.5">sıradasın</div>
              </StatCard>

              {/* PUAN (günün yarışı) */}
              <StatCard label="Puan">
                {Number(dailyStatus?.score ?? dailyStatus?.points ?? 0)}
              </StatCard>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex flex-col gap-2 mt-6">
            <button
              className="w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-800 text-white shadow-lg active:scale-95 transition"
              onClick={async () => {
                if (dailyStatus?.done || dailyLoading) return;
                setDailyError("");
                if (dailyStatus?.started) {
                  await resumeDaily();
                } else {
                  const ok = await startDaily();
                  if (!ok) {
                    // Bazı backend'ler ilk tıkta sadece start edip soru döndürmez; soruyu ayrıca çekeriz
                    await resumeDaily();
                  }
                }
              }}
              title={dailyStatus?.started ? "Devam Et" : "Yarışmaya Başla"}
              disabled={dailyLoading || dailyStatus?.done}
            >
              <span className="mr-2">🏁</span>
              {dailyStatus?.started ? "Devam Et" : "Yarışmaya Başla"}
            </button>

            {dailyError && (
              <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {dailyError}
              </div>
            )}

            <button
              className="w-full py-2 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition"
              onClick={() => setMode("panel")}
              title="Panele dön"
            >
              ← Panele Dön
            </button>

            {/* Bilgilendirme: eğer tamamlamışsa not göster */}
            {dailyStatus?.done && (
              <div className="mt-1 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
                Bugünün yarışmasını tamamladın 🎉 Yarın tekrar bekleriz! Kazandığın
                puanlar genel puanlarına eklendi.
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
          <div className="text-lg font-semibold mb-4">{q.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q.point}
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
          <h2 className="text-xl font-bold text-cyan-700 mb-1">Günün Yarışması</h2>
          <div className="text-sm text-gray-600 mb-1">
            {dailyStatus?.progress ?? 0} / {dailyStatus?.size ?? 128}
          </div>
          <div className="text-4xl font-mono text-emerald-700 mb-2 select-none">
            {timeLeft}
          </div>
          <div className="text-lg font-semibold mb-4">{q.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q.point}
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
            onClick={() => {
              // çıkarken “bilmem” say ve dashboard’a dön
              handleAnswer("bilmem", { exitAfter: true });
            }}
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

          {/* Rastgele alıntı (başlıksız, yenile butonu yok) */}
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
