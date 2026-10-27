// Auth screens — Login / Register / Forgot password
const { useState: useStA } = React;

function AuthShell({ children, side }) {
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'1fr 1fr', height:'100vh', background:'white',
    }}>
      {/* Form side */}
      <div style={{ display:'flex', flexDirection:'column', padding:'40px 60px', overflowY:'auto' }}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom: 48}}>
          <img src={window.__resources && window.__resources.symbol} style={{width:36, height:36}}/>
          <div style={{fontWeight:800, fontSize:22, letterSpacing:-0.5}}>
            App<span style={{color:'var(--primary)'}}>Chat</span>
            <span style={{marginLeft:8, fontSize:10, padding:'2px 6px', background:'var(--bg-green)', color:'var(--pr-dark-2)', borderRadius:4, fontWeight:700, verticalAlign:'middle'}}>ULTIMATE</span>
          </div>
        </div>
        <div style={{maxWidth:420, width:'100%', margin:'auto 0'}}>
          {children}
        </div>
        <div style={{display:'flex', gap:16, fontSize:11.5, color:'var(--label-03)', marginTop:40}}>
          <span>© 2026 MediaSoft Vietnam</span>
          <a style={{color:'var(--label-03)', textDecoration:'none'}}>Điều khoản</a>
          <a style={{color:'var(--label-03)', textDecoration:'none'}}>Bảo mật</a>
          <span style={{marginLeft:'auto'}}>🇻🇳 Tiếng Việt ▾</span>
        </div>
      </div>

      {/* Brand side */}
      <div style={{
        position:'relative', overflow:'hidden',
        background: 'linear-gradient(135deg, #0F5D30 0%, #1F9C4F 45%, #2B9EF3 100%)',
        color:'white', padding:'56px 60px', display:'flex', flexDirection:'column',
      }}>
        {/* Decorative orbs */}
        <div style={{position:'absolute', top:-120, right:-120, width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,.12), transparent 70%)'}}/>
        <div style={{position:'absolute', bottom:-160, left:-80, width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle, rgba(43,158,243,.4), transparent 70%)'}}/>
        {/* Grid pattern */}
        <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', opacity:.08}}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>

        {side}
      </div>
    </div>
  );
}

