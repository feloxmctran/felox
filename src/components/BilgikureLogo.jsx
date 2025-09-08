// src/components/BilgikureLogo.jsx
import React from "react";

/** Basit globe + gradient yazı */
export default function BilgikureLogo({ size = 56 }) {
  return (
    <div className="flex items-center justify-center gap-3 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="drop-shadow-sm"
      >
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" stroke="url(#bg1)" strokeWidth="3" fill="none" />
        {/* meridyen/paraleller */}
        <path d="M4 24h40M24 4v40" stroke="#0ea5e9" strokeWidth="1.5" opacity=".6" />
        <ellipse cx="24" cy="24" rx="14" ry="20" stroke="#10b981" strokeWidth="1.5" fill="none" opacity=".7" />
        <ellipse cx="24" cy="24" rx="20" ry="12" stroke="#14b8a6" strokeWidth="1.5" fill="none" opacity=".5" />
      </svg>

      <div className="leading-tight">
        <div className="text-3xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">
            BİLGİ
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-sky-500">
            KÜRE
          </span>
        </div>
        <div className="text-[13px] font-medium text-cyan-700/80">
          Bilgin kadar yarış, bilgin kadar kazan.
        </div>
      </div>
    </div>
  );
}
