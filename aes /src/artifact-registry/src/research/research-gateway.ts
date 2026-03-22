import { ArtifactRegistry, generateArtifactId } from "../registry";
import type { ArtifactRef, ResearchNote, StoredRecord } from "../types";

export interface RecordResearchNoteInput {
  feature_id: string;
  source: string;
  content: string;
  trust_status?: ResearchNote["trust_status"];
  filtered_by?: string | null;
  artifact_refs?: ArtifactRef[];
}

export interface CaptureResearchFromUrlInput {
  feature_id: string;
  url: string;
  source?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  max_chars?: number;
  trust_status?: ResearchNote["trust_status"];
  artifact_refs?: ArtifactRef[];
}

export interface ResearchFetchResult {
  record: StoredRecord<ResearchNote>;
  status: number;
  content_type: string | null;
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  return `${content.slice(0, maxChars)}\n...[truncated]`;
}

function normalizeFetchedContent(contentType: string | null, body: string): string {
  if (contentType?.includes("application/json")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  return body;
}

export class HttpResearchGateway {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly fetchFn: FetchLike = globalThis.fetch as FetchLike,
    private readonly now: () => Date = () => new Date()
  ) {}

  async recordNote(
    input: RecordResearchNoteInput
  ): Promise<StoredRecord<ResearchNote>> {
    const researchNoteId = generateArtifactId("research_note");
    const note: ResearchNote = {
      research_note_id: researchNoteId,
      feature_id: input.feature_id,
      captured_at: this.now().toISOString(),
      source: input.source,
      content: input.content,
      trust_status: input.trust_status ?? "UNTRUSTED",
      filtered_by:
        input.trust_status && input.trust_status !== "UNTRUSTED"
          ? input.filtered_by ?? "operator"
          : null,
      artifact_refs:
        input.artifact_refs && input.artifact_refs.length > 0
          ? input.artifact_refs
          : [
              {
                artifact_type: "research_note",
                artifact_id: researchNoteId,
                role: "external_grounding",
              },
            ],
    };

    return this.registry.write("research_note", note);
  }

  async captureFromUrl(
    input: CaptureResearchFromUrlInput
  ): Promise<ResearchFetchResult> {
    const response = await this.fetchFn(input.url, {
      method: input.method ?? "GET",
      headers: input.headers,
      body: input.body,
    });
    const contentType = response.headers.get("content-type");
    const rawText = await response.text();
    const normalized = normalizeFetchedContent(contentType, rawText);
    const record = await this.recordNote({
      feature_id: input.feature_id,
      source: input.source ?? input.url,
      content: truncateContent(normalized, input.max_chars ?? 8000),
      trust_status: input.trust_status ?? "UNTRUSTED",
      artifact_refs: input.artifact_refs,
    });

    return {
      record,
      status: response.status,
      content_type: contentType,
    };
  }

  async markFiltered(
    researchNoteId: string,
    filteredBy: string,
    artifactRefs: ArtifactRef[] = []
  ): Promise<StoredRecord<ResearchNote>> {
    const record = await this.registry.read<ResearchNote>(
      "research_note",
      researchNoteId
    );

    return this.registry.write("research_note", {
      ...record.payload,
      trust_status: "FILTERED",
      filtered_by: filteredBy,
      artifact_refs: [...record.payload.artifact_refs, ...artifactRefs],
    });
  }

  async markRecorded(
    researchNoteId: string,
    filteredBy: string,
    artifactRefs: ArtifactRef[] = []
  ): Promise<StoredRecord<ResearchNote>> {
    const record = await this.registry.read<ResearchNote>(
      "research_note",
      researchNoteId
    );

    return this.registry.write("research_note", {
      ...record.payload,
      trust_status: "RECORDED",
      filtered_by: filteredBy,
      artifact_refs: [...record.payload.artifact_refs, ...artifactRefs],
    });
  }
}
