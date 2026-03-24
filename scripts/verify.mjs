import { spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "full";

const baseEnv = {
  ...process.env,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ci-placeholder",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "sk_test_ci-placeholder",
  NEXT_PUBLIC_CONVEX_URL:
    process.env.NEXT_PUBLIC_CONVEX_URL || "https://ci-placeholder.convex.cloud",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in",
  NEXT_PUBLIC_CLERK_SIGN_UP_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up",
};

const steps =
  mode === "fast"
    ? [
        ["npm", ["run", "typecheck"]],
        ["npm", ["run", "lint"]],
      ]
    : [
        ["npm", ["run", "typecheck"]],
        ["npm", ["run", "lint"]],
        ["npm", ["run", "test"]],
        ["npm", ["run", "build"]],
      ];

for (const [command, args] of steps) {
  console.log(`\n[verify] Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: baseEnv,
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
