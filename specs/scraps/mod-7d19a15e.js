/* ===== customer-360.jsx — CRM 360° Workspace =====
 * Hợp nhất toàn bộ nghiệp vụ làm việc với 1 khách hàng:
 * Hồ sơ · Action bar · Timeline · Cơ hội · Báo giá · Hợp đồng · Đơn ·
 * Thanh toán · Ticket · Dịch vụ · Bảo hành · Loyalty · Tệp · Chăm sóc
 * ================================================================= */
;(function(){
try {
const { useState: useC360, useMemo: useMC360 } = React;

/* ─── Demo customer dataset ──────────────────────────────────────── */
const C360_LIST = [
  {
    id:'CT-1001', code:'KH-2026-0421', first:'Lan', last:'Nguyễn Thị',
    avatar:null, score:87, scoreTrend:'+12',
    lifecycle:'VIP', sublifecycle:'Khách thân thiết',
    status:'active', sourceTag:'Zalo OA · Form web',
    owner:'Trâm', team:'Sales · HCM',
    company:'Bena Cosmetics', title:'Founder',
    phone:'+84 909 123 456', email:'lan@shopbena.vn',
    dob:'1991-07-12', gender:'Nữ',
    address:'56 Nguyễn Đình Chiểu, Q.3, TP.HCM',
    tags:['VIP','Mỹ phẩm','Hà Nội·HCM','Năm 4'],
    metrics:{ revenue:184500000, orders:23, debt:8400000, debtOverdue:0, clv:412000000, freq:'2.1 đơn/tháng', conv:'68%', recency:'7 ngày' },
    timeline:[
      { d:'08:42 · hôm nay', t:'call', who:'Trâm gọi', text:'Khách xác nhận đơn KX-2419, sẽ ck T2 15:00', dur:'4:18', tag:'Đã nghe' },
      { d:'08:31 · hôm nay', t:'msg', who:'Zalo OA', text:'"Em chốt đơn 4 set Skin · ck cọc 30%"', tag:'Đã đọc' },
      { d:'hôm qua', t:'quote', who:'Trâm', text:'Báo giá BG-2026-0319 · 22.4M · v2', tag:'Đã gửi' },
      { d:'hôm qua', t:'ai', who:'Claude Cowork', text:'Gợi ý upsell combo Skin Booster +18% AOV', tag:'AI' },
      { d:'21/04', t:'order', who:'KX-2419', text:'Đơn 9.8M · 4 SKU · giao 23/04', tag:'Đã giao' },
      { d:'21/04', t:'payment', who:'PT-2901', text:'Thu 9.8M · ck VCB · OK', tag:'Đã thu' },
      { d:'19/04', t:'meet', who:'Lịch hẹn', text:'Demo combo mới · 30 phút · Zoom', tag:'Hoàn tất' },
      { d:'17/04', t:'ticket', who:'TK-441', text:'Khiếu nại đơn 0418 (vỡ 1 chai) → đã đổi', tag:'Đã đóng' },
      { d:'12/04', t:'contract', who:'HD-119', text:'Phụ lục 02/2026 · gia hạn dịch vụ tư vấn', tag:'Đã ký' },
    ],
    deals:[
      { id:'OPP-3104', name:'Combo Skin Q3 — 12 set', stage:'Đàm phán', amt:48000000, prob:70, close:'05/05/2026' },
      { id:'OPP-2998', name:'Phân phối B2B miền Bắc', stage:'Báo giá', amt:280000000, prob:40, close:'20/06/2026' },
    ],
    quotes:[
      { id:'BG-2026-0319', name:'Combo Skin Booster v2', amt:22400000, st:'pending', sent:'24/04', exp:'08/05', v:2, signer:null },
      { id:'BG-2026-0291', name:'Đơn lẻ 12 SKU', amt:9800000, st:'accepted', sent:'15/04', exp:'30/04', v:1, signer:'Lan' },
      { id:'BG-2026-0244', name:'Phân phối Q1', amt:182000000, st:'expired', sent:'02/03', exp:'30/03', v:3, signer:null },
    ],
    contracts:[
      { id:'HD-2026-0119', name:'Hợp đồng đại lý cấp 1', value:580000000, st:'active', sign:'12/04/2026', renew:'12/04/2027', kind:'Đại lý' },
      { id:'HD-2026-0044', name:'Tư vấn marketing 6 tháng', value:90000000, st:'active', sign:'01/02/2026', renew:'01/08/2026', kind:'Dịch vụ' },
      { id:'HD-2025-0388', name:'NDA bảo mật công thức', value:0, st:'closed', sign:'04/12/2025', renew:'—', kind:'NDA' },
    ],
    orders:[
      { id:'KX-2419', date:'21/04', items:4, amt:9800000, st:'delivered', pay:'paid', src:'Zalo' },
      { id:'KX-2402', date:'14/04', items:2, amt:4200000, st:'delivered', pay:'paid', src:'Web' },
      { id:'KX-2378', date:'02/04', items:6, amt:18600000, st:'shipping', pay:'partial', src:'Sale' },
      { id:'KX-2354', date:'24/03', items:1, amt:1200000, st:'returned', pay:'refunded', src:'Web' },
    ],
    payments:[
      { id:'PT-2901', type:'in', method:'CK · VCB', amt:9800000, date:'22/04', st:'ok', ref:'KX-2419' },
      { id:'PT-2877', type:'in', method:'COD', amt:4200000, date:'14/04', st:'ok', ref:'KX-2402' },
      { id:'PT-2812', type:'in', method:'CK · VCB', amt:8400000, date:'02/04', st:'partial', ref:'KX-2378 · còn 10.2M' },
      { id:'PT-2754', type:'out', method:'Hoàn tiền', amt:1200000, date:'25/03', st:'ok', ref:'KX-2354' },
    ],
    tickets:[
      { id:'TK-441', subj:'Vỡ 1 chai trong đơn KX-2378', sla:'2h/8h', pri:'cao', st:'đóng', who:'Hỗ trợ KH', last:'17/04 17:20' },
      { id:'TK-402', subj:'Tư vấn loại da kết hợp serum', sla:'12h/24h', pri:'trung', st:'đóng', who:'CSKH', last:'05/04 09:11' },
      { id:'TK-378', subj:'Xin code tri ân khách năm 4', sla:'—', pri:'thấp', st:'đóng', who:'Marketing', last:'18/03 10:02' },
    ],
    services:[
      { id:'DV-022', name:'Tư vấn da định kỳ — gói Vàng', start:'01/02/2026', end:'01/08/2026', st:'active', usage:'4/12 buổi' },
      { id:'DV-018', name:'Phân tích doanh số tháng', start:'15/01/2026', end:'15/07/2026', st:'active', usage:'3/6 báo cáo' },
    ],
    warranty:[
      { id:'BH-118', name:'Đổi 1 chai serum vỡ', date:'17/04/2026', st:'completed', warrUntil:'30/06/2026' },
      { id:'BH-091', name:'Bảo hành chai pump', date:'08/02/2026', st:'completed', warrUntil:'08/08/2026' },
    ],
    loyalty:{
      tier:'Vàng', tierNext:'Bạch kim · còn 12.5M chi tiêu',
      points:14250, pointsTrend:'+1,800',
      vouchers:[
        { id:'VC-VIP-15', label:'Giảm 15% combo Skin', exp:'30/05/2026', used:false, code:'BENA-VIP-15' },
        { id:'VC-FREE-SHIP', label:'Miễn ship đơn ≥2M', exp:'15/05/2026', used:false, code:'BENA-FREE' },
        { id:'VC-COMBO-K10', label:'Tặng kit travel khi mua combo', exp:'30/04/2026', used:true, code:'BENA-K10' },
      ],
      referrals:[
        { name:'Trâm Anh · Beauty Studio', date:'12/03', st:'converted', value:24000000 },
        { name:'Mai · Cosmetics Hà Đông', date:'04/04', st:'pending', value:0 },
      ],
    },
    files:[
      { name:'CMND-Nguyen-Thi-Lan.pdf', size:'2.1 MB', kind:'KYC' },
      { name:'GPKD-Bena-Cosmetics.pdf', size:'4.8 MB', kind:'Giấy phép' },
      { name:'HopDong-Daily-2026.pdf', size:'6.4 MB', kind:'Hợp đồng' },
      { name:'BangGia-Q2-2026.xlsx', size:'180 KB', kind:'Bảng giá' },
    ],
    care:[
      { id:'CS-220', plan:'Chúc mừng năm 4 đồng hành', start:'10/04', st:'sent', open:true, click:true },
      { id:'CS-219', plan:'Reminder dùng serum đêm tuần 2', start:'18/04', st:'scheduled', open:false, click:false },
      { id:'CS-218', plan:'Khảo sát hài lòng đơn KX-2419', start:'24/04', st:'queued', open:false, click:false },
    ],
  },
];

/* ─── Helpers ────────────────────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
const pillStyle = (bg, fg) => ({
  display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:999,
  background:bg, color:fg, fontSize:11, fontWeight:600, lineHeight:'18px'
});

function StatusPill({ s }) {
  const map = {
    active:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'Đang giao dịch' },
    pending:{ bg:'#FEF3C7', fg:'#92400E', l:'Chờ duyệt' },
    accepted:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'Đã chấp nhận' },
    expired:{ bg:'var(--fill-03)', fg:'var(--label-02)', l:'Hết hạn' },
    delivered:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'Đã giao' },
    shipping:{ bg:'#DBEAFE', fg:'#1E3A8A', l:'Đang giao' },
    returned:{ bg:'#FEE2E2', fg:'#991B1B', l:'Đã hoàn' },
    paid:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'Đã thu' },
    partial:{ bg:'#FEF3C7', fg:'#92400E', l:'Một phần' },
    refunded:{ bg:'var(--fill-03)', fg:'var(--label-02)', l:'Hoàn tiền' },
    closed:{ bg:'var(--fill-03)', fg:'var(--label-02)', l:'Kết thúc' },
    sent:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'Đã gửi' },
    scheduled:{ bg:'#DBEAFE', fg:'#1E3A8A', l:'Đặt lịch' },
    queued:{ bg:'var(--fill-03)', fg:'var(--label-02)', l:'Hàng chờ' },
    ok:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'OK' },
    completed:{ bg:'var(--bg-green)', fg:'var(--pr-dark-2)', l:'Hoàn tất' },
  };
  const m = map[s] || { bg:'var(--fill-03)', fg:'var(--label-02)', l:s };
  return <span style={pillStyle(m.bg, m.fg)}>{m.l}</span>;
}

/* ─── Action bar ─────────────────────────────────────────────────── */
function ActionBar() {
  const primary = [
    { i:<Icon.Calendar/>, l:'Lịch hẹn' },
    { i:<Icon.Sparkles/>, l:'Chăm sóc' },
    { i:<Icon.Edit/>,     l:'Báo giá' },
    { i:<Icon.Files/>,    l:'Hợp đồng' },
    { i:<Icon.Box/>,      l:'Đơn hàng' },
    { i:<Icon.CreditCard/>,l:'Thanh toán' },
    { i:<Icon.Help/>,     l:'Ticket' },
  ];
  const contact = [
    { i:<Icon.Phone/>, l:'Gọi', c:'#1E3A8A', bg:'#DBEAFE' },
    { i:<Icon.Mail/>,  l:'Email', c:'#92400E', bg:'#FEF3C7' },
    { i:<Icon.Chat/>,  l:'SMS', c:'#5B21B6', bg:'#EDE9FE' },
    { i:<Icon.Chat/>, l:'Zalo', c:'var(--pr-dark-2)', bg:'var(--bg-green)' },
  ];
  const [more, setMore] = useC360(false);
  return (
    <div style={{display:'flex', flexWrap:'wrap', gap:8, alignItems:'center'}}>
      {contact.map(b => (
        <button key={b.l} className="btn btn-sm" style={{
          background:b.bg, color:b.c, fontWeight:600, border:'1px solid '+b.bg,
          padding:'6px 12px'
        }}>
          {React.cloneElement(b.i, {style:{width:14, height:14}})} {b.l}
        </button>
      ))}
      <span style={{width:1, height:22, background:'var(--fill-04)', margin:'0 4px'}}/>
      {primary.map(b => (
        <button key={b.l} className="btn btn-ghost btn-sm" style={{padding:'6px 11px', fontWeight:600}}>
          {React.cloneElement(b.i, {style:{width:13, height:13}})} {b.l}
        </button>
      ))}
      <div style={{position:'relative'}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>setMore(!more)} style={{padding:'6px 11px', fontWeight:600}}>
          <Icon.Plus style={{width:13, height:13}}/> Thêm
          <Icon.ChevronDown style={{width:12, height:12, marginLeft:2}}/>
        </button>
        {more && (
          <div onMouseLeave={()=>setMore(false)} style={{
            position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:10,
            background:'white', border:'1px solid var(--fill-04)', borderRadius:10,
            boxShadow:'var(--shadow-lg)', minWidth:200, padding:6
          }}>
            {[
              {i:<Icon.Edit/>, l:'Hóa đơn'},
              {i:<Icon.CreditCard/>, l:'Phiếu thu'},
              {i:<Icon.Star/>, l:'Voucher'},
              {i:<Icon.Broadcast/>, l:'Campaign'},
              {i:<Icon.Reports/>, l:'Khảo sát'},
              {i:React.createElement(Icon.Award||Icon.Star), l:'Loyalty'},
              {i:<Icon.Automation/>, l:'Workflow'},
              {i:<Icon.Download/>, l:'Upload file'},
              {i:React.createElement(Icon.Tag||Icon.Star), l:'Gắn tag'},
              {i:<Icon.UserPlus/>, l:'Chuyển sale'},
              {i:React.createElement(Icon.Notes||Icon.Edit), l:'Nhật ký nội bộ'},
            ].map(it => (
              <button key={it.l} style={{
                width:'100%', display:'flex', alignItems:'center', gap:9, padding:'7px 9px',
                background:'transparent', border:'none', borderRadius:6, fontSize:13,
                color:'var(--label-01)', cursor:'pointer', textAlign:'left', fontFamily:'inherit'
              }} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'}
                 onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{width:14, height:14, color:'var(--label-02)'}}>{React.cloneElement(it.i, {style:{width:13, height:13}})}</span>
                {it.l}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Header ─── Compact ──────────────────────────────────────── */
function CustomerHeader({ c }) {
  return (
    <div style={{padding:'12px 24px', background:'white', borderBottom:'1px solid var(--fill-04)'}}>
      <div style={{display:'flex', gap:14, alignItems:'center'}}>
        <div style={{
          width:44, height:44, borderRadius:10, flexShrink:0,
          background:'linear-gradient(135deg,#FCE7F3,#FBCFE8)',
          display:'grid', placeItems:'center', fontSize:14, fontWeight:700,
          color:'#9D174D', border:'1.5px solid white', boxShadow:'0 1px 4px rgba(0,0,0,.06)'
        }}>{c.first[0]+c.last[0]}</div>

        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <h1 style={{margin:0, fontSize:16, fontWeight:700, letterSpacing:'-0.01em'}}>{c.last} {c.first}</h1>
            <span style={{padding:'2px 7px',borderRadius:9,background:'linear-gradient(90deg,#FEF3C7,#FCD34D)',color:'#92400E',fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}>
              <Icon.Star style={{width:9,height:9}}/>{c.lifecycle}
            </span>
            <span style={{padding:'2px 7px',borderRadius:9,background:'var(--bg-green)',color:'var(--pr-dark-2)',fontSize:10,fontWeight:700}}>⚡ {c.score} <span style={{opacity:.6}}>{c.scoreTrend}</span></span>
            <span style={{color:'var(--label-03)', fontSize:10.5}}>{c.code}</span>
            <span style={{flex:1}}/>
            {c.tags.slice(0,3).map(t => (<span key={t} style={{padding:'1px 7px',borderRadius:8,background:'var(--fill-03)',color:'var(--label-02)',fontSize:10,fontWeight:600}}>{t}</span>))}
          </div>
          <div style={{marginTop:4, display:'flex', flexWrap:'wrap', gap:'2px 14px', fontSize:11.5, color:'var(--label-02)'}}>
            <span>{c.title} · <b style={{color:'var(--label-01)'}}>{c.company}</b></span>
            <span>{c.phone}</span>
            <span>{c.email}</span>
            <span><span style={{width:5,height:5,borderRadius:3,background:'var(--success)',display:'inline-block',marginRight:5}}/>{c.owner} · {c.team}</span>
          </div>
        </div>

        <div style={{display:'flex', gap:4, flexShrink:0}}>
          <button className="btn-icon" style={{width:28,height:28,borderRadius:6,border:'1px solid var(--fill-04)',background:'white',display:'grid',placeItems:'center',cursor:'pointer'}}><Icon.Star style={{width:12, height:12}}/></button>
          <button className="btn-icon" style={{width:28,height:28,borderRadius:6,border:'1px solid var(--fill-04)',background:'white',display:'grid',placeItems:'center',cursor:'pointer'}}><Icon.Edit style={{width:12, height:12}}/></button>
          <button className="btn-icon" style={{width:28,height:28,borderRadius:6,border:'1px solid var(--fill-04)',background:'white',display:'grid',placeItems:'center',cursor:'pointer'}}><Icon.More style={{width:12, height:12}}/></button>
        </div>
      </div>
      <div style={{marginTop:10}}><ActionBar/></div>
    </div>
  );
}

/* ─── Quick stats card ──────────────────────────────────────────── */
function StatRow({ l, v, sub, color }) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'8px 0', borderBottom:'1px dashed var(--fill-04)'}}>
      <span style={{fontSize:12, color:'var(--label-02)'}}>{l}</span>
      <div style={{textAlign:'right'}}>
        <div style={{fontSize:13.5, fontWeight:700, color: color || 'var(--label-01)'}}>{v}</div>
        {sub && <div style={{fontSize:10.5, color:'var(--label-03)'}}>{sub}</div>}
      </div>
    </div>
  );
}

function StatsCard({ c }) {
  return (
    <div style={{
      background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px'
    }}>
      <div style={{fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'var(--label-03)', marginBottom:6}}>
        DASHBOARD KHÁCH HÀNG
      </div>
      <StatRow l="Doanh thu lifetime" v={fmt(c.metrics.revenue)} color="var(--pr-dark-2)"/>
      <StatRow l="Tổng đơn / lần mua" v={c.metrics.orders} sub={c.metrics.freq}/>
      <StatRow l="Công nợ" v={fmt(c.metrics.debt)} sub={c.metrics.debtOverdue ? 'Quá hạn' : 'Trong hạn'} color={c.metrics.debt>0?'#92400E':'var(--label-01)'}/>
      <StatRow l="CLV dự đoán" v={fmt(c.metrics.clv)} sub="AI · Claude Score"/>
      <StatRow l="Tỷ lệ chuyển đổi" v={c.metrics.conv}/>
      <StatRow l="Recency · lần cuối" v={c.metrics.recency}/>
    </div>
  );
}

/* ─── Tabs content ───────────────────────────────────────────────── */
const TIMELINE_ICONS = {
  call:<Icon.Phone/>, msg:<Icon.Chat/>, quote:<Icon.Edit/>, ai:<Icon.Sparkles/>,
  order:<Icon.Box/>, payment:<Icon.CreditCard/>, meet:<Icon.Calendar/>,
  ticket:<Icon.Help/>, contract:<Icon.Files/>
};
const TIMELINE_COLORS = {
  call:'#1E3A8A', msg:'#0E7C66', quote:'#92400E', ai:'#7C3AED',
  order:'#0E7C66', payment:'#0E7C66', meet:'#1E3A8A',
  ticket:'#991B1B', contract:'#7C3AED'
};

function TimelineTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', gap:8, marginBottom:14, flexWrap:'wrap'}}>
        {['Tất cả','Cuộc gọi','Tin nhắn','Lịch hẹn','Đơn hàng','Thanh toán','Báo giá','Hợp đồng','Ticket','AI'].map((f,i) => (
          <button key={f} className="btn btn-sm" style={{
            background:i===0?'var(--primary)':'white', color:i===0?'white':'var(--label-02)',
            border:'1px solid '+(i===0?'var(--primary)':'var(--fill-04)'),
            padding:'4px 11px', fontSize:11.5, fontWeight:600, borderRadius:999
          }}>{f}</button>
        ))}
      </div>
      <div style={{position:'relative', paddingLeft:24}}>
        <div style={{position:'absolute', top:6, bottom:6, left:8, width:2, background:'var(--fill-04)'}}/>
        {c.timeline.map((e, i) => (
          <div key={i} style={{position:'relative', paddingBottom:18}}>
            <div style={{
              position:'absolute', left:-22, top:2, width:18, height:18, borderRadius:9,
              background:'white', border:'2px solid '+TIMELINE_COLORS[e.t],
              display:'grid', placeItems:'center', color:TIMELINE_COLORS[e.t]
            }}>
              {React.cloneElement(TIMELINE_ICONS[e.t], {style:{width:9, height:9}})}
            </div>
            <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:'10px 14px'}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:3}}>
                <span style={{fontSize:11.5, fontWeight:700, color:'var(--label-01)'}}>{e.who}</span>
                <span style={{fontSize:10.5, fontWeight:500, color:'var(--label-03)'}}>· {e.d}</span>
                <span style={{flex:1}}/>
                {e.tag && <span style={pillStyle('var(--fill-03)','var(--label-02)')}>{e.tag}</span>}
                {e.dur && <span style={{fontSize:10.5, color:'var(--label-03)'}}>{e.dur}</span>}
              </div>
              <div style={{fontSize:13, color:'var(--label-01)', lineHeight:1.5}}>{e.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Table({ cols, rows, render }) {
  return (
    <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, overflow:'hidden'}}>
      <div style={{
        display:'grid', gridTemplateColumns:cols.map(c=>c.w||'1fr').join(' '),
        background:'var(--fill-02)', padding:'9px 14px',
        fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)',
        borderBottom:'1px solid var(--fill-04)'
      }}>
        {cols.map(c => <span key={c.k} style={{textAlign:c.align||'left'}}>{c.l}</span>)}
      </div>
      {rows.map((r,i) => (
        <div key={i} style={{
          display:'grid', gridTemplateColumns:cols.map(c=>c.w||'1fr').join(' '),
          padding:'10px 14px', fontSize:12.5,
          borderBottom: i<rows.length-1?'1px solid var(--fill-04)':'none', alignItems:'center'
        }}>
          {render(r)}
        </div>
      ))}
    </div>
  );
}

function QuotesTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Báo giá ({c.quotes.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Download style={{width:12, height:12}}/> Xuất PDF</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tạo báo giá</button>
      </div>
      <Table
        cols={[
          {k:'id', l:'Mã', w:'130px'},
          {k:'name', l:'Tên báo giá'},
          {k:'amt', l:'Giá trị', w:'130px', align:'right'},
          {k:'v', l:'Phiên bản', w:'80px', align:'center'},
          {k:'sent', l:'Gửi · Hết hạn', w:'160px'},
          {k:'st', l:'Trạng thái', w:'140px'},
          {k:'a', l:'', w:'40px'},
        ]}
        rows={c.quotes}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span>{r.name}{r.signer && <span style={{fontSize:11, color:'var(--label-03)'}}> · ký bởi {r.signer}</span>}</span>
            <span style={{textAlign:'right', fontWeight:600}}>{fmt(r.amt)}</span>
            <span style={{textAlign:'center'}}><span style={pillStyle('var(--fill-03)','var(--label-02)')}>v{r.v}</span></span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.sent} → {r.exp}</span>
            <span><StatusPill s={r.st}/></span>
            <button className="btn btn-ghost btn-sm" style={{padding:4}}><Icon.More style={{width:13, height:13}}/></button>
          </>
        )}
      />
    </div>
  );
}

function ContractsTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Hợp đồng ({c.contracts.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Edit style={{width:12, height:12}}/> Ký số FastSign</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tạo hợp đồng</button>
      </div>
      <Table
        cols={[
          {k:'id', l:'Mã', w:'140px'},
          {k:'name', l:'Tên hợp đồng'},
          {k:'kind', l:'Loại', w:'100px'},
          {k:'value', l:'Giá trị', w:'130px', align:'right'},
          {k:'sign', l:'Ký · Tái ký', w:'200px'},
          {k:'st', l:'', w:'140px'},
          {k:'a', l:'', w:'40px'},
        ]}
        rows={c.contracts}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span>{r.name}</span>
            <span><span style={pillStyle('var(--fill-03)','var(--label-02)')}>{r.kind}</span></span>
            <span style={{textAlign:'right', fontWeight:600}}>{r.value? fmt(r.value):'—'}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.sign} → {r.renew}</span>
            <span><StatusPill s={r.st}/></span>
            <button className="btn btn-ghost btn-sm" style={{padding:4}}><Icon.More style={{width:13, height:13}}/></button>
          </>
        )}
      />
    </div>
  );
}

function OrdersTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Đơn hàng ({c.orders.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Download style={{width:12, height:12}}/> Xuất Excel</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tạo đơn</button>
      </div>
      <Table
        cols={[
          {k:'id', l:'Mã đơn', w:'120px'},
          {k:'date', l:'Ngày', w:'90px'},
          {k:'src', l:'Nguồn', w:'90px'},
          {k:'items', l:'SP', w:'60px', align:'center'},
          {k:'amt', l:'Giá trị', w:'130px', align:'right'},
          {k:'st', l:'Vận chuyển', w:'130px'},
          {k:'pay', l:'Thanh toán', w:'130px'},
          {k:'a', l:'', w:'40px'},
        ]}
        rows={c.orders}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.date}</span>
            <span><span style={pillStyle('var(--fill-03)','var(--label-02)')}>{r.src}</span></span>
            <span style={{textAlign:'center'}}>{r.items}</span>
            <span style={{textAlign:'right', fontWeight:600}}>{fmt(r.amt)}</span>
            <span><StatusPill s={r.st}/></span>
            <span><StatusPill s={r.pay}/></span>
            <button className="btn btn-ghost btn-sm" style={{padding:4}}><Icon.More style={{width:13, height:13}}/></button>
          </>
        )}
      />
    </div>
  );
}

