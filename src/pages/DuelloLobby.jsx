// src/pages/DuelloLobby.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API,
  getProfile as apiGetProfile,
  setReady as apiSetReady,
  getUserCode as apiGetUserCode,
  createInvite,
  inbox,
  outbox,
  respondInvite,
  cancelInvite,
  activeMatch,
  getDuelloStats,
} from "../api/duello";

import { openDuelloEventStream } from "../lib/duelloSSE";

/* === Felox universal user storage === */
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
    } catch (_) {}
  }
  return userStr ? JSON.parse(userStr) : null;
}

export default function DuelloLobby() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  // Avatar / başlık
  const [avatarManifest, setAvatarManifest] = useState(null);
  const [bestTitle, setBestTitle] = useState("");

  // User code & kopyalama
  const [userCode, setUserCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Profil
  const [ready, setReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Davet gönder
  const [inviteMode, setInviteMode] = useState("info"); // 'info' | 'speed'
  const [targetCode, setTargetCode] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState("");

  // Rastgele
  const [randLoading, setRandLoading] = useState(false);
  const [duelStats, setDuelStats] = useState(null); // {wins, losses, draws}

  // Gelen/Giden
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  // Son rakipler (KULLANICI-BAĞIMLI anahtar)
  const RECENTS_KEY = (uid) => `felox_duello_recents_${uid || "anon"}`;
  const [recentLocal, setRecentLocal] = useState([]);
  const [recentRemote] = useState([]); // ileride API eklenirse

  // Cinsiyet -> avatar
  const gender = useMemo(() => {
    const raw = String(user?.cinsiyet ?? "")
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "");
    const s = raw
      .replace(/ı/g, "i")
      .replace(/i̇/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ç/g, "c")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/â/g, "a");

    if (/(^|[\s_/.-])(erkek|bay|male|man)([\s_/.-]|$)/.test(s)) return "male";
    if (/(^|[\s_/.-])(kadin|bayan|female|woman)([\s_/.-]|$)/.test(s))
      return "female";
    return "unknown";
  }, [user?.cinsiyet]);

  // Manifest
  useEffect(() => {
    fetch("/avatars/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAvatarManifest(d))
      .catch(() => {});
  }, []);

  // En iyi başlık (avatar için)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/user/${user.id}/performance`);
        const d = await r.json();
        if (d?.success && Array.isArray(d.performance) && d.performance.length) {
          const top = d.performance.reduce((a, b) =>
            (b?.net_points || 0) > (a?.net_points || 0) ? b : a
          );
          setBestTitle(top?.title || "");
        } else {
          setBestTitle("");
        }
      } catch (_) {
        setBestTitle("");
      }
    })();
  }, [user?.id]);

  // Avatar URL
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
    return `/avatars/${
      entry.neutral || entry.female || entry.male || "default-female.png"
    }`;
  };

  // Kullanıcıyı getir
  useEffect(() => {
    getFeloxUser().then((u) => {
      if (!u) {
        window.location.href = "/login";
        return;
      }
      setUser(u);
    });
  }, []);

  // User code
  useEffect(() => {
    if (!user?.id) return;
    if (user?.user_code) {
      setUserCode(user.user_code);
      return;
    }
    apiGetUserCode(user.id)
      .then((d) => {
        if (d?.success && d.user_code) setUserCode(d.user_code);
      })
      .catch(() => {});
  }, [user?.id, user?.user_code]);

  /* ====== RECENTS: Kullanıcıya göre oku & yaz + eski anahtarı taşı ====== */
  // Eski anahtardan (felox_duello_recents) yeni kullanıcı-anahtarına taşı
  useEffect(() => {
    if (!user?.id) return;
    try {
      const oldKey = "felox_duello_recents";
      const newKey = RECENTS_KEY(user.id);
      const oldStr = localStorage.getItem(oldKey);
      const newStr = localStorage.getItem(newKey);
      if (oldStr && !newStr) {
        localStorage.setItem(newKey, oldStr);
        localStorage.removeItem(oldKey);
      }
    } catch (_) {}
  }, [user?.id]);

  // Oku
  useEffect(() => {
    if (!user?.id) return;
    try {
      const arr = JSON.parse(localStorage.getItem(RECENTS_KEY(user.id)) || "[]");
      setRecentLocal(Array.isArray(arr) ? arr : []);
    } catch (_) {}
  }, [user?.id]);

  // Yaz
  useEffect(() => {
    try {
      const key = RECENTS_KEY(user?.id);
      localStorage.setItem(key, JSON.stringify(recentLocal.slice(0, 12)));
    } catch (_) {}
  }, [recentLocal, user?.id]);

  // Güvenli ekleyici
  const pushRecent = useCallback((op) => {
    const code = String(op?.code || "").toUpperCase();
    if (!code) return;
    const ad = op?.ad || "";
    const soyad = op?.soyad || "";
    const ts = Date.now();
    setRecentLocal((prev) => {
      const without = (prev || []).filter((x) => x.code !== code);
      return [{ code, ad, soyad, ts }, ...without].slice(0, 12);
    });
  }, []);

  // Son oynadıkların (3 buton)
  const recentOpps = useMemo(() => {
    const acc = [];
    const add = (code, ad, soyad, ts = 0) => {
      const C = String(code || "").toUpperCase();
      if (!C) return;
      const existing = acc.find((x) => x.code === C);
      const hasName = !!((ad || "").trim() || (soyad || "").trim());
      if (!existing) {
        acc.push({ code: C, ad: ad || "", soyad: soyad || "", ts });
      } else if (hasName && !(existing.ad || existing.soyad)) {
        existing.ad = ad || existing.ad;
        existing.soyad = soyad || existing.soyad;
        existing.ts = Math.max(existing.ts || 0, ts || 0);
      }
    };

    (recentLocal || []).forEach((x) => add(x.code, x.ad, x.soyad, x.ts || 0));
    (recentRemote || []).forEach((x) => add(x.code, x.ad, x.soyad, x.ts || 0));
    (outgoing || []).forEach((i) =>
      add(i?.to?.user_code, i?.to?.ad, i?.to?.soyad, 0)
    );
    (incoming || []).forEach((i) =>
      add(i?.from?.user_code, i?.from?.ad, i?.from?.soyad, 0)
    );
    acc.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return acc.slice(0, 3);
  }, [incoming, outgoing, recentLocal, recentRemote]);

  // incoming/outgoing geldikçe local recents'ı isimle zenginleştir
  useEffect(() => {
    const map = new Map();

    (incoming || []).forEach((i) => {
      const c = String(i?.from?.user_code || "").toUpperCase();
      if (c) map.set(c, { ad: i?.from?.ad || "", soyad: i?.from?.soyad || "" });
    });

    (outgoing || []).forEach((i) => {
      const c = String(i?.to?.user_code || "").toUpperCase();
      if (c) map.set(c, { ad: i?.to?.ad || "", soyad: i?.to?.soyad || "" });
    });

    setRecentLocal((prev) => {
      let changed = false;
      const next = (prev || []).map((x) => {
        const info = map.get(String(x.code).toUpperCase());
        if (!info) return x;
        const ad = x.ad || info.ad || "";
        const soyad = x.soyad || info.soyad || "";
        if (ad !== x.ad || soyad !== x.soyad) {
          changed = true;
          return { ...x, ad, soyad };
        }
        return x;
      });
      return changed ? next : prev;
    });
  }, [incoming, outgoing]);

  const copyUserCode = async () => {
    if (!userCode) return;
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_) {
      try {
        const ta = document.createElement("textarea");
        ta.value = userCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch (_) {}
    }
  };

  /* =================== API UYUMLU FONKSİYONLAR =================== */

  // Profil
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const d = await apiGetProfile(user.id);
      if (d?.success && d.profile) {
        setReady(!!d.profile.ready);
      }
    } catch (_) {
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  // Gelen/Giden
  const pickVal = (...vals) =>
    vals.find((v) => v !== undefined && v !== null && v !== "") ?? "";

  const fetchLists = useCallback(async () => {
    if (!user?.id) return;
    setListsLoading(true);
    try {
      const [rin, rout] = await Promise.all([inbox(user.id), outbox(user.id)]);

      setIncoming(
        (rin?.invites || []).map((i) => ({
          id: pickVal(i.id, i.invite_id, i._id),
          mode: pickVal(i.mode, i.game_mode, "info"),
          status: pickVal(i.status, i.state),
          from: {
            ad: pickVal(i.from_ad, i.from?.ad, i.from_name, i.sender_ad),
            soyad: pickVal(i.from_soyad, i.from?.soyad, i.sender_soyad),
            user_code: String(
              pickVal(i.from_user_code, i.from?.user_code, i.sender_user_code)
            ).toUpperCase(),
          },
        }))
      );

      setOutgoing(
        (rout?.invites || []).map((i) => ({
          id: pickVal(i.id, i.invite_id, i._id),
          mode: pickVal(i.mode, i.game_mode, "info"),
          status: pickVal(i.status, i.state),
          to: {
            ad: pickVal(i.to_ad, i.to?.ad, i.receiver_ad, i.to_name),
            soyad: pickVal(i.to_soyad, i.to?.soyad, i.receiver_soyad),
            user_code: String(
              pickVal(i.to_user_code, i.to?.user_code, i.receiver_user_code)
            ).toUpperCase(),
          },
        }))
      );
    } catch (_) {
    } finally {
      setListsLoading(false);
    }
  }, [user?.id]);

  // Kazanma/Kaybetme istatistikleri
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const d = await getDuelloStats(user.id);
      const wins = d?.wins ?? d?.win ?? d?.total_wins ?? 0;
      const losses = d?.losses ?? d?.lose ?? d?.total_losses ?? 0;
      const draws = d?.draws ?? d?.draw ?? 0;
      setDuelStats({ wins, losses, draws });
    } catch {
      setDuelStats(null);
    }
  }, [user?.id]);

  // İlk yükleme
  useEffect(() => {
    if (!user?.id) return;
    fetchProfile();
    fetchLists();
    fetchStats();
  }, [user?.id, fetchProfile, fetchLists, fetchStats]);

  // SSE: davet olaylarını canlı dinle
  useEffect(() => {
    if (!user?.id) return;

    const es = openDuelloEventStream({
      apiUrl: API,
      userId: user.id,
      handlers: {
        "invite:new": ({ invite, from }) => {
          const iid = invite?.id;
          if (!iid) return;
          setIncoming((prev) => {
            if (Array.isArray(prev) && prev.some((x) => x.id === iid)) return prev;
            return [
              {
                id: iid,
                mode: invite?.mode || "info",
                status: "pending",
                from: {
                  ad: from?.ad || "",
                  soyad: from?.soyad || "",
                  user_code: String(from?.user_code || "").toUpperCase(),
                },
              },
              ...(prev || []),
            ];
          });
        },
        "invite:accepted": ({ invite_id, match_id }) => {
          setIncoming((prev) =>
            Array.isArray(prev) ? prev.filter((x) => x.id !== invite_id) : prev
          );
          setOutgoing((prev) =>
            Array.isArray(prev) ? prev.filter((x) => x.id !== invite_id) : prev
          );
          if (match_id) {
            navigate(`/duello/${match_id}`);
          } else {
            fetchLists();
          }
        },
        "invite:rejected": ({ invite_id }) => {
          setOutgoing((prev) =>
            Array.isArray(prev) ? prev.filter((x) => x.id !== invite_id) : prev
          );
          setIncoming((prev) =>
            Array.isArray(prev) ? prev.filter((x) => x.id !== invite_id) : prev
          );
        },
        "invite:cancelled": ({ invite_id }) => {
          setOutgoing((prev) =>
            Array.isArray(prev) ? prev.filter((x) => x.id !== invite_id) : prev
          );
          setIncoming((prev) =>
            Array.isArray(prev) ? prev.filter((x) => x.id !== invite_id) : prev
          );
        },
      },
    });

    return () => {
      try {
        es?.close?.();
      } catch {}
    };
  }, [user?.id, navigate, fetchLists]);

  // Gönderen tarafta: pending outbox varken aktif maçı poll et
  useEffect(() => {
    if (!user?.id) return;
    const hasPending = outgoing?.some((i) => i.status === "pending");
    if (!hasPending) return;

    let stop = false;
    let t = null;

    const tick = async () => {
      try {
        const d = await activeMatch(user.id);
        if (!stop && d?.success && d?.match_id) {
          navigate(`/duello/${d.match_id}`);
          return;
        }
      } catch (_) {}
      if (!stop) t = setTimeout(tick, 2000);
    };

    tick();
    return () => {
      stop = true;
      if (t) clearTimeout(t);
    };
  }, [user?.id, outgoing, navigate]);

  // Ready değiştir
  const toggleReady = async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const d = await apiSetReady({ user_id: user.id, ready: !ready });
      if (d?.success) setReady((v) => !v);
    } catch (_) {
    } finally {
      setProfileLoading(false);
    }
  };

  // Hazır & herkese açık rastgele rakip arayıp sadece DAVET gönder
  const fetchRandomReadyOpponent = useCallback(async () => {
    if (!user?.id) return null;

    const urls = [
      `${API}/api/duello/random-ready?exclude_user_id=${user.id}`,
      `${API}/api/duello/ready/random?exclude=${user.id}`,
      `${API}/api/random-ready?exclude=${user.id}`,
    ];

    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const d = await r.json();
        const u = d?.user || d?.opponent || d || {};
        const code = String(u?.user_code || u?.code || "").toUpperCase();
        const ad = u?.ad || u?.name || "";
        const soyad = u?.soyad || u?.surname || "";
        if (code && String(u?.id || "") !== String(user.id)) {
          return { code, ad, soyad };
        }
      } catch (_) {}
    }
    return null;
  }, [user?.id]);

  const doRandom = async () => {
    setInfo("");
    if (!user?.id) return;
    if (!ready) {
      setInfo("Rastgele eşleşme için önce “Hazırım”ı AÇIK yap.");
      return;
    }

    setRandLoading(true);
    try {
      const opp = await fetchRandomReadyOpponent();
      if (!opp) {
        setInfo("Şu an hazır rakip bulunamadı.");
        return;
      }

      const d = await createInvite({
        from_user_id: user.id,
        to_user_code: opp.code,
        mode: inviteMode,
      });

      if (d?.success) {
        pushRecent({ code: opp.code, ad: opp.ad, soyad: opp.soyad });
        await fetchLists();
        setInfo("Davet gönderildi. Kabul edilince düello başlayacak.");
      } else {
        setInfo("Davet gönderilemedi.");
      }
    } catch (e) {
      setInfo(e?.message || "Rastgele davet gönderilemedi.");
    } finally {
      setRandLoading(false);
    }
  };

  // Davet işlemleri
  const sendInvite = async () => {
    setInfo("");
    if (!user?.id || !targetCode.trim()) {
      setInfo("Hedef user_code yazmalısın.");
      return;
    }
    setSending(true);
    try {
      const d = await createInvite({
        from_user_id: user.id,
        to_user_code: targetCode.trim(),
        mode: inviteMode,
      });
      if (d?.success) {
        const codeUp = String(targetCode).toUpperCase();
        pushRecent({ code: codeUp });
        setTargetCode("");
        await fetchLists();
      }
    } catch (e) {
      setInfo(e?.message || "Davet gönderilemedi (ağ/CORS).");
    } finally {
      setSending(false);
    }
  };

  const act = async (id, action) => {
    try {
      const mapped = action === "decline" ? "reject" : action;
      const inc = (incoming || []).find((x) => x.id === id);
      const out = (outgoing || []).find((x) => x.id === id);
      const opp = inc ? inc.from : out ? out.to : null;

      if (mapped === "accept" || mapped === "reject") {
        const d = await respondInvite({
          invite_id: id,
          user_id: user.id,
          action: mapped,
        });
        if (d?.success && mapped === "accept" && opp?.user_code) {
          pushRecent({
            code: opp.user_code,
            ad: opp.ad,
            soyad: opp.soyad,
          });
        }
        if (d?.success && d?.match?.id) {
          navigate(`/duello/${d.match.id}`);
          return;
        }
      } else if (mapped === "cancel") {
        await cancelInvite({ invite_id: id, user_id: user.id });
      }
      await fetchLists();
    } catch (_) {}
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-700">
        <div className="text-white font-semibold">Yükleniyor…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-cyan-700 px-3 py-6 flex items-center justify-center">
      <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md p-6">
        {/* ÜST BAŞLIK */}
        <div className="flex items-center gap-3 mb-4 w-full">
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
            <h1 className="text-2xl font-extrabold text-cyan-700 truncate">
              {user.ad} {user.soyad}
            </h1>
            <div className="text-xs text-gray-500 mt-0.5">Düello Lobi</div>

            {/* KOD */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono text-sm">
                Kodun: <b className="tracking-wider">{userCode || "—"}</b>
              </span>
              <button
                type="button"
                onClick={copyUserCode}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-700 active:scale-95"
                disabled={!userCode}
              >
                {copied ? "Kopyalandı ✓" : "Kopyala"}
              </button>
            </div>
          </div>
        </div>

        {/* PROFİL */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-3">
          <div className="text-[15px] font-semibold text-gray-800 mb-2">Profil</div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              Hazırım:{" "}
              <b className={ready ? "text-emerald-700" : "text-gray-500"}>
                {ready ? "AÇIK" : "KAPALI"}
              </b>
            </div>
            <button
              className="px-3 py-1.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-800 active:scale-95 disabled:opacity-50"
              onClick={toggleReady}
              disabled={profileLoading}
            >
              Değiştir
            </button>
          </div>

          {/* Rastgele düello (davet yollar) */}
          <div className="mt-3">
            <button
              type="button"
              onClick={doRandom}
              disabled={randLoading || !ready}
              className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-800 active:scale-95 disabled:opacity-50"
              title="Hazırken rastgele biriyle eşleşme daveti gönder"
            >
              {randLoading ? "Rastgele rakip aranıyor…" : "Rastgele düello"}
            </button>
            {!ready && (
              <div className="text-xs text-red-600 mt-1">
                Rastgele davet için “Hazırım” AÇIK olmalı.
              </div>
            )}
          </div>

          {/* Kazanma / Kaybetme istatistikleri */}
          {duelStats && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-center py-2">
                <div className="text-[11px] text-emerald-700">Kazandığın</div>
                <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
                  {duelStats.wins}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 text-center py-2">
                <div className="text-[11px] text-rose-700">Kaybettiğin</div>
                <div className="text-xl font-extrabold text-rose-700 tabular-nums">
                  {duelStats.losses}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 text-center py-2">
                <div className="text-[11px] text-gray-700">Berabere</div>
                <div className="text-xl font-extrabold text-gray-700 tabular-nums">
                  {duelStats.draws}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DAVET GÖNDER */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-3">
          <div className="text-[15px] font-semibold text-gray-800 mb-2">Davet Gönder</div>

          <div className="mb-2">
            <div className="flex gap-2 flex-wrap select-none">
              <button
                type="button"
                onClick={() => setInviteMode("info")}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${
                  inviteMode === "info"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Bilgi
              </button>
              <button
                type="button"
                onClick={() => setInviteMode("speed")}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${
                  inviteMode === "speed"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Hız
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:outline-none text-sm"
              placeholder="Hedef user_code"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
            />
            <button
              className="px-3 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-800 active:scale-95 disabled:opacity-50"
              onClick={sendInvite}
              disabled={sending}
            >
              Gönder
            </button>
          </div>

          <div className="text-[11px] text-gray-500 mt-2">
            Not: user_code kutusuna “ABC123” gibi kod giriyorsun.
          </div>

          {/* Son düello yaptıkların */}
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Son düello yaptıkların:</div>

            {recentOpps.length === 0 ? (
              <div className="text-xs text-gray-400">Henüz yok</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentOpps.map((o, i) => (
                  <button
                    key={`${o.code}-${i}`}
                    type="button"
                    onClick={() => setTargetCode(String(o.code).toUpperCase())}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-emerald-100 text-gray-800 text-sm font-semibold border border-gray-200"
                    title={`Kodu doldur: ${o.code}`}
                  >
                    {(o.ad || o.soyad) ? `${o.ad || ""} ${o.soyad || ""}`.trim() : o.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {info && <div className="mt-2 text-sm text-red-600">{info}</div>}
        </div>

        {/* GELEN / GİDEN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-[15px] font-semibold text-gray-800 mb-2">Gelen Davet</div>
            {listsLoading ? (
              <div className="text-sm text-gray-500">Yükleniyor…</div>
            ) : incoming.length === 0 ? (
              <div className="text-sm text-gray-500">Boş</div>
            ) : (
              <ul className="space-y-2">
                {incoming.map((i) => (
                  <li
                    key={i.id}
                    className="border border-gray-200 rounded-xl p-2 text-sm"
                  >
                    <div className="font-semibold text-gray-800">
                      {i.from?.ad} {i.from?.soyad}{" "}
                      <span className="text-gray-500">({i.mode})</span>
                    </div>
                    <div className="mt-1 flex gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-800"
                        onClick={() => act(i.id, "accept")}
                      >
                        Kabul Et
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 text-gray-700 hover:bg-gray-300"
                        onClick={() => act(i.id, "decline")}
                      >
                        Reddet
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-[15px] font-semibold text-gray-800 mb-2">Giden Davet</div>
            {listsLoading ? (
              <div className="text-sm text-gray-500">Yükleniyor…</div>
            ) : outgoing.length === 0 ? (
              <div className="text-sm text-gray-500">Boş</div>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((i) => (
                  <li
                    key={i.id}
                    className="border border-gray-200 rounded-xl p-2 text-sm"
                  >
                    <div className="font-semibold text-gray-800">
                      {i.to?.ad} {i.to?.soyad}{" "}
                      <span className="text-gray-500">({i.mode})</span>
                    </div>
                    {i.status === "pending" && (
                      <div className="mt-1">
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-700"
                          onClick={() => act(i.id, "cancel")}
                        >
                          İptal Et
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Alt */}
        <div className="mt-5">
          <Link
            to="/user"
            className="block w-full text-center py-2 rounded-2xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition"
          >
            ← Panele Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
