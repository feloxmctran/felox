// src/pages/UserPanel.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "../styles/starfx.css"; // ⭐ yıldız animasyonu CSS (src/styles/starfx.css)
import {
  SunIcon,
  BoltIcon,
  BookIcon,
  DiceIcon,
  TrophyIcon,
  CloseIcon,
  ChartIcon,
  SpinnerIcon,
  SwordsIcon,
} from "../icons/Icons";

import { useNavigate, Link, useLocation } from "react-router-dom";
import { openDuelloEventStream } from "../lib/duelloSSE";
import NotificationBell from "../components/NotificationBell";


// -------------------- Universal User Storage --------------------
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

// -------------------- Config --------------------
const apiUrl =
  process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

const PERIODS = [
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" },
  { key: "year", label: "Bu Yıl" },
];

// -------------------- Rastgele karıştırma --------------------
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
// === FEL0X: STARS COMPONENT START ===
// === Fancy Star SVG (glow + gradient) ===
const SparkStar = ({ id = "s0", size = 44 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="star-fx-svg"
  >
    <defs>
      <radialGradient id={`grad-${id}`} cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#fff9c4" />   {/* açık sarı */}
        <stop offset="45%" stopColor="#fde047" />  {/* amber-300 */}
        <stop offset="100%" stopColor="#f59e0b" /> {/* amber-500 */}
      </radialGradient>
    </defs>
    <path
      d="M12 2.2l2.7 5.6 6.2.9-4.5 4.4 1 6.2L12 16.9 6.6 19.3l1-6.2-4.5-4.4 6.2-.9L12 2.2z"
      fill={`url(#grad-${id})`}
      stroke="#f8d442"
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
  </svg>
);

// === STARS (animated burst) ===
const Stars = ({ count = 1 }) => (
  <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
    {Array.from({ length: Math.max(1, Math.min(count, 10)) }).map((_, i) => (
      <div
        key={i}
        className="star-fx absolute"
        style={{
          left: `${35 + Math.random() * 30}%`,
          top: `${20 + Math.random() * 50}%`,
          animationDelay: `${i * 0.08}s`,
        }}
      >
        <SparkStar id={`s${i}`} size={44} />
      </div>
    ))}
  </div>
);


// --- Güvenli normalize: NFD + combining marks temizleme + TR özel eşlemeler ---
function safeNormalize(s = "") {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diakritikleri sil
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/â/g, "a");
}


// === FEL0X: STARS COMPONENT END ===

/* -------------------- Küçük yardımcı UI bileşenleri -------------------- */
const COLOR_CLASSES = {
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
  gray: "bg-gray-100 text-gray-700",
};

const TEXT_COLORS = {
  emerald: "text-emerald-700",
  blue: "text-blue-700",
  orange: "text-orange-700",
  red: "text-red-700",
  purple: "text-purple-700",
  gray: "text-gray-700",
};

const StatusBadge = ({ text, color = "emerald", size = "xs", variant = "solid", className = "" }) => {
  const sizeCls =
    size === "md" ? "text-base" :
    size === "sm" ? "text-sm"   :
                    "text-xs";

  const solidCls = COLOR_CLASSES[color] || COLOR_CLASSES.emerald;
  const ghostCls = `${TEXT_COLORS[color] || TEXT_COLORS.emerald} bg-transparent`;

  const base = variant === "ghost" ? ghostCls : solidCls;

  // className en sonda: tailwind'de son gelen kazanır -> renkleri kolay override ederiz
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${sizeCls} ${base} ${className}`}>
      {text}
    </span>
  );
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  const base = toast.type === "error" ? "bg-red-600" : "bg-emerald-600";
  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+12px)] right-3 z-[90] pointer-events-none">
  <div className={`px-4 py-2 rounded-xl shadow-lg text-white text-sm font-semibold pointer-events-auto ${base}`}>
    {toast.msg}
  </div>
</div>
  );
};


/* Hız kademesi görünümü (label + renk) — diakritiklere dayanıklı */
/* Hız kademesi görünümü (label + renk) — diakritiklere dayanıklı */
const tierMeta = (t) => {
  const key = safeNormalize(String(t || "").toLowerCase());
  switch (key) {
    case "alim":      return { label: "Çabuk karar veren", color: "emerald" };
    case "cesur":     return { label: "Cesur",             color: "orange"  };
    case "tedbirli":  return { label: "Tedbirli",          color: "blue"    };
    case "garantici": return { label: "Garantici",         color: "gray"    };
    default:          return { label: null,                color: "gray"    };
  }
};


/* === TIER HEADING (Cesur başlığı) === */
const TierHeading = ({ tier }) => {
  const { label } = tierMeta(tier);
  if (!label) return null;
  return (
    <div className="text-sm font-extrabold text-cyan-700 leading-tight">
      {label}
    </div>
  );
};


/* -------------------- Rütbeler ve hesaplama -------------------- */
const RANKS = [
  { name: "Acemi",             min: -Infinity, next: 400 },
  { name: "Yarışmacı",         min: 400,       next: 800 },
  { name: "Bilgi Meraklısı",   min: 800,       next: 1400 },
  { name: "Zihin Avcısı",      min: 1400,      next: 2000 },
  { name: "Akıl Ustası",       min: 2000,      next: 2800 },
  { name: "Beyin Fırtınası",   min: 2800,      next: 3600 },
  { name: "Bilgi Şampiyonu",   min: 3600,      next: 4600 },
  { name: "Ustalık Seviyesi",  min: 4600,      next: 5400 },
  { name: "Efsane Yarışmacı",   min: 5400,      next: 6400 },
  { name: "Bilgelik Ustası",   min: 6400,      next: 7400 },
  { name: "Strateji Üstadı",   min: 7400,      next: 8400 },
  { name: "Zeka Fırtınası",    min: 8400,      next: 9600 },
  { name: "Usta Taktisyen",    min: 9600,      next: 10800 },
  { name: "Altın Beyin",       min: 10800,     next: 12000 },
  { name: "Usta Zihin",        min: 12000,     next: 13400 },
  { name: "Üst Düzey Yarışmacı",min: 13400,    next: 14600 },
  { name: "Bilgelik Şampiyonu",min: 14600,     next: 15800 },
  { name: "Efsanevi Zihin",    min: 15800,     next: 17200 },
  { name: "Zirve Ustası",      min: 17200,     next: 18600 },
  { name: "Ölümsüz Bilge",     min: 18600,     next: Infinity },
];

function getRankInfo(points = 0) {
  let rank = RANKS[RANKS.length - 1];
  for (const r of RANKS) {
    if (points < r.next) { rank = r; break; }
  }

  const idx = RANKS.findIndex(r => r.name === rank.name);
  const nextRank = rank.next === Infinity ? null : (RANKS[idx + 1]?.name || null);

  const baseline = Math.max(0, Number.isFinite(rank.min) ? rank.min : 0);
  const next = rank.next;
  if (next === Infinity) {
    return { name: rank.name, pct: 100, toNext: null, nextName: null };
  }
  const denom = Math.max(1, next - baseline);
  const num = Math.max(0, Math.min(points - baseline, denom));
  const pct = Math.round((num / denom) * 100);
  const toNext = Math.max(0, next - Math.max(points, baseline));
  return { name: rank.name, pct, toNext, nextName: nextRank };
}

/* Rütbeye göre bar rengi (gruplandırılmış) */
const barFillClassByRank = (rankName = "") => {
  const i = RANKS.findIndex(r => r.name === rankName);
  if (i <= 1)  return "bg-gradient-to-r from-gray-400 to-gray-500";      // Acemi, Yarışmacı
  if (i <= 5)  return "bg-gradient-to-r from-emerald-500 to-green-500";   // orta–alt
  if (i <= 9)  return "bg-gradient-to-r from-cyan-500 to-blue-500";       // orta
  if (i <= 13) return "bg-gradient-to-r from-indigo-500 to-violet-500";   // orta–üst
  if (i <= 17) return "bg-gradient-to-r from-fuchsia-500 to-pink-500";    // üst
  return "bg-gradient-to-r from-amber-500 to-orange-500";                 // en üstler
};

// --- ProgressBar (animated) ---
const ProgressBar = ({ pct, colorClass }) => {
  const [w, setW] = React.useState(0);

 
  // ilk render ve her pct değişiminde yumuşak geçiş
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      const clamped = Math.max(0, Math.min(100, pct));
      setW(clamped);
    });
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-700 ease-out`}
        style={{ width: `${w}%` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(w)}
      />
    </div>
  );
};

/* === RANK ROW (büyütülmüş başlık) === */
const RankRow = ({ points, nf }) => {
  const info = getRankInfo(points);
  const fillCls = barFillClassByRank(info.name);

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-extrabold text-cyan-700">{info.name}</span>
        <span
          className="text-[11px] text-gray-600"
          title={
            info.toNext == null
              ? "En üst rütbe"
              : `Sonraki rütbe: ${info.nextName}`
          }
        >
          {info.toNext == null ? "En üst rütbe" : `${nf.format(info.toNext)} puan kaldı`}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar pct={info.pct} colorClass={fillCls} />
      </div>
    </div>
  );
};



