import React, { useState, useEffect } from "react";
import UserPanelHeader from "../components/UserPanelHeader";
import PointsTable from "../components/PointsTable";

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

/* =============================================================== */
export default function UserPanel() {
  const [user, setUser] = useState(null);

  // Kullanıcı skor ve durum
  const [totalPoints, setTotalPoints] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Görünüm modu
  const [mode, setMode] = useState("panel"); // panel | list | solve | thankyou

  // Kategoriler & sorular
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Cevaplanmış/Doğru sorular
  const [answered, setAnswered] = useState([]);
  const [correctAnswered, setCorrectAnswered] = useState([]);

  // Soru çözümü
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

  // Puanlarım modalı
  const [showMyPerf, setShowMyPerf] = useState(false);
  const [myPerf, setMyPerf] = useState([]);
  const [myPerfLoading, setMyPerfLoading] = useState(false);
  const [myPerfError, setMyPerfError] = useState("");

  // Header avatar için: en iyi kategori
  const [bestCategoryTitle, setBestCategoryTitle] = useState("");

  /* -------------------- Kullanıcıyı yükle -------------------- */
  useEffect(() => {
    getFeloxUser().then((u) => {
      if (u) setUser(u);
      else window.location.href = "/login";
    });
  }, []);

  /* -------------------- Kullanıcı verileri -------------------- */
  useEffect(() => {
    if (!user) return;

    // Doğru cevaplar + cevaplananlar
    fetch(`${apiUrl}/api/user/${user.id}/answers`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCorrectAnswered(
            data.answers.filter((ans) => ans.is_correct === 1).map((a) => a.question_id)
          );
        }
      });

    fetch(`${apiUrl}/api/user/${user.id}/answered`)
      .then((res) => res.json())
      .then((d) => d.success && setAnswered(d.answered));

    // Toplam puan ve cevap sayısı
    fetch(`${apiUrl}/api/user/${user.id}/total-points`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTotalPoints(data.totalPoints);
          setAnsweredCount(data.answeredCount);
        }
      });

    // Genel leaderboard’lar
    PERIODS.forEach((p) => {
      fetch(`${apiUrl}/api/leaderboard?period=${p.key}`)
        .then((res) => res.json())
        .then((data) => {
          const filtered = (data.leaderboard || []).filter((u) => (u.total_points || 0) > 0);
          setLeaderboards((prev) => ({ ...prev, [p.key]: filtered }));
        });
    });
  }, [mode, user]);

  /* -------------------- Kategorileri çek -------------------- */
  const fetchSurveys = () => {
    fetch(`${apiUrl}/api/user/approved-surveys`)
      .then((res) => res.json())
      .then((d) => d.success && setSurveys(d.surveys));
  };

  /* -------------------- Kategori soruları -------------------- */
  const fetchQuestions = (surveyId) => {
    fetch(`${apiUrl}/api/surveys/${surveyId}/questions`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          const filtered = d.questions.filter((q) => !correctAnswered.includes(q.id));
          setQuestions(filtered);
          setCurrentIdx(0);
          setMode("solve");
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
      const filtered = (data.leaderboard || []).filter((u) => (u.total_points || 0) > 0);
      setSurveyLeaderboard(filtered);
    } catch {
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

  /* -------------------- Rastgele soru -------------------- */
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
    const filtered = allQuestions.filter((q) => !correctAnswered.includes(q.id));
    filtered.sort(() => Math.random() - 0.5);
    setQuestions(filtered);
    setCurrentIdx(0);
    setMode("solve");
  };

  /* -------------------- Zamanlayıcı -------------------- */
  useEffect(() => {
    if (mode === "solve" && questions.length > 0) {
      setTimeLeft(24);
      setTimerActive(true);
    }
  }, [currentIdx, mode, questions]);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(t);
    }
    if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      handleAnswer("bilmem");
    }
  }, [timeLeft, timerActive]); // eslint-disable-line

  /* -------------------- Cevap işle -------------------- */
  const getSuccessMsg = (puan) => {
    if (puan <= 3) return "TEBRİKLER";
    if (puan <= 6) return "HARİKASIN";
    if (puan <= 9) return "SÜPERSİN";
    return "MUHTEŞEMSİN";
  };

  const handleAnswer = (cevap) => {
    setTimerActive(false);
    const q = questions[currentIdx];
    setInfo("");
    fetch(`${apiUrl}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        question_id: q.id,
        answer: cevap,
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

          setTimeout(() => {
            setFeedbackActive(false);
            setShowStars(false);
            if (d.is_correct === 1) {
              setCorrectAnswered((prev) => [...prev, q.id]);
            }
            if (currentIdx < questions.length - 1) {
              setCurrentIdx((prev) => prev + 1);
            } else {
              setMode("thankyou");
            }
          }, 1700);
        } else {
          setInfo(d.error || "Cevap kaydedilemedi!");
        }
      })
      .catch(() => setInfo("Cevap kaydedilemedi! (İletişim hatası)"));
  };

  /* -------------------- Çıkış -------------------- */
  const handleLogout = async () => {
    await removeFeloxUser();
    window.location.href = "/login";
  };

  /* -------------------- Puanlarım verisi -------------------- */
  const loadMyPerformance = async () => {
    if (!user) return;
    setMyPerfLoading(true);
    setMyPerfError("");
    try {
      const res = await fetch(`${apiUrl}/api/user/${user.id}/performance`);
      const data = await res.json();
      if (data.success) {
        setMyPerf(data.performance || []);
        // En iyi başlık (ilk sıradaki title)
        const top = Array.isArray(data.performance) && data.performance.length > 0
          ? (data.performance[0].title || "")
          : "";
        setBestCategoryTitle(top);
      } else {
        setMyPerfError(data.error || "Veri alınamadı");
      }
    } catch (e) {
      setMyPerfError("Bağlantı hatası");
    } finally {
      setMyPerfLoading(false);
    }
  };

  /* -------------------- Render -------------------- */
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-700">
        <span className="animate-spin text-4xl text-white">⏳</span>
      </div>
    );

  /* -------------------- PANEL -------------------- */
  if (mode === "panel") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6">
          {/* Header (avatar + özet + logout) */}
          <UserPanelHeader
            user={user}
            totalPoints={totalPoints}
            answeredCount={answeredCount}
            bestCategoryTitle={bestCategoryTitle}
            onLogout={handleLogout}
          />

          {/* Aksiyon butonları */}
          <div className="flex flex-col gap-3 mt-6">
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
              onClick={() => setShowLeaderboard(true)}
            >
              <span className="mr-2">🏆</span> Genel Puan Tablosu
            </button>
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
                      onClick={() => setActivePeriod(p.key)}
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
        </div>
      </div>
    );
  }

  /* -------------------- ONAYLI KATEGORİLER -------------------- */
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 to-cyan-600 px-3 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white/95 rounded-3xl shadow-2xl p-5">
            <h2 className="text-2xl font-extrabold text-cyan-700 text-center mb-4">
              Kategoriler
            </h2>

            {surveys.length === 0 ? (
              <div className="text-gray-600 text-center py-6">Henüz kategori yok.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {surveys.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl bg-white border shadow hover:shadow-lg transition p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 pr-3">
                      <div className="text-base font-bold text-emerald-700 leading-tight">
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Kategori: <b className="text-gray-700">{s.category}</b>
                      </div>
                      <div className="text-xs text-gray-500">
                        Soru: <b className="text-gray-700">{s.question_count ?? "?"}</b>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className="px-3 py-2 rounded-xl text-sm font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95"
                        onClick={() => fetchQuestions(s.id)}
                      >
                        Soruları Çöz
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-700 active:scale-95"
                        onClick={() => openSurveyLeaderboard(s)}
                      >
                        Puan Tablosu
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="mt-5 w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 font-semibold"
              onClick={() => setMode("panel")}
            >
              Panele Dön
            </button>
          </div>
        </div>

        {/* Kategoriye özel puan tablosu modalı */}
        {showSurveyLeaderboard && (
          <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center p-3">
            <div className="bg-white rounded-3xl shadow-2xl p-5 w-full max-w-sm relative">
              <button
                className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500"
                onClick={() => setShowSurveyLeaderboard(false)}
                title="Kapat"
              >
                &times;
              </button>
              <h3 className="text-xl font-bold mb-3 text-orange-700 text-center">
                {selectedSurvey?.title} – Puan Tablosu
              </h3>

              <div className="flex justify-center gap-1 mb-3 flex-wrap">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      surveyActivePeriod === p.key
                        ? "bg-orange-600 text-white"
                        : "bg-orange-100 text-orange-800 hover:bg-orange-300"
                    }`}
                    onClick={() => handleSurveyPeriodChange(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="min-h-[160px]">
                {surveyLoading ? (
                  <div className="text-center text-gray-500 py-10">Yükleniyor…</div>
                ) : (
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
                      {surveyLeaderboard.length > 0 ? (
                        surveyLeaderboard.slice(0, 10).map((u, i) => (
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* -------------------- SORU ÇÖZ -------------------- */
  if (mode === "solve" && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
          <h2 className="text-xl font-bold text-cyan-700 mb-3">
            Soru {currentIdx + 1} / {questions.length}
          </h2>
          <div className="text-4xl font-mono text-emerald-700 mb-2 select-none">
            {timeLeft}
          </div>
          <div className="text-lg font-semibold mb-4">{q.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">Puan: {q.point}</div>
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

  /* -------------------- TEŞEKKÜRLER -------------------- */
  if (mode === "thankyou") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">TEŞEKKÜRLER</h2>
          <p className="text-lg text-gray-700 mb-4">
            Yine bekleriz! Dilediğin zaman yeni sorular çözebilirsin.
          </p>
          {/* ✅ Eksik olan buton geri eklendi */}
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

  /* -------------------- Fallback -------------------- */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center">
        <h2 className="text-xl font-bold text-cyan-700 mb-2">Çözülecek soru kalmadı!</h2>
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
