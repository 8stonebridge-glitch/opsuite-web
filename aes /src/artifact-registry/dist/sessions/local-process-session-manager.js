"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalProcessSessionManager = exports.ManagedSessionTimeoutError = exports.ManagedSessionNotFoundError = void 0;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
class ManagedSessionNotFoundError extends Error {
    constructor(sessionId) {
        super(`Managed session ${sessionId} was not found.`);
        this.name = "ManagedSessionNotFoundError";
    }
}
exports.ManagedSessionNotFoundError = ManagedSessionNotFoundError;
class ManagedSessionTimeoutError extends Error {
    constructor(sessionId, timeoutMs) {
        super(`Managed session ${sessionId} did not exit within ${timeoutMs}ms.`);
        this.name = "ManagedSessionTimeoutError";
    }
}
exports.ManagedSessionTimeoutError = ManagedSessionTimeoutError;
const EXPORTED_SESSION_ENV_KEYS = new Set([
    "AES_SESSION_ID",
    "AES_SESSION_ROLE",
    "AES_BUILD_ID",
    "AES_BRIDGE_ID",
    "AES_READ_SCOPE",
    "AES_WRITE_SCOPE",
    "AES_BUILDER_PROMPT",
]);
function appendTail(current, next, maxBytes) {
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
function cloneRecord(record) {
    return {
        ...record,
        args: [...record.args],
        env: { ...record.env },
    };
}
function publicSessionEnv(env) {
    return Object.fromEntries(Object.entries(env).filter(([key]) => EXPORTED_SESSION_ENV_KEYS.has(key)));
}
class LocalProcessSessionManager {
    constructor() {
        this.sessions = new Map();
    }
    async startSession(spec) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        const maxBufferBytes = spec.max_buffer_bytes ?? 64 * 1024;
        const spawnEnv = {
            ...Object.fromEntries(Object.entries(process.env)
                .filter((entry) => typeof entry[1] === "string")),
            ...(spec.env ?? {}),
            AES_SESSION_ID: sessionId,
            AES_SESSION_ROLE: spec.role,
            AES_BUILD_ID: spec.build_id ?? "",
            AES_BRIDGE_ID: spec.bridge_id ?? "",
            AES_READ_SCOPE: JSON.stringify(spec.read_scope ?? []),
            AES_WRITE_SCOPE: JSON.stringify(spec.write_scope ?? []),
        };
        const record = {
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
        const child = (0, node_child_process_1.spawn)(spec.command, spec.args ?? [], {
            cwd: spec.cwd,
            env: spawnEnv,
            stdio: ["ignore", "pipe", "pipe"],
        });
        record.pid = child.pid ?? null;
        record.status = "RUNNING";
        child.stdout?.on("data", (chunk) => {
            record.stdout = appendTail(record.stdout, chunk.toString(), maxBufferBytes);
        });
        child.stderr?.on("data", (chunk) => {
            record.stderr = appendTail(record.stderr, chunk.toString(), maxBufferBytes);
        });
        const completion = new Promise((resolve) => {
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
    getSession(sessionId) {
        const state = this.sessions.get(sessionId);
        if (!state) {
            throw new ManagedSessionNotFoundError(sessionId);
        }
        return cloneRecord(state.record);
    }
    listSessions() {
        return Array.from(this.sessions.values(), (state) => cloneRecord(state.record));
    }
    async waitForSession(sessionId, timeoutMs) {
        const state = this.sessions.get(sessionId);
        if (!state) {
            throw new ManagedSessionNotFoundError(sessionId);
        }
        if (!timeoutMs || timeoutMs <= 0) {
            return state.completion;
        }
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new ManagedSessionTimeoutError(sessionId, timeoutMs));
            }, timeoutMs);
            state.completion.then((record) => {
                clearTimeout(timeoutId);
                resolve(record);
            }, (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    async terminateSession(sessionId, signal = "SIGTERM") {
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
exports.LocalProcessSessionManager = LocalProcessSessionManager;
//# sourceMappingURL=local-process-session-manager.js.map