export function trackEvent(
    name: string,
    params?: Record<string, any>
  ) {
    if (typeof window === "undefined") return;
  
    // @ts-ignore
    if (!window.gtag) return;
  
    // @ts-ignore
    window.gtag("event", name, params || {});
  }
  