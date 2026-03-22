import type { Bridge, Build, StoredRecord } from "../types";
import { LocalProcessSessionManager, type ManagedSession } from "./local-process-session-manager";
export interface StartBuilderSessionInput {
    build_record: StoredRecord<Build>;
    bridge_record: StoredRecord<Bridge>;
    cwd: string;
    command: string;
    args?: string[];
    prompt?: string;
    env?: Record<string, string>;
    max_buffer_bytes?: number;
}
export declare class ClaudeCodeSessionManager {
    private readonly sessionManager;
    constructor(sessionManager?: LocalProcessSessionManager);
    startBuilderSession(input: StartBuilderSessionInput): Promise<ManagedSession>;
    getBuilderSession(sessionId: string): ManagedSession;
    listBuilderSessions(): ManagedSession[];
    waitForBuilderSession(sessionId: string, timeoutMs?: number): Promise<ManagedSession>;
    terminateBuilderSession(sessionId: string): Promise<ManagedSession>;
}
//# sourceMappingURL=claude-code-session-manager.d.ts.map