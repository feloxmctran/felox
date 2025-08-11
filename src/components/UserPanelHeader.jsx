import React from "react";

/** Başlık -> Tema (renk + ikon) */
const CATEGORY_THEME = {
  "Türkiye Tarihi":        { primary: "#FDE68A", secondary: "#B45309", accent: "#92400E", icon: "column" },
  "Dünya Tarihi":          { primary: "#BBF7D0", secondary: "#065F46", accent: "#047857", icon: "globe" },
  "Ülke başkentleri":      { primary: "#BFDBFE", secondary: "#1D4ED8", accent: "#1E40AF", icon: "pin" },
  "Türkiye Coğrafyası":    { primary: "#99F6E4", secondary: "#0E7490", accent: "#155E75", icon: "map" },
  "Dünya Coğrafyası":      { primary: "#A5F3FC", secondary: "#0369A1", accent: "#075985", icon: "compass" },
  "Türk edebiyatı":        { primary: "#FECDD3", secondary: "#9F1239", accent: "#881337", icon: "book" },
  "Dünya Edebiyatı":       { primary: "#E9D5FF", secondary: "#6D28D9", accent: "#5B21B6", icon: "books" },
  "Dünya masalları":       { primary: "#FBCFE8", secondary: "#BE185D", accent: "#9D174D", icon: "star" },
  "Türkiye Süper Lig":     { primary: "#DCFCE7", secondary: "#166534", accent: "#14532D", icon: "football" },
  "Dünya Futbol Tarihi":   { primary: "#D9F99D", secondary: "#3F6212", accent: "#365314", icon: "goal" },
  "Basketbol ve Diğer Sporlar": { primary: "#FED7AA", secondary: "#C2410C", accent: "#9A3412", icon: "basket" },
  "Klasik müzik":          { primary: "#C7D2FE", secondary: "#3730A3", accent: "#312E81", icon: "violin" },
  "Türkçe Müzik":          { primary: "#F5D0FE", secondary: "#A21CAF", accent: "#86198F", icon: "note" },
  "Yabancı Müzik":         { primary: "#BAE6FD", secondary: "#075985", accent: "#0C4A6E", icon: "headset" },
  "Türk Sineması":         { primary: "#E5E7EB", secondary: "#374151", accent: "#1F2937", icon: "clapper" },
  "Yeşilçam":              { primary: "#D1FAE5", secondary: "#065F46", accent: "#064E3B", icon: "film" },
  "Hollywood Sineması":    { primary: "#FEF3C7", secondary: "#B45309", accent: "#92400E", icon: "popcorn" },
  "Marvel Comics":         { primary: "#FECACA", secondary: "#B91C1C", accent: "#991B1B", icon: "mask" },
  "Teknoloji":             { primary: "#E5E7EB", secondary: "#111827", accent: "#374151", icon: "chip" },
  "Hayvanlar":             { primary: "#FDE68A", secondary: "#92400E", accent: "#78350F", icon: "paw" },
  "Bitkiler":              { primary: "#BBF7D0", secondary: "#166534", accent: "#14532D", icon: "leaf" },
  "Çiçekler":              { primary: "#FBCFE8", secondary: "#9D174D", accent: "#831843", icon: "flower" },
  "Sağlık":                { primary: "#FCA5A5", secondary: "#991B1B", accent: "#7F1D1D", icon: "steth" },
  "Yemekler":              { primary: "#FED7AA", secondary: "#9A3412", accent: "#7C2D12", icon: "plate" },
  "Trafik":                { primary: "#D9F99D", secondary: "#3F6212", accent: "#365314", icon: "traffic" },
  "Hukuk":                 { primary: "#E5E7EB", secondary: "#1F2937", accent: "#111827", icon: "scales" },
  "Tarım":                 { primary: "#FEF3C7", secondary: "#92400E", accent: "#78350F", icon: "wheat" },
  "Astroloji ve Burçlar":  { primary: "#DDD6FE", secondary: "#6D28D9", accent: "#5B21B6", icon: "crystal" },
};
const DEFAULT_THEME = { primary: "#E5E7EB", secondary: "#374151", accent: "#1F2937", icon: "spark" };

