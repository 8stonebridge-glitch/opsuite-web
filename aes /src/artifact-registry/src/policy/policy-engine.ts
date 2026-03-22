/**
 * AES Policy Layer — Combined Policy Evaluation
 *
 * Hard vetoes always win over confidence routing.
 */

import type { ConfidenceBreakdown, ConfidenceRoute, HardVeto, TieredConstraint } from "../types";
import { evaluateConfidence, evaluateConfidenceWithAuthority } from "./confidence-engine";
import {
  evaluateHardVetoes,
  type HardVetoInput,
} from "./hard-veto-engine";

export interface PolicyEvaluation {
  hard_vetoes: HardVeto[];
  hard_blocked: boolean;
  confidence_score: number;
  confidence_route: ConfidenceRoute;
  final_route: ConfidenceRoute;
  confidence_breakdown: ConfidenceBreakdown;
}

export class PolicyEngine {
  evaluate(
    input: HardVetoInput & {
      confidence_breakdown: ConfidenceBreakdown;
      tiered_constraints?: TieredConstraint[];
    }
  ): PolicyEvaluation {
    const hard_vetoes = evaluateHardVetoes(input);
    const confidence = input.tiered_constraints
      ? evaluateConfidenceWithAuthority(input.confidence_breakdown, input.tiered_constraints)
      : evaluateConfidence(input.confidence_breakdown);
    const hard_blocked = hard_vetoes.some((veto) => veto.blocking);

    return {
      hard_vetoes,
      hard_blocked,
      confidence_score: confidence.score,
      confidence_route: confidence.route,
      final_route: hard_blocked ? "ESCALATE" : confidence.route,
      confidence_breakdown: input.confidence_breakdown,
    };
  }
}
