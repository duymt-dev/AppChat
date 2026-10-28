/* Staff Shifts — phân ca KTV, time-off, payroll */
const { useState: useSS } = React;

const STAFF = [
  { id:'S-01', name:'KTV.Linh',   role:'KTV Senior',  branch:'CN Q1', skills:['Massage','Spa cao cấp','Facial'], rate:120000, comm:15, hue:200, avail:0.92 },
  { id:'S-02', name:'KTV.Tuyết',  role:'KTV Senior',  branch:'CN Q1', skills:['Massage','Body','Spa đôi'], rate:120000, comm:15, hue:280, avail:0.88 },
  { id:'S-03', name:'KTV.Hoa',    role:'KTV Facial',  branch:'CN Q1', skills:['Facial','Hydra','Detox'], rate:110000, comm:12, hue:140, avail:0.95 },
  { id:'S-04', name:'KTV.An',     role:'KTV Massage', branch:'CN Q1', skills:['Massage','Body'], rate:100000, comm:10, hue:35,  avail:0.85 },
  { id:'S-05', name:'KTV.Bích',   role:'KTV Nail',    branch:'CN Q3', skills:['Nail Art','Massage'], rate:95000,  comm:12, hue:320, avail:0.90 },
  { id:'S-06', name:'KTV.Hồng',   role:'KTV Massage', branch:'CN Q3', skills:['Massage','Body'], rate:100000, comm:10, hue:160, avail:0.78, off:true },
  { id:'S-07', name:'KTV.Vân',    role:'KTV Nail',    branch:'CN Q3', skills:['Nail Art Premium'], rate:105000, comm:12, hue:0,   avail:0.93 },
  { id:'S-08', name:'BS.Minh',    role:'Bác sĩ',      branch:'CN Q1', skills:['Laser','Trị liệu','Tư vấn'], rate:250000, comm:20, hue:240, avail:0.96 },
  { id:'S-09', name:'BS.Hùng',    role:'Bác sĩ',      branch:'CN Q1', skills:['HIFU','Trị liệu','Tư vấn'], rate:250000, comm:20, hue:60,  avail:0.94 },
  { id:'S-10', name:'Lễ tân Mai', role:'Lễ tân',      branch:'CN Q1', skills:['CSKH','Booking','Thanh toán'], rate:60000,  comm:5,  hue:100, avail:1 },
];

// Schedule: 7 ngày × 10 nhân viên × ca (M=sáng 8-14, A=chiều 14-21, F=full 8-21, O=off, L=leave)
const SHIFT_TYPES = {
  M: { l:'Sáng', from:'08:00', to:'14:00', bg:'#fef3c7', fg:'#92400e' },
  A: { l:'Chiều',from:'14:00', to:'21:00', bg:'#dbeafe', fg:'#1e40af' },
  F: { l:'Full', from:'08:00', to:'21:00', bg:'#dcfce7', fg:'#166534' },
  O: { l:'Off',  from:'',      to:'',      bg:'#f1f5f9', fg:'#64748b' },
  L: { l:'Nghỉ', from:'',      to:'',      bg:'#fee2e2', fg:'#991b1b' },
};
const DAYS = ['T2 21/04','T3 22/04','T4 23/04','T5 24/04','T6 25/04','T7 26/04','CN 27/04'];

const SCHEDULE = {
  'S-01': ['M','A','F','M','A','F','O'],
  'S-02': ['A','M','A','F','M','A','M'],
  'S-03': ['M','M','A','M','A','F','O'],
  'S-04': ['F','O','M','A','F','M','A'],
  'S-05': ['A','F','M','O','M','A','F'],
  'S-06': ['L','L','L','M','A','F','O'],
  'S-07': ['M','A','F','M','A','F','M'],
  'S-08': ['F','F','M','A','F','M','O'],
  'S-09': ['A','M','A','F','M','A','F'],
  'S-10': ['F','F','F','F','F','F','O'],
};

