/* ============================================================
   followup-module.jsx — Follow-up theo giai đoạn tương tác
   • Cadence (nhịp chăm sóc) cấu hình theo từng giai đoạn pipeline
   • Trang "Follow-up hôm nay" (đến hạn / quá hạn) — Customers flyout
   • Widget Dashboard "Cần follow hôm nay"
   • AI Agent tự gửi ở các giai đoạn an toàn
   ============================================================ */
;(function(){
try {
const { useState: useFu } = React;
const FuI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const Badge = (p)=> window.ChannelBadge ? React.createElement(window.ChannelBadge, p) : null;
const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];
const Av=({n,size=28})=> <span style={{width:size,height:size,borderRadius:'50%',background:avC(n),color:'white',display:'grid',placeItems:'center',fontSize:size*0.4,fontWeight:800,flexShrink:0}}>{(n||'?')[0]}</span>;

/* Giai đoạn pipeline + cadence mặc định */
const STAGES = {
  lead:       {l:'Lead mới',     c:'#2563EB'},
  potential:  {l:'Tiềm năng',    c:'#F59E0B'},
  consulting: {l:'Đang tư vấn',  c:'#7C3AED'},
  quote:      {l:'Báo giá',      c:'#EC4899'},
  contract:   {l:'Hợp đồng',     c:'#0F6E50'},
  won:        {l:'Sau dịch vụ',  c:'#16A34A'},
};
const DEFAULT_CADENCE = {
  lead:       {first:'2 giờ',  repeat:'1 ngày',  max:3, ai:true,  channel:'zalo',     note:'Liên hệ nhanh khi vừa phát sinh lead'},
  potential:  {first:'1 ngày', repeat:'2 ngày',  max:3, ai:true,  channel:'zalo',     note:'Hâm nóng, gửi thông tin dịch vụ'},
  consulting: {first:'1 ngày', repeat:'2 ngày',  max:4, ai:false, channel:'goi',      note:'Nhân viên tư vấn trực tiếp'},
  quote:      {first:'1 ngày', repeat:'3 ngày',  max:3, ai:false, channel:'goi',      note:'Nhắc chốt báo giá trước khi nguội'},
  contract:   {first:'1 ngày', repeat:'3 ngày',  max:2, ai:false, channel:'email',    note:'Hỗ trợ ký kết, hồ sơ'},
  won:        {first:'30 ngày',repeat:'30 ngày', max:6, ai:true,  channel:'zalo',     note:'Chăm sóc lại: tái booking/tái khám/gia hạn'},
};
const CH = { zalo:'Zalo', facebook:'Facebook', email:'Email', goi:'Gọi điện', sms:'SMS' };

/* Dữ liệu mẫu — khách cần follow */
const SEED = [
  { id:'F1', name:'Chị Linh Phạm', ch:'zalo',     stage:'quote',      due:'overdue', last:'2 ngày trước', step:'Nhắc lần 2/3', svc:'Gói VIP Spa Hương Sen', owner:'Hương', amount:'2.4 M ₫' },
  { id:'F2', name:'Anh Quân Trần', ch:'facebook', stage:'consulting', due:'today',   last:'Hôm qua',      step:'Tư vấn lần 2/4', svc:'Niềng răng — Nha khoa', owner:'Khoa', amount:'—' },
  { id:'F3', name:'Chị Mai Anh',   ch:'zalo',     stage:'lead',       due:'today',   last:'3 giờ trước',  step:'Liên hệ lần đầu', svc:'Tư vấn da liễu', owner:'AI Agent', amount:'—' },
  { id:'F4', name:'Cô Thu Hà',     ch:'zalo',     stage:'won',        due:'today',   last:'58 ngày trước',step:'Chăm sóc 60 ngày',svc:'Tái khám định kỳ', owner:'AI Agent', amount:'—' },
  { id:'F5', name:'Anh Đức Anh',   ch:'email',    stage:'contract',   due:'today',   last:'Hôm qua',      step:'Hỗ trợ ký 1/2', svc:'Hợp đồng năm — Anh ngữ', owner:'Minh', amount:'18 M ₫' },
  { id:'F6', name:'Chị Bích Ngọc', ch:'facebook', stage:'potential',  due:'soon',    last:'2 ngày trước', step:'Hâm nóng 2/3', svc:'Combo liệu trình', owner:'Trâm', amount:'—' },
  { id:'F7', name:'Anh Hoàng Long',ch:'zalo',     stage:'quote',      due:'soon',    last:'Hôm nay',      step:'Nhắc lần 1/3', svc:'Gói chụp ảnh cưới', owner:'Hương', amount:'15 M ₫' },
  { id:'F8', name:'Chị Phương Vy',  ch:'sms',     stage:'won',        due:'overdue', last:'95 ngày trước',step:'Chăm sóc 90 ngày',svc:'Gia hạn thẻ thành viên', owner:'AI Agent', amount:'—' },
];
const DUE = { overdue:{l:'Quá hạn',c:'#DC2626',bg:'#FEE2E2'}, today:{l:'Hôm nay',c:'#D97706',bg:'#FEF3C7'}, soon:{l:'Sắp tới',c:'#2563EB',bg:'#DBEAFE'} };

/* ---------- Card hàng follow ---------- */
function FuRow({ f, onDone, onSnooze, compact }){
  const st=STAGES[f.stage], due=DUE[f.due], ai=f.owner==='AI Agent';
  return (
    <div style={{display:'flex', alignItems:'center', gap:12, padding: compact?'10px 12px':'13px 16px', borderBottom:'1px solid var(--fill-03)', background:'white'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
      <div style={{position:'relative', flexShrink:0}}><Av n={f.name} size={compact?30:36}/><span style={{position:'absolute', bottom:-2, right:-2}}><Badge name={f.ch} size={15}/></span></div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:7}}>
          <span style={{fontSize:compact?13:13.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{f.name}</span>
          <span style={{fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10, background:st.c+'18', color:st.c, flexShrink:0}}>{st.l}</span>
        </div>
        <div style={{fontSize:11.5, color:'var(--label-02)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1}}>{f.svc} · {f.step}</div>
      </div>
      {!compact && <div style={{textAlign:'right', flexShrink:0, minWidth:96}}>
        <div style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background:due.bg, color:due.c}}>{due.l}</div>
        <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:3}}>Chạm cuối: {f.last}</div>
      </div>}
      <div style={{display:'flex', alignItems:'center', gap:6, flexShrink:0}}>
        {ai
          ? <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'var(--pr-dark-2)', padding:'4px 9px', borderRadius:8, background:'var(--bg-green)'}}>{FuI('Sparkles',{style:{width:13,height:13}})} AI tự gửi</span>
          : <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--label-02)'}}><Av n={f.owner} size={18}/>{f.owner}</span>}
        <button onClick={()=>onSnooze&&onSnooze(f)} title="Hoãn" className="btn-icon" style={{width:30,height:30}}>{FuI('Clock',{style:{width:15,height:15}})}</button>
        <button onClick={()=>onDone&&onDone(f)} title="Đánh dấu đã follow" style={{width:30,height:30,border:'none',borderRadius:8,background:'var(--primary)',color:'white',display:'grid',placeItems:'center',cursor:'pointer'}}>{FuI('Check',{style:{width:15,height:15}})}</button>
      </div>
    </div>
  );
}

