/* Dashboard Builder — drag-drop tile customizer + saved views + share */
const { useState: useDB, useRef: useDBRef, useEffect: useDBE } = React;

/* Available widget catalog */
const WIDGET_CATALOG = [
  { g:'KPI', items:[
    { id:'kpi-conv',     t:'Hội thoại live',     icon:'Chat',     w:1, h:1, color:'#2DC56A', desc:'Số hội thoại đang mở' },
    { id:'kpi-reply',    t:'First-reply time',   icon:'Clock',    w:1, h:1, color:'#0EA5E9', desc:'Thời gian phản hồi TB' },
    { id:'kpi-csat',     t:'CSAT',               icon:'Heart',    w:1, h:1, color:'#F59E0B', desc:'Mức hài lòng KH' },
    { id:'kpi-revenue',  t:'Doanh thu hôm nay',  icon:'DollarSign', w:1, h:1, color:'#22C55E', desc:'GMV trong ngày' },
    { id:'kpi-orders',   t:'Đơn chốt',           icon:'ShoppingCart', w:1, h:1, color:'#A855F7', desc:'Số đơn closed-won' },
    { id:'kpi-sla',      t:'SLA breach',         icon:'AlertTri', w:1, h:1, color:'#EF4444', desc:'Hội thoại vượt SLA' },
  ]},
  { g:'Charts', items:[
    { id:'ch-volume',    t:'Hội thoại theo giờ', icon:'Activity', w:2, h:2, color:'#2DC56A', desc:'Line chart 24h' },
    { id:'ch-channel',   t:'Chia theo kênh',     icon:'Globe',    w:2, h:2, color:'#0EA5E9', desc:'Donut chart 6 kênh' },
    { id:'ch-funnel',    t:'Funnel chốt đơn',    icon:'Filter',   w:2, h:2, color:'#A855F7', desc:'Lead → Won funnel' },
    { id:'ch-heatmap',   t:'Heatmap giờ vàng',   icon:'Grid',     w:3, h:2, color:'#F59E0B', desc:'7×24 heatmap' },
  ]},
  { g:'Lists', items:[
    { id:'ls-queue',     t:'Hàng chờ trực',      icon:'Inbox',    w:2, h:2, color:'#2DC56A', desc:'Top hội thoại chờ' },
    { id:'ls-team',      t:'Top agent',          icon:'Users',    w:2, h:2, color:'#0EA5E9', desc:'Bảng xếp hạng team' },
    { id:'ls-deals',     t:'Deals nóng',         icon:'Target',   w:2, h:2, color:'#22C55E', desc:'Deals giai đoạn cuối' },
    { id:'ls-orders',    t:'Đơn xuyên biên',     icon:'Package',  w:2, h:2, color:'#A855F7', desc:'Tracking shipment' },
  ]},
  { g:'AI', items:[
    { id:'ai-insight',   t:'Claude Cowork insight', icon:'Sparkles', w:2, h:1, color:'#8B5CF6', desc:'AI-generated tips' },
    { id:'ai-trend',     t:'Trending topics',    icon:'TrendingUp', w:2, h:1, color:'#EC4899', desc:'NLP topic clustering' },
    { id:'ai-sentiment', t:'Sentiment radar',    icon:'Heart',    w:1, h:2, color:'#F59E0B', desc:'KH happy/angry/neutral' },
  ]},
];

const DEFAULT_LAYOUT = [
  { id:'kpi-conv',  x:0, y:0, w:1, h:1 },
  { id:'kpi-reply', x:1, y:0, w:1, h:1 },
  { id:'kpi-csat',  x:2, y:0, w:1, h:1 },
  { id:'kpi-revenue', x:3, y:0, w:1, h:1 },
  { id:'ch-volume', x:0, y:1, w:2, h:2 },
  { id:'ch-channel',x:2, y:1, w:2, h:2 },
  { id:'ls-queue',  x:0, y:3, w:2, h:2 },
  { id:'ai-insight',x:2, y:3, w:2, h:1 },
  { id:'kpi-orders',x:2, y:4, w:1, h:1 },
  { id:'kpi-sla',   x:3, y:4, w:1, h:1 },
];

const SAVED_VIEWS = [
  { id:'v1', name:'Operations Live',  owner:'Trâm', shared:true,  pinned:true,  cnt:18, color:'#2DC56A' },
  { id:'v2', name:'Sales Pipeline',   owner:'Vy',   shared:true,  pinned:false, cnt:12, color:'#0EA5E9' },
  { id:'v3', name:'AI Performance',   owner:'Trâm', shared:false, pinned:false, cnt:8,  color:'#8B5CF6' },
  { id:'v4', name:'Cross-border ops', owner:'Khoa', shared:true,  pinned:false, cnt:14, color:'#F59E0B' },
  { id:'v5', name:'Marketing Pulse',  owner:'Hà',   shared:true,  pinned:false, cnt:10, color:'#EC4899' },
];

const DB_TEAM = [
  { name:'Trâm', avatar:'#2DC56A' },
  { name:'Vy',   avatar:'#0EA5E9' },
  { name:'Khoa', avatar:'#F59E0B' },
  { name:'Hà',   avatar:'#EC4899' },
  { name:'Long', avatar:'#8B5CF6' },
];

