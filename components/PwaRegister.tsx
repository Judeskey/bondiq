"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_DAYS = 14;
const KEY_DISMISSED = "bondiq_pwa_dismissed";
const KEY_INSTALLED = "bondiq_pwa_installed";

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const engaged = useRef(false);

  // ✅ Service worker registration (kept from your original)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const canShow = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return false;

    const dismissed = Number(localStorage.getItem(KEY_DISMISSED) || 0);
    if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 86400000) return false;

    if (localStorage.getItem(KEY_INSTALLED)) return false;

    return true;
  }, []);

  useEffect(() => {
    if (!canShow) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    const timer = setTimeout(() => {
      engaged.current = true;
      setShow(true);
    }, 2500);

    const onInstalled = () => {
      localStorage.setItem(KEY_INSTALLED, "1");
      setShow(false);
    };

    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, [canShow]);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem(KEY_INSTALLED, "1");
    } else {
      localStorage.setItem(KEY_DISMISSED, String(Date.now()));
    }

    setShow(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(KEY_DISMISSED, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  const ios = isIos();

  return (
    <div className="fixed inset-x-0 bottom-3 z-[70] px-3 sm:hidden">
      <div className="mx-auto max-w-md rounded-2xl border bg-white shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Image src="/logo.png" alt="BondIQ" width={28} height={28} />
          <div className="text-sm font-semibold">Install BondIQ</div>

          <button
            onClick={dismiss}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 text-sm text-slate-700">
          {ios ? (
            <>
              Tap <b>Share</b> ⬆️ then <b>Add to Home Screen</b>.
            </>
          ) : (
            <>Add BondIQ to your home screen for quick access.</>
          )}

          <div className="mt-4 flex gap-2">
            {!ios && deferred && (
              <button
                onClick={install}
                className="bg-[#ec4899] text-white px-3 py-2 rounded-lg text-sm font-semibold"
              >
                Install
              </button>
            )}

            <button
              onClick={dismiss}
              className="border px-3 py-2 rounded-lg text-sm font-semibold"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
