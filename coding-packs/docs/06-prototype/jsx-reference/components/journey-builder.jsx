/* ============================================================
   Journey Builder — Canvas 2D kéo-thả luồng CX đa bước
   (message → wait → condition → action) · hợp nhất Broadcast + Automation
   ============================================================ */
const { useState: useJB, useRef: useJBRef, useEffect: useJBEffect } = React;

const JB_NODE_SPECS = {
  trigger:   { label:'Trigger',     icon:'⚡', color:'#8B5CF6', bg:'#F3EFFE', group:'Kích hoạt' },
  message:   { label:'Message',     icon:'💬', color:'#2DC56A', bg:'#E8F8EE', group:'Giao tiếp' },
  wait:      { label:'Wait',        icon:'⏱',  color:'#F59E0B', bg:'#FEF3E2', group:'Dòng thời gian' },
  condition: { label:'Condition',   icon:'⇄',  color:'#2B9EF3', bg:'#E5F3FE', group:'Điều kiện' },
  split:     { label:'A/B Split',   icon:'⟋',  color:'#EC4899', bg:'#FDECF4', group:'Điều kiện' },
  action:    { label:'Action',      icon:'⚙',  color:'#0EA5E9', bg:'#E3F4FE', group:'Hành động' },
  ai:        { label:'Claude AI',   icon:'✦',  color:'#7C3AED', bg:'#F0EAFE', group:'Hành động' },
  webhook:   { label:'Webhook',     icon:'↗',  color:'#64748B', bg:'#EEF2F5', group:'Hành động' },
  goal:      { label:'Goal (end)',  icon:'◉',  color:'#16A34A', bg:'#D7F2DE', group:'Kết thúc' },
  exit:      { label:'Exit',        icon:'✕',  color:'#94A3B8', bg:'#F1F5F5', group:'Kết thúc' },
};

const JB_TRIGGER_TYPES = [
  { k:'contact_created',   l:'Contact mới được tạo' },
  { k:'tag_added',         l:'Tag được gắn vào liên hệ' },
  { k:'form_submit',       l:'Form được submit' },
  { k:'campaign_interact', l:'Khách mở / click chiến dịch' },
  { k:'order_placed',      l:'Đơn hàng được tạo' },
  { k:'conversation_idle', l:'Hội thoại không phản hồi > 24h' },
];

const JB_CHANNELS = [
  { k:'zalo',    l:'Zalo',      c:'#0068FF' },
  { k:'zns',     l:'Zalo ZNS',  c:'#0068FF' },
  { k:'fb',      l:'Messenger', c:'#006AFF' },
  { k:'email',   l:'Email',     c:'#EA580C' },
  { k:'sms',     l:'SMS',       c:'#16A34A' },
  { k:'viber',   l:'Viber',     c:'#7360F2' },
  { k:'whatsapp',l:'WhatsApp',  c:'#25D366' },
];

/* -------- default demo journey -------- */
const DEFAULT_JOURNEY = {
  name: 'Welcome · Khách đăng ký mới',
  status: 'draft', // draft | published | paused
  audience: 2840,
  nodes: [
    { id:'n1', type:'trigger',   x: 60,  y: 200, data:{ triggerType:'contact_created', label:'Khách mới đăng ký' } },
    { id:'n2', type:'message',   x: 320, y: 200, data:{ channel:'zalo', template:'Welcome Zalo · Chào mừng',   preview:'Chào {{name}} 👋 Cảm ơn bạn đã đăng ký AppChat!' } },
    { id:'n3', type:'wait',      x: 560, y: 200, data:{ amount:1, unit:'days', label:'Chờ 1 ngày' } },
    { id:'n4', type:'condition', x: 780, y: 200, data:{ field:'opened_message', op:'==', value:'true', label:'Đã đọc tin Welcome?' } },
    { id:'n5', type:'message',   x:1040, y: 80,  data:{ channel:'email', template:'Hướng dẫn bắt đầu',           preview:'3 bước để tận dụng AppChat trong 5 phút.' } },
    { id:'n6', type:'message',   x:1040, y: 320, data:{ channel:'zns',   template:'Nhắc lại ưu đãi',             preview:'{{name}} ơi, voucher 50k vẫn còn, dùng trước 7 ngày nhé!' } },
    { id:'n7', type:'wait',      x:1280, y: 320, data:{ amount:3, unit:'days' } },
    { id:'n8', type:'ai',        x:1500, y: 320, data:{ agent:'Sales Cowork', prompt:'Soạn tin cá nhân hoá nhắc gia hạn' } },
    { id:'n9', type:'goal',      x:1280, y: 80,  data:{ label:'Onboarded' } },
  ],
  edges: [
    { from:'n1', to:'n2' },
    { from:'n2', to:'n3' },
    { from:'n3', to:'n4' },
    { from:'n4', to:'n5', label:'Có', color:'#16A34A' },
    { from:'n4', to:'n6', label:'Không', color:'#E33F3F' },
    { from:'n5', to:'n9' },
    { from:'n6', to:'n7' },
    { from:'n7', to:'n8' },
  ],
};

