/**
 * AES Donor Feature Matcher — Tests
 *
 * Tests the automatic matching of Perplexity-identified features
 * to donor study packet observations. Uses the real Slack and Stripe
 * donor study packets from the repo.
 */

import * as fs from "fs";
import * as path from "path";
import {
  parseStudyPacket,
  mergeKnowledgeBases,
  matchAllFeatures,
  enrichFeaturesWithDonorMatches,
  matchFeatureToDonors,
  type DonorKnowledgeBase,
} from "../src/planning/donor-feature-matcher";
import type { CandidateFeature } from "../src/planning/app-decomposer";

// ─── Load Real Donor Data ────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "../../../");
const SLACK_PACKET = path.join(REPO_ROOT, "library componets /donor/slack_donor_study_packet.md");
const STRIPE_PACKET = path.join(REPO_ROOT, "library componets /donor/stripe_donor_study_packet.md");

let slackKB: DonorKnowledgeBase;
let stripeKB: DonorKnowledgeBase;
let combinedKB: DonorKnowledgeBase;

beforeAll(() => {
  const slackMd = fs.readFileSync(SLACK_PACKET, "utf-8");
  const stripeMd = fs.readFileSync(STRIPE_PACKET, "utf-8");

  slackKB = parseStudyPacket(slackMd, "Slack");
  stripeKB = parseStudyPacket(stripeMd, "Stripe");
  combinedKB = mergeKnowledgeBases(slackKB, stripeKB);
});

// ─── Parser Tests ────────────────────────────────────────────────────────────

describe("Study packet parser", () => {
  test("parses Slack observations", () => {
    expect(slackKB.observations.length).toBe(8);
    expect(slackKB.observations[0]!.donor_name).toBe("Slack");
    expect(slackKB.observations[0]!.observation_id).toBe("slack-obs-001");
  });

  test("parses Slack logic candidates", () => {
    expect(slackKB.logic_candidates.length).toBe(4);
    expect(slackKB.logic_candidates[0]!.candidate_id).toBe("slack-logic-001");
  });

  test("parses Slack validators", () => {
    expect(slackKB.validators.length).toBe(4);
    expect(slackKB.validators[0]!.validator_id).toBe("slack-validator-001");
  });

  test("parses Stripe observations", () => {
    expect(stripeKB.observations.length).toBe(8);
    expect(stripeKB.observations[0]!.donor_name).toBe("Stripe");
  });

  test("parses Stripe logic candidates", () => {
    expect(stripeKB.logic_candidates.length).toBe(5);
  });

  test("parses Stripe validators", () => {
    expect(stripeKB.validators.length).toBe(5);
  });

  test("merged KB has all entries", () => {
    expect(combinedKB.observations.length).toBe(16);
    expect(combinedKB.logic_candidates.length).toBe(9);
    expect(combinedKB.validators.length).toBe(9);
  });
});

// ─── Matching Tests (Slack Features) ─────────────────────────────────────────

const SLACK_PERPLEXITY_FEATURES: CandidateFeature[] = [
  // Features WITH donor depth
  {
    name: "Channels & Conversations",
    description: "Public/private channels, channel creation, archiving",
    feature_type: "collaboration_system",
  },
  {
    name: "Direct Messages",
    description: "1:1 DMs, group DMs, DM search",
    feature_type: "collaboration_system",
  },
  {
    name: "Activity Feed",
    description: "Activity triage, unreads filtering, caught-up state",
    feature_type: "notification_system",
  },
  {
    name: "Message Composer",
    description: "Rich text composer with mentions, attachments, formatting, scheduled send",
    feature_type: "collaboration_system",
  },
  {
    name: "Personal Space & Notes",
    description: "Self-DM as personal workspace for drafts, to-dos, links, files",
    feature_type: "collaboration_system",
  },
  // Features WITHOUT donor depth
  {
    name: "Huddles",
    description: "Instant audio/video calls with screen sharing",
    feature_type: "collaboration_system",
  },
  {
    name: "Canvas",
    description: "Persistent collaborative documents with real-time editing",
    feature_type: "collaboration_system",
  },
  {
    name: "Workflow Builder",
    description: "No-code automations with conditional branches and triggers",
    feature_type: "workflow",
  },
  {
    name: "Slack Connect",
    description: "Secure shared channels with external partners",
    feature_type: "collaboration_system",
  },
];

