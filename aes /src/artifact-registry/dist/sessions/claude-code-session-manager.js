"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeSessionManager = void 0;
const local_process_session_manager_1 = require("./local-process-session-manager");
class ClaudeCodeSessionManager {
    constructor(sessionManager = new local_process_session_manager_1.LocalProcessSessionManager()) {
        this.sessionManager = sessionManager;
    }
    async startBuilderSession(input) {
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
    getBuilderSession(sessionId) {
        return this.sessionManager.getSession(sessionId);
    }
    listBuilderSessions() {
        return this.sessionManager.listSessions();
    }
    waitForBuilderSession(sessionId, timeoutMs) {
        return this.sessionManager.waitForSession(sessionId, timeoutMs);
    }
    terminateBuilderSession(sessionId) {
        return this.sessionManager.terminateSession(sessionId);
    }
}
exports.ClaudeCodeSessionManager = ClaudeCodeSessionManager;
//# sourceMappingURL=claude-code-session-manager.js.map