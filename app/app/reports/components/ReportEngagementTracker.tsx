"use client";

import { useEffect, useRef } from "react";

export default function ReportEngagementTracker() {
  const lastTs = useRef<number>(Date.now());
  const mounted = useRef(false);

  async function sendSeconds(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;

    // Use sendBeacon when possible (works on unload)
    const payload = JSON.stringify({ seconds });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/engagement/report", blob);
        return;
      }
    } catch {}

    try {
      await fetch("/api/engagement/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    mounted.current = true;
    lastTs.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTs.current) / 1000);
      if (delta >= 10) {
        lastTs.current = now;
        sendSeconds(delta);
      }
    }, 10000);

    const onVis = () => {
      if (document.visibilityState !== "visible") {
        const now = Date.now();
        const delta = Math.floor((now - lastTs.current) / 1000);
        lastTs.current = now;
        if (delta > 0) sendSeconds(delta);
      } else {
        lastTs.current = Date.now();
      }
    };

    const onUnload = () => {
      const now = Date.now();
      const delta = Math.floor((now - lastTs.current) / 1000);
      lastTs.current = now;
      if (delta > 0) sendSeconds(delta);
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
      if (mounted.current) onUnload();
      mounted.current = false;
    };
  }, []);

  return null;
}
