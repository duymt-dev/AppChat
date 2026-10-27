/* ============================================================
   Booking Module — Lịch hẹn dịch vụ (Spa · Clinic · Gym · Đào tạo)
   ============================================================ */
const { useState: useBk, useMemo: useBkMemo } = React;

const BK_STATUS = {
  confirmed: { l:'Đã xác nhận', c:'#16A34A', bg:'#DCFCE7' },
  pending:   { l:'Chờ xác nhận', c:'#D97706', bg:'#FEF3C7' },
  arrived:   { l:'Đã đến',      c:'#2563EB', bg:'#DBEAFE' },
  done:      { l:'Hoàn thành',  c:'#475569', bg:'#E2E8F0' },
  noshow:    { l:'No-show',     c:'#DC2626', bg:'#FEE2E2' },
  cancelled: { l:'Đã huỷ',      c:'#94A3B8', bg:'#F1F5F9' },
};

const BK_SERVICES = [
  { id:'sv1', name:'Trị mụn chuyên sâu',     dur:90, price:1_200_000, color:'#FF8A4C', cat:'Skincare' },
  { id:'sv2', name:'Massage thư giãn 60p',   dur:60, price:680_000,   color:'#7C9CFF', cat:'Massage' },
  { id:'sv3', name:'Triệt lông Diode toàn thân', dur:120, price:3_500_000, color:'#F87171', cat:'Laser' },
  { id:'sv4', name:'Tư vấn 1-1 với HLV',     dur:45, price:450_000,   color:'#34D399', cat:'PT' },
  { id:'sv5', name:'Khám da soi VISIA',      dur:30, price:300_000,   color:'#A78BFA', cat:'Khám' },
  { id:'sv6', name:'Combo gội-massage đầu',  dur:75, price:520_000,   color:'#FBBF24', cat:'Hair' },
  { id:'sv7', name:'Buổi học demo IELTS',    dur:60, price:0,         color:'#60A5FA', cat:'Demo' },
  { id:'sv8', name:'Lớp Yoga Flow',          dur:75, price:180_000,   color:'#10B981', cat:'Class' },
];

const BK_STAFF = [
  { id:'s1', name:'BS. Hồng Anh',  role:'Bác sĩ da',     avatar:'H', color:'#F87171', branch:'CN Cầu Giấy' },
  { id:'s2', name:'KTV. Mai Lan',  role:'KTV da',        avatar:'M', color:'#FF8A4C', branch:'CN Cầu Giấy' },
  { id:'s3', name:'KTV. Thu Hà',   role:'KTV laser',     avatar:'T', color:'#7C9CFF', branch:'CN Cầu Giấy' },
  { id:'s4', name:'PT. Đức Minh',  role:'Personal trainer', avatar:'D', color:'#34D399', branch:'CN Mỹ Đình' },
  { id:'s5', name:'Cô Linh',       role:'Giáo viên IELTS', avatar:'L', color:'#A78BFA', branch:'Online' },
];

// Today base
const BK_TODAY = new Date();
const BK_DAY0 = new Date(BK_TODAY); BK_DAY0.setHours(0,0,0,0);

const dh = (d, h, m=0) => { const x = new Date(BK_DAY0); x.setDate(x.getDate()+d); x.setHours(h,m,0,0); return x; };

