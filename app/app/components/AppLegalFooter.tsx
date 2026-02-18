import Link from "next/link";

export default function AppLegalFooter() {
  return (
    <div className="mt-10 border-t py-6 text-center text-xs text-slate-500">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        <Link className="hover:underline" href="/privacy">Privacy</Link>
        <Link className="hover:underline" href="/terms">Terms</Link>
        <Link className="hover:underline" href="/faq">FAQ</Link>
        <Link className="hover:underline" href="/compliance">Compliance</Link>
        <Link className="hover:underline" href="/support">Support</Link>
      </div>
      <div className="mt-2">© {new Date().getFullYear()} BondIQ</div>
    </div>
  );
}