function MiniIcon({ type, cx = 68, cy = 26, color = "#111827" }) {
  switch (type) {
    case "column":   return <g transform={`translate(${cx},${cy})`}><rect x="-6" y="-8" width="12" height="14" rx="2" fill={color}/><rect x="-8" y="6" width="16" height="3" rx="1.5" fill={color}/></g>;
    case "globe":    return <g transform={`translate(${cx},${cy})`}><circle r="9" fill="none" stroke={color} strokeWidth="2"/><path d="M-8,0 H8 M0,-8 V8 M-5,-5 C-3,-2,3,-2,5,-5" stroke={color} strokeWidth="1.5" fill="none"/></g>;
    case "pin":      return <g transform={`translate(${cx},${cy})`}><path d="M0,-8 a8,8 0 1,1 0,16 c0,0 -3,-3 -5,-7 a8,8 0 0,1 5,-9" fill={color}/><circle r="3" fill="white"/></g>;
    case "map":      return <g transform={`translate(${cx},${cy})`}><path d="M-10,-6 L-2,-8 L2,-4 L10,-6 L10,6 L2,8 L-2,4 L-10,6 Z" fill={color}/></g>;
    case "compass":  return <g transform={`translate(${cx},${cy})`}><circle r="9" fill="none" stroke={color} strokeWidth="2"/><path d="M0,0 L5,-5 L3,3 Z" fill={color}/></g>;
    case "book":     return <g transform={`translate(${cx},${cy})`}><path d="M-8,-7 h7 a3,3 0 0 1 3,3 v10 h-10 Z" fill={color}/><path d="M8,-7 h-7 a3,3 0 0 0 -3,3 v10 h10 Z" fill={color}/></g>;
    case "books":    return <g transform={`translate(${cx},${cy})`}><rect x="-10" y="-8" width="7" height="16" rx="1.5" fill={color}/><rect x="-1" y="-8" width="7" height="16" rx="1.5" fill={color}/></g>;
    case "star":     return <g transform={`translate(${cx},${cy})`}><path d="M0,-9 L2,-2 L9,-2 L3,2 L5,9 L0,5 L-5,9 L-3,2 L-9,-2 L-2,-2 Z" fill={color}/></g>;
    case "football": return <g transform={`translate(${cx},${cy})`}><circle r="9" fill="white" stroke={color} strokeWidth="2"/><polygon points="0,-4 3,-1 2,3 -2,3 -3,-1" fill={color}/></g>;
    case "goal":     return <g transform={`translate(${cx},${cy})`}><rect x="-9" y="-6" width="18" height="12" fill="none" stroke={color} strokeWidth="2"/><path d="M-9,-2 H9 M-9,2 H9 M-5,-6 V6 M0,-6 V6 M5,-6 V6" stroke={color} strokeWidth="1"/></g>;
    case "basket":   return <g transform={`translate(${cx},${cy})`}><circle r="8" fill="none" stroke={color} strokeWidth="2"/><path d="M-8,0 A8,8 0 0,0 8,0 M0,-8 A8,8 0 0,0 0,8" stroke={color} strokeWidth="2" fill="none"/></g>;
    case "violin":   return <g transform={`translate(${cx},${cy})`}><rect x="-7" y="-3" width="14" height="6" rx="3" fill={color}/><rect x="4" y="-6" width="2" height="12" fill={color}/></g>;
    case "note":     return <g transform={`translate(${cx},${cy})`}><path d="M-2,-8 L6,-10 L6,2 A4,4 0 1,1 2,2 V-6 L-2,-5 Z" fill={color}/></g>;
    case "headset":  return <g transform={`translate(${cx},${cy})`}><path d="M-8,0 A8,8 0 0,1 8,0" stroke={color} strokeWidth="2" fill="none"/><rect x="-9" y="0" width="4" height="6" rx="2" fill={color}/><rect x="5" y="0" width="4" height="6" rx="2" fill={color}/></g>;
    case "clapper":  return <g transform={`translate(${cx},${cy})`}><rect x="-9" y="-5" width="18" height="10" rx="2" fill={color}/><rect x="-9" y="-8" width="18" height="5" rx="2" fill={color}/></g>;
    case "film":     return <g transform={`translate(${cx},${cy})`}><rect x="-10" y="-6" width="20" height="12" rx="2" fill={color}/><g fill="white"><circle cx="-6" r="1.5"/><circle cx="-2" r="1.5"/><circle cx="2" r="1.5"/><circle cx="6" r="1.5"/></g></g>;
    case "popcorn":  return <g transform={`translate(${cx},${cy})`}><path d="M-6,3 L-4,9 H4 L6,3 Z" fill={color}/><circle cx="-3" cy="-1" r="3" fill={color}/><circle cx="0" cy="-2" r="3" fill={color}/><circle cx="3" cy="-1" r="3" fill={color}/></g>;
    case "mask":     return <g transform={`translate(${cx},${cy})`}><rect x="-8" y="-4" width="16" height="8" rx="4" fill={color}/><circle cx="-3" r="1.5" fill="white"/><circle cx="3" r="1.5" fill="white"/></g>;
    case "chip":     return <g transform={`translate(${cx},${cy})`}><rect x="-7" y="-7" width="14" height="14" rx="2" fill={color}/><rect x="-3" y="-3" width="6" height="6" fill="white"/></g>;
    case "paw":      return <g transform={`translate(${cx},${cy})`}><circle cx="-4" cy="-3" r="2" fill={color}/><circle cx="4" cy="-3" r="2" fill={color}/><circle cx="0" cy="-5" r="2" fill={color}/><path d="M-5,2 C-2,-1,2,-1,5,2 C3,6,-3,6,-5,2" fill={color}/></g>;
    case "leaf":     return <g transform={`translate(${cx},${cy})`}><path d="M0,-8 C6,-6,9,0,0,8 C-9,0,-6,-6,0,-8 Z" fill={color}/></g>;
    case "flower":   return <g transform={`translate(${cx},${cy})`}><circle r="2" fill={color}/><g fill={color} opacity="0.85"><circle cx="0" cy="-6" r="3"/><circle cx="5" cy="-3" r="3"/><circle cx="5" cy="3" r="3"/><circle cx="0" cy="6" r="3"/><circle cx="-5" cy="3" r="3"/><circle cx="-5" cy="-3" r="3"/></g></g>;
    case "steth":    return <g transform={`translate(${cx},${cy})`}><path d="M-6,-4 a4,4 0 1,0 8,0" stroke={color} strokeWidth="2" fill="none"/><circle cx="6" cy="4" r="3" fill={color}/></g>;
    case "plate":    return <g transform={`translate(${cx},${cy})`}><circle r="9" fill="none" stroke={color} strokeWidth="2"/><circle r="5" fill="none" stroke={color} strokeWidth="2"/></g>;
    case "traffic":  return <g transform={`translate(${cx},${cy})`}><rect x="-5" y="-8" width="10" height="16" rx="2" fill={color}/><g fill="white"><circle cy="-4" r="1.5"/><circle r="1.5"/><circle cy="4" r="1.5"/></g></g>;
    case "scales":   return <g transform={`translate(${cx},${cy})`}><path d="M0,-6 V8 M-8,-2 H8" stroke={color} strokeWidth="2"/><path d="M-6,-2 a3,3 0 1,0 6,0 Z M6,-2 a3,3 0 1,0 -6,0 Z" fill={color}/></g>;
    case "wheat":    return <g transform={`translate(${cx},${cy})`}><path d="M0,8 V-8" stroke={color} strokeWidth="2"/><g fill={color}><ellipse cx="-3" cy="-6" rx="2" ry="3"/><ellipse cx="3" cy="-4" rx="2" ry="3"/><ellipse cx="-3" cy="-2" rx="2" ry="3"/><ellipse cx="3" cy="0" rx="2" ry="3"/></g></g>;
    case "crystal":  return <g transform={`translate(${cx},${cy})`}><path d="M0,-8 L6,-2 L3,8 H-3 L-6,-2 Z" fill={color}/></g>;
    default:         return <g transform={`translate(${cx},${cy})`}><circle r="8" fill={color}/></g>;
  }
}

