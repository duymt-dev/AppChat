/* ============================================================
   workflow.jsx — Workflow (quy trình tự động hoá)
   • Empty state (per design ref) · two entry flows
     Flow 1 — "Bắt đầu lại từ đầu": Tên + Mô tả → workflow minimap editor
     Flow 2 — "Bắt đầu với một mẫu": template gallery → editor prefilled
   • Editor: node palette + connected minimap canvas + properties panel
   ============================================================ */
;(function(){
try {
const { useState: useWf, useEffect: useWfEf } = React;

const WfIc = (name, props) => { const C = window.Icon && window.Icon[name]; return C ? React.createElement(C, props) : null; };

/* node type specs */
const WF_NODES = {
  trigger:   { l:'Kích hoạt',  icon:'Zap',       c:'#1B9E5A', bg:'#E7F7EE', br:'#BFE9D2' },
  action:    { l:'Hành động',  icon:'Send',      c:'#2A6FDB', bg:'#EAF1FD', br:'#C7DBF7' },
  condition: { l:'Điều kiện',  icon:'Route',     c:'#C9820B', bg:'#FCF3E2', br:'#F0DCB0' },
  wait:      { l:'Chờ',        icon:'Clock',     c:'#6B7280', bg:'#F1F3F5', br:'#DDE1E6' },
  ai:        { l:'AI Agent',   icon:'Sparkles',  c:'#6E48E6', bg:'#F2EEFD', br:'#DACCF5' },
  message:   { l:'Gửi tin nhắn', icon:'Send',    c:'#1B9E5A', bg:'#E7F7EE', br:'#BFE9D2' },
  question:  { l:'Đặt câu hỏi', icon:'MessageSquare', c:'#2A6FDB', bg:'#EAF1FD', br:'#C7DBF7' },
  assign:    { l:'Giao cho',   icon:'Users',     c:'#1B9E5A', bg:'#E7F7EE', br:'#BFE9D2' },
  branch:    { l:'Chi nhánh',  icon:'Route',     c:'#C9820B', bg:'#FCF3E2', br:'#F0DCB0' },
  update_contact: { l:'Cập nhật liên hệ', icon:'Users', c:'#6E48E6', bg:'#F2EEFD', br:'#DACCF5' },
  update_tag: { l:'Cập nhật thẻ', icon:'Tag',    c:'#6E48E6', bg:'#F2EEFD', br:'#DACCF5' },
  goal:      { l:'Mục tiêu',   icon:'Check',     c:'#0E7C50', bg:'#E2F5EC', br:'#B6E4CD' },
};
const WF_ADD_STEPS = [
  { k:'message', t:'Gửi tin nhắn', d:'Gửi tin nhắn với nội dung được chỉ định đến khách.' },
  { k:'question', t:'Đặt câu hỏi', d:'Gửi câu hỏi cụ thể cho người liên hệ trên kênh.' },
  { k:'assign', t:'Giao cho', d:'Gán thông tin liên hệ cho người dùng hoặc nhóm.' },
  { k:'branch', t:'Chi nhánh', d:'Tạo các nhánh quy trình dựa trên điều kiện.' },
  { k:'update_contact', t:'Cập nhật thông tin liên hệ', d:'Chỉnh sửa giá trị trường thông tin liên hệ.' },
  { k:'update_tag', t:'Cập nhật thẻ liên hệ', d:'Thêm hoặc xóa thẻ của một hoặc nhiều liên hệ.' },
  { k:'wait', t:'Chờ', d:'Tạm dừng quy trình trong một khoảng thời gian.' },
  { k:'ai', t:'AI Agent', d:'Để AI Agent xử lý hoặc soạn nội dung tự động.' },
  { k:'goal', t:'Mục tiêu', d:'Đánh dấu quy trình hoàn tất thành công.' },
];
const WF_STEP_TITLE = { message:'Tin nhắn mới', question:'Câu hỏi mới', assign:'Giao cho nhân viên', branch:'Điều kiện rẽ nhánh', update_contact:'Cập nhật liên hệ', update_tag:'Cập nhật thẻ', wait:'Chờ', ai:'AI Agent', goal:'Mục tiêu' };

/* templates (Flow 2) */
const WF_TEMPLATES = [
  { cat:'Marketing', items:[
    { id:'wt1', name:'Chào mừng khách mới', desc:'Khi khách đăng ký → gửi Zalo welcome → chờ 1 ngày → email hướng dẫn.', icon:'Broadcast', c:'#2A6FDB',
      nodes:[['trigger','Khách mới đăng ký','contact_created'],['action','Gửi Zalo welcome','Template · Chào mừng'],['wait','Chờ 1 ngày',''],['action','Email hướng dẫn','3 bước bắt đầu'],['goal','Đã onboard','']] },
    { id:'wt2', name:'Nhắc giỏ hàng bỏ quên', desc:'Hội thoại có ý định mua nhưng chưa chốt → nhắc sau 3 giờ.', icon:'Broadcast', c:'#2A6FDB',
      nodes:[['trigger','Có giỏ hàng chưa chốt',''],['wait','Chờ 3 giờ',''],['ai','AI soạn tin nhắc',''],['action','Gửi ZNS ưu đãi',''],['goal','Khách chốt đơn','']] },
    { id:'wt3', name:'Win-back khách 60 ngày', desc:'Khách 60 ngày không tương tác → chiến dịch kéo lại.', icon:'Broadcast', c:'#2A6FDB',
      nodes:[['trigger','60 ngày không đặt',''],['action','Gửi voucher SMS',''],['condition','Đã mở tin?',''],['ai','AI follow-up cá nhân',''],['goal','Re-engaged','']] },
  ]},
  { cat:'Sales', items:[
    { id:'wt4', name:'Nuôi dưỡng lead', desc:'Lead mới → chấm điểm AI → phân công sales → nhắc follow-up.', icon:'TrendUp', c:'#1B9E5A',
      nodes:[['trigger','Lead mới',''],['ai','AI chấm điểm lead',''],['condition','Điểm ≥ 80?',''],['action','Phân công Sales',''],['goal','Tạo cơ hội','']] },
    { id:'wt5', name:'Theo dõi sau báo giá', desc:'Đã gửi báo giá → chờ 2 ngày → nhắc nếu chưa phản hồi.', icon:'TrendUp', c:'#1B9E5A',
      nodes:[['trigger','Đã gửi báo giá',''],['wait','Chờ 2 ngày',''],['condition','Khách đã reply?',''],['ai','AI soạn nhắc khéo',''],['goal','Chốt deal','']] },
  ]},
  { cat:'Hỗ trợ', items:[
    { id:'wt6', name:'Tự động tạo ticket', desc:'Tin nhắn chứa từ khoá "hoàn tiền" → tạo ticket ưu tiên cao.', icon:'Activity', c:'#C9820B',
      nodes:[['trigger','Từ khoá "hoàn tiền"',''],['action','Tạo ticket ưu tiên',''],['action','Phân công CSKH',''],['goal','Ticket xử lý','']] },
    { id:'wt7', name:'Khảo sát CSAT', desc:'Ticket đóng → chờ 1 giờ → gửi khảo sát hài lòng.', icon:'Activity', c:'#C9820B',
      nodes:[['trigger','Ticket đóng',''],['wait','Chờ 1 giờ',''],['action','Gửi khảo sát CSAT',''],['goal','Có phản hồi','']] },
  ]},
  { cat:'Thông báo', items:[
    { id:'wt8', name:'Nhắc lịch hẹn', desc:'Trước lịch hẹn 1 giờ → nhắc khách qua Zalo + SMS.', icon:'Bell', c:'#6E48E6',
      nodes:[['trigger','Trước hẹn 1 giờ',''],['action','Nhắc qua Zalo',''],['action','Nhắc qua SMS',''],['goal','Khách xác nhận','']] },
    { id:'wt9', name:'Cảnh báo SLA breach', desc:'Ticket sắp quá SLA → cảnh báo quản lý + tự escalation.', icon:'Bell', c:'#6E48E6',
      nodes:[['trigger','Sắp quá SLA',''],['action','Cảnh báo quản lý',''],['condition','Quá hạn?',''],['action','Escalation cấp 2',''],['goal','Đã xử lý','']] },
  ]},
  { cat:'Spa & Thẩm mỹ', items:[
    { id:'wt10', name:'Nhắc liệu trình tiếp theo', desc:'Sau buổi trị liệu → chờ theo phác đồ → nhắc đặt buổi kế.', icon:'Heart', c:'#DB2777',
      nodes:[['trigger','Hoàn tất 1 buổi',''],['wait','Chờ theo phác đồ',''],['ai','AI gợi ý buổi kế',''],['action','Gửi Zalo nhắc đặt lịch',''],['goal','Đặt buổi tiếp','']] },
    { id:'wt11', name:'Chăm sóc sau dịch vụ', desc:'Sau 1 ngày → hỏi thăm kết quả + hướng dẫn chăm da tại nhà.', icon:'Heart', c:'#DB2777',
      nodes:[['trigger','Sau dịch vụ 1 ngày',''],['action','Hỏi thăm kết quả',''],['ai','AI tư vấn chăm sóc',''],['goal','Khách hài lòng','']] },
  ]},
  { cat:'Nha khoa & Phòng khám', items:[
    { id:'wt12', name:'Nhắc tái khám định kỳ', desc:'Theo lịch tái khám (3/6 tháng) → nhắc khách đặt lịch.', icon:'Activity', c:'#0E9B94',
      nodes:[['trigger','Đến kỳ tái khám',''],['action','Gửi nhắc tái khám',''],['condition','Đã đặt lịch?',''],['ai','AI nhắc lần 2',''],['goal','Đặt tái khám','']] },
    { id:'wt13', name:'Xác nhận lịch khám', desc:'Trước lịch khám 1 ngày → xác nhận, đổi/huỷ nếu cần.', icon:'Calendar', c:'#0E9B94',
      nodes:[['trigger','Trước khám 1 ngày',''],['action','Gửi xác nhận lịch',''],['condition','Khách phản hồi?',''],['action','Cập nhật lịch hẹn',''],['goal','Xác nhận khám','']] },
  ]},
  { cat:'Giáo dục & Anh ngữ', items:[
    { id:'wt14', name:'Nhắc học phí & gia hạn', desc:'Trước hạn học phí 5 ngày → nhắc phụ huynh gia hạn khoá.', icon:'Bell', c:'#C9820B',
      nodes:[['trigger','Trước hạn 5 ngày',''],['action','Nhắc học phí',''],['wait','Chờ 2 ngày',''],['ai','AI nhắc khéo lần 2',''],['goal','Đã gia hạn','']] },
    { id:'wt15', name:'Chăm sóc học viên mới', desc:'Học viên đăng ký → gửi lịch học + tài liệu + khảo sát đầu vào.', icon:'TrendUp', c:'#C9820B',
      nodes:[['trigger','Đăng ký khoá học',''],['action','Gửi lịch + tài liệu',''],['action','Khảo sát đầu vào',''],['goal','Sẵn sàng học','']] },
  ]},
  { cat:'Gym & Fitness', items:[
    { id:'wt16', name:'Nhắc gia hạn thẻ tập', desc:'Thẻ sắp hết hạn 7 ngày → ưu đãi gia hạn sớm.', icon:'TrendUp', c:'#16A34A',
      nodes:[['trigger','Thẻ còn 7 ngày',''],['action','Gửi ưu đãi gia hạn',''],['condition','Đã gia hạn?',''],['ai','AI follow-up PT',''],['goal','Gia hạn thẻ','']] },
    { id:'wt17', name:'Kéo lại hội viên vắng', desc:'Hội viên 14 ngày không check-in → nhắc + tặng buổi PT.', icon:'Heart', c:'#16A34A',
      nodes:[['trigger','14 ngày không tập',''],['action','Tặng 1 buổi PT',''],['ai','AI động viên cá nhân',''],['goal','Quay lại tập','']] },
  ]},
  { cat:'Ô tô & Dịch vụ xe', items:[
    { id:'wt18', name:'Nhắc bảo dưỡng định kỳ', desc:'Theo km/thời gian → nhắc khách lịch bảo dưỡng xe.', icon:'Bell', c:'#2563EB',
      nodes:[['trigger','Đến kỳ bảo dưỡng',''],['action','Gửi nhắc bảo dưỡng',''],['ai','AI đề xuất gói dịch vụ',''],['action','Đặt lịch garage',''],['goal','Đặt bảo dưỡng','']] },
    { id:'wt19', name:'Chăm sóc sau sửa chữa', desc:'Sau khi giao xe → hỏi thăm + bảo hành + khảo sát.', icon:'Heart', c:'#2563EB',
      nodes:[['trigger','Giao xe xong',''],['wait','Chờ 2 ngày',''],['action','Hỏi thăm + bảo hành',''],['goal','Khách hài lòng','']] },
  ]},
  { cat:'Du lịch & Lưu trú', items:[
    { id:'wt20', name:'Xác nhận & nhắc tour/booking', desc:'Trước chuyến 2 ngày → gửi lịch trình + nhắc chuẩn bị.', icon:'Calendar', c:'#0EA5E9',
      nodes:[['trigger','Trước chuyến 2 ngày',''],['action','Gửi lịch trình',''],['action','Nhắc chuẩn bị giấy tờ',''],['goal','Sẵn sàng đi','']] },
    { id:'wt21', name:'Re-book mùa sau', desc:'Sau chuyến đi → cảm ơn + ưu đãi đặt lại mùa sau.', icon:'Broadcast', c:'#0EA5E9',
      nodes:[['trigger','Kết thúc chuyến',''],['action','Cảm ơn + xin review',''],['wait','Chờ 30 ngày',''],['ai','AI gợi ý tour mới',''],['goal','Đặt lại','']] },
  ]},
];

const WF_KEY = 'ac_workflows_v1';
function wfRead(){ try { const v=localStorage.getItem(WF_KEY); return v==null ? null : (JSON.parse(v)||[]); } catch(e){ return null; } }
function wfWrite(v){ localStorage.setItem(WF_KEY, JSON.stringify(v)); }
const uid = () => 'wf'+Math.random().toString(36).slice(2,8);
const mkNodes = (arr) => arr.map((n,i)=>({ id:'n'+i+uid(), type:n[0], title:n[1], sub:n[2]||'' }));
/* Gộp từ AI Agents — quy tắc tự động hoá cũ → workflow đã tạo */
function wfMigrateRule(r){
  return { id:r.id||uid(), name:r.name, desc:'Quy tắc tự động hoá (chuyển từ AI Agents)'+(r.channel?(' · kênh '+r.channel):''),
    status: r.status==='on'?'active':'draft', updated: r.lastRun||'—',
    nodes: mkNodes([['trigger','Sự kiện kích hoạt', r.channel?('Kênh: '+r.channel):''],['action', r.name, r.triggers?('~'+Number(r.triggers).toLocaleString('vi-VN')+' lượt'):''],['goal','Hoàn tất','']]) };
}
function wfInitList(){
  const stored = wfRead();
  if (stored !== null) return stored;
  const rules = (window.AppData && window.AppData.WORKFLOWS) || [];
  return rules.map(wfMigrateRule);
}

/* =================== empty-state illustration =================== */
function WfHero(){
  return (
    <div style={{position:'relative', width:340, height:226, margin:'0 auto 6px'}}>
      <svg width="340" height="226" style={{position:'absolute', inset:0}}>
        <path d="M170 92 L170 120 M81 120 L259 120 M81 120 L81 150 M259 120 L259 150" fill="none" stroke="#D7DEE6" strokeWidth="2"/>
      </svg>
      {/* top card */}
      <div style={{position:'absolute', left:95, top:6, width:150, height:84, borderRadius:14, background:'linear-gradient(160deg,#C7D8F8,#A9C2F2)', boxShadow:'0 8px 20px rgba(42,111,219,.18)', padding:'14px 16px'}}>
        <span style={{display:'block', width:11, height:11, borderRadius:'50%', background:'#3F73D6', marginBottom:9}}/>
        {[120,96,70].map((w,i)=><span key={i} style={{display:'block', height:6, width:w, borderRadius:3, background:'rgba(63,115,214,.45)', marginBottom:6}}/>)}
      </div>
      {/* left child */}
      <div style={{position:'absolute', left:6, top:148, width:150, height:74, borderRadius:14, background:'linear-gradient(160deg,#DCE7FB,#C7D8F8)', boxShadow:'0 8px 18px rgba(42,111,219,.14)', padding:'13px 15px'}}>
        {WfIc('Star',{style:{width:15, height:15, color:'#3F73D6', marginBottom:8, fill:'#3F73D6'}})}
        {[110,72].map((w,i)=><span key={i} style={{display:'block', height:6, width:w, borderRadius:3, background:'rgba(63,115,214,.4)', marginBottom:6}}/>)}
      </div>
      {/* right child */}
      <div style={{position:'absolute', right:6, top:148, width:150, height:74, borderRadius:14, background:'linear-gradient(160deg,#FBD9D6,#F5BDB8)', boxShadow:'0 8px 18px rgba(214,80,70,.16)', padding:'13px 15px'}}>
        <span style={{display:'inline-block', width:0, height:0, borderLeft:'7px solid transparent', borderRight:'7px solid transparent', borderBottom:'12px solid #D65046', marginBottom:8}}/>
        {[110,72].map((w,i)=><span key={i} style={{display:'block', height:6, width:w, borderRadius:3, background:'rgba(214,80,70,.42)', marginBottom:6}}/>)}
      </div>
    </div>
  );
}

/* =================== node card =================== */
function WfNodeCard({ node, idx, selected, onSelect }){
  const s = WF_NODES[node.type] || WF_NODES.action;
  return (
    <div onClick={onSelect} style={{
      width:288, background:'white', borderRadius:13, cursor:'pointer', flexShrink:0, overflow:'hidden',
      border:'1.5px solid '+(selected ? s.c : 'var(--fill-04)'),
      boxShadow: selected ? '0 0 0 3px '+s.bg : '0 1px 3px rgba(17,24,39,.06)', transition:'all .14s'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:9, padding:'11px 13px', borderBottom: node.sub?'1px solid var(--fill-03)':'none'}}>
        <span style={{width:30, height:30, borderRadius:8, background:s.bg, color:s.c, display:'grid', placeItems:'center', flexShrink:0}}>{WfIc(s.icon,{style:{width:16, height:16}})}</span>
        <div style={{minWidth:0, flex:1}}>
          <div style={{fontSize:9.5, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:s.c, whiteSpace:'nowrap'}}>{s.l}</div>
          <div style={{fontSize:13.5, fontWeight:700, color:'var(--label-01)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{node.title}</div>
        </div>
      </div>
      {node.sub ? <div style={{padding:'9px 13px', fontSize:12, color:'var(--label-02)', lineHeight:1.5, maxHeight:60, overflow:'hidden'}}>{node.sub}</div> : null}
    </div>
  );
}

/* add-step popover menu ("Thêm các bước") */
function WfStepMenu({ onPick }){
  const [q, setQ] = useWf('');
  const qq = q.trim().toLowerCase();
  const items = WF_ADD_STEPS.filter(s => !qq || s.t.toLowerCase().includes(qq));
  return (
    <div onClick={e=>e.stopPropagation()} style={{position:'absolute', left:'calc(50% + 20px)', top:-6, zIndex:30, width:308, background:'white', border:'1px solid var(--fill-04)', borderRadius:12, boxShadow:'0 18px 48px rgba(17,24,39,.22)', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderBottom:'1px solid var(--fill-03)'}}>
        <div style={{fontSize:14, fontWeight:800, flex:1}}>Thêm các bước</div>
        {WfIc('Search',{style:{width:15, height:15, color:'var(--label-03)'}})}
      </div>
      <div style={{padding:'8px 10px', borderBottom:'1px solid var(--fill-03)'}}>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm bước…" style={{width:'100%', border:'1px solid var(--fill-04)', borderRadius:8, padding:'6px 10px', fontSize:12.5, fontFamily:'inherit', outline:'none', boxSizing:'border-box'}}/>
      </div>
      <div className="scroll" style={{maxHeight:300, overflowY:'auto', padding:6}}>
        {items.map(s=>{ const sp=WF_NODES[s.k]; return (
          <button key={s.k} onClick={()=>onPick(s.k)} style={{display:'flex', gap:11, width:'100%', padding:'9px 10px', borderRadius:9, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{width:30, height:30, borderRadius:8, background:sp.bg, color:sp.c, display:'grid', placeItems:'center', flexShrink:0}}>{WfIc(sp.icon,{style:{width:16, height:16}})}</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13, fontWeight:700, color:'var(--label-01)'}}>{s.t}</div>
              <div style={{fontSize:11.5, color:'var(--label-02)', lineHeight:1.45, marginTop:1}}>{s.d}</div>
            </div>
          </button>
        );})}
      </div>
    </div>
  );
}

/* "+" insertion point between nodes */
function WfAddPoint({ open, onToggle, onPick }){
  return (
    <div style={{position:'relative', display:'flex', flexDirection:'column', alignItems:'center'}}>
      <div style={{width:2, height:13, background:'#C9D2DB'}}/>
      <button onClick={(e)=>{ e.stopPropagation(); onToggle(); }} title="Thêm bước" style={{width:24, height:24, borderRadius:'50%', border:'1px dashed '+(open?'var(--primary)':'#BFC8D2'), background:'white', color:open?'var(--primary)':'var(--label-03)', cursor:'pointer', display:'grid', placeItems:'center', fontSize:16, lineHeight:1, zIndex:5, padding:0}}>+</button>
      <div style={{width:2, height:13, background:'#C9D2DB'}}/>
      {open && <WfStepMenu onPick={onPick}/>}
    </div>
  );
}

/* collapsible section (props panel) */
function WfCollapse({ title, children, defaultOpen }){
  const [o, setO] = useWf(!!defaultOpen);
  return (
    <div style={{borderTop:'1px solid var(--fill-03)'}}>
      <button onClick={()=>setO(v=>!v)} style={{display:'flex', alignItems:'center', width:'100%', padding:'12px 0', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit'}}>
        <span style={{flex:1, textAlign:'left', fontSize:13, fontWeight:700, color:'var(--label-01)'}}>{title}</span>
        <span style={{transform:o?'rotate(180deg)':'none', transition:'transform .15s', color:'var(--label-03)'}}>{WfIc('ChevronDown',{style:{width:15, height:15}}) || '▾'}</span>
      </button>
      {o && <div style={{paddingBottom:12}}>{children}</div>}
    </div>
  );
}

/* =================== editor =================== */
function WfEditor({ wf, onBack, onSave }){
  const [name, setName] = useWf(wf.name);
  const [desc, setDesc] = useWf(wf.desc || '');
  const [status, setStatus] = useWf(wf.status || 'draft');
  const [nodes, setNodes] = useWf(wf.nodes.map(n=>({...n, cfg:n.cfg||{}})));
  const [sel, setSel] = useWf(nodes[0]?.id || null);
  const [addAt, setAddAt] = useWf(null);
  const [scale, setScale] = useWf(1);
  const [undoS, setUndoS] = useWf([]);
  const [redoS, setRedoS] = useWf([]);
  const [toast, setToast] = useWf('');

  const selNode = nodes.find(n=>n.id===sel);
  const commit = (next) => { setUndoS(u=>[...u.slice(-30), nodes]); setRedoS([]); setNodes(next); };
  const undo = () => { if(!undoS.length) return; setRedoS(r=>[nodes,...r]); setNodes(undoS[undoS.length-1]); setUndoS(u=>u.slice(0,-1)); };
  const redo = () => { if(!redoS.length) return; setUndoS(u=>[...u,nodes]); setNodes(redoS[0]); setRedoS(r=>r.slice(1)); };
  const insertAt = (index, kind) => {
    const node = { id:'n'+uid(), type:kind, title:WF_STEP_TITLE[kind]||(WF_NODES[kind]?.l)||'Bước mới', sub:'', cfg:{} };
    const next = [...nodes]; next.splice(index, 0, node); commit(next); setAddAt(null); setSel(node.id);
  };
  const updNode = (patch) => setNodes(ns => ns.map(n=>n.id===sel?{...n, ...patch, cfg:{...n.cfg, ...(patch.cfg||{})}}:n));
  const delNode = () => { if (selNode?.type==='trigger') return; commit(nodes.filter(n=>n.id!==sel)); setSel(null); };
  const save = (publish) => { const st = publish?'active':status; setStatus(st); onSave({ ...wf, name, desc, status:st, nodes, updated:'vừa xong' }); setToast(publish?('Đã xuất bản “'+(name||'workflow')+'”'):('Đã lưu “'+(name||'workflow')+'”')); setTimeout(()=>setToast(''), 1900); };

  const tbBtn = {width:30, height:30};

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}} onClick={()=>setAddAt(null)}>
      {/* top bar */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderBottom:'1px solid var(--fill-04)', background:'white', flexShrink:0}}>
        <button onClick={onBack} className="btn-icon" title="Quay lại">{WfIc('ArrowLeft',{style:{width:18, height:18}}) || '←'}</button>
        <div style={{display:'flex', flexDirection:'column', minWidth:200, maxWidth:340}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên quy trình" style={{fontSize:15.5, fontWeight:800, border:'none', outline:'none', fontFamily:'inherit', background:'transparent', color:'var(--label-01)', padding:0}}/>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Thêm mô tả…" style={{fontSize:11.5, border:'none', outline:'none', fontFamily:'inherit', background:'transparent', color:'var(--label-02)', padding:0, marginTop:1}}/>
        </div>
        <button onClick={()=>setStatus(s=>s==='draft'?'active':'draft')} style={{display:'inline-flex', alignItems:'center', gap:6, padding:'4px 11px', borderRadius:20, fontSize:11.5, fontWeight:700, cursor:'pointer', flexShrink:0,
          border:'1px solid '+(status==='active'?'transparent':'var(--fill-04)'), background: status==='active'?'var(--bg-green)':'white', color: status==='active'?'var(--pr-dark-2)':'var(--label-02)'}}>
          <span style={{width:7, height:7, borderRadius:'50%', background: status==='active'?'#1B9E5A':'var(--label-04)'}}/>
          {status==='active'?'Đang chạy':'Bản nháp'}
        </button>
        <span style={{flex:1}}/>
        <span style={{fontSize:11.5, color:'var(--label-03)', whiteSpace:'nowrap'}}>Cập nhật lần cuối · vừa xong</span>
        <button onClick={()=>setToast('Đang chạy kiểm thử quy trình…')} className="btn btn-ghost btn-sm" style={{gap:6}}>{WfIc('Eye',{style:{width:14, height:14}})} Bài kiểm tra</button>
        <button onClick={()=>save(false)} className="btn btn-ghost btn-sm" style={{gap:6}}>{WfIc('Check',{style:{width:14, height:14}})} Lưu</button>
        <button onClick={()=>save(true)} className="btn btn-primary btn-sm">Xuất bản</button>
      </div>

      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* canvas */}
        <div className="scroll" style={{flex:1, position:'relative', background:'var(--fill-02)', overflow:'auto',
          backgroundImage:'radial-gradient(circle, rgba(17,24,39,.06) 1px, transparent 1px)', backgroundSize:'22px 22px'}}>
          {/* toolbar */}
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute', top:16, left:16, zIndex:6, display:'flex', flexDirection:'column', gap:2, background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:4, boxShadow:'0 2px 8px rgba(17,24,39,.08)'}}>
            <button onClick={()=>setScale(s=>Math.min(1.4,+(s+0.1).toFixed(2)))} className="btn-icon" title="Phóng to" style={tbBtn}>+</button>
            <button onClick={()=>setScale(s=>Math.max(0.6,+(s-0.1).toFixed(2)))} className="btn-icon" title="Thu nhỏ" style={tbBtn}>−</button>
            <button onClick={()=>setScale(1)} className="btn-icon" title="Vừa khung" style={tbBtn}>{WfIc('Target',{style:{width:15, height:15}}) || '⊙'}</button>
            <div style={{height:1, background:'var(--fill-03)', margin:'3px 2px'}}/>
            <button onClick={undo} disabled={!undoS.length} className="btn-icon" title="Hoàn tác" style={{...tbBtn, opacity:undoS.length?1:.4}}>{WfIc('Undo',{style:{width:15, height:15}}) || '↶'}</button>
            <button onClick={redo} disabled={!redoS.length} className="btn-icon" title="Làm lại" style={{...tbBtn, opacity:redoS.length?1:.4}}>{WfIc('Redo',{style:{width:15, height:15}}) || '↷'}</button>
          </div>

          <div style={{padding:'46px 20px 70px', display:'flex', justifyContent:'center'}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', transform:'scale('+scale+')', transformOrigin:'top center', transition:'transform .15s'}}>
              {nodes.map((n,i)=>(
                <React.Fragment key={n.id}>
                  {i>0 && <WfAddPoint open={addAt===i} onToggle={()=>setAddAt(addAt===i?null:i)} onPick={(k)=>insertAt(i,k)}/>}
                  <WfNodeCard node={n} selected={sel===n.id} onSelect={()=>{ setSel(n.id); setAddAt(null); }}/>
                </React.Fragment>
              ))}
              <WfAddPoint open={addAt===nodes.length} onToggle={()=>setAddAt(addAt===nodes.length?null:nodes.length)} onPick={(k)=>insertAt(nodes.length,k)}/>
            </div>
          </div>

          <div style={{position:'absolute', bottom:14, left:18, fontSize:12, color:'var(--label-02)', fontWeight:600}}>Số bước: <span style={{color:'var(--primary)'}}>{nodes.length}/100</span></div>
        </div>

        {/* properties */}
        {selNode && (
          <div className="scroll" onClick={e=>e.stopPropagation()} style={{width:340, borderLeft:'1px solid var(--fill-04)', background:'white', padding:'18px 18px', flexShrink:0, overflow:'auto'}}>
            <div style={{display:'flex', alignItems:'center', gap:9, marginBottom:14}}>
              <span style={{width:30, height:30, borderRadius:8, background:WF_NODES[selNode.type].bg, color:WF_NODES[selNode.type].c, display:'grid', placeItems:'center', flexShrink:0}}>{WfIc(WF_NODES[selNode.type].icon,{style:{width:16, height:16}})}</span>
              <div style={{fontSize:15, fontWeight:800, whiteSpace:'nowrap'}}>{WF_NODES[selNode.type].l}</div>
            </div>

            <label style={wfLbl}>Tên bước</label>
            <input value={selNode.title} onChange={e=>updNode({title:e.target.value})} style={wfInput}/>

            <WfNodeProps node={selNode} upd={updNode}/>

            {selNode.type!=='trigger' && (
              <button onClick={delNode} style={{marginTop:14, width:'100%', padding:'9px', borderRadius:8, border:'1px solid #F0D4D0', background:'#FDF2F0', color:'#B5402F', fontSize:12.5, fontWeight:600, cursor:'pointer'}}>Xoá bước này</button>
            )}
          </div>
        )}
      </div>

      {toast && <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:1000, display:'flex', alignItems:'center', gap:8}}>{WfIc('Check',{style:{width:16, height:16, color:'#4ADE80'}})} {toast}</div>}
    </div>
  );
}

/* type-specific property fields */
function WfNodeProps({ node, upd }){
  const cfg = node.cfg || {};
  const t = node.type;
  const sel = (val, onChange, opts) => (
    <select value={val||''} onChange={e=>onChange(e.target.value)} style={wfInput}>{opts.map(o=><option key={o}>{o}</option>)}</select>
  );
  if (t==='trigger') return (
    <>
      <div style={{fontSize:12, color:'var(--label-02)', margin:'10px 0', lineHeight:1.5}}>Hãy chọn yếu tố kích hoạt sẽ bắt đầu quy trình làm việc này cho danh bạ của bạn.</div>
      <label style={wfLbl}>Yếu tố kích hoạt</label>
      {sel(cfg.trigger||'Cuộc trò chuyện bắt đầu', v=>upd({cfg:{trigger:v}, sub:v}), ['Cuộc trò chuyện bắt đầu','Liên hệ mới được tạo','Tin nhắn chứa từ khoá','Khách phản hồi broadcast','Nhấp quảng cáo Click-to-Chat','Ticket được tạo'])}
      <div style={{fontSize:11.5, color:'var(--label-03)', fontStyle:'italic', marginTop:-6, marginBottom:6}}>Các yếu tố kích hoạt liên hệ khi cuộc trò chuyện được bắt đầu.</div>
      <WfCollapse title="Điều kiện kích hoạt"><div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.5}}>Thêm điều kiện để giới hạn khi nào quy trình chạy (vd theo kênh, thẻ, vòng đời). <span style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>+ Thêm điều kiện</span></div></WfCollapse>
      <WfCollapse title="Biến kích hoạt"><div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.5}}>Lưu dữ liệu từ sự kiện kích hoạt vào biến để dùng ở các bước sau.</div></WfCollapse>
      <div style={{borderTop:'1px solid var(--fill-03)', marginTop:4, paddingTop:14}}>
        <div style={{fontSize:12.5, fontWeight:700, marginBottom:10}}>Cài đặt nâng cao</div>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{flex:1, fontSize:13, color:'var(--label-01)'}}>Kích hoạt một lần cho mỗi liên hệ</span>
          <button onClick={()=>upd({cfg:{once:!cfg.once}})} style={{width:40, height:23, borderRadius:14, border:'none', position:'relative', cursor:'pointer', flexShrink:0, background:cfg.once===false?'var(--fill-04)':'var(--primary)', transition:'background .18s'}}>
            <span style={{position:'absolute', top:2, left:cfg.once===false?2:19, width:19, height:19, borderRadius:'50%', background:'white', transition:'left .18s'}}/>
          </button>
        </div>
      </div>
    </>
  );
  if (t==='message') return (<>
    <label style={wfLbl}>Kênh gửi</label>
    {sel(cfg.channel||'Zalo OA', v=>upd({cfg:{channel:v}}), ['Zalo OA','Facebook','Web Chat','ZNS','SMS','Email'])}
    <label style={wfLbl}>Nội dung tin nhắn</label>
    <textarea value={node.sub} onChange={e=>upd({sub:e.target.value})} rows={4} placeholder="Chào $contact.name, …" style={{...wfInput, resize:'vertical', lineHeight:1.5}}/>
    <div style={{fontSize:11, color:'var(--label-03)'}}>Dùng biến: $contact.name, $assignee.firstname…</div>
  </>);
  if (t==='question') return (<>
    <label style={wfLbl}>Câu hỏi</label>
    <textarea value={node.sub} onChange={e=>upd({sub:e.target.value})} rows={3} placeholder="VD: Anh/chị quan tâm sản phẩm nào ạ?" style={{...wfInput, resize:'vertical', lineHeight:1.5}}/>
    <label style={wfLbl}>Lưu câu trả lời vào trường</label>
    {sel(cfg.field||'Ghi chú', v=>upd({cfg:{field:v}}), ['Ghi chú','Nhu cầu','Ngân sách','Nguồn','Trường tuỳ chỉnh…'])}
  </>);
  if (t==='assign') return (<>
    <label style={wfLbl}>Giao cho</label>
    {sel(cfg.assignee||'Nhân viên ít việc nhất', v=>upd({cfg:{assignee:v}, sub:v}), ['Nhân viên ít việc nhất','Luân phiên (round-robin)','Chỉ nhân viên trực tuyến','Đội Sales','Đội CSKH','Nhân viên cụ thể…'])}
  </>);
  if (t==='branch') return (<>
    <label style={wfLbl}>Trường kiểm tra</label>
    {sel(cfg.field||'Intent', v=>upd({cfg:{field:v}, sub:(v||'')+' '+(cfg.op||'=')+' '+(cfg.value||'')}), ['Intent','Thẻ','Vòng đời','Kênh','Lead score','Đã đọc tin'])}
    <label style={wfLbl}>Điều kiện</label>
    {sel(cfg.op||'bằng', v=>upd({cfg:{op:v}, sub:(cfg.field||'')+' '+v+' '+(cfg.value||'')}), ['bằng','khác','chứa','lớn hơn','nhỏ hơn'])}
    <label style={wfLbl}>Giá trị</label>
    <input value={cfg.value||''} onChange={e=>upd({cfg:{value:e.target.value}, sub:(cfg.field||'')+' '+(cfg.op||'=')+' '+e.target.value})} placeholder="VD: Hỏi giá" style={wfInput}/>
  </>);
  if (t==='update_contact') return (<>
    <label style={wfLbl}>Trường liên hệ</label>
    {sel(cfg.field||'Vòng đời', v=>upd({cfg:{field:v}, sub:'Đặt '+v+' = '+(cfg.value||'')}), ['Vòng đời','Nguồn','Phụ trách','Trường tuỳ chỉnh…'])}
    <label style={wfLbl}>Giá trị mới</label>
    <input value={cfg.value||''} onChange={e=>upd({cfg:{value:e.target.value}, sub:'Đặt '+(cfg.field||'')+' = '+e.target.value})} placeholder="VD: Khách tiềm năng" style={wfInput}/>
  </>);
  if (t==='update_tag') return (<>
    <label style={wfLbl}>Hành động</label>
    <div style={{display:'flex', gap:6, marginBottom:12}}>
      {['Thêm thẻ','Xoá thẻ'].map(a=>{ const on=(cfg.act||'Thêm thẻ')===a; return (
        <button key={a} onClick={()=>upd({cfg:{act:a}})} style={{flex:1, padding:'7px', borderRadius:8, fontSize:12.5, fontWeight:600, cursor:'pointer', border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'), background:on?'var(--bg-green)':'white', color:on?'var(--pr-dark-2)':'var(--label-02)'}}>{a}</button>
      );})}
    </div>
    <label style={wfLbl}>Thẻ</label>
    <input value={cfg.tag||''} onChange={e=>upd({cfg:{tag:e.target.value}, sub:(cfg.act||'Thêm thẻ')+': '+e.target.value})} placeholder="VD: VIP, Đã chăm sóc" style={wfInput}/>
  </>);
  if (t==='wait') return (<>
    <label style={wfLbl}>Thời gian chờ</label>
    <div style={{display:'flex', gap:8}}>
      <input type="number" min={1} value={cfg.amount||1} onChange={e=>upd({cfg:{amount:e.target.value}, sub:'Chờ '+e.target.value+' '+(cfg.unit||'giờ')})} style={{...wfInput, width:90, marginBottom:0}}/>
      <select value={cfg.unit||'giờ'} onChange={e=>upd({cfg:{unit:e.target.value}, sub:'Chờ '+(cfg.amount||1)+' '+e.target.value})} style={{...wfInput, flex:1, marginBottom:0}}>{['phút','giờ','ngày'].map(o=><option key={o}>{o}</option>)}</select>
    </div>
  </>);
  if (t==='ai') return (<>
    <label style={wfLbl}>AI Agent xử lý</label>
    {sel(cfg.agent||'Sales Agent', v=>upd({cfg:{agent:v}}), ['Sales Agent','Support Agent','Operations Agent'])}
    <label style={wfLbl}>Hướng dẫn cho AI</label>
    <textarea value={node.sub} onChange={e=>upd({sub:e.target.value})} rows={3} placeholder="VD: Soạn tin cá nhân hoá nhắc khách gia hạn" style={{...wfInput, resize:'vertical', lineHeight:1.5}}/>
  </>);
  if (t==='goal') return (<>
    <label style={wfLbl}>Tên mục tiêu</label>
    <input value={node.sub||''} onChange={e=>upd({sub:e.target.value})} placeholder="VD: Đã đặt lịch, Chốt đơn…" style={wfInput}/>
    <div style={{fontSize:11.5, color:'var(--label-03)', lineHeight:1.5}}>Quy trình được tính là thành công khi liên hệ chạm tới mục tiêu này.</div>
  </>);
  return (<>
    <label style={wfLbl}>Ghi chú / cấu hình</label>
    <textarea value={node.sub} onChange={e=>upd({sub:e.target.value})} rows={3} placeholder="Mô tả bước này…" style={{...wfInput, resize:'vertical', lineHeight:1.5}}/>
  </>);
}

/* =================== create modal (Flow 1) =================== */
function WfCreateModal({ onClose, onCreate }){
  const [name, setName] = useWf('');
  const [desc, setDesc] = useWf('');
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(15,23,42,.5)', zIndex:1200, display:'grid', placeItems:'center', padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:480, background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
        <div style={{padding:'18px 22px 14px', borderBottom:'1px solid var(--fill-03)'}}>
          <div style={{fontSize:17, fontWeight:800}}>Tạo workflow mới</div>
          <div style={{fontSize:12.5, color:'var(--label-02)', marginTop:3}}>Đặt tên và mô tả quy trình — bạn sẽ dựng các bước ở bước kế tiếp.</div>
        </div>
        <div style={{padding:'18px 22px'}}>
          <label style={wfLbl}>Tên quy trình *</label>
          <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Chăm sóc khách sau bán" style={wfInput}/>
          <label style={wfLbl}>Mô tả</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="Quy trình này dùng để làm gì?" style={{...wfInput, resize:'vertical', lineHeight:1.5}}/>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 22px', borderTop:'1px solid var(--fill-03)', background:'var(--fill-02)'}}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Huỷ</button>
          <button disabled={!name.trim()} onClick={()=>onCreate(name.trim(), desc.trim())} className="btn btn-primary btn-sm" style={{opacity:name.trim()?1:.5}}>Tạo & mở editor →</button>
        </div>
      </div>
    </div>
  );
}

