import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Universal Storage getter
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

// Universal Storage remover (logout)
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

/* =========================
   ADMIN AUTH & FETCH HELPERS
   ========================= */
function getAdminSecretInteractive() {
  let s = localStorage.getItem("admin_secret");
  if (!s) {
    s = window.prompt("Admin secret (x-admin-secret) nedir?");
    if (s) localStorage.setItem("admin_secret", s);
  }
  return s || "";
}

function setAdminSecret(newVal) {
  if (newVal === null || newVal === undefined) return;
  localStorage.setItem("admin_secret", String(newVal));
}

async function adminFetch(path, opts = {}) {
  const secret = getAdminSecretInteractive();
  const headers = {
    ...(opts.headers || {}),
    "x-admin-secret": secret
  };
  // JSON body varsa content-type ekle
  if (opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${apiUrl}${path}`, { ...opts, headers });
  // 403 olursa secret'ı yeniden sor
  if (res.status === 403) {
    localStorage.removeItem("admin_secret");
  }
  return res;
}

/* ===============
   SETTINGS HELPERS
   =============== */
const APP_SETTING_KEYS = {
  dailyContestSize: "daily_contest_size",
  duelQuestionsPerMatch: "duel_questions_per_match",
  ladderMinAttempts: "ladder_min_attempts",
  ladderRequiredRate: "ladder_required_rate",
  ladderQuestionsLimit: "ladder_questions_limit",
};

async function getSetting(key) {
  const res = await adminFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
    method: "GET"
  });
  if (!res.ok) throw new Error(`Ayar okunamadı: ${key}`);
  const j = await res.json();
  return j?.value;
}

async function setSetting(key, value) {
  const res = await adminFetch(`/api/admin/settings`, {
    method: "POST",
    body: JSON.stringify({ key, value })
  });
  if (!res.ok) throw new Error(`Ayar kaydedilemedi: ${key}`);
  return res.json();
}

async function setDailySizeOverrideNext(size) {
  const res = await adminFetch(`/api/admin/daily/contest-size-next`, {
    method: "POST",
    body: JSON.stringify({ size: Number(size) })
  });
  if (!res.ok) throw new Error("Yarına özel günlük soru sayısı kaydedilemedi");
  return res.json(); // { day_key, size }
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);

  // İstatistikler için
  const [stats, setStats] = useState(null);

  // Anketler için
  const [surveys, setSurveys] = useState([]);
  const [mode, setMode] = useState("list"); // "list", "detail"
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyQuestions, setSurveyQuestions] = useState([]);

  // Ayarlar
  const [settings, setSettings] = useState({
    dailyContestSize: "",
    duelQuestionsPerMatch: "",
    ladderMinAttempts: "",
    ladderRequiredRate: "",
    ladderQuestionsLimit: ""
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState({}); // { field: "✓" | "Hata" }
  const [nextDailySize, setNextDailySize] = useState("");
  const [nextDailyStatus, setNextDailyStatus] = useState("");

  // İlk açılışta universal storage'dan admini çek
  useEffect(() => {
    getFeloxUser().then((user) => {
      if (user) setAdmin(user);
      else navigate("/login");
    });
  }, [navigate]);

  // İstatistikleri çek (ADMIN header ile)
  const fetchStats = async () => {
    try {
      const res = await adminFetch(`/api/admin/statistics`, { method: "GET" });
      const data = await res.json();
      if (data.success) setStats(data);
      else setStats(null);
    } catch (e) {
      console.error(e);
      setStats(null);
    }
  };

  // Tüm anketleri çek (ADMIN header ile)
  const fetchSurveys = async () => {
    try {
      const res = await adminFetch(`/api/admin/surveys`, { method: "GET" });
      const data = await res.json();
      if (data.success) setSurveys(data.surveys);
      else setSurveys([]);
    } catch (e) {
      console.error(e);
      setSurveys([]);
    }
  };

  // Ayarları çek
  const loadSettings = async () => {
    setSettingsLoading(true);
    setSettingsStatus({});
    try {
      const [
        dailyContestSize,
        duelQuestionsPerMatch,
        ladderMinAttempts,
        ladderRequiredRate,
        ladderQuestionsLimit
      ] = await Promise.all([
        getSetting(APP_SETTING_KEYS.dailyContestSize),
        getSetting(APP_SETTING_KEYS.duelQuestionsPerMatch),
        getSetting(APP_SETTING_KEYS.ladderMinAttempts),
        getSetting(APP_SETTING_KEYS.ladderRequiredRate),
        getSetting(APP_SETTING_KEYS.ladderQuestionsLimit),
      ]);

      setSettings({
        dailyContestSize: valueToInput(dailyContestSize),
        duelQuestionsPerMatch: valueToInput(duelQuestionsPerMatch),
        ladderMinAttempts: valueToInput(ladderMinAttempts),
        ladderRequiredRate: valueToInput(ladderRequiredRate),
        ladderQuestionsLimit: valueToInput(ladderQuestionsLimit)
      });
    } catch (e) {
      console.error("Ayarlar yüklenemedi:", e);
    } finally {
      setSettingsLoading(false);
    }
  };

  // İlk yüklemede: istatistikler, anketler, ayarlar
  useEffect(() => { fetchStats(); fetchSurveys(); loadSettings(); }, []);

  // Detaya gir, soruları çek (NOT admin)
  const fetchSurveyDetails = async (surveyId) => {
    const res = await fetch(`${apiUrl}/api/surveys/${surveyId}/details`);
    const data = await res.json();
    if (data.success) {
      setSelectedSurvey(data.survey);
      setSurveyQuestions(data.questions);
      setMode("detail");
    }
  };

  // Onayla/Reddet (ADMIN)
  const handleStatus = async (surveyId, status) => {
    try {
      const res = await adminFetch(`/api/surveys/${surveyId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSurveys();
        setMode("list");
      } else {
        alert("Durum değiştirilemedi!");
      }
    } catch (e) {
      console.error(e);
      alert("Durum değiştirilemedi!");
    }
  };

  // Soru sil (ADMIN)
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await adminFetch(`/api/questions/${questionId}/delete`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        // Soruları yenile
        fetchSurveyDetails(selectedSurvey.id);
      } else {
        alert("Soru silinemedi!");
      }
    } catch (e) {
      console.error(e);
      alert("Soru silinemedi!");
    }
  };

  const handleLogout = async () => {
    await removeFeloxUser();
    navigate("/login");
  };

  // ======= SETTINGS UI handlers =======
  function valueToInput(v) {
    if (v === null || v === undefined) return "";
    // sayı veya string olabilir; input için stringle
    return String(v);
  }

  function parseValueForKey(key, raw) {
    if (key === APP_SETTING_KEYS.ladderRequiredRate) {
      const f = parseFloat(raw);
      if (!isFinite(f) || f < 0 || f > 1) {
        throw new Error("Başarı oranı 0 ile 1 arasında olmalı (örn: 0.8)");
      }
      return f;
    }
    const n = parseInt(raw, 10);
    if (!isFinite(n)) throw new Error("Değer sayı olmalı");
    return n;
  }

  async function saveOne(field) {
    const key = APP_SETTING_KEYS[field];
    if (!key) return;
    try {
      setSettingsStatus((s) => ({ ...s, [field]: "Kaydediliyor..." }));
      const val = parseValueForKey(key, settings[field]);
      await setSetting(key, val);
      setSettingsStatus((s) => ({ ...s, [field]: "✓ Kaydedildi" }));
    } catch (e) {
      console.error(e);
      setSettingsStatus((s) => ({ ...s, [field]: "Hata" }));
      alert(e.message || "Kaydedilemedi");
    }
  }

  async function saveAll() {
    const fields = Object.keys(APP_SETTING_KEYS);
    for (const f of fields) {
      // tek tek hata yakalayalım, diğerleri devam etsin
      try { await saveOne(f); } catch {}
    }
  }

  async function setTomorrowOverride() {
    setNextDailyStatus("Kaydediliyor...");
    try {
      const n = parseInt(nextDailySize, 10);
      if (!isFinite(n) || n < 1 || n > 200) {
        throw new Error("1-200 arası bir sayı girin");
      }
      const j = await setDailySizeOverrideNext(n);
      setNextDailyStatus(`✓ ${j.day_key} için ${j.size} kaydedildi`);
    } catch (e) {
      console.error(e);
      setNextDailyStatus("Hata");
      alert(e.message || "Yarına özel değer kaydedilemedi");
    }
  }

  function changeAdminSecret() {
    const cur = localStorage.getItem("admin_secret") || "";
    const nv = window.prompt("Yeni admin secret giriniz:", cur);
    if (nv !== null) {
      setAdminSecret(nv);
      // hemen tekrar yükleyelim ki header güncellensin
      fetchStats();
      fetchSurveys();
      loadSettings();
    }
  }

  // Henüz admin yüklenmediyse ekrana boş dön
  if (!admin) return <div className="text-center mt-10">Yükleniyor...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-700">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-3xl text-center">

        <h2 className="text-3xl font-bold text-orange-700 mb-2">Admin Paneli</h2>
        <p className="text-md text-gray-700 mb-4">Hoş geldiniz, <b>{admin?.ad}</b>!</p>

        <div className="flex items-center justify-center gap-2 mb-5">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
          >
            Çıkış Yap
          </button>
          <button
            onClick={changeAdminSecret}
            className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition"
            title="x-admin-secret değerini değiştir"
          >
            Admin Secret Değiştir
          </button>
        </div>

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

        {/* Uygulama Ayarları */}
        <div className="max-w-2xl mx-auto bg-orange-50 rounded-xl shadow p-6 mb-8 text-left">
          <h3 className="text-lg font-bold mb-4 text-orange-800">Uygulama Ayarları</h3>

          <div className="text-sm text-gray-600 mb-4">
            Bu değerler <b>publish gerektirmeden</b> anında aktif olur. İlk satırdaki “Yükle” ile
            sunucudaki mevcut değeri çekebilir, “Kaydet” ile güncelleyebilirsiniz.
          </div>

          <div className="space-y-3">
            {/* Row generator */}
            {[
              { field: "dailyContestSize", label: "Günlük soru sayısı (kalıcı)", min:1, max:200, step:1 },
              { field: "duelQuestionsPerMatch", label: "Düello soru sayısı", min:1, max:50, step:1 },
              { field: "ladderMinAttempts", label: "Kademeli: minimum deneme", min:1, max:1000, step:1 },
              { field: "ladderRequiredRate", label: "Kademeli: başarı oranı (0-1)", min:0, max:1, step:0.01 },
              { field: "ladderQuestionsLimit", label: "Kademeli: soru limiti", min:5, max:1000, step:1 },
            ].map((cfg) => (
              <div key={cfg.field} className="flex items-center">
                <label className="w-1/2 md:w-1/2 pr-3 text-gray-800">{cfg.label}</label>
                <input
                  type="number"
                  className="flex-1 border rounded px-3 py-2"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={settings[cfg.field]}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, [cfg.field]: e.target.value }))
                  }
                  disabled={settingsLoading}
                />
                <button
                  className="ml-2 px-3 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
                  onClick={() => saveOne(cfg.field)}
                  disabled={settingsLoading}
                >
                  Kaydet
                </button>
                <button
                  className="ml-2 px-3 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  onClick={() => loadSettings()}
                  title="Tüm değerleri yeniden yükle"
                  disabled={settingsLoading}
                >
                  Yükle
                </button>
                <span className="ml-2 text-xs text-gray-600">
                  {settingsStatus[cfg.field] || ""}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700"
              onClick={saveAll}
              disabled={settingsLoading}
              title="Hepsini Kaydet"
            >
              Hepsini Kaydet
            </button>
          </div>

          <hr className="my-5" />

          {/* Yarına özel override */}
          <div className="flex items-center">
            <label className="w-1/2 md:w-1/2 pr-3 text-gray-800">
              Günlük soru sayısı (yarına özel override)
            </label>
            <input
              type="number"
              className="flex-1 border rounded px-3 py-2"
              min={1}
              max={200}
              step={1}
              value={nextDailySize}
              onChange={(e) => setNextDailySize(e.target.value)}
            />
            <button
              className="ml-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={setTomorrowOverride}
            >
              Yarına Ayarla
            </button>
            <span className="ml-2 text-xs text-gray-600">{nextDailyStatus}</span>
          </div>
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