function DashboardBuilder({ onClose }) {
  const [tab, setTab] = useDB('canvas'); // canvas | views | share | templates
  const [layout, setLayout] = useDB(DEFAULT_LAYOUT);
  const [activeView, setActiveView] = useDB('v1');
  const [selectedTile, setSelectedTile] = useDB(null);
  const [shareModalOpen, setShareModalOpen] = useDB(false);
  const [savedToast, setSavedToast] = useDB(false);

  const cat = WIDGET_CATALOG.flatMap(g => g.items);
  const findWidget = (id) => cat.find(w => w.id === id);
  const dragRef = useDBRef({});

  /* drag from catalog → canvas */
  const startDragFromCatalog = (e, widget) => {
    dragRef.current = { type:'new', widget };
    e.dataTransfer.effectAllowed = 'copy';
  };

  /* drag tile to reorder */
  const startDragTile = (e, tileId) => {
    dragRef.current = { type:'move', tileId };
    e.dataTransfer.effectAllowed = 'move';
  };

  const onCanvasDrop = (e, x, y) => {
    e.preventDefault();
    const d = dragRef.current;
    if (d.type === 'new') {
      const newTile = { id: d.widget.id + '-' + Date.now(), w: d.widget.w, h: d.widget.h, x, y, _ref: d.widget.id };
      setLayout([...layout, newTile]);
    } else if (d.type === 'move') {
      setLayout(layout.map(t => t.id === d.tileId ? {...t, x, y} : t));
    }
    dragRef.current = {};
  };

  const removeTile = (id) => setLayout(layout.filter(t => t.id !== id));
  const resizeTile = (id, dw, dh) => setLayout(layout.map(t => t.id === id ? {...t, w: Math.max(1, Math.min(4, t.w + dw)), h: Math.max(1, Math.min(3, t.h + dh))} : t));

  const saveLayout = () => { setSavedToast(true); setTimeout(()=>setSavedToast(false), 2200); };

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(8,17,12,0.78)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', flexDirection:'column'}}>
      {/* HEADER */}
      <div style={{padding:'12px 22px', display:'flex', alignItems:'center', gap:14, background:'white', borderBottom:'1px solid var(--fill-04)'}}>
        <div style={{width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, #0B3D2C, #2DC56A)', display:'grid', placeItems:'center', color:'white'}}>
          <Icon.Grid/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11, fontWeight:600, color:'var(--label-03)', letterSpacing:'.05em', textTransform:'uppercase'}}>Dashboard Studio</div>
          <div style={{fontSize:16, fontWeight:700}}>Tuỳ chỉnh layout · Lưu view · Chia sẻ team</div>
        </div>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:9, gap:2}}>
          {[
            {k:'canvas', l:'Canvas', i:Icon.Edit},
            {k:'views',  l:'Views (5)', i:Icon.Layers || Icon.Folder},
            {k:'share',  l:'Chia sẻ', i:Icon.Users},
            {k:'templates', l:'Templates', i:Icon.Sparkles},
          ].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              display:'flex', alignItems:'center', gap:6,
              background: tab===t.k?'white':'transparent',
              color: tab===t.k?'var(--label-01)':'var(--label-02)',
              boxShadow: tab===t.k?'var(--shadow-sm)':'none'
            }}>
              <t.i style={{width:14, height:14}}/> {t.l}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={saveLayout}><Icon.Check/> Lưu</button>
        <button className="btn btn-primary btn-sm" onClick={()=>setShareModalOpen(true)}><Icon.Send/> Publish & chia sẻ</button>
        <button className="btn-icon" onClick={onClose} style={{marginLeft:4}}><Icon.Close/></button>
      </div>

      {/* BODY */}
      <div style={{flex:1, display:'flex', overflow:'hidden'}}>
        {tab === 'canvas' && <CanvasTab
          layout={layout} setLayout={setLayout}
          findWidget={findWidget}
          startDragFromCatalog={startDragFromCatalog}
          startDragTile={startDragTile}
          onCanvasDrop={onCanvasDrop}
          removeTile={removeTile} resizeTile={resizeTile}
          selectedTile={selectedTile} setSelectedTile={setSelectedTile}
        />}
        {tab === 'views' && <ViewsTab activeView={activeView} setActiveView={setActiveView}/>}
        {tab === 'share' && <ShareTab/>}
        {tab === 'templates' && <TemplatesTab onApply={(l)=>{setLayout(l); setTab('canvas');}}/>}
      </div>

      {savedToast && <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, boxShadow:'var(--shadow-lg)', display:'flex', alignItems:'center', gap:8, zIndex:1100}}>
        <Icon.Check style={{width:16, height:16, color:'#4ADE80'}}/> Layout đã được lưu — đồng bộ tới 12 thành viên
      </div>}

      {shareModalOpen && <ShareModal onClose={()=>setShareModalOpen(false)}/>}
    </div>
  );
}

