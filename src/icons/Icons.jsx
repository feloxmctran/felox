// src/icons/Icons.jsx
import React from "react";

/** Ortak SVG props (stroke: currentColor; round cap/join; 24x24) */
const svgProps = ({ size = 20, className = "", ...rest }) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className,
  ...rest,
});

/** Güneş */
export const SunIcon = (props) => (
  <svg {...svgProps(props)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5" />
  </svg>
);

/** Yıldırım (Kademeli Yarış) */
export const BoltIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
);

/** Kitap */
export const BookIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2z" />
    <path d="M17 3v16M6 3h5" />
  </svg>
);

/** Zar (Rastgele Soru) */
export const DiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="9" cy="9" r="1.2" />
    <circle cx="15" cy="15" r="1.2" />
    <circle cx="9" cy="15" r="1.2" />
    <circle cx="15" cy="9" r="1.2" />
  </svg>
);

/** Kupa (Leaderboard) */
export const TrophyIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M8 21h8M10 17h4" />
    <path d="M8 3h8v5a4 4 0 0 1-8 0z" />
    <path d="M4 5h4v3a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2z" />
    <path d="M20 5h-4v3a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V7a2 2 0 0 0-2-2z" />
  </svg>
);

/** Çarpı (Kapat) */
export const CloseIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M6 6l12 12M18 6l-12 12" />
  </svg>
);

/** Sol ok (Geri) */
export const ArrowLeftIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

/** Grafik (Puanlarım vb.) */
export const ChartIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M4 19V5M10 19V9M16 19v-6M4 19h16" />
  </svg>
);

/** Zaman / Yükleniyor (döndürmek için className'e `animate-spin` ver) */
export const SpinnerIcon = (props) => (
  <svg {...svgProps(props)}>
    <circle cx="12" cy="12" r="9" opacity="0.2" />
    {/* açık bir yay — dönerken loader etkisi verir */}
    <path d="M21 12a9 9 0 0 0-9-9" />
  </svg>
);

/** Yıldız (statik ikon; animasyonlu yıldız efektiniz starfx.css ile ayrı) */
export const StarIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M12 3l2.9 5.9L21 10l-4.8 4.7L17.8 21 12 17.7 6.2 21l1.6-6.3L3 10l6.1-1.1z" />
  </svg>
);


/** Çapraz Kılıç (Düello) */
export const SwordsIcon = (props) => (
  <svg {...svgProps(props)}>
    {/* Bıçaklar */}
    <path d="M5 4l7 7" />
    <path d="M19 4l-7 7" />
    {/* Saplar */}
    <path d="M12 11l-5 5" />
    <path d="M12 11l5 5" />
    {/* Kabza (crossguard) */}
    <path d="M9.5 8.5l-2 2" />
    <path d="M14.5 8.5l2 2" />
    {/* Pommeleler */}
    <circle cx="7" cy="16.5" r="1.2" />
    <circle cx="17" cy="16.5" r="1.2" />
  </svg>
);
