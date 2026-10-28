/* ============================================================
   Membership Module — Thẻ thành viên · Combo buổi · Điểm thưởng
   ============================================================ */
const { useState: useMs, useMemo: useMsMemo } = React;

const MS_TIERS = [
  { id:'bronze',  name:'Bronze',   color:'#A78670', bg:'#F5EFE6', min:0,        perks:['Tích 1% mỗi giao dịch','SMS chúc sinh nhật'] },
  { id:'silver',  name:'Silver',   color:'#94A3B8', bg:'#F1F5F9', min:5_000_000,perks:['Tích 2%','Voucher tháng sinh nhật 200k','Ưu tiên booking'] },
  { id:'gold',    name:'Gold',     color:'#D4A93C', bg:'#FFF4E4', min:15_000_000,perks:['Tích 3%','Free 1 buổi massage / tháng','Hotline VIP','Đặt cọc 0%'] },
  { id:'diamond', name:'Diamond',  color:'#7C9CFF', bg:'#EEF3FB', min:50_000_000,perks:['Tích 5%','Concierge riêng','Phòng VIP','Free 4 buổi / tháng','Quà tặng đặc biệt'] },
];

const MS_COMBOS = [
  { id:'c1', name:'Combo 10 buổi Massage 60p', svc:'Massage thư giãn 60p', total:10, price:5_440_000, list:6_800_000, valid:'180 ngày', sold:147, active:89 },
  { id:'c2', name:'Combo 6 buổi trị mụn',      svc:'Trị mụn chuyên sâu',   total:6,  price:6_120_000, list:7_200_000, valid:'120 ngày', sold:84,  active:62 },
  { id:'c3', name:'Liệu trình Triệt lông 8 buổi', svc:'Diode toàn thân',    total:8,  price:24_000_000,list:28_000_000,valid:'365 ngày', sold:36,  active:31 },
  { id:'c4', name:'Combo PT 12 buổi',          svc:'Tư vấn 1-1 với HLV',   total:12, price:4_320_000, list:5_400_000, valid:'90 ngày',  sold:63,  active:48 },
  { id:'c5', name:'Thẻ năm Yoga unlimited',    svc:'Lớp Yoga Flow',         total:999,price:7_200_000, list:9_360_000, valid:'365 ngày', sold:24,  active:22 },
];

const MS_MEMBERS = [
  { id:'m1', name:'Nguyễn Lan Hương',  phone:'+84 909 123 456', tier:'diamond', points:8_420, ltv:62_400_000, joinedDays:412, lastVisit:3,  active_combos:2, status:'VIP' },
  { id:'m2', name:'Trần Quỳnh Anh',    phone:'+84 912 345 678', tier:'gold',    points:3_180, ltv:18_900_000, joinedDays:267, lastVisit:7,  active_combos:1, status:'Active' },
  { id:'m3', name:'Đỗ Hồng Nhung',     phone:'+84 977 666 555', tier:'gold',    points:2_840, ltv:16_200_000, joinedDays:189, lastVisit:1,  active_combos:1, status:'Active' },
  { id:'m4', name:'Lê Phương Linh',    phone:'+84 938 222 111', tier:'silver',  points:1_120, ltv:7_400_000,  joinedDays:88,  lastVisit:14, active_combos:1, status:'Active' },
  { id:'m5', name:'Phạm Tuấn Đạt',     phone:'+84 901 555 222', tier:'silver',  points:980,   ltv:6_200_000,  joinedDays:124, lastVisit:5,  active_combos:0, status:'Active' },
  { id:'m6', name:'Vũ Mai Trâm',       phone:'+84 988 333 444', tier:'silver',  points:560,   ltv:5_100_000,  joinedDays:62,  lastVisit:2,  active_combos:1, status:'Active' },
  { id:'m7', name:'Hoàng Bảo An',      phone:'+84 909 777 888', tier:'bronze',  points:140,   ltv:1_800_000,  joinedDays:34,  lastVisit:21, active_combos:0, status:'At-risk' },
  { id:'m8', name:'Bùi Thuý Hà',       phone:'+84 909 999 111', tier:'bronze',  points:80,    ltv:1_200_000,  joinedDays:18,  lastVisit:4,  active_combos:0, status:'New' },
  { id:'m9', name:'Đặng Khánh Vy',     phone:'+84 988 222 333', tier:'gold',    points:2_240, ltv:14_500_000, joinedDays:201, lastVisit:42, active_combos:0, status:'At-risk' },
  { id:'m10',name:'Mai Hoài Thu',      phone:'+84 909 555 666', tier:'silver',  points:780,   ltv:5_800_000,  joinedDays:103, lastVisit:9,  active_combos:1, status:'Active' },
];

