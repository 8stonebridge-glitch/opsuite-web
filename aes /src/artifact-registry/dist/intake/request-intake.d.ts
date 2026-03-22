import { ArtifactRegistry } from "../registry";
import type { Request, StoredRecord } from "../types";
export interface SubmitRequestInput {
    feature_id?: string;
    intent: string;
    requested_by: string;
    risk_domain_tags?: string[];
}
export declare class InvalidRequestTransitionError extends Error {
    constructor(requestId: string, from: Request["status"], to: Request["status"]);
}
export declare class RequestIntakeService {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    submitRequest(input: SubmitRequestInput): Promise<StoredRecord<Request>>;
    acceptRequest(requestId: string): Promise<StoredRecord<Request>>;
    rejectRequest(requestId: string): Promise<StoredRecord<Request>>;
    markProcessing(requestId: string): Promise<StoredRecord<Request>>;
    completeRequest(requestId: string): Promise<StoredRecord<Request>>;
    private transition;
}
//# sourceMappingURL=request-intake.d.ts.map