/* Resources & Rooms — phòng/máy/giường + conflict check */
const { useState: useRR, useMemo: useRRM } = React;

const RR_TYPES = [
  { k:'room',     l:'Phòng',          icon:'Layers',  color:'#0ea5e9' },
  { k:'machine',  l:'Thiết bị',       icon:'Plug',    color:'#8b5cf6' },
  { k:'bed',      l:'Giường/Ghế',     icon:'Bookmark',color:'#10b981' },
  { k:'station',  l:'Bàn/Trạm',       icon:'Grid',    color:'#f59e0b' },
];

const RESOURCES = [
  { id:'R-101', name:'Phòng VIP 1',      type:'room',    capacity:2, branch:'CN Q1',  status:'busy',     util:78, tags:['Spa cao cấp','Massage đôi'], next:'14:30 — Chị Lan', hue:200 },
  { id:'R-102', name:'Phòng VIP 2',      type:'room',    capacity:2, branch:'CN Q1',  status:'available',util:62, tags:['Facial','Massage'], next:'15:00 — Chị Hà', hue:200 },
  { id:'R-103', name:'Phòng Treatment 1',type:'room',    capacity:1, branch:'CN Q1',  status:'busy',     util:91, tags:['Trị liệu','Laser'], next:'Đang sử dụng', hue:200 },
  { id:'R-104', name:'Phòng Treatment 2',type:'room',    capacity:1, branch:'CN Q3',  status:'cleaning', util:54, tags:['Trị liệu'], next:'15:30 sẵn sàng', hue:200 },
  { id:'R-201', name:'Máy Laser Pico',   type:'machine', capacity:1, branch:'CN Q1',  status:'busy',     util:88, tags:['Laser','Triệt lông'], next:'Đang chạy ca 3/4', hue:280 },
  { id:'R-202', name:'Máy HIFU Ultraformer',type:'machine',capacity:1, branch:'CN Q1', status:'available',util:71, tags:['Nâng cơ','Trẻ hóa'], next:'14:45 — Chị Mai', hue:280 },
  { id:'R-203', name:'Máy IPL Quantum',  type:'machine', capacity:1, branch:'CN Q3',  status:'maintenance',util:0, tags:['Triệt lông','Trẻ hóa'], next:'Bảo trì đến 16:00', hue:280 },
  { id:'R-204', name:'Máy Hydra Facial', type:'machine', capacity:1, branch:'CN Q1',  status:'available',util:65, tags:['Facial','Detox'], next:'15:30 — Chị Thu', hue:280 },
  { id:'R-301', name:'Giường Spa A1',    type:'bed',     capacity:1, branch:'CN Q1',  status:'busy',     util:82, tags:['Massage','Body'], next:'Đang sử dụng', hue:140 },
  { id:'R-302', name:'Giường Spa A2',    type:'bed',     capacity:1, branch:'CN Q1',  status:'available',util:67, tags:['Massage','Body'], next:'14:30 — Chị Hoa', hue:140 },
  { id:'R-303', name:'Giường Spa B1',    type:'bed',     capacity:1, branch:'CN Q3',  status:'busy',     util:75, tags:['Massage'], next:'Đang sử dụng', hue:140 },
  { id:'R-401', name:'Bàn Nail 1',       type:'station', capacity:1, branch:'CN Q3',  status:'available',util:58, tags:['Nail Art'], next:'14:30 — Chị Linh', hue:40 },
  { id:'R-402', name:'Bàn Nail 2',       type:'station', capacity:1, branch:'CN Q3',  status:'busy',     util:73, tags:['Nail Art'], next:'Đang sử dụng', hue:40 },
];

// Time-slot bookings 9:00 → 21:00 mỗi 30 phút (24 slots)
const SLOT_LABELS = Array.from({length:24}, (_,i) => {
  const h = 9 + Math.floor(i/2);
  const m = (i%2)*30;
  return `${String(h).padStart(2,'0')}:${m===0?'00':'30'}`;
});

