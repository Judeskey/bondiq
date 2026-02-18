export const metadata = { title: "FAQ • BondIQ" };

const FAQS = [
  { q: "What is BondIQ?", a: "BondIQ turns short check-ins into weekly relationship insights and reflections." },
  { q: "Is my data private?", a: "We treat your relationship data as sensitive. See our Privacy Policy for details." },
  { q: "How does Premium work?", a: "Premium unlocks deeper patterns, longer trends, and enhanced insights." },
  { q: "Can I cancel anytime?", a: "Yes. You can cancel your subscription from your account settings." },
  { q: "How do I contact support?", a: "Use the Support page to send feedback or complaints." },
];

export default function FAQPage() {
  return (
    <main className="min-h-[70vh] px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">FAQ</h1>
        <p className="mt-3 text-slate-600">Quick answers to common questions.</p>

        <div className="mt-10 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="font-semibold">{f.q}</div>
              <div className="mt-2 text-slate-600">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
