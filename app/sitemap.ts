export default function sitemap() {
    const base = "https://bondiq.app";
  
    return [
      { url: base, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/pricing`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/support`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.5 },
    ];
  }
  