// Mock booking grid: resourceId → [{slotStart, span, customer, service, status, tech}]
const BOOKINGS = {
  'R-101': [
    { s:1, sp:3, cus:'Chị Hà',     svc:'Massage 90′',         st:'done',    tech:'KTV.Linh' },
    { s:5, sp:4, cus:'Chị Mai',    svc:'Spa cao cấp',         st:'active',  tech:'KTV.Linh' },
    { s:11, sp:3, cus:'Chị Lan',   svc:'Massage đôi 90′',     st:'upcoming',tech:'KTV.Tuyết' },
    { s:16, sp:3, cus:'Chị Hằng',  svc:'Spa cao cấp',         st:'upcoming',tech:'KTV.Linh' },
  ],
  'R-102': [
    { s:0, sp:2, cus:'Chị Vy',     svc:'Facial 60′',          st:'done',    tech:'KTV.Hoa' },
    { s:4, sp:2, cus:'Chị Trâm',   svc:'Facial 60′',          st:'done',    tech:'KTV.Hoa' },
    { s:12, sp:3, cus:'Chị Hà',    svc:'Massage 90′',         st:'upcoming',tech:'KTV.Tuyết' },
    { s:18, sp:2, cus:'Chị Phương',svc:'Facial 60′',          st:'upcoming',tech:'KTV.Hoa' },
  ],
  'R-103': [
    { s:0, sp:4, cus:'Chị Hân',    svc:'Laser Pico 5 buổi',   st:'done',    tech:'BS.Minh' },
    { s:5, sp:3, cus:'Chị Quyên',  svc:'Trị liệu mụn',        st:'active',  tech:'BS.Minh' },
    { s:9, sp:4, cus:'Chị Diệu',   svc:'Laser Pico',          st:'upcoming',tech:'BS.Minh' },
    { s:14, sp:4, cus:'Chị Mỹ',    svc:'Laser Pico',          st:'upcoming',tech:'BS.Minh' },
    { s:19, sp:3, cus:'Chị Ngân',  svc:'Trị liệu',            st:'upcoming',tech:'BS.Minh' },
  ],
  'R-104': [
    { s:0, sp:3, cus:'Chị Bảo',    svc:'Trị liệu da',         st:'done',    tech:'BS.Hùng' },
    { s:4, sp:0, cus:'⚠ Bảo trì 30′',svc:'Vệ sinh phòng',     st:'maint',   tech:'Lễ tân' },
    { s:5, sp:2, cus:'',           svc:'',                     st:'maint',   tech:'',  m:true },
    { s:8, sp:3, cus:'Chị Thu',    svc:'Trị liệu',            st:'upcoming',tech:'BS.Hùng' },
    { s:14, sp:3, cus:'Chị Châu',  svc:'Trị liệu',            st:'upcoming',tech:'BS.Hùng' },
  ],
  'R-201': [
    { s:0, sp:3, cus:'Chị Hân',    svc:'Laser Pico',          st:'done',    tech:'BS.Minh' },
    { s:4, sp:3, cus:'Chị Quyên',  svc:'Laser Pico',          st:'active',  tech:'BS.Minh' },
    { s:9, sp:4, cus:'Chị Diệu',   svc:'Laser Pico',          st:'upcoming',tech:'BS.Minh' },
    { s:14, sp:4, cus:'Chị Mỹ',    svc:'Laser Pico',          st:'upcoming',tech:'BS.Minh' },
  ],
  'R-202': [
    { s:0, sp:4, cus:'Chị Quỳnh',  svc:'HIFU 60 lines',       st:'done',    tech:'BS.Hùng' },
    { s:11, sp:6, cus:'Chị Mai',   svc:'HIFU 120 lines',      st:'upcoming',tech:'BS.Hùng' },
    { s:18, sp:4, cus:'Chị Anh',   svc:'HIFU 60 lines',       st:'upcoming',tech:'BS.Hùng' },
  ],
  'R-203': [
    { s:0, sp:24, cus:'BẢO TRÌ',   svc:'Bảo dưỡng định kỳ',   st:'maint',   tech:'KT.Long', m:true },
  ],
  'R-204': [
    { s:0, sp:2, cus:'Chị Vy',     svc:'Hydra Facial',        st:'done',    tech:'KTV.Hoa' },
    { s:13, sp:2, cus:'Chị Thu',   svc:'Hydra Facial',        st:'upcoming',tech:'KTV.Hoa' },
    { s:18, sp:2, cus:'Chị Phương',svc:'Hydra Facial',        st:'upcoming',tech:'KTV.Hoa' },
  ],
  'R-301': [
    { s:0, sp:3, cus:'Chị Lan',    svc:'Massage 90′',         st:'done',    tech:'KTV.An' },
    { s:5, sp:3, cus:'Chị Hà',     svc:'Massage 90′',         st:'active',  tech:'KTV.An' },
    { s:10, sp:3, cus:'Chị Tâm',   svc:'Massage 90′',         st:'upcoming',tech:'KTV.An' },
    { s:16, sp:2, cus:'Chị Vy',    svc:'Massage 60′',         st:'upcoming',tech:'KTV.An' },
  ],
  'R-302': [
    { s:0, sp:2, cus:'Chị Mỹ',     svc:'Massage 60′',         st:'done',    tech:'KTV.Bích' },
    { s:11, sp:2, cus:'Chị Hoa',   svc:'Massage 60′',         st:'upcoming',tech:'KTV.Bích' },
    { s:17, sp:3, cus:'Chị Thanh', svc:'Massage 90′',         st:'upcoming',tech:'KTV.Bích' },
  ],
  'R-303': [
    { s:0, sp:3, cus:'Chị Loan',   svc:'Massage 90′',         st:'done',    tech:'KTV.Hồng' },
    { s:5, sp:3, cus:'Chị Yến',    svc:'Massage 90′',         st:'active',  tech:'KTV.Hồng' },
    { s:14, sp:2, cus:'Chị Như',   svc:'Massage 60′',         st:'upcoming',tech:'KTV.Hồng' },
  ],
  'R-401': [
    { s:11, sp:3, cus:'Chị Linh',  svc:'Nail Art Premium',    st:'upcoming',tech:'KTV.Vân' },
    { s:17, sp:3, cus:'Chị Diệp',  svc:'Nail Art',            st:'upcoming',tech:'KTV.Vân' },
  ],
  'R-402': [
    { s:0, sp:3, cus:'Chị Trang',  svc:'Nail Art',            st:'done',    tech:'KTV.Bích' },
    { s:5, sp:3, cus:'Chị Quỳnh',  svc:'Nail Art',            st:'active',  tech:'KTV.Bích' },
    { s:13, sp:2, cus:'Chị Hân',   svc:'Nail Cơ bản',         st:'upcoming',tech:'KTV.Bích' },
  ],
};

