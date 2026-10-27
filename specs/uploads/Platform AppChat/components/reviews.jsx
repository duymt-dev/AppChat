/* ============================================================
   Reviews & Reputation — gom review đa kênh, AI suggest reply
   Sources: Google Maps · Facebook · Zalo OA · In-app · Shopee · Lazada · TikTok Shop
   ============================================================ */
const { useState: useRv, useMemo: useRvMemo } = React;

/* ---------------- DATA ---------------- */
const RV_SOURCES = [
  { id:'all',      l:'Tất cả nguồn', icon:'🌐', color:'#475569' },
  { id:'google',   l:'Google Maps',  icon:'G',  color:'#4285F4', avg:4.8, count:842 },
  { id:'facebook', l:'Facebook',     icon:'f',  color:'#1877F2', avg:4.6, count:519 },
  { id:'zalo',     l:'Zalo OA',      icon:'Z',  color:'#0068FF', avg:4.7, count:328 },
  { id:'inapp',    l:'In-app',       icon:'A',  color:'#2DC56A', avg:4.9, count:1264 },
  { id:'shopee',   l:'Shopee',       icon:'S',  color:'#EE4D2D', avg:4.5, count:186 },
  { id:'lazada',   l:'Lazada',       icon:'L',  color:'#0F146D', avg:4.4, count:67 },
  { id:'tiktok',   l:'TikTok Shop',  icon:'T',  color:'#000000', avg:4.6, count:42 },
];

const RV_THEMES = [
  { tag:'phục vụ',     count:412, sentiment:'pos', trend:+18 },
  { tag:'sạch sẽ',     count:298, sentiment:'pos', trend:+12 },
  { tag:'giá hợp lý',  count:267, sentiment:'pos', trend:+5 },
  { tag:'không gian',  count:243, sentiment:'pos', trend:+9 },
  { tag:'kỹ thuật viên',count:218, sentiment:'pos', trend:+22 },
  { tag:'thời gian chờ',count:78,  sentiment:'neg', trend:+4 },
  { tag:'đặt lịch',     count:62,  sentiment:'mix', trend:-3 },
  { tag:'parking',      count:34,  sentiment:'neg', trend:+2 },
  { tag:'giá',          count:51,  sentiment:'mix', trend:0 },
];

