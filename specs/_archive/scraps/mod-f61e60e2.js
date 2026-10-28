/* ============================================================
   org-settings.jsx — Tổ chức & Vận hành (Settings)
   • Sơ đồ tổ chức TỪ TRÊN XUỐNG (Tập đoàn→Công ty con→Chi nhánh→Phòng ban→Nhóm)
   • SLA · KPI · Phân ca: tạo CHIẾN DỊCH gán cho đơn vị theo thời hạn
     (không thời hạn / ngày / giờ / quý / năm)
   ============================================================ */
;(function(){
try {
const { useState: useOs } = React;
const OsI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];
const Av=({n,size=22})=> <span style={{width:size,height:size,borderRadius:'50%',background:avC(n),color:'white',display:'grid',placeItems:'center',fontSize:size*0.42,fontWeight:800,flexShrink:0}}>{(n||'?')[0]}</span>;
const STAFF=['Trâm','Minh','Hương','Khoa','Lan Anh','Thu Hà','Bảo Vy','Tú Quyên'];
const fld={width:'100%', height:36, padding:'0 11px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', boxSizing:'border-box'};
const lbl={display:'block', fontSize:11.5, fontWeight:700, color:'var(--label-02)', marginBottom:5};
const LINE='#C9D2DB';
const Wrap=({title,sub,right,children})=>(
  <div style={{padding:'22px 26px', overflowY:'auto', height:'100%'}}>
    <div style={{display:'flex', alignItems:'flex-start', marginBottom:18}}>
      <div><div style={{fontSize:20, fontWeight:800}}>{title}</div><div style={{fontSize:13, color:'var(--label-02)', marginTop:3}}>{sub}</div></div>
      <span style={{flex:1}}/>{right}
    </div>
    {children}
  </div>
);
const Card=({children,style})=> <div className="card" style={{padding:18, ...style}}>{children}</div>;
function useToast(){
  const [t,setT]=useOs('');
  React.useEffect(()=>{ if(t){ const x=setTimeout(()=>setT(''),1900); return ()=>clearTimeout(x); } },[t]);
  const node = t ? <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:1400, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{OsI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{t}</div> : null;
  return [setT, node];
}
function Toggle({on,onChange}){
  return <button onClick={()=>onChange(!on)} style={{width:40,height:23,borderRadius:14,border:'none',position:'relative',cursor:'pointer',flexShrink:0,background:on?'var(--primary)':'var(--fill-04)',transition:'background .18s'}}><span style={{position:'absolute',top:2,left:on?19:2,width:19,height:19,borderRadius:'50%',background:'white',transition:'left .18s'}}/></button>;
}

/* ---------- ORG TREE (shared) ---------- */
const NODE_TYPES = {
  group:   {l:'Tập đoàn',   c:'#0F172A', ic:'Shield'},
  company: {l:'Công ty con', c:'#2A6FDB', ic:'Layers'},
  branch:  {l:'Chi nhánh',  c:'#0E9B94', ic:'Globe'},
  dept:    {l:'Phòng ban',  c:'#6E48E6', ic:'Folder'},
  team:    {l:'Nhóm',       c:'#C9820B', ic:'Users'},
};
const CHILD_TYPE = { group:'company', company:'branch', branch:'dept', dept:'team', team:'team' };
const ORG_DEFAULT = {
  id:'g1', name:'MediaSoft Group', type:'group', lead:'Trâm', children:[
    { id:'c1', name:'AppChat Vietnam', type:'company', lead:'Minh', children:[
      { id:'b1', name:'Chi nhánh Hà Nội', type:'branch', lead:'Hương', children:[
        { id:'d1', name:'Phòng Kinh doanh', type:'dept', lead:'Trâm', children:[
          { id:'t1', name:'Nhóm Bán hàng 1', type:'team', lead:'Lan Anh', children:[] },
          { id:'t2', name:'Nhóm Bán hàng 2', type:'team', lead:'Tú Quyên', children:[] },
        ]},
        { id:'d2', name:'Phòng CSKH', type:'dept', lead:'Hương', children:[
          { id:'t3', name:'Nhóm Hỗ trợ', type:'team', lead:'Khoa', children:[] },
        ]},
      ]},
      { id:'b2', name:'Chi nhánh TP.HCM', type:'branch', lead:'Khoa', children:[
        { id:'d3', name:'Phòng Kế toán', type:'dept', lead:'Thu Hà', children:[] },
      ]},
    ]},
    { id:'c2', name:'AppChat Global', type:'company', lead:'Bảo Vy', children:[
      { id:'b3', name:'VP Singapore', type:'branch', lead:'Bảo Vy', children:[] },
    ]},
  ]
};
function orgRead(){ try{ const v=JSON.parse(localStorage.getItem('ac_org_v2')); return v||ORG_DEFAULT; }catch(e){ return ORG_DEFAULT; } }
function orgWrite(v){ localStorage.setItem('ac_org_v2', JSON.stringify(v)); window.dispatchEvent(new Event('ac-org-change')); }
function useOrg(){
  const [tree,setTree]=useOs(orgRead);
  React.useEffect(()=>{ const h=()=>setTree(orgRead()); window.addEventListener('ac-org-change',h); return ()=>window.removeEventListener('ac-org-change',h); },[]);
  return [tree, (t)=>{ orgWrite(t); setTree(t); }];
}
function flatten(node, path=[], out=[]){
  const p=[...path, node.name];
  out.push({ id:node.id, name:node.name, type:node.type, lead:node.lead, path:p.join(' › '), depth:path.length });
  (node.children||[]).forEach(c=>flatten(c,p,out));
  return out;
}
function treeOp(node, id, fn){
  if(node.id===id) return fn(node);
  return {...node, children:(node.children||[]).map(c=>treeOp(c,id,fn)).filter(Boolean)};
}

/* ================= 1 · SƠ ĐỒ TỔ CHỨC (top-down) ================= */
function ChartBox({ node, onAdd, onEdit, onDel }){
  const t=NODE_TYPES[node.type]||NODE_TYPES.dept;
  return (
    <div style={{position:'relative', minWidth:158, maxWidth:190, border:'1.5px solid '+t.c+'55', borderRadius:11, background:'white', boxShadow:'0 1px 3px rgba(17,24,39,.06)', padding:'10px 12px', textAlign:'center'}}>
      <span style={{display:'inline-grid', placeItems:'center', width:30, height:30, borderRadius:8, background:t.c+'18', color:t.c, marginBottom:6}}>{OsI(t.ic,{style:{width:16,height:16}})}</span>
      <div style={{fontSize:12.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{node.name}</div>
      <div style={{fontSize:9.5, fontWeight:700, color:t.c, marginTop:1}}>{t.l}</div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:7, paddingTop:7, borderTop:'1px solid var(--fill-03)'}}>
        <Av n={node.lead} size={18}/><span style={{fontSize:10.5, color:'var(--label-02)'}}>{node.lead||'—'}</span>
      </div>
      <div className="oc-actions" style={{position:'absolute', top:-11, right:6, display:'flex', gap:3, background:'white', borderRadius:8, padding:'2px', boxShadow:'0 2px 6px rgba(17,24,39,.12)'}}>
        {node.type!=='team' && <button className="btn-icon" style={{width:22,height:22}} title="Thêm" onClick={()=>onAdd(node)}>{OsI('Plus',{style:{width:12,height:12}})}</button>}
        <button className="btn-icon" style={{width:22,height:22}} title="Sửa" onClick={()=>onEdit(node)}>{OsI('Edit',{style:{width:12,height:12}})}</button>
        {node.type!=='group' && <button className="btn-icon" style={{width:22,height:22,color:'#C8263A'}} title="Xoá" onClick={()=>onDel(node)}>{OsI('Trash',{style:{width:12,height:12}})}</button>}
      </div>
    </div>
  );
}
function ChartNode({ node, onAdd, onEdit, onDel }){
  const kids=node.children||[];
  return (
    <div style={{display:'inline-flex', flexDirection:'column', alignItems:'center', padding:'0 6px'}}>
      <ChartBox node={node} onAdd={onAdd} onEdit={onEdit} onDel={onDel}/>
      {kids.length>0 && (<>
        <div style={{width:2, height:20, background:LINE}}/>
        <div style={{display:'flex', alignItems:'flex-start'}}>
          {kids.map((c,i)=>(
            <div key={c.id} style={{position:'relative', display:'flex', flexDirection:'column', alignItems:'center'}}>
              <div style={{position:'absolute', top:0, height:2, background:LINE, left: i===0?'50%':0, right: i===kids.length-1?'50%':0}}/>
              <div style={{width:2, height:20, background:LINE}}/>
              <ChartNode node={c} onAdd={onAdd} onEdit={onEdit} onDel={onDel}/>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
function OrgDept(){
  const [tree,setTree]=useOrg();
  const [modal,setModal]=useOs(null);
  const [toast,toastNode]=useToast();
  const addChild=(parent)=>setModal({mode:'add', parentId:parent.id, node:{name:'', type:CHILD_TYPE[parent.type], lead:''}});
  const editNode=(node)=>setModal({mode:'edit', nodeId:node.id, node:{...node}});
  const delNode=(node)=>{ setTree(treeOp(tree, node.id, ()=>null)); toast('Đã xoá "'+node.name+'"'); };
  const save=(f)=>{
    if(modal.mode==='add'){
      const nn={ id:'n'+Date.now(), name:f.name, type:f.type, lead:f.lead, children:[] };
      setTree(treeOp(tree, modal.parentId, n=>({...n, children:[...(n.children||[]), nn]})));
      toast('Đã thêm "'+f.name+'"');
    } else {
      setTree(treeOp(tree, modal.nodeId, n=>({...n, name:f.name, lead:f.lead, type:f.type})));
      toast('Đã lưu "'+f.name+'"');
    }
    setModal(null);
  };
  const counts = flatten(tree).reduce((a,n)=>{ a[n.type]=(a[n.type]||0)+1; return a; },{});
  return (
    <Wrap title="Sơ đồ tổ chức" sub="Cấu trúc từ trên xuống · gán người phụ trách từng cấp · thêm/sửa/xoá đơn vị"
      right={<button className="btn btn-primary btn-sm" onClick={()=>addChild(tree)}>{OsI('Plus',{style:{width:14,height:14}})} Thêm đơn vị</button>}>
      <div style={{display:'flex', gap:10, marginBottom:16, flexWrap:'wrap'}}>
        {Object.entries(NODE_TYPES).map(([k,t])=>(
          <div key={k} className="card" style={{padding:'10px 14px', display:'flex', alignItems:'center', gap:9, flex:'1 1 140px'}}>
            <span style={{width:30,height:30,borderRadius:8,background:t.c+'18',color:t.c,display:'grid',placeItems:'center'}}>{OsI(t.ic,{style:{width:15,height:15}})}</span>
            <div><div style={{fontSize:18, fontWeight:800}}>{counts[k]||0}</div><div style={{fontSize:11, color:'var(--label-03)'}}>{t.l}</div></div>
          </div>
        ))}
      </div>
      <Card style={{overflowX:'auto'}}>
        <div style={{display:'flex', justifyContent:'center', minWidth:'min-content', padding:'14px 8px'}}>
          <ChartNode node={tree} onAdd={addChild} onEdit={editNode} onDel={delNode}/>
        </div>
      </Card>
      <div style={{fontSize:11.5, color:'var(--label-03)', marginTop:10}}>Di chuột vào ô để hiện nút thêm/sửa/xoá · kéo ngang để xem toàn sơ đồ.</div>
      {modal && <NodeModal modal={modal} onClose={()=>setModal(null)} onSave={save}/>}
      <style>{'.oc-actions{opacity:0;transition:opacity .12s}.card [style] :hover>.oc-actions{opacity:1}'}</style>
      {toastNode}
    </Wrap>
  );
}
function NodeModal({modal,onClose,onSave}){
  const [f,setF]=useOs({...modal.node});
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const typeOpts = modal.mode==='add' ? [modal.node.type] : Object.keys(NODE_TYPES);
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:1300,display:'grid',placeItems:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:460,background:'white',borderRadius:16,boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--fill-03)',fontSize:17,fontWeight:800}}>{modal.mode==='add'?'Thêm đơn vị tổ chức':'Sửa đơn vị'}</div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={lbl}>Loại đơn vị</label>
            <select value={f.type} onChange={e=>set('type',e.target.value)} disabled={modal.mode==='add'} style={fld}>
              {typeOpts.map(t=><option key={t} value={t}>{NODE_TYPES[t].l}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Tên đơn vị *</label><input autoFocus value={f.name} onChange={e=>set('name',e.target.value)} placeholder="VD: Chi nhánh Đà Nẵng" style={fld}/></div>
          <div><label style={lbl}>Người phụ trách</label>
            <select value={f.lead} onChange={e=>set('lead',e.target.value)} style={fld}>
              <option value="">— Chọn người phụ trách —</option>{STAFF.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 22px',borderTop:'1px solid var(--fill-03)',background:'var(--fill-02)'}}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button>
          <button disabled={!f.name.trim()} onClick={()=>onSave(f)} className="btn btn-primary btn-sm" style={{opacity:f.name.trim()?1:.5}}>Lưu</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- TIME SCOPE helpers ---------- */
const SCOPE_KINDS=[
  {k:'always',  l:'Không thời hạn'},
  {k:'date',    l:'Theo ngày'},
  {k:'hour',    l:'Theo giờ'},
  {k:'quarter', l:'Theo quý'},
  {k:'year',    l:'Theo năm'},
];
function scopeLabel(s){
  if(!s) return '—';
  if(s.kind==='always') return 'Không thời hạn · luôn áp dụng';
  if(s.kind==='date') return 'Từ '+(s.from||'?')+' đến '+(s.to||'?');
  if(s.kind==='hour') return (s.date||'?')+' · '+(s.t1||'00:00')+'–'+(s.t2||'23:59');
  if(s.kind==='quarter') return 'Quý '+(s.q||'1')+'/'+(s.year||'2026');
  if(s.kind==='year') return 'Năm '+(s.year||'2026');
  return '—';
}

/* ---------- CAMPAIGN section (shared) ---------- */
const SEED_CAMPAIGNS = {
  SLA:[
    {id:'cp1', unit:'Phòng CSKH', scope:{kind:'always'}, note:'SLA cao điểm CSKH', on:true},
    {id:'cp2', unit:'Chi nhánh Hà Nội', scope:{kind:'quarter', q:'2', year:'2026'}, note:'Siết SLA quý 2', on:true},
  ],
  KPI:[
    {id:'cp1', unit:'Phòng Kinh doanh', scope:{kind:'year', year:'2026'}, note:'Mục tiêu doanh thu 2026', on:true},
    {id:'cp2', unit:'AppChat Vietnam', scope:{kind:'quarter', q:'2', year:'2026'}, note:'KPI quý 2', on:false},
  ],
  'Ca trực':[
    {id:'cp1', unit:'Phòng CSKH', scope:{kind:'date', from:'01/06/2026', to:'30/06/2026'}, note:'Lịch trực tháng 6', on:true},
    {id:'cp2', unit:'Nhóm Hỗ trợ', scope:{kind:'hour', date:'14/06/2026', t1:'18:00', t2:'22:00'}, note:'Trực sự kiện Flash Sale', on:true},
  ],
};
function CampaignSection({ kind, color }){
  const [tree]=useOrg();
  const units=flatten(tree);
  const [items,setItems]=useOs(SEED_CAMPAIGNS[kind]||[]);
  const [modal,setModal]=useOs(null);
  const [toast,toastNode]=useToast();
  const save=(f)=>{ if(f.id){ setItems(xs=>xs.map(x=>x.id===f.id?f:x)); toast('Đã lưu chiến dịch'); } else { setItems(xs=>[{...f,id:'cp'+Date.now(),on:true},...xs]); toast('Đã tạo chiến dịch gán '+kind); } setModal(null); };
  const del=(id)=>{ setItems(xs=>xs.filter(x=>x.id!==id)); toast('Đã xoá chiến dịch'); };
  const tog=(id)=>setItems(xs=>xs.map(x=>x.id===id?{...x,on:!x.on}:x));
  return (
    <Card style={{padding:0, overflow:'visible', marginBottom:16}}>
      <div style={{display:'flex', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid var(--fill-03)'}}>
        <div><div style={{fontSize:14, fontWeight:800}}>Chiến dịch áp dụng {kind}</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Gán cấu hình cho đơn vị theo thời hạn linh hoạt</div></div>
        <span style={{flex:1}}/>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({unit:units[0].name, scope:{kind:'always'}, note:''})}>{OsI('Plus',{style:{width:14,height:14}})} Tạo chiến dịch</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1.6fr 1.4fr 0.7fr 70px', gap:12, padding:'9px 16px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
        {['Đơn vị','Thời gian áp dụng','Ghi chú','Bật','Thao tác'].map((h,i)=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', textAlign:i===4?'right':'left'}}>{h}</span>)}
      </div>
      {items.length===0 ? <div style={{padding:'28px', textAlign:'center', fontSize:13, color:'var(--label-03)'}}>Chưa có chiến dịch nào.</div> :
        items.map(c=>(
          <div key={c.id} style={{display:'grid', gridTemplateColumns:'1.4fr 1.6fr 1.4fr 0.7fr 70px', gap:12, padding:'11px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
            <span style={{fontSize:13, fontWeight:600}}>{c.unit}</span>
            <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--label-02)'}}>{OsI(c.scope.kind==='always'?'Refresh':'Clock',{style:{width:13,height:13, color:color}})}{scopeLabel(c.scope)}</span>
            <span style={{fontSize:12.5, color:'var(--label-02)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.note||'—'}</span>
            <Toggle on={c.on} onChange={()=>tog(c.id)}/>
            <div style={{display:'flex', gap:4, justifyContent:'flex-end'}}>
              <button className="btn-icon" style={{width:26,height:26}} onClick={()=>setModal({...c})}>{OsI('Edit',{style:{width:13,height:13}})}</button>
              <button className="btn-icon" style={{width:26,height:26,color:'#C8263A'}} onClick={()=>del(c.id)}>{OsI('Trash',{style:{width:13,height:13}})}</button>
            </div>
          </div>
        ))}
      {modal && <CampaignModal kind={kind} units={units} c={modal} onClose={()=>setModal(null)} onSave={save}/>}
      {toastNode}
    </Card>
  );
}
function CampaignModal({ kind, units, c, onClose, onSave }){
  const [f,setF]=useOs({...c, scope:{...c.scope}});
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const setS=(k,v)=>setF(s=>({...s, scope:{...s.scope,[k]:v}}));
  const sk=f.scope.kind;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:1300,display:'grid',placeItems:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:500,maxHeight:'90vh',overflowY:'auto',background:'white',borderRadius:16,boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--fill-03)',fontSize:17,fontWeight:800}}>{f.id?'Sửa chiến dịch':'Tạo chiến dịch '+kind}</div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={lbl}>Gán cho đơn vị *</label>
            <select value={f.unit} onChange={e=>set('unit',e.target.value)} style={fld}>
              {units.map(u=><option key={u.id} value={u.name}>{'\u00A0'.repeat(u.depth*2)}{NODE_TYPES[u.type].l}: {u.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Loại thời hạn</label>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {SCOPE_KINDS.map(s=>{ const on=sk===s.k; return <button key={s.k} onClick={()=>setS('kind',s.k)} style={{padding:'7px 13px', borderRadius:8, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'), background:on?'var(--bg-green)':'white', color:on?'var(--pr-dark-2)':'var(--label-02)'}}>{s.l}</button>; })}
            </div>
          </div>
          {sk==='date' && <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label style={lbl}>Từ ngày</label><input type="date" value={f.scope.from||''} onChange={e=>setS('from',e.target.value)} style={fld}/></div>
            <div><label style={lbl}>Đến ngày</label><input type="date" value={f.scope.to||''} onChange={e=>setS('to',e.target.value)} style={fld}/></div>
          </div>}
          {sk==='hour' && <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:10}}>
            <div><label style={lbl}>Ngày</label><input type="date" value={f.scope.date||''} onChange={e=>setS('date',e.target.value)} style={fld}/></div>
            <div><label style={lbl}>Từ giờ</label><input type="time" value={f.scope.t1||'08:00'} onChange={e=>setS('t1',e.target.value)} style={fld}/></div>
            <div><label style={lbl}>Đến giờ</label><input type="time" value={f.scope.t2||'17:30'} onChange={e=>setS('t2',e.target.value)} style={fld}/></div>
          </div>}
          {sk==='quarter' && <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label style={lbl}>Quý</label><select value={f.scope.q||'1'} onChange={e=>setS('q',e.target.value)} style={fld}>{['1','2','3','4'].map(q=><option key={q}>{q}</option>)}</select></div>
            <div><label style={lbl}>Năm</label><select value={f.scope.year||'2026'} onChange={e=>setS('year',e.target.value)} style={fld}>{['2026','2027','2028'].map(y=><option key={y}>{y}</option>)}</select></div>
          </div>}
          {sk==='year' && <div><label style={lbl}>Năm</label><select value={f.scope.year||'2026'} onChange={e=>setS('year',e.target.value)} style={fld}>{['2026','2027','2028'].map(y=><option key={y}>{y}</option>)}</select></div>}
          {sk==='always' && <div style={{fontSize:12, color:'var(--label-02)', padding:'10px 12px', background:'var(--fill-02)', borderRadius:8}}>Chiến dịch áp dụng liên tục, không giới hạn thời gian — đến khi bị tắt hoặc xoá.</div>}
          <div><label style={lbl}>Ghi chú</label><input value={f.note} onChange={e=>set('note',e.target.value)} placeholder="VD: Siết SLA mùa cao điểm" style={fld}/></div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 22px',borderTop:'1px solid var(--fill-03)',background:'var(--fill-02)'}}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button>
          <button onClick={()=>onSave(f)} className="btn btn-primary btn-sm">{f.id?'Lưu':'Tạo chiến dịch'}</button>
        </div>
      </div>
    </div>
  );
}

/* ================= 2 · SLA ================= */
function OrgSLA(){
  const [rules,setRules]=useOs([
    {id:'s1', prio:'Cao', frt:15, res:2, unit:'giờ', esc:true, c:'#DC2626'},
    {id:'s2', prio:'Trung bình', frt:30, res:8, unit:'giờ', esc:true, c:'#C9820B'},
    {id:'s3', prio:'Thấp', frt:60, res:24, unit:'giờ', esc:false, c:'#64748B'},
  ]);
  const [bizHours,setBizHours]=useOs(true);
  const [skipHoliday,setSkipHoliday]=useOs(true);
  const [escPct,setEscPct]=useOs(80);
  const [toast,toastNode]=useToast();
  const upd=(id,k,v)=>setRules(rs=>rs.map(r=>r.id===id?{...r,[k]:v}:r));
  return (
    <Wrap title="Thiết lập SLA" sub="Mẫu cấu hình SLA · tạo chiến dịch gán cho đơn vị theo thời hạn"
      right={<button className="btn btn-primary btn-sm" onClick={()=>toast('Đã lưu mẫu SLA')}>{OsI('Check',{style:{width:14,height:14}})} Lưu mẫu</button>}>
      <CampaignSection kind="SLA" color="#DC2626"/>
      <div style={{fontSize:13.5, fontWeight:800, margin:'4px 2px 10px'}}>Mẫu cấu hình SLA mặc định</div>
      <Card style={{padding:0, overflow:'hidden', marginBottom:16}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1.3fr 1.3fr 0.9fr', gap:12, padding:'10px 16px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
          {['Mức ưu tiên','Phản hồi đầu (FRT)','Thời gian giải quyết','Escalation'].map(h=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)'}}>{h}</span>)}
        </div>
        {rules.map(r=>(
          <div key={r.id} style={{display:'grid', gridTemplateColumns:'1fr 1.3fr 1.3fr 0.9fr', gap:12, padding:'13px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
            <span style={{display:'inline-flex', alignItems:'center', gap:7, fontSize:13, fontWeight:700, color:r.c}}><span style={{width:8,height:8,borderRadius:4,background:r.c}}/>{r.prio}</span>
            <div style={{display:'flex', alignItems:'center', gap:6}}><input type="number" value={r.frt} onChange={e=>upd(r.id,'frt',+e.target.value)} style={{...fld,width:70,height:34}}/><span style={{fontSize:12.5,color:'var(--label-02)'}}>phút</span></div>
            <div style={{display:'flex', alignItems:'center', gap:6}}><input type="number" value={r.res} onChange={e=>upd(r.id,'res',+e.target.value)} style={{...fld,width:70,height:34}}/><select value={r.unit} onChange={e=>upd(r.id,'unit',e.target.value)} style={{...fld,width:80,height:34}}><option>giờ</option><option>phút</option><option>ngày</option></select></div>
            <Toggle on={r.esc} onChange={v=>upd(r.id,'esc',v)}/>
          </div>
        ))}
      </Card>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <Card>
          <div style={{fontSize:13.5, fontWeight:800, marginBottom:12}}>Điều kiện tính SLA</div>
          <div style={{display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--fill-03)'}}>
            <div style={{flex:1}}><div style={{fontSize:13, fontWeight:600}}>Chỉ tính trong giờ làm việc</div></div><Toggle on={bizHours} onChange={setBizHours}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12, padding:'10px 0'}}>
            <div style={{flex:1}}><div style={{fontSize:13, fontWeight:600}}>Loại trừ ngày lễ / nghỉ</div></div><Toggle on={skipHoliday} onChange={setSkipHoliday}/>
          </div>
        </Card>
        <Card>
          <div style={{fontSize:13.5, fontWeight:800, marginBottom:12}}>Escalation</div>
          <div style={{fontSize:12.5, color:'var(--label-02)', marginBottom:10}}>Cảnh báo khi dùng <b style={{color:'var(--pr-dark-2)'}}>{escPct}%</b> thời gian SLA</div>
          <input type="range" min={50} max={95} step={5} value={escPct} onChange={e=>setEscPct(+e.target.value)} style={{width:'100%', accentColor:'var(--primary)'}}/>
        </Card>
      </div>
      {toastNode}
    </Wrap>
  );
}

/* ================= 3 · KPI ================= */
function OrgKPI(){
  const [kpis,setKpis]=useOs([
    {id:'k1', name:'Hội thoại / ngày', target:40, unit:'', c:'#2A6FDB'},
    {id:'k2', name:'Phản hồi đầu (FRT)', target:2, unit:'phút', c:'#1B9E5A'},
    {id:'k3', name:'CSAT tối thiểu', target:4.5, unit:'/5', c:'#C9820B'},
    {id:'k4', name:'Ticket đóng / tuần', target:30, unit:'', c:'#6E48E6'},
    {id:'k5', name:'Doanh thu / tháng', target:50, unit:'triệu ₫', c:'#0E9B94'},
  ]);
  const [toast,toastNode]=useToast();
  const upd=(id,v)=>setKpis(ks=>ks.map(k=>k.id===id?{...k,target:v}:k));
  return (
    <Wrap title="KPI & Mục tiêu" sub="Mẫu KPI · tạo chiến dịch gán cho đơn vị theo quý/năm/ngày"
      right={<button className="btn btn-primary btn-sm" onClick={()=>toast('Đã lưu mẫu KPI')}>{OsI('Check',{style:{width:14,height:14}})} Lưu mẫu</button>}>
      <CampaignSection kind="KPI" color="#0E9B94"/>
      <div style={{fontSize:13.5, fontWeight:800, margin:'4px 2px 10px'}}>Mẫu chỉ tiêu KPI mặc định</div>
      <Card style={{padding:0, overflow:'hidden'}}>
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, padding:'10px 16px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
          {['Chỉ số KPI','Mục tiêu'].map(h=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)'}}>{h}</span>)}
        </div>
        {kpis.map(k=>(
          <div key={k.id} style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
            <span style={{display:'inline-flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600}}><span style={{width:8,height:8,borderRadius:4,background:k.c}}/>{k.name}</span>
            <div style={{display:'flex', alignItems:'center', gap:6}}><input type="number" step="0.1" value={k.target} onChange={e=>upd(k.id,+e.target.value)} style={{...fld,width:90,height:34}}/><span style={{fontSize:12.5,color:'var(--label-02)'}}>{k.unit}</span></div>
          </div>
        ))}
      </Card>
      {toastNode}
    </Wrap>
  );
}

/* ================= 4 · PHÂN CA ================= */
function OrgShifts(){
  const [aiAfter,setAiAfter]=useOs(true);
  const [shifts]=useOs([
    {id:'sh1', name:'Ca sáng', time:'08:00 – 12:00', staff:['Hương','Khoa'], channels:'Zalo OA · Facebook'},
    {id:'sh2', name:'Ca chiều', time:'13:00 – 17:30', staff:['Trâm','Lan Anh'], channels:'Shopee · TikTok'},
    {id:'sh3', name:'Ca tối', time:'18:00 – 22:00', staff:['Minh'], channels:'Web · Hotline'},
    {id:'sh4', name:'Ngoài giờ', time:'22:00 – 08:00', staff:['AI Agent'], channels:'Tất cả · AI tự xử'},
  ]);
  const [toast,toastNode]=useToast();
  return (
    <Wrap title="Phân ca trực" sub="Mẫu ca trực · tạo chiến dịch gán cho đơn vị theo ngày/giờ"
      right={<button className="btn btn-primary btn-sm" onClick={()=>toast('Đã lưu mẫu ca trực')}>{OsI('Check',{style:{width:14,height:14}})} Lưu mẫu</button>}>
      <CampaignSection kind="Ca trực" color="#6E48E6"/>
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:11, background:'linear-gradient(135deg,rgba(45,197,106,.08),rgba(43,158,243,.05))', border:'1px solid rgba(45,197,106,.2)', marginBottom:16}}>
        <span style={{width:32,height:32,borderRadius:9,background:'var(--grad-signature)',color:'white',display:'grid',placeItems:'center'}}>{OsI('Sparkles',{style:{width:16,height:16}})}</span>
        <div style={{flex:1}}><div style={{fontSize:13, fontWeight:700}}>AI Agent tự xử lý ngoài giờ trực</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Khi không có nhân viên trực, AI tiếp nhận & phản hồi tự động</div></div>
        <Toggle on={aiAfter} onChange={setAiAfter}/>
      </div>
      <div style={{fontSize:13.5, fontWeight:800, margin:'4px 2px 10px'}}>Mẫu ca trực mặc định</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14}}>
        {shifts.map(s=>(
          <Card key={s.id}>
            <div style={{display:'flex', alignItems:'center', marginBottom:10}}>
              <div><div style={{fontSize:14, fontWeight:800}}>{s.name}</div><div style={{fontSize:12, color:'var(--label-02)'}}>{OsI('Clock',{style:{width:12,height:12,verticalAlign:'middle'}})} {s.time}</div></div>
              <span style={{flex:1}}/><button className="btn-icon" style={{width:26,height:26}}>{OsI('Edit',{style:{width:13,height:13}})}</button>
            </div>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', marginBottom:6}}>NHÂN VIÊN TRỰC</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:10}}>
              {s.staff.map(n=>(
                <span key={n} style={{display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px 3px 3px', borderRadius:14, background:n==='AI Agent'?'var(--bg-green)':'var(--fill-02)', fontSize:11.5, fontWeight:600}}>
                  {n==='AI Agent'? <span style={{width:20,height:20,borderRadius:'50%',background:'var(--grad-signature)',color:'white',display:'grid',placeItems:'center'}}>{OsI('Sparkles',{style:{width:11,height:11}})}</span> : <Av n={n} size={20}/>}{n}
                </span>
              ))}
              <button className="btn-icon" style={{width:24,height:24,borderRadius:12,border:'1px dashed var(--fill-04)'}}>{OsI('Plus',{style:{width:12,height:12}})}</button>
            </div>
            <div style={{fontSize:11.5, color:'var(--label-02)'}}><b style={{color:'var(--label-01)'}}>Kênh:</b> {s.channels}</div>
          </Card>
        ))}
      </div>
      {toastNode}
    </Wrap>
  );
}

window.OrgDept = OrgDept;
window.OrgSLA = OrgSLA;
window.OrgKPI = OrgKPI;
window.OrgShifts = OrgShifts;
} catch(e){ console.error('org-settings.jsx', e); }
})();
