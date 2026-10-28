// Web Chat Widget Customizer — full-screen studio with live preview
const { useState: useWS, useMemo: useWM } = React;

const WIDGET_DEFAULTS = {
  // Identity
  brand: 'Shop Bé Na',
  tagline: 'Mẹ ơi, mình giúp gì được nè?',
  avatar: '🐻',
  status: 'online',                 // online · away · offline
  // Appearance
  primary: '#2DC56A',
  textOnPrimary: '#FFFFFF',
  bg: '#FFFFFF',
  position: 'br',                   // br · bl
  shape: 'circle',                  // circle · squircle · pill
  launcherIcon: 'chat',             // chat · bubble · headset · sparkles
  bubbleSize: 60,
  theme: 'light',                   // light · dark · auto
  cornerRadius: 16,
  showBranding: false,
  // Greeting
  greetingTitle: 'Chào mẹ! 👋',
  greetingMsg: 'Mẹ cần tư vấn váy bé hay đồ nam? Mình online 8h–22h, reply trong 1 phút.',
  proactiveEnabled: true,
  proactiveDelay: 18,               // seconds
  proactiveTrigger: 'time',         // time · scroll · exit · idle
  proactiveScroll: 60,              // %
  // Forms
  prechatEnabled: true,
  prechatFields: ['name', 'phone', 'topic'],   // name email phone topic
  postchatSurvey: true,
  offlineForm: true,
  fileUpload: true,
  fileMax: 25,                      // MB
  emojiPicker: true,
  voiceInput: true,
  // Behavior
  routing: 'auto',                  // auto · skill · roundrobin · channel
  businessHours: '08:00-22:00',
  awayMsg: 'Tụi mình đang offline. Để lại SĐT, mai 8h tụi mình ới mẹ liền nha.',
  typingIndicator: true,
  soundEnabled: true,
  // AI
  aiEnabled: true,
  aiModel: 'claude-sonnet',
  aiHandoffSec: 120,
  aiKnowledge: ['Catalog', 'Chính sách đổi trả', 'FAQ size'],
  aiTone: 'thân thiện chị ơi/mẹ ơi',
  // Channels Mix
  altChannels: ['zalo', 'messenger', 'whatsapp'],
  // Privacy
  consentBanner: true,
  consentText: 'Tụi mình lưu hội thoại để tư vấn và cải thiện dịch vụ. Đồng ý?',
  retentionDays: 365,
  // Localization
  locale: 'vi',
  rtl: false,
  // Domain
  domain: 'shopbena.vn',
};

function WidgetStudio() {
  const [cfg, setCfg]       = useWS(WIDGET_DEFAULTS);
  const [tab, setTab]       = useWS('identity');
  const [device, setDevice] = useWS('desktop');
  const [open, setOpen]     = useWS(true);
  const [installOpen, setInstall] = useWS(false);
  const [previewState, setPreviewState] = useWS('chat');  // chat · prechat · survey · offline

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const toggleArr = (k, v) => setCfg(p => ({
    ...p,
    [k]: p[k].includes(v) ? p[k].filter(x => x!==v) : [...p[k], v]
  }));

  const TABS = [
    { k:'identity',  l:'Định danh',     i: '🪪' },
    { k:'appearance',l:'Diện mạo',      i: '🎨' },
    { k:'greeting',  l:'Lời chào',      i: '👋' },
    { k:'forms',     l:'Forms',         i: '📝' },
    { k:'ai',        l:'AI Concierge',  i: '🤖' },
    { k:'routing',   l:'Routing',       i: '🔀' },
    { k:'channels',  l:'Đa kênh',       i: '🔗' },
    { k:'privacy',   l:'Privacy',       i: '🛡️' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--fill-01)' }}>
      {/* Topbar */}
      <div className="topbar" style={{ display:'flex', alignItems:'center', gap:12, paddingRight:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10, background:cfg.primary,
            display:'grid', placeItems:'center', color:'white', fontSize:18,
            boxShadow:'0 4px 12px rgba(45,197,106,.30)'
          }}>{cfg.avatar}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>Web Widget Studio</div>
            <div style={{ fontSize:11, color:'var(--label-03)' }}>
              {cfg.brand} · {cfg.domain} · <span style={{ color:'var(--success)' }}>● Đã publish</span>
            </div>
          </div>
        </div>
        <span className="spacer" style={{ flex:1 }}/>

        {/* Device toggle */}
        <div style={{
          display:'flex', padding:3, background:'var(--fill-03)',
          borderRadius:7, gap:2, fontSize:12
        }}>
          {['desktop','tablet','mobile'].map(d => (
            <button key={d} onClick={()=>setDevice(d)} style={{
              background: device===d ? 'white' : 'transparent',
              border: 'none', padding:'5px 12px', borderRadius:5, cursor:'pointer',
              fontWeight: device===d ? 700 : 500, color: device===d ? 'var(--label-01)' : 'var(--label-02)',
              boxShadow: device===d ? '0 1px 2px rgba(0,0,0,.06)' : 'none'
            }}>{d==='desktop'?'🖥':d==='tablet'?'📱':'📱'} {d==='desktop'?'Desktop':d==='tablet'?'Tablet':'Mobile'}</button>
          ))}
        </div>

        <button className="btn btn-ghost" onClick={()=>setInstall(true)}>
          <Icon.Code/> Mã cài đặt
        </button>
        <button className="btn btn-ghost"><Icon.Eye/> Xem live</button>
        <button className="btn btn-primary"><Icon.Check/> Lưu &amp; Publish</button>
      </div>

      {/* Body */}
      <div style={{ display:'grid', gridTemplateColumns:'440px 1fr', flex:1, minHeight:0 }}>

        {/* LEFT — config panel */}
        <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--separator)', background:'white' }}>

          {/* tabs */}
          <div style={{ display:'flex', overflow:'auto', borderBottom:'1px solid var(--separator)' }}>
            {TABS.map(t => (
              <button key={t.k} onClick={()=>setTab(t.k)} style={{
                flex:'0 0 auto', padding:'12px 14px', background:'none', border:'none',
                borderBottom: tab===t.k ? '2px solid var(--pr)' : '2px solid transparent',
                color: tab===t.k ? 'var(--label-01)' : 'var(--label-03)',
                fontWeight: tab===t.k ? 700 : 500, fontSize:12, cursor:'pointer',
                display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap'
              }}>
                <span>{t.i}</span> {t.l}
              </button>
            ))}
          </div>

          <div style={{ padding:18, overflow:'auto', flex:1 }}>
            {tab==='identity'   && <PaneIdentity cfg={cfg} set={set}/>}
            {tab==='appearance' && <PaneAppearance cfg={cfg} set={set}/>}
            {tab==='greeting'   && <PaneGreeting cfg={cfg} set={set}/>}
            {tab==='forms'      && <PaneForms cfg={cfg} set={set} toggleArr={toggleArr}/>}
            {tab==='ai'         && <PaneAI cfg={cfg} set={set} toggleArr={toggleArr}/>}
            {tab==='routing'    && <PaneRouting cfg={cfg} set={set}/>}
            {tab==='channels'   && <PaneChannels cfg={cfg} set={set} toggleArr={toggleArr}/>}
            {tab==='privacy'    && <PanePrivacy cfg={cfg} set={set}/>}
          </div>

          {/* footer with state preview switcher */}
          <div style={{
            padding:'10px 16px', background:'var(--fill-02)', borderTop:'1px solid var(--separator)',
            display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--label-03)'
          }}>
            <span style={{ fontWeight:700, color:'var(--label-02)' }}>State:</span>
            {['chat','prechat','survey','offline'].map(s => (
              <button key={s} onClick={()=>setPreviewState(s)} style={{
                padding:'3px 9px', borderRadius:5,
                background: previewState===s ? 'var(--pr)' : 'white',
                color: previewState===s ? 'white' : 'var(--label-02)',
                border:'1px solid', borderColor: previewState===s ? 'var(--pr)' : 'var(--separator)',
                fontSize:10, fontWeight:600, cursor:'pointer'
              }}>{s==='chat'?'💬 Chat':s==='prechat'?'📝 Pre-chat':s==='survey'?'⭐ Khảo sát':'😴 Offline'}</button>
            ))}
          </div>
        </div>

        {/* RIGHT — preview canvas */}
        <WidgetPreview cfg={cfg} device={device} open={open} setOpen={setOpen} previewState={previewState}/>
      </div>

      {installOpen && <InstallModal onClose={()=>setInstall(false)} cfg={cfg}/>}
    </div>
  );
}

