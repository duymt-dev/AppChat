/* ============================================================
   Multi-Channel Connect Modal — Zalo · Meta · ByteDance · Others
   Triggered from rail "+Kết nối kênh" or Settings → Channels
   ============================================================ */
const { useState: useCC } = React;

const CHANNEL_GROUPS = [
  {
    g: 'HỆ SINH THÁI ZALO (VIỆT NAM)',
    items: [
      { k:'zalo_pa', n:'Zalo Cá nhân',         d:'Tin nhắn cá nhân · Quét mã QR đăng nhập', cta:'Quét mã QR',   action:'qr',    color:'#0068FF', region:'VN' },
      { k:'zalo_oa', n:'Zalo Official Account (OA)', d:'Phát thông báo, ZNS template, chatbot OA', cta:'Kết nối ngay', action:'oauth', color:'#0068FF', region:'VN' },
      { k:'zalo_ad', n:'Zalo Ads',             d:'Quản lý chiến dịch Zalo Ads · CTR/CPC realtime', cta:'Kết nối ngay', action:'oauth', color:'#0068FF', region:'VN' },
    ]
  },
  {
    g: 'META & QUỐC TẾ',
    items: [
      { k:'fb',      n:'Facebook (Pages & Messenger)', d:'Inbox + Comments fanpage', cta:'Kết nối ngay', action:'oauth', color:'#1877F2', region:'GLOBAL', connected:true, info:'Fanpage "Siêu Thị Số 1"' },
      { k:'ig',      n:'Instagram Business',  d:'Direct Message + Comments · cần liên kết Page', cta:'Kết nối qua Facebook', action:'oauth', color:'#E1306C', region:'GLOBAL' },
      { k:'wa_pa',   n:'WhatsApp Cá nhân',    d:'Tin nhắn cá nhân · Quét mã QR Web', cta:'Quét mã QR', action:'qr', color:'#25D366', region:'GLOBAL' },
      { k:'wa_biz',  n:'WhatsApp Business API', d:'Cloud API qua Meta · template HSM, broadcast', cta:'Nhập thông tin API', action:'api', color:'#128C7E', region:'GLOBAL' },
    ]
  },
  {
    g: 'BYTEDANCE & THƯƠNG MẠI ĐIỆN TỬ',
    items: [
      { k:'tt_biz',  n:'TikTok Business Account', d:'Inbox khách hàng + chiến dịch TikTok', cta:'Kết nối ngay', action:'oauth', color:'#000000', region:'GLOBAL' },
      { k:'tt_shop', n:'TikTok Shop',          d:'Đơn hàng, chat shop, livestream order', cta:'Kết nối ngay', action:'oauth', color:'#FE2C55', region:'GLOBAL' },
      { k:'shopee',  n:'Shopee Chat',          d:'Inbox đơn + tự động nhắc đánh giá', cta:'Kết nối ngay', action:'oauth', color:'#EE4D2D', region:'SEA' },
      { k:'lazada',  n:'Lazada IM',            d:'Inbox khách + đơn hàng Lazada', cta:'Kết nối ngay', action:'oauth', color:'#0F156D', region:'SEA' },
    ]
  },
  {
    g: 'KÊNH CHAT KHÁC',
    items: [
      { k:'viber',   n:'Viber Business Messages', d:'Service & promotional message', cta:'Kết nối ngay', action:'oauth', color:'#7360F2', region:'VN/GLOBAL' },
      { k:'tg',      n:'Telegram Bot/Channel', d:'Bot inbox + broadcast channel', cta:'Nhập Bot Token', action:'token', color:'#229ED9', region:'GLOBAL' },
      { k:'line',    n:'LINE Official Account', d:'Inbox + LINE messaging API', cta:'Kết nối ngay', action:'oauth', color:'#06C755', region:'JP/SEA' },
      { k:'web',     n:'Web Chat Widget',     d:'Nhúng widget vào website của bạn', cta:'Tạo widget', action:'widget', color:'#2DC56A', region:'OWN' },
      { k:'email',   n:'Email Inbox (SMTP/IMAP)', d:'Gmail, Outlook, custom SMTP', cta:'Kết nối ngay', action:'oauth', color:'#EA4335', region:'GLOBAL' },
      { k:'sms',     n:'SMS Brandname',       d:'Viettel, VinaPhone, MobiFone gateway', cta:'Nhập API key', action:'api', color:'#F59E0B', region:'VN' },
    ]
  },
];