/* =================== template gallery (Flow 2) =================== */
const WF_TPL_CATS = [
  { k:'all',      l:'Tất cả các mẫu' },
  { k:'auto',     l:'Trả lời tự động' },
  { k:'routing',  l:'Định tuyến & phân công' },
  { k:'business', l:'Quy trình kinh doanh' },
  { k:'industry', l:'Theo ngành dịch vụ' },
  { k:'monitor',  l:'Giám sát & báo cáo' },
  { k:'ads',      l:'Quảng cáo & Click-to-chat' },
];

const WF_TPL = [
  // Trả lời tự động
  { id:'tp_away', cat:'auto', icon:'Clock', badge:'Bell', c:'#6B7280', name:'Tin nhắn vắng mặt',
    desc:'Gửi tin tự động trả lời khi một người liên hệ bắt đầu cuộc trò chuyện ngoài giờ làm việc.',
    nodes:[['trigger','Khách nhắn tin',''],['condition','Ngoài giờ làm việc?',''],['action','Gửi tin vắng mặt',''],['goal','Đã phản hồi','']] },
  { id:'tp_hours', cat:'auto', icon:'Clock', badge:'Check', c:'#2A6FDB', name:'Tin nhắn tự động kèm giờ làm việc',
    desc:'Gửi tin tự động trả lời khi khách nhắn ngoài giờ; bật/tắt bằng cách chuyển đổi quy trình.',
    nodes:[['trigger','Khách nhắn tin',''],['condition','Trong giờ làm việc?',''],['action','Auto-reply theo khung giờ',''],['goal','Đã phản hồi','']] },
  { id:'tp_ai247', cat:'auto', icon:'Sparkles', badge:'Sparkles', c:'#6E48E6', name:'AI trả lời tức thì 24/7',
    desc:'AI Agent trả lời ngay khi có tin nhắn mới, tự chuyển nhân viên khi độ tin cậy thấp.',
    nodes:[['trigger','Tin nhắn mới',''],['ai','AI Agent trả lời',''],['condition','AI đủ tự tin?',''],['action','Chuyển nhân viên nếu cần',''],['goal','Đã xử lý','']] },

  // Theo ngành dịch vụ (nhóm ngành đã lưu)
  { id:'tp_spa1', cat:'industry', icon:'Heart', badge:'Bell', c:'#DB2777', name:'Spa · Nhắc liệu trình tiếp theo',
    desc:'Sau buổi trị liệu → chờ theo phác đồ → AI gợi ý + nhắc khách đặt buổi kế tiếp.',
    nodes:[['trigger','Hoàn tất 1 buổi',''],['wait','Chờ theo phác đồ',''],['ai','AI gợi ý buổi kế',''],['action','Gửi Zalo nhắc đặt lịch',''],['goal','Đặt buổi tiếp','']] },
  { id:'tp_spa2', cat:'industry', icon:'Heart', badge:'Sparkles', c:'#DB2777', name:'Spa · Chăm sóc sau dịch vụ',
    desc:'Sau 1 ngày → hỏi thăm kết quả + hướng dẫn chăm sóc tại nhà.',
    nodes:[['trigger','Sau dịch vụ 1 ngày',''],['action','Hỏi thăm kết quả',''],['ai','AI tư vấn chăm sóc',''],['goal','Khách hài lòng','']] },
  { id:'tp_dent1', cat:'industry', icon:'Activity', badge:'Bell', c:'#0E9B94', name:'Nha khoa/PK · Nhắc tái khám định kỳ',
    desc:'Theo lịch tái khám (3/6 tháng) → nhắc khách đặt lịch, AI nhắc lần 2 nếu chưa đặt.',
    nodes:[['trigger','Đến kỳ tái khám',''],['action','Gửi nhắc tái khám',''],['condition','Đã đặt lịch?',''],['ai','AI nhắc lần 2',''],['goal','Đặt tái khám','']] },
  { id:'tp_dent2', cat:'industry', icon:'Calendar', badge:'Check', c:'#0E9B94', name:'Phòng khám · Xác nhận lịch khám',
    desc:'Trước lịch khám 1 ngày → xác nhận, cho phép đổi/huỷ.',
    nodes:[['trigger','Trước khám 1 ngày',''],['action','Gửi xác nhận lịch',''],['condition','Khách phản hồi?',''],['action','Cập nhật lịch hẹn',''],['goal','Xác nhận khám','']] },
  { id:'tp_edu1', cat:'industry', icon:'Bell', badge:'Bell', c:'#C9820B', name:'Anh ngữ/Giáo dục · Nhắc học phí & gia hạn',
    desc:'Trước hạn học phí 5 ngày → nhắc phụ huynh, AI nhắc khéo lần 2.',
    nodes:[['trigger','Trước hạn 5 ngày',''],['action','Nhắc học phí',''],['wait','Chờ 2 ngày',''],['ai','AI nhắc khéo lần 2',''],['goal','Đã gia hạn','']] },
  { id:'tp_edu2', cat:'industry', icon:'TrendUp', badge:'Check', c:'#C9820B', name:'Trung tâm · Chăm sóc học viên mới',
    desc:'Đăng ký khoá → gửi lịch học + tài liệu + khảo sát đầu vào.',
    nodes:[['trigger','Đăng ký khoá học',''],['action','Gửi lịch + tài liệu',''],['action','Khảo sát đầu vào',''],['goal','Sẵn sàng học','']] },
  { id:'tp_gym1', cat:'industry', icon:'TrendUp', badge:'Bell', c:'#16A34A', name:'Gym · Nhắc gia hạn thẻ tập',
    desc:'Thẻ sắp hết hạn 7 ngày → ưu đãi gia hạn sớm + AI follow-up PT.',
    nodes:[['trigger','Thẻ còn 7 ngày',''],['action','Gửi ưu đãi gia hạn',''],['condition','Đã gia hạn?',''],['ai','AI follow-up PT',''],['goal','Gia hạn thẻ','']] },
  { id:'tp_gym2', cat:'industry', icon:'Heart', badge:'Sparkles', c:'#16A34A', name:'Fitness · Kéo lại hội viên vắng',
    desc:'Hội viên 14 ngày không check-in → nhắc + tặng buổi PT.',
    nodes:[['trigger','14 ngày không tập',''],['action','Tặng 1 buổi PT',''],['ai','AI động viên cá nhân',''],['goal','Quay lại tập','']] },
  { id:'tp_car1', cat:'industry', icon:'Bell', badge:'Bell', c:'#2563EB', name:'Ô tô · Nhắc bảo dưỡng định kỳ',
    desc:'Theo km/thời gian → nhắc lịch bảo dưỡng, AI đề xuất gói dịch vụ.',
    nodes:[['trigger','Đến kỳ bảo dưỡng',''],['action','Gửi nhắc bảo dưỡng',''],['ai','AI đề xuất gói dịch vụ',''],['action','Đặt lịch garage',''],['goal','Đặt bảo dưỡng','']] },
  { id:'tp_car2', cat:'industry', icon:'Heart', badge:'Check', c:'#2563EB', name:'Dịch vụ xe · Chăm sóc sau sửa chữa',
    desc:'Sau khi giao xe → hỏi thăm + bảo hành + khảo sát.',
    nodes:[['trigger','Giao xe xong',''],['wait','Chờ 2 ngày',''],['action','Hỏi thăm + bảo hành',''],['goal','Khách hài lòng','']] },
  { id:'tp_trv1', cat:'industry', icon:'Calendar', badge:'Bell', c:'#0EA5E9', name:'Du lịch · Xác nhận & nhắc tour',
    desc:'Trước chuyến 2 ngày → gửi lịch trình + nhắc chuẩn bị giấy tờ.',
    nodes:[['trigger','Trước chuyến 2 ngày',''],['action','Gửi lịch trình',''],['action','Nhắc chuẩn bị giấy tờ',''],['goal','Sẵn sàng đi','']] },
  { id:'tp_trv2', cat:'industry', icon:'Broadcast', badge:'Sparkles', c:'#0EA5E9', name:'Lưu trú · Re-book mùa sau',
    desc:'Sau chuyến đi → cảm ơn + xin review + ưu đãi đặt lại mùa sau.',
    nodes:[['trigger','Kết thúc chuyến',''],['action','Cảm ơn + xin review',''],['wait','Chờ 30 ngày',''],['ai','AI gợi ý tour mới',''],['goal','Đặt lại','']] },

  // Định tuyến & phân công
  { id:'tp_least', cat:'routing', icon:'Users', badge:'ArrowRight', c:'#1B9E5A', name:'Phân công cho người ít việc nhất',
    desc:'Mỗi khi khách bắt đầu trò chuyện, chỉ định cho thành viên đang có ít hội thoại mở nhất.',
    nodes:[['trigger','Hội thoại mới',''],['action','Tìm NV ít việc nhất',''],['action','Phân công hội thoại',''],['goal','Đã phân công','']] },
  { id:'tp_rr', cat:'routing', icon:'Route', badge:'Refresh', c:'#1B9E5A', name:'Luân phiên (round-robin)',
    desc:'Phân công khách lần lượt cho từng thành viên trong nhóm theo hình thức luân phiên.',
    nodes:[['trigger','Hội thoại mới',''],['action','Chọn NV kế tiếp (luân phiên)',''],['action','Phân công',''],['goal','Đã phân công','']] },
  { id:'tp_online', cat:'routing', icon:'Users', badge:'Bell', c:'#1B9E5A', name:'Vòng tròn + chỉ nhân viên trực tuyến',
    desc:'Luân phiên phân công nhưng chỉ gán cho thành viên đang trực tuyến.',
    nodes:[['trigger','Hội thoại mới',''],['condition','Có NV trực tuyến?',''],['action','Luân phiên NV online',''],['goal','Đã phân công','']] },
  { id:'tp_unassign', cat:'routing', icon:'Route', badge:'Close', c:'#6B7280', name:'Hủy phân công sau khi kết thúc',
    desc:'Hủy gán nhân viên cho hội thoại mỗi khi cuộc trò chuyện kết thúc, giải phóng tải.',
    nodes:[['trigger','Hội thoại kết thúc',''],['action','Gỡ phân công nhân viên',''],['goal','Đã giải phóng','']] },

  // Quy trình kinh doanh
  { id:'tp_welcome', cat:'business', icon:'Broadcast', badge:'Send', c:'#2A6FDB', name:'Chào mừng khách mới',
    desc:'Khi khách đăng ký → gửi Zalo welcome → chờ 1 ngày → email hướng dẫn bắt đầu.',
    nodes:[['trigger','Khách mới đăng ký','contact_created'],['action','Gửi Zalo welcome','Template · Chào mừng'],['wait','Chờ 1 ngày',''],['action','Email hướng dẫn','3 bước bắt đầu'],['goal','Đã onboard','']] },
  { id:'tp_cart', cat:'business', icon:'Broadcast', badge:'Bell', c:'#2A6FDB', name:'Nhắc giỏ hàng bỏ quên',
    desc:'Hội thoại có ý định mua nhưng chưa chốt → AI soạn tin nhắc sau 3 giờ.',
    nodes:[['trigger','Có giỏ hàng chưa chốt',''],['wait','Chờ 3 giờ',''],['ai','AI soạn tin nhắc',''],['action','Gửi ZNS ưu đãi',''],['goal','Khách chốt đơn','']] },
  { id:'tp_winback', cat:'business', icon:'Broadcast', badge:'Refresh', c:'#2A6FDB', name:'Win-back khách 60 ngày',
    desc:'Khách 60 ngày không tương tác → chiến dịch voucher + AI follow-up kéo lại.',
    nodes:[['trigger','60 ngày không đặt',''],['action','Gửi voucher SMS',''],['condition','Đã mở tin?',''],['ai','AI follow-up cá nhân',''],['goal','Re-engaged','']] },
  { id:'tp_lead', cat:'business', icon:'TrendUp', badge:'Check', c:'#1B9E5A', name:'Nuôi dưỡng lead',
    desc:'Lead mới → AI chấm điểm → phân công Sales → tạo cơ hội trong pipeline.',
    nodes:[['trigger','Lead mới',''],['ai','AI chấm điểm lead',''],['condition','Điểm ≥ 80?',''],['action','Phân công Sales',''],['goal','Tạo cơ hội','']] },
  { id:'tp_quote', cat:'business', icon:'TrendUp', badge:'Send', c:'#1B9E5A', name:'Theo dõi sau báo giá',
    desc:'Đã gửi báo giá → chờ 2 ngày → nhắc khéo nếu khách chưa phản hồi.',
    nodes:[['trigger','Đã gửi báo giá',''],['wait','Chờ 2 ngày',''],['condition','Khách đã reply?',''],['ai','AI soạn nhắc khéo',''],['goal','Chốt deal','']] },

  // Giám sát & báo cáo
  { id:'tp_sla', cat:'monitor', icon:'Bell', badge:'Bell', c:'#C9820B', name:'Cảnh báo SLA breach',
    desc:'Ticket sắp quá SLA → cảnh báo quản lý và tự động escalation cấp 2.',
    nodes:[['trigger','Sắp quá SLA',''],['action','Cảnh báo quản lý',''],['condition','Quá hạn?',''],['action','Escalation cấp 2',''],['goal','Đã xử lý','']] },
  { id:'tp_csat', cat:'monitor', icon:'Activity', badge:'Check', c:'#C9820B', name:'Khảo sát CSAT sau xử lý',
    desc:'Ticket đóng → chờ 1 giờ → gửi khảo sát mức độ hài lòng cho khách.',
    nodes:[['trigger','Ticket đóng',''],['wait','Chờ 1 giờ',''],['action','Gửi khảo sát CSAT',''],['goal','Có phản hồi','']] },
  { id:'tp_ticket', cat:'monitor', icon:'Activity', badge:'ArrowRight', c:'#C9820B', name:'Tự động tạo ticket theo từ khoá',
    desc:'Tin nhắn chứa từ khoá "hoàn tiền" → tạo ticket ưu tiên cao và phân công CSKH.',
    nodes:[['trigger','Từ khoá "hoàn tiền"',''],['action','Tạo ticket ưu tiên',''],['action','Phân công CSKH',''],['goal','Ticket xử lý','']] },

  // Quảng cáo & Click-to-chat
  { id:'tp_c2c', cat:'ads', icon:'Calendar', badge:'Calendar', c:'#6E48E6', name:'Click-to-chat → Lên lịch hẹn',
    desc:'Khách nhấp quảng cáo Click-to-Chat → gửi lời chào kèm link đặt lịch hẹn.',
    nodes:[['trigger','Nhấp quảng cáo Click-to-Chat',''],['action','Gửi lời chào + link đặt lịch',''],['action','Tạo lịch hẹn trên Calendar',''],['goal','Đã đặt lịch','']] },
  { id:'tp_broadcast', cat:'ads', icon:'Broadcast', badge:'Bell', c:'#6E48E6', name:'Phản hồi phát sóng: Chỉ định nhân viên',
    desc:'Phân công khách phản hồi chiến dịch broadcast cho nhân viên theo kênh phản hồi.',
    nodes:[['trigger','Khách phản hồi broadcast',''],['action','Chỉ định nhân viên',''],['ai','AI gợi ý tư vấn',''],['goal','Đã tiếp nhận','']] },
];

