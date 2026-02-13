// app/signin/page.tsx
import SignInClient from "./sign-in-client";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  // ✅ If caller provides callbackUrl (invite page should), preserve it.
  // Otherwise default to reports.
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string" && searchParams.callbackUrl.trim()
      ? searchParams.callbackUrl
      : "/app/reports";

  const error = searchParams?.error;

  return (
    <div className="min-h-[calc(100vh-0px)] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Sign-in error: <span className="font-mono">{error}</span>
          </div>
        ) : null}

        <div className="mt-6">
          <SignInClient callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