/* === SPEEDTIER: parse helper START === */
// Backend'den gelen farklı şemaları tek formata çevirir
const parseSpeedTier = (payload) => {
  // response sarmalayıcıları: {success,..., data:{...}} / {result:{...}} / doğrudan {...}
  const src = payload?.data ?? payload?.result ?? payload ?? null;
  if (!src) return null;

  // tier adını normalize et (Âlim/âlim/ALIM -> 'alim')
  const rawTier = src.tier ?? src.tier_name ?? src.level ?? src.name ?? null;
  const tier = rawTier ? safeNormalize(String(rawTier).toLowerCase()) : null;

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // süre alanları farklı isimlerle gelebilir; hepsini toparlıyoruz
  const avg_spent_seconds =
    num(src.avg_spent_seconds ?? src.avg_spent ?? src.avg_seconds ?? src.avg ?? src.average_spent_seconds);

  const avg_earned_seconds =
    num(src.avg_earned_seconds ?? src.avg_earned ?? src.average_earned_seconds);

  return tier ? { tier, avg_spent_seconds, avg_earned_seconds } : null;


  
};
/* === SPEEDTIER: parse helper END === */



const StatCard = ({ label, children, footer }) => (
  <div className="flex-1 min-w-[45%] sm:min-w-[30%] bg-white/80 rounded-2xl shadow p-3 sm:p-4 text-center h-[80px] sm:h-[91px] flex flex-col items-center justify-center">
    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">
      {children}
    </div>
    {footer ? (
      <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
        {footer}
      </div>
    ) : null}
  </div>
);


/* -------------------- Puanlarım Modal (başlık bazlı) -------------------- */
function PointsTable({ show, onClose, loading, error, data }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-4 relative">
        <button
  className="absolute top-2 right-3 text-gray-400 hover:text-red-500"
  onClick={onClose}
  title="Kapat"
>
  <CloseIcon className="w-6 h-6" />
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
                    D/C
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
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

    // Düello davet sayacı
  const [duelloUnread, setDuelloUnread] = useState(0);


  // Toast (seri bonus bildirimi)
const [toast, setToast] = useState(null); // { msg, type: 'success' | 'error' }
const toastTimeoutRef = useRef(null);
const inviteIdsRef = useRef(new Set());
// İlk poll’de catchup yaparken tost göstermemek için
const firstPollDoneRef = useRef(false);


const showToast = useCallback((msg, type = "success") => {
  setToast({ msg, type });
  if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
}, []);

  // Zil açılır menü durumu + dışarı tık/ESC ile kapatma
const [bellOpen, setBellOpen] = useState(false);
const bellWrapRef = useRef(null);

useEffect(() => {
  const onDoc = (e) => {
    if (!bellWrapRef.current) return;
    if (!bellWrapRef.current.contains(e.target)) setBellOpen(false);
  };
  const onEsc = (e) => { if (e.key === "Escape") setBellOpen(false); };
  document.addEventListener("click", onDoc);
  document.addEventListener("keydown", onEsc);
  return () => {
    document.removeEventListener("click", onDoc);
    document.removeEventListener("keydown", onEsc);
  };
}, []);

  

  // açılışta önceki değeri yükle
useEffect(() => {
  const raw = localStorage.getItem("felox_duello_unread");
  if (raw) setDuelloUnread(Math.min(99, Number(raw) || 0));
}, []);


// her değişimde kaydet
useEffect(() => {
  localStorage.setItem("felox_duello_unread", String(duelloUnread));
}, [duelloUnread]);

  const [, setLastDuelloInvite] = useState(null); // isteğe bağlı: son davet bilgisi
const clearDuelloUnread = useCallback(() => setDuelloUnread(0), []);
// Bekleyen davet sayısını (pending) sunucudan say
// Bekleyen davet sayısını (pending) sunucudan say — farklı alan adlarına dayanıklı
const countPendingInvites = useCallback(async () => {
  if (!user?.id) return;
  try {
    const r = await fetch(`${apiUrl}/api/duello/inbox/${user.id}`);
    const d = await r.json();

    const list = Array.isArray(d?.inbox) ? d.inbox
               : Array.isArray(d?.invites) ? d.invites
               : Array.isArray(d) ? d
               : [];

    // "pending" sayımı
    const PENDING_STATES = new Set(["pending", "new", "sent", "waiting", "invited", "open"]);
    const CLOSED_STATES  = new Set(["accepted", "rejected", "cancelled", "canceled", "expired", "timeout", "closed", "done"]);

    const pending = list.filter((x) => {
      const stRaw = String(x?.status ?? x?.state ?? x?.invite_status ?? "").toLowerCase().trim();
      const responded =
        x?.responded_at ?? x?.respondedAt ??
        x?.accepted_at  ?? x?.rejected_at ?? x?.cancelled_at ?? x?.canceled_at ?? null;

      if (stRaw) {
        if (CLOSED_STATES.has(stRaw)) return false;
        if (PENDING_STATES.has(stRaw)) return true;
      }
      return responded == null;
    });

    // === YENİ: “yeni gelen” algılama (polling tarafında tost göstermek için)
    const idOf = (x) => x?.id ?? x?.invite_id ?? x?.duello_id ?? x?._id ?? null;
    let newOnes = 0;
    for (const it of pending) {
      const id = idOf(it);
      if (id != null && !inviteIdsRef.current.has(id)) {
        inviteIdsRef.current.add(id);
        newOnes++;
      }
    }

    setDuelloUnread(Math.min(99, pending.length));

    // İlk poll’de catchup yaparken tost gösterme; sonrakilerde yeni varsa göster
    if (
      firstPollDoneRef.current &&
      newOnes > 0 &&
      !location?.pathname?.startsWith?.("/duello")
    ) {
      try { navigator?.vibrate?.([40, 40, 40]); } catch {}
      showToast(
        newOnes === 1 ? "Yeni düello davetin var! ⚔️" : `${newOnes} yeni düello davetin var! ⚔️`,
        "success"
      );
    }
    firstPollDoneRef.current = true;

    console.info("[Duel] inbox:", { total: list.length, pending: pending.length, newOnes });
  } catch (e) {
    console.warn("[Duel] inbox fetch failed", e);
  }
}, [user?.id, apiUrl, showToast, location?.pathname]);


// Düello davet sayısı fallback — 12 sn'de bir tazele (SSE gelmezse)
useEffect(() => {
  if (!user?.id) return;
  // ilk yüklemede bir kez çek
  countPendingInvites();
  const t = setInterval(countPendingInvites, 12000);
  return () => clearInterval(t);
}, [user?.id, countPendingInvites]);


// Duello sayfasına girilince rozet SIFIRLAMA — tek gerçek kaynak burası
useEffect(() => {
  if (location.pathname.startsWith("/duello")) {
    clearDuelloUnread();
  }
}, [location.pathname, clearDuelloUnread]);

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
  // Puan artışı mini animasyonu
const [scoreFloat, setScoreFloat] = useState(null); // number | null


  



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

  // Hız tespiti
  const [speedTier, setSpeedTier] = useState(null); // {tier, avg_earned_seconds, avg_spent_seconds}

  // Günün Yarışması
  const [dailyStatus, setDailyStatus] = useState(null); // {success, day_key, finished, index, size, question?}
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [dailyPoints, setDailyPoints] = useState(0);

  // Günlük Puan Durumu (Leaderboard)
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);

  // ↓↓↓ YENİ
const [dailyChampions, setDailyChampions] = useState([]);

  // === IMPDAY: state START ===
  const [impDay, setImpDay] = useState(null);          // {prettyDate, daytitle, description}
  const [impDayLoading, setImpDayLoading] = useState(false);
  // === IMPDAY: state END ===

  // === FEL0X: BOOKS STATE START ===
  const [books, setBooks] = useState(0);
  const [spending, setSpending] = useState(false);
  const [revealed, setRevealed] = useState({ qid: null, answer: "" }); // {qid, 'evet'|'hayır'|'bilmem'}

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`${apiUrl}/api/user/${user.id}/books`);
      const d = await r.json();
      if (d?.success) setBooks(d.books || 0);
    } catch {}
  }, [user]);


  // Aktif soru (solve/dailySolve)
  const getActiveQuestion = () => {
    if (mode === "dailySolve" && dailyQuestion) return dailyQuestion;
    if (mode === "solve" && questions.length > 0) return questions[currentIdx];
    return null;
  };

  // “Kitap İpucu”
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
  useEffect(() => { if (user?.id) fetchBooks(); }, [user, fetchBooks]);

  // Soru/değişimlerde ipucunu sıfırla
  useEffect(() => { setRevealed({ qid: null, answer: "" }); }, [currentIdx, mode, dailyQuestion]);

  // Çerçevesiz, tema ile uyumlu sayaç