function PaymentsTab({ c }) {
  const inSum = c.payments.filter(p=>p.type==='in').reduce((a,b)=>a+b.amt, 0);
  const outSum = c.payments.filter(p=>p.type==='out').reduce((a,b)=>a+b.amt, 0);
  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14}}>
        <div style={{background:'var(--bg-green)', border:'1px solid #BBF7D0', borderRadius:10, padding:'12px 14px'}}>
          <div style={{fontSize:11, color:'var(--pr-dark-2)', fontWeight:600}}>ĐÃ THU</div>
          <div style={{fontSize:18, fontWeight:700, color:'var(--pr-dark-2)', marginTop:2}}>{fmt(inSum)}</div>
        </div>
        <div style={{background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:10, padding:'12px 14px'}}>
          <div style={{fontSize:11, color:'#991B1B', fontWeight:600}}>HOÀN TIỀN</div>
          <div style={{fontSize:18, fontWeight:700, color:'#991B1B', marginTop:2}}>{fmt(outSum)}</div>
        </div>
        <div style={{background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:10, padding:'12px 14px'}}>
          <div style={{fontSize:11, color:'#92400E', fontWeight:600}}>CÔNG NỢ</div>
          <div style={{fontSize:18, fontWeight:700, color:'#92400E', marginTop:2}}>{fmt(c.metrics.debt)}</div>
          <div style={{fontSize:10.5, color:'#92400E', marginTop:2}}>{c.metrics.debtOverdue?'Quá hạn':'Trong hạn'}</div>
        </div>
        <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:'12px 14px'}}>
          <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600}}>NHẮC THANH TOÁN</div>
          <div style={{fontSize:18, fontWeight:700, marginTop:2}}>2 lịch</div>
          <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:2}}>Auto · Zalo · 25/04</div>
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Phiếu thu / chi ({c.payments.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Edit style={{width:12, height:12}}/> Xuất hoá đơn</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tạo phiếu thu</button>
      </div>
      <Table
        cols={[
          {k:'id', l:'Mã', w:'110px'},
          {k:'type', l:'Loại', w:'80px'},
          {k:'method', l:'Phương thức'},
          {k:'amt', l:'Số tiền', w:'130px', align:'right'},
          {k:'date', l:'Ngày', w:'90px'},
          {k:'st', l:'Trạng thái', w:'120px'},
          {k:'ref', l:'Tham chiếu'},
        ]}
        rows={c.payments}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span style={pillStyle(r.type==='in'?'var(--bg-green)':'#FEE2E2', r.type==='in'?'var(--pr-dark-2)':'#991B1B')}>
              {r.type==='in'?'Thu':'Chi'}
            </span>
            <span style={{fontSize:12}}>{r.method}</span>
            <span style={{textAlign:'right', fontWeight:600, color:r.type==='in'?'var(--pr-dark-2)':'#991B1B'}}>
              {r.type==='in'?'+':'-'}{fmt(r.amt)}
            </span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.date}</span>
            <span><StatusPill s={r.st}/></span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.ref}</span>
          </>
        )}
      />
    </div>
  );
}

function TicketsTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Ticket hỗ trợ ({c.tickets.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tạo ticket</button>
      </div>
      <Table
        cols={[
          {k:'id', l:'Mã', w:'90px'},
          {k:'subj', l:'Tiêu đề'},
          {k:'pri', l:'Ưu tiên', w:'90px'},
          {k:'sla', l:'SLA', w:'100px'},
          {k:'who', l:'Phụ trách', w:'140px'},
          {k:'last', l:'Cập nhật', w:'130px'},
          {k:'st', l:'Trạng thái', w:'100px'},
        ]}
        rows={c.tickets}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span>{r.subj}</span>
            <span><span style={pillStyle(
              r.pri==='cao'?'#FEE2E2':r.pri==='trung'?'#FEF3C7':'var(--fill-03)',
              r.pri==='cao'?'#991B1B':r.pri==='trung'?'#92400E':'var(--label-02)'
            )}>{r.pri}</span></span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.sla}</span>
            <span style={{fontSize:11.5}}>{r.who}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.last}</span>
            <span><StatusPill s={r.st==='đóng'?'closed':r.st}/></span>
          </>
        )}
      />
    </div>
  );
}

function ServicesTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Dịch vụ đang dùng ({c.services.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm">Tạm ngưng</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Đăng ký dịch vụ</button>
      </div>
      <div style={{display:'grid', gap:10}}>
        {c.services.map(s => (
          <div key={s.id} style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:'12px 16px', display:'flex', gap:14, alignItems:'center'}}>
            <div style={{width:40, height:40, borderRadius:10, background:'var(--bg-green)', display:'grid', placeItems:'center', color:'var(--pr-dark-2)'}}>
              <Icon.Sparkles style={{width:18, height:18}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span style={{fontWeight:600, fontSize:13.5}}>{s.name}</span>
                <span style={{fontSize:11, color:'var(--label-03)'}}>· {s.id}</span>
                <StatusPill s={s.st}/>
              </div>
              <div style={{fontSize:11.5, color:'var(--label-02)', marginTop:3}}>
                {s.start} → {s.end} · Đã dùng <b>{s.usage}</b>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm">Gia hạn</button>
            <button className="btn btn-ghost btn-sm">Hủy</button>
          </div>
        ))}
      </div>

      <h3 style={{margin:'24px 0 12px', fontSize:14, fontWeight:700}}>Bảo hành / Bảo trì</h3>
      <Table
        cols={[
          {k:'id', l:'Mã', w:'90px'},
          {k:'name', l:'Yêu cầu'},
          {k:'date', l:'Ngày', w:'120px'},
          {k:'warrUntil', l:'BH đến', w:'130px'},
          {k:'st', l:'', w:'120px'},
        ]}
        rows={c.warranty}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span>{r.name}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.date}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.warrUntil}</span>
            <span><StatusPill s={r.st}/></span>
          </>
        )}
      />
    </div>
  );
}

