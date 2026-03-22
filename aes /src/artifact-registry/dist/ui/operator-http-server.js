"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperatorHttpServer = void 0;
const node_http_1 = require("node:http");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const agent_pipeline_view_1 = require("./agent-pipeline-view");
const office_renderer_1 = require("./office-renderer");
const bootstrap_1 = require("../bootstrap");
const app_intake_1 = require("../intake/app-intake");
const app_research_1 = require("../research/app-research");
const app_decomposer_1 = require("../planning/app-decomposer");
const spec_verifier_1 = require("../planning/spec-verifier");
const promotion_engine_1 = require("../planning/promotion-engine");
const build_program_generator_1 = require("../planning/build-program-generator");
class OperatorHttpRequestError extends Error {
    constructor(status_code, error_code, message) {
        super(message);
        this.status_code = status_code;
        this.error_code = error_code;
        this.name = "OperatorHttpRequestError";
    }
}
function json(response, statusCode, body) {
    response.statusCode = statusCode;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify(body, null, 2));
}
function html(response, statusCode, body) {
    response.statusCode = statusCode;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(body);
}
async function readJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) {
        return {};
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    catch (error) {
        throw new OperatorHttpRequestError(400, "INVALID_JSON", error instanceof Error ? error.message : String(error));
    }
}
function notFound(response) {
    json(response, 404, {
        error: "NOT_FOUND",
    });
}
function dashboardHtml(_baseUrl, summary) {
    const attentionTotal = summary.pending_escalations + summary.blocked_builds
        + summary.verified_restricted_write_backs + summary.stale_bridges;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AES Operator Console</title>
<style>
:root{--bg:#09090b;--surface:#18181b;--surface2:#27272a;--border:#3f3f46;--border-focus:#a1a1aa;--text:#fafafa;--text2:#a1a1aa;--text3:#71717a;--green:#10b981;--green-bg:#052e16;--green-text:#6ee7b7;--red:#ef4444;--red-bg:#450a0a;--red-text:#fca5a5;--amber:#f59e0b;--amber-bg:#451a03;--amber-text:#fcd34d;--active:#fafafa;--active-bg:#27272a;--active-border:#52525b;--radius:6px;--font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace}
*,*::before,*::after{box-sizing:border-box;margin:0}
body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;min-height:100vh}

/* ── Top bar ── */
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;height:48px;gap:1rem;position:sticky;top:0;z-index:50}
.topbar-brand{font-weight:700;font-size:15px;letter-spacing:-0.02em;color:var(--text);white-space:nowrap}
.topbar-brand span{color:var(--text);margin-right:2px}
.topbar-sep{width:1px;height:20px;background:var(--border);flex-shrink:0}
.topbar-health{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2)}
.health-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--text3)}
.health-dot.ok{background:var(--green)}
.health-dot.degraded{background:var(--amber)}
.health-dot.error{background:var(--red)}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:0.75rem}
.topbar-stat{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px}
.topbar-stat strong{color:var(--text2);font-weight:600}
.topbar-stat strong.warn{color:var(--amber)}

/* ── Attention banner ── */
.attention-banner{background:var(--amber-bg);border-bottom:1px solid #78350f;padding:6px 1.5rem;font-size:12px;color:var(--amber-text);display:flex;align-items:center;gap:8px;cursor:pointer}
.attention-banner:hover{background:#4a1d04}
.attention-banner .dot{width:6px;height:6px;border-radius:50%;background:var(--amber);flex-shrink:0}

/* ── Build context bar ── */
.build-bar{background:var(--surface2);border-bottom:1px solid var(--border);padding:8px 1.5rem;display:none;align-items:center;gap:1rem;font-size:12px}
.build-bar.visible{display:flex}
.build-bar-id{font-family:var(--mono);font-weight:700;color:var(--green-text);font-size:13px}
.build-bar-feature{color:var(--text2)}
.build-bar-status{margin-left:auto}

/* ── Progress steps ── */
.progress-bar{display:flex;align-items:center;padding:12px 1.5rem;gap:0;background:var(--surface);border-bottom:1px solid var(--border);overflow-x:auto}
.prog-step{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500;color:var(--text3);cursor:pointer;white-space:nowrap;transition:all 0.15s;border:1px solid transparent;user-select:none}
.prog-step:hover{color:var(--text2);background:var(--surface2)}
.prog-step.active{color:var(--active);background:var(--active-bg);border-color:var(--active-border)}
.prog-step.done{color:var(--green-text)}
.prog-step.error{color:var(--red-text)}
.prog-step .num{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:700;background:var(--surface2);color:var(--text3);flex-shrink:0}
.prog-step.active .num{background:var(--text);color:var(--bg)}
.prog-step.done .num{background:var(--green);color:white}
.prog-step.error .num{background:var(--red);color:white}
.prog-arrow{color:var(--border);font-size:16px;margin:0 2px;flex-shrink:0}
.prog-spacer{flex:1}
.prog-step-util{color:var(--text3);font-size:12px;padding:6px 12px;border-radius:20px;cursor:pointer;border:1px solid transparent}
.prog-step-util:hover{color:var(--text2);background:var(--surface2);border-color:var(--border)}
.prog-step-util.active{color:var(--active);background:var(--active-bg);border-color:var(--active-border)}

/* ── Main content ── */
.main{max-width:860px;margin:0 auto;padding:1.25rem 1.5rem 3rem}
.panel{display:none}
.panel.visible{display:block}
.panel-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px}
.panel-desc{font-size:13px;color:var(--text3);margin-bottom:1.25rem}

/* ── Forms ── */
fieldset{border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem 1rem 1rem;margin:0 0 1rem}
legend{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text3);padding:0 6px}
label{display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:3px;margin-top:0.6rem}
label:first-child{margin-top:0}
input,textarea,select{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;color:var(--text);font-family:var(--mono);font-size:13px;transition:border-color 0.15s}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--border-focus);box-shadow:0 0 0 2px rgba(161,161,170,0.15)}
textarea{resize:vertical;min-height:56px}
.form-row{display:grid;gap:0.75rem}
.form-row-2{grid-template-columns:1fr 1fr}
.form-row-4{grid-template-columns:1fr 1fr 1fr 1fr}
.form-row-5{grid-template-columns:1fr 1fr 1fr 1fr 1fr}
.form-hint{font-size:11px;color:var(--text3);margin-top:2px}