/* ============================== Helpers ============================== */
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:5 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.3 }}>{label}</label>
        {hint && <span style={{ fontSize:10, color:'var(--label-03)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type='text' }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
    style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--separator)', borderRadius:7, fontSize:12, fontFamily:'inherit' }}/>;
}

function TextArea({ value, onChange, rows=3, placeholder }) {
  return <textarea value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} rows={rows}
    style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--separator)', borderRadius:7, fontSize:12, fontFamily:'inherit', resize:'vertical' }}/>;
}

function ColorPicker({ value, onChange }) {
  const swatches = ['#2DC56A','#1E66F5','#9B5CF6','#FF6A1A','#FFC842','#EF4444','#0F172A','#F59E0B','#06B6D4','#EC4899'];
  return (
    <div>
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8 }}>
        <input type="color" value={value} onChange={e=>onChange(e.target.value)}
          style={{ width:36, height:32, border:'1px solid var(--separator)', borderRadius:6, padding:2, cursor:'pointer' }}/>
        <input type="text" value={value} onChange={e=>onChange(e.target.value)}
          style={{ flex:1, padding:'7px 10px', border:'1px solid var(--separator)', borderRadius:6, fontSize:12, fontFamily:'monospace' }}/>
      </div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {swatches.map(s => (
          <button key={s} onClick={()=>onChange(s)} title={s} style={{
            width:22, height:22, borderRadius:4, background:s, cursor:'pointer',
            border: value===s ? '2px solid var(--label-01)' : '1px solid var(--separator)',
            boxShadow: value===s ? '0 0 0 2px white inset' : 'none'
          }}/>
        ))}
      </div>
    </div>
  );
}

function Toggle({ value, onChange, label, sub }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--separator)' }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--label-01)' }}>{label}</div>
        {sub && <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2 }}>{sub}</div>}
      </div>
      <button onClick={()=>onChange(!value)} style={{
        width:36, height:20, borderRadius:10, border:'none',
        background: value ? 'var(--pr)' : 'var(--fill-04)',
        position:'relative', cursor:'pointer', transition:'background .15s'
      }}>
        <span style={{
          position:'absolute', top:2, left: value ? 18 : 2,
          width:16, height:16, borderRadius:'50%', background:'white',
          transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,.15)'
        }}/>
      </button>
    </div>
  );
}

function Slider({ value, onChange, min=0, max=100, step=1, suffix='' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(+e.target.value)}
        style={{ flex:1, accentColor:'var(--pr)' }}/>
      <span style={{ fontSize:12, fontWeight:700, minWidth:48, textAlign:'right', color:'var(--label-02)', fontFamily:'monospace' }}>{value}{suffix}</span>
    </div>
  );
}

function Segment({ value, onChange, options }) {
  return (
    <div style={{ display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, gap:2 }}>
      {options.map(o => (
        <button key={o.v} onClick={()=>onChange(o.v)} style={{
          flex:1, padding:'7px 10px', borderRadius:5, border:'none', cursor:'pointer',
          background: value===o.v ? 'white' : 'transparent',
          color: value===o.v ? 'var(--label-01)' : 'var(--label-02)',
          fontWeight: value===o.v ? 700 : 500, fontSize:11.5,
          boxShadow: value===o.v ? '0 1px 2px rgba(0,0,0,.06)' : 'none'
        }}>{o.l}</button>
      ))}
    </div>
  );
}

/* ============================== Panes ============================== */
function PaneIdentity({ cfg, set }) {
  const avatars = ['🐻','🌸','💚','🛍️','💼','💻','🎓','✨','🤖','📞'];
  return (
    <>
      <Field label="Tên thương hiệu"><Input value={cfg.brand} onChange={v=>set('brand', v)}/></Field>
      <Field label="Tagline / Slogan"><Input value={cfg.tagline} onChange={v=>set('tagline', v)} placeholder="Hello! Tụi mình giúp gì được?"/></Field>
      <Field label="Avatar widget" hint="Emoji hoặc upload ảnh">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
          {avatars.map(a => (
            <button key={a} onClick={()=>set('avatar', a)} style={{
              width:36, height:36, fontSize:20, borderRadius:8, cursor:'pointer',
              background: cfg.avatar===a ? 'var(--pr-soft)' : 'white',
              border:'1px solid', borderColor: cfg.avatar===a ? 'var(--pr)' : 'var(--separator)'
            }}>{a}</button>
          ))}
          <button style={{ width:36, height:36, borderRadius:8, border:'1px dashed var(--separator)', background:'var(--fill-02)', cursor:'pointer', color:'var(--label-03)' }}>＋</button>
        </div>
      </Field>
      <Field label="Trạng thái">
        <Segment value={cfg.status} onChange={v=>set('status', v)} options={[
          {v:'online',l:'🟢 Online'}, {v:'away',l:'🟡 Bận'}, {v:'offline',l:'⚫ Offline'}
        ]}/>
      </Field>
      <Field label="Domain cài đặt"><Input value={cfg.domain} onChange={v=>set('domain', v)} placeholder="example.com"/></Field>
      <Field label="Ngôn ngữ mặc định">
        <Segment value={cfg.locale} onChange={v=>set('locale', v)} options={[
          {v:'vi',l:'🇻🇳 VI'}, {v:'en',l:'🇬🇧 EN'}, {v:'zh',l:'🇨🇳 ZH'}
        ]}/>
      </Field>
    </>
  );
}

