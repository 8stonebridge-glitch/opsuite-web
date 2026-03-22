import type { Bridge, Build, StoredRecord } from "../types";
import {
  LocalProcessSessionManager,
  type ManagedSession,
} from "./local-process-session-manager";

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

export class ClaudeCodeSessionManager {
  constructor(
    private readonly sessionManager: LocalProcessSessionManager = new LocalProcessSessionManager()
  ) {}

  async startBuilderSession(
    input: StartBuilderSessionInput
  ): Promise<ManagedSession> {
    return this.sessionManager.startSession({
      role: "builder",
      command: input.command,
      args: input.args ?? [],
      cwd: input.cwd,
      build_id: input.build_record.payload.build_id,
      bridge_id: input.bridge_record.payload.bridge_id,
      read_scope: input.bridge_record.payload.read_scope.paths,
      write_scope: input.bridge_record.payload.write_scope.paths,
      env: {
        ...(input.env ?? {}),
        AES_BUILDER_PROMPT: input.prompt ?? "",
      },
      max_buffer_bytes: input.max_buffer_bytes,
    });
  }

  getBuilderSession(sessionId: string): ManagedSession {
    return this.sessionManager.getSession(sessionId);
  }

  listBuilderSessions(): ManagedSession[] {
    return this.sessionManager.listSessions();
  }

  waitForBuilderSession(
    sessionId: string,
    timeoutMs?: number
  ): Promise<ManagedSession> {
    return this.sessionManager.waitForSession(sessionId, timeoutMs);
  }

  terminateBuilderSession(sessionId: string): Promise<ManagedSession> {
    return this.sessionManager.terminateSession(sessionId);
  }
}
