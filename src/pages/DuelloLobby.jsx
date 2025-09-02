// src/pages/DuelloLobby.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API,                             // performans fetch'i için taban URL
  getProfile as apiGetProfile,
  setReady as apiSetReady,
  setVisibility as apiSetVisibility,
  createInvite,
  inbox,
  outbox,
  respondInvite,
  cancelInvite,
  activeMatch,
  getUserCode as apiGetUserCode,
} from "../api/duello";

// Görünürlük etiket çevirisi (ekranda Türkçe göster, backend değerleri aynı kalsın)
const VISIBILITY_TR = {
  public:  "Herkese Açık",
  friends: "Sadece Arkadaşlar",
  none:    "Gizli",
};
const fmtVisibility = (v) => VISIBILITY_TR[String(v || "").toLowerCase()] || v || "";

/* === Felox universal user storage (UserPanel ile aynı mantık) === */
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

export default function DuelloLobby() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  // --- Avatar için ek state'ler
  const [avatarManifest, setAvatarManifest] = useState(null);
  const [bestTitle, setBestTitle] = useState("");

  // --- User code için ek state
  const [userCode, setUserCode] = useState("");
  const [copied, setCopied] = useState(false);

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
    if (/(^|[\s_/.-])(kadin|bayan|female|woman)([\s_/.-]|$)/.test(s)) return "female";
    return "unknown";
  }, [user?.cinsiyet]);

  // Manifesti yükle (bir kere)
  useEffect(() => {
    fetch("/avatars/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAvatarManifest(d))
      .catch(() => {});
  }, []);

  // En iyi başlık (avatar seçimi için hafif versiyon)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/user/${user.id}/performance`);
        const d = await r.json();
        if (d?.success && Array.isArray(d.performance) && d.performance.length) {
          const top = d.performance.reduce(
            (a, b) => ((b?.net_points || 0) > (a?.net_points || 0) ? b : a),
            d.performance[0]
          );
          setBestTitle(top?.title || "");
        } else {
          setBestTitle("");
        }
      } catch {
        setBestTitle("");
      }
    })();
  }, [user?.id]);

  // Avatar URL üret
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

  // --- Profil
  const [ready, setReady] = useState(false);
  const [visibility, setVisibility] = useState("public"); // public | friends | none
  const [profileLoading, setProfileLoading] = useState(true);

  // --- Davet gönder
  const [inviteMode, setInviteMode] = useState("info"); // 'info' | 'speed'
  const [targetCode, setTargetCode] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState("");

  // --- Gelen / Giden kutuları
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  // === SON RAKİPLER (yerel hafıza)
  const RECENTS_KEY = "felox_duello_recents";
  const [recentLocal, setRecentLocal] = useState([]);

  // Yerelden yükle
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
      setRecentLocal(Array.isArray(arr) ? arr : []);
    } catch {}
  }, []);
  // Yerele yaz
  useEffect(() => {
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify((recentLocal || []).slice(0, 12)));
    } catch {}
  }, [recentLocal]);

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

  // Kod -> ad/soyad çöz (listelerden ya da recents'ten)
  const resolveNameByCode = useCallback((code) => {
    const C = String(code || "").toUpperCase();
    if (!C) return null;

    const fromOut = (outgoing || []).find(
      i => String(i?.to?.user_code || "").toUpperCase() === C
    )?.to;
    const fromIn = (incoming || []).find(
      i => String(i?.from?.user_code || "").toUpperCase() === C
    )?.from;

    const p = fromOut || fromIn;
    if (p && (p.ad || p.soyad)) return { ad: p.ad || "", soyad: p.soyad || "" };

    const loc = (recentLocal || []).find(x => x.code === C);
    if (loc && (loc.ad || loc.soyad)) return { ad: loc.ad || "", soyad: loc.soyad || "" };

    return null;
  }, [incoming, outgoing, recentLocal]);

  // Son oynadıklarım (3 kişi)
  const recentOpps = useMemo(() => {
    const acc = [];
    const add = (code, ad, soyad, ts = 0) => {
      const C = String(code || "").toUpperCase();
      if (!C) return;
      if (acc.some((x) => x.code === C)) return;
      acc.push({ code: C, ad: ad || "", soyad: soyad || "", ts });
    };

    // 1) yerel hafıza
    (recentLocal || []).forEach((x) => add(x.code, x.ad, x.soyad, x.ts || 0));
    // 2) aktif kutular
    (outgoing || []).forEach((i) => add(i?.to?.user_code,   i?.to?.ad,   i?.to?.soyad, 0));
    (incoming || []).forEach((i) => add(i?.from?.user_code, i?.from?.ad, i?.from?.soyad, 0));

    acc.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return acc.slice(0, 3);
  }, [incoming, outgoing, recentLocal]);

  // === USER ===
  useEffect(() => {
    getFeloxUser().then((u) => {
      if (!u) { window.location.href = "/login"; return; }
      setUser(u);
    });
  }, []);

  // User code'u getir (önce user objesinden, yoksa backend)
  useEffect(() => {
    if (!user?.id) return;
    if (user?.user_code) {
      setUserCode(user.user_code);
      return;
    }
    apiGetUserCode(user.id)
      .then(d => { if (d?.success && d.user_code) setUserCode(d.user_code); })
      .catch(() => {});
  }, [user?.id, user?.user_code]);

  const copyUserCode = async () => {
    if (!userCode) return;
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = userCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  /* =================== API UYUMLU FONKSİYONLAR =================== */

  // PROFİLİ GETİR
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const d = await apiGetProfile(user.id);
      if (d?.success && d.profile) {
        setReady(!!d.profile.ready);
        setVisibility(d.profile.visibility_mode || "public");
      }
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  // GELEN/GİDEN KUTULARI GETİR  (isimleri de öğren)
  const fetchLists = useCallback(async () => {
    if (!user?.id) return;
    setListsLoading(true);
    try {
      const [rin, rout] = await Promise.all([inbox(user.id), outbox(user.id)]);
      const _first = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "") ?? "";

      const inc = (rin?.invites || []).map(i => ({
        id: _first(i.id, i.invite_id, i._id),
        mode: _first(i.mode, i.game_mode, "info"),
        status: _first(i.status, i.state),
        from: {
          ad: _first(i.from_ad, i.from_name, i.sender_ad, i.sender_name, i.from?.ad, i.from?.name),
          soyad: _first(i.from_soyad, i.sender_soyad, i.from?.soyad, i.from?.surname),
          user_code: String(_first(
            i.from_user_code, i.sender_user_code, i.from_code, i.fromUserCode, i.from?.user_code, i.from?.code
          ) || "").toUpperCase(),
        },
      }));

      const out = (rout?.invites || []).map(i => ({
        id: _first(i.id, i.invite_id, i._id),
        mode: _first(i.mode, i.game_mode, "info"),
        status: _first(i.status, i.state),
        to: {
          ad: _first(i.to_ad, i.to_name, i.receiver_ad, i.receiver_name, i.to?.ad, i.to?.name),
          soyad: _first(i.to_soyad, i.receiver_soyad, i.to?.soyad, i.to?.surname),
          user_code: String(_first(
            i.to_user_code, i.receiver_user_code, i.to_code, i.toUserCode, i.to?.user_code, i.to?.code
          ) || "").toUpperCase(),
        },
      }));

      setIncoming(inc);
      setOutgoing(out);

      // Yeni/eksik isimleri recents'e işle
      setRecentLocal(prev => {
        const map = new Map((prev || []).map(x => [x.code, x]));
        const upsert = (code, ad, soyad) => {
          const C = String(code || "").toUpperCase();
          if (!C) return;
          const cur = map.get(C);
          if (!cur) {
            map.set(C, { code: C, ad: ad || "", soyad: soyad || "", ts: Date.now() });
          } else if ((!cur.ad && ad) || (!cur.soyad && soyad)) {
            map.set(C, { ...cur, ad: cur.ad || ad || "", soyad: cur.soyad || soyad || "" });
          }
        };

        inc.forEach(i => upsert(i.from.user_code, i.from.ad, i.from.soyad));
        out.forEach(i => upsert(i.to.user_code, i.to.ad, i.to.soyad));

        return Array.from(map.values())
          .sort((a, b) => (b.ts || 0) - (a.ts || 0))
          .slice(0, 12);
      });
    } finally {
      setListsLoading(false);
    }
  }, [user?.id]);

  // İlk yüklemede profili ve listeleri çek
  useEffect(() => {
    if (!user?.id) return;
    fetchProfile();
    fetchLists();
  }, [user?.id, fetchProfile, fetchLists]);

  // Gönderen tarafta maça otomatik geç (pending outbox varken)
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
      } catch {
        // sessiz geç
      }
      if (!stop) t = setTimeout(tick, 2000);
    };

    tick();
    return () => { stop = true; if (t) clearTimeout(t); };
  }, [user?.id, outgoing, navigate]);

  // HAZIRLIK (READY) DEĞİŞTİR
  const toggleReady = async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const d = await apiSetReady({ user_id: user.id, ready: !ready });
      if (d?.success) setReady(v => !v);
    } finally {
      setProfileLoading(false);
    }
  };

  // GÖRÜNÜRLÜK DEĞİŞTİR
  const changeVisibility = async (v) => {
    if (!user?.id) return;
    setVisibility(v); // optimistic
    try { await apiSetVisibility({ user_id: user.id, visibility_mode: v }); } catch {}
  };

  // DAVET GÖNDER
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
        mode: inviteMode, // 'info' | 'speed'
      });
      if (d?.success) {
        const codeUp = String(targetCode).toUpperCase();
        const known = resolveNameByCode(codeUp); // mevcut listelerden/yerelden isim varsa al
        pushRecent({ code: codeUp, ad: known?.ad, soyad: known?.soyad });
        setTargetCode("");
        await fetchLists();
      }
    } catch (e) {
      setInfo(e?.message || "Davet gönderilemedi (ağ/CORS).");
    } finally {
      setSending(false);
    }
  };

  // KABUL/RET/İPTAL
  const act = async (id, action) => {
    try {
      const mapped = action === "decline" ? "reject" : action; // UI geriye dönük

      // Bu davetin karşı tarafını çıkar (incoming -> from, outgoing -> to)
      const inc = (incoming || []).find((x) => x.id === id);
      const out = (outgoing || []).find((x) => x.id === id);
      const opp = inc ? inc.from : (out ? out.to : null);

      if (mapped === "accept" || mapped === "reject") {
        const d = await respondInvite({ invite_id: id, user_id: user.id, action: mapped });

        if (d?.success && mapped === "accept" && opp?.user_code) {
          pushRecent({ code: opp.user_code, ad: opp.ad, soyad: opp.soyad });
        }

        if (d?.success && d?.match?.id) {
          navigate(`/duello/${d.match.id}`);
          return;
        }
      } else if (mapped === "cancel") {
        await cancelInvite({ invite_id: id, user_id: user.id });
      }

      await fetchLists();
    } catch {
      // sessiz geç; istersen burada setInfo ile mesaj gösterebilirsin
    }
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
        {/* === ÜST BAŞLIK: Avatar + İsim + KOD === */}
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

            {/* KULLANICI KODU */}
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

        {/* PROFİL KARTI */}
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

          <div className="mt-3">
            <div className="text-sm mb-1">Görünürlük:</div>
            <div className="flex gap-2 flex-wrap">
              {["public", "friends", "none"].map((v) => (
                <button
                  key={v}
                  onClick={() => changeVisibility(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    visibility === v
                      ? "bg-cyan-600 text-white border-cyan-600"
                      : "bg-white text-cyan-700 border-cyan-200 hover:border-cyan-400"
                  }`}
                  title={fmtVisibility(v)}
                  aria-label={fmtVisibility(v)}
                >
                  {fmtVisibility(v)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DAVET GÖNDER KARTI */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-3">
          <div className="text-[15px] font-semibold text-gray-800 mb-2">Davet Gönder</div>

          <div className="mb-2">
            <div className="text-sm text-gray-600 mb-1">Mod:</div>
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

          {recentOpps.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Son düello yaptıkların:</div>
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
            </div>
          )}

          {info && (
            <div className="mt-2 text-sm text-red-600">
              {info}
            </div>
          )}
        </div>

        {/* GELEN / GİDEN KUTULARI */}
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
                      {i.from?.ad} {i.from?.soyad} <span className="text-gray-500">({i.mode})</span>
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

        {/* Alt aksiyonlar */}
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