// Conflict log — bookings detected as overlap and resolved
const CONFLICTS = [
  { id:'CF-1', when:'14:25', resource:'R-103 · Phòng Treatment 1', a:'Chị Quyên (đang dùng)', b:'Chị Diệu (book trùng)', reason:'Booking 14:30 nhưng ca trước kéo dài', action:'Đổi sang R-104', sev:'high', resolver:'AI Cowork', resolved:true },
  { id:'CF-2', when:'13:50', resource:'R-202 · HIFU Ultraformer', a:'Chị Mai (book 14:30)', b:'Bảo trì (lên lịch 14:00)', reason:'Lịch bảo trì che booking', action:'Dời bảo trì 16:30', sev:'med', resolver:'KT.Long', resolved:true },
  { id:'CF-3', when:'13:20', resource:'R-101 · VIP 1', a:'KTV.Linh (busy)', b:'Chị Hà (book 14:00)', reason:'KTV trùng ca với phòng khác', action:'Đổi KTV.Tuyết', sev:'low', resolver:'AI Cowork', resolved:true },
  { id:'CF-4', when:'09:15', resource:'R-203 · IPL Quantum', a:'Chị Quyên (book 10:00)', b:'Bảo trì (cả ngày)', reason:'Máy bảo trì đột xuất — lỗi cảm biến', action:'Đổi sang R-201 Pico', sev:'high', resolver:'BS.Minh', resolved:true },
  { id:'CF-5', when:'08:45', resource:'R-104 · Treatment 2', a:'Chị Bảo (đến sớm)', b:'Phòng đang vệ sinh', reason:'Khách đến sớm 30′', action:'Mời ngồi chờ + tea/coffee', sev:'low', resolver:'Lễ tân', resolved:true },
];

const MAINTENANCE = [
  { id:'M-1', resource:'R-104 · Phòng Treatment 2', kind:'Vệ sinh sâu',   from:'14:30', to:'15:30', tech:'Lễ tân', status:'doing', repeat:'2 ca/ngày' },
  { id:'M-2', resource:'R-203 · IPL Quantum',       kind:'Bảo dưỡng',     from:'09:00', to:'16:00', tech:'KT.Long', status:'doing', repeat:'Hằng tháng' },
  { id:'M-3', resource:'R-201 · Laser Pico',        kind:'Hiệu chuẩn đầu', from:'21:30',to:'22:00', tech:'KT.Long', status:'sched',repeat:'Mỗi 50 ca' },
  { id:'M-4', resource:'R-204 · Hydra Facial',      kind:'Vệ sinh đầu hút',from:'mai 08:30',to:'mai 09:00', tech:'KTV.Hoa', status:'sched',repeat:'Hằng ngày' },
];

/* =============================================================
   STYLES
============================================================== */
const rrStyles = {
  topbar: { display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--fill-04)', background:'#fff', flexShrink:0 },
  tabs: { display:'flex', gap:2, padding:'8px 20px', borderBottom:'1px solid var(--fill-04)', background:'#fff' },
  tab: (active) => ({ padding:'8px 14px', borderRadius:7, fontSize:13, fontWeight:600, color:active?'var(--label-01)':'var(--label-02)', background:active?'var(--fill-04)':'transparent', border:'none', cursor:'pointer' }),
  page: { flex:1, overflow:'auto', padding:20, background:'var(--fill-05)' },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:14, marginBottom:18 },
  kpi: { background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:14 },
  card: { background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:16 },
};