const RV_REVIEWS = [
  {
    id:'r1', source:'google', stars:5, name:'Lan Phương', avatar:'LP', avatarBg:'#FCE7F3',
    time:'2 giờ trước', branch:'AppChat Beauty Hai Bà Trưng',
    content:'Liệu trình massage rất chuyên nghiệp, KTV Hân tay nghề tốt, không gian sạch sẽ thơm tho. Mình book qua app rất tiện, được trừ điểm thưởng nữa. Sẽ quay lại lần sau!',
    aiTags:['phục vụ','sạch sẽ','app booking','kỹ thuật viên'],
    sentiment:'pos', staff:'Hân (KTV)', service:'Massage thư giãn 60p',
    replied:false, urgent:false, lang:'vi',
    aiSuggest:[
      'Cảm ơn chị Lan Phương đã chia sẻ những đánh giá tích cực ❤️ Em sẽ chuyển lời khen tới KTV Hân và cả team. Hẹn gặp lại chị tại liệu trình kế tiếp ạ!',
      'Spa AppChat Beauty rất vui khi nhận được phản hồi của chị! Rất cảm ơn vì chị đã yêu mến KTV Hân. Chị có thể thử thêm combo Massage đá nóng 90p với ưu đãi 15% cho khách Diamond ạ.',
      'Chị Lan Phương ơi, cảm ơn 5⭐ thật ngọt của chị! Để bù lại buổi tới, em tặng chị thêm 200 điểm thưởng nhé. Em hẹn chị tuần sau ạ ❤️',
    ]
  },
  {
    id:'r2', source:'facebook', stars:2, name:'Nguyễn Tuấn', avatar:'NT', avatarBg:'#FEE2E2',
    time:'4 giờ trước', branch:'AppChat Wellness Nguyễn Trãi',
    content:'Đặt lịch lúc 7h tối nhưng đến 7h30 mới được vào, KTV không xin lỗi. Phòng cũng hơi nóng, điều hoà yếu. Lần đầu trải nghiệm nhưng khá thất vọng.',
    aiTags:['thời gian chờ','điều hoà','phục vụ'],
    sentiment:'neg', staff:'—', service:'Massage cổ vai gáy 45p',
    replied:false, urgent:true, lang:'vi',
    aiSuggest:[
      'Anh Tuấn ơi, AppChat Beauty xin lỗi anh chân thành về trải nghiệm chưa tốt vừa rồi ❤️ Em muốn được liên hệ lại để gửi voucher đền bù & lắng nghe thêm — anh để lại SĐT hoặc inbox em qua Zalo OA giúp em nhé!',
      'Em rất tiếc về sự cố anh gặp phải. Đội ngũ quản lý đã lưu ý và sẽ xử lý nội bộ. Em mong anh cho team cơ hội phục vụ lại — em tặng anh 1 buổi miễn phí chuyển sang chi nhánh khác. Anh inbox cho em nhé!',
      'Chân thành xin lỗi anh Tuấn. Việc khách phải chờ là lỗi của bên em, không thể bào chữa. Em đã chuyển case này lên Quản lý cấp cao xử lý. Em sẽ chủ động gọi anh trong 24h tới để gửi lời xin lỗi & phương án bù đắp ạ.',
    ]
  },
  {
    id:'r3', source:'zalo', stars:5, name:'Mai Trâm', avatar:'MT', avatarBg:'#DBEAFE',
    time:'Hôm qua', branch:'AppChat Beauty Hai Bà Trưng',
    content:'Combo trị mụn 6 buổi ở đây thực sự đáng tiền. Da mình đã sạch hẳn sau 3 buổi. KTV Ngọc tư vấn rất tận tâm, không upsell quá đà. 5 sao!',
    aiTags:['combo','kỹ thuật viên','tư vấn','hiệu quả'],
    sentiment:'pos', staff:'Ngọc (KTV)', service:'Trị mụn chuyên sâu',
    replied:true, urgent:false, lang:'vi',
    reply:'Cảm ơn chị Mai Trâm rất nhiều! Em sẽ chuyển lời khen tới KTV Ngọc ❤️ Hẹn gặp chị ở các buổi tiếp theo ạ.',
    repliedBy:'Trâm (Sales Lead)', repliedAt:'1 giờ sau',
    aiSuggest:[]
  },
  {
    id:'r4', source:'inapp', stars:5, name:'Hồng Nhung', avatar:'HN', avatarBg:'#FCE7F3',
    time:'Hôm qua', branch:'AppChat Wellness Nguyễn Trãi',
    content:'App đặt lịch cực kỳ tiện, có nhắc nhở qua Zalo trước 1 ngày. Tích điểm tự động sau mỗi buổi. Mình đang là khách Gold rồi 😍',
    aiTags:['app booking','membership','tích điểm','reminder'],
    sentiment:'pos', staff:'—', service:'Combo chăm sóc da 8 buổi',
    replied:true, urgent:false, lang:'vi',
    reply:'Chúc mừng chị đã lên hạng Gold! 🥇 Quà tặng thăng hạng đã được kích hoạt — chị check trong app nhé ❤️',
    repliedBy:'AI Auto-reply', repliedAt:'5 phút sau',
    aiSuggest:[]
  },
  {
    id:'r5', source:'google', stars:1, name:'Phạm Đức', avatar:'PĐ', avatarBg:'#FEE2E2',
    time:'2 ngày trước', branch:'AppChat Beauty Cầu Giấy',
    content:'Quảng cáo combo 1.999k nhưng đến nơi nhân viên cố tình upsell lên 4.5tr. Khi khách từ chối thì thái độ thay đổi hẳn. Cẩn thận với chiêu trò này.',
    aiTags:['upsell','quảng cáo','thái độ','giá'],
    sentiment:'neg', staff:'—', service:'—',
    replied:false, urgent:true, lang:'vi',
    aiSuggest:[
      'Anh Đức ơi, em rất tiếc khi đọc được phản hồi của anh ❤️ Việc upsell ép buộc là KHÔNG được phép tại AppChat Beauty. Em xin phép gọi điện trực tiếp để nắm rõ hơn — anh có thể inbox SĐT cho em không ạ?',
      'Chân thành xin lỗi anh. Đây là vi phạm nội quy của bên em. Em đã chuyển case lên CEO xử lý kỷ luật. Em mong anh để lại SĐT để em gọi điện gửi lời xin lỗi & 1 voucher full liệu trình tặng anh ạ.',
      'Cảm ơn anh Đức đã phản ánh — phản hồi này rất quan trọng. Em sẽ làm việc với chi nhánh Cầu Giấy & đội training. Em xin phép liên hệ riêng để xin lỗi & bù đắp anh ạ.',
    ]
  },
  {
    id:'r6', source:'shopee', stars:5, name:'Khánh Vy', avatar:'KV', avatarBg:'#FED7AA',
    time:'3 ngày trước', branch:'Shop AppChat Cosmetics',
    content:'Mua kem dưỡng combo cho thẻ thành viên. Hàng đóng gói cẩn thận, có quà tặng kèm. Shop reply rất nhanh. 5 sao!',
    aiTags:['đóng gói','quà tặng','phục vụ','reply nhanh'],
    sentiment:'pos', staff:'—', service:'Set kem dưỡng (Membership combo)',
    replied:true, urgent:false, lang:'vi',
    reply:'Cảm ơn chị đã ủng hộ shop ạ ❤️ Chúc chị skincare thành công!',
    repliedBy:'Lan (CSKH)', repliedAt:'30 phút sau',
    aiSuggest:[]
  },
  {
    id:'r7', source:'facebook', stars:3, name:'Bảo An', avatar:'BA', avatarBg:'#E5E7EB',
    time:'4 ngày trước', branch:'AppChat Beauty Hai Bà Trưng',
    content:'Dịch vụ ổn nhưng giá hơi cao so với mặt bằng chung. Nhân viên thân thiện. Có lẽ cần thêm combo giá tốt cho khách mới.',
    aiTags:['giá','phục vụ','combo','khách mới'],
    sentiment:'mix', staff:'—', service:'Massage thư giãn 60p',
    replied:false, urgent:false, lang:'vi',
    aiSuggest:[
      'Cảm ơn chị Bảo An đã góp ý chân thành! Em xin tặng chị mã KHACHMOI giảm 30% áp dụng cho buổi kế tiếp ạ. Hi vọng chị sẽ trải nghiệm lại ❤️',
      'Em rất cảm ơn ý kiến của chị về giá. Em đã chuyển feedback đến team marketing để cân nhắc combo dành riêng khách mới. Tặng chị voucher 200k cho lần kế ạ!',
      'Chị Bảo An ơi, em hiểu mong muốn của chị. Hiện bên em có gói "Trải nghiệm lần đầu" 599k cho 60p massage + 30p chăm da — chị thử nhé. Em đã gửi link đặt lịch qua inbox ạ.',
    ]
  },
  {
    id:'r8', source:'tiktok', stars:5, name:'Quỳnh Anh', avatar:'QA', avatarBg:'#FECACA',
    time:'5 ngày trước', branch:'TikTok Shop AppChat',
    content:'Order combo serum + mặt nạ qua livestream, ship nhanh, hàng chuẩn auth 100%. Sẽ ủng hộ tiếp 🥰',
    aiTags:['livestream','ship','authentic'],
    sentiment:'pos', staff:'—', service:'Combo skincare',
    replied:true, urgent:false, lang:'vi',
    reply:'Cảm ơn chị đã chốt đơn livestream ❤️ Chúc chị skincare đẹp da!',
    repliedBy:'AI Auto-reply', repliedAt:'2 phút sau',
    aiSuggest:[]
  },
  {
    id:'r9', source:'inapp', stars:4, name:'Tuấn Đạt', avatar:'TĐ', avatarBg:'#DBEAFE',
    time:'5 ngày trước', branch:'AppChat Wellness Nguyễn Trãi',
    content:'PT Hùng tận tâm, giáo trình chuyên nghiệp. Chỉ tiếc gym hơi đông giờ cao điểm 18-20h, máy chờ lâu.',
    aiTags:['HLV','giáo trình','quá tải','giờ cao điểm'],
    sentiment:'mix', staff:'Hùng (PT)', service:'PT 12 buổi',
    replied:false, urgent:false, lang:'vi',
    aiSuggest:[
      'Cảm ơn anh Tuấn Đạt đã đánh giá! Lời khen của anh dành cho PT Hùng đã được gửi tới ạ. Về vấn đề giờ cao điểm, em sẽ chuyển đến team quản lý xem xét tăng máy. Anh thử khung 14-16h hoặc 21-22h sẽ thoáng hơn ạ ❤️',
      'AppChat cảm ơn anh! Em đã gửi lời khen đến PT Hùng. Bên em đã có kế hoạch nâng số máy lên 1.5x trong Q3 — anh chờ tin tốt nhé!',
      'Cảm ơn anh đã góp ý xây dựng. Em sẽ ưu tiên cho anh booking trước slot 18-19h trong tuần tới (thay vì waitlist). Anh check app nhé!',
    ]
  },
  {
    id:'r10', source:'lazada', stars:2, name:'Thảo My', avatar:'TM', avatarBg:'#FEF3C7',
    time:'1 tuần trước', branch:'Lazada AppChat Cosmetics',
    content:'Hàng ship hơi chậm, đóng gói bị méo hộp. Sản phẩm dùng ổn nhưng trải nghiệm mua không tốt.',
    aiTags:['ship','đóng gói','trải nghiệm'],
    sentiment:'neg', staff:'—', service:'Lotion dưỡng ẩm',
    replied:false, urgent:true, lang:'vi',
    aiSuggest:[
      'Em xin lỗi chị Thảo My ❤️ Em đã ghi nhận và sẽ gửi lại 1 hộp mới + voucher 50k cho lần mua kế. Chị inbox shop để em xử lý ngay ạ.',
      'Rất tiếc về trải nghiệm của chị. Em sẽ refund 30% đơn hàng ngay và kiểm tra lại quy trình đóng gói. Chị nhận giúp em mã KQT-MY-50K cho lần sau ạ!',
      'Cảm ơn chị đã phản ánh. Bên em sẽ liên hệ với đối tác vận chuyển để xem xét. Em xin tặng chị 100k tiền cọc để bù đắp ạ.',
    ]
  },
];

