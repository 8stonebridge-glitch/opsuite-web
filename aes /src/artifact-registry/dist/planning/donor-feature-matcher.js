"use strict";
/**
 * AES Planning — Donor Feature Matcher
 *
 * Automatically matches Perplexity-identified features to donor observations
 * in the graph. Closes the gap between "Perplexity says this feature exists"
 * and "do we have donor depth for it?"
 *
 * Flow:
 *   1. Perplexity identifies features (breadth)
 *   2. This matcher queries donor data for each feature (depth check)
 *   3. Features with donor matches get high confidence + donor_mappings
 *   4. Features without donor matches get RESEARCH_REQUIRED routing
 *
 * Works with both graph-backed (Neo4j) and in-memory donor data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchFeatureToDonors = matchFeatureToDonors;
exports.matchAllFeatures = matchAllFeatures;
exports.enrichFeaturesWithDonorMatches = enrichFeaturesWithDonorMatches;
exports.parseStudyPacket = parseStudyPacket;
exports.mergeKnowledgeBases = mergeKnowledgeBases;
// ─── Keyword Extraction ──────────────────────────────────────────────────────
/**
 * Extract matching keywords from a feature description and type.
 */
function extractFeatureKeywords(feature) {
    const text = `${feature.name} ${feature.description} ${feature.feature_type}`.toLowerCase();
    const words = text.split(/[\s,.\-_/()]+/).filter(w => w.length > 3).filter(w => !STOP_WORDS.has(w));
    // Add feature type as a keyword
    const keywords = new Set(words);
    // Add domain-specific synonyms
    const synonyms = {
        "auth": ["authentication", "login", "sso", "saml", "mfa", "oauth", "session"],
        "messaging": ["message", "chat", "conversation", "realtime", "real-time", "websocket"],
        "channel": ["channels", "room", "workspace", "space"],
        "notification": ["notifications", "alert", "alerts", "push", "email", "digest", "notify"],
        "billing": ["subscription", "subscriptions", "recurring", "invoice", "invoicing", "plan"],
        "payment": ["payments", "charge", "checkout", "transaction", "payout", "refund"],
        "search": ["searching", "fulltext", "full-text", "query", "find"],
        "file": ["files", "upload", "attachment", "attachments", "sharing", "storage"],
        "workflow": ["automation", "automations", "workflow", "builder", "trigger"],
        "security": ["compliance", "audit", "encryption", "dlp", "retention"],
        "onboarding": ["signup", "registration", "invite", "welcome", "setup"],
        "video": ["audio", "huddle", "huddles", "call", "calls", "screen", "webrtc"],
        "canvas": ["document", "collaborative", "editing", "notes", "wiki"],
        "thread": ["threads", "reply", "replies"],
        "emoji": ["reaction", "reactions", "custom"],
        "integration": ["integrations", "app", "apps", "marketplace", "plugin", "webhook"],
        "recovery": ["retry", "retries", "dunning", "failed", "decline"],
        "fraud": ["radar", "risk", "suspicious", "chargeback", "dispute"],
        "dashboard": ["metrics", "analytics", "reporting", "reports", "overview"],
        "developer": ["api", "sdk", "cli", "workbench", "logs", "events", "webhooks"],
        "balance": ["balances", "payout", "payouts", "settlement", "funds"],
        "tax": ["taxes", "vat", "gst", "jurisdiction"],
        "connect": ["marketplace", "platform", "connected", "multi-party"],
    };
    for (const [key, values] of Object.entries(synonyms)) {
        if (keywords.has(key) || values.some(v => keywords.has(v))) {
            keywords.add(key);
            for (const v of values)
                keywords.add(v);
        }
    }
    return Array.from(keywords);
}
// ─── Matching Engine ─────────────────────────────────────────────────────────
/**
 * Score how well a donor item matches a feature based on keyword overlap.
 */