function AvatarSVG({ title, gender = "diğer" }) {
  const theme = CATEGORY_THEME[title] || DEFAULT_THEME;
  // Cinsiyete göre saç/aksesuar
  const isMale = (gender || "").toLowerCase().startsWith("e");  // erkek
  const isFemale = (gender || "").toLowerCase().startsWith("k"); // kadın

  return (
    <div className="rounded-full p-1 shadow-md" style={{ background: theme.primary }}>
      <svg width="72" height="72" viewBox="0 0 72 72" className="rounded-full">
        {/* Arkaplan */}
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.primary} />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <rect width="72" height="72" rx="36" fill="url(#bg)" />
        {/* Kategori mini ikon */}
        <MiniIcon type={theme.icon} color={theme.accent} />

        {/* Yüz */}
        <circle cx="36" cy="36" r="18" fill="#FFE7D1" stroke={theme.secondary} strokeWidth="1.5" />
        {/* Saç - erkek / kadın */}
        {isMale && (
          <path d="M18,34 C22,22 50,22 54,34 C48,25 24,25 18,34 Z" fill={theme.secondary} />
        )}
        {isFemale && (
          <>
            <path d="M18,34 C22,20 50,20 54,34 C50,26 24,26 18,34 Z" fill={theme.secondary} />
            <circle cx="24" cy="40" r="5" fill={theme.secondary} />
            <circle cx="48" cy="40" r="5" fill={theme.secondary} />
          </>
        )}
        {/* Gözler */}
        <circle cx="30" cy="36" r="2.2" fill={theme.accent} />
        <circle cx="42" cy="36" r="2.2" fill={theme.accent} />
        {/* Ağız (hafif gülümseme) */}
        <path d="M30,44 C33,47 39,47 42,44" stroke={theme.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function UserPanelHeader({ user, totalPoints, answeredCount, bestCategoryTitle, onLogout }) {
  const gender = user?.cinsiyet || ""; // "Erkek"/"Kadın"/...
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="mb-2">
        <AvatarSVG title={bestCategoryTitle} gender={gender} />
      </div>
      <h1 className="text-2xl font-extrabold text-cyan-700 text-center">
        {user?.ad} {user?.soyad}
      </h1>
      <div className="w-full flex gap-3 mt-3 flex-wrap">
        <div className="flex-1 min-w-[42%] bg-white/80 rounded-2xl shadow p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Puanın</div>
          <div className="text-2xl font-extrabold text-emerald-700">{totalPoints}</div>
        </div>
        <div className="flex-1 min-w-[42%] bg-white/80 rounded-2xl shadow p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Cevapladığın</div>
          <div className="text-2xl font-extrabold text-emerald-700">{answeredCount}</div>
        </div>
      </div>

      <button
        className="w-full py-2 mt-3 rounded-2xl text-sm bg-gray-200 text-gray-600 hover:bg-gray-300 font-semibold"
        onClick={onLogout}
      >
        Çıkış Yap
      </button>
    </div>
  );
}
