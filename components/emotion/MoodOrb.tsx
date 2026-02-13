// components/emotion/MoodOrb.tsx
"use client";

import { motion } from "framer-motion";
import {
  EMOTION_STATE_MAP,
  normalizeState,
  type EmotionStateKey,
} from "./stateMap";

type Props = {
  state: unknown;          // server value (string/enum)
  confidence?: number;     // 0..1 or 0..100
  size?: number;           // px
  showLabel?: boolean;
  className?: string;
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function to01(conf?: number) {
  if (conf == null) return 0.6;
  const n = Number(conf);
  if (!Number.isFinite(n)) return 0.6;
  // accept 0..100 or 0..1
  return n > 1 ? clamp01(n / 100) : clamp01(n);
}

export default function MoodOrb({
  state,
  confidence,
  size = 56,
  showLabel = true,
  className = "",
}: Props) {
  const key: EmotionStateKey = normalizeState(state);
  const meta = EMOTION_STATE_MAP[key];
  const c = to01(confidence);

  const pulse = 0.9 + c * 0.3; // gentle amplitude
  const glow = 0.15 + c * 0.25;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* outer ring */}
        <motion.div
          aria-hidden
          className={`absolute inset-0 rounded-full ring-2 ${meta.ringClass}`}
          style={{ width: size, height: size }}
          animate={{
            scale: [1, pulse, 1],
            opacity: [0.65, 0.9, 0.65],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* orb */}
        <motion.div
          title={meta.why}
          className={`relative rounded-full shadow-sm ${meta.orbGradient}`}
          style={{
            width: size,
            height: size,
            filter: `saturate(1.05)`,
          }}
          animate={{
            y: [0, -2, 0, 2, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* soft inner shimmer */}
          <motion.div
            aria-hidden
            className="absolute inset-1 rounded-full bg-white/40"
            animate={{ opacity: [0.25, glow, 0.25] }}
            transition={{
              duration: 3.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="absolute inset-0 grid place-items-center text-lg">
            <span aria-hidden>{meta.emoji}</span>
          </div>
        </motion.div>
      </div>

      {showLabel && (
        <div className="min-w-[160px]">
          <div className="text-sm font-semibold text-slate-900">
            {meta.label}
          </div>
          <div className="text-xs text-slate-600">{meta.short}</div>
        </div>
      )}
    </div>
  );
}