const TIMEOFF = [
  { id:'T-1', staff:'KTV.Hồng',  type:'Nghỉ ốm',     from:'21/04', to:'23/04', days:3, status:'approved', reason:'Cảm sốt — có giấy bệnh viện' },
  { id:'T-2', staff:'KTV.Hoa',   type:'Phép năm',    from:'02/05', to:'05/05', days:4, status:'pending',  reason:'Về quê đám cưới em' },
  { id:'T-3', staff:'BS.Hùng',   type:'Hội thảo',    from:'28/04', to:'28/04', days:1, status:'approved', reason:'Hội thảo HIFU 2026' },
  { id:'T-4', staff:'KTV.An',    type:'Phép năm',    from:'15/05', to:'17/05', days:3, status:'pending',  reason:'Du lịch gia đình' },
  { id:'T-5', staff:'KTV.Bích',  type:'Việc riêng',  from:'30/04', to:'30/04', days:1, status:'rejected', reason:'Đụng peak day 30/04 — đề xuất đổi 02/05' },
];

const PAYROLL_PERIOD = 'Kỳ 01/04 — 30/04/2026';
const PAYROLL = STAFF.map(s => {
  const hours = 22 * 10 + Math.floor(Math.random()*20); // ~220h
  const ca = Math.floor(hours/8);
  const baseRate = s.rate * hours;
  const dichvu = Math.floor(800000 + Math.random()*1500000) * (s.comm/10);
  const tip = Math.floor(200000 + Math.random()*600000);
  const phat = s.id==='S-04' ? 150000 : s.id==='S-06' ? 300000 : 0;
  const total = baseRate + dichvu + tip - phat;
  return { ...s, hours, ca, baseRate, dichvu:Math.round(dichvu), tip, phat, total: Math.round(total) };
});

const ssStyles = {
  topbar: { display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--fill-04)', background:'#fff', flexShrink:0 },
  tabs: { display:'flex', gap:2, padding:'8px 20px', borderBottom:'1px solid var(--fill-04)', background:'#fff' },
  tab: (active) => ({ padding:'8px 14px', borderRadius:7, fontSize:13, fontWeight:600, color:active?'var(--label-01)':'var(--label-02)', background:active?'var(--fill-04)':'transparent', border:'none', cursor:'pointer' }),
  page: { flex:1, overflow:'auto', padding:20, background:'var(--fill-05)' },
  card: { background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:16 },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:14, marginBottom:18 },
  kpi: { background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:14 },
};

function fmt(n){ return n.toLocaleString('vi-VN'); }

