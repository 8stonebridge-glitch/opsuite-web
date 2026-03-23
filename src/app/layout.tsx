import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "./providers";
import { SkipLink } from "@/components/ui/SkipLink";
import { assertAuthEnv } from "@/lib/validateAuthEnv";

// FEAT-AUTH-01: Validate auth env vars at server startup — fail fast
assertAuthEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpSuite",
  description: "Operations management platform",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Patch DOM methods to tolerate nodes injected by browser extensions
            (MetaMask, Polkadot.js, Grammarly, password managers, auto-translators).
            Extensions inject DOM nodes before React hydrates, causing insertBefore/
            removeChild to fail. This catches those errors silently. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof Node !== 'undefined') {
                const origRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                  if (child.parentNode !== this) {
                    if (typeof console !== 'undefined') {
                      console.warn('removeChild: node not a child, likely extension interference');
                    }
                    return child;
                  }
                  return origRemoveChild.apply(this, arguments);
                };
                const origInsertBefore = Node.prototype.insertBefore;
                Node.prototype.insertBefore = function(newNode, refNode) {
                  if (refNode && refNode.parentNode !== this) {
                    if (typeof console !== 'undefined') {
                      console.warn('insertBefore: ref node not a child, likely extension interference');
                    }
                    return newNode;
                  }
                  return origInsertBefore.apply(this, arguments);
                };
              }
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-100`}
      >
        <SkipLink />
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/onboarding"
          afterSignOutUrl="/sign-in"
        >
          {/* CSS-only loader — visible immediately, no JS dependency.
              Guarantees the user never sees a blank white screen even
              if Clerk, Convex, or any JS fails entirely. Removed by
              InitialLoaderDismiss once React hydrates. */}
          <div
            id="initial-loader"
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-50 dark:bg-surface-950"
          >
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                OpSuite
              </p>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-emerald-600 dark:border-surface-700 dark:border-t-emerald-400" />
            </div>
          </div>
          <main id="main-content">
            <Providers>{children}</Providers>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