const ChannelLogo = ({ ch }) => {
  // tiny inline glyphs - using initial + brand color
  const map = {
    zalo_pa: { t:'zalo', sub:'cá nhân' },
    zalo_oa: { t:'zalo', sub:'OA' },
    zalo_ad: { t:'zalo', sub:'Ads' },
    fb:      { t:'f' },
    ig:      { t:'IG' },
    wa_pa:   { t:'wa' },
    wa_biz:  { t:'wa' },
    tt_biz:  { t:'TT' },
    tt_shop: { t:'TT', sub:'shop' },
    shopee:  { t:'S' },
    lazada:  { t:'L' },
    viber:   { t:'V' },
    tg:      { t:'✈' },
    line:    { t:'LINE' },
    web:     { t:'W' },
    email:   { t:'@' },
    sms:     { t:'SMS' },
  };
  const m = map[ch.k] || { t: ch.n.charAt(0) };
  return (
    <div style={{
      width:36, height:36, borderRadius:9, flexShrink:0,
      background: ch.color, color:'#fff',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontWeight:800, fontSize: m.t.length > 2 ? 9 : 14, letterSpacing:'.02em',
      boxShadow:'0 1px 0 rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.06)'
    }}>
      <span>{m.t}</span>
      {m.sub && <span style={{ fontSize:7, fontWeight:600, opacity:.92, marginTop:1 }}>{m.sub}</span>}
    </div>
  );
};

