/* ============================================================
   widget-growth.jsx — overrides window.WidgetStudio
   Multi-channel growth studio: Widget web · Link chat · Mã QR
   KPI + live preview + danh sách widget (loads AFTER _bundle.jsx)
   ============================================================ */
;(function(){
try {
const { useState: useGw } = React;
const GwI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const fmt=(n)=>(n||0).toLocaleString('vi-VN');

const CHANNELS = [
  { k:'zalo',     l:'Zalo OA',   c:'#0068FF', handle:'oa.zalo.me/appchat-spa' },
  { k:'facebook', l:'Facebook',  c:'#1877F2', handle:'m.me/appchatspa' },
  { k:'instagram',l:'Instagram', c:'#E1306C', handle:'ig.me/m/appchat.spa' },
  { k:'whatsapp', l:'WhatsApp',  c:'#25D366', handle:'wa.me/84909000111' },
  { k:'tiktok',   l:'TikTok',    c:'#111111', handle:'tiktok.com/@appchatspa' },
  { k:'telegram', l:'Telegram',  c:'#2AABEE', handle:'t.me/appchatspa' },
];
const Dot=({c})=> <span style={{width:9,height:9,borderRadius:'50%',background:c,flexShrink:0}}/>;

function QrArt({ size=150, fg='#0F172A' }){
  const N=21; const cells=[];
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const finder=(x<7&&y<7)||(x>=N-7&&y<7)||(x<7&&y>=N-7);
    const on = finder ? ((x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4))) : (((x*7+y*13+ (x^y))%3)===0);
    if(on) cells.push(<rect key={x+'-'+y} x={x} y={y} width="1" height="1" fill={fg}/>);
  }
  return <svg viewBox={'0 0 '+N+' '+N} width={size} height={size} style={{display:'block'}} shapeRendering="crispEdges">{cells}</svg>;
}

const WIDGETS = [
  { id:'w1', type:'omni', name:'Widget web — Trang chủ Spa', chans:['zalo','facebook','whatsapp'], clicks:3420, chats:512, on:true },
  { id:'w2', type:'link', name:'Link Zalo — Landing khuyến mãi', chans:['zalo'], clicks:1880, chats:642, on:true },
  { id:'w3', type:'qr', name:'QR tại quầy lễ tân', chans:['zalo','facebook'], clicks:940, chats:301, on:true },
  { id:'w4', type:'link', name:'Link Messenger — Bio Instagram', chans:['facebook'], clicks:1240, chats:288, on:false },
];

function Kpi({l,v,sub,c,ic}){
  return (<div className="card" style={{padding:14, display:'flex', alignItems:'center', gap:11}}>
    <span style={{width:34,height:34,borderRadius:9,background:c+'18',color:c,display:'grid',placeItems:'center',flexShrink:0}}>{GwI(ic,{style:{width:17,height:17}})}</span>
    <div style={{minWidth:0}}><div style={{fontSize:11.5,color:'var(--label-02)',fontWeight:600,whiteSpace:'nowrap'}}>{l}</div><div style={{fontSize:19,fontWeight:800,lineHeight:1.2}}>{v}</div>{sub&&<div style={{fontSize:10.5,color:'#1B9E5A',fontWeight:600}}>{sub}</div>}</div>
  </div>);
}

const TYPES = [
  { k:'omni', l:'Widget web', icon:'Globe', desc:'Nút nổi trên website — khách chọn kênh' },
  { k:'link', l:'Link chat', icon:'Link', desc:'Click-to-chat từng kênh · gắn bio, ads' },
  { k:'qr',   l:'Mã QR',     icon:'Grid', desc:'Quét tại quầy, standee, name card' },
];

function WidgetStudioGrowth(){
  const [type,setType]=useGw('omni');
  const [sel,setSel]=useGw(['zalo','facebook','whatsapp']);
  const [pos,setPos]=useGw('br');
  const [greet,setGreet]=useGw('Xin chào 👋 Spa hỗ trợ gì cho mình ạ?');
  const [toast,setToast]=useGw('');
  const [items,setItems]=useGw(WIDGETS);
  React.useEffect(()=>{ if(toast){ const x=setTimeout(()=>setToast(''),1700); return ()=>clearTimeout(x);} },[toast]);
  const copy=(label)=>setToast('Đã copy '+label);
  const setExtra=(k)=>setSel(s=> s.includes(k)? s.filter(x=>x!==k) : [...s,k]);
  const tog=(id)=>setItems(xs=>xs.map(w=>w.id===id?{...w,on:!w.on}:w));
  const totalClicks=items.reduce((a,w)=>a+w.clicks,0);
  const totalChats=items.reduce((a,w)=>a+w.chats,0);
  const conv=Math.round(totalChats/totalClicks*100);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Web Widget Studio</h1>
        <span className="crumb">Widget thu khách · đưa khách từ web · QR · link vào hội thoại</span>
        <span className="spacer"/>
        <button className="btn btn-primary btn-sm" onClick={()=>copy('cấu hình widget')}>{GwI('Plus',{style:{width:14,height:14}})} Tạo widget</button>
      </div>
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'18px 22px', background:'var(--fill-02)'}}>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16}}>
          <Kpi l="Lượt click / quét" v={fmt(totalClicks)} sub="+14% so với tuần trước" c="#2563EB" ic="Globe"/>
          <Kpi l="Hội thoại mới" v={fmt(totalChats)} sub="từ widget thu khách" c="#1B9E5A" ic="Chat"/>
          <Kpi l="Tỉ lệ chuyển đổi" v={conv+'%'} sub="click → hội thoại" c="#C9820B" ic="TrendUp"/>
          <Kpi l="Widget đang chạy" v={items.filter(w=>w.on).length+'/'+items.length} c="#6E48E6" ic="Zap"/>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'230px 1fr 300px', gap:16, marginBottom:18}}>
          <div className="card" style={{padding:8}}>
            <div style={{fontSize:10.5,fontWeight:800,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--label-03)',padding:'8px 10px 6px'}}>Loại widget</div>
            {TYPES.map(t=>{ const on=type===t.k; return (
              <button key={t.k} onClick={()=>setType(t.k)} style={{display:'flex',gap:10,width:'100%',textAlign:'left',padding:'10px',border:'none',borderRadius:9,cursor:'pointer',fontFamily:'inherit',marginBottom:2,background:on?'var(--bg-green)':'transparent'}}>
                <span style={{width:30,height:30,borderRadius:8,background:on?'var(--primary)':'var(--fill-03)',color:on?'white':'var(--label-02)',display:'grid',placeItems:'center',flexShrink:0}}>{GwI(t.icon,{style:{width:15,height:15}})}</span>
                <span style={{minWidth:0}}><span style={{display:'block',fontSize:13,fontWeight:700,color:on?'var(--pr-dark-2)':'var(--label-01)'}}>{t.l}</span><span style={{display:'block',fontSize:10.5,color:'var(--label-03)',lineHeight:1.3}}>{t.desc}</span></span>
              </button>
            );})}
          </div>

          <div className="card" style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:14}}>Cấu hình {TYPES.find(t=>t.k===type).l}</div>
            <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:8}}>Kênh hiển thị</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:18}}>
              {CHANNELS.map(c=>{ const on=sel.includes(c.k); return (
                <button key={c.k} onClick={()=>setExtra(c.k)} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'7px 12px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:600,border:'1px solid '+(on?c.c:'var(--fill-04)'),background:on?c.c+'12':'white',color:on?c.c:'var(--label-02)'}}>
                  <Dot c={c.c}/>{c.l}{on && <span style={{fontSize:13}}>✓</span>}
                </button>
              );})}
            </div>

            {type==='omni' && (<>
              <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:8}}>Vị trí nút nổi</div>
              <div style={{display:'flex',gap:6,marginBottom:18}}>
                {[['bl','Dưới trái'],['br','Dưới phải']].map(([k,l])=>{ const on=pos===k; return <button key={k} onClick={()=>setPos(k)} style={{padding:'8px 16px',borderRadius:8,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'),background:on?'var(--bg-green)':'white',color:on?'var(--pr-dark-2)':'var(--label-02)'}}>{l}</button>; })}
              </div>
              <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:8}}>Lời chào</div>
              <input value={greet} onChange={e=>setGreet(e.target.value)} style={{width:'100%',height:38,padding:'0 11px',border:'1px solid var(--fill-04)',borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:18}}/>
              <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',marginBottom:8}}>Mã nhúng website</div>
              <div style={{position:'relative'}}>
                <pre style={{margin:0,padding:'12px 14px',background:'#0F172A',color:'#CBD5E1',borderRadius:10,fontSize:11.5,fontFamily:'monospace',overflowX:'auto',lineHeight:1.6}}>{'<script src="https://cdn.appchat.vn/w.js"\n  data-id="'+(items[0]?.id||'w1')+'" data-pos="'+pos+'"\n  data-channels="'+sel.join(',')+'"></script>'}</pre>
                <button onClick={()=>copy('mã nhúng')} className="btn btn-sm" style={{position:'absolute',top:8,right:8,background:'rgba(255,255,255,.12)',color:'white',border:'none'}}>{GwI('Copy',{style:{width:13,height:13}})} Copy</button>
              </div>
            </>)}

            {type==='link' && (<div style={{display:'flex',flexDirection:'column',gap:10}}>
              {CHANNELS.filter(c=>sel.includes(c.k)).map(c=>(
                <div key={c.k} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 13px',border:'1px solid var(--fill-04)',borderRadius:10}}>
                  <Dot c={c.c}/>
                  <span style={{fontSize:12.5,fontWeight:600,width:90,flexShrink:0}}>{c.l}</span>
                  <span style={{flex:1,fontSize:12.5,fontFamily:'monospace',color:'var(--label-02)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>https://{c.handle}</span>
                  <button onClick={()=>copy('link '+c.l)} className="btn btn-ghost btn-sm">{GwI('Copy',{style:{width:13,height:13}})}</button>
                </div>
              ))}
              {sel.length===0 && <div style={{fontSize:12.5,color:'var(--label-03)',padding:'14px',textAlign:'center'}}>Chọn ít nhất 1 kênh để tạo link.</div>}
            </div>)}

            {type==='qr' && (<div style={{display:'flex',gap:18,alignItems:'center'}}>
              <div style={{padding:12,background:'white',border:'1px solid var(--fill-04)',borderRadius:12}}><QrArt size={130}/></div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>QR đa kênh</div>
                <div style={{fontSize:12,color:'var(--label-02)',lineHeight:1.6,marginBottom:14}}>Khách quét QR → mở trang chọn kênh ({sel.map(k=>CHANNELS.find(c=>c.k===k)?.l).filter(Boolean).join(' · ')||'chưa chọn kênh'}) → vào thẳng hội thoại. Dán lên standee, name card, hoá đơn.</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>copy('ảnh QR (PNG)')} className="btn btn-primary btn-sm">{GwI('Copy',{style:{width:13,height:13}})} Tải PNG</button>
                  <button onClick={()=>copy('ảnh QR (SVG)')} className="btn btn-ghost btn-sm">Tải SVG</button>
                </div>
              </div>
            </div>)}
          </div>

          <div className="card" style={{padding:0, overflow:'hidden', display:'flex', flexDirection:'column'}}>
            <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-02)',padding:'12px 14px',borderBottom:'1px solid var(--fill-03)'}}>Xem trước</div>
            <div style={{flex:1,position:'relative',background:'linear-gradient(160deg,#EEF2F7,#E2E8F0)',minHeight:300,padding:14}}>
              <div style={{height:10,width:'55%',background:'rgba(15,23,42,.10)',borderRadius:5,marginBottom:9}}/>
              <div style={{height:7,width:'85%',background:'rgba(15,23,42,.07)',borderRadius:4,marginBottom:6}}/>
              <div style={{height:7,width:'72%',background:'rgba(15,23,42,.07)',borderRadius:4,marginBottom:6}}/>
              <div style={{height:7,width:'80%',background:'rgba(15,23,42,.07)',borderRadius:4}}/>
              {type==='qr' ? (
                <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}><div style={{padding:10,background:'white',borderRadius:12,boxShadow:'0 10px 30px rgba(15,23,42,.18)'}}><QrArt size={120}/></div></div>
              ) : (<>
                <div style={{position:'absolute',[pos==='br'?'right':'left']:16,bottom:80,display:'flex',flexDirection:'column',gap:8,alignItems:pos==='br'?'flex-end':'flex-start'}}>
                  {sel.slice(0,4).map(k=>{ const c=CHANNELS.find(x=>x.k===k); return c?(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'white',borderRadius:20,boxShadow:'0 4px 14px rgba(15,23,42,.16)',fontSize:11.5,fontWeight:600}}><Dot c={c.c}/>{c.l}</div>
                  ):null;})}
                </div>
                <div style={{position:'absolute',[pos==='br'?'right':'left']:16,bottom:16,width:54,height:54,borderRadius:'50%',background:'var(--grad-signature, var(--primary))',display:'grid',placeItems:'center',boxShadow:'0 8px 24px rgba(45,197,106,.45)'}}>{GwI('Chat',{style:{width:24,height:24,color:'white'}})}</div>
              </>)}
            </div>
          </div>
        </div>

        <div style={{fontSize:13.5,fontWeight:800,margin:'4px 2px 10px'}}>Widget đã tạo</div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) 1fr 1fr 1fr 0.7fr 80px',gap:12,padding:'10px 16px',background:'var(--fill-02)',borderBottom:'1px solid var(--fill-04)'}}>
            {['Widget','Loại','Lượt click','Hội thoại','Bật','Thao tác'].map((h,i)=><span key={h} style={{fontSize:10.5,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',textAlign:i>=2&&i<4?'right':(i===5?'right':'left')}}>{h}</span>)}
          </div>
          {items.map(w=>{ const t=TYPES.find(x=>x.k===w.type); return (
            <div key={w.id} style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) 1fr 1fr 1fr 0.7fr 80px',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--fill-03)',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                <span style={{width:30,height:30,borderRadius:8,background:'var(--fill-02)',display:'grid',placeItems:'center',flexShrink:0}}>{GwI(t.icon,{style:{width:15,height:15,color:'var(--label-02)'}})}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{w.name}</div>
                  <div style={{display:'flex',gap:4,marginTop:2}}>{w.chans.map(k=>{ const c=CHANNELS.find(x=>x.k===k); return c?<Dot key={k} c={c.c}/>:null; })}</div>
                </div>
              </div>
              <span style={{fontSize:12.5,color:'var(--label-02)'}}>{t.l}</span>
              <span style={{fontSize:12.5,fontWeight:600,textAlign:'right'}}>{fmt(w.clicks)}</span>
              <span style={{fontSize:12.5,fontWeight:700,textAlign:'right',color:'var(--pr-dark-2)'}}>{fmt(w.chats)}</span>
              <button onClick={()=>tog(w.id)} style={{width:38,height:22,borderRadius:13,border:'none',position:'relative',cursor:'pointer',background:w.on?'var(--primary)':'var(--fill-04)',justifySelf:'start'}}><span style={{position:'absolute',top:2,left:w.on?18:2,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .18s'}}/></button>
              <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                <button className="btn-icon" style={{width:26,height:26}} onClick={()=>copy('link widget')}>{GwI('Copy',{style:{width:13,height:13}})}</button>
                <button className="btn-icon" style={{width:26,height:26}}>{GwI('Edit',{style:{width:13,height:13}})}</button>
              </div>
            </div>
          );})}
        </div>

      </div>
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{GwI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    </div>
  );
}
WidgetStudioGrowth.fullBleed = true;
window.WidgetStudio = WidgetStudioGrowth;
} catch(e){ console.error('widget-growth.jsx', e); }
})();