const BK_APPTS = [
  { id:'b1', start:dh(0,9),   end:dh(0,10,30), svc:'sv1', staff:'s2', cust:'Nguyễn Lan Hương', phone:'+84 909 123 456', channel:'Zalo OA', status:'confirmed', paid:'paid',     note:'Khách VIP — yêu cầu phòng riêng' },
  { id:'b2', start:dh(0,10),  end:dh(0,11),    svc:'sv2', staff:'s2', cust:'Trần Quỳnh Anh',  phone:'+84 912 345 678', channel:'Web Widget', status:'arrived',   paid:'pending',  note:'' },
  { id:'b3', start:dh(0,11),  end:dh(0,11,30), svc:'sv5', staff:'s1', cust:'Lê Phương Linh',  phone:'+84 938 222 111', channel:'Hotline',   status:'confirmed', paid:'paid',     note:'Lần đầu đến' },
  { id:'b4', start:dh(0,14),  end:dh(0,16),    svc:'sv3', staff:'s3', cust:'Đỗ Hồng Nhung',   phone:'+84 977 666 555', channel:'Zalo OA',   status:'confirmed', paid:'partial',  note:'Đã đặt cọc 1tr' },
  { id:'b5', start:dh(0,15),  end:dh(0,15,45), svc:'sv4', staff:'s4', cust:'Phạm Tuấn Đạt',   phone:'+84 901 555 222', channel:'App',       status:'confirmed', paid:'paid',     note:'' },
  { id:'b6', start:dh(0,16,30),end:dh(0,17,30),svc:'sv2', staff:'s2', cust:'Vũ Mai Trâm',     phone:'+84 988 333 444', channel:'Zalo OA',   status:'pending',   paid:'pending',  note:'Cần gọi xác nhận' },
  { id:'b7', start:dh(0,18),  end:dh(0,19),    svc:'sv7', staff:'s5', cust:'Hoàng Bảo An',    phone:'+84 909 777 888', channel:'Web',       status:'confirmed', paid:'free',     note:'Demo miễn phí' },

  { id:'b8',  start:dh(1,9),    end:dh(1,10,30), svc:'sv1', staff:'s2', cust:'Bùi Thuý Hà',    phone:'+84 909 999 111', channel:'Zalo OA',   status:'confirmed', paid:'paid',    note:'' },
  { id:'b9',  start:dh(1,10,30),end:dh(1,12,30), svc:'sv3', staff:'s3', cust:'Đặng Khánh Vy',  phone:'+84 988 222 333', channel:'Hotline',   status:'confirmed', paid:'partial', note:'' },
  { id:'b10', start:dh(1,14),   end:dh(1,15),    svc:'sv2', staff:'s2', cust:'Nguyễn Hà My',   phone:'+84 902 111 999', channel:'Web Widget',status:'pending',   paid:'pending', note:'' },
  { id:'b11', start:dh(1,16),   end:dh(1,17,15), svc:'sv6', staff:'s2', cust:'Trần Phương Anh',phone:'+84 909 444 333', channel:'Zalo OA',   status:'confirmed', paid:'paid',    note:'' },

  { id:'b12', start:dh(2,9,30), end:dh(2,11),    svc:'sv1', staff:'s2', cust:'Lê Quỳnh Như',   phone:'+84 919 888 777', channel:'App',       status:'confirmed', paid:'paid',    note:'' },
  { id:'b13', start:dh(2,11),   end:dh(2,11,30), svc:'sv5', staff:'s1', cust:'Mai Hoài Thu',   phone:'+84 909 555 666', channel:'Web',       status:'confirmed', paid:'paid',    note:'' },
  { id:'b14', start:dh(2,15),   end:dh(2,17),    svc:'sv3', staff:'s3', cust:'Hoàng Mỹ Linh',  phone:'+84 977 222 111', channel:'Zalo OA',   status:'confirmed', paid:'partial', note:'' },

  { id:'b15', start:dh(-1,10), end:dh(-1,11,30), svc:'sv1', staff:'s2', cust:'Nguyễn Bảo Châu',phone:'+84 909 800 800', channel:'Zalo OA',   status:'done',      paid:'paid',    note:'' },
  { id:'b16', start:dh(-1,14), end:dh(-1,15),    svc:'sv2', staff:'s2', cust:'Trần Khánh Hà',  phone:'+84 902 909 909', channel:'Hotline',   status:'noshow',    paid:'pending', note:'Không đến — đã gọi 3 lần' },
  { id:'b17', start:dh(-1,16,30),end:dh(-1,17,15),svc:'sv6',staff:'s2', cust:'Vũ Diệu Linh',   phone:'+84 938 100 100', channel:'Zalo OA',   status:'cancelled', paid:'refunded',note:'Khách dời sang tuần sau' },

  { id:'b18', start:dh(3,8,30), end:dh(3,9,15),  svc:'sv4', staff:'s4', cust:'Lý Thanh Tùng',  phone:'+84 909 222 333', channel:'App',       status:'confirmed', paid:'paid',    note:'' },
  { id:'b19', start:dh(3,17),   end:dh(3,18,15), svc:'sv8', staff:'s5', cust:'Lớp Yoga Flow · 12 khách', phone:'group', channel:'App',       status:'confirmed', paid:'paid',    note:'Lớp nhóm' },

  { id:'b20', start:dh(4,9),    end:dh(4,10,30), svc:'sv1', staff:'s2', cust:'Đinh Minh Châu', phone:'+84 909 333 444', channel:'Zalo OA',   status:'confirmed', paid:'paid',    note:'' },
  { id:'b21', start:dh(4,11),   end:dh(4,12),    svc:'sv2', staff:'s2', cust:'Phan Khánh Linh',phone:'+84 977 800 900', channel:'Web',       status:'pending',   paid:'pending', note:'' },
];

