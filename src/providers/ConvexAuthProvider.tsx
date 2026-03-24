"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex } from "@/lib/convex";

export function ConvexAuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
