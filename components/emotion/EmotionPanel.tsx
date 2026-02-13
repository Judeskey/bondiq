// components/emotion/EmotionPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import MoodOrb from "./MoodOrb";

type PartnerState = {
  userId: string;
  state: string;
  confidence: number;
  reasons: string[];
  metrics: any;
  uiHint?: { title: string; message: string } | null;
};

type MemberInfo = {
  userId: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

type Props = {
  members?: MemberInfo[]; // from coupleInfo.members
};

export default function EmotionPanel({ members = [] }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [partners, setPartners] = useState<PartnerState[]>([]);

  // ✅ Name resolution priority:
  // nickname -> real name -> email prefix -> "Partner"
  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();

    for (const m of members) {
      const display =
        (m.nickname && m.nickname.trim()) ||
        (m.name && m.name.trim()) ||
        (m.email && m.email.split("@")[0]) ||
        "Partner";

      map.set(m.userId, display);
    }

    return map;
  }, [members]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch("/api/emotion-state", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErr(data?.error || "Failed to load emotion state");
          setPartners([]);
          return;
        }

        const arr = Array.isArray(data?.perPartner) ? data.perPartner : [];
        setPartners(arr);
      } catch (e: any) {
        setErr(e?.message || "Failed to load emotion state");
        setPartners([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Mood signal</div>
          <div className="text-xs text-slate-600 mt-1">
            A gentle read of recent emotional trend (non-alarming).
          </div>
        </div>
      </div>

      {loading && <div className="mt-4 text-sm text-slate-700">Loading…</div>}
      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

      {!loading && !err && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {partners.map((p) => {
            const who = nameByUserId.get(p.userId) || "Partner";

            const whyText =
              p.uiHint?.message ||
              (Array.isArray(p.reasons) && p.reasons.length
                ? p.reasons.join(" • ")
                : "—");

            const whyShort =
              p.uiHint?.title ||
              (Array.isArray(p.reasons) && p.reasons.length
                ? p.reasons.slice(0, 2).join(" • ")
                : "—");

            return (
              <div key={p.userId} className="rounded-lg border p-3 bg-slate-50">
                <div className="text-sm font-semibold text-slate-800 mb-2">
                  {who}
                </div>

                <MoodOrb
                  state={p.state}
                  confidence={p.confidence}
                  size={62}
                  showLabel
                />

                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-medium">Why:</span>{" "}
                  <span
                    title={whyText}
                    className="cursor-help underline decoration-dotted"
                  >
                    {whyShort}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
