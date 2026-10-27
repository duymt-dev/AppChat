/* ============================================================
   omi-assistant.jsx — Trợ lý AI "Omi"
   Trang chat trợ lý chiến lược: mascot · lời chào · ô nhập lớn
   · 5 chế độ · gợi ý theo chế độ · chat hiển thị trong khung
   ============================================================ */
;(function(){
try {
const { useState: useOm, useRef: useOmRef, useEffect: useOmEf } = React;
const OmI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };

/* ---------- Mascot Omi (robot tròn, chớp mắt) ---------- */
function OmiMascot({ size=92, talking }){
  const [blink, setBlink] = useOm(false);
  useOmEf(()=>{ let t; const loop=()=>{ t=setTimeout(()=>{ setBlink(true); setTimeout(()=>setBlink(false), 150); loop(); }, 2200+Math.random()*2600); }; loop(); return ()=>clearTimeout(t); },[]);
  const eyeH = blink ? 1.5 : 11;
  return (
    <div style={{width:size, height:size, position:'relative'}}>
      <svg viewBox="0 0 100 100" style={{width:'100%', height:'100%', filter:'drop-shadow(0 8px 20px rgba(20,160,140,.28))'}}>
        <defs>
          <radialGradient id="omiFace" cx="38%" cy="32%" r="80%"><stop offset="0" stopColor="#3FD9C0"/><stop offset="55%" stopColor="#1FB9A6"/><stop offset="100%" stopColor="#0E9B7E"/></radialGradient>
        </defs>
        {/* antenna */}
        <line x1="50" y1="9" x2="50" y2="20" stroke="#0E9B7E" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="50" cy="7" r="4" fill="#2DC56A"><animate attributeName="opacity" values="1;.4;1" dur="1.6s" repeatCount="indefinite"/></circle>
        {/* head */}
        <rect x="14" y="18" width="72" height="64" rx="30" fill="url(#omiFace)"/>
        {/* cheeks */}
        <circle cx="30" cy="58" r="6" fill="#FF9F8A" opacity=".55"/>
        <circle cx="70" cy="58" r="6" fill="#FF9F8A" opacity=".55"/>
        {/* eyes */}
        <rect x="31" y={50-eyeH/2} width="11" height={eyeH} rx="5.5" fill="#0B3D34" style={{transition:'all .12s'}}/>
        <rect x="58" y={50-eyeH/2} width="11" height={eyeH} rx="5.5" fill="#0B3D34" style={{transition:'all .12s'}}/>
        <circle cx="35" cy="47" r="2" fill="#fff" opacity=".9"/>
        <circle cx="62" cy="47" r="2" fill="#fff" opacity=".9"/>
        {/* mouth */}
        {talking
          ? <ellipse cx="50" cy="66" rx="7" ry="5" fill="#0B3D34"><animate attributeName="ry" values="5;2;5" dur=".4s" repeatCount="indefinite"/></ellipse>
          : <path d="M42 65 Q50 72 58 65" stroke="#0B3D34" strokeWidth="3" fill="none" strokeLinecap="round"/>}
      </svg>
    </div>
  );
}

const OMI_MODES = [
  { k:'suggest', l:'Gợi ý',      ic:'Sparkles', c:'#2DC56A' },
  { k:'mkt',     l:'Marketing',  ic:'Broadcast', c:'#2A6FDB' },
  { k:'sale',    l:'Sale',       ic:'TrendUp',  c:'#1B9E5A' },
  { k:'cskh',    l:'CSKH',       ic:'Chat',     c:'#C9820B' },
  { k:'ops',     l:'Vận hành',   ic:'Activity', c:'#6E48E6' },
];
const OMI_PROMPTS = {
  suggest: ['Tóm tắt tình hình kinh doanh hôm nay','Khách nào cần chăm sóc gấp?','Đề xuất 3 việc nên làm ngay','Có bất thường nào trong dữ liệu không?'],
  mkt:     ['Gợi ý chiến dịch cho nhóm VIP đang nguội','Soạn nội dung ZNS ưu đãi hè','Phân khúc khách tiềm năng nhất tháng này','Kênh nào đang có ROI tốt nhất?'],
  sale:    ['Deal nào sắp chốt cần đẩy?','Soạn lời chào lại khách bỏ giỏ hàng','Dự báo doanh thu cuối tháng','Top sản phẩm bán chạy tuần qua'],
  cskh:    ['Ticket nào sắp quá hạn SLA?','Khách hàng nào CSAT thấp cần gọi lại?','Soạn câu trả lời cho khiếu nại giao hàng','Tỷ lệ AI tự xử lý tuần này'],
  ops:     ['Phân ca trực tối nay ai phụ trách?','Hiệu suất từng nhân viên tuần qua','Cảnh báo vận hành cần lưu ý','Tổng quan KPI phòng ban'],
};
const GO_LABEL = { automation:'AI Agents', workflow:'Workflow', broadcast:'Marketing', rep_exec:'Báo cáo', activities:'Tickets', quotes:'Báo giá', contracts:'Hợp đồng', orders:'Đơn hàng', booking:'Lịch hẹn', loyalty:'Loyalty', contacts:'Khách hàng' };
const OMI_INTENT = (text)=>{
  const t=(text||'').toLowerCase();
  if(/báo giá|báo gía|quote|chào giá/.test(t)) return {type:'create_quote', go:'quotes', ic:'FileText', c:'#C9820B', title:'Báo giá do AppChat AI soạn', quote:true,
    cust:/lan/.test(t)?'Chị Lan':/quân/.test(t)?'Anh Quân':'Khách hàng',
    lines:[{n: /niềng|invisalign|nha/.test(t)?'Niềng Invisalign toàn hàm':/spa|da|trị liệu/.test(t)?'Trị liệu da chuyên sâu (8 buổi)':'Gói dịch vụ tiêu chuẩn', q:1, p:/niềng|invisalign|nha/.test(t)?45000000:4000000},{n:'Tư vấn + chụp/khám', q:1, p:500000}],
    vip:/vip|thân thiết|kim cương/.test(t), voucher:/voucher|mã|skin15|ưu đãi/.test(t), inst:/trả góp|góp/.test(t),
    desc:'AppChat lấy giá từ danh mục, áp ưu đãi & voucher, tính VAT — anh duyệt rồi chốt sang Hợp đồng.'};
  if(/tạo.*agent|agent.*csk|trợ lý ai|tạo ai/.test(t)) return {type:'create_agent', go:'automation', ic:'Sparkles', c:'#0E9B7E', title:'Tạo AI Agent', desc:'AppChat sẽ tạo AI Agent CSKH (Claude Sonnet) gắn kênh Zalo OA + Facebook, ngưỡng tin cậy 80%.'};
  if(/workflow|quy trình|tự động hoá|nhắc tái khám/.test(t)) return {type:'create_workflow', go:'workflow', ic:'Workflow', c:'#6E48E6', title:'Dựng Workflow', desc:'AppChat sẽ dựng workflow “Nhắc tái khám”: trigger đến kỳ → gửi Zalo → AI nhắc lần 2 → mục tiêu đặt lịch.'};
  if(/chiến dịch|zns|broadcast|gửi tin/.test(t)) return {type:'create_campaign', go:'broadcast', ic:'Broadcast', c:'#DB2777', title:'Tạo chiến dịch Marketing', desc:'AppChat sẽ tạo chiến dịch ZNS win-back cho 12 khách VIP nguội, chờ anh duyệt trước khi gửi.'};
  if(/báo cáo|report|xuất|thống kê doanh thu/.test(t)) return {type:'create_report', go:'rep_exec', ic:'Reports', c:'#2563EB', title:'Xuất báo cáo', desc:'AppChat sẽ tổng hợp báo cáo doanh thu tuần (theo kênh + nhân viên) và mở trang Executive Dashboard.'};
  if(/giao việc|tạo task|nhắc việc|phân công/.test(t)) return {type:'create_task', go:'activities', ic:'Activity', c:'#C9820B', title:'Tạo công việc', desc:'AppChat sẽ tạo task follow-up giao cho người phụ trách, hạn hôm nay.'};
  return null;
};
const OMI_RESULT = (text)=>{
  const t=(text||'').toLowerCase();
  if(/doanh thu|dự báo|deal|chốt/.test(t)) return {kind:'stat', title:'Doanh thu & pipeline', items:[{l:'Doanh thu',v:'44 tr',d:'+18%'},{l:'Pipeline Proposal',v:'128 tr',d:'6 deal'},{l:'Dự báo tháng',v:'312–340 tr',d:'78%'}]};
  if(/chăm sóc|nguội|cần gọi|vip/.test(t)) return {kind:'list', title:'Khách cần chăm sóc', rows:[['Chị Lan','VIP · 60 ngày'],['Cô Thu Hà','Vàng · CSAT 3.2'],['Anh Đức Anh','45 ngày im lặng']]};
  if(/ticket|sla|csat/.test(t)) return {kind:'stat', title:'Ticket & SLA', items:[{l:'Sắp chạm SLA',v:'8',d:'1 giờ'},{l:'CSAT TB',v:'4.7/5',d:'▲2%'},{l:'Quá hạn',v:'18',d:'-12%'}]};
  return null;
};
const OMI_REPLY = (text, mode)=>{
  const t=(text||'').toLowerCase();
  if(/tóm tắt|tình hình|hôm nay/.test(t)) return 'Hôm nay workspace có **177 hội thoại** (▲12%), **42 đang chờ xử lý** — cao hơn mức trung bình. Doanh thu attributed ~**44 triệu** (▲18%). AI tự xử lý đạt **63%**. Em đề xuất bổ sung agent khung 10–11h và ưu tiên 8 ticket sắp quá SLA. Anh muốn em mở danh sách ticket đó không?';
  if(/chăm sóc|nguội|cần gọi/.test(t)) return 'Em lọc được **12 khách VIP** 60 ngày chưa tương tác và **5 khách CSAT < 3.5**. Nhóm này đóng góp ~38% doanh thu kỳ trước. Em có thể tạo sẵn chiến dịch win-back qua Zalo ZNS + phân công cho đội Sale. Anh duyệt em chạy nhé?';
  if(/chiến dịch|zns|nội dung|soạn/.test(t)) return 'Gợi ý nội dung ZNS: *"Chào anh/chị 👋 Ưu đãi hè -20% cho bộ sưu tập mới, áp dụng đến hết Chủ nhật. Nhắn OMI để được tư vấn phối đồ miễn phí!"* — em ước tính CTR ~24%. Anh muốn em A/B test 2 phiên bản tiêu đề không?';
  if(/deal|chốt|doanh thu|dự báo/.test(t)) return 'Pipeline đang có **6 deal** ở giai đoạn Proposal (~**128 triệu**). 2 deal quá hạn follow-up >2 ngày. Dự báo doanh thu cuối tháng: **312–340 triệu** (xác suất 78%). Em nên nhắc đội Sale follow 2 deal nóng trước chứ ạ?';
  if(/ticket|sla|csat|khiếu nại/.test(t)) return 'Hiện có **8 ticket** sắp chạm SLA (trong 1 giờ tới), tập trung ở danh mục *Giao hàng*. CSAT trung bình **4.7/5**. Em đề xuất escalation 3 ticket ưu tiên Cao cho trưởng nhóm CSKH. Anh muốn xem chi tiết không?';
  if(/ca trực|phân ca|nhân viên|kpi|phòng ban/.test(t)) return 'Tối nay (18–22h) **Minh** trực kênh Web + Hotline, ngoài giờ **AI Agent** tự xử lý. Hiệu suất tuần: Hương dẫn đầu (312 hội thoại, CSAT 4.9). Phòng Kinh doanh đạt **86% KPI** quý. Anh cần em xuất báo cáo chi tiết không?';
  return 'Em đã hiểu yêu cầu của anh. Dựa trên dữ liệu CRM, marketing và bán hàng hiện có, em sẽ phân tích và đề xuất phương án cụ thể. Anh cho em thêm chút ngữ cảnh (kênh, khoảng thời gian, nhóm khách) để em tư vấn chính xác hơn nhé.';
};

function OmiAssistantModule(){
  const [mode, setMode] = useOm('suggest');
  const [msgs, setMsgs] = useOm([]);     // {role, text}
  const [val, setVal] = useOm('');
  const [typing, setTyping] = useOm(false);
  const [rec, setRec] = useOm(false);
  const [atts, setAtts] = useOm([]);   // {kind, name}
  const [attMenu, setAttMenu] = useOm(false);
  const [tplMenu, setTplMenu] = useOm(false);
  const [panelOpen, setPanelOpen] = useOm(false);
  const [scheds, setScheds] = useOm([{t:'Mỗi sáng 8h · tóm tắt khách cần follow', on:true},{t:'Thứ 2 hàng tuần · báo cáo doanh thu', on:true}]);
  const OMI_TEMPLATES = [
    'Tóm tắt tình hình kinh doanh hôm nay',
    'Khách nào cần chăm sóc gấp hôm nay?',
    'Dự báo doanh thu cuối tháng',
    'Soạn kịch bản ZNS nhắc tái khám',
    'Ticket nào sắp quá SLA?',
  ];
  const [panelTab, setPanelTab] = useOm('chats');
  useOmEf(()=>{ const h=()=>{ if(window.__omiTab){ setPanelTab(window.__omiTab); setPanelOpen(true); window.__omiTab=null; } }; h(); window.addEventListener('ac-omi-tab',h); return ()=>window.removeEventListener('ac-omi-tab',h); }, []);
  const OMI_SESSIONS = [
    {t:'Khách cần chăm sóc gấp hôm nay', time:'10:24', n:6},
    {t:'Soạn kịch bản ZNS nhắc tái khám', time:'Hôm qua', n:4},
    {t:'Phân tích doanh thu tuần này', time:'Hôm qua', n:8},
    {t:'Tạo AI Agent CSKH cho Spa', time:'2 ngày trước', n:5},
  ];
  const [actions, setActions] = useOm([
    {ic:'Sparkles', c:'#0E9B7E', t:'Tạo AI Agent “CSKH Spa”', s:'Đã tạo · 10:21', go:'automation', undone:false},
    {ic:'Workflow', c:'#6E48E6', t:'Dựng workflow “Nhắc tái khám”', s:'Đã tạo · 09:48', go:'workflow', undone:false},
    {ic:'Broadcast', c:'#DB2777', t:'Chiến dịch ZNS Flash Sale', s:'Chờ duyệt · 09:30', go:'broadcast', undone:false},
    {ic:'Reports', c:'#2563EB', t:'Báo cáo doanh thu tuần', s:'Đã xuất · Hôm qua', go:'rep_exec', undone:false},
    {ic:'Activity', c:'#C9820B', t:'Giao việc cho Trâm', s:'Đã tạo · Hôm qua', go:'activities', undone:false},
  ]);
  const undoAction = (i)=> setActions(a=>a.map((x,j)=> j===i?{...x, undone:true}:x));
  const redoAction = (i)=> setActions(a=>a.map((x,j)=> j===i?{...x, undone:false}:x));
  const fileRef = useOmRef(null);
  const imgRef = useOmRef(null);
  const addAtt = (kind, name)=> setAtts(a=>[...a, {kind, name}]);
  const onPick = (kind)=> (e)=>{ const f=e.target.files&&e.target.files[0]; if(f) addAtt(kind, f.name); e.target.value=''; };
  const endRef = useOmRef(null);
  const started = msgs.length>0;
  useOmEf(()=>{ endRef.current && endRef.current.scrollIntoView && endRef.current.scrollIntoView({block:'end', behavior:'smooth'}); }, [msgs, typing]);

  const send = (q)=>{
    const text=(q!=null?q:val).trim(); if(!text && atts.length===0) return;
    const body = text || (atts.length?('Đã đính kèm '+atts.length+' mục'):'');
    setMsgs(m=>[...m, {role:'user', text:body, atts:atts.slice()}]); setVal(''); setAtts([]); setTyping(true);
    const intent = OMI_INTENT(text);
    const guided = /soạn.*kịch bản|kịch bản zns|nhắc tái khám|soạn.*zns|tạo.*luồng/i.test(text);
    const vague = !intent && !guided && text && text.split(/\s+/).length<=3 && !/tóm tắt|tình hình|hôm nay|chăm sóc|ticket|sla|doanh thu|deal/i.test(text);
    setTimeout(()=>{ setTyping(false);
      if(guided){ setMsgs(m=>[...m, {role:'omi', text:'Em đề xuất luồng **ZNS nhắc tái khám** như sau:\n\n1. Kích hoạt: khách đến kỳ tái khám (theo lịch đã lưu)\n2. Gửi ZNS nhắc lần 1 + nút “Đặt lịch ngay”\n3. Chờ 2 ngày — nếu chưa đặt, AI nhắc lần 2 (cá nhân hoá)\n4. Mục tiêu: khách đặt lịch tái khám\n\nAnh muốn tiếp tục theo luồng này, điều chỉnh, hay dùng lại luồng cũ?', guided:{step:1}}]); return; }
      if(vague){ setMsgs(m=>[...m, {role:'omi', text:'Để em hiểu đúng ý anh và trả kết quả chính xác, anh bổ sung giúp em vài thông tin sau:\n\n1. Đối tượng — khách hàng, nhóm khách hay kênh nào?\n2. Khoảng thời gian — hôm nay, tuần này hay theo quý?\n3. Mục tiêu — phân tích số liệu, soạn nội dung, hay tạo mới (AI Agent / chiến dịch / báo cáo)?\n\nAnh gõ lại yêu cầu đầy đủ hơn theo 3 ý trên để em xử lý chính xác nhất ạ.'}]); return; }
      if(intent){ setMsgs(m=>[...m, {role:'omi', text:'Em đã hiểu yêu cầu. AppChat chuẩn bị thực thi — anh xác nhận giúp em nhé:', action:intent, status:'pending'}]); }
      else {
        const full = OMI_REPLY(text||'tài liệu đính kèm', mode);
        const res = OMI_RESULT(text);
        const idx = {v:0};
        setMsgs(m=>{ idx.v=m.length; return [...m, {role:'omi', text:'', stream:true}]; });
        let i=0; const step=()=>{ i+=Math.max(2, Math.round(full.length/60));
          const slice=full.slice(0,i);
          setMsgs(m=>m.map((x,j)=> j===idx.v?{...x, text:slice}:x));
          if(i<full.length){ setTimeout(step, 26); }
          else { setMsgs(m=>m.map((x,j)=> j===idx.v?{...x, text:full, stream:false, result:res}:x)); }
        };
        setTimeout(step, 30);
      }
    }, 650);
  };
  const confirmAction = (idx)=>{ setMsgs(m=>m.map((x,i)=> i===idx?{...x, status:'done'}:x)); };
  const cancelAction = (idx)=>{ setMsgs(m=>m.map((x,i)=> i===idx?{...x, status:'cancelled'}:x)); };
  const guidedNext = (idx, choice)=>{
    setMsgs(m=>m.map((x,i)=> i===idx?{...x, guided:{...x.guided, done:choice}}:x));
    setTyping(true);
    setTimeout(()=>{ setTyping(false);
      if(choice==='adjust'){ setMsgs(m=>[...m, {role:'omi', text:'Vâng, anh mô tả giúp em phần cần điều chỉnh nhé (ví dụ: số bước, thời gian chờ, nội dung tin, kênh gửi). Em sẽ cập nhật luồng đúng ý anh rồi xác nhận lại trước khi tạo.'}]); return; }
      if(choice==='reuse'){ setMsgs(m=>[...m, {role:'omi', text:'Em tìm thấy 2 luồng cũ tương tự:\n\n1. “Nhắc tái khám — Nha khoa” (đang chạy · 842 lượt)\n2. “Chăm sóc sau dịch vụ” (bản nháp)\n\nAnh muốn nhân bản luồng nào để chỉnh sửa, hay quay lại tạo luồng mới?'}]); return; }
      // choice === 'go' → preview + ask final adjust
      setMsgs(m=>[...m, {role:'omi', text:'Tuyệt! Em đã dựng sẵn luồng. Trước khi tạo chính thức, anh kiểm tra lại — có cần điều chỉnh gì không?', guided2:{step:2}}]);
    }, 700);
  };
  const guidedExecute = (idx, ok)=>{
    setMsgs(m=>m.map((x,i)=> i===idx?{...x, guided2:{...x.guided2, done: ok?'exec':'edit'}}:x));
    if(!ok){ setTyping(true); setTimeout(()=>{ setTyping(false); setMsgs(m=>[...m, {role:'omi', text:'Vâng, anh cho em biết cần sửa phần nào của luồng để em cập nhật lại nhé.'}]); }, 600); return; }
    setTyping(true); setTimeout(()=>{ setTyping(false);
      setMsgs(m=>[...m, {role:'omi', text:'Đã xác nhận. Em tiến hành tạo luồng ngay:', action:{type:'create_workflow', go:'workflow', ic:'Workflow', c:'#6E48E6', title:'Tạo Workflow ZNS nhắc tái khám', desc:'4 bước: kích hoạt → ZNS lần 1 → chờ 2 ngày → AI nhắc lần 2 → mục tiêu đặt lịch.'}, status:'pending'}]);
    }, 800);
  };
  const renderRich = (s)=> (s||'').split('\n').map((line, li)=> (
    <div key={li} style={{minHeight: line.trim()===''? '8px':'auto'}}>
      {line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p,i)=>{
        if(/^\*\*.+\*\*$/.test(p)) return <b key={i}>{p.slice(2,-2)}</b>;
        if(/^\*.+\*$/.test(p)) return <i key={i}>{p.slice(1,-1)}</i>;
        return p;
      })}
    </div>
  ));

  const composer = (
    <div style={{width:'100%', maxWidth:680, margin:'0 auto'}}>
      <div style={{border:'1.5px solid var(--fill-04)', borderRadius:18, background:'white', boxShadow:'0 4px 18px rgba(17,24,39,.06)', padding:'10px 12px 8px'}}>
        <input ref={fileRef} type="file" style={{display:'none'}} onChange={onPick('file')}/>
        <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={onPick('image')}/>
        {atts.length>0 && <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:8}}>
          {atts.map((a,i)=>(
            <span key={i} style={{display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px 4px 9px', borderRadius:9, background:'var(--fill-02)', border:'1px solid var(--fill-04)', fontSize:11.5, fontWeight:600, color:'var(--label-01)'}}>
              {OmI(a.kind==='image'?'Image':a.kind==='email'?'Mail':a.kind==='drive'?'Cloud':'Paperclip',{style:{width:13,height:13, color:'var(--label-02)'}})}
              <span style={{maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{a.name}</span>
              <button onClick={()=>setAtts(x=>x.filter((_,j)=>j!==i))} style={{border:'none', background:'transparent', cursor:'pointer', color:'var(--label-03)', padding:0, lineHeight:1, fontSize:14}}>×</button>
            </span>
          ))}
        </div>}
        {val==='/' || /\/$/.test(val) ? null : null}
        {(val.startsWith('/')) && (()=>{ const q=val.slice(1).toLowerCase(); const CMDS=[
            {c:'/tạo-agent', l:'Tạo AI Agent', ic:'Sparkles', col:'#0E9B7E', fill:'Tạo AI Agent CSKH cho Spa'},
            {c:'/workflow', l:'Dựng Workflow', ic:'Workflow', col:'#6E48E6', fill:'Dựng workflow nhắc tái khám'},
            {c:'/chiến-dịch', l:'Tạo chiến dịch Marketing', ic:'Broadcast', col:'#DB2777', fill:'Tạo chiến dịch ZNS win-back khách VIP'},
            {c:'/báo-cáo', l:'Xuất báo cáo', ic:'Reports', col:'#2563EB', fill:'Xuất báo cáo doanh thu tuần này'},
            {c:'/giao-việc', l:'Giao việc / Task', ic:'Activity', col:'#C9820B', fill:'Giao việc follow-up cho người phụ trách'},
          ].filter(x=> !q || x.c.includes(q) || x.l.toLowerCase().includes(q));
          if(CMDS.length===0) return null;
          return (
            <div style={{border:'1px solid var(--fill-04)', borderRadius:11, boxShadow:'0 12px 30px rgba(17,24,39,.14)', padding:5, marginBottom:8, background:'white'}}>
              <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--label-03)', padding:'5px 9px 6px'}}>Lệnh nhanh</div>
              {CMDS.map(cmd=>(
                <button key={cmd.c} onClick={()=>{ setVal(cmd.fill); }} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 9px', border:'none', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit', background:'transparent'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{width:28,height:28,borderRadius:8,background:cmd.col+'18',color:cmd.col,display:'grid',placeItems:'center',flexShrink:0}}>{OmI(cmd.ic,{style:{width:14,height:14}})}</span>
                  <span style={{minWidth:0}}><span style={{display:'block',fontSize:12.5,fontWeight:700,color:'var(--label-01)'}}>{cmd.l}</span><span style={{display:'block',fontSize:10.5,color:'var(--label-03)',fontFamily:'monospace'}}>{cmd.c}</span></span>
                </button>
              ))}
            </div>
          );
        })()}
        {(/(^|\s)@(\S*)$/.test(val)) && (()=>{ const mq=(val.match(/@(\S*)$/)||[])[1]?.toLowerCase()||''; const MENT=[
            {n:'Chị Lan', d:'VIP · Kim cương', ic:'Users', col:'#6E48E6'},
            {n:'Cô Thu Hà', d:'Vàng · CSAT 3.2', ic:'Users', col:'#F59E0B'},
            {n:'Anh Đức Anh', d:'45 ngày im lặng', ic:'Users', col:'#64748B'},
            {n:'Flash Sale ZNS', d:'Chiến dịch · đang chạy', ic:'Broadcast', col:'#DB2777'},
            {n:'Nhắc tái khám', d:'Workflow · 842 lượt', ic:'Workflow', col:'#6E48E6'},
            {n:'Phòng CSKH', d:'Đơn vị · 12 người', ic:'Activity', col:'#0E9B7E'},
          ].filter(x=> !mq || x.n.toLowerCase().includes(mq));
          if(MENT.length===0) return null;
          return (
            <div style={{border:'1px solid var(--fill-04)', borderRadius:11, boxShadow:'0 12px 30px rgba(17,24,39,.14)', padding:5, marginBottom:8, background:'white'}}>
              <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--label-03)', padding:'5px 9px 6px'}}>Tham chiếu dữ liệu</div>
              {MENT.map(it=>(
                <button key={it.n} onClick={()=>{ setVal(v=>v.replace(/@(\S*)$/, '@'+it.n+' ')); }} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 9px', border:'none', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit', background:'transparent'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{width:28,height:28,borderRadius:8,background:it.col+'18',color:it.col,display:'grid',placeItems:'center',flexShrink:0}}>{OmI(it.ic,{style:{width:14,height:14}})}</span>
                  <span style={{minWidth:0}}><span style={{display:'block',fontSize:12.5,fontWeight:700,color:'var(--label-01)'}}>{it.n}</span><span style={{display:'block',fontSize:10.5,color:'var(--label-03)'}}>{it.d}</span></span>
                </button>
              ))}
            </div>
          );
        })()}
        <textarea value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
          rows={started?1:2} placeholder="Hỏi AppChat… gõ / để mở lệnh nhanh, @ để tham chiếu khách/chiến dịch"
          style={{width:'100%', border:'none', outline:'none', resize:'none', fontSize:14.5, fontFamily:'inherit', lineHeight:1.5, background:'transparent', color:'var(--label-01)', maxHeight:120}}/>
        <div style={{display:'flex', alignItems:'center', gap:6, marginTop:6}}>
          <div style={{position:'relative'}}>
            <button className="btn-icon" title="Đính kèm" onClick={()=>setAttMenu(m=>!m)} style={{background:attMenu?'var(--bg-green)':'transparent'}}>{OmI('Paperclip',{style:{width:17,height:17}})}</button>
            {attMenu && <>
              <div onClick={()=>setAttMenu(false)} style={{position:'fixed', inset:0, zIndex:60}}/>
              <div style={{position:'absolute', bottom:42, left:0, zIndex:61, width:210, background:'white', border:'1px solid var(--fill-04)', borderRadius:11, boxShadow:'0 16px 40px rgba(17,24,39,.2)', padding:6}}>
                {[
                  {k:'file', l:'Tệp tài liệu', ic:'Paperclip', on:()=>fileRef.current&&fileRef.current.click()},
                  {k:'image', l:'Hình ảnh', ic:'Image', on:()=>imgRef.current&&imgRef.current.click()},
                  {k:'email', l:'Đính kèm email', ic:'Mail', on:()=>addAtt('email','Email — Hộp thư Gmail')},
                  {k:'drive', l:'Google Drive', ic:'Cloud', on:()=>addAtt('drive','Tài liệu — Google Drive')},
                ].map(it=>(
                  <button key={it.k} onClick={()=>{ it.on(); setAttMenu(false); }} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', border:'none', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:13, fontWeight:500, background:'transparent', color:'var(--label-01)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {OmI(it.ic,{style:{width:15,height:15, color:'var(--label-02)'}}) || '•'}<span>{it.l}</span>
                  </button>
                ))}
              </div>
            </>}
          </div>
          <button className="btn-icon" title="Hình ảnh" onClick={()=>imgRef.current&&imgRef.current.click()}>{OmI('Image',{style:{width:17,height:17}})}</button>
          <button className="btn-icon" title="Google Drive" onClick={()=>addAtt('drive','Tài liệu — Google Drive')}>{OmI('Cloud',{style:{width:17,height:17}}) || '☁'}</button>
          <div style={{position:'relative'}}>
            <button className="btn-icon" title="Mẫu lệnh & Lịch chạy" onClick={()=>setTplMenu(v=>!v)} style={{background:tplMenu?'var(--bg-green)':'transparent'}}>{OmI('Zap',{style:{width:17,height:17}}) || '⚡'}</button>
            {tplMenu && <>
              <div onClick={()=>setTplMenu(false)} style={{position:'fixed', inset:0, zIndex:60}}/>
              <div style={{position:'absolute', bottom:42, left:0, zIndex:61, width:280, background:'white', border:'1px solid var(--fill-04)', borderRadius:11, boxShadow:'0 16px 40px rgba(17,24,39,.2)', padding:8}}>
                <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--label-03)', padding:'2px 6px 7px'}}>Mẫu lệnh lưu sẵn</div>
                {OMI_TEMPLATES.map(tp=>(
                  <button key={tp} onClick={()=>{ setVal(tp); setTplMenu(false); }} style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 8px', border:'none', borderRadius:7, cursor:'pointer', textAlign:'left', fontFamily:'inherit', fontSize:12.5, color:'var(--label-01)', background:'transparent'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {OmI('Sparkles',{style:{width:13,height:13, color:'var(--primary)'}})}<span>{tp}</span>
                  </button>
                ))}
                <div style={{height:1, background:'var(--fill-03)', margin:'7px 4px'}}/>
                <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--label-03)', padding:'2px 6px 7px'}}>Lịch chạy định kỳ</div>
                {scheds.map((s,i)=>(
                  <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px'}}>
                    {OmI('Clock',{style:{width:13,height:13, color:'var(--label-03)'}})}
                    <span style={{flex:1, fontSize:12, color:'var(--label-01)'}}>{s.t}</span>
                    <button onClick={()=>setScheds(a=>a.map((x,j)=>j===i?{...x,on:!x.on}:x))} style={{width:32,height:18,borderRadius:10,border:'none',position:'relative',cursor:'pointer',flexShrink:0,background:s.on?'var(--primary)':'var(--fill-04)'}}><span style={{position:'absolute',top:2,left:s.on?16:2,width:14,height:14,borderRadius:'50%',background:'white'}}/></button>
                  </div>
                ))}
                <button onClick={()=>{ if(val.trim()){ setScheds(a=>[...a,{t:'Mỗi ngày · '+val.trim(), on:true}]); setTplMenu(false); } }} style={{display:'flex', alignItems:'center', gap:7, width:'100%', padding:'8px', marginTop:4, border:'1px dashed var(--fill-04)', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontSize:11.5, fontWeight:700, color:'var(--pr-dark-2)', background:'transparent'}}>{OmI('Plus',{style:{width:13,height:13}})} Lên lịch lệnh đang nhập</button>
              </div>
            </>}
          </div>
          <span style={{flex:1}}/>
          {rec && <span style={{fontSize:11, fontWeight:700, color:'#DC2626', display:'inline-flex', alignItems:'center', gap:6, marginRight:4}}><span style={{width:8,height:8,borderRadius:'50%',background:'#DC2626',animation:'omiBlink 0.7s infinite'}}/>Đang nghe…</span>}
          <button onClick={()=>{ if(rec){ setRec(false); setVal(v=> v || 'Khách nào cần chăm sóc gấp hôm nay?'); } else { setRec(true); } }} title="Nói" className="btn-icon" style={{background:rec?'#FDECEA':'transparent', color:rec?'#DC2626':'var(--label-02)'}}>{OmI('Mic',{style:{width:18,height:18}})}</button>
          <button onClick={()=>send()} disabled={!val.trim()} style={{width:38, height:38, borderRadius:'50%', border:'none', cursor:val.trim()?'pointer':'default', display:'grid', placeItems:'center', background:val.trim()?'var(--grad-signature, var(--primary))':'var(--fill-03)', color:'white', flexShrink:0}}>{OmI('Send',{style:{width:17,height:17}})}</button>
        </div>
      </div>
      {/* mode chips */}
      <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:14}}>
        {OMI_MODES.map(m=>{ const on=mode===m.k; return (
          <button key={m.k} onClick={()=>setMode(m.k)} style={{display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:'1px solid '+(on?m.c:'var(--fill-04)'), background:on?m.c+'14':'white', color:on?m.c:'var(--label-02)'}}>
            {OmI(m.ic,{style:{width:14,height:14}})} {m.l}
          </button>
        );})}
      </div>
    </div>
  );

  return (
    <div style={{display:'flex', height:'100%'}}>
    <div style={{display:'flex', flexDirection:'column', height:'100%', flex:1, minWidth:0, background:'linear-gradient(180deg,#F4FBF8 0%,var(--fill-02) 60%)'}}>
      {/* top bar */}
      <div style={{display:'flex', alignItems:'center', gap:10, padding:'13px 22px', borderBottom:'1px solid var(--fill-04)', background:'rgba(255,255,255,.7)', backdropFilter:'blur(6px)', flexShrink:0}}>
        <span style={{width:26, height:26, borderRadius:8, background:'var(--grad-signature, var(--primary))', display:'grid', placeItems:'center'}}>{OmI('Sparkles',{style:{width:14,height:14,color:'white'}})}</span>
        <span style={{fontSize:15.5, fontWeight:800}}>Trợ lý AI</span>
        <span style={{fontSize:11.5, fontWeight:700, color:'#0E9B7E', background:'#DDF6EF', padding:'2px 9px', borderRadius:12}}>AppChat</span>
        <span style={{flex:1}}/>
        {started && <button onClick={()=>{ setMsgs([]); setVal(''); }} className="btn btn-ghost btn-sm">{OmI('Refresh',{style:{width:14,height:14}})} Cuộc trò chuyện mới</button>}
      </div>

      {!started ? (
        /* ----- WELCOME (canh giữa) ----- */
        <div className="scroll" style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px 24px', textAlign:'center'}}>
          <OmiMascot size={96}/>
          <div style={{fontSize:24, fontWeight:800, color:'var(--label-01)', marginTop:18}}>Xin chào, anh Ngọc 👋</div>
          <div style={{fontSize:21, fontWeight:700, color:'var(--pr-dark-2)', marginTop:4}}>Hôm nay AppChat giúp gì cho anh?</div>
          <div style={{fontSize:13.5, color:'var(--label-02)', marginTop:12, maxWidth:560, lineHeight:1.6}}>
            AppChat AI là <b>trung tâm vận hành</b> — chat để giao việc &amp; thực thi mọi nghiệp vụ: hội thoại, kết nối kênh, báo giá, hợp đồng, đơn hàng, ticket, lịch hẹn, marketing, loyalty, AI Agent, workflow, báo cáo. Không cần bấm từng module.
          </div>
          <div style={{width:'100%', marginTop:26}}>{composer}</div>
          {/* Trung tâm vận hành — lệnh theo nghiệp vụ */}
          <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:22, width:'100%', maxWidth:720}}>
            <div style={{fontSize:11, fontWeight:700, letterSpacing:'.04em', color:'var(--label-03)', textTransform:'uppercase'}}>Giao việc nhanh cho AppChat</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8}}>
              {[
                {ic:'Chat', l:'Trả lời hội thoại', c:'#2A6FDB', cmd:'Tóm tắt các hội thoại đang chờ và soạn trả lời nhanh'},
                {ic:'Plug', l:'Kết nối kênh', c:'#0E9B7E', cmd:'Kết nối kênh Zalo OA cho workspace'},
                {ic:'FileText', l:'Tạo báo giá', c:'#C9820B', cmd:'Tạo báo giá dịch vụ cho khách hàng'},
                {ic:'Book', l:'Tạo hợp đồng', c:'#6E48E6', cmd:'Tạo hợp đồng từ báo giá đã chốt'},
                {ic:'ShoppingCart', l:'Tạo đơn hàng', c:'#2563EB', cmd:'Tạo đơn hàng mới cho khách'},
                {ic:'Activity', l:'Mở ticket', c:'#DC2626', cmd:'Tạo ticket hỗ trợ và gán người xử lý'},
                {ic:'Calendar', l:'Đặt lịch hẹn', c:'#0EA5E9', cmd:'Đặt lịch hẹn cho khách hàng'},
                {ic:'Broadcast', l:'Chiến dịch', c:'#DB2777', cmd:'Tạo chiến dịch ZNS nhắc khách quay lại'},
                {ic:'Star', l:'Loyalty', c:'#C026D3', cmd:'Cộng điểm thưởng hoặc phát voucher cho khách'},
                {ic:'Sparkles', l:'AI Agent', c:'#0E9B7E', cmd:'Tạo AI Agent chăm sóc khách hàng tự động'},
                {ic:'Workflow', l:'Workflow', c:'#7C3AED', cmd:'Tạo workflow tự động hoá quy trình'},
                {ic:'Reports', l:'Báo cáo', c:'#157A40', cmd:'Xem báo cáo hiệu suất kinh doanh hôm nay'},
              ].map(x=>(
                <button key={x.l} onClick={()=>send(x.cmd)} style={{display:'flex', alignItems:'center', gap:9, padding:'11px 12px', borderRadius:11, border:'1px solid var(--fill-04)', background:'white', cursor:'pointer', fontFamily:'inherit', textAlign:'left'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=x.c; e.currentTarget.style.background=x.c+'0D';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--fill-04)'; e.currentTarget.style.background='white';}}>
                  <span style={{width:30, height:30, borderRadius:8, background:x.c+'18', color:x.c, display:'grid', placeItems:'center', flexShrink:0}}>{OmI(x.ic,{style:{width:15,height:15}})}</span>
                  <span style={{fontSize:12, fontWeight:700, color:'var(--label-01)', lineHeight:1.2}}>{x.l}</span>
                </button>
              ))}
            </div>
          </div>
          {/* gợi ý theo chế độ */}
          <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:20, width:'100%', maxWidth:680}}>
            <div style={{fontSize:11, fontWeight:700, letterSpacing:'.04em', color:'var(--label-03)', textTransform:'uppercase'}}>Gợi ý cho anh</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center'}}>
              {OMI_PROMPTS[mode].map(p=>(
                <button key={p} onClick={()=>send(p)} style={{padding:'9px 14px', borderRadius:11, border:'1px solid var(--fill-04)', background:'white', cursor:'pointer', fontSize:12.5, color:'var(--label-01)', fontFamily:'inherit', textAlign:'left'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--bg-green)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--fill-04)'; e.currentTarget.style.background='white';}}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ----- CHAT (khung chat) ----- */
        <>
          <div className="scroll" style={{flex:1, overflowY:'auto', padding:'22px 24px'}}>
            <div style={{maxWidth:760, margin:'0 auto', display:'flex', flexDirection:'column', gap:16}}>
              {msgs.map((m,i)=> m.role==='user' ? (
                <div key={i} style={{display:'flex', justifyContent:'flex-end'}}>
                  <div style={{maxWidth:'80%', padding:'10px 14px', borderRadius:'14px 14px 4px 14px', background:'var(--primary)', color:'white', fontSize:13.5, lineHeight:1.55}}>{m.text}</div>
                </div>
              ) : (
                <div key={i} style={{display:'flex', gap:10}}>
                  <span style={{flexShrink:0, marginTop:2}}><OmiMascot size={34}/></span>
                  <div style={{maxWidth:'82%'}}>
                    <div style={{fontSize:11.5, fontWeight:700, color:'#0E9B7E', marginBottom:4}}>AppChat AI</div>
                    <div style={{padding:'11px 15px', borderRadius:'4px 14px 14px 14px', background:'white', border:'1px solid var(--fill-04)', fontSize:13.5, lineHeight:1.6, color:'var(--label-01)'}}>{renderRich(m.text)}{m.stream && <span style={{display:'inline-block', width:7, height:14, background:'var(--primary)', marginLeft:2, borderRadius:1, verticalAlign:'text-bottom', animation:'omiBlink 0.8s infinite'}}/>}</div>
                    {m.action && (
                      <div style={{marginTop:8, border:'1px solid '+(m.status==='cancelled'?'var(--fill-04)':m.action.c), borderRadius:12, overflow:'hidden', maxWidth:380, opacity:m.status==='cancelled'?.6:1}}>
                        <div style={{display:'flex', alignItems:'center', gap:10, padding:'11px 13px', background:m.action.c+'10'}}>
                          <span style={{width:32,height:32,borderRadius:9,background:m.action.c+'20',color:m.action.c,display:'grid',placeItems:'center',flexShrink:0}}>{OmI(m.action.ic,{style:{width:16,height:16}})}</span>
                          <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:800}}>{m.action.title}</div><div style={{fontSize:11,color:'var(--label-02)',lineHeight:1.4}}>{m.action.desc}</div></div>
                        </div>
                        {m.action.quote && (()=>{ const a=m.action; const sub=a.lines.reduce((s,l)=>s+l.p*l.q,0); const vipD=a.vip?Math.round(sub*0.05):0; const vch=a.voucher?500000:0; const vat=Math.round((sub-vipD-vch)*0.08); const total=sub-vipD-vch+vat; const fm=(n)=>n.toLocaleString('vi-VN'); return (
                          <div style={{padding:'10px 13px', borderTop:'1px solid var(--fill-03)', fontSize:12}}>
                            <div style={{fontSize:10.5,fontWeight:800,color:'var(--label-03)',marginBottom:6}}>KHÁCH: {a.cust}</div>
                            {a.lines.map((l,li)=>(<div key={li} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span style={{color:'var(--label-02)'}}>{l.n} ×{l.q}</span><span style={{fontWeight:600}}>{fm(l.p*l.q)}</span></div>))}
                            <div style={{borderTop:'1px solid var(--fill-03)',margin:'5px 0',paddingTop:5}}/>
                            {vipD>0 && <div style={{display:'flex',justifyContent:'space-between',color:'#DC2626'}}><span>Ưu đãi VIP −5%</span><span>−{fm(vipD)}</span></div>}
                            {vch>0 && <div style={{display:'flex',justifyContent:'space-between',color:'#DC2626'}}><span>Voucher SKIN15</span><span>−{fm(vch)}</span></div>}
                            <div style={{display:'flex',justifyContent:'space-between',color:'var(--label-02)'}}><span>VAT 8%</span><span>{fm(vat)}</span></div>
                            <div style={{display:'flex',justifyContent:'space-between',marginTop:6,padding:'7px 9px',background:'var(--bg-green)',borderRadius:8}}><span style={{fontWeight:800}}>Tổng cộng</span><span style={{fontWeight:800,color:'var(--pr-dark-2)'}}>{fm(total)} ₫</span></div>
                            {a.inst && <div style={{fontSize:10.5,color:'#6E48E6',marginTop:5}}>✦ Trả góp 12 kỳ ≈ {fm(Math.round(total/12))}₫/tháng</div>}
                          </div>
                        );})()}
                        {m.status==='pending' ? (
                          <div style={{display:'flex', gap:8, padding:'10px 13px', borderTop:'1px solid var(--fill-03)'}}>
                            <button onClick={()=>confirmAction(i)} className="btn btn-primary btn-sm" style={{flex:1, justifyContent:'center'}}>{OmI('Check',{style:{width:13,height:13}})} {m.action.quote?'Duyệt & chốt → HĐ':'Xác nhận & lưu'}</button>
                            <button onClick={()=>{ setVal(''); }} className="btn btn-ghost btn-sm">Sửa</button>
                            <button onClick={()=>cancelAction(i)} className="btn btn-ghost btn-sm" style={{color:'var(--label-03)'}}>Huỷ</button>
                          </div>
                        ) : m.status==='done' ? (
                          <button onClick={()=>window.acNavigate&&window.acNavigate(m.action.go)} style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 13px', borderTop:'1px solid var(--fill-03)', border:'none', background:m.action.c+'0D', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:700, color:m.action.c}}>
                            {OmI('Check',{style:{width:14,height:14}})} Đã lưu vào {GO_LABEL[m.action.go]||'module'} — mở xem <span style={{flex:1}}/> {OmI('ChevronRight',{style:{width:14,height:14}})||'›'}
                          </button>
                        ) : (
                          <div style={{padding:'9px 13px', borderTop:'1px solid var(--fill-03)', fontSize:12, color:'var(--label-03)'}}>Đã huỷ — AppChat không thực thi.</div>
                        )}
                      </div>
                    )}
                    {m.guided && !m.guided.done && (
                      <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
                        <button onClick={()=>guidedNext(i,'go')} className="btn btn-primary btn-sm">{OmI('Check',{style:{width:13,height:13}})} Theo luồng này</button>
                        <button onClick={()=>guidedNext(i,'adjust')} className="btn btn-ghost btn-sm">Điều chỉnh</button>
                        <button onClick={()=>guidedNext(i,'reuse')} className="btn btn-ghost btn-sm">Dùng luồng cũ</button>
                      </div>
                    )}
                    {m.guided && m.guided.done && <div style={{marginTop:6, fontSize:11.5, color:'var(--label-03)', fontStyle:'italic'}}>Anh đã chọn: {m.guided.done==='go'?'Theo luồng này':m.guided.done==='adjust'?'Điều chỉnh':'Dùng luồng cũ'}</div>}
                    {m.guided2 && !m.guided2.done && (
                      <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
                        <button onClick={()=>guidedExecute(i,true)} className="btn btn-primary btn-sm">{OmI('Check',{style:{width:13,height:13}})} Đúng rồi, tạo luồng</button>
                        <button onClick={()=>guidedExecute(i,false)} className="btn btn-ghost btn-sm">Cần chỉnh thêm</button>
                      </div>
                    )}
                    {m.result && (
                      <div style={{marginTop:8, border:'1px solid var(--fill-04)', borderRadius:12, padding:'12px 14px', maxWidth:420, background:'white'}}>
                        <div style={{fontSize:12, fontWeight:800, marginBottom:10}}>{m.result.title}</div>
                        {m.result.kind==='stat' ? (
                          <div style={{display:'grid', gridTemplateColumns:'repeat('+m.result.items.length+',1fr)', gap:10}}>
                            {m.result.items.map((it,k)=>(<div key={k}><div style={{fontSize:17,fontWeight:800,color:'var(--pr-dark-2)'}}>{it.v}</div><div style={{fontSize:10.5,color:'var(--label-03)'}}>{it.l}</div><div style={{fontSize:10,fontWeight:700,color:'#16A34A'}}>{it.d}</div></div>))}
                          </div>
                        ) : (
                          <div style={{display:'flex', flexDirection:'column', gap:7}}>
                            {m.result.rows.map((r,k)=>(<div key={k} style={{display:'flex', alignItems:'center', gap:9}}><span style={{width:26,height:26,borderRadius:'50%',background:'var(--fill-02)',display:'grid',placeItems:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{r[0][0]}</span><span style={{fontSize:12.5,fontWeight:600,flex:1}}>{r[0]}</span><span style={{fontSize:11,color:'var(--label-03)'}}>{r[1]}</span></div>))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{display:'flex', gap:10}}>
                  <span style={{flexShrink:0}}><OmiMascot size={34} talking/></span>
                  <div style={{padding:'13px 16px', borderRadius:'4px 14px 14px 14px', background:'white', border:'1px solid var(--fill-04)', display:'flex', gap:4}}>
                    {[0,1,2].map(i=><span key={i} style={{width:6, height:6, borderRadius:'50%', background:'var(--label-04)', animation:`omiBlink 1s ${i*0.18}s infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>
          </div>
          <div style={{padding:'12px 16px 16px', borderTop:'1px solid var(--fill-04)', background:'rgba(255,255,255,.8)', backdropFilter:'blur(6px)'}}>{composer}</div>
        </>
      )}
      <style>{`@keyframes omiBlink{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>

    {/* ---- SUBMENU PANEL (flyout từ rail): Lịch sử & Nhật ký ---- */}
    {panelOpen && (<>
    <div onClick={()=>setPanelOpen(false)} style={{position:'fixed', inset:0, zIndex:1190, background:'rgba(15,23,42,.18)'}}/>
    <div style={{position:'fixed', left:80, top:0, bottom:0, width:320, flexShrink:0, borderRight:'1px solid var(--fill-04)', boxShadow:'8px 0 32px rgba(17,24,39,.14)', background:'white', display:'flex', flexDirection:'column', height:'100%', zIndex:1195}}>
      <div style={{display:'flex', gap:8, padding:'12px 12px 10px', alignItems:'center', borderBottom:'1px solid var(--fill-03)'}}>
        {OmI(panelTab==='chats'?'Chat':'Activity',{style:{width:16,height:16, color:'var(--pr-dark-1)'}})}
        <span style={{flex:1, fontSize:14, fontWeight:800, color:'var(--label-01)'}}>{panelTab==='chats'?'Phiên trò chuyện':'Nhật ký'}</span>
        <button onClick={()=>setPanelOpen(false)} title="Đóng" className="btn-icon" style={{width:26, height:26, flexShrink:0}}>{OmI('Close',{style:{width:15,height:15}}) || '✕'}</button>
      </div>
      <div className="scroll" style={{flex:1, overflowY:'auto', padding:'12px'}}>
        {panelTab==='chats' ? (<>
          <button onClick={()=>{ setMsgs([]); setVal(''); }} style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 12px', borderRadius:10, border:'1px dashed var(--primary)', background:'var(--bg-green)', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:700, color:'var(--pr-dark-2)', marginBottom:12}}>
            {OmI('Plus',{style:{width:14,height:14}})} Trò chuyện mới
          </button>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--label-03)', padding:'0 2px 7px'}}>Gần đây</div>
          {OMI_SESSIONS.map((s,i)=>(
            <button key={i} style={{display:'block', width:'100%', textAlign:'left', padding:'9px 11px', borderRadius:9, border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', marginBottom:2}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{fontSize:12.5, fontWeight:600, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.t}</div>
              <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:1}}>{s.time} · {s.n} tin nhắn</div>
            </button>
          ))}
        </>) : (<>
          <div style={{fontSize:10, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--label-03)', padding:'0 2px 9px'}}>AppChat đã thực thi</div>
          {actions.map((a,i)=>(
            <div key={i} style={{display:'flex', gap:10, width:'100%', padding:'10px 11px', borderRadius:10, border:'1px solid var(--fill-03)', background:a.undone?'var(--fill-02)':'white', marginBottom:8, opacity:a.undone?.65:1}}>
              <span style={{width:30, height:30, borderRadius:8, background:a.c+'18', color:a.c, display:'grid', placeItems:'center', flexShrink:0}}>{OmI(a.ic,{style:{width:15,height:15}})}</span>
              <span style={{minWidth:0, flex:1}}>
                <span style={{display:'block', fontSize:12.5, fontWeight:600, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration:a.undone?'line-through':'none'}}>{a.t}</span>
                <span style={{display:'block', fontSize:10.5, color: a.undone?'#DC2626':(a.s.includes('Chờ')?'#C9820B':'var(--label-03)'), marginTop:1}}>{a.undone?'Đã hoàn tác':a.s}</span>
                <span style={{display:'flex', gap:10, marginTop:5}}>
                  {a.undone ? (
                    <button onClick={()=>redoAction(i)} style={{border:'none', background:'transparent', padding:0, cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:700, color:'var(--pr-dark-2)'}}>Khôi phục</button>
                  ) : (<>
                    <button onClick={()=>window.acNavigate&&window.acNavigate(a.go)} style={{border:'none', background:'transparent', padding:0, cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:700, color:'var(--pr-dark-2)'}}>Mở xem</button>
                    <button onClick={()=>undoAction(i)} style={{border:'none', background:'transparent', padding:0, cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:700, color:'var(--label-03)'}}>Hoàn tác</button>
                  </>)}
                </span>
              </span>
            </div>
          ))}
          <div style={{fontSize:10.5, color:'var(--label-03)', lineHeight:1.5, padding:'6px 2px'}}>Mọi hành động AppChat thực thi được ghi vào nhật ký — có thể <b>Hoàn tác</b> để gỡ đối tượng vừa tạo.</div>
        </>)}
      </div>
    </div>
    </>)}
    </div>
  );
}

window.OmiAssistantModule = OmiAssistantModule;
} catch(e){ console.error('omi-assistant.jsx', e); }
})();
