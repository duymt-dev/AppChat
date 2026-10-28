/* ===== webphone.jsx — Màn gọi nổi (floating webphone) =====
 * Gọi đi (dialer + caller ID) · Nhận cuộc gọi đến · Đang gọi
 * (mute/hold/record/DTMF) · Chuyển máy (blind/consult) · thu nhỏ pill.
 * Mount toàn cục — mở từ bất kỳ module nào qua CustomEvent:
 *   window.dispatchEvent(new CustomEvent('webphone:dial', {detail:{num,name}}))
 *   window.dispatchEvent(new CustomEvent('webphone:incoming', {detail:{num,name}}))
 * ========================================================== */
;(function(){
try {
const { useState: useWP, useEffect: useWPE, useRef: useWPR } = React;

/* local inline icons — zero external deps */
const wpSvg = (d, extra) => (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={p && p.size || 16} height={p && p.size || 16} style={p && p.style}>
    {d.map((dd,i)=><path key={i} d={dd}/>)}{extra}
  </svg>
);
const WPPhone   = wpSvg(['M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z']);
const WPMic     = wpSvg(['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z','M19 10v2a7 7 0 0 1-14 0v-2','M12 19v3']);
const WPMicOff  = wpSvg(['M2 2l20 20','M9 9v3a3 3 0 0 0 5.12 2.12','M15 9.34V5a3 3 0 0 0-5.94-.6','M17 16.95A7 7 0 0 1 5 12v-2','M19 10v2a7 7 0 0 1-.11 1.23','M12 19v3']);
const WPPause   = wpSvg(['M10 4H6v16h4z','M18 4h-4v16h4z']);
const WPGrid    = wpSvg(['M4 4h4v4H4z','M10 4h4v4h-4z','M16 4h4v4h-4z','M4 10h4v4H4z','M10 10h4v4h-4z','M16 10h4v4h-4z','M4 16h4v4H4z','M10 16h4v4h-4z','M16 16h4v4h-4z']);
const WPSwap    = wpSvg(['M17 3l4 4-4 4','M21 7H9','M7 21l-4-4 4-4','M3 17h12']);
const WPClose   = wpSvg(['M18 6L6 18','M6 6l12 12']);
const WPMinus   = wpSvg(['M5 12h14']);
const WPDel     = wpSvg(['M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z','M18 9l-6 6','M12 9l6 6']);

const WP_EXTS = [
  {ext:'101', n:'Trâm', note:'Sales · đang gọi', busy:true,  c:'#2DC56A'},
  {ext:'102', n:'Minh', note:'Sales · sẵn sàng', busy:false, c:'#2B9EF3'},
  {ext:'103', n:'Hương', note:'CSKH · sẵn sàng', busy:false, c:'#2B9EF3'},
  {ext:'104', n:'Khoa', note:'Kỹ thuật · nghỉ',  busy:true,  c:'#9CA3AF'},
  {ext:'900', n:'AI Voice Agent', note:'Tự động · luôn sẵn sàng', busy:false, c:'#6E48E6', ai:true},
];
const WP_QUEUES = [ {n:'Hàng đợi Sales', sub:'4 agent · round-robin'}, {n:'Hàng đợi CSKH', sub:'3 agent · đổ chuông tất cả'} ];
const WP_RECENT = [ {n:'Chị Lan · Shop Bé Na', num:'0987 123 421'}, {n:'Anh Hiếu · MomBaby', num:'0902 334 571'}, {n:'Anh Quân · An Khang', num:'0912 448 773'} ];
const WP_LINES = ['1900 1234', '028 7300 5588'];

const fmtT = s => Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
const wpBtnRound = (bg, fg, size=44) => ({width:size, height:size, borderRadius:'50%', border:'none', background:bg, color:fg, display:'grid', placeItems:'center', cursor:'pointer', flexShrink:0});

function WebPhone() {
  const [view, setView]   = useWP('closed');   // closed | dialer | incoming | ringing | active | ended
  const [min, setMin]     = useWP(false);
  const [num, setNum]     = useWP('');
  const [peer, setPeer]   = useWP(null);       // {name, num, dir}
  const [line, setLine]   = useWP(WP_LINES[0]);
  const [sec, setSec]     = useWP(0);
  const [muted, setMuted] = useWP(false);
  const [hold, setHold]   = useWP(false);
  const [pad, setPad]     = useWP(false);
  const [xfer, setXfer]   = useWP(false);
  const [xferTo, setXferTo] = useWP(null);     // 'Đã chuyển tới …'
  const ringT = useWPR(null);

  /* events from anywhere in the app */
  useWPE(()=>{
    const onDial = e=>{ const d=(e && e.detail)||{};
      setXfer(false); setXferTo(null); setMuted(false); setHold(false); setPad(false); setMin(false);
      if (d.num) { setPeer({name:d.name||d.num, num:d.num, dir:'out'}); setView('ringing'); }
      else { setNum(''); setView('dialer'); }
    };
    const onIncoming = e=>{ const d=(e && e.detail)||{};
      setXfer(false); setXferTo(null); setMuted(false); setHold(false); setPad(false); setMin(false);
      setPeer({name:d.name||'Số lạ', num:d.num||'0987 123 421', dir:'in', via:d.via||'1900 1234 → IVR phím 1 → Hàng đợi Sales'});
      setView('incoming');
    };
    window.addEventListener('webphone:dial', onDial);
    window.addEventListener('webphone:incoming', onIncoming);
    return ()=>{ window.removeEventListener('webphone:dial', onDial); window.removeEventListener('webphone:incoming', onIncoming); };
  },[]);

  /* ringing → connected */
  useWPE(()=>{ if(view==='ringing'){ ringT.current=setTimeout(()=>{ setSec(0); setView('active'); }, 1800); return ()=>clearTimeout(ringT.current); } },[view]);
  /* call timer */
  useWPE(()=>{ if(view==='active' && !hold){ const t=setInterval(()=>setSec(s=>s+1),1000); return ()=>clearInterval(t); } },[view, hold]);

  const startDial = (n, name) => { setPeer({name:name||n, num:n, dir:'out'}); setView('ringing'); };
  const endCall = () => { setXfer(false); setView('ended'); };
  const closeAll = () => { setView('closed'); setMin(false); setNum(''); setXferTo(null); };
  const doTransfer = (label, blind) => {
    setXferTo((blind?'Chuyển ngay':'Chuyển có tham vấn')+' → '+label);
    setXfer(false);
    setTimeout(()=>setView('ended'), 900);
  };

  const card = {position:'fixed', right:22, bottom:22, width:316, background:'white', border:'1px solid var(--fill-04)', borderRadius:16, boxShadow:'0 24px 64px rgba(17,24,39,.28)', zIndex:1000, overflow:'hidden', fontSize:13};
  const head = (title, showMin=true) => (
    <div style={{display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'var(--pr-dark-2, #0B3D2C)', color:'white'}}>
      <span style={{width:22, height:22, borderRadius:6, background:'rgba(255,255,255,.15)', display:'grid', placeItems:'center'}}><WPPhone size={12}/></span>
      <b style={{fontSize:12.5, whiteSpace:'nowrap'}}>{title}</b>
      <span style={{flex:1}}/>
      {showMin && <button onClick={()=>setMin(true)} title="Thu nhỏ" style={{...wpBtnRound('rgba(255,255,255,.12)','white',24)}}><WPMinus size={12}/></button>}
      <button onClick={closeAll} title="Đóng" style={{...wpBtnRound('rgba(255,255,255,.12)','white',24)}}><WPClose size={12}/></button>
    </div>
  );

  /* ── minimized pill ── */
  if (min && (view==='active'||view==='ringing'||view==='incoming')) {
    return (
      <button onClick={()=>setMin(false)} style={{position:'fixed', right:22, bottom:22, zIndex:1000, display:'flex', alignItems:'center', gap:9, padding:'9px 16px 9px 11px', borderRadius:24, border:'none', cursor:'pointer', background:'var(--pr-dark-2, #0B3D2C)', color:'white', boxShadow:'0 10px 30px rgba(17,24,39,.35)'}}>
        <span style={{width:26, height:26, borderRadius:'50%', background:'#2DC56A', display:'grid', placeItems:'center', animation: view!=='active'?'wp-pulse 1.2s infinite':'none'}}><WPPhone size={13}/></span>
        <span style={{textAlign:'left'}}>
          <b style={{display:'block', fontSize:12, whiteSpace:'nowrap', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis'}}>{peer?.name}</b>
          <span style={{fontSize:10.5, opacity:.75}}>{view==='active' ? (hold?'Đang giữ máy':fmtT(sec)) : view==='incoming' ? 'Cuộc gọi đến…' : 'Đang đổ chuông…'}</span>
        </span>
        <style>{`@keyframes wp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
      </button>
    );
  }

  /* ── closed → FAB ── */
  if (view==='closed') {
    return null;
    return (
      <button onClick={()=>setView('dialer')} title="Mở bàn phím gọi (Webphone)"
        style={{position:'fixed', right:22, bottom:22, zIndex:900, ...wpBtnRound('var(--pr-dark-2, #0B3D2C)','white',48), boxShadow:'0 10px 28px rgba(17,24,39,.3)'}}>
        <WPPhone size={20}/>
      </button>
    );
  }

  /* ── dialer ── */
  if (view==='dialer') {
    return (
      <div style={card}>
        {head('Gọi đi · Webphone')}
        <div style={{padding:14}}>
          <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:10}}>
            <span style={{fontSize:11, color:'var(--label-02)', whiteSpace:'nowrap'}}>Gọi bằng số</span>
            <select value={line} onChange={e=>setLine(e.target.value)} style={{height:26, border:'1px solid var(--fill-04)', borderRadius:7, fontSize:11.5, fontWeight:700, padding:'0 6px', background:'white'}}>
              {WP_LINES.map(l=><option key={l}>{l}</option>)}
            </select>
            <span style={{flex:1}}/>
            <span style={{fontSize:10.5, color:'var(--pr-dark-1)', fontWeight:700, whiteSpace:'nowrap'}}>● Máy nhánh 101</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, height:44, border:'1px solid var(--fill-04)', borderRadius:10, padding:'0 12px', marginBottom:10, background:'var(--fill-02)'}}>
            <input value={num} onChange={e=>setNum(e.target.value.replace(/[^\d\s+*#]/g,''))} placeholder="Nhập số điện thoại…"
              style={{flex:1, border:'none', outline:'none', background:'transparent', fontSize:16, fontWeight:700, fontFamily:'inherit', minWidth:0}}/>
            {num && <button onClick={()=>setNum(n=>n.slice(0,-1))} style={{...wpBtnRound('transparent','var(--label-03)',26)}}><WPDel size={15}/></button>}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:12}}>
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k=>(
              <button key={k} onClick={()=>setNum(n=>n+k)} style={{height:40, borderRadius:9, border:'1px solid var(--fill-03)', background:'white', fontSize:16, fontWeight:700, cursor:'pointer'}}>{k}</button>
            ))}
          </div>
          <button disabled={!num.trim()} onClick={()=>startDial(num.trim())}
            style={{width:'100%', height:44, borderRadius:12, border:'none', cursor:num.trim()?'pointer':'default', background:num.trim()?'#2DC56A':'var(--fill-04)', color:'white', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
            <WPPhone size={16}/> Gọi
          </button>
          <div style={{marginTop:12, borderTop:'1px solid var(--fill-03)', paddingTop:8}}>
            <div style={{fontSize:10, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)', marginBottom:4}}>GẦN ĐÂY</div>
            {WP_RECENT.map(r=>(
              <button key={r.num} onClick={()=>startDial(r.num, r.n)} style={{display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 4px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', borderRadius:8}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{width:26, height:26, borderRadius:'50%', background:'var(--bg-green)', color:'var(--pr-dark-1)', display:'grid', placeItems:'center', flexShrink:0}}><WPPhone size={12}/></span>
                <span style={{flex:1, minWidth:0}}>
                  <b style={{display:'block', fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.n}</b>
                  <span style={{fontSize:10.5, color:'var(--label-03)'}}>{r.num}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── incoming ── */
  if (view==='incoming') {
    return (
      <div style={card}>
        {head('Cuộc gọi đến')}
        <div style={{padding:'18px 16px', textAlign:'center'}}>
          <div style={{width:56, height:56, borderRadius:'50%', margin:'0 auto 10px', background:'var(--grad-signature, linear-gradient(135deg,#2DC56A,#2B9EF3))', color:'white', display:'grid', placeItems:'center', fontWeight:800, fontSize:20, animation:'wp-ring .9s infinite'}}>
            {(peer?.name||'?')[0]}
          </div>
          <div style={{fontWeight:800, fontSize:15.5}}>{peer?.name}</div>
          <div style={{fontSize:12, color:'var(--label-02)', marginTop:2}}>{peer?.num}</div>
          <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:6, padding:'5px 10px', background:'var(--fill-02)', borderRadius:8, display:'inline-block'}}>{peer?.via}</div>
          <div style={{display:'flex', justifyContent:'center', gap:26, marginTop:18}}>
            <div style={{textAlign:'center'}}>
              <button onClick={closeAll} style={wpBtnRound('#E33F3F','white',50)}><WPPhone size={20} style={{transform:'rotate(135deg)'}}/></button>
              <div style={{fontSize:10.5, marginTop:5, color:'var(--label-02)', fontWeight:600}}>Từ chối</div>
            </div>
            <div style={{textAlign:'center'}}>
              <button onClick={()=>{setSec(0); setView('active');}} style={{...wpBtnRound('#2DC56A','white',50), animation:'wp-pulse 1.2s infinite'}}><WPPhone size={20}/></button>
              <div style={{fontSize:10.5, marginTop:5, color:'var(--label-02)', fontWeight:600}}>Nghe máy</div>
            </div>
          </div>
        </div>
        <style>{`@keyframes wp-ring{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}@keyframes wp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}`}</style>
      </div>
    );
  }

  /* ── ringing / active / ended ── */
  return (
    <div style={card}>
      {head(view==='ringing' ? 'Đang gọi đi' : view==='ended' ? 'Cuộc gọi kết thúc' : (hold?'Đang giữ máy':'Đang trong cuộc gọi'), view!=='ended')}
      <div style={{padding:'16px 16px 14px', textAlign:'center'}}>
        <div style={{width:50, height:50, borderRadius:'50%', margin:'0 auto 8px', background:'var(--pr-dark-1, #157A40)', color:'white', display:'grid', placeItems:'center', fontWeight:800, fontSize:18}}>{(peer?.name||'?')[0]}</div>
        <div style={{fontWeight:800, fontSize:15}}>{peer?.name}</div>
        <div style={{fontSize:11.5, color:'var(--label-02)', marginTop:1}}>{peer?.num} · qua {line}</div>
        <div style={{fontSize:13.5, fontWeight:800, marginTop:7, color: view==='ringing'?'var(--label-02)': hold?'#C27614':'var(--pr-dark-1)', fontVariantNumeric:'tabular-nums'}}>
          {view==='ringing' ? 'Đang đổ chuông…' : view==='ended' ? 'Đã kết thúc · ' + fmtT(sec) : fmtT(sec)}
        </div>
        {view==='active' && <div style={{fontSize:10.5, color:'#E33F3F', fontWeight:700, marginTop:3}}>● REC Đang ghi âm</div>}
        {xferTo && <div style={{fontSize:11, color:'var(--pr-dark-1)', fontWeight:700, marginTop:5}}>✓ {xferTo}</div>}

        {view==='ended' ? (
          <div style={{marginTop:14}}>
            <div style={{fontSize:11.5, color:'var(--label-02)', background:'var(--fill-02)', borderRadius:9, padding:'9px 11px', textAlign:'left', lineHeight:1.5}}>
              <b style={{color:'var(--label-01)'}}>AI đang tóm tắt cuộc gọi…</b> transcript &amp; sentiment sẽ tự đính vào hồ sơ khách và nhật ký Call Center.
            </div>
            <div style={{display:'flex', gap:8, marginTop:10}}>
              <button onClick={()=>{setView('ringing');}} style={{flex:1, height:38, borderRadius:10, border:'1px solid var(--fill-04)', background:'white', fontWeight:700, fontSize:12.5, cursor:'pointer'}}>Gọi lại</button>
              <button onClick={closeAll} style={{flex:1, height:38, borderRadius:10, border:'none', background:'var(--label-01)', color:'white', fontWeight:700, fontSize:12.5, cursor:'pointer'}}>Đóng</button>
            </div>
          </div>
        ) : (
        <>
          <div style={{display:'flex', justifyContent:'center', gap:10, marginTop:14}}>
            {[
              {ic: muted? <WPMicOff size={17}/> : <WPMic size={17}/>, l:'Tắt mic', on:muted, fn:()=>setMuted(m=>!m)},
              {ic: <WPPause size={16}/>, l:'Giữ máy', on:hold, fn:()=>setHold(h=>!h)},
              {ic: <WPGrid size={16}/>, l:'Phím', on:pad, fn:()=>setPad(p=>!p)},
              {ic: <WPSwap size={16}/>, l:'Chuyển', on:xfer, fn:()=>setXfer(x=>!x), dis: view!=='active'},
            ].map(b=>(
              <div key={b.l} style={{textAlign:'center', opacity:b.dis?0.4:1}}>
                <button onClick={b.dis?undefined:b.fn} style={wpBtnRound(b.on?'var(--label-01)':'var(--fill-03)', b.on?'white':'var(--label-01)', 42)}>{b.ic}</button>
                <div style={{fontSize:9.5, marginTop:4, color:'var(--label-02)', fontWeight:600}}>{b.l}</div>
              </div>
            ))}
          </div>
          {pad && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginTop:12}}>
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k=>(
                <button key={k} style={{height:32, borderRadius:8, border:'1px solid var(--fill-03)', background:'white', fontSize:13.5, fontWeight:700, cursor:'pointer'}}>{k}</button>
              ))}
            </div>
          )}
          {xfer && (
            <div style={{marginTop:12, textAlign:'left', border:'1px solid var(--fill-04)', borderRadius:11, overflow:'hidden'}}>
              <div style={{padding:'7px 11px', fontSize:10.5, fontWeight:800, letterSpacing:'.05em', color:'var(--label-03)', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-03)'}}>CHUYỂN MÁY TỚI</div>
              <div style={{maxHeight:172, overflowY:'auto'}}>
                {WP_EXTS.filter(x=>x.ext!=='101').map(x=>(
                  <div key={x.ext} style={{display:'flex', alignItems:'center', gap:8, padding:'7px 11px', borderBottom:'1px solid var(--fill-03)'}}>
                    <span style={{width:30, height:22, borderRadius:6, background:x.ai?'#F6F2FF':'var(--fill-03)', color:x.ai?'#6E48E6':'var(--label-01)', display:'grid', placeItems:'center', fontWeight:800, fontSize:10.5, flexShrink:0}}>{x.ext}</span>
                    <span style={{flex:1, minWidth:0}}>
                      <b style={{display:'block', fontSize:11.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{x.n}</b>
                      <span style={{fontSize:9.5, color:x.busy?'#A63322':'var(--pr-dark-1)', fontWeight:600}}>{x.note}</span>
                    </span>
                    <button disabled={x.busy} onClick={()=>doTransfer(x.ext+' · '+x.n, true)} title="Chuyển ngay (blind)" style={{height:24, padding:'0 8px', borderRadius:7, border:'1px solid var(--fill-04)', background:'white', fontSize:10, fontWeight:700, cursor:x.busy?'default':'pointer', opacity:x.busy?0.45:1, whiteSpace:'nowrap'}}>Ngay</button>
                    <button disabled={x.busy} onClick={()=>doTransfer(x.ext+' · '+x.n, false)} title="Chuyển có tham vấn (consult)" style={{height:24, padding:'0 8px', borderRadius:7, border:'none', background:x.busy?'var(--fill-04)':'var(--label-01)', color:'white', fontSize:10, fontWeight:700, cursor:x.busy?'default':'pointer', whiteSpace:'nowrap'}}>Tham vấn</button>
                  </div>
                ))}
                {WP_QUEUES.map(q=>(
                  <div key={q.n} style={{display:'flex', alignItems:'center', gap:8, padding:'7px 11px', borderBottom:'1px solid var(--fill-03)'}}>
                    <span style={{width:30, height:22, borderRadius:6, background:'var(--bg-blue)', color:'#1a5caf', display:'grid', placeItems:'center', flexShrink:0}}><WPSwap size={11}/></span>
                    <span style={{flex:1, minWidth:0}}>
                      <b style={{display:'block', fontSize:11.5, whiteSpace:'nowrap'}}>{q.n}</b>
                      <span style={{fontSize:9.5, color:'var(--label-03)'}}>{q.sub}</span>
                    </span>
                    <button onClick={()=>doTransfer(q.n, true)} style={{height:24, padding:'0 10px', borderRadius:7, border:'none', background:'var(--label-01)', color:'white', fontSize:10, fontWeight:700, cursor:'pointer'}}>Chuyển</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={endCall} style={{...wpBtnRound('#E33F3F','white',48), margin:'16px auto 0'}}><WPPhone size={19} style={{transform:'rotate(135deg)'}}/></button>
        </>
        )}
      </div>
    </div>
  );
}

window.WebPhone = WebPhone;
} catch(e) { console.error('webphone.jsx', e); }
})();
