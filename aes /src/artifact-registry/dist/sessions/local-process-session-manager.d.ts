export type SessionRole = "orchestrator" | "builder" | "validator" | "research";
export type ManagedSessionStatus = "STARTING" | "RUNNING" | "EXITED" | "FAILED" | "TERMINATED";
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
export declare class ManagedSessionNotFoundError extends Error {
    constructor(sessionId: string);
}
export declare class ManagedSessionTimeoutError extends Error {
    constructor(sessionId: string, timeoutMs: number);
}
export declare class LocalProcessSessionManager {
    private readonly sessions;
    startSession(spec: SessionStartSpec): Promise<ManagedSession>;
    getSession(sessionId: string): ManagedSession;
    listSessions(): ManagedSession[];
    waitForSession(sessionId: string, timeoutMs?: number): Promise<ManagedSession>;
    terminateSession(sessionId: string, signal?: NodeJS.Signals): Promise<ManagedSession>;
}
//# sourceMappingURL=local-process-session-manager.d.ts.map