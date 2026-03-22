#!/usr/bin/env node

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import neo4j from "neo4j-driver";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadDotenv({
  path: path.join(projectRoot, ".env"),
  override: false,
  quiet: true,
});
loadDotenv({
  path: path.join(projectRoot, ".env.local"),
  override: true,
  quiet: true,
});

const command = process.argv[2] ?? "status";
const dockerNetwork = "aes-platform-net";
const postgresPort = process.env.AES_LOCAL_POSTGRES_PORT ?? "15432";
const neo4jHttpPort = process.env.AES_LOCAL_NEO4J_HTTP_PORT ?? "17474";
const neo4jBoltPort = process.env.AES_LOCAL_NEO4J_BOLT_PORT ?? "17687";
const postgresUrl =
  process.env.AES_POSTGRES_URL ??
  `postgres://aes:aes_dev_password@127.0.0.1:${postgresPort}/aes_platform`;
const neo4jUri =
  process.env.AES_NEO4J_URI ?? `bolt://127.0.0.1:${neo4jBoltPort}`;
const neo4jUsername = process.env.AES_NEO4J_USERNAME ?? "neo4j";
const neo4jPassword = process.env.AES_NEO4J_PASSWORD ?? "aes_dev_password";
const { Client } = pg;
const containers = [
  {
    name: "aes-platform-postgres",
    image: "postgres:16-alpine",
    args: [
      "--env",
      "POSTGRES_DB=aes_platform",
      "--env",
      "POSTGRES_USER=aes",
      "--env",
      "POSTGRES_PASSWORD=aes_dev_password",
      "--publish",
      `${postgresPort}:5432`,
      "--volume",
      "aes-platform-postgres-data:/var/lib/postgresql/data",
      "--volume",
      `${path.join(projectRoot, "schema.sql")}:/docker-entrypoint-initdb.d/001-schema.sql:ro`,
    ],
  },
  {
    name: "aes-platform-neo4j",
    image: "neo4j:5.26.3-community",
    args: [
      "--env",
      "NEO4J_AUTH=neo4j/aes_dev_password",
      "--publish",
      `${neo4jHttpPort}:7474`,
      "--publish",
      `${neo4jBoltPort}:7687`,
      "--volume",
      "aes-platform-neo4j-data:/data",
      "--volume",
      "aes-platform-neo4j-logs:/logs",
    ],
  },
];

function run(commandName, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, args, {
      cwd: projectRoot,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
        return;
      }

      reject(
        new Error(
          stderr.trim() || `Command failed: ${commandName} ${args.join(" ")}`
        )
      );
    });
  });
}

async function containerExists(name) {
  try {
    const result = await run(
      "docker",
      ["inspect", "--format", "{{.Name}}", name],
      { capture: true }
    );
    return result.stdout.length > 0;
  } catch {
    return false;
  }
}

async function containerIsRunning(name) {
  try {
    const result = await run(
      "docker",
      ["inspect", "--format", "{{.State.Running}}", name],
      { capture: true }
    );
    return result.stdout === "true";
  } catch {
    return false;
  }
}

async function ensureNetwork() {
  try {
    await run("docker", ["network", "inspect", dockerNetwork], { capture: true });
  } catch {
    await run("docker", ["network", "create", dockerNetwork]);
  }
}

async function waitFor(description, fn, timeoutMs = 60000, intervalMs = 1000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fn();
      return;
    } catch (error) {
      lastError = error;
      await delay(intervalMs);
    }
  }

  throw new Error(
    `${
      description
    } did not become ready within ${timeoutMs}ms: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function waitForPostgres() {
  await waitFor("Postgres", async () => {
    const client = new Client({
      connectionString: postgresUrl,
    });

    try {
      await client.connect();
      await client.query("SELECT 1");
    } finally {
      await client.end().catch(() => undefined);
    }
  });
}

async function waitForNeo4j() {
  await waitFor("Neo4j", async () => {
    const driver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUsername, neo4jPassword)
    );

    try {
      await driver.verifyConnectivity();
      const session = driver.session();
      try {
        await session.run("RETURN 1 AS ok");
      } finally {
        await session.close();
      }
    } finally {
      await driver.close();
    }
  });
}

async function up() {
  await ensureNetwork();

  for (const container of containers) {
    const exists = await containerExists(container.name);
    if (!exists) {
      await run("docker", [
        "run",
        "-d",
        "--name",
        container.name,
        "--network",
        dockerNetwork,
        ...container.args,
        container.image,
      ]);
      continue;
    }

    const running = await containerIsRunning(container.name);
    if (!running) {
      await run("docker", ["start", container.name]);
    }
  }

  await waitForPostgres();
  await waitForNeo4j();
  await status();
}

async function down() {
  for (const container of containers) {
    if (await containerExists(container.name)) {
      const running = await containerIsRunning(container.name);
      if (running) {
        await run("docker", ["stop", container.name]);
      }
    }
  }
}

async function status() {
  const statusRows = [];

  for (const container of containers) {
    const exists = await containerExists(container.name);
    if (!exists) {
      statusRows.push({
        name: container.name,
        running: false,
        status: "missing",
      });
      continue;
    }

    const result = await run(
      "docker",
      [
        "inspect",
        "--format",
        "{{.State.Status}}",
        container.name,
      ],
      { capture: true }
    );
    statusRows.push({
      name: container.name,
      running: result.stdout === "running",
      status: result.stdout,
    });
  }

  process.stdout.write(`${JSON.stringify(statusRows, null, 2)}\n`);
}

if (command === "up") {
  await up();
} else if (command === "down") {
  await down();
} else if (command === "status") {
  await status();
} else {
  process.stderr.write(
    'Usage: node scripts/local-stack.mjs <up|down|status>\n'
  );
  process.exit(1);
}
