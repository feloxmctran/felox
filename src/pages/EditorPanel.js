// src/pages/EditorPanel.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const apiUrl = process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

// Universal storage getter
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

// Universal storage remover
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

export default function EditorPanel() {
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);

  // "panel", "create", "list", "detail", "report"
  const [mode, setMode] = useState("panel");

  // Anket oluşturma
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState("");
  const [questions, setQuestions] = useState([{ question: "", correct_answer: "", point: 1 }]);
  const [message, setMessage] = useState("");

  // Anket listesi ve detay
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyQuestions, setSurveyQuestions] = useState([]);

  // RAPOR STATE
  const [report, setReport] = useState(null);

  // Girişli editörü oku!
  useEffect(() => {
    getFeloxUser().then((u) => {
      if (u) setEditor(u);
      else navigate("/login");
    });
    // eslint-disable-next-line
  }, []);

  const handleLogout = async () => {
    await removeFeloxUser();
    navigate("/login");
  };

  // Anket oluştur
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !title ||
      !start ||
      !end ||
      !category ||
      questions.some(
        (q) =>
          !q.question ||
          !q.correct_answer ||
          !q.point ||
          isNaN(q.point) ||
          q.point < 1 ||
          q.point > 10
      )
    ) {
      setMessage("Tüm alanları ve soruları (puan dahil) doldurun.");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editor_id: editor.id,
          title,
          start_date: start,
          end_date: end,
          category,
          questions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Anket başarıyla oluşturuldu!");
        setTitle("");
        setStart("");
        setEnd("");
        setCategory("");
        setQuestions([{ question: "", correct_answer: "", point: 1 }]);
        setMode("panel");
      } else {
        setMessage(data.error || "Hata oluştu.");
      }
    } catch {
      setMessage("Sunucuya ulaşılamıyor.");
    }
  };

  // Soruları yönet
  const handleQuestionChange = (i, field, value) => {
    const updated = questions.map((q, idx) =>
      idx === i ? { ...q, [field]: field === "point" ? Number(value) : value } : q
    );
    setQuestions(updated);
  };
  const addQuestion = () =>
    setQuestions([...questions, { question: "", correct_answer: "", point: 1 }]);
  const removeQuestion = (i) => {
    if (questions.length > 1) setQuestions(questions.filter((_, idx) => idx !== i));
  };

  // Anketleri çek
  const fetchSurveys = async () => {
    if (!editor) return;
    const res = await fetch(`${apiUrl}/api/editor/${editor.id}/surveys`);
    const data = await res.json();
    if (data.success) setSurveys(data.surveys);
    else setSurveys([]);
  };
  useEffect(() => {
    if (mode === "list" && editor) fetchSurveys();
    // eslint-disable-next-line
  }, [mode, editor]);

  // Detayları çek
  const fetchSurveyDetails = async (surveyId) => {
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/details`);
    const data = await res.json();
    if (data.success) {
      setSelectedSurvey(data.survey);
      setSurveyQuestions(data.questions);
      setMode("detail");
    }
  };

  // Soft delete (status = 'deleted')
  const handleDeleteSurvey = async (surveyId) => {
    if (!window.confirm("Bu anketi silmek istediğine emin misin?")) return;
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/delete`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.success) {
      fetchSurveys();
    } else {
      alert("Anket silinemedi!");
    }
  };

  // RAPORU ÇEK
  const fetchSurveyReport = async (surveyId) => {
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/answers-report`);
    const data = await res.json();
    if (data.success) {
      setReport({
        questions: data.questions,
        participants: data.participants,
        total: data.total_participants,
      });
      setMode("report");
    }
  };

  // ------------------ RENDER ------------------

  // Kullanıcı yüklenmediyse beklet
  if (!editor) return <div>Yükleniyor...</div>;

  if (mode === "report" && report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 to-cyan-700">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-cyan-700 mb-2">Anket Raporu</h2>
          <div className="mb-4 text-gray-700">
            <b>Katılımcı Sayısı:</b> {report.total}
          </div>
          <div className="overflow-auto">
            <table className="min-w-full border text-sm mb-3">
              <thead>
                <tr className="bg-cyan-100">
                  <th className="p-2 border">Ad</th>
                  <th className="p-2 border">Soyad</th>
                  <th className="p-2 border">Yaş</th>
                  <th className="p-2 border">Cinsiyet</th>
                  <th className="p-2 border">Şehir</th>
                  {report.questions.map((q) => (
                    <th className="p-2 border" key={q.id}>{q.question}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.participants.map((u, idx) => (
                  <tr key={u.user_id || idx}>
                    <td className="p-2 border">{u.ad}</td>
                    <td className="p-2 border">{u.soyad}</td>
                    <td className="p-2 border">{u.yas}</td>
                    <td className="p-2 border">{u.cinsiyet}</td>
                    <td className="p-2 border">{u.sehir}</td>
                    {report.questions.map((q) => (
                      <td className="p-2 border" key={q.id}>
                        {u.answers[q.id] || <span className="text-gray-400">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-400 text-white rounded-xl hover:bg-gray-600"
            onClick={() => setMode("list")}
          >
            Listeye Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 to-cyan-700">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-blue-700 mb-2">Editör Paneli</h2>
        <p className="text-md text-gray-700 mb-4">
          Hoş geldiniz, <b>{editor?.ad}</b>!
        </p>
        <button
          onClick={handleLogout}
          className="mb-5 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
        >
          Çıkış Yap
        </button>
        <div className="flex gap-3 mb-5 justify-center">
          <button
            className={`py-2 px-6 rounded-xl font-bold ${mode === "create" ? "bg-cyan-700 text-white" : "bg-cyan-200 text-cyan-800 hover:bg-cyan-300"}`}
            onClick={() => {
              setMode("create");
              setMessage("");
            }}
          >
            + Yeni Anket Oluştur
          </button>
          <button
            className={`py-2 px-6 rounded-xl font-bold ${mode === "list" ? "bg-blue-700 text-white" : "bg-blue-200 text-blue-800 hover:bg-blue-300"}`}
            onClick={() => {
              setMode("list");
              setMessage("");
            }}
          >
            Anketlerim
          </button>
        </div>

        {/* PANEL MODU */}
        {mode === "panel" && <div className="text-lg text-gray-500 mt-12">İşlem seçiniz…</div>}

        {/* YENİ ANKET OLUŞTUR MODU */}
        {mode === "create" && (
          <div className="mt-4 mb-2 p-4 bg-cyan-50 border border-cyan-200 rounded-xl shadow">
            <h3 className="text-lg font-semibold mb-2 text-cyan-700">Yeni Anket Oluştur</h3>
            {message && <div className="text-red-600 mb-2">{message}</div>}
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <input
                className="border p-2 rounded-xl"
                placeholder="Anket Adı"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className="border p-2 rounded-xl"
                type="date"
                placeholder="Başlangıç Tarihi"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <input
                className="border p-2 rounded-xl"
                type="date"
                placeholder="Bitiş Tarihi"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
              <select
                className="border p-2 rounded-xl"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Kategori Seçin</option>
                <option value="Genel">Genel</option>
                <option value="Sağlık">Sağlık</option>
                <option value="Teknoloji">Teknoloji</option>
                <option value="Tarih">Tarih</option>
                <option value="coğrafya">Coğrafya</option>
                <option value="Matematik">Matematik</option>
                <option value="Futbol">Futbol</option>
                <option value="Basketbol">Basketbol</option>
                <option value="Spor">Spor</option>
                <option value="Türkçe Müzik">Türkçe Müzik</option>
              </select>

              <div className="text-left mt-2 font-semibold text-blue-700">Sorular</div>
              {questions.map((q, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    className="border p-2 rounded-xl flex-1"
                    placeholder={`Soru ${i + 1}`}
                    value={q.question}
                    onChange={(e) =>
                      handleQuestionChange(i, "question", e.target.value)
                    }
                  />
                  <select
                    className="border p-2 rounded-xl"
                    value={q.correct_answer}
                    onChange={(e) =>
                      handleQuestionChange(i, "correct_answer", e.target.value)
                    }
                  >
                    <option value="">Doğru Cevap</option>
                    <option value="evet">Evet</option>
                    <option value="hayır">Hayır</option>
                    <option value="bilmem">Bilmem</option>
                  </select>
                  <input
                    className="border p-2 rounded-xl w-20"
                    type="number"
                    min={1}
                    max={10}
                    value={q.point}
                    onChange={(e) =>
                      handleQuestionChange(i, "point", e.target.value)
                    }
                    placeholder="Puan"
                    title="Puan (1-10)"
                  />
                  <button
                    type="button"
                    className="bg-red-400 hover:bg-red-600 text-white px-3 rounded-xl"
                    onClick={() => removeQuestion(i)}
                    title="Soruyu sil"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="bg-green-500 hover:bg-green-600 text-white py-1 px-4 rounded-xl"
              >
                + Soru Ekle
              </button>
              <div className="flex gap-4 mt-3 justify-center">
                <button
                  type="button"
                  className="bg-gray-400 hover:bg-gray-600 text-white py-2 px-4 rounded-xl"
                  onClick={() => {
                    setMode("panel");
                    setMessage("");
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-xl font-bold"
                >
                  Anketi Oluştur
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ANKETLERİM MODU */}
        {mode === "list" && (
          <div className="overflow-x-auto mt-6">
            {surveys.length === 0 ? (
              <div className="text-gray-600">Henüz hiç anketiniz yok.</div>
            ) : (
              <table className="min-w-full border text-sm shadow">
                <thead>
                  <tr className="bg-cyan-100">
                    <th className="p-2 border">Adı</th>
                    <th className="p-2 border">Durum</th>
                    <th className="p-2 border">Oluşturma Tarihi</th>
                    <th className="p-2 border">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 border">{s.title}</td>
                      <td className="p-2 border">
                        {s.status === "pending" && (
                          <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Onay bekliyor</span>
                        )}
                        {s.status === "approved" && (
                          <span className="bg-green-200 text-green-800 px-2 py-1 rounded">Onaylandı</span>
                        )}
                        {s.status === "rejected" && (
                          <span className="bg-red-200 text-red-800 px-2 py-1 rounded">Reddedildi</span>
                        )}
                      </td>
                      <td className="p-2 border">{s.start_date}</td>
                      <td className="p-2 border">
                        <button
                          className="bg-cyan-600 text-white rounded-xl px-3 py-1 hover:bg-cyan-800"
                          onClick={() => fetchSurveyDetails(s.id)}
                        >
                          Detay
                        </button>
                        <button
                          className="ml-2 bg-indigo-500 text-white rounded-xl px-3 py-1 hover:bg-indigo-700"
                          onClick={() => fetchSurveyReport(s.id)}
                          title="Anket Raporu"
                        >
                          Rapor
                        </button>
                        {s.status === "pending" && (
                          <button
                            className="ml-2 bg-red-500 text-white rounded-xl px-3 py-1 hover:bg-red-700"
                            onClick={() => handleDeleteSurvey(s.id)}
                          >
                            Sil
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              className="mt-4 px-4 py-2 bg-gray-400 text-white rounded-xl hover:bg-gray-600"
              onClick={() => setMode("panel")}
            >
              Panele Dön
            </button>
          </div>
        )}

        {/* DETAY MODU */}
        {mode === "detail" && selectedSurvey && (
          <div className="mt-6 text-left bg-cyan-50 rounded-xl p-6 shadow max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-cyan-700 mb-2">Anket Detayı</h3>
            <div><b>Adı:</b> {selectedSurvey.title}</div>
            <div><b>Kategori:</b> {selectedSurvey.category}</div>
            <div><b>Başlangıç:</b> {selectedSurvey.start_date}</div>
            <div><b>Bitiş:</b> {selectedSurvey.end_date}</div>
            <div>
              <b>Durum:</b>{" "}
              {selectedSurvey.status === "pending" && (
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Onay bekliyor</span>
              )}
              {selectedSurvey.status === "approved" && (
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded">Onaylandı</span>
              )}
              {selectedSurvey.status === "rejected" && (
                <span className="bg-red-200 text-red-800 px-2 py-1 rounded">Reddedildi</span>
              )}
            </div>
            <div className="mt-3 mb-1 font-semibold text-cyan-700">Sorular</div>
            <ol className="list-decimal ml-5">
              {surveyQuestions.map((q, i) => (
                <li key={q.id}>
                  <span>
                    {q.question}
                    {typeof q.point === "number" && (
                      <span className="text-xs italic text-blue-700 ml-2">(Puan: {q.point})</span>
                    )}
                  </span>{" "}
                  <span className="text-xs italic text-gray-600">(Doğru: {q.correct_answer})</span>
                </li>
              ))}
            </ol>
            <button
              className="mt-6 px-4 py-2 bg-gray-400 text-white rounded-xl hover:bg-gray-600"
              onClick={() => setMode("list")}
            >
              Listeye Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
