/* ===== customer-360-panel.jsx — Hồ sơ 360° (v3, theo mockup) =====
 * Tab: Tổng quan · CRM · AI · Lịch sử tương tác
 * Tổng quan: AI Tóm tắt → Thông tin KH → [Deal | Việc cần làm] → [Ghi chú | Comment]
 * Footer sticky: Gọi ngay · Gửi email · Đặt lịch hẹn · Khác
 * ================================================================= */
;(function(){
try {
const { useState: useC3P } = React;
const Ic = (n, p) => { const C = window.Icon && window.Icon[n]; return C ? <C {...p}/> : null; };

const c3pCard  = {border:'1px solid var(--fill-04)', borderRadius:12, background:'white', padding:14, marginBottom:12};
const c3pBtn   = {height:34, borderRadius:8, border:'1px solid var(--fill-04)', background:'white', fontSize:12, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, color:'var(--label-01)', whiteSpace:'nowrap'};
const c3pHead  = (right) => ({display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12});
const c3pTitle = {fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--label-01)', whiteSpace:'nowrap'};
const c3pLink  = {fontSize:12, fontWeight:600, color:'var(--pr-dark-1)', cursor:'pointer', border:'none', background:'transparent', padding:0};

function C3PHeader({title, action, onAction}) {
  return (
    <div style={c3pHead()}>
      <span style={c3pTitle}>{title}</span>
      {action && <button style={c3pLink} onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ── AI TÓM TẮT ──────────────────────────────────────────────── */
function C3PAISummary() {
  return (
    <div style={{...c3pCard, marginBottom:12}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
        <span style={c3pTitle}>AI Tóm tắt</span>
        <span className="chip" style={{background:'#FDECEA', color:'#C0392B', fontWeight:700, fontSize:10.5}}>Hot Lead</span>
      </div>
      <div style={{display:'flex', gap:18, alignItems:'center'}}>
        {/* Vòng % */}
        <div style={{textAlign:'center', flexShrink:0}}>
          <div style={{position:'relative', width:92, height:92}}>
            <svg viewBox="0 0 92 92" style={{transform:'rotate(-90deg)'}}>
              <circle cx="46" cy="46" r="40" fill="none" stroke="var(--fill-03)" strokeWidth="7"/>
              <circle cx="46" cy="46" r="40" fill="none" stroke="var(--primary)" strokeWidth="7" strokeLinecap="round" strokeDasharray="78 100" pathLength="100"/>
            </svg>
            <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, whiteSpace:'nowrap'}}>78<span style={{fontSize:13, marginTop:6}}>%</span></div>
          </div>
          <div style={{fontSize:11.5, color:'var(--label-02)', marginTop:4}}>Khả năng chốt</div>
        </div>
        {/* Bullets */}
        <ul style={{listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8, fontSize:13, flex:1, minWidth:0}}>
          <li>• Đã trao đổi <b>5 lần</b> trong 14 ngày</li>
          <li>• Quan tâm: <b>Omichat CRM, Zalo cá nhân</b></li>
          <li>• Ngân sách dự kiến: <b>20 – 50 triệu</b></li>
          <li>• Giai đoạn hiện tại: <b>Demo</b></li>
          <li>• Việc cần làm: <b style={{color:'var(--pr-dark-1)'}}>Hẹn demo trong tuần này</b></li>
        </ul>
      </div>
    </div>
  );
}

/* ── THÔNG TIN KHÁCH HÀNG ────────────────────────────────────── */
function C3PCustomerInfo() {
  const NAME='Chị Lan';
  const L = (window.AppLoyalty?window.AppLoyalty.byName(NAME):{label:'Thành viên',color:'#0E9B94',pts:0,money:0});
  const fmtV=(n)=>(n||0).toLocaleString('vi-VN');
  const rowL = [
    ['Phone','0987 123 421'], ['Mail','lan.tran@gmail.com'], ['Box','Shop Bé Na'], ['User','Chủ shop'],
  ];
  return (
    <div style={{...c3pCard, marginBottom:12}}>
      <C3PHeader title="Thông tin khách hàng" action="Sửa"/>
      <div style={{display:'flex', gap:12, alignItems:'flex-start', marginBottom:14}}>
        <div style={{width:56, height:56, borderRadius:'50%', background:'#C2410C', color:'white', display:'grid', placeItems:'center', fontWeight:800, fontSize:19, flexShrink:0}}>CL</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap:7}}>
            <span style={{fontWeight:800, fontSize:17, whiteSpace:'nowrap'}}>Chị Lan</span>
            <span className="chip" style={{background:L.color+'22', color:L.color, fontWeight:800, fontSize:10}}>{L.label}</span>
          </div>
          <div style={{fontSize:12, color:'var(--label-02)', margin:'2px 0 6px'}}>VIP từ 06/2024</div>
          <span className="chip" style={{background:'#F6F2FF', color:'var(--premium)', fontWeight:600}}>Khách hàng tiềm năng</span>
        </div>
        <div style={{border:'1px solid var(--fill-04)', borderRadius:10, padding:'9px 14px', textAlign:'center', flexShrink:0}}>
          <div style={{fontSize:11, color:'var(--label-02)', marginBottom:3}}>Lead Score</div>
          <div style={{display:'flex', alignItems:'center', gap:6, justifyContent:'center'}}>
            <span style={{fontSize:22, fontWeight:800}}>82</span>
            <span className="chip green" style={{fontWeight:700}}>Cao</span>
          </div>
        </div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 18px', borderTop:'1px solid var(--fill-03)', paddingTop:10}}>
        <div>
          {rowL.slice(0,2).map(([ic,v]) => (
            <div key={v} style={{display:'flex', alignItems:'center', gap:9, fontSize:13, padding:'6px 0'}}>
              <span style={{color:'var(--label-03)', display:'inline-flex'}}>{Ic(ic,{width:14, height:14}) || Ic('FileText',{width:14, height:14})}</span>
              <span style={{fontWeight:600, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          {rowL.slice(2).map(([ic,v]) => (
            <div key={v} style={{display:'flex', alignItems:'center', gap:9, fontSize:13, padding:'6px 0'}}>
              <span style={{color:'var(--label-03)', display:'inline-flex'}}>{Ic(ic,{width:14, height:14}) || Ic('FileText',{width:14, height:14})}</span>
              <span style={{fontWeight:600, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:10, marginTop:10, padding:'10px 12px', borderRadius:11, background:'linear-gradient(135deg,'+L.color+',#8B6FE8)', color:'white'}}>
        <span style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,.2)',display:'grid',placeItems:'center',flexShrink:0}}>{Ic('Star',{width:17,height:17}) || '★'}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:10, opacity:.85, fontWeight:700, letterSpacing:'.06em'}}>HẠNG THÀNH VIÊN</div>
          <div style={{fontSize:15, fontWeight:800}}>{L.label}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:18, fontWeight:800, lineHeight:1.1}}>{fmtV(L.pts)}</div>
          <div style={{fontSize:10, opacity:.85}}>điểm · ≈ {fmtV(L.money)}đ</div>
        </div>
      </div>
    </div>
  );
}

/* ── CƠ HỘI / DEAL ───────────────────────────────────────────── */
function C3PDeal() {
  const rows = [
    ['Giá trị', <b key="v">48.000.000 ₫</b>],
    ['Giai đoạn', <span key="s" className="chip yellow" style={{fontWeight:700}}>Demo</span>],
    ['Xác suất', <b key="p">70%</b>],
    ['Ngày dự kiến chốt', <b key="d">15/06/2026</b>],
  ];
  return (
    <div style={c3pCard}>
      <C3PHeader title="Cơ hội / Deal" action="+ Thêm thông tin"/>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <span style={{fontWeight:700, fontSize:14}}>Omichat Enterprise</span>
        <button className="btn-icon" style={{width:24, height:24}}>{Ic('More',{width:14, height:14})}</button>
      </div>
      {rows.map(([k,v]) => (
        <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, padding:'7px 0', borderTop:'1px solid var(--fill-03)'}}>
          <span style={{color:'var(--label-02)'}}>{k}</span>{v}
        </div>
      ))}
      <div style={{marginTop:12, borderTop:'1px solid var(--fill-03)', paddingTop:10}}>
        <div style={{fontSize:11, fontWeight:700, color:'var(--label-02)', marginBottom:6}}>Thông tin khách hàng &amp; nhu cầu</div>
        <textarea rows="3" defaultValue="Khách cần quản lý nhiều tài khoản Zalo cá nhân + CRM cho Shop Bé Na; ngân sách 20–50 triệu; ưu tiên demo trong tuần này."
          style={{width:'100%', border:'1px solid var(--fill-04)', borderRadius:9, padding:'9px 11px', fontSize:12.5, lineHeight:1.5, fontFamily:'inherit', resize:'vertical', outline:'none', background:'var(--fill-02)', color:'var(--label-01)'}}
        ></textarea>
      </div>
      <button style={{...c3pBtn, width:'100%', marginTop:12, color:'var(--pr-dark-1)', borderColor:'var(--primary)', fontWeight:700}}>
        {Ic('Edit',{width:13, height:13})} Cập nhật deal
      </button>
    </div>
  );
}

/* ── VIỆC CẦN LÀM ────────────────────────────────────────────── */
function C3PTasks() {
  const [tasks, setTasks] = useC3P([
    {l:'Gọi lại cho khách', done:true, due:'Hôm nay'},
    {l:'Gửi báo giá Omichat CRM', done:true, due:'Hôm nay'},
    {l:'Demo sản phẩm', done:false, due:'10/06/2026', cal:true},
    {l:'Ký hợp đồng', done:false, due:'—'},
  ]);
  const toggle = i => setTasks(ts => ts.map((t,j) => j===i ? {...t, done:!t.done} : t));
  return (
    <div style={c3pCard}>
      <C3PHeader title="Việc cần làm" action="+ Tạo việc"/>
      <div style={{display:'flex', flexDirection:'column'}}>
        {tasks.map((t,i) => (
          <label key={t.l} style={{display:'flex', alignItems:'center', gap:10, padding:'9px 0', cursor:'pointer', fontSize:13, borderTop: i ? '1px solid var(--fill-03)' : 'none'}}>
            <input type="checkbox" checked={t.done} onChange={()=>toggle(i)} style={{accentColor:'var(--primary)', width:16, height:16, flexShrink:0}}/>
            <span style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:600, color: t.done?'var(--label-03)':'var(--label-01)', textDecoration: t.done?'line-through':'none'}}>{t.l}</span>
            <span style={{fontSize:11.5, color:'var(--label-03)', fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, flexShrink:0}}>
              {t.cal && Ic('Calendar',{width:12, height:12})}{t.due}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── GHI CHÚ ─────────────────────────────────────────────────── */
function C3PNotes() {
  return (
    <div style={c3pCard}>
      <C3PHeader title="Ghi chú" action="+ Thêm ghi chú"/>
      <div style={{background:'var(--fill-02)', border:'1px solid var(--fill-03)', borderRadius:10, padding:11}}>
        <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', marginBottom:5}}>Ghi chú gần nhất</div>
        <div style={{fontSize:12.5, lineHeight:1.55, marginBottom:7}}>Khách quan tâm giải pháp quản lý Zalo và CRM. Ưu tiên hẹn demo trong tuần này.</div>
        <div style={{fontSize:11, color:'var(--label-03)'}}>Trâm · 02/06/2026 10:35</div>
      </div>
    </div>
  );
}

/* ── COMMENT ─────────────────────────────────────────────────── */
function C3PComments() {
  return (
    <div style={c3pCard}>
      <C3PHeader title="Comment" action="+ Thêm"/>
      <div style={{display:'flex', gap:8, marginBottom:11}}>
        <input placeholder="Viết bình luận…" style={{flex:1, height:34, border:'1px solid var(--fill-04)', borderRadius:8, padding:'0 11px', fontSize:12.5, outline:'none', background:'var(--fill-02)'}}/>
        <button style={{...c3pBtn, width:34, padding:0, flexShrink:0}}>{Ic('Send',{width:14, height:14, color:'var(--label-02)'})}</button>
      </div>
      <div style={{display:'flex', gap:9}}>
        <div style={{width:26, height:26, borderRadius:'50%', background:'var(--pr-dark-1)', color:'white', display:'grid', placeItems:'center', fontWeight:700, fontSize:11, flexShrink:0}}>T</div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12, fontWeight:700}}>Trâm</div>
          <div style={{fontSize:12.5, lineHeight:1.5}}>Cần gửi thêm case study ngành bán lẻ</div>
          <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:2}}>02/06/2026 10:36</div>
        </div>
      </div>
    </div>
  );
}

/* ── LỊCH SỬ TƯƠNG TÁC (tab) ─────────────────────────────────── */
function C3PHistory() {
  const items = [
    {d:'Hôm nay 09:17', ic:'MessageSquare', c:'#0068FF', t:'Chat Zalo — yêu cầu báo giá & demo'},
    {d:'Hôm nay 09:18', ic:'FileText', c:'var(--pr-dark-1)', t:'Đã gửi Báo giá Omichat CRM.pdf'},
    {d:'Hôm qua', ic:'Mail', c:'#EA4335', t:'Mở email báo giá (2 lần)'},
    {d:'02/06', ic:'Phone', c:'var(--primary)', t:'Cuộc gọi 15 phút — tư vấn tính năng'},
    {d:'28/05', ic:'Video', c:'var(--premium)', t:'Đăng ký webinar "AI cho bán lẻ"'},
    {d:'20/05', ic:'UserPlus', c:'var(--label-03)', t:'Lead được tạo từ Facebook Ads'},
  ];
  return (
    <div style={c3pCard}>
      <C3PHeader title="Lịch sử tương tác" action="Xuất CSV"/>
      {items.map((it,i) => (
        <div key={i} style={{display:'flex', gap:10, position:'relative', paddingBottom: i<items.length-1 ? 14 : 0}}>
          {i<items.length-1 && <div style={{position:'absolute', left:12, top:26, bottom:0, width:1.5, background:'var(--fill-03)'}}></div>}
          <div style={{width:26, height:26, borderRadius:'50%', background:'white', border:'1.5px solid var(--fill-04)', display:'grid', placeItems:'center', flexShrink:0, color:it.c, zIndex:1}}>
            {Ic(it.ic,{width:12, height:12})}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)'}}>{it.d}</div>
            <div style={{fontSize:13, lineHeight:1.45}}>{it.t}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── AI (tab) ────────────────────────────────────────────────── */
function C3PAITab() {
  return <>
    <div style={{...c3pCard, marginBottom:12}}>
      <C3PHeader title="Tóm tắt hội thoại"/>
      <div style={{fontSize:13, lineHeight:1.6, background:'var(--bg-green)', borderRadius:10, padding:12}}>
        Khách hỏi giải pháp quản lý <b>Zalo cá nhân</b>, đã nhận <b>báo giá Omichat CRM</b> và đồng ý <b>hẹn demo trong tuần</b>. Đây là lần thứ 3 khách hỏi giá — tín hiệu mua rõ ràng.
      </div>
    </div>
    <div style={{...c3pCard, marginBottom:12}}>
      <C3PHeader title="Phân tích"/>
      {[
        ['Sentiment', <span key="1" style={{display:'flex', alignItems:'center', gap:8, flex:1, maxWidth:220}}><span style={{flex:1, height:6, borderRadius:3, background:'var(--fill-03)'}}><span style={{display:'block', width:'72%', height:'100%', borderRadius:3, background:'var(--primary)'}}></span></span><b style={{fontSize:12.5, color:'var(--pr-dark-2)'}}>Tích cực 72%</b></span>],
        ['Ý định', <b key="2">So sánh giải pháp · nhạy cảm về giá</b>],
        ['Tín hiệu mua', <b key="3">Hỏi giá ×3 · mở báo giá ×2/24h</b>],
        ['Rủi ro', <b key="4" style={{color:'#B45309'}}>Đang đánh giá 2 đối thủ</b>],
      ].map(([k,v]) => (
        <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, fontSize:13, padding:'8px 0', borderTop:'1px solid var(--fill-03)'}}>
          <span style={{color:'var(--label-02)', flexShrink:0}}>{k}</span>{v}
        </div>
      ))}
    </div>
    <div style={{...c3pCard, border:'1px solid #DDD3FA'}}>
      <C3PHeader title="AI đề xuất"/>
      {['Đặt demo trước thứ Sáu','Gửi case study ngành bán lẻ','Gọi khách hôm nay'].map(a => (
        <div key={a} style={{display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, padding:'8px 11px', background:'#FBFAFF', border:'1px solid var(--fill-03)', borderRadius:9, marginBottom:6}}>
          <span style={{color:'var(--premium)', fontWeight:800}}>→</span> {a}
        </div>
      ))}
      <button style={{...c3pBtn, width:'100%', height:36, background:'var(--premium)', color:'white', border:'none', fontWeight:700, marginTop:4}}>
        {Ic('Sparkles',{width:14, height:14})} Thực hiện đề xuất
      </button>
    </div>
  </>;
}

/* ── CRM (tab) ───────────────────────────────────────────────── */
function C3PCRMTab() {
  return <>
    <div style={{...c3pCard, marginBottom:12, padding:8, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4}}>
      {[['Leads',1],['Deals',2],['Hợp đồng',1],['Tickets',1],['Lịch hẹn',3]].map(([l,n]) => (
        <div key={l} style={{textAlign:'center', padding:'8px 2px'}}>
          <div style={{fontSize:17, fontWeight:800}}>{n}</div>
          <div style={{fontSize:10.5, color:'var(--label-02)', fontWeight:600}}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
      <C3PDeal/>
      <C3PTasks/>
    </div>
  </>;
}

/* ── MAIN ────────────────────────────────────────────────────── */
function Customer360Panel() {
  return (
    <div style={{width:'100%', background:'var(--fill-02)', display:'flex', flexDirection:'column', flex:1, minHeight:0}}>
      {/* Body — mỗi hàng 1 block */}
      <div className="scroll" style={{flex:1, overflowY:'auto', padding:14}}>
        <C3PAISummary/>
        <C3PCustomerInfo/>
        <C3PDeal/>
        <C3PHistory/>
        <C3PTasks/>
        <C3PNotes/>
        <C3PComments/>
      </div>

      {/* Business ops row */}
      <div style={{display:'flex', gap:5, padding:'8px 12px 0', background:'white', flexWrap:'wrap'}}>
        {[['Files','Báo giá','#1a8a4f'],['Note','Hợp đồng','#0F6E50'],['Package','Đơn hàng','#5B43AF'],['Calendar','Lịch hẹn','#2B9EF3'],['Help','Ticket','#C9820B']].map(([ic,l,c])=>(
          <button key={l} style={{...c3pBtn, flex:'1 1 auto', height:32, fontSize:11.5, fontWeight:600, gap:5, color:c}}>
            {Ic(ic,{width:13, height:13})} {l}
          </button>
        ))}
      </div>
      {/* Footer action bar */}
      <div style={{display:'flex', gap:6, padding:'10px 12px', background:'white', borderTop:'1px solid var(--fill-04)'}}>
        <button style={{...c3pBtn, flex:1.15, height:38, background:'var(--primary)', color:'white', border:'none', fontWeight:700, fontSize:12}}>
          {Ic('Phone',{width:13, height:13})} Gọi ngay
        </button>
        <button style={{...c3pBtn, flex:1, height:38, background:'var(--bg-blue)', color:'#1a5caf', border:'none', fontWeight:700, fontSize:12}}>
          {Ic('Mail',{width:13, height:13})} Gửi email
        </button>
        <button style={{...c3pBtn, flex:1.1, height:38, background:'#F6F2FF', color:'var(--premium)', border:'none', fontWeight:700, fontSize:12}}>
          {Ic('Calendar',{width:13, height:13})} Đặt lịch hẹn
        </button>
        <button title="Khác" style={{...c3pBtn, width:38, height:38, padding:0, flexShrink:0}}>
          {Ic('More',{width:14, height:14})}
        </button>
      </div>
    </div>
  );
}

window.Customer360Panel = Customer360Panel;
} catch(e) { console.error('customer-360-panel.jsx', e); }
})();
