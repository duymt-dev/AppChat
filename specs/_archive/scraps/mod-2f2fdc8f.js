/* ============================================================
   tickets-module.jsx — Tickets (Hỗ trợ · SLA · Escalation)
   3-cột: lọc trái · bảng/kanban giữa · panel chi tiết phải
   + checkbox · chuyển tiếp phân cấp · CRUD · AI tự xử + comment
   + tạo danh mục inline · kéo-thả Kanban
   ============================================================ */
;(function(){
try {
const { useState: useTk } = React;
const TkI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const Badge = (p)=> window.ChannelBadge ? React.createElement(window.ChannelBadge, p) : null;

const TK_STATUS = {
  open:        {l:'Đang mở',      c:'#2A6FDB'},
  in_progress: {l:'Đang xử lý',   c:'#C9820B'},
  waiting:     {l:'Chờ phản hồi', c:'#6E48E6'},
  resolved:    {l:'Đã đóng',      c:'#22C55E'},
};
const TK_PRIO = {
  high:   {l:'Cao',        c:'#DC2626'},
  medium: {l:'Trung bình', c:'#C9820B'},
  low:    {l:'Thấp',       c:'#64748B'},
};
const TK_SLA = {
  breach: {l:'Quá hạn',     c:'#DC2626', bg:'#FDECEA'},
  risk:   {l:'Sắp đến hạn', c:'#C9820B', bg:'#FCF3E2'},
  ok:     {l:'Trong hạn',   c:'#1B9E5A', bg:'#E7F7EE'},
};
const AV = ['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'];
const avColor = (n)=> AV[(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%AV.length];
const CHANNELS = ['zalo','facebook','shopee','tiktok','amazon','web','email'];

/* tổ chức: nhóm · trưởng nhóm · nhân viên */
const TK_ORG = [
  {team:'Nhóm Hỗ trợ 1', lead:'Hương', members:['Hương','Lan Anh','Tú Quyên']},
  {team:'Nhóm Hỗ trợ 2', lead:'Minh', members:['Minh','Khoa','Bảo Vy']},
  {team:'Nhóm Kế toán', lead:'Trâm', members:['Trâm','Thu Hà']},
  {team:'AI tự xử', lead:'AI Agent', members:['AI Agent']},
];

function Avatar({ name, ai, size=24 }){
  if (ai) return <span style={{width:size,height:size,borderRadius:'50%',background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{TkI('Sparkles',{style:{width:size*0.5,height:size*0.5}})}</span>;
  return <span style={{width:size,height:size,borderRadius:'50%',background:avColor(name),color:'white',display:'grid',placeItems:'center',fontSize:size*0.4,fontWeight:800,flexShrink:0}}>{(name||'?')[0]}</span>;
}

function Spark({ pts, color }){
  const W=104, H=30, max=Math.max(...pts), min=Math.min(...pts), rng=(max-min)||1;
  const coords = pts.map((p,i)=>[i/(pts.length-1)*W, H-2-((p-min)/rng)*(H-4)]);
  const line = coords.map(c=>c[0].toFixed(1)+','+c[1].toFixed(1)).join(' ');
  const area = '0,'+H+' '+line+' '+W+','+H;
  const gid = 'sp'+color.replace(/[^a-z0-9]/gi,'');
  return (
    <svg width="100%" height={H} viewBox={'0 0 '+W+' '+H} preserveAspectRatio="none" style={{display:'block'}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.18"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={area} fill={'url(#'+gid+')'}/>
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ---------- table row ---------- */
function TicketRow({ t, active, onClick, checked, onCheck, onAction }){
  const [menu, setMenu] = useTk(false);
  const st = TK_STATUS[t.status]||TK_STATUS.open;
  const pr = TK_PRIO[t.priority]||TK_PRIO.low;
  const sla = TK_SLA[t.sla]||TK_SLA.ok;
  const ai = t.assignee==='AI Agent';
  const mBtn = (danger)=>({display:'flex', alignItems:'center', gap:9, width:'100%', padding:'8px 10px', border:'none', background:'transparent', borderRadius:7, cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:'inherit', textAlign:'left', color: danger?'#C8263A':'var(--label-01)'});
  const act = (type)=>{ setMenu(false); onAction && onAction(type, t); };
  return (
    <div onClick={onClick} style={{display:'grid', gridTemplateColumns:'34px minmax(0,2.2fr) 1.3fr 0.8fr 1.3fr 1fr 0.8fr 44px', gap:14, alignItems:'center', padding:'11px 16px', borderBottom:'1px solid var(--fill-03)', background: (active||checked)?'var(--bg-green)':'white', borderLeft:'3px solid '+(active?'var(--primary)':'transparent'), cursor:'pointer'}}
      onMouseEnter={e=>{ if(!active&&!checked) e.currentTarget.style.background='var(--fill-02)'; }} onMouseLeave={e=>{ if(!active&&!checked) e.currentTarget.style.background='white'; }}>
      <div onClick={e=>e.stopPropagation()} style={{display:'flex', alignItems:'center'}}>
        <input type="checkbox" checked={!!checked} onChange={onCheck} style={{width:15, height:15, accentColor:'var(--primary)', cursor:'pointer'}}/>
      </div>
      <div style={{minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:2}}>
          <span style={{fontSize:11, fontFamily:'monospace', fontWeight:700, color:'var(--label-03)'}}>{t.id}</span>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10, background:pr.c+'18', color:pr.c, whiteSpace:'nowrap', flexShrink:0}}><span style={{width:5,height:5,borderRadius:3,background:pr.c}}/>{pr.l}</span>
        </div>
        <div style={{fontSize:13, fontWeight:600, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.title}</div>
        <div style={{fontSize:11, color:'var(--label-03)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.category}</div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:7, minWidth:0}}>
        <Badge name={t.channel} size={18}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12.5, fontWeight:600, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.company}</div>
          <div style={{fontSize:10.5, color:'var(--label-03)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.email}</div>
        </div>
      </div>
      <div><span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:st.c, whiteSpace:'nowrap'}}><span style={{width:7,height:7,borderRadius:4,background:st.c}}/>{st.l}</span></div>
      <div style={{display:'flex', alignItems:'center', gap:7, minWidth:0}}>
        <Avatar name={t.assignee} ai={ai} size={24}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12, fontWeight:600, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{ai?'AI Agent':t.assignee}</div>
          <div style={{fontSize:10.5, color:'var(--label-03)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.group}</div>
        </div>
      </div>
      <div>
        <div style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:sla.c, whiteSpace:'nowrap'}}>{TkI('Clock',{style:{width:12,height:12}})}{t.slaTime}</div>
        <div style={{fontSize:10, fontWeight:700, color:sla.c}}>{sla.l}</div>
      </div>
      <div style={{fontSize:11, color:'var(--label-03)', textAlign:'right', whiteSpace:'nowrap'}}>{t.updated}</div>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative', display:'flex', justifyContent:'flex-end'}}>
        <button className="btn-icon" title="Thao tác" onClick={()=>setMenu(m=>!m)} style={{width:28, height:28}}>{TkI('More',{style:{width:16,height:16}}) || '⋯'}</button>
        {menu && <>
          <div onClick={()=>setMenu(false)} style={{position:'fixed', inset:0, zIndex:60}}/>
          <div style={{position:'absolute', right:0, top:'calc(100% + 4px)', zIndex:61, width:190, background:'white', border:'1px solid var(--fill-04)', borderRadius:11, boxShadow:'0 16px 40px rgba(17,24,39,.2)', padding:5}}>
            <button onClick={()=>act('view')} style={mBtn()}>{TkI('Eye',{style:{width:15,height:15}})}<span style={{flex:1}}>Xem chi tiết</span></button>
            <button onClick={()=>act('edit')} style={mBtn()}>{TkI('Edit',{style:{width:15,height:15}})}<span style={{flex:1}}>Sửa ticket</span></button>
            {t.status!=='waiting' && t.status!=='resolved' && <button onClick={()=>act('pause')} style={mBtn()}>{TkI('Clock',{style:{width:15,height:15}})}<span style={{flex:1}}>Tạm dừng</span></button>}
            {t.status!=='resolved' && <button onClick={()=>act('complete')} style={mBtn()}>{TkI('Check',{style:{width:15,height:15}})}<span style={{flex:1}}>Hoàn thành</span></button>}
            <div style={{height:1, background:'var(--fill-03)', margin:'4px 6px'}}/>
            <button onClick={()=>act('delete')} style={mBtn(true)}>{TkI('Trash',{style:{width:15,height:15}})}<span style={{flex:1}}>Xoá ticket</span></button>
          </div>
        </>}
      </div>
    </div>
  );
}

/* ---------- kanban with drag & drop ---------- */
function KanbanBoard({ tickets, onMove, onOpen }){
  const [drag, setDrag] = useTk(null);
  const [over, setOver] = useTk(null);
  const cols = Object.keys(TK_STATUS);
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, alignItems:'start'}}>
      {cols.map(key=>{ const col=TK_STATUS[key]; const items=tickets.filter(t=>t.status===key); const isOver=over===key; return (
        <div key={key}
          onDragOver={e=>{ e.preventDefault(); setOver(key); }}
          onDragLeave={()=>setOver(o=>o===key?null:o)}
          onDrop={()=>{ if(drag) onMove(drag, key); setDrag(null); setOver(null); }}
          style={{background: isOver?'var(--bg-green)':'var(--fill-02)', border:'1px solid '+(isOver?'var(--primary)':'var(--fill-04)'), borderRadius:12, padding:10, minHeight:120, transition:'background .12s'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'2px 4px 10px'}}>
            <span style={{width:8,height:8,borderRadius:4,background:col.c}}/>
            <span style={{fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:'.04em'}}>{col.l}</span>
            <span style={{fontSize:11, fontWeight:700, color:'var(--label-03)'}}>{items.length}</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {items.map(t=>{ const pr=TK_PRIO[t.priority]||TK_PRIO.low; const sla=TK_SLA[t.sla]||TK_SLA.ok; const ai=t.assignee==='AI Agent'; return (
              <div key={t.id} draggable onDragStart={()=>setDrag(t.id)} onDragEnd={()=>{setDrag(null);setOver(null);}} onClick={()=>onOpen(t.id)}
                style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:11, cursor:'grab', opacity: drag===t.id?0.5:1, boxShadow:'0 1px 2px rgba(17,24,39,.05)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                  <span style={{fontSize:10.5, fontFamily:'monospace', fontWeight:700, color:'var(--label-03)'}}>{t.id}</span>
                  <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize:9.5, fontWeight:700, padding:'1px 6px', borderRadius:8, background:pr.c+'18', color:pr.c}}><span style={{width:4,height:4,borderRadius:2,background:pr.c}}/>{pr.l}</span>
                </div>
                <div style={{fontSize:12.5, fontWeight:600, lineHeight:1.4, marginBottom:8}}>{t.title}</div>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <Badge name={t.channel} size={15}/>
                  <span style={{fontSize:11, color:'var(--label-02)', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.company}</span>
                  <Avatar name={t.assignee} ai={ai} size={20}/>
                </div>
                <div style={{marginTop:7, fontSize:10, fontWeight:700, color:sla.c}}>{TkI('Clock',{style:{width:10,height:10, verticalAlign:'middle'}})} {t.slaTime}</div>
              </div>
            );})}
            {items.length===0 && <div style={{padding:'16px 8px', textAlign:'center', fontSize:11, color:'var(--label-04)', border:'1px dashed var(--fill-04)', borderRadius:8}}>Kéo ticket vào đây</div>}
          </div>
        </div>
      );})}
    </div>
  );
}

/* ---------- create / edit modal ---------- */
function TicketModal({ ticket, categories, onClose, onSave }){
  const isEdit = !!ticket;
  const [f, setF] = useTk(()=> ticket ? {...ticket} : { title:'', company:'', email:'', channel:'zalo', priority:'medium', status:'open', category: categories[0]||'Khác', group:'Nhóm Hỗ trợ 1', assignee:'Hương', desc:'' });
  const set = (k,v)=> setF(s=>({...s, [k]:v}));
  const fld = {width:'100%', height:38, padding:'0 11px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'white', boxSizing:'border-box'};
  const lbl = {display:'block', fontSize:11.5, fontWeight:700, color:'var(--label-02)', marginBottom:5};
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(15,23,42,.5)', zIndex:1200, display:'grid', placeItems:'center', padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:540, maxHeight:'88vh', overflowY:'auto', background:'white', borderRadius:16, boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px', borderBottom:'1px solid var(--fill-03)', display:'flex', alignItems:'center'}}>
          <div style={{fontSize:17, fontWeight:800}}>{isEdit?'Sửa ticket '+ticket.id:'Tạo ticket mới'}</div>
          <span style={{flex:1}}/>
          <button className="btn-icon" onClick={onClose}>{TkI('Close',{style:{width:18,height:18}}) || '✕'}</button>
        </div>
        <div style={{padding:'18px 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
          <div style={{gridColumn:'1 / -1'}}><label style={lbl}>Tiêu đề *</label><input autoFocus value={f.title} onChange={e=>set('title',e.target.value)} placeholder="VD: Khách yêu cầu hoàn tiền…" style={fld}/></div>
          <div><label style={lbl}>Khách hàng / Công ty</label><input value={f.company} onChange={e=>set('company',e.target.value)} placeholder="Cty ABC" style={fld}/></div>
          <div><label style={lbl}>Email</label><input value={f.email} onChange={e=>set('email',e.target.value)} placeholder="lien.he@cty.vn" style={fld}/></div>
          <div><label style={lbl}>Kênh</label><select value={f.channel} onChange={e=>set('channel',e.target.value)} style={fld}>{CHANNELS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Danh mục</label><select value={f.category} onChange={e=>set('category',e.target.value)} style={fld}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Ưu tiên</label><select value={f.priority} onChange={e=>set('priority',e.target.value)} style={fld}>{Object.keys(TK_PRIO).map(k=><option key={k} value={k}>{TK_PRIO[k].l}</option>)}</select></div>
          <div><label style={lbl}>Trạng thái</label><select value={f.status} onChange={e=>set('status',e.target.value)} style={fld}>{Object.keys(TK_STATUS).map(k=><option key={k} value={k}>{TK_STATUS[k].l}</option>)}</select></div>
          <div><label style={lbl}>Nhóm xử lý</label><select value={f.group} onChange={e=>{ const team=TK_ORG.find(o=>o.team===e.target.value); set('group',e.target.value); if(team) set('assignee',team.lead); }} style={fld}>{TK_ORG.map(o=><option key={o.team}>{o.team}</option>)}</select></div>
          <div><label style={lbl}>Người phụ trách</label><select value={f.assignee} onChange={e=>set('assignee',e.target.value)} style={fld}>{(TK_ORG.find(o=>o.team===f.group)?.members||['Hương']).map(m=><option key={m}>{m}</option>)}</select></div>
          <div style={{gridColumn:'1 / -1'}}><label style={lbl}>Mô tả vấn đề</label><textarea value={f.desc} onChange={e=>set('desc',e.target.value)} rows={3} placeholder="Mô tả chi tiết…" style={{...fld, height:'auto', padding:'9px 11px', resize:'vertical', lineHeight:1.5}}/></div>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 22px', borderTop:'1px solid var(--fill-03)', background:'var(--fill-02)'}}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button>
          <button disabled={!f.title.trim()} onClick={()=>onSave(f)} className="btn btn-primary btn-sm" style={{opacity:f.title.trim()?1:.5}}>{isEdit?'Lưu thay đổi':'Tạo ticket'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- right detail panel ---------- */
function TicketDetail({ t, onClose, onEdit, onDelete, onToggleAi, onComment }){
  const [tab, setTab] = useTk('detail');
  const [draft, setDraft] = useTk('');
  const [internal, setInternal] = useTk(true);
  const st = TK_STATUS[t.status]||TK_STATUS.open;
  const pr = TK_PRIO[t.priority]||TK_PRIO.low;
  const sla = TK_SLA[t.sla]||TK_SLA.ok;
  const lbl = {fontSize:11, color:'var(--label-03)', marginBottom:5, fontWeight:600};
  const fld = {width:'100%', height:34, padding:'0 10px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12.5, fontFamily:'inherit', background:'white', color:'var(--label-01)'};
  const kv = (label, node)=>(<div><div style={lbl}>{label}</div>{node}</div>);
  const comments = t.comments||[];
  const send = ()=>{ if(!draft.trim()) return; onComment(t.id, {who: internal?'Nội bộ':'Phản hồi khách', name:'Bạn', text:draft.trim(), internal}); setDraft(''); };

  return (
    <div style={{width:380, borderLeft:'1px solid var(--fill-04)', background:'white', display:'flex', flexDirection:'column', flexShrink:0, minHeight:0}}>
      <div style={{padding:'14px 18px 0', borderBottom:'1px solid var(--fill-03)'}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
          <span style={{fontSize:14, fontWeight:800, fontFamily:'monospace'}}>{t.id}</span>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:10, background:pr.c+'18', color:pr.c}}><span style={{width:5,height:5,borderRadius:3,background:pr.c}}/>{pr.l}</span>
          <span style={{flex:1}}/>
          <button className="btn-icon" onClick={()=>onEdit(t)} title="Sửa ticket">{TkI('Edit',{style:{width:15,height:15}}) || '✎'}</button>
          <button className="btn-icon" onClick={()=>onDelete(t.id)} title="Xóa ticket" style={{color:'#C8263A'}}>{TkI('Trash',{style:{width:15,height:15}}) || '🗑'}</button>
          <button className="btn-icon" onClick={onClose} title="Đóng">{TkI('Close',{style:{width:16,height:16}}) || '✕'}</button>
        </div>
        <div style={{fontSize:16, fontWeight:800, lineHeight:1.35, marginBottom:6}}>{t.title}</div>
        <div style={{display:'flex', gap:14, fontSize:11, color:'var(--label-03)', marginBottom:10}}>
          <span>{TkI('Calendar',{style:{width:12,height:12, verticalAlign:'middle'}})} Tạo: {t.age} trước</span>
          <span>{TkI('Refresh',{style:{width:12,height:12, verticalAlign:'middle'}})} Cập nhật: {t.updated}</span>
        </div>
        <div style={{display:'flex', gap:18}}>
          {[{k:'detail',l:'Chi tiết'},{k:'thread',l:'Trao đổi',n:comments.length||undefined},{k:'history',l:'Lịch sử'},{k:'sla',l:'SLA'}].map(x=>(
            <button key={x.k} onClick={()=>setTab(x.k)} style={{padding:'0 0 10px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight: tab===x.k?700:500, color: tab===x.k?'var(--primary)':'var(--label-02)', borderBottom:'2px solid '+(tab===x.k?'var(--primary)':'transparent'), marginBottom:-1, display:'flex', alignItems:'center', gap:5}}>
              {x.l}{x.n && <span style={{fontSize:10, fontWeight:700, padding:'0 5px', borderRadius:8, background:'var(--fill-03)', color:'var(--label-02)'}}>{x.n}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* AI auto-handle banner */}
      <div style={{padding:'10px 18px', borderBottom:'1px solid var(--fill-03)', background: t.aiAuto?'linear-gradient(135deg,rgba(45,197,106,.08),rgba(43,158,243,.05))':'var(--fill-02)', display:'flex', alignItems:'center', gap:10}}>
        <span style={{width:28,height:28,borderRadius:8,background: t.aiAuto?'var(--grad-signature)':'var(--fill-03)', color: t.aiAuto?'white':'var(--label-03)', display:'grid', placeItems:'center', flexShrink:0}}>{TkI('Sparkles',{style:{width:15,height:15}})}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:12.5, fontWeight:700, color:'var(--label-01)'}}>{t.aiAuto?'AI đang tự xử lý':'AI tự xử lý đang tắt'}</div>
          <div style={{fontSize:11, color:'var(--label-02)'}}>{t.aiAuto?'Bạn có thể can thiệp bất cứ lúc nào':'Nhân viên đang phụ trách trực tiếp'}</div>
        </div>
        {t.aiAuto
          ? <button onClick={()=>{ onToggleAi(t.id, false); setTab('thread'); }} className="btn btn-ghost btn-sm" style={{flexShrink:0}}>{TkI('User',{style:{width:13,height:13}})} Can thiệp</button>
          : <button onClick={()=>onToggleAi(t.id, true)} className="btn btn-primary btn-sm" style={{flexShrink:0}}>{TkI('Sparkles',{style:{width:13,height:13}})} Bật AI</button>}
      </div>

      <div className="scroll" style={{flex:1, overflowY:'auto', padding:'16px 18px'}}>
        {tab==='detail' && <>
          <div style={{fontSize:12.5, fontWeight:800, color:'var(--label-01)', marginBottom:12}}>Thông tin chung</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
            {kv('Khách hàng', <div><div style={{fontSize:13, fontWeight:600}}>{t.company}</div><div style={{fontSize:11, color:'var(--label-03)'}}>{t.email}</div></div>)}
            {kv('Trạng thái', <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:12.5, fontWeight:600, color:st.c, padding:'5px 0'}}><span style={{width:7,height:7,borderRadius:4,background:st.c}}/>{st.l}</span>)}
            {kv('Người phụ trách', <div style={{display:'flex', alignItems:'center', gap:7}}><Avatar name={t.assignee} ai={t.assignee==='AI Agent'} size={22}/><span style={{fontSize:13, fontWeight:600}}>{t.assignee==='AI Agent'?'AI Agent':t.assignee}</span></div>)}
            {kv('Nhóm xử lý', <div style={{fontSize:13, fontWeight:600}}>{t.group}</div>)}
            {kv('Danh mục', <div style={{fontSize:13, fontWeight:600}}>{t.category}</div>)}
            {kv('Ưu tiên', <span style={{fontSize:12.5, fontWeight:700, color:pr.c}}>{pr.l}</span>)}
          </div>
          {kv('SLA', <div style={{display:'flex', alignItems:'center', gap:8}}><span style={{fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:10, background:sla.bg, color:sla.c}}>{sla.l}</span><span style={{fontSize:12.5, fontWeight:600, color:sla.c}}>{t.slaTime}</span></div>)}
          <div style={{fontSize:12.5, fontWeight:800, color:'var(--label-01)', margin:'18px 0 8px'}}>Mô tả vấn đề</div>
          <div style={{fontSize:12.5, color:'var(--label-01)', lineHeight:1.6, background:'var(--fill-02)', borderRadius:10, padding:'12px 14px'}}>{t.desc}</div>
          <div style={{fontSize:12.5, fontWeight:800, color:'var(--label-01)', margin:'18px 0 8px'}}>Thông tin khác</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
            {kv('Nguồn', <div style={{fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6}}><Badge name={t.channel} size={16}/>{t.source}</div>)}
            {kv('Loại ticket', <div style={{fontSize:13, fontWeight:600}}>{t.type}</div>)}
          </div>
          <div style={lbl}>Tag</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {(t.tags||[]).map(tg=><span key={tg} style={{fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:12, background:'var(--fill-03)', color:'var(--label-01)'}}>#{tg}</span>)}
          </div>
        </>}

        {tab==='thread' && <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div style={{display:'flex', gap:8}}>
            <Avatar name={t.customer} size={28}/>
            <div style={{maxWidth:'80%'}}><div style={{fontSize:11, color:'var(--label-03)', marginBottom:3}}>{t.customer}</div><div style={{fontSize:12.5, lineHeight:1.5, padding:'9px 12px', borderRadius:12, background:'var(--fill-02)'}}>{t.desc}</div></div>
          </div>
          {(t.aiAuto) && <div style={{display:'flex', gap:8, flexDirection:'row-reverse'}}>
            <Avatar ai size={28}/>
            <div style={{maxWidth:'80%'}}><div style={{fontSize:11, color:'var(--label-03)', marginBottom:3, textAlign:'right'}}>AI Agent</div><div style={{fontSize:12.5, lineHeight:1.5, padding:'9px 12px', borderRadius:12, background:'var(--primary)', color:'white'}}>Dạ em đã tiếp nhận và đang kiểm tra thông tin, em phản hồi anh/chị trong ít phút ạ.</div></div>
          </div>}
          {comments.map((c,i)=>(
            <div key={i} style={{display:'flex', gap:8, flexDirection:'row-reverse'}}>
              <Avatar name={c.name} size={28}/>
              <div style={{maxWidth:'80%'}}>
                <div style={{fontSize:11, color:'var(--label-03)', marginBottom:3, textAlign:'right'}}>{c.name} · {c.internal?'Ghi chú nội bộ':'Gửi khách'}</div>
                <div style={{fontSize:12.5, lineHeight:1.5, padding:'9px 12px', borderRadius:12, background: c.internal?'#FEF7E6':'var(--primary)', color: c.internal?'#8A5A10':'white', border: c.internal?'1px solid #F0DCB0':'none'}}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>}

        {tab==='history' && <div style={{display:'flex', flexDirection:'column'}}>
          {[
            {t:'Tạo ticket', by:'Hệ thống', at:t.age+' trước', c:'#2A6FDB'},
            {t:'Phân công cho '+(t.assignee==='AI Agent'?'AI Agent':t.assignee), by:'Quy tắc định tuyến', at:t.age+' trước', c:'#6E48E6'},
            {t:'Đổi trạng thái → '+st.l, by:t.assignee==='AI Agent'?'AI Agent':t.assignee, at:t.updated, c:st.c},
          ].map((h,i,arr)=>(
            <div key={i} style={{display:'flex', gap:11}}>
              <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                <span style={{width:10,height:10,borderRadius:5,background:h.c,marginTop:3,flexShrink:0}}/>
                {i<arr.length-1 && <span style={{width:2, flex:1, background:'var(--fill-03)', minHeight:24}}/>}
              </div>
              <div style={{paddingBottom:16}}><div style={{fontSize:12.5, fontWeight:600}}>{h.t}</div><div style={{fontSize:11, color:'var(--label-03)'}}>{h.by} · {h.at}</div></div>
            </div>
          ))}
        </div>}

        {tab==='sla' && <>
          <div style={{display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderRadius:12, background:sla.bg, marginBottom:14}}>
            <span style={{width:38,height:38,borderRadius:10,background:'white',display:'grid',placeItems:'center',color:sla.c}}>{TkI('Clock',{style:{width:19,height:19}})}</span>
            <div><div style={{fontSize:14, fontWeight:800, color:sla.c}}>{sla.l}</div><div style={{fontSize:12, color:'var(--label-02)'}}>{t.slaTime}</div></div>
          </div>
          {[{l:'Phản hồi đầu (FRT)', v:'15 phút', target:'≤ 30 phút', ok:true},{l:'Thời gian xử lý', v:t.slaTime, target:'≤ 8 giờ', ok:t.sla!=='breach'},{l:'Số lần escalation', v:t.priority==='high'?'1':'0', target:'≤ 1', ok:true}].map((r,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid var(--fill-03)'}}>
              <span style={{width:8,height:8,borderRadius:4,background:r.ok?'#1B9E5A':'#DC2626',flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:12.5, fontWeight:600}}>{r.l}</div><div style={{fontSize:11, color:'var(--label-03)'}}>Mục tiêu {r.target}</div></div>
              <span style={{fontSize:12.5, fontWeight:700, color:r.ok?'#1B9E5A':'#DC2626'}}>{r.v}</span>
            </div>
          ))}
        </>}
      </div>

      {/* footer: comment composer (intervention) */}
      <div style={{padding:'10px 14px', borderTop:'1px solid var(--fill-04)'}}>
        <div style={{display:'flex', gap:4, marginBottom:7}}>
          {[{k:true,l:'Ghi chú nội bộ'},{k:false,l:'Trả lời khách'}].map(x=>(
            <button key={String(x.k)} onClick={()=>setInternal(x.k)} style={{flex:1, padding:'5px', borderRadius:7, fontSize:11.5, fontWeight:700, cursor:'pointer', border:'1px solid '+(internal===x.k?'var(--primary)':'var(--fill-04)'), background:internal===x.k?'var(--bg-green)':'white', color:internal===x.k?'var(--pr-dark-2)':'var(--label-02)', fontFamily:'inherit'}}>{x.l}</button>
          ))}
        </div>
        <div style={{display:'flex', gap:8, alignItems:'flex-end', border:'1px solid var(--fill-04)', borderRadius:10, padding:'7px 9px'}}>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }} rows={1} placeholder={internal?'Ghi chú cho đồng đội…':'Trả lời khách hàng…'} style={{flex:1, border:'none', outline:'none', resize:'none', fontSize:12.5, fontFamily:'inherit', background:'transparent', lineHeight:1.5, maxHeight:80}}/>
          <button onClick={send} disabled={!draft.trim()} style={{width:32, height:32, borderRadius:8, border:'none', cursor:draft.trim()?'pointer':'default', display:'grid', placeItems:'center', background:draft.trim()?'var(--primary)':'var(--fill-03)', color:'white', flexShrink:0}}>{TkI('Send',{style:{width:15,height:15}}) || '➤'}</button>
        </div>
      </div>
    </div>
  );
}

/* generic filter dropdown for toolbar */
function FilterDD({ label, icon, value, options, onChange }){
  const [open, setOpen] = useTk(false);
  const cur = options.find(o=>o.k===value);
  const activeLabel = value && value!=='all' && cur ? cur.l : label;
  const isActive = value && value!=='all';
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:'inline-flex', alignItems:'center', gap:6, height:30, padding:'0 11px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'1px solid '+(isActive?'var(--primary)':'var(--fill-04)'), background:isActive?'var(--bg-green)':'white', color:isActive?'var(--pr-dark-2)':'var(--label-01)'}}>
        {icon && TkI(icon,{style:{width:13,height:13}})} {activeLabel} {TkI('ChevronDown',{style:{width:12,height:12}}) || '▾'}
      </button>
      {open && <>
        <div onClick={()=>setOpen(false)} style={{position:'fixed', inset:0, zIndex:40}}/>
        <div style={{position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:41, minWidth:170, background:'white', border:'1px solid var(--fill-04)', borderRadius:10, boxShadow:'0 14px 36px rgba(17,24,39,.16)', padding:5}}>
          {options.map(o=>(
            <button key={o.k} onClick={()=>{ onChange(o.k); setOpen(false); }} style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 9px', border:'none', background: value===o.k?'var(--bg-green)':'transparent', borderRadius:7, cursor:'pointer', textAlign:'left', fontSize:12.5, fontWeight: value===o.k?700:500, color:'var(--label-01)', fontFamily:'inherit'}}
              onMouseEnter={e=>{ if(value!==o.k) e.currentTarget.style.background='var(--fill-02)'; }} onMouseLeave={e=>{ if(value!==o.k) e.currentTarget.style.background='transparent'; }}>
              {o.c && <span style={{width:7,height:7,borderRadius:4,background:o.c,flexShrink:0}}/>}
              <span style={{flex:1}}>{o.l}</span>
              {value===o.k && (TkI('Check',{style:{width:13,height:13, color:'var(--primary)'}}) || '✓')}
            </button>
          ))}
        </div>
      </>}
    </div>
  );
}

let TK_SEQ = 2042;

function TicketsModule(){
  const seed = (window.AppData && window.AppData.TICKETS) || [];
  const [tickets, setTickets] = useTk(()=> seed.map(t=>({...t, aiAuto: t.assignee==='AI Agent', comments:[]})));
  const [view, setView] = useTk('list');
  const [status, setStatus] = useTk('all');
  const [prio, setPrio] = useTk('all');
  const [cat, setCat] = useTk('all');
  const [grp, setGrp] = useTk('all');
  const [asg, setAsg] = useTk('all');
  const [sla, setSla] = useTk('all');
  const [page, setPage] = useTk(1);
  const [perPage, setPerPage] = useTk(10);
  const [q, setQ] = useTk('');
  const [sel, setSel] = useTk(null);
  const [checked, setChecked] = useTk(()=>new Set());
  const [fwdOpen, setFwdOpen] = useTk(false);
  const [fwdTeam, setFwdTeam] = useTk(null);
  const [assignOpen, setAssignOpen] = useTk(false);
  const [toast, setToast] = useTk('');
  const [editing, setEditing] = useTk(null);   // null | {} new | ticket
  const [modalOpen, setModalOpen] = useTk(false);
  const [confirmDel, setConfirmDel] = useTk(null);
  const [cats, setCats] = useTk(()=> [...new Set(seed.map(t=>t.category))]);
  const [addCat, setAddCat] = useTk(false);
  const [newCat, setNewCat] = useTk('');
  React.useEffect(()=>{ if(toast){ const x=setTimeout(()=>setToast(''),2000); return ()=>clearTimeout(x); } }, [toast]);

  const sCount = (k)=> k==='all'?tickets.length:tickets.filter(t=>t.status===k).length;
  const pCount = (k)=> tickets.filter(t=>t.priority===k).length;
  const cCount = (k)=> tickets.filter(t=>t.category===k).length;

  const list = tickets.filter(t =>
    (status==='all'||t.status===status) &&
    (prio==='all'||t.priority===prio) &&
    (cat==='all'||t.category===cat) &&
    (grp==='all'||t.group===grp) &&
    (asg==='all'||t.assignee===asg) &&
    (sla==='all'||t.sla===sla) &&
    (!q.trim() || (t.title+' '+t.customer+' '+t.company+' '+t.id+' '+t.assignee).toLowerCase().includes(q.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(list.length/perPage));
  const curPage = Math.min(page, totalPages);
  const paged = list.slice((curPage-1)*perPage, curPage*perPage);
  React.useEffect(()=>{ setPage(1); }, [status, prio, cat, grp, asg, sla, q]);
  const selT = tickets.find(t=>t.id===sel);

  const toggleCheck = (id)=> setChecked(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const allChecked = list.length>0 && list.every(t=>checked.has(t.id));
  const someChecked = list.some(t=>checked.has(t.id));
  const toggleAll = ()=> setChecked(s=>{ if(list.every(t=>s.has(t.id))) { const n=new Set(s); list.forEach(t=>n.delete(t.id)); return n; } const n=new Set(s); list.forEach(t=>n.add(t.id)); return n; });
  const clearChecks = ()=> setChecked(new Set());

  // forward (chuyển tiếp) → assign team + person
  const forwardTo = (person, team)=>{ const ids=[...checked]; setTickets(ts=>ts.map(t=> checked.has(t.id) ? {...t, assignee:person, group:team, aiAuto:person==='AI Agent'} : t)); setToast('Đã chuyển tiếp '+ids.length+' ticket → '+person+' ('+team+')'); setFwdOpen(false); setFwdTeam(null); clearChecks(); };
  const assignTo = (person, team)=>{ const ids=[...checked]; setTickets(ts=>ts.map(t=> checked.has(t.id) ? {...t, assignee:person, group:team||t.group, aiAuto:false} : t)); setToast('Đã gán '+ids.length+' ticket → '+person); setAssignOpen(false); clearChecks(); };
  const aiHandle = ()=>{ const ids=[...checked]; setTickets(ts=>ts.map(t=> checked.has(t.id) ? {...t, assignee:'AI Agent', group:'AI tự xử', aiAuto:true} : t)); setToast('AI đang xử lý '+ids.length+' ticket'); clearChecks(); };

  // CRUD
  const openNew = ()=>{ setEditing(null); setModalOpen(true); };
  const openEdit = (t)=>{ setEditing(t); setModalOpen(true); };
  const saveTicket = (f)=>{
    if (editing) { setTickets(ts=>ts.map(t=>t.id===editing.id?{...t, ...f, updated:'vừa xong'}:t)); setToast('Đã lưu '+editing.id); }
    else { const id='#TKT-'+(TK_SEQ++); const nt={ id, ...f, customer:f.company||'Khách', age:'vừa xong', updated:'vừa xong', sla:'ok', slaTime:'Còn 8h', source:f.channel, type:'Yêu cầu', tags:[], aiAuto:f.assignee==='AI Agent', comments:[] }; setTickets(ts=>[nt, ...ts]); setSel(id); setToast('Đã tạo ticket '+id); }
    setModalOpen(false); setEditing(null);
  };
  const delTicket = (id)=>{ setTickets(ts=>ts.filter(t=>t.id!==id)); if(sel===id) setSel(null); setConfirmDel(null); setChecked(s=>{ const n=new Set(s); n.delete(id); return n; }); setToast('Đã xóa '+id); };
  const bulkDelete = ()=>{ const ids=[...checked]; setTickets(ts=>ts.filter(t=>!checked.has(t.id))); if(checked.has(sel)) setSel(null); clearChecks(); setToast('Đã xóa '+ids.length+' ticket'); };
  const toggleAi = (id, v)=>{ setTickets(ts=>ts.map(t=>t.id===id?{...t, aiAuto:v}:t)); setToast(v?'AI tự xử lý đã bật':'Bạn đang can thiệp thủ công'); };
  const addComment = (id, c)=>{ setTickets(ts=>ts.map(t=>t.id===id?{...t, comments:[...(t.comments||[]), c], updated:'vừa xong', aiAuto: c.internal? t.aiAuto : false}:t)); setToast(c.internal?'Đã thêm ghi chú nội bộ':'Đã gửi trả lời khách'); };
  const moveTicket = (id, st)=>{ setTickets(ts=>ts.map(t=>t.id===id?{...t, status:st, updated:'vừa xong', sla: st==='resolved'?'ok':t.sla, slaTime: st==='resolved'?'Đã đóng':t.slaTime}:t)); setToast('Đã chuyển → '+TK_STATUS[st].l); };
  const rowAction = (type, t)=>{
    if (type==='view') setSel(t.id);
    else if (type==='edit') openEdit(t);
    else if (type==='delete') setConfirmDel(t);
    else if (type==='forward') { setChecked(s=>{ const n=new Set(s); n.add(t.id); return n; }); setToast('Đã chọn ticket — dùng thanh trên để chuyển tiếp'); }
    else if (type==='pause') { setTickets(ts=>ts.map(x=>x.id===t.id?{...x, status:'waiting', updated:'vừa xong'}:x)); setToast('Đã tạm dừng “'+t.title+'”'); }
    else if (type==='complete') { moveTicket(t.id,'resolved'); setToast('Đã hoàn thành “'+t.title+'”'); }
  };
  const addCategory = ()=>{ const v=newCat.trim(); if(v && !cats.includes(v)){ setCats(c=>[...c, v]); setCat(v); setToast('Đã tạo danh mục "'+v+'"'); } setNewCat(''); setAddCat(false); };

  const railBtn = (active)=>({
    width:'100%', padding:'8px 14px', display:'flex', alignItems:'center', gap:8,
    border:'none', background: active?'var(--bg-green)':'transparent',
    borderLeft:'3px solid '+(active?'var(--primary)':'transparent'),
    cursor:'pointer', textAlign:'left', fontSize:12.5,
    fontWeight: active?600:500, color: active?'var(--pr-dark-2)':'var(--label-01)', fontFamily:'inherit'
  });
  const countPill = (active)=>({fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:8, background: active?'var(--primary)':'var(--fill-03)', color: active?'white':'var(--label-02)'});

  const kpis = [
    {k:'all', l:'Tất cả tickets', v:tickets.length, d:'+12% so với tuần trước', ic:'Activity', c:'#2A6FDB', sp:[8,10,7,11,9,13,10,14,12,15]},
    {k:'open', l:'Đang mở', v:sCount('open'), d:'+5% so với tuần trước', ic:'Inbox', c:'#C9820B', sp:[6,7,9,6,8,7,10,8,11,9]},
    {k:'waiting', l:'Đang chờ phản hồi', v:sCount('waiting'), d:'+8% so với tuần trước', ic:'Clock', c:'#6E48E6', sp:[4,6,5,7,6,8,7,9,8,10]},
    {k:'breach', l:'Quá hạn SLA', v:tickets.filter(t=>t.sla==='breach').length, d:'+20% so với tuần trước', ic:'Bell', c:'#DC2626', sla:true, sp:[2,3,2,4,3,5,4,6,5,7]},
    {k:'resolved', l:'Đã đóng', v:sCount('resolved'), d:'+15% so với tuần trước', ic:'Check', c:'#22C55E', sp:[9,11,10,13,12,15,13,17,15,19]},
  ];

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Tickets</h1>
        <span className="crumb">Hỗ trợ · SLA · Escalation · AI gợi ý xử lý</span>
        <span className="spacer"/>
        <button className="btn btn-ghost btn-sm">{TkI('Sparkles',{style:{width:14,height:14}})} AI gợi ý xử lý</button>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, gap:2}}>
          {[{k:'list',i:'List',l:'Danh sách'},{k:'kanban',i:'Grid',l:'Kanban'}].map(v=>(
            <button key={v.k} onClick={()=>setView(v.k)} style={{padding:'4px 9px', border:'none', borderRadius:5, cursor:'pointer', background:view===v.k?'white':'transparent', color:view===v.k?'var(--label-01)':'var(--label-02)', boxShadow:view===v.k?'var(--shadow-sm)':'none', display:'inline-flex', gap:5, alignItems:'center', fontSize:11.5, fontWeight:600}}>
              {TkI(v.i,{style:{width:12,height:12}})}{v.l}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openNew}>{TkI('Plus',{style:{width:14,height:14}})} Tạo ticket mới</button>
        {window.AIAssistBtn && <window.AIAssistBtn label="Trợ lý AI" ctx="Tickets" cls="btn btn-primary"/>}
      </div>

      <div style={{flex:1, display:'flex', minHeight:0}}>
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
      {/* 5 KPI — compact */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, padding:'10px 20px 8px', background:'white', borderBottom:'1px solid var(--fill-04)'}}>
        {kpis.map(k=>{ const active = k.sla ? false : status===k.k; return (
          <button key={k.k} onClick={()=>{ if(k.sla){ setStatus('all'); } else setStatus(k.k); }} style={{textAlign:'left', background: active?'var(--bg-green)':'white', border:'1px solid '+(active?'var(--primary)':'var(--fill-04)'), borderRadius:10, padding:'9px 12px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:10}}>
            <span style={{width:30, height:30, borderRadius:8, background:k.c+'18', color:k.c, display:'grid', placeItems:'center', flexShrink:0}}>{TkI(k.ic,{style:{width:15,height:15}})}</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{k.l}</div>
              <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                <span style={{fontSize:19, fontWeight:800, color:'var(--label-01)', lineHeight:1.15}}>{k.v.toLocaleString('vi-VN')}</span>
                <span style={{fontSize:9.5, color: k.sla?'#DC2626':'#1B9E5A', fontWeight:700, whiteSpace:'nowrap'}}>{TkI('TrendUp',{style:{width:9,height:9}}) || '↑'} {k.d.replace(' so với tuần trước','')}</span>
              </div>
            </div>
          </button>
        );})}
      </div>

      <div style={{flex:1, display:'flex', minHeight:0, background:'var(--fill-02)'}}>
        {/* Left rail */}
        <div style={{display:'none', width:226, background:'white', borderRight:'1px solid var(--fill-04)', padding:'14px 0', overflowY:'auto', flexShrink:0}}>
          <div style={{padding:'0 14px 6px'}}><span style={{fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)'}}>TRẠNG THÁI</span></div>
          {[{k:'all', l:'Tất cả ticket', c:'var(--label-02)'}, ...Object.keys(TK_STATUS).map(k=>({k, l:TK_STATUS[k].l, c:TK_STATUS[k].c}))].map(v=>{ const active=status===v.k; return (
            <button key={v.k} onClick={()=>setStatus(v.k)} style={railBtn(active)}>
              <span style={{width:7,height:7,borderRadius:4,background:v.c,flexShrink:0}}/>
              <span style={{flex:1}}>{v.l}</span>
              <span style={countPill(active)}>{sCount(v.k)}</span>
            </button>
          );})}

          <div style={{margin:'18px 14px 8px', paddingTop:12, borderTop:'1px solid var(--fill-04)'}}><span style={{fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)'}}>ƯU TIÊN</span></div>
          {[{k:'all', l:'Tất cả'}, ...Object.keys(TK_PRIO).map(k=>({k, l:TK_PRIO[k].l, c:TK_PRIO[k].c}))].map(v=>{ const active=prio===v.k; return (
            <button key={v.k} onClick={()=>setPrio(v.k)} style={railBtn(active)}>
              {v.c ? <span style={{width:7,height:7,borderRadius:4,background:v.c,flexShrink:0}}/> : <span style={{width:7}}/>}
              <span style={{flex:1}}>{v.l}</span>
              {v.k!=='all' && <span style={{fontSize:10.5, fontWeight:700, color:'var(--label-03)'}}>{pCount(v.k)}</span>}
            </button>
          );})}

          <div style={{margin:'18px 14px 8px', paddingTop:12, borderTop:'1px solid var(--fill-04)', display:'flex', alignItems:'center'}}>
            <span style={{fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)', flex:1}}>DANH MỤC</span>
            <button onClick={()=>setAddCat(v=>!v)} title="Tạo danh mục" className="btn-icon" style={{width:20, height:20}}>{TkI('Plus',{style:{width:12,height:12}}) || '+'}</button>
          </div>
          {addCat && (
            <div style={{display:'flex', gap:6, padding:'2px 14px 8px'}}>
              <input autoFocus value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addCategory(); if(e.key==='Escape'){ setAddCat(false); setNewCat(''); } }} placeholder="Tên danh mục…" style={{flex:1, border:'1px solid var(--fill-04)', borderRadius:7, padding:'5px 8px', fontSize:12, fontFamily:'inherit', outline:'none', minWidth:0}}/>
              <button onClick={addCategory} style={{padding:'5px 10px', borderRadius:7, border:'none', background:'var(--primary)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>Tạo</button>
            </div>
          )}
          <button onClick={()=>setCat('all')} style={railBtn(cat==='all')}><span style={{width:7}}/><span style={{flex:1}}>Tất cả danh mục</span></button>
          {cats.map(cName=>{ const active=cat===cName; return (
            <button key={cName} onClick={()=>setCat(cName)} style={railBtn(active)}>
              <span style={{width:7,height:7,borderRadius:4,background:'var(--label-04)',flexShrink:0}}/>
              <span style={{flex:1}}>{cName}</span>
              <span style={{fontSize:10.5, fontWeight:700, color:'var(--label-03)'}}>{cCount(cName)}</span>
            </button>
          );})}

          <div style={{margin:'18px 14px 8px', paddingTop:12, borderTop:'1px solid var(--fill-04)'}}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:'.05em', marginBottom:8}}>LỌC THEO TRƯỜNG</div>
            {[{l:'Phụ trách', i:'User'},{l:'Nhóm xử lý', i:'Users'},{l:'Tình trạng SLA', i:'Clock'}].map(f=>(
              <button key={f.l} style={{width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 8px', marginBottom:4, border:'1px solid var(--fill-04)', borderRadius:7, background:'white', cursor:'pointer', fontSize:12, color:'var(--label-01)', fontFamily:'inherit'}}>
                {TkI(f.i,{style:{width:13,height:13, color:'var(--label-03)'}})}
                <span style={{flex:1, textAlign:'left'}}>{f.l}</span>
                {TkI('ArrowRight',{style:{width:11,height:11, color:'var(--label-04)'}})}
              </button>
            ))}
          </div>
        </div>

        {/* Center */}
        <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap:10, padding:'12px 20px 10px'}}>
            <span style={{fontSize:13.5, fontWeight:700}}>
              {status==='all' ? 'Tất cả ticket' : TK_STATUS[status].l}
              {prio!=='all' && <span style={{color:'var(--label-03)', fontWeight:500}}> · Ưu tiên {TK_PRIO[prio].l}</span>}
              {cat!=='all' && <span style={{color:'var(--label-03)', fontWeight:500}}> · {cat}</span>}
            </span>
            <span style={{fontSize:12, color:'var(--label-03)'}}>{list.length} ticket</span>
            <span style={{flex:1}}/>
            <div style={{position:'relative'}}>
              {TkI('Search',{style:{position:'absolute', left:9, top:8, width:13, height:13, color:'var(--label-03)'}})}
              <input placeholder="Tìm ticket, khách, mã…" value={q} onChange={e=>setQ(e.target.value)} style={{height:30, width:220, paddingLeft:29, border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12, outline:'none', fontFamily:'inherit'}}/>
            </div>
            <button className="btn btn-ghost btn-sm">{TkI('Sort',{style:{width:13,height:13}})} Mới nhất</button>
          </div>

          {/* Toolbar quick-filter dropdowns */}
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'0 20px 10px', flexWrap:'wrap'}}>
            <FilterDD label="Ưu tiên" icon="Bell" value={prio} onChange={setPrio} options={[{k:'all',l:'Tất cả ưu tiên'}, ...Object.keys(TK_PRIO).map(k=>({k, l:TK_PRIO[k].l, c:TK_PRIO[k].c}))]}/>
            <FilterDD label="Trạng thái" icon="Activity" value={status} onChange={setStatus} options={[{k:'all',l:'Tất cả trạng thái'}, ...Object.keys(TK_STATUS).map(k=>({k, l:TK_STATUS[k].l, c:TK_STATUS[k].c}))]}/>
            <FilterDD label="Nhóm xử lý" icon="Users" value={grp} onChange={setGrp} options={[{k:'all',l:'Tất cả nhóm'}, ...TK_ORG.map(o=>({k:o.team, l:o.team}))]}/>
            <FilterDD label="Danh mục" icon="Tag" value={cat} onChange={setCat} options={[{k:'all',l:'Tất cả danh mục'}, ...cats.map(c=>({k:c, l:c}))]}/>
            <FilterDD label="Người xử lý" icon="User" value={asg} onChange={setAsg} options={[{k:'all',l:'Tất cả người xử lý'}, ...[...new Set(tickets.map(t=>t.assignee))].map(a=>({k:a, l:a}))]}/>
            <FilterDD label="SLA" icon="Clock" value={sla} onChange={setSla} options={[{k:'all',l:'Tất cả SLA'}, {k:'breach',l:'Quá hạn',c:'#DC2626'}, {k:'risk',l:'Sắp đến hạn',c:'#C9820B'}, {k:'ok',l:'Trong hạn',c:'#1B9E5A'}]}/>
            {(prio!=='all'||status!=='all'||grp!=='all'||cat!=='all') && <button onClick={()=>{ setPrio('all'); setStatus('all'); setGrp('all'); setCat('all'); }} style={{fontSize:11.5, fontWeight:700, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>Xoá lọc</button>}
            <span style={{flex:1}}/>
            <button onClick={()=>setToast('Đang xuất '+list.length+' ticket ra Excel…')} className="btn btn-ghost btn-sm" style={{gap:5}}>{TkI('Download',{style:{width:13,height:13,transform:'rotate(180deg)'}})} Xuất</button>
          </div>

          {/* Bulk bar */}
          {checked.size>0 && view!=='kanban' && (
            <div style={{display:'flex', alignItems:'center', gap:10, margin:'0 20px 10px', padding:'9px 14px', background:'var(--bg-green)', border:'1px solid var(--primary)', borderRadius:10}}>
              <span style={{fontSize:12.5, fontWeight:700, color:'var(--pr-dark-2)'}}>{TkI('Check',{style:{width:14,height:14, verticalAlign:'middle'}})} Đã chọn {checked.size} ticket</span>
              <span style={{flex:1}}/>
              {/* 1 · Gán người phụ trách */}
              <div style={{position:'relative'}}>
                <button onClick={()=>{ setAssignOpen(o=>!o); setFwdOpen(false); }} className="btn btn-ghost btn-sm" style={{gap:6}}>{TkI('User',{style:{width:14,height:14}})} Gán người phụ trách {TkI('ChevronDown',{style:{width:12,height:12}}) || '▾'}</button>
                {assignOpen && <>
                  <div onClick={()=>setAssignOpen(false)} style={{position:'fixed', inset:0, zIndex:50}}/>
                  <div className="scroll" style={{position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:51, width:240, maxHeight:320, overflowY:'auto', background:'white', border:'1px solid var(--fill-04)', borderRadius:12, boxShadow:'0 18px 44px rgba(17,24,39,.2)', padding:6}}>
                    {TK_ORG.map(o=>(
                      <React.Fragment key={o.team}>
                        <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', color:'var(--label-03)', textTransform:'uppercase', padding:'7px 9px 4px'}}>{o.team}</div>
                        {o.members.map(m=>{ const isLead=o.lead===m; return (
                          <button key={m} onClick={()=>assignTo(m, o.team)} style={{display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 9px', border:'none', background:'transparent', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit'}}
                            onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <Avatar name={m} ai={m==='AI Agent'} size={24}/>
                            <span style={{flex:1, fontSize:12.5, fontWeight:600}}>{m}</span>
                            {isLead && <span style={{fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:8, background:'var(--bg-green)', color:'var(--pr-dark-2)'}}>TN</span>}
                          </button>
                        );})}
                      </React.Fragment>
                    ))}
                  </div>
                </>}
              </div>
              {/* 2 · Chuyển tiếp (cá nhân / trưởng nhóm) */}
              <div style={{position:'relative'}}>
                <button onClick={()=>{ setFwdOpen(o=>!o); setFwdTeam(null); setAssignOpen(false); }} className="btn btn-ghost btn-sm" style={{gap:6}}>{TkI('ArrowRight',{style:{width:14,height:14}})} Chuyển tiếp {TkI('ChevronDown',{style:{width:12,height:12}}) || '▾'}</button>
                {fwdOpen && <>
                  <div onClick={()=>{ setFwdOpen(false); setFwdTeam(null); }} style={{position:'fixed', inset:0, zIndex:50}}/>
                  <div style={{position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:51, width:260, background:'white', border:'1px solid var(--fill-04)', borderRadius:12, boxShadow:'0 18px 44px rgba(17,24,39,.2)', padding:6}}>
                    {!fwdTeam ? <>
                      <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', color:'var(--label-03)', textTransform:'uppercase', padding:'6px 9px 5px'}}>Chuyển tiếp tới trưởng nhóm</div>
                      {TK_ORG.map(o=>(
                        <button key={o.team} onClick={()=>setFwdTeam(o.team)} style={{display:'flex', alignItems:'center', gap:9, width:'100%', padding:'8px 9px', border:'none', background:'transparent', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <Avatar name={o.lead} ai={o.lead==='AI Agent'} size={26}/>
                          <span style={{flex:1, minWidth:0}}><span style={{display:'block', fontSize:12.5, fontWeight:600}}>{o.team}</span><span style={{display:'block', fontSize:10.5, color:'var(--label-03)'}}>Trưởng nhóm: {o.lead}</span></span>
                          {TkI('ArrowRight',{style:{width:13,height:13, color:'var(--label-04)'}})}
                        </button>
                      ))}
                    </> : <>
                      <button onClick={()=>setFwdTeam(null)} style={{display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:600, color:'var(--label-02)', background:'none', border:'none', cursor:'pointer', padding:'6px 9px', fontFamily:'inherit'}}>{TkI('ArrowLeft',{style:{width:13,height:13}}) || '←'} {fwdTeam}</button>
                      <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', color:'var(--label-03)', textTransform:'uppercase', padding:'4px 9px 5px', borderTop:'1px solid var(--fill-03)'}}>Giao cho nhân viên</div>
                      {(TK_ORG.find(o=>o.team===fwdTeam)?.members||[]).map(m=>{ const isLead = TK_ORG.find(o=>o.team===fwdTeam)?.lead===m; return (
                        <button key={m} onClick={()=>forwardTo(m, fwdTeam)} style={{display:'flex', alignItems:'center', gap:9, width:'100%', padding:'8px 9px', border:'none', background:'transparent', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <Avatar name={m} ai={m==='AI Agent'} size={24}/>
                          <span style={{flex:1, fontSize:12.5, fontWeight:600}}>{m}</span>
                          {isLead && <span style={{fontSize:9.5, fontWeight:700, padding:'1px 6px', borderRadius:8, background:'var(--bg-green)', color:'var(--pr-dark-2)'}}>Trưởng nhóm</span>}
                        </button>
                      );})}
                    </>}
                  </div>
                </>}
              </div>
              {/* 3 · AI xử lý */}
              <button onClick={aiHandle} className="btn btn-primary btn-sm" style={{gap:6}}>{TkI('Sparkles',{style:{width:14,height:14}})} AI xử lý</button>
              <button onClick={()=>{ setToast('Đã đổi ưu tiên '+checked.size+' ticket'); clearChecks(); }} className="btn btn-ghost btn-sm" style={{gap:5}}>{TkI('Bell',{style:{width:13,height:13}})} Đổi ưu tiên</button>
              <button onClick={bulkDelete} className="btn btn-ghost btn-sm" style={{gap:5, color:'#C8263A'}}>{TkI('Trash',{style:{width:13,height:13}})} Xóa</button>
              <button onClick={clearChecks} className="btn-icon" title="Bỏ chọn">{TkI('Close',{style:{width:15,height:15}}) || '✕'}</button>
            </div>
          )}

          {view==='kanban' ? (
            <div className="scroll" style={{flex:1, overflow:'auto', padding:'4px 20px 20px'}}>
              <KanbanBoard tickets={list} onMove={moveTicket} onOpen={(id)=>setSel(id)}/>
            </div>
          ) : (
            <div className="scroll" style={{flex:1, overflow:'auto', margin:'0 20px 20px', border:'1px solid var(--fill-04)', borderRadius:12, background:'white'}}>
              <div style={{display:'grid', gridTemplateColumns:'34px minmax(0,2.2fr) 1.3fr 0.8fr 1.3fr 1fr 0.8fr 44px', gap:14, padding:'10px 16px', borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)', position:'sticky', top:0, zIndex:1}}>
                <div style={{display:'flex', alignItems:'center'}}><input type="checkbox" checked={allChecked} ref={el=>{ if(el) el.indeterminate = someChecked && !allChecked; }} onChange={toggleAll} style={{width:15, height:15, accentColor:'var(--primary)', cursor:'pointer'}}/></div>
                {['Tiêu đề','Khách hàng','Trạng thái','Người phụ trách','SLA','Cập nhật cuối','Thao tác'].map((h,i)=>(
                  <span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', textAlign: i>=5?'right':'left'}}>{h}</span>
                ))}
              </div>
              {list.length===0 ? (
                <div style={{padding:'48px 20px', textAlign:'center', color:'var(--label-03)', fontSize:13}}>Không có ticket nào khớp bộ lọc.</div>
              ) : paged.map(t => <TicketRow key={t.id} t={t} active={sel===t.id} onClick={()=>setSel(t.id)} checked={checked.has(t.id)} onCheck={()=>toggleCheck(t.id)} onAction={rowAction}/>)}
            </div>
          )}

          {/* Pagination footer */}
          {view!=='kanban' && list.length>0 && (
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'0 20px 16px', flexShrink:0}}>
              <span style={{fontSize:12, color:'var(--label-02)'}}>Hiển thị <b style={{color:'var(--label-01)'}}>{(curPage-1)*perPage+1}–{Math.min(curPage*perPage, list.length)}</b> của {list.length.toLocaleString('vi-VN')} ticket</span>
              <span style={{flex:1}}/>
              <div style={{display:'flex', alignItems:'center', gap:3}}>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage===1} className="btn-icon" style={{width:28, height:28, opacity:curPage===1?.4:1}}>{TkI('ArrowLeft',{style:{width:14,height:14}}) || '‹'}</button>
                {Array.from({length:totalPages}).slice(0,5).map((_,i)=>{ const p=i+1; return (
                  <button key={p} onClick={()=>setPage(p)} style={{minWidth:28, height:28, borderRadius:7, border:'1px solid '+(curPage===p?'var(--primary)':'var(--fill-04)'), background:curPage===p?'var(--primary)':'white', color:curPage===p?'white':'var(--label-01)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>{p}</button>
                );})}
                {totalPages>5 && <span style={{fontSize:12, color:'var(--label-03)', padding:'0 4px'}}>…</span>}
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={curPage===totalPages} className="btn-icon" style={{width:28, height:28, opacity:curPage===totalPages?.4:1}}>{TkI('ArrowRight',{style:{width:14,height:14}}) || '›'}</button>
              </div>
              <select value={perPage} onChange={e=>{ setPerPage(+e.target.value); setPage(1); }} style={{height:30, padding:'0 8px', border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12, fontFamily:'inherit', background:'white'}}>
                {[10,20,50].map(n=><option key={n} value={n}>{n} / trang</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      </div>

        {selT && view!=='kanban' && <TicketDetail t={selT} onClose={()=>setSel(null)} onEdit={openEdit} onDelete={(id)=>setConfirmDel(id)} onToggleAi={toggleAi} onComment={addComment}/>}
      </div>

      {modalOpen && <TicketModal ticket={editing} categories={cats} onClose={()=>{ setModalOpen(false); setEditing(null); }} onSave={saveTicket}/>}
      {confirmDel && (
        <div onClick={()=>setConfirmDel(null)} style={{position:'fixed', inset:0, background:'rgba(15,23,42,.5)', zIndex:1300, display:'grid', placeItems:'center', padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{width:380, background:'white', borderRadius:14, padding:22, boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}><span style={{width:38,height:38,borderRadius:10,background:'#FDECEA',color:'#C8263A',display:'grid',placeItems:'center'}}>{TkI('Trash',{style:{width:18,height:18}})}</span><div style={{fontSize:16, fontWeight:800}}>Xóa ticket {confirmDel}?</div></div>
            <div style={{fontSize:13, color:'var(--label-02)', lineHeight:1.5, marginBottom:18}}>Hành động này không thể hoàn tác. Toàn bộ trao đổi và lịch sử của ticket sẽ bị xóa.</div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
              <button onClick={()=>setConfirmDel(null)} className="btn btn-ghost btn-sm">Huỷ</button>
              <button onClick={()=>delTicket(confirmDel)} className="btn btn-sm" style={{background:'#DC2626', color:'white', border:'none'}}>Xóa ticket</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:1400, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{TkI('Check',{style:{width:16,height:16, color:'#4ADE80'}})}{toast}</div>}
    </div>
  );
}

window.TicketsModule = TicketsModule;
} catch(e){ console.error('tickets-module.jsx', e); }
})();
