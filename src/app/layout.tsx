import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "./providers";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-100`}
      >
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
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
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