const BookCountPill = ({ count = 0, showLabel = false }) => {
  const n = Number(count) || 0;
  const has = n > 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold select-none
                  ${has ? "text-emerald-700 opacity-90" : "text-gray-500 opacity-80"} 
                  hover:opacity-100`}
      title={`Kitap: ${n}`}
    >
      <BookIcon className="w-4 h-4 -mt-[1px]" />
      {showLabel && <span className="hidden sm:inline">Kitap</span>}
      <span className="tabular-nums text-[13px] font-extrabold">{n}</span>
    </span>
  );
};



  // === FEL0X: BOOKS STATE END ===

  // Kademeli Yarış
  const [ladderActive, setLadderActive] = useState(false);
  const [ladderLevel, setLadderLevel] = useState(1); // 1..10




  const [ladderAttempts, setLadderAttempts] = useState(0);
  const [ladderCorrect, setLadderCorrect] = useState(0);
  const [showLevelUpPrompt, setShowLevelUpPrompt] = useState(false);
  const [loadingLevelQuestions, setLoadingLevelQuestions] = useState(false);

  // Rekor (erişilen en yüksek) seviye
const [ladderBest, setLadderBest] = useState(0);

// En iyi seviyeyi backend'den oku
const fetchLadderBest = useCallback(async () => {
  if (!user?.id) return;
  try {
    const r = await fetch(`${apiUrl}/api/user/${user.id}/ladder-best-level`);
    const d = await r.json();
    if (d?.success && Number.isFinite(Number(d.best_level))) {
      setLadderBest(Number(d.best_level));
    }
  } catch {}
}, [user?.id]);


  // Bu seviyedeki toplam (tüm zamanlar) deneme/doğru
  const [, setLadderTotals] = useState({ attempted: 0, correct: 0 });



  // TEŞEKKÜRLER ekranı için alıntı
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // --- Kategoriler ---
  const [surveys, setSurveys] = useState([]);
  const [showSurveyLeaderboard, setShowSurveyLeaderboard] = useState(false);
  const [surveyLeaderboard, setSurveyLeaderboard] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  // ---- NEW: Survey başlığı için meta & önbellekler ----
  const surveysCacheRef = useRef([]);                     // [{id,title,...}]
  const [surveyTitleById, setSurveyTitleById] = useState({}); // {survey_id: title}
  const questionSurveyMapRef = useRef({});                // {question_id: survey_id}
  const surveyQuestionsCacheRef = useRef({});             // {survey_id: Set(question_ids)}
  const [dailySurveyTitle, setDailySurveyTitle] = useState("");

  // Güvenli setState için
  const feedbackTimeoutRef = useRef(null);
  const isMountedRef = useRef(false);
  useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); // ← eklendi
  };
}, []);


  useEffect(() => {
    if (!feedbackActive) return;
    const safety = setTimeout(() => {
      if (!isMountedRef.current) return;
      setFeedbackActive(false);
      setShowStars(false);
    }, 5000);
    return () => clearTimeout(safety);
  }, [feedbackActive]);

  // === SPEEDTIER: fetch helper (reusable) START ===
const fetchSpeedTier = useCallback(async () => {
  if (!user?.id) return;
  try {
    const r = await fetch(`${apiUrl}/api/user/${user.id}/speed-tier?ts=${Date.now()}`);
    const d = await r.json();
    if (!isMountedRef.current) return;
    const parsed = parseSpeedTier(d);
    setSpeedTier(parsed); // {tier, avg_spent_seconds, avg_earned_seconds} | null
  } catch {
    if (isMountedRef.current) setSpeedTier(null);
  }
}, [user?.id]);
// === SPEEDTIER: fetch helper (reusable) END ===


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
    const s = safeNormalize(String(user?.cinsiyet ?? "").toLowerCase().trim());

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


// Düello SSE — davetleri canlı dinle
useEffect(() => {
  if (!user?.id) return;

  const es = openDuelloEventStream({
    userId: user.id,
    apiUrl,
    onInvite: (payload) => {
      const id = payload?.id || payload?.invite_id || payload?.duello_id;
      if (id) {
        if (inviteIdsRef.current.has(id)) return; // aynı daveti iki kez sayma
        inviteIdsRef.current.add(id);
      }

      // Sayfa /duello değilse sunucudan gerçek pending sayısını çek
if (!location?.pathname?.startsWith?.("/duello")) {
  countPendingInvites();
}


      setLastDuelloInvite(payload || null);
      try { navigator?.vibrate?.([40, 40, 40]); } catch {}
      showToast("Yeni düello davetin var! ⚔️", "success");
    },
    onPing: () => {},
    onError: () => {},
  });

  return () => {
    try { es?.close?.(); } catch {}
  };
  // location.pathname/dependencies: onInvite içindeki kullanımları stabilize etmek için ekledim
}, [user?.id, location?.pathname, showToast, clearDuelloUnread, countPendingInvites]);




  /* -------------------- Manifesti yükle -------------------- */
  useEffect(() => {
    fetch("/avatars/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAvatarManifest(d))
      .catch(() => {});
  }, []);

  /* -------- Onaylı kategorileri ve başlık haritasını önden al -------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const r = await fetch(`${apiUrl}/api/user/approved-surveys`);
        const d = await r.json();
        if (!isMountedRef.current) return;
        if (d?.success && Array.isArray(d.surveys)) {
          surveysCacheRef.current = d.surveys;
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

  // ---- Soru->Anket önbelleği kurucu ----
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
  if (surveyQuestionsCacheRef.current[surveyId]) return;

  const urls = [
    `${apiUrl}/api/surveys/${surveyId}/questions`, // yeni uç
    `${apiUrl}/api/surveys/${surveyId}/details`,   // eski uç (fallback)
  ];

  let qs = null;
  let titleFromDetails = null;

  for (const u of urls) {
    try {
      const r = await fetch(u);
      const d = await r.json();
      if (!isMountedRef.current) return;

      // /questions -> { success, questions:[...] }
      if (u.endsWith("/questions") && d?.success && Array.isArray(d.questions)) {
        qs = d.questions;
        break;
      }

      // /details -> { success, survey:{title}, questions:[...] }
      if (u.endsWith("/details") && d?.success && Array.isArray(d.questions)) {
        qs = d.questions;
        titleFromDetails = d?.survey?.title || null;
        break;
      }
    } catch {
      // bir sonrakini dene
    }
  }

  if (!Array.isArray(qs)) return;

  // Soru-anket önbelleklerini besle
  indexQuestionsIntoCaches(qs);

  // /details'tan geldiyse başlık haritasını da güncelle
  if (titleFromDetails) {
    setSurveyTitleById((prev) => ({ ...prev, [surveyId]: titleFromDetails }));
    const rest = (surveysCacheRef.current || []).filter(
      (s) => String(s.id) !== String(surveyId)
    );
    surveysCacheRef.current = [...rest, { id: Number(surveyId), title: titleFromDetails }];
  }
};


  // Gerekirse sorunun anketini bul
  const resolveSurveyIdForQuestion = async (questionId) => {
    if (!questionId) return null;
    if (questionSurveyMapRef.current[questionId])
      return questionSurveyMapRef.current[questionId];

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

   // === SPEEDTIER: fetch (on mount) ===
fetchSpeedTier();


    // Avatar için en iyi başlık ve yüzdesi
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

    // Rekor seviye
fetchLadderBest();
  }, [user]);

  // thankyou moduna her girişte yeni söz çek
  useEffect(() => {
    if (mode === "thankyou") fetchRandomQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const refreshLadderTotals = useCallback(async () => {
  if (!user?.id || !ladderActive) return;
  try {
    const r = await fetch(
  `${apiUrl}/api/user/${user.id}/kademeli-progress?point=${ladderLevel}&level=${ladderLevel}`
);

    const d = await r.json();
    if (d?.success) {
      setLadderTotals({ attempted: d.attempted || 0, correct: d.correct || 0 });
    }
  } catch {}
}, [user?.id, ladderActive, ladderLevel]);

// Kademeli mod açıkken; seviye/indeks değiştikçe toplam özeti tazele
useEffect(() => {
  if (!ladderActive) return;
  refreshLadderTotals();
}, [ladderActive, ladderLevel, currentIdx, refreshLadderTotals]);


  // === IMPDAY: auto fetch (use day_key) START ===
  useEffect(() => {
    if (mode !== "today") return;
    const dk = dailyStatus?.day_key;
    if (dk) fetchImportantDay(dk);
    else fetchImportantDay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dailyStatus?.day_key]);

// Günün yarışması bittiğinde +2 kitap ver
useEffect(() => {
   if (dailyStatus?.finished) {
     // bitişten sonra sunucudaki güncel kitap sayısını çek
     fetchBooks();
   }
 }, [dailyStatus?.finished, fetchBooks]);


  // === IMPDAY: auto fetch (use day_key) END ===

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

const fetchDailyChampions = async () => {
  try {
    const r = await fetch(`${apiUrl}/api/daily/champions`);
    const d = await r.json();
    if (!isMountedRef.current) return;
    if (d?.success && Array.isArray(d.champions)) {
      setDailyChampions(d.champions.filter(Boolean));
    } else {
      setDailyChampions([]);
    }
  } catch {
    if (!isMountedRef.current) return;
    setDailyChampions([]);
  }
};


  // === IMPDAY: fetch (robust) START ===
  async function fetchImportantDay(dayKeyIn) {
    setImpDayLoading(true);
    const normalize = (v) => {
      if (!v) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const d = new Date(v);
      if (isNaN(d)) return null;
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
    };

    try {
      const dayKey = normalize(dayKeyIn);
      const urls = dayKey
        ? [
            `${apiUrl}/api/important-day?day=${encodeURIComponent(dayKey)}`,
            `${apiUrl}/api/important-day`,
          ]
        : [`${apiUrl}/api/important-day`];

      let data = null;
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const j = await r.json();
          if (j?.success) { data = j; break; }
        } catch {}
      }

      const key =
        dayKey ||
        data?.day_key ||
        new Date().toISOString().slice(0, 10);

      const prettyDate = new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "long",
      }).format(new Date(key));

      const rec = data?.record || null;
      const daytitle = (rec?.daytitle ?? rec?.day_title ?? rec?.title ?? "").trim();
      const description = (rec?.description ?? rec?.desc ?? rec?.content ?? "").trim();

      setImpDay({ prettyDate, daytitle, description });
    } catch (e) {
      const prettyDate = new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "long",
      }).format(new Date());
      setImpDay({ prettyDate, daytitle: "", description: "" });
    } finally {
      setImpDayLoading(false);
    }
  }
  // === IMPDAY: fetch (robust) END ===

  /* -------------------- Kategoriler -------------------- */
  const fetchSurveys = () => {
  const urls = [
    `${apiUrl}/api/user/approved-surveys`,
    `${apiUrl}/api/approved-surveys`,
    `${apiUrl}/api/categories/approved`,
  ];

  (async () => {
    let payload = null;
    for (const u of urls) {
      try {
        const res = await fetch(u);
        const d = await res.json();
        if (d?.success && Array.isArray(d.surveys)) {
          payload = d.surveys;
          break;
        }
      } catch { /* bir sonrakini dene */ }
    }

    if (!isMountedRef.current) return;

    if (Array.isArray(payload)) {
  // 0 sorulu kategorileri gizle (çeşitli alan adlarına dayanıklı)
  const onlyWithQuestions = payload.filter((s) => {
    const count = Number(
      s?.question_count ??
      s?.questions_count ??
      s?.total_questions ??
      s?.questionCount ??
      s?.count ??
      0
    );
    const boolHas = s?.has_questions === true || s?.hasQuestions === true;
    return count > 0 || boolHas; // en az bir tanesi true olsun
  });

  setSurveys(onlyWithQuestions);

  // title haritasını güncelle + cache’i doldur (filtrelenmiş liste ile)
  const map = {};
  onlyWithQuestions.forEach((s) => (map[s.id] = s.title));
  setSurveyTitleById((prev) => ({ ...prev, ...map }));
  surveysCacheRef.current = onlyWithQuestions;
} else {
  setSurveys([]);
  surveysCacheRef.current = [];
}

  })();
};


  const fetchQuestions = (surveyId) => {
  (async () => {
    const urls = [
      `${apiUrl}/api/surveys/${surveyId}/questions`, // yeni uç
      `${apiUrl}/api/surveys/${surveyId}/details`,   // eski uç (fallback)
    ];

    let qs = null;

    for (const u of urls) {
      try {
        const res = await fetch(u);
        const d = await res.json();

        // /questions tipik cevap
        if (u.endsWith("/questions") && d?.success && Array.isArray(d.questions)) {
          qs = d.questions;
          break;
        }

        // /details fallback (bazı backend'lerde farklı alan adları olabiliyor)
        if (u.endsWith("/details") && d?.success && Array.isArray(d.questions)) {
          qs = d.questions;

          // başlık haritasını /details'tan güncelle (varsa)
          const t = d?.survey?.title;
          if (t) {
            setSurveyTitleById((prev) => ({ ...prev, [surveyId]: t }));
            const rest = (surveysCacheRef.current || []).filter(
              (s) => String(s.id) !== String(surveyId)
            );
            surveysCacheRef.current = [...rest, { id: Number(surveyId), title: t }];
          }
          break;
        }
      } catch {
        // bir sonrakini dene
      }
    }

    if (!isMountedRef.current) return;

    if (Array.isArray(qs)) {
      // 1) cache
      indexQuestionsIntoCaches(qs);

      // 2) önce filtered'ı oluştur
      const filtered = qs.filter((q) => !correctAnswered.includes(q.id));

      // 3) hiç yeni soru yoksa kullanıcıya net mesaj göster ve listede kal
      if (filtered.length === 0) {
        window.alert("Bu kategoride çözecek yeni soru kalmadı.");
        // listede kal, herhangi bir moda geçmeyelim
        return;
      }

      // 4) sonra kullan
      shuffleInPlace(filtered);
      setQuestions(filtered);
      setCurrentIdx(0);
      setMode("solve");
      setLadderActive(false);
      setDailyActive(false);
    } else {
      // endpoint hiç soru döndürmediyse kullanıcıyı bilgilendir
      window.alert("Bu kategoride soru bulunamadı (geçici bir durum olabilir).");
    }
  })();
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
  // 0) Hazırda onaylı kategori listesi varsa onu kullan; yoksa çek
  let list =
    (surveysCacheRef.current && surveysCacheRef.current.length
      ? surveysCacheRef.current
      : []);

  if (list.length === 0) {
    try {
      const r = await fetch(`${apiUrl}/api/user/approved-surveys`);
      const d = await r.json();
      if (d?.surveys) {
        list = d.surveys;
        const map = {};
        list.forEach((s) => (map[s.id] = s.title));
        setSurveyTitleById((prev) => ({ ...prev, ...map }));
        surveysCacheRef.current = list;
      }
    } catch {}
  }

  // 1) 0 sorulu kategorileri baştan ele (çeşitli alan adlarına dayanıklı)
  list = (list || []).filter((s) => {
    const count = Number(
      s?.question_count ??
      s?.questions_count ??
      s?.total_questions ??
      s?.questionCount ??
      s?.count ??
      0
    );
    const boolHas = s?.has_questions === true || s?.hasQuestions === true;
    return count > 0 || boolHas;
  });

  if (list.length === 0) {
    // Hiç soru yoksa kibar fallback
    setQuestions([]);
    setCurrentIdx(0);
    setMode("thankyou");
    setLadderActive(false);
    setDailyActive(false);
    return;
  }

  // 2) Performans için rastgele N kategori seç (N=6). İstersen 8-10 yapabilirsin.
  const pickRandom = (arr, n) => {
    const cp = [...arr];
    for (let i = cp.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cp[i], cp[j]] = [cp[j], cp[i]];
    }
    return cp.slice(0, n);
  };
  const chosen = pickRandom(list, Math.min(16, list.length));

  // 3) Tek kategori için hızlı getirici (questions -> details fallback)
  const fetchSurveyQuestions = async (survey) => {
    const urls = [
      `${apiUrl}/api/surveys/${survey.id}/questions`,
      `${apiUrl}/api/surveys/${survey.id}/details`,
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u);
        const d = await r.json();

        // /questions cevabı
        if (u.endsWith("/questions") && d?.success && Array.isArray(d.questions)) {
          return d.questions;
        }

        // /details cevabı + başlık haritası güncelle
        if (u.endsWith("/details") && d?.success && Array.isArray(d.questions)) {
          const t = d?.survey?.title;
          if (t) {
            setSurveyTitleById((prev) => ({ ...prev, [survey.id]: t }));
            const rest = (surveysCacheRef.current || []).filter(
              (s) => String(s.id) !== String(survey.id)
            );
            surveysCacheRef.current = [...rest, { id: Number(survey.id), title: t }];
          }
          return d.questions;
        }
      } catch {
        // bir sonrakini dene
      }
    }
    return [];
  };

  // 4) Kategorileri PARALEL indir
  const results = await Promise.all(chosen.map(fetchSurveyQuestions));
  const allQuestions = results.flat().filter(Boolean);

  // 5) Önbellek + doğru bildiklerini ele + karıştır + başlat
  indexQuestionsIntoCaches(allQuestions);
  const filteredQs = allQuestions.filter((q) => !correctAnswered.includes(q.id));
  shuffleInPlace(filteredQs);

  setQuestions(filteredQs);
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
  `${apiUrl}/api/user/${user.id}/kademeli-questions?point=${level}&level=${level}&limit=20`

);

      const d = await r.json();
      const all = Array.isArray(d?.questions) ? d.questions : [];
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
  const first = 1;

  // 1) Backend’de bu seviye için yeni oturum başlat
  try {
    const r = await fetch(`${apiUrl}/api/ladder/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, level: first }),
    });
    const d = await r.json();
    if (!d?.success) {
      window.alert(d?.error || "Kademeli oturum başlatılamadı.");
      return;
    }
  } catch {
    window.alert("Kademeli oturum başlatılamadı (bağlantı hatası).");
    return;
  }

  // 2) Lokal sayaçları sıfırla ve soruları yükle
  setLadderLevel(first);
  setLadderAttempts(0);
  setLadderCorrect(0);
  await loadLevelQuestions(first);
};




  const checkLadderProgress = async () => {
    try {
      const r = await fetch(
  `${apiUrl}/api/user/${user.id}/kademeli-next?point=${ladderLevel}&level=${ladderLevel}`
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

// Hemen şimdi seviye atlayabiliyor muyum? (parti bitmeden kontrol)
const peekLadderProgress = useCallback(async () => {
  if (!user?.id) return null;
  try {
    const r = await fetch(
  `${apiUrl}/api/user/${user.id}/kademeli-next?point=${ladderLevel}&level=${ladderLevel}`
);

    const d = await r.json();
    if (d?.success && d.can_level_up) {
      return d.status === "genius" ? "genius" : "ok";
    }
  } catch {}
  return null;
}, [user?.id, ladderLevel]);



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
          fetchDailyLeaderboard(d.day_key);
          fetchImportantDay(d.day_key);
        }
      } else {
        setDailyStatus(null);
      }
      fetchDailyChampions();

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

      const hasQ =
        (mode === "dailySolve" && !!dailyQuestion) ||
        (mode === "solve" && !!questions[currentIdx]);

      if (hasQ) handleAnswer("bilmem");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timerActive]);
  // === FEL0X: TIMER BLOCK END ===






  // Son 5 saniyede kısa titreşim (destekleyen cihazlarda)