function ChannelConnectModal({ onClose, audience }) {
  const [step, setStep] = useCC('list'); // list | connecting | success
  const [selected, setSelected] = useCC(null);
  const [authed, setAuthed] = useCC({});

  const handleConnect = (ch) => {
    if (authed[ch.k]) return;
    setSelected(ch);
    setStep('connecting');
    // simulate flow
    setTimeout(() => {
      setAuthed(prev => ({ ...prev, [ch.k]: true }));
      setStep('success');
    }, ch.action === 'qr' ? 1800 : 1100);
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.55)', backdropFilter:'blur(2px)',
      zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:24
    }}>
      <div onClick={e=>e.stopPropagation()} className="card" style={{
        width:600, maxHeight:'90vh', display:'flex', flexDirection:'column', padding:0,
        overflow:'hidden', borderRadius:14
      }}>
        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--label-01)' }}>
              Kết Nối Đa Kênh{audience ? <span style={{ color:'var(--label-02)', fontWeight:600 }}> ({audience})</span> : null}
            </div>
            <div style={{ fontSize:12, color:'var(--label-02)', marginTop:3 }}>
              Quản lý tập trung tất cả các điểm chạm khách hàng của bạn tại đây.
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Đóng" style={{ marginTop:-2 }}>
            <Icon.Close style={{ width:16, height:16 }}/>
          </button>
        </div>

        {/* Body */}
        <div className="scroll" style={{ overflow:'auto', flex:1, padding:'4px 22px 8px' }}>
          {step === 'list' && CHANNEL_GROUPS.map(g => (
            <div key={g.g} style={{ paddingTop:14, paddingBottom:4 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--label-03)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>
                {g.g}
              </div>
              <div style={{ display:'grid', gap:0 }}>
                {g.items.map((ch, i) => {
                  const isAuthed = authed[ch.k] || ch.connected;
                  return (
                    <div key={ch.k} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'10px 0',
                      borderTop: i ? '1px solid var(--fill-04)' : 'none'
                    }}>
                      <ChannelLogo ch={ch}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'var(--label-01)' }}>
                          {ch.n}
                        </div>
                        <div style={{ fontSize:11.5, color:'var(--label-02)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {ch.d}
                        </div>
                      </div>
                      {isAuthed ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:4,
                            background:'var(--pr-soft, #DCFCE7)', color:'var(--pr-dark-2, #15803D)',
                            padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:700, whiteSpace:'nowrap'
                          }}>
                            ✓ Đã kết nối{ch.info ? ': '+ch.info : ''}
                          </span>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize:11.5 }}>Cài đặt</button>
                        </div>
                      ) : (
                        <button onClick={()=>handleConnect(ch)} className="btn btn-primary btn-sm" style={{ whiteSpace:'nowrap', fontSize:11.5, padding:'6px 12px' }}>
                          {ch.cta}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {step === 'connecting' && selected && (
            <div style={{ padding:'40px 8px', textAlign:'center' }}>
              <ChannelLogo ch={selected}/>
              <div style={{ marginTop:14, fontSize:14, fontWeight:700 }}>{selected.n}</div>
              {selected.action === 'qr' && (
                <>
                  <div style={{ fontSize:12, color:'var(--label-02)', marginTop:3 }}>Mở app trên điện thoại để quét mã QR</div>
                  <div style={{
                    width:200, height:200, margin:'18px auto 0',
                    background:`repeating-conic-gradient(${selected.color} 0% 25%, #fff 25% 50%) 0 0/16px 16px`,
                    border:'4px solid #fff', borderRadius:10, boxShadow:'0 0 0 1px var(--fill-04), 0 8px 24px rgba(0,0,0,.06)',
                    position:'relative'
                  }}>
                    <div style={{
                      position:'absolute', inset:'42% 42% 42% 42%',
                      background:'#fff', borderRadius:6, display:'grid', placeItems:'center',
                      fontSize:14, fontWeight:800, color:selected.color
                    }}>{selected.k.includes('wa') ? 'wa' : 'zalo'}</div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--label-03)', marginTop:12 }}>
                    Mã hết hạn sau 60 giây · <a style={{ color:selected.color }}>Tạo lại</a>
                  </div>
                </>
              )}
              {selected.action === 'oauth' && (
                <>
                  <div style={{ fontSize:12, color:'var(--label-02)', marginTop:3 }}>Đang chuyển hướng tới {selected.n}…</div>
                  <div style={{ marginTop:18, display:'inline-flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:16, height:16, borderRadius:8, border:'2px solid '+selected.color, borderTopColor:'transparent', animation:'cc-spin 0.8s linear infinite' }}/>
                    <span style={{ fontSize:12, color:'var(--label-02)' }}>Xác thực OAuth…</span>
                  </div>
                  <style>{`@keyframes cc-spin{to{transform:rotate(360deg)}}`}</style>
                </>
              )}
              {selected.action === 'api' && (
                <div style={{ marginTop:18, textAlign:'left' }}>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'var(--label-02)', marginBottom:5 }}>API Key</div>
                  <input type="text" placeholder="••••••••••••••••" defaultValue="••••••••••••••••" style={{ width:'100%', padding:'9px 11px', borderRadius:7, border:'1px solid var(--fill-04)', fontSize:12.5, fontFamily:'ui-monospace,monospace' }}/>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'var(--label-02)', margin:'12px 0 5px' }}>Phone Number ID</div>
                  <input type="text" placeholder="106540123456789" style={{ width:'100%', padding:'9px 11px', borderRadius:7, border:'1px solid var(--fill-04)', fontSize:12.5, fontFamily:'ui-monospace,monospace' }}/>
                  <div style={{ marginTop:14, fontSize:11, color:'var(--label-03)' }}>
                    Lấy thông tin tại <a style={{ color:'var(--primary)' }}>Meta Business Cloud Console →</a>
                  </div>
                </div>
              )}
              {selected.action === 'token' && (
                <div style={{ marginTop:18, textAlign:'left' }}>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'var(--label-02)', marginBottom:5 }}>Bot Token (từ @BotFather)</div>
                  <input type="text" placeholder="123456:ABC-DEF..." style={{ width:'100%', padding:'9px 11px', borderRadius:7, border:'1px solid var(--fill-04)', fontSize:12.5, fontFamily:'ui-monospace,monospace' }}/>
                </div>
              )}
              <div style={{ marginTop:18, display:'flex', gap:8, justifyContent:'center' }}>
                <button onClick={()=>setStep('list')} className="btn btn-ghost btn-sm">Huỷ</button>
                {selected.action !== 'qr' && (
                  <button onClick={()=>{ setAuthed(p=>({...p, [selected.k]:true})); setStep('success'); }} className="btn btn-primary btn-sm">Xác nhận</button>
                )}
              </div>
            </div>
          )}

          {step === 'success' && selected && (
            <div style={{ padding:'48px 8px', textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:32, background:'var(--pr-soft, #DCFCE7)', color:'var(--pr-dark-2, #15803D)', display:'inline-grid', placeItems:'center', fontSize:28, fontWeight:800 }}>✓</div>
              <div style={{ marginTop:14, fontSize:15, fontWeight:800 }}>Đã kết nối {selected.n}</div>
              <div style={{ fontSize:12, color:'var(--label-02)', marginTop:4, maxWidth:360, margin:'4px auto 0' }}>
                Tin nhắn từ kênh này sẽ tự động vào Inbox AppChat sau khoảng 30 giây. Bạn có thể tiếp tục kết nối thêm kênh khác.
              </div>
              <div style={{ marginTop:18, display:'flex', gap:8, justifyContent:'center' }}>
                <button onClick={()=>setStep('list')} className="btn btn-ghost btn-sm">Kết nối thêm kênh</button>
                <button onClick={onClose} className="btn btn-primary btn-sm">Hoàn tất</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'list' && (
          <div style={{ padding:'12px 22px', borderTop:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:12, background:'var(--fill-01)' }}>
            <a style={{ flex:1, fontSize:11.5, color:'var(--primary)', fontWeight:600, cursor:'pointer' }}>
              Hướng dẫn kết nối &amp; Bảo mật
            </a>
            <button onClick={onClose} className="btn btn-primary btn-sm">Hoàn tất</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.ChannelConnectModal = ChannelConnectModal;
window.CHANNEL_GROUPS = CHANNEL_GROUPS;
