/**
 * AES Operator UI — 2D Animated Agent Pipeline View + Extended Panels
 *
 * Renders a live SVG-based visualization of all 25 agents showing:
 *   - Current state (idle/running/done/failed/blocked/waiting)
 *   - What each agent is working on
 *   - Data flow between agents (animated connections)
 *   - Duration timers
 *   - Feature plan, promotion state, dependency order, governance results
 *
 * This is server-rendered HTML + inline JS/CSS.
 * Polls /api/agent-status every 500ms for live updates.
 */

// ─── Agent Activity Tracker (Server-Side) ────────────────────────────────────

export type AgentState = "idle" | "running" | "done" | "failed" | "blocked" | "waiting";

export interface AgentStatus {
  agent_id: string;
  name: string;
  group: "intake" | "observer" | "story" | "decomposer" | "retriever" | "arbiter" | "promoter" | "strategy" | "bridge" | "builder" | "verifier" | "validator" | "writeback" | "governance";
  state: AgentState;
  current_task?: string;
  feature_id?: string;
  started_at?: string;
  duration_ms?: number;
  last_result?: "pass" | "fail" | "skip" | null;
  progress?: number; // 0-100
}

export interface PipelineStatus {
  agents: AgentStatus[];
  active_app_id?: string;
  active_feature_id?: string;
  total_features: number;
  completed_features: number;
  failed_features: number;
  blocked_features: number;
  current_phase: string;
  started_at?: string;
  elapsed_ms: number;
}

export class AgentActivityTracker {
  private agents: Map<string, AgentStatus> = new Map();
  private appId?: string;
  private featureId?: string;
  private totalFeatures = 0;
  private completedFeatures = 0;
  private failedFeatures = 0;
  private blockedFeatures = 0;
  private currentPhase = "idle";
  private startedAt?: string;

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    const agentDefs: Array<Pick<AgentStatus, "agent_id" | "name" | "group">> = [
      { agent_id: "intake", name: "Intake", group: "intake" },
      { agent_id: "obs-research", name: "Product Research", group: "observer" },
      { agent_id: "obs-donor", name: "Donor Patterns", group: "observer" },
      { agent_id: "obs-metrics", name: "Failure Metrics", group: "observer" },
      { agent_id: "obs-api", name: "API Integration", group: "observer" },
      { agent_id: "obs-ui", name: "UI Surfaces", group: "observer" },
      { agent_id: "story-gen", name: "Story Generator", group: "story" },
      { agent_id: "decomposer", name: "Decomposer", group: "decomposer" },
      { agent_id: "ret-deps", name: "Dependencies", group: "retriever" },
      { agent_id: "ret-temporal", name: "Temporal", group: "retriever" },
      { agent_id: "ret-conflict", name: "Conflicts", group: "retriever" },
      { agent_id: "ret-rules", name: "Rule Matcher", group: "retriever" },
      { agent_id: "arb-complete", name: "Completeness", group: "arbiter" },
      { agent_id: "arb-contradict", name: "Contradiction", group: "arbiter" },
      { agent_id: "promoter", name: "Promotion", group: "promoter" },
      { agent_id: "strategy", name: "Strategy", group: "strategy" },
      { agent_id: "bridge", name: "Bridge Compiler", group: "bridge" },
      { agent_id: "builder", name: "Claude Builder", group: "builder" },
      { agent_id: "verify-p1", name: "Verify Pass 1", group: "verifier" },
      { agent_id: "verify-p2", name: "Verify Pass 2", group: "verifier" },
      { agent_id: "verify-final", name: "Verify Final", group: "verifier" },
      { agent_id: "validator", name: "Validators", group: "validator" },
      { agent_id: "writeback", name: "Write-Back", group: "writeback" },
      { agent_id: "gov-loop", name: "Governance", group: "governance" },
    ];

    for (const def of agentDefs) {
      this.agents.set(def.agent_id, {
        ...def,
        state: "idle",
        last_result: null,
      });
    }
  }

  update(agentId: string, updates: Partial<AgentStatus>) {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, updates);
      if (updates.state === "running" && !agent.started_at) {
        agent.started_at = new Date().toISOString();
      }
      if (updates.state === "done" || updates.state === "failed") {
        if (agent.started_at) {
          agent.duration_ms = Date.now() - new Date(agent.started_at).getTime();
        }
      }
    }
  }

  setPhase(phase: string) { this.currentPhase = phase; }
  setApp(appId: string) { this.appId = appId; }
  setFeature(featureId: string) { this.featureId = featureId; }
  setTotals(total: number, completed: number, failed: number, blocked: number) {
    this.totalFeatures = total;
    this.completedFeatures = completed;
    this.failedFeatures = failed;
    this.blockedFeatures = blocked;
  }
  start() { this.startedAt = new Date().toISOString(); }

  resetAll() {
    for (const agent of this.agents.values()) {
      agent.state = "idle";
      agent.current_task = undefined;
      agent.feature_id = undefined;
      agent.started_at = undefined;
      agent.duration_ms = undefined;
      agent.last_result = null;
      agent.progress = undefined;
    }
    this.currentPhase = "idle";
  }

  getStatus(): PipelineStatus {
    return {
      agents: Array.from(this.agents.values()),
      active_app_id: this.appId,
      active_feature_id: this.featureId,
      total_features: this.totalFeatures,
      completed_features: this.completedFeatures,
      failed_features: this.failedFeatures,
      blocked_features: this.blockedFeatures,
      current_phase: this.currentPhase,
      started_at: this.startedAt,
      elapsed_ms: this.startedAt ? Date.now() - new Date(this.startedAt).getTime() : 0,
    };
  }
}