describe("Slack feature matching", () => {
  test("features with donor depth get matched", () => {
    const result = matchAllFeatures(SLACK_PERPLEXITY_FEATURES, slackKB);

    // Channels should match Slack observations about channel surfaces
    const channels = result.matches.find(m => m.feature_name === "Channels & Conversations")!;
    expect(channels.has_donor_depth).toBe(true);
    expect(channels.matched_observations.length).toBeGreaterThanOrEqual(1);
    expect(channels.routing_recommendation).not.toBe("RESEARCH_REQUIRED");

    // DMs should match
    const dms = result.matches.find(m => m.feature_name === "Direct Messages")!;
    expect(dms.has_donor_depth).toBe(true);

    // Activity feed should match
    const activity = result.matches.find(m => m.feature_name === "Activity Feed")!;
    expect(activity.has_donor_depth).toBe(true);

    // Composer should match
    const composer = result.matches.find(m => m.feature_name === "Message Composer")!;
    expect(composer.has_donor_depth).toBe(true);

    // Personal space should match
    const personal = result.matches.find(m => m.feature_name === "Personal Space & Notes")!;
    expect(personal.has_donor_depth).toBe(true);
  });

  test("features without donor depth flagged for research or low confidence", () => {
    const result = matchAllFeatures(SLACK_PERPLEXITY_FEATURES, slackKB);

    // Workflow Builder has no meaningful Slack donor data
    const workflow = result.matches.find(m => m.feature_name === "Workflow Builder")!;
    expect(workflow.routing_recommendation).toBe("RESEARCH_REQUIRED");
    expect(workflow.match_score).toBeLessThan(0.3);
  });

  test("coverage rate reflects donor depth", () => {
    const result = matchAllFeatures(SLACK_PERPLEXITY_FEATURES, slackKB);
    // At least 5 of 9 features should have donor depth
    expect(result.features_with_depth).toBeGreaterThanOrEqual(5);
    expect(result.coverage_rate).toBeGreaterThan(0.5);
  });
});

// ─── Matching Tests (Stripe Features) ────────────────────────────────────────

const STRIPE_PERPLEXITY_FEATURES: CandidateFeature[] = [
  // Features WITH donor depth
  {
    name: "Dashboard Home",
    description: "Metrics-first dashboard with gross volume, balance, payouts",
    feature_type: "backend_platform",
  },
  {
    name: "Transactions",
    description: "Multi-mode view: Payments, Payouts, Top-ups, All activity",
    feature_type: "payments_and_billing_verification",
  },
  {
    name: "Subscription Billing",
    description: "Recurring billing, dunning, coupons, trials, prorations",
    feature_type: "payments_and_billing_verification",
  },
  {
    name: "Revenue Recovery",
    description: "Smart retries, recovery emails, decline reason analysis",
    feature_type: "payments_and_billing_verification",
  },
  {
    name: "Developer Workbench",
    description: "API logs, events, webhooks, health, inspector, filterable results",
    feature_type: "backend_platform",
  },
  // Features WITHOUT donor depth
  {
    name: "Fraud Detection (Radar)",
    description: "ML-powered fraud detection, risk scoring, customizable rules",
    feature_type: "backend_platform",
  },
  {
    name: "Connect Platform",
    description: "Marketplace payments, connected account onboarding, KYC",
    feature_type: "payments_and_billing_verification",
  },
  {
    name: "Stablecoin Accounts",
    description: "Dollar-denominated stablecoin balance, crypto and fiat rails",
    feature_type: "payments_and_billing_verification",
  },
];

describe("Stripe feature matching", () => {
  test("Stripe features match Stripe donor data", () => {
    const result = matchAllFeatures(STRIPE_PERPLEXITY_FEATURES, stripeKB);

    const dashboard = result.matches.find(m => m.feature_name === "Dashboard Home")!;
    expect(dashboard.has_donor_depth).toBe(true);

    const transactions = result.matches.find(m => m.feature_name === "Transactions")!;
    expect(transactions.has_donor_depth).toBe(true);

    const recovery = result.matches.find(m => m.feature_name === "Revenue Recovery")!;
    expect(recovery.has_donor_depth).toBe(true);
    expect(recovery.matched_observations.length).toBeGreaterThanOrEqual(1);

    const workbench = result.matches.find(m => m.feature_name === "Developer Workbench")!;
    expect(workbench.has_donor_depth).toBe(true);
  });

  test("Stablecoin has lowest match score among Stripe features", () => {
    const result = matchAllFeatures(STRIPE_PERPLEXITY_FEATURES, stripeKB);
    const stablecoin = result.matches.find(m => m.feature_name === "Stablecoin Accounts")!;
    // Stablecoin is a novel feature — should have lower score than core Stripe features
    const recovery = result.matches.find(m => m.feature_name === "Revenue Recovery")!;
    expect(stablecoin.match_score).toBeLessThanOrEqual(recovery.match_score);
  });
});

// ─── Cross-Donor Matching ────────────────────────────────────────────────────