// =====================================================================
function MembershipModule() {
  const [tab, setTab] = useMs('overview'); // overview | members | combos | rules
  const [tierFilter, setTierFilter] = useMs('all');
  const [sel, setSel] = useMs(null);

  const totalMembers = MS_MEMBERS.length;
  const vipCount = MS_MEMBERS.filter(m=>['gold','diamond'].includes(m.tier)).length;
  const totalLtv = MS_MEMBERS.reduce((s,m)=>s+m.ltv,0);
  const activeCombos = MS_COMBOS.reduce((s,c)=>s+c.active,0);
  const points30 = MS_MEMBERS.reduce((s,m)=>s+m.points,0);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h2 style={{margin:0, fontSize:18, fontWeight:700}}>Membership · Thẻ thành viên</h2>
        <span className="dot-sep"/>
        <div style={{display:'inline-flex', background:'var(--fill-02)', padding:3, borderRadius:8, gap:2}}>
          {[
            {k:'overview', l:'Tổng quan'},
            {k:'members', l:'Thành viên'},
            {k:'combos', l:'Combo / Gói buổi'},
            {k:'rules', l:'Hạng & Quy tắc'},
          ].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)}
              className={'btn btn-sm '+(tab===t.k?'btn-primary':'btn-ghost')}
              style={{fontWeight:600, fontSize:13, padding:'4px 12px'}}>{t.l}</button>
          ))}
        </div>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Export CSV</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Phát thẻ mới</button>
      </div>

      <div style={{padding:'12px 20px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, borderBottom:'1px solid var(--fill-04)'}}>
        <MsMet label="Tổng thành viên" v={totalMembers.toLocaleString('vi-VN')} sub={`+${MS_MEMBERS.filter(m=>m.joinedDays<30).length} mới 30 ngày`} c="#FF8A4C" icon={<Icon.Users/>}/>
        <MsMet label="VIP (Gold+)" v={vipCount} sub={`${(vipCount/totalMembers*100).toFixed(0)}% tổng`} c="#D4A93C" icon={<Icon.Star/>}/>
        <MsMet label="LTV trung bình" v={`${(totalLtv/totalMembers/1_000_000).toFixed(1)}tr`} sub="đã chi cho dịch vụ" c="#7C9CFF" icon={<Icon.TrendUp/>}/>
        <MsMet label="Combo đang dùng" v={activeCombos} sub={`${MS_COMBOS.length} loại combo`} c="#A78BFA" icon={<Icon.Layers/>}/>
        <MsMet label="Điểm tích luỹ" v={`${(points30/1000).toFixed(1)}k`} sub="đã phát · 32% đã đổi" c="#34D399" icon={<Icon.Zap/>}/>
      </div>

      <div style={{flex:1, display:'flex', overflow:'hidden'}}>
        <div style={{flex:1, overflow:'auto'}}>
          {tab==='overview' && <MsOverview/>}
          {tab==='members' && <MsMembers tierFilter={tierFilter} setTierFilter={setTierFilter} onSelect={setSel}/>}
          {tab==='combos' && <MsCombos/>}
          {tab==='rules' && <MsRules/>}
        </div>
        {sel && <MsMemberDrawer member={sel} onClose={()=>setSel(null)}/>}
      </div>
    </div>
  );
}