// ─── Extended Dashboard HTML ─────────────────────────────────────────────────

export function extendedPanelsHtml(): string {
  return `
<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!--  AES Extended Panels — Feature Plan, Promotion, Dependencies, Governance  -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->

<!-- ── Panel: Live Agent View ── -->
<div class="panel" id="panel-agents">
  <div class="panel-title">Live Agent Pipeline</div>
  <div class="panel-desc">Real-time view of all 24 agents and their current state.</div>
  <div id="agent-pipeline-container" style="position:relative;width:100%;overflow-x:auto;padding:1rem 0">
    <canvas id="pipeline-canvas" width="1020" height="570" style="display:block;margin:0 auto;border-radius:8px;background:#0e0e14;width:100%;max-width:1020px;height:auto"></canvas>
  </div>
  <div id="agent-detail-tooltip" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;font-size:12px;z-index:100;pointer-events:none;max-width:280px"></div>
</div>

<!-- ── Panel: Feature Plan ── -->
<div class="panel" id="panel-features">
  <div class="panel-title">Feature Plan</div>
  <div class="panel-desc">Derived feature breakdown from app decomposition. Shows all features, dependencies, and build order.</div>
  <div class="actions" style="margin-top:0">
    <button class="btn btn-ghost btn-sm" onclick="doLoadFeatures()">Load Features</button>
    <input id="features-app-id" placeholder="App ID" style="width:200px;margin-left:8px" />
  </div>
  <div id="features-content" style="margin-top:1rem"></div>
</div>

<!-- ── Panel: Promotion State ── -->
<div class="panel" id="panel-promotion">
  <div class="panel-title">Promotion State</div>
  <div class="panel-desc">Current promotion status of all features. Shows which features are CANDIDATE, VERIFIED, CANONICAL, or BLOCKED.</div>
  <div class="actions" style="margin-top:0">
    <button class="btn btn-ghost btn-sm" onclick="doLoadPromotion()">Refresh</button>
  </div>
  <div id="promotion-content" style="margin-top:1rem"></div>
</div>

<!-- ── Panel: Dependency Graph ── -->
<div class="panel" id="panel-deps">
  <div class="panel-title">Dependency Order</div>
  <div class="panel-desc">Build execution order based on feature dependencies. Shows what builds first and what's waiting.</div>
  <div id="deps-content" style="margin-top:1rem">
    <canvas id="deps-canvas" width="1200" height="500" style="display:block;margin:0 auto;border-radius:8px;background:#0a0a0c"></canvas>
  </div>
</div>

<!-- ── Panel: Build Progression ── -->
<div class="panel" id="panel-progress">
  <div class="panel-title">Build Progression</div>
  <div class="panel-desc">Live tracking of multi-feature build execution. Shows completed, running, blocked, and pending features.</div>
  <div id="progress-content" style="margin-top:1rem"></div>
</div>

<!-- ── Panel: Verification Results ── -->
<div class="panel" id="panel-verification">
  <div class="panel-title">Verification Results</div>
  <div class="panel-desc">Multi-pass verification checks: typecheck, test, lint. Shows per-check pass/fail with failure classification.</div>
  <div class="actions" style="margin-top:0">
    <button class="btn btn-ghost btn-sm" onclick="doLoadVerification()">Load Latest</button>
    <input id="verification-build-id" placeholder="Build ID" style="width:200px;margin-left:8px" />
  </div>
  <div id="verification-content" style="margin-top:1rem"></div>
</div>

<!-- ── Panel: Governance Training ── -->
<div class="panel" id="panel-governance">
  <div class="panel-title">Governance Training</div>
  <div class="panel-desc">Automated governance improvement loop. Shows proposed config changes, replay scores, and ranked candidates.</div>
  <div class="actions" style="margin-top:0">
    <button class="btn btn-ghost btn-sm" onclick="doLoadGovernance()">Refresh</button>
    <button class="btn btn-next btn-sm" onclick="doRunGovernanceLoop()" style="margin-left:8px">Run Training Loop</button>
  </div>
  <div id="governance-content" style="margin-top:1rem"></div>
</div>
`;
}

// ─── Pipeline Canvas Renderer (Client-Side JS) ──────────────────────────────

