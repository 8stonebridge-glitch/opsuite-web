import { ArtifactRegistry, generateArtifactId } from "../registry";
import type { Request, StoredRecord } from "../types";

export interface SubmitRequestInput {
  feature_id?: string;
  intent: string;
  requested_by: string;
  risk_domain_tags?: string[];
}

export class InvalidRequestTransitionError extends Error {
  constructor(requestId: string, from: Request["status"], to: Request["status"]) {
    super(`Invalid request transition for ${requestId}: ${from} -> ${to}`);
    this.name = "InvalidRequestTransitionError";
  }
}

const ALLOWED_REQUEST_TRANSITIONS: Record<Request["status"], Set<Request["status"]>> = {
  PENDING: new Set(["ACCEPTED", "REJECTED"]),
  ACCEPTED: new Set(["PROCESSING"]),
  REJECTED: new Set([]),
  PROCESSING: new Set(["COMPLETE", "REJECTED"]),
  COMPLETE: new Set([]),
};

function slugifyFeatureId(source: string): string {
  const slug = source
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return slug.length > 0 ? `FEAT-${slug}` : "FEAT-UNTITLED";
}

function normalizeRiskTags(riskDomainTags: string[] = []): string[] {
  const normalized = riskDomainTags
    .map((riskDomainTag) => riskDomainTag.trim().toLowerCase())
    .filter((riskDomainTag) => riskDomainTag.length > 0);

  return Array.from(new Set(normalized));
}

export class RequestIntakeService {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date()
  ) {}

  async submitRequest(input: SubmitRequestInput): Promise<StoredRecord<Request>> {
    const request: Request = {
      request_id: generateArtifactId("request"),
      feature_id: input.feature_id?.trim() || slugifyFeatureId(input.intent),
      intent: input.intent.trim(),
      requested_by: input.requested_by.trim(),
      risk_domain_tags: normalizeRiskTags(input.risk_domain_tags),
      created_at: this.now().toISOString(),
      status: "PENDING",
    };

    return this.registry.write("request", request);
  }

  async acceptRequest(requestId: string): Promise<StoredRecord<Request>> {
    return this.transition(requestId, "ACCEPTED");
  }

  async rejectRequest(requestId: string): Promise<StoredRecord<Request>> {
    return this.transition(requestId, "REJECTED");
  }

  async markProcessing(requestId: string): Promise<StoredRecord<Request>> {
    return this.transition(requestId, "PROCESSING");
  }

  async completeRequest(requestId: string): Promise<StoredRecord<Request>> {
    return this.transition(requestId, "COMPLETE");
  }

  private async transition(
    requestId: string,
    nextStatus: Request["status"]
  ): Promise<StoredRecord<Request>> {
    const current = await this.registry.read<Request>("request", requestId);
    if (!ALLOWED_REQUEST_TRANSITIONS[current.payload.status].has(nextStatus)) {
      throw new InvalidRequestTransitionError(
        requestId,
        current.payload.status,
        nextStatus
      );
    }

    return this.registry.write("request", {
      ...current.payload,
      status: nextStatus,
    });
  }
}