function PaneAppearance({ cfg, set }) {
  return (
    <>
      <Field label="Màu chính"><ColorPicker value={cfg.primary} onChange={v=>set('primary', v)}/></Field>
      <Field label="Vị trí widget">
        <Segment value={cfg.position} onChange={v=>set('position', v)} options={[
          {v:'bl',l:'⬉ Trái dưới'}, {v:'br',l:'⬈ Phải dưới'}
        ]}/>
      </Field>
      <Field label="Hình dáng launcher">
        <Segment value={cfg.shape} onChange={v=>set('shape', v)} options={[
          {v:'circle',l:'● Tròn'}, {v:'squircle',l:'◉ Squircle'}, {v:'pill',l:'━ Pill (text)'}
        ]}/>
      </Field>
      <Field label="Icon launcher">
        <div style={{ display:'flex', gap:6 }}>
          {[{k:'chat',e:'💬'},{k:'bubble',e:'🗨️'},{k:'headset',e:'🎧'},{k:'sparkles',e:'✨'}].map(o => (
            <button key={o.k} onClick={()=>set('launcherIcon', o.k)} style={{
              flex:1, padding:'10px 0', fontSize:18, borderRadius:7, cursor:'pointer',
              background: cfg.launcherIcon===o.k ? 'var(--pr-soft)' : 'white',
              border:'1px solid', borderColor: cfg.launcherIcon===o.k ? 'var(--pr)' : 'var(--separator)'
            }}>{o.e}</button>
          ))}
        </div>
      </Field>
      <Field label="Kích thước launcher" hint={`${cfg.bubbleSize}px`}>
        <Slider value={cfg.bubbleSize} onChange={v=>set('bubbleSize', v)} min={48} max={80} suffix="px"/>
      </Field>
      <Field label="Bo góc panel" hint={`${cfg.cornerRadius}px`}>
        <Slider value={cfg.cornerRadius} onChange={v=>set('cornerRadius', v)} min={0} max={28} suffix="px"/>
      </Field>
      <Field label="Theme">
        <Segment value={cfg.theme} onChange={v=>set('theme', v)} options={[
          {v:'light',l:'☀ Light'}, {v:'dark',l:'🌙 Dark'}, {v:'auto',l:'🔄 Auto'}
        ]}/>
      </Field>
      <Toggle value={cfg.showBranding} onChange={v=>set('showBranding', v)}
        label='Hiển thị "Powered by AppChat"' sub="Bật cho gói Starter / tắt cho Ultimate"/>
    </>
  );
}

function PaneGreeting({ cfg, set }) {
  return (
    <>
      <Field label="Tiêu đề lời chào"><Input value={cfg.greetingTitle} onChange={v=>set('greetingTitle', v)}/></Field>
      <Field label="Nội dung chào hỏi"><TextArea value={cfg.greetingMsg} onChange={v=>set('greetingMsg', v)} rows={3}/></Field>

      <div style={{ height:1, background:'var(--separator)', margin:'14px 0' }}/>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Proactive Greeting</div>

      <Toggle value={cfg.proactiveEnabled} onChange={v=>set('proactiveEnabled', v)}
        label="Bật proactive popup" sub="Tự động bung lời chào khi khách dừng lại trên trang"/>

      {cfg.proactiveEnabled && (
        <>
          <Field label="Trigger">
            <Segment value={cfg.proactiveTrigger} onChange={v=>set('proactiveTrigger', v)} options={[
              {v:'time',l:'⏱ Time'}, {v:'scroll',l:'📜 Scroll'}, {v:'exit',l:'🚪 Exit'}, {v:'idle',l:'😴 Idle'}
            ]}/>
          </Field>
          {cfg.proactiveTrigger==='time' && (
            <Field label="Sau bao lâu" hint={`${cfg.proactiveDelay}s`}>
              <Slider value={cfg.proactiveDelay} onChange={v=>set('proactiveDelay', v)} min={3} max={120} suffix="s"/>
            </Field>
          )}
          {cfg.proactiveTrigger==='scroll' && (
            <Field label="Sau khi cuộn" hint={`${cfg.proactiveScroll}%`}>
              <Slider value={cfg.proactiveScroll} onChange={v=>set('proactiveScroll', v)} min={20} max={90} suffix="%"/>
            </Field>
          )}
        </>
      )}
    </>
  );
}

function PaneForms({ cfg, set, toggleArr }) {
  const fields = [
    {k:'name',  l:'Họ tên',  i:'👤'},
    {k:'email', l:'Email',   i:'✉️'},
    {k:'phone', l:'SĐT',     i:'📞'},
    {k:'topic', l:'Chủ đề',  i:'🏷️'},
  ];
  return (
    <>
      <Toggle value={cfg.prechatEnabled} onChange={v=>set('prechatEnabled', v)}
        label="Pre-chat form" sub="Yêu cầu khách điền thông tin trước khi chat"/>

      {cfg.prechatEnabled && (
        <Field label="Trường thu thập">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {fields.map(f => (
              <button key={f.k} onClick={()=>toggleArr('prechatFields', f.k)} style={{
                padding:'8px 11px', borderRadius:7, cursor:'pointer', textAlign:'left',
                background: cfg.prechatFields.includes(f.k) ? 'var(--pr-soft)' : 'white',
                border:'1px solid', borderColor: cfg.prechatFields.includes(f.k) ? 'var(--pr)' : 'var(--separator)',
                display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:600
              }}>
                <span style={{
                  width:16, height:16, borderRadius:4,
                  border:'1.5px solid', borderColor: cfg.prechatFields.includes(f.k) ? 'var(--pr)' : 'var(--separator)',
                  background: cfg.prechatFields.includes(f.k) ? 'var(--pr)' : 'white',
                  color:'white', display:'grid', placeItems:'center', fontSize:11
                }}>{cfg.prechatFields.includes(f.k) ? '✓' : ''}</span>
                <span style={{ marginRight:'auto' }}>{f.i} {f.l}</span>
              </button>
            ))}
          </div>
        </Field>
      )}

      <div style={{ height:1, background:'var(--separator)', margin:'14px 0' }}/>

      <Toggle value={cfg.postchatSurvey} onChange={v=>set('postchatSurvey', v)}
        label="Khảo sát sau chat (CSAT)" sub="⭐ 1-5 sao + bình luận sau khi đóng hội thoại"/>
      <Toggle value={cfg.offlineForm} onChange={v=>set('offlineForm', v)}
        label="Form khi offline" sub="Khách để lại tin nhắn ngoài giờ làm việc"/>
      <Toggle value={cfg.fileUpload} onChange={v=>set('fileUpload', v)}
        label="Đính kèm file" sub="Cho phép gửi ảnh, video, tài liệu"/>
      <Toggle value={cfg.emojiPicker} onChange={v=>set('emojiPicker', v)} label="Emoji picker"/>
      <Toggle value={cfg.voiceInput} onChange={v=>set('voiceInput', v)} label="Voice input (microphone)"/>

      {cfg.fileUpload && (
        <Field label="Dung lượng tối đa" hint={`${cfg.fileMax}MB`}>
          <Slider value={cfg.fileMax} onChange={v=>set('fileMax', v)} min={5} max={100} suffix="MB"/>
        </Field>
      )}
    </>
  );
}

