/**
 * AES Planning — Build Program Generator
 *
 * Transforms FeatureSpec[] into BuildProgramInput — the exact shape
 * consumed by runBuildProgramWorkflow() in builder-launch.ts.
 *
 * This is the bridge between the front half (planning) and the back half (execution).
 * Zero changes to the back half are required.
 */
import type { BuildProgramInput } from "../bootstrap/builder-launch";
import type { AppSpec, FeatureSpec } from "../types/app-spec";
export interface GenerateBuildProgramInput {
    app: AppSpec;
    features: FeatureSpec[];
    requested_by: string;
    builder_timeout_ms?: number;
    stop_on_failure?: boolean;
}
/**
 * Converts promoted FeatureSpec[] into a BuildProgramInput
 * ready for runBuildProgramWorkflow().
 */
export declare function generateBuildProgram(input: GenerateBuildProgramInput): BuildProgramInput;
//# sourceMappingURL=build-program-generator.d.ts.map