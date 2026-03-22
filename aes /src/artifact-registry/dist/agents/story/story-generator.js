"use strict";
/**
 * AES Story Generator Agent
 *
 * Generates user stories, usage narratives, and journey states for each feature.
 * Merges founder intent with research-derived expectations.
 *
 * Rule: founder intent sets product direction, research adds realism.
 * Research NEVER overwrites the invention.
 *
 * Pipeline position: runs AFTER research observers, BEFORE decomposer finalizes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryGenerator = void 0;
// ─── Generator ───────────────────────────────────────────────────────────────
class StoryGenerator {
    constructor(_registry, now = () => new Date()) {
        this.now = now;
    }
    generate(input) {
        const { feature, app_id, founder_intent, research_summary, user_classified_findings } = input;
        // Step 1: Classify research findings (user-provided or system-inferred)
        const findings = user_classified_findings
            ?? this.autoClassifyFindings(feature, founder_intent, research_summary);
        // Step 2: Generate synthesis decisions where research and intent interact
        const synthesis = this.synthesize(feature, founder_intent, findings);
        // Step 3: Generate user stories
        const userStories = this.generateUserStories(feature, founder_intent, findings);
        // Step 4: Generate usage narratives
        const narratives = this.generateNarratives(feature, founder_intent, findings, research_summary);
        // Step 5: Generate journey states
        const journeys = this.generateJourneys(feature, founder_intent, findings);
        // Step 6: Compute confidence
        const confidence = this.computeConfidence(founder_intent, findings);
        // Step 7: Determine if user review is needed
        const needsReview = !user_classified_findings && findings.length > 0;
        const reviewQuestions = needsReview
            ? this.generateReviewQuestions(findings, synthesis)
            : [];
        const context = {
            feature_id: feature.feature_id,
            app_id,
            user_stories: userStories,
            usage_narratives: narratives,
            journey_states: journeys,
            story_confidence: confidence,
            classified_findings: findings,
            synthesis_decisions: synthesis,
            created_at: this.now().toISOString(),
            updated_at: this.now().toISOString(),
        };
        return {
            context,
            needs_user_review: needsReview,
            review_questions: reviewQuestions,
        };
    }
    // ─── Auto-Classification ─────────────────────────────────────────────────
    /**
     * When the user hasn't classified research findings, the system does it
     * using the founder intent as the filter.
     *
     * Rule: if a finding conflicts with founder intent → REJECTED
     *       if a finding supports founder intent → BORROW
     *       if a finding represents user expectation → EXPECT
     *       if a finding is a known anti-pattern → AVOID
     */
    autoClassifyFindings(feature, intent, research) {
        if (!research)
            return [];
        const findings = [];
        const intentLower = intent.experience_description.toLowerCase();
        const antiGoals = new Set(intent.anti_goals.map(a => a.toLowerCase()));
        const feelKeywords = new Set(intent.feel_keywords.map(k => k.toLowerCase()));
        let findingIndex = 0;
        // Classify frontend patterns
        for (const screen of research.frontend_patterns.common_screens) {
            const classification = this.classifyFinding(screen.purpose, intentLower, antiGoals, feelKeywords);
            findings.push({
                finding_id: `RF-${feature.feature_id}-${findingIndex++}`,
                feature_id: feature.feature_id,
                description: `Screen pattern: ${screen.screen_name} — ${screen.purpose}`,
                classification,
                reason: classification === "REJECTED"
                    ? `Conflicts with founder intent: "${intent.experience_description}"`
                    : `Supports user expectations for ${screen.screen_name}`,
                classified_by: "system",
                research_source: "perplexity-frontend",
            });
        }
        // Classify navigation patterns
        for (const nav of research.frontend_patterns.navigation_patterns) {
            const classification = this.classifyFinding(nav, intentLower, antiGoals, feelKeywords);
            findings.push({
                finding_id: `RF-${feature.feature_id}-${findingIndex++}`,
                feature_id: feature.feature_id,
                description: `Navigation: ${nav}`,
                classification,
                reason: classification === "REJECTED"
                    ? `Conflicts with founder feel: ${Array.from(feelKeywords).join(", ")}`
                    : `Standard navigation expectation`,
                classified_by: "system",
                research_source: "perplexity-frontend",
            });
        }
        // Classify UX states (these are almost always EXPECT)
        for (const state of research.frontend_patterns.empty_loading_error_states) {
            findings.push({
                finding_id: `RF-${feature.feature_id}-${findingIndex++}`,
                feature_id: feature.feature_id,
                description: `UX state: ${state.state_type} on ${state.screen} — ${state.what_to_show}`,
                classification: "EXPECT",
                reason: "Users expect proper empty/loading/error states",
                classified_by: "system",
                research_source: "perplexity-frontend",
            });
        }
        return findings;
    }
    classifyFinding(description, intentLower, antiGoals, feelKeywords) {
        const descLower = description.toLowerCase();
        // Check anti-goals first — anything matching is AVOID or REJECTED
        for (const anti of antiGoals) {
            if (descLower.includes(anti))
                return "REJECTED";
        }
        // Check if it supports the feel
        for (const feel of feelKeywords) {
            if (descLower.includes(feel))
                return "BORROW";
        }
        // Dashboard/table patterns conflict with "simple" or "guided" or "chat-like" intents
        if ((descLower.includes("dashboard") || descLower.includes("table") || descLower.includes("bulk")) &&
            (intentLower.includes("simple") || intentLower.includes("guided") || intentLower.includes("chat") || intentLower.includes("whatsapp"))) {
            return "REJECTED";
        }
        // Default: EXPECT (users will assume this exists)
        return "EXPECT";
    }
    // ─── Synthesis ───────────────────────────────────────────────────────────
    synthesize(feature, intent, findings) {
        const rejected = findings.filter(f => f.classification === "REJECTED");
        const borrowed = findings.filter(f => f.classification === "BORROW");
        const expected = findings.filter(f => f.classification === "EXPECT");
        if (rejected.length === 0 && borrowed.length === 0)
            return [];
        const decision = {
            decision_id: `SYN-${feature.feature_id}-${Date.now()}`,
            feature_id: feature.feature_id,
            founder_intent: intent.experience_description,
            research_expectation: [...borrowed, ...expected].map(f => f.description),
            synthesis: [
                ...borrowed.map(f => `Borrow: ${f.description}`),
                ...expected.map(f => `Include: ${f.description}`),
            ],
            rejected_research: rejected.map(f => `${f.description} — ${f.reason}`),
            decision_rationale: rejected.length > 0
                ? `Founder intent "${intent.experience_description}" takes priority over ${rejected.length} conflicting research finding(s)`
                : "All research findings align with founder intent",
        };
        return [decision];
    }
    // ─── User Stories ────────────────────────────────────────────────────────
    generateUserStories(feature, _intent, findings) {
        const stories = [];
        const desc = feature.description || feature.name || "";
        const roles = feature.user_roles?.length > 0 ? feature.user_roles : ["user"];
        for (const role of roles) {
            const source = findings.length > 0 ? "merged" : "system_inferred";
            stories.push({
                story_id: `US-${feature.feature_id}-${role}`,
                feature_id: feature.feature_id,
                as_a: role,
                i_want: desc,
                so_that: this.inferSoThat(feature, _intent),
                source,
                priority: this.inferPriority(feature),
                acceptance_criteria_ids: feature.acceptance_criteria?.map(ac => ac.id) || [],
            });
        }
        return stories;
    }
    inferSoThat(feature, intent) {
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("auth"))
            return "I can securely access the system";
        if (desc.includes("notification"))
            return "I stay informed without checking manually";
        if (desc.includes("search"))
            return "I can find what I need quickly";
        if (desc.includes("approval"))
            return "I can keep work moving without losing auditability";
        if (desc.includes("dashboard"))
            return "I can see status at a glance";
        // Default: use founder intent feel
        if (intent.feel_keywords.length > 0) {
            return `the experience feels ${intent.feel_keywords.join(" and ")}`;
        }
        return "I can accomplish my goal efficiently";
    }
    inferPriority(feature) {
        const deps = feature.dependencies || [];
        if (deps.length === 0)
            return "critical"; // Foundation feature
        if (feature.acceptance_criteria?.some(ac => ac.mandatory))
            return "high";
        return "medium";
    }
    // ─── Usage Narratives ────────────────────────────────────────────────────
    generateNarratives(feature, _intent, findings, research) {
        const desc = feature.description || feature.name || "";
        // expectedFindings available for future use
        // @ts-ignore
        const _expectedFindings = findings.filter(f => f.classification === "EXPECT" || f.classification === "BORROW");
        const narrative = {
            narrative_id: `UN-${feature.feature_id}`,
            feature_id: feature.feature_id,
            trigger: this.inferTrigger(desc),
            first_action: this.inferFirstAction(desc),
            needed_information: this.inferNeededInfo(feature),
            decision_point: this.inferDecisionPoint(desc),
            what_could_go_wrong: this.inferFailureModes(feature, research),
            next_step: this.inferNextSteps(feature),
            trust_moments: this.inferTrustMoments(feature, _intent),
            drop_off_risks: this.inferDropOffRisks(feature),
            source: findings.length > 0 ? "merged" : "system_inferred",
        };
        return [narrative];
    }
    inferTrigger(desc) {
        const lower = desc.toLowerCase();
        if (lower.includes("notification"))
            return "User receives a notification";
        if (lower.includes("login") || lower.includes("auth"))
            return "User opens the app";
        if (lower.includes("search"))
            return "User needs to find something";
        if (lower.includes("approval"))
            return "User receives an approval request";
        return "User navigates to this feature";
    }
    inferFirstAction(desc) {
        const lower = desc.toLowerCase();
        if (lower.includes("list"))
            return "Scans the list for relevant items";
        if (lower.includes("create"))
            return "Clicks create/new button";
        if (lower.includes("search"))
            return "Types in search box";
        if (lower.includes("dashboard"))
            return "Reviews summary metrics";
        return "Views the main screen";
    }
    inferNeededInfo(feature) {
        const info = [];
        if (feature.data_entities?.length > 0) {
            for (const entity of feature.data_entities) {
                info.push(`${entity.name} details`);
            }
        }
        if (info.length === 0)
            info.push("Relevant data for this feature");
        return info;
    }
    inferDecisionPoint(desc) {
        const lower = desc.toLowerCase();
        if (lower.includes("approval"))
            return "Approve or reject";
        if (lower.includes("create"))
            return "Submit or cancel";
        if (lower.includes("edit"))
            return "Save changes or discard";
        if (lower.includes("delete"))
            return "Confirm deletion";
        if (lower.includes("search"))
            return "Select a result";
        return "Complete the primary action";
    }
    inferFailureModes(feature, research) {
        const failures = [];
        if (feature.failure_states) {
            for (const fs of feature.failure_states) {
                failures.push(fs.trigger || fs.user_sees || "Unknown failure");
            }
        }
        if (research?.pitfalls?.frontend_pitfalls) {
            for (const pitfall of research.pitfalls.frontend_pitfalls) {
                failures.push(pitfall.what_goes_wrong || pitfall.description || "Research-identified pitfall");
            }
        }
        if (failures.length === 0) {
            failures.push("Network failure", "Permission denied", "Invalid input");
        }
        return failures;
    }
    inferNextSteps(feature) {
        const steps = [];
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("create"))
            steps.push("View created item", "Create another");
        if (desc.includes("approval"))
            steps.push("Notify requester", "Update audit trail");
        if (desc.includes("search"))
            steps.push("Open selected result", "Refine search");
        if (steps.length === 0)
            steps.push("Continue to next task", "Return to overview");
        return steps;
    }
    inferTrustMoments(feature, _intent) {
        const moments = [];
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("auth"))
            moments.push("Login confirmation", "Session security indicator");
        if (desc.includes("payment") || desc.includes("billing"))
            moments.push("Payment confirmation", "Receipt/invoice");
        if (desc.includes("delete"))
            moments.push("Confirmation before destructive action");
        if (desc.includes("approval"))
            moments.push("Audit trail visibility", "Decision recorded confirmation");
        if (moments.length === 0)
            moments.push("Success feedback after primary action");
        return moments;
    }
    inferDropOffRisks(feature) {
        const risks = [];
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("onboard"))
            risks.push("Too many steps before first value");
        if (desc.includes("form") || desc.includes("create"))
            risks.push("Form too long", "Unclear required fields");
        if (desc.includes("search"))
            risks.push("No results found", "Results not relevant");
        if (risks.length === 0)
            risks.push("Unclear next action", "Feature not discoverable");
        return risks;
    }
    // ─── Journey States ──────────────────────────────────────────────────────
    generateJourneys(feature, _intent, findings) {
        const desc = (feature.description || "").toLowerCase();
        const deps = feature.dependencies || [];
        const preconditions = ["User is signed in"];
        if (deps.length > 0) {
            preconditions.push(`Dependencies satisfied: ${deps.join(", ")}`);
        }
        const mainFlow = this.inferMainFlow(feature);
        const alternateFlows = this.inferAlternateFlows(feature);
        const failureFlows = this.inferFailureFlows(feature);
        const completionState = [];
        if (desc.includes("create"))
            completionState.push("New item created and visible");
        if (desc.includes("approval"))
            completionState.push("Decision recorded", "Audit event written", "Requester notified");
        if (desc.includes("auth"))
            completionState.push("Session established", "User redirected to app");
        if (completionState.length === 0)
            completionState.push("Primary action completed", "UI confirms success");
        return [{
                journey_id: `JRN-${feature.feature_id}`,
                feature_id: feature.feature_id,
                precondition: preconditions,
                main_flow: mainFlow,
                alternate_flows: alternateFlows,
                failure_flows: failureFlows,
                completion_state: completionState,
                source: findings.length > 0 ? "merged" : "system_inferred",
            }];
    }
    inferMainFlow(feature) {
        const steps = [];
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("list") || desc.includes("inbox")) {
            steps.push("Open list view", "Scan items", "Select item", "View detail", "Take action", "Confirm result");
        }
        else if (desc.includes("create") || desc.includes("form")) {
            steps.push("Click create", "Fill form fields", "Validate input", "Submit", "See confirmation");
        }
        else if (desc.includes("auth") || desc.includes("login")) {
            steps.push("Enter credentials", "Submit login", "System validates", "Redirect to app");
        }
        else if (desc.includes("search")) {
            steps.push("Enter search query", "View results", "Select result", "View detail");
        }
        else if (desc.includes("dashboard")) {
            steps.push("View summary metrics", "Identify items needing attention", "Drill into detail", "Take action");
        }
        else {
            steps.push("Navigate to feature", "View current state", "Take primary action", "See result");
        }
        return steps;
    }
    inferAlternateFlows(feature) {
        const flows = [];
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("approval")) {
            flows.push({
                name: "Request more context",
                trigger: "Reviewer needs more information",
                steps: ["Click 'Request info'", "Add comment", "Send to requester", "Wait for response"],
            });
        }
        if (desc.includes("create") || desc.includes("form")) {
            flows.push({
                name: "Save as draft",
                trigger: "User not ready to submit",
                steps: ["Click 'Save draft'", "Form state preserved", "Return later to complete"],
            });
        }
        if (desc.includes("list")) {
            flows.push({
                name: "Filter and sort",
                trigger: "Too many items to scan",
                steps: ["Apply filter", "Sort by relevance", "Narrow results"],
            });
        }
        return flows;
    }
    inferFailureFlows(feature) {
        const flows = [
            {
                name: "Network failure",
                trigger: "API request fails",
                user_sees: "Error message with retry option",
                recovery_action: "Retry or go back",
            },
        ];
        const desc = (feature.description || "").toLowerCase();
        if (desc.includes("auth")) {
            flows.push({
                name: "Invalid credentials",
                trigger: "Wrong email or password",
                user_sees: "Error message, form not cleared",
                recovery_action: "Correct input and retry",
            });
        }
        if (desc.includes("form") || desc.includes("create")) {
            flows.push({
                name: "Validation error",
                trigger: "Required field missing or invalid",
                user_sees: "Inline error on specific field",
                recovery_action: "Fix highlighted field and resubmit",
            });
        }
        if (desc.includes("approval") || desc.includes("delete")) {
            flows.push({
                name: "Permission denied",
                trigger: "User lacks required role",
                user_sees: "Permission error with explanation",
                recovery_action: "Contact admin or escalate",
            });
        }
        return flows;
    }
    // ─── Confidence ──────────────────────────────────────────────────────────
    computeConfidence(intent, findings) {
        const inventorProvided = intent.experience_description.length > 0;
        const researchDerived = findings.length > 0;
        const rejected = findings.filter(f => f.classification === "REJECTED");
        const inventorOverrides = intent.anti_goals;
        let confidence = 0.5;
        if (inventorProvided)
            confidence += 0.2;
        if (researchDerived)
            confidence += 0.15;
        if (findings.filter(f => f.classification === "BORROW").length > 0)
            confidence += 0.1;
        confidence = Math.min(confidence, 0.95);
        return {
            inventor_provided: inventorProvided,
            research_derived: researchDerived,
            merged: inventorProvided && researchDerived,
            confidence: Math.round(confidence * 100) / 100,
            rejected_research: rejected.map(f => f.description),
            inventor_overrides: inventorOverrides,
        };
    }
    // ─── User Review Questions ───────────────────────────────────────────────
    generateReviewQuestions(findings, _synthesis) {
        const questions = [];
        const borrowCount = findings.filter(f => f.classification === "BORROW").length;
        const rejectCount = findings.filter(f => f.classification === "REJECTED").length;
        const expectCount = findings.filter(f => f.classification === "EXPECT").length;
        if (borrowCount > 0) {
            questions.push(`We found ${borrowCount} pattern(s) that support your product intent. Review them?`);
        }
        if (rejectCount > 0) {
            questions.push(`We rejected ${rejectCount} research finding(s) that conflict with your vision. Confirm?`);
        }
        if (expectCount > 0) {
            questions.push(`Users in similar apps expect ${expectCount} pattern(s). Include all, or review individually?`);
        }
        return questions;
    }
}
exports.StoryGenerator = StoryGenerator;
//# sourceMappingURL=story-generator.js.map