function WfTplCard({ t, onPick }){
  return (
    <div style={{border:'1px solid var(--fill-04)', borderRadius:14, padding:14, background:'white', display:'flex', flexDirection:'column'}}>
      <div style={{position:'relative', height:122, borderRadius:10, background:'var(--fill-02)', backgroundImage:'radial-gradient(var(--fill-04) 1.2px, transparent 1.2px)', backgroundSize:'14px 14px', display:'grid', placeItems:'center', marginBottom:12, overflow:'hidden'}}>
        <span style={{position:'absolute', top:11, right:13, color:'var(--label-04)'}}>{WfIc('MessageSquare',{style:{width:17, height:17}})}</span>
        <div style={{position:'relative'}}>
          <span style={{width:56, height:56, borderRadius:15, background:t.c+'1F', color:t.c, display:'grid', placeItems:'center'}}>{WfIc(t.icon,{style:{width:27, height:27}})}</span>
          <span style={{position:'absolute', top:-6, right:-8, width:24, height:24, borderRadius:'50%', background:t.c, color:'white', display:'grid', placeItems:'center', boxShadow:'0 2px 7px rgba(17,24,39,.18)'}}>{WfIc(t.badge,{style:{width:12, height:12}}) || '✓'}</span>
        </div>
      </div>
      <div style={{fontSize:14, fontWeight:700, color:'var(--label-01)'}}>{t.name}</div>
      <div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.55, marginTop:5, flex:1}}>{t.desc}</div>
      <button onClick={()=>onPick(t)} className="btn btn-ghost btn-sm" style={{marginTop:13, alignSelf:'flex-start'}}>Sử dụng mẫu</button>
    </div>
  );
}