function computeKeywordOverlap(featureKeywords, donorKeywords) {
    if (donorKeywords.length === 0 || featureKeywords.length === 0)
        return 0;
    const featureSet = new Set(featureKeywords);
    const matches = donorKeywords.filter(k => featureSet.has(k));
    // Jaccard-like score weighted toward donor coverage
    const donorCoverage = matches.length / donorKeywords.length;
    const featureCoverage = matches.length / featureKeywords.length;
    return donorCoverage * 0.6 + featureCoverage * 0.4;
}
/**
 * Also check feature_type / feature_area alignment.
 */
function featureTypeOverlap(featureType, donorFeatureArea) {
    const ft = featureType.toLowerCase();
    const da = donorFeatureArea.toLowerCase();
    if (ft === da)
        return 1.0;
    if (da.includes(ft) || ft.includes(da))
        return 0.8;
    // Check canonical mappings
    const mappings = {
        "backend_platform": ["backend_platform", "launch_ops_layer", "qa_release_hardening"],
        "collaboration_system": ["collaboration_system", "app_shell"],
        "notification_system": ["notification_system"],
        "onboarding": ["onboarding"],
        "payments_and_billing_verification": ["payments_and_billing_verification", "approval_workflow"],
        "workflow": ["approval_workflow", "workflow"],
    };
    const related = mappings[ft] ?? [];
    for (const area of da.split(",").map(a => a.trim())) {
        if (related.includes(area))
            return 0.7;
    }
    return 0;
}
const MATCH_THRESHOLD = 0.35;
/**
 * Match a single feature against the donor knowledge base.
 */
