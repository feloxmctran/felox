import React, { useState, useEffect } from "react";

// Universal kullanıcı getter (web + mobil)
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

  const [rankInfos, setRankInfos] = useState({});
  const [leaderboards, setLeaderboards] = useState({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [showStars, setShowStars] = useState(false);

  // Kategoriye özel leaderboard
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

  // Kullanıcı gelince: doğru cevaplar, puan, cevaplananlar, sıralama ve leaderboardları çek
  useEffect(() => {
    if (!user) return;

    fetch(`${apiUrl}/api/user/${user.id}/answers`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCorrectAnswered(
            data.answers
              .filter(ans => ans.is_correct === 1 || ans.is_correct === "1") // int veya string
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
  }, [mode, user]);

  // Sadece sorusu olan anketleri getir!
  const fetchSurveys = () => {
    fetch(`${apiUrl}/api/user/approved-surveys`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          setSurveys(
            d.surveys.filter(s => (s.question_count ?? 0) > 0)
          );
        }
      });
  };

  // Sadece çözülmemiş soruları getir
  const fetchQuestions = (surveyId) => {
    fetch(`${apiUrl}/api/surveys/${surveyId}/questions`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          // SADECE DAHA ÖNCE DOĞRU CEVAPLANMAMIŞ soruları getir
          const filtered = d.questions.filter(
            (q) => !correctAnswered.includes(q.id)
          );
          setQuestions(filtered);
          setCurrentIdx(0);
          setMode("solve");
        }
      });
  };

  // Kategoriye özel leaderboard fetch
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

  // Rastgele (tüm anketlerden) çözüm başlat
  const startRandom = async () => {
    const res = await fetch(`${apiUrl}/api/user/approved-surveys`);
    const data = await res.json();
    let allQuestions = [];
    for (const survey of data.surveys.filter(s => (s.question_count ?? 0) > 0)) {
      const qRes = await fetch(
        `${apiUrl}/api/surveys/${survey.id}/questions`
      );
      const qData = await qRes.json();
      if (qData.success) {
        allQuestions = allQuestions.concat(qData.questions);
      }
    }
    // Sadece çözülmeyenleri filtrele
    const filtered = allQuestions.filter((q) => !correctAnswered.includes(q.id));
    filtered.sort(() => Math.random() - 0.5);
    setQuestions(filtered);
    setCurrentIdx(0);
    setMode("solve");
  };

  // Timer
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
  }, [timeLeft, timerActive]); // <-- eksik dependency düzeltildi

  // Başarı mesajı
  const getSuccessMsg = (puan) => {
    if (puan <= 3) return "TEBRİKLER";
    if (puan <= 6) return "HARİKASIN";
    if (puan <= 9) return "SÜPERSİN";
    return "MUHTEŞEMSİN";
  };

  // Soruya cevap verildiğinde
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
          else if (d.is_correct === 1 || d.is_correct === "1") {
            msg = getSuccessMsg(q.point);
            stars = true;
          }
          else msg = "BİLEMEDİN";
          setFeedback(msg);
          setShowStars(stars);
          setFeedbackActive(true);

          setTimeout(() => {
            setFeedbackActive(false);
            setShowStars(false);
            if (d.is_correct === 1 || d.is_correct === "1") {
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
      .catch(() => setInfo("Cevap kaydedilemedi! (İletişim hatası)"));
  };

  // Çıkış
  const handleLogout = async () => {
    await removeFeloxUser();
    window.location.href = "/login";
  };

  // PANEL EKRANI
  if (!user) return <div>Yükleniyor...</div>;

  if (mode === "panel") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-cyan-700 mb-4">
            Kullanıcı Paneli
          </h2>
          <div className="mb-4 text-gray-700">
            Hoş geldin <b>{user.ad} {user.soyad}</b>!
          </div>
          <div className="mb-3">
            <b>Puanın:</b> <span className="text-emerald-700 text-xl">{totalPoints}</span>
            <br />
            <b>Cevapladığın Soru:</b> <span className="text-emerald-700 text-xl">{answeredCount}</span>
          </div>
          <button
            className="mb-6 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
            onClick={handleLogout}
          >
            Çıkış Yap
          </button>
          <div className="flex flex-col gap-2 mb-5">
            <button
              className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-800"
              onClick={() => { fetchSurveys(); setMode("list"); }}
            >
              Onaylı Kategoriler
            </button>
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-800"
              onClick={startRandom}
            >
              Rastgele Sorular
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ANKET LİSTESİ
  if (mode === "list") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">
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

  // SORU ÇÖZÜM EKRANI
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

  // Soru çözümü sonrası
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

  // Çözülecek soru kalmadı!
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