const RV_TABS = [
  { k:'all',     l:'Tất cả',         icon:'📋' },
  { k:'pending', l:'Cần phản hồi',   icon:'🔥', urgent:true },
  { k:'replied', l:'Đã phản hồi',    icon:'✅' },
  { k:'neg',     l:'Khiếu nại',      icon:'⚠️' },
  { k:'pos',     l:'Khen ngợi',      icon:'⭐' },
];

/* ---------------- HELPERS ---------------- */
function StarRow({ n, size=14 }) {
  return (
    <span style={{display:'inline-flex', gap:1, color:'#F59E0B'}}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i<=n?'#F59E0B':'#E5E7EB'} stroke="none">
          <path d="M12 2l2.9 6 6.6.6-5 4.7 1.5 6.5L12 16.5 5.9 19.8l1.5-6.5-5-4.7L9 8.6 12 2z"/>
        </svg>
      ))}
    </span>
  );
}

function SourceBadge({ s, size=22 }) {
  const src = RV_SOURCES.find(x=>x.id===s);
  if (!src) return null;
  return (
    <span style={{
      width:size, height:size, borderRadius:6, background:src.color, color:'#fff',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontSize: size > 24 ? 13 : 11, fontWeight:800, flexShrink:0,
      fontFamily: src.id==='facebook' ? 'Georgia, serif' : 'inherit',
    }}>{src.icon}</span>
  );
}