export function pipelineCanvasScript(): string {
  return `
/* ══════════════════════════════════════════════════════════════════════════════
   AES 2D Office — Animated Agent Pipeline with Sprites
   ══════════════════════════════════════════════════════════════════════════════ */

(function(){
  var canvas = document.getElementById('pipeline-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var pipelineData = null;
  var animFrame = 0;
  var particles = [];
  var spritesLoaded = false;

  /* ── Sprite Assets ── */
  var sprites = {};
  var SPRITE_MANIFEST = {
    floor:   '/assets/Props/Walls/Floors/Main Floor.png',
    desk:    '/assets/Props/Office/Desks/Desks Brown.png',
    screen:  '/assets/Props/Office/Desks/Props/PC Screen.png',
    keyboard:'/assets/Props/Office/Desks/Props/Keyboard.png',
    plant:   '/assets/Props/Plants/Plants.png',
    printer: '/assets/Props/Office/Printer.png',
    wall_h:  '/assets/Props/Walls/Walls/Wall 1.png',
    wall_top:'/assets/Props/Walls/Walls/Top of Walls1.png',
    door:    '/assets/Props/Walls/Doors/Glass Door.png',
    male1:   '/assets/Characters/Male/Male 1.png',
    male2:   '/assets/Characters/Male/Male 2.png',
    male3:   '/assets/Characters/Male/Male 3.png',
    male4:   '/assets/Characters/Male/Male 4.png',
    male5:   '/assets/Characters/Male/Male 5.png',
    male6:   '/assets/Characters/Male/Male 6.png',
    male7:   '/assets/Characters/Male/Male 7.png',
    female1: '/assets/Characters/Female/Female 1.png',
    female2: '/assets/Characters/Female/Female 2.png',
    female3: '/assets/Characters/Female/Female 3.png',
    female4: '/assets/Characters/Female/Female 4.png',
    bookshelf:'/assets/Props/Miscellaneous/Bookshelf.png',
    coffee:  '/assets/Props/Office/Desks/Props/Cup with Coffee.png',
    filecart:'/assets/Props/Office/File Cart.png',
  };
  var loadCount = 0;
  var totalSprites = Object.keys(SPRITE_MANIFEST).length;
  for (var key in SPRITE_MANIFEST) {
    (function(k){
      var img = new Image();
      img.onload = function(){ sprites[k]=img; loadCount++; if(loadCount>=totalSprites) spritesLoaded=true; };
      img.onerror = function(){ loadCount++; if(loadCount>=totalSprites) spritesLoaded=true; };
      img.src = SPRITE_MANIFEST[k];
    })(key);
  }

  /* ── Agent Character Assignments ── */
  var AGENT_SPRITES = {
    'intake':'male1', 'obs-research':'female1', 'obs-donor':'male2',
    'obs-metrics':'female2', 'obs-api':'male3', 'obs-ui':'female3',
    'story-gen':'male4', 'decomposer':'female4', 'ret-deps':'male5',
    'ret-temporal':'male6', 'ret-conflict':'female1', 'ret-rules':'male7',
    'arb-complete':'female2', 'arb-contradict':'male1', 'promoter':'female3',
    'strategy':'male2', 'bridge':'male3', 'builder':'male4',
    'verify-p1':'female4', 'verify-p2':'male5', 'verify-final':'female1',
    'validator':'male6', 'writeback':'male7', 'gov-loop':'female2',
  };

  /* ── Office Room Layout — Two-row flow, left to right ── */
  /* Row 1 (y:70): Intake → Research → Stories → Planning → Bridge → Build Lab → QA Lab */
  /* Row 2 (y:500): Retrieval → Arbitration → Promotion → Strategy → Validation → Write-Back → Governance */
  var ROOMS = [
    // Row 1 — Discovery & Build
    { id:'intake',   label:'INTAKE',       x:30,   y:80,  w:140, h:140, agents:['intake'], color:'#1a1a2e' },
    { id:'research', label:'RESEARCH LAB', x:200,  y:80,  w:300, h:220, agents:['obs-research','obs-donor','obs-metrics','obs-api','obs-ui'], color:'#1a2a1e' },
    { id:'story',    label:'STORIES',      x:530,  y:80,  w:140, h:140, agents:['story-gen'], color:'#2a1a2e' },
    { id:'plan',     label:'PLANNING',     x:700,  y:80,  w:140, h:140, agents:['decomposer'], color:'#1a1a2e' },
    { id:'bridge',   label:'BRIDGE',       x:870,  y:80,  w:140, h:140, agents:['bridge'], color:'#1a1e2e' },
    { id:'build',    label:'BUILD LAB',    x:1040, y:80,  w:170, h:180, agents:['builder'], color:'#0a1a0a' },
    { id:'verify',   label:'QA LAB',       x:1240, y:80,  w:200, h:220, agents:['verify-p1','verify-p2','verify-final'], color:'#1a0a1a' },
    // Row 2 — Governance & Output
    { id:'retrieve', label:'RETRIEVAL',    x:30,   y:500, w:260, h:200, agents:['ret-deps','ret-temporal','ret-conflict','ret-rules'], color:'#1e2a1a' },
    { id:'arbitrate',label:'ARBITRATION',  x:320,  y:500, w:180, h:160, agents:['arb-complete','arb-contradict'], color:'#2e1a1a' },
    { id:'promote',  label:'PROMOTION',    x:530,  y:500, w:140, h:140, agents:['promoter'], color:'#1a2a2e' },
    { id:'strategy', label:'STRATEGY',     x:700,  y:500, w:140, h:140, agents:['strategy'], color:'#2a2a1a' },
    { id:'validate', label:'VALIDATION',   x:870,  y:500, w:140, h:140, agents:['validator'], color:'#1e1a2e' },
    { id:'writeback',label:'WRITE-BACK',   x:1040, y:500, w:170, h:140, agents:['writeback'], color:'#1a2e1a' },
    { id:'govern',   label:'GOVERNANCE',   x:1240, y:500, w:200, h:160, agents:['gov-loop'], color:'#2e2a1a' },
  ];

  var CONNECTIONS = [
    ['intake','research'],['research','story'],['story','plan'],
    ['plan','retrieve'],['retrieve','arbitrate'],['arbitrate','promote'],
    ['promote','strategy'],['strategy','bridge'],['bridge','build'],
    ['build','verify'],['verify','validate'],['validate','writeback'],
    ['validate','govern'],
  ];

  var STATE_COLORS = {
    idle:'#3f3f46', running:'#10b981', done:'#22d3ee',
    failed:'#ef4444', blocked:'#f59e0b', waiting:'#8b5cf6'
  };

  /* ── Connections ── */
  var CONNECTIONS = [
    ['intake','observer'],['observer','story'],['story','decomposer'],
    ['decomposer','retriever'],['retriever','arbiter'],['arbiter','promoter'],
    ['promoter','strategy'],['strategy','bridge'],['bridge','builder'],
    ['builder','verifier'],['verifier','validator'],['validator','writeback'],
    ['validator','governance'],
  ];

  /* ── Colors ── */
  var STATE_COLORS = {
    idle:'#3f3f46', running:'#10b981', done:'#22d3ee',
    failed:'#ef4444', blocked:'#f59e0b', waiting:'#8b5cf6'
  };
  var STATE_GLOW = {
    idle:'transparent', running:'rgba(16,185,129,0.3)', done:'rgba(34,211,238,0.15)',
    failed:'rgba(239,68,68,0.3)', blocked:'rgba(245,158,11,0.2)', waiting:'rgba(139,92,246,0.2)'
  };

  /* ── Agent Node Positions (computed per agent within group) ── */
  function getAgentPos(agentId) {
    for (var g=0; g<GROUPS.length; g++) {
      var group = GROUPS[g];
      var idx = group.agents.indexOf(agentId);
      if (idx >= 0) {
        var count = group.agents.length;
        var spacing = 28;
        var startY = group.y - ((count-1) * spacing) / 2;
        return { x: group.x, y: startY + idx * spacing, group: group };
      }
    }
    return { x:0, y:0, group:null };
  }

  function getGroupCenter(groupId) {
    for (var g=0; g<GROUPS.length; g++) {
      if (GROUPS[g].id === groupId) return { x:GROUPS[g].x, y:GROUPS[g].y };
    }
    return {x:0,y:0};
  }

  /* ── Room center helper ── */
  function getRoomCenter(roomId) {
    for (var r=0; r<ROOMS.length; r++) {
      if (ROOMS[r].id === roomId) return { x: ROOMS[r].x + ROOMS[r].w/2, y: ROOMS[r].y + ROOMS[r].h/2 };
    }
    return {x:0,y:0};
  }

  /* ── Get agent position within its room ── */
  function getAgentRoomPos(agentId) {
    for (var r=0; r<ROOMS.length; r++) {
      var room = ROOMS[r];
      var idx = room.agents.indexOf(agentId);
      if (idx >= 0) {
        var count = room.agents.length;
        if (count === 1) {
          return { x: room.x + room.w/2, y: room.y + room.h/2 + 10, room: room };
        }
        var cols = count <= 2 ? 2 : count <= 4 ? 2 : 3;
        var rows = Math.ceil(count / cols);
        var row = Math.floor(idx / cols);
        var col = idx % cols;
        var padX = 40, padY = 45;
        var cellW = (room.w - padX*2) / Math.max(cols - 1, 1);
        var cellH = (room.h - padY - 40) / Math.max(rows - 1, 1);
        return {
          x: room.x + padX + col * cellW,
          y: room.y + padY + row * cellH + 10,
          room: room
        };
      }
    }
    return {x:0,y:0,room:null};
  }

  /* ── Particles ── */
  function spawnParticle(fromRoom, toRoom) {
    var from = getRoomCenter(fromRoom);
    var to = getRoomCenter(toRoom);
    particles.push({
      x:from.x, y:from.y, tx:to.x, ty:to.y,
      progress:0, speed:0.006 + Math.random()*0.006,
      size: 3 + Math.random()*2
    });
  }

  /* ── Draw character sprite ── */
  function drawCharacter(agentId, x, y, state, scale) {
    var spriteKey = AGENT_SPRITES[agentId] || 'male1';
    var img = sprites[spriteKey];
    if (!img) return;
    // Sprite sheet: 4 frames side by side (facing right, down, left, up)
    var frameW = img.width / 4;
    var frameH = img.height;
    // Pick frame based on state
    var frame = 0; // facing front
    if (state === 'running') frame = Math.floor(animFrame / 15) % 4; // animate
    var sw = frameW, sh = frameH;
    var sx = frame * frameW;
    var dw = sw * scale, dh = sh * scale;
    ctx.drawImage(img, sx, 0, sw, sh, x - dw/2, y - dh + 5, dw, dh);
  }

  /* ── Main Draw Loop ── */
  function draw() {
    ctx.clearRect(0,0,W,H);
    animFrame++;

    // Dark background
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0,0,W,H);

    // Title bar
    ctx.fillStyle = '#12121a';
    ctx.fillRect(0,0,W,48);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('AES OFFICE — LIVE AGENT VIEW', 16, 30);
    if (pipelineData) {
      ctx.fillStyle = '#10b981';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(
        pipelineData.current_phase.toUpperCase() + '  |  ' +
        pipelineData.completed_features + '/' + pipelineData.total_features + ' features  |  ' +
        Math.round(pipelineData.elapsed_ms/1000) + 's',
        W - 16, 30
      );
    }

    // Floor tiles
    if (sprites.floor) {
      var pat = ctx.createPattern(sprites.floor, 'repeat');
      if (pat) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 48, W, H-48);
        ctx.globalAlpha = 1;
      }
    }

    // Build agent map
    var agentMap = {};
    if (pipelineData) {
      for (var a=0; a<pipelineData.agents.length; a++) {
        agentMap[pipelineData.agents[a].agent_id] = pipelineData.agents[a];
      }
    }

    // Draw rooms
    for (var r=0; r<ROOMS.length; r++) {
      var room = ROOMS[r];
      // Room has any running agents?
      var roomActive = room.agents.some(function(aid){ var ag=agentMap[aid]; return ag && ag.state==='running'; });
      var roomDone = room.agents.every(function(aid){ var ag=agentMap[aid]; return ag && (ag.state==='done'); });
      var roomFailed = room.agents.some(function(aid){ var ag=agentMap[aid]; return ag && ag.state==='failed'; });

      // Room background
      ctx.fillStyle = room.color;
      ctx.globalAlpha = roomActive ? 0.9 : 0.5;
      ctx.fillRect(room.x, room.y, room.w, room.h);
      ctx.globalAlpha = 1;

      // Room border
      ctx.strokeStyle = roomActive ? '#10b981' : roomFailed ? '#ef4444' : roomDone ? '#22d3ee' : '#27272a';
      ctx.lineWidth = roomActive ? 2 : 1;
      ctx.strokeRect(room.x, room.y, room.w, room.h);

      // Active room glow
      if (roomActive) {
        var pulse = Math.sin(animFrame * 0.06) * 0.15 + 0.15;
        ctx.strokeStyle = 'rgba(16,185,129,' + pulse + ')';
        ctx.lineWidth = 4;
        ctx.strokeRect(room.x-2, room.y-2, room.w+4, room.h+4);
      }

      // Room label
      ctx.fillStyle = roomActive ? '#10b981' : '#52525b';
      ctx.font = (roomActive ? 'bold ' : '') + '9px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(room.label, room.x + 6, room.y + 14);

      // Done check on room
      if (roomDone) {
        ctx.fillStyle = '#22d3ee';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('✓', room.x + room.w - 6, room.y + 16);
      }
      if (roomFailed) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('✗', room.x + room.w - 6, room.y + 16);
      }
    }

    // Draw connections between rooms with arrows
    for (var c=0; c<CONNECTIONS.length; c++) {
      var from = getRoomCenter(CONNECTIONS[c][0]);
      var to = getRoomCenter(CONNECTIONS[c][1]);
      // Check if this connection crosses rows
      var crossRow = Math.abs(from.y - to.y) > 200;

      ctx.beginPath();
      if (crossRow) {
        // Draw an L-shaped connector for row transitions
        var midY = (from.y + to.y) / 2;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(from.x, midY);
        ctx.lineTo(to.x, midY);
        ctx.lineTo(to.x, to.y);
      } else {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.strokeStyle = '#252530';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6,4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head at destination
      var angle = Math.atan2(to.y - from.y, to.x - from.x);
      if (crossRow) angle = to.y > from.y ? Math.PI/2 : -Math.PI/2;
      var arrowSize = 6;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - arrowSize*Math.cos(angle-0.4), to.y - arrowSize*Math.sin(angle-0.4));
      ctx.lineTo(to.x - arrowSize*Math.cos(angle+0.4), to.y - arrowSize*Math.sin(angle+0.4));
      ctx.closePath();
      ctx.fillStyle = '#353540';
      ctx.fill();
    }

    // Row transition label
    ctx.fillStyle = '#3f3f46';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('▼ PIPELINE CONTINUES ▼', W/2, 430);
    ctx.fillText('DISCOVERY & BUILD', W/2, 68);
    ctx.fillText('GOVERNANCE & OUTPUT', W/2, 488);

    // Draw particles between rooms
    var newP = [];
    for (var p=0; p<particles.length; p++) {
      var pt = particles[p];
      pt.progress += pt.speed;
      if (pt.progress >= 1) continue;
      var t = pt.progress;
      var px = pt.x + (pt.tx - pt.x) * t;
      var py = pt.y + (pt.ty - pt.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, pt.size, 0, Math.PI*2);
      ctx.fillStyle = '#10b981';
      ctx.globalAlpha = 1 - t*0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Glow trail
      ctx.beginPath();
      ctx.arc(px, py, pt.size + 4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(16,185,129,0.1)';
      ctx.fill();
      newP.push(pt);
    }
    particles = newP;

    // Spawn particles for active connections
    if (pipelineData && animFrame % 20 === 0) {
      var runningRooms = new Set();
      for (var rm=0; rm<ROOMS.length; rm++) {
        if (ROOMS[rm].agents.some(function(aid){ var ag=agentMap[aid]; return ag && ag.state==='running'; })) {
          runningRooms.add(ROOMS[rm].id);
        }
      }
      for (var cc=0; cc<CONNECTIONS.length; cc++) {
        if (runningRooms.has(CONNECTIONS[cc][1])) {
          spawnParticle(CONNECTIONS[cc][0], CONNECTIONS[cc][1]);
        }
      }
    }

    // Draw agents (desk + character + screen)
    for (var r=0; r<ROOMS.length; r++) {
      var room = ROOMS[r];
      for (var ai=0; ai<room.agents.length; ai++) {
        var agentId = room.agents[ai];
        var pos = getAgentRoomPos(agentId);
        var agent = agentMap[agentId] || { state:'idle', name:agentId };
        var color = STATE_COLORS[agent.state] || STATE_COLORS.idle;

        // Desk sprite
        if (sprites.desk) {
          var deskW = sprites.desk.width / 7; // 7 desk variants in sprite sheet
          ctx.drawImage(sprites.desk, 0, 0, deskW, sprites.desk.height, pos.x - 18, pos.y + 8, 36, 20);
        }

        // PC Screen (glow if running)
        if (sprites.screen) {
          ctx.drawImage(sprites.screen, pos.x - 10, pos.y - 6, 20, 14);
          if (agent.state === 'running') {
            // Screen glow
            ctx.fillStyle = 'rgba(16,185,129,0.3)';
            ctx.fillRect(pos.x - 8, pos.y - 4, 16, 10);
          }
        }

        // Character sprite
        if (spritesLoaded) {
          var charScale = 0.45;
          if (agent.state === 'running') charScale = 0.50;
          drawCharacter(agentId, pos.x, pos.y, agent.state, charScale);
        } else {
          // Fallback circle
          ctx.beginPath();
          ctx.arc(pos.x, pos.y - 10, 8, 0, Math.PI*2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        // Status indicator ring
        ctx.beginPath();
        ctx.arc(pos.x + 14, pos.y - 14, 4, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
        if (agent.state === 'running') {
          ctx.beginPath();
          ctx.arc(pos.x + 14, pos.y - 14, 6, 0, Math.PI*2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Name plate
        ctx.fillStyle = agent.state === 'running' ? '#fafafa' : '#71717a';
        ctx.font = '8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, pos.x, pos.y + 30);

        // Task text (when running)
        if (agent.current_task && agent.state === 'running') {
          ctx.fillStyle = '#10b981';
          ctx.font = '7px ui-monospace';
          ctx.fillText(agent.current_task.substring(0,20), pos.x, pos.y + 40);
        }
      }
    }

    // Legend
    ctx.textAlign = 'left';
    var legendY = H - 28;
    var legendX = 16;
    ctx.font = '10px system-ui';
    var states = ['idle','running','done','failed','blocked','waiting'];
    for (var s=0; s<states.length; s++) {
      ctx.beginPath();
      ctx.arc(legendX, legendY, 4, 0, Math.PI*2);
      ctx.fillStyle = STATE_COLORS[states[s]];
      ctx.fill();
      ctx.fillStyle = '#52525b';
      ctx.fillText(states[s], legendX + 8, legendY + 3);
      legendX += 75;
    }

    // Progress bar
    if (pipelineData && pipelineData.total_features > 0) {
      var pct = pipelineData.completed_features / pipelineData.total_features;
      var barW = W/2;
      ctx.fillStyle = '#18181b';
      ctx.fillRect(W/2 - 10, legendY - 5, barW + 20, 10);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(W/2, legendY - 3, barW * pct, 6);
      if (pipelineData.failed_features > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(W/2 + barW * pct, legendY - 3, barW * (pipelineData.failed_features/pipelineData.total_features), 6);
      }
      ctx.fillStyle = '#52525b';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(pct*100)+'%', W - 16, legendY + 3);
    }

    requestAnimationFrame(draw);
  }

  /* ── Polling ── */
  var pollInterval = null;

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async function() {
      try {
        var r = await fetch('/api/agent-status');
        if (r.ok) pipelineData = await r.json();
      } catch(e) {}
    }, 500);
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  /* ── Init ── */
  draw();
  startPolling();

  /* ── Expose for panel switching ── */
  window._agentPipelineStartPolling = startPolling;
  window._agentPipelineStopPolling = stopPolling;
})();
`;
}