useEffect(() => {
  if (!timerActive) return;
  if (timeLeft > 0 && timeLeft <= 5) {
    try { navigator?.vibrate?.(50); } catch {}
  }
}, [timeLeft, timerActive]);


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
    await fetchSpeedTier();
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
  // bitirince backend ödül verdiyse sayaçta hemen göster
  if (Number(d?.awarded_books) > 0) {
    setBooks((prev) => prev + Number(d.awarded_books));
  }

// Seri bonus (önce backend'in gerçek uyguladığı değeri kullan)
const bonusApplied = Number(d?.bonus_points ?? 0);
if (d.is_correct === 1 && bonusApplied > 0) {
  showToast(`Seri bonusu: +${bonusApplied} puan 🎉`, "success");
} else if (d.is_correct === 1) {
  // Geri uyumluluk: status bilgisinden tahmini göster
  const per = Number(dailyStatus?.today_bonus_per_correct ?? 0);
  if (per > 0) showToast(`Seri bonusu: +${per} puan 🎉`, "success");
}

      // (YENİ) Puanı ekranda anında güncelle
      const basePoint = Number(q.point) || 0;
      let delta = 0;
      if (cevap !== "bilmem") {
        // doğru: +point + bonus; yanlış: -point; bilmem: 0
        delta = d.is_correct === 1
          ? basePoint + Number(d?.bonus_points || 0)
          : -basePoint;
      }
      setDailyPoints((prev) => prev + delta);

