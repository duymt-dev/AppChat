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
          <img src="assets/symbol.png" style={{width:36, height:36}}/>
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
        Conversation<br/>→ Data<br/>→ <span style={{background:'linear-gradient(90deg, #fff, #BCEDCC)', WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent'}}>Revenue.</span>
      </div>
      <div style={{fontSize:15, opacity:.88, lineHeight:1.6, maxWidth:420, marginBottom:40}}>
        Hợp nhất Zalo, Facebook, TikTok, Shopee và 12+ kênh khác trong một màn hình. Claude Cowork giúp bạn trả lời nhanh hơn 3× và chốt đơn ngay trong khung chat.
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
    zalo: {bg:'#0068FF', border:'#0068FF', color:'white'},
    google: {bg:'white', border:'var(--fill-04)', color:'var(--label-01)'},
    facebook: {bg:'#1877F2', border:'#1877F2', color:'white'},
  };
  const c = colors[brand];
  const icons = {
    zalo: <span style={{fontWeight:800, fontSize:14}}>Z</span>,
    google: (<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.35 11.1H12v3.18h5.59c-.56 2.67-2.82 4.12-5.59 4.12-3.36 0-6.09-2.73-6.09-6.09S8.64 6.22 12 6.22c1.51 0 2.88.55 3.95 1.46l2.37-2.37C16.9 3.95 14.59 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.18 0 8.68-3.64 8.68-8.77 0-.41-.04-.81-.11-1.13z"/></svg>),
    facebook: (<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z"/></svg>),
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
        Đăng nhập vào Workspace để tiếp tục điều hành hội thoại đa kênh của bạn.
      </div>

      <div style={{display:'flex', gap:8, marginBottom:20}}>
        <SocialBtn brand="zalo" label="Zalo"/>
        <SocialBtn brand="google" label="Google"/>
        <SocialBtn brand="facebook" label="Facebook"/>
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

function OtpBoxes({len=6, value, onChange}) {
  const refs = React.useRef([]);
  const setAt = (i, raw) => {
    const v = (raw||'').replace(/\D/g,'').slice(-1);
    const arr = value.padEnd(len,' ').split('');
    arr[i] = v || ' ';
    const next = arr.join('').replace(/ /g,'').slice(0,len);
    // rebuild preserving positions
    const positioned = arr.join('').replace(/ /g,'');
    onChange(arr.join('').replace(/\s+$/,'').replace(/ /g,'').slice(0,len) || next || positioned);
    if (v && i < len-1 && refs.current[i+1]) refs.current[i+1].focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i>0 && refs.current[i-1]) refs.current[i-1].focus();
  };
  return (
    <div style={{display:'flex', gap:8, marginBottom:14}}>
      {Array.from({length:len}).map((_,i)=>(
        <input key={i} ref={el=>refs.current[i]=el} value={value[i]||''} inputMode="numeric" maxLength={1}
          onChange={e=>setAt(i, e.target.value)} onKeyDown={e=>onKey(i,e)}
          style={{
            flex:1, height:54, textAlign:'center', fontSize:22, fontWeight:800, borderRadius:12, minWidth:0, padding:0,
            border:'1.5px solid '+(value[i]?'var(--primary)':'var(--fill-04)'),
            background: value[i] ? 'white':'var(--fill-02)', color:'var(--label-01)', outline:'none', transition:'all .12s'
          }}
          onFocus={e=>{e.target.style.borderColor='var(--primary)'; e.target.style.boxShadow='0 0 0 3px var(--bg-green)'}}
          onBlur={e=>{e.target.style.boxShadow='none'; if(!value[i]) e.target.style.borderColor='var(--fill-04)'}}
        />
      ))}
    </div>
  );
}

function RegisterScreen({go, onLogin}) {
  const [step, setStep] = useStA(1);
  const [phone, setPhone] = useStA('0907 711 888');
  const [otp, setOtp] = useStA('');
  const [atype, setAtype] = useStA('dn'); // dn = doanh nghiệp · cn = cá nhân
  const [orgName, setOrgName] = useStA('');
  const [industry, setIndustry] = useStA(0);
  const [idVal, setIdVal] = useStA('');
  const [resend, setResend] = useStA(48);

  React.useEffect(() => {
    if (step !== 2) return;
    setResend(48);
    const t = setInterval(() => setResend(r => r>0 ? r-1 : 0), 1000);
    return () => clearInterval(t);
  }, [step]);

  const cta = {width:'100%', height:48, background:'var(--primary)', color:'white', border:'none', borderRadius:10,
    fontWeight:700, fontSize:14.5, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    boxShadow:'0 4px 14px rgba(45,197,106,.35)'};
  const skip = {textAlign:'center', marginTop:14, fontSize:12.5};
  const skipA = {color:'var(--label-02)', cursor:'pointer', fontWeight:600, textDecoration:'underline', textDecorationStyle:'dotted'};

  const otpDigits = otp.replace(/\D/g,'');
  const idDigits = idVal.replace(/\D/g,'');
  const idOk = atype==='dn' ? idDigits.length>=10 : idDigits.length>=12;
  const Back = ({to}) => (
    <button onClick={()=>setStep(to)} className="btn btn-ghost btn-sm" style={{marginBottom:18, alignSelf:'flex-start'}}>← Quay lại</button>
  );

  return (
    <AuthShell side={<BrandShowcase/>}>
      {/* progress */}
      <div style={{display:'flex', gap:5, marginBottom:8}}>
        {[1,2,3,4,5].map(i => <div key={i} style={{flex:1, height:5, borderRadius:3, background: step>=i ? 'var(--primary)':'var(--fill-04)', transition:'background .2s'}}/>)}
      </div>
      <div style={{fontSize:11, fontWeight:700, letterSpacing:'.06em', color:'var(--label-03)', marginBottom:18}}>
        BƯỚC {step}/5 · {['SỐ ĐIỆN THOẠI','XÁC THỰC OTP','XÁC NHẬN','THÔNG TIN DOANH NGHIỆP','ĐỊNH DANH PHÁP LÝ'][step-1]}
      </div>

      {/* STEP 1 — phone */}
      {step===1 && <>
        <div style={{fontSize:30, fontWeight:800, letterSpacing:-0.7, marginBottom:6}}>Đăng ký bằng số Zalo</div>
        <div style={{color:'var(--label-02)', marginBottom:24, fontSize:13.5, lineHeight:1.55}}>
          Nhập số điện thoại đang dùng Zalo — nhận mã OTP, không cần mật khẩu. Dùng thử 14 ngày, không cần thẻ.
        </div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12.5, fontWeight:600, marginBottom:6, color:'var(--label-01)'}}>
            Số điện thoại <span style={{color:'var(--label-03)', fontWeight:400}}>· dùng Zalo</span>
          </div>
          <div style={{display:'flex', gap:8}}>
            <div style={{height:48, display:'flex', alignItems:'center', gap:6, padding:'0 13px', borderRadius:10, border:'1px solid var(--fill-04)', background:'var(--fill-02)', fontWeight:700, fontSize:14, whiteSpace:'nowrap'}}>🇻🇳 +84</div>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="90 771 1888"
              style={{flex:1, height:48, borderRadius:10, border:'1px solid var(--fill-04)', background:'var(--fill-02)', padding:'0 14px', fontSize:15, fontWeight:600, outline:'none', transition:'all .15s'}}
              onFocus={e=>{e.target.style.background='white'; e.target.style.borderColor='var(--primary)'; e.target.style.boxShadow='0 0 0 3px var(--bg-green)'}}
              onBlur={e=>{e.target.style.background='var(--fill-02)'; e.target.style.borderColor='var(--fill-04)'; e.target.style.boxShadow='none'}}
            />
          </div>
        </div>
        <button onClick={()=>setStep(2)} style={{...cta, whiteSpace:'nowrap'}}>
          <span style={{width:20, height:20, borderRadius:6, background:'#0068FF', color:'white', display:'grid', placeItems:'center', fontWeight:800, fontSize:12}}>Z</span>
          Nhận mã OTP qua Zalo
        </button>

        <div style={{display:'flex', alignItems:'center', gap:10, margin:'20px 0', color:'var(--label-03)', fontSize:11.5}}>
          <div style={{flex:1, height:1, background:'var(--fill-04)'}}/>HOẶC ĐĂNG KÝ 1 CHẠM<div style={{flex:1, height:1, background:'var(--fill-04)'}}/>
        </div>
        <div style={{display:'flex', gap:8}}>
          <SocialBtn brand="zalo" label="Zalo"/>
          <SocialBtn brand="google" label="Google"/>
          <SocialBtn brand="facebook" label="Facebook"/>
        </div>

        <div style={{display:'flex', gap:18, justifyContent:'center', marginTop:18, fontSize:11.5, color:'var(--label-02)', fontWeight:600}}>
          <span style={{display:'inline-flex', gap:5, alignItems:'center', color:'var(--pr-dark-1)'}}><Icon.Check style={{width:14, height:14}}/> Miễn phí 14 ngày</span>
          <span style={{display:'inline-flex', gap:5, alignItems:'center', color:'var(--pr-dark-1)'}}><Icon.Check style={{width:14, height:14}}/> Không cần thẻ</span>
        </div>

        <div style={{textAlign:'center', fontSize:13, color:'var(--label-02)', marginTop:22}}>
          Đã có tài khoản? <a onClick={()=>go('login')} style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>Đăng nhập</a>
        </div>
      </>}

      {/* STEP 2 — OTP */}
      {step===2 && <>
        <Back to={1}/>
        <div style={{fontSize:28, fontWeight:800, letterSpacing:-0.6, marginBottom:6}}>Nhập mã xác thực</div>
        <div style={{color:'var(--label-02)', marginBottom:22, fontSize:13.5, lineHeight:1.55}}>
          Mã gồm 6 số đã gửi tới Zalo <b style={{color:'var(--label-01)'}}>+84 {phone}</b>.
        </div>
        <OtpBoxes value={otp} onChange={setOtp}/>
        <div style={{fontSize:12.5, color:'var(--label-02)', marginBottom:20}}>
          {resend>0
            ? <>Không nhận được mã? Gửi lại sau <b style={{color:'var(--label-01)'}}>0:{String(resend).padStart(2,'0')}</b></>
            : <>Không nhận được mã? <a onClick={()=>setResend(48)} style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>Gửi lại mã</a></>}
          {' · '}<a onClick={()=>setStep(1)} style={{color:'var(--primary)', fontWeight:600, cursor:'pointer'}}>Đổi số</a>
        </div>
        <button onClick={()=> otpDigits.length>=6 && setStep(3)} disabled={otpDigits.length<6}
          style={{...cta, opacity: otpDigits.length<6 ? 0.5 : 1, cursor: otpDigits.length<6 ? 'not-allowed':'pointer', boxShadow: otpDigits.length<6 ? 'none' : cta.boxShadow}}>
          Xác nhận <Icon.ChevronRight style={{width:16, height:16}}/>
        </button>
      </>}

      {/* STEP 3 — confirm */}
      {step===3 && <>
        <div style={{width:60, height:60, borderRadius:16, background:'var(--bg-green)', border:'1px solid rgba(45,197,106,.25)', display:'grid', placeItems:'center', marginBottom:16}}>
          <Icon.Check style={{width:34, height:34, color:'var(--primary)'}}/>
        </div>
        <div style={{fontSize:28, fontWeight:800, letterSpacing:-0.6, marginBottom:6}}>Đã xác thực số điện thoại</div>
        <div style={{color:'var(--label-02)', marginBottom:20, fontSize:13.5, lineHeight:1.55}}>
          Tài khoản của bạn đã được tạo. Hoàn tất hồ sơ để bắt đầu sử dụng Workspace.
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12, padding:13, border:'1px solid var(--fill-04)', borderRadius:12, background:'var(--fill-02)', marginBottom:18}}>
          <div style={{width:40, height:40, borderRadius:'50%', background:'#0068FF', color:'white', display:'grid', placeItems:'center', fontWeight:800, fontSize:15}}>T</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:14}}>Thùy Trâm</div>
            <div style={{fontSize:12, color:'var(--label-02)'}}>+84 {phone} · qua Zalo</div>
          </div>
          <span className="chip green"><span className="dot"></span> Đã xác thực</span>
        </div>
        <button onClick={()=>setStep(4)} style={cta}>Tiếp tục khai báo <Icon.ChevronRight style={{width:16, height:16}}/></button>
        <div style={skip}><a onClick={onLogin} style={skipA}>Vào app, hoàn tất sau</a></div>
      </>}

      {/* STEP 4 — business info */}
      {step===4 && <>
        <Back to={3}/>
        <div style={{fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:6}}>Thông tin doanh nghiệp</div>
        <div style={{color:'var(--label-02)', marginBottom:20, fontSize:13.5}}>Giúp cá nhân hoá Workspace và phục vụ xuất hoá đơn.</div>

        <div style={{display:'flex', gap:8, marginBottom:18}}>
          {[
            {k:'dn', l:'Doanh nghiệp', s:'Có mã số thuế'},
            {k:'cn', l:'Cá nhân / Hộ KD', s:'Dùng VNeID'},
          ].map(o => (
            <button key={o.k} onClick={()=>setAtype(o.k)} style={{
              flex:1, padding:'12px 10px', borderRadius:12, textAlign:'left', cursor:'pointer',
              border:'1px solid '+(atype===o.k?'var(--primary)':'var(--fill-04)'),
              background: atype===o.k?'var(--bg-green)':'white'
            }}>
              <div style={{fontWeight:700, fontSize:13.5, color: atype===o.k?'var(--pr-dark-2)':'var(--label-01)'}}>{o.l}</div>
              <div style={{fontSize:11.5, color:'var(--label-02)'}}>{o.s}</div>
            </button>
          ))}
        </div>

        <AuthField label={atype==='dn'?'Tên công ty':'Tên hộ kinh doanh'} placeholder={atype==='dn'?'VD: Công ty TNHH MediaSoft VN':'VD: Shop Bé Na'} icon={<Icon.Grid/>} value={orgName} onChange={setOrgName}/>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:12.5, fontWeight:600, marginBottom:8}}>Lĩnh vực kinh doanh</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            {['Thời trang','F&B','Mỹ phẩm','Mẹ & bé','Điện tử','Nội thất','Dịch vụ','Khác'].map((s,i) => (
              <button key={s} onClick={()=>setIndustry(i)} style={{
                padding:'8px 14px', borderRadius:20, fontSize:12.5, fontWeight:600, cursor:'pointer',
                border:'1px solid '+(industry===i?'var(--primary)':'var(--fill-04)'),
                background: industry===i?'var(--bg-green)':'white', color: industry===i?'var(--pr-dark-2)':'var(--label-01)'
              }}>{s}</button>
            ))}
          </div>
        </div>
        <button onClick={()=>setStep(5)} style={cta}>Tiếp tục <Icon.ChevronRight style={{width:16, height:16}}/></button>
        <div style={skip}><a onClick={onLogin} style={skipA}>Vào app, hoàn tất sau</a></div>
      </>}

      {/* STEP 5 — legal identity */}
      {step===5 && <>
        <Back to={4}/>
        <div style={{marginBottom:12}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:7, fontSize:10.5, fontWeight:800, letterSpacing:'.04em', color:'white', background: atype==='dn'?'var(--pr-dark-2)':'#C0392B', borderRadius:6, padding:'4px 9px', whiteSpace:'nowrap'}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'white'}}></span>
          {atype==='dn' ? 'TRA CỨU TỔNG CỤC THUẾ' : 'XÁC THỰC VNeID'}
        </span>
        </div>
        <div style={{fontSize:26, fontWeight:800, letterSpacing:-0.5, marginBottom:6}}>
          {atype==='dn' ? 'Mã số thuế doanh nghiệp' : 'Mã định danh cá nhân'}
        </div>
        <div style={{color:'var(--label-02)', marginBottom:20, fontSize:13.5, lineHeight:1.55}}>
          {atype==='dn'
            ? 'Để xuất hoá đơn VAT và xác minh doanh nghiệp. Hệ thống tự tra cứu và điền tên, địa chỉ công ty.'
            : 'Xác minh chủ tài khoản qua VNeID — tuân thủ Nghị định 13 về bảo vệ dữ liệu cá nhân.'}
        </div>
        <AuthField
          label={atype==='dn' ? 'Mã số thuế doanh nghiệp' : 'Mã định danh cá nhân (VNeID)'}
          hint={atype==='dn' ? '10–13 số' : '12 số'}
          placeholder={atype==='dn' ? '0312 345 678' : '001 099 012 345'}
          icon={atype==='dn' ? <Icon.FileText/> : <Icon.Shield/>}
          value={idVal} onChange={setIdVal}
        />
        {atype==='cn' && !idOk &&
          <button className="btn btn-ghost" style={{width:'100%', height:44, marginBottom:14, fontWeight:600}}>
            <Icon.Smartphone style={{width:16, height:16}}/> Quét QR trên ứng dụng VNeID
          </button>}

        {idOk &&
          <div style={{display:'flex', gap:10, padding:'12px 13px', border:'1px solid rgba(45,197,106,.3)', background:'var(--bg-green)', borderRadius:12, marginBottom:16}}>
            <Icon.Check style={{width:18, height:18, color:'var(--primary)', flexShrink:0, marginTop:1}}/>
            <div style={{fontSize:12.5, color:'var(--pr-dark-3)', lineHeight:1.45}}>
              {atype==='dn'
                ? <><b style={{color:'var(--label-01)'}}>Công ty TNHH MediaSoft VN</b><br/>123 Nguyễn Huệ, Q1, TP.HCM · Mã số thuế hợp lệ ✓</>
                : <><b style={{color:'var(--label-01)'}}>Nguyễn Thùy Trâm</b><br/>Định danh VNeID đã đối chiếu ✓ · Hộ kinh doanh</>}
            </div>
          </div>}

        <button onClick={onLogin} style={cta}>Hoàn tất &amp; vào Workspace <Icon.ArrowRight style={{width:16, height:16}}/></button>
        <div style={skip}><a onClick={onLogin} style={skipA}>Vào app, hoàn tất sau</a></div>
      </>}
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