const GRID = 20;
const NODE_W = 200;
const NODE_H = 92;

function JourneyBuilder({ onClose }) {
  const [j, setJ] = useJB(DEFAULT_JOURNEY);
  const [sel, setSel] = useJB('n4');
  const [zoom, setZoom] = useJB(0.9);
  const [pan, setPan] = useJB({ x: 40, y: 40 });
  const [dragNode, setDragNode] = useJB(null);       // {id, ox, oy}
  const [paletteDrag, setPaletteDrag] = useJB(null); // {type, cx, cy}
  const [connectFrom, setConnectFrom] = useJB(null); // source node id
  const [panning, setPanning] = useJB(false);
  const [tab, setTab] = useJB('build'); // build | analytics

  const canvasRef = useJBRef(null);

  const selectedNode = j.nodes.find(n => n.id === sel);

  /* ------------ pan / zoom ------------ */
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(2, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  };
  const onCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.id === 'jb-bg') {
      setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y });
      setSel(null);
    }
  };

  useJBEffect(() => {
    const mv = (e) => {
      if (panning) setPan({ x: panning.px + (e.clientX - panning.sx), y: panning.py + (e.clientY - panning.sy) });
      if (dragNode) {
        const rect = canvasRef.current.getBoundingClientRect();
        const nx = (e.clientX - rect.left - pan.x) / zoom - dragNode.ox;
        const ny = (e.clientY - rect.top  - pan.y) / zoom - dragNode.oy;
        setJ(prev => ({
          ...prev,
          nodes: prev.nodes.map(n => n.id === dragNode.id ? { ...n, x: Math.round(nx/GRID)*GRID, y: Math.round(ny/GRID)*GRID } : n)
        }));
      }
      if (paletteDrag) {
        setPaletteDrag(p => ({ ...p, cx: e.clientX, cy: e.clientY }));
      }
    };
    const up = (e) => {
      if (paletteDrag && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const nx = (e.clientX - rect.left - pan.x) / zoom - NODE_W/2;
          const ny = (e.clientY - rect.top  - pan.y) / zoom - NODE_H/2;
          const id = 'n' + (Date.now()%100000);
          const newNode = { id, type: paletteDrag.type, x: Math.round(nx/GRID)*GRID, y: Math.round(ny/GRID)*GRID, data: defaultData(paletteDrag.type) };
          setJ(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
          setSel(id);
        }
      }
      setPanning(false); setDragNode(null); setPaletteDrag(null);
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [panning, dragNode, paletteDrag, pan, zoom]);

  const defaultData = (type) => ({
    trigger:   { triggerType:'contact_created', label:'Trigger mới' },
    message:   { channel:'zalo', template:'Tin mới',      preview:'Nội dung tin nhắn…' },
    wait:      { amount:1, unit:'hours', label:'Chờ 1 giờ' },
    condition: { field:'tag', op:'contains', value:'vip', label:'Điều kiện' },
    split:     { split:50, label:'A/B Split 50/50' },
    action:    { actionType:'add_tag', value:'contacted', label:'Hành động' },
    ai:        { agent:'Claude Cowork', prompt:'…', label:'AI action' },
    webhook:   { url:'https://api.example.com/hook', label:'Webhook' },
    goal:      { label:'Mục tiêu' },
    exit:      { label:'Thoát journey' },
  }[type]);

  const onNodeMouseDown = (e, n) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const ox = (e.clientX - rect.left - pan.x) / zoom - n.x;
    const oy = (e.clientY - rect.top  - pan.y) / zoom - n.y;
    setDragNode({ id: n.id, ox, oy });
    setSel(n.id);
  };

  const updateSelected = (patch) => {
    setJ(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === sel ? { ...n, data: { ...n.data, ...patch } } : n) }));
  };
  const deleteSelected = () => {
    setJ(prev => ({ ...prev, nodes: prev.nodes.filter(n => n.id !== sel), edges: prev.edges.filter(e => e.from !== sel && e.to !== sel) }));
    setSel(null);
  };

  const startConnectFrom = (id) => setConnectFrom(id);
  const completeConnectTo = (id) => {
    if (connectFrom && connectFrom !== id && !j.edges.find(e => e.from === connectFrom && e.to === id)) {
      setJ(prev => ({ ...prev, edges: [...prev.edges, { from: connectFrom, to: id }] }));
    }
    setConnectFrom(null);
  };

  const groupedPalette = Object.entries(JB_NODE_SPECS).reduce((acc, [k, s]) => { (acc[s.group] = acc[s.group] || []).push([k, s]); return acc; }, {});

  // Analytics stats per node (fake)
  const stats = {
    n1: { in:2840, out:2840 }, n2: { in:2840, out:2712, rate:95.5 }, n3: { in:2712, out:2712 },
    n4: { in:2712, out:2712 }, n5: { in:1480, out:1480 }, n6: { in:1232, out:1232 },
    n7: { in:1232, out:1232 }, n8: { in:1232, out:980, rate:79.5 }, n9: { in:1480, out:1480 },
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#F7FAF7', zIndex:1100, display:'flex', flexDirection:'column' }}>

      {/* TOPBAR */}
      <div style={{ padding:'10px 18px', borderBottom:'1px solid var(--fill-04)', background:'white', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onClose} className="btn-icon"><Icon.ArrowLeft/></button>
        <div style={{ width:32, height:32, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white' }}>
          <Icon.Route style={{width:16, height:16}}/>
        </div>
        <div>
          <input value={j.name} onChange={e=>setJ(p=>({...p, name:e.target.value}))} style={{ fontSize:15, fontWeight:800, border:'none', outline:'none', background:'transparent', width:340, fontFamily:'inherit' }}/>
          <div style={{ fontSize:11, color:'var(--label-03)' }}>Journey Builder · {j.nodes.length} bước · {j.audience.toLocaleString()} khách đang chạy</div>
        </div>
        <div style={{ flex:1 }}/>

        {/* Tab switcher */}
        <div style={{ display:'flex', border:'1px solid var(--fill-04)', borderRadius:8, padding:2, background:'var(--fill-01)' }}>
          {[{k:'build', l:'🎨 Build'},{k:'analytics', l:'📊 Analytics'}].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:'5px 14px', fontSize:11.5, background: tab===t.k ? 'white' : 'transparent',
              border:'none', borderRadius:6, cursor:'pointer', fontWeight:600,
              color: tab===t.k ? 'var(--label-01)' : 'var(--label-03)', fontFamily:'inherit',
              boxShadow: tab===t.k ? '0 1px 3px rgba(0,0,0,.08)' : 'none'
            }}>{t.l}</button>
          ))}
        </div>

        <button className="btn btn-ghost btn-sm"><Icon.Eye/> Test</button>
        <button className="btn btn-ghost btn-sm"><Icon.Clock/> Versions</button>
        <button className="btn btn-ghost btn-sm"><Icon.Send style={{width:12, height:12}}/> Export</button>
        {j.status === 'published'
          ? <button className="btn btn-ghost btn-sm" style={{ color:'var(--warning,#F5A830)' }}>⏸ Pause</button>
          : <button className="btn btn-primary btn-sm" onClick={()=>setJ(p=>({...p, status:'published'}))}><Icon.Play style={{width:12, height:12}}/> Publish</button>}
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* LEFT PALETTE */}
        <div style={{ width:240, background:'white', borderRight:'1px solid var(--fill-04)', padding:14, overflow:'auto', flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'var(--label-03)', letterSpacing:'.08em', marginBottom:8 }}>NODES</div>
          {Object.entries(groupedPalette).map(([group, items]) => (
            <div key={group} style={{ marginBottom:14 }}>
              <div style={{ fontSize:10.5, color:'var(--label-03)', marginBottom:6, fontWeight:600 }}>{group}</div>
              {items.map(([k, s]) => (
                <div key={k}
                  onMouseDown={(e)=>setPaletteDrag({ type:k, cx: e.clientX, cy: e.clientY })}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8,
                    background: s.bg, marginBottom:5, cursor:'grab', border:'1px solid '+s.bg,
                    userSelect:'none', fontSize:12.5
                  }}>
                  <div style={{ width:22, height:22, borderRadius:5, background:'white', color:s.color, display:'grid', placeItems:'center', fontSize:12, fontWeight:700, boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>{s.icon}</div>
                  <span style={{ fontWeight:600, color:s.color }}>{s.label}</span>
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop:20, padding:12, background:'var(--pr-soft)', border:'1px dashed var(--pr-light-2)', borderRadius:10, fontSize:11, color:'var(--pr-dark-2)' }}>
            💡 <b>Tip:</b> Kéo node vào canvas. Hover node và kéo từ điểm chấm xanh để nối.
          </div>
        </div>

        {/* CANVAS */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', background:'#F0F3F2' }}>
          <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            onWheel={onWheel}
            style={{ width:'100%', height:'100%', position:'relative', cursor: panning ? 'grabbing' : 'default' }}
          >
            {/* Background grid */}
            <div id="jb-bg" style={{
              position:'absolute', inset:0,
              backgroundImage:
                `radial-gradient(circle, #D8DFDA 1px, transparent 1px)`,
              backgroundSize: `${GRID*zoom}px ${GRID*zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}/>

            {/* Transform wrapper */}
            <div style={{
              position:'absolute', left:pan.x, top:pan.y,
              transform:`scale(${zoom})`, transformOrigin:'0 0',
              width: 2400, height: 1400
            }}>
              {/* Edges */}
              <svg width="2400" height="1400" style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'visible' }}>
                <defs>
                  <marker id="jb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 Z" fill="#94A3B8"/>
                  </marker>
                  <marker id="jb-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 Z" fill="#16A34A"/>
                  </marker>
                  <marker id="jb-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 Z" fill="#E33F3F"/>
                  </marker>
                </defs>
                {j.edges.map((e, i) => {
                  const a = j.nodes.find(n => n.id === e.from);
                  const b = j.nodes.find(n => n.id === e.to);
                  if (!a || !b) return null;
                  const x1 = a.x + NODE_W, y1 = a.y + NODE_H/2;
                  const x2 = b.x,          y2 = b.y + NODE_H/2;
                  const dx = Math.max(40, Math.abs(x2-x1)/2);
                  const d = `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`;
                  const col = e.color || '#94A3B8';
                  const marker = col === '#16A34A' ? 'jb-arrow-green' : col === '#E33F3F' ? 'jb-arrow-red' : 'jb-arrow';
                  return (
                    <g key={i}>
                      <path d={d} fill="none" stroke={col} strokeWidth="2" markerEnd={`url(#${marker})`}/>
                      {e.label && (
                        <g transform={`translate(${(x1+x2)/2}, ${(y1+y2)/2 - 10})`}>
                          <rect x={-22} y={-10} width={44} height={20} rx={10} fill="white" stroke={col} strokeWidth={1.2}/>
                          <text x={0} y={4} textAnchor="middle" fontSize="11" fontWeight="700" fill={col}>{e.label}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {/* Pending connection */}
                {connectFrom && (() => {
                  const a = j.nodes.find(n => n.id === connectFrom);
                  if (!a) return null;
                  return <circle cx={a.x+NODE_W} cy={a.y+NODE_H/2} r="6" fill="#2DC56A" opacity="0.4"/>;
                })()}
              </svg>

              {/* Nodes */}
              {j.nodes.map(n => {
                const spec = JB_NODE_SPECS[n.type];
                const isSel = n.id === sel;
                const stat = stats[n.id];
                return (
                  <div
                    key={n.id}
                    onMouseDown={(e)=>onNodeMouseDown(e, n)}
                    onClick={()=>{
                      if (connectFrom) completeConnectTo(n.id);
                      else setSel(n.id);
                    }}
                    style={{
                      position:'absolute', left:n.x, top:n.y, width:NODE_W, minHeight:NODE_H,
                      background:'white', borderRadius:10,
                      border:'2px solid '+(isSel ? spec.color : 'transparent'),
                      boxShadow: isSel ? '0 6px 24px rgba(14,27,19,.14)' : '0 2px 10px rgba(14,27,19,.07)',
                      cursor:'grab', userSelect:'none'
                    }}>
                    {/* header */}
                    <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--fill-03)', display:'flex', alignItems:'center', gap:8, background: spec.bg, borderRadius:'8px 8px 0 0' }}>
                      <span style={{ width:18, height:18, borderRadius:4, background:'white', color:spec.color, display:'grid', placeItems:'center', fontSize:11, fontWeight:700 }}>{spec.icon}</span>
                      <span style={{ fontSize:11, fontWeight:800, color:spec.color, letterSpacing:'.04em', textTransform:'uppercase' }}>{spec.label}</span>
                      {tab==='analytics' && stat && (
                        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--label-02)', fontWeight:600 }}>{stat.in.toLocaleString()}</span>
                      )}
                    </div>
                    {/* body */}
                    <div style={{ padding:'8px 12px', fontSize:12, color:'var(--label-01)' }}>
                      {n.type === 'trigger'   && <NodeTriggerBody data={n.data}/>}
                      {n.type === 'message'   && <NodeMessageBody data={n.data}/>}
                      {n.type === 'wait'      && <NodeWaitBody data={n.data}/>}
                      {n.type === 'condition' && <NodeConditionBody data={n.data}/>}
                      {n.type === 'split'     && <NodeSplitBody data={n.data}/>}
                      {n.type === 'action'    && <NodeActionBody data={n.data}/>}
                      {n.type === 'ai'        && <NodeAiBody data={n.data}/>}
                      {n.type === 'webhook'   && <NodeWebhookBody data={n.data}/>}
                      {n.type === 'goal'      && <div style={{ fontWeight:700 }}>🎯 {n.data.label}</div>}
                      {n.type === 'exit'      && <div style={{ color:'var(--label-03)' }}>Exit journey</div>}
                    </div>
                    {/* analytics bar */}
                    {tab==='analytics' && stat && stat.rate != null && (
                      <div style={{ padding:'0 12px 8px', fontSize:10.5 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2, color:'var(--label-03)' }}>
                          <span>Conversion</span><b style={{ color:'var(--pr-dark-2)' }}>{stat.rate}%</b>
                        </div>
                        <div style={{ height:3, background:'var(--fill-03)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ width:`${stat.rate}%`, height:'100%', background:spec.color }}/>
                        </div>
                      </div>
                    )}
                    {/* connect handle */}
                    {n.type !== 'goal' && n.type !== 'exit' && (
                      <div
                        onMouseDown={(e)=>{ e.stopPropagation(); startConnectFrom(n.id); }}
                        onClick={(e)=>e.stopPropagation()}
                        title="Kéo để nối node khác"
                        style={{
                          position:'absolute', right:-8, top:NODE_H/2-7, width:14, height:14, borderRadius:7,
                          background: connectFrom === n.id ? spec.color : 'white',
                          border:'2px solid '+spec.color, cursor:'crosshair', zIndex:2
                        }}/>
                    )}
                    {n.type !== 'trigger' && (
                      <div style={{ position:'absolute', left:-6, top:NODE_H/2-5, width:10, height:10, borderRadius:5, background:'white', border:'2px solid var(--fill-04)' }}/>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Canvas controls */}
            <div style={{ position:'absolute', bottom:16, right:16, display:'flex', flexDirection:'column', gap:6, background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:6, boxShadow:'0 2px 10px rgba(14,27,19,.06)' }}>
              <button onClick={()=>setZoom(z=>Math.min(2, z*1.2))} className="btn-icon" title="Zoom in">+</button>
              <div style={{ textAlign:'center', fontSize:10, color:'var(--label-03)', fontWeight:600 }}>{Math.round(zoom*100)}%</div>
              <button onClick={()=>setZoom(z=>Math.max(0.4, z/1.2))} className="btn-icon" title="Zoom out">−</button>
              <div style={{ height:1, background:'var(--fill-04)', margin:'2px 0' }}/>
              <button onClick={()=>{ setZoom(0.9); setPan({x:40,y:40}); }} className="btn-icon" title="Fit">⊡</button>
            </div>

            {/* KPI ribbon (analytics mode) */}
            {tab === 'analytics' && (
              <div style={{ position:'absolute', top:16, left:16, right:16, display:'flex', gap:10 }}>
                {[
                  {l:'Đang chạy', v:'2.840', c:'var(--primary)'},
                  {l:'Đã hoàn tất', v:'1.480', c:'var(--success,#2DC56A)'},
                  {l:'Đã thoát', v:'612', c:'var(--warning,#F5A830)'},
                  {l:'Conversion toàn luồng', v:'52%', c:'var(--info,#2B9EF3)'},
                  {l:'Doanh thu attribuated', v:'124M₫', c:'var(--pr-dark-2)'},
                ].map(k => (
                  <div key={k.l} style={{ flex:1, background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:'8px 12px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                    <div style={{ fontSize:10.5, color:'var(--label-03)' }}>{k.l}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:k.c, lineHeight:1.1 }}>{k.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT INSPECTOR */}
        <div style={{ width:320, background:'white', borderLeft:'1px solid var(--fill-04)', overflow:'auto', flexShrink:0 }}>
          {selectedNode ? (
            <JBInspector node={selectedNode} onChange={updateSelected} onDelete={deleteSelected}/>
          ) : (
            <JBJourneySettings j={j} onChange={(patch)=>setJ(p=>({...p, ...patch}))}/>
          )}
        </div>
      </div>

      {/* Palette drag ghost */}
      {paletteDrag && (
        <div style={{
          position:'fixed', left: paletteDrag.cx - 100, top: paletteDrag.cy - 30,
          width: NODE_W, padding:'8px 12px', background: JB_NODE_SPECS[paletteDrag.type].bg,
          border:'1.5px dashed '+JB_NODE_SPECS[paletteDrag.type].color, borderRadius:10,
          pointerEvents:'none', zIndex:1200, opacity:.9, fontSize:12, fontWeight:700, color: JB_NODE_SPECS[paletteDrag.type].color
        }}>
          {JB_NODE_SPECS[paletteDrag.type].icon} {JB_NODE_SPECS[paletteDrag.type].label}
        </div>
      )}
    </div>
  );
}

/* ----------- node body renderers ----------- */
function NodeTriggerBody({ data }) {
  const t = JB_TRIGGER_TYPES.find(x=>x.k===data.triggerType);
  return (
    <>
      <div style={{ fontWeight:700 }}>{data.label || 'Trigger'}</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2 }}>{t ? t.l : data.triggerType}</div>
    </>
  );
}
function NodeMessageBody({ data }) {
  const ch = JB_CHANNELS.find(c=>c.k===data.channel);
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
        <span style={{ width:5, height:5, borderRadius:3, background: ch?.c || '#94A3B8' }}/>
        <span style={{ fontSize:10.5, color:'var(--label-03)', fontWeight:600 }}>{ch ? ch.l : data.channel}</span>
      </div>
      <div style={{ fontWeight:700, fontSize:12, lineHeight:1.3 }}>{data.template}</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{data.preview}</div>
    </>
  );
}
function NodeWaitBody({ data }) {
  const unitVN = {minutes:'phút', hours:'giờ', days:'ngày', weeks:'tuần'}[data.unit] || data.unit;
  return (
    <>
      <div style={{ fontWeight:700 }}>Chờ {data.amount} {unitVN}</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2 }}>Pause trước bước tiếp theo</div>
    </>
  );
}
function NodeConditionBody({ data }) {
  return (
    <>
      <div style={{ fontWeight:700 }}>{data.label || 'Điều kiện'}</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2, fontFamily:'ui-monospace, monospace' }}>{data.field} {data.op} {data.value}</div>
    </>
  );
}
function NodeSplitBody({ data }) {
  return (
    <>
      <div style={{ fontWeight:700 }}>A/B Split</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2 }}>{data.split}% · {100-data.split}%</div>
    </>
  );
}
function NodeActionBody({ data }) {
  const map = {add_tag:'Gắn tag', remove_tag:'Gỡ tag', update_field:'Cập nhật field', assign:'Gán agent', create_deal:'Tạo deal'};
  return (
    <>
      <div style={{ fontWeight:700 }}>{map[data.actionType] || data.actionType}</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2, fontFamily:'ui-monospace, monospace' }}>{data.value}</div>
    </>
  );
}
function NodeAiBody({ data }) {
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
        <span style={{ fontSize:10.5, color:'#7C3AED', fontWeight:700 }}>{data.agent}</span>
      </div>
      <div style={{ fontSize:11, color:'var(--label-02)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{data.prompt || 'Claude AI prompt…'}</div>
    </>
  );
}
function NodeWebhookBody({ data }) {
  return (
    <>
      <div style={{ fontWeight:700 }}>POST webhook</div>
      <div style={{ fontSize:10, color:'var(--label-03)', marginTop:2, fontFamily:'ui-monospace, monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{data.url}</div>
    </>
  );
}

/* ----------- inspectors ----------- */
function JBField({ label, children, hint }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--label-02)', marginBottom:5 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:4 }}>{hint}</div>}
    </div>
  );
}
const jbInput = { width:'100%', padding:'7px 9px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:12, fontFamily:'inherit', background:'white' };

function JBInspector({ node, onChange, onDelete }) {
  const spec = JB_NODE_SPECS[node.type];
  return (
    <div>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10, background: spec.bg }}>
        <span style={{ width:28, height:28, borderRadius:7, background:'white', color:spec.color, display:'grid', placeItems:'center', fontWeight:700 }}>{spec.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:spec.color }}>{spec.label}</div>
          <div style={{ fontSize:10.5, color:'var(--label-03)' }}>#{node.id} · {spec.group}</div>
        </div>
        <button onClick={onDelete} className="btn-icon" style={{ color:'var(--risk,#E33F3F)' }} title="Xoá node">
          <Icon.Trash style={{width:14, height:14}}/>
        </button>
      </div>
      <div style={{ padding:16 }}>
        {node.type === 'trigger' && (
          <>
            <JBField label="Loại trigger">
              <select value={node.data.triggerType} onChange={e=>onChange({ triggerType: e.target.value })} style={jbInput}>
                {JB_TRIGGER_TYPES.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
              </select>
            </JBField>
            <JBField label="Label hiển thị"><input value={node.data.label||''} onChange={e=>onChange({ label: e.target.value })} style={jbInput}/></JBField>
          </>
        )}
        {node.type === 'message' && (
          <>
            <JBField label="Kênh gửi">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
                {JB_CHANNELS.map(c => (
                  <button key={c.k} onClick={()=>onChange({ channel: c.k })} style={{
                    padding:'6px 8px', fontSize:10.5, borderRadius:6, cursor:'pointer',
                    border:'1px solid '+(node.data.channel===c.k ? c.c : 'var(--fill-04)'),
                    background: node.data.channel===c.k ? c.c+'15' : 'white',
                    color: node.data.channel===c.k ? c.c : 'var(--label-02)',
                    fontWeight:600, fontFamily:'inherit'
                  }}>{c.l}</button>
                ))}
              </div>
            </JBField>
            <JBField label="Template">
              <select style={jbInput} value={node.data.template} onChange={e=>onChange({ template: e.target.value })}>
                <option>Welcome Zalo · Chào mừng</option>
                <option>Hướng dẫn bắt đầu</option>
                <option>Nhắc lại ưu đãi</option>
                <option>Abandoned cart</option>
                <option>+ Tạo template mới…</option>
              </select>
            </JBField>
            <JBField label="Nội dung preview" hint="Biến {{name}}, {{order_id}} tự điền từ profile">
              <textarea value={node.data.preview} onChange={e=>onChange({ preview: e.target.value })}
                style={{ ...jbInput, minHeight:84, fontFamily:'inherit', resize:'vertical' }}/>
            </JBField>
          </>
        )}
        {node.type === 'wait' && (
          <>
            <JBField label="Thời gian chờ">
              <div style={{ display:'flex', gap:8 }}>
                <input type="number" value={node.data.amount} onChange={e=>onChange({ amount: +e.target.value })} style={{ ...jbInput, width:80 }}/>
                <select value={node.data.unit} onChange={e=>onChange({ unit: e.target.value })} style={{ ...jbInput, flex:1 }}>
                  <option value="minutes">Phút</option>
                  <option value="hours">Giờ</option>
                  <option value="days">Ngày</option>
                  <option value="weeks">Tuần</option>
                </select>
              </div>
            </JBField>
            <JBField label="Exit điều kiện (tuỳ chọn)" hint="Thoát wait sớm nếu khách tự phản hồi">
              <select style={jbInput} defaultValue="none">
                <option value="none">Không</option>
                <option value="replied">Khách reply bất kỳ kênh</option>
                <option value="opened">Khách mở message</option>
                <option value="converted">Đạt mục tiêu</option>
              </select>
            </JBField>
          </>
        )}
        {node.type === 'condition' && (
          <>
            <JBField label="Label"><input value={node.data.label||''} onChange={e=>onChange({label:e.target.value})} style={jbInput}/></JBField>
            <JBField label="Điều kiện">
              <div style={{ display:'flex', gap:6 }}>
                <select value={node.data.field} onChange={e=>onChange({field:e.target.value})} style={{ ...jbInput, flex:1 }}>
                  <option value="tag">tag</option>
                  <option value="opened_message">opened_message</option>
                  <option value="clicked">clicked</option>
                  <option value="purchased">purchased</option>
                  <option value="score">claude_score</option>
                </select>
                <select value={node.data.op} onChange={e=>onChange({op:e.target.value})} style={{ ...jbInput, width:70 }}>
                  <option value="==">=</option>
                  <option value="!=">≠</option>
                  <option value=">">{'>'}</option>
                  <option value="<">{'<'}</option>
                  <option value="contains">has</option>
                </select>
                <input value={node.data.value} onChange={e=>onChange({value:e.target.value})} style={{ ...jbInput, flex:1 }}/>
              </div>
            </JBField>
            <div style={{ fontSize:11, color:'var(--label-03)', padding:10, background:'var(--fill-02)', borderRadius:8 }}>
              Tự sinh 2 nhánh <b>Có</b> (xanh) và <b>Không</b> (đỏ). Kéo từ handle để nối đích.
            </div>
          </>
        )}
        {node.type === 'ai' && (
          <>
            <JBField label="Agent">
              <select value={node.data.agent} onChange={e=>onChange({agent:e.target.value})} style={jbInput}>
                <option>Claude Cowork · Sales</option>
                <option>Claude Cowork · Support</option>
                <option>Claude Cowork · Sourcing</option>
                <option>Claude Haiku 4.5 (raw)</option>
              </select>
            </JBField>
            <JBField label="Prompt" hint="Dùng {{variables}} từ bước trước">
              <textarea value={node.data.prompt} onChange={e=>onChange({prompt:e.target.value})} style={{ ...jbInput, minHeight:96, fontFamily:'inherit' }}/>
            </JBField>
          </>
        )}
        {node.type === 'action' && (
          <>
            <JBField label="Hành động">
              <select value={node.data.actionType} onChange={e=>onChange({actionType:e.target.value})} style={jbInput}>
                <option value="add_tag">Gắn tag</option>
                <option value="remove_tag">Gỡ tag</option>
                <option value="update_field">Cập nhật field</option>
                <option value="assign">Gán agent</option>
                <option value="create_deal">Tạo deal</option>
              </select>
            </JBField>
            <JBField label="Giá trị"><input value={node.data.value} onChange={e=>onChange({value:e.target.value})} style={jbInput}/></JBField>
          </>
        )}
        {node.type === 'split' && (
          <JBField label={`A/B Split · ${node.data.split}% / ${100-node.data.split}%`}>
            <input type="range" min="10" max="90" value={node.data.split} onChange={e=>onChange({split:+e.target.value})} style={{ width:'100%' }}/>
          </JBField>
        )}
        {node.type === 'webhook' && (
          <JBField label="URL"><input value={node.data.url} onChange={e=>onChange({url:e.target.value})} style={jbInput}/></JBField>
        )}
        {(node.type === 'goal' || node.type === 'exit') && (
          <JBField label="Label"><input value={node.data.label||''} onChange={e=>onChange({label:e.target.value})} style={jbInput}/></JBField>
        )}
      </div>
    </div>
  );
}

function JBJourneySettings({ j, onChange }) {
  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Cài đặt Journey</div>
      <JBField label="Tên journey"><input value={j.name} onChange={e=>onChange({name:e.target.value})} style={jbInput}/></JBField>
      <JBField label="Audience mặc định">
        <select style={jbInput} defaultValue="all_new">
          <option value="all_new">Tất cả khách đăng ký mới</option>
          <option value="vip">VIP segment</option>
          <option value="cart_abandon">Cart abandoners</option>
          <option value="custom">+ Segment tuỳ chỉnh</option>
        </select>
      </JBField>
      <JBField label="Khung giờ gửi" hint="Journey chỉ chạy trong khoảng này">
        <div style={{ display:'flex', gap:6 }}>
          <input defaultValue="08:00" style={jbInput}/><input defaultValue="22:00" style={jbInput}/>
        </div>
      </JBField>
      <JBField label="Số lần tối đa cho mỗi khách">
        <select style={jbInput}><option>1 lần / khách</option><option>Mỗi 30 ngày</option><option>Không giới hạn</option></select>
      </JBField>
      <JBField label="Mục tiêu (goal)" hint="Journey thành công khi khách chạm goal">
        <select style={jbInput}><option>Onboarded</option><option>First purchase</option><option>Renewal</option></select>
      </JBField>

      <div style={{ borderTop:'1px solid var(--fill-04)', margin:'14px -16px', paddingTop:14 }}/>

      <div style={{ padding:12, background:'var(--pr-soft)', border:'1px solid var(--pr-light-2)', borderRadius:8, fontSize:11.5, color:'var(--pr-dark-2)' }}>
        <b>Tích hợp:</b> Journey này kế thừa template từ <b>Template Studio</b> và trigger từ <b>Automation workflows</b>.
      </div>
    </div>
  );
}

window.JourneyBuilder = JourneyBuilder;