if (delta !== 0) {
  setScoreFloat(delta);
  setTimeout(() => setScoreFloat(null), 1000);
}



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
// --------- NORMAL / KADEMELİ ---------
const endpoint = ladderActive
  ? `${apiUrl}/api/ladder/answer`
  : `${apiUrl}/api/answers`;

fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: user.id,
    question_id: q.id,
    answer: cevap,
    time_left_seconds: timeLeft,
    max_time_seconds: 24,
    // ⬇️ EKLEDİK: kademeli moddaysak seviyeyi de gönder
    ...(ladderActive ? { point: ladderLevel, level: ladderLevel } : {}),
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
          refreshUserStats(); // hız/puan anında tazelensin
          // UI: anlık puan pop (normal/kademeli)
let deltaPop = 0;
if (cevap !== "bilmem") {
  const p = Number(q.point) || 0;
  deltaPop = d.is_correct === 1 ? p : -p;
}
if (deltaPop !== 0) {
  setScoreFloat(deltaPop);
  setTimeout(() => setScoreFloat(null), 1000);
}



          if (ladderActive) {
  // backend’den gerçek sayaçlar geliyorsa onları kullan
  if (typeof d.attempts === "number") setLadderAttempts(d.attempts);
  else if (cevap !== "bilmem") setLadderAttempts((prev) => prev + 1);

  if (typeof d.correct === "number") setLadderCorrect(d.correct);
  else if (cevap !== "bilmem" && d.is_correct === 1)
    setLadderCorrect((prev) => prev + 1);
}


          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