function MsMet({label,v,sub,c,icon}) {
  return (
    <div style={{padding:'10px 14px', background:'var(--fill-02)', border:'1px solid var(--fill-04)', borderRadius:10, display:'flex', alignItems:'center', gap:10}}>
      <div style={{width:36,height:36,borderRadius:8,background:c+'18',color:c,display:'grid',placeItems:'center'}}>{icon}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:11,color:'var(--label-02)',fontWeight:600,textTransform:'uppercase',letterSpacing:0.3}}>{label}</div>
        <div style={{fontSize:20,fontWeight:800,lineHeight:1.1}}>{v}</div>
        <div style={{fontSize:11,color:'var(--label-02)',marginTop:1}}>{sub}</div>
      </div>
    </div>
  );
}

// =====================================================================
function MsOverview() {
  const tierCounts = MS_TIERS.map(t => ({...t, count: MS_MEMBERS.filter(m=>m.tier===t.id).length}));
  const total = MS_MEMBERS.length;
  return (
    <div style={{padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:18}}>
        <div style={{fontSize:14, fontWeight:700, marginBottom:14}}>Phân bố theo hạng</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {tierCounts.map(t => (
            <div key={t.id}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:6,fontWeight:700}}>
                  <span style={{width:10,height:10,borderRadius:3,background:t.color}}/>{t.name}
                </span>
                <span style={{color:'var(--label-02)'}}><b style={{color:'var(--label-01)'}}>{t.count}</b> · {(t.count/total*100).toFixed(0)}%</span>
              </div>
              <div style={{height:8, background:'var(--fill-03)', borderRadius:4, overflow:'hidden'}}>
                <div style={{height:'100%', width:(t.count/total*100)+'%', background:t.color, borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:18}}>
        <div style={{fontSize:14, fontWeight:700, marginBottom:14}}>Top khách LTV cao nhất</div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[...MS_MEMBERS].sort((a,b)=>b.ltv-a.ltv).slice(0,5).map((m,i)=>{
            const t = MS_TIERS.find(x=>x.id===m.tier);
            return (
              <div key={m.id} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--fill-02)', borderRadius:8}}>
                <div style={{width:24, textAlign:'center', fontSize:12, fontWeight:800, color:'var(--label-02)'}}>{i+1}</div>
                <div style={{width:32,height:32,borderRadius:'50%', background:t.color,color:'#fff', fontSize:12,fontWeight:700, display:'grid',placeItems:'center'}}>{m.name.split(' ').slice(-1)[0][0]}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:700, fontSize:13}}>{m.name}</div>
                  <div style={{fontSize:11, color:'var(--label-02)'}}>{t.name} · {m.points.toLocaleString('vi-VN')} điểm</div>
                </div>
                <div style={{fontWeight:800, fontSize:14, color:t.color}}>{(m.ltv/1_000_000).toFixed(1)}tr</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{gridColumn:'span 2', background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:18}}>
        <div style={{fontSize:14, fontWeight:700, marginBottom:14}}>Doanh thu Combo · 12 tuần gần đây</div>
        <div style={{display:'flex', alignItems:'flex-end', gap:6, height:120}}>
          {[42,58,51,67,73,68,82,79,91,86,95,108].map((v,i)=>(
            <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
              <div style={{width:'100%', height:v+'%', background:'linear-gradient(180deg,#FF8A4C,#FFB547)', borderRadius:'4px 4px 0 0'}}/>
              <div style={{fontSize:10, color:'var(--label-02)'}}>W{i+1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MsMembers({tierFilter, setTierFilter, onSelect}) {
  const filtered = tierFilter==='all' ? MS_MEMBERS : MS_MEMBERS.filter(m=>m.tier===tierFilter);
  return (
    <div style={{padding:16}}>
      <div style={{display:'flex', gap:6, marginBottom:12, flexWrap:'wrap'}}>
        <button onClick={()=>setTierFilter('all')} style={chipStyle(tierFilter==='all','#231F20')}>Tất cả ({MS_MEMBERS.length})</button>
        {MS_TIERS.map(t=>(
          <button key={t.id} onClick={()=>setTierFilter(t.id)} style={chipStyle(tierFilter===t.id, t.color)}>
            <span style={{width:8,height:8,borderRadius:2,background:t.color,display:'inline-block',marginRight:6}}/>
            {t.name} ({MS_MEMBERS.filter(m=>m.tier===t.id).length})
          </button>
        ))}
      </div>
      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, overflow:'hidden'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 100px 110px 100px 110px 90px 90px', gap:12, padding:'10px 16px', fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:0.3, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)'}}>
          <div>Khách hàng</div><div>Hạng</div><div>Điểm</div><div>Combo</div><div>LTV</div><div>Lần cuối</div><div>Status</div>
        </div>
        {filtered.map((m,i)=>{
          const t = MS_TIERS.find(x=>x.id===m.tier);
          const stCol = m.status==='VIP'?'#D4A93C':m.status==='At-risk'?'#DC2626':m.status==='New'?'#7C9CFF':'#16A34A';
          return (
            <div key={m.id} onClick={()=>onSelect(m)} style={{display:'grid', gridTemplateColumns:'1fr 100px 110px 100px 110px 90px 90px', gap:12, padding:'12px 16px', alignItems:'center', borderTop:i>0?'1px solid var(--fill-04)':'none', cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:t.color,color:'#fff',fontSize:13,fontWeight:700,display:'grid',placeItems:'center'}}>{m.name.split(' ').slice(-1)[0][0]}</div>
                <div><div style={{fontWeight:700,fontSize:13}}>{m.name}</div><div style={{fontSize:11,color:'var(--label-02)'}}>{m.phone}</div></div>
              </div>
              <span style={{padding:'3px 9px',borderRadius:10,background:t.bg,color:t.color,fontSize:11,fontWeight:700}}>{t.name}</span>
              <div style={{fontWeight:700, fontSize:13}}>{m.points.toLocaleString('vi-VN')}</div>
              <div style={{fontSize:13}}>{m.active_combos > 0 ? <b style={{color:'#FF8A4C'}}>{m.active_combos} active</b> : <span style={{color:'var(--label-03)'}}>—</span>}</div>
              <div style={{fontWeight:700, fontSize:13}}>{(m.ltv/1_000_000).toFixed(1)}tr</div>
              <div style={{fontSize:12, color: m.lastVisit>30?'#DC2626':'var(--label-02)'}}>{m.lastVisit}d</div>
              <span style={{padding:'3px 8px',borderRadius:10,background:stCol+'18',color:stCol,fontSize:10,fontWeight:700}}>{m.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const chipStyle = (active, c) => ({
  padding:'5px 12px', borderRadius:14, border:'1px solid '+(active?c:'var(--fill-04)'),
  background: active?c:'white', color: active?'white':'var(--label-01)',
  fontSize:12, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center'
});

function MsCombos() {
  return (
    <div style={{padding:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Combo / Gói buổi</h3>
          <div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>Mua trước · trừ dần mỗi buổi · auto-link với Booking</div>
        </div>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo combo</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12}}>
        {MS_COMBOS.map(c => {
          const save = ((1 - c.price/c.list)*100).toFixed(0);
          return (
            <div key={c.id} style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:16}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
                <div style={{width:48,height:48,borderRadius:10,background:'#FF8A4C18',color:'#FF8A4C',display:'grid',placeItems:'center'}}><Icon.Layers/></div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
                  <div style={{fontSize:11,color:'var(--label-02)',marginTop:2}}>{c.svc} · hiệu lực {c.valid}</div>
                </div>
                <span style={{padding:'3px 8px',borderRadius:10,background:'#DCFCE7',color:'#16A34A',fontSize:11,fontWeight:700}}>-{save}%</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
                <div style={{padding:'6px 8px',background:'var(--fill-02)',borderRadius:6}}>
                  <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600}}>BUỔI</div>
                  <div style={{fontWeight:800,fontSize:14}}>{c.total>900?'∞':c.total}</div>
                </div>
                <div style={{padding:'6px 8px',background:'var(--fill-02)',borderRadius:6}}>
                  <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600}}>GIÁ</div>
                  <div style={{fontWeight:800,fontSize:14}}>{(c.price/1_000_000).toFixed(1)}tr</div>
                </div>
                <div style={{padding:'6px 8px',background:'var(--fill-02)',borderRadius:6}}>
                  <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600}}>ĐÃ BÁN</div>
                  <div style={{fontWeight:800,fontSize:14}}>{c.sold}</div>
                </div>
                <div style={{padding:'6px 8px',background:'var(--fill-02)',borderRadius:6}}>
                  <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600}}>ĐANG DÙNG</div>
                  <div style={{fontWeight:800,fontSize:14, color:'#FF8A4C'}}>{c.active}</div>
                </div>
              </div>
              <div style={{borderTop:'1px solid var(--fill-04)',paddingTop:8,fontSize:11,color:'var(--label-02)',display:'flex',justifyContent:'space-between'}}>
                <span>Doanh thu: <b style={{color:'#16A34A'}}>{(c.sold*c.price/1_000_000).toFixed(0)}tr</b></span>
                <span>Tỷ lệ kích hoạt: <b style={{color:'var(--label-01)'}}>{(c.active/c.sold*100).toFixed(0)}%</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MsRules() {
  return (
    <div style={{padding:20, display:'grid', gridTemplateColumns:'1fr 380px', gap:16}}>
      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, overflow:'hidden'}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--fill-04)', fontWeight:700, fontSize:14}}>Cấp bậc & Quyền lợi</div>
        {MS_TIERS.map((t,i)=>(
          <div key={t.id} style={{padding:'16px 18px', borderTop:i>0?'1px solid var(--fill-04)':'none', display:'grid', gridTemplateColumns:'140px 140px 1fr', gap:14, alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:42,height:42,borderRadius:10,background:t.color,color:'#fff',display:'grid',placeItems:'center',fontWeight:800,fontSize:16}}>{t.name[0]}</div>
              <div><div style={{fontWeight:800,fontSize:14}}>{t.name}</div><div style={{fontSize:11,color:'var(--label-02)'}}>{MS_MEMBERS.filter(m=>m.tier===t.id).length} thành viên</div></div>
            </div>
            <div>
              <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600,textTransform:'uppercase'}}>Yêu cầu LTV</div>
              <div style={{fontWeight:700,fontSize:13}}>{t.min ? `≥ ${(t.min/1_000_000).toFixed(0)}tr` : 'Mặc định'}</div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {t.perks.map((p,j)=>(<span key={j} style={{padding:'3px 9px',borderRadius:10,background:t.bg,color:t.color,fontSize:11,fontWeight:600}}>{p}</span>))}
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:18}}>
        <div style={{fontWeight:700, fontSize:14, marginBottom:14}}>Quy tắc tích điểm</div>
        {[
          {l:'Tỉ lệ tích cơ bản', v:'1.000đ = 1 điểm'},
          {l:'Bội điểm sinh nhật', v:'×3 trong tháng SN'},
          {l:'Quy đổi điểm', v:'1 điểm = 100đ'},
          {l:'Hết hạn điểm', v:'12 tháng không phát sinh'},
          {l:'Auto upgrade hạng', v:'Đạt LTV trong 12 tháng'},
          {l:'Auto downgrade', v:'12 tháng không đạt'},
        ].map((r,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<5?'1px solid var(--fill-04)':'none',fontSize:13}}>
            <span style={{color:'var(--label-02)'}}>{r.l}</span><span style={{fontWeight:700}}>{r.v}</span>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" style={{marginTop:12,width:'100%'}}><Icon.Edit/> Chỉnh quy tắc</button>
      </div>
    </div>
  );
}

function MsMemberDrawer({member, onClose}) {
  const t = MS_TIERS.find(x=>x.id===member.tier);
  const next = MS_TIERS[MS_TIERS.findIndex(x=>x.id===member.tier)+1];
  const progress = next ? Math.min(100, (member.ltv/next.min)*100) : 100;
  return (
    <div style={{width:400, background:'white', borderLeft:'1px solid var(--fill-04)', display:'flex', flexDirection:'column'}}>
      <div style={{padding:'14px 18px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:42,height:42,borderRadius:'50%',background:t.color,color:'#fff',fontWeight:800,display:'grid',placeItems:'center'}}>{member.name.split(' ').slice(-1)[0][0]}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:14}}>{member.name}</div>
          <div style={{fontSize:11,color:'var(--label-02)'}}>{member.phone} · Tham gia {member.joinedDays} ngày</div>
        </div>
        <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
      </div>
      <div style={{flex:1, overflow:'auto', padding:18, display:'flex', flexDirection:'column', gap:16}}>
        <div style={{padding:14, background:`linear-gradient(135deg, ${t.color}, ${t.color}aa)`, borderRadius:12, color:'#fff'}}>
          <div style={{fontSize:11,opacity:0.9,fontWeight:600,letterSpacing:0.5}}>HẠNG HIỆN TẠI</div>
          <div style={{fontSize:24,fontWeight:800,marginBottom:8}}>{t.name}</div>
          {next && (
            <>
              <div style={{height:6, background:'rgba(255,255,255,0.3)', borderRadius:3, overflow:'hidden', marginBottom:6}}>
                <div style={{height:'100%', width:progress+'%', background:'#fff', borderRadius:3}}/>
              </div>
              <div style={{fontSize:11, opacity:0.9}}>Còn {((next.min-member.ltv)/1_000_000).toFixed(1)}tr để lên {next.name}</div>
            </>
          )}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div style={{padding:12, background:'var(--fill-02)', borderRadius:8}}>
            <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600,textTransform:'uppercase'}}>Điểm khả dụng</div>
            <div style={{fontSize:20,fontWeight:800,color:'#FF8A4C'}}>{member.points.toLocaleString('vi-VN')}</div>
            <div style={{fontSize:11,color:'var(--label-02)'}}>≈ {(member.points*100/1000).toFixed(0)}k đ</div>
          </div>
          <div style={{padding:12, background:'var(--fill-02)', borderRadius:8}}>
            <div style={{fontSize:10,color:'var(--label-02)',fontWeight:600,textTransform:'uppercase'}}>Tổng chi tiêu</div>
            <div style={{fontSize:20,fontWeight:800}}>{(member.ltv/1_000_000).toFixed(1)}tr</div>
            <div style={{fontSize:11,color:'var(--label-02)'}}>{member.joinedDays} ngày</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--label-02)',textTransform:'uppercase',marginBottom:6}}>Combo đang dùng</div>
          {member.active_combos > 0 ? (
            <div style={{padding:12, background:'#FFF4E4', border:'1px solid #FFB547', borderRadius:8}}>
              <div style={{fontWeight:700,fontSize:13}}>Combo 10 buổi Massage 60p</div>
              <div style={{display:'flex',gap:3,margin:'8px 0'}}>
                {Array.from({length:10}).map((_,i)=>(<div key={i} style={{flex:1,height:6,borderRadius:2,background:i<6?'#FF8A4C':'#E5E7EB'}}/>))}
              </div>
              <div style={{fontSize:11,color:'var(--label-02)'}}>Đã dùng <b>6/10</b> buổi · còn 4 buổi · hết hạn 12/08/2026</div>
            </div>
          ) : <div style={{padding:14,background:'var(--fill-02)',borderRadius:8,textAlign:'center',fontSize:12,color:'var(--label-02)'}}>Chưa có combo</div>}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--label-02)',textTransform:'uppercase',marginBottom:6}}>Quyền lợi {t.name}</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {t.perks.map((p,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',background:'var(--fill-02)',borderRadius:6,fontSize:12}}><Icon.Check style={{color:t.color, width:14, height:14}}/>{p}</div>))}
          </div>
        </div>
      </div>
      <div style={{padding:'12px 18px',borderTop:'1px solid var(--fill-04)',display:'flex',gap:8}}>
        <button className="btn btn-ghost" style={{flex:1}}><Icon.Calendar/> Đặt hẹn</button>
        <button className="btn btn-primary" style={{flex:1}}><Icon.Plus/> Bán combo</button>
      </div>
    </div>
  );
}

window.MembershipModule = MembershipModule;
