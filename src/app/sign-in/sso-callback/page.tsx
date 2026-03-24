'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * SSO callback page for sign-in.
 * Convex Auth handles the OAuth callback internally via its HTTP endpoint.
 * This page simply redirects the user to the post-sign-in destination.
 */
export default function SSOCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/overview');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-surface-500">Completing sign-in...</p>
    </div>
  );
}
