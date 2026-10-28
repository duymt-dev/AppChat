/* ============================================================
   ai-agent-builder.jsx — "Tạo tác nhân AI" 2-panel builder
   Left: Cấu hình (tên+emoji) · Hướng dẫn (system prompt) ·
         Hành động (toggles) · Nguồn kiến thức
   Right: Kiểm thử tác nhân AI (live mock chat)
   Green design system · links to Workflow & Settings→RAG
   ============================================================ */
;(function(){
try {
const { useState: useAb, useRef: useAbRef, useEffect: useAbEf } = React;

const AbIc = (name, props) => { const C = window.Icon && window.Icon[name]; return C ? React.createElement(C, props) : null; };

const AB_EMOJIS = ['🤖','💬','✨','🎧','🛍️','📞','🧑‍💼','📅','💡','🛟','🌸','⚡'];

const AB_ACTIONS = [
  { k:'end',       t:'Những cuộc trò chuyện thân mật', d:'Trợ lý AI có thể kết thúc cuộc trò chuyện dựa trên các hướng dẫn của bạn.' },
  { k:'assign',    t:'Phân công cho nhân viên hoặc nhóm', d:'AI Agent có thể chỉ định cuộc hội thoại cho một nhân viên hỗ trợ là người thật, một AI Agent khác hoặc một nhóm.' },
  { k:'ticket',    t:'Tạo ticket hỗ trợ', d:'Tự động tạo ticket trong module Tickets khi khách cần hỗ trợ hoặc khiếu nại, gán mức ưu tiên & SLA.' },
  { k:'deal',      t:'Tạo & cập nhật cơ hội (CRM)', d:'Ghi nhận lead và tạo/đẩy cơ hội qua các giai đoạn pipeline Lead → Won trong Customers.' },
  { k:'booking',   t:'Đặt lịch hẹn', d:'Kiểm tra slot trống và đặt lịch hẹn cho khách trên Calendar, tự động nhắc trước giờ hẹn.' },
  { k:'zns',       t:'Gửi tin ZNS / SMS / template', d:'Gửi tin ZNS, SMS hoặc template đã được duyệt qua module Marketing.' },
  { k:'lifecycle', t:'Cập nhật giai đoạn vòng đời', d:'Trợ lý AI có thể cập nhật Giai đoạn Vòng đời của Liên hệ dựa trên cuộc hội thoại.' },
  { k:'contact',   t:'Cập nhật thông tin liên hệ', d:'Trợ lý AI có thể tự động cập nhật các trường thông tin liên hệ dựa trên cuộc hội thoại và các hướng dẫn mà bạn xác định.' },
  { k:'tag',       t:'Cập nhật thẻ', d:'AI Agent có thể thêm hoặc xóa các thẻ khỏi một Liên hệ.' },
  { k:'workflow',  t:'Kích hoạt quy trình làm việc', d:'Trợ lý AI có thể kích hoạt các quy trình làm việc hiện có để tự động hóa các cuộc hội thoại.', special:'workflow' },
  { k:'comment',   t:'Thêm bình luận', d:'AI Agent có thể thêm các bình luận nội bộ để chia sẻ ngữ cảnh nhanh chóng với các agent khác của bạn.' },
  { k:'call',      t:'Xử lý cuộc gọi', d:'Hãy để trợ lý AI trả lời và quản lý cuộc gọi thay bạn.', badge:'Nâng cấp' },
  { k:'http',      t:'Thực hiện các yêu cầu HTTP', d:'AI Agent có thể kích hoạt các hành động bên ngoài hoặc lấy dữ liệu thông qua API. Bạn có thể thêm nhiều hành động.', badge:'Nâng cấp' },
];

const AB_PROMPTS = [
  { l:'CSKH đa kênh', text:'# VAI TRÒ & PHONG CÁCH\nBạn là trợ lý CSKH thân thiện, lịch sự, trả lời ngắn gọn bằng tiếng Việt. Luôn xưng "em" và gọi khách là "anh/chị".\n\n# NHIỆM VỤ\n- Chào hỏi, xác định nhu cầu của khách.\n- Tra cứu Knowledge Base để trả lời chính xác về sản phẩm, đơn hàng, chính sách.\n- Khi không chắc chắn (confidence < 70%), chuyển cho nhân viên.\n\n# GIỚI HẠN\n- Không bịa thông tin. Không hứa hẹn ngoài chính sách.' },
  { l:'Tư vấn bán hàng', text:'# VAI TRÒ\nBạn là chuyên viên tư vấn bán hàng, nhiệt tình, hiểu sản phẩm, hướng khách tới quyết định mua.\n\n# NHIỆM VỤ\n- Hỏi nhu cầu, gợi ý sản phẩm phù hợp + lý do.\n- Báo giá, ưu đãi đang chạy, tạo cảm giác cấp thiết hợp lý.\n- Chốt đơn hoặc đặt lịch tư vấn sâu hơn.' },
  { l:'Đặt lịch hẹn', text:'# VAI TRÒ\nBạn là lễ tân ảo chuyên đặt lịch hẹn.\n\n# NHIỆM VỤ\n- Hỏi dịch vụ, thời gian mong muốn của khách.\n- Kiểm tra slot trống, xác nhận lịch, nhắc khách trước giờ hẹn.\n- Nếu trùng lịch, đề xuất slot gần nhất.' },
  { l:'Hỗ trợ kỹ thuật', text:'# VAI TRÒ\nBạn là chuyên viên hỗ trợ kỹ thuật, bình tĩnh, hướng dẫn từng bước rõ ràng.\n\n# NHIỆM VỤ\n- Xác định lỗi khách gặp, hỏi thông tin cần thiết.\n- Hướng dẫn khắc phục theo từng bước.\n- Tạo ticket nếu cần đội kỹ thuật xử lý sâu.' },
];

const AB_MODELS = [
  { v:'haiku',  l:'Claude Haiku 4.5',  d:'Nhanh · tiết kiệm Token · phù hợp CSKH khối lượng lớn' },
  { v:'sonnet', l:'Claude Sonnet 4.5', d:'Cân bằng · reasoning tốt · tư vấn & bán hàng' },
  { v:'opus',   l:'Claude Opus 4.5',   d:'Mạnh nhất · tốn Token · ca phức tạp', badge:'PRO' },
];
const AB_LANGS = ['Tiếng Việt','Tiếng Anh','Song ngữ Việt–Anh','Tự động theo khách'];
const AB_CHANNELS = [
  {k:'zalo', l:'Zalo OA', c:'#0068FF'}, {k:'zalo_personal', l:'Zalo cá nhân', c:'#0068FF'},
  {k:'facebook', l:'Facebook', c:'#1877F2'}, {k:'instagram', l:'Instagram', c:'#E1306C'},
  {k:'tiktok', l:'TikTok Shop', c:'#111111'}, {k:'shopee', l:'Shopee', c:'#EE4D2D'},
  {k:'whatsapp', l:'WhatsApp', c:'#25D366'}, {k:'web', l:'Web Chat', c:'#2DC56A'},
];
const AB_INTENTS = ['Hỏi giá','Tư vấn sản phẩm','Hỗ trợ / CSKH','Khiếu nại','Đổi / Trả','Đặt lịch hẹn','Theo dõi đơn','Chăm sóc sau bán'];
const AB_ESCALATE = ['Nhân viên đang trực','Trưởng nhóm Sales','Đội CSKH','Hàng đợi Ticket','AI Agent khác'];

/* ---------- toggle ---------- */
function AbToggle({ on, onChange, disabled }){
  return (
    <button onClick={()=>!disabled && onChange(!on)} disabled={disabled} style={{
      width:42, height:24, borderRadius:14, border:'none', flexShrink:0, position:'relative', padding:0,
      cursor: disabled?'not-allowed':'pointer', opacity: disabled?.5:1,
      background: on ? 'var(--primary)' : 'var(--fill-04)', transition:'background .18s'
    }}>
      <span style={{position:'absolute', top:2, left: on?20:2, width:20, height:20, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .18s'}}/>
    </button>
  );
}

const abLbl = { display:'block', fontSize:12, fontWeight:700, color:'var(--label-02)', marginBottom:6 };
const abField = { width:'100%', height:40, padding:'0 12px', border:'1px solid var(--fill-04)', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', boxSizing:'border-box' };
const abSub = { fontSize:12.5, color:'var(--label-02)', margin:'4px 0 14px', lineHeight:1.55 };

/* ---------- mock agent reply ---------- */
function abMockReply(text, name){
  const t = (text||'').toLowerCase();
  const who = name?.trim() ? name.trim() : 'Trợ lý AI';
  if (/giá|bao nhiêu|price|cost/.test(t)) return `Dạ, về giá em xin phép tra cứu trong Knowledge Base ạ. Anh/chị quan tâm sản phẩm/dịch vụ nào để em báo giá chính xác nhất nhé?`;
  if (/lịch|hẹn|đặt|booking|book/.test(t)) return `Dạ em hỗ trợ đặt lịch ngay ạ! Anh/chị muốn đặt vào thời gian nào? Em sẽ kiểm tra slot trống và xác nhận giúp mình.`;
  if (/hoàn|trả|đổi|refund|return/.test(t)) return `Em hiểu ạ. Em xin mã đơn hàng để kiểm tra chính sách đổi/trả và hỗ trợ anh/chị nhanh nhất nhé.`;
  if (/cảm ơn|thanks|thank/.test(t)) return `Dạ không có gì ạ! Em là ${who}, rất vui được hỗ trợ. Anh/chị cần gì thêm cứ nhắn em nhé 😊`;
  if (/chào|hi|hello|alo/.test(t)) return `Dạ em chào anh/chị! Em là ${who}. Em có thể giúp gì cho mình hôm nay ạ?`;
  return `Dạ em đã ghi nhận ạ. Dựa trên hướng dẫn được cấu hình, em sẽ hỗ trợ anh/chị về vấn đề này. Anh/chị cho em thêm chút thông tin để em tư vấn chính xác hơn nhé.`;
}

/* ---------- right: test panel ---------- */
function AbTestPanel({ name, emoji }){
  const [tab, setTab] = useAb('chat');
  const [msgs, setMsgs] = useAb([]);
  const [val, setVal] = useAb('');
  const [typing, setTyping] = useAb(false);
  const endRef = useAbRef(null);
  useAbEf(()=>{ endRef.current && endRef.current.scrollIntoView && endRef.current.scrollIntoView({block:'end'}); }, [msgs, typing]);

  const send = () => {
    const text = val.trim(); if(!text) return;
    setMsgs(m => [...m, {role:'user', text}]); setVal(''); setTyping(true);
    setTimeout(()=>{ setTyping(false); setMsgs(m => [...m, {role:'ai', text: abMockReply(text, name)}]); }, 850);
  };

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', background:'white'}}>
      <div style={{padding:'15px 20px 0', borderBottom:'1px solid var(--fill-04)'}}>
        <div style={{display:'flex', alignItems:'center', marginBottom:12}}>
          <div style={{fontSize:15, fontWeight:800, whiteSpace:'nowrap'}}>Kiểm thử tác nhân AI</div>
          <span style={{flex:1}}/>
          <button onClick={()=>setMsgs([])} className="btn btn-ghost btn-sm" style={{gap:6}}>{AbIc('Refresh',{style:{width:14, height:14}})} Đặt lại trò chuyện</button>
        </div>
        <div style={{display:'flex', gap:18}}>
          {[{k:'chat', l:'Trò chuyện'},{k:'contact', l:'Thông tin liên hệ'}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:'0 0 11px', border:'none', background:'none', cursor:'pointer', fontSize:13.5, fontFamily:'inherit',
              fontWeight: tab===t.k?700:500, color: tab===t.k?'var(--primary)':'var(--label-02)', whiteSpace:'nowrap',
              borderBottom:'2px solid '+(tab===t.k?'var(--primary)':'transparent'), marginBottom:-1
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {tab==='chat' ? (
        <>
          <div className="scroll" style={{flex:1, overflowY:'auto', padding:'18px 20px', background:'var(--fill-02)'}}>
            {msgs.length===0 && !typing ? (
              <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'0 24px'}}>
                <div style={{width:56, height:56, borderRadius:16, background:'var(--grad-signature)', display:'grid', placeItems:'center', fontSize:26, marginBottom:14}}>{emoji}</div>
                <div style={{fontSize:15, fontWeight:800, color:'var(--label-01)', whiteSpace:'nowrap'}}>Kiểm tra tác nhân AI của bạn</div>
                <div style={{fontSize:12.5, color:'var(--label-02)', marginTop:8, maxWidth:340, lineHeight:1.6}}>Để bắt đầu thử nghiệm, hãy đặt tên cho trợ lý AI của bạn và một số hướng dẫn để xem nó sẽ phản hồi như thế nào trong một cuộc hội thoại thực tế.</div>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {msgs.map((m,i)=>(
                  <div key={i} style={{display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start', gap:8}}>
                    {m.role==='ai' && <span style={{width:28, height:28, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', fontSize:14, flexShrink:0}}>{emoji}</span>}
                    <div style={{maxWidth:'78%', padding:'9px 13px', borderRadius:13, fontSize:13, lineHeight:1.5, whiteSpace:'pre-wrap',
                      background: m.role==='user'?'var(--primary)':'white', color: m.role==='user'?'white':'var(--label-01)',
                      border: m.role==='user'?'none':'1px solid var(--fill-04)',
                      borderBottomRightRadius: m.role==='user'?4:13, borderBottomLeftRadius: m.role==='ai'?4:13}}>{m.text}</div>
                  </div>
                ))}
                {typing && (
                  <div style={{display:'flex', gap:8}}>
                    <span style={{width:28, height:28, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', fontSize:14}}>{emoji}</span>
                    <div style={{padding:'11px 14px', borderRadius:13, background:'white', border:'1px solid var(--fill-04)', display:'flex', gap:4}}>
                      {[0,1,2].map(i=><span key={i} style={{width:6, height:6, borderRadius:'50%', background:'var(--label-04)', animation:`abBlink 1s ${i*0.18}s infinite`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={endRef}/>
              </div>
            )}
          </div>
          <div style={{padding:'12px 16px', borderTop:'1px solid var(--fill-04)'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, border:'1px solid var(--fill-04)', borderRadius:12, padding:'8px 10px'}}>
              <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }}
                placeholder="Nhập tin nhắn để thử…" style={{flex:1, border:'none', outline:'none', fontSize:13, fontFamily:'inherit', background:'transparent', minWidth:0}}/>
              <button onClick={send} disabled={!val.trim()} style={{width:32, height:32, borderRadius:9, border:'none', cursor: val.trim()?'pointer':'default', display:'grid', placeItems:'center', background: val.trim()?'var(--primary)':'var(--fill-03)', color:'white', flexShrink:0}}>{AbIc('Send',{style:{width:15, height:15}}) || '➤'}</button>
            </div>
            <div style={{fontSize:10.5, color:'var(--label-03)', textAlign:'center', marginTop:8, lineHeight:1.5}}>Các thao tác do AI thực hiện ở đây chỉ nhằm mục đích thử nghiệm và sẽ không ảnh hưởng đến thiết lập thực tế của bạn.</div>
          </div>
        </>
      ) : (
        <div className="scroll" style={{flex:1, overflowY:'auto', padding:'18px 20px', background:'var(--fill-02)'}}>
          <div style={{fontSize:12, color:'var(--label-02)', marginBottom:12}}>Hồ sơ liên hệ thử nghiệm — AI dùng các trường này làm ngữ cảnh.</div>
          {[['Họ tên','Khách thử nghiệm'],['Kênh','Zalo OA · Demo'],['Giai đoạn','Khách tiềm năng'],['Thẻ','VIP, Demo'],['Ghi chú','—']].map(([k,v])=>(
            <div key={k} style={{display:'grid', gridTemplateColumns:'110px 1fr', padding:'10px 0', borderBottom:'1px solid var(--fill-03)', fontSize:13}}>
              <span style={{color:'var(--label-02)'}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes abBlink{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}

/* ---------- left: config ---------- */
function AbConfig({ name, setName, emoji, setEmoji, prompt, setPrompt, actions, setActions, sources }){
  const [emojiOpen, setEmojiOpen] = useAb(false);
  const [tplOpen, setTplOpen] = useAb(false);
  const [optimizing, setOptimizing] = useAb(false);
  const [showDesc, setShowDesc] = useAb(false);
  const [desc, setDesc] = useAb('');
  const [model, setModel] = useAb('sonnet');
  const [lang, setLang] = useAb('Tiếng Việt');
  const [channels, setChannels] = useAb(()=>new Set(['zalo','facebook']));
  const [intents, setIntents] = useAb(()=>new Set(['Hỏi giá','Hỗ trợ / CSKH']));
  const [keywords, setKeywords] = useAb('hoàn tiền, bảo hành, khiếu nại');
  const [hours, setHours] = useAb('247');
  const [conf, setConf] = useAb(70);
  const [escalate, setEscalate] = useAb('Nhân viên đang trực');
  const [guards, setGuards] = useAb({ground:true, pii:true, override:true, log:true});
  const tog = (setFn, key) => setFn(s => { const n=new Set(s); n.has(key)?n.delete(key):n.add(key); return n; });
  const workflows = (()=>{ try { return JSON.parse(localStorage.getItem('ac_workflows_v1'))||[]; } catch(e){ return []; } })();

  const optimize = () => {
    setOptimizing(true);
    setTimeout(()=>{ setOptimizing(false);
      setPrompt(p => (p.trim()? p.trim()+'\n\n' : '') + '# ĐỊNH DẠNG TRẢ LỜI\n- Ngắn gọn, thân thiện, đúng trọng tâm.\n- Mỗi lần chỉ hỏi 1 thông tin.\n- Khi cần dữ liệu chính xác, tra cứu Knowledge Base trước khi trả lời.\n\n# AN TOÀN\n- Không bịa thông tin. Chuyển cho người thật khi không chắc chắn (confidence < 70%).');
    }, 700);
  };

  return (
    <div className="scroll" style={{flex:1, overflowY:'auto', padding:'24px 28px', background:'white'}}>
      <div style={{maxWidth:680}}>
        {/* Cấu hình */}
        <div style={{fontSize:17, fontWeight:800}}>Cấu hình</div>
        <div style={{fontSize:12.5, color:'var(--label-02)', margin:'4px 0 18px'}}>Hãy xác định rõ ràng trách nhiệm của AI Agent và cách thức nó hỗ trợ doanh nghiệp của bạn.</div>

        <div style={{display:'flex', gap:14, alignItems:'flex-end', marginBottom:6}}>
          <div style={{position:'relative'}}>
            <div style={abLbl}>Biểu tượng</div>
            <button onClick={()=>setEmojiOpen(o=>!o)} style={{width:44, height:44, borderRadius:12, background:'var(--grad-signature)', border:'none', cursor:'pointer', fontSize:22, display:'grid', placeItems:'center'}}>{emoji}</button>
            {emojiOpen && <>
              <div onClick={()=>setEmojiOpen(false)} style={{position:'fixed', inset:0, zIndex:40}}/>
              <div style={{position:'absolute', top:'100%', left:0, marginTop:6, zIndex:41, background:'white', border:'1px solid var(--fill-04)', borderRadius:12, boxShadow:'0 16px 40px rgba(17,24,39,.18)', padding:8, display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4, width:236}}>
                {AB_EMOJIS.map(e=>(
                  <button key={e} onClick={()=>{ setEmoji(e); setEmojiOpen(false); }} style={{width:34, height:34, borderRadius:8, border:'none', cursor:'pointer', fontSize:18, background: e===emoji?'var(--bg-green)':'transparent'}}>{e}</button>
                ))}
              </div>
            </>}
          </div>
          <div style={{flex:1}}>
            <div style={abLbl}>Tên <span title="Tên hiển thị của AI Agent" style={{color:'var(--label-03)'}}>ⓘ</span></div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên tác nhân AI" style={{width:'100%', height:44, padding:'0 14px', border:'1px solid var(--fill-04)', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box'}}/>
          </div>
        </div>
        <button onClick={()=>setShowDesc(v=>!v)} style={{fontSize:12, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', padding:'2px 0', fontWeight:600, whiteSpace:'nowrap'}}>{showDesc?'Ẩn mô tả':'Hiển thị mô tả'}</button>
        {showDesc && (
          <div style={{marginTop:10}}>
            <div style={abLbl}>Mô tả</div>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="VD: Trợ lý CSKH cho Shop Bé Na trên Zalo & Facebook" style={abField}/>
          </div>
        )}

        {/* Mô hình AI + Ngôn ngữ */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16}}>
          <div>
            <div style={abLbl}>Mô hình AI</div>
            <select value={model} onChange={e=>setModel(e.target.value)} style={abField}>
              {AB_MODELS.map(m=><option key={m.v} value={m.v}>{m.l}{m.badge?' · '+m.badge:''}</option>)}
            </select>
            <div style={{fontSize:11, color:'var(--label-03)', marginTop:5, lineHeight:1.45}}>{(AB_MODELS.find(m=>m.v===model)||{}).d} · tính phí theo Token</div>
          </div>
          <div>
            <div style={abLbl}>Ngôn ngữ trả lời</div>
            <select value={lang} onChange={e=>setLang(e.target.value)} style={abField}>
              {AB_LANGS.map(l=><option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Hướng dẫn */}
        <div style={{marginTop:26, border:'1px solid var(--fill-04)', borderRadius:14, padding:18}}>
          <div style={{fontSize:14.5, fontWeight:800}}>Hướng dẫn</div>
          <div style={{fontSize:12, color:'var(--label-02)', margin:'4px 0 12px', lineHeight:1.55}}>Mô tả vai trò, phong cách giao tiếp và các hành động mà tác nhân AI nên thực hiện. Đưa ra hướng dẫn từng bước bằng ngôn ngữ rõ ràng, dễ hiểu.</div>
          <div style={{border:'1px solid var(--fill-04)', borderRadius:11, overflow:'hidden'}}>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="# ROLE & STYLE — You are a polite and helpful virtual assistant. Speak clearly, stay calm, and guide the Contact…"
              rows={6} style={{width:'100%', border:'none', outline:'none', resize:'vertical', padding:'12px 14px', fontSize:13, fontFamily:'inherit', lineHeight:1.6, boxSizing:'border-box', display:'block', color:'var(--label-01)'}}/>
            <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderTop:'1px solid var(--fill-03)', background:'var(--fill-02)'}}>
              <span style={{display:'flex', gap:6, color:'var(--label-03)'}}>
                {AbIc('AtSign',{style:{width:15, height:15}})}{AbIc('MessageSquare',{style:{width:15, height:15}})}{AbIc('Tag',{style:{width:15, height:15}})}{AbIc('Workflow',{style:{width:15, height:15}})}
              </span>
              <span style={{flex:1}}/>
              <div style={{position:'relative'}}>
                <button onClick={()=>setTplOpen(o=>!o)} className="btn btn-ghost btn-sm" style={{gap:5}}>Thêm mẫu lời nhắc {AbIc('ChevronDown',{style:{width:13, height:13}}) || '▾'}</button>
                {tplOpen && <>
                  <div onClick={()=>setTplOpen(false)} style={{position:'fixed', inset:0, zIndex:40}}/>
                  <div style={{position:'absolute', bottom:'100%', right:0, marginBottom:6, zIndex:41, width:230, background:'white', border:'1px solid var(--fill-04)', borderRadius:11, boxShadow:'0 -8px 30px rgba(17,24,39,.16)', padding:5}}>
                    {AB_PROMPTS.map(p=>(
                      <button key={p.l} onClick={()=>{ setPrompt(p.text); setTplOpen(false); }} style={{width:'100%', textAlign:'left', padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--label-01)', fontFamily:'inherit'}}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{p.l}</button>
                    ))}
                  </div>
                </>}
              </div>
              <button onClick={optimize} className="btn btn-primary btn-sm" style={{gap:5}} disabled={optimizing}>{AbIc('Sparkles',{style:{width:13, height:13}})} {optimizing?'Đang tối ưu…':'Tối ưu hóa'}</button>
            </div>
          </div>
          <button style={{display:'flex', alignItems:'center', gap:6, marginTop:10, fontSize:12, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600}}>{AbIc('Book',{style:{width:14, height:14}}) || '📖'} Hãy học cách viết điều này.</button>
        </div>

        {/* Kênh hoạt động */}
        <div style={{marginTop:28}}>
          <div style={{fontSize:17, fontWeight:800}}>Kênh hoạt động</div>
          <div style={abSub}>Chọn các kênh đã kết nối mà tác nhân AI này sẽ tiếp nhận và trả lời hội thoại.</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {AB_CHANNELS.map(ch=>{ const on=channels.has(ch.k); return (
              <button key={ch.k} onClick={()=>tog(setChannels, ch.k)} style={{display:'inline-flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:20, fontSize:12.5, fontWeight:600, cursor:'pointer', border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'), background:on?'var(--bg-green)':'white', color:on?'var(--pr-dark-2)':'var(--label-02)'}}>
                <span style={{width:9, height:9, borderRadius:'50%', background:ch.c, flexShrink:0}}/>{ch.l}{on && AbIc('Check',{style:{width:13, height:13, color:'var(--primary)'}})}
              </button>
            );})}
          </div>
        </div>

        {/* Phân luồng & kích hoạt */}
        <div style={{marginTop:28}}>
          <div style={{fontSize:17, fontWeight:800}}>Phân luồng & điều kiện kích hoạt</div>
          <div style={abSub}>Xác định khi nào AI Agent này được kích hoạt — theo ý định (intent) của khách, từ khoá và khung giờ.</div>
          <div style={abLbl}>Ý định khách hàng (intent)</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:14}}>
            {AB_INTENTS.map(it=>{ const on=intents.has(it); return (
              <button key={it} onClick={()=>tog(setIntents, it)} style={{padding:'6px 12px', borderRadius:20, fontSize:12.5, fontWeight:600, cursor:'pointer', border:'1px solid '+(on?'transparent':'var(--fill-04)'), background:on?'var(--primary)':'white', color:on?'white':'var(--label-02)'}}>{it}</button>
            );})}
          </div>
          <div style={abLbl}>Từ khoá ưu tiên</div>
          <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="hoàn tiền, bảo hành, khiếu nại…" style={abField}/>
          <div style={{fontSize:11, color:'var(--label-03)', marginTop:5}}>Phân tách bằng dấu phẩy. Khi tin nhắn chứa từ khoá, agent này được ưu tiên xử lý.</div>
          <div style={{marginTop:14}}>
            <div style={abLbl}>Khung giờ hoạt động</div>
            <select value={hours} onChange={e=>setHours(e.target.value)} style={abField}>
              <option value="247">24/7 — luôn hoạt động</option>
              <option value="office">Giờ hành chính (8:00–17:30)</option>
              <option value="custom">Tuỳ chỉnh theo lịch…</option>
            </select>
          </div>
        </div>

        {/* Hành động */}
        <div style={{marginTop:28}}>
          <div style={{fontSize:17, fontWeight:800}}>Hành động</div>
          <div style={{fontSize:12.5, color:'var(--label-02)', margin:'4px 0 14px', lineHeight:1.55}}>Chỉ định các hành động mà Trợ lý AI có thể thực hiện trong suốt cuộc hội thoại. Mỗi hành động chỉ hoạt động nếu được kích hoạt.</div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {AB_ACTIONS.map(a=>{
              const on = !!actions[a.k];
              return (
                <div key={a.k} style={{border:'1px solid var(--fill-04)', borderRadius:12, padding:'14px 16px'}}>
                  <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:13.5, fontWeight:700}}>{a.t}</span>
                        {a.badge && <span style={{padding:'1px 7px', borderRadius:5, background:'#F2EEFD', color:'#6E48E6', fontSize:10, fontWeight:700}}>{a.badge}</span>}
                      </div>
                      <div style={{fontSize:12, color:'var(--label-02)', marginTop:3, lineHeight:1.5}}>{a.d}</div>
                    </div>
                    <AbToggle on={on} onChange={v=>setActions(s=>({...s, [a.k]:v}))} disabled={!!a.badge}/>
                  </div>
                  {a.special==='workflow' && on && (
                    workflows.length===0 ? (
                      <div style={{marginTop:12, display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--info-bg, #EAF1FD)', borderRadius:10}}>
                        {AbIc('Info',{style:{width:16, height:16, color:'var(--info, #2A6FDB)', flexShrink:0}})}
                        <div style={{flex:1, fontSize:12, lineHeight:1.5}}>
                          <div style={{fontWeight:700, color:'var(--label-01)'}}>Không có quy trình làm việc nào khả dụng.</div>
                          <div style={{color:'var(--label-02)'}}>Để sử dụng thao tác này, trước tiên hãy tạo một Quy trình làm việc.</div>
                        </div>
                        <button onClick={()=>window.acNavigate && window.acNavigate('workflow')} className="btn btn-primary btn-sm" style={{flexShrink:0, gap:6}}>{AbIc('ArrowRight',{style:{width:13, height:13}})} Vào mục Quy trình làm việc</button>
                      </div>
                    ) : (
                      <div style={{marginTop:12}}>
                        <select style={{width:'100%', height:38, border:'1px solid var(--fill-04)', borderRadius:9, padding:'0 12px', fontSize:13, fontFamily:'inherit', background:'white'}}>
                          {workflows.map(w=><option key={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bàn giao cho người & An toàn */}
        <div style={{marginTop:28}}>
          <div style={{fontSize:17, fontWeight:800}}>Bàn giao cho người & An toàn (AI Governance)</div>
          <div style={abSub}>Vận hành AI an toàn theo chuẩn ISO 42001 — bàn giao cho nhân viên khi cần và tuân thủ dữ liệu.</div>
          <div style={{border:'1px solid var(--fill-04)', borderRadius:12, padding:'16px 18px', marginBottom:14}}>
            <div style={{...abLbl, marginBottom:10}}>Bàn giao cho người khi độ tin cậy dưới <b style={{color:'var(--pr-dark-2)'}}>{conf}%</b></div>
            <input type="range" min={50} max={95} step={5} value={conf} onChange={e=>setConf(+e.target.value)} style={{width:'100%', accentColor:'var(--primary)'}}/>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10.5, color:'var(--label-03)', marginTop:4}}><span>50% · ít bàn giao</span><span>95% · ưu tiên người thật</span></div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={abLbl}>Bàn giao tới</div>
            <select value={escalate} onChange={e=>setEscalate(e.target.value)} style={abField}>{AB_ESCALATE.map(x=><option key={x}>{x}</option>)}</select>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {[
              {k:'ground', t:'Không bịa thông tin (grounding)', d:'Chỉ trả lời dựa trên Knowledge Base & dữ liệu thật, chống hallucination.'},
              {k:'pii', t:'Tuân thủ PII · Nghị định 13', d:'Ẩn và bảo vệ dữ liệu cá nhân của khách theo chính sách.'},
              {k:'override', t:'Luôn cho phép nhân viên can thiệp', d:'Human override — nhân viên có thể tiếp quản hội thoại bất cứ lúc nào.'},
              {k:'log', t:'Ghi log mọi hành động AI', d:'Lưu vết phục vụ AI Audit log & đối soát Token.'},
            ].map(g=>(
              <div key={g.k} style={{display:'flex', alignItems:'flex-start', gap:12, border:'1px solid var(--fill-04)', borderRadius:12, padding:'13px 16px'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13.5, fontWeight:700}}>{g.t}</div>
                  <div style={{fontSize:12, color:'var(--label-02)', marginTop:3, lineHeight:1.5}}>{g.d}</div>
                </div>
                <AbToggle on={!!guards[g.k]} onChange={v=>setGuards(s=>({...s,[g.k]:v}))}/>
              </div>
            ))}
          </div>
        </div>

        {/* Nguồn kiến thức */}
        <div style={{marginTop:28}}>
          <div style={{fontSize:17, fontWeight:800, marginBottom:12}}>Nguồn kiến thức</div>
          <div style={{display:'flex', gap:10, padding:'13px 15px', background:'var(--warning-bg, #FCF3E2)', borderRadius:11, marginBottom:14}}>
            {AbIc('Info',{style:{width:17, height:17, color:'#C9820B', flexShrink:0, marginTop:1}})}
            <div style={{fontSize:12, lineHeight:1.55}}>
              <div style={{fontWeight:700, color:'var(--label-01)'}}>Bạn muốn trợ lý AI của mình phản hồi chính xác hơn?</div>
              <div style={{color:'var(--label-02)', marginTop:2}}>Thêm và kích hoạt các nguồn kiến thức để cung cấp cho AI Agent ngữ cảnh cần thiết, giúp nó đưa ra các phản hồi chính xác và phù hợp với từng công ty.</div>
            </div>
          </div>
          <div style={{border:'1px solid var(--fill-04)', borderRadius:13, padding:'34px 24px', textAlign:'center'}}>
            <div style={{width:48, height:48, margin:'0 auto 12px', borderRadius:12, background:'var(--fill-02)', display:'grid', placeItems:'center', color:'var(--primary)'}}>{AbIc('Files',{style:{width:24, height:24}}) || '📖'}</div>
            <div style={{fontSize:14.5, fontWeight:800}}>Huấn luyện tác nhân AI của bạn</div>
            <div style={{fontSize:12.5, color:'var(--label-02)', margin:'8px auto 16px', maxWidth:380, lineHeight:1.6}}>Để nâng cao độ chính xác, chúng tôi khuyên bạn nên huấn luyện AI Agent của mình bằng các tài liệu và liên kết đặc thù của công ty.</div>
            <button onClick={()=>window.acNavigate && window.acNavigate('settings','rag_data')} className="btn btn-primary" style={{gap:6}}>{AbIc('Plus',{style:{width:15, height:15}})} Thêm nguồn kiến thức</button>
          </div>
        </div>
        <div style={{height:24}}/>
      </div>
    </div>
  );
}

/* ---------- root overlay ---------- */
function AIAgentBuilder({ onClose, agent }){
  const [name, setName] = useAb(agent?.name || '');
  const [emoji, setEmoji] = useAb(agent?.emoji || '🤖');
  const [prompt, setPrompt] = useAb(agent?.prompt || '');
  const [actions, setActions] = useAb(agent?.actions || {});
  const [sources] = useAb([]);
  const [toast, setToast] = useAb(false);

  const publish = () => { if(!name.trim()) return; setToast(true); setTimeout(()=>{ setToast(false); onClose && onClose(); }, 1100); };

  return (
    <div style={{position:'fixed', inset:0, zIndex:1100, background:'white', display:'flex', flexDirection:'column'}}>
      {/* top bar */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'11px 20px', borderBottom:'1px solid var(--fill-04)', flexShrink:0}}>
        <button onClick={onClose} className="btn-icon" title="Quay lại">{AbIc('ArrowLeft',{style:{width:18, height:18}}) || '←'}</button>
        <div style={{fontSize:16, fontWeight:800, whiteSpace:'nowrap'}}>{agent ? 'Cấu hình tác nhân AI' : 'Tạo tác nhân AI'}</div>
        <span style={{flex:1}}/>
        <button onClick={onClose} className="btn btn-ghost btn-sm">Hủy bỏ</button>
        <button onClick={publish} className="btn btn-primary btn-sm" style={{opacity: name.trim()?1:.5}}>{AbIc('Check',{style:{width:14, height:14}})} Xuất bản</button>
      </div>

      {/* 2 panels */}
      <div style={{flex:1, display:'flex', minHeight:0}}>
        <div style={{flex:1, minWidth:0, display:'flex'}}>
          <AbConfig name={name} setName={setName} emoji={emoji} setEmoji={setEmoji} prompt={prompt} setPrompt={setPrompt} actions={actions} setActions={setActions} sources={sources}/>
        </div>
        <div style={{width:'42%', maxWidth:560, minWidth:380, borderLeft:'1px solid var(--fill-04)', display:'flex', flexShrink:0}}>
          <AbTestPanel name={name} emoji={emoji}/>
        </div>
      </div>

      {toast && <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'11px 20px', borderRadius:10, fontSize:13.5, fontWeight:600, zIndex:1200, display:'flex', alignItems:'center', gap:8}}>{AbIc('Check',{style:{width:16, height:16, color:'#4ADE80'}})} Đã xuất bản tác nhân AI {name.trim()?`“${name.trim()}”`:''}</div>}
    </div>
  );
}

window.AIAgentBuilder = AIAgentBuilder;
} catch(e){ console.error('ai-agent-builder.jsx', e); }
})();