function SentimentDot({ s }) {
  const m = { pos:{c:'#16A34A', l:'Tích cực'}, neg:{c:'#DC2626', l:'Tiêu cực'}, mix:{c:'#F59E0B', l:'Trung tính'} };
  const v = m[s] || m.mix;
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--label-02)'}}>
      <span style={{width:8, height:8, borderRadius:4, background:v.c}}/>
      {v.l}
    </span>
  );
}

/* ---------------- TOPBAR ---------------- */
function ReviewsTopbar({ tab, setTab, period, setPeriod }) {
  const counts = useRvMemo(()=>({
    all: RV_REVIEWS.length,
    pending: RV_REVIEWS.filter(r=>!r.replied).length,
    replied: RV_REVIEWS.filter(r=>r.replied).length,
    neg: RV_REVIEWS.filter(r=>r.stars<=2).length,
    pos: RV_REVIEWS.filter(r=>r.stars===5).length,
  }), []);
  return (
    <div className="topbar">
      <div className="title-block">
        <h1>Reviews & Reputation</h1>
        <span className="crumb">Tổng hợp đánh giá đa kênh · AI auto-reply · Theme analysis</span>
      </div>
      <span className="spacer"/>
      <select value={period} onChange={e=>setPeriod(e.target.value)} className="btn btn-ghost btn-sm" style={{paddingRight:8}}>
        <option value="7d">7 ngày qua</option>
        <option value="30d">30 ngày qua</option>
        <option value="90d">90 ngày qua</option>
        <option value="ytd">Từ đầu năm</option>
      </select>
      <button className="btn btn-ghost btn-sm"><Icon.Download/> Export</button>
      <button className="btn btn-ghost btn-sm"><Icon.Settings/> Cài đặt</button>
      <button className="btn btn-primary btn-sm"><Icon.Sparkles/> Auto-reply AI</button>
    </div>
  );
}

