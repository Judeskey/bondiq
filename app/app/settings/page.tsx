"use client";

import { useEffect, useMemo, useState } from "react";

const LOVE = ["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"] as const;
type LoveTag = (typeof LOVE)[number];

function labelFor(tag: LoveTag) {
  switch (tag) {
    case "WORDS":
      return "Words of Affirmation";
    case "TIME":
      return "Quality Time";
    case "GIFTS":
      return "Thoughtful Gifts";
    case "SERVICE":
      return "Acts of Support";
    case "TOUCH":
      return "Physical Touch";
    default:
      return tag;
  }
}

function toggleUpTo3(setter: (fn: (prev: LoveTag[]) => LoveTag[]) => void, t: LoveTag) {
  setter((prev) => {
    if (prev.includes(t)) return prev.filter((x) => x !== t);
    if (prev.length >= 3) return prev;
    return [...prev, t];
  });
}

function isLikelyHttpUrl(s: string) {
  const t = (s || "").trim();
  if (!t) return true; // allow blank
  return /^https?:\/\/.+/i.test(t);
}

function isDataImageUrl(s: string) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test((s || "").trim());
}

function guessLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function getTimezones(): string[] {
  // Best case (modern browsers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyIntl: any = Intl as any;
  try {
    if (typeof anyIntl?.supportedValuesOf === "function") {
      const zones = anyIntl.supportedValuesOf("timeZone");
      if (Array.isArray(zones) && zones.length) return zones;
    }
  } catch {
    // ignore
  }

  // Safe fallback list (small but useful)
  return [
    "UTC",
    "America/Toronto",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Africa/Lagos",
    "Africa/Accra",
    "Africa/Nairobi",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];
}