/* ---------- Dashboard widget ---------- */
function FollowupWidget(){
  const [items,setItems]=useFu(SEED.filter(f=>f.due!=='soon'));
  const done=(f)=>setItems(xs=>xs.filter(x=>x.id!==f.id));
  if(items.length===0) return null;
  const overdue=items.filter(f=>f.due==='overdue').length;
  return (
    <div className="card" style={{padding:0, overflow:'hidden', marginBottom:14, flexShrink:0}}>
      <div style={{display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderBottom:'1px solid var(--fill-03)'}}>
        <span style={{width:32,height:32,borderRadius:9,background:'#FEF3C7',color:'#D97706',display:'grid',placeItems:'center'}}>{FuI('Bell',{style:{width:16,height:16}})}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:14, fontWeight:800}}>Cần follow hôm nay</div>
          <div style={{fontSize:11.5, color:'var(--label-02)'}}>{items.length} khách đến hạn{overdue>0 && <span style={{color:'#DC2626', fontWeight:700}}> · {overdue} quá hạn</span>}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={()=>{ window.__acGo && window.__acGo('followup'); }}>Mở tất cả →</button>
      </div>
      {items.slice(0,4).map(f=><FuRow key={f.id} f={f} onDone={done} compact/>)}
    </div>
  );
}

