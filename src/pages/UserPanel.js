import React, { useState, useEffect } from "react";

// Universal kullanıcı getter (hem web, hem mobil)
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

// Universal kullanıcı silici
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

const apiUrl = process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";
const PERIODS = [
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" },
  { key: "year", label: "Bu Yıl" },
];
const Stars = () => (
  <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
    {[...Array(10)].map((_, i) => (
      <span
        key={i}
        className={`star-fx absolute text-yellow-400 text-5xl`}
        style={{
          left: `${40 + Math.random() * 20}%`,
          top: `${20 + Math.random() * 50}%`,
          animationDelay: `${i * 0.1}s`,
        }}
      >
        ⭐
      </span>
    ))}
    <style>
      {`
      .star-fx {
        animation: star-pop 1s cubic-bezier(.66,0,.34,1.11);
        opacity: 0.9;
      }
      @keyframes star-pop {
        0%   { transform: scale(0.5) translateY(0); opacity:0.5;}
        40%  { transform: scale(1.2) translateY(-20px);}
        80%  { transform: scale(1) translateY(-40px);}
        100% { transform: scale(0.6) translateY(-60px); opacity:0; }
      }
      `}
    </style>
  </div>
);

export default function UserPanel() {
  const [user, setUser] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [mode, setMode] = useState("panel");
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState([]);
  const [correctAnswered, setCorrectAnswered] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [info, setInfo] = useState("");
  const [timeLeft, setTimeLeft] = useState(24);
  const [timerActive, setTimerActive] = useState(false);

  // LEADERBOARD STATE
  const [rankInfos, setRankInfos] = useState({});
  const [leaderboards, setLeaderboards] = useState({});
  const [activePeriod, setActivePeriod] = useState("today");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // FEEDBACK STATE
  const [feedback, setFeedback] = useState("");
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [showStars, setShowStars] = useState(false);

  // Kategoriye özel leaderboard için state'ler
  const [surveyLeaderboard, setSurveyLeaderboard] = useState([]);
  const [showSurveyLeaderboard, setShowSurveyLeaderboard] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  // Universal olarak kullanıcıyı getir
  useEffect(() => {
    getFeloxUser().then((u) => {
      if (u) setUser(u);
      else window.location.href = "/login";
    });
  }, []);

  // user geldikten sonra diğer dataları çek
  useEffect(() => {
    if (!user) return;

    fetch(`${apiUrl}/api/user/${user.id}/answers`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCorrectAnswered(
            data.answers
              .filter(ans => ans.is_correct == 1)
              .map(ans => ans.question_id)
          );
        }
      });

    fetch(`${apiUrl}/api/user/${user.id}/total-points`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTotalPoints(data.totalPoints);
          setAnsweredCount(data.answeredCount);
        }
      });

    fetch(`${apiUrl}/api/user/${user.id}/answered`)
      .then((res) => res.json())
      .then((d) => d.success && setAnswered(d.answered));

    PERIODS.forEach(p => {
      fetch(`${apiUrl}/api/user/${user.id}/rank?period=${p.key}`)
        .then(res => res.json())
        .then(data => {
          setRankInfos(prev => ({ ...prev, [p.key]: data }));
        });

      fetch(`${apiUrl}/api/leaderboard?period=${p.key}`)
        .then(res => res.json())
        .then(data => {
          setLeaderboards(prev => ({ ...prev, [p.key]: data.leaderboard }));
        });
    });
    // eslint-disable-next-line
  }, [mode, user]);

  const fetchSurveys = () => {
    fetch(`${apiUrl}/api/user/approved-surveys`)
      .then((res) => res.json())
      .then((d) => d.success && setSurveys(d.surveys));
  };

  const fetchQuestions = (surveyId) => {
    fetch(`${apiUrl}/api/surveys/${surveyId}/questions`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          const filtered = d.questions.filter(
            (q) => !correctAnswered.includes(q.id)
          );
          setQuestions(filtered);
          setCurrentIdx(0);
          setMode("solve");
        }
      });
  };

  // Kategoriye özel leaderboard fetch fonksiyonu
  const fetchSurveyLeaderboard = async (surveyId) => {
    setSurveyLeaderboard([]);
    setSelectedSurvey(surveys.find(s => s.id === surveyId));
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/leaderboard`);
    const data = await res.json();
    if (data.success) {
      setSurveyLeaderboard((data.leaderboard || []).filter(u => u.total_points > 0));
    }
    setShowSurveyLeaderboard(true);
  };

  const startRandom = async () => {
    const res = await fetch(`${apiUrl}/api/user/approved-surveys`);
    const data = await res.json();
    let allQuestions = [];
    for (const survey of data.surveys) {
      const qRes = await fetch(
        `${apiUrl}/api/surveys/${survey.id}/questions`
      );
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
    // eslint-disable-next-line
  }, [timeLeft, timerActive]);

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
          if (cevap === "bilmem") msg = "ÖĞREN DE GEL";
          else if (d.is_correct == 1) {
            msg = getSuccessMsg(q.point);
            stars = true;
          }
          else msg = "BİLEMEDİN";
          setFeedback(msg);
          setShowStars(stars && d.is_correct == 1);
          setFeedbackActive(true);

          setTimeout(() => {
            setFeedbackActive(false);
            setShowStars(false);
            if (d.is_correct == 1) {
              setCorrectAnswered((prev) => [...prev, q.id]);
            }
            if (currentIdx < questions.length - 1) {
              setCurrentIdx(currentIdx + 1);
            } else {
              setMode("thankyou");
            }
          }, 2000);
        } else {
          setInfo(d.error || "Cevap kaydedilemedi!");
        }
      })
      .catch((e) => setInfo("Cevap kaydedilemedi! (İletişim hatası)"));
  };

  // Çıkış fonksiyonu universal!
  const handleLogout = async () => {
    await removeFeloxUser();
    window.location.href = "/login";
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-700">
      <span className="animate-spin text-4xl text-cyan-700">⏳</span>
    </div>
  );

  // PANEL EKRANI
  if (mode === "panel") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-700 px-2">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-cyan-100 p-3 shadow-md mb-2">
              <span className="text-3xl text-cyan-600">👤</span>
            </div>
            <h1 className="text-2xl font-extrabold text-cyan-700">{user.ad} {user.soyad}</h1>
            <div className="flex gap-4 mt-2">
              <div>
                <div className="text-xs text-gray-400">Puanın</div>
                <div className="text-xl font-bold text-emerald-600">{totalPoints}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Cevapladığın</div>
                <div className="text-xl font-bold text-emerald-600">{answeredCount}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button className="w-full py-3 rounded-2xl font-bold bg-cyan-600 hover:bg-cyan-800 text-white shadow-lg active:scale-95 transition"
              onClick={() => { fetchSurveys(); setMode("list"); }}>
              <span className="mr-2">📚</span> Onaylı Kategoriler
            </button>
            <button className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 hover:to-emerald-800 text-white shadow-lg active:scale-95 transition"
              onClick={startRandom}>
              <span className="mr-2">🎲</span> Rastgele Soru
            </button>
            <button className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-700 text-white shadow-lg active:scale-95 transition"
              onClick={() => setShowLeaderboard(true)}>
              <span className="mr-2">🏆</span> Puan Tablosu
            </button>
          </div>

          <button
            className="w-full py-2 mt-2 rounded-2xl text-sm bg-gray-200 text-gray-600 hover:bg-gray-300 font-semibold"
            onClick={handleLogout}
          >
            Çıkış Yap
          </button>

          {/* Genel puan tablosu modalı */}
          {showLeaderboard && (
            <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-4 relative">
                <button className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500"
                  onClick={() => setShowLeaderboard(false)}>
                  &times;
                </button>
                <h3 className="text-xl font-bold mb-3 text-orange-700 text-center">Puan Tablosu</h3>
                <div className="flex justify-center gap-1 mb-2">
                  {PERIODS.map(p => (
                    <button
                      key={p.key}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${activePeriod === p.key ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-800 hover:bg-orange-400"}`}
                      onClick={() => setActivePeriod(p.key)}
                    >{p.label}</button>
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
                    {Array.isArray(leaderboards[activePeriod]) && leaderboards[activePeriod].length > 0 ? (
                      leaderboards[activePeriod].slice(0, 10).map((u, i) => (
                        <tr key={u.id} className={u.id === user.id ? "bg-yellow-100 font-bold" : ""}>
                          <td className="p-1 border">{i + 1}</td>
                          <td className="p-1 border">{u.ad}</td>
                          <td className="p-1 border">{u.soyad}</td>
                          <td className="p-1 border">{u.total_points}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-gray-400 text-center py-2">Veri yok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Anket listesi ---
  if (mode === "list") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-6 w-full max-w-lg text-center">
          <h2 className="text-xl font-bold text-cyan-700 mb-4">
            Onaylanmış Kategoriler
          </h2>
          {surveys.length === 0 ? (
            <div className="text-gray-600">Hiç onaylanmış anket yok.</div>
          ) : (
            <table className="min-w-full border text-sm shadow mb-4">
              <thead>
                <tr className="bg-cyan-100">
                  <th className="p-2 border">Adı</th>
                  <th className="p-2 border">Kategori</th>
                  <th className="p-2 border">Soru Sayısı</th>
                  <th className="p-2 border">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 border">{s.title}</td>
                    <td className="p-2 border">{s.category}</td>
                    <td className="p-2 border">{s.question_count ?? "?"}</td>
                    <td className="p-2 border">
                      <button
                        className="bg-cyan-600 text-white rounded-xl px-3 py-1 hover:bg-cyan-800 mr-2"
                        onClick={() => fetchQuestions(s.id)}
                      >
                        Soruları Çöz
                      </button>
                      <button
                        className="bg-orange-500 text-white rounded-xl px-3 py-1 hover:bg-orange-700"
                        onClick={() => fetchSurveyLeaderboard(s.id)}
                      >
                        Puan Tablosu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            className="mt-2 px-4 py-2 bg-gray-400 text-white rounded-xl hover:bg-gray-600"
            onClick={() => setMode("panel")}
          >
            Panele Dön
          </button>
          {/* Kategoriye özel puan tablosu modalı */}
          {showSurveyLeaderboard && (
            <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                <button
                  className="absolute top-2 right-2 text-2xl font-bold text-gray-500 hover:text-red-600"
                  onClick={() => setShowSurveyLeaderboard(false)}
                  title="Kapat"
                >
                  &times;
                </button>
                <h3 className="text-xl font-bold mb-3 text-orange-700 text-center">
                  {selectedSurvey?.title} için Puan Tablosu
                </h3>
                <table className="min-w-full border text-sm">
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
                        <tr key={u.id} className={u.id === user.id ? "bg-yellow-200 font-bold" : ""}>
                          <td className="p-1 border">{i + 1}</td>
                          <td className="p-1 border">{u.ad}</td>
                          <td className="p-1 border">{u.soyad}</td>
                          <td className="p-1 border">{u.total_points}</td>
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
        </div>
      </div>
    );
  }

  // --- Soru çözüm ekranı ---
  if (mode === "solve" && questions.length > 0) {
    const q = questions[currentIdx];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md text-center relative">
          <h2 className="text-xl font-bold text-cyan-700 mb-4">
            Soru {currentIdx + 1} / {questions.length}
          </h2>
          <div className="text-4xl font-mono text-emerald-700 mb-2 select-none">
            {timeLeft}
          </div>
          <div className="text-lg font-semibold mb-4">{q.question}</div>
          <div className="text-2xl font-bold text-cyan-600 mb-3">
            Puan: {q.point}
          </div>
          <div className="flex flex-col gap-3 mb-4">
            <button
              className="py-2 px-6 rounded-xl font-bold bg-cyan-600 text-white hover:bg-cyan-800"
              onClick={() => handleAnswer("evet")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Evet
            </button>
            <button
              className="py-2 px-6 rounded-xl font-bold bg-cyan-600 text-white hover:bg-cyan-800"
              onClick={() => handleAnswer("hayır")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Hayır
            </button>
            <button
              className="py-2 px-6 rounded-xl font-bold bg-cyan-600 text-white hover:bg-cyan-800"
              onClick={() => handleAnswer("bilmem")}
              disabled={timeLeft === 0 || feedbackActive}
            >
              Bilmem
            </button>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-400 text-white rounded-xl hover:bg-gray-600"
            onClick={() => setMode("thankyou")}
          >
            Şimdilik bu kadar yeter
          </button>
          {info && <div className="text-red-600 mt-2">{info}</div>}

          {feedbackActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-2xl text-3xl font-extrabold text-emerald-700 animate-pulse z-10">
              {feedback}
              {showStars && <Stars />}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "thankyou") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">
            TEŞEKKÜRLER
          </h2>
          <p className="text-lg text-gray-700 mb-4">
            Yine bekleriz! Dilediğin zaman yeni sorular çözebilirsin.
          </p>
          <button
            className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-800"
            onClick={() => setMode("panel")}
          >
            Panele Dön
          </button>
        </div>
      </div>
    );
  }

  // Çözülecek soru kalmadı ekranı
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <h2 className="text-xl font-bold text-cyan-700 mb-4">
          Çözülecek soru kalmadı!
        </h2>
        <button
          className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-800"
          onClick={() => setMode("panel")}
        >
          Panele Dön
        </button>
      </div>
    </div>
  );
}
