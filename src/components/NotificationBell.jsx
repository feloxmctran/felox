import React from "react";

/**
 * Küçük bildirim zili.
 * Props:
 * - count: okunmamış davet sayısı (number)
 * - onClick: tıklamada çalışır (ör. /duello'ya git + sayacı sıfırla)
 * - title: hover başlığı
 * - className: ekstra tailwind sınıfları
 */
export default function NotificationBell({
  count = 0,
  onClick = () => {},
  title = "Düello davetlerin",
  className = "",
}) {
  const showBadge = Number(count) > 0;
  const display = Number(count) > 99 ? "99+" : String(count);

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative inline-flex items-center justify-center rounded-full 
                  bg-white/90 hover:bg-white text-emerald-700 shadow 
                  w-10 h-10 active:scale-95 transition ${className}`}
      aria-label="Bildirimler"
    >
      <span className="text-xl" aria-hidden="true">🔔</span>

      {/* Badge */}
      {showBadge && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1
                     rounded-full bg-red-600 text-white text-[11px] font-bold
                     flex items-center justify-center shadow
                     animate-pulse"
          aria-live="polite"
        >
          {display}
        </span>
      )}
    </button>
  );
}