const WF_CAT_BENEFITS = {
  industry: ['Mẫu quy trình tối ưu cho từng nhóm ngành dịch vụ đã lưu.','Tự động chăm sóc theo đặc thù: tái khám, gia hạn, bảo dưỡng, re-book.','Triển khai nhanh — chỉ cần đổi nội dung tin nhắn cho thương hiệu.'],
  auto:     ['Phản hồi khách ngay lập tức, không bỏ lỡ tin nhắn ngoài giờ.','Giảm tải cho nhân viên nhờ câu trả lời tự động.','Trải nghiệm nhất quán trên mọi kênh đã kết nối.'],
  routing:  ['Đảm bảo mọi hội thoại được chuyển cho nhân viên một cách kịp thời.','Cân bằng tải, tránh nhân viên bị quá tải với quá nhiều hội thoại mở.','Cải thiện thời gian phản hồi và sự hài lòng của khách hàng.'],
  business: ['Tự động nuôi dưỡng khách theo từng giai đoạn vòng đời.','Tăng tỉ lệ chuyển đổi nhờ chạm đúng thời điểm.','Tiết kiệm thời gian thao tác thủ công cho đội ngũ.'],
  monitor:  ['Không bỏ sót ticket quá hạn hay khách chưa hài lòng.','Tự động cảnh báo và escalation đến đúng người.','Có dữ liệu đo lường để cải tiến chất lượng dịch vụ.'],
  ads:      ['Chuyển khách từ quảng cáo thành hội thoại và lịch hẹn.','Phân công đúng nhân viên cho từng chiến dịch.','Tối ưu chi phí quảng cáo nhờ phản hồi nhanh.'],
};