async function fileToSmallAvatarDataUrl(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  // Hard limits to keep DB safe (you can tune)
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
  if (file.size > 2_000_000) throw new Error("Image too large. Please use an image under 2MB.");

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      URL.revokeObjectURL(url);
      resolve(el);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    el.src = url;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Invalid image.");

  const scale = Math.min(1, maxSize / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  ctx.drawImage(img, 0, 0, tw, th);

  // Use jpeg for compactness unless png/webp preferred
  const mime = "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, quality);

  // Extra safety: keep it reasonably small
  if (dataUrl.length > 350_000) {
    // ~350KB string-ish
    throw new Error("Avatar still too large. Try a smaller image.");
  }

  return dataUrl;
}

type MemberInfo = {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  nickname: string | null;
  label: string;
};

type CoupleInfo = {
  viewerUserId: string;
  viewerLabel: string;
  partnerLabel: string;
  members: MemberInfo[];
  couple: { id: string; status: string };
};

export default function SettingsPage() {
  // ✅ PROFILE state
  const [profileName, setProfileName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Avatar upload UX
  const [avatarBusy, setAvatarBusy] = useState(false);

  // ✅ TIMEZONE dropdown
  const tzOptions = useMemo(() => getTimezones(), []);
  const [tzQuery, setTzQuery] = useState("");
  const filteredTz = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return tzOptions;
    return tzOptions.filter((z) => z.toLowerCase().includes(q));
  }, [tzQuery, tzOptions]);

  // ✅ PARTNER NICKNAME state
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo | null>(null);
  const partner = useMemo(() => {
    if (!coupleInfo) return null;
    return coupleInfo.members.find((m) => m.userId !== coupleInfo.viewerUserId) || null;
  }, [coupleInfo]);

  const [partnerNickname, setPartnerNickname] = useState("");
  const [savingNick, setSavingNick] = useState(false);
  const [nickMsg, setNickMsg] = useState<string | null>(null);

  // ✅ LOVE PROFILE state
  const [primary, setPrimary] = useState<LoveTag[]>([]);
  const [secondary, setSecondary] = useState<LoveTag[]>([]);
  const [avoidJson, setAvoidJson] = useState("");

  const [savingLove, setSavingLove] = useState(false);
  const [loveMsg, setLoveMsg] = useState<string | null>(null);

  // ✅ PASSWORD state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const primaryCount = primary.length;
  const secondaryCount = secondary.length;

  const primaryHint = useMemo(() => {
    if (primaryCount >= 3) return "Max selected (3).";
    return `You can select ${3 - primaryCount} more.`;
  }, [primaryCount]);

  const secondaryHint = useMemo(() => {
    if (secondaryCount >= 3) return "Max selected (3).";
    return `You can select ${3 - secondaryCount} more.`;
  }, [secondaryCount]);

  async function loadProfile() {
    setProfileMsg(null);
    try {
      const r = await fetch("/api/settings/profile", { method: "GET", cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return;

      const u = d?.user || {};
      setProfileName(typeof u?.name === "string" ? u.name : "");
      setProfileImageUrl(typeof u?.profileImageUrl === "string" ? u.profileImageUrl : "");
      setProfileTimezone(typeof u?.timezone === "string" ? u.timezone : "");
    } catch {
      // ignore
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);

    const nm = profileName.trim();
    const avatar = profileImageUrl.trim();
    const tz = profileTimezone.trim();

    if (nm.length < 2) {
      setProfileMsg("Name must be at least 2 characters.");
      return;
    }

    if (avatar && !(isLikelyHttpUrl(avatar) || isDataImageUrl(avatar))) {
      setProfileMsg("Avatar must be a valid http(s) URL, or an uploaded image.");
      return;
    }

    setSavingProfile(true);
    try {
      const r = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          profileImageUrl: avatar || null,
          timezone: tz || null,
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setProfileMsg(d?.error || "Failed to save profile.");
        return;
      }

      setProfileMsg("Profile saved ✅");
      await loadProfile();
    } catch (err: any) {
      setProfileMsg(err?.message || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function loadCouple() {
    try {
      const res = await fetch("/api/couple/members", { method: "GET", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoupleInfo(null);
        return;
      }
      setCoupleInfo(data);

      const meId = data?.viewerUserId as string | undefined;
      const members = Array.isArray(data?.members) ? (data.members as MemberInfo[]) : [];
      const p = meId ? members.find((m) => m.userId !== meId) : null;
      setPartnerNickname(p?.nickname || "");
    } catch {
      setCoupleInfo(null);
    }
  }

  async function saveNickname(e: React.FormEvent) {
    e.preventDefault();
    setNickMsg(null);

    if (!partner?.userId) {
      setNickMsg("No partner connected yet.");
      return;
    }

    const nick = partnerNickname.trim();

    if (nick && nick.length < 2) {
      setNickMsg("Nickname must be at least 2 characters (or leave blank to clear).");
      return;
    }

    setSavingNick(true);
    try {
      const r = await fetch("/api/settings/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: partner.userId,
          nickname: nick,
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setNickMsg(d?.error || "Failed to save nickname.");
        return;
      }

      setNickMsg(nick ? "Nickname saved ✅" : "Nickname cleared ✅");
      await loadCouple();
    } catch (err: any) {
      setNickMsg(err?.message || "Failed to save nickname.");
    } finally {
      setSavingNick(false);
    }
  }

  async function loadLoveProfile() {
    setLoveMsg(null);
    try {
      const r = await fetch("/api/love-profile/me", { method: "GET", cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return;

      setPrimary(Array.isArray(d?.primaryLanguages) ? d.primaryLanguages : []);
      setSecondary(Array.isArray(d?.secondaryLanguages) ? d.secondaryLanguages : []);

      if (Array.isArray(d?.avoidList)) setAvoidJson(JSON.stringify(d.avoidList, null, 2));
      else setAvoidJson("");
    } catch {
      // ignore
    }
  }

  async function saveLoveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoveMsg(null);
    setSavingLove(true);

    try {
      let avoidList: string[] | null = null;
      const trimmed = avoidJson.trim();
      if (trimmed) {
        const parsed = JSON.parse(trimmed);
        avoidList = Array.isArray(parsed) ? parsed.map(String) : null;
      }

      const r = await fetch("/api/love-profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryLanguages: primary,
          secondaryLanguages: secondary,
          avoidList,
        }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setLoveMsg(d?.error || "Failed to save love profile.");
        return;
      }

      setLoveMsg("Love profile saved ✅");
      loadLoveProfile();
    } catch (err: any) {
      setLoveMsg(err?.message || "Failed to save love profile.");
    } finally {
      setSavingLove(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setMsg("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Failed to update password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setMsg("Password updated ✅ You can now sign in with password next time.");
    } catch (err: any) {
      setMsg(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    loadCouple();
    loadLoveProfile();

    // Pre-fill timezone if empty
    setProfileTimezone((prev) => prev || guessLocalTimezone());
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile */}
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-slate-700">
          Update your name, BondIQ avatar, and timezone for a more personal experience.
        </p>

        <form className="mt-4 space-y-4" onSubmit={saveProfile}>
          <div>
            <label className="block text-sm font-medium">Your name</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g., Jane Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">BondIQ avatar</label>

            <div className="mt-2 flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border bg-white">
                {profileImageUrl ? (
                  // Works for both http(s) and data:image/*
                  <img src={profileImageUrl} alt="Avatar preview" className="h-12 w-12 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center text-xs text-slate-400">
                    —
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={avatarBusy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setProfileMsg(null);
                    setAvatarBusy(true);
                    try {
                      const dataUrl = await fileToSmallAvatarDataUrl(f, 256, 0.85);
                      setProfileImageUrl(dataUrl);
                      setProfileMsg("Avatar loaded ✅ Click “Save profile” to apply.");
                    } catch (err: any) {
                      setProfileMsg(err?.message || "Failed to load avatar.");
                    } finally {
                      setAvatarBusy(false);
                      e.currentTarget.value = "";
                    }
                  }}
                />

                <button
                  type="button"
                  className="w-fit rounded-md border px-3 py-1 text-sm disabled:opacity-60"
                  disabled={!profileImageUrl}
                  onClick={() => setProfileImageUrl("")}
                >
                  Remove avatar
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium">Avatar URL (optional)</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={isDataImageUrl(profileImageUrl) ? "" : profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <div className="mt-1 text-xs text-slate-500">
                Upload is recommended. URL is optional.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Timezone</label>

            <div className="mt-2 grid gap-2">
              <input
                className="w-full rounded-md border px-3 py-2"
                value={tzQuery}
                onChange={(e) => setTzQuery(e.target.value)}
                placeholder="Search timezone… (e.g., Toronto)"
              />

              <select
                className="w-full rounded-md border px-3 py-2"
                value={profileTimezone}
                onChange={(e) => setProfileTimezone(e.target.value)}
              >
                <option value="">Select your timezone…</option>
                {filteredTz.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>

              <div className="text-xs text-slate-500">
                Uses IANA timezones like <span className="font-mono">America/Toronto</span>.
              </div>
            </div>
          </div>

          <button
            disabled={savingProfile}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>

          {profileMsg && <div className="text-sm text-slate-700">{profileMsg}</div>}
        </form>
      </section>

      {/* Partner nickname */}
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Partner nickname</h2>
        <p className="mt-1 text-sm text-slate-700">
          Set a nickname for your partner (this will replace their name in your reports).
        </p>

        {!partner ? (
          <div className="mt-3 text-sm text-slate-600">No partner connected yet.</div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={saveNickname}>
            <div className="text-sm text-slate-600">
              Partner:{" "}
              <span className="font-medium text-slate-900">{partner.name || partner.email || partner.label}</span>
            </div>

            <div>
              <label className="block text-sm font-medium">Nickname</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={partnerNickname}
                onChange={(e) => setPartnerNickname(e.target.value)}
                placeholder="e.g., Angel"
              />
              <div className="mt-1 text-xs text-slate-500">Leave blank and save to clear.</div>
            </div>

            <button
              disabled={savingNick}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {savingNick ? "Saving…" : "Save nickname"}
            </button>

            {nickMsg && <div className="text-sm text-slate-700">{nickMsg}</div>}
          </form>
        )}
      </section>

      {/* Love Profile */}
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Love Profile</h2>
        <p className="mt-1 text-sm text-slate-700">
          Love languages can change over time — update yours anytime.
        </p>

        <form className="mt-4 space-y-5" onSubmit={saveLoveProfile}>
          <div>
            <div className="font-medium">Primary love languages (select up to 3)</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LOVE.map((t) => (
                <label key={t} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <input type="checkbox" checked={primary.includes(t)} onChange={() => toggleUpTo3(setPrimary, t)} />
                  <span>{labelFor(t)}</span>
                </label>
              ))}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Selected: {primaryCount}/3 • {primaryHint}
            </div>
          </div>

          <div>
            <div className="font-medium">Secondary love languages (select up to 3)</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LOVE.map((t) => (
                <label key={t} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={secondary.includes(t)}
                    onChange={() => toggleUpTo3(setSecondary, t)}
                  />
                  <span>{labelFor(t)}</span>
                </label>
              ))}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Selected: {secondaryCount}/3 • {secondaryHint}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Avoid list (optional JSON)</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={6}
                value={avoidJson}
                onChange={(e) => setAvoidJson(e.target.value)}
                placeholder='Example: ["sarcasm","silent treatment"]'
              />
            </div>

            <div className="text-sm text-slate-600">
              <div className="font-medium text-slate-800">Note</div>
              <p className="mt-1">We’ll keep your love languages editable here (primary + secondary).</p>
            </div>
          </div>

          <button disabled={savingLove} className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60">
            {savingLove ? "Saving…" : "Save love profile"}
          </button>

          {loveMsg && <div className="text-sm text-slate-700">{loveMsg}</div>}
        </form>
      </section>

      {/* Password */}
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-slate-700">
          If you signed in with an email link, set a password here for faster sign-in next time.
        </p>

        <form className="mt-4 space-y-3" onSubmit={savePassword}>
          <div>
            <label className="block text-sm font-medium">Current password (only if you already set one)</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="Current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">New password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Confirm new password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="Repeat new password"
            />
          </div>

          <button disabled={loading} className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60">
            {loading ? "Saving…" : "Save password"}
          </button>

          {msg && <div className="text-sm text-slate-700">{msg}</div>}
        </form>
      </section>
    </main>
  );
}
