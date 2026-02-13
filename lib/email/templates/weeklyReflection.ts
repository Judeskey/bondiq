// lib/email/templates/weeklyReflection.ts
import { getAppUrl } from "@/lib/email/resend";

type WeeklyReflectionTemplateInput = {
  recipientName?: string | null;
  weekLabel: string; // e.g. "This week" or "Week of Feb 11"
  plan: "FREE" | "PREMIUM";

  // A few key metrics (optional)
  pulseValue?: number | null; // 0..100
  pulseLabel?: string | null; // "Needs Care", etc.
  habitScore?: number | null; // 0..5
  connectionAvg?: number | null; // 1..5
  momentumLabel?: string | null; // "up/down/flat"
  alignmentLabel?: string | null; // "high/medium/unknown"

  // Copy blocks
  memoryLine?: string | null; // "Compared to last week..."
  story?: string | null; // narrative paragraph
  topThemes?: string[]; // small list

  // Personalized sections
  nextActions?: string[]; // 1-3
  weeklyChallengeTitle?: string | null;
  weeklyChallengeSteps?: string[];

  // CTA
  reportUrl?: string; // link into /app/reports
  unsubscribeMailto?: string; // mailto:care@bondiq.app?subject=Unsubscribe
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pill(text: string) {
  return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#F7F0FF;border:1px solid #E9D7FF;font-size:12px;line-height:1;color:#3B2B57;margin:0 6px 8px 0;">${esc(
    text
  )}</span>`;
}

export function weeklyReflectionSubject(input: WeeklyReflectionTemplateInput) {
  const name = input.recipientName?.trim();
  const who = name ? `${name}, ` : "";
  // premium feels gentle + intimate
  return input.plan === "PREMIUM"
    ? `${who}your BondIQ reflection is ready ✨`
    : `${who}a small weekly reflection from BondIQ ✨`;
}

export function weeklyReflectionText(input: WeeklyReflectionTemplateInput) {
  const appUrl = getAppUrl();
  const reportUrl = input.reportUrl || `${appUrl}/app/reports`;

  const lines: string[] = [];

  lines.push(`BondIQ Weekly Reflection — ${input.weekLabel}`);
  lines.push("");

  if (input.pulseValue != null) {
    const label = input.pulseLabel ? ` (${input.pulseLabel})` : "";
    lines.push(`Relationship Pulse: ${input.pulseValue}/100${label}`);
  }
  if (input.connectionAvg != null) lines.push(`Connection: ${input.connectionAvg}/5`);
  if (input.habitScore != null) lines.push(`Habit: ${input.habitScore}/5`);
  if (input.momentumLabel) lines.push(`Momentum: ${input.momentumLabel}`);
  if (input.alignmentLabel) lines.push(`Alignment: ${input.alignmentLabel}`);
  lines.push("");

  if (input.memoryLine) {
    lines.push(input.memoryLine);
    lines.push("");
  }

  if (input.story) {
    lines.push(input.story);
    lines.push("");
  }

  if (input.topThemes?.length) {
    lines.push(`Themes: ${input.topThemes.slice(0, 3).join(", ")}`);
    lines.push("");
  }

  if (input.plan === "PREMIUM") {
    if (input.nextActions?.length) {
      lines.push("Next actions:");
      for (const a of input.nextActions.slice(0, 3)) lines.push(`- ${a}`);
      lines.push("");
    }

    if (input.weeklyChallengeTitle) {
      lines.push(`This week’s challenge: ${input.weeklyChallengeTitle}`);
      if (input.weeklyChallengeSteps?.length) {
        for (const s of input.weeklyChallengeSteps.slice(0, 5)) lines.push(`- ${s}`);
      }
      lines.push("");
    }
  } else {
    lines.push("Upgrade to Premium to unlock partner mirror, next actions, and deeper weekly guidance.");
    lines.push("");
  }

  lines.push(`Open your report: ${reportUrl}`);
  lines.push("");

  if (input.unsubscribeMailto) {
    lines.push(`Unsubscribe: ${input.unsubscribeMailto}`);
  }

  return lines.join("\n");
}

export function weeklyReflectionHtml(input: WeeklyReflectionTemplateInput) {
  const appUrl = getAppUrl();
  const reportUrl = input.reportUrl || `${appUrl}/app/reports`;
  const unsubscribe = input.unsubscribeMailto || `mailto:care@bondiq.app?subject=Unsubscribe`;

  const name = input.recipientName?.trim();
  const hello = name ? `Hi ${esc(name)},` : `Hi there,`;

  const preheader = esc(
    input.plan === "PREMIUM"
      ? "A gentle weekly reflection — with your next actions and a calming challenge."
      : "A gentle weekly reflection — with a small insight to carry into the week."
  );

  const pills =
    (input.topThemes?.length ? input.topThemes.slice(0, 3).map((t) => pill(t)).join("") : "") ||
    pill("Connection") + pill("Care") + pill("Presence");

  const metricRow = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
      ${
        input.pulseValue != null
          ? `<div style="flex:1;min-width:140px;padding:12px;border-radius:16px;background:#FFFFFF;border:1px solid #EEE8F7;">
              <div style="font-size:12px;color:#6B5B84;">Relationship Pulse</div>
              <div style="font-size:22px;font-weight:700;color:#2B1B3D;">${esc(
                String(input.pulseValue)
              )}<span style="color:#9A8BB1;font-weight:600;">/100</span></div>
              <div style="font-size:13px;color:#6B5B84;">${esc(
                input.pulseLabel || ""
              )}</div>
            </div>`
          : ""
      }
      ${
        input.connectionAvg != null
          ? `<div style="flex:1;min-width:140px;padding:12px;border-radius:16px;background:#FFFFFF;border:1px solid #EEE8F7;">
              <div style="font-size:12px;color:#6B5B84;">Connection</div>
              <div style="font-size:22px;font-weight:700;color:#2B1B3D;">${esc(
                String(input.connectionAvg)
              )}<span style="color:#9A8BB1;font-weight:600;">/5</span></div>
              <div style="font-size:13px;color:#6B5B84;">${esc(
                input.momentumLabel ? `Momentum: ${input.momentumLabel}` : ""
              )}</div>
            </div>`
          : ""
      }
      ${
        input.habitScore != null
          ? `<div style="flex:1;min-width:140px;padding:12px;border-radius:16px;background:#FFFFFF;border:1px solid #EEE8F7;">
              <div style="font-size:12px;color:#6B5B84;">Habit</div>
              <div style="font-size:22px;font-weight:700;color:#2B1B3D;">${esc(
                String(input.habitScore)
              )}<span style="color:#9A8BB1;font-weight:600;">/5</span></div>
              <div style="font-size:13px;color:#6B5B84;">${esc(
                input.alignmentLabel ? `Alignment: ${input.alignmentLabel}` : ""
              )}</div>
            </div>`
          : ""
      }
    </div>
  `;

  const memoryLineHtml = input.memoryLine
    ? `<div style="margin-top:14px;padding:12px 14px;border-radius:16px;background:#F8F5FF;border:1px solid #E9D7FF;color:#3B2B57;font-size:14px;line-height:1.45;">
        ${esc(input.memoryLine)}
      </div>`
    : "";

  const storyHtml = input.story
    ? `<div style="margin-top:14px;padding:14px 16px;border-radius:18px;background:#FFFFFF;border:1px solid #EEE8F7;color:#2B1B3D;font-size:15px;line-height:1.6;">
        ${esc(input.story)}
      </div>`
    : "";

  const nextActionsHtml =
    input.plan === "PREMIUM" && input.nextActions?.length
      ? `<div style="margin-top:14px;padding:14px 16px;border-radius:18px;background:#FFFFFF;border:1px solid #EEE8F7;">
          <div style="font-size:13px;color:#6B5B84;margin-bottom:8px;">Next actions (small, doable)</div>
          <ul style="margin:0;padding-left:18px;color:#2B1B3D;font-size:14px;line-height:1.55;">
            ${input.nextActions
              .slice(0, 3)
              .map((a) => `<li style="margin:6px 0;">${esc(a)}</li>`)
              .join("")}
          </ul>
        </div>`
      : "";

  const challengeHtml =
    input.plan === "PREMIUM" && (input.weeklyChallengeTitle || input.weeklyChallengeSteps?.length)
      ? `<div style="margin-top:14px;padding:14px 16px;border-radius:18px;background:#FFFFFF;border:1px solid #EEE8F7;">
          <div style="font-size:13px;color:#6B5B84;margin-bottom:6px;">This week’s gentle challenge</div>
          ${
            input.weeklyChallengeTitle
              ? `<div style="font-size:16px;font-weight:700;color:#2B1B3D;margin-bottom:8px;">${esc(
                  input.weeklyChallengeTitle
                )}</div>`
              : ""
          }
          ${
            input.weeklyChallengeSteps?.length
              ? `<ol style="margin:0;padding-left:18px;color:#2B1B3D;font-size:14px;line-height:1.55;">
                  ${input.weeklyChallengeSteps
                    .slice(0, 5)
                    .map((s) => `<li style="margin:6px 0;">${esc(s)}</li>`)
                    .join("")}
                </ol>`
              : ""
          }
        </div>`
      : "";

  const upsellHtml =
    input.plan === "FREE"
      ? `<div style="margin-top:14px;padding:14px 16px;border-radius:18px;background:#FFF7ED;border:1px solid #FED7AA;color:#7C2D12;">
          <div style="font-size:14px;line-height:1.55;">
            Premium unlocks <b>partner mirror</b>, <b>next actions</b>, and a deeper weekly guide — designed to feel calm, supportive, and practical.
          </div>
          <div style="margin-top:10px;">
            <a href="${esc(
              reportUrl
            )}" style="display:inline-block;padding:10px 14px;border-radius:14px;background:#2B1B3D;color:#FFFFFF;text-decoration:none;font-weight:700;">
              View your report
            </a>
          </div>
        </div>`
      : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(weeklyReflectionSubject(input))}</title>
  </head>
  <body style="margin:0;background:#FAF7FF;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preheader}
    </div>

    <div style="max-width:640px;margin:0 auto;padding:22px;">
      <div style="padding:18px 18px;border-radius:22px;background:#FFFFFF;border:1px solid #EEE8F7;">
        <div style="font-size:12px;color:#6B5B84;letter-spacing:.02em;">BondIQ Weekly Reflection</div>
        <div style="font-size:24px;font-weight:800;color:#2B1B3D;margin-top:6px;">${esc(
          input.weekLabel
        )}</div>
        <div style="font-size:15px;color:#3B2B57;margin-top:10px;line-height:1.6;">${hello}<br/>
          Here’s a calm snapshot of your week — no judgment, just clarity.
        </div>

        <div style="margin-top:12px;">${pills}</div>

        ${metricRow}
        ${memoryLineHtml}
        ${storyHtml}
        ${nextActionsHtml}
        ${challengeHtml}
        ${upsellHtml}

        <div style="margin-top:16px;">
          <a href="${esc(
            reportUrl
          )}" style="display:inline-block;padding:12px 16px;border-radius:16px;background:#5B2EFF;color:#FFFFFF;text-decoration:none;font-weight:800;">
            Open your full report
          </a>
        </div>

        <div style="margin-top:16px;font-size:12px;color:#8A7BA2;line-height:1.5;">
          If you’d rather not receive these reflections, you can <a href="${esc(
            unsubscribe
          )}" style="color:#6B5B84;">unsubscribe</a>.
        </div>
      </div>

      <div style="margin-top:14px;font-size:11px;color:#9A8BB1;text-align:center;">
        BondIQ • care@bondiq.app
      </div>
    </div>
  </body>
</html>`;
}