function WfPreviewNode({ n }){
  const s = WF_NODES[n[0]] || WF_NODES.action;
  return (
    <div style={{width:264, border:'1px solid '+s.br, borderRadius:12, background:'white', boxShadow:'0 1px 3px rgba(17,24,39,.07)', overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', gap:9, padding:'11px 13px', borderBottom: n[2]?'1px solid var(--fill-03)':'none'}}>
        <span style={{width:28, height:28, borderRadius:8, background:s.bg, color:s.c, display:'grid', placeItems:'center', flexShrink:0}}>{WfIc(s.icon,{style:{width:15, height:15}})}</span>
        <span style={{fontSize:13.5, fontWeight:700, flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{n[1]}</span>
      </div>
      {n[2] ? <div style={{padding:'9px 13px', fontSize:12, color:'var(--label-02)', lineHeight:1.5}}>{n[2]}</div> : null}
    </div>
  );
}

function WfTemplateDetail({ t, onBack, onUse, onScratch }){
  const [scale, setScale] = useWf(1);
  const nodes = t.nodes;
  const benefits = WF_CAT_BENEFITS[t.cat] || [];
  return (
    <div style={{position:'fixed', inset:0, zIndex:1200, background:'white', display:'flex', flexDirection:'column'}}>
      {/* top bar */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 22px', borderBottom:'1px solid var(--fill-04)', flexShrink:0}}>
        <button onClick={onBack} className="btn-icon" title="Quay lại danh sách mẫu">{WfIc('ArrowLeft',{style:{width:18, height:18}}) || '←'}</button>
        <div style={{fontSize:16, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.name}</div>
        <span style={{flex:1}}/>
        <button onClick={onUse} className="btn btn-primary btn-sm" style={{gap:6, whiteSpace:'nowrap'}}>{WfIc('Check',{style:{width:14, height:14}})} Sử dụng mẫu</button>
      </div>

      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* left info */}
        <div className="scroll" style={{width:'46%', maxWidth:560, minWidth:380, borderRight:'1px solid var(--fill-04)', overflowY:'auto', padding:'24px 28px'}}>
          <p style={{fontSize:13.5, color:'var(--label-01)', lineHeight:1.65, margin:0}}>{t.long || t.desc}</p>

          <div style={{fontSize:14.5, fontWeight:800, marginTop:24, marginBottom:10}}>Những lợi ích</div>
          <ul style={{margin:0, paddingLeft:18, display:'flex', flexDirection:'column', gap:8}}>
            {benefits.map((b,i)=><li key={i} style={{fontSize:13, color:'var(--label-01)', lineHeight:1.55}}>{b}</li>)}
          </ul>

          <div style={{fontSize:14.5, fontWeight:800, marginTop:24, marginBottom:10}}>Cách thức hoạt động</div>
          <ol style={{margin:0, paddingLeft:18, display:'flex', flexDirection:'column', gap:8}}>
            {nodes.map((n,i)=>(
              <li key={i} style={{fontSize:13, color:'var(--label-01)', lineHeight:1.55}}>
                {n[1]}{n[2]?<span style={{color:'var(--label-03)'}}> — {n[2]}</span>:null}
              </li>
            ))}
          </ol>

          <button onClick={onUse} style={{display:'inline-block', marginTop:20, fontSize:13, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0}}>Tìm hiểu thêm về mẫu này →</button>
        </div>

        {/* right preview canvas */}
        <div style={{flex:1, position:'relative', background:'var(--fill-02)', backgroundImage:'radial-gradient(rgba(17,24,39,.06) 1px, transparent 1px)', backgroundSize:'22px 22px', overflow:'hidden'}}>
          {/* zoom controls */}
          <div style={{position:'absolute', top:16, left:16, zIndex:2, display:'flex', flexDirection:'column', gap:2, background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:4, boxShadow:'0 2px 8px rgba(17,24,39,.08)'}}>
            <button onClick={()=>setScale(s=>Math.min(1.4, +(s+0.1).toFixed(2)))} className="btn-icon" title="Phóng to" style={{width:30, height:30}}>+</button>
            <button onClick={()=>setScale(s=>Math.max(0.6, +(s-0.1).toFixed(2)))} className="btn-icon" title="Thu nhỏ" style={{width:30, height:30}}>−</button>
            <button onClick={()=>setScale(1)} className="btn-icon" title="Vừa khung" style={{width:30, height:30}}>{WfIc('Target',{style:{width:15, height:15}}) || '⊙'}</button>
            <button onClick={()=>setScale(1)} className="btn-icon" title="Toàn màn hình" style={{width:30, height:30}}>{WfIc('Maximize',{style:{width:14, height:14}}) || '⤢'}</button>
          </div>

          <div className="scroll" style={{position:'absolute', inset:0, overflow:'auto', padding:'40px 20px 60px'}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', transform:'scale('+scale+')', transformOrigin:'top center', transition:'transform .15s'}}>
              {nodes.map((n,i)=>(
                <React.Fragment key={i}>
                  {i>0 && <div style={{width:2, height:26, background:'#C9D2DB'}}/>}
                  {n[0]==='goal' && <><div style={{padding:'3px 12px', borderRadius:14, background:'var(--bg-green)', color:'var(--pr-dark-2)', fontSize:11.5, fontWeight:700}}>Thành công</div><div style={{width:2, height:20, background:'#C9D2DB'}}/></>}
                  <WfPreviewNode n={n}/>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div style={{position:'absolute', bottom:14, left:18, fontSize:12, color:'var(--label-02)', fontWeight:600}}>Số bước: <span style={{color:'var(--primary)'}}>{nodes.length}/100</span></div>
        </div>
      </div>
    </div>
  );
}

function WfTemplateBrowser({ onClose, onPick, onScratch }){
  const [cat, setCat] = useWf('all');
  const [q, setQ] = useWf('');
  const [sel, setSel] = useWf(null);
  const qq = q.trim().toLowerCase();
  const listAll = WF_TPL.filter(t => (cat==='all' || t.cat===cat) && (!qq || t.name.toLowerCase().includes(qq) || t.desc.toLowerCase().includes(qq)));
  const list = listAll;
  const catCount = (k) => k==='all' ? WF_TPL.length : WF_TPL.filter(t=>t.cat===k).length;

  if (sel) return <WfTemplateDetail t={sel} onBack={()=>setSel(null)} onUse={()=>onPick(sel)} onScratch={onScratch}/>;

  return (
    <div style={{position:'fixed', inset:0, zIndex:1200, background:'white', display:'flex', flexDirection:'column'}}>
      {/* top bar */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'13px 22px', borderBottom:'1px solid var(--fill-04)', flexShrink:0}}>
        <button onClick={onClose} className="btn-icon" title="Quay lại">{WfIc('ArrowLeft',{style:{width:18, height:18}}) || '←'}</button>
        <div>
          <div style={{fontSize:16, fontWeight:800, whiteSpace:'nowrap'}}>Xem các mẫu quy trình làm việc</div>
          <div style={{fontSize:12, color:'var(--label-02)', marginTop:1}}>Chọn một mẫu để bắt đầu tạo quy trình làm việc.</div>
        </div>
        <span style={{flex:1}}/>
        <button onClick={onScratch} className="btn btn-primary btn-sm" style={{gap:6, whiteSpace:'nowrap'}}>{WfIc('Plus',{style:{width:14, height:14}})} Bắt đầu lại từ đầu</button>
      </div>

      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* left nav */}
        <div style={{width:248, borderRight:'1px solid var(--fill-04)', padding:'16px 12px', flexShrink:0, display:'flex', flexDirection:'column', gap:4}}>
          <div style={{display:'flex', alignItems:'center', gap:7, padding:'8px 10px', border:'1px solid var(--fill-04)', borderRadius:9, marginBottom:8}}>
            {WfIc('Search',{style:{width:14, height:14, color:'var(--label-03)', flexShrink:0}})}
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Mẫu tìm kiếm" style={{flex:1, border:'none', outline:'none', background:'transparent', fontSize:12.5, fontFamily:'inherit', minWidth:0}}/>
          </div>
          {WF_TPL_CATS.map(c=>{ const on=cat===c.k; return (
            <button key={c.k} onClick={()=>setCat(c.k)} style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 11px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
              fontSize:13, fontWeight: on?700:500, background: on?'var(--bg-green)':'transparent', color: on?'var(--pr-dark-2)':'var(--label-01)'}}
              onMouseEnter={e=>!on&&(e.currentTarget.style.background='var(--fill-02)')} onMouseLeave={e=>!on&&(e.currentTarget.style.background='transparent')}>
              <span style={{flex:1}}>{c.l}</span>
              <span style={{fontSize:11, fontWeight:700, color:'var(--label-03)'}}>{catCount(c.k)}</span>
            </button>
          );})}
        </div>

        {/* grid */}
        <div className="scroll" style={{flex:1, overflowY:'auto', padding:'20px 24px', background:'var(--fill-02)'}}>
          {list.length===0 ? (
            <div style={{padding:'60px 20px', textAlign:'center', color:'var(--label-03)', fontSize:13}}>Không tìm thấy mẫu phù hợp với “{q}”.</div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16}}>
              {list.map(t => <WfTplCard key={t.id} t={t} onPick={setSel}/>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================== module root =================== */
function WorkflowModule(){
  const [list, setList] = useWf(wfInitList);
  const [editing, setEditing] = useWf(null);   // workflow object being edited
  const [modal, setModal] = useWf(null);        // 'create' | 'template'
  useWfEf(()=>{ wfWrite(list); }, [list]);

  const openNew = (name, desc) => {
    const wf = { id:uid(), name, desc, status:'draft', updated:'vừa tạo', nodes:mkNodes([['trigger','Khi nào chạy?','Chọn sự kiện kích hoạt']]) };
    setModal(null); setEditing(wf);
  };
  const openTpl = (t) => {
    const wf = { id:uid(), name:t.name, desc:t.desc, status:'draft', updated:'vừa tạo', nodes:mkNodes(t.nodes) };
    setModal(null); setEditing(wf);
  };
  const saveWf = (wf) => { setList(l => { const i=l.findIndex(x=>x.id===wf.id); if(i>=0){ const c=[...l]; c[i]=wf; return c; } return [...l, wf]; }); setEditing(wf); };

  if (editing) return <WfEditor wf={editing} onBack={()=>setEditing(null)} onSave={saveWf}/>;

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Workflow</h1>
        <span className="crumb">Tự động hoá quy trình · Marketing · Sales · Hỗ trợ · Thông báo</span>
        <span className="spacer"/>
        {list.length>0 && <>
          <button onClick={()=>setModal('template')} className="btn btn-ghost btn-sm">{WfIc('Grid',{style:{width:14, height:14}})} Dùng mẫu</button>
          <button onClick={()=>setModal('create')} className="btn btn-primary btn-sm">{WfIc('Plus',{style:{width:14, height:14}})} Tạo workflow</button>
        </>}
        {window.AIAssistBtn && <window.AIAssistBtn label="Trợ lý AI" ctx="Workflow"/>}
      </div>

      <div className="scroll" style={{flex:1, background:'var(--fill-02)', overflow:'auto'}}>
        {list.length===0 ? (
          <div style={{minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px'}}>
            <WfHero/>
            <div style={{fontSize:20, fontWeight:800, color:'var(--label-01)', marginTop:18, lineHeight:1.35, textAlign:'center', whiteSpace:'nowrap'}}>Bạn chưa có quy trình làm việc.</div>
            <div style={{fontSize:13.5, color:'var(--label-02)', marginTop:10, maxWidth:520, textAlign:'center', lineHeight:1.6}}>
              Sử dụng quy trình làm việc để tự động hoá các quy trình tiếp thị, bán hàng, hỗ trợ, thông báo và nhiều hơn nữa.
            </div>
            <div style={{display:'flex', gap:12, marginTop:24}}>
              <button onClick={()=>setModal('create')} className="btn btn-ghost">{WfIc('Plus',{style:{width:15, height:15}})} Bắt đầu lại từ đầu</button>
              <button onClick={()=>setModal('template')} className="btn btn-primary">{WfIc('Grid',{style:{width:15, height:15}})} Bắt đầu với một mẫu</button>
            </div>
          </div>
        ) : (
          <div style={{padding:'22px 28px'}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14}}>
              {list.map(wf=>{ const trig=wf.nodes[0]; return (
                <button key={wf.id} onClick={()=>setEditing(wf)} style={{textAlign:'left', background:'white', border:'1px solid var(--fill-04)', borderRadius:13, padding:16, cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='0 8px 22px rgba(17,24,39,.08)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                    <span style={{width:34, height:34, borderRadius:9, background:'var(--bg-green)', color:'var(--pr-dark-1)', display:'grid', placeItems:'center'}}>{WfIc('Workflow',{style:{width:18, height:18}})}</span>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:14, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{wf.name}</div>
                      <div style={{fontSize:11, color:'var(--label-03)'}}>Cập nhật {wf.updated}</div>
                    </div>
                    <span style={{display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:14, fontSize:11, fontWeight:700, background: wf.status==='active'?'var(--bg-green)':'var(--fill-03)', color: wf.status==='active'?'var(--pr-dark-2)':'var(--label-02)'}}>
                      <span style={{width:6, height:6, borderRadius:'50%', background: wf.status==='active'?'#1B9E5A':'var(--label-04)'}}/>{wf.status==='active'?'Đang chạy':'Bản nháp'}
                    </span>
                  </div>
                  <div style={{fontSize:12, color:'var(--label-02)', lineHeight:1.5, minHeight:34}}>{wf.desc||'—'}</div>
                  <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, marginTop:10, borderTop:'1px solid var(--fill-03)', paddingTop:10}}>{wf.nodes.length} bước · Trigger: {trig?trig.title:'—'}</div>
                </button>
              );})}
            </div>
          </div>
        )}
      </div>

      {modal==='create' && <WfCreateModal onClose={()=>setModal(null)} onCreate={openNew}/>}
      {modal==='template' && <WfTemplateBrowser onClose={()=>setModal(null)} onPick={openTpl} onScratch={()=>setModal('create')}/>}
    </div>
  );
}

const wfLbl = { display:'block', fontSize:11.5, fontWeight:700, color:'var(--label-02)', marginBottom:6, marginTop:2 };
const wfInput = { width:'100%', padding:'9px 11px', border:'1px solid var(--fill-04)', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:14, background:'white', boxSizing:'border-box' };

window.WorkflowModule = WorkflowModule;
} catch(e){ console.error('workflow.jsx', e); }
})();