/* TAB: Schedule grid */
function ShiftSchedule() {
  const [branch, setBranch] = useSS('all');
  const list = branch==='all' ? STAFF : STAFF.filter(s=>s.branch===branch);
  const branches = Array.from(new Set(STAFF.map(s=>s.branch)));

  return (
    <div style={{ ...ssStyles.page, padding:0, background:'#fff' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--fill-04)' }}>
        <button className="btn btn-ghost btn-sm"><Icon.ChevronLeft/></button>
        <div style={{ fontWeight:700, fontSize:14 }}>Tuần 21/04 — 27/04/2026</div>
        <button className="btn btn-ghost btn-sm"><Icon.ChevronRight/></button>
        <span style={{ flex:1 }}/>
        <select value={branch} onChange={e=>setBranch(e.target.value)} style={{ padding:'7px 10px', borderRadius:7, border:'1px solid var(--fill-04)', fontSize:12 }}>
          <option value="all">Tất cả chi nhánh</option>
          {branches.map(b=> <option key={b}>{b}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> AI tự xếp ca</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Thêm ca</button>
      </div>

      <div style={{ overflow:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:`220px repeat(7, 1fr)`, minWidth:900 }}>
          <div style={{ padding:'10px 14px', background:'var(--fill-05)', borderBottom:'1px solid var(--fill-04)', borderRight:'1px solid var(--fill-04)', fontSize:12, fontWeight:700, position:'sticky', left:0, zIndex:2 }}>Nhân viên</div>
          {DAYS.map(d => <div key={d} style={{ padding:'10px 12px', background:'var(--fill-05)', borderBottom:'1px solid var(--fill-04)', textAlign:'center', fontSize:12, fontWeight:600 }}>{d}</div>)}

          {list.map(s => (
            <React.Fragment key={s.id}>
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--fill-04)', borderRight:'1px solid var(--fill-04)', position:'sticky', left:0, zIndex:1, background:'#fff', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:`oklch(0.55 0.18 ${s.hue}/0.15)`, color:`oklch(0.40 0.18 ${s.hue})`, display:'grid', placeItems:'center', fontWeight:700, fontSize:11 }}>{s.name.split('.')[1]?.[0] || s.name[0]}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--label-03)' }}>{s.role} · {s.branch}</div>
                </div>
              </div>
              {SCHEDULE[s.id].map((shift, i) => {
                const t = SHIFT_TYPES[shift];
                return (
                  <div key={i} style={{ padding:6, borderBottom:'1px solid var(--fill-04)', borderRight: i<6?'1px solid var(--fill-04)':'none' }}>
                    <div style={{ background:t.bg, color:t.fg, borderRadius:6, padding:'8px 10px', fontSize:11, fontWeight:600, textAlign:'center', cursor:'pointer' }}>
                      <div style={{ fontWeight:700 }}>{t.l}</div>
                      {t.from && <div style={{ fontSize:10, opacity:.85, marginTop:2 }}>{t.from}–{t.to}</div>}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--fill-04)', display:'flex', gap:14, alignItems:'center', fontSize:12, color:'var(--label-02)' }}>
        <span>Chú thích:</span>
        {Object.entries(SHIFT_TYPES).map(([k,t]) => (
          <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <span style={{ width:12, height:12, borderRadius:3, background:t.bg, border:`1px solid ${t.fg}33` }}/>
            <span>{t.l}{t.from?` (${t.from}–${t.to})`:''}</span>
          </span>
        ))}
        <span style={{ flex:1 }}/>
        <span>Tổng giờ tuần: <b>2.146h</b> · Phủ peak hour: <b style={{ color:'#166534' }}>96%</b></span>
      </div>
    </div>
  );
}

/* TAB: Time-off */
function TimeOff() {
  const counts = { pending:TIMEOFF.filter(t=>t.status==='pending').length, approved:TIMEOFF.filter(t=>t.status==='approved').length, rejected:TIMEOFF.filter(t=>t.status==='rejected').length };
  return (
    <div style={ssStyles.page}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:18 }}>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Đang chờ duyệt</div><div style={{ fontSize:28, fontWeight:700, color:'#f59e0b', marginTop:4 }}>{counts.pending}</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>SLA 24h</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Đã duyệt 30 ngày</div><div style={{ fontSize:28, fontWeight:700, color:'#16a34a', marginTop:4 }}>{counts.approved}</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>Tổng 8 ngày</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Phép còn lại TB</div><div style={{ fontSize:28, fontWeight:700, color:'#0ea5e9', marginTop:4 }}>9.2</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>ngày / nhân viên</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Vắng đột xuất</div><div style={{ fontSize:28, fontWeight:700, color:'#ef4444', marginTop:4 }}>2</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>tuần này</div></div>
      </div>

      <div style={ssStyles.card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontWeight:700 }}>Yêu cầu nghỉ phép</div>
          <button className="btn btn-primary btn-sm"><Icon.Plus/> Yêu cầu mới</button>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {TIMEOFF.map(t => {
            const c = t.status==='approved' ? { bg:'#dcfce7', fg:'#166534', l:'Đã duyệt' } :
                       t.status==='pending'  ? { bg:'#fef3c7', fg:'#92400e', l:'Chờ duyệt' } :
                                                { bg:'#fee2e2', fg:'#991b1b', l:'Từ chối' };
            return (
              <div key={t.id} style={{ padding:12, border:'1px solid var(--fill-04)', borderRadius:8, display:'grid', gridTemplateColumns:'1fr auto auto', gap:14, alignItems:'center' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{t.staff}</div>
                    <span style={{ padding:'2px 7px', background:'var(--fill-05)', borderRadius:5, fontSize:11, fontWeight:600 }}>{t.type}</span>
                    <span style={{ padding:'2px 8px', background:c.bg, color:c.fg, borderRadius:999, fontSize:11, fontWeight:600 }}>{c.l}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--label-03)', marginTop:4 }}>{t.reason}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{t.from} → {t.to}</div>
                  <div style={{ fontSize:11, color:'var(--label-03)' }}>{t.days} ngày</div>
                </div>
                {t.status==='pending' ? (
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-primary btn-sm">Duyệt</button>
                    <button className="btn btn-ghost btn-sm">Từ chối</button>
                  </div>
                ) : <button className="btn-icon"><Icon.More/></button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* TAB: Payroll */
function Payroll() {
  const total = PAYROLL.reduce((s,p)=>s+p.total,0);
  const totalCommission = PAYROLL.reduce((s,p)=>s+p.dichvu,0);
  const totalBase = PAYROLL.reduce((s,p)=>s+p.baseRate,0);

  return (
    <div style={ssStyles.page}>
      <div style={ssStyles.kpiGrid}>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>{PAYROLL_PERIOD}</div><div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>Đang chốt sổ</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>Đóng kỳ 30/04 23:59</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Tổng quỹ lương</div><div style={{ fontSize:22, fontWeight:700, marginTop:4 }}>{fmt(Math.round(total/1000))}K₫</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>{STAFF.length} nhân viên</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Lương cơ bản</div><div style={{ fontSize:22, fontWeight:700, color:'#0ea5e9', marginTop:4 }}>{fmt(Math.round(totalBase/1000))}K₫</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>{Math.round(totalBase/total*100)}% quỹ</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Hoa hồng dịch vụ</div><div style={{ fontSize:22, fontWeight:700, color:'#16a34a', marginTop:4 }}>{fmt(Math.round(totalCommission/1000))}K₫</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>10–20% theo level</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Tổng tip</div><div style={{ fontSize:22, fontWeight:700, color:'#f59e0b', marginTop:4 }}>{fmt(Math.round(PAYROLL.reduce((s,p)=>s+p.tip,0)/1000))}K₫</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>100% về NV</div></div>
      </div>

      <div style={ssStyles.card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontWeight:700 }}>Bảng lương chi tiết · {PAYROLL_PERIOD}</div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất Excel</button>
            <button className="btn btn-ghost btn-sm"><Icon.Send/> Gửi phiếu lương</button>
            <button className="btn btn-primary btn-sm"><Icon.Check/> Chốt kỳ</button>
          </div>
        </div>

        <div style={{ overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:900 }}>
            <thead>
              <tr style={{ background:'var(--fill-05)' }}>
                <th style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>NHÂN VIÊN</th>
                <th style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>GIỜ / CA</th>
                <th style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>LƯƠNG GIỜ</th>
                <th style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>HOA HỒNG</th>
                <th style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>TIP</th>
                <th style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>PHẠT</th>
                <th style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--label-02)', borderBottom:'1px solid var(--fill-04)' }}>TỔNG NHẬN</th>
              </tr>
            </thead>
            <tbody>
              {PAYROLL.map(p => (
                <tr key={p.id} style={{ borderBottom:'1px solid var(--fill-04)' }}>
                  <td style={{ padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:`oklch(0.55 0.18 ${p.hue}/0.15)`, color:`oklch(0.40 0.18 ${p.hue})`, display:'grid', placeItems:'center', fontWeight:700, fontSize:11 }}>{p.name.split('.')[1]?.[0]||p.name[0]}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--label-03)' }}>{p.role} · {p.branch}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px', textAlign:'right' }}>{p.hours}h<div style={{ fontSize:11, color:'var(--label-03)' }}>{p.ca} ca</div></td>
                  <td style={{ padding:'12px', textAlign:'right' }}>{fmt(p.baseRate)}<div style={{ fontSize:11, color:'var(--label-03)' }}>{fmt(p.rate)}/h</div></td>
                  <td style={{ padding:'12px', textAlign:'right', color:'#16a34a' }}>{fmt(p.dichvu)}<div style={{ fontSize:11, color:'var(--label-03)' }}>{p.comm}%</div></td>
                  <td style={{ padding:'12px', textAlign:'right', color:'#f59e0b' }}>{fmt(p.tip)}</td>
                  <td style={{ padding:'12px', textAlign:'right', color: p.phat?'#ef4444':'var(--label-03)' }}>{p.phat?'-'+fmt(p.phat):'—'}</td>
                  <td style={{ padding:'12px', textAlign:'right', fontWeight:700, fontSize:13 }}>{fmt(p.total)}₫</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--fill-05)', fontWeight:700 }}>
                <td style={{ padding:'12px' }}>Tổng</td>
                <td style={{ padding:'12px', textAlign:'right' }}>{PAYROLL.reduce((s,p)=>s+p.hours,0)}h</td>
                <td style={{ padding:'12px', textAlign:'right' }}>{fmt(totalBase)}</td>
                <td style={{ padding:'12px', textAlign:'right', color:'#16a34a' }}>{fmt(totalCommission)}</td>
                <td style={{ padding:'12px', textAlign:'right', color:'#f59e0b' }}>{fmt(PAYROLL.reduce((s,p)=>s+p.tip,0))}</td>
                <td style={{ padding:'12px', textAlign:'right', color:'#ef4444' }}>-{fmt(PAYROLL.reduce((s,p)=>s+p.phat,0))}</td>
                <td style={{ padding:'12px', textAlign:'right', fontSize:14 }}>{fmt(total)}₫</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* TAB: Team Overview */
function TeamOverview() {
  return (
    <div style={ssStyles.page}>
      <div style={ssStyles.kpiGrid}>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Tổng nhân sự</div><div style={{ fontSize:28, fontWeight:700, marginTop:4 }}>{STAFF.length}</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>2 chi nhánh</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Online hôm nay</div><div style={{ fontSize:28, fontWeight:700, color:'#16a34a', marginTop:4 }}>{STAFF.filter(s=>!s.off).length}</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>{STAFF.filter(s=>s.off).length} nghỉ ốm</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Util TB tuần</div><div style={{ fontSize:28, fontWeight:700, color:'#0ea5e9', marginTop:4 }}>87%</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>+4% so với tuần trước</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>NPS team</div><div style={{ fontSize:28, fontWeight:700, color:'#8b5cf6', marginTop:4 }}>4.7</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>từ 142 review tuần này</div></div>
        <div style={ssStyles.kpi}><div style={{ fontSize:12, color:'var(--label-02)' }}>Top earner kỳ này</div><div style={{ fontSize:14, fontWeight:700, marginTop:4 }}>BS.Minh</div><div style={{ fontSize:11, color:'var(--label-03)', marginTop:6 }}>~32M₫ · 220h</div></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:12 }}>
        {STAFF.map(s => (
          <div key={s.id} style={{ ...ssStyles.card, padding:14 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:`oklch(0.55 0.18 ${s.hue}/0.15)`, color:`oklch(0.40 0.18 ${s.hue})`, display:'grid', placeItems:'center', fontWeight:700, fontSize:14 }}>{s.name.split('.')[1]?.[0]||s.name[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{s.name}</div>
                  {s.off && <span style={{ padding:'1px 6px', background:'#fee2e2', color:'#991b1b', borderRadius:999, fontSize:10, fontWeight:600 }}>Off</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--label-03)' }}>{s.role} · {s.branch}</div>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:10 }}>
              {s.skills.map(sk => <span key={sk} style={{ padding:'2px 7px', background:'var(--fill-05)', borderRadius:5, fontSize:11 }}>{sk}</span>)}
            </div>
            <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
              <div style={{ padding:'8px 10px', background:'var(--fill-05)', borderRadius:6 }}><div style={{ fontSize:10, color:'var(--label-03)' }}>Lương/h</div><div style={{ fontSize:12, fontWeight:700 }}>{fmt(s.rate/1000)}K</div></div>
              <div style={{ padding:'8px 10px', background:'var(--fill-05)', borderRadius:6 }}><div style={{ fontSize:10, color:'var(--label-03)' }}>HH</div><div style={{ fontSize:12, fontWeight:700 }}>{s.comm}%</div></div>
              <div style={{ padding:'8px 10px', background:'var(--fill-05)', borderRadius:6 }}><div style={{ fontSize:10, color:'var(--label-03)' }}>Util</div><div style={{ fontSize:12, fontWeight:700, color: s.avail>0.85?'#16a34a':'#f59e0b' }}>{Math.round(s.avail*100)}%</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* MODULE */
function StaffShiftsModule() {
  const [tab, setTab] = useSS('schedule');
  const TABS = [
    { k:'team',     l:'Đội ngũ' },
    { k:'schedule', l:'Phân ca' },
    { k:'timeoff',  l:'Time-off' },
    { k:'payroll',  l:'Payroll' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={ssStyles.topbar}>
        <Icon.Users width="20" height="20"/>
        <span style={{ fontWeight:700, fontSize:15 }}>Staff & Shifts</span>
        <span style={{ padding:'2px 8px', background:'var(--fill-05)', borderRadius:999, fontSize:11, color:'var(--label-02)' }}>{STAFF.length} nhân sự · {STAFF.filter(s=>!s.off).length} online</span>
        <span style={{ flex:1 }}/>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất bảng công</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Thêm nhân sự</button>
      </div>

      <div style={ssStyles.tabs}>
        {TABS.map(t => <button key={t.k} onClick={()=>setTab(t.k)} style={ssStyles.tab(tab===t.k)}>{t.l}</button>)}
      </div>

      {tab==='team'     && <TeamOverview/>}
      {tab==='schedule' && <ShiftSchedule/>}
      {tab==='timeoff'  && <TimeOff/>}
      {tab==='payroll'  && <Payroll/>}
    </div>
  );
}

window.StaffShiftsModule = StaffShiftsModule;
