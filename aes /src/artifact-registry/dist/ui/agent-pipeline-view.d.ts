/**
 * AES Operator UI — 2D Animated Agent Pipeline View + Extended Panels
 *
 * Renders a live SVG-based visualization of all 25 agents showing:
 *   - Current state (idle/running/done/failed/blocked/waiting)
 *   - What each agent is working on
 *   - Data flow between agents (animated connections)
 *   - Duration timers
 *   - Feature plan, promotion state, dependency order, governance results
 *
 * This is server-rendered HTML + inline JS/CSS.
 * Polls /api/agent-status every 500ms for live updates.
 */
export type AgentState = "idle" | "running" | "done" | "failed" | "blocked" | "waiting";
export interface AgentStatus {
    agent_id: string;
    name: string;
    group: "intake" | "observer" | "story" | "decomposer" | "retriever" | "arbiter" | "promoter" | "strategy" | "bridge" | "builder" | "verifier" | "validator" | "writeback" | "governance";
    state: AgentState;
    current_task?: string;
    feature_id?: string;
    started_at?: string;
    duration_ms?: number;
    last_result?: "pass" | "fail" | "skip" | null;
    progress?: number;
}
export interface PipelineStatus {
    agents: AgentStatus[];
    active_app_id?: string;
    active_feature_id?: string;
    total_features: number;
    completed_features: number;
    failed_features: number;
    blocked_features: number;
    current_phase: string;
    started_at?: string;
    elapsed_ms: number;
}
export declare class AgentActivityTracker {
    private agents;
    private appId?;
    private featureId?;
    private totalFeatures;
    private completedFeatures;
    private failedFeatures;
    private blockedFeatures;
    private currentPhase;
    private startedAt?;
    constructor();
    private initializeAgents;
    update(agentId: string, updates: Partial<AgentStatus>): void;
    setPhase(phase: string): void;
    setApp(appId: string): void;
    setFeature(featureId: string): void;
    setTotals(total: number, completed: number, failed: number, blocked: number): void;
    start(): void;
    resetAll(): void;
    getStatus(): PipelineStatus;
}
export declare function extendedPanelsHtml(): string;
export declare function pipelineCanvasScript(): string;
export declare function extendedPanelScripts(): string;
//# sourceMappingURL=agent-pipeline-view.d.ts.map