/* =============================================================
   STATUS PILL
============================================================== */
function StatusPill({ st }) {
  const map = {
    available:  { l:'Sẵn sàng',    bg:'#dcfce7', fg:'#166534' },
    busy:       { l:'Đang dùng',   bg:'#fef3c7', fg:'#92400e' },
    cleaning:   { l:'Vệ sinh',     bg:'#dbeafe', fg:'#1e40af' },
    maintenance:{ l:'Bảo trì',     bg:'#fee2e2', fg:'#991b1b' },
    offline:    { l:'Ngưng',       bg:'#e5e7eb', fg:'#374151' },
  };
  const s = map[st] || map.available;
  return <span style={{ padding:'2px 8px', borderRadius:999, background:s.bg, color:s.fg, fontSize:11, fontWeight:600 }}>{s.l}</span>;
}

/* =============================================================
   TAB 1: Tổng quan
============================================================== */
function RROverview() {
  const total = RESOURCES.length;
  const busy = RESOURCES.filter(r=>r.status==='busy').length;
  const avail = RESOURCES.filter(r=>r.status==='available').length;
  const maint = RESOURCES.filter(r=>r.status==='maintenance' || r.status==='cleaning').length;
  const avgUtil = Math.round(RESOURCES.reduce((s,r)=>s+r.util,0)/total);

  const kpis = [
    { l:'Tổng tài nguyên',   v: total,           sub:'4 nhánh loại',     hue:200 },
    { l:'Đang sử dụng',       v: busy,            sub:`${Math.round(busy/total*100)}% công suất`, hue:35 },
    { l:'Sẵn sàng',           v: avail,           sub:'Đặt được ngay',    hue:140 },
    { l:'Bảo trì / Vệ sinh',  v: maint,           sub:'Tạm khoá book',    hue:0 },
    { l:'Util TB hôm nay',    v: avgUtil + '%',   sub:'Đạt KPI 70%',      hue:280 },
  ];

  // breakdown by type
  const byType = RR_TYPES.map(t => {
    const list = RESOURCES.filter(r=>r.type===t.k);
    const busyCount = list.filter(r=>r.status==='busy').length;
    return { ...t, total:list.length, busy:busyCount, util: Math.round(list.reduce((s,r)=>s+r.util,0)/(list.length||1)) };
  });

  return (
    <div style={rrStyles.page}>
      <div style={rrStyles.kpiGrid}>
        {kpis.map((k,i) => (
          <div key={i} style={rrStyles.kpi}>
            <div style={{ fontSize:12, color:'var(--label-02)' }}>{k.l}</div>
            <div style={{ fontSize:28, fontWeight:700, color:`oklch(0.55 0.18 ${k.hue})`, marginTop:4 }}>{k.v}</div>
            <div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:14 }}>
        <div style={rrStyles.card}>
          <div style={{ fontWeight:700, marginBottom:14 }}>Theo loại tài nguyên</div>
          <div style={{ display:'grid', gap:12 }}>
            {byType.map(t => (
              <div key={t.k} style={{ display:'grid', gridTemplateColumns:'140px 1fr 80px', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:t.color }}/>
                  <div style={{ fontSize:13, fontWeight:600 }}>{t.l}</div>
                </div>
                <div>
                  <div style={{ height:10, background:'var(--fill-04)', borderRadius:5, overflow:'hidden' }}>
                    <div style={{ width:t.util+'%', height:'100%', background:t.color, borderRadius:5 }}/>
                  </div>
                  <div style={{ fontSize:11, color:'var(--label-03)', marginTop:4 }}>{t.busy}/{t.total} đang dùng · Util {t.util}%</div>
                </div>
                <div style={{ fontSize:12, color:'var(--label-02)', textAlign:'right' }}>{t.total} tài nguyên</div>
              </div>
            ))}
          </div>
        </div>

        <div style={rrStyles.card}>
          <div style={{ fontWeight:700, marginBottom:12 }}>Top tài nguyên hot</div>
          <div style={{ display:'grid', gap:8 }}>
            {RESOURCES.slice().sort((a,b)=>b.util-a.util).slice(0,5).map((r,i) => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--fill-05)', borderRadius:7 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:`oklch(0.55 0.18 ${r.hue}/0.15)`, color:`oklch(0.45 0.18 ${r.hue})`, display:'grid', placeItems:'center', fontSize:11, fontWeight:700 }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize:11, color:'var(--label-03)' }}>{r.branch}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:`oklch(0.55 0.18 ${r.hue})` }}>{r.util}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={rrStyles.card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontWeight:700 }}>Conflict gần đây · 24h</div>
          <span style={{ fontSize:11, color:'var(--label-03)' }}>{CONFLICTS.length} xung đột — đã giải quyết {CONFLICTS.filter(c=>c.resolved).length}</span>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {CONFLICTS.slice(0,3).map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:10, border:'1px solid var(--fill-04)', borderRadius:8 }}>
              <div style={{ width:6, height:36, borderRadius:3, background: c.sev==='high'?'#ef4444':c.sev==='med'?'#f59e0b':'#94a3b8' }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{c.resource}</div>
                <div style={{ fontSize:11, color:'var(--label-03)', marginTop:2 }}>{c.a} ⇄ {c.b} · {c.reason}</div>
              </div>
              <div style={{ fontSize:11, color:'var(--label-02)', textAlign:'right' }}>
                <div>{c.action}</div>
                <div style={{ color:'var(--label-03)' }}>{c.when} · {c.resolver}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   TAB 2: Phòng & thiết bị (list)
============================================================== */
function RRList({ onPick }) {
  const [q, setQ] = useRR('');
  const [type, setType] = useRR('all');
  const [branch, setBranch] = useRR('all');

  const filtered = RESOURCES.filter(r => {
    if (q && !(r.name.toLowerCase().includes(q.toLowerCase()) || r.id.toLowerCase().includes(q.toLowerCase()))) return false;
    if (type !== 'all' && r.type !== type) return false;
    if (branch !== 'all' && r.branch !== branch) return false;
    return true;
  });

  const branches = Array.from(new Set(RESOURCES.map(r=>r.branch)));

  return (
    <div style={rrStyles.page}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm phòng / thiết bị / mã…"
          style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:13 }}/>
        <select value={type} onChange={e=>setType(e.target.value)} style={{ padding:'9px 10px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:13 }}>
          <option value="all">Tất cả loại</option>
          {RR_TYPES.map(t=> <option key={t.k} value={t.k}>{t.l}</option>)}
        </select>
        <select value={branch} onChange={e=>setBranch(e.target.value)} style={{ padding:'9px 10px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:13 }}>
          <option value="all">Tất cả chi nhánh</option>
          {branches.map(b => <option key={b}>{b}</option>)}
        </select>
        <button className="btn btn-primary"><Icon.Plus/> Thêm tài nguyên</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:12 }}>
        {filtered.map(r => {
          const t = RR_TYPES.find(x=>x.k===r.type);
          return (
            <div key={r.id} onClick={()=>onPick(r)}
              style={{ ...rrStyles.card, cursor:'pointer', padding:14, borderTop:`3px solid ${t.color}` }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--label-03)', marginBottom:2 }}>{r.id} · {t.l}</div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{r.name}</div>
                </div>
                <StatusPill st={r.status}/>
              </div>
              <div style={{ fontSize:11, color:'var(--label-02)', marginTop:8 }}>📍 {r.branch} · Sức chứa {r.capacity}</div>

              <div style={{ marginTop:10 }}>
                <div style={{ height:6, background:'var(--fill-04)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:r.util+'%', height:'100%', background:t.color, borderRadius:3 }}/>
                </div>
                <div style={{ fontSize:11, color:'var(--label-03)', marginTop:4 }}>Util {r.util}% hôm nay</div>
              </div>

              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:10 }}>
                {r.tags.map(tg => <span key={tg} style={{ padding:'2px 7px', borderRadius:5, background:'var(--fill-05)', color:'var(--label-02)', fontSize:11 }}>{tg}</span>)}
              </div>

              <div style={{ marginTop:10, padding:'8px 10px', background:'var(--fill-05)', borderRadius:6, fontSize:11, color:'var(--label-02)' }}>
                ⏱ {r.next}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================================
   TAB 3: Lịch sử dụng — calendar grid
============================================================== */
function RRCalendar({ onPick }) {
  const [date] = useRR('Hôm nay · Thứ 4, 21/04/2026');
  const [type, setType] = useRR('all');
  const filtered = type==='all' ? RESOURCES : RESOURCES.filter(r=>r.type===type);
  const NOW_SLOT = 5; // current hour marker (~11:30)

  const colorFor = (st) => {
    if (st==='active')   return { bg:'#fef3c7', bd:'#f59e0b', fg:'#92400e' };
    if (st==='done')     return { bg:'#e5e7eb', bd:'#9ca3af', fg:'#374151' };
    if (st==='upcoming') return { bg:'#dbeafe', bd:'#3b82f6', fg:'#1e40af' };
    if (st==='maint')    return { bg:'#fee2e2', bd:'#ef4444', fg:'#991b1b' };
    return { bg:'#fff', bd:'#cbd5e1', fg:'#334155' };
  };

  return (
    <div style={{ ...rrStyles.page, padding:0, background:'#fff' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--fill-04)' }}>
        <button className="btn btn-ghost btn-sm"><Icon.ChevronLeft/></button>
        <div style={{ fontWeight:700, fontSize:14 }}>{date}</div>
        <button className="btn btn-ghost btn-sm"><Icon.ChevronRight/></button>
        <span style={{ flex:1 }}/>
        <select value={type} onChange={e=>setType(e.target.value)} style={{ padding:'7px 10px', borderRadius:7, border:'1px solid var(--fill-04)', fontSize:12 }}>
          <option value="all">Tất cả loại</option>
          {RR_TYPES.map(t=> <option key={t.k} value={t.k}>{t.l}</option>)}
        </select>
        <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--label-02)', alignItems:'center' }}>
          <span><span style={{ display:'inline-block', width:10, height:10, background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Đang dùng</span>
          <span><span style={{ display:'inline-block', width:10, height:10, background:'#dbeafe', border:'1px solid #3b82f6', borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Sắp tới</span>
          <span><span style={{ display:'inline-block', width:10, height:10, background:'#e5e7eb', border:'1px solid #9ca3af', borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Đã xong</span>
          <span><span style={{ display:'inline-block', width:10, height:10, background:'#fee2e2', border:'1px solid #ef4444', borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Bảo trì</span>
        </div>
      </div>

      <div style={{ overflow:'auto', maxHeight:'calc(100vh - 200px)' }}>
        <div style={{ display:'grid', gridTemplateColumns:`200px repeat(${SLOT_LABELS.length}, minmax(46px, 1fr))`, position:'relative' }}>
          {/* corner */}
          <div style={{ position:'sticky', top:0, left:0, zIndex:3, background:'var(--fill-05)', borderBottom:'1px solid var(--fill-04)', borderRight:'1px solid var(--fill-04)', padding:'10px 14px', fontSize:12, fontWeight:700 }}>Tài nguyên</div>
          {/* slot headers */}
          {SLOT_LABELS.map((s,i) => (
            <div key={i} style={{ position:'sticky', top:0, zIndex:2, background:'var(--fill-05)', borderBottom:'1px solid var(--fill-04)', textAlign:'center', padding:'10px 0', fontSize:10, color:'var(--label-02)', fontWeight: i%2===0?600:400 }}>
              {i%2===0 ? s : ''}
            </div>
          ))}

          {/* rows */}
          {filtered.map((r, ri) => {
            const t = RR_TYPES.find(x=>x.k===r.type);
            const bks = BOOKINGS[r.id] || [];
            return (
              <React.Fragment key={r.id}>
                <div onClick={()=>onPick(r)} style={{ position:'sticky', left:0, zIndex:1, background:'#fff', borderBottom:'1px solid var(--fill-04)', borderRight:'1px solid var(--fill-04)', padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:6, height:32, background:t.color, borderRadius:3 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{r.name}</div>
                    <div style={{ fontSize:10, color:'var(--label-03)' }}>{r.id} · {r.branch}</div>
                  </div>
                </div>

                {SLOT_LABELS.map((_, si) => (
                  <div key={si} style={{ borderBottom:'1px solid var(--fill-04)', borderRight: si%2===1 ? '1px solid var(--fill-04)' : '1px dashed var(--fill-04)', height:50, position:'relative', background: si===NOW_SLOT?'oklch(0.97 0.02 35 / 0.5)':'transparent' }}>
                    {si===NOW_SLOT && ri===0 && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'#ef4444', zIndex:2 }}/>}
                    {si===NOW_SLOT && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'#ef4444' }}/>}
                  </div>
                ))}

                {/* Bookings overlay — absolute */}
                {bks.map((b, bi) => {
                  const c = colorFor(b.st);
                  const left = `calc(200px + ${b.s} * ((100% - 200px) / ${SLOT_LABELS.length}))`;
                  const width = `calc(${b.sp} * ((100% - 200px) / ${SLOT_LABELS.length}) - 4px)`;
                  return (
                    <div key={bi} title={`${b.cus} · ${b.svc}`}
                      style={{ position:'absolute', left, width, top: `${42 + ri*51}px`, height:42, padding:'4px 8px',
                        background:c.bg, border:`1px solid ${c.bd}`, borderLeft:`3px solid ${c.bd}`, borderRadius:4,
                        fontSize:10, color:c.fg, overflow:'hidden', cursor:'pointer', zIndex:1 }}>
                      <div style={{ fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.cus || b.svc}</div>
                      <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.svc} · {b.tech}</div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   TAB 4: Conflicts & Maintenance
============================================================== */
function RRConflicts() {
  return (
    <div style={rrStyles.page}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={rrStyles.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontWeight:700 }}>Conflict log · 24h</div>
            <span style={{ padding:'2px 8px', background:'#dcfce7', color:'#166534', borderRadius:999, fontSize:11, fontWeight:600 }}>{CONFLICTS.length} đã giải quyết</span>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {CONFLICTS.map(c => (
              <div key={c.id} style={{ padding:12, border:'1px solid var(--fill-04)', borderRadius:8, borderLeft:`3px solid ${c.sev==='high'?'#ef4444':c.sev==='med'?'#f59e0b':'#94a3b8'}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{c.resource}</div>
                  <span style={{ fontSize:11, color:'var(--label-03)' }}>{c.when}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:4 }}>
                  <b>Xung đột:</b> {c.a} ⇄ {c.b}
                </div>
                <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:6 }}>
                  <b>Lý do:</b> {c.reason}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:'var(--fill-05)', borderRadius:6 }}>
                  <span style={{ fontSize:12, color:'var(--label-01)' }}>✓ {c.action}</span>
                  <span style={{ fontSize:11, color:'var(--label-03)' }}>by {c.resolver}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={rrStyles.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontWeight:700 }}>Lịch bảo trì & vệ sinh</div>
            <button className="btn btn-ghost btn-sm"><Icon.Plus/> Lên lịch</button>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {MAINTENANCE.map(m => (
              <div key={m.id} style={{ padding:12, border:'1px solid var(--fill-04)', borderRadius:8, display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{m.resource}</div>
                  <div style={{ fontSize:12, color:'var(--label-02)', marginTop:2 }}>{m.kind} · {m.tech}</div>
                  <div style={{ fontSize:11, color:'var(--label-03)', marginTop:4 }}>🔁 {m.repeat}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:600, color: m.status==='doing'?'#92400e':'#1e40af' }}>{m.from} → {m.to}</div>
                  <span style={{ display:'inline-block', marginTop:4, padding:'2px 8px', background: m.status==='doing'?'#fef3c7':'#dbeafe', color: m.status==='doing'?'#92400e':'#1e40af', borderRadius:999, fontSize:11, fontWeight:600 }}>
                    {m.status==='doing' ? 'Đang làm' : 'Lên lịch'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:14, padding:12, background:'oklch(0.97 0.04 280 / 0.5)', border:'1px solid oklch(0.85 0.10 280)', borderRadius:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'oklch(0.30 0.18 280)', marginBottom:4 }}>💡 Claude Cowork đề xuất</div>
            <div style={{ fontSize:12, color:'var(--label-01)', lineHeight:1.5 }}>
              R-201 (Pico) chạy 4 ca liên tiếp 14:00–18:00. Đề xuất chèn slot hiệu chuẩn 30′ giữa ca 2 và 3 để tránh giảm hiệu suất laser.
            </div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <button className="btn btn-primary btn-sm">Áp dụng</button>
              <button className="btn btn-ghost btn-sm">Bỏ qua</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   DRAWER — chi tiết tài nguyên
============================================================== */
function RRDrawer({ resource, onClose }) {
  if (!resource) return null;
  const t = RR_TYPES.find(x=>x.k===resource.type);
  const bks = BOOKINGS[resource.id] || [];
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:50 }}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:520, background:'#fff', zIndex:51, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:8, background:`${t.color}22`, color:t.color, display:'grid', placeItems:'center', fontWeight:700, fontSize:13 }}>{t.l[0]}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'var(--label-03)' }}>{resource.id} · {t.l}</div>
            <div style={{ fontWeight:700, fontSize:16 }}>{resource.name}</div>
          </div>
          <button onClick={onClose} className="btn-icon"><Icon.Close/></button>
        </div>

        <div className="scroll" style={{ flex:1, padding:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
            <div style={{ padding:10, background:'var(--fill-05)', borderRadius:7 }}>
              <div style={{ fontSize:10, color:'var(--label-03)' }}>Trạng thái</div>
              <div style={{ marginTop:4 }}><StatusPill st={resource.status}/></div>
            </div>
            <div style={{ padding:10, background:'var(--fill-05)', borderRadius:7 }}>
              <div style={{ fontSize:10, color:'var(--label-03)' }}>Util hôm nay</div>
              <div style={{ fontSize:16, fontWeight:700, marginTop:2 }}>{resource.util}%</div>
            </div>
            <div style={{ padding:10, background:'var(--fill-05)', borderRadius:7 }}>
              <div style={{ fontSize:10, color:'var(--label-03)' }}>Chi nhánh</div>
              <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{resource.branch}</div>
            </div>
            <div style={{ padding:10, background:'var(--fill-05)', borderRadius:7 }}>
              <div style={{ fontSize:10, color:'var(--label-03)' }}>Sức chứa</div>
              <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{resource.capacity} khách</div>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Dùng cho dịch vụ</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {resource.tags.map(tg => <span key={tg} style={{ padding:'4px 9px', background:'var(--fill-05)', borderRadius:6, fontSize:12 }}>{tg}</span>)}
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Lịch hôm nay</div>
            <div style={{ display:'grid', gap:6 }}>
              {bks.length === 0 && <div style={{ padding:12, textAlign:'center', color:'var(--label-03)', fontSize:12, background:'var(--fill-05)', borderRadius:7 }}>Chưa có booking</div>}
              {bks.map((b, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'70px 1fr auto', gap:10, padding:10, border:'1px solid var(--fill-04)', borderRadius:7, alignItems:'center' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--label-02)' }}>{SLOT_LABELS[b.s]}<br/>→ {SLOT_LABELS[b.s + b.sp - 1] || '21:00'}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{b.cus || b.svc}</div>
                    <div style={{ fontSize:11, color:'var(--label-03)' }}>{b.svc}{b.tech ? ` · ${b.tech}`:''}</div>
                  </div>
                  <span style={{ padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:600,
                    background: b.st==='active'?'#fef3c7':b.st==='done'?'#e5e7eb':b.st==='maint'?'#fee2e2':'#dbeafe',
                    color:    b.st==='active'?'#92400e':b.st==='done'?'#374151':b.st==='maint'?'#991b1b':'#1e40af' }}>
                    {b.st==='active'?'Đang dùng':b.st==='done'?'Xong':b.st==='maint'?'Bảo trì':'Sắp tới'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:12, background:'oklch(0.97 0.04 200 / 0.5)', border:'1px solid oklch(0.85 0.10 200)', borderRadius:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'oklch(0.30 0.18 200)', marginBottom:6 }}>📊 Hiệu suất 7 ngày</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, alignItems:'flex-end', height:60 }}>
              {[68, 75, 82, 71, 88, 79, resource.util].map((u, i) => (
                <div key={i} style={{ background:`oklch(0.55 0.18 ${resource.hue})`, height:`${u}%`, borderRadius:'3px 3px 0 0', position:'relative' }}>
                  {i===6 && <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', fontSize:9, fontWeight:700, color:`oklch(0.40 0.18 ${resource.hue})` }}>{u}%</div>}
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginTop:4 }}>
              {['T2','T3','T4','T5','T6','T7','CN'].map((d,i) => (
                <div key={i} style={{ fontSize:9, color:'var(--label-03)', textAlign:'center', fontWeight: i===6?700:400 }}>{d}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding:14, borderTop:'1px solid var(--fill-04)', display:'flex', gap:8 }}>
          <button className="btn btn-ghost"><Icon.Calendar/> Lên lịch bảo trì</button>
          <span style={{ flex:1 }}/>
          <button className="btn btn-primary"><Icon.Edit/> Chỉnh sửa</button>
        </div>
      </div>
    </>
  );
}

/* =============================================================
   MODULE
============================================================== */
function ResourcesRoomsModule() {
  const [tab, setTab] = useRR('overview');
  const [picked, setPicked] = useRR(null);

  const TABS = [
    { k:'overview', l:'Tổng quan' },
    { k:'list',     l:'Phòng & Thiết bị' },
    { k:'calendar', l:'Lịch sử dụng' },
    { k:'conflict', l:'Conflict & Bảo trì' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={rrStyles.topbar}>
        <Icon.Layers width="20" height="20"/>
        <span style={{ fontWeight:700, fontSize:15 }}>Resources & Rooms</span>
        <span style={{ padding:'2px 8px', background:'var(--fill-05)', borderRadius:999, fontSize:11, color:'var(--label-02)' }}>{RESOURCES.length} tài nguyên · 2 chi nhánh</span>
        <span style={{ flex:1 }}/>
        <button className="btn btn-ghost btn-sm"><Icon.Refresh/> Sync booking</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Thêm tài nguyên</button>
      </div>

      <div style={rrStyles.tabs}>
        {TABS.map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={rrStyles.tab(tab===t.k)}>{t.l}</button>
        ))}
      </div>

      {tab==='overview' && <RROverview/>}
      {tab==='list'     && <RRList     onPick={setPicked}/>}
      {tab==='calendar' && <RRCalendar onPick={setPicked}/>}
      {tab==='conflict' && <RRConflicts/>}

      {picked && <RRDrawer resource={picked} onClose={()=>setPicked(null)}/>}
    </div>
  );
}

window.ResourcesRoomsModule = ResourcesRoomsModule;
