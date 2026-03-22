import type { ValidatorAdapter, ValidatorAdapterResult, ValidatorExecutionContext } from "../postbuild";
export declare class DiffScopeValidator implements ValidatorAdapter {
    readonly validator_id = "diff-scope-validator";
    validate(context: ValidatorExecutionContext): Promise<ValidatorAdapterResult>;
}
export declare class TestRunOutcomeValidator implements ValidatorAdapter {
    readonly validator_id = "test-run-validator";
    validate(context: ValidatorExecutionContext): Promise<ValidatorAdapterResult>;
}
//# sourceMappingURL=built-in-validators.d.ts.map