function PaneAI({ cfg, set, toggleArr }) {
  const sources = ['Catalog', 'Chính sách đổi trả', 'FAQ size', 'Bảng giá', 'Hướng dẫn ship', 'Bảo hành'];
  return (
    <>
      <Toggle value={cfg.aiEnabled} onChange={v=>set('aiEnabled', v)}
        label="🤖 Claude Cowork tiếp đón"
        sub="AI trả lời trước, handoff sang nhân viên nếu cần"/>

      {cfg.aiEnabled && (
        <>
          <Field label="Model">
            <Segment value={cfg.aiModel} onChange={v=>set('aiModel', v)} options={[
              {v:'claude-haiku',l:'Haiku · Nhanh'}, {v:'claude-sonnet',l:'Sonnet · Balance'}, {v:'claude-opus',l:'Opus · Sâu'}
            ]}/>
          </Field>
          <Field label="Tone of voice">
            <TextArea value={cfg.aiTone} onChange={v=>set('aiTone', v)} rows={2}
              placeholder="VD: thân thiện, xưng chị/em, dùng tiếng Việt nam bộ"/>
          </Field>
          <Field label="Handoff sau" hint={`${cfg.aiHandoffSec}s`}>
            <Slider value={cfg.aiHandoffSec} onChange={v=>set('aiHandoffSec', v)} min={30} max={600} step={30} suffix="s"/>
          </Field>
          <Field label="Knowledge sources">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {sources.map(s => (
                <button key={s} onClick={()=>toggleArr('aiKnowledge', s)} style={{
                  padding:'6px 11px', borderRadius:14, fontSize:11, fontWeight:600, cursor:'pointer',
                  background: cfg.aiKnowledge.includes(s) ? 'var(--pr)' : 'var(--fill-02)',
                  color: cfg.aiKnowledge.includes(s) ? 'white' : 'var(--label-02)',
                  border:'1px solid', borderColor: cfg.aiKnowledge.includes(s) ? 'var(--pr)' : 'var(--separator)'
                }}>{cfg.aiKnowledge.includes(s) ? '✓ ' : '+ '}{s}</button>
              ))}
            </div>
          </Field>
          <div style={{
            background:'var(--pr-soft)', borderLeft:'3px solid var(--pr)', padding:'10px 12px',
            borderRadius:7, fontSize:11.5, color:'var(--label-02)'
          }}>
            <b style={{ color:'var(--pr-dark)' }}>💡 Claude tip:</b> Bật handoff sau 120s để AI có thời gian giải quyết các câu hỏi đơn giản. Trung bình giảm 64% workload nhân viên.
          </div>
        </>
      )}
    </>
  );
}