// =====================================================================
function BookingModule() {
  const [view, setView] = useBk('week');     // week | day | list | services
  const [dayOff, setDayOff] = useBk(0);      // delta from today for week start
  const [filter, setFilter] = useBk({ branch:'all', staff:'all', status:'all' });
  const [sel, setSel] = useBk(null);         // selected appointment
  const [showQR, setShowQR] = useBk(false);

  const filtered = useBkMemo(() => BK_APPTS.filter(a => {
    if (filter.staff !== 'all' && a.staff !== filter.staff) return false;
    if (filter.status !== 'all' && a.status !== filter.status) return false;
    return true;
  }), [filter]);

  // KPI calc
  const today = filtered.filter(a => a.start.toDateString() === BK_TODAY.toDateString());
  const noshow30 = filtered.filter(a => a.status==='noshow').length;
  const total30 = filtered.filter(a => a.status==='done' || a.status==='noshow').length;
  const utilHrs = today.reduce((s,a)=>s+(a.end-a.start)/3600000,0).toFixed(1);
  const todayRev = today.filter(a=>a.paid!=='free').reduce((s,a)=>s+(BK_SERVICES.find(x=>x.id===a.svc)?.price||0),0);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>

      {/* TOPBAR */}
      <div className="topbar">
        <h2 style={{margin:0, fontSize:18, fontWeight:700}}>Booking · Lịch hẹn</h2>
        <span className="dot-sep"/>
        <div style={{display:'inline-flex', background:'var(--fill-02)', padding:3, borderRadius:8, gap:2}}>
          {[
            {k:'week', l:'Tuần'},
            {k:'day', l:'Ngày'},
            {k:'list', l:'Danh sách'},
            {k:'services', l:'Dịch vụ'},
          ].map(t => (
            <button key={t.k} onClick={()=>setView(t.k)}
              className={'btn btn-sm '+(view===t.k?'btn-primary':'btn-ghost')}
              style={{fontWeight:600, fontSize:13, padding:'4px 12px'}}>{t.l}</button>
          ))}
        </div>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowQR(true)}>
          <Icon.Globe/> Link đặt hẹn online
        </button>
        <button className="btn btn-primary btn-sm">
          <Icon.Plus/> Tạo lịch hẹn
        </button>
      </div>

      {/* KPI ROW */}
      <div style={{padding:'12px 20px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, borderBottom:'1px solid var(--fill-04)'}}>
        <BKMet label="Lịch hẹn hôm nay" v={today.length} sub={`${today.filter(a=>a.status==='confirmed').length} đã xác nhận`} c="#FF8A4C" icon={<Icon.Calendar/>}/>
        <BKMet label="Đã đến / Hoàn thành" v={today.filter(a=>['arrived','done'].includes(a.status)).length} sub={`${today.length} tổng`} c="#16A34A" icon={<Icon.Check/>}/>
        <BKMet label="Chờ xác nhận" v={today.filter(a=>a.status==='pending').length} sub="cần gọi xác nhận" c="#D97706" icon={<Icon.Clock/>}/>
        <BKMet label="Utilization hôm nay" v={`${utilHrs}h`} sub={`/ 40h KTV trống`} c="#7C9CFF" icon={<Icon.Activity/>}/>
        <BKMet label="Doanh thu hôm nay" v={`${(todayRev/1_000_000).toFixed(1)}tr`} sub={`${today.filter(a=>a.paid==='paid').length} đã thanh toán`} c="#A78BFA" icon={<Icon.Zap/>}/>
      </div>

      {/* FILTERS */}
      <div style={{padding:'10px 20px', display:'flex', gap:8, alignItems:'center', borderBottom:'1px solid var(--fill-04)', flexWrap:'wrap'}}>
        <span style={{fontSize:12, color:'var(--label-02)', fontWeight:600}}>Bộ lọc:</span>
        <BKChip label="Tất cả KTV" active={filter.staff==='all'} onClick={()=>setFilter({...filter,staff:'all'})}/>
        {BK_STAFF.map(s => (
          <BKChip key={s.id} label={s.name} avatar={s.avatar} avatarColor={s.color}
            active={filter.staff===s.id} onClick={()=>setFilter({...filter,staff:s.id})}/>
        ))}
        <span style={{width:1, height:18, background:'var(--fill-04)', margin:'0 4px'}}/>
        {Object.entries(BK_STATUS).slice(0,5).map(([k,v]) => (
          <BKChip key={k} label={v.l} dot={v.c}
            active={filter.status===k} onClick={()=>setFilter({...filter,status:filter.status===k?'all':k})}/>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{flex:1, display:'flex', overflow:'hidden'}}>
        <div style={{flex:1, overflow:'auto'}}>
          {view==='week' && <BKWeek dayOff={dayOff} setDayOff={setDayOff} appts={filtered} onSelect={setSel}/>}
          {view==='day' && <BKDay dayOff={dayOff} setDayOff={setDayOff} appts={filtered} onSelect={setSel}/>}
          {view==='list' && <BKList appts={filtered} onSelect={setSel}/>}
          {view==='services' && <BKServices/>}
        </div>
        {sel && <BKDrawer appt={sel} onClose={()=>setSel(null)}/>}
      </div>

      {showQR && <BKBookingLink onClose={()=>setShowQR(false)}/>}
    </div>
  );
}

// =====================================================================
function BKMet({label, v, sub, c, icon}) {
  return (
    <div style={{padding:'10px 14px', background:'var(--fill-02)', border:'1px solid var(--fill-04)', borderRadius:10, display:'flex', alignItems:'center', gap:10}}>
      <div style={{width:36, height:36, borderRadius:8, background:c+'18', color:c, display:'grid', placeItems:'center'}}>{icon}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.3}}>{label}</div>
        <div style={{fontSize:20, fontWeight:800, color:'var(--label-01)', lineHeight:1.1}}>{v}</div>
        <div style={{fontSize:11, color:'var(--label-02)', marginTop:1}}>{sub}</div>
      </div>
    </div>
  );
}