function BrandShowcase() {
  return (
    <div style={{position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%'}}>
      <div style={{fontSize:11, letterSpacing:'.2em', opacity:.85, fontWeight:700, marginBottom:24}}>
        NỀN TẢNG AI AGENTS · DOANH NGHIỆP MỘT NGƯỜI · MAKE IN VIETNAM
      </div>
      <div style={{fontSize:44, fontWeight:800, lineHeight:1.1, letterSpacing:-1, marginBottom:16}}>
        Doanh nghiệp<br/>Một Người<br/>→ <span style={{background:'linear-gradient(90deg, #fff, #BCEDCC)', WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent'}}>vận hành bằng AI.</span>
      </div>
      <div style={{fontSize:15, opacity:.88, lineHeight:1.6, maxWidth:420, marginBottom:40}}>
        Giúp mỗi người xây dựng, vận hành và phát triển doanh nghiệp bằng AI. Đội ngũ AI Agents quản trị trọn vòng đời khách hàng — Marketing → Sales → Service → Success — trên một hệ thống.
      </div>

      {/* Product mockup floating card */}
      <div style={{
        background:'rgba(255,255,255,.08)', backdropFilter:'blur(12px)',
        border:'1px solid rgba(255,255,255,.18)', borderRadius:16, padding:18, marginBottom:24,
        boxShadow:'0 20px 60px rgba(0,0,0,.25)'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
          <div style={{width:34, height:34, borderRadius:'50%', background:'#58D28A', display:'grid', placeItems:'center', fontWeight:800}}>CL</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:13}}>Chị Lan — Shop Bé Na</div>
            <div style={{fontSize:11, opacity:.75}}>qua Zalo OA · 2 giây trước</div>
          </div>
          <span style={{fontSize:10, padding:'3px 6px', background:'rgba(255,255,255,.15)', borderRadius:6}}>#VIP</span>
        </div>
        <div style={{background:'rgba(255,255,255,.1)', padding:'10px 12px', borderRadius:'4px 14px 14px 14px', fontSize:13, marginBottom:10}}>
          Mẫu váy họa tiết size 3–5 còn không shop ơi?
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center', fontSize:11.5, background:'rgba(45,197,106,.2)', border:'1px solid rgba(188,237,204,.5)', padding:'8px 10px', borderRadius:10}}>
          <div style={{width:16, height:16, borderRadius:4, background:'white', display:'grid', placeItems:'center', color:'var(--primary)', fontSize:10, fontWeight:900}}>AI</div>
          <span>Claude Cowork đã soạn reply · còn 47 cái size 3–5 · ship 4h</span>
        </div>
      </div>

      <div style={{marginTop:'auto', display:'flex', gap:24, fontSize:12}}>
        <div>
          <div style={{fontSize:24, fontWeight:800}}>12K+</div>
          <div style={{opacity:.8}}>Doanh nghiệp tin dùng</div>
        </div>
        <div>
          <div style={{fontSize:24, fontWeight:800}}>68%</div>
          <div style={{opacity:.8}}>Hội thoại AI tự xử</div>
        </div>
        <div>
          <div style={{fontSize:24, fontWeight:800}}>42s</div>
          <div style={{opacity:.8}}>Phản hồi TB</div>
        </div>
      </div>
    </div>
  );
}

function AuthField({label, type='text', placeholder, icon, right, value, onChange, hint}) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5, fontWeight:600, marginBottom:6, color:'var(--label-01)'}}>
        <span>{label}</span>
        {hint && <span style={{color:'var(--label-03)', fontWeight:400}}>{hint}</span>}
      </div>
      <div style={{position:'relative'}}>
        {icon && <span style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--label-03)'}}>{React.cloneElement(icon, {style:{width:16, height:16}})}</span>}
        <input type={type} placeholder={placeholder} value={value||''} onChange={e=>onChange&&onChange(e.target.value)}
          style={{
            width:'100%', height:44, borderRadius:10, border:'1px solid var(--fill-04)',
            background:'var(--fill-02)', padding: icon?'0 40px 0 40px':'0 14px', fontSize:14, outline:'none',
            transition:'all .15s'
          }}
          onFocus={e=>{e.target.style.background='white'; e.target.style.borderColor='var(--primary)'; e.target.style.boxShadow='0 0 0 3px var(--bg-green)'}}
          onBlur={e=>{e.target.style.background='var(--fill-02)'; e.target.style.borderColor='var(--fill-04)'; e.target.style.boxShadow='none'}}
        />
        {right && <span style={{position:'absolute', right:12, top:'50%', transform:'translateY(-50%)'}}>{right}</span>}
      </div>
    </div>
  );
}

