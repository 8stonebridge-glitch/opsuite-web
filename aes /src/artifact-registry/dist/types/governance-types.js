"use strict";
/**
 * AES Governance Training Types
 *
 * Types for governance-as-artifact: trainable config, replay harness,
 * governance proposals, and promotion decisions.
 *
 * Design principle: governance config is a first-class append-only artifact.
 * Frozen fields (hard vetoes, security stops) are never trainable.
 * Trainable fields (confidence weights, thresholds) are optimized via
 * automated sandbox replay.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=governance-types.js.map