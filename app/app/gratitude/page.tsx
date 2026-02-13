// app/app/gratitude/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
    if (t.length < 120) return false; // very short entries usually aren't "polished"
    const sentences = t.split(/[.!?]\s+/).filter(Boolean);
    return sentences.length >= 2 && sentences.length <= 5;
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
      const res = await fetch(`/api/gratitude/${memoryOfWeek.id}/polish`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Polish failed (${res.status})`;
        const code = data?.code ? ` [${data.code}]` : "";
        throw new Error(`${msg}${code}`);
      }

      const updated = data.entry as GratitudeEntry;

      // Update Memory of the Week
      setMemoryOfWeek(updated);
      setMowPolished(true);

      // Also update in the list if it exists there
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

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Gratitude Vault</h1>
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Gratitude Vault</h1>
          <p className="text-sm text-muted-foreground">Your saved gratitude moments (Pro feature).</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-red-600">{error}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={load} className="rounded-md border px-3 py-2 text-sm">
              Retry
            </button>
            <button onClick={() => setError(null)} className="rounded-md border px-3 py-2 text-sm">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Gratitude Vault</h1>
          <p className="text-sm text-muted-foreground">
            A private memory space for your relationship (Pro feature).
          </p>
        </div>
        <button onClick={load} className="rounded-md border px-3 py-2 text-sm">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-semibold">{stats.total}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Pinned</div>
            <div className="font-semibold">{stats.pinned}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Shared</div>
            <div className="font-semibold">{stats.shared}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total resurfaces</div>
            <div className="font-semibold">{stats.resurfacedCount}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Private memories are only visible to the person who saved them. • Shared memories are visible to both partners.
        </p>
      </section>

      {/* Memory of the Week */}
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Memory of the Week</h2>
            <div className="text-xs text-muted-foreground">
              {weekStart ? `Week of ${fmt(weekStart)}` : "This week’s featured memory"}
            </div>
          </div>

          {memoryOfWeek ? (
            <button
              onClick={polishMemoryOfWeek}
              disabled={polishingMow}
              className="rounded-md border px-3 py-2 text-sm"
              title="Rewrite this memory in a warm, emotionally intelligent tone"
            >
              {polishingMow ? "Polishing…" : "Polish ✨"}
            </button>
          ) : null}
        </div>

        {memoryOfWeek ? (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{fmt(memoryOfWeek.createdAt)}</div>

            <div className="flex items-center gap-2">
                {mowPolished ? (
                <span className="rounded-full border px-2 py-0.5 text-xs">
                    Polished
                </span>
                ) : null}

                <span className="rounded-full border px-2 py-0.5 text-xs">
                {memoryOfWeek.visibility === "SHARED" ? "Shared" : "Private"}
                </span>
            </div>
            </div>

            {memoryOfWeek.title ? <div className="mt-2 font-semibold">{memoryOfWeek.title}</div> : null}
            <div className="mt-2 whitespace-pre-wrap">{memoryOfWeek.body}</div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No memories yet — save one below and it will appear here.
          </p>
        )}
      </section>

      {/* Create */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium">Save a new memory</h2>
        <div className="mt-3 grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title (e.g., “That ride home”)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write what happened and why it mattered…"
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Visibility:</span>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="rounded-md border px-2 py-2 text-sm"
              >
                <option value="PRIVATE">Private</option>
                <option value="SHARED">Shared</option>
              </select>
            </div>
            <button onClick={createEntry} disabled={saving} className="rounded-md border px-3 py-2 text-sm">
              {saving ? "Saving…" : "Save to Vault"}
            </button>
          </div>
        </div>
      </section>

      {/* Resurfaced */}
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Resurfaced memory</h2>
          <button onClick={resurfaceOnly} className="rounded-md border px-3 py-2 text-sm">
            Resurface again
          </button>
        </div>

        {resurfaced ? (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">{fmt(resurfaced.createdAt)}</div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-0.5 text-xs">
                  {resurfaced.visibility === "SHARED" ? "Shared" : "Private"}
                </span>
                {resurfaced.pinned ? <span className="rounded-full border px-2 py-0.5 text-xs">Pinned</span> : null}
              </div>
            </div>
            {resurfaced.title ? <div className="mt-2 font-semibold">{resurfaced.title}</div> : null}
            <div className="mt-2 whitespace-pre-wrap">{resurfaced.body}</div>
            <div className="mt-3 text-xs text-muted-foreground">
              Resurfaced {resurfaced.resurfacedCount ?? 0} time(s)
              {resurfaced.lastResurfacedAt ? ` • last: ${fmt(resurfaced.lastResurfacedAt)}` : ""}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nothing to resurface yet.</p>
        )}
      </section>

      {/* Entries */}
      <section className="rounded-lg border p-4">
        <h2 className="font-medium">All entries</h2>

        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {entries.map((e) => {
              const isEditing = editingId === e.id;
              const isBusy = busyId === e.id;

              return (
                <li key={e.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{fmt(e.createdAt)}</div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {e.visibility === "SHARED" ? "Shared" : "Private"}
                      </span>
                      {e.pinned ? <span className="rounded-full border px-2 py-0.5 text-xs">Pinned</span> : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid gap-3">
                      <input
                        value={editTitle}
                        onChange={(ev) => setEditTitle(ev.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Title (optional)"
                      />
                      <textarea
                        value={editBody}
                        onChange={(ev) => setEditBody(ev.target.value)}
                        rows={4}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Body"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Visibility:</span>
                          <select
                            value={editVisibility}
                            onChange={(ev) => setEditVisibility(ev.target.value as any)}
                            className="rounded-md border px-2 py-2 text-sm"
                          >
                            <option value="PRIVATE">Private</option>
                            <option value="SHARED">Shared</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(e.id)}
                            disabled={isBusy}
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            {isBusy ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={isBusy}
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {e.title ? <div className="mt-2 font-semibold">{e.title}</div> : null}
                      <div className="mt-2 whitespace-pre-wrap">{e.body}</div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => togglePin(e.id, e.pinned)}
                          disabled={isBusy}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          {isBusy ? "Working…" : e.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          onClick={() => startEdit(e)}
                          disabled={isBusy}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEntry(e.id)}
                          disabled={isBusy}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground">
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