function SocialBtn({brand, label}) {
  const colors = {
    google: {bg:'white', border:'var(--fill-04)', color:'var(--label-01)'},
    zalo: {bg:'#0068FF', border:'#0068FF', color:'white'},
    apple: {bg:'#000', border:'#000', color:'white'},
  };
  const c = colors[brand];
  const icons = {
    google: (<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.35 11.1H12v3.18h5.59c-.56 2.67-2.82 4.12-5.59 4.12-3.36 0-6.09-2.73-6.09-6.09S8.64 6.22 12 6.22c1.51 0 2.88.55 3.95 1.46l2.37-2.37C16.9 3.95 14.59 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.18 0 8.68-3.64 8.68-8.77 0-.41-.04-.81-.11-1.13z"/></svg>),
    zalo: <span style={{fontWeight:800, fontSize:14}}>Z</span>,
    apple: (<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.7 17.5c-.3.7-.7 1.4-1.1 2-.7.9-1.2 1.5-1.6 1.8-.6.5-1.2.7-1.9.8-.5 0-1.1-.1-1.7-.4-.7-.3-1.3-.4-1.8-.4-.6 0-1.2.1-1.9.4-.7.3-1.2.4-1.7.5-.7 0-1.3-.2-1.9-.7-.4-.3-1-.9-1.6-1.9-.7-1-1.3-2.2-1.8-3.5-.5-1.5-.7-2.9-.7-4.2 0-1.6.3-2.9 1-4 .5-.9 1.2-1.6 2-2.1.9-.5 1.8-.7 2.8-.8.6 0 1.3.2 2.1.5.8.3 1.4.5 1.6.5.2 0 .8-.2 1.9-.6 1-.3 1.9-.5 2.6-.4 2 .2 3.5 1 4.4 2.4-1.8 1.1-2.7 2.6-2.7 4.6 0 1.5.6 2.8 1.7 3.8.5.5 1.1.8 1.7 1.1-.1.4-.3.8-.5 1.2zM14.2 2.2c0 1.1-.4 2.2-1.2 3.1-1 1.1-2.2 1.8-3.5 1.7 0-.1 0-.2 0-.4 0-1.1.5-2.2 1.3-3.1.4-.4.9-.8 1.5-1.1.6-.3 1.2-.4 1.7-.5.1.2.2.4.2.3z"/></svg>),
  };
  return (
    <button style={{
      flex:1, height:42, border:'1px solid '+c.border, background:c.bg, color:c.color,
      borderRadius:10, fontWeight:600, fontSize:13, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer'
    }}>
      {icons[brand]} {label}
    </button>
  );
}

function LoginScreen({go, onLogin}) {
  const [email, setEmail] = useStA('tramnt@appchat.vn');
  const [pwd, setPwd] = useStA('');
  const [show, setShow] = useStA(false);
  const [remember, setRemember] = useStA(true);
  return (
    <AuthShell side={<BrandShowcase/>}>
      <div style={{fontSize:32, fontWeight:800, letterSpacing:-0.8, marginBottom:6}}>Chào mừng trở lại 👋</div>
      <div style={{color:'var(--label-02)', marginBottom:28, fontSize:14}}>
        Đăng nhập vào Workspace để vận hành doanh nghiệp của bạn bằng AI.
      </div>

      <div style={{display:'flex', gap:8, marginBottom:20}}>
        <SocialBtn brand="google" label="Google"/>
        <SocialBtn brand="zalo" label="Zalo"/>
        <SocialBtn brand="apple" label="Apple"/>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:10, margin:'20px 0', color:'var(--label-03)', fontSize:11.5}}>
        <div style={{flex:1, height:1, background:'var(--fill-04)'}}/>
        HOẶC ĐĂNG NHẬP BẰNG EMAIL
        <div style={{flex:1, height:1, background:'var(--fill-04)'}}/>
      </div>

      <AuthField label="Email công ty" placeholder="ban@congty.vn" icon={<Icon.Mail/>} value={email} onChange={setEmail}/>
      <AuthField label="Mật khẩu" type={show?'text':'password'} placeholder="••••••••••"
        icon={<Icon.Key/>} value={pwd} onChange={setPwd}
        hint={<a onClick={()=>go('forgot')} style={{color:'var(--primary)', cursor:'pointer', textDecoration:'none'}}>Quên mật khẩu?</a>}
        right={<button onClick={()=>setShow(!show)} className="btn-icon"><Icon.Eye/></button>}
      />

      <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, marginBottom:20, cursor:'pointer'}}>
        <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{accentColor:'var(--primary)', width:16, height:16}}/>
        Ghi nhớ đăng nhập trong 30 ngày
      </label>

      <button onClick={onLogin} style={{
        width:'100%', height:46, background:'var(--primary)', color:'white', border:'none', borderRadius:10,
        fontWeight:700, fontSize:14.5, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
        boxShadow:'0 4px 14px rgba(45,197,106,.35)'
      }}>
        Đăng nhập vào Workspace <Icon.ChevronRight style={{width:16, height:16}}/>
      </button>

      <div style={{textAlign:'center', fontSize:13, color:'var(--label-02)', marginTop:22}}>
        Chưa có tài khoản? <a onClick={()=>go('register')} style={{color:'var(--primary)', fontWeight:600, cursor:'pointer', textDecoration:'none'}}>Đăng ký dùng thử 14 ngày</a>
      </div>

      <div style={{marginTop:28, padding:12, background:'var(--bg-green)', border:'1px solid rgba(45,197,106,.2)', borderRadius:10, display:'flex', gap:10, fontSize:12, color:'var(--pr-dark-3)'}}>
        <Icon.Shield style={{width:18, height:18, color:'var(--pr-dark-1)', flexShrink:0, marginTop:1}}/>
        <div>
          <b>Enterprise security.</b> SSO / SAML · 2FA · Role-based access · Audit log — chuẩn dành cho doanh nghiệp Việt Nam.
        </div>
      </div>
    </AuthShell>
  );
}

