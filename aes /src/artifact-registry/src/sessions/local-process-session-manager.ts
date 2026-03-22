import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export type SessionRole = "orchestrator" | "builder" | "validator" | "research";
export type ManagedSessionStatus =
  | "STARTING"
  | "RUNNING"
  | "EXITED"
  | "FAILED"
  | "TERMINATED";

export interface SessionStartSpec {
  role: SessionRole;
  command: string;
  args?: string[];
  cwd: string;
  env?: Record<string, string>;
  build_id?: string;
  bridge_id?: string;
  read_scope?: string[];
  write_scope?: string[];
  max_buffer_bytes?: number;
}

export interface ManagedSession {
  session_id: string;
  role: SessionRole;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  build_id: string | null;
  bridge_id: string | null;
  status: ManagedSessionStatus;
  pid: number | null;
  started_at: string;
  ended_at: string | null;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export class ManagedSessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Managed session ${sessionId} was not found.`);
    this.name = "ManagedSessionNotFoundError";
  }
}

export class ManagedSessionTimeoutError extends Error {
  constructor(sessionId: string, timeoutMs: number) {
    super(`Managed session ${sessionId} did not exit within ${timeoutMs}ms.`);
    this.name = "ManagedSessionTimeoutError";
  }
}

interface SessionState {
  record: ManagedSession;
  child: ReturnType<typeof spawn>;
  completion: Promise<ManagedSession>;
}

const EXPORTED_SESSION_ENV_KEYS = new Set([
  "AES_SESSION_ID",
  "AES_SESSION_ROLE",
  "AES_BUILD_ID",
  "AES_BRIDGE_ID",
  "AES_READ_SCOPE",
  "AES_WRITE_SCOPE",
  "AES_BUILDER_PROMPT",
]);

function appendTail(current: string, next: string, maxBytes: number): string {
  const merged = current + next;
  if (Buffer.byteLength(merged, "utf8") <= maxBytes) {
    return merged;
  }

  let slice = merged;
  while (Buffer.byteLength(slice, "utf8") > maxBytes) {
    slice = slice.slice(Math.ceil(slice.length / 10));
  }

  return slice;
}

function cloneRecord(record: ManagedSession): ManagedSession {
  return {
    ...record,
    args: [...record.args],
    env: { ...record.env },
  };
}

function publicSessionEnv(env: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => EXPORTED_SESSION_ENV_KEYS.has(key))
  );
}

export class LocalProcessSessionManager {
  private readonly sessions = new Map<string, SessionState>();

  async startSession(spec: SessionStartSpec): Promise<ManagedSession> {
    const sessionId = randomUUID();
    const maxBufferBytes = spec.max_buffer_bytes ?? 64 * 1024;
    const spawnEnv: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      ),
      ...(spec.env ?? {}),
      AES_SESSION_ID: sessionId,
      AES_SESSION_ROLE: spec.role,
      AES_BUILD_ID: spec.build_id ?? "",
      AES_BRIDGE_ID: spec.bridge_id ?? "",
      AES_READ_SCOPE: JSON.stringify(spec.read_scope ?? []),
      AES_WRITE_SCOPE: JSON.stringify(spec.write_scope ?? []),
    };

    const record: ManagedSession = {
      session_id: sessionId,
      role: spec.role,
      command: spec.command,
      args: spec.args ?? [],
      cwd: spec.cwd,
      env: publicSessionEnv(spawnEnv),
      build_id: spec.build_id ?? null,
      bridge_id: spec.bridge_id ?? null,
      status: "STARTING",
      pid: null,
      started_at: new Date().toISOString(),
      ended_at: null,
      exit_code: null,
      signal: null,
      stdout: "",
      stderr: "",
    };

    const child = spawn(spec.command, spec.args ?? [], {
      cwd: spec.cwd,
      env: spawnEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    record.pid = child.pid ?? null;
    record.status = "RUNNING";

    child.stdout?.on("data", (chunk: Buffer | string) => {
      record.stdout = appendTail(record.stdout, chunk.toString(), maxBufferBytes);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      record.stderr = appendTail(record.stderr, chunk.toString(), maxBufferBytes);
    });

    const completion = new Promise<ManagedSession>((resolve) => {
      child.on("error", (error) => {
        record.status = "FAILED";
        record.stderr = appendTail(record.stderr, `${error.message}\n`, maxBufferBytes);
        record.ended_at = new Date().toISOString();
        resolve(cloneRecord(record));
      });

      child.on("close", (code, signal) => {
        record.exit_code = code;
        record.signal = signal;
        record.ended_at = new Date().toISOString();

        if (record.status !== "FAILED" && record.status !== "TERMINATED") {
          record.status = code === 0 ? "EXITED" : "FAILED";
        }

        resolve(cloneRecord(record));
      });
    });

    this.sessions.set(sessionId, { record, child, completion });
    return cloneRecord(record);
  }

  getSession(sessionId: string): ManagedSession {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new ManagedSessionNotFoundError(sessionId);
    }

    return cloneRecord(state.record);
  }

  listSessions(): ManagedSession[] {
    return Array.from(this.sessions.values(), (state) => cloneRecord(state.record));
  }

  async waitForSession(
    sessionId: string,
    timeoutMs?: number
  ): Promise<ManagedSession> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new ManagedSessionNotFoundError(sessionId);
    }

    if (!timeoutMs || timeoutMs <= 0) {
      return state.completion;
    }

    return new Promise<ManagedSession>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ManagedSessionTimeoutError(sessionId, timeoutMs));
      }, timeoutMs);

      state.completion.then(
        (record) => {
          clearTimeout(timeoutId);
          resolve(record);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }

  async terminateSession(
    sessionId: string,
    signal: NodeJS.Signals = "SIGTERM"
  ): Promise<ManagedSession> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new ManagedSessionNotFoundError(sessionId);
    }

    if (state.record.status === "EXITED" || state.record.status === "FAILED") {
      return cloneRecord(state.record);
    }

    state.record.status = "TERMINATED";
    state.child.kill(signal);
    return state.completion;
  }
}