/* ====== CANVAS TAB ====== */
function CanvasTab({ layout, setLayout, findWidget, startDragFromCatalog, startDragTile, onCanvasDrop, removeTile, resizeTile, selectedTile, setSelectedTile }) {
  return (
    <>
      {/* LEFT: Widget catalog */}
      <div style={{width:280, background:'white', borderRight:'1px solid var(--fill-04)', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--fill-04)'}}>
          <div style={{fontSize:13, fontWeight:700}}>Thư viện widgets</div>
          <div style={{fontSize:11, color:'var(--label-03)', marginTop:2}}>Kéo widget vào canvas bên phải</div>
          <div style={{position:'relative', marginTop:10}}>
            <Icon.Search style={{position:'absolute', top:8, left:9, width:14, height:14, color:'var(--label-03)'}}/>
            <input placeholder="Tìm widget..." style={{width:'100%', padding:'7px 10px 7px 30px', border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12, outline:'none'}}/>
          </div>
        </div>
        <div className="scroll" style={{flex:1, overflowY:'auto', padding:'10px 14px'}}>
          {WIDGET_CATALOG.map(g => (
            <div key={g.g} style={{marginBottom:14}}>
              <div style={{fontSize:10, fontWeight:700, color:'var(--label-03)', letterSpacing:'.06em', textTransform:'uppercase', padding:'6px 4px'}}>{g.g} · {g.items.length}</div>
              {g.items.map(w => (
                <div key={w.id} draggable onDragStart={(e)=>startDragFromCatalog(e, w)}
                  style={{padding:'9px 10px', display:'flex', alignItems:'center', gap:9, borderRadius:7, cursor:'grab', marginBottom:3, background:'var(--fill-02)', border:'1px solid transparent'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='white'; e.currentTarget.style.border='1px solid var(--fill-04)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='var(--fill-02)'; e.currentTarget.style.border='1px solid transparent';}}
                >
                  <div style={{width:28, height:28, borderRadius:6, background:w.color+'18', display:'grid', placeItems:'center', color:w.color, flexShrink:0}}>
                    {Icon[w.icon] ? React.createElement(Icon[w.icon], {style:{width:14, height:14}}) : <Icon.Grid style={{width:14, height:14}}/>}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12, fontWeight:600}}>{w.t}</div>
                    <div style={{fontSize:10, color:'var(--label-03)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{w.desc}</div>
                  </div>
                  <div style={{fontSize:9, fontWeight:600, color:'var(--label-03)', background:'var(--fill-03)', padding:'2px 5px', borderRadius:4}}>{w.w}×{w.h}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: Canvas grid */}
      <div className="scroll" style={{flex:1, padding:24, overflow:'auto', background:'var(--fill-02)', backgroundImage:'radial-gradient(circle, rgba(11,61,44,.05) 1px, transparent 1px)', backgroundSize:'24px 24px'}}>
        <div style={{maxWidth:1100, margin:'0 auto'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <span style={{fontSize:12, fontWeight:600, color:'var(--label-02)'}}>Grid 4 cột × auto</span>
            <span style={{flex:1}}/>
            <span style={{fontSize:11, color:'var(--label-03)', display:'flex', alignItems:'center', gap:5}}>
              <span style={{width:8, height:8, borderRadius:4, background:'#2DC56A'}}/> {layout.length} tiles · {layout.reduce((s,t)=>s+t.w*t.h, 0)} units
            </span>
            <button className="btn-ghost-xs" onClick={()=>setLayout(DEFAULT_LAYOUT)}>Reset</button>
            <button className="btn-ghost-xs" onClick={()=>setLayout([])}>Xoá tất cả</button>
          </div>
          <CanvasGrid layout={layout} findWidget={findWidget} startDragTile={startDragTile} onCanvasDrop={onCanvasDrop} removeTile={removeTile} resizeTile={resizeTile} selectedTile={selectedTile} setSelectedTile={setSelectedTile}/>
        </div>
      </div>

      {/* RIGHT: Tile inspector */}
      <div style={{width:300, background:'white', borderLeft:'1px solid var(--fill-04)', overflow:'auto'}}>
        {selectedTile ? <TileInspector tile={layout.find(t=>t.id===selectedTile)} findWidget={findWidget} layout={layout} setLayout={setLayout} resizeTile={resizeTile} removeTile={removeTile} onClose={()=>setSelectedTile(null)}/> :
          <div style={{padding:24, textAlign:'center', color:'var(--label-03)'}}>
            <div style={{width:56, height:56, borderRadius:14, background:'var(--fill-02)', display:'grid', placeItems:'center', margin:'24px auto 12px'}}>
              <Icon.Edit style={{width:24, height:24, color:'var(--label-03)'}}/>
            </div>
            <div style={{fontSize:13, fontWeight:600, color:'var(--label-02)'}}>Chưa chọn widget</div>
            <div style={{fontSize:11, marginTop:4, lineHeight:1.5}}>Click vào tile bất kỳ trên canvas để chỉnh sửa kích thước, màu, data source và filter.</div>
          </div>}
      </div>
    </>
  );
}

/* ====== CANVAS GRID ====== */
function CanvasGrid({ layout, findWidget, startDragTile, onCanvasDrop, removeTile, resizeTile, selectedTile, setSelectedTile }) {
  const COLS = 4, CELL = 168, GAP = 10;
  const maxY = Math.max(6, ...layout.map(t => t.y + t.h)) + 1;
  return (
    <div style={{position:'relative', display:'grid', gridTemplateColumns:`repeat(${COLS}, ${CELL}px)`, gridAutoRows:`${CELL}px`, gap:GAP, minHeight:CELL*maxY}}>
      {/* Drop zones */}
      {Array.from({length: COLS * maxY}).map((_, i) => {
        const x = i % COLS, y = Math.floor(i / COLS);
        return <div key={'dz-'+i}
          onDragOver={(e)=>{e.preventDefault(); e.currentTarget.style.background='rgba(45,197,106,.12)'; e.currentTarget.style.borderColor='var(--primary)';}}
          onDragLeave={(e)=>{e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='var(--fill-04)';}}
          onDrop={(e)=>{e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='var(--fill-04)'; onCanvasDrop(e, x, y);}}
          style={{gridColumn: x+1, gridRow: y+1, border:'1.5px dashed var(--fill-04)', borderRadius:8, transition:'all .15s'}}
        />;
      })}
      {/* Tiles */}
      {layout.map(tile => {
        const w = findWidget(tile._ref || tile.id.split('-')[0] + '-' + tile.id.split('-')[1]) || findWidget(tile.id);
        if (!w) return null;
        const isSel = selectedTile === tile.id;
        return (
          <div key={tile.id} draggable onDragStart={(e)=>startDragTile(e, tile.id)} onClick={()=>setSelectedTile(tile.id)}
            style={{
              gridColumn: `${tile.x+1} / span ${tile.w}`, gridRow: `${tile.y+1} / span ${tile.h}`,
              background:'white', borderRadius:10, padding:14, cursor:'grab',
              border: isSel ? '2px solid var(--primary)' : '1px solid var(--fill-04)',
              boxShadow: isSel ? '0 0 0 4px rgba(45,197,106,.15)' : 'var(--shadow-sm)',
              display:'flex', flexDirection:'column', position:'relative', overflow:'hidden'
            }}>
            <TilePreview widget={w} tile={tile}/>
            {/* Hover toolbar */}
            <div className="tile-tools" style={{position:'absolute', top:6, right:6, display:'flex', gap:3, opacity: isSel?1:0, transition:'opacity .15s', background:'rgba(255,255,255,.94)', padding:3, borderRadius:6, boxShadow:'var(--shadow-sm)'}}>
              <button onClick={(e)=>{e.stopPropagation(); resizeTile(tile.id, -1, 0);}} className="btn-icon-xs" title="Hẹp">−</button>
              <button onClick={(e)=>{e.stopPropagation(); resizeTile(tile.id, 1, 0);}} className="btn-icon-xs" title="Rộng">+</button>
              <button onClick={(e)=>{e.stopPropagation(); resizeTile(tile.id, 0, 1);}} className="btn-icon-xs" title="Cao">↕</button>
              <button onClick={(e)=>{e.stopPropagation(); removeTile(tile.id);}} className="btn-icon-xs" style={{color:'var(--danger)'}}><Icon.Close style={{width:11, height:11}}/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ====== TILE PREVIEW ====== */
function TilePreview({ widget, tile }) {
  const I = Icon[widget.icon] || Icon.Grid;
  if (widget.id.startsWith('kpi-')) {
    return (
      <>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:28, height:28, borderRadius:7, background:widget.color+'18', display:'grid', placeItems:'center', color:widget.color}}><I style={{width:14, height:14}}/></div>
          <span style={{fontSize:11, color:'var(--label-03)', fontWeight:600}}>{widget.t}</span>
        </div>
        <div style={{fontSize:32, fontWeight:700, marginTop:'auto', letterSpacing:'-0.02em'}}>{Math.floor(Math.random()*900+100)}</div>
        <div style={{fontSize:10, color:widget.color, fontWeight:600}}>↑ +{Math.floor(Math.random()*40+5)}% vs hôm qua</div>
      </>
    );
  }
  if (widget.id.startsWith('ch-volume')) {
    const pts = Array.from({length:14}, (_,i) => 30 + Math.sin(i*0.7)*15 + Math.random()*15);
    const max = Math.max(...pts);
    const path = pts.map((p,i) => `${i===0?'M':'L'} ${i*(100/13)} ${100 - (p/max)*100}`).join(' ');
    return (
      <>
        <div style={{fontSize:12, fontWeight:700}}>{widget.t}</div>
        <div style={{fontSize:10, color:'var(--label-03)', marginBottom:6}}>24h gần nhất · {pts.length} điểm</div>
        <div style={{flex:1, position:'relative'}}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:'100%', height:'100%'}}>
            <defs><linearGradient id="grd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={widget.color} stopOpacity=".3"/><stop offset="1" stopColor={widget.color} stopOpacity="0"/></linearGradient></defs>
            <path d={path + ` L 100 100 L 0 100 Z`} fill="url(#grd)"/>
            <path d={path} stroke={widget.color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke"/>
          </svg>
        </div>
      </>
    );
  }
  if (widget.id.startsWith('ch-channel')) {
    const segs = [{l:'Zalo', v:42, c:'#0068FF'},{l:'Messenger', v:24, c:'#0084FF'},{l:'Web', v:18, c:'#2DC56A'},{l:'TikTok', v:10, c:'#FE2C55'},{l:'WA', v:6, c:'#25D366'}];
    let acc = 0;
    return (
      <>
        <div style={{fontSize:12, fontWeight:700}}>{widget.t}</div>
        <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginTop:6}}>
          <svg viewBox="0 0 36 36" style={{width:80, height:80, transform:'rotate(-90deg)'}}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--fill-03)" strokeWidth="3.5"/>
            {segs.map((s,i) => { const len = (s.v/100)*94; const off = (acc/100)*94; acc += s.v; return <circle key={i} cx="18" cy="18" r="15" fill="none" stroke={s.c} strokeWidth="3.5" strokeDasharray={`${len} 94`} strokeDashoffset={-off}/>; })}
          </svg>
          <div style={{display:'flex', flexDirection:'column', gap:3, fontSize:10}}>
            {segs.map(s => <div key={s.l} style={{display:'flex', alignItems:'center', gap:5}}><span style={{width:7, height:7, borderRadius:2, background:s.c}}/><span style={{color:'var(--label-02)'}}>{s.l}</span><span style={{fontWeight:700, marginLeft:4}}>{s.v}%</span></div>)}
          </div>
        </div>
      </>
    );
  }
  if (widget.id.startsWith('ch-funnel')) {
    const stages = [{l:'Lead', v:847, c:'#0EA5E9'},{l:'Qualified', v:412, c:'#22C55E'},{l:'Proposal', v:218, c:'#F59E0B'},{l:'Won', v:96, c:'#A855F7'}];
    return (
      <>
        <div style={{fontSize:12, fontWeight:700}}>{widget.t}</div>
        <div style={{flex:1, display:'flex', flexDirection:'column', gap:5, marginTop:8}}>
          {stages.map((s,i) => <div key={i} style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{width:60, fontSize:10, color:'var(--label-02)'}}>{s.l}</span>
            <div style={{flex:1, height:14, background:'var(--fill-03)', borderRadius:3, overflow:'hidden', position:'relative'}}>
              <div style={{width:`${(s.v/847)*100}%`, height:'100%', background:s.c, borderRadius:3}}/>
            </div>
            <span style={{fontSize:11, fontWeight:700, minWidth:36, textAlign:'right'}}>{s.v}</span>
          </div>)}
        </div>
      </>
    );
  }
  if (widget.id.startsWith('ch-heatmap')) {
    return (
      <>
        <div style={{fontSize:12, fontWeight:700}}>{widget.t}</div>
        <div style={{fontSize:10, color:'var(--label-03)', marginBottom:6}}>7 ngày × 24 giờ</div>
        <div style={{flex:1, display:'grid', gridTemplateColumns:'repeat(24, 1fr)', gridTemplateRows:'repeat(7, 1fr)', gap:1.5}}>
          {Array.from({length:24*7}).map((_,i)=>{
            const v = Math.random();
            return <div key={i} style={{background:`rgba(45,197,106,${.05 + v*.7})`, borderRadius:1.5}}/>;
          })}
        </div>
      </>
    );
  }
  if (widget.id.startsWith('ls-')) {
    const items = widget.id.includes('queue') ? ['Linh Phạm — đơn DV2104', 'Anh Tùng — hỏi giá sỉ', 'Mai Anh — đổi size', 'Hùng Le — refund', 'Yến Nhi — combo'] :
                  widget.id.includes('team')  ? ['Trâm · 124 chat', 'Vy · 98 chat', 'Hà · 87 chat', 'Khoa · 76 chat', 'Long · 64 chat'] :
                  widget.id.includes('deals') ? ['Sỉ Q2 · 240M', 'Combo Tết · 180M', 'Wholesale ABC · 120M', 'Reorder XY · 95M'] :
                  ['#1688-0421 · giặt sấy', '#ALI-0420 · đồ chơi', '#1688-0419 · phụ kiện', '#ALI-0418 · gia dụng'];
    return (
      <>
        <div style={{fontSize:12, fontWeight:700}}>{widget.t}</div>
        <div style={{flex:1, display:'flex', flexDirection:'column', gap:6, marginTop:8, fontSize:11}}>
          {items.map((t,i) => <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'4px 6px', borderRadius:5, background: i===0?'var(--fill-02)':'transparent'}}>
            <span style={{width:18, height:18, borderRadius:4, background:widget.color+'18', display:'grid', placeItems:'center', color:widget.color, fontSize:9, fontWeight:700}}>{i+1}</span>
            <span style={{flex:1, color:'var(--label-02)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t}</span>
          </div>)}
        </div>
      </>
    );
  }
  if (widget.id.startsWith('ai-')) {
    return (
      <>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <Icon.Sparkles style={{width:14, height:14, color:widget.color}}/>
          <span style={{fontSize:11, fontWeight:700, color:widget.color}}>CLAUDE COWORK · {widget.t}</span>
        </div>
        <div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.45, marginTop:8}}>
          {widget.id.includes('insight') ? '38% đơn chốt vào khung 20–22h. Đề xuất tăng 2 nhân sự ca tối hoặc bật auto-reply Sonnet để giữ first-reply <30s.' :
           widget.id.includes('trend')   ? '"Combo Tết" đang được hỏi nhiều gấp 3.2× so với tuần trước — chuẩn bị tồn kho và SKU bundle.' :
           '😊 67% · 😐 22% · 😡 11% · KH dán nhãn "ship chậm" tăng 18% — cần ưu tiên hotline.'}
        </div>
      </>
    );
  }
  return <div style={{flex:1, display:'grid', placeItems:'center', color:'var(--label-03)', fontSize:11}}>{widget.t}</div>;
}

/* ====== TILE INSPECTOR ====== */
function TileInspector({ tile, findWidget, layout, setLayout, resizeTile, removeTile, onClose }) {
  const w = findWidget(tile._ref) || findWidget(tile.id.split('-').slice(0,2).join('-'));
  if (!w) return null;
  const I = Icon[w.icon] || Icon.Grid;
  return (
    <div>
      <div style={{padding:'14px 18px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:32, height:32, borderRadius:7, background:w.color+'18', display:'grid', placeItems:'center', color:w.color}}><I style={{width:16, height:16}}/></div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:700}}>{w.t}</div>
          <div style={{fontSize:10, color:'var(--label-03)'}}>ID: {tile.id}</div>
        </div>
        <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
      </div>
      <div style={{padding:18, display:'flex', flexDirection:'column', gap:14}}>
        <InsField label="Tiêu đề" defaultValue={w.t}/>
        <div>
          <div style={{fontSize:11, fontWeight:600, marginBottom:6}}>Kích thước</div>
          <div style={{display:'flex', gap:6}}>
            <div style={{flex:1, padding:'8px 10px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:11, display:'flex', alignItems:'center', justifyContent:'space-between'}}>Rộng: <b>{tile.w}</b>
              <div style={{display:'flex', gap:3}}>
                <button onClick={()=>resizeTile(tile.id, -1, 0)} className="btn-icon-xs">−</button>
                <button onClick={()=>resizeTile(tile.id, 1, 0)} className="btn-icon-xs">+</button>
              </div>
            </div>
            <div style={{flex:1, padding:'8px 10px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:11, display:'flex', alignItems:'center', justifyContent:'space-between'}}>Cao: <b>{tile.h}</b>
              <div style={{display:'flex', gap:3}}>
                <button onClick={()=>resizeTile(tile.id, 0, -1)} className="btn-icon-xs">−</button>
                <button onClick={()=>resizeTile(tile.id, 0, 1)} className="btn-icon-xs">+</button>
              </div>
            </div>
          </div>
        </div>
        <InsField label="Data source" defaultValue="Live · workspace #1"/>
        <div>
          <div style={{fontSize:11, fontWeight:600, marginBottom:6}}>Khoảng thời gian</div>
          <select style={{width:'100%', padding:'7px 10px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:12}}>
            <option>Hôm nay</option><option>7 ngày</option><option>30 ngày</option><option>Quý này</option><option>Custom...</option>
          </select>
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:600, marginBottom:6}}>Filter</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:5}}>
            {['Kênh: Zalo', 'Team: Sales', 'Owner: tôi', '+ thêm'].map((c,i) => <span key={i} style={{padding:'4px 9px', background: i===3?'transparent':'var(--fill-02)', border: i===3?'1px dashed var(--fill-04)':'1px solid var(--fill-04)', borderRadius:5, fontSize:11, fontWeight:500, cursor:'pointer'}}>{c}</span>)}
          </div>
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:600, marginBottom:6}}>Màu accent</div>
          <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
            {['#2DC56A','#0EA5E9','#A855F7','#F59E0B','#EF4444','#22C55E','#EC4899','#8B5CF6'].map(c => <span key={c} style={{width:24, height:24, borderRadius:5, background:c, cursor:'pointer', border: c===w.color?'2px solid var(--label-01)':'2px solid transparent'}}/>)}
          </div>
        </div>
        <button onClick={()=>removeTile(tile.id)} style={{marginTop:8, padding:'9px', background:'transparent', border:'1px solid var(--danger)', color:'var(--danger)', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer'}}>
          Xoá widget khỏi layout
        </button>
      </div>
    </div>
  );
}

function InsField({label, defaultValue}) {
  return (
    <div>
      <div style={{fontSize:11, fontWeight:600, marginBottom:6}}>{label}</div>
      <input defaultValue={defaultValue} style={{width:'100%', padding:'7px 10px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:12, outline:'none'}}/>
    </div>
  );
}

/* ====== VIEWS TAB ====== */
function ViewsTab({ activeView, setActiveView }) {
  return (
    <div style={{flex:1, padding:32, overflow:'auto', background:'var(--fill-02)'}}>
      <div style={{maxWidth:980, margin:'0 auto'}}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
          <div style={{flex:1}}>
            <h2 style={{margin:0, fontSize:22, fontWeight:700}}>Saved Views</h2>
            <div style={{fontSize:12, color:'var(--label-03)', marginTop:4}}>Tạo nhiều layout cho từng vai trò — Sales, Support, Ops, Marketing</div>
          </div>
          <button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo view mới</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14}}>
          {SAVED_VIEWS.map(v => (
            <div key={v.id} onClick={()=>setActiveView(v.id)} style={{background:'white', border: activeView===v.id?'2px solid var(--primary)':'1px solid var(--fill-04)', borderRadius:11, padding:18, cursor:'pointer', position:'relative'}}>
              {v.pinned && <div style={{position:'absolute', top:10, right:10, background:'var(--warning-bg)', color:'var(--warning)', padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:700}}>📌 PIN</div>}
              <div style={{width:36, height:36, borderRadius:9, background:v.color+'22', display:'grid', placeItems:'center', color:v.color, marginBottom:12}}><Icon.Grid/></div>
              <div style={{fontSize:14, fontWeight:700}}>{v.name}</div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:3}}>{v.cnt} widgets · {v.shared ? 'Shared team' : 'Private'}</div>
              <div style={{display:'flex', alignItems:'center', gap:7, marginTop:14, paddingTop:12, borderTop:'1px dashed var(--fill-04)'}}>
                <div style={{width:22, height:22, borderRadius:11, background:'var(--primary)', color:'white', fontSize:10, fontWeight:700, display:'grid', placeItems:'center'}}>{v.owner[0]}</div>
                <span style={{fontSize:11, color:'var(--label-02)'}}>{v.owner}</span>
                <span style={{flex:1}}/>
                {v.shared && <span style={{fontSize:10, color:'var(--label-03)', display:'flex', alignItems:'center', gap:3}}><Icon.Users style={{width:11, height:11}}/> 12</span>}
              </div>
            </div>
          ))}
          <div style={{background:'white', border:'2px dashed var(--fill-04)', borderRadius:11, padding:18, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:160, color:'var(--label-03)', cursor:'pointer'}}>
            <Icon.Plus style={{width:24, height:24, marginBottom:8}}/>
            <div style={{fontSize:12, fontWeight:600}}>Tạo view mới</div>
            <div style={{fontSize:10, marginTop:2}}>Bắt đầu từ template hoặc blank</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====== SHARE TAB ====== */
function ShareTab() {
  return (
    <div style={{flex:1, padding:32, overflow:'auto', background:'var(--fill-02)'}}>
      <div style={{maxWidth:840, margin:'0 auto'}}>
        <h2 style={{margin:0, fontSize:22, fontWeight:700}}>Chia sẻ với team</h2>
        <div style={{fontSize:12, color:'var(--label-03)', marginTop:4, marginBottom:24}}>Phân quyền xem / chỉnh sửa, gửi link hoặc nhúng vào Slack/Teams</div>

        <div style={{background:'white', borderRadius:11, padding:20, border:'1px solid var(--fill-04)', marginBottom:14}}>
          <div style={{fontSize:13, fontWeight:700, marginBottom:14}}>Truy cập của thành viên</div>
          {DB_TEAM.map(m => (
            <div key={m.name} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--fill-03)'}}>
              <div style={{width:36, height:36, borderRadius:18, background:m.avatar, color:'white', fontSize:13, fontWeight:700, display:'grid', placeItems:'center'}}>{m.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>{m.name}</div>
                <div style={{fontSize:11, color:'var(--label-03)'}}>{m.name.toLowerCase()}@mediasoft.vn</div>
              </div>
              <select defaultValue={m.name==='Trâm'?'owner':'editor'} style={{padding:'6px 10px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:12}}>
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="none">Không truy cập</option>
              </select>
            </div>
          ))}
          <div style={{display:'flex', gap:8, marginTop:14}}>
            <input placeholder="Mời qua email hoặc @username" style={{flex:1, padding:'9px 12px', border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12, outline:'none'}}/>
            <button className="btn btn-primary btn-sm">Gửi mời</button>
          </div>
        </div>

        <div style={{background:'white', borderRadius:11, padding:20, border:'1px solid var(--fill-04)', marginBottom:14}}>
          <div style={{fontSize:13, fontWeight:700, marginBottom:6}}>Link chia sẻ công khai</div>
          <div style={{fontSize:11, color:'var(--label-03)', marginBottom:12}}>Bất kỳ ai có link này đều xem được — không cần đăng nhập</div>
          <div style={{display:'flex', gap:8, alignItems:'center', padding:'8px 12px', background:'var(--fill-02)', borderRadius:7, fontFamily:'monospace', fontSize:12}}>
            <Icon.Globe style={{width:14, height:14, color:'var(--label-03)'}}/>
            <span style={{flex:1, color:'var(--label-02)'}}>https://app.appchat.vn/d/share/dash_op_v1_a8f2d</span>
            <button className="btn-ghost-xs">Copy</button>
            <button className="btn-ghost-xs">QR</button>
          </div>
          <div style={{display:'flex', gap:8, marginTop:12}}>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--label-02)'}}><input type="checkbox" defaultChecked/> Chỉ xem (không cho copy)</label>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--label-02)'}}><input type="checkbox"/> Yêu cầu mật khẩu</label>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--label-02)'}}><input type="checkbox"/> Hết hạn sau 7 ngày</label>
          </div>
        </div>

        <div style={{background:'white', borderRadius:11, padding:20, border:'1px solid var(--fill-04)'}}>
          <div style={{fontSize:13, fontWeight:700, marginBottom:12}}>Nhúng vào kênh khác</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
            {[{n:'Slack',c:'#4A154B'},{n:'Teams',c:'#5059C9'},{n:'Email digest',c:'#0EA5E9'},{n:'iframe HTML',c:'#22C55E'}].map(p => (
              <div key={p.n} style={{padding:14, border:'1px solid var(--fill-04)', borderRadius:8, textAlign:'center', cursor:'pointer'}}>
                <div style={{width:36, height:36, borderRadius:8, background:p.c+'18', color:p.c, display:'grid', placeItems:'center', margin:'0 auto 8px', fontSize:16, fontWeight:700}}>{p.n[0]}</div>
                <div style={{fontSize:12, fontWeight:600}}>{p.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====== TEMPLATES TAB ====== */
function TemplatesTab({ onApply }) {
  const templates = [
    { id:'t1', name:'Sales Live Ops',  desc:'KPI doanh thu + funnel + top deals', tiles:10, color:'#22C55E' },
    { id:'t2', name:'Support SLA',     desc:'First-reply, queue, CSAT, breach',   tiles:8,  color:'#0EA5E9' },
    { id:'t3', name:'Marketing Pulse', desc:'Broadcast performance, CTR, ROAS',    tiles:9,  color:'#EC4899' },
    { id:'t4', name:'Cross-border Ops',desc:'Đơn 1688, shipment, LC pending',     tiles:11, color:'#F59E0B' },
    { id:'t5', name:'AI Performance',  desc:'Claude usage, accuracy, escalation', tiles:7,  color:'#8B5CF6' },
    { id:'t6', name:'Executive Daily', desc:'Tổng quan toàn workspace cho CEO',   tiles:6,  color:'#0B3D2C' },
  ];
  return (
    <div style={{flex:1, padding:32, overflow:'auto', background:'var(--fill-02)'}}>
      <div style={{maxWidth:1100, margin:'0 auto'}}>
        <h2 style={{margin:0, fontSize:22, fontWeight:700}}>Templates layout</h2>
        <div style={{fontSize:12, color:'var(--label-03)', marginTop:4, marginBottom:24}}>Bắt đầu nhanh từ 6 layout dựng sẵn — ưu hoá theo từng vai trò trong tổ chức</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16}}>
          {templates.map(t => (
            <div key={t.id} style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, overflow:'hidden'}}>
              <div style={{padding:'40px 16px', background:`linear-gradient(135deg, ${t.color}18, ${t.color}06)`, position:'relative', height:120}}>
                <div style={{position:'absolute', inset:14, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:4}}>
                  {Array.from({length: t.tiles}).map((_, i) => <div key={i} style={{background:'white', borderRadius:3, opacity:.85, gridColumn: i<2?'span 1':(i<4?'span 2':'span 1')}}/>)}
                </div>
              </div>
              <div style={{padding:14}}>
                <div style={{fontSize:13, fontWeight:700}}>{t.name}</div>
                <div style={{fontSize:11, color:'var(--label-03)', marginTop:3, marginBottom:10}}>{t.desc} · {t.tiles} tiles</div>
                <button onClick={()=>onApply(DEFAULT_LAYOUT)} className="btn btn-ghost btn-sm" style={{width:'100%'}}>Áp dụng template</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ====== SHARE MODAL ====== */
function ShareModal({ onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(8,17,12,.6)', backdropFilter:'blur(6px)', zIndex:2000, display:'grid', placeItems:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white', borderRadius:14, width:520, padding:24, boxShadow:'var(--shadow-lg)'}}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:18}}>
          <div style={{width:42, height:42, borderRadius:10, background:'var(--primary-bg)', color:'var(--primary)', display:'grid', placeItems:'center'}}><Icon.Send/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:16, fontWeight:700}}>Publish & chia sẻ layout</div>
            <div style={{fontSize:12, color:'var(--label-03)'}}>Layout sẽ được đẩy real-time tới team</div>
          </div>
          <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
        </div>
        <div style={{padding:14, background:'var(--fill-02)', borderRadius:9, marginBottom:14, display:'flex', alignItems:'center', gap:10}}>
          <Icon.Check style={{width:16, height:16, color:'var(--success)'}}/>
          <div style={{flex:1, fontSize:12}}>10 widgets · Operations Live · 5 thành viên có quyền edit</div>
        </div>
        <div style={{fontSize:12, fontWeight:600, marginBottom:8}}>Tin nhắn kèm theo (tuỳ chọn)</div>
        <textarea placeholder="Mình đã thêm widget 'AI Insight' và rearrange funnel chart — feedback giúp nhé..." style={{width:'100%', padding:'10px 12px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12, outline:'none', resize:'vertical', minHeight:70, fontFamily:'inherit'}}/>
        <div style={{display:'flex', alignItems:'center', gap:8, marginTop:14, padding:'10px 12px', background:'var(--info-bg)', borderRadius:8, fontSize:11, color:'var(--info)'}}>
          <Icon.Bell style={{width:14, height:14}}/> Sẽ gửi thông báo qua AppChat + email cho 5 thành viên
        </div>
        <div style={{display:'flex', gap:8, marginTop:18}}>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{flex:1}}>Huỷ</button>
          <button onClick={onClose} className="btn btn-primary btn-sm" style={{flex:2}}><Icon.Send/> Publish & gửi thông báo</button>
        </div>
      </div>
    </div>
  );
}

/* tiny styles via inline class — using existing var() vars from styles.css */
const dbStyle = document.createElement('style');
dbStyle.textContent = `
  .btn-ghost-xs{padding:5px 9px; font-size:11px; font-weight:600; background:transparent; border:1px solid var(--fill-04); color:var(--label-02); border-radius:5px; cursor:pointer}
  .btn-ghost-xs:hover{background:var(--fill-02)}
  .btn-icon-xs{width:22px; height:22px; border:none; background:transparent; color:var(--label-02); border-radius:4px; cursor:pointer; font-size:11px; display:grid; place-items:center}
  .btn-icon-xs:hover{background:var(--fill-03)}
`;
document.head.appendChild(dbStyle);

window.DashboardBuilder = DashboardBuilder;
