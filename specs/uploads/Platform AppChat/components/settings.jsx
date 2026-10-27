// Settings module — respond.io + Intercom style deep workspace admin
const { useState: useSet } = React;

/* =========================
   Shared UI primitives
   ========================= */
const SToggle = ({on, onChange}) => (
  <button onClick={()=>onChange && onChange(!on)} style={{
    width:34, height:20, borderRadius:10, padding:2, border:'none',
    background: on?'var(--primary)':'var(--fill-05)', cursor:'pointer',
    display:'flex', alignItems:'center', transition:'background .2s'
  }}>
    <div style={{
      width:16, height:16, borderRadius:8, background:'white',
      transform: on?'translateX(14px)':'translateX(0)', transition:'transform .2s',
      boxShadow:'0 1px 2px rgba(0,0,0,.2)'
    }}/>
  </button>
);

const Row = ({label, hint, children, action}) => (
  <div style={{display:'flex', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--fill-03)', gap:16}}>
    <div style={{flex:1}}>
      <div style={{fontSize:13.5, fontWeight:600, color:'var(--label-01)'}}>{label}</div>
      {hint && <div style={{fontSize:11.5, color:'var(--label-03)', marginTop:2}}>{hint}</div>}
    </div>
    {children}
    {action}
  </div>
);

const Input = ({value, placeholder, type='text', style, icon}) => (
  <div style={{position:'relative', display:'inline-block', ...style}}>
    {icon && <span style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--label-03)'}}>{icon}</span>}
    <input type={type} defaultValue={value} placeholder={placeholder} style={{
      height:34, padding: icon?'0 12px 0 32px':'0 12px', border:'1px solid var(--fill-04)', borderRadius:8,
      fontSize:13, fontFamily:'inherit', outline:'none', background:'white', minWidth:220
    }}/>
  </div>
);

const Section = ({title, subtitle, right, children, style}) => (
  <div style={{marginBottom:24, ...style}}>
    <div style={{display:'flex', alignItems:'flex-end', marginBottom:14, gap:12}}>
      <div>
        <h3 style={{margin:0, fontSize:15, fontWeight:700}}>{title}</h3>
        {subtitle && <div style={{fontSize:12, color:'var(--label-03)', marginTop:2}}>{subtitle}</div>}
      </div>
      <span style={{flex:1}}/>
      {right}
    </div>
    {children}
  </div>
);

const Card = ({children, style, padding=20}) => (
  <div className="card" style={{padding, ...style}}>{children}</div>
);

const SFormRow = ({label, hint, children}) => (
  <div style={{display:'grid', gridTemplateColumns:'200px 1fr', gap:20, padding:'14px 0', borderBottom:'1px solid var(--fill-03)', alignItems:'flex-start'}}>
    <div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--label-01)'}}>{label}</div>
      {hint && <div style={{fontSize:11.5, color:'var(--label-03)', marginTop:3, lineHeight:1.4}}>{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);

/* =========================
   SETTINGS NAV
   ========================= */
const SETTINGS_NAV = [
  { group: 'WORKSPACE' },
  { k:'general',     l:'Tổng quan',           i: Icon.Settings },
  { k:'branding',    l:'Thương hiệu',         i: Icon.Palette || Icon.Image },
  { k:'hours',       l:'Giờ làm việc',        i: Icon.Clock },
  { k:'locale',      l:'Ngôn ngữ & vùng',     i: Icon.Globe },

  { group: 'NGƯỜI DÙNG' },
  { k:'members',     l:'Thành viên',          i: Icon.Users,  n:12 },
  { k:'roles',       l:'Vai trò & phân quyền',i: Icon.Shield, n:6 },
  { k:'teams',       l:'Phòng ban',           i: Icon.Layers || Icon.Folder, n:5 },

  { group: 'KÊNH & DỮ LIỆU' },
  { k:'channels',    l:'Kênh kết nối',        i: Icon.Globe, n:9 },
  { k:'callcenter',  l:'Tổng đài (Call Center)', i: Icon.Phone, badge:'NEW' },
  { k:'web_widget',  l:'Web Widget Studio',   i: Icon.Code, badge:'NEW' },
  { k:'contacts_fields', l:'Trường liên hệ',  i: Icon.List || Icon.User },
  { k:'tags',        l:'Thẻ & nhãn',         i: Icon.Tag || Icon.Bookmark, n:24 },
  { k:'replies',     l:'Câu trả lời mẫu',     i: Icon.Zap || Icon.Chat, n:48 },

  { group: 'AI' },
  { k:'ai_models',   l:'AI Models',           i: Icon.Sparkles, badge:'PRO' },
  { k:'ai_agents',   l:'Claude Coworks',           i: Icon.Bot, n:4 },
  { k:'ai_gov',      l:'AI Governance',       i: Icon.Shield, accent:'var(--warning)' },
  { k:'ai_audit',    l:'AI Audit log',        i: Icon.Clock },

  { group: 'TỰ ĐỘNG HOÁ' },
  { k:'automation',  l:'Cấu hình workflow',   i: Icon.Automation || Icon.Zap },
  { k:'routing',     l:'Routing & assignment',i: Icon.Route || Icon.ArrowRight },

  { group: 'ỨNG DỤNG' },
  { k:'integrations',l:'Tích hợp',            i: Icon.Plug || Icon.Layers, n:36 },
  { k:'api',         l:'API & Webhooks',      i: Icon.Key || Icon.Code },
  { k:'playground',  l:'API Playground',      i: Icon.Terminal || Icon.Code, badge:'NEW' },
  { k:'developer',   l:'Developer tools',     i: Icon.Code || Icon.Terminal },

  { group: 'BẢO MẬT' },
  { k:'security',    l:'Bảo mật',             i: Icon.Lock || Icon.Shield },
  { k:'sso',         l:'SSO & 2FA',           i: Icon.Key },
  { k:'audit',       l:'Audit log',           i: Icon.FileText || Icon.Clock },
  { k:'compliance',  l:'Data & Compliance',   i: Icon.Shield },

  { group: 'THÔNG BÁO & TÀI CHÍNH' },
  { k:'notifications', l:'Thông báo',         i: Icon.Bell },
  { k:'billing',     l:'Gói & thanh toán',    i: Icon.Dollar || Icon.CreditCard, accent:'var(--primary)' },
  { k:'usage',       l:'Sử dụng & hoá đơn',   i: Icon.Activity || Icon.TrendingUp },
];

/* =========================
   MAIN
   ========================= */
function SettingsModule() {
  const [active, setActive] = useSet(() => localStorage.getItem('ac_settings') || 'general');
  const [search, setSearch] = useSet('');

  React.useEffect(() => localStorage.setItem('ac_settings', active), [active]);

  const current = SETTINGS_NAV.find(n => n.k === active) || SETTINGS_NAV[1];
  const filtered = SETTINGS_NAV.filter(n => !search || (n.l && n.l.toLowerCase().includes(search.toLowerCase())) || n.group);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Settings</h1>
        <span className="crumb">Quản trị workspace · AI · Bảo mật · Thanh toán</span>
        <span className="spacer"/>
        <div style={{position:'relative'}}>
          <Icon.Search style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--label-03)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm cài đặt… (⌘K)" style={{
            height:32, padding:'0 12px 0 32px', border:'1px solid var(--fill-04)', borderRadius:8,
            fontSize:12.5, fontFamily:'inherit', outline:'none', width:240, background:'white'
          }}/>
        </div>
        <button className="btn btn-ghost btn-sm"><Icon.Help/> Tài liệu</button>
      </div>

      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* LEFT NAV */}
        <div className="scroll" style={{width:280, borderRight:'1px solid var(--fill-04)', background:'white', padding:'16px 10px', flexShrink:0}}>
          {filtered.map((item, i) => item.group ? (
            <div key={'g'+i} style={{padding:'14px 12px 6px', fontSize:10.5, fontWeight:700, color:'var(--label-03)', letterSpacing:'.08em'}}>{item.group}</div>
          ) : (
            <button key={item.k} onClick={()=>setActive(item.k)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8,
              fontSize:13, fontWeight: active===item.k?600:500, textAlign:'left', marginBottom:1,
              background: active===item.k?'var(--bg-green)':'transparent',
              color: active===item.k?'var(--pr-dark-2)':'var(--label-01)',
              border:'none', cursor:'pointer', fontFamily:'inherit', position:'relative'
            }} onMouseEnter={e=>active!==item.k && (e.currentTarget.style.background='var(--fill-02)')}
               onMouseLeave={e=>active!==item.k && (e.currentTarget.style.background='transparent')}>
              {active===item.k && <div style={{position:'absolute', left:0, top:6, bottom:6, width:3, borderRadius:2, background:'var(--primary)'}}/>}
              {item.i && React.createElement(item.i, {style:{width:15, height:15, color: active===item.k?'var(--primary)':item.accent||'var(--label-02)', flexShrink:0}})}
              <span style={{flex:1}}>{item.l}</span>
              {item.n && <span style={{fontSize:10.5, color:'var(--label-03)', fontWeight:500}}>{item.n}</span>}
              {item.badge && <span style={{padding:'1px 6px', borderRadius:4, background:'var(--grad-signature)', color:'white', fontSize:9, fontWeight:700, letterSpacing:'.04em'}}>{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* MAIN PANEL */}
        <div className="scroll" style={{flex:1, background:'var(--fill-02)', overflow: SETTINGS_PAGES[active]?.fullBleed ? 'hidden' : 'auto', minWidth:0}}>
          <SettingsPage k={active} nav={current}/>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({k, nav}) {
  const Page = (k==='callcenter' && window.CallCenterSettings) || (k==='billing' && window.BillingPage) || SETTINGS_PAGES[k] || SettingsPlaceholder;
  if (Page.fullBleed) {
    return <div style={{height:'100%'}}><Page/></div>;
  }
  return (
    <div style={{padding:'28px 36px', maxWidth:980}}>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase', marginBottom:6}}>Settings</div>
        <h1 style={{margin:0, fontSize:26, fontWeight:700, letterSpacing:'-0.01em'}}>{nav.l}</h1>
      </div>
      <Page/>
    </div>
  );
}

/* WEB WIDGET STUDIO — full-bleed wrapper */
function PageWebWidget() {
  return window.WidgetStudio ? <window.WidgetStudio/> : <div style={{padding:40}}>Đang tải Widget Studio...</div>;
}
PageWebWidget.fullBleed = true;

/* =========================
   PAGES
   ========================= */

/* GENERAL */
function PageGeneral() {
  return (
    <>
      <Card style={{marginBottom:16}}>
        <div style={{display:'flex', gap:20, alignItems:'center'}}>
          <div style={{width:80, height:80, borderRadius:20, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white', fontWeight:800, fontSize:26}}>MS</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:700}}>MediaSoft Vietnam</div>
            <div style={{fontSize:12, color:'var(--label-03)'}}>workspace.id · <code style={{background:'var(--fill-03)', padding:'1px 6px', borderRadius:4, fontSize:11}}>ms-vn-2026</code></div>
            <div style={{display:'flex', gap:6, marginTop:10}}>
              <span className="chip" style={{background:'var(--grad-signature)', color:'white'}}>Ultimate plan</span>
              <span className="chip green">12/15 seats</span>
              <span className="chip outline">Since 06/2024</span>
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            <button className="btn btn-ghost btn-sm">Tải logo mới</button>
            <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}}>Xoá logo</button>
          </div>
        </div>
      </Card>

      <Section title="Thông tin chung" subtitle="Thông tin này sẽ xuất hiện trên hoá đơn và báo cáo">
        <Card padding={0} style={{padding:'0 20px'}}>
          <SFormRow label="Tên công ty" hint="Dùng trên hoá đơn và email xuất đi">
            <Input value="MediaSoft Vietnam Corp." style={{width:'100%'}}/>
          </SFormRow>
          <SFormRow label="Website" hint="Link chính thức của công ty">
            <Input value="https://mediasoft.vn" style={{width:'100%'}}/>
          </SFormRow>
          <SFormRow label="Mã số thuế" hint="Hiển thị trên hoá đơn VAT">
            <Input value="0314783952"/>
          </SFormRow>
          <SFormRow label="Địa chỉ đăng ký">
            <Input value="81 Cách Mạng Tháng 8, Q.1, TP.HCM" style={{width:'100%'}}/>
          </SFormRow>
          <SFormRow label="Số điện thoại hỗ trợ">
            <Input value="+84 28 3823 4567"/>
          </SFormRow>
          <SFormRow label="Email quản trị">
            <Input value="admin@mediasoft.vn" type="email"/>
          </SFormRow>
          <div style={{padding:'16px 0', display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button className="btn btn-ghost">Huỷ</button>
            <button className="btn btn-primary">Lưu thay đổi</button>
          </div>
        </Card>
      </Section>

      <Section title="Vùng nguy hiểm" subtitle="Các thao tác không thể hoàn tác">
        <Card style={{border:'1px solid #FEE2E2', background:'#FEF2F2'}}>
          <Row label="Đóng băng workspace" hint="Tạm dừng toàn bộ hoạt động, không mất dữ liệu">
            <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)', borderColor:'var(--danger)', border:'1px solid var(--danger)'}}>Đóng băng</button>
          </Row>
          <Row label="Xuất toàn bộ dữ liệu" hint="File ZIP chứa tất cả hội thoại, contacts, log AI">
            <button className="btn btn-ghost btn-sm">Xuất dữ liệu</button>
          </Row>
          <div style={{display:'flex', alignItems:'center', padding:'14px 0', gap:16}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5, fontWeight:600, color:'var(--danger)'}}>Xoá workspace</div>
              <div style={{fontSize:11.5, color:'var(--label-03)', marginTop:2}}>Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xoá sau 30 ngày.</div>
            </div>
            <button className="btn btn-sm" style={{background:'var(--danger)', color:'white', border:'none'}}>Xoá workspace</button>
          </div>
        </Card>
      </Section>
    </>
  );
}

/* BRANDING */
function PageBranding() {
  return (
    <>
      <Section title="Thương hiệu hiển thị" subtitle="Logo, màu và favicon dùng trong livechat và email">
        <Card>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            <div>
              <div style={{fontSize:12, fontWeight:600, marginBottom:8}}>Logo chính</div>
              <div style={{height:120, border:'2px dashed var(--fill-04)', borderRadius:12, display:'grid', placeItems:'center', background:'var(--fill-02)', position:'relative'}}>
                <div style={{width:60, height:60, borderRadius:14, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white', fontWeight:800, fontSize:22}}>MS</div>
              </div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:6}}>PNG/SVG · tối thiểu 512×512 · nền trong suốt</div>
            </div>
            <div>
              <div style={{fontSize:12, fontWeight:600, marginBottom:8}}>Favicon</div>
              <div style={{height:120, border:'2px dashed var(--fill-04)', borderRadius:12, display:'grid', placeItems:'center', background:'var(--fill-02)'}}>
                <div style={{width:40, height:40, borderRadius:8, background:'var(--primary)', display:'grid', placeItems:'center', color:'white', fontWeight:800, fontSize:14}}>MS</div>
              </div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:6}}>ICO/PNG · 32×32 hoặc 64×64</div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Bảng màu thương hiệu" subtitle="Dùng cho livechat widget và template email">
        <Card>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12}}>
            {[
              {l:'Primary',  v:'#2DC56A'},
              {l:'Dark',     v:'#176E3A'},
              {l:'Accent',   v:'#F59E0B'},
              {l:'Text',     v:'#0F172A'},
            ].map(c => (
              <div key={c.l}>
                <div style={{height:64, borderRadius:10, background:c.v, marginBottom:6, border:'1px solid var(--fill-04)'}}/>
                <div style={{fontSize:12, fontWeight:600}}>{c.l}</div>
                <div style={{fontSize:11, fontFamily:'monospace', color:'var(--label-03)'}}>{c.v}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="White-label (Ultimate)" subtitle="Ẩn thương hiệu AppChat khỏi widget và email gửi đi">
        <Card>
          <Row label="Ẩn 'Powered by AppChat' ở livechat" hint="Chỉ áp dụng cho plan Ultimate"><SToggle on/></Row>
          <Row label="Dùng domain riêng cho livechat widget" hint="chat.mediasoft.vn → CNAME trỏ về widget.appchat.vn"><SToggle on/></Row>
          <Row label="Email gửi từ domain riêng (SPF/DKIM)" hint="noreply@mediasoft.vn — đã xác minh DNS"><SToggle on/></Row>
          <Row label="Thay subdomain admin panel"><button className="btn btn-ghost btn-sm">ms.appchat.vn →</button></Row>
        </Card>
      </Section>
    </>
  );
}

/* BUSINESS HOURS */
function PageHours() {
  const days = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
  return (
    <>
      <Section title="Giờ làm việc" subtitle="Dùng cho auto-reply và SLA timer">
        <Card>
          <Row label="Múi giờ workspace"><select style={selectS}><option>(GMT+7) Asia/Ho_Chi_Minh</option><option>(GMT+0) UTC</option></select></Row>
          <Row label="Bật chế độ giờ làm việc" hint="Ngoài giờ, tự động trả lời và không gửi thông báo SLA"><SToggle on/></Row>
          <div style={{marginTop:14}}>
            <div style={{fontSize:12, fontWeight:600, marginBottom:10}}>Lịch tuần</div>
            {days.map((d,i) => {
              const off = i===6;
              return (
                <div key={d} style={{display:'grid', gridTemplateColumns:'100px 60px 1fr auto', gap:12, alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--fill-03)'}}>
                  <div style={{fontSize:13, fontWeight:600}}>{d}</div>
                  <SToggle on={!off}/>
                  {!off ? (
                    <div style={{display:'flex', gap:8, alignItems:'center', color:'var(--label-02)', fontSize:13}}>
                      <Input value={i===5?'09:00':'08:30'} style={{minWidth:100}}/>
                      <span>→</span>
                      <Input value={i===5?'13:00':'18:00'} style={{minWidth:100}}/>
                    </div>
                  ) : <div style={{fontSize:12, color:'var(--label-03)'}}>Nghỉ</div>}
                  <button className="btn btn-ghost btn-sm"><Icon.Plus/> Ca 2</button>
                </div>
              );
            })}
          </div>
        </Card>
      </Section>

      <Section title="Ngày nghỉ lễ" subtitle="Tự động đánh dấu off và dùng auto-reply lễ tết" right={<button className="btn btn-ghost btn-sm"><Icon.Plus/> Thêm ngày</button>}>
        <Card padding={0} style={{padding:'0 20px'}}>
          {[
            {n:'Tết Âm lịch 2027', d:'06/02 → 10/02/2027'},
            {n:'30/04 - 01/05', d:'30/04 → 03/05/2026'},
            {n:'Quốc khánh', d:'02/09/2026'},
          ].map((h,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:i<2?'1px solid var(--fill-03)':'none'}}>
              <Icon.Calendar style={{width:16, height:16, color:'var(--primary)'}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>{h.n}</div>
                <div style={{fontSize:11.5, color:'var(--label-03)'}}>{h.d}</div>
              </div>
              <button className="btn-icon"><Icon.Edit/></button>
              <button className="btn-icon"><Icon.Trash/></button>
            </div>
          ))}
        </Card>
      </Section>
    </>
  );
}

/* LOCALE */
function PageLocale() {
  return (
    <Section title="Ngôn ngữ & vùng" subtitle="Áp dụng cho giao diện và định dạng hiển thị">
      <Card>
        <Row label="Ngôn ngữ giao diện"><select style={selectS}><option>Tiếng Việt</option><option>English</option><option>中文</option></select></Row>
        <Row label="Ngôn ngữ phụ (cho AI)" hint="AI Co-pilot sẽ hiểu và sinh câu trả lời bằng ngôn ngữ này"><select style={selectS}><option>English</option><option>中文</option></select></Row>
        <Row label="Múi giờ"><select style={selectS}><option>(GMT+7) Asia/Ho_Chi_Minh</option></select></Row>
        <Row label="Định dạng ngày"><select style={selectS}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></Row>
        <Row label="Tiền tệ"><select style={selectS}><option>VND (₫)</option><option>USD ($)</option><option>CNY (¥)</option></select></Row>
        <Row label="Tuần bắt đầu"><select style={selectS}><option>Thứ 2</option><option>Chủ nhật</option></select></Row>
      </Card>
    </Section>
  );
}

/* MEMBERS */
function PageMembers() {
  const { TEAM } = window.AppData;
  const [q, setQ] = useSet('');
  const list = TEAM.filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div style={{display:'flex', gap:10, marginBottom:14}}>
        <Input icon={<Icon.Search style={{width:14, height:14}}/>} placeholder="Tìm thành viên, email, phòng ban…" style={{flex:1}} value=""/>
        <button className="btn btn-ghost"><Icon.Filter/> Lọc</button>
        <button className="btn btn-ghost"><Icon.Download/> Xuất CSV</button>
        <button className="btn btn-primary"><Icon.Plus/> Mời thành viên</button>
      </div>

      <Card style={{marginBottom:16, background:'linear-gradient(135deg, var(--bg-green), white)', border:'1px solid rgba(45,197,106,.3)'}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <Icon.Sparkles style={{width:20, height:20, color:'var(--primary)'}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:700}}>AI đề xuất: 3 thành viên chưa đăng nhập hơn 30 ngày</div>
            <div style={{fontSize:11.5, color:'var(--label-02)'}}>Cân nhắc gỡ seat để tiết kiệm 1.500.000₫/tháng</div>
          </div>
          <button className="btn btn-ghost btn-sm">Xem chi tiết</button>
        </div>
      </Card>

      <Card padding={0}>
        <div style={{display:'grid', gridTemplateColumns:'32px 2.5fr 1.5fr 1.2fr 1fr 1fr 60px', gap:12, padding:'12px 20px', background:'var(--fill-02)', fontSize:11, fontWeight:700, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid var(--fill-04)'}}>
          <input type="checkbox"/>
          <div>Thành viên</div>
          <div>Vai trò</div>
          <div>Phòng ban</div>
          <div>Hoạt động cuối</div>
          <div>Trạng thái</div>
          <div></div>
        </div>
        {TEAM.map((m,i) => (
          <div key={m.email} style={{display:'grid', gridTemplateColumns:'32px 2.5fr 1.5fr 1.2fr 1fr 1fr 60px', gap:12, padding:'14px 20px', alignItems:'center', borderBottom: i<TEAM.length-1?'1px solid var(--fill-03)':'none', fontSize:13}}>
            <input type="checkbox"/>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <div className="avatar" style={{background:'hsl('+(m.name.length*40)%360+' 55% 48%)', width:34, height:34, position:'relative'}}>
                {m.name.split(' ').slice(-1)[0][0]}
                {m.online && <span style={{position:'absolute', bottom:-1, right:-1, width:9, height:9, borderRadius:5, background:'var(--success)', border:'2px solid white'}}/>}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:600}}>{m.name}</div>
                <div style={{fontSize:11.5, color:'var(--label-03)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{m.email}</div>
              </div>
            </div>
            <div>
              <span className="chip outline" style={{fontSize:11}}>{m.role}</span>
            </div>
            <div style={{fontSize:12, color:'var(--label-02)'}}>{m.dept}</div>
            <div style={{fontSize:11.5, color:'var(--label-03)'}}>{m.online?'Đang online':i%3===0?'2h trước':i%3===1?'Hôm qua':'3 ngày trước'}</div>
            <div>
              {m.online ? <span className="chip green" style={{fontSize:10}}>● Active</span> : i===5 ? <span className="chip yellow" style={{fontSize:10}}>Chờ OTP</span> : <span className="chip outline" style={{fontSize:10}}>Offline</span>}
            </div>
            <div style={{display:'flex', gap:2, justifyContent:'flex-end'}}>
              <button className="btn-icon"><Icon.More/></button>
            </div>
          </div>
        ))}
      </Card>

      <div style={{marginTop:14, fontSize:12, color:'var(--label-03)', textAlign:'center'}}>
        12 thành viên · Gói của bạn hỗ trợ tối đa <b>15 seat</b> · <a href="#" style={{color:'var(--primary)'}}>Nâng cấp plan</a>
      </div>
    </>
  );
}

/* ROLES */
function PageRoles() {
  const roles = [
    {n:'Phụ trách',          d:'Toàn quyền · chỉ có 1', c:1, color:'#DC2626', sys:true},
    {n:'Admin',          d:'Quản trị workspace, team, billing', c:2, color:'#7C3AED'},
    {n:'Sales Manager',  d:'Quản lý đội sales, xem reports', c:1, color:'#2563EB'},
    {n:'Sales Agent',    d:'Xử lý hội thoại được giao, tạo đơn', c:5, color:'#2DC56A'},
    {n:'CS Agent',       d:'Chăm sóc khách hàng, không xem pricing', c:2, color:'#F59E0B'},
    {n:'Viewer',         d:'Chỉ xem report và dashboard', c:1, color:'#6B7280'},
  ];
  const perms = [
    {g:'Messages', items:['Xem inbox','Gửi tin nhắn','Gán hội thoại','Xoá hội thoại','Xuất dữ liệu']},
    {g:'Liên hệ', items:['Xem','Tạo mới','Sửa','Xoá','Gộp / duplicate']},
    {g:'Sourcing', items:['Tạo yêu cầu','Xem giá','Gửi RFQ','Duyệt RFQ']},
    {g:'AI',       items:['Dùng Co-pilot','Tinh chỉnh prompt','Xem AI audit log']},
    {g:'Settings', items:['Mời user','Billing','Kết nối kênh','Thay logo']},
  ];
  return (
    <>
      <Section title="Vai trò" subtitle="Định nghĩa nhóm quyền và gán cho thành viên" right={<button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo vai trò</button>}>
        <Card padding={0}>
          {roles.map((r,i) => (
            <div key={r.n} style={{display:'grid', gridTemplateColumns:'4px 1.5fr 2fr 80px 80px 60px', gap:14, padding:'14px 20px', alignItems:'center', borderBottom:i<roles.length-1?'1px solid var(--fill-03)':'none'}}>
              <div style={{width:4, height:36, borderRadius:2, background:r.color}}/>
              <div>
                <div style={{fontWeight:700, fontSize:14}}>{r.n} {r.sys && <span style={{fontSize:10, color:'var(--label-03)', fontWeight:500}}>· hệ thống</span>}</div>
              </div>
              <div style={{fontSize:12, color:'var(--label-02)'}}>{r.d}</div>
              <div style={{fontSize:12, color:'var(--label-02)'}}>{r.c} người</div>
              <div><span className="chip outline" style={{fontSize:10}}>Custom</span></div>
              <div style={{display:'flex', justifyContent:'flex-end'}}>
                <button className="btn-icon"><Icon.More/></button>
              </div>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Ma trận phân quyền" subtitle="So sánh chi tiết quyền của từng vai trò">
        <Card padding={0} style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:12.5}}>
              <thead>
                <tr style={{background:'var(--fill-02)'}}>
                  <th style={{padding:'12px 16px', textAlign:'left', fontWeight:700, color:'var(--label-03)', fontSize:11, letterSpacing:'.04em', textTransform:'uppercase', borderBottom:'1px solid var(--fill-04)', minWidth:180, position:'sticky', left:0, background:'var(--fill-02)'}}>Quyền</th>
                  {roles.slice(1).map(r => (
                    <th key={r.n} style={{padding:'12px 10px', textAlign:'center', fontWeight:700, fontSize:11, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid var(--fill-04)', minWidth:90}}>{r.n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map(p => (
                  <React.Fragment key={p.g}>
                    <tr><td colSpan={roles.length} style={{padding:'8px 16px', background:'#FAFBFB', fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:'.04em'}}>{p.g}</td></tr>
                    {p.items.map((it, i) => (
                      <tr key={it}>
                        <td style={{padding:'10px 16px', fontWeight:500, position:'sticky', left:0, background:'white', borderBottom:'1px solid var(--fill-03)'}}>{it}</td>
                        {roles.slice(1).map((r, ri) => {
                          const yes = ri===0 ? true : ri===1 ? i<4 : ri===2 ? (i<2 || (p.g==='Messages' && i<3)) : ri===3 ? (i===0 || (p.g==='Messages' && i<2)) : false;
                          return (
                            <td key={r.n} style={{padding:'10px 10px', textAlign:'center', borderBottom:'1px solid var(--fill-03)'}}>
                              {yes ? <Icon.Check style={{width:14, height:14, color:'var(--primary)'}}/> : <span style={{color:'var(--fill-05)'}}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </>
  );
}

/* TEAMS */
function PageTeams() {
  const teams = [
    {n:'Sales — Zalo/FB',  m:5, c:'#2DC56A'},
    {n:'Sales — TikTok',   m:3, c:'#EC4899'},
    {n:'Sales — Marketplaces', m:2, c:'#F59E0B'},
    {n:'Khách hàng Success', m:2, c:'#3B82F6'},
    {n:'Sourcing team',    m:2, c:'#8B5CF6'},
  ];
  return (
    <Section title="Phòng ban" subtitle="Nhóm nhân sự theo chức năng · dùng cho routing và báo cáo" right={<button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo phòng</button>}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12}}>
        {teams.map(t => (
          <Card key={t.n}>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
              <div style={{width:40, height:40, borderRadius:10, background:t.c, display:'grid', placeItems:'center', color:'white'}}>
                <Icon.Users style={{width:20, height:20}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:14}}>{t.n}</div>
                <div style={{fontSize:11.5, color:'var(--label-03)'}}>{t.m} thành viên</div>
              </div>
              <button className="btn-icon"><Icon.More/></button>
            </div>
            <div style={{display:'flex', gap:-6, marginBottom:10}}>
              {Array.from({length: Math.min(t.m, 5)}).map((_,i) => (
                <div key={i} className="avatar" style={{width:26, height:26, fontSize:10, marginLeft: i===0?0:-6, background:'hsl('+((i*47)%360)+' 55% 48%)', border:'2px solid white'}}>{'ABCDE'[i]}</div>
              ))}
            </div>
            <div style={{display:'flex', gap:6}}>
              <button className="btn btn-ghost btn-sm" style={{flex:1}}>Thành viên</button>
              <button className="btn btn-ghost btn-sm" style={{flex:1}}>Cấu hình</button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* CHANNELS */
function PageKênh() {
  const { CHANNELS_CONNECTED } = window.AppData;
  const available = [
    {ch:'zalo',      n:'Zalo OA',          d:'Kết nối Official Account'},
    {ch:'facebook',  n:'Facebook Messenger', d:'Page Messenger và Comment'},
    {ch:'instagram', n:'Instagram',        d:'DM và Story reply'},
    {ch:'tiktok',    n:'TikTok Shop',      d:'DM và comment shop'},
    {ch:'shopee',    n:'Shopee',           d:'Chat và đơn hàng'},
    {ch:'whatsapp',  n:'WhatsApp Kinh doanh',d:'Cloud API'},
    {ch:'email',     n:'Email',            d:'IMAP/SMTP hoặc Gmail/Outlook'},
    {ch:'web',       n:'Livechat Web',     d:'Widget nhúng website'},
    {ch:'viber',     n:'Viber',            d:'Kinh doanh Account'},
  ];
  return (
    <>
      <Section title="Kênh đã kết nối" subtitle="9 kênh đang hoạt động · đồng bộ real-time">
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12}}>
          {CHANNELS_CONNECTED.map(c => (
            <Card key={c.name}>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
                <ChannelBadge name={c.channel} size={36}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:700, fontSize:13.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.name}</div>
                  <div style={{fontSize:11.5, color:'var(--label-03)'}}>{c.acct}</div>
                </div>
                {c.status==='connected' && <span className="chip green" style={{fontSize:10}}>● Hoạt động</span>}
                {c.status==='error' && <span className="chip red" style={{fontSize:10}}>Lỗi</span>}
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'10px 0', borderTop:'1px solid var(--fill-03)', fontSize:11.5}}>
                <div><div style={{color:'var(--label-03)'}}>Tin 24h</div><div style={{fontWeight:700, fontSize:13}}>{c.msgs}</div></div>
                <div><div style={{color:'var(--label-03)'}}>Agent gán</div><div style={{fontWeight:700, fontSize:13}}>{3+(c.name.length%4)}</div></div>
                <div><div style={{color:'var(--label-03)'}}>AI xử lý</div><div style={{fontWeight:700, fontSize:13, color:'var(--primary)'}}>{60+(c.name.length*3)%30}%</div></div>
              </div>
              <div style={{display:'flex', gap:6}}>
                <button className="btn btn-ghost btn-sm" style={{flex:1}}>Cấu hình</button>
                <button className="btn btn-ghost btn-sm" style={{flex:1}}>Test</button>
                <button className="btn-icon"><Icon.More/></button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Thêm kênh mới" subtitle="Kết nối thêm nguồn tin nhắn vào AppChat">
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
          {available.map(a => (
            <div key={a.ch} className="card" style={{padding:16, display:'flex', alignItems:'center', gap:12}}>
              <ChannelBadge name={a.ch} size={40}/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:700, fontSize:13}}>{a.n}</div>
                <div style={{fontSize:11, color:'var(--label-03)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{a.d}</div>
              </div>
              <button className="btn btn-ghost btn-sm">Kết nối</button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* CONTACT FIELDS */
function PageFields() {
  const fields = [
    {n:'Họ tên',        t:'Text', req:true, sys:true},
    {n:'Số điện thoại', t:'Phone', req:true, sys:true},
    {n:'Email',         t:'Email', req:false, sys:true},
    {n:'Địa chỉ',       t:'Address', req:false, sys:true},
    {n:'Tier khách',    t:'Select · VIP/Gold/Regular', req:false, sys:false},
    {n:'Nguồn',         t:'Select · Zalo/FB/Referral', req:false, sys:false},
    {n:'LTV dự kiến',   t:'Number · VND', req:false, sys:false},
    {n:'Ngày sinh',     t:'Date', req:false, sys:false},
    {n:'Ghi chú AI',    t:'Text · AI tự cập nhật', req:false, sys:false, ai:true},
  ];
  return (
    <Section title="Trường liên hệ tuỳ chỉnh" subtitle="Định nghĩa các thuộc tính cho contact" right={<button className="btn btn-primary btn-sm"><Icon.Plus/> Thêm trường</button>}>
      <Card padding={0}>
        {fields.map((f,i)=>(
          <div key={f.n} style={{display:'grid', gridTemplateColumns:'24px 2fr 2fr 80px 80px 40px', gap:14, padding:'14px 20px', alignItems:'center', borderBottom:i<fields.length-1?'1px solid var(--fill-03)':'none'}}>
            <Icon.Grid style={{width:14, height:14, color:'var(--label-03)', cursor:'grab'}}/>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <div style={{fontWeight:600, fontSize:13}}>{f.n}</div>
              {f.ai && <span className="chip" style={{background:'var(--grad-signature)', color:'white', fontSize:9, height:16}}>AI</span>}
            </div>
            <div style={{fontSize:12, color:'var(--label-02)', fontFamily:'monospace'}}>{f.t}</div>
            <div>{f.req && <span className="chip red" style={{fontSize:10}}>Bắt buộc</span>}</div>
            <div>{f.sys ? <span className="chip outline" style={{fontSize:10}}>Hệ thống</span> : <span className="chip outline" style={{fontSize:10}}>Custom</span>}</div>
            <button className="btn-icon"><Icon.More/></button>
          </div>
        ))}
      </Card>
    </Section>
  );
}

/* TAGS */
function PageThẻ() {
  const tags = (window.useTags ? window.useTags() : []);
  const [editing, setEditing] = useSet(null); // {id?,n,c}
  const PALETTE=['#DC2626','#F59E0B','#2563EB','#16A34A','#7C3AED','#0E9B94','#EF4444','#D97706','#6B7280','#06B6D4'];
  const save=()=>{ if(!editing.n.trim()){return;} if(editing.id){ window.AppTags.update(editing.id,{n:editing.n.trim(),c:editing.c}); } else { window.AppTags.add(editing.n.trim(), editing.c); } setEditing(null); };
  return (
    <Section title="Thẻ & nhãn" subtitle="Nguồn tag dùng chung — Customers &amp; Hộp thư đều gắn tag từ đây" right={<button className="btn btn-primary btn-sm" onClick={()=>setEditing({n:'',c:'#2563EB'})}><Icon.Plus/> Tạo tag</button>}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
        {tags.map(t => (
          <div key={t.id||t.n} className="card" style={{padding:14, display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:12, height:12, borderRadius:3, background:t.c}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:600, fontSize:13}}>{t.n}</div>
              <div style={{fontSize:11, color:'var(--label-03)'}}>{t.u||0} được gắn</div>
            </div>
            <button className="btn-icon" onClick={()=>setEditing({id:t.id, n:t.n, c:t.c})}><Icon.Edit/></button>
            <button className="btn-icon" onClick={()=>window.AppTags.remove(t.id)}><Icon.Trash/></button>
          </div>
        ))}
      </div>
      {editing && (
        <div onClick={()=>setEditing(null)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:1300,display:'grid',placeItems:'center',padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{width:420,background:'white',borderRadius:16,boxShadow:'0 30px 70px rgba(17,24,39,.3)'}}>
            <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--fill-04)',fontSize:17,fontWeight:800}}>{editing.id?'Sửa tag':'Tạo tag mới'}</div>
            <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
              <div><div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:5}}>Tên tag</div><input autoFocus value={editing.n} onChange={e=>setEditing({...editing,n:e.target.value})} placeholder="VD: Khách thân thiết" style={{width:'100%',height:38,padding:'0 11px',border:'1px solid var(--fill-04)',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
              <div><div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:7}}>Màu</div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{PALETTE.map(c=>(<button key={c} onClick={()=>setEditing({...editing,c})} style={{width:28,height:28,borderRadius:7,background:c,border:editing.c===c?'2px solid var(--label-01)':'2px solid transparent',cursor:'pointer'}}/>))}</div></div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 22px',borderTop:'1px solid var(--fill-04)',background:'var(--fill-02)'}}>
              <button onClick={()=>setEditing(null)} className="btn btn-ghost btn-sm">Huỷ</button>
              <button onClick={save} className="btn btn-primary btn-sm" style={{opacity:editing.n.trim()?1:.5}}>{editing.id?'Lưu':'Tạo tag'}</button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

/* SAVED REPLIES */
function PageReplies() {
  const cats = [
    {g:'Chào & xin lỗi', items:[
      {sc:'/chao', n:'Chào khách lần đầu'},
      {sc:'/xinloi', n:'Xin lỗi khi khách chờ lâu'},
      {sc:'/cam_on', n:'Cảm ơn khách đã mua hàng'},
    ]},
    {g:'Thông tin sản phẩm', items:[
      {sc:'/gia', n:'Gửi bảng giá tổng'},
      {sc:'/size', n:'Hướng dẫn chọn size'},
      {sc:'/chat_lieu', n:'Giải thích chất liệu vải'},
    ]},
    {g:'Vận chuyển & thanh toán', items:[
      {sc:'/ship', n:'Phí ship từng khu vực'},
      {sc:'/cod', n:'Chính sách COD'},
      {sc:'/doi_tra', n:'Chính sách đổi trả 7 ngày'},
    ]},
  ];
  return (
    <>
      <div style={{display:'flex', gap:10, marginBottom:14}}>
        <Input icon={<Icon.Search style={{width:14, height:14}}/>} placeholder="Tìm theo tên hoặc shortcut (/)" style={{flex:1}} value=""/>
        <button className="btn btn-ghost"><Icon.Folder/> Nhóm</button>
        <button className="btn btn-primary"><Icon.Plus/> Câu trả lời mẫu</button>
      </div>
      {cats.map(c => (
        <Card key={c.g} style={{marginBottom:12, padding:0}}>
          <div style={{padding:'12px 20px', borderBottom:'1px solid var(--fill-03)', display:'flex', alignItems:'center', gap:10}}>
            <Icon.Folder style={{width:16, height:16, color:'var(--primary)'}}/>
            <div style={{fontWeight:700, fontSize:13}}>{c.g}</div>
            <span style={{fontSize:11, color:'var(--label-03)'}}>{c.items.length} mẫu</span>
          </div>
          {c.items.map((it,i)=>(
            <div key={it.sc} style={{display:'grid', gridTemplateColumns:'120px 1fr 80px', gap:14, padding:'12px 20px', alignItems:'center', borderBottom:i<c.items.length-1?'1px solid var(--fill-03)':'none'}}>
              <code style={{fontSize:12, background:'var(--fill-03)', padding:'3px 8px', borderRadius:4, color:'var(--pr-dark-2)', fontWeight:600, justifySelf:'flex-start'}}>{it.sc}</code>
              <div style={{fontSize:13, fontWeight:500}}>{it.n}</div>
              <div style={{display:'flex', gap:2, justifyContent:'flex-end'}}>
                <button className="btn-icon"><Icon.Edit/></button>
                <button className="btn-icon"><Icon.More/></button>
              </div>
            </div>
          ))}
        </Card>
      ))}
    </>
  );
}

/* AI MODELS */
function PageAIModels() {
  return (
    <>
      <Section title="Model AI mặc định" subtitle="Dùng cho Co-pilot, Agent và Sourcing">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          {[
            {n:'Claude Haiku 4.5', d:'Nhanh · Rẻ · Co-pilot thời gian thực', p:'$0.8 / 1M', active:true, badge:'Đang dùng'},
            {n:'Claude Sonnet 4.5', d:'Mạnh · Sourcing, reasoning phức tạp', p:'$3.0 / 1M', active:true, badge:'Hot task'},
            {n:'Claude Opus 4.1',  d:'Tối ưu độ chính xác cao', p:'$15.0 / 1M', upgrade:true},
            {n:'Local Claude-7B',     d:'On-premise · dữ liệu nhạy cảm', p:'Miễn phí', upgrade:true},
          ].map(m => (
            <div key={m.n} className="card" style={{padding:16, border: m.active?'2px solid var(--primary)':'1px solid var(--fill-04)', background: m.active?'var(--bg-green)':'white'}}>
              <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
                <div style={{width:36, height:36, borderRadius:10, background: m.active?'var(--grad-signature)':'var(--fill-03)', display:'grid', placeItems:'center', color: m.active?'white':'var(--label-02)'}}>
                  <Icon.Sparkles style={{width:18, height:18}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{fontWeight:700, fontSize:14}}>{m.n}</div>
                    {m.badge && <span className="chip green" style={{fontSize:9.5, height:18}}>{m.badge}</span>}
                  </div>
                  <div style={{fontSize:11.5, color:'var(--label-02)', marginTop:3}}>{m.d}</div>
                  <div style={{fontSize:11, color:'var(--label-03)', marginTop:6, fontFamily:'monospace'}}>{m.p} input tokens</div>
                </div>
              </div>
              <div style={{marginTop:12}}>
                {m.upgrade ? <button className="btn btn-ghost btn-sm" style={{width:'100%'}}>Nâng cấp để mở khoá</button>
                : m.active ? <button className="btn btn-ghost btn-sm" style={{width:'100%'}}>Cấu hình</button>
                : <button className="btn btn-primary btn-sm" style={{width:'100%'}}>Kích hoạt</button>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Phân bổ theo task" subtitle="Gán model phù hợp cho từng use case">
        <Card padding={0} style={{padding:'0 20px'}}>
          {[
            {task:'Messages · Co-pilot gợi ý', m:'Claude Haiku 4.5'},
            {task:'Messages · Claude Cowork tự động trả lời', m:'Claude Haiku 4.5'},
            {task:'Sourcing · Claude Cowork phân tích sản phẩm', m:'Claude Sonnet 4.5'},
            {task:'Reports · AI Insights', m:'Claude Sonnet 4.5'},
            {task:'Broadcast · AI content optimizer', m:'Claude Haiku 4.5'},
          ].map((r,i,a)=>(
            <div key={r.task} style={{display:'flex', alignItems:'center', padding:'14px 0', borderBottom:i<a.length-1?'1px solid var(--fill-03)':'none', gap:16}}>
              <div style={{flex:1, fontSize:13, fontWeight:500}}>{r.task}</div>
              <select style={selectS} defaultValue={r.m}>
                <option>Claude Haiku 4.5</option>
                <option>Claude Sonnet 4.5</option>
                <option>Claude Opus 4.1</option>
              </select>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Giới hạn sử dụng">
        <Card>
          <Row label="Budget AI hàng tháng" hint="Cảnh báo khi dùng ≥80%">
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <Input value="5,000,000" style={{minWidth:120, textAlign:'right'}}/>
              <span style={{fontSize:12, color:'var(--label-03)'}}>₫</span>
            </div>
          </Row>
          <Row label="Rate limit per agent" hint="Giới hạn token/phút">
            <Input value="10,000" style={{minWidth:120}}/>
          </Row>
          <Row label="Tự động chuyển model rẻ khi hết hạn mức"><SToggle on/></Row>
        </Card>
      </Section>
    </>
  );
}

/* AI AGENTS */
function PageAIAgents() {
  const { AI_AGENTS } = window.AppData;
  return (
    <Section title="Claude Coworks" subtitle="Các agent chuyên biệt chạy trong workspace" right={<button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo agent</button>}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12}}>
        {AI_AGENTS.map(a => (
          <Card key={a.name}>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
              <div style={{width:40, height:40, borderRadius:10, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white'}}>
                <Icon.Bot style={{width:20, height:20}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:14}}>{a.name}</div>
                <div style={{fontSize:11.5, color:'var(--label-03)'}}>{a.role}</div>
              </div>
              <SToggle on={a.active}/>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'10px 0', borderTop:'1px solid var(--fill-03)', borderBottom:'1px solid var(--fill-03)', fontSize:11.5, marginBottom:10}}>
              <div><div style={{color:'var(--label-03)'}}>Runs 24h</div><div style={{fontWeight:700, fontSize:13}}>{a.runs || 240}</div></div>
              <div><div style={{color:'var(--label-03)'}}>Success</div><div style={{fontWeight:700, fontSize:13, color:'var(--primary)'}}>{a.success || '94%'}</div></div>
              <div><div style={{color:'var(--label-03)'}}>Cost / day</div><div style={{fontWeight:700, fontSize:13}}>{a.cost || '120k₫'}</div></div>
            </div>
            <div style={{display:'flex', gap:6}}>
              <button className="btn btn-ghost btn-sm" style={{flex:1}}>Prompt</button>
              <button className="btn btn-ghost btn-sm" style={{flex:1}}>Knowledge</button>
              <button className="btn btn-ghost btn-sm" style={{flex:1}}>Logs</button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* AI GOVERNANCE */
function PageAIGov() {
  return (
    <>
      <Card style={{marginBottom:16, background:'linear-gradient(135deg, #FEF3C7, white)', border:'1px solid #FCD34D'}}>
        <div style={{display:'flex', gap:12}}>
          <Icon.Shield style={{width:24, height:24, color:'#D97706', flexShrink:0}}/>
          <div>
            <div style={{fontWeight:700, fontSize:13.5}}>AI Governance tuân thủ ISO/IEC 42001</div>
            <div style={{fontSize:12, color:'var(--label-02)', marginTop:3, lineHeight:1.5}}>
              Workspace của bạn đang áp dụng 12/14 chính sách khuyến nghị. <a href="#" style={{color:'var(--primary)', fontWeight:600}}>Xem gap analysis →</a>
            </div>
          </div>
        </div>
      </Card>

      <Section title="Phạm vi dữ liệu AI được phép truy cập">
        <Card padding={0} style={{padding:'0 20px'}}>
          {[
            {l:'Tin nhắn khách 30 ngày gần nhất', h:'Bao gồm ảnh, file đính kèm', on:true},
            {l:'Catalogue & bảng giá nội bộ',     h:'Sản phẩm, giá, khuyến mãi', on:true},
            {l:'Chính sách đổi trả / FAQ',        h:'Dữ liệu public', on:true},
            {l:'Thông tin khách hàng (PII)',      h:'CCCD, số điện thoại, địa chỉ — rủi ro rò rỉ', on:false, warn:true},
            {l:'Hợp đồng & hồ sơ tài chính',      h:'Chỉ Phụ trách + Admin được bật', on:false, warn:true},
            {l:'Dữ liệu từ đối tác sourcing',     h:'Giá, điều khoản hợp tác', on:false},
          ].map((r,i,a)=>(
            <Row key={r.l} label={<span>{r.l} {r.warn && <span className="chip yellow" style={{marginLeft:6, height:18, fontSize:10}}>⚠ Nhạy cảm</span>}</span>} hint={r.h}>
              <SToggle on={r.on}/>
            </Row>
          ))}
        </Card>
      </Section>

      <Section title="Ranh giới hành vi" subtitle="Các việc AI KHÔNG được phép tự làm">
        <Card padding={0} style={{padding:'0 20px'}}>
          {[
            {l:'Tự chốt đơn > 10.000.000₫ (không cần duyệt)', on:false, warn:true},
            {l:'Tự gửi thông tin tài khoản thanh toán', on:false, warn:true},
            {l:'Tự hứa giảm giá / voucher > 10%', on:false, warn:true},
            {l:'Tự cam kết thời gian giao hàng', on:false},
            {l:'Tự escalate lên người khi confidence < 70%', on:true},
            {l:'Luôn kèm disclosure "Tin nhắn từ AI"', on:true},
            {l:'Log toàn bộ hành vi AI cho audit', on:true},
          ].map(r => (
            <Row key={r.l} label={<span>{r.l} {r.warn && <span className="chip red" style={{marginLeft:6, height:18, fontSize:10}}>Rủi ro cao</span>}</span>}>
              <SToggle on={r.on}/>
            </Row>
          ))}
        </Card>
      </Section>

      <Section title="Từ khóa cấm & filter output" subtitle="AI tự động từ chối hoặc escalate">
        <Card>
          <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:12}}>
            {['chính trị','tôn giáo','cạnh tranh tiêu cực','đầu tư tài chính','y tế cá nhân','pháp lý cá nhân'].map(t=>(
              <span key={t} className="chip" style={{background:'var(--fill-04)', fontSize:11, padding:'4px 10px'}}>{t} ×</span>
            ))}
            <button className="btn btn-ghost btn-sm" style={{height:26}}><Icon.Plus/> Thêm</button>
          </div>
          <Row label="Filter mức độ chặt"><select style={selectS}><option>Strict (khuyến nghị)</option><option>Moderate</option><option>Permissive</option></select></Row>
          <Row label="Human review cho câu trả lời dài &gt; 200 từ"><SToggle on/></Row>
        </Card>
      </Section>

      <Section title="Retention & chia sẻ" subtitle="Thời gian lưu dữ liệu AI và chia sẻ bên ngoài">
        <Card>
          <Row label="Lưu prompt + response" hint="Dùng cho audit và cải thiện"><select style={selectS}><option>90 ngày</option><option>30 ngày</option><option>180 ngày</option><option>1 năm</option></select></Row>
          <Row label="Không dùng dữ liệu để train model bên ngoài"><SToggle on/></Row>
          <Row label="Anonymize PII trước khi gửi provider"><SToggle on/></Row>
          <Row label="Data residency" hint="Vị trí lưu trữ dữ liệu AI"><select style={selectS}><option>Singapore (APAC)</option><option>US</option><option>EU</option></select></Row>
        </Card>
      </Section>
    </>
  );
}

/* AI AUDIT */
function PageAIAudit() {
  const logs = [
    {t:'14:23:10', u:'Claude AI — Co-pilot', a:'Gợi ý reply', ctx:'Messages/Thread #8245', status:'ok'},
    {t:'14:22:48', u:'Claude AI — Sourcing Agent', a:'Gọi 1688 API', ctx:'Tìm 500 túi canvas', status:'ok'},
    {t:'14:21:02', u:'Claude AI — Co-pilot', a:'Bị block (từ khoá cấm)', ctx:'Chủ đề tài chính cá nhân', status:'warn'},
    {t:'14:19:36', u:'Claude AI — Order Agent', a:'Tự chốt đơn 850k₫', ctx:'Order #VN-8842', status:'ok'},
    {t:'14:15:21', u:'Claude AI — CS Agent', a:'Escalate confidence 62%', ctx:'Khách khiếu nại hoàn tiền', status:'esc'},
    {t:'14:12:04', u:'Human · Lan', a:'Điều chỉnh prompt Claude Cowork', ctx:'Sales Zalo prompt v12', status:'ok'},
    {t:'14:10:18', u:'Claude AI — Co-pilot', a:'Anonymize PII trong log', ctx:'Thread #8240 — ẩn SĐT', status:'ok'},
  ];
  return (
    <Section title="AI Audit log" subtitle="Toàn bộ hành vi AI trong 24h · lưu 90 ngày" right={<div style={{display:'flex', gap:6}}><button className="btn btn-ghost btn-sm"><Icon.Filter/> Lọc</button><button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất</button></div>}>
      <Card padding={0}>
        <div style={{display:'grid', gridTemplateColumns:'80px 1.5fr 1.5fr 2fr 80px 60px', gap:12, padding:'12px 20px', background:'var(--fill-02)', fontSize:11, fontWeight:700, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid var(--fill-04)'}}>
          <div>Giờ</div><div>Actor</div><div>Hành động</div><div>Context</div><div>Status</div><div></div>
        </div>
        {logs.map((l,i)=>(
          <div key={i} style={{display:'grid', gridTemplateColumns:'80px 1.5fr 1.5fr 2fr 80px 60px', gap:12, padding:'12px 20px', alignItems:'center', borderBottom:i<logs.length-1?'1px solid var(--fill-03)':'none', fontSize:12.5}}>
            <div style={{fontFamily:'monospace', color:'var(--label-02)'}}>{l.t}</div>
            <div style={{fontWeight:600}}>{l.u}</div>
            <div>{l.a}</div>
            <div style={{color:'var(--label-02)'}}>{l.ctx}</div>
            <div>
              {l.status==='ok' && <span className="chip green" style={{fontSize:10}}>OK</span>}
              {l.status==='warn' && <span className="chip yellow" style={{fontSize:10}}>Warn</span>}
              {l.status==='esc' && <span className="chip red" style={{fontSize:10}}>Escalated</span>}
            </div>
            <button className="btn-icon"><Icon.ArrowRight/></button>
          </div>
        ))}
      </Card>
    </Section>
  );
}

/* AUTOMATION */
function PageAutomation() {
  return (
    <>
      <Section title="Cài đặt chung automation">
        <Card>
          <Row label="Cho phép workflow chạy song song" hint="Có thể gây trùng phản hồi, nên bật rate limit"><SToggle on/></Row>
          <Row label="Max workflow runs / phút"><Input value="120" style={{minWidth:100}}/></Row>
          <Row label="Timeout mặc định cho 1 step" hint="Tính bằng giây"><Input value="30"/></Row>
          <Row label="Gửi log lỗi workflow vào Slack"><SToggle on/></Row>
        </Card>
      </Section>
      <Section title="Mẫu workflow khởi động nhanh">
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12}}>
          {[
            {n:'Chào khách Zalo', d:'Tự động gửi welcome khi khách chat lần đầu', u:142},
            {n:'Chia hội thoại theo agent', d:'Round-robin qua 5 agent online', u:96},
            {n:'Escalate VIP', d:'Khách VIP gắn cờ ưu tiên + gọi Manager', u:58},
            {n:'Chốt đơn COD', d:'Xác nhận đơn hàng 2 bước qua Zalo OTP', u:32},
          ].map(w=>(
            <Card key={w.n}>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
                <div style={{width:36, height:36, borderRadius:8, background:'var(--bg-green)', color:'var(--primary)', display:'grid', placeItems:'center'}}><Icon.Zap style={{width:18, height:18}}/></div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, fontSize:13}}>{w.n}</div>
                  <div style={{fontSize:11, color:'var(--label-03)'}}>{w.u} workspace đang dùng</div>
                </div>
              </div>
              <div style={{fontSize:12, color:'var(--label-02)', marginBottom:10, lineHeight:1.5}}>{w.d}</div>
              <button className="btn btn-ghost btn-sm" style={{width:'100%'}}>Dùng template</button>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ROUTING */
function PageRouting() {
  return (
    <>
      <Section title="Quy tắc phân công" subtitle="Ai xử lý tin khi khách chat vào">
        <Card>
          <Row label="Chiến lược mặc định">
            <select style={selectS}>
              <option>Round-robin (chia đều)</option>
              <option>Load balancing (người ít việc nhất)</option>
              <option>Skill-based routing</option>
              <option>Dựa trên kênh</option>
              <option>Sticky (giữ agent cũ)</option>
            </select>
          </Row>
          <Row label="Chỉ gán cho agent đang online"><SToggle on/></Row>
          <Row label="Không gán khi agent đang AFK > 10 phút"><SToggle on/></Row>
          <Row label="Ưu tiên agent cùng ngôn ngữ với khách"><SToggle on/></Row>
          <Row label="Khi ngoài giờ làm việc" hint="Tự gửi auto-reply và xếp hàng đợi"><select style={selectS}><option>AI tự xử lý</option><option>Auto-reply + queue</option><option>Gửi tới số on-call</option></select></Row>
        </Card>
      </Section>

      <Section title="SLA & ưu tiên">
        <Card>
          <Row label="First response time (FRT)" hint="Thời gian trả lời tin đầu tiên"><Input value="3"/><span style={{marginLeft:6, fontSize:12, color:'var(--label-03)'}}>phút</span></Row>
          <Row label="Resolution time" hint="Đóng ticket tối đa"><Input value="240"/><span style={{marginLeft:6, fontSize:12, color:'var(--label-03)'}}>phút</span></Row>
          <Row label="Alert khi gần vi phạm SLA" hint="Cảnh báo trước X%"><select style={selectS}><option>80%</option><option>90%</option></select></Row>
          <Row label="Auto-escalate khi quá hạn SLA"><SToggle on/></Row>
        </Card>
      </Section>
    </>
  );
}

/* INTEGRATIONS */
function PageIntegrations() {
  const cats = [
    {g:'CRM', items:['Salesforce','HubSpot','Pipedrive','Zoho CRM']},
    {g:'E-commerce', items:['Shopify','Haravan','WooCommerce','Sapo']},
    {g:'Payments', items:['VNPAY','MoMo','ZaloPay','Stripe']},
    {g:'Productivity', items:['Slack','Google Workspace','Microsoft 365','Notion']},
    {g:'Analytics', items:['Google Analytics','Mixpanel','Amplitude','Metabase']},
    {g:'ERP / Logistics', items:['MISA','BRAVO','SAP','GHTK','GHN']},
  ];
  return (
    <>
      <Section title="Đã kết nối" right={<button className="btn btn-ghost btn-sm">Xem tất cả</button>}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
          {['Shopify','Salesforce','Slack','Google Analytics'].map(a => (
            <Card key={a} style={{padding:14}}>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
                <div style={{width:36, height:36, borderRadius:8, background:'var(--fill-03)', display:'grid', placeItems:'center', fontWeight:700, fontSize:14}}>{a[0]}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{a}</div>
                  <div style={{fontSize:10.5, color:'var(--label-03)'}}>Kết nối 12/03</div>
                </div>
              </div>
              <div style={{display:'flex', gap:4}}>
                <span className="chip green" style={{fontSize:9.5}}>● Active</span>
                <span style={{flex:1}}/>
                <button className="btn-icon"><Icon.More/></button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Marketplace" subtitle="36 ứng dụng — tích hợp 1 click">
        {cats.map(c=>(
          <div key={c.g} style={{marginBottom:18}}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8}}>{c.g}</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8}}>
              {c.items.map(a=>(
                <div key={a} className="card" style={{padding:12, display:'flex', alignItems:'center', gap:10}}>
                  <div style={{width:32, height:32, borderRadius:8, background:'hsl('+((a.length*47)%360)+' 60% 90%)', display:'grid', placeItems:'center', fontWeight:700, color:'hsl('+((a.length*47)%360)+' 60% 35%)'}}>{a[0]}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{a}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{padding:'3px 10px', fontSize:11}}>Thêm</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

/* API */
function PageAPI() {
  return (
    <>
      <Section title="API Keys" right={<button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo key</button>}>
        <Card padding={0}>
          {[
            {n:'Production',     k:'ac_live_sk_8F2A···9B4C', d:'Tạo 12/03/2026 · dùng 48.2K calls', env:'prod'},
            {n:'Staging',        k:'ac_test_sk_91DC···3A71', d:'Tạo 05/01/2026 · dùng 3.4K calls', env:'staging'},
            {n:'Mobile backend', k:'ac_live_sk_AA22···77EE', d:'Tạo 02/02/2026 · scope: read-only', env:'prod'},
          ].map((k,i,a)=>(
            <div key={k.n} style={{display:'grid', gridTemplateColumns:'auto 1.5fr 2fr 80px 80px', gap:14, padding:'14px 20px', alignItems:'center', borderBottom:i<a.length-1?'1px solid var(--fill-03)':'none'}}>
              <Icon.Key style={{width:16, height:16, color:'var(--primary)'}}/>
              <div>
                <div style={{fontSize:13, fontWeight:700}}>{k.n}</div>
                <div style={{fontSize:11, color:'var(--label-03)', fontFamily:'monospace'}}>{k.k}</div>
              </div>
              <div style={{fontSize:11.5, color:'var(--label-02)'}}>{k.d}</div>
              <span className={'chip ' + (k.env==='prod'?'green':'yellow')} style={{fontSize:10}}>{k.env}</span>
              <div style={{display:'flex', gap:2, justifyContent:'flex-end'}}>
                <button className="btn-icon"><Icon.Copy/></button>
                <button className="btn-icon"><Icon.More/></button>
              </div>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Webhooks" right={<button className="btn btn-primary btn-sm"><Icon.Plus/> Endpoint</button>}>
        <Card padding={0}>
          {[
            {url:'https://api.mediasoft.vn/webhooks/appchat', ev:'message.* · order.* · ticket.*', s:'ok'},
            {url:'https://crm.internal/appchat-sync', ev:'contact.created · contact.updated', s:'ok'},
            {url:'https://analytics.mediasoft.vn/ingest', ev:'conversation.closed', s:'err'},
          ].map((w,i,a)=>(
            <div key={w.url} style={{padding:'14px 20px', borderBottom:i<a.length-1?'1px solid var(--fill-03)':'none'}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div style={{width:8, height:8, borderRadius:4, background: w.s==='ok'?'var(--success)':'var(--danger)'}}/>
                <code style={{flex:1, fontSize:12, fontFamily:'monospace'}}>{w.url}</code>
                <span className="chip outline" style={{fontSize:10}}>{w.s==='ok'?'200 OK':'500 Error'}</span>
                <button className="btn-icon"><Icon.More/></button>
              </div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:4, paddingLeft:20}}>{w.ev}</div>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Quick start" subtitle="Thử ngay API bằng cURL">
        <Card style={{background:'#0F172A', color:'#8AE0AC'}}>
          <pre style={{margin:0, fontSize:12, fontFamily:'monospace', lineHeight:1.7}}>
<span style={{color:'#94A3B8'}}># Gửi tin nhắn qua API</span>{'\n'}
<span style={{color:'#60A5FA'}}>curl</span> -X POST https://api.appchat.vn/v1/messages \{'\n'}
  -H <span style={{color:'#FCD34D'}}>"Authorization: Bearer ac_live_sk_..."</span> \{'\n'}
  -H <span style={{color:'#FCD34D'}}>"Content-Type: application/json"</span> \{'\n'}
  -d <span style={{color:'#FCD34D'}}>{'\'{ "to": "zalo:8490xxxx", "text": "Hello" }\''}</span>
          </pre>
        </Card>
      </Section>
    </>
  );
}

/* API PLAYGROUND */
const API_ENDPOINTS = [
  { group: 'Messages' },
  { m:'POST',   p:'/v1/messages',                   t:'Gửi tin nhắn ra kênh (Zalo/FB/WA…)' },
  { m:'GET',    p:'/v1/messages/:id',               t:'Lấy chi tiết tin nhắn' },
  { m:'GET',    p:'/v1/conversations',              t:'Liệt kê hội thoại theo bộ lọc' },
  { m:'POST',   p:'/v1/conversations/:id/assign',   t:'Gán hội thoại cho agent' },
  { m:'POST',   p:'/v1/conversations/:id/close',    t:'Đóng hội thoại' },

  { group: 'Contacts' },
  { m:'GET',    p:'/v1/contacts',                   t:'Liệt kê liên hệ (filter, pagination)' },
  { m:'POST',   p:'/v1/contacts',                   t:'Tạo liên hệ mới' },
  { m:'PATCH',  p:'/v1/contacts/:id',               t:'Cập nhật liên hệ' },
  { m:'POST',   p:'/v1/contacts/:id/tags',          t:'Gắn tag cho liên hệ' },

  { group: 'Deals' },
  { m:'GET',    p:'/v1/deals',                      t:'Liệt kê deal theo stage' },
  { m:'POST',   p:'/v1/deals',                      t:'Tạo deal mới' },
  { m:'POST',   p:'/v1/deals/:id/move',             t:'Chuyển deal sang stage khác' },

  { group: 'Campaigns (Broadcast)' },
  { m:'POST',   p:'/v1/campaigns',                  t:'Tạo chiến dịch ZNS/Email/SMS' },
  { m:'POST',   p:'/v1/campaigns/:id/send',         t:'Kích hoạt gửi chiến dịch' },
  { m:'GET',    p:'/v1/campaigns/:id/report',       t:'Report real-time' },

  { group: 'AI (Claude Cowork)' },
  { m:'POST',   p:'/v1/ai/suggest',                 t:'Claude gợi ý câu trả lời' },
  { m:'POST',   p:'/v1/ai/sourcing',                t:'Tìm sản phẩm/NCC xuyên biên' },
  { m:'POST',   p:'/v1/ai/score',                   t:'Tính Claude Score cho liên hệ' },

  { group: 'Webhooks' },
  { m:'GET',    p:'/v1/webhooks',                   t:'Liệt kê endpoint webhook' },
  { m:'POST',   p:'/v1/webhooks/test',              t:'Gửi test payload' },
];

const ENDPOINT_DETAILS = {
  '/v1/messages:POST': {
    params: [],
    headers: [
      { k:'Authorization', v:'Bearer ac_live_sk_8F2A···9B4C', required:true },
      { k:'Content-Type',  v:'application/json',               required:true },
      { k:'X-Idempotency-Key', v:'auto-generated', required:false },
    ],
    body: {
      to: 'zalo:84901234567',
      channel: 'zalo',
      text: 'Chào chị Lan, đơn #VN-8842 đã được xác nhận 🎉',
      attachments: [{ type:'image', url:'https://cdn.appchat.vn/demo.jpg' }],
      metadata: { order_id: 'VN-8842', campaign: 'flash-sale-20-04' }
    },
    response: {
      status: 201,
      body: {
        id: 'msg_01HXABCDEFGHIJKLMNPQR',
        conversation_id: 'conv_8245',
        to: 'zalo:84901234567',
        channel: 'zalo',
        status: 'queued',
        created_at: '2026-04-21T14:23:10Z',
        cost_credits: 1
      }
    }
  },
  '/v1/contacts:GET': {
    params: [
      { k:'limit',  v:'50',      required:false },
      { k:'cursor', v:'',        required:false },
      { k:'tag',    v:'vip',     required:false },
      { k:'owner',  v:'u_tram',  required:false },
    ],
    headers: [
      { k:'Authorization', v:'Bearer ac_live_sk_8F2A···9B4C', required:true },
    ],
    body: null,
    response: {
      status: 200,
      body: {
        data: [
          { id:'ct_01HX', name:'Lan Nguyễn', channel:'zalo', tags:['vip','returning'], score:92, last_seen:'2026-04-21T11:42:00Z' },
          { id:'ct_01HY', name:'Minh Phạm',  channel:'facebook', tags:['hot'], score:78, last_seen:'2026-04-21T10:12:00Z' },
        ],
        next_cursor: 'eyJvZmZzZXQiOjUwfQ==',
        has_more: true
      }
    }
  },
  '/v1/ai/suggest:POST': {
    params: [],
    headers: [
      { k:'Authorization', v:'Bearer ac_live_sk_8F2A···9B4C', required:true },
      { k:'Content-Type',  v:'application/json',               required:true },
    ],
    body: {
      conversation_id: 'conv_8245',
      tone: 'friendly',
      language: 'vi',
      max_suggestions: 3
    },
    response: {
      status: 200,
      body: {
        suggestions: [
          { id:'s1', text:'Dạ còn đủ size chị Lan ơi, em gửi link xem ngay nhé 💚', confidence:0.94, model:'claude-haiku-4.5' },
          { id:'s2', text:'Em cảm ơn chị. Size 4 tuổi còn 12 mẫu, em gửi kèm ảnh chụp thật ạ', confidence:0.87 },
          { id:'s3', text:'Chị cho em xin size cân nặng của bé để tư vấn chính xác hơn nhé', confidence:0.81 },
        ],
        latency_ms: 410,
        tokens_used: 128
      }
    }
  }
};

function PagePlayground() {
  const [epKey, setEpKey] = useSet('/v1/messages:POST');
  const [tab, setTab]   = useSet('body');       // params | body | headers | auth
  const [lang, setLang] = useSet('curl');       // curl | node | python | php
  const [env, setEnv]   = useSet('sandbox');    // sandbox | prod
  const [sending, setSending] = useSet(false);
  const [latency, setLatency] = useSet(null);

  const current = API_ENDPOINTS.find(e => !e.group && (e.p + ':' + e.m) === epKey) || { m:'POST', p:'/v1/messages' };
  const detail = ENDPOINT_DETAILS[current.p + ':' + current.m] || ENDPOINT_DETAILS['/v1/messages:POST'];

  const methodColor = {
    GET:'#3B82F6', POST:'#10B981', PATCH:'#F59E0B', PUT:'#F59E0B', DELETE:'#E33F3F'
  }[current.m] || '#64748B';

  const baseUrl = env==='sandbox' ? 'https://api-sandbox.appchat.vn' : 'https://api.appchat.vn';
  const fullUrl = baseUrl + current.p;

  const send = () => {
    setSending(true); setLatency(null);
    setTimeout(() => { setSending(false); setLatency(Math.floor(180 + Math.random()*260)); }, 900);
  };

  const bodyJson = detail.body ? JSON.stringify(detail.body, null, 2) : null;
  const respJson = JSON.stringify(detail.response.body, null, 2);

  // Code snippet generator
  const genSnippet = () => {
    if (lang==='curl') {
      let out = `curl -X ${current.m} ${fullUrl}`;
      detail.headers.forEach(h => out += ` \\\n  -H "${h.k}: ${h.v}"`);
      if (bodyJson) out += ` \\\n  -d '${bodyJson.replace(/\n\s*/g, ' ')}'`;
      return out;
    }
    if (lang==='node') {
      return `import { AppChat } from '@appchat/sdk';

const client = new AppChat({ apiKey: process.env.APPCHAT_API_KEY });

const result = await client.${current.p.split('/').filter(Boolean).slice(1).join('.').replace(/:(\w+)/g,'($1)')}.${current.m.toLowerCase()}(${bodyJson ? bodyJson : ''});
console.log(result);`;
    }
    if (lang==='python') {
      return `from appchat import Client

client = Client(api_key=os.environ["APPCHAT_API_KEY"])

result = client.request(
    method="${current.m}",
    path="${current.p}",${bodyJson ? `\n    json=${bodyJson.replace(/"([^"]+)":/g, '"$1":')},` : ''}
)
print(result)`;
    }
    return `<?php
$ch = curl_init('${fullUrl}');
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${current.m}');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ac_live_sk_...',
  'Content-Type: application/json'
]);${bodyJson ? `\ncurl_setopt($ch, CURLOPT_POSTFIELDS, '${bodyJson.replace(/\n/g,'')}');` : ''}
$response = curl_exec($ch);`;
  };

  const borderCol = 'var(--fill-04)';
  const cellBg = 'var(--fill-01)';

  return (
    <div style={{display:'grid', gridTemplateColumns:'280px 1fr 420px', gap:0, height:'calc(100vh - 120px)', minHeight:720, margin:'-20px -24px', borderTop:'1px solid '+borderCol}}>

      {/* ENDPOINT BROWSER */}
      <div style={{borderRight:'1px solid '+borderCol, background:'white', overflow:'auto'}}>
        <div style={{padding:'12px 14px', borderBottom:'1px solid '+borderCol, position:'sticky', top:0, background:'white', zIndex:2}}>
          <div style={{fontSize:12, fontWeight:800, color:'var(--label-01)', marginBottom:8, display:'flex', alignItems:'center', gap:6}}>
            <Icon.Terminal style={{width:14, height:14, color:'var(--primary)'}}/>
            API Reference
          </div>
          <div style={{position:'relative'}}>
            <Icon.Search style={{position:'absolute', left:8, top:7, width:13, height:13, color:'var(--label-03)'}}/>
            <input placeholder="Tìm endpoint…" style={{width:'100%', padding:'6px 8px 6px 26px', border:'1px solid '+borderCol, borderRadius:7, fontSize:12, fontFamily:'inherit'}}/>
          </div>
        </div>
        {API_ENDPOINTS.map((e, i) => e.group ? (
          <div key={'g'+i} style={{padding:'14px 14px 4px', fontSize:10, fontWeight:800, color:'var(--label-03)', letterSpacing:'.08em'}}>{e.group.toUpperCase()}</div>
        ) : (
          <button key={e.p+e.m} onClick={()=>setEpKey(e.p+':'+e.m)} style={{
            width:'100%', textAlign:'left', padding:'8px 14px', background: epKey===(e.p+':'+e.m) ? 'var(--pr-soft)' : 'transparent',
            border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit',
            borderLeft:'3px solid '+(epKey===(e.p+':'+e.m) ? 'var(--primary)' : 'transparent')
          }}>
            <span style={{fontSize:9.5, fontWeight:800, color: ({GET:'#3B82F6', POST:'#10B981', PATCH:'#F59E0B', PUT:'#F59E0B', DELETE:'#E33F3F'})[e.m], minWidth:34, textAlign:'left'}}>{e.m}</span>
            <code style={{fontSize:11.5, fontFamily:'ui-monospace, monospace', color:'var(--label-01)', flex:1}}>{e.p}</code>
          </button>
        ))}
      </div>

      {/* MIDDLE: REQUEST BUILDER */}
      <div style={{background:cellBg, display:'flex', flexDirection:'column', overflow:'hidden'}}>
        {/* URL bar */}
        <div style={{padding:'16px 20px', borderBottom:'1px solid '+borderCol, background:'white'}}>
          <div style={{display:'flex', alignItems:'center', gap:2, border:'1px solid '+borderCol, borderRadius:10, background:'white', overflow:'hidden'}}>
            <div style={{padding:'10px 14px', fontWeight:800, fontSize:12.5, color:methodColor, borderRight:'1px solid '+borderCol, minWidth:80, textAlign:'center', fontFamily:'ui-monospace, monospace'}}>{current.m}</div>
            <div style={{padding:'0 10px', fontSize:11, color:'var(--label-03)', borderRight:'1px solid '+borderCol}}>
              <select value={env} onChange={e=>setEnv(e.target.value)} style={{border:'none', background:'transparent', fontSize:11, fontFamily:'inherit', padding:'10px 4px', cursor:'pointer'}}>
                <option value="sandbox">🟡 Sandbox</option>
                <option value="prod">🟢 Production</option>
              </select>
            </div>
            <code style={{flex:1, padding:'10px 14px', fontSize:12.5, fontFamily:'ui-monospace, monospace', color:'var(--label-01)'}}>
              <span style={{color:'var(--label-03)'}}>{baseUrl}</span>{current.p}
            </code>
            <button onClick={send} disabled={sending} className="btn btn-primary" style={{margin:4, padding:'8px 20px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6, border:'none', borderRadius:8, background:sending?'var(--label-03)':'var(--primary)', color:'white', cursor: sending?'not-allowed':'pointer'}}>
              {sending ? (<><Icon.Clock style={{width:13, height:13}}/> Đang gửi…</>) : (<><Icon.Play style={{width:13, height:13}}/> Send</>)}
            </button>
          </div>
          <div style={{fontSize:11.5, color:'var(--label-02)', marginTop:8, display:'flex', alignItems:'center', gap:10}}>
            <span>{(API_ENDPOINTS.find(e=>!e.group && (e.p+':'+e.m)===epKey) || {}).t}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex', gap:0, padding:'0 20px', background:'white', borderBottom:'1px solid '+borderCol}}>
          {[
            {k:'params',  l:'Query params', n: detail.params.length},
            {k:'body',    l:'Body',         dot: !!detail.body},
            {k:'headers', l:'Headers',      n: detail.headers.length},
            {k:'auth',    l:'Auth'},
          ].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:'10px 14px', background:'none', border:'none', borderBottom:'2px solid '+(tab===t.k?'var(--primary)':'transparent'),
              color: tab===t.k?'var(--label-01)':'var(--label-02)', fontWeight: tab===t.k?700:500, fontSize:12, cursor:'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center', gap:6
            }}>
              {t.l}
              {t.n != null && <span style={{background:'var(--fill-03)', padding:'1px 6px', borderRadius:8, fontSize:10}}>{t.n}</span>}
              {t.dot && <span style={{width:6, height:6, borderRadius:3, background:'var(--primary)'}}/>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="scroll" style={{flex:1, padding:20, overflow:'auto'}}>
          {tab==='params' && (detail.params.length ? (
            <PlaygroundKVTable rows={detail.params}/>
          ) : (
            <EmptyHint text="Endpoint này không nhận query params."/>
          ))}

          {tab==='headers' && <PlaygroundKVTable rows={detail.headers}/>}

          {tab==='auth' && (
            <div>
              <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', marginBottom:8, letterSpacing:'.06em'}}>AUTH TYPE</div>
              <div style={{display:'flex', gap:8, marginBottom:16}}>
                {['Bearer token','API key','OAuth 2.0'].map((a,i)=>(
                  <button key={a} className="chip" style={{padding:'6px 12px', fontSize:11.5, background:i===0?'var(--pr-soft)':'white', border:'1px solid '+(i===0?'var(--primary)':borderCol), color:i===0?'var(--pr-dark-2)':'var(--label-02)', fontWeight:600, cursor:'pointer'}}>{a}</button>
                ))}
              </div>
              <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', marginBottom:6, letterSpacing:'.06em'}}>TOKEN</div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <code style={{flex:1, padding:'10px 12px', border:'1px solid '+borderCol, borderRadius:8, fontSize:12, fontFamily:'ui-monospace, monospace', background:'white'}}>ac_live_sk_8F2A···9B4C</code>
                <select style={{padding:'10px 12px', border:'1px solid '+borderCol, borderRadius:8, fontSize:12, fontFamily:'inherit', background:'white'}}>
                  <option>Production key</option>
                  <option>Staging key</option>
                  <option>Mobile backend</option>
                </select>
              </div>
              <div style={{marginTop:12, padding:10, background:'var(--pr-soft)', border:'1px solid var(--pr-light-2)', borderRadius:8, fontSize:11.5, color:'var(--pr-dark-2)', display:'flex', gap:8}}>
                <Icon.Shield style={{width:14, height:14, flexShrink:0, marginTop:1}}/>
                <div>Token chỉ hiển thị 4 ký tự cuối. Rotate key bất kỳ lúc nào ở <b>API & Webhooks</b>.</div>
              </div>
            </div>
          )}

          {tab==='body' && (detail.body ? (
            <div>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                <div style={{display:'flex', gap:6}}>
                  {['JSON','Form-data','x-www-form','Raw'].map((f,i)=>(
                    <button key={f} className="chip" style={{padding:'4px 10px', fontSize:11, background:i===0?'var(--pr-soft)':'transparent', border:'1px solid '+(i===0?'var(--primary)':borderCol), color:i===0?'var(--pr-dark-2)':'var(--label-02)', fontWeight:600, cursor:'pointer'}}>{f}</button>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{fontSize:11}}><Icon.Sparkles style={{width:12, height:12}}/> Claude generate</button>
              </div>
              <CodeBlock code={bodyJson} lang="json"/>
            </div>
          ) : (
            <EmptyHint text="Endpoint này (GET) không yêu cầu body."/>
          ))}
        </div>

        {/* Response panel */}
        <div style={{borderTop:'1px solid '+borderCol, background:'white', maxHeight:'42%', display:'flex', flexDirection:'column'}}>
          <div style={{padding:'10px 20px', borderBottom:'1px solid '+borderCol, display:'flex', alignItems:'center', gap:12}}>
            <div style={{fontWeight:700, fontSize:12}}>Response</div>
            {latency != null && (
              <>
                <span className="chip green" style={{fontSize:10.5, padding:'2px 8px'}}>✓ {detail.response.status} OK</span>
                <span style={{fontSize:11, color:'var(--label-02)'}}><Icon.Clock style={{width:11, height:11, marginRight:3, verticalAlign:-1}}/>{latency}ms</span>
                <span style={{fontSize:11, color:'var(--label-02)'}}>{respJson.length} bytes</span>
              </>
            )}
            {latency == null && !sending && (
              <span style={{fontSize:11, color:'var(--label-03)'}}>Chưa gửi request. Bấm <b>Send</b> để thử.</span>
            )}
            {sending && <span style={{fontSize:11, color:'var(--label-02)'}}>Đang chờ phản hồi từ server…</span>}
            <div style={{flex:1}}/>
            <button className="btn-icon" title="Copy response"><Icon.Copy/></button>
            <button className="btn-icon" title="Save as example"><Icon.Download/></button>
          </div>
          <div className="scroll" style={{flex:1, overflow:'auto', padding:16, background:'#0F1A14'}}>
            {latency != null ? (
              <CodeBlock code={respJson} lang="json" dark/>
            ) : (
              <div style={{color:'#4A5C52', fontFamily:'ui-monospace, monospace', fontSize:12, padding:'20px 0', textAlign:'center'}}>
                {sending ? '· · ·' : '// Response sẽ hiển thị tại đây'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: CODE SNIPPETS + HISTORY */}
      <div style={{borderLeft:'1px solid '+borderCol, background:'white', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{padding:'12px 16px', borderBottom:'1px solid '+borderCol}}>
          <div style={{fontSize:12, fontWeight:800, color:'var(--label-01)', marginBottom:8, display:'flex', alignItems:'center', gap:6}}>
            <Icon.Code style={{width:14, height:14, color:'var(--primary)'}}/>
            Code snippet
          </div>
          <div style={{display:'flex', gap:4}}>
            {[
              {k:'curl',   l:'cURL'},
              {k:'node',   l:'Node.js'},
              {k:'python', l:'Python'},
              {k:'php',    l:'PHP'},
            ].map(l => (
              <button key={l.k} onClick={()=>setLang(l.k)} style={{
                padding:'5px 10px', fontSize:11, border:'1px solid '+(lang===l.k?'var(--primary)':borderCol),
                background: lang===l.k?'var(--pr-soft)':'white', color: lang===l.k?'var(--pr-dark-2)':'var(--label-02)',
                borderRadius:6, cursor:'pointer', fontWeight:600, fontFamily:'inherit'
              }}>{l.l}</button>
            ))}
          </div>
        </div>
        <div style={{padding:14, background:'#0F1A14', flex:1, overflow:'auto'}}>
          <CodeBlock code={genSnippet()} lang={lang} dark/>
        </div>
        <div style={{padding:'8px 16px', borderTop:'1px solid '+borderCol, display:'flex', gap:8}}>
          <button className="btn btn-ghost btn-sm" style={{flex:1, justifyContent:'center'}}><Icon.Copy style={{width:12, height:12}}/> Copy</button>
          <button className="btn btn-ghost btn-sm" style={{flex:1, justifyContent:'center'}}><Icon.Download style={{width:12, height:12}}/> Download</button>
        </div>

        {/* History */}
        <div style={{borderTop:'1px solid '+borderCol, background:'var(--fill-01)', padding:'10px 16px 12px', maxHeight:220, overflow:'auto'}}>
          <div style={{fontSize:11, fontWeight:800, color:'var(--label-03)', letterSpacing:'.06em', marginBottom:6}}>LỊCH SỬ REQUEST</div>
          {[
            {t:'14:23', m:'POST', p:'/v1/messages',  s:201, ms:210},
            {t:'14:21', m:'GET',  p:'/v1/contacts',  s:200, ms:178},
            {t:'14:19', m:'POST', p:'/v1/ai/suggest',s:200, ms:410},
            {t:'14:15', m:'POST', p:'/v1/deals',     s:201, ms:256},
            {t:'14:12', m:'POST', p:'/v1/campaigns', s:422, ms:98},
          ].map((h,i)=>(
            <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'5px 0', fontSize:11, borderBottom: i<4?'1px dashed var(--fill-03)':'none'}}>
              <span style={{color:'var(--label-03)', fontFamily:'ui-monospace, monospace', width:32}}>{h.t}</span>
              <span style={{fontWeight:800, color: ({GET:'#3B82F6', POST:'#10B981'})[h.m] || '#64748B', width:40, fontFamily:'ui-monospace, monospace'}}>{h.m}</span>
              <code style={{flex:1, color:'var(--label-02)', fontSize:10.5, fontFamily:'ui-monospace, monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{h.p}</code>
              <span className={'chip ' + (h.s<400?'green':'red')} style={{fontSize:9.5, padding:'1px 6px', height:'auto'}}>{h.s}</span>
              <span style={{color:'var(--label-03)', fontSize:10}}>{h.ms}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaygroundKVTable({ rows }) {
  return (
    <div style={{border:'1px solid var(--fill-04)', borderRadius:8, overflow:'hidden', background:'white'}}>
      <div style={{display:'grid', gridTemplateColumns:'28px 1.2fr 2fr 80px', background:'var(--fill-01)', fontSize:10.5, fontWeight:700, color:'var(--label-03)', letterSpacing:'.06em', padding:'8px 0'}}>
        <div/>
        <div style={{paddingLeft:8}}>KEY</div>
        <div>VALUE</div>
        <div style={{textAlign:'center'}}>REQUIRED</div>
      </div>
      {rows.map((r,i)=>(
        <div key={i} style={{display:'grid', gridTemplateColumns:'28px 1.2fr 2fr 80px', alignItems:'center', padding:'10px 0', borderTop:'1px solid var(--fill-03)'}}>
          <div style={{display:'flex', justifyContent:'center'}}><input type="checkbox" defaultChecked/></div>
          <code style={{fontSize:12, fontFamily:'ui-monospace, monospace', paddingLeft:8, fontWeight:600, color:'var(--label-01)'}}>{r.k}</code>
          <input defaultValue={r.v} style={{padding:'6px 8px', border:'1px solid var(--fill-03)', borderRadius:6, fontSize:12, fontFamily:'ui-monospace, monospace', background:'var(--fill-01)', marginRight:10}}/>
          <div style={{textAlign:'center'}}>
            {r.required ? <span className="chip red" style={{fontSize:10, padding:'1px 7px'}}>required</span> : <span style={{fontSize:10, color:'var(--label-03)'}}>optional</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ code, lang, dark }) {
  const color = {
    key:    dark ? '#8AE0AC' : '#15803D',
    string: dark ? '#FCD34D' : '#B45309',
    number: dark ? '#93C5FD' : '#1D4ED8',
    punct:  dark ? '#64748B' : '#64748B',
    flag:   '#93C5FD',
    base:   dark ? '#E5E7EB' : '#0E1B13',
  };
  // Tokenize safely: swap strings for placeholders, colorize the rest, then restore.
  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const strings = [];
  const STR_MARK = (i) => '\u0000S' + i + '\u0000';
  let html = esc(code || '');
  // capture strings first: "..." or '...'
  html = html.replace(/("[^"\n]*"|'[^'\n]*')/g, (m) => {
    strings.push(`<span style="color:${color.string}">${m}</span>`);
    return STR_MARK(strings.length - 1);
  });

  if (lang === 'json') {
    // strings that are keys (followed by :) → recolor
    html = html.replace(/\u0000S(\d+)\u0000(\s*):/g, (m, i, sp) => {
      const raw = strings[+i].replace(/^<span[^>]*>|<\/span>$/g, '');
      return `<span style="color:${color.key}">${raw}</span>${sp}:`;
    });
    html = html.replace(/\b(-?\d+(\.\d+)?)\b/g, `<span style="color:${color.number}">$1</span>`);
    html = html.replace(/([{}\[\],])/g, `<span style="color:${color.punct}">$1</span>`);
  } else if (lang === 'curl') {
    html = html.replace(/^(curl)/gm, `<span style="color:${color.key}">$1</span>`);
    html = html.replace(/(\s)(-[a-zA-Z])\b/g, `$1<span style="color:${color.flag}">$2</span>`);
  } else if (lang === 'python') {
    html = html.replace(/\b(from|import|def|return|print|client)\b/g, `<span style="color:${color.key}">$1</span>`);
  } else if (lang === 'node') {
    html = html.replace(/\b(import|from|const|await|async)\b/g, `<span style="color:${color.key}">$1</span>`);
  } else if (lang === 'php') {
    html = html.replace(/\$(\w+)/g, `<span style="color:${color.flag}">$$$1</span>`);
    html = html.replace(/\b(curl_init|curl_setopt|curl_exec)\b/g, `<span style="color:${color.key}">$1</span>`);
  }

  // restore strings
  html = html.replace(/\u0000S(\d+)\u0000/g, (m, i) => strings[+i]);

  return <pre style={{margin:0, padding:0, fontSize:12, lineHeight:1.6, fontFamily:'ui-monospace, monospace', color:color.base, whiteSpace:'pre-wrap', wordBreak:'break-word'}}
    dangerouslySetInnerHTML={{__html: html}}/>;
}

function EmptyHint({ text }) {
  return (
    <div style={{padding:'40px 20px', textAlign:'center', color:'var(--label-03)', fontSize:12}}>
      <Icon.Terminal style={{width:24, height:24, opacity:.4, marginBottom:8}}/>
      <div>{text}</div>
    </div>
  );
}

/* DEVELOPER */
function PageDeveloper() {
  return (
    <>
      <Section title="Developer settings">
        <Card>
          <Row label="Sandbox mode" hint="Gửi test message không ra khách thật"><SToggle on={false}/></Row>
          <Row label="Verbose logging"><SToggle on={false}/></Row>
          <Row label="Allow CORS origins" hint="Danh sách domain được gọi API"><Input value="https://mediasoft.vn, https://admin.mediasoft.vn" style={{width:'100%'}}/></Row>
          <Row label="API version" hint="Bản API hiện đang dùng"><select style={selectS}><option>v1 (latest)</option><option>v0 (deprecated)</option></select></Row>
        </Card>
      </Section>
      <Section title="SDK & Tài liệu">
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
          {['JavaScript / TypeScript','Python','PHP','Go','Java','cURL + Postman'].map(s=>(
            <div key={s} className="card" style={{padding:14, display:'flex', alignItems:'center', gap:10}}>
              <Icon.Code style={{width:20, height:20, color:'var(--primary)'}}/>
              <div style={{flex:1, fontSize:12.5, fontWeight:600}}>{s}</div>
              <button className="btn btn-ghost btn-sm">Tải SDK →</button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* SECURITY */
function PageSecurity() {
  return (
    <>
      <Section title="Xác thực">
        <Card>
          <Row label="Bắt buộc 2FA cho tất cả thành viên" hint="Sử dụng TOTP (Authenticator) hoặc SMS"><SToggle on/></Row>
          <Row label="Cho phép đăng nhập bằng mật khẩu"><SToggle on/></Row>
          <Row label="Thời gian hết hạn mật khẩu"><select style={selectS}><option>90 ngày</option><option>60 ngày</option><option>Không đổi</option></select></Row>
          <Row label="Độ phức tạp mật khẩu"><select style={selectS}><option>Mạnh (≥12 ký tự, hỗn hợp)</option><option>Trung bình (≥8)</option></select></Row>
          <Row label="Khoá sau N lần sai"><Input value="5"/></Row>
        </Card>
      </Section>

      <Section title="Session">
        <Card>
          <Row label="Hết hạn session sau"><select style={selectS}><option>8 giờ</option><option>1 ngày</option><option>7 ngày</option><option>30 ngày</option></select></Row>
          <Row label="Logout khi đổi IP"><SToggle on={false}/></Row>
          <Row label="Buộc logout toàn bộ session khác khi đổi mật khẩu"><SToggle on/></Row>
        </Card>
      </Section>

      <Section title="IP allowlist" subtitle="Chỉ IP trong danh sách được truy cập admin panel">
        <Card>
          <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:12}}>
            {['118.70.12.0/24 · Văn phòng HCM','14.241.55.87 · Hà Nội branch','203.113.165.0/24 · VPN'].map(ip=>(
              <span key={ip} className="chip" style={{background:'var(--fill-04)', fontSize:11, padding:'4px 10px'}}><Icon.Shield style={{width:10, height:10, marginRight:4}}/> {ip} ×</span>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm"><Icon.Plus/> Thêm IP / CIDR</button>
        </Card>
      </Section>
    </>
  );
}

/* SSO */
function PageSSO() {
  return (
    <>
      <Section title="Single Sign-On (SSO)" subtitle="Đồng nhất đăng nhập với IdP của bạn">
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
          {[
            {n:'Google Workspace', c:true},
            {n:'Microsoft Entra ID', c:false},
            {n:'Okta', c:false},
            {n:'SAML 2.0', c:false},
            {n:'OpenID Connect', c:false},
            {n:'LDAP / Active Directory', c:false},
          ].map(p=>(
            <Card key={p.n} style={{padding:14, border: p.c?'2px solid var(--primary)':'1px solid var(--fill-04)', background: p.c?'var(--bg-green)':'white'}}>
              <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>{p.n}</div>
              <div style={{fontSize:11, color:'var(--label-03)', marginBottom:10}}>{p.c?'Đang kết nối':'Chưa cấu hình'}</div>
              <button className={p.c?'btn btn-ghost btn-sm':'btn btn-primary btn-sm'} style={{width:'100%'}}>{p.c?'Cấu hình':'Kết nối'}</button>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="2FA / MFA">
        <Card>
          <Row label="Authenticator App (TOTP)" hint="Google Authenticator, Authy, 1Password"><SToggle on/></Row>
          <Row label="SMS OTP"><SToggle on/></Row>
          <Row label="Email OTP"><SToggle on={false}/></Row>
          <Row label="Security key (FIDO2 / YubiKey)"><SToggle on/></Row>
          <Row label="Backup codes" hint="10 mã dự phòng"><button className="btn btn-ghost btn-sm">Tạo lại</button></Row>
        </Card>
      </Section>
    </>
  );
}

/* AUDIT */
function PageAudit() {
  const logs = [
    {t:'14:32', u:'Lan (Admin)', a:'Cập nhật workflow "Chào Zalo"', ip:'118.70.12.45'},
    {t:'14:18', u:'Trâm (Phụ trách)', a:'Mời user hoang@mediasoft.vn',   ip:'118.70.12.44'},
    {t:'13:55', u:'System', a:'Rotate API key Production', ip:'—'},
    {t:'13:22', u:'Minh (Sales)', a:'Xuất CSV 240 contacts', ip:'14.241.55.87'},
    {t:'12:40', u:'Claude AI', a:'Escalate thread #8230 → Lan', ip:'—'},
    {t:'12:15', u:'Lan (Admin)', a:'Thay đổi role Sales Agent', ip:'118.70.12.45'},
    {t:'11:50', u:'Trâm (Phụ trách)', a:'Kết nối kênh TikTok Shop MediaSoft Official', ip:'118.70.12.44'},
  ];
  return (
    <Section title="Audit log" subtitle="Mọi hành động trong workspace · lưu 1 năm" right={<div style={{display:'flex', gap:6}}><button className="btn btn-ghost btn-sm"><Icon.Filter/> Lọc</button><button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất JSON</button></div>}>
      <Card padding={0}>
        <div style={{display:'grid', gridTemplateColumns:'80px 1.5fr 2.5fr 1fr 60px', gap:12, padding:'12px 20px', background:'var(--fill-02)', fontSize:11, fontWeight:700, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid var(--fill-04)'}}>
          <div>Giờ</div><div>Actor</div><div>Hành động</div><div>IP</div><div></div>
        </div>
        {logs.map((l,i)=>(
          <div key={i} style={{display:'grid', gridTemplateColumns:'80px 1.5fr 2.5fr 1fr 60px', gap:12, padding:'12px 20px', alignItems:'center', borderBottom:i<logs.length-1?'1px solid var(--fill-03)':'none', fontSize:12.5}}>
            <div style={{fontFamily:'monospace', color:'var(--label-02)'}}>{l.t}</div>
            <div style={{fontWeight:600}}>{l.u}</div>
            <div style={{color:'var(--label-02)'}}>{l.a}</div>
            <div style={{fontFamily:'monospace', fontSize:11, color:'var(--label-03)'}}>{l.ip}</div>
            <button className="btn-icon"><Icon.ArrowRight/></button>
          </div>
        ))}
      </Card>
    </Section>
  );
}

/* COMPLIANCE */
function PageCompliance() {
  return (
    <>
      <Section title="Data residency & retention">
        <Card>
          <Row label="Vị trí lưu dữ liệu chính"><select style={selectS}><option>Singapore (AWS ap-southeast-1)</option><option>Vietnam (on-premise)</option><option>Tokyo</option></select></Row>
          <Row label="Backup region"><select style={selectS}><option>Tokyo (ap-northeast-1)</option></select></Row>
          <Row label="Thời gian lưu hội thoại"><select style={selectS}><option>5 năm</option><option>2 năm</option><option>1 năm</option><option>Vĩnh viễn</option></select></Row>
          <Row label="Thời gian lưu log AI"><select style={selectS}><option>90 ngày</option><option>30 ngày</option></select></Row>
        </Card>
      </Section>

      <Section title="Tuân thủ">
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
          {[
            {n:'Luật An ninh mạng VN', s:'ok'},
            {n:'Nghị định 13 / PDPA',  s:'ok'},
            {n:'GDPR (EU)',            s:'ok'},
            {n:'ISO 27001',            s:'ok'},
            {n:'ISO/IEC 42001 (AI)',   s:'warn'},
            {n:'SOC 2 Type II',        s:'ok'},
          ].map(c=>(
            <Card key={c.n} style={{padding:14}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:32, height:32, borderRadius:8, background: c.s==='ok'?'var(--bg-green)':'#FEF3C7', display:'grid', placeItems:'center'}}>
                  {c.s==='ok' ? <Icon.Check style={{width:16, height:16, color:'var(--primary)'}}/> : <Icon.AlertTri style={{width:16, height:16, color:'#D97706'}}/>}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.n}</div>
                  <div style={{fontSize:11, color: c.s==='ok'?'var(--primary)':'#D97706'}}>{c.s==='ok'?'Đã tuân thủ':'Cần bổ sung'}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Quyền của chủ thể dữ liệu (DSR)">
        <Card>
          <Row label="Tự động xử lý yêu cầu xem dữ liệu" hint="Nghị định 13 — trong 72h"><SToggle on/></Row>
          <Row label="Tự động xử lý yêu cầu xoá (right to be forgotten)"><SToggle on/></Row>
          <Row label="Email liên hệ DPO"><Input value="dpo@mediasoft.vn"/></Row>
          <Row label="Xuất gói dữ liệu"><button className="btn btn-ghost btn-sm">Xuất toàn bộ dữ liệu workspace</button></Row>
        </Card>
      </Section>
    </>
  );
}

/* NOTIFICATIONS */
function PageNotifs() {
  const cats = [
    {g:'Tin nhắn', items:[
      {l:'Tin mới được gán cho tôi', d:true, e:true, m:true},
      {l:'Mention tôi trong hội thoại', d:true, e:true, m:true},
      {l:'Tin từ VIP / khách ưu tiên', d:true, e:true, m:true},
      {l:'SLA sắp vi phạm', d:true, e:false, m:true},
    ]},
    {g:'AI', items:[
      {l:'AI cần duyệt trước khi gửi', d:true, e:false, m:false},
      {l:'AI escalate sang người', d:true, e:true, m:true},
      {l:'AI vượt ngân sách token', d:false, e:true, m:false},
    ]},
    {g:'Hệ thống', items:[
      {l:'Kênh bị ngắt kết nối', d:true, e:true, m:true},
      {l:'Workflow chạy lỗi', d:false, e:true, m:false},
      {l:'Billing — hoá đơn mới', d:false, e:true, m:false},
    ]},
  ];
  return (
    <Section title="Thông báo" subtitle="Chọn kênh nhận thông báo cho từng loại sự kiện">
      <Card padding={0}>
        <div style={{display:'grid', gridTemplateColumns:'2.5fr 80px 80px 80px', gap:12, padding:'12px 20px', background:'var(--fill-02)', fontSize:11, fontWeight:700, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:'.04em', borderBottom:'1px solid var(--fill-04)'}}>
          <div>Sự kiện</div>
          <div style={{textAlign:'center'}}>Desktop</div>
          <div style={{textAlign:'center'}}>Email</div>
          <div style={{textAlign:'center'}}>Mobile</div>
        </div>
        {cats.map(c=>(
          <React.Fragment key={c.g}>
            <div style={{padding:'10px 20px', background:'#FAFBFB', fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:'.04em'}}>{c.g}</div>
            {c.items.map((it,i)=>(
              <div key={it.l} style={{display:'grid', gridTemplateColumns:'2.5fr 80px 80px 80px', gap:12, padding:'12px 20px', alignItems:'center', borderBottom:'1px solid var(--fill-03)'}}>
                <div style={{fontSize:13}}>{it.l}</div>
                <div style={{display:'flex', justifyContent:'center'}}><SToggle on={it.d}/></div>
                <div style={{display:'flex', justifyContent:'center'}}><SToggle on={it.e}/></div>
                <div style={{display:'flex', justifyContent:'center'}}><SToggle on={it.m}/></div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </Card>
    </Section>
  );
}

/* BILLING */
function PageBilling() {
  return (
    <>
      <Card style={{marginBottom:16, background:'linear-gradient(135deg, #0F172A, #1E293B)', color:'white', padding:24}}>
        <div style={{fontSize:11, opacity:.7, letterSpacing:'.08em', marginBottom:6}}>GÓI HIỆN TẠI</div>
        <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:10}}>
          <div style={{fontSize:32, fontWeight:800}}>AppChat</div>
          <div className="ai-gradient-text" style={{fontSize:32, fontWeight:800}}>Ultimate</div>
        </div>
        <div style={{fontSize:13, opacity:.85, marginBottom:20}}>10 modules · Unlimited channels · Claude Coworks · Priority support · 99.9% SLA</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:20}}>
          <div><div style={{opacity:.7, fontSize:11}}>SEATS</div><div style={{fontSize:20, fontWeight:800}}>12 / 15</div><div style={{height:4, borderRadius:2, background:'rgba(255,255,255,.2)', marginTop:6, overflow:'hidden'}}><div style={{height:'100%', width:'80%', background:'var(--primary)'}}/></div></div>
          <div><div style={{opacity:.7, fontSize:11}}>AI CREDITS</div><div style={{fontSize:20, fontWeight:800}}>48.2K / 100K</div><div style={{height:4, borderRadius:2, background:'rgba(255,255,255,.2)', marginTop:6, overflow:'hidden'}}><div style={{height:'100%', width:'48%', background:'var(--primary)'}}/></div></div>
          <div><div style={{opacity:.7, fontSize:11}}>CONTACTS</div><div style={{fontSize:20, fontWeight:800}}>8.4K / ∞</div></div>
          <div><div style={{opacity:.7, fontSize:11}}>GIÁ / THÁNG</div><div style={{fontSize:20, fontWeight:800}}>7.500.000₫</div><div style={{opacity:.7, fontSize:11, marginTop:2}}>Gia hạn 20/12</div></div>
        </div>
      </Card>

      <Section title="So sánh gói">
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
          {[
            {n:'Starter',    p:'1.5M₫', d:'3 user · 3 kênh', cta:'Downgrade'},
            {n:'Growth',     p:'3.9M₫', d:'8 user · 5 kênh · AI Co-pilot', cta:'Downgrade'},
            {n:'Ultimate',   p:'7.5M₫', d:'15 user · Unlimited · Claude Coworks', cta:'Đang dùng', active:true},
            {n:'Enterprise', p:'Liên hệ', d:'SSO · SLA 99.99 · On-premise', cta:'Liên hệ Sales'},
          ].map(p=>(
            <Card key={p.n} style={{padding:18, border: p.active?'2px solid var(--primary)':'1px solid var(--fill-04)'}}>
              <div style={{fontWeight:700, fontSize:15, marginBottom:4}}>{p.n}</div>
              <div style={{fontSize:22, fontWeight:800, color:'var(--primary)', marginBottom:6}}>{p.p}<span style={{fontSize:11, color:'var(--label-03)', fontWeight:500}}>/tháng</span></div>
              <div style={{fontSize:12, color:'var(--label-02)', marginBottom:14, lineHeight:1.5, minHeight:40}}>{p.d}</div>
              <button className={p.active?'btn btn-ghost btn-sm':'btn btn-ghost btn-sm'} style={{width:'100%', ...(p.active && {background:'var(--bg-green)', color:'var(--pr-dark-2)'})}}>{p.cta}</button>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Phương thức thanh toán" right={<button className="btn btn-ghost btn-sm"><Icon.Plus/> Thêm</button>}>
        <Card padding={0}>
          {[
            {t:'Visa · ••••4281', d:'Hết hạn 09/28', def:true},
            {t:'Chuyển khoản — Vietcombank', d:'Tài khoản công ty', def:false},
          ].map((p,i,a)=>(
            <div key={p.t} style={{display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, padding:'14px 20px', alignItems:'center', borderBottom:i<a.length-1?'1px solid var(--fill-03)':'none'}}>
              <Icon.CreditCard style={{width:20, height:20, color:'var(--primary)'}}/>
              <div>
                <div style={{fontSize:13, fontWeight:700}}>{p.t}</div>
                <div style={{fontSize:11, color:'var(--label-03)'}}>{p.d}</div>
              </div>
              {p.def && <span className="chip green" style={{fontSize:10}}>Mặc định</span>}
              <button className="btn-icon"><Icon.More/></button>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Hoá đơn">
        <Card padding={0}>
          {['20/03/2026','20/02/2026','20/01/2026','20/12/2025','20/11/2025'].map((d,i,a)=>(
            <div key={d} style={{display:'grid', gridTemplateColumns:'auto 1fr auto auto auto auto', gap:14, padding:'14px 20px', alignItems:'center', borderBottom:i<a.length-1?'1px solid var(--fill-03)':'none', fontSize:13}}>
              <Icon.FileText style={{width:16, height:16, color:'var(--label-02)'}}/>
              <div>
                <div style={{fontWeight:600}}>INV-2026-{100-i}</div>
                <div style={{fontSize:11, color:'var(--label-03)'}}>Kỳ thanh toán · {d}</div>
              </div>
              <div style={{color:'var(--label-02)'}}>7.500.000₫</div>
              <span className="chip green" style={{fontSize:10}}>Đã thanh toán</span>
              <button className="btn-icon"><Icon.Eye/></button>
              <button className="btn-icon"><Icon.Download/></button>
            </div>
          ))}
        </Card>
      </Section>
    </>
  );
}

/* USAGE */
function PageUsage() {
  const bars = [42, 68, 55, 82, 71, 95, 88, 76, 62, 48, 55, 72];
  return (
    <>
      <Section title="Sử dụng tháng này" subtitle="1-30/03/2026">
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16}}>
          {[
            {l:'Tin nhắn xử lý', v:'48.2K', p:'+12% vs T2'},
            {l:'AI token used', v:'2.4M', p:'$128.40'},
            {l:'Sourcing API calls', v:'1,240', p:'trong hạn mức'},
            {l:'SMS/ZNS sent', v:'8,900', p:'890.000₫'},
          ].map(s=>(
            <Card key={s.l} style={{padding:16}}>
              <div style={{fontSize:11, color:'var(--label-03)'}}>{s.l}</div>
              <div style={{fontSize:22, fontWeight:800, marginTop:4}}>{s.v}</div>
              <div style={{fontSize:11, color:'var(--primary)', marginTop:2}}>{s.p}</div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Biểu đồ 12 tháng">
        <Card>
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height:180, padding:'0 6px'}}>
            {bars.map((h,i)=>(
              <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                <div style={{width:'100%', height:h+'%', background: i===11?'var(--primary)':'var(--fill-05)', borderRadius:'6px 6px 2px 2px', minHeight:8}}/>
                <div style={{fontSize:10, color:'var(--label-03)'}}>T{(i+4)%12 || 12}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </>
  );
}

/* PLACEHOLDER */
function SettingsPlaceholder() {
  return (
    <Card>
      <div style={{textAlign:'center', padding:'40px 20px', color:'var(--label-03)'}}>
        <Icon.Settings style={{width:28, height:28, margin:'0 auto 10px', opacity:.4}}/>
        <div>Trang này đang được phát triển</div>
      </div>
    </Card>
  );
}

const selectS = {height:32, padding:'0 10px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', minWidth:180};

const SETTINGS_PAGES = {
  general:        PageGeneral,
  branding:       PageBranding,
  hours:          PageHours,
  locale:         PageLocale,
  members:        PageMembers,
  roles:          PageRoles,
  teams:          PageTeams,
  channels:       PageKênh,
  web_widget:     PageWebWidget,
  contacts_fields:PageFields,
  tags:           PageThẻ,
  replies:        PageReplies,
  ai_models:      PageAIModels,
  ai_agents:      PageAIAgents,
  ai_gov:         PageAIGov,
  ai_audit:       PageAIAudit,
  automation:     PageAutomation,
  routing:        PageRouting,
  integrations:   PageIntegrations,
  api:            PageAPI,
  playground:     PagePlayground,
  developer:      PageDeveloper,
  security:       PageSecurity,
  sso:            PageSSO,
  audit:          PageAudit,
  compliance:     PageCompliance,
  notifications:  PageNotifs,
  billing:        PageBilling,
  usage:          PageUsage,
};

window.SettingsModule = SettingsModule;