// ─── Extended Panel Scripts ──────────────────────────────────────────────────

export function extendedPanelScripts(): string {
  return `
/* ── Feature Plan Panel ── */
window.doLoadFeatures = async function() {
  var appId = document.getElementById('features-app-id')?.value || '';
  if (!appId) { setHtml('features-content', '<div class="op-status error">Enter an App ID</div>'); return; }
  try {
    var r = await apiGet('/api/app/' + appId + '/features');
    if (!r.ok) { setHtml('features-content', resultCard('error','Error',esc(r.data.message||'Failed'))); return; }
    var features = r.data.features || r.data || [];
    var h = '<div style="display:grid;gap:8px">';
    for (var i=0; i<features.length; i++) {
      var f = features[i];
      var statusColor = f.promotion_status === 'VERIFIED' ? 'green' : f.promotion_status === 'BLOCKED' ? 'red' : 'amber';
      h += '<div class="result-card info" style="padding:10px">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center">';
      h += '<strong>' + esc(f.feature_id || f.name || 'Feature') + '</strong>';
      h += tag(statusColor, f.promotion_status || 'CANDIDATE');
      h += '</div>';
      if (f.description) h += '<div style="color:var(--text2);font-size:12px;margin-top:4px">' + esc(f.description) + '</div>';
      if (f.dependencies && f.dependencies.length) h += '<div style="color:var(--text3);font-size:11px;margin-top:4px">Depends on: ' + f.dependencies.map(function(d){return esc(d)}).join(', ') + '</div>';
      h += '</div>';
    }
    h += '</div>';
    setHtml('features-content', h);
  } catch(e) { setHtml('features-content', resultCard('error','Error',esc(e.message))); }
};

/* ── Promotion State Panel ── */
window.doLoadPromotion = async function() {
  try {
    var r = await apiGet('/api/governance/promotion-state');
    if (!r.ok) { setHtml('promotion-content', resultCard('error','Error','Could not load promotion state')); return; }
    var data = r.data;
    var h = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:1rem">';
    var tiers = [
      { label:'CANDIDATE', count:data.candidate||0, color:'var(--text3)' },
      { label:'VERIFIED', count:data.verified||0, color:'var(--green)' },
      { label:'CANONICAL', count:data.canonical||0, color:'var(--green-text)' },
      { label:'BLOCKED', count:data.blocked||0, color:'var(--red)' }
    ];
    for (var t=0; t<tiers.length; t++) {
      h += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center">';
      h += '<div style="font-size:24px;font-weight:700;color:'+tiers[t].color+'">'+tiers[t].count+'</div>';
      h += '<div style="font-size:11px;color:var(--text3);margin-top:4px">'+tiers[t].label+'</div>';
      h += '</div>';
    }
    h += '</div>';
    if (data.features) {
      h += '<div style="display:grid;gap:4px">';
      for (var i=0;i<data.features.length;i++) {
        var f = data.features[i];
        var c = f.status === 'VERIFIED' ? 'green' : f.status === 'CANONICAL' ? 'green' : f.status === 'BLOCKED' ? 'red' : 'amber';
        h += '<div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--surface);border-radius:4px">';
        h += '<span style="font-size:12px;font-family:var(--mono)">'+esc(f.feature_id)+'</span>';
        h += tag(c, f.status);
        h += '</div>';
      }
      h += '</div>';
    }
    setHtml('promotion-content', h);
  } catch(e) { setHtml('promotion-content', resultCard('error','Error',esc(e.message))); }
};

/* ── Verification Panel ── */
window.doLoadVerification = async function() {
  var buildId = document.getElementById('verification-build-id')?.value || activeBuildId;
  if (!buildId) { setHtml('verification-content', '<div class="op-status error">Enter a Build ID</div>'); return; }
  try {
    var r = await apiGet('/api/builds/' + buildId + '/verification');
    if (!r.ok) { setHtml('verification-content', resultCard('error','Error','No verification data')); return; }
    var checks = r.data.checks || [];
    var h = '<div style="display:grid;gap:8px">';
    for (var i=0;i<checks.length;i++) {
      var c = checks[i];
      var type = c.passed ? 'success' : 'error';
      var icon = c.passed ? '✓' : '✗';
      h += '<div class="result-card '+type+'" style="padding:10px">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center">';
      h += '<strong>'+icon+' '+esc(c.name)+'</strong>';
      if (c.failure_class) h += tag('red', c.failure_class);
      if (c.duration_ms) h += '<span style="color:var(--text3);font-size:11px">'+c.duration_ms+'ms</span>';
      h += '</div>';
      if (c.normalized_error_summary) {
        h += '<pre style="margin-top:6px;font-size:11px;color:var(--red-text);background:var(--red-bg);padding:8px;border-radius:4px;overflow-x:auto;max-height:200px">'+esc(c.normalized_error_summary)+'</pre>';
      }
      if (c.failing_files && c.failing_files.length) {
        h += '<div style="margin-top:4px;font-size:11px;color:var(--text3)">Files: '+c.failing_files.map(function(f){return esc(f)}).join(', ')+'</div>';
      }
      h += '</div>';
    }
    h += '</div>';
    setHtml('verification-content', h);
  } catch(e) { setHtml('verification-content', resultCard('error','Error',esc(e.message))); }
};

/* ── Governance Panel ── */
window.doLoadGovernance = async function() {
  try {
    var r = await apiGet('/api/governance/training-status');
    if (!r.ok) { setHtml('governance-content', resultCard('info','No Data','Governance training has not run yet.')); return; }
    var data = r.data;
    var h = '';
    if (data.current_config) {
      h += '<div class="result-card info" style="padding:10px;margin-bottom:8px">';
      h += '<div class="result-header">Current Config</div>';
      h += kvRow('Direct Build Floor', data.current_config.direct_build_floor || '—');
      h += kvRow('Caution Build Floor', data.current_config.caution_build_floor || '—');
      h += kvRow('Research Floor', data.current_config.research_required_floor || '—');
      h += '</div>';
    }
    if (data.candidates && data.candidates.length) {
      h += '<div class="result-header" style="margin:12px 0 8px">Ranked Candidates</div>';
      for (var i=0;i<data.candidates.length;i++) {
        var c = data.candidates[i];
        var type = c.score > 0.8 ? 'success' : c.score > 0.5 ? 'info' : 'error';
        h += '<div class="result-card '+type+'" style="padding:8px;margin-bottom:4px">';
        h += '<div style="display:flex;justify-content:space-between">';
        h += '<span>'+esc(c.change_description || 'Config change')+'</span>';
        h += '<strong style="color:var(--green-text)">'+(c.score*100).toFixed(0)+'%</strong>';
        h += '</div>';
        h += '</div>';
      }
    }
    setHtml('governance-content', h || resultCard('info','No Data','No governance training results yet.'));
  } catch(e) { setHtml('governance-content', resultCard('error','Error',esc(e.message))); }
};

window.doRunGovernanceLoop = async function() {
  setHtml('governance-content', spinMsg('Running governance training loop...'));
  try {
    var r = await apiPost('/api/governance/train', {});
    if (r.ok) { doLoadGovernance(); }
    else { setHtml('governance-content', resultCard('error','Error',esc(r.data.message||'Failed'))); }
  } catch(e) { setHtml('governance-content', resultCard('error','Error',esc(e.message))); }
};

/* ── Build Progression Panel ── */
(function pollProgress() {
  setInterval(async function() {
    var panel = document.getElementById('panel-progress');
    if (!panel || !panel.classList.contains('visible')) return;
    try {
      var r = await fetch('/api/agent-status');
      if (!r.ok) return;
      var data = await r.json();
      if (!data.total_features) return;
      var pct = Math.round((data.completed_features / data.total_features) * 100);
      var h = '<div style="margin-bottom:1rem">';
      h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px">';
      h += '<span style="font-size:13px;color:var(--text2)">Overall Progress</span>';
      h += '<span style="font-size:13px;font-weight:700;color:var(--green-text)">' + pct + '%</span>';
      h += '</div>';
      h += '<div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">';
      h += '<div style="height:100%;width:'+pct+'%;background:var(--green);transition:width 0.3s"></div>';
      h += '</div>';
      h += '</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:1rem">';
      h += '<div style="background:var(--green-bg);padding:8px;border-radius:var(--radius);text-align:center"><div style="font-size:20px;font-weight:700;color:var(--green-text)">'+data.completed_features+'</div><div style="font-size:10px;color:var(--text3)">PASSED</div></div>';
      h += '<div style="background:var(--surface2);padding:8px;border-radius:var(--radius);text-align:center"><div style="font-size:20px;font-weight:700;color:var(--text2)">'+(data.total_features-data.completed_features-data.failed_features-data.blocked_features)+'</div><div style="font-size:10px;color:var(--text3)">PENDING</div></div>';
      h += '<div style="background:var(--red-bg);padding:8px;border-radius:var(--radius);text-align:center"><div style="font-size:20px;font-weight:700;color:var(--red-text)">'+data.failed_features+'</div><div style="font-size:10px;color:var(--text3)">FAILED</div></div>';
      h += '<div style="background:var(--amber-bg);padding:8px;border-radius:var(--radius);text-align:center"><div style="font-size:20px;font-weight:700;color:var(--amber-text)">'+data.blocked_features+'</div><div style="font-size:10px;color:var(--text3)">BLOCKED</div></div>';
      h += '</div>';
      if (data.active_feature_id) {
        h += '<div style="font-size:12px;color:var(--text2)">Currently building: <strong style="color:var(--green-text);font-family:var(--mono)">'+data.active_feature_id+'</strong></div>';
      }
      h += '<div style="font-size:11px;color:var(--text3);margin-top:4px">Phase: '+data.current_phase+' | Elapsed: '+Math.round(data.elapsed_ms/1000)+'s</div>';
      document.getElementById('progress-content').innerHTML = h;
    } catch(e) {}
  }, 1000);
})();
`;
}
