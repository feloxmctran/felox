// src/pages/UserPanel.js
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
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(false);

  const [rankInfos, setRankInfos] = useState({});
  const [leaderboards, setLeaderboards] = useState({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [showStars, setShowStars] = useState(false);

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
              .filter(ans => ans.is_correct === 1)
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
      setTimeLeft(10);
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
          else if (d.is_correct === 1) {
            msg = getSuccessMsg(q.point);
            stars = true;
          }
          else msg = "BİLEMEDİN";
          setFeedback(msg);
          setShowStars(stars && d.is_correct === 1);
          setFeedbackActive(true);

          setTimeout(() => {
            setFeedbackActive(false);
            setShowStars(false);
            if (d.is_correct === 1) {
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

  if (!user) return <div>Yükleniyor...</div>;

  // PANEL EKRANI
  if (mode === "panel") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-xl text-center">
          <h2 className="text-3xl font-bold text-emerald-700 mb-2">
            Kullanıcı Paneli
          </h2>
          <p className="text-lg text-gray-700 mb-2">
            Hoş geldiniz, <b>{user.ad}</b>!
          </p>
          <div className="mb-4 flex flex-wrap justify-center gap-4">
            <span className="inline-block bg-emerald-100 text-emerald-700 px-4 py-1 rounded-lg">
              Toplam Puan: <b>{totalPoints}</b>
            </span>
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1 rounded-lg">
              Çözülen Soru: <b>{answeredCount}</b>
            </span>
          </div>
          {/* Butonlar */}
          <div className="flex flex-col gap-3 mt-2 mb-4">
            <button
              className="py-2 px-6 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-800"
              onClick={startRandom}
            >
              Hemen Başla
            </button>
            <button
              className="py-2 px-6 rounded-xl font-bold bg-cyan-600 text-white hover:bg-cyan-800"
              onClick={() => {
                fetchSurveys();
                setMode("list");
              }}
            >
              Kategori Seç
            </button>
          </div>
          {/* Sıralama kutuları */}
          <div className="mb-4 text-left">
            <h3 className="text-xl font-bold text-cyan-700 mb-2 text-center">
              Sıralamadaki Yeriniz
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {PERIODS.map((p) => {
                const r = rankInfos[p.key] || {};
                return (
                  <div
                    key={p.key}
                    className="bg-orange-100 px-3 py-2 rounded-xl shadow text-orange-800 text-center flex flex-col items-center"
                  >
                    <span className="font-semibold">{p.label}</span>
                    <span className="text-2xl font-bold">
                      {r.rank ? r.rank : "-"}{" "}
                      <span className="text-lg font-normal">
                        / {r.total_users ? r.total_users : "-"}
                      </span>
                    </span>
                    <span className="text-sm text-orange-700">
                      Puan: {r.user_points ?? "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* PUAN TABLOSU MODALI */}
          {showLeaderboard && (
            <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                <button
                  className="absolute top-2 right-2 text-2xl font-bold text-gray-500 hover:text-red-600"
                  onClick={() => setShowLeaderboard(false)}
                  title="Kapat"
                >
                  &times;
                </button>
                <h3 className="text-2xl font-bold mb-3 text-cyan-700 text-center">
                  Puan Tablosu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {PERIODS.map((p) => (
                    <div
                      key={p.key}
                      className="border rounded-xl shadow bg-cyan-50 mb-3"
                    >
                      <div className="bg-cyan-200 rounded-t-xl py-2 font-bold text-lg text-cyan-900 text-center">
                        {p.label}
                      </div>
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
                          {(leaderboards[p.key] ?? [])
                            .slice(0, 10)
                            .map((u, i) => (
                              <tr
                                key={u.id}
                                className={
                                  u.id === user.id
                                    ? "bg-yellow-200 font-bold"
                                    : ""
                                }
                              >
                                <td className="p-1 border">{i + 1}</td>
                                <td className="p-1 border">{u.ad}</td>
                                <td className="p-1 border">{u.soyad}</td>
                                <td className="p-1 border">{u.total_points}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {(leaderboards[p.key] ?? []).length === 0 && (
                        <div className="text-gray-500 text-center py-2">
                          Veri yok.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Puan tablosu ve çıkış butonu */}
          <div className="flex flex-row justify-center gap-4 mt-6">
            <button
              className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-800 font-bold"
              onClick={() => setShowLeaderboard(true)}
            >
              Puan Tablosu
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Anket listesi ---
  if (mode === "list") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">
          <h2 className="text-xl font-bold text-cyan-700 mb-4">
            Onaylanmış Anketler
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
                        className="bg-cyan-600 text-white rounded-xl px-3 py-1 hover:bg-cyan-800"
                        onClick={() => fetchQuestions(s.id)}
                      >
                        Soruları Çöz
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
