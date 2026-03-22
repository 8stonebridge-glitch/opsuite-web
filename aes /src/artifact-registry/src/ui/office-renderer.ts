/**
 * AES 2D Office Renderer — Animated Characters Walking Between Offices
 *
 * Characters physically walk between rooms carrying documents.
 * Uses directional sprite frames for walk animation.
 * Like watching a cartoon of the AES pipeline in action.
 */

export function officeRendererScript(): string {
  return `
(function(){
  var canvas = document.getElementById('pipeline-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var pipelineData = null;
  var animFrame = 0;
  var spritesLoaded = false;

  /* ══════════════════════════════════════════════════════════════════════════
     SPRITES
     ══════════════════════════════════════════════════════════════════════════ */
  var sprites = {};
  var M = {
    mainFloor:'/assets/Props/Walls/Floors/Main Floor.png',
    kitchenFloor:'/assets/Props/Walls/Floors/Kitchen Floor.png',
    desk:'/assets/Props/Office/Desks/Desks Brown.png',
    screen:'/assets/Props/Office/Desks/Props/PC Screen.png',
    keyboard:'/assets/Props/Office/Desks/Props/Keyboard.png',
    coffee:'/assets/Props/Office/Desks/Props/Cup with Coffee.png',
    document:'/assets/Props/Office/Desks/Props/Document and Pen.png',
    lamp:'/assets/Props/Office/Desks/Props/Lamp.png',
    penHolder1:'/assets/Props/Office/Desks/Props/Pen Holder 1.png',
    cellphone:'/assets/Props/Office/Desks/Props/Cellphone.png',
    printer:'/assets/Props/Office/Printer.png',
    filecart:'/assets/Props/Office/File Cart.png',
    plant:'/assets/Props/Plants/Plants.png',
    bookshelf:'/assets/Props/Miscellaneous/Bookshelf.png',
    vendSnack:'/assets/Props/Vending Machines/Snacks/Snacks Vending Machine.png',
    vendDrink:'/assets/Props/Vending Machines/Drinks/Drinks Vending Machine.png',
    tvStand:'/assets/Props/Lounge/TV/TV With Stand.png',
    sofa:'/assets/Props/Lounge/Sofas/Sofas.png',
    glassCoffee:'/assets/Props/Lounge/Coffee Tables/Glass Coffee Table.png',
    cupboards:'/assets/Props/Kitchen/Cupboards/Kitchen Cupboards.png',
    fridge:'/assets/Props/Kitchen/Fridge/Fridge.png',
    microwave:'/assets/Props/Kitchen/Microwave/Microwave.png',
    waterDisp:'/assets/Props/Water Dispencer/Water Dispencer.png',
    male1:'/assets/Characters/Male/Male 1.png',
    male2:'/assets/Characters/Male/Male 2.png',
    male3:'/assets/Characters/Male/Male 3.png',
    male4:'/assets/Characters/Male/Male 4.png',
    male5:'/assets/Characters/Male/Male 5.png',
    male6:'/assets/Characters/Male/Male 6.png',
    male7:'/assets/Characters/Male/Male 7.png',
    female1:'/assets/Characters/Female/Female 1.png',
    female2:'/assets/Characters/Female/Female 2.png',
    female3:'/assets/Characters/Female/Female 3.png',
    female4:'/assets/Characters/Female/Female 4.png',
  };
  var lc=0,tc=Object.keys(M).length;
  for(var k in M){(function(k){var img=new Image();img.onload=function(){sprites[k]=img;lc++;if(lc>=tc)spritesLoaded=true;};img.onerror=function(){lc++;if(lc>=tc)spritesLoaded=true;};img.src=M[k];})(k);}

  /* ══════════════════════════════════════════════════════════════════════════
     WALKING CHARACTER SYSTEM
     ══════════════════════════════════════════════════════════════════════════ */

  // Active walkers — characters currently moving between rooms
  var walkers = [];
  // walkers[i] = { charKey, x, y, targetX, targetY, speed, carrying, onArrive, bobPhase }

  function spawnWalker(charKey, fromX, fromY, toX, toY, carrying, onArrive) {
    walkers.push({
      charKey: charKey,
      x: fromX, y: fromY,
      targetX: toX, targetY: toY,
      speed: 1.2 + Math.random()*0.4,
      carrying: carrying || null,
      onArrive: onArrive || null,
      bobPhase: Math.random() * Math.PI * 2,
      arrived: false,
    });
  }

  function updateWalkers() {
    var active = [];
    for (var i=0; i<walkers.length; i++) {
      var w = walkers[i];
      var dx = w.targetX - w.x;
      var dy = w.targetY - w.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 3) {
        w.arrived = true;
        if (w.onArrive) w.onArrive();
        continue; // remove from list
      }
      w.x += (dx/dist) * w.speed;
      w.y += (dy/dist) * w.speed;
      active.push(w);
    }
    walkers = active;
  }

  function drawWalkers() {
    for (var i=0; i<walkers.length; i++) {
      var w = walkers[i];
      var img = sprites[w.charKey];
      if (!img) continue;

      var fw = img.width/4, fh = img.height;
      // Direction: 0=right, 1=front, 2=left, 3=back
      var dx = w.targetX - w.x;
      var dy = w.targetY - w.y;
      var frame;
      if (Math.abs(dx) > Math.abs(dy)) {
        frame = dx > 0 ? 0 : 2; // right or left
      } else {
        frame = dy > 0 ? 1 : 3; // down or up
      }
      // Walking bob
      var bob = Math.sin(animFrame * 0.3 + w.bobPhase) * 2;
      var scale = 0.5;
      var dw = fw*scale, dh = fh*scale;
      ctx.drawImage(img, frame*fw, 0, fw, fh, w.x-dw/2, w.y-dh+bob, dw, dh);

      // Shadow
      ctx.beginPath();
      ctx.ellipse(w.x, w.y+4, 10, 4, 0, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      // Carrying document
      if (w.carrying === 'document' && sprites.document) {
        ctx.drawImage(sprites.document, w.x+8, w.y-dh+bob+10, 10, 10);
      }

      // Speech bubble when working
      if (w.carrying === 'working') {
        var bubbleW = 6;
        ctx.fillStyle = 'rgba(16,185,129,0.8)';
        ctx.beginPath();
        ctx.arc(w.x, w.y-dh+bob-5, bubbleW, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('!', w.x, w.y-dh+bob-2);
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     AGENT CHARACTERS — Static positions at desks
     ══════════════════════════════════════════════════════════════════════════ */

  var AGENT_CHARS = {
    'intake':'male1','obs-research':'female1','obs-donor':'male2',
    'obs-metrics':'female2','obs-api':'male3','obs-ui':'female3',
    'story-gen':'male4','decomposer':'female4','ret-deps':'male5',
    'ret-temporal':'male6','ret-conflict':'female1','ret-rules':'male7',
    'arb-complete':'female2','arb-contradict':'male1','promoter':'female3',
    'strategy':'male2','bridge':'male3','builder':'male4',
    'verify-p1':'female4','verify-p2':'male5','verify-final':'female1',
    'validator':'male6','writeback':'male7','gov-loop':'female2',
  };

  var STATE_COLORS = {
    idle:'#3f3f46',running:'#10b981',done:'#22d3ee',
    failed:'#ef4444',blocked:'#f59e0b',waiting:'#8b5cf6'
  };

  // Track which agents are "away" (walking to another room)
  var agentsAway = new Set();

  /* ══════════════════════════════════════════════════════════════════════════
     ROOM LAYOUT
     ══════════════════════════════════════════════════════════════════════════ */

  var ROOMS = [
    { id:'kitchen', label:'BREAK ROOM', x:20, y:20, w:280, h:240, floor:'kitchenFloor',
      agents:['obs-research','obs-donor','obs-metrics'],
      furniture:[{s:'cupboards',x:10,y:5,w:120,h:30},{s:'fridge',x:140,y:5,w:30,h:40},{s:'microwave',x:180,y:8,w:25,h:20},{s:'waterDisp',x:240,y:10,w:25,h:40},{s:'plant',x:250,y:190,w:25,h:30}],
      desks:[{x:50,y:120,c:'obs-research'},{x:150,y:120,c:'obs-donor'},{x:50,y:190,c:'obs-metrics'}],
      doorX:280, doorY:120 },
    { id:'hallway', label:'', x:300, y:20, w:80, h:240, floor:'mainFloor',
      agents:[], furniture:[{s:'vendSnack',x:10,y:20,w:30,h:55},{s:'vendDrink',x:45,y:20,w:30,h:55},{s:'plant',x:30,y:180,w:20,h:25}],
      desks:[], doorX:40, doorY:120 },
    { id:'intake_room', label:'INTAKE', x:380, y:20, w:200, h:120, floor:'mainFloor',
      agents:['intake','obs-api'],
      furniture:[{s:'bookshelf',x:150,y:5,w:40,h:50},{s:'printer',x:10,y:5,w:35,h:30}],
      desks:[{x:60,y:55,c:'intake'},{x:140,y:55,c:'obs-api'}],
      doorX:0, doorY:55 },
    { id:'story_room', label:'STORIES', x:380, y:140, w:200, h:120, floor:'mainFloor',
      agents:['story-gen','obs-ui'],
      furniture:[{s:'plant',x:170,y:5,w:20,h:25},{s:'filecart',x:10,y:80,w:30,h:30}],
      desks:[{x:60,y:55,c:'story-gen'},{x:140,y:55,c:'obs-ui'}],
      doorX:0, doorY:55 },
    { id:'plan_room', label:'PLANNING', x:580, y:20, w:250, h:240, floor:'mainFloor',
      agents:['decomposer','arb-complete','arb-contradict','promoter'],
      furniture:[{s:'bookshelf',x:200,y:5,w:40,h:50},{s:'bookshelf',x:200,y:60,w:40,h:50},{s:'plant',x:5,y:5,w:20,h:25},{s:'tvStand',x:90,y:5,w:60,h:30}],
      desks:[{x:50,y:80,c:'decomposer'},{x:140,y:80,c:'arb-complete'},{x:50,y:170,c:'arb-contradict'},{x:140,y:170,c:'promoter'}],
      doorX:0, doorY:120 },
    { id:'retrieve_room', label:'RETRIEVAL', x:20, y:310, w:280, h:240, floor:'mainFloor',
      agents:['ret-deps','ret-temporal','ret-conflict','ret-rules'],
      furniture:[{s:'bookshelf',x:5,y:5,w:40,h:50},{s:'printer',x:240,y:5,w:35,h:30},{s:'plant',x:240,y:195,w:25,h:30},{s:'filecart',x:5,y:190,w:30,h:30}],
      desks:[{x:70,y:80,c:'ret-deps'},{x:170,y:80,c:'ret-temporal'},{x:70,y:175,c:'ret-conflict'},{x:170,y:175,c:'ret-rules'}],
      doorX:280, doorY:120 },
    { id:'strategy_room', label:'STRATEGY', x:300, y:310, w:180, h:120, floor:'mainFloor',
      agents:['strategy','bridge'],
      furniture:[{s:'plant',x:150,y:5,w:20,h:25},{s:'bookshelf',x:5,y:5,w:35,h:45}],
      desks:[{x:65,y:60,c:'strategy'},{x:140,y:60,c:'bridge'}],
      doorX:0, doorY:60 },
    { id:'build_lab', label:'BUILD LAB', x:300, y:430, w:180, h:120, floor:'kitchenFloor',
      agents:['builder'],
      furniture:[{s:'tvStand',x:60,y:5,w:60,h:25},{s:'plant',x:150,y:80,w:20,h:25},{s:'printer',x:5,y:80,w:30,h:25}],
      desks:[{x:90,y:65,c:'builder'}],
      doorX:180, doorY:60 },
    { id:'qa_lab', label:'QA LAB', x:500, y:310, w:250, h:240, floor:'mainFloor',
      agents:['verify-p1','verify-p2','verify-final','validator'],
      furniture:[{s:'bookshelf',x:200,y:5,w:40,h:50},{s:'plant',x:5,y:5,w:20,h:25},{s:'vendSnack',x:200,y:180,w:25,h:45},{s:'filecart',x:5,y:190,w:25,h:30}],
      desks:[{x:60,y:80,c:'verify-p1'},{x:150,y:80,c:'verify-p2'},{x:60,y:175,c:'verify-final'},{x:150,y:175,c:'validator'}],
      doorX:0, doorY:120 },
    { id:'output_room', label:'OUTPUT', x:750, y:310, w:250, h:240, floor:'mainFloor',
      agents:['writeback','gov-loop'],
      furniture:[{s:'sofa',x:160,y:155,w:70,h:40,sx:0,sy:120,sw:200,sh:100},{s:'glassCoffee',x:175,y:125,w:40,h:30},{s:'tvStand',x:175,y:5,w:60,h:25},{s:'plant',x:5,y:5,w:20,h:25},{s:'bookshelf',x:5,y:40,w:35,h:50},{s:'plant',x:220,y:200,w:20,h:25}],
      desks:[{x:70,y:80,c:'writeback'},{x:70,y:175,c:'gov-loop'}],
      doorX:0, doorY:120 },
  ];

  // Connection paths for walkers (from room door to room door)
  var ROOM_PATHS = {
    'kitchen>intake_room': [{x:340,y:140},{x:380,y:75}],
    'intake_room>story_room': [{x:380,y:195}],
    'story_room>plan_room': [{x:480,y:200},{x:580,y:140}],
    'plan_room>retrieve_room': [{x:580,y:260},{x:400,y:290},{x:300,y:430}],
    'retrieve_room>strategy_room': [{x:300,y:370}],
    'strategy_room>build_lab': [{x:390,y:490}],
    'build_lab>qa_lab': [{x:480,y:490},{x:500,y:430}],
    'qa_lab>output_room': [{x:750,y:430}],
  };

  var CONNECTIONS = [
    ['kitchen','intake_room'],['intake_room','story_room'],['story_room','plan_room'],
    ['plan_room','retrieve_room'],['retrieve_room','strategy_room'],
    ['strategy_room','build_lab'],['build_lab','qa_lab'],['qa_lab','output_room'],
  ];

  /* ══════════════════════════════════════════════════════════════════════════
     MESSENGER SYSTEM — spawn walking characters between rooms on state change
     ══════════════════════════════════════════════════════════════════════════ */

  var lastPhase = '';
  var messengerQueue = [];

  function checkForMessengers() {
    if (!pipelineData) return;
    var phase = pipelineData.current_phase;
    if (phase === lastPhase) return;
    var prevPhase = lastPhase;
    lastPhase = phase;

    // Spawn messengers based on phase transitions
    var transitions = {
      'RESEARCH':   { from:'intake_room', to:'kitchen', char:'male1' },
      'STORIES':    { from:'kitchen', to:'story_room', char:'female1' },
      'DECOMPOSE':  { from:'story_room', to:'plan_room', char:'male4' },
      'RETRIEVAL':  { from:'plan_room', to:'retrieve_room', char:'female4' },
      'BUILDING':   { from:'retrieve_room', to:'strategy_room', char:'male5' },
    };

    var t = transitions[phase];
    if (t) {
      var fromRoom = ROOMS.find(function(r){return r.id===t.from;});
      var toRoom = ROOMS.find(function(r){return r.id===t.to;});
      if (fromRoom && toRoom) {
        var fx = fromRoom.x + (fromRoom.doorX || fromRoom.w/2);
        var fy = fromRoom.y + (fromRoom.doorY || fromRoom.h/2);
        var tx = toRoom.x + (toRoom.doorX || toRoom.w/2);
        var ty = toRoom.y + (toRoom.doorY || toRoom.h/2);
        spawnWalker(t.char, fx, fy, tx, ty, 'document', null);
      }
    }

    // When building features, spawn builder walking to build lab
    if (phase === 'BUILDING' && prevPhase !== 'BUILDING') {
      var strat = ROOMS.find(function(r){return r.id==='strategy_room';});
      var build = ROOMS.find(function(r){return r.id==='build_lab';});
      if (strat && build) {
        setTimeout(function(){
          spawnWalker('male2', strat.x+strat.w, strat.y+60, build.x+90, build.y+30, 'document', null);
        }, 2000);
        // After build, walk to QA
        setTimeout(function(){
          spawnWalker('male4', build.x+build.w, build.y+60, 500+60, 310+80, 'document', null);
        }, 6000);
        // After QA, walk to output
        setTimeout(function(){
          spawnWalker('male6', 500+250, 310+120, 750+70, 310+80, 'document', null);
        }, 10000);
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DRAW HELPERS
     ══════════════════════════════════════════════════════════════════════════ */

  function drawSprite(key,x,y,w,h,sx,sy,sw,sh) {
    var img=sprites[key]; if(!img) return;
    if(sx!==undefined) ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
    else ctx.drawImage(img,x,y,w,h);
  }

  function drawCharAtDesk(charKey, x, y, state) {
    var img = sprites[charKey];
    if (!img) {
      ctx.beginPath();ctx.arc(x,y-8,8,0,Math.PI*2);
      ctx.fillStyle=STATE_COLORS[state]||'#3f3f46';ctx.fill();
      return;
    }
    var fw=img.width/4, fh=img.height;
    // At desk: face front (frame 1), wiggle if running
    var frame = 1;
    var bob = 0;
    if (state === 'running') {
      // Slight side-to-side wiggle while working
      bob = Math.sin(animFrame * 0.15) * 1.5;
      // Alternate between front and slight turn
      if (Math.floor(animFrame/20)%2===0) frame = 0;
    }
    var scale = 0.48;
    var dw=fw*scale, dh=fh*scale;
    ctx.drawImage(img, frame*fw, 0, fw, fh, x-dw/2+bob, y-dh+3, dw, dh);
  }

  function drawDesk(rx,ry,dx,dy) {
    var img=sprites.desk;
    if(img){var dw=img.width/7;ctx.drawImage(img,0,0,dw,img.height,rx+dx-25,ry+dy+12,50,28);}
    drawSprite('screen',rx+dx-12,ry+dy-8,24,16);
    drawSprite('keyboard',rx+dx-8,ry+dy+8,16,8);
  }

  function tileFloor(room) {
    var img=sprites[room.floor||'mainFloor'];
    if(!img){ctx.fillStyle='#1a1a20';ctx.fillRect(room.x,room.y,room.w,room.h);return;}
    ctx.save();ctx.beginPath();ctx.rect(room.x,room.y,room.w,room.h);ctx.clip();
    for(var tx=room.x;tx<room.x+room.w;tx+=48)for(var ty=room.y;ty<room.y+room.h;ty+=48)ctx.drawImage(img,tx,ty,48,48);
    ctx.restore();
  }

  function drawWalls(room) {
    // Brown wall borders
    ctx.strokeStyle='#5c3d1e';ctx.lineWidth=4;ctx.strokeRect(room.x,room.y,room.w,room.h);
    // Top wall strip
    ctx.fillStyle='#4a3018';ctx.fillRect(room.x,room.y-6,room.w,6);
    // Wall top decorative line
    ctx.fillStyle='#6b4423';ctx.fillRect(room.x,room.y-8,room.w,2);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MAIN DRAW
     ══════════════════════════════════════════════════════════════════════════ */

  function draw() {
    ctx.clearRect(0,0,W,H);
    animFrame++;

    // Background
    ctx.fillStyle='#0e0e14';ctx.fillRect(0,0,W,H);

    // Faint corridor floor
    if(sprites.mainFloor){
      ctx.globalAlpha=0.06;
      var pat=ctx.createPattern(sprites.mainFloor,'repeat');
      if(pat){ctx.fillStyle=pat;ctx.fillRect(0,0,W,H);}
      ctx.globalAlpha=1;
    }

    var agentMap={};
    if(pipelineData){
      for(var a=0;a<pipelineData.agents.length;a++) agentMap[pipelineData.agents[a].agent_id]=pipelineData.agents[a];
    }

    // Check for messenger spawns
    checkForMessengers();
    // Update walker positions
    updateWalkers();

    // ── Layer 0: Floors ──
    for(var r=0;r<ROOMS.length;r++) tileFloor(ROOMS[r]);

    // ── Layer 1: Walls ──
    for(var r=0;r<ROOMS.length;r++) drawWalls(ROOMS[r]);

    // ── Layer 1.5: Room glow for active rooms ──
    for(var r=0;r<ROOMS.length;r++){
      var room=ROOMS[r];
      var running=room.agents.some(function(a){var ag=agentMap[a];return ag&&ag.state==='running';});
      var done=room.agents.length>0&&room.agents.every(function(a){var ag=agentMap[a];return ag&&ag.state==='done';});
      var failed=room.agents.some(function(a){var ag=agentMap[a];return ag&&ag.state==='failed';});

      if(running){
        var pulse=Math.sin(animFrame*0.06)*0.15+0.25;
        ctx.strokeStyle='rgba(16,185,129,'+pulse+')';ctx.lineWidth=3;
        ctx.strokeRect(room.x-2,room.y-2,room.w+4,room.h+4);
        // Light inside room
        ctx.fillStyle='rgba(16,185,129,0.04)';
        ctx.fillRect(room.x,room.y,room.w,room.h);
      }
      if(done){
        ctx.strokeStyle='rgba(34,211,238,0.25)';ctx.lineWidth=2;
        ctx.strokeRect(room.x-1,room.y-1,room.w+2,room.h+2);
      }
      if(failed){
        ctx.strokeStyle='rgba(239,68,68,0.3)';ctx.lineWidth=2;
        ctx.strokeRect(room.x-1,room.y-1,room.w+2,room.h+2);
      }
    }

    // ── Layer 2: Connections ──
    ctx.setLineDash([3,3]);ctx.strokeStyle='#1e1e28';ctx.lineWidth=1;
    for(var c=0;c<CONNECTIONS.length;c++){
      var f=ROOMS.find(function(r){return r.id===CONNECTIONS[c][0];});
      var t=ROOMS.find(function(r){return r.id===CONNECTIONS[c][1];});
      if(!f||!t) continue;
      var fx=f.x+(f.doorX!==undefined?f.doorX:f.w/2);
      var fy=f.y+(f.doorY!==undefined?f.doorY:f.h/2);
      var tx=t.x+(t.doorX!==undefined?t.doorX:t.w/2);
      var ty=t.y+(t.doorY!==undefined?t.doorY:t.h/2);
      ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(tx,ty);ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Layer 3: Furniture ──
    for(var r=0;r<ROOMS.length;r++){
      var room=ROOMS[r];
      for(var fi=0;fi<room.furniture.length;fi++){
        var f=room.furniture[fi];
        if(f.sx!==undefined) drawSprite(f.s,room.x+f.x,room.y+f.y,f.w,f.h,f.sx,f.sy,f.sw,f.sh);
        else drawSprite(f.s,room.x+f.x,room.y+f.y,f.w,f.h);
      }
    }

    // ── Layer 4: Desks + screens ──
    for(var r=0;r<ROOMS.length;r++){
      var room=ROOMS[r];
      for(var di=0;di<room.desks.length;di++){
        var d=room.desks[di];
        drawDesk(room.x,room.y,d.x,d.y);
        var agent=agentMap[d.c];
        if(agent&&agent.state==='running'){
          // Screen glow
          ctx.fillStyle='rgba(16,185,129,0.3)';
          ctx.fillRect(room.x+d.x-10,room.y+d.y-6,20,12);
          // Typing animation — small dots on keyboard
          if(animFrame%10<5){
            ctx.fillStyle='rgba(16,185,129,0.6)';
            ctx.fillRect(room.x+d.x-4+Math.sin(animFrame*0.5)*3,room.y+d.y+10,2,2);
          }
        }
        // Random desk props
        var seed=(d.x*7+d.y*13)%5;
        if(seed===0) drawSprite('coffee',room.x+d.x+14,room.y+d.y,10,12);
        if(seed===1) drawSprite('document',room.x+d.x+14,room.y+d.y-4,12,12);
        if(seed===2) drawSprite('penHolder1',room.x+d.x+16,room.y+d.y-2,8,10);
        if(seed===3) drawSprite('cellphone',room.x+d.x-20,room.y+d.y+2,8,12);
        if(seed===4) drawSprite('lamp',room.x+d.x+16,room.y+d.y-10,12,16);
      }
    }

    // ── Layer 5: Characters at desks ──
    for(var r=0;r<ROOMS.length;r++){
      var room=ROOMS[r];
      for(var di=0;di<room.desks.length;di++){
        var d=room.desks[di];
        if(agentsAway.has(d.c)) continue; // don't draw if walking
        var charKey=AGENT_CHARS[d.c]||'male1';
        var agent=agentMap[d.c]||{state:'idle',name:d.c};

        // Shadow under character
        ctx.beginPath();ctx.ellipse(room.x+d.x,room.y+d.y+6,10,4,0,0,Math.PI*2);
        ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fill();

        drawCharAtDesk(charKey,room.x+d.x,room.y+d.y,agent.state);

        // Status indicator
        ctx.beginPath();ctx.arc(room.x+d.x+16,room.y+d.y-20,4,0,Math.PI*2);
        ctx.fillStyle=STATE_COLORS[agent.state]||'#3f3f46';ctx.fill();
        if(agent.state==='running'){
          var p=Math.sin(animFrame*0.1)*0.4+0.6;
          ctx.beginPath();ctx.arc(room.x+d.x+16,room.y+d.y-20,7,0,Math.PI*2);
          ctx.strokeStyle='rgba(16,185,129,'+p+')';ctx.lineWidth=1;ctx.stroke();
        }

        // Name
        ctx.fillStyle=agent.state==='running'?'#e0e0e0':'#52525b';
        ctx.font='7px system-ui';ctx.textAlign='center';
        ctx.fillText(agent.name||d.c,room.x+d.x,room.y+d.y+30);

        // Task text
        if(agent.current_task&&agent.state==='running'){
          ctx.fillStyle='#10b981';ctx.font='6px ui-monospace';
          ctx.fillText(agent.current_task.substring(0,18),room.x+d.x,room.y+d.y+38);
        }
      }
    }

    // ── Layer 6: Walking characters (on top of everything) ──
    drawWalkers();

    // ── Layer 7: Room labels ──
    ctx.font='bold 8px system-ui';ctx.textAlign='left';
    for(var r=0;r<ROOMS.length;r++){
      var room=ROOMS[r];
      if(!room.label) continue;
      var running=room.agents.some(function(a){var ag=agentMap[a];return ag&&ag.state==='running';});
      var tw=ctx.measureText(room.label).width+8;
      ctx.fillStyle='rgba(10,10,16,0.85)';
      ctx.fillRect(room.x+3,room.y+room.h-16,tw,13);
      ctx.fillStyle=running?'#10b981':'#71717a';
      ctx.fillText(room.label,room.x+7,room.y+room.h-6);
      // Done/fail indicator
      var done=room.agents.length>0&&room.agents.every(function(a){var ag=agentMap[a];return ag&&ag.state==='done';});
      var failed=room.agents.some(function(a){var ag=agentMap[a];return ag&&ag.state==='failed';});
      if(done){ctx.fillStyle='#22d3ee';ctx.font='12px system-ui';ctx.textAlign='right';ctx.fillText('✓',room.x+room.w-5,room.y+14);ctx.font='bold 8px system-ui';ctx.textAlign='left';}
      if(failed){ctx.fillStyle='#ef4444';ctx.font='12px system-ui';ctx.textAlign='right';ctx.fillText('✗',room.x+room.w-5,room.y+14);ctx.font='bold 8px system-ui';ctx.textAlign='left';}
    }

    // ── HUD ──
    ctx.fillStyle='rgba(10,10,16,0.9)';ctx.fillRect(0,0,W,18);
    ctx.fillStyle='#a1a1aa';ctx.font='bold 9px system-ui';ctx.textAlign='left';
    ctx.fillText('AES OFFICE',8,12);
    if(pipelineData){
      ctx.fillStyle='#10b981';ctx.font='9px system-ui';ctx.textAlign='right';
      ctx.fillText(pipelineData.current_phase.toUpperCase()+'  |  '+pipelineData.completed_features+'/'+pipelineData.total_features+' features  |  '+Math.round(pipelineData.elapsed_ms/1000)+'s',W-8,12);
    }

    // Progress bar
    if(pipelineData&&pipelineData.total_features>0){
      var pct=pipelineData.completed_features/pipelineData.total_features;
      ctx.fillStyle='#18181b';ctx.fillRect(W/2-80,H-8,160,5);
      ctx.fillStyle='#10b981';ctx.fillRect(W/2-80,H-8,160*pct,5);
    }

    // Legend
    ctx.font='8px system-ui';ctx.textAlign='left';
    var lx=8,ly=H-10;
    ['idle','running','done','failed','blocked'].forEach(function(s){
      ctx.beginPath();ctx.arc(lx,ly,3,0,Math.PI*2);ctx.fillStyle=STATE_COLORS[s];ctx.fill();
      ctx.fillStyle='#52525b';ctx.fillText(s,lx+6,ly+3);lx+=55;
    });

    requestAnimationFrame(draw);
  }

  /* ── Polling ── */
  var pollInterval=null;
  function startPolling(){if(pollInterval)return;pollInterval=setInterval(async function(){try{var r=await fetch('/api/agent-status');if(r.ok)pipelineData=await r.json();}catch(e){}},500);}
  function stopPolling(){if(pollInterval){clearInterval(pollInterval);pollInterval=null;}}

  draw();
  startPolling();
  window._agentPipelineStartPolling=startPolling;
  window._agentPipelineStopPolling=stopPolling;
})();
`;
}