feedbackTimeoutRef.current = setTimeout(async () => {
  if (!isMountedRef.current) return;
  setFeedbackActive(false);
  setShowStars(false);

  if (d.is_correct === 1) {
    setCorrectAnswered((prev) => [...prev, q.id]);
  }

  // Kademeli: %80 şartı → önce backend’e sor, yoksa yerelde karar ver
if (ladderActive) {
  await refreshLadderTotals();

  // 1) Sunucudan sor
  const ready = await peekLadderProgress();

  // 2) En güncel yerel sayaçları (bilmem hariç) hesapla
  const nextAttempts =
    typeof d.attempts === "number"
      ? d.attempts
      : (cevap !== "bilmem" ? ladderAttempts + 1 : ladderAttempts);

  const nextCorrect =
    typeof d.correct === "number"
      ? d.correct
      : (cevap !== "bilmem" && d.is_correct === 1 ? ladderCorrect + 1 : ladderCorrect);

  const nextRate = nextAttempts > 0 ? Math.round((nextCorrect * 100) / nextAttempts) : 0;

  // 3) Karar
  if (ready === "genius") {
    await fetchLadderBest();
    setMode("genius");
    setLadderActive(false);
    return;
  } else if (ready === "ok") {
    await fetchLadderBest();
    setShowLevelUpPrompt(true);
    setMode("panel");
    return;
  } else if (nextAttempts >= 10 && nextRate >= 80) {
    // ← YEREL YEDEK: backend sinyal vermezse yine de sor
    setShowLevelUpPrompt(true);
    setMode("panel");
    return;
  }
}




  if (currentIdx < questions.length - 1) {
    setCurrentIdx((prev) => prev + 1);
  } else if (ladderActive) {
    await checkLadderProgress();
  } else {
    setMode("thankyou");
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
    const r = await fetch(`${apiUrl}/api/daily/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        question_id: dailyQuestion.id,
        time_left_seconds: timeLeft,
        max_time_seconds: 24,
      }),
    });

    // yanıtı oku ve varsa ödülü ekle
    const d = await r.json();
    if (Number(d?.awarded_books) > 0) {
      setBooks((prev) => prev + Number(d.awarded_books));
    }
  } catch {}
  await refreshUserStats();
  await fetchDailyStatus();
  setDailyActive(false);
  setMode("today");
};

  // === FEL0X: ANSWER HANDLERS END ===

  /* -------------------- Çıkış -------------------- */
  const handleLogout = async () => {
  try {
    await removeFeloxUser();
   localStorage.removeItem("felox_duello_unread");
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
      phrase = `sen ${titleForSentence} konusunda çok iyisin.`;
    } else {
      phrase = `sen ${titleForSentence} konusunda müthişsin.`;
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

// === FEL0X: LOCALE & DAILY RANK MEMO START ===
const nf = useMemo(() => new Intl.NumberFormat("tr-TR"), []);
const dailyRank = useMemo(() => {
  const i = (dailyLeaderboard || []).findIndex(u => String(u?.id) === String(user?.id));
  return i === -1 ? null : i + 1;
}, [dailyLeaderboard, user?.id]);
// === FEL0X: LOCALE & DAILY RANK MEMO END ===


// Kademeli oturum başarı yüzdesi (yalnızca bu seans, bu seviye için)
const ladderSessionRate = useMemo(() => {
  return ladderAttempts > 0 ? Math.round((ladderCorrect * 100) / ladderAttempts) : 0;
}, [ladderAttempts, ladderCorrect]);




  useEffect(() => {
  if (!user?.id) return;
  if (mode === "panel" || mode === "today") {
    fetchSpeedTier();
  }
}, [mode, user?.id, fetchSpeedTier]);


  // === FEL0X: LEADERBOARD PARALLEL PREFETCH START ===
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const keys = PERIODS.map(p => p.key);
        const all = await Promise.all(
          keys.map(k =>
            fetch(`${apiUrl}/api/leaderboard?period=${k}`).then(r => r.json())
          )
        );
        if (cancelled) return;
        const next = {};
        all.forEach((d, idx) => {
          const key = PERIODS[idx].key;
          next[key] = (d.leaderboard || []).filter(u => (u.total_points || 0) > 0);
        });
        setLeaderboards(next);
      } catch {/* sessiz */}
    })();

    return () => { cancelled = true; };
  }, [user?.id]);
  // === FEL0X: LEADERBOARD PARALLEL PREFETCH END ===

  // === FEL0X: ABORTED USER STATS FETCH START ===
  useEffect(() => {
    if (!user?.id) return;
    const ac = new AbortController();

    (async () => {
      try {
        const r = await fetch(`${apiUrl}/api/user/${user.id}/total-points`, { signal: ac.signal });
        const data = await r.json();
        if (data?.success) {
          setTotalPoints(data.totalPoints);
          setAnsweredCount(data.answeredCount);
        }
      } catch (e) { /* Abort ise yok say */ }

      try {
        setTodayRankLoading(true);
        const r2 = await fetch(`${apiUrl}/api/user/${user.id}/rank?period=today`, { signal: ac.signal });
        const d2 = await r2.json();
        setTodayRank(d2?.success ? d2.rank : null);
      } catch (e) {
        setTodayRank(null);
      } finally {
        setTodayRankLoading(false);
      }
    })();

    return () => ac.abort();
  }, [user?.id]);
  // === FEL0X: ABORTED USER STATS FETCH END ===

  /* -------------------- Render -------------------- */
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-700">
        <SpinnerIcon className="w-10 h-10 text-white animate-spin" />
      </div>
    );

  /* -------------------- PANEL -------------------- */
  if (mode === "panel") {
    const Box = ({ title, value, caption }) => (
  <div className="flex-1 min-w-[45%] sm:min-w-[30%] bg-white/80 rounded-2xl shadow p-3 sm:p-4 text-center h-[80px] sm:h-[91px]">
    <div className="text-[11px] sm:text-xs text-gray-500 mb-1">{title}</div>
    <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">{value}</div>
    {caption ? <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{caption}</div> : null}
  </div>
);

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}

    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>

          <div className="flex flex-col items-center gap-2">
            {/* Avatar + Sağ bilgi bloğu (kitap + hız kademesi) */}
            <div className="flex items-center gap-3 mb-2 w-full">
              <div className="rounded-full bg-gray-100 p-1 shadow-md">
                <img
    src={getAvatarUrl()}
    alt="avatar"
    width={128}
    height={128}
    className="w-[88px] h-[88px] sm:w-[128px] sm:h-[128px] rounded-full object-contain"
  />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                 <h1 className="text-2xl font-extrabold text-cyan-700 truncate">
  {user.ad} {user.soyad}
</h1>


                </div>
<div className="mt-0.5">
  <TierHeading tier={speedTier?.tier} />
</div>

                <RankRow points={totalPoints} nf={nf} />


                {/* Hız kademesi + hız bilgisi */}
                {speedTier?.tier ? (
  <div className="mt-1">
    <div className="flex items-center gap-2 flex-wrap justify-start text-left">
      <StatusBadge
  text={`Hızın: ${
    Number.isFinite(Number(speedTier?.avg_spent_seconds))
      ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          .format(Number(speedTier.avg_spent_seconds))
      : '—'
  } sn`}
  color={tierMeta(speedTier.tier).color}
  size="sm"
  variant="ghost"
  className="!text-cyan-700 !px-0 !py-0 !rounded-none"
/>


      <StatusBadge
        text={`Kitap ipucun ${Number(books) || 0}`}
        color="orange"
        size="sm"
        variant="ghost"
        className="!text-cyan-700"
      />
    </div>
  </div>
) : (
  <div className="mt-1">
    <div className="flex items-center gap-2 flex-wrap justify-start text-left">
      <StatusBadge text="Hesaplanıyor…" color="gray" size="sm" variant="ghost" className="!text-cyan-700 !px-0 !py-0 !rounded-none" />
<StatusBadge text="Hızın hesaplanıyor…" color="gray" size="sm" variant="ghost" className="!text-cyan-700 !px-0 !py-0 !rounded-none" />
      <StatusBadge
        text={`Kitap ipucun ${Number(books) || 0}`}
        color="orange"
        size="sm"
        variant="ghost"
        className="!text-cyan-700"
      />
    </div>
  </div>
)}


{typeof dailyStatus?.streak_current === "number" && (
<div className="relative mt-1 text-[13px] text-cyan-700 font-semibold">
  {/* yazı */}
  <span className="inline-block leading-5 pr-16 sm:pr-20">
    {dailyStatus.streak_current} günlük serin var
    {Number(dailyStatus?.today_bonus_per_correct) > 0
      ? ` +${Number(dailyStatus.today_bonus_per_correct)}`
      : ""}
  </span>

  {/* resim — büyütüldü */}
  {dailyStatus?.tree?.key && (
    <img
      src={`/tree/${dailyStatus.tree.key}.png`}
      alt={`ağaç ${dailyStatus.tree.key}`}
      className="absolute right-0 top-1/2 -translate-y-1/2 object-contain w-12 h-12 sm:w-14 sm:h-14"
    />
  )}
</div>



)}





              </div> {/* sağ sütun */}
            </div> {/* avatar satırı */}

            {/* Başlık etiketi */}
            

            <div className="w-full grid grid-cols-3 gap-2 mt-3">
              <Box title="Puanın" value={nf.format(totalPoints)} />
              <Box title="Cevapladığın" value={nf.format(answeredCount)} />
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

          <div className="flex flex-col gap-2 mt-3">

           
           {/* En iyi başlık cümlesi */}
<div className="text-center -mt-1 leading-tight">{renderBestTitleBadge()}</div>


            {/* Günün Yarışması */}
            <button
  className="w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-800 text-white shadow-lg active:scale-95 transition"
  onClick={() => { fetchDailyStatus(); setMode("today"); }}
  title="Günün yarışmasına git"
>
  <SunIcon className="w-5 h-5 mr-2 inline" /> Günün Yarışması
</button>


            {/* Kademeli Yarış */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:to-fuchsia-800 text-white shadow-lg active:scale-95 transition"
              onClick={startLadder}
              disabled={loadingLevelQuestions}
              title="1 puanlık sorulardan başlayarak seviyeni yükselt!"
            >
              {loadingLevelQuestions
  ? "Yükleniyor…"
  : (<><BoltIcon className="w-5 h-5 mr-2 inline" /> Kademeli Yarış</>)
}

            </button>

            {/* Kategoriler */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-cyan-600 hover:bg-cyan-800 text-white shadow-lg active:scale-95 transition"
              onClick={() => { setInfo(""); fetchSurveys(); setMode("list"); }}
              title="Onaylı Kategoriler"
            >
              <BookIcon className="w-5 h-5 mr-2 inline" /> Kategoride Yarış 
            </button>

            {/* Rastgele Soru */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 hover:to-emerald-800 text-white shadow-lg active:scale-95 transition"
              onClick={startRandom}
            >
              <DiceIcon className="w-5 h-5 mr-2 inline" /> Rastgele Yarış
            </button>

            {/* Düello */}
{/* Düello */}
<Link
  to="/duello"
  className="relative w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 hover:to-indigo-800 text-white shadow-lg active:scale-95 transition inline-flex items-center justify-center"
  title="Düello'ya git"
  aria-label={duelloUnread > 0 ? `Düello (yeni ${duelloUnread} davet)` : "Düello"}
>
  <SwordsIcon size={20} className="mr-2" />
  Düello
  {duelloUnread > 0 && (
    <span className="ml-2 inline-flex items-center justify-center text-[11px] font-extrabold bg-red-600 text-white rounded-full w-5 h-5">
      {duelloUnread > 99 ? "99+" : duelloUnread}
    </span>
  )}
</Link>


            {/* Genel Puan Tablosu */}
            <button
              className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-700 text-white shadow-lg active:scale-95 transition"
              onClick={() => {
                setShowLeaderboard(true);
                fetchLeaderboard(activePeriod);
              }}
            >
              <TrophyIcon className="w-5 h-5 mr-2 inline" /> Genel Puan Tablosu
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
  className="absolute top-2 right-3 text-gray-400 hover:text-red-500"
  onClick={() => setShowLeaderboard(false)}
>
  <CloseIcon className="w-6 h-6" />
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

          {/* Kademeli: seviye artırım promptu */}
          {showLevelUpPrompt && (
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-3">
              <div className="bg-white rounded-3xl shadow-2xl p-5 w-full max-w-sm text-center relative">
                <button
  className="absolute top-2 right-3 text-gray-400 hover:text-red-500"
  onClick={() => setShowLevelUpPrompt(false)}
  title="Kapat"
>
  <CloseIcon className="w-6 h-6" />
</button>

                <div className="text-2xl font-bold text-emerald-700 mb-2">
                  Soruları biraz zorlaştıralım mı?
                </div>
                <div className="text-gray-600 mb-4">
  Harika gidiyorsun! {ladderLevel}. seviyede bu oturum performansın:
  <b> {ladderCorrect}/{ladderAttempts}</b> (%
  {ladderSessionRate}). Soruları biraz zorlaştıralım mı?
</div>

                <div className="flex gap-3 justify-center">
                  <button
  className="px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-800"
  onClick={async () => {
    const next = Math.min(10, ladderLevel + 1);

    // 1) Backend’de yeni seviye için oturum başlat
    try {
      const r = await fetch(`${apiUrl}/api/ladder/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, level: next }),
      });
      const d = await r.json();
      if (!d?.success) {
        window.alert(d?.error || "Kademeli oturum başlatılamadı.");
        return;
      }
    } catch {
      window.alert("Kademeli oturum başlatılamadı (bağlantı hatası).");
      return;
    }

    // 2) Lokal sayaçları sıfırla ve soruları yükle
    setShowLevelUpPrompt(false);
    setLadderLevel(next);
    setLadderAttempts(0);
    setLadderCorrect(0);
    await fetchLadderBest();
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

          {/* Toast (panel) */}
          <Toast toast={toast} />
        </div>
      </div>
    );
  }

  /* -------------------- KATEGORİ LİSTESİ (kompakt + "Puanlarım" en üstte) -------------------- */
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
{/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}
    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>
          <h2 className="text-xl font-extrabold text-cyan-700 text-center mb-3">
            Onaylı Kategoriler
          </h2>

