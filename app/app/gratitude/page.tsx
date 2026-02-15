// app/app/gratitude/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type GratitudeEntry = {
  id: string;
  title: string | null;
  body: string;
  visibility: "PRIVATE" | "SHARED" | string;
  pinned: boolean;
  eventDay: string | null;
  targetUserId: string | null;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  lastResurfacedAt?: string | null;
  resurfacedCount?: number;
};

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function looksPolished(text: string) {
  const t = (text || "").trim();
  if (t.length < 120) return false;
  const sentences = t.split(/[.!?]\s+/).filter(Boolean);
  return sentences.length >= 2 && sentences.length <= 5;
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function SoftPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function LockedPreviewCard({ title, body, meta }: { title: string; body: string; meta: string }) {
  return (
    <div className="bond-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-2 text-sm text-slate-700">{body}</div>
          <div className="mt-3 text-xs text-slate-500">{meta}</div>
        </div>

        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          🔒 Pro
        </span>
      </div>
    </div>
  );
}

function isCouplePremiumGate(msg: string | null) {
  const t = (msg || "").toLowerCase();
  return (
    t.includes("premium required") ||
    t.includes("couple premium required") ||
    t.includes("pro feature") ||
    t.includes("403")
  );
}

export default function GratitudePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [resurfaced, setResurfaced] = useState<GratitudeEntry | null>(null);
  const [memoryOfWeek, setMemoryOfWeek] = useState<GratitudeEntry | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED">("PRIVATE");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editBody, setEditBody] = useState<string>("");
  const [editVisibility, setEditVisibility] = useState<"PRIVATE" | "SHARED">("PRIVATE");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Memory of the Week polish
  const [polishingMow, setPolishingMow] = useState(false);
  const [mowPolished, setMowPolished] = useState(false);

  const stats = useMemo(() => {
    const total = entries.length;
    const pinned = entries.filter((e) => e.pinned).length;
    const shared = entries.filter((e) => e.visibility === "SHARED").length;
    const resurfacedCount = entries.reduce((acc, e) => acc + (e.resurfacedCount || 0), 0);
    return { total, pinned, shared, resurfacedCount };
  }, [entries]);

  const locked = useMemo(() => isCouplePremiumGate(error), [error]);

  const preview = useMemo(
    () => [
      {
        title: "A tiny moment I want to keep",
        body: "When you checked in on me without being asked — it made me feel safe and chosen.",
        meta: "Saved memory • resurfaces gently on hard weeks",
      },
      {
        title: "Something I admire about you",
        body:
          "Your patience. Even when you’re tired, you still try to understand me — that matters more than you know.",
        meta: "Shared note • strengthens the weekly story",
      },
      {
        title: "A “thank you” I don’t want to forget",
        body: "Thank you for showing up today. Not perfectly — just honestly. That’s love in real life.",
        meta: "Pinned memory • perfect for repair days + anniversaries",
      },
    ],
    []
  );

  async function jsonOrThrow(res: Response) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      const msg = data?.error || `Request failed (${res.status})`;
      const code = data?.code ? ` [${data.code}]` : "";
      throw new Error(`${msg}${code}`);
    }
    return data;
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [listRes, resurfRes, mowRes] = await Promise.all([
        fetch("/api/gratitude?take=50", { cache: "no-store" }),
        fetch("/api/gratitude/resurface", { cache: "no-store" }),
        fetch("/api/gratitude/memory-of-week", { cache: "no-store" }),
      ]);

      const listJson = await jsonOrThrow(listRes);

      const resurfJson = await resurfRes.json().catch(() => ({}));
      if (resurfRes.ok && resurfJson?.ok) setResurfaced(resurfJson?.entry ?? null);

      const mowJson = await mowRes.json().catch(() => ({}));
      if (mowRes.ok && mowJson?.ok) {
        const entry = (mowJson?.entry ?? null) as GratitudeEntry | null;
        setMemoryOfWeek(entry);
        setWeekStart(mowJson?.weekStart ?? null);
        setMowPolished(entry ? looksPolished(entry.body) : false);
      }

      setEntries(Array.isArray(listJson.entries) ? listJson.entries : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resurfaceOnly() {
    setError(null);
    try {
      const res = await fetch("/api/gratitude/resurface", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Resurface failed (${res.status})`);
      setResurfaced(data?.entry ?? null);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    }
  }

  async function createEntry() {
    setError(null);
    const t = title.trim();
    const b = body.trim();

    if (!b) return setError("Please write a gratitude moment before saving.");
    if (b.length > 2000) return setError("Body too long (max 2000).");

    setSaving(true);
    try {
      const res = await fetch("/api/gratitude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t ? t : null,
          body: b,
          visibility,
          pinned: false,
        }),
      });

      const data = await jsonOrThrow(res);
      const entry = data.entry as GratitudeEntry;

      setEntries((prev) => [entry, ...prev]);
      setTitle("");
      setBody("");
      setVisibility("PRIVATE");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(e: GratitudeEntry) {
    setEditingId(e.id);
    setEditTitle(e.title || "");
    setEditBody(e.body || "");
    setEditVisibility((e.visibility === "SHARED" ? "SHARED" : "PRIVATE") as any);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    setEditVisibility("PRIVATE");
  }

  async function saveEdit(id: string) {
    setError(null);
    const t = editTitle.trim();
    const b = editBody.trim();

    if (!b) return setError("Body cannot be empty.");
    if (b.length > 2000) return setError("Body too long (max 2000).");

    setBusyId(id);
    try {
      const res = await fetch(`/api/gratitude/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t ? t : null,
          body: b,
          visibility: editVisibility,
        }),
      });

      const data = await jsonOrThrow(res);
      const updated = data.entry as GratitudeEntry;

      setEntries((prev) => prev.map((x) => (x.id === id ? updated : x)));
      cancelEdit();
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePin(id: string, pinned: boolean) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/gratitude/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      });

      const data = await jsonOrThrow(res);
      const updated = data.entry as GratitudeEntry;

      setEntries((prev) => {
        const next = prev.map((x) => (x.id === id ? updated : x));
        next.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Failed to pin/unpin");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this gratitude entry?")) return;

    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/gratitude/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Delete failed (${res.status})`);

      setEntries((prev) => prev.filter((x) => x.id !== id));
      if (resurfaced?.id === id) setResurfaced(null);
      if (memoryOfWeek?.id === id) setMemoryOfWeek(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  async function polishMemoryOfWeek() {
    if (!memoryOfWeek?.id) return;

    setError(null);
    setPolishingMow(true);

    try {
      const res = await fetch(`/api/gratitude/${memoryOfWeek.id}/polish`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Polish failed (${res.status})`;
        const code = data?.code ? ` [${data.code}]` : "";
        throw new Error(`${msg}${code}`);
      }

      const updated = data.entry as GratitudeEntry;

      setMemoryOfWeek(updated);
      setMowPolished(true);
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: any) {
      setError(e?.message || "Failed to polish");
    } finally {
      setPolishingMow(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // UI helpers (styling only)
  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none " +
    "focus-visible:ring-2 focus-visible:ring-pink-300 placeholder:text-slate-400";
  const selectBase =
    "rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-pink-300";
  const subtleText = "text-sm text-slate-600";
  const metaText = "text-xs text-slate-500";

  // Loading
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10">
        <h1 className="text-2xl font-semibold text-slate-900">Gratitude Vault</h1>
        <p className={cx("mt-2", subtleText)}>Loading your memories…</p>
      </div>
    );
  }

  // Premium-locked state
  if (error && locked) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gratitude Vault</h1>
          <p className={cx("mt-2", subtleText)}>
            Save meaningful moments — and let BondIQ resurface them when you need warmth most.
          </p>
        </div>

        <div className="bond-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-slate-900">This space unlocks deeper closeness.</div>
              <div className={cx("mt-1", subtleText)}>
                Gratitude Vault is a couple-level Pro feature. It helps you store moments that matter, pin “forever”
                notes, and gently resurface love during stress or distance.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <SoftPill>✨ Resurface memories</SoftPill>
                <SoftPill>📌 Pin forever notes</SoftPill>
                <SoftPill>💌 Share safely</SoftPill>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/app/settings" className="bond-btn bond-btn-primary">
                  Upgrade to Pro
                </Link>
                <button onClick={load} className="bond-btn bond-btn-secondary">
                  I already upgraded — refresh
                </button>
                <button onClick={() => setError(null)} className="bond-btn bond-btn-ghost">
                  Dismiss
                </button>
              </div>

              <div className={cx("mt-3", metaText)}>Note: {error}</div>
            </div>

            <div className="shrink-0 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <div className="text-xs font-semibold text-slate-600">Status</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">Locked</div>
              <div className={cx("mt-1", metaText)}>Upgrade to unlock</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {preview.map((p) => (
            <LockedPreviewCard key={p.title} title={p.title} body={p.body} meta={p.meta} />
          ))}
        </div>
      </div>
    );
  }

  // Non-gating error
  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gratitude Vault</h1>
          <p className={cx("mt-2", subtleText)}>Your saved gratitude moments.</p>
        </div>

        <div className="bond-card p-6">
          <p className="text-sm text-slate-800">{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={load} className="bond-btn bond-btn-primary">
              Retry
            </button>
            <button onClick={() => setError(null)} className="bond-btn bond-btn-secondary">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal UI
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gratitude Vault</h1>
          <p className={cx("mt-2", subtleText)}>
            A private memory space for your relationship — and a gentle way to reconnect.
          </p>
        </div>

        <button onClick={load} className="bond-btn bond-btn-secondary">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <section className="bond-card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className={metaText}>Total</div>
            <div className="text-lg font-semibold text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className={metaText}>Pinned</div>
            <div className="text-lg font-semibold text-slate-900">{stats.pinned}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className={metaText}>Shared</div>
            <div className="text-lg font-semibold text-slate-900">{stats.shared}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className={metaText}>Total resurfaces</div>
            <div className="text-lg font-semibold text-slate-900">{stats.resurfacedCount}</div>
          </div>
        </div>

        <p className={cx("mt-3", metaText)}>
          Private memories are only visible to the person who saved them. • Shared memories are visible to both
          partners.
        </p>
      </section>

      {/* Memory of the Week */}
      <section className="bond-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Memory of the Week</h2>
            <div className={metaText}>{weekStart ? `Week of ${fmt(weekStart)}` : "This week’s featured memory"}</div>
          </div>

          {memoryOfWeek ? (
            <button
              onClick={polishMemoryOfWeek}
              disabled={polishingMow}
              className={cx("bond-btn bond-btn-primary", polishingMow && "opacity-70")}
              title="Rewrite this memory in a warm, emotionally intelligent tone"
            >
              {polishingMow ? "Polishing…" : "Polish ✨"}
            </button>
          ) : null}
        </div>

        {memoryOfWeek ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">{fmt(memoryOfWeek.createdAt)}</div>

              <div className="flex items-center gap-2">
                {mowPolished ? <SoftPill>✨ Polished</SoftPill> : null}
                <SoftPill>{memoryOfWeek.visibility === "SHARED" ? "Shared" : "Private"}</SoftPill>
              </div>
            </div>

            {memoryOfWeek.title ? (
              <div className="mt-2 text-base font-semibold text-slate-900">{memoryOfWeek.title}</div>
            ) : null}

            <div className="mt-2 whitespace-pre-wrap text-slate-800 leading-relaxed">{memoryOfWeek.body}</div>
          </div>
        ) : (
          <p className={cx("mt-3", subtleText)}>No memories yet — save one below and it will appear here.</p>
        )}
      </section>

      {/* Create */}
      <section className="bond-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Save a new memory</h2>
          <SoftPill>{visibility === "SHARED" ? "Visible to both" : "Only you can see"}</SoftPill>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title (e.g., “That ride home”)"
            className={inputBase}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write what happened and why it mattered…"
            rows={4}
            className={cx(inputBase, "min-h-[120px]")}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Visibility:</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} className={selectBase}>
                <option value="PRIVATE">Private</option>
                <option value="SHARED">Shared</option>
              </select>
            </div>

            <button onClick={createEntry} disabled={saving} className={cx("bond-btn bond-btn-primary", saving && "opacity-70")}>
              {saving ? "Saving…" : "Save to Vault"}
            </button>
          </div>
        </div>
      </section>

      {/* Resurfaced */}
      <section className="bond-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Resurfaced memory</h2>
          <button onClick={resurfaceOnly} className="bond-btn bond-btn-secondary">
            Resurface again
          </button>
        </div>

        {resurfaced ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">{fmt(resurfaced.createdAt)}</div>
              <div className="flex items-center gap-2">
                <SoftPill>{resurfaced.visibility === "SHARED" ? "Shared" : "Private"}</SoftPill>
                {resurfaced.pinned ? <SoftPill>📌 Pinned</SoftPill> : null}
              </div>
            </div>

            {resurfaced.title ? (
              <div className="mt-2 text-base font-semibold text-slate-900">{resurfaced.title}</div>
            ) : null}

            <div className="mt-2 whitespace-pre-wrap text-slate-800 leading-relaxed">{resurfaced.body}</div>

            <div className={cx("mt-3", metaText)}>
              Resurfaced {resurfaced.resurfacedCount ?? 0} time(s)
              {resurfaced.lastResurfacedAt ? ` • last: ${fmt(resurfaced.lastResurfacedAt)}` : ""}
            </div>
          </div>
        ) : (
          <p className={cx("mt-3", subtleText)}>Nothing to resurface yet.</p>
        )}
      </section>

      {/* Entries */}
      <section className="bond-card p-5">
        <h2 className="font-semibold text-slate-900">All entries</h2>

        {entries.length === 0 ? (
          <p className={cx("mt-3", subtleText)}>No entries yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((e) => {
              const isEditing = editingId === e.id;
              const isBusy = busyId === e.id;

              return (
                <li key={e.id} className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-sm text-slate-500">{fmt(e.createdAt)}</div>
                    <div className="flex items-center gap-2">
                      <SoftPill>{e.visibility === "SHARED" ? "Shared" : "Private"}</SoftPill>
                      {e.pinned ? <SoftPill>📌 Pinned</SoftPill> : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 grid gap-3">
                      <input
                        value={editTitle}
                        onChange={(ev) => setEditTitle(ev.target.value)}
                        className={inputBase}
                        placeholder="Title (optional)"
                      />
                      <textarea
                        value={editBody}
                        onChange={(ev) => setEditBody(ev.target.value)}
                        rows={4}
                        className={cx(inputBase, "min-h-[120px]")}
                        placeholder="Body"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Visibility:</span>
                          <select
                            value={editVisibility}
                            onChange={(ev) => setEditVisibility(ev.target.value as any)}
                            className={selectBase}
                          >
                            <option value="PRIVATE">Private</option>
                            <option value="SHARED">Shared</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => saveEdit(e.id)}
                            disabled={isBusy}
                            className={cx("bond-btn bond-btn-primary", isBusy && "opacity-70")}
                          >
                            {isBusy ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={isBusy}
                            className={cx("bond-btn bond-btn-secondary", isBusy && "opacity-70")}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {e.title ? <div className="mt-2 text-base font-semibold text-slate-900">{e.title}</div> : null}

                      <div className="mt-2 whitespace-pre-wrap text-slate-800 leading-relaxed">{e.body}</div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => togglePin(e.id, e.pinned)}
                          disabled={isBusy}
                          className={cx("bond-btn bond-btn-secondary", isBusy && "opacity-70")}
                        >
                          {isBusy ? "Working…" : e.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          onClick={() => startEdit(e)}
                          disabled={isBusy}
                          className={cx("bond-btn bond-btn-secondary", isBusy && "opacity-70")}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEntry(e.id)}
                          disabled={isBusy}
                          className={cx("bond-btn bond-btn-secondary", "hover:bg-rose-50 hover:border-rose-200")}
                        >
                          Delete
                        </button>
                      </div>

                      <div className={cx("mt-3", metaText)}>
                        Resurfaced {e.resurfacedCount ?? 0} time(s)
                        {e.lastResurfacedAt ? ` • last: ${fmt(e.lastResurfacedAt)}` : ""}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