function LoyaltyTab({ c }) {
  const L = c.loyalty;
  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18}}>
        <div style={{background:'linear-gradient(135deg,#92400E,#F59E0B)', borderRadius:14, padding:'18px 20px', color:'white'}}>
          <div style={{fontSize:11, opacity:.8, fontWeight:600, letterSpacing:'.1em'}}>HẠNG THÀNH VIÊN</div>
          <div style={{fontSize:28, fontWeight:700, marginTop:4}}>{L.tier}</div>
          <div style={{fontSize:12, opacity:.85, marginTop:4}}>Tiến độ hạng kế tiếp: {L.tierNext}</div>
          <div style={{height:6, borderRadius:3, background:'rgba(255,255,255,.25)', marginTop:10, overflow:'hidden'}}>
            <div style={{width:'74%', height:'100%', background:'white'}}/>
          </div>
        </div>
        <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:14, padding:'18px 20px'}}>
          <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, letterSpacing:'.1em'}}>ĐIỂM TÍCH LŨY</div>
          <div style={{fontSize:28, fontWeight:700, marginTop:4}}>
            {L.points.toLocaleString()} <span style={{fontSize:13, color:'var(--label-03)', fontWeight:500}}>điểm</span>
            <span style={{fontSize:12, color:'var(--success)', fontWeight:600, marginLeft:8}}>{L.pointsTrend}</span>
          </div>
          <div style={{display:'flex', gap:8, marginTop:14}}>
            <button className="btn btn-ghost btn-sm">Quy đổi</button>
            <button className="btn btn-ghost btn-sm">Cộng/Trừ điểm</button>
            <button className="btn btn-ghost btn-sm">Lịch sử</button>
          </div>
        </div>
      </div>

      <h3 style={{margin:'0 0 12px', fontSize:14, fontWeight:700}}>Voucher / Coupon đang có ({L.vouchers.length})</h3>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18}}>
        {L.vouchers.map(v => (
          <div key={v.id} style={{
            background: v.used?'var(--fill-02)':'white',
            border:'1px dashed '+(v.used?'var(--fill-04)':'var(--primary)'),
            borderRadius:10, padding:'12px 14px', position:'relative',
            opacity: v.used?0.6:1
          }}>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <Icon.Star style={{width:14, height:14, color: v.used?'var(--label-03)':'#F59E0B'}}/>
              <span style={{fontSize:13, fontWeight:700}}>{v.label}</span>
            </div>
            <div style={{fontSize:11, color:'var(--label-03)', marginTop:6, fontFamily:'ui-monospace, monospace'}}>{v.code}</div>
            <div style={{fontSize:11, color:'var(--label-02)', marginTop:4}}>HSD: {v.exp}</div>
            {v.used && <span style={{position:'absolute', top:10, right:12, fontSize:10, fontWeight:700, color:'var(--label-03)'}}>ĐÃ DÙNG</span>}
          </div>
        ))}
      </div>

      <h3 style={{margin:'0 0 12px', fontSize:14, fontWeight:700}}>Khách giới thiệu (Referral)</h3>
      <Table
        cols={[
          {k:'name', l:'Người được giới thiệu'},
          {k:'date', l:'Ngày', w:'100px'},
          {k:'value', l:'Giá trị', w:'140px', align:'right'},
          {k:'st', l:'', w:'120px'},
        ]}
        rows={L.referrals.map(r => ({...r, st: r.st==='converted'?'completed':'pending'}))}
        render={(r) => (
          <>
            <span>{r.name}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.date}</span>
            <span style={{textAlign:'right', fontWeight:600}}>{r.value? fmt(r.value):'—'}</span>
            <span><StatusPill s={r.st}/></span>
          </>
        )}
      />
    </div>
  );
}

