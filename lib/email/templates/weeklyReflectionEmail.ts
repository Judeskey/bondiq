// lib/email/templates/weeklyReflectionEmail.ts

export type ReflectionMetric = {
  label: string; // e.g., "Connection"
  value: number; // e.g., 3.8 OR 83 (we auto-normalize)
  max?: number; // default 5
  note?: string; // optional small hint under the row
};

export type WeeklyReflectionEmailInput = {
  // identity / routing
  toName?: string | null;

  // content
  weekLabel?: string; // e.g., "Week of Feb 10"
  reportUrl: string; // deep link into /app/reports
  narrative: string; // story / reflection text
  gentleResetIdea?: string | null; // small actionable suggestion

  // metrics
  pulse?: { score: number; label: string; note?: string | null } | null;
  metrics?: ReflectionMetric[];
  highlights?: string[] | null;

  // monetization
  isPro: boolean;
  upgradeUrl?: string | null;

  // optional footer links
  settingsUrl?: string | null;
  unsubscribeUrl?: string | null;
};

export type BuiltEmail = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

/**
 * ✅ BondIQ official theme color (CTA / accents)
 */
const BRAND = {
  accent: "#ec4899",
  accentDark: "#db2777",
  accentSoft: "#fdf2f8",

  bg: "#fff7fb",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#475569",
  faint: "#94a3b8",
  border: "#e5e7eb",

  successBg: "#ecfdf5",
  successText: "#065f46",
};

