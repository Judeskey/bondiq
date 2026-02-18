import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <div className="font-semibold text-slate-900">Product</div>
            <div className="mt-3 space-y-2">
              <div><Link className="hover:underline" href="/pricing">Pricing</Link></div>
              <div><Link className="hover:underline" href="/faq">FAQ</Link></div>
              <div><Link className="hover:underline" href="/support">Support</Link></div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900">Legal</div>
            <div className="mt-3 space-y-2">
              <div><Link className="hover:underline" href="/privacy">Privacy Policy</Link></div>
              <div><Link className="hover:underline" href="/terms">Terms of Service</Link></div>
              <div><Link className="hover:underline" href="/compliance">Compliance & Safety</Link></div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900">Company</div>
            <div className="mt-3 space-y-2">
              <div><Link className="hover:underline" href="/support">Contact</Link></div>
            </div>
          </div>

          <div className="text-xs leading-5">
            <div className="font-semibold text-slate-900">BondIQ</div>
            <div className="mt-3">
              Relationship clarity from quick check-ins — delivered as calm, actionable reflections.
            </div>
            <div className="mt-3 text-slate-500">© {new Date().getFullYear()} BondIQ</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