function BKChip({label, active, onClick, avatar, avatarColor, dot}) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'4px 10px', borderRadius:14,
      background: active ? 'var(--primary)' : 'white',
      color: active ? 'white' : 'var(--label-01)',
      border:'1px solid '+(active?'var(--primary)':'var(--fill-04)'),
      fontSize:12, fontWeight:600, cursor:'pointer'
    }}>
      {avatar && <span style={{width:16, height:16, borderRadius:'50%', background:avatarColor, color:'#fff', fontSize:9, fontWeight:700, display:'grid', placeItems:'center'}}>{avatar}</span>}
      {dot && <span style={{width:6, height:6, borderRadius:'50%', background:dot}}/>}
      {label}
    </button>
  );
}

// =====================================================================
// WEEK VIEW — column per day, time grid
// =====================================================================
function BKWeek({dayOff, setDayOff, appts, onSelect}) {
  const startDate = new Date(BK_DAY0); startDate.setDate(startDate.getDate()+dayOff - startDate.getDay()+1);
  const days = Array.from({length:7}, (_,i)=>{ const d = new Date(startDate); d.setDate(d.getDate()+i); return d; });
  const HOURS = Array.from({length:13}, (_,i)=>i+8); // 8h - 20h
  const HOUR_PX = 56;

  const fmtDay = d => d.toLocaleDateString('vi-VN', {weekday:'short', day:'2-digit', month:'2-digit'});
  const isToday = d => d.toDateString() === BK_TODAY.toDateString();

  return (
    <div style={{padding:16}}>
      {/* week nav */}
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
        <button className="btn-icon" onClick={()=>setDayOff(dayOff-7)}><Icon.ChevronLeft/></button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setDayOff(0)}>Hôm nay</button>
        <button className="btn-icon" onClick={()=>setDayOff(dayOff+7)}><Icon.ChevronRight/></button>
        <div style={{fontSize:15, fontWeight:700}}>
          {days[0].toLocaleDateString('vi-VN', {day:'2-digit', month:'short'})} — {days[6].toLocaleDateString('vi-VN', {day:'2-digit', month:'short', year:'numeric'})}
        </div>
        <span style={{flex:1}}/>
        <span style={{fontSize:12, color:'var(--label-02)'}}>
          <b>{appts.filter(a=>days.some(d=>d.toDateString()===a.start.toDateString())).length}</b> lịch hẹn tuần này
        </span>
      </div>

      {/* grid */}
      <div style={{
        display:'grid', gridTemplateColumns:'56px repeat(7, 1fr)', gap:1,
        background:'var(--fill-04)', borderRadius:10, overflow:'hidden',
        border:'1px solid var(--fill-04)'
      }}>
        {/* header row */}
        <div style={{background:'var(--fill-02)'}}/>
        {days.map((d,i)=>(
          <div key={i} style={{
            background:'var(--fill-02)', padding:'10px 8px', textAlign:'center',
            borderBottom: isToday(d) ? '3px solid var(--primary)' : 'none'
          }}>
            <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600, textTransform:'uppercase'}}>
              {d.toLocaleDateString('vi-VN', {weekday:'short'})}
            </div>
            <div style={{fontSize:18, fontWeight:800, color:isToday(d)?'var(--primary)':'var(--label-01)'}}>
              {d.getDate()}
            </div>
          </div>
        ))}

        {/* hour rows */}
        {HOURS.map(h => (
          <React.Fragment key={h}>
            <div style={{background:'white', padding:'4px 6px', textAlign:'right', fontSize:11, color:'var(--label-02)', fontWeight:600, height:HOUR_PX}}>
              {String(h).padStart(2,'0')}:00
            </div>
            {days.map((d,i)=>(
              <div key={i} style={{background:'white', position:'relative', height:HOUR_PX, borderTop:'1px dashed var(--fill-04)'}}/>
            ))}
          </React.Fragment>
        ))}

        {/* appt blocks — overlay positioned by date column */}
        <div style={{gridColumn:'1 / -1', gridRow:'2', position:'relative', height:0}}>
          {appts.map(a => {
            const dayIdx = days.findIndex(d => d.toDateString() === a.start.toDateString());
            if (dayIdx < 0) return null;
            const sH = a.start.getHours() + a.start.getMinutes()/60;
            const eH = a.end.getHours()   + a.end.getMinutes()/60;
            const top = (sH-8) * HOUR_PX;
            const h = (eH-sH) * HOUR_PX - 2;
            const sv = BK_SERVICES.find(s=>s.id===a.svc);
            const st = BK_STATUS[a.status];
            const colW = `calc((100% - 56px) / 7)`;
            const left = `calc(56px + ${dayIdx} * ${colW} + 2px)`;
            const isCancelled = a.status==='cancelled' || a.status==='noshow';
            return (
              <div key={a.id} onClick={()=>onSelect(a)}
                style={{
                  position:'absolute', top, height:Math.max(h,28),
                  left, width:`calc(${colW} - 4px)`,
                  background: isCancelled ? '#F1F5F9' : sv.color+'18',
                  borderLeft:`3px solid ${isCancelled?'#94A3B8':sv.color}`,
                  borderRadius:6, padding:'4px 7px', cursor:'pointer',
                  fontSize:11, color:'var(--label-01)', overflow:'hidden',
                  textDecoration: isCancelled?'line-through':'none',
                  opacity: isCancelled?0.65:1,
                  zIndex:2
                }}>
                <div style={{fontWeight:700, fontSize:11, lineHeight:1.2, marginBottom:2, color:isCancelled?'#94A3B8':sv.color}}>
                  {a.start.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})} · {sv.name}
                </div>
                <div style={{fontWeight:600, color:'var(--label-01)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{a.cust}</div>
                {h>50 && (
                  <div style={{display:'flex', gap:4, alignItems:'center', marginTop:3}}>
                    <span style={{display:'inline-block', width:14, height:14, borderRadius:'50%', background:BK_STAFF.find(s=>s.id===a.staff)?.color, color:'#fff', fontSize:8, fontWeight:700, textAlign:'center', lineHeight:'14px'}}>{BK_STAFF.find(s=>s.id===a.staff)?.avatar}</span>
                    <span style={{fontSize:10, color:'var(--label-02)'}}>{a.channel}</span>
                  </div>
                )}
                {a.status==='pending' && <span style={{position:'absolute', top:4, right:6, width:6, height:6, borderRadius:'50%', background:st.c}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div style={{marginTop:14, display:'flex', gap:14, flexWrap:'wrap', fontSize:11, color:'var(--label-02)'}}>
        <span style={{fontWeight:700, color:'var(--label-01)'}}>Loại dịch vụ:</span>
        {BK_SERVICES.slice(0,6).map(s => (
          <span key={s.id} style={{display:'inline-flex', alignItems:'center', gap:5}}>
            <span style={{width:10, height:10, background:s.color, borderRadius:3}}/> {s.cat}
          </span>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// DAY VIEW — staff columns
// =====================================================================
function BKDay({dayOff, setDayOff, appts, onSelect}) {
  const date = new Date(BK_DAY0); date.setDate(date.getDate()+dayOff);
  const todays = appts.filter(a => a.start.toDateString() === date.toDateString());
  const HOURS = Array.from({length:13}, (_,i)=>i+8);
  const HOUR_PX = 64;

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
        <button className="btn-icon" onClick={()=>setDayOff(dayOff-1)}><Icon.ChevronLeft/></button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setDayOff(0)}>Hôm nay</button>
        <button className="btn-icon" onClick={()=>setDayOff(dayOff+1)}><Icon.ChevronRight/></button>
        <div style={{fontSize:15, fontWeight:700}}>
          {date.toLocaleDateString('vi-VN', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})}
        </div>
        <span style={{flex:1}}/>
        <span style={{fontSize:12, color:'var(--label-02)'}}><b>{todays.length}</b> lịch hẹn</span>
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:`56px repeat(${BK_STAFF.length}, 1fr)`,
        gap:1, background:'var(--fill-04)', borderRadius:10, overflow:'hidden',
        border:'1px solid var(--fill-04)'
      }}>
        <div style={{background:'var(--fill-02)'}}/>
        {BK_STAFF.map(s => (
          <div key={s.id} style={{background:'var(--fill-02)', padding:'10px 8px', textAlign:'center'}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:s.color,color:'#fff',fontSize:13,fontWeight:700,display:'grid',placeItems:'center',margin:'0 auto'}}>{s.avatar}</div>
            <div style={{fontSize:12, fontWeight:700, marginTop:4}}>{s.name}</div>
            <div style={{fontSize:10, color:'var(--label-02)'}}>{s.role}</div>
          </div>
        ))}

        {HOURS.map(h => (
          <React.Fragment key={h}>
            <div style={{background:'white', padding:'4px 6px', textAlign:'right', fontSize:11, color:'var(--label-02)', fontWeight:600, height:HOUR_PX}}>
              {String(h).padStart(2,'0')}:00
            </div>
            {BK_STAFF.map((s,i)=>(
              <div key={i} style={{background:'white', position:'relative', height:HOUR_PX, borderTop:'1px dashed var(--fill-04)'}}/>
            ))}
          </React.Fragment>
        ))}

        <div style={{gridColumn:'1 / -1', gridRow:'2', position:'relative', height:0}}>
          {todays.map(a => {
            const staffIdx = BK_STAFF.findIndex(s=>s.id===a.staff);
            if (staffIdx<0) return null;
            const sH = a.start.getHours() + a.start.getMinutes()/60;
            const eH = a.end.getHours()   + a.end.getMinutes()/60;
            const top = (sH-8) * HOUR_PX;
            const h = (eH-sH) * HOUR_PX - 2;
            const sv = BK_SERVICES.find(s=>s.id===a.svc);
            const colW = `calc((100% - 56px) / ${BK_STAFF.length})`;
            const left = `calc(56px + ${staffIdx} * ${colW} + 4px)`;
            const isCancelled = a.status==='cancelled' || a.status==='noshow';
            return (
              <div key={a.id} onClick={()=>onSelect(a)}
                style={{
                  position:'absolute', top, height:Math.max(h,32),
                  left, width:`calc(${colW} - 8px)`,
                  background:isCancelled?'#F1F5F9':sv.color+'22',
                  borderLeft:`4px solid ${isCancelled?'#94A3B8':sv.color}`,
                  borderRadius:8, padding:'6px 9px', cursor:'pointer',
                  fontSize:12, color:'var(--label-01)', overflow:'hidden',
                  zIndex:2,
                  opacity:isCancelled?0.6:1
                }}>
                <div style={{fontWeight:700, color:isCancelled?'#94A3B8':sv.color, fontSize:11, marginBottom:2}}>
                  {a.start.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})} – {a.end.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}
                </div>
                <div style={{fontWeight:700, fontSize:13, color:'var(--label-01)'}}>{a.cust}</div>
                <div style={{fontSize:11, color:'var(--label-02)', marginTop:2}}>{sv.name}</div>
                <BKStatusPill status={a.status} small/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BKStatusPill({status, small}) {
  const s = BK_STATUS[status] || BK_STATUS.confirmed;
  return (
    <span style={{
      display:'inline-block', marginTop:4,
      padding: small?'1px 6px':'2px 8px', fontSize: small?9:11, fontWeight:700,
      borderRadius:10, background:s.bg, color:s.c, textTransform:'uppercase', letterSpacing:0.3
    }}>{s.l}</span>
  );
}

// =====================================================================
// LIST VIEW
// =====================================================================
function BKList({appts, onSelect}) {
  const sorted = [...appts].sort((a,b)=>a.start - b.start);
  const groups = {};
  sorted.forEach(a => {
    const key = a.start.toLocaleDateString('vi-VN', {weekday:'long', day:'2-digit', month:'long'});
    (groups[key] = groups[key] || []).push(a);
  });

  return (
    <div style={{padding:16}}>
      {Object.entries(groups).map(([day, items]) => (
        <div key={day} style={{marginBottom:18}}>
          <div style={{fontSize:13, fontWeight:700, color:'var(--label-01)', marginBottom:8, padding:'0 4px'}}>
            {day} <span style={{color:'var(--label-02)', fontWeight:500}}>· {items.length} lịch hẹn</span>
          </div>
          <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, overflow:'hidden'}}>
            {items.map((a,i) => {
              const sv = BK_SERVICES.find(s=>s.id===a.svc);
              const st = BK_STAFF.find(s=>s.id===a.staff);
              return (
                <div key={a.id} onClick={()=>onSelect(a)}
                  style={{
                    display:'grid', gridTemplateColumns:'80px 1fr 200px 180px 130px 100px',
                    alignItems:'center', gap:14, padding:'12px 16px',
                    borderTop: i>0 ? '1px solid var(--fill-04)' : 'none',
                    cursor:'pointer'
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div>
                    <div style={{fontSize:14, fontWeight:700}}>{a.start.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</div>
                    <div style={{fontSize:11, color:'var(--label-02)'}}>{(a.end-a.start)/60000}'</div>
                  </div>
                  <div>
                    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:2}}>
                      <span style={{width:6, height:6, borderRadius:'50%', background:sv.color}}/>
                      <span style={{fontWeight:600, fontSize:13}}>{sv.name}</span>
                    </div>
                    <div style={{fontSize:11, color:'var(--label-02)'}}>{a.cust} · {a.phone}</div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:7}}>
                    <span style={{width:24,height:24,borderRadius:'50%',background:st.color,color:'#fff',fontSize:10,fontWeight:700,display:'grid',placeItems:'center'}}>{st.avatar}</span>
                    <div>
                      <div style={{fontSize:12, fontWeight:600}}>{st.name}</div>
                      <div style={{fontSize:10, color:'var(--label-02)'}}>{st.role}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:11, color:'var(--label-02)'}}>Kênh đặt</div>
                    <div style={{fontSize:12, fontWeight:600}}>{a.channel}</div>
                  </div>
                  <BKStatusPill status={a.status}/>
                  <BKPaidPill paid={a.paid}/>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {!Object.keys(groups).length && (
        <div style={{padding:60, textAlign:'center', color:'var(--label-02)'}}>
          <Icon.Calendar/><div style={{marginTop:10}}>Không có lịch hẹn khớp bộ lọc</div>
        </div>
      )}
    </div>
  );
}

function BKPaidPill({paid}) {
  const map = {
    paid:    {l:'Đã thu', c:'#16A34A', bg:'#DCFCE7'},
    pending: {l:'Chưa thu', c:'#D97706', bg:'#FEF3C7'},
    partial: {l:'Cọc', c:'#7C9CFF', bg:'#DBEAFE'},
    refunded:{l:'Hoàn', c:'#94A3B8', bg:'#F1F5F9'},
    free:    {l:'Free', c:'#475569', bg:'#E2E8F0'},
  };
  const m = map[paid] || map.pending;
  return <span style={{padding:'2px 8px', fontSize:11, fontWeight:700, borderRadius:10, background:m.bg, color:m.c}}>{m.l}</span>;
}

// =====================================================================
// SERVICES TAB
// =====================================================================
function BKServices() {
  return (
    <div style={{padding:20}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
        <div>
          <h3 style={{margin:0, fontSize:16, fontWeight:700}}>Danh mục dịch vụ</h3>
          <div style={{fontSize:12, color:'var(--label-02)', marginTop:2}}>{BK_SERVICES.length} dịch vụ · gắn vào widget Web, Zalo OA, App</div>
        </div>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Thêm dịch vụ</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
        {BK_SERVICES.map(s => (
          <div key={s.id} style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:14, position:'relative'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
              <div style={{width:38, height:38, borderRadius:9, background:s.color+'20', color:s.color, display:'grid', placeItems:'center', fontWeight:800, fontSize:13}}>
                {s.cat.slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:14}}>{s.name}</div>
                <div style={{fontSize:11, color:'var(--label-02)'}}>{s.cat}</div>
              </div>
              <button className="btn-icon"><Icon.More/></button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10}}>
              <div style={{padding:'6px 8px', background:'var(--fill-02)', borderRadius:6}}>
                <div style={{fontSize:10, color:'var(--label-02)', fontWeight:600}}>THỜI LƯỢNG</div>
                <div style={{fontSize:14, fontWeight:700}}>{s.dur}'</div>
              </div>
              <div style={{padding:'6px 8px', background:'var(--fill-02)', borderRadius:6}}>
                <div style={{fontSize:10, color:'var(--label-02)', fontWeight:600}}>GIÁ</div>
                <div style={{fontSize:14, fontWeight:700, color:s.price?'var(--label-01)':'#16A34A'}}>{s.price ? (s.price/1000).toLocaleString('vi-VN')+'k' : 'Miễn phí'}</div>
              </div>
            </div>
            <div style={{fontSize:11, color:'var(--label-02)', borderTop:'1px solid var(--fill-04)', paddingTop:8, display:'flex', justifyContent:'space-between'}}>
              <span>KTV: <b style={{color:'var(--label-01)'}}>{BK_STAFF.filter(st=>['s2','s1','s3'].includes(st.id) && Math.random()>0.4).length || 2}</b></span>
              <span>Buffer 10' giữa hẹn</span>
              <span style={{color:'#16A34A'}}>● Live</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// DRAWER — Appointment detail
// =====================================================================
function BKDrawer({appt, onClose}) {
  const sv = BK_SERVICES.find(s=>s.id===appt.svc);
  const st = BK_STAFF.find(s=>s.id===appt.staff);
  return (
    <div style={{
      width:400, background:'white', borderLeft:'1px solid var(--fill-04)',
      display:'flex', flexDirection:'column', flexShrink:0
    }}>
      <div style={{padding:'14px 18px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:42,height:42,borderRadius:'50%', background:sv.color+'20', color:sv.color, display:'grid', placeItems:'center', fontWeight:800}}>
          <Icon.Calendar/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800, fontSize:14}}>{sv.name}</div>
          <div style={{fontSize:11, color:'var(--label-02)'}}>
            {appt.start.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'})} · {appt.start.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} – {appt.end.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
        <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
      </div>

      <div style={{flex:1, overflow:'auto', padding:18, display:'flex', flexDirection:'column', gap:16}}>
        <div style={{display:'flex', gap:8}}>
          <BKStatusPill status={appt.status}/>
          <BKPaidPill paid={appt.paid}/>
        </div>

        <BKSection title="Khách hàng">
          <div style={{display:'flex', alignItems:'center', gap:10, padding:10, background:'var(--fill-02)', borderRadius:8}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'var(--primary)',color:'#fff',fontSize:14,fontWeight:700,display:'grid',placeItems:'center'}}>
              {appt.cust.split(' ').slice(-1)[0][0]}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:14}}>{appt.cust}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>{appt.phone} · {appt.channel}</div>
            </div>
            <button className="btn-icon" title="Mở chat"><Icon.Chat/></button>
            <button className="btn-icon" title="Gọi"><Icon.Phone/></button>
          </div>
        </BKSection>

        <BKSection title="KTV phụ trách">
          <div style={{display:'flex', alignItems:'center', gap:10, padding:10, background:'var(--fill-02)', borderRadius:8}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:st.color,color:'#fff',fontSize:13,fontWeight:700,display:'grid',placeItems:'center'}}>{st.avatar}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:13}}>{st.name}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>{st.role} · {st.branch}</div>
            </div>
            <button className="btn btn-ghost btn-sm">Đổi KTV</button>
          </div>
        </BKSection>

        <BKSection title="Chi tiết dịch vụ">
          <div style={{padding:10, background:'var(--fill-02)', borderRadius:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <BKKv label="Thời lượng" value={`${sv.dur} phút`}/>
            <BKKv label="Giá" value={sv.price ? `${(sv.price/1000).toLocaleString('vi-VN')}.000₫` : 'Miễn phí'}/>
            <BKKv label="Buffer" value="10 phút"/>
            <BKKv label="Phòng" value="Phòng VIP 2"/>
          </div>
        </BKSection>

        {appt.note && (
          <BKSection title="Ghi chú">
            <div style={{padding:'10px 12px', background:'#FEF3C7', borderLeft:'3px solid #D97706', borderRadius:6, fontSize:13, color:'#78350F'}}>
              {appt.note}
            </div>
          </BKSection>
        )}

        <BKSection title="Lịch sử khách">
          {[
            {d:'15/04/2026', s:'Trị mụn chuyên sâu', st:'done'},
            {d:'02/04/2026', s:'Khám da soi VISIA', st:'done'},
            {d:'18/03/2026', s:'Massage thư giãn 60p', st:'done'},
          ].map((h,i)=>(
            <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:i<2?'1px solid var(--fill-04)':'none', fontSize:12}}>
              <span style={{color:'var(--label-02)'}}>{h.d}</span>
              <span style={{flex:1, marginLeft:10}}>{h.s}</span>
              <BKStatusPill status={h.st} small/>
            </div>
          ))}
        </BKSection>

        <BKSection title="Tự động hoá">
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {[
              {ic:<Icon.Check/>, t:'SMS xác nhận đã gửi · 09:12', c:'#16A34A'},
              {ic:<Icon.Clock/>, t:'Reminder 24h trước hẹn · sẽ gửi 09/05 09:00', c:'#D97706'},
              {ic:<Icon.Sparkles/>, t:'Khảo sát NPS sau hẹn · auto-trigger', c:'#7C9CFF'},
            ].map((x,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--fill-02)', borderRadius:6, fontSize:12}}>
                <span style={{color:x.c, display:'flex'}}>{x.ic}</span>
                {x.t}
              </div>
            ))}
          </div>
        </BKSection>
      </div>

      <div style={{padding:'12px 18px', borderTop:'1px solid var(--fill-04)', display:'flex', gap:8}}>
        <button className="btn btn-ghost" style={{flex:1}}><Icon.Edit/> Đổi giờ</button>
        {appt.status==='confirmed' && <button className="btn btn-primary" style={{flex:1}}><Icon.Check/> Check-in</button>}
        {appt.status==='arrived' && <button className="btn btn-primary" style={{flex:1}}><Icon.Check/> Hoàn thành</button>}
        {appt.status==='pending' && <button className="btn btn-primary" style={{flex:1}}><Icon.Check/> Xác nhận</button>}
        {appt.status==='done' && <button className="btn btn-ghost" style={{flex:1}}><Icon.Refresh/> Đặt lại</button>}
      </div>
    </div>
  );
}

function BKSection({title, children}) {
  return (
    <div>
      <div style={{fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:0.4, marginBottom:6}}>{title}</div>
      {children}
    </div>
  );
}
function BKKv({label, value}) {
  return (
    <div>
      <div style={{fontSize:10, color:'var(--label-02)', fontWeight:600, textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:13, fontWeight:600}}>{value}</div>
    </div>
  );
}

// =====================================================================
// BOOKING LINK MODAL
// =====================================================================
function BKBookingLink({onClose}) {
  const url = 'book.appchat.vn/spa-mailan';
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.55)',
      display:'grid', placeItems:'center', zIndex:200
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'white', borderRadius:14, padding:24, width:480,
        boxShadow:'0 20px 60px rgba(15,23,42,0.4)'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
          <div style={{width:42,height:42,borderRadius:10,background:'var(--primary)20',color:'var(--primary)',display:'grid',placeItems:'center'}}>
            <Icon.Globe/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16, fontWeight:800}}>Link đặt hẹn online</div>
            <div style={{fontSize:12, color:'var(--label-02)'}}>Khách tự book qua web · không cần app</div>
          </div>
          <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
        </div>

        <div style={{display:'flex', gap:8, marginBottom:14}}>
          <input value={url} readOnly style={{flex:1, padding:'10px 12px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'monospace'}}/>
          <button className="btn btn-primary"><Icon.Copy/> Copy</button>
        </div>

        <div style={{
          aspectRatio:'1', maxWidth:200, margin:'14px auto',
          background:`repeating-conic-gradient(#0F172A 0% 25%, transparent 0% 50%) 50% / 8px 8px`,
          border:'8px solid #fff', boxShadow:'0 0 0 1px var(--fill-04)', borderRadius:10
        }}/>
        <div style={{textAlign:'center', fontSize:11, color:'var(--label-02)', marginBottom:14}}>
          QR Code · scan từ Zalo / camera để đặt hẹn
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:14}}>
          {[
            {l:'Lượt xem', v:'2,847', c:'#7C9CFF'},
            {l:'Booking thành công', v:'186', c:'#16A34A'},
            {l:'Conversion', v:'6.5%', c:'#FF8A4C'},
          ].map((m,i)=>(
            <div key={i} style={{padding:'8px 10px', background:'var(--fill-02)', borderRadius:6, textAlign:'center'}}>
              <div style={{fontSize:16, fontWeight:800, color:m.c}}>{m.v}</div>
              <div style={{fontSize:10, color:'var(--label-02)', fontWeight:600}}>{m.l}</div>
            </div>
          ))}
        </div>

        <div style={{padding:'10px 12px', background:'var(--fill-02)', borderRadius:8, fontSize:12, color:'var(--label-02)'}}>
          <Icon.Sparkles/> Khách book online được tự động đồng bộ vào Calendar + tạo contact mới + gửi SMS xác nhận.
        </div>

        <div style={{display:'flex', gap:8, marginTop:14}}>
          <button className="btn btn-ghost" style={{flex:1}}><Icon.Settings/> Tuỳ chỉnh trang</button>
          <button className="btn btn-primary" style={{flex:1}}><Icon.Plug/> Embed vào website</button>
        </div>
      </div>
    </div>
  );
}

window.BookingModule = BookingModule;