function matchFeatureToDonors(feature, kb) {
    const featureKeywords = extractFeatureKeywords(feature);
    // Score observations
    const observationScores = kb.observations.map(obs => ({
        observation: obs,
        score: computeKeywordOverlap(featureKeywords, obs.keywords) * 0.6 +
            featureTypeOverlap(feature.feature_type, obs.feature_area) * 0.4,
    }));
    // Score logic candidates
    const logicScores = kb.logic_candidates.map(lc => ({
        logic: lc,
        score: computeKeywordOverlap(featureKeywords, lc.keywords) * 0.6 +
            featureTypeOverlap(feature.feature_type, lc.target_feature_area) * 0.4,
    }));
    // Score validators
    const validatorScores = kb.validators.map(v => ({
        validator: v,
        score: computeKeywordOverlap(featureKeywords, v.keywords) * 0.5 +
            featureTypeOverlap(feature.feature_type, "general") * 0.5,
    }));
    // Filter by threshold
    const matchedObs = observationScores
        .filter(s => s.score >= MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map(s => s.observation);
    const matchedLogic = logicScores
        .filter(s => s.score >= MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map(s => s.logic);
    const matchedValidators = validatorScores
        .filter(s => s.score >= MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map(s => s.validator);
    // Compute overall match score
    const bestObsScore = observationScores.length > 0
        ? Math.max(...observationScores.map(s => s.score))
        : 0;
    const bestLogicScore = logicScores.length > 0
        ? Math.max(...logicScores.map(s => s.score))
        : 0;
    const matchScore = bestObsScore * 0.5 + bestLogicScore * 0.3 +
        (matchedValidators.length > 0 ? 0.2 : 0);
    const hasDonorDepth = matchedObs.length > 0 || matchedLogic.length > 0;
    // Confidence boost from donor depth
    const confidenceBoost = hasDonorDepth
        ? Math.min(0.3, matchScore * 0.4)
        : 0;
    // Routing recommendation
    let routing;
    if (matchScore >= 0.5 && matchedObs.length >= 1 && matchedLogic.length >= 1) {
        routing = "DIRECT_BUILD";
    }
    else if (matchScore >= 0.25 && (matchedObs.length >= 1 || matchedLogic.length >= 1)) {
        routing = "CAUTION_BUILD";
    }
    else {
        routing = "RESEARCH_REQUIRED";
    }
    // Build donor mappings
    const donorMappings = matchedObs.map(obs => ({
        donor_name: obs.donor_name,
        donor_feature: obs.observation_id,
        relevance: matchScore >= 0.5 ? "direct" : "analogous",
        notes: obs.finding_summary,
    }));
    // Build explanation
    const explanation = hasDonorDepth
        ? `Matched ${matchedObs.length} observations + ${matchedLogic.length} logic candidates from ${[...new Set(matchedObs.map(o => o.donor_name))].join(", ")}`
        : `No donor depth found. Perplexity-only feature — needs research capture.`;
    return {
        feature_name: feature.name,
        has_donor_depth: hasDonorDepth,
        confidence_boost: confidenceBoost,
        matched_observations: matchedObs,
        matched_logic: matchedLogic,
        matched_validators: matchedValidators,
        donor_mappings: donorMappings,
        routing_recommendation: routing,
        match_score: matchScore,
        match_explanation: explanation,
    };
}
/**
 * Match all candidate features against donor knowledge.
 * Returns enriched features with donor mappings and routing recommendations.
 */
function matchAllFeatures(features, kb) {
    const matches = features.map(f => matchFeatureToDonors(f, kb));
    return {
        matches,
        features_with_depth: matches.filter(m => m.has_donor_depth).length,
        features_without_depth: matches.filter(m => !m.has_donor_depth).length,
        direct_build_count: matches.filter(m => m.routing_recommendation === "DIRECT_BUILD").length,
        caution_build_count: matches.filter(m => m.routing_recommendation === "CAUTION_BUILD").length,
        research_required_count: matches.filter(m => m.routing_recommendation === "RESEARCH_REQUIRED").length,
        coverage_rate: matches.filter(m => m.has_donor_depth).length / matches.length,
    };
}
/**
 * Enrich candidate features with donor match results.
 * Features with donor depth get higher confidence and donor_mappings.
 * Features without donor depth keep low confidence.
 */
function enrichFeaturesWithDonorMatches(features, kb) {
    return features.map(feature => {
        const match = matchFeatureToDonors(feature, kb);
        return {
            ...feature,
            donor_mappings: [
                ...(feature.donor_mappings ?? []),
                ...match.donor_mappings,
            ],
            confidence: {
                ...(feature.confidence ?? {}),
                overall: Math.min(1.0, (feature.confidence?.overall ?? 0.5) + match.confidence_boost),
                research_coverage: match.has_donor_depth
                    ? Math.max(feature.confidence?.research_coverage ?? 0, 0.7)
                    : feature.confidence?.research_coverage ?? 0.3,
            },
        };
    });
}
// ─── Study Packet Parser ─────────────────────────────────────────────────────
/**
 * Parse a donor study packet markdown into a DonorKnowledgeBase.
 * Extracts observations, logic candidates, and validator requirements.
 *
 * This is a simplified parser — handles the structured format used
 * in slack_donor_study_packet.md and stripe_donor_study_packet.md.
 */
function parseStudyPacket(markdown, donorName) {
    const observations = [];
    const logic_candidates = [];
    const validators = [];
    // Extract feature areas from metadata
    const featureAreaMatch = markdown.match(/feature_area:\s*(.+)/);
    const featureAreas = featureAreaMatch
        ? featureAreaMatch[1].split(",").map(s => s.trim())
        : [];
    // Parse observations
    const obsRegex = /### Observation \d+\n([\s\S]*?)(?=### |## )/g;
    let obsMatch;
    while ((obsMatch = obsRegex.exec(markdown)) !== null) {
        const block = obsMatch[1];
        const id = extractField(block, "observation_id") ?? `obs-${observations.length}`;
        const summary = extractField(block, "finding_summary") ?? "";
        const detail = extractField(block, "finding_detail") ?? "";
        const type = extractField(block, "observation_type") ?? "";
        const conf = extractField(block, "confidence") ?? "medium";
        observations.push({
            observation_id: id,
            donor_name: donorName,
            feature_area: featureAreas.join(", "),
            finding_summary: summary,
            finding_detail: detail,
            confidence: conf,
            keywords: extractKeywordsFromText(`${summary} ${detail} ${type}`),
        });
    }
    // Parse logic candidates
    const logicRegex = /### Logic Candidate \d+\n([\s\S]*?)(?=### |## )/g;
    let logicMatch;
    while ((logicMatch = logicRegex.exec(markdown)) !== null) {
        const block = logicMatch[1];
        const id = extractField(block, "candidate_id") ?? `logic-${logic_candidates.length}`;
        const statement = extractField(block, "canonical_statement") ?? "";
        const area = extractField(block, "target_feature_area") ?? featureAreas.join(", ");
        const pre = extractField(block, "preconditions") ?? "";
        const post = extractField(block, "postconditions") ?? "";
        const failure = extractField(block, "failure_path") ?? "";
        const conf = extractField(block, "confidence") ?? "medium";
        logic_candidates.push({
            candidate_id: id,
            donor_name: donorName,
            canonical_statement: statement,
            target_feature_area: area,
            preconditions: pre,
            postconditions: post,
            failure_path: failure,
            confidence: conf,
            keywords: extractKeywordsFromText(`${statement} ${area} ${failure}`),
        });
    }
    // Parse validators
    const valRegex = /### Validator \d+\n([\s\S]*?)(?=### |## )/g;
    let valMatch;
    while ((valMatch = valRegex.exec(markdown)) !== null) {
        const block = valMatch[1];
        const id = extractField(block, "validator_id") ?? `val-${validators.length}`;
        const statement = extractField(block, "requirement_statement") ?? "";
        const pass = extractField(block, "pass_condition") ?? "";
        const blocking = extractField(block, "blocking_level") ?? "advisory";
        validators.push({
            validator_id: id,
            donor_name: donorName,
            requirement_statement: statement,
            pass_condition: pass,
            blocking_level: blocking,
            keywords: extractKeywordsFromText(`${statement} ${pass}`),
        });
    }
    return { observations, logic_candidates, validators };
}
/**
 * Merge multiple knowledge bases into one.
 */
function mergeKnowledgeBases(...bases) {
    return {
        observations: bases.flatMap(b => b.observations),
        logic_candidates: bases.flatMap(b => b.logic_candidates),
        validators: bases.flatMap(b => b.validators),
    };
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractField(block, field) {
    const regex = new RegExp(`- ${field}:\\s*(.+)`, "i");
    const match = block.match(regex);
    return match ? match[1].trim() : null;
}
const STOP_WORDS = new Set([
    "the", "and", "for", "that", "with", "from", "into", "this", "should", "must",
    "can", "are", "not", "has", "have", "was", "were", "been", "being", "each",
    "when", "where", "which", "while", "also", "than", "then", "they", "their",
    "them", "there", "these", "those", "such", "what", "will", "would", "could",
    "about", "above", "after", "before", "between", "both", "but", "does", "doing",
    "down", "during", "few", "further", "had", "having", "here", "how", "its",
    "just", "more", "most", "nor", "only", "other", "over", "own", "same", "some",
    "still", "too", "under", "until", "very", "who", "why", "all", "any",
    // Domain-generic terms that match everything
    "system", "surface", "surfaces", "first", "class", "action", "actions", "state",
    "states", "user", "users", "view", "views", "mode", "modes", "keep", "without",
    "inside", "visible", "remain", "distinct", "exposed", "separate", "support",
    "left", "top", "new", "one", "like", "use", "using",
]);
function extractKeywordsFromText(text) {
    return text
        .toLowerCase()
        .split(/[\s,.\-_/()]+/)
        .filter(w => w.length > 3)
        .filter(w => !STOP_WORDS.has(w));
}
//# sourceMappingURL=donor-feature-matcher.js.map