function esc(input: unknown) {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function normalizeNarrative(s: string) {
    return String(s || "")
      // remove leading spaces on EACH line
      .replace(/^[ \t]+/gm, "")
      // collapse crazy indentation
      .replace(/\n{3,}/g, "\n\n")
      .trim();
}
  
/**
 * Removes markdown-ish artifacts that look ugly in email clients.
 * (We keep it conservative: only strip obvious markers)
 */
function stripMd(s: string) {
  const t = String(s || "");
  return t
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`{1,3}(.+?)`{1,3}/g, "$1")
    .trim();
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function round1(n: number) {
  if (!Number.isFinite(n)) return "—";
  return (Math.round(n * 10) / 10).toFixed(1);
}

function round0(n: number) {
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

/**
 * Smart normalization:
 * - If max is 5 (default) but value looks like 0..100, convert to 0..5.
 * - Also returns a "displayMax" for the UI text.
 */
function normalizeScore(value: number, max: number) {
  const v = Number(value);
  const m = Number(max);
  if (!Number.isFinite(v) || !Number.isFinite(m) || m <= 0) {
    return { v: NaN, max: m || 5, displayMax: m || 5 };
  }

  // If caller says max=5 but value is clearly a 0..100 score (like 83),
  // convert to 5-scale and show "/ 5" cleanly.
  if (m === 5 && v > 10) {
    const converted = (clamp(v, 0, 100) / 100) * 5;
    return { v: converted, max: 5, displayMax: 5 };
  }

  // Otherwise, keep as-is (clamped to its max)
  return { v: clamp(v, 0, m), max: m, displayMax: m };
}

function subjectFor(input: WeeklyReflectionEmailInput) {
  const who = (input.toName || "").trim();
  const week = (input.weekLabel || "this week").trim();
  const base = who ? `${who}, your BondIQ reflection` : "Your BondIQ reflection";
  return `${base} — ${week}`;
}

function preheaderFor(input: WeeklyReflectionEmailInput) {
  // High-open, not spammy
  if (input.isPro)
    return "A calm snapshot, one bright spot, and a gentle next step for the week ahead.";
  return "Your weekly snapshot + one small idea. Pro unlocks deeper patterns and partner mirror.";
}
function normalizeNarrativeRaw(s: string) {
    return String(s || "")
      // normalize NBSP + common unicode spaces to regular spaces
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      // remove leading whitespace on each line (including tabs)
      .replace(/^[ \t]+/gm, "")
      // collapse "too many" blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim();
}
  
function narrativeToHtml(s: string) {
    const cleaned = normalizeNarrativeRaw(s);
    if (!cleaned) return "";
  
    // Split into paragraphs on blank lines
    const paras = cleaned.split(/\n\s*\n/);
  
    return paras
      .map((p) => {
        // inside a paragraph, turn single newlines into spaces (prevents weird wrapping)
        const oneLine = p.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
        return `<p style="margin:0 0 12px 0; padding:0; font-size:13px; color:${BRAND.muted}; line-height:1.7;">${esc(
          oneLine
        )}</p>`;
      })
      .join("");
}
  
function pill(label: string) {
  return `
    <span style="
      display:inline-block;
      padding:6px 10px;
      border:1px solid ${BRAND.border};
      border-radius:999px;
      background:#ffffff;
      font-size:12px;
      color:${BRAND.muted};
      font-weight:700;
      letter-spacing:0.2px;
      margin-right:8px;
      margin-bottom:8px;
    ">
      ${esc(label)}
    </span>
  `;
}

function btnPrimary(label: string, href: string) {
  return `
    <a href="${esc(href)}" style="
      display:inline-block;
      background:${BRAND.accent};
      color:#ffffff;
      text-decoration:none;
      padding:12px 16px;
      border-radius:14px;
      font-weight:800;
      font-size:14px;
      letter-spacing:0.2px;
      box-shadow:0 10px 22px rgba(236,72,153,0.25);
    ">
      ${esc(label)}
    </a>
  `;
}

function btnSecondary(label: string, href: string) {
  return `
    <a href="${esc(href)}" style="
      display:inline-block;
      background:#ffffff;
      color:${BRAND.text};
      text-decoration:none;
      padding:12px 16px;
      border-radius:14px;
      font-weight:800;
      font-size:14px;
      border:1px solid ${BRAND.border};
    ">
      ${esc(label)}
    </a>
  `;
}

function metricRow(m: ReflectionMetric) {
  const max = Number.isFinite(m.max as number) ? (m.max as number) : 5;
  const norm = normalizeScore(Number(m.value), max);

  const pct = Number.isFinite(norm.v) ? clamp((norm.v / norm.max) * 100, 0, 100) : 0;
  const valueText = Number.isFinite(norm.v)
    ? `${round1(norm.v)} / ${round0(norm.displayMax)}`
    : "—";
  const note = stripMd((m.note || "").trim());

  return `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid ${BRAND.border};">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:13px; font-weight:800; color:${BRAND.text};">${esc(m.label)}</div>
              ${
                note
                  ? `<div style="margin-top:4px; font-size:12px; color:${BRAND.muted}; line-height:1.45;">${esc(
                      note
                    )}</div>`
                  : ""
              }
            </td>
            <td style="vertical-align:top; text-align:right; white-space:nowrap; padding-left:12px;">
              <div style="font-size:12px; font-weight:800; color:${BRAND.muted};">${esc(valueText)}</div>
            </td>
          </tr>
        </table>

        <div style="margin-top:8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="height:10px; background:${BRAND.accentSoft}; border-radius:999px; overflow:hidden;">
                <div style="height:10px; width:${pct}%; background:${BRAND.accent}; border-radius:999px;"></div>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  `;
}

/**
 * ✅ Turn "Theme: TIME" into a meaningful love-need story block.
 * This does NOT change your data, only how it is presented.
 */
function loveNeedStory(tagRaw: string, isPro: boolean) {
  const tag = stripMd(tagRaw || "")
    .replace(/^Theme:\s*/i, "")
    .trim()
    .toUpperCase();

  const base = {
    title: tag,
    headline: "A love-need showed up this week.",
    body:
      "This theme suggests a recurring “need” in how love lands. Small, consistent signals make it clearer and easier to respond to.",
    tip: "Tiny move: share one appreciation + one request (10 minutes).",
    proHint:
      "Pro adds partner-mirror (what your partner needed most) + when this need peaks across the week.",
  };

  const map: Record<
    string,
    { headline: string; body: string; tip: string; proHint?: string }
  > = {
    TIME: {
      headline: "Love need: Time (presence).",
      body:
        "This week, love likely landed best through undistracted attention — small moments of “I’m here with you” mattered more than big gestures.",
      tip: "Tiny move: 10 minutes, phones away — one question each: “What felt heavy?” + “What felt good?”",
      proHint:
        "Pro can highlight which day/time your connection was strongest — so you can repeat what worked.",
    },
    SERVICE: {
      headline: "Love need: Service (support).",
      body:
        "Love likely landed best through practical help — easing your partner’s load, noticing what needs doing, and showing up with action.",
      tip: "Tiny move: ask “What’s one thing I can take off your plate this week?” then do it within 24 hours.",
      proHint:
        "Pro reveals the “help signals” that correlate with higher connection for you two.",
    },
    TOUCH: {
      headline: "Love need: Touch (closeness).",
      body:
        "Love likely landed best through warm physical closeness — small touchpoints that say “we’re okay” even when the week is busy.",
      tip: "Tiny move: a 20-second hug once a day (no fixing, just presence).",
      proHint:
        "Pro can connect these moments to your weekly pattern (what helps you recover faster).",
    },
    WORDS: {
      headline: "Love need: Words (reassurance).",
      body:
        "Love likely landed best through kind words — being seen, affirmed, and appreciated in a direct way.",
      tip: "Tiny move: send one specific line: “I noticed ___, and it meant ___ to me.”",
      proHint:
        "Pro can surface the phrases that consistently lift your partner’s mood signals.",
    },
    GIFTS: {
      headline: "Love need: Thoughtful gestures.",
      body:
        "Love likely landed best through small tokens of thoughtfulness — not expensive things, but proof you were on their mind.",
      tip: "Tiny move: a tiny surprise with a note: “I saw this and thought of you.”",
      proHint:
        "Pro can spot which gestures tend to create the biggest ‘bounce-back’ after dips.",
    },
  };

  const x = map[tag] || null;
  const headline = x?.headline || base.headline;
  const body = x?.body || base.body;
  const tip = x?.tip || base.tip;
  const proHint = x?.proHint || base.proHint;

  return `
    <div style="margin-top:10px; padding:14px 14px; border-radius:18px; border:1px solid ${BRAND.border}; background:${BRAND.accentSoft};">
      <div style="font-size:12px; font-weight:950; color:${BRAND.accentDark}; letter-spacing:0.2px;">
        ${esc(headline)}
      </div>

      <div style="margin-top:8px; font-size:13px; color:${BRAND.muted}; line-height:1.65;">
        ${esc(body)}
      </div>

      <div style="margin-top:10px; padding-top:10px; border-top:1px solid ${BRAND.border}; font-size:12px; color:${BRAND.text}; line-height:1.55;">
        <strong>Try this:</strong> ${esc(tip)}
      </div>

      ${
        !isPro
          ? `<div style="margin-top:8px; font-size:12px; color:${BRAND.muted}; line-height:1.5;">
              <strong style="color:${BRAND.text};">Pro:</strong> ${esc(proHint)}
            </div>`
          : `<div style="margin-top:8px; font-size:12px; color:${BRAND.muted}; line-height:1.5;">
              ${esc("Pro view is active — you’ll see deeper patterns as you log more check-ins.")}
            </div>`
      }
    </div>
  `;
}

function textVersion(input: WeeklyReflectionEmailInput) {
  const name = (input.toName || "").trim();
  const hello = name ? `Hi ${name},` : "Hi,";
  const week = input.weekLabel ? `(${input.weekLabel})` : "";

  const pulse = input.pulse
    ? (() => {
        const norm = normalizeScore(Number(input.pulse?.score), 5);
        const note = stripMd(String(input.pulse?.note || ""));
        return `Pulse: ${round1(norm.v)} / ${round0(norm.displayMax)} — ${
          input.pulse?.label
        }${note ? ` (${note})` : ""}`;
      })()
    : "";

  const metrics = Array.isArray(input.metrics) ? input.metrics : [];
  const metricsLines = metrics.length
    ? metrics
        .map((m) => {
          const max = Number.isFinite(m.max as number) ? (m.max as number) : 5;
          const norm = normalizeScore(Number(m.value), max);
          return `- ${m.label}: ${round1(norm.v)} / ${round0(norm.displayMax)}`;
        })
        .join("\n")
    : "";

  const highlights = Array.isArray(input.highlights) ? input.highlights.filter(Boolean) : [];
  const highlightLines = highlights.length
    ? highlights.map((h) => `• ${stripMd(String(h))}`).join("\n")
    : "";

  const narrative = stripMd(String(input.narrative || ""));
  const idea = stripMd(String(input.gentleResetIdea || ""));

  return [
    hello,
    "",
    `Your BondIQ weekly reflection ${week}`.trim(),
    "",
    pulse ? pulse : "",
    metricsLines ? `At a glance:\n${metricsLines}` : "",
    highlightLines ? `What stood out:\n${highlightLines}` : "",
    narrative ? `This week’s story:\n${narrative}` : "",
    idea ? `Tiny next step:\n${idea}` : "",
    "",
    `Open your report: ${input.reportUrl}`,
    !input.isPro && input.upgradeUrl ? `Upgrade: ${input.upgradeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWeeklyReflectionEmail(input: WeeklyReflectionEmailInput): BuiltEmail {
  const subject = subjectFor(input);
  const preheader = preheaderFor(input);

  const weekLabel = (input.weekLabel || "This week").trim();
  const narrative = stripMd((input.narrative || "").trim());

  const pulse = input.pulse || null;
  const metrics = Array.isArray(input.metrics) ? input.metrics : [];
  const highlights = Array.isArray(input.highlights) ? input.highlights.filter(Boolean) : [];
  const gentleResetIdea = stripMd((input.gentleResetIdea || "").trim());

  const upgradeUrl = (input.upgradeUrl || "").trim();
  const settingsUrl = (input.settingsUrl || "").trim();
  const unsubscribeUrl = (input.unsubscribeUrl || "").trim();

  const pulseHtml = pulse
    ? (() => {
        const norm = normalizeScore(Number(pulse.score), 5);
        const note = stripMd(String(pulse.note || ""));
        return `
          <div style="margin-top:14px; padding:14px 14px; border-radius:18px; background:${BRAND.successBg}; border:1px solid ${BRAND.border};">
            <div style="font-size:12px; font-weight:900; color:${BRAND.successText}; letter-spacing:0.2px;">
              Relationship pulse
            </div>
            <div style="margin-top:6px; font-size:18px; font-weight:950; color:${BRAND.text};">
              ${esc(round1(norm.v))} <span style="font-size:12px; font-weight:800; color:${BRAND.muted};">/ ${esc(
          round0(norm.displayMax)
        )}</span>
            </div>
            <div style="margin-top:2px; font-size:13px; color:${BRAND.muted}; line-height:1.5;">
              <strong style="color:${BRAND.text};">${esc(stripMd(pulse.label))}</strong>
              ${note ? ` — ${esc(note)}` : ""}
            </div>
          </div>
        `;
      })()
    : "";

  // ✅ NEW: split theme highlights from normal highlights
  const themeItems = highlights
    .map((h) => stripMd(String(h)))
    .filter((h) => /^Theme:\s*/i.test(h));

  const otherHighlights = highlights
    .map((h) => stripMd(String(h)))
    .filter((h) => !/^Theme:\s*/i.test(h));

  const highlightsHtml =
    themeItems.length || otherHighlights.length
      ? `
      <div style="margin-top:16px;">
        <div style="font-size:13px; font-weight:900; color:${BRAND.text};">What stood out</div>

        ${
          otherHighlights.length
            ? `
            <div style="margin-top:10px;">
              ${otherHighlights
                .slice(0, 3)
                .map((h) => pill(h.replace(/^Theme:\s*/i, "Theme: ")))
                .join("")}
            </div>
          `
            : ""
        }

        ${
          themeItems.length
            ? `
            <div style="margin-top:6px;">
              ${themeItems.slice(0, 3).map((t) => loveNeedStory(t, input.isPro)).join("")}
            </div>
          `
            : ""
        }
      </div>
    `
      : "";

  const metricsHtml = metrics.length
    ? `
      <div style="margin-top:16px;">
        <div style="font-size:13px; font-weight:900; color:${BRAND.text}; margin-bottom:8px;">
          Your week, in numbers
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          ${metrics.slice(0, 6).map(metricRow).join("")}
        </table>
      </div>
    `
    : "";

  const ideaHtml = gentleResetIdea
    ? `
      <div style="margin-top:16px; padding:14px 14px; border-radius:18px; border:1px solid ${BRAND.border}; background:${BRAND.accentSoft};">
        <div style="font-size:13px; font-weight:900; color:${BRAND.text};">Tiny next step</div>
        <div style="margin-top:8px; font-size:13px; color:${BRAND.muted}; line-height:1.65; white-space:pre-wrap;">
          ${esc(gentleResetIdea)}
        </div>
      </div>
    `
    : "";

  const proFooterHtml = input.isPro
    ? `
      <div style="margin-top:14px;">
        ${pill("✨ Pro active")}
        ${pill("📌 Memories resurface")}
        ${pill("🪞 Partner mirror")}
      </div>
    `
    : `
      <div style="margin-top:14px;">
        ${pill("Included in Free")}
        ${pill("Upgrade for deeper insights")}
        ${pill("Unlock partner mirror")}
      </div>
    `;

  const ctaHtml = `
    <div style="margin-top:18px;">
      ${btnPrimary("Open this week’s report", input.reportUrl)}
      <span style="display:inline-block; width:10px;"></span>
      ${
        !input.isPro && upgradeUrl
          ? btnSecondary("Upgrade", upgradeUrl)
          : settingsUrl
          ? btnSecondary("Settings", settingsUrl)
          : ""
      }
    </div>
  `;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(subject)}</title>
    <style>
      @media (max-width: 560px) {
        .container { padding: 18px !important; }
        .card { padding: 18px !important; border-radius: 18px !important; }
        .h1 { font-size: 22px !important; }
      }
    </style>
  </head>

  <body style="margin:0; padding:0; background:${BRAND.bg}; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
    <!-- Preheader -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${esc(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:${BRAND.bg};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; border-collapse:collapse;">
            <tr>
              <td class="container" style="padding:22px;">

                <!-- Brand header -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                  <div style="font-weight:950; font-size:18px; color:${BRAND.text}; letter-spacing:0.2px;">
                    BondIQ
                  </div>
                  <div style="font-size:12px; font-weight:800; color:${BRAND.faint};">
                    ${esc(weekLabel)}
                  </div>
                </div>

                <!-- Card -->
                <div class="card" style="margin-top:14px; background:${BRAND.card}; border:1px solid ${BRAND.border}; border-radius:22px; padding:22px; box-shadow:0 14px 34px rgba(15,23,42,0.06);">
                  <div class="h1" style="font-size:24px; font-weight:950; color:${BRAND.text}; line-height:1.25;">
                    Your weekly reflection
                  </div>
                  <div style="margin-top:8px; font-size:13px; color:${BRAND.muted}; line-height:1.65;">
                    A calm snapshot of your connection — one bright spot, and one gentle next step.
                  </div>

                  ${pulseHtml}
                  ${metricsHtml}
                  ${highlightsHtml}

                  <div style="margin-top:18px; padding:16px; border-radius:18px; border:1px solid ${BRAND.border}; background:#ffffff;">
                    <div style="font-size:13px; font-weight:950; color:${BRAND.text};">This week’s story</div>

                    <div style="margin-top:8px;">
                        ${narrativeToHtml(narrative)}
                    </div>
                  </div>


                  ${ideaHtml}
                  ${proFooterHtml}
                  ${ctaHtml}

                  <div style="margin-top:16px; font-size:11px; color:${BRAND.faint}; line-height:1.5;">
                    Tip: You can choose when this arrives in Settings.
                  </div>
                </div>

                <!-- Footer -->
                <div style="margin-top:14px; font-size:12px; color:${BRAND.faint}; line-height:1.6; text-align:center;">
                  <div>You’re receiving this because you’re part of an active BondIQ couple.</div>
                  ${
                    unsubscribeUrl
                      ? `<div style="margin-top:6px;"><a href="${esc(
                          unsubscribeUrl
                        )}" style="color:${BRAND.faint}; text-decoration:underline;">Unsubscribe</a></div>`
                      : ""
                  }
                </div>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    preheader,
    html,
    text: textVersion(input),
  };
}
