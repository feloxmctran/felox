import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Storage } from "@capacitor/storage";

const apiUrl = process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null); // Önceden localStorage idi, şimdi Storage'dan

  // İstatistikler için
  const [stats, setStats] = useState(null);

  // Anketler için
  const [surveys, setSurveys] = useState([]);
  const [mode, setMode] = useState("list"); // "list", "detail"
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyQuestions, setSurveyQuestions] = useState([]);

  // İlk açılışta Storage'dan admini çek
  useEffect(() => {
    const fetchAdmin = async () => {
      const { value } = await Storage.get({ key: "felox_user" });
      if (value) setAdmin(JSON.parse(value));
      else navigate("/login");
    };
    fetchAdmin();
  }, [navigate]);

  // İstatistikleri çek
  const fetchStats = async () => {
    const res = await fetch(`${apiUrl}/api/admin/statistics`);
    const data = await res.json();
    if (data.success) setStats(data);
  };

  // Tüm anketleri çek
  const fetchSurveys = async () => {
    const res = await fetch(`${apiUrl}/api/admin/surveys`);
    const data = await res.json();
    if (data.success) setSurveys(data.surveys);
    else setSurveys([]);
  };

  useEffect(() => { fetchStats(); fetchSurveys(); }, []);

  // Detaya gir, soruları çek
  const fetchSurveyDetails = async (surveyId) => {
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/details`);
    const data = await res.json();
    if (data.success) {
      setSelectedSurvey(data.survey);
      setSurveyQuestions(data.questions);
      setMode("detail");
    }
  };

  // Onayla/Reddet
  const handleStatus = async (surveyId, status) => {
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      fetchSurveys();
      setMode("list");
    } else {
      alert("Durum değiştirilemedi!");
    }
  };

  // Soru sil
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`${apiUrl}/api/questions/${questionId}/delete`, {
      method: "POST"
    });
    const data = await res.json();
    if (data.success) {
      // Soruları yenile
      fetchSurveyDetails(selectedSurvey.id);
    } else {
      alert("Soru silinemedi!");
    }
  };

  const handleLogout = async () => {
    await Storage.remove({ key: "felox_user" });
    navigate("/login");
  };

  // Henüz admin yüklenmediyse ekrana boş dön
  if (!admin) return <div className="text-center mt-10">Yükleniyor...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-700">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-3xl text-center">

        <h2 className="text-3xl font-bold text-orange-700 mb-2">Admin Paneli</h2>
        <p className="text-md text-gray-700 mb-4">Hoş geldiniz, <b>{admin?.ad}</b>!</p>
        <button
          onClick={handleLogout}
          className="mb-5 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
        >
          Çıkış Yap
        </button>

        {/* İstatistik Kutusu */}
        <div className="max-w-2xl mx-auto bg-orange-50 rounded-xl shadow p-6 mb-8">
          <h3 className="text-lg font-bold mb-4 text-orange-800">Sistem Analizleri</h3>
          {!stats ? (
            <div className="text-center text-gray-400">Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-gray-700 text-lg text-left">
              <div>👤 Toplam Üye Sayısı: <b>{stats.total_users}</b></div>
              <div>🧑‍💻 Soru Çözen Kullanıcı: <b>{stats.total_active_users}</b></div>
              <div>✅ Onaylı Anket: <b>{stats.total_approved_surveys}</b></div>
              <div>❓ Toplam Soru: <b>{stats.total_questions}</b></div>
              <div>✏️ Cevaplanan Soru: <b>{stats.total_answers}</b></div>
              <div>✔️ Doğru Cevaplanan Soru: <b>{stats.total_correct_answers}</b></div>
              <div>❌ Yanlış Cevap: <b>{stats.total_wrong_answers}</b></div>
              <div>🤔 “Bilmem” Denilen: <b>{stats.total_bilmem}</b></div>
            </div>
          )}
        </div>

        {/* Anket Listesi */}
        {mode === "list" && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-800">Tüm Anketler</h3>
            {surveys.length === 0 ? (
              <div className="text-gray-600">Sistemde hiç anket yok.</div>
            ) : (
              <table className="min-w-full border text-sm shadow">
                <thead>
                  <tr className="bg-orange-100">
                    <th className="p-2 border">Adı</th>
                    <th className="p-2 border">Editör</th>
                    <th className="p-2 border">Durum</th>
                    <th className="p-2 border">Başlangıç</th>
                    <th className="p-2 border">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 border">{s.title}</td>
                      <td className="p-2 border">{s.editor_ad} {s.editor_soyad}</td>
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
                          className="bg-orange-600 text-white rounded-xl px-3 py-1 hover:bg-orange-800 mr-2"
                          onClick={() => fetchSurveyDetails(s.id)}
                        >
                          Detay
                        </button>
                        {s.status === "pending" && (
                          <>
                            <button
                              className="bg-green-600 text-white rounded-xl px-3 py-1 hover:bg-green-800 mr-1"
                              onClick={() => handleStatus(s.id, "approved")}
                            >
                              Onayla
                            </button>
                            <button
                              className="bg-red-600 text-white rounded-xl px-3 py-1 hover:bg-red-800"
                              onClick={() => handleStatus(s.id, "rejected")}
                            >
                              Reddet
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Anket Detay */}
        {mode === "detail" && selectedSurvey && (
          <div className="mt-6 text-left bg-orange-50 rounded-xl p-6 shadow max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-orange-700 mb-2">Anket Detayı</h3>
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
            <div className="mt-3 mb-1 font-semibold text-orange-700">Sorular</div>
            <ol className="list-decimal ml-5">
              {surveyQuestions.map((q, i) => (
                <li key={q.id} className="mb-1 flex items-center">
                  <span className="flex-1">{q.question}{" "}
                    <span className="text-xs italic text-gray-600">(Doğru: {q.correct_answer})</span>
                  </span>
                  <button
                    className="ml-2 bg-red-400 hover:bg-red-700 text-white px-2 py-0.5 rounded"
                    title="Soruyu sil"
                    onClick={() => handleDeleteQuestion(q.id)}
                  >
                    Sil
                  </button>
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
