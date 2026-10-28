/* ============================================================
   loyalty-module.jsx — Khách hàng thân thiết (Loyalty)
   Tổng quan điểm & doanh thu · Top thành viên
   · Phân bố hạng / Gói & Thẻ / Voucher (3 card 1 hàng)
   ============================================================ */
;(function(){
try {
const { useState: useLy } = React;
const LyI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const fmt=(n)=>(n||0).toLocaleString('vi-VN');

const TIERS=[
  {k:'kim',  l:'Kim cương', c:'#6E48E6', n:48,   pct:3.9},
  {k:'vang', l:'Vàng',      c:'#F59E0B', n:186,  pct:15.0},
  {k:'bac',  l:'Bạc',       c:'#64748B', n:512,  pct:41.3},
  {k:'tv',   l:'Thành viên', c:'#1B9E5A', n:494, pct:39.8},
];
const tierMeta=(k)=>TIERS.find(t=>t.k===k)||TIERS[3];

const MEMBERS=[
  {name:'Chị Lan',        phone:'0903 123 456', tier:'kim',  cur:24800, acc:45600, used:20800, spent:32000000},
  {name:'Nguyễn T. Hiếu', phone:'0978 456 789', tier:'vang', cur:9200,  acc:18500, used:9300,  spent:11200000},
  {name:'Phạm Quỳnh',     phone:'0912 345 678', tier:'vang', cur:8600,  acc:15200, used:6600,  spent:9800000},
  {name:'Đỗ Thu Hà',      phone:'0987 654 321', tier:'bac',  cur:4200,  acc:9800,  used:5600,  spent:5600000},
  {name:'Vũ Đức Anh',     phone:'0909 876 543', tier:'bac',  cur:3100,  acc:7200,  used:4100,  spent:3800000},
  {name:'Trần Minh Tâm',  phone:'0911 222 333', tier:'tv',   cur:2800,  acc:5600,  used:2800,  spent:3200000},
  {name:'Lê Thị Mai',     phone:'0933 444 555', tier:'tv',   cur:2400,  acc:4800,  used:2400,  spent:2900000},
  {name:'Hoàng Quốc Bảo', phone:'0966 777 888', tier:'tv',   cur:2100,  acc:3900,  used:1800,  spent:2500000},
  {name:'Ngô Bích',       phone:'0909 999 000', tier:'tv',   cur:680,   acc:1200,  used:520,   spent:1200000},
  {name:'Trần Hoài Nam',  phone:'0915 888 222', tier:'tv',   cur:550,   acc:1100,  used:550,   spent:1000000},
];
const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];

const OVERVIEW=[
  {l:'Điểm đã phát hành', v:'1.248.000', u:'điểm', d:'+18.7%', ic:'Star',     c:'#F59E0B'},
  {l:'Điểm đã sử dụng',   v:'762.300',   u:'điểm', d:'+10.4%', ic:'Check',    c:'#0EA5E9'},
  {l:'Điểm đã đổi (quà)', v:'326.400',   u:'điểm', d:'+9.1%',  ic:'Sparkles', c:'#7C3AED'},
  {l:'Tỷ lệ quay lại',    v:'68,5%',     u:'',     d:'+5.2%',  ic:'Refresh',  c:'#16A34A'},
  {l:'Doanh thu từ TV',   v:'2,48 tỷ',   u:'đồng', d:'+16.8%', ic:'Dollar',   c:'#E8602C'},
];
const VOUCHERS=[
  {code:'WELCOME10', t:'Giảm 10% lần đầu đặt lịch', use:142, total:500, c:'#2563EB'},
  {code:'VIP20',     t:'Ưu đãi 20% cho hạng Kim cương', use:38, total:80, c:'#6E48E6'},
  {code:'COMEBACK',  t:'Quay lại -15% sau 60 ngày', use:96, total:300, c:'#1B9E5A'},
];
const PACKAGES=[
  {n:'Gói 10 buổi trị mụn', used:8, total:10, c:'#E8602C', exp:'30/08/2026'},
  {n:'Thẻ Gym 12 tháng', used:4, total:12, c:'#1B9E5A', exp:'01/03/2027'},
  {n:'Gói niềng răng 24 tháng', used:9, total:24, c:'#6E48E6', exp:'15/06/2028'},
];
const Card=({children,style})=> <div className="card" style={{padding:18, ...style}}>{children}</div>;
const ST_META={add:{l:'Cộng điểm',c:'#16A34A'},redeem:{l:'Đổi quà',c:'#7C3AED'},minus:{l:'Trừ điểm',c:'#DC2626'},voucher:{l:'Phát voucher',c:'#2563EB'}};
const LASTACT={'Chị Lan':'voucher','Nguyễn T. Hiếu':'add','Phạm Quỳnh':'redeem','Đỗ Thu Hà':'add','Vũ Đức Anh':'voucher','Trần Minh Tâm':'add','Lê Thị Mai':'minus','Hoàng Quốc Bảo':'add','Ngô Bích':'voucher','Trần Hoài Nam':'add'};
const POINT_LOG=[{m:'Chị Lan',pts:1200,reason:'Hoàn tất đơn combo Skin',time:'Hôm nay 10:24'},{m:'Nguyễn T. Hiếu',pts:500,reason:'Lịch hẹn hoàn thành',time:'Hôm nay 09:10'},{m:'Đỗ Thu Hà',pts:300,reason:'Đánh giá 5 sao',time:'Hôm qua 16:40'},{m:'Phạm Quỳnh',pts:800,reason:'Mua gói liệu trình',time:'Hôm qua 14:05'}];
const REDEEM_LOG=[{m:'Chị Lan',pts:2000,reward:'Voucher giảm 15% combo Skin',time:'Hôm nay 11:02'},{m:'Phạm Quỳnh',pts:1500,reward:'Quà tặng sinh nhật',time:'Hôm qua 15:20'},{m:'Lê Thị Mai',pts:1000,reward:'Miễn phí 1 buổi massage',time:'2 ngày trước'}];
const VOUCHER_LOG=[{m:'Chị Lan',code:'VIP20',ch:'Zalo ZNS',time:'Hôm nay 11:05'},{m:'Nguyễn T. Hiếu',code:'WELCOME10',ch:'Zalo ZNS',time:'Hôm nay 08:30'},{m:'Đỗ Thu Hà',code:'COMEBACK',ch:'Email',time:'Hôm qua 17:12'}];
const lyMenuBtn=()=>({display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 10px', border:'none', background:'transparent', borderRadius:7, cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:12.5, fontWeight:500, color:'var(--label-01)'});

function LoyaltyModule(){
  const [q,setQ]=useLy('');
  const [tier,setTier]=useLy('all');
  const [page,setPage]=useLy(1);
  const [members,setMembers]=useLy(MEMBERS);
  const [menuFor,setMenuFor]=useLy(null);
  const [adj,setAdj]=useLy(null); // {m, mode:'add'|'redeem'}
  const [cfg,setCfg]=useLy(false);
  const [vch,setVch]=useLy(false);
  const [lyToast,setLyToast]=useLy('');
  React.useEffect(()=>{ if(lyToast){ const x=setTimeout(()=>setLyToast(''),1900); return ()=>clearTimeout(x); } },[lyToast]);
  const list=members.filter(m=>(tier==='all'||m.tier===tier)&&(!q.trim()||m.name.toLowerCase().includes(q.toLowerCase())));
  const upd=(name,fn)=>setMembers(ms=>ms.map(x=>x.name===name?fn(x):x));
  const setTierOf=(name,k)=>{ upd(name,x=>({...x,tier:k})); setLyToast('Đã đổi hạng “'+name+'” → '+tierMeta(k).l); setMenuFor(null); };
  const PER=5; const pages=Math.max(1,Math.ceil(list.length/PER)); const cur=Math.min(page,pages); const paged=list.slice((cur-1)*PER, cur*PER);
  React.useEffect(()=>{ setPage(1); },[q,tier]);
  const sst={height:32, border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12.5, fontFamily:'inherit', background:'white', color:'var(--label-01)', padding:'0 10px', cursor:'pointer', outline:'none'};

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Khách hàng thân thiết</h1>
        <span className="crumb">Hạng thành viên · tích điểm · voucher · gói dịch vụ</span>
        <span className="spacer"/>
        <button className="btn btn-ghost btn-sm" onClick={()=>setCfg(true)}>{LyI('Settings',{style:{width:14,height:14}})} Cấu hình chương trình</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>list[0]&&setAdj({m:list[0], mode:'add'})}>{LyI('Plus',{style:{width:14,height:14}})} Ghi nhận điểm</button>
        <button className="btn btn-primary btn-sm" onClick={()=>setVch(true)}>{LyI('Plus',{style:{width:14,height:14}})} Tạo voucher</button>
      </div>
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'18px 22px', background:'var(--fill-02)', display:'flex', flexDirection:'column', gap:16}}>

        {/* Tổng quan điểm & doanh thu — thay cho KPI */}
        <Card style={{flexShrink:0}}>
          <div style={{fontSize:15, fontWeight:800, marginBottom:14}}>Tổng quan điểm &amp; doanh thu</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14}}>
            {OVERVIEW.map(o=>(
              <div key={o.l} style={{border:'1px solid var(--fill-04)', borderRadius:11, padding:'13px 14px'}}>
                <span style={{width:28,height:28,borderRadius:7,background:o.c+'18',color:o.c,display:'grid',placeItems:'center',marginBottom:9}}>{LyI(o.ic,{style:{width:14,height:14}})}</span>
                <div style={{fontSize:11.5, color:'var(--label-02)', fontWeight:600}}>{o.l}</div>
                <div style={{fontSize:18, fontWeight:800, color:o.c, marginTop:3}}>{o.v}{o.u && <span style={{fontSize:11, fontWeight:600, color:'var(--label-03)'}}> {o.u}</span>}</div>
                {o.d ? <div style={{fontSize:10, fontWeight:700, color:'#16A34A', marginTop:3}}>↑ {o.d} so với tháng trước</div> : <div style={{fontSize:10, color:'var(--label-03)', marginTop:3}}>trong tổng doanh thu</div>}
              </div>
            ))}
          </div>
        </Card>

        {/* 3 card 1 hàng: Phân bố hạng · Gói & Thẻ · Voucher */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16, alignItems:'start', flexShrink:0}}>

          <Card>
            <div style={{display:'flex', alignItems:'center', marginBottom:14}}>
              <div style={{fontSize:14, fontWeight:800}}>Phân bố theo hạng</div>
              <span style={{flex:1}}/>
              <button className="btn btn-ghost btn-sm" style={{color:'var(--pr-dark-2)'}}>Chi tiết</button>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:13}}>
              {TIERS.map(t=>(
                <div key={t.k}>
                  <div style={{display:'flex', alignItems:'center', marginBottom:5}}>
                    <span style={{fontSize:12, fontWeight:600}}>{t.l}</span><span style={{flex:1}}/>
                    <span style={{fontSize:11.5, color:'var(--label-02)'}}>{fmt(t.n)} · {t.pct}%</span>
                  </div>
                  <div style={{height:8, borderRadius:5, background:'var(--fill-03)', overflow:'hidden'}}><div style={{width:t.pct+'%', height:'100%', background:t.c, borderRadius:5}}/></div>
                </div>
              ))}
              <div style={{display:'flex', alignItems:'center', borderTop:'1px solid var(--fill-03)', paddingTop:11}}>
                <span style={{fontSize:12.5, fontWeight:800}}>Tổng</span><span style={{flex:1}}/>
                <span style={{fontSize:12, fontWeight:700}}>1.240 · 100%</span>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{display:'flex', alignItems:'center', marginBottom:12}}>
              <div style={{fontSize:14, fontWeight:800}}>Gói và Thẻ dịch vụ</div>
              <span style={{flex:1}}/>
              <button className="btn btn-ghost btn-sm" onClick={()=>setLyToast('Đã mở trình tạo gói dịch vụ')}>{LyI('Plus',{style:{width:13,height:13}})} Tạo</button>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {PACKAGES.map(p=>{ const pct=Math.round(p.used/p.total*100); const low=(p.total-p.used)<=2; return (
                <div key={p.n} style={{border:'1px solid '+(low?'#F5A830':'var(--fill-04)'), borderRadius:10, padding:'10px 12px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <span style={{fontSize:12, fontWeight:700, flex:1}}>{p.n}</span>
                    <span style={{fontSize:10.5, fontWeight:700, color:p.c, whiteSpace:'nowrap'}}>{p.total-p.used} còn</span>
                  </div>
                  <div style={{height:6, borderRadius:4, background:'var(--fill-03)', overflow:'hidden'}}><div style={{width:pct+'%', height:'100%', background:p.c, borderRadius:4}}/></div>
                  <div style={{display:'flex', alignItems:'center', marginTop:5}}>
                    <span style={{fontSize:10.5, color:'var(--label-03)'}}>{p.used}/{p.total} · HH {p.exp}</span>
                    <span style={{flex:1}}/>
                    {low ? <button className="btn btn-ghost btn-sm" style={{height:22, fontSize:11, color:'#A65A0E'}} onClick={()=>setLyToast('Đã gửi nhắc gia hạn gói qua Zalo ZNS')}>Nhắc</button> : null}
                  </div>
                </div>
              );})}
            </div>
          </Card>

          <Card>
            <div style={{fontSize:14, fontWeight:800, marginBottom:12}}>Voucher đang phát hành</div>
            <div style={{display:'flex', flexDirection:'column', gap:11}}>
              {VOUCHERS.map(v=>{ const pct=Math.round(v.use/v.total*100); return (
                <div key={v.code} style={{border:'1px solid var(--fill-04)', borderRadius:10, padding:'10px 12px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                    <span style={{fontSize:10.5, fontWeight:800, fontFamily:'monospace', padding:'2px 7px', borderRadius:6, background:v.c+'18', color:v.c, whiteSpace:'nowrap'}}>{v.code}</span>
                    <span style={{fontSize:11.5, fontWeight:600, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{v.t}</span>
                  </div>
                  <div style={{height:6, borderRadius:4, background:'var(--fill-03)', overflow:'hidden'}}><div style={{width:pct+'%', height:'100%', background:v.c, borderRadius:4}}/></div>
                  <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:5, display:'flex', alignItems:'center'}}>{v.use}/{v.total} đã dùng<span style={{flex:1}}/><button className="btn btn-ghost btn-sm" style={{height:22, fontSize:11}} onClick={()=>setLyToast('Đã phát voucher '+v.code+' qua Zalo ZNS')}>{LyI('Send',{style:{width:11,height:11}})} Phát ZNS</button></div>
                </div>
              );})}
            </div>
          </Card>


          <Card>
            <div style={{fontSize:14, fontWeight:800, marginBottom:14}}>Hoạt động hôm nay</div>
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {[{l:'Điểm đã cấp',v:'+2.800',c:'#16A34A',ic:'Plus'},{l:'Điểm đã đổi',v:'-4.500',c:'#DC2626',ic:'Sparkles'},{l:'Voucher đã phát',v:'24',c:'#2563EB',ic:'Send'},{l:'Thành viên mới',v:'6',c:'#7C3AED',ic:'User'}].map(x=>(
                <div key={x.l} style={{display:'flex', alignItems:'center', gap:10}}>
                  <span style={{width:30,height:30,borderRadius:8,background:x.c+'18',color:x.c,display:'grid',placeItems:'center',flexShrink:0}}>{LyI(x.ic,{style:{width:15,height:15}})}</span>
                  <span style={{flex:1, fontSize:12.5, color:'var(--label-02)', fontWeight:600}}>{x.l}</span>
                  <span style={{fontSize:15, fontWeight:800, color:x.c}}>{x.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top thành viên */}
        <Card style={{padding:0, overflow:'hidden', flexShrink:0}}>
          <div style={{display:'flex', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid var(--fill-03)'}}>
            <div style={{fontSize:15, fontWeight:800}}>Top thành viên</div>
            <span style={{flex:1}}/>
            <div style={{position:'relative', marginRight:8}}>{LyI('Search',{style:{position:'absolute', left:9, top:8, width:13, height:13, color:'var(--label-03)'}})}<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm…" style={{height:30, width:150, paddingLeft:28, border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12, outline:'none', fontFamily:'inherit'}}/></div>
            <select value={tier} onChange={e=>setTier(e.target.value)} style={sst}><option value="all">Tất cả hạng</option>{TIERS.map(t=><option key={t.k} value={t.k}>{t.l}</option>)}</select>
            <button className="btn btn-ghost btn-sm" style={{marginLeft:8, color:'var(--pr-dark-2)'}}>Xem tất cả</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'34px 1.4fr 0.85fr 0.85fr 0.85fr 0.85fr 0.95fr 1fr 44px', gap:10, padding:'9px 16px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
            {['#','Thành viên','Hạng','Điểm hiện có','Tổng tích lũy','Đã dùng','Chi tiêu','Trạng thái','Thao tác'].map((h,i)=><span key={h} style={{fontSize:10, fontWeight:800, letterSpacing:'.03em', textTransform:'uppercase', color:'var(--label-03)', textAlign:(i>=3&&i<7)?'right':(i===8?'right':'left')}}>{h}</span>)}
          </div>
          {paged.map((m,idx)=>{ const tm=tierMeta(m.tier); const stk=LASTACT[m.name]||'add'; const st=ST_META[stk]; return (
            <div key={m.name} style={{display:'grid', gridTemplateColumns:'34px 1.4fr 0.85fr 0.85fr 0.85fr 0.85fr 0.95fr 1fr 44px', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
              <span style={{fontSize:12, fontWeight:700, color:'var(--label-03)'}}>{(cur-1)*PER+idx+1}</span>
              <div style={{display:'flex', alignItems:'center', gap:9, minWidth:0}}>
                <span style={{width:30,height:30,borderRadius:'50%',background:avC(m.name),color:'white',display:'grid',placeItems:'center',fontSize:12,fontWeight:800,flexShrink:0}}>{m.name[0]}</span>
                <div style={{minWidth:0}}><div style={{fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{m.name}</div><div style={{fontSize:10.5, color:'var(--label-03)'}}>{m.phone}</div></div>
              </div>
              <span><span style={{fontSize:10.5, fontWeight:700, padding:'2px 9px', borderRadius:12, background:tm.c+'18', color:tm.c, whiteSpace:'nowrap'}}>{tm.l}</span></span>
              <span style={{fontSize:12.5, fontWeight:700, color:'#C9820B', textAlign:'right'}}>{fmt(m.cur)}</span>
              <span style={{fontSize:12.5, textAlign:'right'}}>{fmt(m.acc)}</span>
              <span style={{fontSize:12.5, textAlign:'right', color:'var(--label-02)'}}>{fmt(m.used)}</span>
              <span style={{fontSize:12.5, fontWeight:600, textAlign:'right'}}>{fmt(m.spent)}đ</span>
              <span><span style={{fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:st.c+'18', color:st.c, whiteSpace:'nowrap'}}>{st.l}</span></span>
              <div style={{position:'relative', display:'flex', justifyContent:'flex-end'}} onClick={e=>e.stopPropagation()}>
                <button className="btn-icon" style={{width:28,height:28}} onClick={()=>setMenuFor(menuFor===m.name?null:m.name)}>{LyI('More',{style:{width:15,height:15}})||'⋯'}</button>
                {menuFor===m.name && <>
                  <div onClick={()=>setMenuFor(null)} style={{position:'fixed',inset:0,zIndex:60}}/>
                  <div style={{position:'absolute', right:0, top:'calc(100% + 4px)', zIndex:61, width:182, background:'white', border:'1px solid var(--fill-04)', borderRadius:10, boxShadow:'0 14px 36px rgba(17,24,39,.2)', padding:5}}>
                    <button onClick={()=>{ setAdj({m, mode:'add'}); setMenuFor(null); }} style={lyMenuBtn()}>{LyI('Plus',{style:{width:14,height:14,color:'#16A34A'}})}<span style={{flex:1}}>Cộng điểm</span></button>
                    <button onClick={()=>{ setAdj({m, mode:'redeem'}); setMenuFor(null); }} style={lyMenuBtn()}>{LyI('Sparkles',{style:{width:14,height:14,color:'#7C3AED'}})}<span style={{flex:1}}>Đổi quà / trừ điểm</span></button>
                    <button onClick={()=>{ setLyToast('Đã phát voucher cho “'+m.name+'” qua ZNS'); setMenuFor(null); }} style={lyMenuBtn()}>{LyI('Send',{style:{width:14,height:14,color:'#2563EB'}})}<span style={{flex:1}}>Phát voucher</span></button>
                    <div style={{height:1, background:'var(--fill-03)', margin:'4px 6px'}}/>
                    <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', padding:'3px 10px 4px'}}>Đổi hạng</div>
                    {TIERS.map(t=>(<button key={t.k} onClick={()=>setTierOf(m.name,t.k)} style={lyMenuBtn()}><span style={{width:9,height:9,borderRadius:'50%',background:t.c}}/><span style={{flex:1}}>{t.l}</span>{m.tier===t.k&&LyI('Check',{style:{width:13,height:13,color:'var(--primary)'}})}</button>))}
                  </div>
                </>}
              </div>
            </div>
          );})}
          <div style={{display:'flex', alignItems:'center', gap:10, padding:'12px 16px'}}>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>Hiển thị <b style={{color:'var(--label-01)'}}>{list.length?(cur-1)*PER+1:0}–{Math.min(cur*PER,list.length)}</b> / {list.length} thành viên</span>
            <span style={{flex:1}}/>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={cur<=1} className="btn btn-ghost btn-sm" style={{opacity:cur<=1?.45:1}}>‹ Trước</button>
            {Array.from({length:pages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{minWidth:28, height:28, borderRadius:7, border:'1px solid '+(p===cur?'var(--primary)':'var(--fill-04)'), background:p===cur?'var(--bg-green)':'white', color:p===cur?'var(--pr-dark-2)':'var(--label-02)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={cur>=pages} className="btn btn-ghost btn-sm" style={{opacity:cur>=pages?.45:1}}>Sau ›</button>
          </div>
        </Card>


        {/* 3 danh sách lịch sử hoạt động */}
        <div style={{display:'none'}}>
          <Card style={{padding:0, overflow:'hidden'}}>
            <div style={{padding:'13px 16px', borderBottom:'1px solid var(--fill-03)', fontSize:14, fontWeight:800}}>Cộng điểm gần đây</div>
            {POINT_LOG.map((r,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--fill-03)'}}>
                <span style={{width:28,height:28,borderRadius:'50%',background:avC(r.m),color:'white',display:'grid',placeItems:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{r.m[0]}</span>
                <div style={{flex:1, minWidth:0}}><div style={{fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.m}</div><div style={{fontSize:10.5, color:'var(--label-03)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.reason} · {r.time}</div></div>
                <span style={{fontSize:13, fontWeight:800, color:'#16A34A'}}>+{fmt(r.pts)}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:0, overflow:'hidden'}}>
            <div style={{padding:'13px 16px', borderBottom:'1px solid var(--fill-03)', fontSize:14, fontWeight:800}}>Đổi quà / trừ điểm</div>
            {REDEEM_LOG.map((r,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--fill-03)'}}>
                <span style={{width:28,height:28,borderRadius:'50%',background:avC(r.m),color:'white',display:'grid',placeItems:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{r.m[0]}</span>
                <div style={{flex:1, minWidth:0}}><div style={{fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.m}</div><div style={{fontSize:10.5, color:'var(--label-03)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.reward} · {r.time}</div></div>
                <span style={{fontSize:13, fontWeight:800, color:'#DC2626'}}>-{fmt(r.pts)}</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:0, overflow:'hidden'}}>
            <div style={{padding:'13px 16px', borderBottom:'1px solid var(--fill-03)', fontSize:14, fontWeight:800}}>Phát voucher gần đây</div>
            {VOUCHER_LOG.map((r,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--fill-03)'}}>
                <span style={{width:28,height:28,borderRadius:'50%',background:avC(r.m),color:'white',display:'grid',placeItems:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{r.m[0]}</span>
                <div style={{flex:1, minWidth:0}}><div style={{fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.m}</div><div style={{fontSize:10.5, color:'var(--label-03)'}}>{r.ch} · {r.time}</div></div>
                <span style={{fontSize:10.5, fontWeight:800, fontFamily:'monospace', padding:'2px 8px', borderRadius:6, background:'#2563EB18', color:'#2563EB'}}>{r.code}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      {lyToast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{LyI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{lyToast}</div>}
      {adj && <LyAdjustModal data={adj} onClose={()=>setAdj(null)} onApply={(name,pts,mode,note)=>{ upd(name,x=>mode==='add'?{...x,cur:x.cur+pts,acc:x.acc+pts}:{...x,cur:Math.max(0,x.cur-pts),used:x.used+pts}); setAdj(null); setLyToast((mode==='add'?'Đã cộng ':'Đã trừ ')+fmt(pts)+' điểm · '+name); }}/>}
      {cfg && <LyConfigModal onClose={()=>setCfg(false)} onSave={()=>{ setCfg(false); setLyToast('Đã lưu cấu hình chương trình'); }}/>}
      {vch && <LyVoucherModal onClose={()=>setVch(false)} onSave={(name)=>{ setVch(false); setLyToast('Đã tạo voucher “'+name+'”'); }}/>}
    </div>
  );
}

function LyAdjustModal({ data, onClose, onApply }){
  const add = data.mode==='add';
  const [pts,setPts]=useLy(add?100:Number(String(data.m.cur))>=500?500:100);
  const [note,setNote]=useLy('');
  const [rate,setRate]=useLy(100); // đồng / 1 điểm (10 điểm = 1.000đ)
  const money=pts*rate;
  const fld={width:'100%', height:38, padding:'0 11px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box'};
  const QUICK = add?[100,200,500,1000]:[100,500,1000];
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:1300,display:'grid',placeItems:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:420,background:'white',borderRadius:16,boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--fill-04)'}}>
          <div style={{fontSize:17,fontWeight:800}}>{add?'Cộng điểm':'Đổi quà / Trừ điểm'}</div>
          <div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>{data.m.name} · đang có {fmt(data.m.cur)} điểm</div>
        </div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:7}}>Số điểm</div>
            <div style={{display:'flex',gap:7,marginBottom:9,flexWrap:'wrap'}}>{QUICK.map(v=>(<button key={v} onClick={()=>setPts(v)} style={{padding:'6px 13px',borderRadius:8,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(pts===v?'var(--primary)':'var(--fill-04)'),background:pts===v?'var(--bg-green)':'white',color:pts===v?'var(--pr-dark-2)':'var(--label-01)'}}>{fmt(v)}</button>))}</div>
            <input type="number" value={pts} onChange={e=>setPts(Math.max(0,+e.target.value||0))} style={fld}/>
          </div>
          <div style={{background:'var(--fill-02)', borderRadius:10, padding:'12px 13px'}}>
            <div style={{display:'flex', alignItems:'center', marginBottom:9}}>
              <span style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)'}}>Quy đổi tiền</span>
              <span style={{flex:1}}/>
              <span style={{fontSize:11,color:'var(--label-03)'}}>10 điểm = {fmt(rate*10)}đ</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <input type="number" value={pts} onChange={e=>setPts(Math.max(0,+e.target.value||0))} style={{...fld, height:34, flex:1}}/>
              <span style={{fontSize:12,color:'var(--label-03)'}}>điểm</span>
              <span style={{fontSize:14,color:'var(--label-03)'}}>=</span>
              <input type="number" value={money} onChange={e=>{ const mv=Math.max(0,+e.target.value||0); setPts(rate>0?Math.round(mv/rate):0); }} style={{...fld, height:34, flex:1.2}}/>
              <span style={{fontSize:12,color:'var(--label-03)'}}>đ</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:9}}>
              <span style={{fontSize:11,color:'var(--label-03)'}}>Tỷ giá: 1 điểm =</span>
              <input type="number" value={rate} onChange={e=>setRate(Math.max(1,+e.target.value||1))} style={{...fld, height:30, width:90}}/>
              <span style={{fontSize:11,color:'var(--label-03)'}}>đồng</span>
            </div>
          </div>
          <div><div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:5}}>Lý do {add?'(VD: hoàn tất đơn hàng)':'(VD: đổi voucher 15%)'}</div><input value={note} onChange={e=>setNote(e.target.value)} placeholder={add?'Đơn hàng / Lịch hẹn hoàn tất…':'Quà / voucher đổi…'} style={fld}/></div>
          {!add && pts>data.m.cur && <div style={{fontSize:11.5,color:'#DC2626'}}>Vượt quá điểm hiện có ({fmt(data.m.cur)}).</div>}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 22px',borderTop:'1px solid var(--fill-04)',background:'var(--fill-02)'}}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button>
          <button onClick={()=>onApply(data.m.name,pts,data.mode,note)} disabled={pts<=0||(!add&&pts>data.m.cur)} className="btn btn-primary btn-sm" style={{opacity:(pts<=0||(!add&&pts>data.m.cur))?.5:1}}>{add?'Cộng điểm':'Xác nhận đổi'}</button>
        </div>
      </div>
    </div>
  );
}

function LyConfigModal({ onClose, onSave }){
  const [earn,setEarn]=useLy(1000); // 1 điểm / N đồng chi tiêu
  const [rate,setRate]=useLy(100);  // 1 điểm = N đồng khi đổi
  const [expire,setExpire]=useLy('12'); // tháng
  const [birthday,setBirthday]=useLy(true);
  const [autoTier,setAutoTier]=useLy(true);
  const fld={width:'100%', height:38, padding:'0 11px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box'};
  const lbl={fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:5};
  const Row=({children})=> <div>{children}</div>;
  const Tog=({on,set,t,d})=>(<div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderTop:'1px solid var(--fill-03)'}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{t}</div><div style={{fontSize:11,color:'var(--label-03)'}}>{d}</div></div><button onClick={()=>set(!on)} style={{width:40,height:23,borderRadius:14,border:'none',position:'relative',cursor:'pointer',flexShrink:0,background:on?'var(--primary)':'var(--fill-04)'}}><span style={{position:'absolute',top:2,left:on?19:2,width:19,height:19,borderRadius:'50%',background:'white'}}/></button></div>);
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:1300,display:'grid',placeItems:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:480,maxHeight:'90vh',overflowY:'auto',background:'white',borderRadius:16,boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--fill-04)'}}><div style={{fontSize:17,fontWeight:800}}>Cấu hình chương trình Loyalty</div><div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>Quy tắc tích điểm · quy đổi · hạng thành viên</div></div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          <Row><div style={lbl}>Tỷ lệ tích điểm</div><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12.5,color:'var(--label-02)'}}>1 điểm cho mỗi</span><input type="number" value={earn} onChange={e=>setEarn(+e.target.value||0)} style={{...fld,width:120}}/><span style={{fontSize:12.5,color:'var(--label-02)'}}>đồng chi tiêu</span></div></Row>
          <Row><div style={lbl}>Tỷ giá quy đổi</div><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12.5,color:'var(--label-02)'}}>1 điểm =</span><input type="number" value={rate} onChange={e=>setRate(+e.target.value||0)} style={{...fld,width:120}}/><span style={{fontSize:12.5,color:'var(--label-02)'}}>đồng (10 điểm = {fmt(rate*10)}đ)</span></div></Row>
          <Row><div style={lbl}>Hạn dùng điểm</div><select value={expire} onChange={e=>setExpire(e.target.value)} style={fld}><option value="6">6 tháng</option><option value="12">12 tháng</option><option value="24">24 tháng</option><option value="0">Không hết hạn</option></select></Row>
          <div style={{marginTop:2}}>
            <Tog on={autoTier} set={setAutoTier} t="Tự động lên hạng theo chi tiêu" d="Khách đạt ngưỡng sẽ tự thăng hạng"/>
            <Tog on={birthday} set={setBirthday} t="Tặng điểm sinh nhật" d="Tự cộng điểm vào ngày sinh nhật khách"/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 22px',borderTop:'1px solid var(--fill-04)',background:'var(--fill-02)'}}><button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button><button onClick={onSave} className="btn btn-primary btn-sm">Lưu cấu hình</button></div>
      </div>
    </div>
  );
}

function LyVoucherModal({ onClose, onSave }){
  const [name,setName]=useLy('');
  const [code,setCode]=useLy('');
  const [type,setType]=useLy('percent'); // percent | amount | gift
  const [val,setVal]=useLy(10);
  const [qty,setQty]=useLy(100);
  const [tier,setTier]=useLy('all');
  const [exp,setExp]=useLy('');
  const fld={width:'100%', height:38, padding:'0 11px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box'};
  const lbl={fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:5};
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:1300,display:'grid',placeItems:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:480,maxHeight:'90vh',overflowY:'auto',background:'white',borderRadius:16,boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--fill-04)'}}><div style={{fontSize:17,fontWeight:800}}>Tạo voucher</div><div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>Phát hành ưu đãi cho thành viên</div></div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          <div><div style={lbl}>Tên voucher *</div><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Giảm 15% combo Skin" style={fld}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><div style={lbl}>Mã code</div><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="VD: SKIN15" style={{...fld,fontFamily:'monospace'}}/></div>
            <div><div style={lbl}>Số lượng</div><input type="number" value={qty} onChange={e=>setQty(+e.target.value||0)} style={fld}/></div>
          </div>
          <div><div style={lbl}>Loại ưu đãi</div>
            <div style={{display:'flex',gap:6}}>{[['percent','Giảm %'],['amount','Giảm tiền'],['gift','Quà tặng']].map(([k,l])=>{ const on=type===k; return <button key={k} onClick={()=>setType(k)} style={{flex:1,padding:'8px',borderRadius:8,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'),background:on?'var(--bg-green)':'white',color:on?'var(--pr-dark-2)':'var(--label-02)'}}>{l}</button>; })}</div>
          </div>
          {type!=='gift' && <div><div style={lbl}>Giá trị</div><div style={{display:'flex',alignItems:'center',gap:8}}><input type="number" value={val} onChange={e=>setVal(+e.target.value||0)} style={{...fld,width:140}}/><span style={{fontSize:13,color:'var(--label-02)'}}>{type==='percent'?'%':'đồng'}</span></div></div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><div style={lbl}>Áp dụng hạng</div><select value={tier} onChange={e=>setTier(e.target.value)} style={fld}><option value="all">Tất cả hạng</option>{TIERS.map(t=><option key={t.k} value={t.k}>{t.l}</option>)}</select></div>
            <div><div style={lbl}>Hết hạn</div><input type="date" value={exp} onChange={e=>setExp(e.target.value)} style={fld}/></div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 22px',borderTop:'1px solid var(--fill-04)',background:'var(--fill-02)'}}><button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button><button onClick={()=>onSave(name.trim()||'Voucher mới')} disabled={!name.trim()} className="btn btn-primary btn-sm" style={{opacity:name.trim()?1:.5}}>Tạo voucher</button></div>
      </div>
    </div>
  );
}

window.LoyaltyModule = LoyaltyModule;
} catch(e){ console.error('loyalty-module.jsx', e); }
})();