function PaneRouting({ cfg, set }) {
  return (
    <>
      <Field label="Quy tắc phân phối">
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            {v:'auto',       l:'⚡ Tự động (load balancing)', d:'Người ít việc nhất nhận trước'},
            {v:'skill',      l:'🎯 Skill-based',              d:'Theo chủ đề · ngôn ngữ · sản phẩm'},
            {v:'roundrobin', l:'🔄 Round-robin',              d:'Lần lượt chia đều'},
            {v:'channel',    l:'📡 Theo kênh',                d:'Mỗi nhân viên phụ trách 1 kênh'},
          ].map(o => (
            <button key={o.v} onClick={()=>set('routing', o.v)} style={{
              padding:'10px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
              background: cfg.routing===o.v ? 'var(--pr-soft)' : 'white',
              border:'1px solid', borderColor: cfg.routing===o.v ? 'var(--pr)' : 'var(--separator)'
            }}>
              <div style={{ fontSize:12.5, fontWeight:700, marginBottom:2 }}>{o.l}</div>
              <div style={{ fontSize:11, color:'var(--label-03)' }}>{o.d}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Giờ làm việc"><Input value={cfg.businessHours} onChange={v=>set('businessHours', v)}/></Field>
      <Field label="Tin nhắn ngoài giờ"><TextArea value={cfg.awayMsg} onChange={v=>set('awayMsg', v)} rows={2}/></Field>

      <Toggle value={cfg.typingIndicator} onChange={v=>set('typingIndicator', v)} label="Hiệu ứng đang gõ"/>
      <Toggle value={cfg.soundEnabled} onChange={v=>set('soundEnabled', v)} label="Âm thanh thông báo"/>
    </>
  );
}

function PaneChannels({ cfg, set, toggleArr }) {
  const all = [
    {k:'zalo',     l:'Zalo OA',     b:'#0068FF'},
    {k:'messenger',l:'Messenger',   b:'#0084FF'},
    {k:'whatsapp', l:'WhatsApp',    b:'#25D366'},
    {k:'instagram',l:'Instagram',   b:'#E4405F'},
    {k:'tiktok',   l:'TikTok',      b:'#010101'},
    {k:'telegram', l:'Telegram',    b:'#0088CC'},
    {k:'phone',    l:'Hotline',     b:'#FF6A1A'},
    {k:'email',    l:'Email',       b:'#9B5CF6'},
  ];
  return (
    <>
      <div style={{ fontSize:12, color:'var(--label-03)', marginBottom:14, lineHeight:1.55 }}>
        Hiển thị các kênh khác trong widget — khách click sẽ deeplink mở Zalo/Messenger/WA app gốc. Hữu ích khi cần nói chuyện ngoài giờ.
      </div>
      <Field label="Kênh phụ trợ">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {all.map(c => (
            <button key={c.k} onClick={()=>toggleArr('altChannels', c.k)} style={{
              padding:'10px 11px', borderRadius:8, cursor:'pointer', textAlign:'left',
              background: cfg.altChannels.includes(c.k) ? 'var(--pr-soft)' : 'white',
              border:'1px solid', borderColor: cfg.altChannels.includes(c.k) ? 'var(--pr)' : 'var(--separator)',
              display:'flex', alignItems:'center', gap:8
            }}>
              <span style={{ width:18, height:18, borderRadius:5, background:c.b }}/>
              <span style={{ fontSize:12, fontWeight:600 }}>{c.l}</span>
              {cfg.altChannels.includes(c.k) && <span style={{ marginLeft:'auto', fontSize:13 }}>✓</span>}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function PanePrivacy({ cfg, set }) {
  return (
    <>
      <Toggle value={cfg.consentBanner} onChange={v=>set('consentBanner', v)}
        label="Cookie / consent banner" sub="Hiển thị trước khi khách bắt đầu hội thoại — bắt buộc theo PDPL VN 2026"/>
      {cfg.consentBanner && (
        <Field label="Nội dung consent"><TextArea value={cfg.consentText} onChange={v=>set('consentText', v)} rows={3}/></Field>
      )}
      <Field label="Lưu hội thoại" hint={`${cfg.retentionDays} ngày`}>
        <Slider value={cfg.retentionDays} onChange={v=>set('retentionDays', v)} min={30} max={1095} step={30} suffix=" ngày"/>
      </Field>
      <div style={{
        background:'#FFF7E6', borderLeft:'3px solid var(--warn)', padding:'10px 12px',
        borderRadius:7, fontSize:11.5, color:'var(--label-02)', marginTop:10
      }}>
        <b>⚠ PDPL VN 2026:</b> Cần kèm link chính sách quyền riêng tư + nút "Yêu cầu xoá dữ liệu của tôi" theo luật bảo vệ dữ liệu cá nhân.
      </div>
      <button className="btn btn-ghost" style={{ width:'100%', marginTop:10, justifyContent:'center' }}>
        <Icon.Shield/> Mở Privacy &amp; DPIA Hub
      </button>
    </>
  );
}

/* ============================== Preview Canvas ============================== */
function WidgetPreview({ cfg, device, open, setOpen, previewState }) {
  const w = device==='mobile' ? 380 : device==='tablet' ? 760 : 1180;
  const h = device==='mobile' ? 720 : 720;

  const rightPos = cfg.position==='br';

  return (
    <div style={{
      padding:24, overflow:'auto',
      background:'repeating-linear-gradient(45deg, var(--fill-01) 0 12px, var(--fill-02) 12px 24px)',
    }}>
      <div style={{ maxWidth:w, margin:'0 auto', transition:'all .3s' }}>

        {/* Browser chrome */}
        <div style={{
          background:'#E8EAEE', borderRadius:'12px 12px 0 0', padding:'10px 14px',
          display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #C5C9D0'
        }}>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ width:11, height:11, borderRadius:'50%', background:'#FF5F57' }}/>
            <span style={{ width:11, height:11, borderRadius:'50%', background:'#FEBC2E' }}/>
            <span style={{ width:11, height:11, borderRadius:'50%', background:'#28C840' }}/>
          </div>
          <div style={{
            flex:1, background:'white', padding:'5px 12px', borderRadius:6, fontSize:11,
            color:'var(--label-03)', display:'flex', alignItems:'center', gap:6
          }}>
            🔒 https://{cfg.domain}/
            <span style={{ marginLeft:'auto', color:'var(--success)', fontSize:10 }}>● Live</span>
          </div>
          <span style={{ fontSize:13, color:'var(--label-03)' }}>⟲</span>
        </div>

        {/* Page mock */}
        <div style={{
          height: h, background:'white', borderRadius:'0 0 12px 12px', position:'relative',
          overflow:'hidden', border:'1px solid #C5C9D0', borderTop:'none'
        }}>
          {/* Site header */}
          <div style={{
            padding:'14px 28px', borderBottom:'1px solid #EFF1F4',
            display:'flex', alignItems:'center', gap:18, fontSize:13, color:'#0F172A'
          }}>
            <div style={{ fontWeight:800, fontSize:16, color:cfg.primary }}>{cfg.brand}</div>
            <span style={{ marginLeft:18 }}>Trang chủ</span>
            <span>Sản phẩm</span>
            <span>Khuyến mãi</span>
            <span>Liên hệ</span>
            <span style={{ marginLeft:'auto', display:'flex', gap:10 }}>
              <span>🔍</span><span>🛒</span><span>👤</span>
            </span>
          </div>

          {/* Hero */}
          <div style={{
            padding:'40px 28px', background:`linear-gradient(135deg, ${cfg.primary}15, transparent)`,
            display:'flex', gap:24, alignItems:'center'
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize: device==='mobile'?22:32, fontWeight:800, color:'#0F172A', lineHeight:1.2, marginBottom:12 }}>
                Bộ sưu tập váy bé gái<br/>Xuân Hè 2026
              </div>
              <div style={{ fontSize:13, color:'#475569', marginBottom:16, lineHeight:1.55 }}>
                Hơn 200 mẫu mới — chất cotton mềm, in hoa mịn, size từ 1–10 tuổi.<br/>Free ship đơn từ 350K, đổi trả 30 ngày.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={{
                  padding:'10px 20px', background:cfg.primary, color:'white', border:'none', borderRadius:8,
                  fontWeight:700, fontSize:13, cursor:'pointer'
                }}>Mua ngay</button>
                <button style={{
                  padding:'10px 20px', background:'white', color:'#0F172A', border:'1px solid #CBD5E1', borderRadius:8,
                  fontWeight:600, fontSize:13, cursor:'pointer'
                }}>Xem catalog</button>
              </div>
            </div>
            {device!=='mobile' && (
              <div style={{
                flex:'0 0 280px', height:200, borderRadius:12,
                background:`linear-gradient(135deg, ${cfg.primary}40, ${cfg.primary}20)`,
                display:'grid', placeItems:'center', fontSize:48
              }}>👗</div>
            )}
          </div>

          {/* Product grid */}
          <div style={{
            padding:'20px 28px',
            display:'grid', gridTemplateColumns: device==='mobile'?'1fr 1fr':'1fr 1fr 1fr 1fr', gap:14
          }}>
            {[
              {n:'Váy hoa nhí', p:'320K', e:'🌸'},
              {n:'Áo croptop', p:'180K', e:'👚'},
              {n:'Đầm dài', p:'480K', e:'👗'},
              {n:'Set đôi', p:'650K', e:'👕'},
            ].map(p => (
              <div key={p.n} style={{ background:'#F8FAFC', borderRadius:10, padding:14 }}>
                <div style={{ height:80, background:'white', borderRadius:8, display:'grid', placeItems:'center', fontSize:34, marginBottom:8 }}>{p.e}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{p.n}</div>
                <div style={{ fontSize:13, fontWeight:700, color:cfg.primary }}>{p.p}</div>
              </div>
            ))}
          </div>

          {/* WIDGET */}
          <WidgetMount cfg={cfg} open={open} setOpen={setOpen} previewState={previewState}/>
        </div>

        {/* Caption */}
        <div style={{ textAlign:'center', fontSize:11, color:'var(--label-03)', marginTop:14 }}>
          Preview {device} · {device==='mobile'?'380':device==='tablet'?'760':'1180'}px · Click bubble để mở/đóng widget
        </div>
      </div>
    </div>
  );
}

/* ============================== Widget Mount ============================== */
function WidgetMount({ cfg, open, setOpen, previewState }) {
  const isDark = cfg.theme==='dark';
  const panelBg = isDark ? '#1E1E2E' : 'white';
  const panelText = isDark ? '#FFFFFF' : '#0F172A';

  const positionStyle = cfg.position==='br'
    ? { right:24, bottom:24 }
    : { left:24, bottom:24 };

  // Launcher
  const launcherIcons = { chat:'💬', bubble:'🗨️', headset:'🎧', sparkles:'✨' };
  const launcherShape = cfg.shape==='circle' ? '50%' : cfg.shape==='squircle' ? '24px' : '999px';
  const isPill = cfg.shape==='pill';

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button onClick={()=>setOpen(true)} style={{
          position:'absolute', ...positionStyle, zIndex:10,
          width: isPill ? 'auto' : cfg.bubbleSize, height: cfg.bubbleSize,
          padding: isPill ? '0 18px' : 0,
          borderRadius: launcherShape,
          background: cfg.primary, color: cfg.textOnPrimary, border:'none',
          fontSize: cfg.bubbleSize*0.45,
          boxShadow:`0 12px 28px ${cfg.primary}50, 0 4px 8px rgba(0,0,0,.10)`,
          cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          animation:'wiggle 3s ease-in-out infinite'
        }}>
          {launcherIcons[cfg.launcherIcon]}
          {isPill && <span style={{ fontSize:13, fontWeight:700 }}>Chat ngay</span>}
        </button>
      )}

      {/* Pulse ring */}
      {!open && (
        <span style={{
          position:'absolute', ...positionStyle, zIndex:9,
          width: cfg.bubbleSize, height: cfg.bubbleSize,
          borderRadius: launcherShape,
          background: cfg.primary, opacity:.30,
          animation:'pulse 2s ease-out infinite'
        }}/>
      )}

      {/* Proactive bubble */}
      {!open && cfg.proactiveEnabled && (
        <div style={{
          position:'absolute',
          [cfg.position==='br' ? 'right' : 'left']: 24 + cfg.bubbleSize + 12,
          bottom: 28,
          maxWidth:280, padding:'10px 14px',
          background: panelBg, color: panelText, borderRadius:14,
          boxShadow:'0 10px 24px rgba(0,0,0,.12)', fontSize:12,
          border:'1px solid rgba(0,0,0,.05)',
          zIndex:10
        }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>{cfg.greetingTitle}</div>
          <div style={{ color: isDark?'#CBD5E1':'#475569', lineHeight:1.5 }}>{cfg.greetingMsg}</div>
          <div style={{
            position:'absolute', bottom:14,
            [cfg.position==='br' ? 'right' : 'left']: -6,
            width:12, height:12, background:panelBg,
            transform:'rotate(45deg)',
            borderRight: cfg.position==='br' ? '1px solid rgba(0,0,0,.05)' : 'none',
            borderTop: cfg.position==='bl' ? '1px solid rgba(0,0,0,.05)' : 'none',
            borderBottom: cfg.position==='br' ? '1px solid rgba(0,0,0,.05)' : 'none',
            borderLeft: cfg.position==='bl' ? '1px solid rgba(0,0,0,.05)' : 'none',
          }}/>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div style={{
          position:'absolute', ...positionStyle, zIndex:11,
          width: 380, maxWidth: 'calc(100% - 36px)',
          height: 560, maxHeight: 'calc(100% - 36px)',
          background: panelBg, color: panelText,
          borderRadius: cfg.cornerRadius, overflow:'hidden',
          boxShadow:'0 24px 64px rgba(0,0,0,.20), 0 8px 16px rgba(0,0,0,.08)',
          display:'flex', flexDirection:'column',
          fontFamily:'inherit'
        }}>
          {/* Header */}
          <div style={{
            background: cfg.primary, color: cfg.textOnPrimary, padding:'14px 16px',
            display:'flex', alignItems:'center', gap:10
          }}>
            <div style={{
              width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.22)',
              display:'grid', placeItems:'center', fontSize:18
            }}>{cfg.avatar}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{cfg.brand}</div>
              <div style={{ fontSize:11, opacity:.85, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{
                  width:8, height:8, borderRadius:'50%',
                  background: cfg.status==='online'?'#34D399':cfg.status==='away'?'#FBBF24':'#94A3B8'
                }}/>
                {cfg.status==='online' ? `Đang online · phản hồi nhanh` : cfg.status==='away'?'Đang bận':'Offline'}
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{
              background:'rgba(255,255,255,.22)', border:'none', color:'inherit',
              width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:14
            }}>✕</button>
          </div>

          {/* Body — switches by previewState */}
          <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
            {previewState==='prechat' && <PreviewPrechat cfg={cfg}/>}
            {previewState==='chat'    && <PreviewChat cfg={cfg}/>}
            {previewState==='survey'  && <PreviewSurvey cfg={cfg}/>}
            {previewState==='offline' && <PreviewOffline cfg={cfg}/>}
          </div>

          {/* Footer composer (only chat) */}
          {previewState==='chat' && (
            <div style={{
              padding:'10px 12px', borderTop:'1px solid', borderColor: isDark?'#2A2A3E':'#EFF1F4',
              display:'flex', alignItems:'center', gap:6, background: isDark?'#16161F':'white'
            }}>
              {cfg.emojiPicker && <span style={{ fontSize:18, cursor:'pointer' }}>😊</span>}
              {cfg.fileUpload && <span style={{ fontSize:16, cursor:'pointer', color: isDark?'#94A3B8':'#475569' }}>📎</span>}
              <input placeholder="Nhập tin nhắn..." style={{
                flex:1, padding:'8px 12px', borderRadius:18,
                border: isDark?'1px solid #2A2A3E':'1px solid #EFF1F4',
                background: isDark?'#1E1E2E':'#F8FAFC', color:'inherit', fontSize:12.5,
                outline:'none'
              }}/>
              {cfg.voiceInput && <span style={{ fontSize:16, cursor:'pointer' }}>🎤</span>}
              <button style={{
                width:32, height:32, borderRadius:'50%', border:'none', background:cfg.primary,
                color:cfg.textOnPrimary, cursor:'pointer'
              }}>➤</button>
            </div>
          )}

          {/* Alt channels strip */}
          {cfg.altChannels.length > 0 && previewState==='chat' && (
            <div style={{
              padding:'8px 12px', borderTop:'1px solid', borderColor: isDark?'#2A2A3E':'#EFF1F4',
              display:'flex', alignItems:'center', gap:8, fontSize:11,
              color: isDark?'#94A3B8':'#64748B', background: isDark?'#16161F':'#F8FAFC'
            }}>
              <span>Hoặc qua:</span>
              {cfg.altChannels.slice(0,5).map(c => {
                const map = {zalo:'#0068FF',messenger:'#0084FF',whatsapp:'#25D366',instagram:'#E4405F',tiktok:'#010101',telegram:'#0088CC',phone:'#FF6A1A',email:'#9B5CF6'};
                return <span key={c} style={{ width:16, height:16, borderRadius:5, background:map[c], cursor:'pointer' }}/>;
              })}
            </div>
          )}

          {/* Branding */}
          {cfg.showBranding && (
            <div style={{
              padding:'6px 12px', textAlign:'center', fontSize:10, color: isDark?'#64748B':'#94A3B8',
              borderTop:'1px solid', borderColor: isDark?'#2A2A3E':'#EFF1F4'
            }}>
              ⚡ Powered by <b>AppChat</b>
            </div>
          )}
        </div>
      )}

      {/* Consent banner */}
      {open && cfg.consentBanner && (
        <div style={{
          position:'absolute', bottom:96, left:24, right:24,
          background:'rgba(15,23,42,.95)', color:'white', padding:'10px 14px', borderRadius:10,
          fontSize:11, zIndex:12, display:'flex', alignItems:'center', gap:10
        }}>
          <span style={{ flex:1 }}>{cfg.consentText}</span>
          <button style={{ padding:'5px 11px', background:cfg.primary, color:'white', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>Đồng ý</button>
        </div>
      )}
    </>
  );
}

/* ============================== Preview states ============================== */
function PreviewPrechat({ cfg }) {
  const isDark = cfg.theme==='dark';
  return (
    <div style={{ padding:'18px 16px', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color: isDark?'white':'#0F172A' }}>Trước khi bắt đầu, tụi mình xin chút thông tin nha:</div>
      {cfg.prechatFields.includes('name') && <PrechatField label="Họ và tên" placeholder="Nguyễn Lan" isDark={isDark}/>}
      {cfg.prechatFields.includes('email') && <PrechatField label="Email" placeholder="ban@email.com" isDark={isDark}/>}
      {cfg.prechatFields.includes('phone') && <PrechatField label="Số điện thoại" placeholder="0901 ..." isDark={isDark}/>}
      {cfg.prechatFields.includes('topic') && (
        <div>
          <div style={{ fontSize:11, fontWeight:600, marginBottom:6, color: isDark?'#CBD5E1':'#475569' }}>Chủ đề</div>
          <select style={{
            width:'100%', padding:'9px 11px', borderRadius:8, fontSize:12.5,
            border: isDark?'1px solid #2A2A3E':'1px solid #E2E8F0',
            background: isDark?'#1E1E2E':'white', color:'inherit'
          }}>
            <option>Tư vấn sản phẩm</option>
            <option>Hỏi đơn hàng</option>
            <option>Đổi trả</option>
            <option>Khác</option>
          </select>
        </div>
      )}
      <button style={{
        marginTop:'auto', padding:'10px 0', background:cfg.primary, color:cfg.textOnPrimary,
        border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer'
      }}>Bắt đầu chat →</button>
    </div>
  );
}

function PrechatField({ label, placeholder, isDark }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, marginBottom:6, color: isDark?'#CBD5E1':'#475569' }}>{label}</div>
      <input placeholder={placeholder} style={{
        width:'100%', padding:'9px 11px', borderRadius:8, fontSize:12.5,
        border: isDark?'1px solid #2A2A3E':'1px solid #E2E8F0',
        background: isDark?'#1E1E2E':'white', color:'inherit', outline:'none'
      }}/>
    </div>
  );
}

