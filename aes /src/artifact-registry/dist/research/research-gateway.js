"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpResearchGateway = void 0;
const registry_1 = require("../registry");
function truncateContent(content, maxChars) {
    if (content.length <= maxChars) {
        return content;
    }
    return `${content.slice(0, maxChars)}\n...[truncated]`;
}
function normalizeFetchedContent(contentType, body) {
    if (contentType?.includes("application/json")) {
        try {
            return JSON.stringify(JSON.parse(body), null, 2);
        }
        catch {
            return body;
        }
    }
    return body;
}
class HttpResearchGateway {
    constructor(registry, fetchFn = globalThis.fetch, now = () => new Date()) {
        this.registry = registry;
        this.fetchFn = fetchFn;
        this.now = now;
    }
    async recordNote(input) {
        const researchNoteId = (0, registry_1.generateArtifactId)("research_note");
        const note = {
            research_note_id: researchNoteId,
            feature_id: input.feature_id,
            captured_at: this.now().toISOString(),
            source: input.source,
            content: input.content,
            trust_status: input.trust_status ?? "UNTRUSTED",
            filtered_by: input.trust_status && input.trust_status !== "UNTRUSTED"
                ? input.filtered_by ?? "operator"
                : null,
            artifact_refs: input.artifact_refs && input.artifact_refs.length > 0
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
    async captureFromUrl(input) {
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
    async markFiltered(researchNoteId, filteredBy, artifactRefs = []) {
        const record = await this.registry.read("research_note", researchNoteId);
        return this.registry.write("research_note", {
            ...record.payload,
            trust_status: "FILTERED",
            filtered_by: filteredBy,
            artifact_refs: [...record.payload.artifact_refs, ...artifactRefs],
        });
    }
    async markRecorded(researchNoteId, filteredBy, artifactRefs = []) {
        const record = await this.registry.read("research_note", researchNoteId);
        return this.registry.write("research_note", {
            ...record.payload,
            trust_status: "RECORDED",
            filtered_by: filteredBy,
            artifact_refs: [...record.payload.artifact_refs, ...artifactRefs],
        });
    }
}
exports.HttpResearchGateway = HttpResearchGateway;
//# sourceMappingURL=research-gateway.js.map