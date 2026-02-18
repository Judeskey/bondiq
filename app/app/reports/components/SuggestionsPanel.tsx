"use client";

import { useMemo, useState } from "react";

type Breakdown = {
  connection?: number;
  habit?: number;
  stability?: string;
  momentum?: string;
  alignment?: number;
};

function asNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickFocus(b: Breakdown) {
  const connection = asNum(b?.connection, 0);
  const habit = asNum(b?.habit, 0);
  const stabilityLabel = String(b?.stability ?? "").toLowerCase();
  const momentumLabel = String(b?.momentum ?? "").toLowerCase();

  const connectionLevel =
    connection >= 4.3 ? "strong" : connection >= 3.5 ? "okay" : "fragile";
  const habitLevel = habit >= 4 ? "high" : habit >= 2 ? "medium" : "low";
  const stabilityLevel = stabilityLabel.includes("stable")
    ? "stable"
    : stabilityLabel.includes("unstable")
      ? "unstable"
      : "mixed";
  const momentumLevel = momentumLabel.includes("up")
    ? "up"
    : momentumLabel.includes("down")
      ? "down"
      : "steady";

  const focus =
    stabilityLevel === "unstable"
      ? "stability"
      : momentumLevel === "down"
        ? "momentum"
        : habitLevel === "low"
          ? "consistency"
          : "connection";

  return { focus, connectionLevel, habitLevel, stabilityLevel, momentumLevel };
}

function whyText(b: Breakdown) {
  const x = pickFocus(b);

  const focusReason =
    x.focus === "stability"
      ? "We’re prioritizing stability because the week shows bigger emotional swings. A predictable, gentle repair routine will reduce friction fast."
      : x.focus === "momentum"
        ? "We’re prioritizing momentum because things are trending down. Small “easy wins” rebuild forward motion without pressure."
        : x.focus === "consistency"
          ? "We’re prioritizing consistency because check-ins are irregular. A tiny daily ritual makes progress feel effortless."
          : "We’re prioritizing connection because it’s the best lever right now. More feeling-seen moments lifts the whole relationship quickly.";

  return [
    `Focus: ${x.focus}.`,
    focusReason,
    `Signals: connection=${x.connectionLevel}, habit=${x.habitLevel}, stability=${x.stabilityLevel}, momentum=${x.momentumLevel}.`,
    "You’ll get: one simple action, one “say this” line, and a 2-minute reset if emotions run high.",
  ].join(" ");
}

export default function SuggestionsPanel({
  breakdown,
  onUpgrade,
}: {
  breakdown: Breakdown | null;
  onUpgrade?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [premium, setPremium] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<string | number | null>(null);

  const why = useMemo(() => whyText(breakdown ?? {}), [breakdown]);

  function gaEvent(name: string, params?: Record<string, any>) {
    if (typeof window === "undefined") return;
    const gtag = (window as any).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", name, params || {});
  }

  async function generate() {
    // ✅ Track suggestion generation click (doesn't affect flow)
    gaEvent("suggestion_generate_click", {
      location: "reports_suggestions_panel",
      has_existing_suggestion: !!suggestion,
      entitlement: premium ? "premium" : "free",
      focus: pickFocus(breakdown ?? {}).focus,
    });

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/repair-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakdown }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data?.upgrade) {
          setError(data?.error ?? "You’ve reached this week’s limit. Upgrade for unlimited suggestions.");

          // ✅ Track paywall hit (helpful for conversion analysis)
          gaEvent("suggestion_paywall_shown", {
            location: "reports_suggestions_panel",
            entitlement: "free",
            remaining: data?.remaining ?? null,
            focus: pickFocus(breakdown ?? {}).focus,
          });
        } else {
          setError(data?.error ?? "We couldn’t create a suggestion right now. Please try again.");

          gaEvent("suggestion_generate_error", {
            location: "reports_suggestions_panel",
            status: res.status,
            focus: pickFocus(breakdown ?? {}).focus,
          });
        }
        setPremium(!!data?.premium);
        setRemaining(data?.remaining ?? null);
        return;
      }

      setSuggestion(String(data?.suggestion ?? ""));
      setPremium(!!data?.premium);
      setRemaining(data?.remaining ?? null);

      // ✅ Track success
      gaEvent("suggestion_generate_success", {
        location: "reports_suggestions_panel",
        entitlement: data?.premium ? "premium" : "free",
        remaining: data?.remaining ?? null,
        focus: pickFocus(breakdown ?? {}).focus,
      });
    } catch {
      setError("Network error. Please try again.");

      gaEvent("suggestion_generate_error", {
        location: "reports_suggestions_panel",
        status: "network_error",
        focus: pickFocus(breakdown ?? {}).focus,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bond-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Gentle Reset Idea</h3>
          <p className="text-sm text-slate-600 mt-1">
            A small, high-leverage idea tailored to your week.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bond-chip cursor-help select-none" title={why}>
            Why this suggestion?
          </span>

          <button
            onClick={generate}
            disabled={loading}
            className={"bond-btn " + (premium ? "bond-btn-primary" : "bond-btn-primary")}
          >
            {loading ? "Creating…" : suggestion ? "Get another" : "Get my suggestion"}
          </button>
        </div>
      </div>

      {/* Quota / entitlement line */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="bond-chip">{premium ? "Premium: unlimited" : "Included in Free"}</span>

        {remaining !== null && (
          <span className="bond-chip">Remaining: {String(remaining)}</span>
        )}
      </div>

      {/* Error + upgrade CTA */}
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="font-medium">Action needed</div>
          <div className="mt-1">{error}</div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                gaEvent("suggestion_try_again_click", {
                  location: "reports_suggestions_panel",
                  focus: pickFocus(breakdown ?? {}).focus,
                });
                generate();
              }}
              className="bond-btn bond-btn-secondary"
            >
              Try again
            </button>

            <button
              onClick={() => {
                // ✅ Track upgrade CTA click from paywall
                gaEvent("upgrade_click", {
                  location: "reports_suggestions_panel_paywall",
                  source: "suggestion_limit",
                  focus: pickFocus(breakdown ?? {}).focus,
                });

                onUpgrade?.();
              }}
              className="bond-btn bond-btn-primary"
            >
              Upgrade
            </button>
          </div>
        </div>
      ) : null}

      {/* Suggestion output */}
      {suggestion ? (
        <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-white/70 p-4 text-sm text-slate-900">
          {suggestion}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border bg-white/70 p-4 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Ready when you are.</div>
          <div className="mt-1 text-slate-600">
            Tap below to get a gentle, practical suggestion you can try today.
          </div>
        </div>
      )}
    </div>
  );
}