/* ── Buttons ── */
.actions{display:flex;align-items:center;gap:0.5rem;margin-top:1rem}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--radius);border:1px solid transparent;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;white-space:nowrap;line-height:1.4}
.btn-primary{background:var(--text);color:var(--bg);border-color:var(--text)}
.btn-primary:hover{background:#d4d4d8;border-color:#d4d4d8}
.btn-primary:disabled{background:var(--surface2);color:var(--text3);border-color:var(--border);cursor:not-allowed}
.btn-danger{background:transparent;color:var(--red-text);border-color:#7f1d1d}
.btn-danger:hover{background:var(--red-bg)}
.btn-danger:disabled{color:var(--text3);border-color:var(--border);cursor:not-allowed}
.btn-ghost{background:transparent;color:var(--text2);border-color:var(--border)}
.btn-ghost:hover{background:var(--surface2);color:var(--text)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn-next{background:transparent;color:var(--green-text);border-color:#065f46}
.btn-next:hover{background:var(--green-bg)}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--text2);border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Result cards ── */
.result-card{border:1px solid var(--border);border-radius:var(--radius);margin-top:1rem;overflow:hidden}
.result-card.ok{border-color:#065f46}
.result-card.err{border-color:#7f1d1d}
.result-card.warn{border-color:#78350f}
.result-header{padding:10px 14px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
.result-card.ok .result-header{background:var(--green-bg);color:var(--green-text)}
.result-card.err .result-header{background:var(--red-bg);color:var(--red-text)}
.result-card.warn .result-header{background:var(--amber-bg);color:var(--amber-text)}
.result-body{padding:10px 14px;font-size:13px;color:var(--text2)}
.result-body dt{font-weight:600;color:var(--text);display:inline}
.result-body dt::after{content:": "}
.result-body dd{display:inline;margin:0}
.result-body dd::after{content:"";display:block;margin-bottom:4px}
.result-body .kv{display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--border);font-size:12px}
.result-body .kv:last-child{border:none}
.result-body .kv-key{color:var(--text3);min-width:120px;flex-shrink:0}
.result-body .kv-val{color:var(--text);font-family:var(--mono);word-break:break-all}
.tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:0.02em}
.tag-green{background:var(--green-bg);color:var(--green-text)}
.tag-red{background:var(--red-bg);color:var(--red-text)}
.tag-amber{background:var(--amber-bg);color:var(--amber-text)}
.tag-blue{background:var(--surface2);color:var(--text2)}

/* ── Collapsible raw JSON ── */
details.raw-detail{margin-top:0.5rem}
details.raw-detail summary{font-size:11px;color:var(--text3);cursor:pointer;padding:4px 0;user-select:none}
details.raw-detail summary:hover{color:var(--text2)}
details.raw-detail pre{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;font-size:11px;color:var(--text2);overflow:auto;max-height:300px;margin-top:4px;font-family:var(--mono);white-space:pre-wrap;word-break:break-all}

/* ── Inline status ── */
.op-status{font-size:13px;color:var(--text2);margin-top:0.6rem;min-height:20px}
.op-status .spinner{margin-right:6px}

/* ── No-build gate ── */
.gate-msg{text-align:center;padding:3rem 1rem;color:var(--text3)}
.gate-msg p{margin:0.5rem 0}
.gate-msg .gate-icon{font-size:32px;margin-bottom:0.5rem;opacity:0.3}

/* ── Attention queue ── */
.attn-section{margin-top:1rem}
.attn-section h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)}
.attn-list{list-style:none;padding:0;margin:0 0 1rem}
.attn-list li{padding:6px 10px;background:var(--surface2);border-radius:4px;margin-bottom:4px;font-size:12px;font-family:var(--mono);color:var(--text2);display:flex;align-items:center;gap:8px}
.attn-list li .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.attn-empty{font-size:12px;color:var(--text3);padding:4px 0;margin-bottom:1rem}

.hidden{display:none!important}
.mode-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:3px;background:var(--surface2);color:var(--text2);border:1px solid var(--border);letter-spacing:0.02em}
@media(max-width:640px){.form-row-2,.form-row-4,.form-row-5{grid-template-columns:1fr}.progress-bar{padding:8px 1rem}}
</style>
</head>
<body>

<!-- ════════ Top bar ════════ -->
<div class="topbar">
  <div class="topbar-brand"><span>AES</span> Operator Console</div>
  <div class="topbar-sep"></div>
  <div class="topbar-health" id="health-area">
    <span class="health-dot" id="health-dot"></span>
    <span id="health-label">connecting...</span>
  </div>
  <div class="topbar-sep"></div>
  <span class="mode-badge" id="mode-badge">mode: loading</span>
  <div class="topbar-right">
    <div class="topbar-stat">Escalations <strong id="stat-esc">${summary.pending_escalations}</strong></div>
    <div class="topbar-stat">Blocked <strong id="stat-blk" class="${summary.blocked_builds > 0 ? "warn" : ""}">${summary.blocked_builds}</strong></div>
    <div class="topbar-stat">Write-backs <strong id="stat-wb">${summary.verified_restricted_write_backs}</strong></div>
    <div class="topbar-stat">Stale <strong id="stat-stale">${summary.stale_bridges}</strong></div>
  </div>
</div>

<!-- ════════ Attention banner ════════ -->
<div class="attention-banner${attentionTotal === 0 ? " hidden" : ""}" id="attention-banner" onclick="showPanel('attention')">
  <span class="dot"></span>
  <span id="attention-banner-text">${attentionTotal} item${attentionTotal !== 1 ? "s" : ""} need${attentionTotal === 1 ? "s" : ""} attention</span>
</div>

<!-- ════════ Build context bar ════════ -->
<div class="build-bar" id="build-bar">
  <span style="color:var(--text3);font-weight:500">Active Build</span>
  <span class="build-bar-id" id="bb-id">—</span>
  <span class="build-bar-feature" id="bb-feature"></span>
  <span class="build-bar-status" id="bb-status"></span>
</div>

<!-- ════════ Progress steps ════════ -->
<div class="progress-bar" id="progress-bar">
  <div class="prog-step active" id="ps-1" onclick="showPanel('prepare')"><span class="num">1</span>Prepare</div>
  <span class="prog-arrow">&rsaquo;</span>
  <div class="prog-step" id="ps-2" onclick="showPanel('builder')"><span class="num">2</span>Build</div>
  <span class="prog-arrow">&rsaquo;</span>
  <div class="prog-step" id="ps-3" onclick="showPanel('diff')"><span class="num">3</span>Diff</div>
  <span class="prog-arrow">&rsaquo;</span>
  <div class="prog-step" id="ps-4" onclick="showPanel('test')"><span class="num">4</span>Test</div>
  <span class="prog-arrow">&rsaquo;</span>
  <div class="prog-step" id="ps-5" onclick="showPanel('validate')"><span class="num">5</span>Validate</div>
  <span class="prog-spacer"></span>
  <div class="prog-step-util" id="ps-replay" onclick="showPanel('replay')">Replay</div>
  <div class="prog-step-util" id="ps-attention" onclick="showPanel('attention')">Attention</div>
  <span class="prog-spacer"></span>
  <div class="prog-step-util" id="ps-agents" onclick="showPanel('agents')" style="color:var(--green-text);border-color:#065f46">●&ensp;Live</div>
  <div class="prog-step-util" id="ps-features" onclick="showPanel('features')">Features</div>
  <div class="prog-step-util" id="ps-promotion" onclick="showPanel('promotion')">Promotion</div>
  <div class="prog-step-util" id="ps-deps" onclick="showPanel('deps')">Deps</div>
  <div class="prog-step-util" id="ps-progress" onclick="showPanel('progress')">Progress</div>
  <div class="prog-step-util" id="ps-verification" onclick="showPanel('verification')">Verify</div>
  <div class="prog-step-util" id="ps-governance" onclick="showPanel('governance')">Govern</div>
</div>

<!-- ════════ Main content ════════ -->
<div class="main">

  <!-- ── Panel: Prepare Build ── -->
  <div class="panel visible" id="panel-prepare">
    <div class="panel-title">Prepare Build</div>
    <div class="panel-desc">Create a new build request, compile bridge constraints, and authorize execution.</div>

    <fieldset>
      <legend>Request</legend>
      <div class="form-row form-row-2">
        <div><label>Feature ID</label><input id="prep-feature" placeholder="FEAT-AES-REAL-001" /></div>
        <div><label>Requested By</label><input id="prep-requested-by" value="operator" /></div>
      </div>
      <label>Intent</label>
      <input id="prep-intent" placeholder="What does this build accomplish?" />
    </fieldset>

    <fieldset>
      <legend>Scope</legend>
      <div class="form-row form-row-2">
        <div><label>Read / Build Scope</label><input id="prep-scope" value="src/**" /><div class="form-hint">Comma-separated glob paths</div></div>
        <div><label>Write Scope</label><input id="prep-write-scope" value="src/**" /><div class="form-hint">Defaults to build scope if empty</div></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Quality Signals</legend>
      <div class="form-row form-row-4">
        <div><label>Graph Coverage</label><input id="prep-cov" type="number" step="0.01" min="0" max="1" value="0.90" /></div>
        <div><label>Pattern Strength</label><input id="prep-pat" type="number" step="0.01" min="0" max="1" value="0.90" /></div>
        <div><label>Rule Consistency</label><input id="prep-rul" type="number" step="0.01" min="0" max="1" value="0.90" /></div>
        <div><label>Evidence Level</label><input id="prep-evi" type="number" step="0.01" min="0" max="1" value="0.90" /></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Acceptance &amp; Tests (optional)</legend>
      <label>Acceptance Criteria</label>
      <textarea id="prep-acceptance" rows="2" placeholder="AC-1 | Feature works end-to-end | functional | true"></textarea>
      <div class="form-hint">One per line: id | description | type | mandatory</div>
      <label>Test Cases</label>
      <textarea id="prep-tests" rows="2" placeholder="TC-1 | Smoke test | integration | AC-1 | true"></textarea>
      <div class="form-hint">One per line: id | description | type | linked_criterion_id | mandatory</div>
    </fieldset>

    <div class="actions">
      <button class="btn btn-primary" id="btn-prepare" onclick="doPrepareBuild()">Prepare Build</button>
    </div>
    <div class="op-status" id="prepare-status"></div>
    <div id="prepare-result"></div>
  </div>

  <!-- ── Panel: Run Builder ── -->
  <div class="panel" id="panel-builder">
    <div class="panel-title">Run Builder</div>
    <div class="panel-desc">Launch the supervised builder session for the active build.</div>
    <div id="builder-gate" class="gate-msg"><div class="gate-icon">2</div><p>Complete <strong>Prepare Build</strong> first to unlock this step.</p></div>
    <div id="builder-controls" class="hidden">
      <fieldset>
        <legend>Execution Options</legend>
        <div class="form-row form-row-2">
          <div><label>Mode</label><select id="builder-wait"><option value="true">Wait for completion</option><option value="false">Launch and return immediately</option></select></div>
          <div><label>Timeout (ms)</label><input id="builder-timeout" type="number" min="1000" placeholder="30000" /><div class="form-hint">Leave empty for no timeout</div></div>
        </div>
      </fieldset>
      <div class="actions">
        <button class="btn btn-primary" id="btn-run-builder" onclick="doRunBuilder()">Run Builder</button>
        <button class="btn btn-danger" id="btn-abort-builder" onclick="doAbortBuilder()">Abort</button>
      </div>
      <div class="op-status" id="builder-status"></div>
      <div id="builder-result"></div>
    </div>
  </div>

  <!-- ── Panel: Record Diff ── -->
  <div class="panel" id="panel-diff">
    <div class="panel-title">Record Diff</div>
    <div class="panel-desc">Capture the files changed by the builder and optional diff text for scope verification.</div>
    <div id="diff-gate" class="gate-msg"><div class="gate-icon">3</div><p>Complete <strong>Prepare Build</strong> first to unlock this step.</p></div>
    <div id="diff-controls" class="hidden">
      <fieldset>
        <legend>Changed Files</legend>
        <label>File manifest (JSON)</label>
        <textarea id="diff-files" rows="4" placeholder='[
  { "path": "src/ui/operator-http-server.ts", "change_type": "modified", "lines_added": 10, "lines_removed": 2 }
]'></textarea>
        <div class="form-hint">JSON array of { path, change_type, lines_added, lines_removed }</div>
      </fieldset>
      <fieldset>
        <legend>Diff Text (optional)</legend>
        <textarea id="diff-text" rows="3" placeholder="Paste unified diff output here"></textarea>
      </fieldset>
      <div class="actions">
        <button class="btn btn-primary" id="btn-record-diff" onclick="doRecordDiff()">Record Diff</button>
      </div>
      <div class="op-status" id="diff-status"></div>
      <div id="diff-result"></div>
    </div>
  </div>

  <!-- ── Panel: Record Test Run ── -->
  <div class="panel" id="panel-test">
    <div class="panel-title">Record Test Run</div>
    <div class="panel-desc">Submit test execution results for this build.</div>
    <div id="test-gate" class="gate-msg"><div class="gate-icon">4</div><p>Complete <strong>Prepare Build</strong> first to unlock this step.</p></div>
    <div id="test-controls" class="hidden">
      <fieldset>
        <legend>Test Results</legend>
        <div class="form-row form-row-5">
          <div><label>Outcome</label><select id="test-status"><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="ERROR">ERROR</option></select></div>
          <div><label>Total Run</label><input id="test-cases-run" type="number" min="0" value="1" /></div>
          <div><label>Passed</label><input id="test-passed" type="number" min="0" value="1" /></div>
          <div><label>Failed</label><input id="test-failed" type="number" min="0" value="0" /></div>
          <div><label>Skipped</label><input id="test-skipped" type="number" min="0" value="0" /></div>
        </div>
        <label>Test Output (optional)</label>
        <textarea id="test-output" rows="2" placeholder="All tests passed"></textarea>
      </fieldset>
      <div class="actions">
        <button class="btn btn-primary" id="btn-record-test" onclick="doRecordTestRun()">Record Test Run</button>
      </div>
      <div class="op-status" id="test-run-status"></div>
      <div id="test-result"></div>
    </div>
  </div>

  <!-- ── Panel: Run Validators ── -->
  <div class="panel" id="panel-validate">
    <div class="panel-title">Run Validators</div>
    <div class="panel-desc">Execute all registered validators and finalize the build.</div>
    <div id="validate-gate" class="gate-msg"><div class="gate-icon">5</div><p>Complete <strong>Prepare Build</strong> first to unlock this step.</p></div>
    <div id="validate-controls" class="hidden">
      <div class="actions">
        <button class="btn btn-primary" id="btn-run-validators" onclick="doRunValidators()">Run Validators</button>
      </div>
      <div class="op-status" id="validate-status"></div>
      <div id="validate-result"></div>
    </div>
  </div>

  <!-- ── Panel: Build Replay ── -->
  <div class="panel" id="panel-replay">
    <div class="panel-title">Build Replay</div>
    <div class="panel-desc">Load the full lineage and audit trail for any build.</div>
    <fieldset>
      <legend>Lookup</legend>
      <label>Build ID</label>
      <input id="replay-build-id" placeholder="Enter a build ID" />
      <div class="form-hint">Uses the active build if left empty</div>
    </fieldset>
    <div class="actions">
      <button class="btn btn-primary" onclick="doReplay()">Load Replay</button>
    </div>
    <div class="op-status" id="replay-status"></div>
    <div id="replay-result"></div>
  </div>

  <!-- ── Panel: Attention Queue ── -->
  <div class="panel" id="panel-attention">
    <div class="panel-title">Attention Queue</div>
    <div class="panel-desc">Builds, escalations, and bridges that need operator action.</div>
    <div class="actions" style="margin-top:0">
      <button class="btn btn-ghost btn-sm" onclick="doRefreshAttention()">Refresh</button>
    </div>
    <div id="attention-content"></div>
  </div>

${(0, agent_pipeline_view_1.extendedPanelsHtml)()}

</div>

<script>
(function(){
  "use strict";
  var activeBuildId = null;
  var activeFeatureId = null;
  var stepStates = {1:'pending',2:'pending',3:'pending',4:'pending',5:'pending'};
  var panels = ['prepare','builder','diff','test','validate','replay','attention','agents','features','promotion','deps','progress','verification','governance'];
  var stepPanelMap = {prepare:1,builder:2,diff:3,test:4,validate:5};

  /* ── Helpers ── */
  function $(id){ return document.getElementById(id); }
  function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  async function apiPost(path, body) {
    var opts = { method:'POST', headers:{'content-type':'application/json'} };
    if (body !== undefined) opts.body = JSON.stringify(body);
    var r = await fetch(path, opts);
    var j = await r.json();
    return {status:r.status, data:j, ok:r.ok};
  }
  async function apiGet(path) {
    var r = await fetch(path);
    var j = await r.json();
    return {status:r.status, data:j, ok:r.ok};
  }

  function setHtml(id, h){ var el=$(id); if(el) el.innerHTML=h; }
  function tag(color, text){ return '<span class="tag tag-'+color+'">'+esc(text)+'</span>'; }
  function spinMsg(msg){ return '<span class="spinner"></span> '+esc(msg); }

  function resultCard(type, title, bodyHtml, rawData){
    var h = '<div class="result-card '+type+'">';
    h += '<div class="result-header">'+title+'</div>';
    if (bodyHtml) h += '<div class="result-body">'+bodyHtml+'</div>';
    h += '</div>';
    if (rawData !== undefined) {
      h += '<details class="raw-detail"><summary>Show raw response</summary>';
      h += '<pre>'+esc(JSON.stringify(rawData,null,2))+'</pre></details>';
    }
    return h;
  }

  function kvRow(key, val){ return '<div class="kv"><span class="kv-key">'+esc(key)+'</span><span class="kv-val">'+esc(String(val))+'</span></div>'; }

  function parseLines(text, cols) {
    if (!text.trim()) return [];
    return text.trim().split('\\n').map(function(line){
      var parts = line.split('|').map(function(s){ return s.trim(); });
      var obj = {};
      for (var i=0;i<cols.length;i++){
        var val=parts[i]||'';
        if(cols[i]==='mandatory') val=val==='true';
        obj[cols[i]]=val;
      }
      return obj;
    });
  }

  /* ── Navigation ── */
  window.showPanel = function(name){
    for (var i=0;i<panels.length;i++){
      var p = $('panel-'+panels[i]);
      if(p){ if(panels[i]===name) p.classList.add('visible'); else p.classList.remove('visible'); }
    }
    // Update progress bar active states
    for(var s=1;s<=5;s++){
      var el=$('ps-'+s);
      if(el){el.classList.remove('active'); if(stepPanelMap[name]===s) el.classList.add('active');}
    }
    ['replay','attention'].forEach(function(u){
      var el=$('ps-'+u);
      if(el){el.classList.remove('active'); if(name===u) el.classList.add('active');}
    });
  };

  function advanceTo(panel){
    showPanel(panel);
  }

  /* ── Build bar ── */
  function updateBuildBar(id, feature, statusHtml){
    activeBuildId = id;
    activeFeatureId = feature || '';
    var bar = $('build-bar');
    bar.classList.add('visible');
    $('bb-id').textContent = id;
    $('bb-feature').textContent = feature ? feature : '';
    $('bb-status').innerHTML = statusHtml || '';
    // Unlock gated panels
    ['builder-gate','diff-gate','test-gate','validate-gate'].forEach(function(g){ $(g).classList.add('hidden'); });
    ['builder-controls','diff-controls','test-controls','validate-controls'].forEach(function(c){ $(c).classList.remove('hidden'); });
    var rp = $('replay-build-id');
    if (rp && !rp.value) rp.value = id;
  }

  function updateStepState(num, state){
    stepStates[num] = state;
    var el = $('ps-'+num);
    if(!el) return;
    el.classList.remove('done','error');
    if(state==='done') el.classList.add('done');
    if(state==='error') el.classList.add('error');
  }

  function nextStepButton(nextPanel, label){
    return ' <button class="btn btn-next btn-sm" onclick="showPanel(\\''+nextPanel+'\\')">'+esc(label)+' &rarr;</button>';
  }

  /* ── Health ── */
  window.refreshHealth = async function(){
    $('health-label').textContent = 'checking...';
    $('health-dot').className = 'health-dot';
    try {
      var r = await apiGet('/api/health');
      if(r.ok){
        $('health-dot').className = 'health-dot '+ r.data.status;
        $('health-label').textContent = r.data.status + ' — ' + (r.data.total_records !== null ? r.data.total_records + ' records' : 'registry unknown');
        // Surface runtime mode (Stripe operator shell: mode must be explicit)
        var deps = r.data.dependencies || [];
        var registryDep = deps.find(function(d){ return d.name === 'artifact_registry'; });
        var truthDep = deps.find(function(d){ return d.name === 'truth_adapter'; });
        var regMode = registryDep && registryDep.metadata ? registryDep.metadata.mode : '?';
        var truthMode = truthDep && truthDep.metadata ? truthDep.metadata.mode : '?';
        $('mode-badge').textContent = regMode + ' / ' + truthMode;
      } else {
        $('health-dot').className = 'health-dot error';
        $('health-label').textContent = 'error';
        $('mode-badge').textContent = 'unknown';
      }
    } catch(e){
      $('health-dot').className = 'health-dot error';
      $('health-label').textContent = 'offline';
      $('mode-badge').textContent = 'offline';
    }
  };

  /* ── Step 1: Prepare Build ── */
  window.doPrepareBuild = async function(){
    var feature = $('prep-feature').value.trim();
    var intent = $('prep-intent').value.trim();
    var reqBy = $('prep-requested-by').value.trim();
    if(!feature||!intent){ setHtml('prepare-status','<span style="color:var(--red-text)">Feature ID and Intent are required.</span>'); return; }
    var scopePaths = $('prep-scope').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
    var writePaths = $('prep-write-scope').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
    var ac = parseLines($('prep-acceptance').value, ['id','description','type','mandatory']);
    var tc = parseLines($('prep-tests').value, ['id','description','type','linked_criterion_id','mandatory']);
    var payload = {
      submit_request:{feature_id:feature, intent:intent, requested_by:reqBy},
      scope:{paths:scopePaths},
      read_scope:{paths:scopePaths},
      write_scope:{paths:writePaths.length?writePaths:scopePaths},
      confidence_breakdown:{
        graph_coverage:parseFloat($('prep-cov').value)||0.9,
        pattern_strength:parseFloat($('prep-pat').value)||0.9,
        rule_consistency:parseFloat($('prep-rul').value)||0.9,
        evidence_level:parseFloat($('prep-evi').value)||0.9
      }
    };
    if(ac.length) payload.acceptance_criteria=ac;
    if(tc.length) payload.test_cases=tc;
    $('btn-prepare').disabled=true;
    setHtml('prepare-status',spinMsg('Compiling bridge and authorizing...'));
    $('prepare-result').innerHTML='';
    try {
      var r = await apiPost('/api/builds/prepare', payload);
      if(r.ok && r.data.build_record){
        var bid = r.data.build_record.payload.build_id;
        var allowed = r.data.authorization && r.data.authorization.allowed;
        var blocked = r.data.policy_evaluation && r.data.policy_evaluation.hard_blocked;
        var fresh = r.data.freshness_record ? r.data.freshness_record.payload.is_fresh : null;
        var route = r.data.policy_evaluation ? r.data.policy_evaluation.final_route : '';
        var vetoes = r.data.policy_evaluation && r.data.policy_evaluation.hard_vetoes ? r.data.policy_evaluation.hard_vetoes : [];
        var bodyHtml = kvRow('Build ID', bid)
          + kvRow('Bridge ID', r.data.validated_bridge_record ? r.data.validated_bridge_record.payload.bridge_id : '—')
          + kvRow('Feature', feature)
          + kvRow('Route', route)
          + kvRow('Fresh', fresh !== null ? String(fresh) : 'unknown');
        if(vetoes.length){
          bodyHtml += '<div style="margin-top:8px;font-weight:600;color:var(--red-text)">Hard Vetoes:</div>';
          for(var vi=0;vi<vetoes.length;vi++) bodyHtml += '<div style="padding:2px 0;font-size:12px;color:var(--red-text)">&bull; '+esc(vetoes[vi])+'</div>';
        }
        if(allowed){
          updateBuildBar(bid, feature, tag('green','AUTHORIZED'));
          setHtml('prepare-status', tag('green','AUTHORIZED'));
          $('prepare-result').innerHTML = resultCard('ok','Build authorized and ready', bodyHtml, r.data) + nextStepButton('builder','Continue to Run Builder');
          updateStepState(1,'done');
        } else if(blocked){
          updateBuildBar(bid, feature, tag('red','BLOCKED'));
          setHtml('prepare-status', tag('red','BLOCKED') + ' Hard blocked by policy');
          $('prepare-result').innerHTML = resultCard('err','Build blocked by policy', bodyHtml, r.data);
          updateStepState(1,'error');
        } else {
          updateBuildBar(bid, feature, tag('amber','NOT AUTHORIZED'));
          setHtml('prepare-status', tag('amber','NOT AUTHORIZED'));
          $('prepare-result').innerHTML = resultCard('warn','Build not authorized', bodyHtml, r.data);
          updateStepState(1,'error');
        }
      } else {
        setHtml('prepare-status','<span style="color:var(--red-text)">'+esc(r.data.message||r.data.error||'Unknown error')+'</span>');
        $('prepare-result').innerHTML = resultCard('err','Prepare failed', '<p>'+esc(r.data.message||r.data.error||'Unknown error')+'</p>', r.data);
        updateStepState(1,'error');
      }
    } catch(e){
      setHtml('prepare-status','<span style="color:var(--red-text)">Network error: '+esc(e.message)+'</span>');
      updateStepState(1,'error');
    }
    $('btn-prepare').disabled=false;
  };

  /* ── Step 2: Run Builder ── */
  window.doRunBuilder = async function(){
    if(!activeBuildId) return;
    var wait = $('builder-wait').value==='true';
    var tv = $('builder-timeout').value;
    var payload = {wait_for_completion:wait};
    if(tv) payload.timeout_ms=parseInt(tv,10);
    $('btn-run-builder').disabled=true;
    $('btn-abort-builder').disabled = wait;
    setHtml('builder-status',spinMsg(wait?'Running builder (waiting for exit)...':'Launching builder session...'));
    $('builder-result').innerHTML='';
    try {
      var r = await apiPost('/api/builds/'+activeBuildId+'/run-builder', payload);
      if(r.ok){
        var completed=r.data.completed, timedOut=r.data.timed_out, aborted=r.data.aborted_build;
        var bodyHtml='';
        if(r.data.started && r.data.started.session) bodyHtml += kvRow('Session',r.data.started.session.session_id);
        if(completed) bodyHtml += kvRow('Exit Status',completed.status);
        if(completed && completed.exit_code !== undefined) bodyHtml += kvRow('Exit Code',completed.exit_code);
        if(timedOut) bodyHtml += kvRow('Timed Out','true');
        if(aborted && aborted.build_record) bodyHtml += kvRow('Build Status',aborted.build_record.payload.status);

        if(completed && completed.status==='EXITED'){
          setHtml('builder-status',tag('green','EXITED'));
          $('builder-result').innerHTML = resultCard('ok','Builder completed', bodyHtml, r.data) + nextStepButton('diff','Continue to Record Diff');
          updateStepState(2,'done');
          updateBuildBar(activeBuildId, activeFeatureId, tag('green','BUILDER DONE'));
        } else if(timedOut){
          setHtml('builder-status',tag('red','TIMED OUT'));
          $('builder-result').innerHTML = resultCard('err','Builder timed out and was aborted', bodyHtml, r.data);
          updateStepState(2,'error');
          updateBuildBar(activeBuildId, activeFeatureId, tag('red','TIMED OUT'));
        } else if(aborted){
          setHtml('builder-status',tag('red','ABORTED'));
          $('builder-result').innerHTML = resultCard('err','Builder was terminated', bodyHtml, r.data);
          updateStepState(2,'error');
          updateBuildBar(activeBuildId, activeFeatureId, tag('red','ABORTED'));
        } else if(!wait && r.data.started){
          setHtml('builder-status',tag('blue','RUNNING'));
          $('builder-result').innerHTML = resultCard('ok','Builder launched', bodyHtml, r.data) + nextStepButton('diff','Continue to Record Diff');
          updateStepState(2,'done');
          updateBuildBar(activeBuildId, activeFeatureId, tag('blue','RUNNING'));
        } else {
          setHtml('builder-status',tag('blue','LAUNCHED'));
          updateStepState(2,'done');
        }
      } else {
        setHtml('builder-status','<span style="color:var(--red-text)">'+esc(r.data.message||r.data.error||'Failed')+'</span>');
        $('builder-result').innerHTML = resultCard('err','Run builder failed','<p>'+esc(r.data.message||r.data.error||'Unknown')+'</p>',r.data);
        updateStepState(2,'error');
      }
    } catch(e){
      setHtml('builder-status','<span style="color:var(--red-text)">'+esc(e.message)+'</span>');
      updateStepState(2,'error');
    }
    $('btn-run-builder').disabled=false;
    $('btn-abort-builder').disabled=false;
  };

  window.doAbortBuilder = async function(){
    if(!activeBuildId) return;
    $('btn-abort-builder').disabled=true;
    setHtml('builder-status',spinMsg('Aborting builder...'));
    try {
      var r = await apiPost('/api/builds/'+activeBuildId+'/abort-builder');
      if(r.ok){
        var a=r.data.aborted;
        var ss=a&&a.session?a.session.status:'none';
        var bs=a&&a.build_record?a.build_record.payload.status:'unknown';
        setHtml('builder-status',tag('red','ABORTED'));
        $('builder-result').innerHTML = resultCard('err','Builder aborted',kvRow('Session',ss)+kvRow('Build Status',bs),r.data);
        updateStepState(2,'error');
        updateBuildBar(activeBuildId, activeFeatureId, tag('red','ABORTED'));
      } else {
        setHtml('builder-status','<span style="color:var(--red-text)">'+esc(r.data.message||r.data.error||'Failed')+'</span>');
      }
    } catch(e){ setHtml('builder-status','<span style="color:var(--red-text)">'+esc(e.message)+'</span>'); }
    $('btn-abort-builder').disabled=false;
  };

  /* ── Step 3: Record Diff ── */
  window.doRecordDiff = async function(){
    if(!activeBuildId) return;
    var filesText=$('diff-files').value.trim();
    var diffText=$('diff-text').value.trim();
    var payload={};
    if(filesText){ try{payload.changed_files=JSON.parse(filesText);}catch(e){ setHtml('diff-status','<span style="color:var(--red-text)">Invalid JSON in changed files field.</span>'); return; } }
    if(diffText) payload.diff_text=diffText;
    $('btn-record-diff').disabled=true;
    setHtml('diff-status',spinMsg('Recording diff...'));
    $('diff-result').innerHTML='';
    try {
      var r = await apiPost('/api/builds/'+activeBuildId+'/record-diff',payload);
      if(r.ok){
        var hf=r.data.capture&&r.data.capture.hard_failure;
        var bodyHtml='';
        if(r.data.capture&&r.data.capture.diff_record) bodyHtml+=kvRow('Diff ID',r.data.capture.diff_record.payload.diff_record_id||'—');
        bodyHtml+=kvRow('Scope Violation',hf?'YES':'none');
        if(r.data.capture&&r.data.capture.diff_record&&r.data.capture.diff_record.payload.blob_ref) bodyHtml+=kvRow('Blob Ref',r.data.capture.diff_record.payload.blob_ref);
        if(hf){
          setHtml('diff-status',tag('red','SCOPE VIOLATION'));
          $('diff-result').innerHTML = resultCard('err','Diff recorded with scope violation',bodyHtml,r.data);
          updateStepState(3,'error');
        } else {
          setHtml('diff-status',tag('green','RECORDED'));
          $('diff-result').innerHTML = resultCard('ok','Diff captured',bodyHtml,r.data) + nextStepButton('test','Continue to Record Test Run');
          updateStepState(3,'done');
        }
      } else {
        setHtml('diff-status','<span style="color:var(--red-text)">'+esc(r.data.message||r.data.error||'Failed')+'</span>');
        $('diff-result').innerHTML = resultCard('err','Record diff failed','<p>'+esc(r.data.message||r.data.error||'Unknown')+'</p>',r.data);
        updateStepState(3,'error');
      }
    } catch(e){ setHtml('diff-status','<span style="color:var(--red-text)">'+esc(e.message)+'</span>'); updateStepState(3,'error'); }
    $('btn-record-diff').disabled=false;
  };

  /* ── Step 4: Record Test Run ── */
  window.doRecordTestRun = async function(){
    if(!activeBuildId) return;
    var payload={
      status:$('test-status').value,
      test_cases_run:parseInt($('test-cases-run').value,10)||0,
      passed:parseInt($('test-passed').value,10)||0,
      failed:parseInt($('test-failed').value,10)||0,
      skipped:parseInt($('test-skipped').value,10)||0
    };
    var output=$('test-output').value.trim();
    if(output) payload.output_text=output;
    $('btn-record-test').disabled=true;
    setHtml('test-run-status',spinMsg('Recording test run...'));
    $('test-result').innerHTML='';
    try {
      var r = await apiPost('/api/builds/'+activeBuildId+'/record-test-run',payload);
      if(r.ok){
        var bodyHtml=kvRow('Status',payload.status)+kvRow('Run',payload.test_cases_run)+kvRow('Passed',payload.passed)+kvRow('Failed',payload.failed)+kvRow('Skipped',payload.skipped);
        if(r.data.test_run&&r.data.test_run.payload.blob_ref) bodyHtml+=kvRow('Blob',r.data.test_run.payload.blob_ref);
        var isPass=payload.status==='PASS';
        setHtml('test-run-status',tag(isPass?'green':'red',payload.status));
        $('test-result').innerHTML = resultCard(isPass?'ok':'err',isPass?'Tests passed':'Tests '+payload.status,bodyHtml,r.data)
          + (isPass ? nextStepButton('validate','Continue to Run Validators') : '');
        updateStepState(4,isPass?'done':'error');
      } else {
        setHtml('test-run-status','<span style="color:var(--red-text)">'+esc(r.data.message||r.data.error||'Failed')+'</span>');
        $('test-result').innerHTML = resultCard('err','Record test run failed','<p>'+esc(r.data.message||r.data.error||'Unknown')+'</p>',r.data);
        updateStepState(4,'error');
      }
    } catch(e){ setHtml('test-run-status','<span style="color:var(--red-text)">'+esc(e.message)+'</span>'); updateStepState(4,'error'); }
    $('btn-record-test').disabled=false;
  };

  /* ── Step 5: Run Validators ── */
  window.doRunValidators = async function(){
    if(!activeBuildId) return;
    $('btn-run-validators').disabled=true;
    setHtml('validate-status',spinMsg('Executing validators...'));
    $('validate-result').innerHTML='';
    try {
      var r = await apiPost('/api/builds/'+activeBuildId+'/run-validators');
      if(r.ok){
        var fin=r.data.validation&&r.data.validation.finalization;
        var state=fin?fin.state:'unknown';
        var metrics=r.data.validation&&r.data.validation.metric_records?r.data.validation.metric_records.length:0;
        var runs=r.data.validation&&r.data.validation.validator_runs?r.data.validation.validator_runs:[];
        var bodyHtml=kvRow('Finalization',state)+kvRow('Metrics Captured',metrics);
        if(fin&&fin.write_back_record) bodyHtml+=kvRow('Write-back',fin.write_back_record.payload.write_back_status);
        if(runs.length){
          bodyHtml+='<div style="margin-top:8px;font-weight:600">Validator Runs ('+runs.length+')</div>';
          for(var vi=0;vi<runs.length;vi++){
            var vr=runs[vi].payload;
            var vcolor=vr.hard_fail?'var(--red-text)':vr.passed?'var(--green-text)':'var(--amber-text)';
            bodyHtml+='<div style="padding:3px 0;font-size:12px;color:'+vcolor+'">&bull; '+esc(vr.validator_name||vr.validator_id||'validator')+': '+(vr.hard_fail?'HARD FAIL':vr.passed?'PASS':'WARN')+'</div>';
          }
        }
        if(state==='FINALIZED'){
          setHtml('validate-status',tag('green','FINALIZED'));
          $('validate-result').innerHTML = resultCard('ok','Build finalized',bodyHtml,r.data);
          updateStepState(5,'done');
          updateBuildBar(activeBuildId, activeFeatureId, tag('green','FINALIZED'));
        } else {
          setHtml('validate-status',tag('red',state));
          $('validate-result').innerHTML = resultCard('err','Validation did not finalize',bodyHtml,r.data);
          updateStepState(5,'error');
          updateBuildBar(activeBuildId, activeFeatureId, tag('red',state));
        }
      } else {
        setHtml('validate-status','<span style="color:var(--red-text)">'+esc(r.data.message||r.data.error||'Failed')+'</span>');
        $('validate-result').innerHTML = resultCard('err','Run validators failed','<p>'+esc(r.data.message||r.data.error||'Unknown')+'</p>',r.data);
        updateStepState(5,'error');
      }
    } catch(e){ setHtml('validate-status','<span style="color:var(--red-text)">'+esc(e.message)+'</span>'); updateStepState(5,'error'); }
    $('btn-run-validators').disabled=false;
  };

  /* ── Replay ── */
  window.doReplay = async function(){
    var bid=$('replay-build-id').value.trim()||activeBuildId;
    if(!bid){setHtml('replay-status','<span style="color:var(--red-text)">Enter a build ID.</span>');return;}
    setHtml('replay-status',spinMsg('Loading...'));
    $('replay-result').innerHTML='';
    try {
      var r = await apiGet('/api/builds/'+bid+'/replay');
      if(r.ok){
        setHtml('replay-status','Loaded replay for '+esc(bid));
        var bodyHtml='';
        if(r.data.build) bodyHtml+=kvRow('Status',r.data.build.payload?r.data.build.payload.status:'—');
        if(r.data.bridge) bodyHtml+=kvRow('Bridge',r.data.bridge.payload?r.data.bridge.payload.bridge_id:'—');
        if(r.data.request) bodyHtml+=kvRow('Feature',r.data.request.payload?r.data.request.payload.feature_id:'—');
        if(r.data.diff_records&&r.data.diff_records.length) bodyHtml+=kvRow('Diffs',r.data.diff_records.length);
        if(r.data.test_runs&&r.data.test_runs.length) bodyHtml+=kvRow('Test Runs',r.data.test_runs.length);
        if(r.data.validator_runs&&r.data.validator_runs.length) bodyHtml+=kvRow('Validator Runs',r.data.validator_runs.length);
        $('replay-result').innerHTML = resultCard('ok','Build '+esc(bid),bodyHtml,r.data);
      } else {
        setHtml('replay-status','');
        $('replay-result').innerHTML = resultCard('err','Replay failed','<p>'+esc(r.data.message||r.data.error||'Unknown')+'</p>',r.data);
      }
    } catch(e){ setHtml('replay-status','<span style="color:var(--red-text)">'+esc(e.message)+'</span>'); }
  };

  /* ── Attention Queue ── */
  window.doRefreshAttention = async function(){
    var el=$('attention-content');
    try {
      var r = await apiGet('/api/attention-queue');
      if(!r.ok){el.innerHTML=resultCard('err','Failed to load','<p>'+esc(JSON.stringify(r.data))+'</p>');return;}
      var d=r.data;
      var h='';
      h+='<div class="attn-section"><h3>Blocked Builds ('+d.blocked_builds.length+')</h3>';
      if(d.blocked_builds.length){h+='<ul class="attn-list">';for(var i=0;i<d.blocked_builds.length;i++){h+='<li><span class="dot" style="background:var(--amber)"></span>'+esc(d.blocked_builds[i].artifact_id||d.blocked_builds[i].build_id||JSON.stringify(d.blocked_builds[i]))+'</li>';}h+='</ul>';}else{h+='<div class="attn-empty">None</div>';}h+='</div>';

      h+='<div class="attn-section"><h3>Pending Escalations ('+d.pending_escalations.length+')</h3>';
      if(d.pending_escalations.length){h+='<ul class="attn-list">';for(var i=0;i<d.pending_escalations.length;i++){h+='<li><span class="dot" style="background:var(--red)"></span>'+esc(d.pending_escalations[i].artifact_id||d.pending_escalations[i].escalation_record_id||JSON.stringify(d.pending_escalations[i]))+'</li>';}h+='</ul>';}else{h+='<div class="attn-empty">None</div>';}h+='</div>';

      h+='<div class="attn-section"><h3>Restricted Write-Backs ('+d.verified_restricted_write_backs.length+')</h3>';
      if(d.verified_restricted_write_backs.length){h+='<ul class="attn-list">';for(var i=0;i<d.verified_restricted_write_backs.length;i++){h+='<li><span class="dot" style="background:var(--amber)"></span>'+esc(JSON.stringify(d.verified_restricted_write_backs[i]))+'</li>';}h+='</ul>';}else{h+='<div class="attn-empty">None</div>';}h+='</div>';

      h+='<div class="attn-section"><h3>Stale Bridges ('+d.stale_bridges.length+')</h3>';
      if(d.stale_bridges.length){h+='<ul class="attn-list">';for(var i=0;i<d.stale_bridges.length;i++){h+='<li><span class="dot" style="background:var(--text3)"></span>'+esc(JSON.stringify(d.stale_bridges[i]))+'</li>';}h+='</ul>';}else{h+='<div class="attn-empty">None</div>';}h+='</div>';

      el.innerHTML=h;
      // Update topbar stats
      $('stat-esc').textContent=d.pending_escalations.length;
      var blkEl=$('stat-blk');blkEl.textContent=d.blocked_builds.length;blkEl.className=d.blocked_builds.length>0?'warn':'';
      $('stat-wb').textContent=d.verified_restricted_write_backs.length;
      $('stat-stale').textContent=d.stale_bridges.length;
      // Update banner
      var total=d.pending_escalations.length+d.blocked_builds.length+d.verified_restricted_write_backs.length+d.stale_bridges.length;
      var banner=$('attention-banner');
      if(total>0){banner.classList.remove('hidden');$('attention-banner-text').textContent=total+' item'+(total!==1?'s':'')+' need'+(total===1?'s':'')+' attention';}else{banner.classList.add('hidden');}
    } catch(e){ el.innerHTML=resultCard('err','Network error','<p>'+esc(e.message)+'</p>'); }
  };

  /* ── Boot ── */
  refreshHealth();
  doRefreshAttention();
})();
</script>
<script>
${(0, office_renderer_1.officeRendererScript)()}
</script>
<script>
${(0, agent_pipeline_view_1.extendedPanelScripts)()}
</script>
</body>
</html>`;
}
class OperatorHttpServer {
    constructor(runtime, dependencies = {}) {
        this.runtime = runtime;
        this.dependencies = dependencies;
        this.server = null;
        this.agentTracker = new agent_pipeline_view_1.AgentActivityTracker();
    }
    async start(options = {}) {
        if (this.server) {
            const address = this.server.address();
            if (address && typeof address !== "string") {
                return {
                    host: address.address,
                    port: address.port,
                    url: `http://${address.address}:${address.port}`,
                };
            }
        }
        this.server = (0, node_http_1.createServer)((request, response) => {
            void this.handleRequest(request, response);
        });
        const host = options.host ?? "127.0.0.1";
        const port = options.port ?? 0;
        await new Promise((resolve, reject) => {
            this.server.once("error", reject);
            this.server.listen(port, host, () => {
                this.server.off("error", reject);
                resolve();
            });
        });
        const address = this.server.address();
        if (!address || typeof address === "string") {
            throw new Error("Operator HTTP server failed to bind to a TCP port.");
        }
        return {
            host: address.address,
            port: address.port,
            url: `http://${address.address}:${address.port}`,
        };
    }
    async stop() {
        if (!this.server) {
            return;
        }
        await new Promise((resolve, reject) => {
            this.server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        this.server = null;
    }
    async handleRequest(request, response) {
        try {
            const url = new URL(request.url ?? "/", "http://127.0.0.1");
            const method = request.method ?? "GET";
            const path = url.pathname;
            if (method === "POST" && path === "/api/builds/prepare") {
                const payload = await readJsonBody(request);
                json(response, 201, await this.runtime.prepareBuild(payload));
                return;
            }
            if (method === "POST" && path === "/api/build-programs/run") {
                const payload = await readJsonBody(request);
                json(response, 200, await (0, bootstrap_1.runBuildProgramWorkflow)(this.runtime, this.requireBuilderConfig(), payload));
                return;
            }
            if (method === "GET" && path === "/api/health") {
                json(response, 200, await this.runtime.health());
                return;
            }
            if (method === "GET" && path === "/api/agent-status") {
                json(response, 200, this.agentTracker.getStatus());
                return;
            }
            if (method === "POST" && path === "/api/agent-status/update") {
                const payload = await readJsonBody(request);
                if (payload.agent_id) {
                    this.agentTracker.update(payload.agent_id, {
                        state: payload.state || undefined,
                        current_task: payload.current_task,
                        feature_id: payload.feature_id,
                        last_result: payload.last_result || undefined,
                    });
                }
                if (payload.phase)
                    this.agentTracker.setPhase(payload.phase);
                if (payload.app_id)
                    this.agentTracker.setApp(payload.app_id);
                if (payload.feature_id)
                    this.agentTracker.setFeature(payload.feature_id);
                if (payload.total_features !== undefined) {
                    this.agentTracker.setTotals(payload.total_features, payload.completed_features ?? 0, payload.failed_features ?? 0, payload.blocked_features ?? 0);
                }
                if (!this.agentTracker.getStatus().started_at)
                    this.agentTracker.start();
                json(response, 200, { ok: true });
                return;
            }
            if (method === "POST" && path === "/api/agent-status/reset") {
                this.agentTracker.resetAll();
                json(response, 200, { ok: true });
                return;
            }
            if (method === "GET" && path === "/api/attention-queue") {
                const currentGraphTruthHash = url.searchParams.get("graph_truth_hash") ?? undefined;
                json(response, 200, await this.runtime.attentionQueue({
                    current_graph_truth_hash: currentGraphTruthHash,
                }));
                return;
            }
            if (method === "GET" && path === "/api/governance/pending") {
                json(response, 200, await this.runtime.services.governance_gateway.pendingDecisionQueue());
                return;
            }
            const buildReplayMatch = path.match(/^\/api\/builds\/([^/]+)\/replay$/);
            if (method === "GET" && buildReplayMatch) {
                json(response, 200, await this.runtime.buildReplay(buildReplayMatch[1]));
                return;
            }
            const runBuilderMatch = path.match(/^\/api\/builds\/([^/]+)\/run-builder$/);
            if (method === "POST" && runBuilderMatch) {
                const payload = normalizeRunBuilderWorkflowOptions(await readJsonBody(request));
                const buildId = runBuilderMatch[1];
                const result = await (0, bootstrap_1.runConfiguredBuilderWorkflow)(this.runtime, buildId, this.requireBuilderConfig(), payload);
                let aborted_build = null;
                if (result.completed && result.completed.status !== "EXITED") {
                    aborted_build = await this.runtime.abortBuilderExecution(buildId);
                }
                json(response, payload.wait_for_completion ? 200 : 202, {
                    build_id: buildId,
                    builder: this.dependencies.builder,
                    ...result,
                    aborted_build,
                });
                return;
            }
            const abortBuilderMatch = path.match(/^\/api\/builds\/([^/]+)\/abort-builder$/);
            if (method === "POST" && abortBuilderMatch) {
                const buildId = abortBuilderMatch[1];
                json(response, 200, {
                    build_id: buildId,
                    aborted: await this.runtime.abortBuilderExecution(buildId),
                });
                return;
            }
            const recordDiffMatch = path.match(/^\/api\/builds\/([^/]+)\/record-diff$/);
            if (method === "POST" && recordDiffMatch) {
                const buildId = recordDiffMatch[1];
                const payload = await readJsonBody(request);
                json(response, 200, {
                    build_id: buildId,
                    capture: await this.runtime.recordBuilderArtifacts({
                        build_id: buildId,
                        ...payload,
                    }),
                });
                return;
            }
            const recordTestRunMatch = path.match(/^\/api\/builds\/([^/]+)\/record-test-run$/);
            if (method === "POST" && recordTestRunMatch) {
                const buildId = recordTestRunMatch[1];
                const payload = await readJsonBody(request);
                json(response, 200, {
                    build_id: buildId,
                    test_run: await this.runtime.recordTestRun({
                        build_id: buildId,
                        ...payload,
                    }),
                });
                return;
            }
            const runValidatorsMatch = path.match(/^\/api\/builds\/([^/]+)\/run-validators$/);
            if (method === "POST" && runValidatorsMatch) {
                const buildId = runValidatorsMatch[1];
                json(response, 200, {
                    build_id: buildId,
                    validation: await this.runtime.runValidators(buildId),
                });
                return;
            }
            const featureAuditMatch = path.match(/^\/api\/features\/([^/]+)\/audit$/);
            if (method === "GET" && featureAuditMatch) {
                json(response, 200, await this.runtime.featureAudit(featureAuditMatch[1]));
                return;
            }
            const escalationMatch = path.match(/^\/api\/governance\/escalations\/([^/]+)$/);
            if (method === "GET" && escalationMatch) {
                json(response, 200, await this.runtime.services.governance_gateway.decisionContext(escalationMatch[1]));
                return;
            }
            const escalationDecisionMatch = path.match(/^\/api\/governance\/escalations\/([^/]+)\/(approve|reject|defer)$/);
            if (method === "POST" && escalationDecisionMatch) {
                const payload = await readJsonBody(request);
                const escalationRecordId = escalationDecisionMatch[1];
                const action = escalationDecisionMatch[2];
                if (action === "approve") {
                    json(response, 200, await this.runtime.services.governance_gateway.approveEscalation({
                        escalation_record_id: escalationRecordId,
                        decided_by: payload.decided_by,
                        rationale: payload.rationale,
                        approved_scope_paths: payload.approved_scope_paths,
                        artifact_refs: payload.artifact_refs,
                    }));
                    return;
                }
                if (action === "reject") {
                    json(response, 200, await this.runtime.services.governance_gateway.rejectEscalation({
                        escalation_record_id: escalationRecordId,
                        decided_by: payload.decided_by,
                        rationale: payload.rationale,
                        artifact_refs: payload.artifact_refs,
                    }));
                    return;
                }
                json(response, 200, await this.runtime.services.governance_gateway.deferEscalation({
                    escalation_record_id: escalationRecordId,
                    decided_by: payload.decided_by,
                    rationale: payload.rationale,
                    artifact_refs: payload.artifact_refs,
                }));
                return;
            }
            if (method === "GET" && path === "/") {
                const attentionQueue = await this.runtime.attentionQueue();
                html(response, 200, dashboardHtml("", {
                    pending_escalations: attentionQueue.pending_escalations.length,
                    blocked_builds: attentionQueue.blocked_builds.length,
                    verified_restricted_write_backs: attentionQueue.verified_restricted_write_backs.length,
                    stale_bridges: attentionQueue.stale_bridges.length,
                }));
                return;
            }
            // ── App Pipeline Routes ───────────────────────────────────────────────
            if (method === "POST" && path === "/api/app/intake") {
                const payload = await readJsonBody(request);
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const result = await intake.submitApp(payload);
                json(response, 201, result);
                return;
            }
            const appResearchMatch = path.match(/^\/api\/app\/([^/]+)\/research$/);
            if (method === "POST" && appResearchMatch) {
                const appId = appResearchMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                const payload = await readJsonBody(request);
                const researchService = new app_research_1.AppResearchService(this.runtime.registry, this.runtime.services.research_gateway);
                const result = await researchService.research({
                    app_id: appId,
                    app_summary: appRecord.payload.summary,
                    research_content: payload.research_content,
                    source: payload.source ?? "perplexity",
                });
                json(response, 200, result);
                return;
            }
            const appDecomposeMatch = path.match(/^\/api\/app\/([^/]+)\/decompose$/);
            if (method === "POST" && appDecomposeMatch) {
                const appId = appDecomposeMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                const payload = await readJsonBody(request);
                const decomposer = new app_decomposer_1.AppDecomposer();
                const result = decomposer.decompose({
                    app: appRecord.payload,
                    candidate_features: payload.candidate_features,
                    research_summary: payload.research_summary,
                });
                // Store feature specs in registry
                for (const f of result.features) {
                    await this.runtime.registry.write("feature_spec", f);
                }
                // Update app with feature IDs
                await intake.updateApp(appId, {
                    feature_ids: result.features.map((f) => f.feature_id),
                });
                // Transition to CANDIDATE
                await intake.updateAppStatus(appId, "CANDIDATE");
                json(response, 200, result);
                return;
            }
            // ── Operator Checklist Route ─────────────────────────────────────────
            // Accepts research content via POST and returns the operator-facing
            // checklist (manual steps, pitfalls, security) parsed from it.
            // This is a stateless parse — it does not store anything.
            const appChecklistMatch = path.match(/^\/api\/app\/([^/]+)\/operator-checklist$/);
            if (method === "POST" && appChecklistMatch) {
                const appId = appChecklistMatch[1];
                const payload = await readJsonBody(request);
                const { parseResearchSummary } = await Promise.resolve().then(() => __importStar(require("../research/app-research")));
                const summary = parseResearchSummary(payload.research_content);
                const checklist = summary.operator_manual_steps;
                const security = summary.security;
                // Collect operator-facing pitfalls (not claude-only)
                const allPitfalls = [
                    ...summary.pitfalls.frontend_pitfalls,
                    ...summary.pitfalls.backend_pitfalls,
                    ...summary.pitfalls.deployment_pitfalls,
                    ...summary.pitfalls.integration_pitfalls,
                    ...summary.pitfalls.data_pitfalls,
                ];
                const pitfalls = allPitfalls.filter((p) => p.who_fixes_it !== "claude");
                // Count total manual steps
                const totalSteps = checklist.account_setup.length +
                    checklist.env_configuration.length +
                    checklist.dns_and_domains.length +
                    checklist.third_party_dashboards.length +
                    checklist.compliance_steps.length +
                    checklist.monitoring_setup.length +
                    checklist.deployment_steps.length;
                json(response, 200, {
                    app_id: appId,
                    total_manual_steps: totalSteps,
                    total_operator_pitfalls: pitfalls.length,
                    total_security_items: security.frontend_security.length +
                        security.backend_security.length +
                        security.auth_pitfalls.length +
                        security.data_exposure_risks.length,
                    operator_manual_steps: checklist,
                    operator_pitfalls: pitfalls,
                    security_checklist: security,
                    message: totalSteps > 0
                        ? `${totalSteps} manual steps require your attention before or during the build.`
                        : "No operator manual steps found in the research content. Ensure research includes operator_manual_steps.",
                });
                return;
            }
            const appVerifyMatch = path.match(/^\/api\/app\/([^/]+)\/verify$/);
            if (method === "POST" && appVerifyMatch) {
                const appId = appVerifyMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                const payload = await readJsonBody(request);
                // Load features
                const features = [];
                for (const fid of appRecord.payload.feature_ids) {
                    const fRecord = await this.runtime.registry.read("feature_spec", fid);
                    features.push(fRecord.payload);
                }
                const verifier = new spec_verifier_1.SpecVerifier(this.runtime.registry, this.runtime.services.research_gateway);
                const result = await verifier.verify({
                    app: appRecord.payload,
                    features,
                    verification_content: payload.verification_content,
                    source: payload.source,
                });
                // Transition to VERIFIED
                await intake.updateAppStatus(appId, "VERIFIED");
                json(response, 200, result);
                return;
            }
            const appPromoteMatch = path.match(/^\/api\/app\/([^/]+)\/promote$/);
            if (method === "POST" && appPromoteMatch) {
                const appId = appPromoteMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                // Load features
                const features = [];
                for (const fid of appRecord.payload.feature_ids) {
                    const fRecord = await this.runtime.registry.read("feature_spec", fid);
                    features.push(fRecord.payload);
                }
                // Load verification report if available
                const payload = await readJsonBody(request);
                const evaluation = (0, promotion_engine_1.evaluatePromotion)(appRecord.payload, features, payload.verification_report);
                // Store evaluation
                await this.runtime.registry.write("promotion_evaluation", evaluation);
                // Update app status based on decision
                if (evaluation.decision === "PROMOTED") {
                    await intake.updateAppStatus(appId, "PROMOTED");
                    // Update all features to PROMOTED
                    for (const f of features) {
                        await this.runtime.registry.write("feature_spec", {
                            ...f,
                            promotion_status: "PROMOTED",
                            updated_at: new Date().toISOString(),
                        });
                    }
                }
                else if (evaluation.decision === "BLOCKED") {
                    await intake.updateAppStatus(appId, "BLOCKED");
                }
                else {
                    await intake.updateAppStatus(appId, "REJECTED");
                }
                json(response, 200, evaluation);
                return;
            }
            const appSeedMatch = path.match(/^\/api\/app\/([^/]+)\/seed$/);
            if (method === "POST" && appSeedMatch) {
                const appId = appSeedMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                // Load promoted features
                const features = [];
                for (const fid of appRecord.payload.feature_ids) {
                    const fRecord = await this.runtime.registry.read("feature_spec", fid);
                    features.push(fRecord.payload);
                }
                // Load latest evaluation
                const evalRecord = await this.runtime.registry.read("promotion_evaluation", appId);
                // Seed requires a Neo4j truth adapter with run() method
                // For now, return the plan without seeding if no graph executor is available
                json(response, 200, {
                    app_id: appId,
                    features: features.map((f) => ({
                        feature_id: f.feature_id,
                        name: f.name,
                        feature_type: f.feature_type,
                        dependencies: f.dependencies,
                        promotion_status: f.promotion_status,
                    })),
                    evaluation_decision: evalRecord.payload.decision,
                    message: "Features ready for graph seeding. Use build-program to execute.",
                });
                return;
            }
            const appBuildProgramMatch = path.match(/^\/api\/app\/([^/]+)\/build-program$/);
            if (method === "POST" && appBuildProgramMatch) {
                const appId = appBuildProgramMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                const payload = await readJsonBody(request);
                // Load features
                const features = [];
                for (const fid of appRecord.payload.feature_ids) {
                    const fRecord = await this.runtime.registry.read("feature_spec", fid);
                    features.push(fRecord.payload);
                }
                // Generate build program
                const buildProgram = (0, build_program_generator_1.generateBuildProgram)({
                    app: appRecord.payload,
                    features,
                    requested_by: payload.requested_by ?? "operator",
                    builder_timeout_ms: payload.builder_timeout_ms,
                    stop_on_failure: payload.stop_on_failure,
                });
                // Run it through the existing back half
                const result = await (0, bootstrap_1.runBuildProgramWorkflow)(this.runtime, this.requireBuilderConfig(), buildProgram);
                json(response, 200, result);
                return;
            }
            const appStatusMatch = path.match(/^\/api\/app\/([^/]+)\/status$/);
            if (method === "GET" && appStatusMatch) {
                const appId = appStatusMatch[1];
                const intake = new app_intake_1.AppIntakeService(this.runtime.registry);
                const appRecord = await intake.getApp(appId);
                // Load features
                const features = [];
                for (const fid of appRecord.payload.feature_ids) {
                    try {
                        const fRecord = await this.runtime.registry.read("feature_spec", fid);
                        features.push(fRecord.payload);
                    }
                    catch {
                        // feature not yet decomposed
                    }
                }
                json(response, 200, {
                    app: appRecord.payload,
                    features: features.map((f) => ({
                        feature_id: f.feature_id,
                        name: f.name,
                        feature_type: f.feature_type,
                        dependencies: f.dependencies,
                        promotion_status: f.promotion_status,
                    })),
                });
                return;
            }
            // ── Static asset serving for sprite images ──
            if (method === "GET" && path.startsWith("/assets/")) {
                const assetPath = node_path_1.default.resolve(__dirname, "..", "..", "assets", decodeURIComponent(path.slice(8)));
                // Security: prevent directory traversal
                const assetsRoot = node_path_1.default.resolve(__dirname, "..", "..", "assets");
                if (!assetPath.startsWith(assetsRoot)) {
                    notFound(response);
                    return;
                }
                try {
                    const data = await node_fs_1.promises.readFile(assetPath);
                    const ext = node_path_1.default.extname(assetPath).toLowerCase();
                    const mimeTypes = {
                        ".png": "image/png",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".svg": "image/svg+xml",
                        ".gif": "image/gif",
                    };
                    response.statusCode = 200;
                    response.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
                    response.setHeader("Cache-Control", "public, max-age=3600");
                    response.end(data);
                    return;
                }
                catch {
                    notFound(response);
                    return;
                }
            }
            notFound(response);
        }
        catch (error) {
            if (error instanceof OperatorHttpRequestError) {
                json(response, error.status_code, {
                    error: error.error_code,
                    message: error.message,
                });
                return;
            }
            json(response, 500, {
                error: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }
    requireBuilderConfig() {
        if (!this.dependencies.builder) {
            throw new OperatorHttpRequestError(503, "BUILDER_NOT_CONFIGURED", "Operator server does not have a builder launch configuration.");
        }
        return this.dependencies.builder;
    }
}
exports.OperatorHttpServer = OperatorHttpServer;
function normalizeRunBuilderWorkflowOptions(payload) {
    if (payload.timeout_ms !== undefined &&
        (!Number.isFinite(payload.timeout_ms) || payload.timeout_ms <= 0)) {
        throw new OperatorHttpRequestError(400, "INVALID_TIMEOUT", "timeout_ms must be a positive number when provided.");
    }
    return {
        wait_for_completion: payload.wait_for_completion === true,
        timeout_ms: payload.timeout_ms,
    };
}
//# sourceMappingURL=operator-http-server.js.map