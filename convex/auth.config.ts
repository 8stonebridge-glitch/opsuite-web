import type { AuthConfig } from 'convex/server';

export default {
  providers: [
    {
      domain: "https://informed-kiwi-54.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
