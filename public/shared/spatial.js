/* Elvora • Spatial Memory (Node Registry) — uses ElvoraEvents (offline-first) */
(function(){
  const NS = "ev.spatial";
  const MAX_NODES = 20000;

  // per-warehouse storage keys
  const kNodes = (wh)=>`${NS}.nodes::${wh}`;
  const kMap   = (wh)=>`${NS}.markerMap::${wh}`; // markerId -> nodeId

  function safeJsonParse(s, def){
    try{ return JSON.parse(s ?? ""); }catch{ return def; }
  }
  function loadNodes(wh){
    const arr = safeJsonParse(localStorage.getItem(kNodes(wh)) || "[]", []);
    return Array.isArray(arr) ? arr : [];
  }
  function saveNodes(wh, arr){
    if(arr.length > MAX_NODES) arr.length = MAX_NODES;
    localStorage.setItem(kNodes(wh), JSON.stringify(arr));
  }
  function loadMap(wh){
    const m = safeJsonParse(localStorage.getItem(kMap(wh)) || "{}", {});
    return (m && typeof m === "object") ? m : {};
  }
  function saveMap(wh, m){
    localStorage.setItem(kMap(wh), JSON.stringify(m));
  }

  function rid(prefix="N"){
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`.toUpperCase();
  }
  function nowIso(){ return new Date().toISOString(); }

  function dist(a,b){
    if(!a||!b) return Infinity;
    const dx=(a.x??0)-(b.x??0), dy=(a.y??0)-(b.y??0);
    return Math.sqrt(dx*dx+dy*dy);
  }

  // conflict if same marker appears far away (meters or arbitrary grid units)
  const CONFLICT_DIST = 2.0;

  let WH = null;

  function requireWh(){
    if(!WH) throw new Error("ElvoraSpatial: warehouseId not set. Call ElvoraSpatial.setWarehouse('WH-...') first.");
    return WH;
  }

  function getNodes(wh=WH){
    if(!wh) return [];
    return loadNodes(wh);
  }

  function getNodeById(nodeId, wh=WH){
    if(!wh) return null;
    return loadNodes(wh).find(n=>n.nodeId===nodeId) || null;
  }

  function getNodeByMarker(markerId, wh=WH){
    if(!wh) return null;
    const map = loadMap(wh);
    const nodeId = map[markerId];
    return nodeId ? getNodeById(nodeId, wh) : null;
  }

  function upsertNode(wh, node){
    const nodes = loadNodes(wh);
    const i = nodes.findIndex(n=>n.nodeId===node.nodeId);
    if(i>=0) nodes[i] = node; else nodes.unshift(node);
    saveNodes(wh, nodes);
  }

  function mapMarker(wh, markerId, nodeId){
    const map = loadMap(wh);
    map[markerId] = nodeId;
    saveMap(wh, map);
  }

  function emit(type, action, payload, meta){
    if(!window.ElvoraEvents?.emit) return null;
    return window.ElvoraEvents.emit(type, action, payload, meta);
  }

  // Core ops
  function learn(markerId, pose, info={}){
    const wh = requireWh();

    const existing = getNodeByMarker(markerId, wh);
    if(existing){
      // If same marker re-learned far away -> conflict
      const d = dist(existing.pose, pose);
      if(d > CONFLICT_DIST){
        const evt = emit("warehouse.node","conflict",{
          warehouseId: wh,
          markerId,
          nodeId: existing.nodeId,
          prevPose: existing.pose,
          newPose: pose,
          distance: d
        }, info);
        // keep node but flag conflict
        existing.conflict = { at: nowIso(), distance: d, newPose: pose };
        existing.lastSeen = nowIso();
        existing.confidence = Math.max(1, (existing.confidence||1));
        upsertNode(wh, existing);
        return { ok:false, conflict:true, node: existing, event: evt };
      }

      // otherwise treat as reinforce
      existing.pose = pose ?? existing.pose;
      existing.lastSeen = nowIso();
      existing.confidence = Math.min(9, (existing.confidence||1)+1);
      existing.source = { ...(existing.source||{}), ...(info.source||{}) };
      upsertNode(wh, existing);
      emit("warehouse.node","seen",{ warehouseId: wh, markerId, nodeId: existing.nodeId, pose: existing.pose }, info);
      return { ok:true, node: existing };
    }

    const nodeId = rid("N");
    const node = {
      warehouseId: wh,
      nodeId,
      markerId,
      zone: info.zone || "ambient",
      pose: pose || {x:0,y:0,rot:0},
      confidence: 1,
      createdAt: nowIso(),
      lastSeen: nowIso(),
      source: info.source || {}
    };
    upsertNode(wh, node);
    mapMarker(wh, markerId, nodeId);
    emit("warehouse.node","learn",{ warehouseId: wh, markerId, nodeId, pose: node.pose, zone: node.zone }, info);
    return { ok:true, node };
  }

  function seen(markerId, pose, info={}){
    const wh = requireWh();
    const node = getNodeByMarker(markerId, wh);
    if(!node){
      // if unseen, auto-learn (but tagged)
      return learn(markerId, pose, { ...info, auto:true });
    }
    node.pose = pose ?? node.pose;
    node.lastSeen = nowIso();
    node.confidence = Math.min(9, (node.confidence||1)+1);
    // clear conflict if we're back near original
    if(node.conflict){
      const d = dist(node.pose, node.conflict.newPose);
      if(d <= CONFLICT_DIST) node.conflict = null;
    }
    upsertNode(wh, node);
    emit("warehouse.node","seen",{ warehouseId: wh, markerId, nodeId: node.nodeId, pose: node.pose }, info);
    return { ok:true, node };
  }

  function move(markerId, newPose, info={}){
    const wh = requireWh();
    const node = getNodeByMarker(markerId, wh);
    if(!node) return { ok:false, error:"NODE_NOT_FOUND" };
    const prev = node.pose;
    node.pose = newPose || node.pose;
    node.lastSeen = nowIso();
    node.confidence = Math.min(9, (node.confidence||1)+1);
    upsertNode(wh, node);
    emit("warehouse.node","move",{ warehouseId: wh, markerId, nodeId: node.nodeId, prevPose: prev, newPose: node.pose }, info);
    return { ok:true, node };
  }

  function clearWarehouse(wh=WH){
    if(!wh) return;
    localStorage.removeItem(kNodes(wh));
    localStorage.removeItem(kMap(wh));
    emit("warehouse.node","clear",{ warehouseId: wh }, {});
  }

  function setWarehouse(warehouseId){
    WH = warehouseId;
    return WH;
  }

  window.ElvoraSpatial = {
    setWarehouse,
    getWarehouse: ()=>WH,
    getNodes,
    getNodeByMarker,
    getNodeById,
    learn,
    seen,
    move,
    clearWarehouse
  };
})();