function PreviewChat({ cfg }) {
  const isDark = cfg.theme==='dark';
  const bubBgIn = isDark ? '#2A2A3E' : '#F1F5F9';
  const bubBgOut = cfg.primary;
  const txtIn = isDark ? '#E2E8F0' : '#0F172A';

  return (
    <div style={{ padding:'14px 14px 8px', display:'flex', flexDirection:'column', gap:10 }}>
      {/* AI greeting */}
      {cfg.aiEnabled && (
        <div style={{ alignSelf:'flex-start', maxWidth:'85%' }}>
          <div style={{ fontSize:10, color: isDark?'#94A3B8':'#64748B', marginBottom:3, marginLeft:2 }}>
            🤖 Claude Cowork
          </div>
          <div style={{ background: bubBgIn, color: txtIn, padding:'10px 13px', borderRadius:'14px 14px 14px 4px', fontSize:12.5, lineHeight:1.5 }}>
            {cfg.greetingTitle} {cfg.greetingMsg}
          </div>
        </div>
      )}

      {/* Customer */}
      <div style={{ alignSelf:'flex-end', maxWidth:'85%' }}>
        <div style={{ background: bubBgOut, color: cfg.textOnPrimary, padding:'9px 12px', borderRadius:'14px 14px 4px 14px', fontSize:12.5 }}>
          Cho mình hỏi váy hoa nhí size 4 tuổi còn không?
        </div>
        <div style={{ fontSize:9.5, color: isDark?'#64748B':'#94A3B8', marginTop:3, textAlign:'right' }}>
          11:42 ✓✓
        </div>
      </div>

      {/* AI reply with carousel */}
      <div style={{ alignSelf:'flex-start', maxWidth:'85%' }}>
        <div style={{ background: bubBgIn, color: txtIn, padding:'10px 13px', borderRadius:'14px 14px 14px 4px', fontSize:12.5, lineHeight:1.5, marginBottom:6 }}>
          Dạ còn chị nha! Tụi em có 3 mẫu đang sale 20%. Chị xem qua nhé:
        </div>
        <div style={{ display:'flex', gap:6, overflow:'auto', paddingBottom:4 }}>
          {[
            {n:'Hoa nhí xanh', p:'320K', e:'🌸'},
            {n:'Hoa nhí đỏ',   p:'320K', e:'🌺'},
            {n:'Combo 2 mẫu',  p:'580K', e:'🛍️'},
          ].map(p => (
            <div key={p.n} style={{
              flex:'0 0 110px', background: isDark?'#1E1E2E':'white',
              border:'1px solid', borderColor: isDark?'#2A2A3E':'#E2E8F0',
              borderRadius:10, padding:8, textAlign:'center'
            }}>
              <div style={{ fontSize:30 }}>{p.e}</div>
              <div style={{ fontSize:10.5, fontWeight:600, marginTop:2 }}>{p.n}</div>
              <div style={{ fontSize:11, fontWeight:700, color:cfg.primary, marginTop:2 }}>{p.p}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick replies */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignSelf:'flex-start' }}>
        {['Đặt mua','Xem thêm','Chính sách đổi trả','Phí ship'].map(q => (
          <button key={q} style={{
            padding:'5px 11px', borderRadius:14, background:'transparent',
            border:'1px solid', borderColor: cfg.primary, color: cfg.primary,
            fontSize:11, fontWeight:600, cursor:'pointer'
          }}>{q}</button>
        ))}
      </div>

      {/* Typing indicator */}
      {cfg.typingIndicator && (
        <div style={{ alignSelf:'flex-start', display:'flex', gap:4, padding:'10px 13px', background: bubBgIn, borderRadius:'14px 14px 14px 4px' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width:6, height:6, borderRadius:'50%', background: isDark?'#94A3B8':'#94A3B8',
              animation:`typing 1.2s ${i*.15}s ease-in-out infinite`
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewSurvey({ cfg }) {
  const isDark = cfg.theme==='dark';
  return (
    <div style={{ padding:'24px 18px', flex:1, display:'flex', flexDirection:'column', gap:14, alignItems:'center', textAlign:'center' }}>
      <div style={{ fontSize:34 }}>🙏</div>
      <div style={{ fontSize:14, fontWeight:700, color: isDark?'white':'#0F172A' }}>Cảm ơn mẹ đã chat với tụi mình!</div>
      <div style={{ fontSize:12, color: isDark?'#CBD5E1':'#475569', lineHeight:1.55 }}>
        Mẹ đánh giá trải nghiệm hôm nay nha, để tụi mình phục vụ tốt hơn:
      </div>
      <div style={{ display:'flex', gap:5, marginTop:8 }}>
        {[1,2,3,4,5].map(s => (
          <button key={s} style={{
            width:36, height:36, fontSize:22, background:'transparent', border:'none', cursor:'pointer',
            opacity: s<=4 ? 1 : .35, transition:'opacity .15s'
          }}>⭐</button>
        ))}
      </div>
      <textarea placeholder="Để lại comment cho tụi mình..." rows={3} style={{
        width:'100%', padding:'10px 12px', borderRadius:8, fontSize:12,
        border: isDark?'1px solid #2A2A3E':'1px solid #E2E8F0',
        background: isDark?'#1E1E2E':'white', color:'inherit', resize:'vertical', fontFamily:'inherit'
      }}/>
      <button style={{
        width:'100%', padding:'10px', background:cfg.primary, color:cfg.textOnPrimary,
        border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', marginTop:'auto'
      }}>Gửi đánh giá</button>
    </div>
  );
}

function PreviewOffline({ cfg }) {
  const isDark = cfg.theme==='dark';
  return (
    <div style={{ padding:'18px 16px', flex:1, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{
        background:'#FFF7E6', borderLeft:'3px solid #F59E0B', padding:'10px 12px', borderRadius:7,
        fontSize:12, color:'#78350F', lineHeight:1.5
      }}>
        🌙 {cfg.awayMsg}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color: isDark?'white':'#0F172A' }}>Để tụi mình liên hệ lại nha:</div>
      <PrechatField label="Họ và tên" placeholder="Nguyễn Lan" isDark={isDark}/>
      <PrechatField label="SĐT / Email" placeholder="0901... hoặc ban@email.com" isDark={isDark}/>
      <div>
        <div style={{ fontSize:11, fontWeight:600, marginBottom:6, color: isDark?'#CBD5E1':'#475569' }}>Tin nhắn</div>
        <textarea placeholder="Mẹ cần tư vấn gì?" rows={3} style={{
          width:'100%', padding:'9px 11px', borderRadius:8, fontSize:12.5,
          border: isDark?'1px solid #2A2A3E':'1px solid #E2E8F0',
          background: isDark?'#1E1E2E':'white', color:'inherit', resize:'vertical', fontFamily:'inherit'
        }}/>
      </div>
      <button style={{
        marginTop:'auto', padding:'10px 0', background:cfg.primary, color:cfg.textOnPrimary,
        border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer'
      }}>Gửi tin nhắn</button>
    </div>
  );
}

/* ============================== Install Modal ============================== */
function InstallModal({ onClose, cfg }) {
  const [tab, setTab] = useWS('html');
  const snippets = {
    html: `<!-- AppChat Web Widget -->
<script>
  (function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];
  if(d.getElementById(id))return;js=d.createElement(s);js.id=id;
  js.async=1;js.src='https://cdn.appchat.vn/widget/v2.js';
  fjs.parentNode.insertBefore(js,fjs);}(document,'script','appchat-jssdk'));
  window.AppChat={
    appId:'wgt_${(cfg.brand||'').toLowerCase().replace(/\\s+/g,'_')}_2026',
    primary:'${cfg.primary}',
    locale:'${cfg.locale}'
  };
</script>`,
    npm: `npm install @appchat/widget

import { initAppChat } from '@appchat/widget';

initAppChat({
  appId: 'wgt_${(cfg.brand||'').toLowerCase().replace(/\\s+/g,'_')}_2026',
  primary: '${cfg.primary}',
  locale: '${cfg.locale}',
  theme: '${cfg.theme}'
});`,
    gtm: `Tag Type: Custom HTML
Trigger: All Pages
HTML:
<script src="https://cdn.appchat.vn/widget/v2.js"
  data-app-id="wgt_${(cfg.brand||'').toLowerCase().replace(/\\s+/g,'_')}_2026"
  data-primary="${cfg.primary}"
  async></script>`,
    ios: `// Podfile
pod 'AppChatWidget', '~> 2.0'

// AppDelegate.swift
import AppChatWidget

AppChat.shared.configure(
  appId: "wgt_${(cfg.brand||'').toLowerCase().replace(/\\s+/g,'_')}_2026",
  primary: "${cfg.primary}"
)`,
    android: `// build.gradle
implementation 'vn.appchat:widget:2.0.+'

// MainActivity.kt
AppChat.init(this,
  appId = "wgt_${(cfg.brand||'').toLowerCase().replace(/\\s+/g,'_')}_2026",
  primary = "${cfg.primary}"
)`,
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.55)', zIndex:200,
      display:'grid', placeItems:'center'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width: 720, maxWidth:'92vw', maxHeight:'85vh', background:'white', borderRadius:14,
        overflow:'hidden', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,.25)'
      }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--separator)', display:'flex', alignItems:'center', gap:8 }}>
          <Icon.Code/>
          <div style={{ fontWeight:700 }}>Mã cài đặt — {cfg.domain}</div>
          <span style={{ flex:1 }}/>
          <button onClick={onClose} className="btn-icon"><Icon.Close/></button>
        </div>
        <div style={{ display:'flex', borderBottom:'1px solid var(--separator)' }}>
          {[
            {k:'html',l:'HTML / JS'},
            {k:'npm', l:'NPM React'},
            {k:'gtm', l:'Google Tag Manager'},
            {k:'ios', l:'iOS Swift'},
            {k:'android', l:'Android Kotlin'},
          ].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:'12px 16px', background:'none', border:'none',
              borderBottom: tab===t.k ? '2px solid var(--pr)' : '2px solid transparent',
              fontWeight: tab===t.k ? 700 : 500, fontSize:12, cursor:'pointer',
              color: tab===t.k ? 'var(--label-01)' : 'var(--label-03)'
            }}>{t.l}</button>
          ))}
        </div>
        <div style={{ padding:18, overflow:'auto', flex:1 }}>
          <div style={{ fontSize:11, color:'var(--label-03)', marginBottom:8 }}>
            Dán đoạn mã này vào trước thẻ <code style={{ background:'var(--fill-02)', padding:'1px 5px', borderRadius:3 }}>&lt;/body&gt;</code> trên website của bạn.
          </div>
          <pre style={{
            background:'#0F172A', color:'#E2E8F0', padding:14, borderRadius:10,
            fontSize:12, lineHeight:1.55, overflow:'auto', fontFamily:'SF Mono, Monaco, monospace',
            margin:0
          }}>{snippets[tab]}</pre>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn btn-ghost"><Icon.Copy/> Copy</button>
            <button className="btn btn-ghost"><Icon.Download/> Tải file</button>
            <span style={{ flex:1 }}/>
            <button className="btn btn-primary">Gửi mã cho dev qua email</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== Animations ============================== */
const widgetStyle = document.createElement('style');
widgetStyle.textContent = `
@keyframes wiggle { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-6deg) scale(1.04)} }
@keyframes pulse { 0%{transform:scale(1);opacity:.30} 100%{transform:scale(1.55);opacity:0} }
@keyframes typing { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }
`;
document.head.appendChild(widgetStyle);

window.WidgetStudio = WidgetStudio;