/* ---------------- KPI STRIP ---------------- */
function ReviewsKPIs() {
  const cards = [
    { l:'Điểm trung bình', v:'4.7', sub:'/ 5.0', delta:'+0.1', deltaUp:true, color:'#F59E0B' },
    { l:'Tổng review', v:'3,248', sub:'tất cả nguồn', delta:'+128 tháng này', deltaUp:true, color:'#2DC56A' },
    { l:'Tỷ lệ phản hồi', v:'92%', sub:'mục tiêu 95%', delta:'+4%', deltaUp:true, color:'#3B82F6' },
    { l:'Thời gian phản hồi', v:'2h 14m', sub:'trung bình', delta:'-38m', deltaUp:true, color:'#8B5CF6' },
    { l:'NPS', v:'68', sub:'rất tốt', delta:'+5', deltaUp:true, color:'#EC4899' },
    { l:'Cần xử lý', v:'4', sub:'review ≤ 2 sao', delta:'urgent', deltaUp:false, color:'#DC2626' },
  ];
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:12, padding:'14px 24px 0', background:'var(--bg-canvas)'}}>
      {cards.map(c => (
        <div key={c.l} style={{
          background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:'12px 14px',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{position:'absolute', top:0, left:0, width:3, height:'100%', background:c.color}}/>
          <div style={{fontSize:11, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.4, fontWeight:600}}>{c.l}</div>
          <div style={{display:'flex', alignItems:'baseline', gap:6, marginTop:4}}>
            <span style={{fontSize:24, fontWeight:800}}>{c.v}</span>
            <span style={{fontSize:12, color:'var(--label-02)'}}>{c.sub}</span>
          </div>
          <div style={{fontSize:11, color: c.deltaUp ? '#16A34A' : '#DC2626', fontWeight:600, marginTop:2}}>
            {c.deltaUp ? '↑ ' : '⚠ '}{c.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- TAB RAIL ---------------- */
function ReviewsTabRail({ tab, setTab, counts }) {
  return (
    <div style={{display:'flex', gap:6, padding:'12px 24px', borderBottom:'1px solid var(--fill-04)', background:'#fff'}}>
      {RV_TABS.map(t => (
        <button key={t.k} onClick={()=>setTab(t.k)} className={'btn btn-sm ' + (tab===t.k?'btn-primary':'btn-ghost')} style={{
          gap:6, ...(t.urgent && tab!==t.k ? {color:'#DC2626'} : {})
        }}>
          <span>{t.icon}</span>{t.l}
          <span style={{
            background: tab===t.k ? 'rgba(255,255,255,.25)' : 'var(--fill-03)',
            color: tab===t.k ? '#fff' : 'var(--label-02)',
            fontSize:11, fontWeight:700, padding:'1px 6px', borderRadius:8,
          }}>{counts[t.k] || 0}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- LEFT SOURCE RAIL ---------------- */
function SourceRail({ source, setSource, ratingFilter, setRatingFilter }) {
  return (
    <div style={{
      width:240, borderRight:'1px solid var(--fill-04)', background:'#FAFBFC',
      padding:'14px 12px', display:'flex', flexDirection:'column', gap:14, overflowY:'auto'
    }}>
      <div>
        <div style={{fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8, padding:'0 6px'}}>Nguồn đánh giá</div>
        {RV_SOURCES.map(s => (
          <button key={s.id} onClick={()=>setSource(s.id)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 8px',
            background: source===s.id ? '#fff' : 'transparent',
            border: source===s.id ? '1px solid var(--fill-04)' : '1px solid transparent',
            borderRadius:8, cursor:'pointer', marginBottom:2,
            boxShadow: source===s.id ? '0 1px 2px rgba(0,0,0,.04)' : 'none',
          }}>
            <SourceBadge s={s.id==='all' ? null : s.id}/>
            {s.id==='all' && <span style={{fontSize:14}}>🌐</span>}
            <span style={{fontSize:13, fontWeight: source===s.id ? 600 : 500, color:'var(--label-01)', flex:1, textAlign:'left'}}>{s.l}</span>
            {s.avg && (
              <span style={{fontSize:11, color:'var(--label-02)', display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                <span style={{color:'#F59E0B', fontWeight:700}}>★ {s.avg}</span>
                <span>{s.count}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        <div style={{fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8, padding:'0 6px'}}>Lọc theo sao</div>
        {[5,4,3,2,1].map(n => (
          <button key={n} onClick={()=>setRatingFilter(ratingFilter===n?0:n)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10, padding:'6px 8px',
            background: ratingFilter===n ? '#fff' : 'transparent',
            border: ratingFilter===n ? '1px solid var(--fill-04)' : '1px solid transparent',
            borderRadius:8, cursor:'pointer', marginBottom:2,
          }}>
            <StarRow n={n}/>
            <span style={{fontSize:12, color:'var(--label-02)', marginLeft:'auto'}}>
              {RV_REVIEWS.filter(r=>r.stars===n).length}
            </span>
          </button>
        ))}
      </div>

      <div>
        <div style={{fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8, padding:'0 6px'}}>Theme phổ biến</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:4, padding:'0 4px'}}>
          {RV_THEMES.slice(0,8).map(t => (
            <span key={t.tag} style={{
              fontSize:11, padding:'3px 8px', borderRadius:10,
              background: t.sentiment==='pos' ? '#DCFCE7' : t.sentiment==='neg' ? '#FEE2E2' : '#FEF3C7',
              color: t.sentiment==='pos' ? '#166534' : t.sentiment==='neg' ? '#991B1B' : '#92400E',
              fontWeight:500, cursor:'pointer',
            }}>
              {t.tag} <b style={{opacity:.7}}>{t.count}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- REVIEW LIST ---------------- */
function ReviewList({ reviews, selectedId, setSelectedId }) {
  if (!reviews.length) return (
    <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--label-02)', fontSize:13}}>
      Không có review nào khớp bộ lọc
    </div>
  );
  return (
    <div className="scroll" style={{flex:1, overflowY:'auto', background:'var(--bg-canvas)'}}>
      {reviews.map(r => {
        const sel = selectedId === r.id;
        return (
          <div key={r.id} onClick={()=>setSelectedId(r.id)} style={{
            background:'#fff', borderBottom:'1px solid var(--fill-04)',
            padding:'14px 18px', cursor:'pointer',
            borderLeft: sel ? '3px solid var(--pr)' : '3px solid transparent',
            background: sel ? '#F8FAFC' : '#fff',
          }}>
            <div style={{display:'flex', gap:12, alignItems:'flex-start'}}>
              <div style={{
                width:36, height:36, borderRadius:18, background:r.avatarBg, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, fontWeight:700, color:'var(--label-01)',
              }}>{r.avatar}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                  <span style={{fontSize:14, fontWeight:600}}>{r.name}</span>
                  <SourceBadge s={r.source} size={18}/>
                  <StarRow n={r.stars} size={13}/>
                  <span style={{fontSize:12, color:'var(--label-02)'}}>{r.time}</span>
                  {r.urgent && (
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:6,
                      background:'#FEE2E2', color:'#991B1B', textTransform:'uppercase',
                    }}>Urgent</span>
                  )}
                </div>
                <div style={{fontSize:12, color:'var(--label-02)', marginBottom:6}}>
                  {r.branch} {r.staff !== '—' && `· KTV ${r.staff}`} · {r.service}
                </div>
                <div style={{fontSize:13, lineHeight:1.55, color:'var(--label-01)', marginBottom:8}}>{r.content}</div>
                <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
                  <SentimentDot s={r.sentiment}/>
                  <span style={{color:'var(--label-03)', fontSize:11}}>·</span>
                  {r.aiTags.slice(0,4).map(t => (
                    <span key={t} style={{
                      fontSize:11, padding:'2px 7px', borderRadius:8,
                      background:'var(--fill-03)', color:'var(--label-02)',
                    }}>{t}</span>
                  ))}
                  <span style={{flex:1}}/>
                  {r.replied ? (
                    <span style={{fontSize:11, color:'#16A34A', fontWeight:600, display:'flex', gap:4, alignItems:'center'}}>
                      <Icon.Check/> Đã reply · {r.repliedBy}
                    </span>
                  ) : (
                    <span style={{fontSize:11, color:'#DC2626', fontWeight:600}}>Chưa phản hồi</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- DETAIL PANEL ---------------- */
function ReviewDetail({ review }) {
  const [tab, setTab] = useRv('reply');
  const [draft, setDraft] = useRv('');

  if (!review) return (
    <div style={{
      width:420, borderLeft:'1px solid var(--fill-04)', background:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
      gap:8, color:'var(--label-02)', fontSize:13, padding:24, textAlign:'center'
    }}>
      <Icon.Chat style={{width:48, height:48, opacity:.3}}/>
      <div>Chọn 1 review từ danh sách</div>
      <div style={{fontSize:11}}>để xem chi tiết & reply với gợi ý từ Claude Cowork</div>
    </div>
  );

  return (
    <div style={{
      width:420, borderLeft:'1px solid var(--fill-04)', background:'#fff',
      display:'flex', flexDirection:'column', overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{padding:'16px 18px', borderBottom:'1px solid var(--fill-04)'}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
          <div style={{
            width:40, height:40, borderRadius:20, background:review.avatarBg,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, fontWeight:700,
          }}>{review.avatar}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:14, fontWeight:600}}>{review.name}</div>
            <div style={{fontSize:11, color:'var(--label-02)', display:'flex', alignItems:'center', gap:6}}>
              <SourceBadge s={review.source} size={14}/>
              {RV_SOURCES.find(s=>s.id===review.source)?.l} · {review.time}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm"><Icon.More/></button>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
          <StarRow n={review.stars} size={18}/>
          <span style={{fontSize:14, fontWeight:700}}>{review.stars}.0</span>
          <SentimentDot s={review.sentiment}/>
        </div>
        <div style={{fontSize:13, lineHeight:1.6, color:'var(--label-01)', padding:'10px 12px', background:'var(--fill-02)', borderRadius:8, marginBottom:10}}>
          "{review.content}"
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
          {review.aiTags.map(t => (
            <span key={t} style={{
              fontSize:11, padding:'2px 7px', borderRadius:8,
              background:'#EFF6FF', color:'#1D4ED8',
            }}>#{t}</span>
          ))}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12, fontSize:11}}>
          <div><span style={{color:'var(--label-02)'}}>Chi nhánh:</span> <b>{review.branch}</b></div>
          <div><span style={{color:'var(--label-02)'}}>Dịch vụ:</span> <b>{review.service}</b></div>
          {review.staff !== '—' && <div><span style={{color:'var(--label-02)'}}>KTV:</span> <b>{review.staff}</b></div>}
          <div><span style={{color:'var(--label-02)'}}>Ngôn ngữ:</span> <b>{review.lang.toUpperCase()}</b></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:0, borderBottom:'1px solid var(--fill-04)', padding:'0 18px'}}>
        {[
          { k:'reply', l:'Phản hồi', icon: <Icon.Send/> },
          { k:'history', l:'Lịch sử', icon: <Icon.Activity/> },
          { k:'customer', l:'Khách hàng', icon: <Icon.User/> },
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            background:'none', border:'none', padding:'10px 12px', cursor:'pointer',
            fontSize:13, fontWeight: tab===t.k ? 600 : 500,
            color: tab===t.k ? 'var(--pr)' : 'var(--label-02)',
            borderBottom: tab===t.k ? '2px solid var(--pr)' : '2px solid transparent',
            display:'flex', alignItems:'center', gap:6, marginBottom:-1,
          }}>{t.icon}{t.l}</button>
        ))}
      </div>

      {/* Content */}
      <div className="scroll" style={{flex:1, overflowY:'auto', padding:'16px 18px'}}>
        {tab==='reply' && (
          <>
            {review.replied ? (
              <div style={{
                background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10,
                padding:'12px 14px', marginBottom:14,
              }}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                  <span style={{fontSize:11, fontWeight:700, color:'#166534', textTransform:'uppercase', letterSpacing:.4}}>Đã phản hồi</span>
                  <span style={{fontSize:11, color:'var(--label-02)'}}>· {review.repliedBy} · {review.repliedAt}</span>
                </div>
                <div style={{fontSize:13, lineHeight:1.55, color:'var(--label-01)'}}>{review.reply}</div>
              </div>
            ) : (
              <>
                <div style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                  background:'linear-gradient(90deg, #FEF3C7 0%, #FECACA 100%)',
                  borderRadius:10, marginBottom:14,
                }}>
                  <span style={{fontSize:18}}>⚡</span>
                  <div style={{flex:1, fontSize:12, color:'#92400E', fontWeight:500}}>
                    {review.urgent ? 'Review tiêu cực — cần phản hồi trong 4h' : 'Đang chờ phản hồi'}
                  </div>
                </div>
              </>
            )}

            {!review.replied && review.aiSuggest.length > 0 && (
              <>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                  <Icon.Sparkles style={{color:'#8B5CF6'}}/>
                  <span style={{fontSize:13, fontWeight:600}}>Claude Cowork gợi ý reply</span>
                  <span style={{flex:1}}/>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:11}}><Icon.Refresh/> Tạo lại</button>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:14}}>
                  {review.aiSuggest.map((s, i) => (
                    <div key={i} onClick={()=>setDraft(s)} style={{
                      padding:'10px 12px', border:'1px solid var(--fill-04)', borderRadius:10, cursor:'pointer',
                      background: draft===s ? '#F0F9FF' : '#fff',
                      borderColor: draft===s ? '#3B82F6' : 'var(--fill-04)',
                    }}>
                      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:6}}>
                        <span style={{
                          fontSize:10, fontWeight:700, color:'#8B5CF6', textTransform:'uppercase', letterSpacing:.4,
                          padding:'2px 6px', background:'#F3E8FF', borderRadius:5,
                        }}>Phương án {i+1}</span>
                        {i===0 && <span style={{fontSize:10, color:'#16A34A', fontWeight:600}}>· Khuyến nghị</span>}
                        {i===2 && review.urgent && <span style={{fontSize:10, color:'#DC2626', fontWeight:600}}>· Đền bù mạnh</span>}
                      </div>
                      <div style={{fontSize:12.5, lineHeight:1.55, color:'var(--label-01)'}}>{s}</div>
                    </div>
                  ))}
                </div>

                <div style={{fontSize:12, fontWeight:600, marginBottom:6, color:'var(--label-02)'}}>Soạn phản hồi</div>
                <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Click 1 phương án ở trên hoặc tự soạn..." style={{
                  width:'100%', minHeight:110, padding:'10px 12px', fontSize:13, fontFamily:'inherit',
                  border:'1px solid var(--fill-04)', borderRadius:10, resize:'vertical', lineHeight:1.5,
                }}/>
                <div style={{display:'flex', alignItems:'center', gap:6, marginTop:8}}>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:11}}><Icon.Image/> Đính kèm</button>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:11}}><Icon.Tag/> Template</button>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>{(Icon.Translate||Icon.Globe)({})} Dịch</button>
                  <span style={{flex:1}}/>
                  <button className="btn btn-primary btn-sm" disabled={!draft}><Icon.Send/> Gửi</button>
                </div>
              </>
            )}
          </>
        )}

        {tab==='history' && (
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            <div style={{fontSize:12, color:'var(--label-02)', marginBottom:4}}>Lịch sử trên review này</div>
            {[
              { t:review.time, e:'Review được nhận', icon:'📥' },
              { t:'1 phút sau', e:'AI phân loại sentiment + theme', icon:'🤖' },
              ...(review.urgent ? [{ t:'5 phút sau', e:'Cảnh báo gửi tới #escalation-reviews', icon:'🔔' }] : []),
              ...(review.replied ? [{ t:review.repliedAt, e:`Phản hồi bởi ${review.repliedBy}`, icon:'✅' }] : []),
            ].map((h, i) => (
              <div key={i} style={{display:'flex', gap:10, padding:'8px 10px', background:'var(--fill-02)', borderRadius:8}}>
                <span style={{fontSize:14}}>{h.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13}}>{h.e}</div>
                  <div style={{fontSize:11, color:'var(--label-02)'}}>{h.t}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='customer' && (
          <div>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14}}>
              <div style={{
                width:48, height:48, borderRadius:24, background:review.avatarBg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, fontWeight:700,
              }}>{review.avatar}</div>
              <div>
                <div style={{fontSize:14, fontWeight:600}}>{review.name}</div>
                <div style={{fontSize:12, color:'var(--label-02)'}}>Khách hàng Gold · 8 buổi đã sử dụng</div>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              {[
                { l:'LTV', v:'18.2tr' },
                { l:'Combo active', v:'1' },
                { l:'Lần ghé gần nhất', v:'3 ngày' },
                { l:'Hạng', v:'Gold' },
                { l:'Điểm thưởng', v:'2,840' },
                { l:'Reviews trước đây', v:'5 ★ trung bình 4.6' },
              ].map(s => (
                <div key={s.l} style={{padding:'8px 10px', background:'var(--fill-02)', borderRadius:8}}>
                  <div style={{fontSize:11, color:'var(--label-02)'}}>{s.l}</div>
                  <div style={{fontSize:13, fontWeight:600}}>{s.v}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{width:'100%', marginTop:12}}>Xem profile khách hàng đầy đủ →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- MAIN ---------------- */
function ReviewsModule() {
  const [tab, setTab] = useRv('all');
  const [period, setPeriod] = useRv('30d');
  const [source, setSource] = useRv('all');
  const [ratingFilter, setRatingFilter] = useRv(0);
  const [selectedId, setSelectedId] = useRv('r2'); // urgent neg by default

  const filtered = useRvMemo(() => {
    return RV_REVIEWS.filter(r => {
      if (source !== 'all' && r.source !== source) return false;
      if (ratingFilter && r.stars !== ratingFilter) return false;
      if (tab === 'pending' && r.replied) return false;
      if (tab === 'replied' && !r.replied) return false;
      if (tab === 'neg' && r.stars > 2) return false;
      if (tab === 'pos' && r.stars < 5) return false;
      return true;
    });
  }, [tab, source, ratingFilter]);

  const counts = {
    all: RV_REVIEWS.length,
    pending: RV_REVIEWS.filter(r=>!r.replied).length,
    replied: RV_REVIEWS.filter(r=>r.replied).length,
    neg: RV_REVIEWS.filter(r=>r.stars<=2).length,
    pos: RV_REVIEWS.filter(r=>r.stars===5).length,
  };

  const selected = filtered.find(r => r.id === selectedId) || filtered[0];

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-canvas)'}}>
      <ReviewsTopbar tab={tab} setTab={setTab} period={period} setPeriod={setPeriod}/>
      <ReviewsKPIs/>
      <ReviewsTabRail tab={tab} setTab={setTab} counts={counts}/>
      <div style={{display:'flex', flex:1, overflow:'hidden'}}>
        <SourceRail source={source} setSource={setSource} ratingFilter={ratingFilter} setRatingFilter={setRatingFilter}/>
        <ReviewList reviews={filtered} selectedId={selected?.id} setSelectedId={setSelectedId}/>
        <ReviewDetail review={selected}/>
      </div>
    </div>
  );
}

window.ReviewsModule = ReviewsModule;
