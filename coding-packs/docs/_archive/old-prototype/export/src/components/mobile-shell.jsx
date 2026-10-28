// Mobile Shell (PWA companion) — 5 screens in iOS frame, swipable
const SCREENS = [
  { k:'login', l:'Login' },
  { k:'inbox', l:'Inbox' },
  { k:'chat', l:'Hội thoại' },
  { k:'contact', l:'Liên hệ' },
  { k:'notif', l:'Thông báo' },
];

function MobileShell({ onClose }) {
  const [idx, setIdx] = React.useState(1); // start on inbox
  const [device, setDevice] = React.useState('iphone'); // iphone | android
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i-1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(SCREENS.length-1, i+1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,30,22,.86)',zIndex:9000,display:'flex',flexDirection:'column',backdropFilter:'blur(12px)'}}>
      {/* topbar */}
      <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 22px',color:'#fff',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,fontWeight:700,fontSize:14}}>
          <Icon.Smartphone width="18" height="18"/>
          AppChat Mobile · PWA Shell
          <span style={{padding:'2px 8px',background:'#FF8A4C',color:'#fff',fontSize:10,fontWeight:800,borderRadius:999,letterSpacing:'.06em'}}>SPRINT 24 · BETA</span>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:4,padding:3,background:'rgba(255,255,255,.08)',borderRadius:8,fontSize:12}}>
          {['iphone','android'].map(d => (
            <button key={d} onClick={()=>setDevice(d)} style={{padding:'6px 14px',borderRadius:6,border:'none',cursor:'pointer',background:device===d?'#fff':'transparent',color:device===d?'#0F5D30':'rgba(255,255,255,.7)',fontWeight:600,textTransform:'capitalize'}}>{d==='iphone'?'iOS':'Android'}</button>
          ))}
        </div>
        <button onClick={onClose} style={{padding:'8px 14px',background:'transparent',border:'1px solid rgba(255,255,255,.2)',color:'#fff',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:12}}>Đóng (Esc)</button>
      </div>

      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:48,position:'relative',overflow:'hidden'}}>
        {/* prev */}
        <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0} style={{position:'absolute',left:60,top:'50%',transform:'translateY(-50%)',width:56,height:56,borderRadius:'50%',background:idx===0?'rgba(255,255,255,.05)':'rgba(255,255,255,.12)',border:'none',color:'#fff',cursor:idx===0?'default':'pointer',fontSize:22,opacity:idx===0?.3:1}}>‹</button>

        {/* device */}
        <Phone device={device} screen={SCREENS[idx].k} idx={idx} setIdx={setIdx}/>

        {/* next */}
        <button onClick={()=>setIdx(i=>Math.min(SCREENS.length-1,i+1))} disabled={idx===SCREENS.length-1} style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)',width:56,height:56,borderRadius:'50%',background:idx===SCREENS.length-1?'rgba(255,255,255,.05)':'rgba(255,255,255,.12)',border:'none',color:'#fff',cursor:idx===SCREENS.length-1?'default':'pointer',fontSize:22,opacity:idx===SCREENS.length-1?.3:1}}>›</button>

        {/* notes side */}
        <div style={{maxWidth:340,color:'rgba(255,255,255,.85)',fontSize:13,lineHeight:1.6}}>
          <div style={{fontSize:11,letterSpacing:'.08em',textTransform:'uppercase',color:'#8AE0AC',marginBottom:8,fontWeight:700}}>Màn {idx+1} / {SCREENS.length}</div>
          <div style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:14}}>{SCREEN_DESC[SCREENS[idx].k].title}</div>
          <p style={{margin:'0 0 16px'}}>{SCREEN_DESC[SCREENS[idx].k].desc}</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {SCREEN_DESC[SCREENS[idx].k].bullets.map((b,i)=>(
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#2DC56A',marginTop:7,flexShrink:0}}/>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* bottom screen picker */}
      <div style={{display:'flex',justifyContent:'center',gap:10,padding:'18px 22px',borderTop:'1px solid rgba(255,255,255,.08)'}}>
        {SCREENS.map((s,i)=>(
          <button key={s.k} onClick={()=>setIdx(i)} style={{padding:'8px 16px',borderRadius:999,border:'1px solid '+(i===idx?'#2DC56A':'rgba(255,255,255,.15)'),background:i===idx?'rgba(45,197,106,.18)':'transparent',color:i===idx?'#fff':'rgba(255,255,255,.65)',fontWeight:600,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:18,height:18,borderRadius:5,background:i===idx?'#2DC56A':'rgba(255,255,255,.1)',color:i===idx?'#fff':'rgba(255,255,255,.5)',display:'grid',placeItems:'center',fontSize:10,fontWeight:800}}>{i+1}</span>
            {s.l}
          </button>
        ))}
      </div>
    </div>
  );
}

const SCREEN_DESC = {
  login: {
    title: 'Đăng nhập một chạm',
    desc: 'Sign-in luồng SSO MediaSoft + sinh trắc học (Face ID / vân tay). Auto-fill OTP qua SMS, cookie 30 ngày.',
    bullets: ['SSO MediaSoft Workspace', 'Face ID / Touch ID lần kế tiếp', 'OTP fallback qua Zalo / SMS', 'Quên mật khẩu → magic link email']
  },
  inbox: {
    title: 'Hộp thư hợp nhất',
    desc: 'Đồng bộ realtime với inbox desktop. Filter nhanh theo kênh, badge unread, swipe left để gán hoặc archive.',
    bullets: ['12 kênh trong 1 inbox', 'Swipe gán cho thành viên', 'Pull-to-refresh nhịp nhàng 60fps', 'Badge tự đồng bộ với hệ thống']
  },
  chat: {
    title: 'Hội thoại realtime',
    desc: 'Bong bóng chat đúng phong cách Zalo/Messenger, đính kèm media, voice note, gợi ý phản hồi của Claude inline.',
    bullets: ['Gợi ý 3 reply từ Claude Haiku', 'Voice note nén Opus 32kbps', 'Quick template (Z/M/E/SMS)', 'Reactions emoji cảm xúc']
  },
  contact: {
    title: 'Hồ sơ 360° rút gọn',
    desc: 'Card khách hàng đầy đủ thông tin, lịch sử mua, deal đang chạy, sourcing đang theo. Tap để gọi/nhắn.',
    bullets: ['Lifetime Value & RFM tag', 'Deal đang mở · Order gần nhất', 'Quick action: Call / Note / Tag', 'Lịch sử tương tác 90 ngày']
  },
  notif: {
    title: 'Thông báo & Push',
    desc: 'Push qua APNs / FCM, group theo loại sự kiện, snooze 1h / tới sáng / 1 ngày, deeplink mở đúng màn.',
    bullets: ['4 nhóm: Tin nhắn · Deal · Order · Hệ thống', 'Snooze nhanh / Mute kênh', 'Deeplink mở app desktop', 'Lịch sử 30 ngày, search nội dung']
  }
};

// ──── Phone frame ────
function Phone({ device, screen, idx, setIdx }) {
  const isIos = device === 'iphone';
  return (
    <div style={{position:'relative',width:340,height:720,borderRadius:isIos?54:38,background:'#0a0a0a',padding:isIos?12:8,boxShadow:'0 50px 100px -20px rgba(0,0,0,.6), 0 30px 60px -30px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.08)',transition:'all .3s'}}>
      {/* side btns */}
      {isIos && (
        <>
          <div style={{position:'absolute',left:-2,top:120,width:3,height:32,background:'#222',borderRadius:'2px 0 0 2px'}}/>
          <div style={{position:'absolute',left:-2,top:170,width:3,height:64,background:'#222',borderRadius:'2px 0 0 2px'}}/>
          <div style={{position:'absolute',left:-2,top:250,width:3,height:64,background:'#222',borderRadius:'2px 0 0 2px'}}/>
          <div style={{position:'absolute',right:-2,top:200,width:3,height:96,background:'#222',borderRadius:'0 2px 2px 0'}}/>
        </>
      )}
      <div style={{width:'100%',height:'100%',background:'#fff',borderRadius:isIos?42:30,overflow:'hidden',position:'relative',display:'flex',flexDirection:'column'}}>
        {/* status bar */}
        <StatusBar isIos={isIos} dark={screen==='login'}/>
        {/* dynamic island for iOS */}
        {isIos && <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',width:110,height:32,background:'#000',borderRadius:18,zIndex:10}}/>}

        {/* screen */}
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          {screen==='login' && <LoginScreen/>}
          {screen==='inbox' && <InboxScreen onOpenChat={()=>setIdx(2)}/>}
          {screen==='chat' && <ChatScreen onBack={()=>setIdx(1)} onContact={()=>setIdx(3)}/>}
          {screen==='contact' && <ContactScreen onBack={()=>setIdx(2)}/>}
          {screen==='notif' && <NotifScreen/>}
        </div>

        {/* home indicator */}
        {isIos && <div style={{height:30,display:'flex',justifyContent:'center',alignItems:'flex-end',paddingBottom:8,background:screen==='chat'?'#fff':'transparent'}}><div style={{width:130,height:5,background:'#000',borderRadius:3,opacity:.85}}/></div>}
        {!isIos && (
          <div style={{height:46,display:'flex',justifyContent:'space-around',alignItems:'center',background:'#fff',borderTop:'1px solid #f0f0f0'}}>
            <div style={{width:14,height:14,border:'1.5px solid #555',borderRadius:3,transform:'rotate(45deg)'}}/>
            <div style={{width:14,height:14,border:'1.5px solid #555',borderRadius:'50%'}}/>
            <div style={{width:0,height:0,borderLeft:'7px solid transparent',borderRight:'7px solid transparent',borderRight:'12px solid #555',borderTop:'7px solid transparent',borderBottom:'7px solid transparent'}}/>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBar({ isIos, dark }) {
  const color = dark ? '#fff' : '#000';
  return (
    <div style={{height:isIos?54:34,padding:isIos?'18px 28px 0':'10px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,fontWeight:600,color,flexShrink:0}}>
      <span>{isIos?'9:41':'09:41'}</span>
      <div style={{display:'flex',gap:5,alignItems:'center'}}>
        <span style={{display:'flex',gap:1.5,alignItems:'flex-end'}}>
          {[3,5,7,9].map(h=><span key={h} style={{width:3,height:h,background:color,borderRadius:1}}/>)}
        </span>
        <svg width="14" height="10" viewBox="0 0 16 12" fill="none"><path d="M8 10.5a2 2 0 0 1 2-2c.6 0 1.1.2 1.5.6L8 12l-3.5-2.9c.4-.4 1-.6 1.5-.6 .8 0 1.5.4 2 1Zm-4-3a4 4 0 0 1 4-1.5 4 4 0 0 1 4 1.5l-1.5 1.2a3 3 0 0 0-2.5-1 3 3 0 0 0-2.5 1L4 7.5Zm-3-3A8 8 0 0 1 8 2a8 8 0 0 1 7 2.5L13.5 6A6 6 0 0 0 8 4 6 6 0 0 0 2.5 6L1 4.5Z" fill={color}/></svg>
        <span style={{width:24,height:11,border:'1px solid '+color,borderRadius:3,padding:1,position:'relative'}}>
          <span style={{display:'block',width:'80%',height:'100%',background:color,borderRadius:1}}/>
          <span style={{position:'absolute',right:-2.5,top:3,width:1.5,height:5,background:color,borderRadius:1}}/>
        </span>
      </div>
    </div>
  );
}

// ──── 5 SCREENS ────

function LoginScreen() {
  return (
    <div style={{height:'100%',background:'linear-gradient(180deg, #0F5D30 0%, #176E3A 50%, #1F9C4F 100%)',color:'#fff',padding:'50px 28px 28px',display:'flex',flexDirection:'column'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div style={{width:64,height:64,borderRadius:18,background:'rgba(255,255,255,.15)',display:'grid',placeItems:'center',marginBottom:24,backdropFilter:'blur(20px)'}}>
          <img src={window.__resources && window.__resources.symbol} alt="" style={{width:36,height:36,filter:'brightness(0) invert(1)'}} onError={(e)=>e.target.style.display='none'}/>
          <span style={{position:'absolute',color:'#fff',fontSize:28,fontWeight:800}}>A</span>
        </div>
        <div style={{fontSize:32,fontWeight:800,lineHeight:1.1,marginBottom:8}}>AppChat<br/><span style={{fontWeight:400,opacity:.85}}>cho di động</span></div>
        <div style={{fontSize:14,opacity:.78,lineHeight:1.5,marginBottom:36}}>Hộp thư hợp nhất, bán hàng, sourcing — tất cả trong tay bạn.</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input placeholder="Email công ty" style={{padding:'14px 16px',borderRadius:12,border:'none',background:'rgba(255,255,255,.12)',color:'#fff',fontSize:14,outline:'none',backdropFilter:'blur(10px)'}}/>
          <input placeholder="Mật khẩu" type="password" style={{padding:'14px 16px',borderRadius:12,border:'none',background:'rgba(255,255,255,.12)',color:'#fff',fontSize:14,outline:'none',backdropFilter:'blur(10px)'}}/>
        </div>
        <button style={{marginTop:16,padding:'14px',borderRadius:12,border:'none',background:'#fff',color:'#0F5D30',fontWeight:700,fontSize:15,cursor:'pointer'}}>Đăng nhập</button>
        <div style={{display:'flex',alignItems:'center',gap:10,margin:'18px 0 14px',color:'rgba(255,255,255,.5)',fontSize:11}}>
          <span style={{flex:1,height:1,background:'rgba(255,255,255,.15)'}}/>HOẶC<span style={{flex:1,height:1,background:'rgba(255,255,255,.15)'}}/>
        </div>
        <button style={{padding:'13px',borderRadius:12,border:'1px solid rgba(255,255,255,.25)',background:'rgba(255,255,255,.08)',color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
          <span style={{width:20,height:20,borderRadius:'50%',background:'#fff',display:'grid',placeItems:'center',color:'#0F5D30',fontSize:11,fontWeight:800}}>F</span>
          Face ID · MediaSoft SSO
        </button>
      </div>
      <div style={{textAlign:'center',fontSize:11,opacity:.6,marginTop:14}}>v2.4.1 · MediaSoft JSC · ISO 42001</div>
    </div>
  );
}

function InboxScreen({ onOpenChat }) {
  const [tab, setTab] = React.useState('all');
  const convs = [
    { id:1, name:'Nguyễn Thị Hà', last:'Em check lại đơn hàng 1688 nhé anh', time:'2p', unread:2, ch:'zalo', avatar:'#2DC56A', ai:true },
    { id:2, name:'Trần Văn Bình · Đại lý HCM', last:'Anh gửi báo giá 200 thùng giúp em', time:'8p', unread:1, ch:'zalo', avatar:'#1F9C4F' },
    { id:3, name:'Lê Hoàng Phúc', last:'OK em đã thanh toán đặt cọc rồi', time:'14p', unread:0, ch:'mess', avatar:'#FF8A4C' },
    { id:4, name:'Phạm Mai Anh', last:'Bạn ơi tư vấn giúp mình mẫu này nha', time:'32p', unread:3, ch:'mail', avatar:'#7BA9F2' },
    { id:5, name:'Vũ Đức Long', last:'Cảm ơn shop, hàng đẹp lắm 👍', time:'1h', unread:0, ch:'sms', avatar:'#C084FC' },
    { id:6, name:'Đoàn Thanh Hoa', last:'Mai em qua xem mẫu được không', time:'2h', unread:0, ch:'zalo', avatar:'#FBBF24' },
    { id:7, name:'Ngô Văn Quân', last:'Đơn của em đã ship chưa anh?', time:'3h', unread:0, ch:'mess', avatar:'#0EA5E9' },
  ];
  const filtered = tab==='all' ? convs : convs.filter(c=>c.unread>0);
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#F7F8FA'}}>
      {/* header */}
      <div style={{padding:'10px 18px 6px',background:'#fff',borderBottom:'1px solid #ECEEF2'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:24,fontWeight:800,color:'#0F5D30'}}>Hộp thư</div>
          <div style={{display:'flex',gap:8}}>
            <button style={{width:36,height:36,borderRadius:'50%',background:'#F0F2F5',border:'none',display:'grid',placeItems:'center'}}><Icon.Search width="16" height="16" style={{color:'#555'}}/></button>
            <button style={{width:36,height:36,borderRadius:'50%',background:'#F0F2F5',border:'none',display:'grid',placeItems:'center',position:'relative'}}>
              <Icon.Bell width="16" height="16" style={{color:'#555'}}/>
              <span style={{position:'absolute',top:6,right:7,width:8,height:8,background:'#FF4444',borderRadius:'50%',border:'1.5px solid #F0F2F5'}}/>
            </button>
          </div>
        </div>
        <div style={{display:'flex',gap:6,paddingBottom:8}}>
          {[{k:'all',l:'Tất cả',n:23},{k:'unread',l:'Chưa đọc',n:6},{k:'mine',l:'Của tôi',n:8},{k:'team',l:'Nhóm',n:12}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'6px 12px',borderRadius:999,border:'none',background:tab===t.k?'#0F5D30':'#F0F2F5',color:tab===t.k?'#fff':'#555',fontWeight:600,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>{t.l} <span style={{opacity:.7,marginLeft:2}}>{t.n}</span></button>
          ))}
        </div>
      </div>
      {/* list */}
      <div style={{flex:1,overflow:'auto',background:'#fff'}}>
        {filtered.map(c=>(
          <div key={c.id} onClick={c.id===1?onOpenChat:undefined} style={{display:'flex',gap:12,padding:'12px 18px',borderBottom:'1px solid #F4F5F7',cursor:c.id===1?'pointer':'default',background:c.id===1?'#FAFCFB':'transparent'}}>
            <div style={{position:'relative'}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:c.avatar,color:'#fff',display:'grid',placeItems:'center',fontWeight:700,fontSize:16}}>{c.name.split(' ').slice(-1)[0][0]}</div>
              <div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,borderRadius:'50%',background:c.ch==='zalo'?'#0084FF':c.ch==='mess'?'#0084FF':c.ch==='mail'?'#EA4335':c.ch==='sms'?'#34C759':'#888',border:'2px solid #fff',display:'grid',placeItems:'center',fontSize:9,fontWeight:800,color:'#fff'}}>{c.ch==='zalo'?'Z':c.ch==='mess'?'M':c.ch==='mail'?'@':c.ch==='sms'?'S':'?'}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:14,fontWeight:c.unread>0?700:600,color:'#231F20',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</div>
                <div style={{fontSize:11,color:c.unread>0?'#0F5D30':'#9CA3AF',fontWeight:c.unread>0?700:500,flexShrink:0,marginLeft:6}}>{c.time}</div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:3}}>
                <div style={{fontSize:13,color:c.unread>0?'#231F20':'#6B7280',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginRight:8,display:'flex',alignItems:'center',gap:4}}>
                  {c.ai && <span style={{display:'inline-flex',width:14,height:14,borderRadius:4,background:'#FF8A4C',color:'#fff',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,flexShrink:0}}>✦</span>}
                  {c.last}
                </div>
                {c.unread>0 && <div style={{minWidth:20,height:20,padding:'0 6px',borderRadius:10,background:'#2DC56A',color:'#fff',fontSize:11,fontWeight:700,display:'grid',placeItems:'center'}}>{c.unread}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* tab bar */}
      <div style={{display:'flex',justifyContent:'space-around',alignItems:'center',padding:'8px 0 4px',background:'#fff',borderTop:'1px solid #ECEEF2'}}>
        {[
          {l:'Hộp thư',k:'inbox',I:Icon.Chat,active:true},
          {l:'Liên hệ',k:'contacts',I:Icon.Users},
          {l:'Deals',k:'deals',I:Icon.Zap},
          {l:'Thông báo',k:'notif',I:Icon.Bell,b:6},
          {l:'Tôi',k:'me',I:Icon.User},
        ].map(t=>(
          <div key={t.k} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,color:t.active?'#0F5D30':'#9CA3AF',position:'relative',padding:'4px 10px'}}>
            <t.I width="22" height="22"/>
            <div style={{fontSize:9.5,fontWeight:t.active?700:500}}>{t.l}</div>
            {t.b && <div style={{position:'absolute',top:1,right:6,minWidth:14,height:14,padding:'0 4px',borderRadius:7,background:'#FF4444',color:'#fff',fontSize:9,fontWeight:700,display:'grid',placeItems:'center'}}>{t.b}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatScreen({ onBack, onContact }) {
  const msgs = [
    { side:'in', t:'Anh ơi em muốn order 200 cái áo mẫu giống Hà nó mặc tuần trước, mà bên Quảng Châu', tm:'10:23' },
    { side:'in', t:'Có giá tốt không anh?', tm:'10:23' },
    { side:'out', t:'Hà ơi anh check sourcing 1688 bên đó nha. Mình có 3 supplier đang giữ size đó, giá từ 88k-120k tuỳ chất liệu', tm:'10:25' },
    { side:'ai-suggest', list:['Em chốt giúp anh mẫu nào nhé','Anh gửi link 3 mẫu xem nhé','Em cần áo trong bao lâu?'] },
    { side:'in', t:'Anh gửi link 3 mẫu xem nhé 🙏', tm:'10:26' },
    { side:'out', t:'OK em check email đi, anh vừa send 3 mẫu rồi', tm:'10:27', read:true },
  ];
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#FAFCFB'}}>
      {/* header */}
      <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:10,background:'#fff',borderBottom:'1px solid #ECEEF2',flexShrink:0}}>
        <button onClick={onBack} style={{width:34,height:34,border:'none',background:'transparent',display:'grid',placeItems:'center',color:'#0F5D30',cursor:'pointer'}}>‹</button>
        <div onClick={onContact} style={{display:'flex',alignItems:'center',gap:10,flex:1,cursor:'pointer'}}>
          <div style={{position:'relative'}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'#2DC56A',color:'#fff',display:'grid',placeItems:'center',fontWeight:700,fontSize:14}}>H</div>
            <div style={{position:'absolute',bottom:-1,right:-1,width:11,height:11,borderRadius:'50%',background:'#34C759',border:'2px solid #fff'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:'#231F20'}}>Nguyễn Thị Hà</div>
            <div style={{fontSize:11,color:'#34C759',display:'flex',alignItems:'center',gap:4}}><span style={{width:5,height:5,background:'#34C759',borderRadius:'50%'}}/>Đang gõ qua Zalo OA</div>
          </div>
        </div>
        <button style={{width:34,height:34,border:'none',background:'transparent',display:'grid',placeItems:'center',color:'#555'}}><Icon.Phone width="18" height="18"/></button>
        <button style={{width:34,height:34,border:'none',background:'transparent',display:'grid',placeItems:'center',color:'#555'}}>⋯</button>
      </div>

      {/* msgs */}
      <div style={{flex:1,overflow:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{textAlign:'center',fontSize:10.5,color:'#9CA3AF',fontWeight:600,padding:'4px 12px',background:'rgba(255,255,255,.6)',borderRadius:12,alignSelf:'center'}}>Hôm nay · 10:23</div>
        {msgs.map((m,i)=> {
          if (m.side==='ai-suggest') return (
            <div key={i} style={{margin:'4px 0',padding:'10px 12px',background:'linear-gradient(135deg,#FFF1E8 0%,#FFE4D2 100%)',borderRadius:14,border:'1px solid #FFCEAB'}}>
              <div style={{fontSize:10.5,fontWeight:700,color:'#C84A1A',marginBottom:6,display:'flex',alignItems:'center',gap:5,letterSpacing:'.04em',textTransform:'uppercase'}}><span style={{display:'inline-flex',width:14,height:14,borderRadius:4,background:'#FF8A4C',color:'#fff',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800}}>✦</span>Claude gợi ý 3 phản hồi</div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {m.list.map((s,j)=>(<button key={j} style={{textAlign:'left',padding:'8px 10px',borderRadius:10,background:'#fff',border:'1px solid #FFD8B8',fontSize:12,color:'#231F20',cursor:'pointer'}}>{s}</button>))}
              </div>
            </div>
          );
          return (
            <div key={i} style={{display:'flex',justifyContent:m.side==='out'?'flex-end':'flex-start',alignItems:'flex-end',gap:6}}>
              {m.side==='in' && <div style={{width:24,height:24,borderRadius:'50%',background:'#2DC56A',color:'#fff',display:'grid',placeItems:'center',fontWeight:700,fontSize:10,flexShrink:0}}>H</div>}
              <div style={{maxWidth:'75%',padding:'9px 13px',borderRadius:m.side==='out'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.side==='out'?'#0F5D30':'#fff',color:m.side==='out'?'#fff':'#231F20',fontSize:13.5,lineHeight:1.45,boxShadow:m.side==='in'?'0 1px 3px rgba(0,0,0,.04)':'none'}}>
                {m.t}
                <div style={{fontSize:9.5,opacity:.65,marginTop:3,display:'flex',justifyContent:'flex-end',gap:4}}>{m.tm}{m.read && <span>✓✓</span>}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div style={{padding:'8px 12px 10px',background:'#fff',borderTop:'1px solid #ECEEF2',display:'flex',gap:8,alignItems:'flex-end'}}>
        <button style={{width:34,height:34,borderRadius:'50%',background:'#F0F2F5',border:'none',display:'grid',placeItems:'center',color:'#0F5D30',fontSize:18,fontWeight:700}}>+</button>
        <div style={{flex:1,background:'#F0F2F5',borderRadius:18,padding:'9px 12px',fontSize:13,color:'#9CA3AF'}}>Aa Tin nhắn…</div>
        <button style={{width:34,height:34,borderRadius:'50%',background:'transparent',border:'none',display:'grid',placeItems:'center',color:'#555',fontSize:18}}>🎤</button>
        <button style={{width:34,height:34,borderRadius:'50%',background:'#0F5D30',border:'none',display:'grid',placeItems:'center',color:'#fff',fontSize:14}}>↑</button>
      </div>
    </div>
  );
}

function ContactScreen({ onBack }) {
  return (
    <div style={{height:'100%',overflow:'auto',background:'#F7F8FA'}}>
      {/* hero */}
      <div style={{background:'linear-gradient(180deg,#0F5D30 0%,#1F9C4F 100%)',padding:'12px 18px 60px',color:'#fff',position:'relative'}}>
        <button onClick={onBack} style={{width:34,height:34,border:'none',background:'rgba(255,255,255,.15)',color:'#fff',borderRadius:'50%',display:'grid',placeItems:'center',cursor:'pointer'}}>‹</button>
      </div>
      <div style={{margin:'-50px 18px 0',background:'#fff',borderRadius:18,padding:18,boxShadow:'0 8px 30px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:14}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'#2DC56A',color:'#fff',display:'grid',placeItems:'center',fontWeight:700,fontSize:24,border:'3px solid #fff',boxShadow:'0 4px 16px rgba(45,197,106,.3)'}}>H</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:700,color:'#231F20'}}>Nguyễn Thị Hà</div>
            <div style={{fontSize:12,color:'#6B7280',marginTop:2}}>Mua sỉ thời trang · TP.HCM</div>
            <div style={{display:'flex',gap:5,marginTop:6}}>
              <span style={{fontSize:10,padding:'2px 7px',background:'#FFF1E8',color:'#C84A1A',borderRadius:5,fontWeight:700}}>VIP · A+</span>
              <span style={{fontSize:10,padding:'2px 7px',background:'#E8F7EF',color:'#0F5D30',borderRadius:5,fontWeight:700}}>RFM 555</span>
            </div>
          </div>
        </div>
        {/* quick actions */}
        <div style={{display:'flex',gap:8,marginBottom:4}}>
          {[{i:'📞',l:'Gọi'},{i:'💬',l:'Nhắn'},{i:'✉️',l:'Email'},{i:'📝',l:'Note'}].map((a,i)=>(
            <button key={i} style={{flex:1,padding:'10px 6px',borderRadius:10,background:'#F0FAF4',border:'1px solid #BCEDCC',color:'#0F5D30',display:'flex',flexDirection:'column',alignItems:'center',gap:3,fontSize:11,fontWeight:600,cursor:'pointer'}}>
              <span style={{fontSize:18}}>{a.i}</span>{a.l}
            </button>
          ))}
        </div>
      </div>

      {/* stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,padding:'14px 18px 0'}}>
        {[{n:'48tr',l:'LTV'},{n:'12',l:'Đơn hàng'},{n:'94%',l:'Tỷ lệ giữ'}].map((s,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:12,padding:'12px 8px',textAlign:'center',border:'1px solid #ECEEF2'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0F5D30'}}>{s.n}</div>
            <div style={{fontSize:10.5,color:'#6B7280',marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* deals */}
      <div style={{padding:'18px 18px 0'}}>
        <div style={{fontSize:11.5,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Deal đang mở (2)</div>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #ECEEF2',overflow:'hidden'}}>
          {[{n:'200 áo polo Quảng Châu',v:'24.6tr',s:'Negotiation',c:'#FF8A4C'},{n:'500 phụ kiện Q3/26',v:'68tr',s:'Proposal',c:'#7BA9F2'}].map((d,i)=>(
            <div key={i} style={{padding:'12px 14px',display:'flex',gap:10,alignItems:'center',borderBottom:i<1?'1px solid #F4F5F7':'none'}}>
              <div style={{width:34,height:34,borderRadius:8,background:d.c+'22',color:d.c,display:'grid',placeItems:'center',fontWeight:700,fontSize:11}}>{d.s[0]}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'#231F20',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.n}</div>
                <div style={{fontSize:11,color:'#6B7280'}}>{d.s} · {d.v}</div>
              </div>
              <span style={{color:'#9CA3AF'}}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* timeline */}
      <div style={{padding:'18px 18px 30px'}}>
        <div style={{fontSize:11.5,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Lịch sử tương tác</div>
        <div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #ECEEF2'}}>
          {[{i:'💬',t:'Hỏi mẫu áo polo',tm:'2 phút trước'},{i:'📦',t:'Nhận đơn ORD-238',tm:'2 ngày trước'},{i:'☎️',t:'Cuộc gọi 12 phút',tm:'5 ngày trước'},{i:'✉️',t:'Mở email Newsletter',tm:'1 tuần trước'}].map((e,i)=>(
            <div key={i} style={{display:'flex',gap:12,paddingBottom:i<3?12:0,marginBottom:i<3?12:0,borderBottom:i<3?'1px solid #F4F5F7':'none'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#F0F2F5',display:'grid',placeItems:'center',fontSize:14,flexShrink:0}}>{e.i}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:'#231F20',fontWeight:500}}>{e.t}</div>
                <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{e.tm}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotifScreen() {
  const groups = [
    { l:'Mới', items:[
      { i:'💬', t:'Hà gửi 2 tin nhắn mới', s:'Em check lại đơn 1688 nhé anh', tm:'2 phút', c:'#2DC56A' },
      { i:'⚡', t:'Deal "200 áo polo" tiến tới Negotiation', s:'24.6tr · cần phản hồi trong 24h', tm:'15 phút', c:'#FF8A4C' },
      { i:'🤖', t:'Claude xử lý 23 hội thoại tự động', s:'Tỷ lệ resolve 87% · tiết kiệm 4.2h', tm:'1h', c:'#8F6DEB', ai:true },
    ]},
    { l:'Hôm nay', items:[
      { i:'📦', t:'Đơn ORD-238 đã rời cảng Thâm Quyến', s:'ETA 12/05 tại HCM · Sea Express', tm:'3h', c:'#0EA5E9' },
      { i:'📊', t:'Báo cáo tuần đã sẵn sàng', s:'Doanh thu +18% so với tuần trước', tm:'7h', c:'#1F9C4F' },
      { i:'🎯', t:'Journey "Win-back" đạt 27% conversion', s:'214/800 khách quay lại', tm:'9h', c:'#FBBF24' },
    ]}
  ];
  return (
    <div style={{height:'100%',background:'#F7F8FA',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 18px 12px',background:'#fff',borderBottom:'1px solid #ECEEF2'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:24,fontWeight:800,color:'#0F5D30'}}>Thông báo</div>
          <button style={{padding:'6px 12px',borderRadius:999,border:'1px solid #ECEEF2',background:'#fff',color:'#0F5D30',fontSize:11,fontWeight:700,cursor:'pointer'}}>Đánh dấu đã đọc</button>
        </div>
        <div style={{display:'flex',gap:6,marginTop:10,overflowX:'auto'}}>
          {[{l:'Tất cả',n:14,a:true},{l:'Tin nhắn',n:6},{l:'Deal',n:3},{l:'Order',n:2},{l:'Hệ thống',n:3}].map((t,i)=>(
            <button key={i} style={{padding:'6px 12px',borderRadius:999,border:'none',background:t.a?'#0F5D30':'#F0F2F5',color:t.a?'#fff':'#555',fontSize:11.5,fontWeight:600,whiteSpace:'nowrap'}}>{t.l} <span style={{opacity:.7}}>{t.n}</span></button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflow:'auto'}}>
        {groups.map((g,gi)=>(
          <div key={gi}>
            <div style={{padding:'14px 18px 6px',fontSize:10.5,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.08em'}}>{g.l}</div>
            <div style={{background:'#fff',marginBottom:6}}>
              {g.items.map((n,i)=>(
                <div key={i} style={{padding:'12px 18px',display:'flex',gap:12,borderBottom:i<g.items.length-1?'1px solid #F4F5F7':'none',position:'relative'}}>
                  {gi===0 && i===0 && <div style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',width:6,height:6,background:'#2DC56A',borderRadius:'50%'}}/>}
                  <div style={{width:38,height:38,borderRadius:10,background:n.c+'22',color:n.c,display:'grid',placeItems:'center',fontSize:16,flexShrink:0,position:'relative'}}>
                    {n.i}
                    {n.ai && <span style={{position:'absolute',bottom:-2,right:-2,width:14,height:14,borderRadius:4,background:'#FF8A4C',color:'#fff',fontSize:8,fontWeight:800,display:'grid',placeItems:'center',border:'1.5px solid #fff'}}>✦</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#231F20',lineHeight:1.3}}>{n.t}</div>
                      <div style={{fontSize:10.5,color:'#9CA3AF',flexShrink:0,marginTop:1}}>{n.tm}</div>
                    </div>
                    <div style={{fontSize:12,color:'#6B7280',marginTop:3,lineHeight:1.4}}>{n.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{padding:'18px',display:'flex',gap:10}}>
          <button style={{flex:1,padding:'10px',borderRadius:10,background:'#fff',border:'1px solid #ECEEF2',color:'#555',fontSize:12,fontWeight:600}}>⏰ Snooze 1h</button>
          <button style={{flex:1,padding:'10px',borderRadius:10,background:'#fff',border:'1px solid #ECEEF2',color:'#555',fontSize:12,fontWeight:600}}>🌙 Tới sáng</button>
        </div>
      </div>
    </div>
  );
}

window.MobileShell = MobileShell;