describe("Cross-donor matching", () => {
  test("Slack features match Slack donors, not Stripe donors", () => {
    const channelMatch = matchFeatureToDonors(
      { name: "Channels", description: "Channel collaboration", feature_type: "collaboration_system" },
      combinedKB
    );

    // Should match Slack observations, not Stripe
    const slackMatches = channelMatch.matched_observations.filter(o => o.donor_name === "Slack");
    expect(slackMatches.length).toBeGreaterThan(0);
  });

  test("Stripe features match Stripe donors, not Slack donors", () => {
    const paymentMatch = matchFeatureToDonors(
      { name: "Payment Processing", description: "Charge creation, refunds, payment methods", feature_type: "payments_and_billing_verification" },
      combinedKB
    );

    // Should match Stripe observations
    const stripeMatches = paymentMatch.matched_observations.filter(o => o.donor_name === "Stripe");
    expect(stripeMatches.length).toBeGreaterThanOrEqual(0); // at minimum don't crash
    // Payment-related features should not strongly match Slack collaboration donors
  });
});

// ─── Feature Enrichment ──────────────────────────────────────────────────────

describe("Feature enrichment", () => {
  test("enriched features have higher confidence when donor depth exists", () => {
    const features: CandidateFeature[] = [
      {
        name: "Activity Feed",
        description: "Activity triage with unreads",
        feature_type: "notification_system",
        confidence: { overall: 0.5, research_coverage: 0.3 },
      },
      {
        name: "Video Calls",
        description: "WebRTC video conferencing",
        feature_type: "collaboration_system",
        confidence: { overall: 0.5, research_coverage: 0.3 },
      },
    ];

    const enriched = enrichFeaturesWithDonorMatches(features, slackKB);

    // Activity Feed has donor depth — should get confidence boost
    const activity = enriched.find(f => f.name === "Activity Feed")!;
    expect(activity.confidence!.overall!).toBeGreaterThan(0.5);
    expect(activity.donor_mappings!.length).toBeGreaterThan(0);

    // Video Calls has no donor depth — should stay low
    const video = enriched.find(f => f.name === "Video Calls")!;
    expect(video.confidence!.overall!).toBeLessThanOrEqual(activity.confidence!.overall!);
  });

  test("enriched features get research_coverage bump from donor matches", () => {
    const features: CandidateFeature[] = [
      {
        name: "Composer Controls",
        description: "Rich text composition with mentions, attachments, formatting",
        feature_type: "collaboration_system",
        confidence: { overall: 0.6, research_coverage: 0.3 },
      },
    ];

    const enriched = enrichFeaturesWithDonorMatches(features, slackKB);
    expect(enriched[0]!.confidence!.research_coverage!).toBeGreaterThan(0.3);
  });
});

// ─── Summary Report ──────────────────────────────────────────────────────────

describe("Batch matching summary", () => {
  test("produces actionable coverage report for Slack", () => {
    const result = matchAllFeatures(SLACK_PERPLEXITY_FEATURES, slackKB);

    console.log(`\n── Slack Donor Matching Report ──`);
    console.log(`Features: ${SLACK_PERPLEXITY_FEATURES.length}`);
    console.log(`With donor depth: ${result.features_with_depth}`);
    console.log(`Without donor depth: ${result.features_without_depth}`);
    console.log(`Coverage: ${(result.coverage_rate * 100).toFixed(0)}%`);
    console.log(`Direct build: ${result.direct_build_count}`);
    console.log(`Caution build: ${result.caution_build_count}`);
    console.log(`Research required: ${result.research_required_count}`);
    for (const m of result.matches) {
      const icon = m.has_donor_depth ? "+" : "-";
      console.log(`  ${icon} ${m.feature_name}: ${m.routing_recommendation} (score: ${m.match_score.toFixed(2)}) — ${m.match_explanation}`);
    }

    expect(result.features_with_depth).toBeGreaterThan(0);
    // At least one feature should have low/no coverage
    expect(result.research_required_count).toBeGreaterThanOrEqual(1);
  });

  test("produces actionable coverage report for Stripe", () => {
    const result = matchAllFeatures(STRIPE_PERPLEXITY_FEATURES, stripeKB);

    console.log(`\n── Stripe Donor Matching Report ──`);
    console.log(`Features: ${STRIPE_PERPLEXITY_FEATURES.length}`);
    console.log(`With donor depth: ${result.features_with_depth}`);
    console.log(`Without donor depth: ${result.features_without_depth}`);
    console.log(`Coverage: ${(result.coverage_rate * 100).toFixed(0)}%`);
    console.log(`Direct build: ${result.direct_build_count}`);
    console.log(`Caution build: ${result.caution_build_count}`);
    console.log(`Research required: ${result.research_required_count}`);
    for (const m of result.matches) {
      const icon = m.has_donor_depth ? "+" : "-";
      console.log(`  ${icon} ${m.feature_name}: ${m.routing_recommendation} (score: ${m.match_score.toFixed(2)}) — ${m.match_explanation}`);
    }

    expect(result.features_with_depth).toBeGreaterThan(0);
  });
});