function FilesTab({ c }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Tệp đính kèm ({c.files.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tải lên</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10}}>
        {c.files.map(f => (
          <div key={f.name} style={{display:'flex', gap:12, alignItems:'center', background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:'12px 14px'}}>
            <div style={{width:40, height:40, borderRadius:8, background:'var(--fill-02)', display:'grid', placeItems:'center', color:'var(--label-02)'}}>
              <Icon.Files style={{width:18, height:18}}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{f.name}</div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:2}}><span style={pillStyle('var(--fill-03)','var(--label-02)')}>{f.kind}</span> · {f.size}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{padding:4}}><Icon.Download style={{width:13, height:13}}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareTab({ c }) {
  return (
    <div>
      <div style={{background:'linear-gradient(90deg,#EDE9FE,#DBEAFE)', border:'1px solid #C4B5FD', borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', gap:14, alignItems:'center'}}>
        <Icon.Sparkles style={{width:24, height:24, color:'#5B21B6'}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:700, color:'#5B21B6'}}>AI gợi ý chăm sóc</div>
          <div style={{fontSize:12.5, color:'#5B21B6', marginTop:3, lineHeight:1.5}}>
            Khách năm 4 · tần suất giảm 14% trong 30 ngày · CLV cao. Đề xuất: <b>Tặng voucher 200K cho đơn ≥3M</b> + lời chúc kỷ niệm + khảo sát hài lòng. Ước tính giữ chân +18%.
          </div>
        </div>
        <button className="btn btn-primary btn-sm">Tạo kịch bản</button>
      </div>

      <div style={{display:'flex', alignItems:'center', marginBottom:12, gap:8}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>Lịch chăm sóc ({c.care.length})</h3>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Automation style={{width:12, height:12}}/> Workflow</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus style={{width:12, height:12}}/> Tạo chăm sóc</button>
      </div>
      <Table
        cols={[
          {k:'id', l:'Mã', w:'90px'},
          {k:'plan', l:'Kịch bản'},
          {k:'start', l:'Lịch', w:'90px'},
          {k:'open', l:'Mở', w:'70px', align:'center'},
          {k:'click', l:'Click', w:'70px', align:'center'},
          {k:'st', l:'', w:'130px'},
        ]}
        rows={c.care}
        render={(r) => (
          <>
            <span style={{fontWeight:600, color:'var(--primary)'}}>{r.id}</span>
            <span>{r.plan}</span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>{r.start}</span>
            <span style={{textAlign:'center', color:r.open?'var(--success)':'var(--label-03)', fontSize:14}}>{r.open?'✓':'—'}</span>
            <span style={{textAlign:'center', color:r.click?'var(--success)':'var(--label-03)', fontSize:14}}>{r.click?'✓':'—'}</span>
            <span><StatusPill s={r.st}/></span>
          </>
        )}
      />
    </div>
  );
}

function OverviewTab({ c }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
      {/* Cơ hội mở */}
      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px', gridColumn:'1 / -1'}}>
        <div style={{display:'flex', alignItems:'center', marginBottom:10}}>
          <h4 style={{margin:0, fontSize:13.5, fontWeight:700}}>Cơ hội đang mở</h4>
          <span style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm"><Icon.Plus style={{width:12, height:12}}/> Cơ hội mới</button>
        </div>
        {c.deals.map(d => (
          <div key={d.id} style={{display:'grid', gridTemplateColumns:'120px 1fr 120px 100px 110px', gap:10, padding:'8px 0', borderBottom:'1px dashed var(--fill-04)', alignItems:'center'}}>
            <span style={{fontSize:12, fontWeight:600, color:'var(--primary)'}}>{d.id}</span>
            <span style={{fontSize:13}}>{d.name}</span>
            <span style={{fontSize:12, fontWeight:600, textAlign:'right'}}>{fmt(d.amt)}</span>
            <span><span style={pillStyle('var(--bg-green)','var(--pr-dark-2)')}>{d.stage}</span></span>
            <span style={{fontSize:11.5, color:'var(--label-02)'}}>P {d.prob}% · {d.close}</span>
          </div>
        ))}
      </div>

      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px'}}>
        <h4 style={{margin:'0 0 10px', fontSize:13.5, fontWeight:700}}>Tương tác gần nhất</h4>
        {c.timeline.slice(0,5).map((e, i) => (
          <div key={i} style={{display:'flex', gap:10, padding:'8px 0', borderBottom:i<4?'1px dashed var(--fill-04)':'none'}}>
            <div style={{width:24, height:24, borderRadius:6, background:'var(--fill-02)', display:'grid', placeItems:'center', color:TIMELINE_COLORS[e.t], flexShrink:0}}>
              {React.cloneElement(TIMELINE_ICONS[e.t], {style:{width:12, height:12}})}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12.5, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{e.text}</div>
              <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:2}}>{e.who} · {e.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px'}}>
        <h4 style={{margin:'0 0 10px', fontSize:13.5, fontWeight:700}}>Đề xuất hành động kế tiếp</h4>
        {[
          { i:<Icon.Phone/>, l:'Gọi xác nhận chuyển khoản đơn KX-2419', sub:'Hôm nay 15:00', urgent:true },
          { i:<Icon.Sparkles/>, l:'Gửi voucher kỷ niệm năm 4', sub:'Auto · Zalo · 28/04', urgent:false },
          { i:<Icon.Edit/>, l:'Theo dõi báo giá BG-2026-0319', sub:'Hết hạn 08/05', urgent:false },
          { i:<Icon.Star/>, l:'Đánh giá thăng hạng Bạch kim', sub:'Còn 12.5M chi tiêu', urgent:false },
        ].map((a,i) => (
          <div key={i} style={{display:'flex', gap:10, padding:'9px 0', borderBottom:i<3?'1px dashed var(--fill-04)':'none', alignItems:'center'}}>
            <div style={{width:24, height:24, borderRadius:6, background: a.urgent?'#FEE2E2':'var(--fill-02)', color:a.urgent?'#991B1B':'var(--label-02)', display:'grid', placeItems:'center'}}>
              {React.cloneElement(a.i, {style:{width:12, height:12}})}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12.5, color:'var(--label-01)'}}>{a.l}</div>
              <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:2}}>{a.sub}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{padding:'4px 10px'}}>Thực hiện</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main module ────────────────────────────────────────────────── */
const TABS = [
  { k:'overview', l:'Tổng quan', i:<Icon.Grid/>, n:0, comp:OverviewTab },
  { k:'timeline', l:'Timeline 360°', i:<Icon.Activity/>, n:9, comp:TimelineTab },
  { k:'quotes', l:'Báo giá', i:<Icon.Edit/>, n:3, comp:QuotesTab },
  { k:'contracts', l:'Hợp đồng', i:<Icon.Files/>, n:3, comp:ContractsTab },
  { k:'orders', l:'Đơn hàng', i:<Icon.Box/>, n:4, comp:OrdersTab },
  { k:'payments', l:'Thanh toán', i:<Icon.CreditCard/>, n:4, comp:PaymentsTab },
  { k:'tickets', l:'Ticket', i:<Icon.Help/>, n:3, comp:TicketsTab },
  { k:'services', l:'Dịch vụ · Bảo hành', i:<Icon.Sparkles/>, n:4, comp:ServicesTab },
  { k:'loyalty', l:'Loyalty', i:<Icon.Star/>, n:0, comp:LoyaltyTab },
  { k:'files', l:'Tệp', i:<Icon.Files/>, n:4, comp:FilesTab },
  { k:'care', l:'Chăm sóc', i:<Icon.Sparkles/>, n:3, comp:CareTab },
];

function Customer360Module() {
  const c = C360_LIST[0];
  const [tab, setTab] = useC360('overview');
  const Active = TABS.find(t => t.k===tab)?.comp || OverviewTab;
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      {/* Topbar with breadcrumb */}
      <div className="topbar" style={{borderBottom:'none', paddingBottom:0}}>
        <h1>Khách hàng 360°</h1>
        <span className="crumb">Liên hệ · {c.last} {c.first} · {c.code}</span>
        <span className="spacer"/>
        <button className="btn btn-ghost btn-sm"><Icon.User style={{width:13, height:13}}/> Đổi khách</button>
        <button className="btn btn-ghost btn-sm"><Icon.Download style={{width:13, height:13}}/> Xuất hồ sơ</button>
      </div>

      <CustomerHeader c={c}/>

      {/* Tab nav */}
      <div style={{display:'flex', gap:2, padding:'0 28px', background:'white', borderBottom:'1px solid var(--fill-04)', overflowX:'auto'}}>
        {TABS.map(t => {
          const on = tab===t.k;
          return (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:'12px 14px', background:'transparent', border:'none',
              borderBottom:'2px solid '+(on?'var(--primary)':'transparent'),
              color: on?'var(--primary)':'var(--label-02)',
              fontWeight:600, fontSize:13, cursor:'pointer',
              display:'inline-flex', gap:7, alignItems:'center', whiteSpace:'nowrap', fontFamily:'inherit'
            }}>
              {React.cloneElement(t.i, {style:{width:13, height:13}})} {t.l}
              {t.n>0 && <span style={{
                fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:8,
                background: on?'var(--bg-green)':'var(--fill-03)',
                color: on?'var(--primary)':'var(--label-02)'
              }}>{t.n}</span>}
            </button>
          );
        })}
      </div>

      {/* Body: stats sidebar + tab content */}
      <div className="scroll" style={{flex:1, background:'var(--fill-02)', overflow:'auto'}}>
        <div style={{display:'grid', gridTemplateColumns:'280px 1fr', gap:16, padding:'18px 28px 28px'}}>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <StatsCard c={c}/>
            <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px'}}>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'var(--label-03)', marginBottom:8}}>HỒ SƠ</div>
              {[
                ['Mã khách', c.code],
                ['Công ty', c.company],
                ['Chức vụ', c.title],
                ['Phụ trách', c.owner],
                ['Phòng ban', c.team],
                ['Nguồn', c.sourceTag],
                ['Ngày sinh', c.dob],
                ['Địa chỉ', c.address],
              ].map(([l,v]) => (
                <div key={l} style={{display:'flex', justifyContent:'space-between', gap:10, padding:'6px 0', borderBottom:'1px dashed var(--fill-04)', fontSize:12}}>
                  <span style={{color:'var(--label-03)'}}>{l}</span>
                  <span style={{color:'var(--label-01)', fontWeight:500, textAlign:'right', maxWidth:'60%'}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px'}}>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'var(--label-03)', marginBottom:8}}>PHÂN QUYỀN · AUDIT</div>
              <div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.6}}>
                <div>Truy cập: <b style={{color:'var(--label-01)'}}>Sales · HCM · Manager</b></div>
                <div style={{marginTop:4}}>Sửa cuối: 24/04 · 08:42 bởi <b style={{color:'var(--label-01)'}}>Trâm</b></div>
                <div style={{marginTop:4}}>Audit log: <button style={{padding:0, border:'none', background:'transparent', color:'var(--primary)', cursor:'pointer', fontWeight:600, fontFamily:'inherit', fontSize:12}}>Xem 14 thao tác →</button></div>
              </div>
            </div>
          </div>
          <div>
            <Active c={c}/>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Customer360Module = Customer360Module;

} catch(err){ console.error('customer-360.jsx failed:', err); }
})();