{info && (
  <div className="mb-3 px-3 py-2 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
    {info}
  </div>
)}


          {/* Puanlarım butonu (üstte) */}
          <button
            className="w-full mb-4 py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:to-purple-800 text-white shadow-lg active:scale-95 transition"
            onClick={() => {
              setShowMyPerf(true);
              loadMyPerformance();
            }}
            title="Kategori bazında kendi performansın"
          >
            <ChartIcon className="w-5 h-5 mr-2 inline" /> Puanlarım
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
  className="absolute top-2 right-3 text-gray-500 hover:text-red-600"
  onClick={() => setShowSurveyLeaderboard(false)}
  title="Kapat"
>
  <CloseIcon className="w-6 h-6" />
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

          {/* Puanlarım modalı */}
          <PointsTable
            show={showMyPerf}
            onClose={() => setShowMyPerf(false)}
            loading={myPerfLoading}
            error={myPerfError}
            data={myPerf}
          />

          {/* Toast (list) */}
          <Toast toast={toast} />
        </div>
      </div>
    );
  }

  /* -------------------- GÜNÜN YARIŞMASI (dashboard) -------------------- */
  if (mode === "today") {
    const idx = Number(dailyStatus?.index ?? 0);
    const finished = !!dailyStatus?.finished;
    const started = !finished && idx > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
        <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}

    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>
          <div className="flex flex-col items-center gap-2">
            {/* Avatar + Sağ bilgi bloğu (kitap + hız kademesi) */}
            <div className="flex items-center gap-3 mb-2 w-full">
              <div className="rounded-full bg-gray-100 p-1 shadow-md">
                <img
    src={getAvatarUrl()}
    alt="avatar"
    width={128}
    height={128}
    className="w-[88px] h-[88px] sm:w-[128px] sm:h-[128px] rounded-full object-contain"
  />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                 <h1 className="text-2xl font-extrabold text-cyan-700 truncate">
  {user.ad} {user.soyad}
</h1>

                </div>
                <div className="mt-0.5">
  <TierHeading tier={speedTier?.tier} />
</div>

                <RankRow points={totalPoints} nf={nf} />


              {speedTier?.tier ? (
  <div className="mt-1">
    <div className="flex items-center gap-2 flex-wrap justify-start text-left">
      <StatusBadge
  text={`Hızın: ${
    Number.isFinite(Number(speedTier?.avg_spent_seconds))
      ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          .format(Number(speedTier.avg_spent_seconds))
      : '—'
  } sn`}
  color={tierMeta(speedTier.tier).color}
  size="sm"
  variant="ghost"
  className="!text-cyan-700 !px-0 !py-0 !rounded-none"
/>


      <StatusBadge
        text={`Kitap ipucun ${Number(books) || 0}`}
        color="orange"
        size="sm"
        variant="ghost"
        className="!text-cyan-700"
      />
    </div>
  </div>
) : (
  <div className="mt-1">
    <div className="flex items-center gap-2 flex-wrap justify-start text-left">
      <StatusBadge text="Hesaplanıyor…" color="gray" size="sm" variant="ghost" className="!text-cyan-700 !px-0 !py-0 !rounded-none" />
      <StatusBadge
        text={`Kitap ipucun ${Number(books) || 0}`}
        color="orange"
        size="sm"
        variant="ghost"
        className="!text-cyan-700"
      />
    </div>
  </div>
)}




              </div> {/* sağ sütun */}
            </div>   {/* avatar satırı */}

            {/* === IMPDAY: banner START === */}
            <div className="w-full text-center mt-1">
              {impDayLoading ? (
                <div className="text-xs text-gray-400">—</div>
              ) : (
                <>
                  {impDay?.prettyDate ? (
                    <div className="text-sm font-semibold text-emerald-700">
                      {impDay.prettyDate}
                    </div>
                  ) : null}
                  {impDay?.daytitle ? (
                    <div className="text-base font-bold text-gray-800 mt-0.5">
                      {impDay.daytitle}
                    </div>
                  ) : null}
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

            {/* ← BUNUN HEMEN ALTINA EKLEYİN */}
{typeof dailyStatus?.streak_current === "number" && (
  <div className="mb-2 flex items-center gap-2">
    {dailyStatus?.tree?.key && (
      <img
        src={`/tree/${dailyStatus.tree.key}.png`}
        alt={`ağaç ${dailyStatus.tree.key}`}
  style={{ width: 44, height: 44 }}
  className="object-contain"
      />
    )}
    <StatusBadge
      text={`Seri: ${dailyStatus.streak_current} gün`}
      color="emerald"
      size="sm"
    />
    {(dailyStatus?.today_bonus_per_correct ?? 0) > 0 && (
      <StatusBadge
        text={`Bugün +${dailyStatus.today_bonus_per_correct}/doğru`}
        color="orange"
        size="sm"
      />
    )}
  </div>
)}





            {/* Üst kutular */}
            <div className="w-full grid grid-cols-3 gap-2 mt-3">
              <StatCard label="Cevapladığın">{idx}</StatCard>
              <StatCard label="Puan">{nf.format(dailyPoints)}</StatCard>
              <StatCard label="Bugün" footer="sıradasın">
  <span className="leading-none">
    {dailyRank ? `${dailyRank}.` : "-"}
  </span>
</StatCard>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex flex-col gap-2 mt-6">
           {/* FINISHED => buton YOK, mesaj VAR */}
  {finished ? (
    <div className="mt-1 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
      Tebrikler 🎉 Puanların genel puanlarına eklendi ve yarışmayı tamamladığın için
    <b> 2 adet kitap ipucu</b> kazandın. 
    </div>
  ) : (
    <button
      className="w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-800 text-white shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={startOrContinueDaily}
      title={started ? "Devam Et" : "Yarışmaya Başla"}
      disabled={dailyLoading}
    >
      <span className="mr-2">🏁</span>
      {started ? "Devam Et" : "Yarışmaya Başla"}
    </button>
  )}

  {dailyError && (
    <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      {dailyError}
    </div>
  )}

            {/* Bugünün Puan Durumu */}
            <div className="mt-4">
              <div className="text-sm font-bold text-gray-700 mb-2">Günün Yarışması Puan Durumu(İlk 10) </div>
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-xs">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="p-2 border">#</th>
                      <th className="p-2 border text-left">Ad</th>
                      <th className="p-2 border text-left">Soyad</th>
                      <th className="p-2 border">Soru</th>
                      <th className="p-2 border">Puan</th>
                      <th className="p-2 border">Saniye</th>
                    </tr>
                  </thead>
                  <tbody>
  {(Array.isArray(dailyLeaderboard)
      ? dailyLeaderboard.filter(Boolean).slice(0, 10)   // ← sadece ilk 10
      : []
    ).map((u, i) => (
      <tr
        key={`${u?.id ?? "row"}-${i}`}
        className={String(u?.id) === String(user.id) ? "bg-yellow-50" : ""}
      >
        <td className="p-2 border text-center">{i + 1}</td>
        <td className="p-2 border">{u?.ad ?? "-"}</td>
        <td className="p-2 border">{u?.soyad ?? "-"}</td>
        <td className="p-2 border text-center">{u?.answered_count ?? 0}</td>
        <td className="p-2 border text-center">{u?.total_points ?? 0}</td>
        <td className="p-2 border text-center">{u?.time_spent ?? 0}</td>
      </tr>
    ))}

  {(!Array.isArray(dailyLeaderboard) || dailyLeaderboard.length === 0) && (
    <tr>
      <td className="p-2 border text-gray-400 text-center" colSpan={6}>
        Henüz katılım yok.
      </td>
    </tr>
  )}
</tbody>

                </table>
              </div>
            </div>

{/* Günün Yarışması Birincileri */}
<div className="mt-4">
  <div className="text-sm font-bold text-gray-700 mb-2">
    Günün Yarışması Birincileri
  </div>

  <div className="overflow-auto rounded-xl border">
    <table className="min-w-full text-xs">
      <thead className="bg-emerald-50">
        <tr>
          <th className="p-2 border text-left">Ad</th>
          <th className="p-2 border text-left">Soyad</th>
          <th className="p-2 border" title="Kazanılan birincilik sayısı">1.</th>
        </tr>
      </thead>
      <tbody>
        {(Array.isArray(dailyChampions) ? dailyChampions : []).map((u, i) => {
          // Backend alan adı farklarına dayanıklı olsun:
          const wins = Number(
            u?.wins ?? u?.first_count ?? u?.firsts ?? u?.count ?? u?.birincilik ?? 0
          );

          return (
            <tr
              key={`${u?.id ?? "row"}-${i}`}
              className={String(u?.id) === String(user.id) ? "bg-yellow-50" : ""}
            >
              <td className="p-2 border">{u?.ad ?? "-"}</td>
              <td className="p-2 border">{u?.soyad ?? "-"}</td>
              <td className="p-2 border text-center">{wins}</td>
            </tr>
          );
        })}

        {(!Array.isArray(dailyChampions) || dailyChampions.length === 0) && (
          <tr>
            <td className="p-2 border text-gray-400 text-center" colSpan={3}>
              Henüz birincilik kaydı yok.
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
</div>

          {/* Toast (today) */}
          <Toast toast={toast} />
        </div>
      </div>
    );
  }

  /* -------------------- SORU ÇÖZ (NORMAL/KADEMELİ) -------------------- */
if (mode === "solve" && questions.length > 0) {
  const q = questions[currentIdx];
  const surveyTitleHere = getSurveyTitleForQuestionSync(q);
  const pctSolve = Math.round(((currentIdx + 1) / Math.max(1, questions.length)) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
      {/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}

    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>

        <h2 className="text-xl font-bold text-cyan-700 mb-3">
          Soru {currentIdx + 1} / {questions.length}
        </h2>
        {scoreFloat != null && (
  <div className={`absolute left-1/2 -translate-x-1/2 top-3 text-2xl font-extrabold ${scoreFloat > 0 ? "text-emerald-600" : "text-red-600"} animate-bounce`}>
    {scoreFloat > 0 ? `+${scoreFloat}` : scoreFloat}
  </div>
)}


        {/* İlerleme çubuğu (solve) */}
        <div
          className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pctSolve}
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pctSolve}%` }}
          />
        </div>

        <div className="text-sm text-gray-600 mb-1">
  {ladderActive ? (
    <>
      <div className="mt-1">
        <StatusBadge
          text={`En iyi seviyen ${ladderBest}`}
          color="emerald"
          size="md"
          variant="ghost"
          className="!px-3 !py-1.5 !text-emerald-800 !text-xl"
        />
      </div>

      <div className="mt-1">
        <StatusBadge
          text={`Bu oturum: ${ladderAttempts} deneme • ${ladderCorrect} doğru • %${ladderSessionRate} başarı`}
          color="blue"
          size="sm"
          variant="ghost"
        />
      </div>

      <div className="mt-1">
        <StatusBadge
          text={`Seviye atlamak için: ≥ 16/20 (%80)`}
          color="purple"
          size="sm"
          variant="ghost"
        />
      </div>
    </>
  ) : (
    "Standart Mod"
  )}
</div>


        <div
  className={
    "text-4xl font-mono mb-2 select-none " +
    (timeLeft <= 2
      ? "text-red-600 animate-pulse"
      : timeLeft <= 5
      ? "text-orange-600 animate-pulse"
      : "text-emerald-700")
  }
>
  {timeLeft}
</div>


        {surveyTitleHere ? (
          <div className="mb-2">
            <StatusBadge text={surveyTitleHere} color="blue" />
          </div>
        ) : null}

        <div className="text-lg font-semibold mb-4">{q.question}</div>
        <div className="text-2xl font-bold text-cyan-600 mb-3">
          Puan: {q.point}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <button
            className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("evet", q)}`}
            onClick={() => handleAnswer("evet")}
            disabled={timeLeft === 0 || feedbackActive}
          >
            ✔️ Evet
          </button>
          <button
            className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("hayır", q)}`}
            onClick={() => handleAnswer("hayır")}
            disabled={timeLeft === 0 || feedbackActive}
          >
            ✖️ Hayır
          </button>
          <button
            className={`py-3 rounded-2xl font-bold bg-cyan-600 text-white hover:bg-cyan-800 active:scale-95${highlightBtn("bilmem", q)}`}
            onClick={() => handleAnswer("bilmem")}
            disabled={timeLeft === 0 || feedbackActive}
          >
            ❓ Bilmem
          </button>

          <button
  className={
    "py-2 rounded-2xl font-bold active:scale-95 disabled:opacity-50 " +
    (books > 0
      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      : "bg-transparent text-gray-400 border border-gray-200 cursor-not-allowed")
  }
  onClick={spendBookAndReveal}
  disabled={timeLeft === 0 || feedbackActive || books <= 0 || spending || (revealed.qid === q.id)}
  title={books > 0 ? "1 kitap harcar, doğru cevabı gösterir" : "Kitabın yok"}
>
  <BookIcon className="w-5 h-5 mr-1 inline" /> Kitap İpucu {`(${books})`}
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

        {/* Toast (solve) */}
        <Toast toast={toast} />
      </div>
    </div>
  );
}


/* -------------------- SORU ÇÖZ (GÜNLÜK) -------------------- */
if (mode === "dailySolve" && dailyQuestion) {
  const q = dailyQuestion;
  const sIdx = Number(dailyStatus?.index ?? 0);
  const sSize = Number.isFinite(Number(dailyStatus?.size)) ? Number(dailyStatus.size) : 0;
  const pctDaily = Math.round((sIdx / Math.max(1, sSize)) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
      {/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}

    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>

        <h2 className="text-xl font-bold text-cyan-700 mb-1">Günün Yarışması</h2>
        {scoreFloat != null && (
  <div className={`absolute left-1/2 -translate-x-1/2 top-3 text-2xl font-extrabold ${scoreFloat > 0 ? "text-emerald-600" : "text-red-600"} animate-bounce`}>
    {scoreFloat > 0 ? `+${scoreFloat}` : scoreFloat}
  </div>
)}


        <div className="text-sm text-gray-600 mb-1">
          {sIdx} / {sSize}
        </div>

        {/* İlerleme çubuğu (dailySolve) */}
        <div
          className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pctDaily}
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pctDaily}%` }}
          />
        </div>

       <div
  className={
    "text-4xl font-mono mb-2 select-none " +
    (timeLeft <= 2
      ? "text-red-600 animate-pulse"
      : timeLeft <= 5
      ? "text-orange-600 animate-pulse"
      : "text-emerald-700")
  }
