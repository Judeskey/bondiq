"use client";

import { useEffect, useMemo, useState } from "react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToHHMM(mins: number) {
  const m = Math.max(0, Math.min(1439, Math.floor(mins)));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function hhmmToMinutes(hhmm: string) {
  const m = String(hhmm || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";
  } catch {
    return "America/Toronto";
  }
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export default function ReportScheduleCard() {
  const defaultTz = useMemo(() => getLocalTimeZone(), []);
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });

  // current saved schedule
  const [savedDay, setSavedDay] = useState<number>(new Date().getDay());
  const [savedTimeMinutes, setSavedTimeMinutes] = useState<number>(540);
  const [savedTz, setSavedTz] = useState<string>(defaultTz);

  // editable form state
  const [day, setDay] = useState<number>(savedDay);
  const [timeHHMM, setTimeHHMM] = useState<string>(minutesToHHMM(savedTimeMinutes));
  const [tz, setTz] = useState<string>(savedTz);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleIfAvailable() {
      setLoad({ kind: "loading" });
      try {
        const res = await fetch("/api/settings/report-schedule", { method: "GET" });
        if (!res.ok) {
          // No GET route? that's fine; fall back silently.
          setLoad({ kind: "ready" });
          return;
        }
        const data = await res.json();

        // expected shape: { ok:true, schedule:{ reportDay, reportTimeMinutes, timezone } }
        const s = data?.schedule;
        if (!s) {
          setLoad({ kind: "ready" });
          return;
        }

        const rd = Number(s.reportDay);
        const rtm = Number(s.reportTimeMinutes);
        const rtz = typeof s.timezone === "string" ? s.timezone : defaultTz;

        if (!cancelled) {
          const nextDay = Number.isFinite(rd) ? rd : new Date().getDay();
          const nextMin = Number.isFinite(rtm) ? rtm : 540;

          setSavedDay(nextDay);
          setSavedTimeMinutes(nextMin);
          setSavedTz(rtz);

          setDay(nextDay);
          setTimeHHMM(minutesToHHMM(nextMin));
          setTz(rtz);

          setLoad({ kind: "ready" });
        }
      } catch (e: any) {
        if (!cancelled) setLoad({ kind: "error", message: e?.message || "Failed to load" });
      }
    }

    loadScheduleIfAvailable();
    return () => {
      cancelled = true;
    };
  }, [defaultTz]);

  const dirty =
    day !== savedDay ||
    hhmmToMinutes(timeHHMM) !== savedTimeMinutes ||
    tz.trim() !== savedTz.trim();

  async function onSave() {
    const mins = hhmmToMinutes(timeHHMM);
    if (mins == null) {
      showToast("err", "Please enter a valid time (HH:MM).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/report-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDay: day,
          reportTimeMinutes: mins,
          timezone: tz.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("err", data?.error || "Could not save schedule.");
        return;
      }

      const s = data?.schedule;
      const nextDay = Number(s?.reportDay);
      const nextMin = Number(s?.reportTimeMinutes);
      const nextTz = typeof s?.timezone === "string" ? s.timezone : tz.trim();

      setSavedDay(Number.isFinite(nextDay) ? nextDay : day);
      setSavedTimeMinutes(Number.isFinite(nextMin) ? nextMin : mins);
      setSavedTz(nextTz);

      showToast("ok", "Saved. Weekly reflections will follow this schedule.");
    } catch (e: any) {
      showToast("err", e?.message || "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setDay(savedDay);
    setTimeHHMM(minutesToHHMM(savedTimeMinutes));
    setTz(savedTz);
    showToast("ok", "Reverted changes.");
  }

  const savedDayLabel = DAYS.find((d) => d.value === savedDay)?.label || "—";

  return (
    <section className="bond-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">Weekly reflection delivery</h3>
          <p className="mt-1 text-sm text-slate-600">
            Choose when BondIQ sends your weekly reflection. This schedule applies to both of you{" "}
            <span className="text-slate-500">(last save wins)</span>.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="bond-chip">
              <span aria-hidden>🗓️</span> Weekly
            </span>
            <span className="bond-chip">
              <span aria-hidden>⏰</span> Couple schedule
            </span>
            <span className="bond-chip">
              <span aria-hidden>🌍</span> IANA timezone
            </span>
          </div>
        </div>

        {/* Toast */}
        {toast ? (
          <div
            className={[
              "bond-chip border-transparent text-white shadow-md",
              toast.type === "ok"
                ? "bg-gradient-to-r from-pink-500 to-violet-500"
                : "bg-gradient-to-r from-rose-500 to-pink-500",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden>{toast.type === "ok" ? "✨" : "⚠️"}</span>
            <span className="max-w-[260px] truncate">{toast.msg}</span>
          </div>
        ) : null}
      </div>

      {/* Inputs grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <label className="block text-xs font-semibold text-slate-700">Day</label>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">Based on your couple’s timezone.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <label className="block text-xs font-semibold text-slate-700">Time</label>
          <input
            type="time"
            value={timeHHMM}
            onChange={(e) => setTimeHHMM(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          />
          <p className="mt-2 text-xs text-slate-500">Gentle tip: mornings are great for reflection.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <label className="block text-xs font-semibold text-slate-700">Timezone</label>
          <input
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder="America/Toronto"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
          />
          <p className="mt-2 text-xs text-slate-500">
            Default is your device timezone: <span className="font-medium text-slate-700">{defaultTz}</span>
          </p>
        </div>
      </div>

      {/* Saved schedule bar */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-700">
            {load.kind === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" aria-hidden />
                Loading current schedule…
              </span>
            ) : load.kind === "error" ? (
              <span className="text-rose-700">Could not load schedule. You can still save.</span>
            ) : (
              <span>
                Current saved schedule:{" "}
                <span className="font-semibold text-slate-900">
                  {savedDayLabel} at {minutesToHHMM(savedTimeMinutes)} ({savedTz})
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              disabled={!dirty || saving}
              className={[
                "bond-btn bond-btn-secondary rounded-2xl",
                !dirty || saving ? "opacity-60" : "",
              ].join(" ")}
            >
              Reset
            </button>

            <button
              onClick={onSave}
              disabled={saving}
              className="bond-btn bond-btn-primary rounded-2xl"
            >
              {saving ? "Saving…" : "Save schedule"}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Delivery is handled by your daily cron job. If you change the schedule, it takes effect immediately.
        </div>
      </div>
    </section>
  );
}