/* ---------- Cadence config ---------- */
function CadenceConfig(){
  const [cad,setCad]=useFu(DEFAULT_CADENCE);
  const [toast,setToast]=useFu('');
  React.useEffect(()=>{ if(toast){ const x=setTimeout(()=>setToast(''),1800); return ()=>clearTimeout(x);} },[toast]);
  const upd=(k,field,v)=>setCad(c=>({...c,[k]:{...c[k],[field]:v}}));
  const inp={height:32,border:'1px solid var(--fill-04)',borderRadius:7,fontSize:12.5,fontFamily:'inherit',padding:'0 9px',outline:'none',background:'white',width:'100%',boxSizing:'border-box'};
  return (
    <div className="card" style={{padding:0, overflow:'hidden'}}>
      <div style={{display:'flex', alignItems:'center', padding:'14px 16px', borderBottom:'1px solid var(--fill-03)'}}>
        <div><div style={{fontSize:14, fontWeight:800}}>Nhịp chăm sóc theo giai đoạn</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Cấu hình cadence follow-up cho từng bước pipeline</div></div>
        <span style={{flex:1}}/>
        <button className="btn btn-primary btn-sm" onClick={()=>setToast('Đã lưu cadence')}>{FuI('Check',{style:{width:14,height:14}})} Lưu cadence</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr 0.7fr 1fr 0.9fr', gap:10, padding:'9px 16px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
        {['Giai đoạn','Chạm đầu sau','Lặp lại','Tối đa','Kênh','AI tự gửi'].map(h=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)'}}>{h}</span>)}
      </div>
      {Object.keys(STAGES).map(k=>{ const st=STAGES[k], c=cad[k]; return (
        <div key={k} style={{display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr 0.7fr 1fr 0.9fr', gap:10, padding:'11px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
          <div><span style={{display:'inline-flex', alignItems:'center', gap:7, fontSize:13, fontWeight:700, color:st.c}}><span style={{width:8,height:8,borderRadius:4,background:st.c}}/>{st.l}</span><div style={{fontSize:10.5, color:'var(--label-03)', marginTop:2}}>{c.note}</div></div>
          <input value={c.first} onChange={e=>upd(k,'first',e.target.value)} style={inp}/>
          <input value={c.repeat} onChange={e=>upd(k,'repeat',e.target.value)} style={inp}/>
          <input type="number" value={c.max} onChange={e=>upd(k,'max',+e.target.value)} style={inp}/>
          <select value={c.channel} onChange={e=>upd(k,'channel',e.target.value)} style={inp}>{Object.entries(CH).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          <button onClick={()=>upd(k,'ai',!c.ai)} style={{width:40,height:23,borderRadius:14,border:'none',position:'relative',cursor:'pointer',justifySelf:'start',background:c.ai?'var(--primary)':'var(--fill-04)',transition:'background .18s'}}><span style={{position:'absolute',top:2,left:c.ai?19:2,width:19,height:19,borderRadius:'50%',background:'white',transition:'left .18s'}}/></button>
        </div>
      );})}
      {toast && <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:1400, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{FuI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    </div>
  );
}

/* ---------- Module page ---------- */
function FollowupModule({ embed }={}){
  const [tab,setTab]=useFu('today');
  const [stage,setStage]=useFu('all');
  const [q,setQ]=useFu('');
  const [items,setItems]=useFu(SEED);
  const [toast,setToast]=useFu('');
  React.useEffect(()=>{ if(toast){ const x=setTimeout(()=>setToast(''),1800); return ()=>clearTimeout(x);} },[toast]);
  const done=(f)=>{ setItems(xs=>xs.filter(x=>x.id!==f.id)); setToast('Đã đánh dấu follow "'+f.name+'"'); };
  const snooze=(f)=>{ setItems(xs=>xs.map(x=>x.id===f.id?{...x, due:'soon'}:x)); setToast('Đã hoãn "'+f.name+'"'); };
  const list=items.filter(f=> (stage==='all'||f.stage===stage) && (!q.trim()||(f.name+' '+f.svc).toLowerCase().includes(q.toLowerCase())));
  const counts={ all:items.length, overdue:items.filter(f=>f.due==='overdue').length, today:items.filter(f=>f.due==='today').length, ai:items.filter(f=>f.owner==='AI Agent').length };
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      {!embed && (<div className="topbar">
        <h1>Follow-up</h1>
        <span className="crumb">Chăm sóc theo giai đoạn tương tác · cadence tự động</span>
        <span className="spacer"/>
        <div style={{display:'flex', background:'var(--fill-03)', padding:3, borderRadius:8, gap:2}}>
          {[{k:'today',l:'Cần follow'},{k:'cadence',l:'Cấu hình cadence'}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'6px 14px', borderRadius:6, fontSize:13, fontWeight:600, fontFamily:'inherit', border:'none', cursor:'pointer', background:tab===t.k?'white':'transparent', color:tab===t.k?'var(--label-01)':'var(--label-02)', boxShadow:tab===t.k?'var(--shadow-sm)':'none'}}>{t.l}</button>
          ))}
        </div>
      </div>)}
      {embed && (<div style={{display:'flex', gap:2, padding:'8px 0 0', background:'var(--fill-02)'}}>
        {[{k:'today',l:'Cần follow'},{k:'cadence',l:'Cấu hình cadence'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'6px 14px', borderRadius:6, fontSize:13, fontWeight:600, fontFamily:'inherit', border:'none', cursor:'pointer', background:tab===t.k?'white':'transparent', color:tab===t.k?'var(--label-01)':'var(--label-02)', boxShadow:tab===t.k?'var(--shadow-sm)':'none'}}>{t.l}</button>
        ))}
      </div>)}
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'18px 22px', background:'var(--fill-02)'}}>
        {tab==='today' ? (<>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14}}>
            {[{l:'Tổng cần follow',v:counts.all,c:'#2563EB',i:'Users'},{l:'Quá hạn',v:counts.overdue,c:'#DC2626',i:'Clock'},{l:'Đến hạn hôm nay',v:counts.today,c:'#D97706',i:'Bell'},{l:'AI tự xử lý',v:counts.ai,c:'#0E9B94',i:'Sparkles'}].map(k=>(
              <div key={k.l} className="card" style={{padding:14, display:'flex', alignItems:'center', gap:11}}>
                <span style={{width:34,height:34,borderRadius:9,background:k.c+'18',color:k.c,display:'grid',placeItems:'center'}}>{FuI(k.i,{style:{width:17,height:17}})}</span>
                <div><div style={{fontSize:11.5,color:'var(--label-02)',fontWeight:600}}>{k.l}</div><div style={{fontSize:19,fontWeight:800,lineHeight:1.1}}>{k.v}</div></div>
              </div>
            ))}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap'}}>
            <div style={{position:'relative', flex:'1 1 200px', minWidth:180, maxWidth:280}}>
              {FuI('Search',{style:{position:'absolute', left:11, top:9, width:14, height:14, color:'var(--label-03)'}})}
              <input placeholder="Tìm khách, dịch vụ…" value={q} onChange={e=>setQ(e.target.value)} style={{height:34, width:'100%', paddingLeft:34, border:'1px solid var(--fill-04)', borderRadius:9, fontSize:12.5, outline:'none', fontFamily:'inherit', boxSizing:'border-box'}}/>
            </div>
            <select value={stage} onChange={e=>setStage(e.target.value)} style={{height:34, border:'1px solid var(--fill-04)', borderRadius:9, fontSize:12.5, fontFamily:'inherit', background:'white', padding:'0 10px', cursor:'pointer'}}>
              <option value="all">Tất cả giai đoạn</option>{Object.entries(STAGES).map(([k,s])=><option key={k} value={k}>{s.l}</option>)}
            </select>
          </div>
          <div className="card" style={{padding:0, overflow:'hidden'}}>
            {list.length===0 ? <div style={{padding:'40px', textAlign:'center', color:'var(--label-03)', fontSize:13}}>🎉 Không còn khách nào cần follow.</div>
              : list.map(f=><FuRow key={f.id} f={f} onDone={done} onSnooze={snooze}/>)}
          </div>
        </>) : <CadenceConfig/>}
      </div>
      {toast && <div style={{position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--label-01)', color:'white', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:1400, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{FuI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    </div>
  );
}

window.FollowupModule = FollowupModule;
window.FollowupWidget = FollowupWidget;
} catch(e){ console.error('followup-module.jsx', e); }
})();