function RegisterScreen({go, onLogin}) {
  const [step, setStep] = useStA(1);
  return (
    <AuthShell side={<BrandShowcase/>}>
      {/* Step indicator */}
      <div style={{display:'flex', gap:8, marginBottom:24, fontSize:12, fontWeight:600, color:'var(--label-02)'}}>
        {[{n:1, l:'Tài khoản'},{n:2, l:'Workspace'},{n:3, l:'Bắt đầu'}].map(s => (
          <div key={s.n} style={{display:'flex', alignItems:'center', gap:6}}>
            <div style={{
              width:22, height:22, borderRadius:11, display:'grid', placeItems:'center', fontSize:11, fontWeight:800,
              background: step>=s.n ? 'var(--primary)' : 'var(--fill-03)',
              color: step>=s.n ? 'white' : 'var(--label-03)',
            }}>{step>s.n ? '✓' : s.n}</div>
            <span style={{color: step>=s.n ? 'var(--label-01)' : 'var(--label-03)'}}>{s.l}</span>
            {s.n<3 && <div style={{width:24, height:1, background:'var(--fill-04)', marginLeft:4}}/>}
          </div>
        ))}
      </div>

      <div style={{fontSize:28, fontWeight:800, letterSpacing:-0.6, marginBottom:6}}>
        {step===1 && 'Tạo tài khoản miễn phí'}
        {step===2 && 'Thiết lập Workspace'}
        {step===3 && 'Kết nối kênh đầu tiên'}
      </div>
      <div style={{color:'var(--label-02)', marginBottom:24, fontSize:13.5}}>
        {step===1 && 'Dùng thử 14 ngày · không cần thẻ · đầy đủ tính năng Ultimate'}
        {step===2 && 'Đặt tên workspace cho tổ chức của bạn'}
        {step===3 && 'Kết nối một kênh để nhận tin nhắn ngay'}
      </div>

      {step===1 && <>
        <div style={{display:'flex', gap:8, marginBottom:16}}>
          <SocialBtn brand="google" label="Đăng ký với Google"/>
          <SocialBtn brand="zalo" label="Zalo"/>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10, margin:'16px 0', color:'var(--label-03)', fontSize:11}}>
          <div style={{flex:1, height:1, background:'var(--fill-04)'}}/>HOẶC<div style={{flex:1, height:1, background:'var(--fill-04)'}}/>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <AuthField label="Họ" placeholder="Nguyễn" icon={<Icon.Users/>}/>
          <AuthField label="Tên" placeholder="Thùy Trâm"/>
        </div>
        <AuthField label="Email công ty" placeholder="ban@congty.vn" icon={<Icon.Mail/>}/>
        <AuthField label="Số điện thoại" placeholder="0907 711 888" icon={<Icon.Phone/>} hint="Dùng cho OTP"/>
        <AuthField label="Mật khẩu" type="password" placeholder="Tối thiểu 8 ký tự" icon={<Icon.Key/>}/>
        <div style={{display:'flex', gap:4, marginTop:-8, marginBottom:16}}>
          {[1,1,1,0].map((f,i) => <div key={i} style={{flex:1, height:4, borderRadius:2, background: f ? (i<2?'var(--warning)':'var(--primary)') : 'var(--fill-04)'}}/>)}
        </div>
        <label style={{display:'flex', gap:8, fontSize:12.5, marginBottom:20, lineHeight:1.5}}>
          <input type="checkbox" defaultChecked style={{accentColor:'var(--primary)', width:16, height:16, marginTop:2}}/>
          <span>Tôi đồng ý với <a style={{color:'var(--primary)'}}>Điều khoản dịch vụ</a> và <a style={{color:'var(--primary)'}}>Chính sách bảo mật</a> của AppChat.</span>
        </label>
        <button onClick={()=>setStep(2)} style={{width:'100%', height:46, background:'var(--primary)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14.5, cursor:'pointer', boxShadow:'0 4px 14px rgba(45,197,106,.35)'}}>
          Tiếp tục
        </button>
      </>}

      {step===2 && <>
        <AuthField label="Tên workspace / công ty" placeholder="VD: MediaSoft Vietnam" icon={<Icon.Grid/>}/>
        <AuthField label="URL workspace" placeholder="ten-cong-ty" icon={<Icon.Link/>} hint=".appchat.vn"/>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12.5, fontWeight:600, marginBottom:8}}>Quy mô tổ chức</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6}}>
            {['1-5','6-30','31-100','100+'].map((s,i) => (
              <button key={s} style={{
                height:44, borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
                border:'1px solid '+(i===1?'var(--primary)':'var(--fill-04)'),
                background: i===1?'var(--bg-green)':'white', color: i===1?'var(--pr-dark-2)':'var(--label-01)'
              }}>{s} người</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12.5, fontWeight:600, marginBottom:8}}>Lĩnh vực kinh doanh</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            {['Thời trang','F&B','Mỹ phẩm','Mẹ & bé','Điện tử','Nội thất','Dịch vụ','Khác'].map((s,i) => (
              <button key={s} style={{
                padding:'8px 14px', borderRadius:20, fontSize:12.5, fontWeight:600, cursor:'pointer',
                border:'1px solid '+(i===3?'var(--primary)':'var(--fill-04)'),
                background: i===3?'var(--bg-green)':'white', color: i===3?'var(--pr-dark-2)':'var(--label-01)'
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={()=>setStep(1)} className="btn btn-ghost" style={{flex:1, height:46}}>Quay lại</button>
          <button onClick={()=>setStep(3)} style={{flex:2, height:46, background:'var(--primary)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14.5, cursor:'pointer'}}>
            Tiếp tục
          </button>
        </div>
      </>}

      {step===3 && <>
        <div style={{fontSize:12.5, fontWeight:600, marginBottom:10}}>Chọn 1 kênh để bắt đầu (có thể kết nối thêm sau)</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20}}>
          {[
            {ch:'zalo', l:'Zalo OA', s:'Phổ biến nhất VN', p:true},
            {ch:'facebook', l:'Facebook Page', s:'Messenger inbox'},
            {ch:'tiktok', l:'TikTok Shop', s:'Đơn từ live + video'},
            {ch:'shopee', l:'Shopee', s:'Chat từ sàn'},
            {ch:'web', l:'Livechat website', s:'Nhúng vào web'},
            {ch:'whatsapp', l:'WhatsApp Kinh doanh', s:'Khách quốc tế'},
          ].map(c => (
            <button key={c.ch} style={{
              padding:14, borderRadius:12, border:'1px solid '+(c.p?'var(--primary)':'var(--fill-04)'),
              background: c.p?'var(--bg-green)':'white', textAlign:'left', cursor:'pointer', position:'relative'
            }}>
              {c.p && <span style={{position:'absolute', top:8, right:8, fontSize:9, background:'var(--primary)', color:'white', padding:'2px 5px', borderRadius:3, fontWeight:700}}>TOP</span>}
              <ChannelBadge name={c.ch} size={28}/>
              <div style={{fontWeight:700, fontSize:13, marginTop:8}}>{c.l}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>{c.s}</div>
            </button>
          ))}
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={()=>setStep(2)} className="btn btn-ghost" style={{flex:1, height:46}}>Quay lại</button>
          <button onClick={onLogin} style={{flex:2, height:46, background:'var(--primary)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14.5, cursor:'pointer', boxShadow:'0 4px 14px rgba(45,197,106,.35)'}}>
            Vào Workspace →
          </button>
        </div>
        <div style={{textAlign:'center', marginTop:16, fontSize:12, color:'var(--label-02)'}}>
          <a style={{color:'var(--primary)', cursor:'pointer'}}>Bỏ qua và kết nối sau</a>
        </div>
      </>}

      <div style={{textAlign:'center', fontSize:13, color:'var(--label-02)', marginTop:step===1?22:16}}>
        Đã có tài khoản? <a onClick={()=>go('login')} style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>Đăng nhập</a>
      </div>
    </AuthShell>
  );
}

function ForgotScreen({go}) {
  const [sent, setSent] = useStA(false);
  return (
    <AuthShell side={<BrandShowcase/>}>
      <button onClick={()=>go('login')} className="btn btn-ghost btn-sm" style={{marginBottom:20, alignSelf:'flex-start'}}>← Quay lại</button>
      {!sent ? <>
        <div style={{width:56, height:56, borderRadius:14, background:'var(--bg-green)', display:'grid', placeItems:'center', marginBottom:16}}>
          <Icon.Key style={{width:28, height:28, color:'var(--primary)'}}/>
        </div>
        <div style={{fontSize:28, fontWeight:800, letterSpacing:-0.6, marginBottom:6}}>Quên mật khẩu?</div>
        <div style={{color:'var(--label-02)', marginBottom:24, fontSize:13.5}}>
          Nhập email công ty. Chúng tôi sẽ gửi link đặt lại mật khẩu trong vòng 30 giây.
        </div>
        <AuthField label="Email công ty" placeholder="ban@congty.vn" icon={<Icon.Mail/>}/>
        <button onClick={()=>setSent(true)} style={{width:'100%', height:46, background:'var(--primary)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14.5, cursor:'pointer'}}>
          Gửi link đặt lại
        </button>
      </> : <>
        <div style={{width:56, height:56, borderRadius:14, background:'var(--bg-green)', display:'grid', placeItems:'center', marginBottom:16}}>
          <Icon.Check style={{width:32, height:32, color:'var(--primary)'}}/>
        </div>
        <div style={{fontSize:28, fontWeight:800, letterSpacing:-0.6, marginBottom:6}}>Đã gửi email</div>
        <div style={{color:'var(--label-02)', marginBottom:24, fontSize:13.5, lineHeight:1.6}}>
          Kiểm tra hộp thư <b style={{color:'var(--label-01)'}}>tramnt@appchat.vn</b> và bấm vào link để đặt lại mật khẩu. Link có hiệu lực 15 phút.
        </div>
        <button onClick={()=>go('login')} style={{width:'100%', height:46, background:'var(--primary)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14.5, cursor:'pointer'}}>
          Về đăng nhập
        </button>
        <div style={{textAlign:'center', fontSize:12.5, color:'var(--label-02)', marginTop:16}}>
          Không thấy email? <a style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>Gửi lại</a> hoặc <a style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>đổi email</a>
        </div>
      </>}
    </AuthShell>
  );
}

function AuthRouter({onLogin}) {
  const [screen, setScreen] = useStA('login');
  if (screen === 'register') return <RegisterScreen go={setScreen} onLogin={onLogin}/>;
  if (screen === 'forgot') return <ForgotScreen go={setScreen}/>;
  return <LoginScreen go={setScreen} onLogin={onLogin}/>;
}

window.AuthRouter = AuthRouter;
