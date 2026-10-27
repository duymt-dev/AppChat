/* ============================================================
   dashboard-v2.jsx — Dashboard mới (hội thoại + chuyển đổi AI +
   con người + hoạt động AI Agent + chiến dịch đang chạy + KPI)
   Override window.DashboardModule
   ============================================================ */
;(function(){
try {
const { useState: useDv, useMemo: useDvM } = React;
const DvI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const fmt = (n)=> (n||0).toLocaleString('vi-VN');
const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];

/* ---------- KPI cards ---------- */
const KPIS = [
  { l:'Hội thoại hôm nay', v:'1.284', ic:'Chat', c:'#2A6FDB', up:'+14%', sub:'63% AI tự xử lý', sp:[8,10,7,11,9,13,11,15,13,16] },
  { l:'Chuyển đổi từ AI', v:'530', ic:'TrendUp', c:'#1B9E5A', up:'+18%', sub:'lead/đặt lịch · chốt 23', sp:[20,24,22,28,26,32,30,36,34,40] },
  { l:'CSAT & Phản hồi đầu', v:'4.7', vunit:'/5', ic:'Star', c:'#C9820B', up:'+0.2', sub:'FRT 1m48s · SLA 94%', sp:[44,45,46,45,46,47,46,47,47,47] },
  { l:'Hoạt động AI hôm nay', v:'3.180', ic:'Sparkles', c:'#0E9B94', up:'+22%', sub:'tin AI xử lý · ~28 giờ', sp:[24,28,26,32,30,36,34,40,38,44] },
];

/* ---------- funnel ---------- */
const FUNNEL = [
  { l:'Tin đến', v:1284, c:'#2A6FDB' },
  { l:'AI tiếp nhận', v:1180, c:'#0E9B94' },
  { l:'Tư vấn', v:642, c:'#C9820B' },
  { l:'Đặt lịch / Chốt', v:268, c:'#1B9E5A' },
];

/* ---------- agents (Marketing → Sales → CSKH → Operation) ---------- */
const AGENTS = [
  { k:'M', name:'Marketing AI', c:'#E8602C', desc:'Lên lịch & gửi ZNS / Email / Remarketing theo phân khúc.', wf:22, tp:'3 chiến dịch live' },
  { k:'S', name:'Sales AI', c:'#2A6FDB', desc:'Tư vấn & báo giá tự động qua Zalo OA + Zalo cá nhân.', wf:15, tp:'312 hội thoại/ngày' },
  { k:'C', name:'CSKH AI', c:'#1B9E5A', desc:'Chăm sóc sau bán, xử lý khiếu nại, tạo ticket.', wf:9, tp:'184 ticket/tuần' },
  { k:'O', name:'Operation AI', c:'#6E48E6', desc:'Phân luồng hội thoại, đặt lịch, nhắc hẹn, đồng bộ dữ liệu.', wf:11, tp:'96 tác vụ/ngày' },
];

/* ---------- activity feed ---------- */
const ACTS = [
  { t:'10:00', ic:'Broadcast', c:'#1B9E5A', html:'<b>Marketing AI</b> gửi <b>150 ZNS</b> nhắc lịch hẹn cho nhóm khách VIP' },
  { t:'09:30', ic:'Activity', c:'#E8602C', html:'<b>CSKH AI</b> tạo <b>5 ticket</b> từ tin nhắn Zalo, đã phân cho 3 nhân viên' },
  { t:'09:15', ic:'User', c:'#2A6FDB', html:'<b>Sales AI</b> tạo <b>23 lead</b> mới, gán điểm & đẩy vào pipeline' },
  { t:'09:00', ic:'MessageSquare', c:'#6E48E6', html:'<b>Marketing AI</b> gửi <b>3.200 email</b> chiến dịch "Hè 2026 · Ưu đãi 30%"' },
  { t:'08:40', ic:'Calendar', c:'#0E9B94', html:'<b>Operation AI</b> xác nhận <b>18 lịch hẹn</b> & gửi nhắc trước 1 giờ' },
];
const CAMPAIGNS = [
  { name:'ZNS · Nhắc lịch hẹn VIP', ch:'ZNS', sent:150, total:220, c:'#0068FF' },
  { name:'Email · Hè 2026 Ưu đãi 30%', ch:'Email', sent:3200, total:8200, c:'#C9820B' },
  { name:'Zalo ZBS · Win-back 60 ngày', ch:'ZBS', sent:4200, total:6480, c:'#1B9E5A' },
  { name:'SMS · Nhắc tái khám định kỳ', ch:'SMS', sent:880, total:1500, c:'#6E48E6' },
];

/* ---------- KPI table data ---------- */
const STAFF_KPI = [
  { name:'Hương', team:'CSKH', conv:312, frt:'1m 12s', csat:4.9, deals:148, tickets:96 },
  { name:'Minh', team:'Sales', conv:286, frt:'1m 44s', csat:4.7, deals:132, tickets:42 },
  { name:'Trâm', team:'Sales', conv:264, frt:'1m 30s', csat:4.8, deals:126, tickets:38 },
  { name:'Khoa', team:'CSKH', conv:198, frt:'2m 06s', csat:4.6, deals:96, tickets:74 },
  { name:'Lan Anh', team:'Sales', conv:174, frt:'1m 58s', csat:4.8, deals:84, tickets:26 },
  { name:'Thu Hà', team:'Kế toán', conv:142, frt:'2m 30s', csat:4.5, deals:62, tickets:18 },
  { name:'Bảo Vy', team:'CSKH', conv:128, frt:'2m 12s', csat:4.6, deals:54, tickets:62 },
  { name:'Tú Quyên', team:'Sales', conv:116, frt:'2m 02s', csat:4.7, deals:48, tickets:14 },
  { name:'Phú', team:'CSKH', conv:98, frt:'2m 40s', csat:4.4, deals:36, tickets:58 },
  { name:'Nam', team:'Operation', conv:84, frt:'1m 50s', csat:4.5, deals:30, tickets:48 },
  { name:'Hà', team:'Operation', conv:72, frt:'2m 20s', csat:4.6, deals:24, tickets:40 },
  { name:'Quyên', team:'Kế toán', conv:60, frt:'2m 55s', csat:4.3, deals:18, tickets:12 },
];
const AI_KPI = [
  { name:'Marketing AI', team:'Marketing', conv:1480, frt:'4s', csat:4.5, deals:312, tickets:0 },
  { name:'Sales AI', team:'Sales', conv:1260, frt:'6s', csat:4.6, deals:286, tickets:38 },
  { name:'CSKH AI', team:'CSKH', conv:980, frt:'5s', csat:4.7, deals:0, tickets:218 },
  { name:'Operation AI', team:'Operation', conv:640, frt:'3s', csat:4.6, deals:96, tickets:84 },
];
const teamColor = (t)=>({Sales:'#2A6FDB','CSKH':'#1B9E5A','Marketing':'#E8602C','Operation':'#6E48E6','Kế toán':'#C9820B'}[t]||'#64748B');

/* ============ Funnel block ============ */
function Funnel(){
  const max = FUNNEL[0].v;
  return (
    <div className="card" style={{padding:18}}>
      <div style={{display:'flex', alignItems:'center', marginBottom:14}}>
        <div><div style={{fontSize:14.5, fontWeight:800}}>Phễu chuyển đổi AI</div><div style={{fontSize:12, color:'var(--label-02)'}}>Tin đến → AI tiếp nhận → Tư vấn → Đặt lịch/Chốt</div></div>
        <span style={{flex:1}}/>
        <span style={{fontSize:12.5, fontWeight:700, color:'#1B9E5A'}}>Tỷ lệ chốt {Math.round(FUNNEL[3].v/FUNNEL[0].v*100)}%</span>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, alignItems:'end'}}>
        {FUNNEL.map((f,i)=>{ const pct=Math.round(f.v/max*100); const conv=i>0?Math.round(f.v/FUNNEL[i-1].v*100):100; return (
          <div key={f.l}>
            <div style={{display:'flex', alignItems:'baseline', gap:6, marginBottom:6}}>
              <span style={{fontSize:20, fontWeight:800, color:'var(--label-01)'}}>{fmt(f.v)}</span>
              {i>0 && <span style={{fontSize:11, fontWeight:700, color:'var(--label-03)'}}>{conv}%</span>}
            </div>
            <div style={{height:90, borderRadius:10, background:'var(--fill-03)', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', bottom:0, left:0, right:0, height:pct+'%', background:'linear-gradient(180deg,'+f.c+'cc,'+f.c+')', borderRadius:10}}/>
            </div>
            <div style={{fontSize:12, fontWeight:600, color:'var(--label-01)', marginTop:8, display:'flex', alignItems:'center', gap:6}}><span style={{width:8,height:8,borderRadius:4,background:f.c}}/>{f.l}</div>
          </div>
        );})}
      </div>
    </div>
  );
}

/* ============ KPI section (2 tabs + filter + pagination) ============ */
function KpiSection(){
  const [tab, setTab] = useDv('staff');
  const [team, setTeam] = useDv('all');
  const [q, setQ] = useDv('');
  const [page, setPage] = useDv(1);
  const PER = 10;
  const src = tab==='staff' ? STAFF_KPI : AI_KPI;
  const teams = ['all', ...Array.from(new Set(src.map(x=>x.team)))];
  const filtered = src.filter(x=> (team==='all'||x.team===team) && (!q.trim()||x.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a,b)=>b.conv-a.conv);
  const totalPages = Math.max(1, Math.ceil(filtered.length/PER));
  const curPage = Math.min(page, totalPages);
  const rows = filtered.slice((curPage-1)*PER, curPage*PER);
  const maxConv = Math.max(...src.map(x=>x.conv));
  React.useEffect(()=>{ setPage(1); setTeam('all'); }, [tab]);
  React.useEffect(()=>{ setPage(1); }, [team, q]);
  const sst = {height:32, border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12.5, fontFamily:'inherit', background:'white', color:'var(--label-01)', padding:'0 10px', cursor:'pointer', outline:'none'};

  return (
    <div className="card" style={{padding:0, overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--fill-03)', flexWrap:'wrap'}}>
        <div style={{fontSize:14.5, fontWeight:800}}>Hiệu suất xử lý</div>
        <div style={{display:'flex', background:'var(--fill-03)', padding:3, borderRadius:8, gap:2}}>
          {[{k:'staff',l:'Nhân sự'},{k:'ai',l:'AI Agents'}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'5px 14px', borderRadius:6, fontSize:12.5, fontWeight:700, fontFamily:'inherit', border:'none', cursor:'pointer', background: tab===t.k?'white':'transparent', color: tab===t.k?'var(--label-01)':'var(--label-02)', boxShadow: tab===t.k?'var(--shadow-sm)':'none'}}>{t.l}</button>
          ))}
        </div>
        <span style={{flex:1}}/>
        <div style={{position:'relative'}}>
          {DvI('Search',{style:{position:'absolute', left:9, top:8, width:13, height:13, color:'var(--label-03)'}})}
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm tên…" style={{height:32, width:160, paddingLeft:28, border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12.5, outline:'none', fontFamily:'inherit'}}/>
        </div>
        <select value={team} onChange={e=>setTeam(e.target.value)} style={sst}>{teams.map(t=><option key={t} value={t}>{t==='all'?'Tất cả nhóm':t}</option>)}</select>
        <select defaultValue="today" style={sst}><option value="today">Hôm nay</option><option value="week">7 ngày</option><option value="month">30 ngày</option></select>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'28px 1.6fr 1fr 1.1fr 0.8fr 0.9fr 0.9fr 0.9fr', gap:12, padding:'9px 18px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
        {['#','Tên','Nhóm','Hội thoại','FRT','CSAT','Đơn chốt','Ticket'].map((h,i)=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', textAlign: i>=4?'right':'left'}}>{h}</span>)}
      </div>
      {rows.length===0 ? <div style={{padding:'36px', textAlign:'center', fontSize:13, color:'var(--label-03)'}}>Không có dữ liệu phù hợp.</div> :
        rows.map((r,i)=>{ const rank=(curPage-1)*PER+i+1; const ai=tab==='ai'; return (
          <div key={r.name} style={{display:'grid', gridTemplateColumns:'28px 1.6fr 1fr 1.1fr 0.8fr 0.9fr 0.9fr 0.9fr', gap:12, padding:'11px 18px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
            <span style={{fontSize:13, fontWeight:800, color: rank<=3?'#C9820B':'var(--label-03)'}}>{rank}</span>
            <div style={{display:'flex', alignItems:'center', gap:9, minWidth:0}}>
              <span style={{width:28, height:28, borderRadius:'50%', background: ai?'var(--bg-green)':avC(r.name), color: ai?'var(--pr-dark-1)':'white', display:'grid', placeItems:'center', fontSize:12, fontWeight:800, flexShrink:0}}>{ai?DvI('Sparkles',{style:{width:14,height:14}}):r.name[0]}</span>
              <span style={{fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.name}</span>
            </div>
            <span><span style={{fontSize:11.5, fontWeight:700, padding:'2px 9px', borderRadius:12, background:teamColor(r.team)+'18', color:teamColor(r.team)}}>{r.team}</span></span>
            <div><div style={{height:6, background:'var(--fill-03)', borderRadius:3, overflow:'hidden', marginBottom:3}}><div style={{width:(r.conv/maxConv*100)+'%', height:'100%', background: ai?'#0E9B94':'#2A6FDB', borderRadius:3}}/></div><span style={{fontSize:11.5, fontWeight:700}}>{fmt(r.conv)}</span></div>
            <span style={{fontSize:12.5, fontWeight:600, textAlign:'right'}}>{r.frt}</span>
            <span style={{fontSize:12.5, fontWeight:700, color:'#C9820B', textAlign:'right'}}>★ {r.csat}</span>
            <span style={{fontSize:12.5, fontWeight:800, color:'#1B9E5A', textAlign:'right'}}>{r.deals||'—'}</span>
            <span style={{fontSize:12.5, fontWeight:800, color:'#2A6FDB', textAlign:'right'}}>{r.tickets||'—'}</span>
          </div>
        );})}

      <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px 18px'}}>
        <span style={{fontSize:12, color:'var(--label-02)'}}>Hiển thị <b style={{color:'var(--label-01)'}}>{filtered.length===0?0:(curPage-1)*PER+1}–{Math.min(curPage*PER, filtered.length)}</b> / {filtered.length}</span>
        <span style={{flex:1}}/>
        <div style={{display:'flex', alignItems:'center', gap:3}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage===1} className="btn-icon" style={{width:28,height:28,opacity:curPage===1?.4:1}}>{DvI('ArrowLeft',{style:{width:14,height:14}})||'‹'}</button>
          {Array.from({length:totalPages}).map((_,i)=>{ const p=i+1; return <button key={p} onClick={()=>setPage(p)} style={{minWidth:28,height:28,borderRadius:7,border:'1px solid '+(curPage===p?'var(--primary)':'var(--fill-04)'),background:curPage===p?'var(--primary)':'white',color:curPage===p?'white':'var(--label-01)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{p}</button>; })}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={curPage===totalPages} className="btn-icon" style={{width:28,height:28,opacity:curPage===totalPages?.4:1}}>{DvI('ArrowRight',{style:{width:14,height:14}})||'›'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Section header ============ */
function SecHead({ title, link }){
  return (
    <div style={{display:'flex', alignItems:'center', margin:'2px 2px 0'}}>
      <span style={{fontSize:16, fontWeight:800, letterSpacing:'-.01em'}}>{title}</span>
      <span style={{flex:1}}/>
      {link && <button style={{fontSize:12.5, fontWeight:700, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>{link} →</button>}
    </div>
  );
}

function DashboardModule(){
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Dashboard</h1>
        <span className="crumb">Trung tâm hội thoại & AI · cập nhật thời gian thực</span>
        <span className="spacer"/>
        <button className="btn btn-ghost btn-sm">{DvI('Download',{style:{width:14,height:14}})} Xuất</button>
        <button className="btn btn-ghost btn-sm">{DvI('Refresh',{style:{width:14,height:14}})} Làm mới</button>
      </div>

      <div className="scroll" style={{flex:1, padding:'18px 24px', background:'var(--fill-02)', display:'flex', flexDirection:'column', gap:18}}>
        {/* 1 · Greeting + Onboarding */}
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <div style={{flex:1}}>
            <div style={{fontSize:20, fontWeight:800, letterSpacing:'-.02em', color:'var(--label-01)'}}>Chào Trâm 👋</div>
            <div style={{fontSize:13, color:'var(--label-02)', marginTop:2}}>Toàn cảnh hội thoại, chuyển đổi từ AI và các hoạt động đang chạy hôm nay.</div>
          </div>
          <button className="btn btn-primary btn-sm">{DvI('Sparkles',{style:{width:14,height:14}})} Hỏi Trợ lý AI</button>
        </div>
        {window.OnboardingWidget ? <window.OnboardingWidget/> : null}
        {window.FollowupWidget ? <window.FollowupWidget/> : null}

        {/* 2 · Tình hình hôm nay — 4 KPI */}
        <div>
          <SecHead title="Tình hình hôm nay" link="Xem báo cáo"/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginTop:12}}>
            {KPIS.map(k=>{ const mn=Math.min(...k.sp), mx=Math.max(...k.sp); const pts=k.sp.map((p,i)=>(i/(k.sp.length-1)*100)+','+(26-(p-mn)/((mx-mn)||1)*22)).join(' '); return (
              <div key={k.l} className="card" style={{padding:0, overflow:'hidden', position:'relative'}}>
                <div style={{height:3, background:'linear-gradient(90deg,'+k.c+','+k.c+'66)'}}/>
                <div style={{padding:'14px 16px 12px', background:'linear-gradient(160deg,'+k.c+'0E,transparent 60%)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:9, marginBottom:10}}>
                    <span style={{width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,'+k.c+','+k.c+'cc)', color:'white', display:'grid', placeItems:'center', boxShadow:'0 4px 10px '+k.c+'40'}}>{DvI(k.ic,{style:{width:17,height:17}})}</span>
                    <span style={{fontSize:12.5, color:'var(--label-02)', fontWeight:600, lineHeight:1.25}}>{k.l}</span>
                  </div>
                  <div style={{display:'flex', alignItems:'baseline', gap:4}}>
                    <span style={{fontSize:30, fontWeight:800, color:'var(--label-01)', lineHeight:1, letterSpacing:'-.02em'}}>{k.v}</span>
                    {k.vunit && <span style={{fontSize:15, fontWeight:700, color:'var(--label-03)'}}>{k.vunit}</span>}
                    <span style={{flex:1}}/>
                    <span style={{display:'inline-flex', alignItems:'center', gap:2, fontSize:11.5, fontWeight:800, color:'#1B9E5A', background:'#1B9E5A14', padding:'2px 7px', borderRadius:20}}>↑ {k.up}</span>
                  </div>
                  <svg viewBox="0 0 100 28" style={{width:'100%', height:24, marginTop:8}} preserveAspectRatio="none">
                    <defs><linearGradient id={'kpg'+k.c.replace('#','')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.c} stopOpacity="0.22"/><stop offset="1" stopColor={k.c} stopOpacity="0"/></linearGradient></defs>
                    <polygon points={'0,28 '+pts+' 100,28'} fill={'url(#kpg'+k.c.replace('#','')+')'}/>
                    <polyline points={pts} fill="none" stroke={k.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{fontSize:11, color:'var(--label-03)', marginTop:2}}>{k.sub}</div>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* 3 · Phễu chuyển đổi AI */}
        <Funnel/>

        {/* 4 · Agent đang chạy — 4 card */}
        <div>
          <SecHead title="Agent đang chạy" link="Quản lý Agent"/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginTop:12}}>
            {AGENTS.map(a=>(
              <div key={a.name} className="card" style={{padding:16}}>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                  <span style={{width:36, height:36, borderRadius:10, background:a.c, color:'white', display:'grid', placeItems:'center', fontSize:16, fontWeight:800, flexShrink:0}}>{a.k}</span>
                  <div style={{minWidth:0, flex:1}}>
                    <div style={{fontSize:14, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{a.name}</div>
                    <div style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#1B9E5A'}}><span style={{width:6,height:6,borderRadius:3,background:'#1B9E5A'}}/>Đang chạy</div>
                  </div>
                </div>
                <div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.5, minHeight:54}}>{a.desc}</div>
                <div style={{display:'flex', gap:14, fontSize:12, color:'var(--label-03)', marginTop:8, paddingTop:10, borderTop:'1px solid var(--fill-03)'}}>
                  <span><b style={{color:'var(--label-01)'}}>{a.wf}</b> workflow</span>
                  <span>·</span>
                  <span style={{fontWeight:600, color:'var(--label-02)'}}>{a.tp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 · Chiến dịch đang gửi — 4 card */}
        <div>
          <SecHead title="Chiến dịch đang gửi" link="Marketing"/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginTop:12}}>
            {CAMPAIGNS.map(c=>{ const pct=Math.round(c.sent/c.total*100); return (
              <div key={c.name} className="card" style={{padding:16}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                  <span style={{fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:6, background:c.c+'18', color:c.c}}>{c.ch}</span>
                  <span style={{flex:1}}/>
                  <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'#1B9E5A'}}><span style={{width:6,height:6,borderRadius:3,background:'#1B9E5A'}}/>Đang gửi</span>
                </div>
                <div style={{fontSize:13.5, fontWeight:700, lineHeight:1.35, minHeight:38, marginBottom:12}}>{c.name}</div>
                <div style={{display:'flex', alignItems:'baseline', gap:6, marginBottom:6}}>
                  <span style={{fontSize:24, fontWeight:800, color:c.c}}>{pct}%</span>
                  <span style={{fontSize:11.5, color:'var(--label-03)'}}>hoàn thành</span>
                </div>
                <div style={{height:8, borderRadius:4, background:'var(--fill-03)', overflow:'hidden'}}><div style={{width:pct+'%', height:'100%', background:c.c, borderRadius:4}}/></div>
                <div style={{fontSize:11.5, color:'var(--label-03)', marginTop:6}}>Đã gửi {fmt(c.sent)} / {fmt(c.total)}</div>
              </div>
            );})}
          </div>
        </div>

        {/* 6 · KPI Nhân sự & AI Agents */}
        <div>
          <SecHead title="KPI Nhân sự & AI Agents"/>
          <div style={{marginTop:12}}><KpiSection/></div>
        </div>

        <div style={{height:8}}/>
      </div>
    </div>
  );
}

window.DashboardModule = DashboardModule;
} catch(e){ console.error('dashboard-v2.jsx', e); }
})();