>
  {timeLeft}
</div>


        {dailySurveyTitle ? (
          <div className="mb-2">
            <StatusBadge text={dailySurveyTitle} color="blue" />
          </div>
        ) : null}

        <div className="text-lg font-semibold mb-4">{q.question}</div>
        <div className="text-2xl font-bold text-cyan-600 mb-3">
          Puan: {q.point}
        </div>

        {typeof dailyStatus?.streak_current === "number" && (
          <div className="mb-2">
            <StatusBadge
              text={`Seri: ${dailyStatus.streak_current} gün`}
              color="emerald"
              size="sm"
            />
            {(dailyStatus?.today_bonus_per_correct ?? 0) > 0 && (
              <StatusBadge
                text={`Bugün +${dailyStatus.today_bonus_per_correct}/doğru`}
                color="orange"
                size="sm"
                className="ml-2"
              />
            )}
          </div>
        )}

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

          <div className="text-sm font-bold text-emerald-700 text-center -mt-1">
            Bugünkü toplam puanın: {nf.format(dailyPoints)}
          </div>

          <button
            className="py-2 rounded-2xl font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 active:scale-95 disabled:opacity-50"
            onClick={spendBookAndReveal}
            disabled={timeLeft === 0 || feedbackActive || books <= 0 || spending || (revealed.qid === q.id)}
            title={books > 0 ? "1 kitap harcar, doğru cevabı gösterir" : "Kitabın yok"}
          >
            <span className="mr-1">📚</span> Kitap İpucu {`(${books})`}
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

        <Toast toast={toast} />
      </div>
    </div>
  );
}



  /* -------------------- DAHİ (kademeli final) -------------------- */
  if (mode === "genius") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
{/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}

    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>

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

          {/* Toast (genius) */}
          <Toast toast={toast} />
        </div>
      </div>
    );
  }

  /* -------------------- TEŞEKKÜRLER -------------------- */
  if (mode === "thankyou") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-600 px-3">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-6 w-full max-w-md text-center relative">
{/* Düello davet bildirimi */}
<div ref={bellWrapRef} className="absolute top-3 right-3">
  <NotificationBell
    count={duelloUnread}
    onClick={() => { setBellOpen(v => !v); countPendingInvites(); }}
    title="Düello davetlerin"
  />
  {bellOpen && (
    <div className="mt-2 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[70]">
      <div className="px-2 py-1.5 text-sm">
        {duelloUnread > 0 ? (
          <span className="font-semibold text-emerald-700">
            {duelloUnread} yeni davet
          </span>
        ) : (
          <span className="text-gray-500">Yeni davet yok</span>
        )}
      </div>
      <div className="border-t my-1" />
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm font-semibold"
        onClick={() => { setBellOpen(false); navigate("/duello"); }}
      >
        Düello’ya git
      </button>
      <button
        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 text-sm disabled:opacity-40"
        onClick={() => { clearDuelloUnread(); setBellOpen(false); }}
        disabled={duelloUnread === 0}
        title={duelloUnread === 0 ? "Okunacak davet yok" : "Hepsini okundu say"}
      >
        Hepsini okundu say
      </button>
    </div>
  )}
</div>

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

          {/* Toast (thankyou) */}
          <Toast toast={toast} />
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
      {/* Toast (fallback) */}
      <Toast toast={toast} />
    </div>
  );
}
