/* ============================================================
   crm-docs.jsx — Báo giá & Hợp đồng (Customers / CRM)
   Dữ liệu mẫu ngành dịch vụ: Spa, Nha khoa, Phòng khám, Anh ngữ…
   ============================================================ */
;(function(){
try {
const { useState: useCD } = React;
const CdI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const fmtV=(n)=> (n||0).toLocaleString('vi-VN')+' ₫';
const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];
const Av=({n,size=26})=> <span style={{width:size,height:size,borderRadius:'50%',background:avC(n),color:'white',display:'grid',placeItems:'center',fontSize:size*0.42,fontWeight:800,flexShrink:0}}>{(n||'?')[0]}</span>;
const sst={height:34, border:'1px solid var(--fill-04)', borderRadius:9, fontSize:12.5, fontFamily:'inherit', background:'white', color:'var(--label-01)', padding:'0 10px', cursor:'pointer', outline:'none'};

function Kpi({l,v,sub,c,ic}){
  return (<div className="card" style={{padding:14, display:'flex', alignItems:'center', gap:11}}>
    <span style={{width:34,height:34,borderRadius:9,background:c+'18',color:c,display:'grid',placeItems:'center',flexShrink:0}}>{CdI(ic,{style:{width:17,height:17}})}</span>
    <div style={{minWidth:0}}><div style={{fontSize:11.5,color:'var(--label-02)',fontWeight:600,whiteSpace:'nowrap'}}>{l}</div><div style={{fontSize:19,fontWeight:800,lineHeight:1.2}}>{v}</div>{sub&&<div style={{fontSize:10.5,color:'var(--label-03)'}}>{sub}</div>}</div>
  </div>);
}
const Shell=({title,sub,kpis,filters,cta,children})=>(
  <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    <div className="topbar"><h1>{title}</h1><span className="crumb">{sub}</span><span className="spacer"/>{cta}</div>
    <div className="scroll" style={{flex:1,overflow:'auto',padding:'18px 22px',background:'var(--fill-02)'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>{kpis}</div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:14}}>{filters}</div>
      {children}
    </div>
  </div>
);
const Table=({cols,children})=>(
  <div className="card" style={{padding:0,overflow:'hidden'}}>
    <div style={{display:'grid',gridTemplateColumns:cols.map(c=>c.w).join(' '),gap:14,padding:'10px 16px',borderBottom:'1px solid var(--fill-04)',background:'var(--fill-02)'}}>
      {cols.map((c,i)=><span key={i} style={{fontSize:10.5,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',textAlign:c.r?'right':'left'}}>{c.l}</span>)}
    </div>
    {children}
  </div>
);

/* ---------------- BÁO GIÁ ---------------- */
const Q_STATUS={ draft:{l:'Nháp',c:'#94A3B8'}, sent:{l:'Đã gửi',c:'#2A6FDB'}, accepted:{l:'Đã chốt',c:'#1B9E5A'}, expired:{l:'Hết hạn',c:'#C9820B'}, rejected:{l:'Từ chối',c:'#DC2626'} };
const QUOTES=[
  {id:'BG-2041', cust:'Spa Hương Sen', item:'Liệu trình Detox 10 buổi', total:9_500_000, status:'sent', owner:'Hương', date:'12/06/2026', valid:'30/06/2026'},
  {id:'BG-2040', cust:'Nha khoa Minh Châu', item:'Gói niềng răng Invisalign', total:48_000_000, status:'accepted', owner:'Khoa', date:'11/06/2026', valid:'25/06/2026'},
  {id:'BG-2039', cust:'Thẩm mỹ viện Á Đông', item:'Combo trẻ hoá da 5 buổi', total:18_000_000, status:'sent', owner:'Trâm', date:'10/06/2026', valid:'24/06/2026'},
  {id:'BG-2038', cust:'Trung tâm Anh ngữ Sao Mai', item:'Khoá IELTS 6.5 (3 tháng)', total:12_600_000, status:'draft', owner:'Minh', date:'10/06/2026', valid:'—'},
  {id:'BG-2037', cust:'Phòng khám Quốc tế', item:'Gói khám sức khoẻ tổng quát', total:6_800_000, status:'accepted', owner:'Hương', date:'09/06/2026', valid:'20/06/2026'},
  {id:'BG-2036', cust:'Spa Hương Sen', item:'Liệu trình massage trị liệu', total:4_200_000, status:'expired', owner:'Hương', date:'02/06/2026', valid:'09/06/2026'},
  {id:'BG-2035', cust:'Nha khoa Minh Châu', item:'Cấy ghép Implant 2 trụ', total:36_000_000, status:'rejected', owner:'Khoa', date:'01/06/2026', valid:'15/06/2026'},
];
function QuotesModule(){
  const [q,setQ]=useCD(''); const [st,setSt]=useCD('all');
  const [rows,setRows]=useCD(QUOTES);
  const [menu,setMenu]=useCD(null); const [toast,setToast]=useCD('');
  const [sel,setSel]=useCD(null);
  const [aiOpen,setAiOpen]=useCD(false); const [aiPrompt,setAiPrompt]=useCD(''); const [aiDraft,setAiDraft]=useCD(null); const [aiSent,setAiSent]=useCD('');
  const genAI=()=>{ const t=aiPrompt.toLowerCase(); setAiSent(aiPrompt); const nha=/niềng|invisalign|nha/.test(t); const cust=/lan/.test(t)?'Chị Lan':/quân/.test(t)?'Anh Quân':'Khách hàng';
    const lines=[{n: nha?'Niềng Invisalign toàn hàm':/spa|da|trị liệu/.test(t)?'Trị liệu da chuyên sâu (8 buổi)':'Gói dịch vụ tiêu chuẩn', q:1, p: nha?45000000:4000000},{n:'Tư vấn + chụp/khám', q:1, p:500000}];
    const sub=lines.reduce((s,l)=>s+l.p*l.q,0); const vip=/vip|thân thiết|kim cương/.test(t)?Math.round(sub*0.05):0; const vch=/voucher|mã|ưu đãi/.test(t)?500000:0; const vat=Math.round((sub-vip-vch)*0.08);
    setAiDraft({cust, lines, sub, vip, vch, vat, total:sub-vip-vch+vat, inst:/trả góp|góp/.test(t)}); setAiPrompt(''); };
  const saveAI=()=>{ const d=aiDraft; const id='BG-'+(2050+rows.length); setRows(rs=>[{id, cust:d.cust, item:d.lines[0].n, total:d.total, status:'sent', valid:'30 ngày', owner:'AppChat AI', date:'Hôm nay'},...rs]); setAiOpen(false); setAiDraft(null); setAiPrompt(''); setAiSent(''); setToast('AppChat AI đã tạo báo giá '+id+' cho '+d.cust); };
  React.useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(''),2400); return ()=>clearTimeout(t); } },[toast]);
  const win=(x)=>{ setRows(rs=>rs.map(r=>r.id===x.id?{...r,status:'accepted'}:r)); if(window.AppFlow)window.AppFlow.push({type:'quote_won', cust:x.cust, ref:x.id, total:x.total}); setMenu(null); setSel(null); setToast('Đã chốt “'+x.id+'” → tạo Hợp đồng cho '+x.cust); };
  const list=rows.filter(x=>(st==='all'||x.status===st)&&(!q.trim()||(x.id+x.cust+x.item).toLowerCase().includes(q.toLowerCase())));
  const sum=rows.filter(x=>x.status==='accepted').reduce((a,x)=>a+x.total,0);
  const cnt=(k)=>rows.filter(x=>x.status===k).length;
  const FUNNEL=[['draft','Nháp','#94A3B8'],['sent','Đã gửi','#2A6FDB'],['accepted','Đã chốt','#1B9E5A'],['expired','Hết hạn','#C9820B'],['rejected','Từ chối','#DC2626']];
  return (<><Shell title="Báo giá" sub="Quản lý báo giá dịch vụ · gửi & theo dõi chốt"
    cta={<>{<button type="button" className="btn btn-primary btn-sm" onClick={()=>{setRows(rs=>[{id:'BG-'+(2050+rs.length),cust:'Khách mới',item:'(nháp)',total:0,status:'draft',valid:'30 ngày',owner:'Tôi',date:'Hôm nay'},...rs]);setToast('Đã tạo báo giá nháp');}}>{CdI('Plus',{style:{width:14,height:14}})} Báo giá</button>}<button type="button" className="btn btn-primary btn-sm" onClick={()=>{setAiDraft(null);setAiOpen(true);}}>{CdI('Sparkles',{style:{width:14,height:14}})} Trợ lý AI</button></>}
    kpis={<><Kpi l="Tổng báo giá" v={rows.length} c="#2A6FDB" ic="FileText"/><Kpi l="Đã gửi" v={cnt('sent')} c="#6E48E6" ic="Send"/><Kpi l="Đã chốt" v={cnt('accepted')} c="#1B9E5A" ic="Check"/><Kpi l="Giá trị chốt" v={(sum/1e6).toFixed(1)+'tr ₫'} c="#0E9B94" ic="TrendUp"/></>}
    filters={<><div style={{position:'relative',flex:'1 1 200px',minWidth:180,maxWidth:280}}>{CdI('Search',{style:{position:'absolute',left:11,top:9,width:14,height:14,color:'var(--label-03)'}})}<input placeholder="Tìm báo giá, khách hàng…" value={q} onChange={e=>setQ(e.target.value)} style={{height:34,width:'100%',paddingLeft:34,border:'1px solid var(--fill-04)',borderRadius:9,fontSize:12.5,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[['all','Tất cả',''],...FUNNEL.map(f=>[f[0],f[1],f[2]])].map(([k,l,c])=>{const on=st===k;return <button key={k} onClick={()=>setSt(k)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:20,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?(c||'var(--primary)'):'var(--fill-04)'),background:on?((c||'var(--primary)')+'14'):'white',color:on?(c||'var(--pr-dark-2)'):'var(--label-02)'}}>{c&&<span style={{width:7,height:7,borderRadius:4,background:c}}/>}{l}{k!=='all'&&<span style={{fontSize:10.5,opacity:.7}}>{cnt(k)}</span>}</button>;})}</div></>}>
    {/* Pipeline funnel bar */}
    <div className="card" style={{padding:'14px 16px',marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',marginBottom:11}}>Phễu báo giá</div>
      <div style={{display:'flex',gap:8,alignItems:'stretch'}}>{FUNNEL.map((f,i)=>{const n=cnt(f[0]);const mx=Math.max(...FUNNEL.map(g=>cnt(g[0])),1);return(
        <div key={f[0]} onClick={()=>setSt(f[0])} style={{flex:1,cursor:'pointer',padding:'10px 12px',borderRadius:10,background:f[2]+'10',border:'1px solid '+f[2]+'30'}}>
          <div style={{fontSize:11.5,fontWeight:700,color:f[2],marginBottom:6}}>{f[1]}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--label-01)',lineHeight:1}}>{n}</div>
          <div style={{height:4,borderRadius:2,background:f[2]+'22',marginTop:8,overflow:'hidden'}}><div style={{width:(n/mx*100)+'%',height:'100%',background:f[2]}}/></div>
        </div>);})}</div>
    </div>
    <Table cols={[{l:'Mã báo giá',w:'1fr'},{l:'Khách hàng',w:'1.3fr'},{l:'Dịch vụ',w:'1.8fr'},{l:'Giá trị',w:'1fr',r:true},{l:'Trạng thái',w:'1fr'},{l:'Hiệu lực',w:'1fr'},{l:'',w:'44px',r:true}]}>
      {list.map(x=>{const s=Q_STATUS[x.status];return(
        <div key={x.id} onClick={()=>setSel(x)} style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 1.8fr 1fr 1fr 1fr 44px',gap:14,padding:'11px 16px',borderBottom:'1px solid var(--fill-03)',alignItems:'center',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
          <span style={{fontSize:12,fontFamily:'monospace',fontWeight:700,color:'var(--pr-dark-2)'}}>{x.id}</span>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><Av n={x.cust} size={24}/><span style={{fontSize:12.5,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.cust}</span></div>
          <span style={{fontSize:12.5,color:'var(--label-02)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.item}</span>
          <span style={{fontSize:13,fontWeight:700,color:'var(--pr-dark-2)',textAlign:'right'}}>{fmtV(x.total)}</span>
          <span><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:700,color:s.c}}><span style={{width:6,height:6,borderRadius:3,background:s.c}}/>{s.l}</span></span>
          <span style={{fontSize:11.5,color:'var(--label-02)'}}>{x.valid}</span>
          <div style={{position:'relative',justifySelf:'end'}} onClick={e=>e.stopPropagation()}>
            <button className="btn-icon" style={{width:28,height:28}} onClick={()=>setMenu(m=>m===x.id?null:x.id)}>{CdI('More',{style:{width:15,height:15}})}</button>
            {menu===x.id && <><div onClick={()=>setMenu(null)} style={{position:'fixed',inset:0,zIndex:60}}/><div style={{position:'absolute',right:0,top:32,zIndex:61,width:230,background:'white',border:'1px solid var(--fill-04)',borderRadius:10,boxShadow:'0 16px 40px rgba(17,24,39,.2)',padding:5}}>
              <button onClick={()=>{setSel(x);setMenu(null);}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',border:'none',background:'transparent',borderRadius:7,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12.5,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{CdI('FileText',{style:{width:15,height:15,color:'var(--label-02)'}})}<span style={{flex:1}}>Xem báo giá</span></button>
              {x.status!=='accepted' ? <button onClick={()=>win(x)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',border:'none',background:'transparent',borderRadius:7,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12.5,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{CdI('Check',{style:{width:15,height:15,color:'#16A34A'}})}<span style={{flex:1}}>Chốt &amp; tạo Hợp đồng</span></button> : <div style={{padding:'9px 10px',fontSize:12,color:'var(--label-03)',display:'flex',gap:8,alignItems:'center'}}>{CdI('Check',{style:{width:14,height:14,color:'#16A34A'}})}Đã chốt → đã tạo HĐ</div>}
              <div style={{fontSize:10.5,color:'var(--label-03)',padding:'4px 10px 2px',lineHeight:1.4,borderTop:'1px solid var(--fill-03)',marginTop:3}}>Báo giá → Hợp đồng → Đơn hàng → cập nhật Pipeline.</div>
            </div></>}
          </div>
        </div>);})}
    </Table>
    {sel && (()=>{ const s=Q_STATUS[sel.status]; const sub=Math.round(sel.total/1.08); const vat=sel.total-sub; return (
      <div onClick={()=>setSel(null)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.45)',zIndex:1300,display:'flex',justifyContent:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:440,maxWidth:'92vw',height:'100%',background:'white',display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px rgba(17,24,39,.2)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--fill-04)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:36,height:36,borderRadius:10,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center'}}>{CdI('FileText',{style:{width:18,height:18}})}</span>
            <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>{sel.id}</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Báo giá dịch vụ</div></div>
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:700,color:s.c}}><span style={{width:7,height:7,borderRadius:4,background:s.c}}/>{s.l}</span>
            <button className="btn-icon" onClick={()=>setSel(null)}>{CdI('Close',{style:{width:18,height:18}})||'✕'}</button>
          </div>
          <div className="scroll" style={{flex:1,overflowY:'auto',padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:11,padding:'12px 14px',background:'var(--fill-02)',borderRadius:11,marginBottom:16}}>
              <Av n={sel.cust} size={40}/><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{sel.cust}</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Phụ trách: {sel.owner}</div></div>
            </div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',marginBottom:8}}>Chi tiết dịch vụ</div>
            <div style={{border:'1px solid var(--fill-04)',borderRadius:11,overflow:'hidden',marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',borderBottom:'1px solid var(--fill-03)'}}><span style={{fontSize:13,fontWeight:600}}>{sel.item}</span><span style={{fontSize:13,fontWeight:700}}>{fmtV(sub)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',fontSize:12,color:'var(--label-02)'}}><span>Thuế VAT (8%)</span><span>{fmtV(vat)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'var(--bg-green)',borderTop:'1px solid var(--fill-03)'}}><span style={{fontSize:13,fontWeight:800}}>Tổng cộng</span><span style={{fontSize:16,fontWeight:800,color:'var(--pr-dark-2)'}}>{fmtV(sel.total)}</span></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div style={{padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10}}><div style={{fontSize:10.5,color:'var(--label-03)'}}>Ngày tạo</div><div style={{fontSize:13,fontWeight:600}}>{sel.date}</div></div>
              <div style={{padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10}}><div style={{fontSize:10.5,color:'var(--label-03)'}}>Hiệu lực đến</div><div style={{fontSize:13,fontWeight:600}}>{sel.valid}</div></div>
            </div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',marginBottom:8}}>Luồng tiếp theo</div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--label-02)'}}>Báo giá <span style={{color:'var(--label-04)'}}>›</span> <b style={{color:'var(--pr-dark-2)'}}>Hợp đồng</b> <span style={{color:'var(--label-04)'}}>›</span> Đơn hàng <span style={{color:'var(--label-04)'}}>›</span> Pipeline</div>
          </div>
          <div style={{padding:14,borderTop:'1px solid var(--fill-04)',display:'flex',gap:8}}>
            <button className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:'center'}}>{CdI('Send',{style:{width:14,height:14}})} Gửi lại</button>
            {sel.status!=='accepted' && <button onClick={()=>win(sel)} className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{CdI('Check',{style:{width:14,height:14}})} Chốt &amp; tạo HĐ</button>}
          </div>
        </div>
      </div>
    );})()}
    {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{CdI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    {aiOpen && (()=>{ const fm=(n)=>(n||0).toLocaleString('vi-VN'); return (
      <div onClick={()=>setAiOpen(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.4)',zIndex:2000,display:'flex',justifyContent:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:440,maxWidth:'94vw',height:'100%',display:'flex',flexDirection:'column',background:'white',boxShadow:'-8px 0 40px rgba(17,24,39,.2)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--fill-03)',display:'flex',alignItems:'center',gap:10}}><span style={{width:34,height:34,borderRadius:10,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center'}}>{CdI('Sparkles',{style:{width:17,height:17}})}</span><div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>Tạo báo giá bằng AppChat AI</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Gõ mô tả — AI lấy giá từ danh mục, áp ưu đãi & voucher</div></div><button className="btn-icon" onClick={()=>setAiOpen(false)}>{CdI('Close',{style:{width:18,height:18}})||'✕'}</button></div>
          <div className="scroll" style={{flex:1,overflowY:'auto',padding:'18px 20px',display:'flex',flexDirection:'column',gap:12,background:'var(--fill-02)'}}>
            <div style={{display:'flex',gap:9,alignItems:'flex-start'}}>
              <span style={{width:30,height:30,borderRadius:9,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{CdI('Sparkles',{style:{width:15,height:15}})}</span>
              <div style={{background:'white',border:'1px solid var(--fill-04)',borderRadius:'4px 12px 12px 12px',padding:'11px 13px',fontSize:13,lineHeight:1.55,maxWidth:'85%'}}>Xin chào! Mình là AppChat AI. Mô tả nhu cầu báo giá — mình sẽ lấy giá từ danh mục, áp ưu đãi &amp; voucher rồi soạn bản nháp để bạn duyệt.</div>
            </div>
            {aiDraft && <div style={{display:'flex',justifyContent:'flex-end'}}><div style={{background:'var(--pr-dark-1)',color:'white',borderRadius:'12px 4px 12px 12px',padding:'10px 13px',fontSize:13,lineHeight:1.5,maxWidth:'85%'}}>{aiSent}</div></div>}
            {aiDraft && (()=>{ const d=aiDraft; return (
              <div style={{display:'flex',gap:9,alignItems:'flex-start'}}>
                <span style={{width:30,height:30,borderRadius:9,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{CdI('Sparkles',{style:{width:15,height:15}})}</span>
                <div style={{flex:1,border:'1px solid var(--fill-04)',borderRadius:'4px 12px 12px 12px',overflow:'hidden',maxWidth:'88%',background:'white'}}>
                  <div style={{padding:'9px 13px',fontSize:12,color:'var(--label-02)',lineHeight:1.5,borderBottom:'1px solid var(--fill-03)'}}>Đây là báo giá mình đề xuất cho <b>{d.cust}</b>. Bạn duyệt &amp; lưu, hoặc nhắn điều chỉnh nhé.</div>
                  <div style={{padding:'12px 14px',fontSize:12.5}}>
                    {d.lines.map((l,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span style={{color:'var(--label-02)'}}>{l.n} ×{l.q}</span><span style={{fontWeight:600}}>{fm(l.p*l.q)}</span></div>))}
                    <div style={{borderTop:'1px solid var(--fill-03)',margin:'6px 0',paddingTop:6}}/>
                    {d.vip>0 && <div style={{display:'flex',justifyContent:'space-between',color:'#DC2626'}}><span>Ưu đãi VIP −5%</span><span>−{fm(d.vip)}</span></div>}
                    {d.vch>0 && <div style={{display:'flex',justifyContent:'space-between',color:'#DC2626'}}><span>Voucher SKIN15</span><span>−{fm(d.vch)}</span></div>}
                    <div style={{display:'flex',justifyContent:'space-between',color:'var(--label-02)'}}><span>VAT 8%</span><span>{fm(d.vat)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:7,padding:'8px 10px',background:'var(--bg-green)',borderRadius:8}}><span style={{fontWeight:800}}>Tổng cộng</span><span style={{fontWeight:800,color:'var(--pr-dark-2)'}}>{fm(d.total)} ₫</span></div>
                  </div>
                  <div style={{display:'flex',gap:8,padding:'10px 14px',borderTop:'1px solid var(--fill-03)'}}><button onClick={saveAI} className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{CdI('Check',{style:{width:13,height:13}})} Duyệt &amp; lưu báo giá</button><button onClick={genAI} className="btn btn-ghost btn-sm">Sinh lại</button></div>
                </div>
              </div>
            );})()}
          </div>
          <div style={{padding:'12px 14px',borderTop:'1px solid var(--fill-03)',background:'white'}}>
            {!aiDraft && <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:9}}>{['Niềng Invisalign cho chị Lan, trả góp, ưu đãi VIP','Trị liệu da 8 buổi, có voucher'].map(x=>(<button key={x} onClick={()=>setAiPrompt(x)} style={{padding:'6px 11px',borderRadius:14,border:'1px solid var(--fill-04)',background:'var(--fill-02)',cursor:'pointer',fontSize:11.5,fontFamily:'inherit',color:'var(--label-02)'}}>{x}</button>))}</div>}
            <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
              <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={1} placeholder="Nhắn cho AppChat AI…" onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); if(aiPrompt.trim())genAI(); } }} style={{flex:1,padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:12,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'none',lineHeight:1.4,maxHeight:90}}/>
              <button onClick={genAI} disabled={!aiPrompt.trim()} className="btn btn-sm" style={{flexShrink:0,justifyContent:'center',background:'var(--primary)',color:'white',border:'none',opacity:aiPrompt.trim()?1:.5,width:40,height:40,borderRadius:'50%',padding:0}}>{CdI('Send',{style:{width:16,height:16}})}</button>
            </div>
          </div>
        </div>
      </div>
    );})()}
  </Shell></>);
}

const C_STATUS={ draft:{l:'Nháp',c:'#94A3B8'}, sent:{l:'Chờ ký',c:'#2A6FDB'}, signed:{l:'Đã ký',c:'#1B9E5A'}, expired:{l:'Hết hạn',c:'#C9820B'} };
const CONTRACTS=[
  {id:'HD-3041', cust:'Chị Lan', item:'Liệu trình Spa cao cấp 12 buổi', total:24000000, status:'signed', valid:'12 tháng', owner:'Trâm', date:'Hôm nay'},
  {id:'HD-3040', cust:'Anh Quân', item:'Niềng Invisalign toàn hàm', total:48600000, status:'sent', valid:'24 tháng', owner:'Khoa', date:'Hôm qua'},
  {id:'HD-3039', cust:'Cô Mai', item:'Gói khám sức khoẻ doanh nghiệp', total:120000000, status:'draft', valid:'12 tháng', owner:'Hương', date:'2 ngày trước'},
];
function ContractsModule(){
  const [q,setQ]=useCD(''); const [st,setSt]=useCD('all');
  const [rows,setRows]=useCD(CONTRACTS);
  const [menu,setMenu]=useCD(null); const [toast,setToast]=useCD('');
  const [sel,setSel]=useCD(null);
  const [aiOpen,setAiOpen]=useCD(false); const [aiPrompt,setAiPrompt]=useCD(''); const [aiDraft,setAiDraft]=useCD(null); const [aiSent,setAiSent]=useCD('');
  const fm=(n)=>(n||0).toLocaleString('vi-VN');
  const genAI=()=>{ const t=aiPrompt.toLowerCase(); setAiSent(aiPrompt); const cust=/lan/.test(t)?'Chị Lan':/quân/.test(t)?'Anh Quân':/mai/.test(t)?'Cô Mai':'Khách hàng';
    const item=/niềng|invisalign|nha/.test(t)?'Niềng Invisalign toàn hàm':/spa|liệu trình|da/.test(t)?'Liệu trình Spa cao cấp 12 buổi':/khám|doanh nghiệp/.test(t)?'Gói khám sức khoẻ doanh nghiệp':'Hợp đồng dịch vụ';
    const total=/niềng|invisalign/.test(t)?48600000:/khám|doanh nghiệp/.test(t)?120000000:24000000;
    const term=/24|2 năm/.test(t)?'24 tháng':'12 tháng';
    setAiDraft({cust,item,total,term,terms:['Thanh toán 50% khi ký, 50% theo tiến độ','Bảo hành dịch vụ theo chính sách','Tự gia hạn nếu không báo trước 30 ngày']}); setAiPrompt(''); };
  const saveAI=()=>{ const d=aiDraft; const id='HD-'+(3042+rows.length); setRows(rs=>[{id,cust:d.cust,item:d.item,total:d.total,status:'sent',valid:d.term,owner:'AppChat AI',date:'Hôm nay'},...rs]); setAiOpen(false); setAiDraft(null); setAiPrompt(''); setAiSent(''); setToast('AppChat AI đã tạo hợp đồng '+id+' cho '+d.cust); };
  React.useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(''),2400); return ()=>clearTimeout(t); } },[toast]);
  const sign=(x)=>{ setRows(rs=>rs.map(r=>r.id===x.id?{...r,status:'signed'}:r)); if(window.AppFlow)window.AppFlow.push({type:'contract_signed',cust:x.cust,ref:x.id,total:x.total}); setMenu(null); setSel(null); setToast('Đã ký “'+x.id+'” → tạo Đơn hàng cho '+x.cust); };
  const list=rows.filter(x=>(st==='all'||x.status===st)&&(!q.trim()||(x.id+x.cust+x.item).toLowerCase().includes(q.toLowerCase())));
  const cnt=(k)=>rows.filter(x=>x.status===k).length;
  const sum=rows.filter(x=>x.status==='signed').reduce((a,x)=>a+x.total,0);
  const FUNNEL=[['draft','Nháp','#94A3B8'],['sent','Chờ ký','#2A6FDB'],['signed','Đã ký','#1B9E5A'],['expired','Hết hạn','#C9820B']];
  return (<><Shell title="Hợp đồng" sub="Quản lý hợp đồng dịch vụ · ký & gia hạn"
    cta={<>{<button type="button" className="btn btn-primary btn-sm" onClick={()=>{setRows(rs=>[{id:'HD-'+(3042+rs.length),cust:'Khách mới',item:'(nháp)',total:0,status:'draft',valid:'12 tháng',owner:'Tôi',date:'Hôm nay'},...rs]);setToast('Đã tạo hợp đồng nháp');}}>{CdI('Plus',{style:{width:14,height:14}})} Hợp đồng</button>}<button type="button" className="btn btn-primary btn-sm" onClick={()=>{setAiDraft(null);setAiOpen(true);}}>{CdI('Sparkles',{style:{width:14,height:14}})} Trợ lý AI</button></>}
    kpis={<><Kpi l="Tổng hợp đồng" v={rows.length} c="#2A6FDB" ic="Book"/><Kpi l="Chờ ký" v={cnt('sent')} c="#6E48E6" ic="Send"/><Kpi l="Đã ký" v={cnt('signed')} c="#1B9E5A" ic="Check"/><Kpi l="Giá trị đã ký" v={(sum/1e6).toFixed(1)+'tr ₫'} c="#0E9B94" ic="TrendUp"/></>}
    filters={<><div style={{position:'relative',flex:'1 1 200px',minWidth:180,maxWidth:280}}>{CdI('Search',{style:{position:'absolute',left:11,top:9,width:14,height:14,color:'var(--label-03)'}})}<input placeholder="Tìm hợp đồng, khách hàng…" value={q} onChange={e=>setQ(e.target.value)} style={{height:34,width:'100%',paddingLeft:34,border:'1px solid var(--fill-04)',borderRadius:9,fontSize:12.5,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[['all','Tất cả',''],...FUNNEL.map(f=>[f[0],f[1],f[2]])].map(([k,l,c])=>{const on=st===k;return <button key={k} onClick={()=>setSt(k)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:20,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:'1px solid '+(on?(c||'var(--primary)'):'var(--fill-04)'),background:on?((c||'var(--primary)')+'14'):'white',color:on?(c||'var(--pr-dark-2)'):'var(--label-02)'}}>{c&&<span style={{width:7,height:7,borderRadius:4,background:c}}/>}{l}{k!=='all'&&<span style={{fontSize:10.5,opacity:.7}}>{cnt(k)}</span>}</button>;})}</div></>}>
    <Table cols={[{l:'Mã hợp đồng',w:'1fr'},{l:'Khách hàng',w:'1.3fr'},{l:'Dịch vụ',w:'1.8fr'},{l:'Giá trị',w:'1fr',r:true},{l:'Trạng thái',w:'1fr'},{l:'Hiệu lực',w:'1fr'},{l:'',w:'44px',r:true}]}>
      {list.map(x=>{const s=C_STATUS[x.status];return(
        <div key={x.id} onClick={()=>setSel(x)} style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 1.8fr 1fr 1fr 1fr 44px',gap:14,padding:'11px 16px',borderBottom:'1px solid var(--fill-03)',alignItems:'center',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
          <span style={{fontSize:12,fontFamily:'monospace',fontWeight:700,color:'var(--pr-dark-2)'}}>{x.id}</span>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><Av n={x.cust} size={24}/><span style={{fontSize:12.5,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.cust}</span></div>
          <span style={{fontSize:12.5,color:'var(--label-02)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.item}</span>
          <span style={{fontSize:13,fontWeight:700,color:'var(--pr-dark-2)',textAlign:'right'}}>{fmtV(x.total)}</span>
          <span><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:700,color:s.c}}><span style={{width:6,height:6,borderRadius:3,background:s.c}}/>{s.l}</span></span>
          <span style={{fontSize:11.5,color:'var(--label-02)'}}>{x.valid}</span>
          <div style={{position:'relative',justifySelf:'end'}} onClick={e=>e.stopPropagation()}>
            <button className="btn-icon" style={{width:28,height:28}} onClick={()=>setMenu(m=>m===x.id?null:x.id)}>{CdI('More',{style:{width:15,height:15}})}</button>
            {menu===x.id && <><div onClick={()=>setMenu(null)} style={{position:'fixed',inset:0,zIndex:60}}/><div style={{position:'absolute',right:0,top:32,zIndex:61,width:230,background:'white',border:'1px solid var(--fill-04)',borderRadius:10,boxShadow:'0 16px 40px rgba(17,24,39,.2)',padding:5}}>
              <button onClick={()=>{setSel(x);setMenu(null);}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',border:'none',background:'transparent',borderRadius:7,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12.5,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{CdI('Book',{style:{width:15,height:15,color:'var(--label-02)'}})}<span style={{flex:1}}>Xem hợp đồng</span></button>
              {x.status!=='signed' ? <button onClick={()=>sign(x)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',border:'none',background:'transparent',borderRadius:7,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12.5,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{CdI('Check',{style:{width:15,height:15,color:'#16A34A'}})}<span style={{flex:1}}>Ký &amp; tạo Đơn hàng</span></button> : <div style={{padding:'9px 10px',fontSize:12,color:'var(--label-03)',display:'flex',gap:8,alignItems:'center'}}>{CdI('Check',{style:{width:14,height:14,color:'#16A34A'}})}Đã ký → đã tạo ĐH</div>}
              <div style={{fontSize:10.5,color:'var(--label-03)',padding:'4px 10px 2px',lineHeight:1.4,borderTop:'1px solid var(--fill-03)',marginTop:3}}>Hợp đồng → Đơn hàng → cập nhật Pipeline.</div>
            </div></>}
          </div>
        </div>);})}
    </Table>
    {sel && (()=>{ const s=C_STATUS[sel.status]; return (
      <div onClick={()=>setSel(null)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.45)',zIndex:1300,display:'flex',justifyContent:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:440,maxWidth:'92vw',height:'100%',background:'white',display:'flex',flexDirection:'column',boxShadow:'-8px 0 40px rgba(17,24,39,.2)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--fill-04)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:36,height:36,borderRadius:10,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center'}}>{CdI('Book',{style:{width:18,height:18}})}</span>
            <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>{sel.id}</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Hợp đồng dịch vụ</div></div>
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:700,color:s.c}}><span style={{width:7,height:7,borderRadius:4,background:s.c}}/>{s.l}</span>
            <button className="btn-icon" onClick={()=>setSel(null)}>{CdI('Close',{style:{width:18,height:18}})||'✕'}</button>
          </div>
          <div className="scroll" style={{flex:1,overflowY:'auto',padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:11,padding:'12px 14px',background:'var(--fill-02)',borderRadius:11,marginBottom:16}}>
              <Av n={sel.cust} size={40}/><div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{sel.cust}</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Phụ trách: {sel.owner}</div></div>
            </div>
            <div style={{border:'1px solid var(--fill-04)',borderRadius:11,overflow:'hidden',marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',borderBottom:'1px solid var(--fill-03)'}}><span style={{fontSize:13,fontWeight:600}}>{sel.item}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'var(--bg-green)'}}><span style={{fontSize:13,fontWeight:800}}>Giá trị hợp đồng</span><span style={{fontSize:16,fontWeight:800,color:'var(--pr-dark-2)'}}>{fmtV(sel.total)}</span></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div style={{padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10}}><div style={{fontSize:10.5,color:'var(--label-03)'}}>Ngày tạo</div><div style={{fontSize:13,fontWeight:600}}>{sel.date}</div></div>
              <div style={{padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10}}><div style={{fontSize:10.5,color:'var(--label-03)'}}>Hiệu lực</div><div style={{fontSize:13,fontWeight:600}}>{sel.valid}</div></div>
            </div>
          </div>
          <div style={{padding:14,borderTop:'1px solid var(--fill-04)',display:'flex',gap:8}}>
            <button className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:'center'}}>{CdI('Send',{style:{width:14,height:14}})} Gửi ký</button>
            {sel.status!=='signed' && <button onClick={()=>sign(sel)} className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{CdI('Check',{style:{width:14,height:14}})} Ký &amp; tạo ĐH</button>}
          </div>
        </div>
      </div>
    );})()}
    {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{CdI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    {aiOpen && (
      <div onClick={()=>setAiOpen(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.4)',zIndex:2000,display:'flex',justifyContent:'flex-end'}}>
        <div onClick={e=>e.stopPropagation()} style={{width:440,maxWidth:'94vw',height:'100%',display:'flex',flexDirection:'column',background:'white',boxShadow:'-8px 0 40px rgba(17,24,39,.2)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--fill-03)',display:'flex',alignItems:'center',gap:10}}><span style={{width:34,height:34,borderRadius:10,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center'}}>{CdI('Sparkles',{style:{width:17,height:17}})}</span><div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>Tạo hợp đồng bằng AppChat AI</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Gõ mô tả — AI soạn hợp đồng từ báo giá &amp; điều khoản</div></div><button className="btn-icon" onClick={()=>setAiOpen(false)}>{CdI('Close',{style:{width:18,height:18}})||'✕'}</button></div>
          <div className="scroll" style={{flex:1,overflowY:'auto',padding:'18px 20px',display:'flex',flexDirection:'column',gap:12,background:'var(--fill-02)'}}>
            <div style={{display:'flex',gap:9,alignItems:'flex-start'}}>
              <span style={{width:30,height:30,borderRadius:9,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{CdI('Sparkles',{style:{width:15,height:15}})}</span>
              <div style={{background:'white',border:'1px solid var(--fill-04)',borderRadius:'4px 12px 12px 12px',padding:'11px 13px',fontSize:13,lineHeight:1.55,maxWidth:'85%'}}>Xin chào! Mô tả hợp đồng cần tạo — mình soạn điều khoản, thời hạn &amp; giá trị từ dịch vụ/báo giá để bạn duyệt.</div>
            </div>
            {aiDraft && <div style={{display:'flex',justifyContent:'flex-end'}}><div style={{background:'var(--pr-dark-1)',color:'white',borderRadius:'12px 4px 12px 12px',padding:'10px 13px',fontSize:13,lineHeight:1.5,maxWidth:'85%'}}>{aiSent}</div></div>}
            {aiDraft && (()=>{ const d=aiDraft; return (
              <div style={{display:'flex',gap:9,alignItems:'flex-start'}}>
                <span style={{width:30,height:30,borderRadius:9,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{CdI('Sparkles',{style:{width:15,height:15}})}</span>
                <div style={{flex:1,border:'1px solid var(--fill-04)',borderRadius:'4px 12px 12px 12px',overflow:'hidden',maxWidth:'88%',background:'white'}}>
                  <div style={{padding:'9px 13px',fontSize:12,color:'var(--label-02)',lineHeight:1.5,borderBottom:'1px solid var(--fill-03)'}}>Hợp đồng đề xuất cho <b>{d.cust}</b>. Duyệt &amp; lưu, hoặc nhắn điều chỉnh.</div>
                  <div style={{padding:'12px 14px',fontSize:12.5}}>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span style={{color:'var(--label-02)'}}>Dịch vụ</span><span style={{fontWeight:600}}>{d.item}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span style={{color:'var(--label-02)'}}>Thời hạn</span><span style={{fontWeight:600}}>{d.term}</span></div>
                    <div style={{borderTop:'1px solid var(--fill-03)',margin:'6px 0',paddingTop:6}}/>
                    <div style={{fontSize:11,fontWeight:800,color:'var(--label-03)',marginBottom:4}}>ĐIỀU KHOẢN</div>
                    {d.terms.map((tm,i)=>(<div key={i} style={{display:'flex',gap:7,padding:'2px 0',color:'var(--label-02)'}}><span style={{color:'var(--primary)'}}>•</span>{tm}</div>))}
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,padding:'8px 10px',background:'var(--bg-green)',borderRadius:8}}><span style={{fontWeight:800}}>Giá trị</span><span style={{fontWeight:800,color:'var(--pr-dark-2)'}}>{fm(d.total)} ₫</span></div>
                  </div>
                  <div style={{display:'flex',gap:8,padding:'10px 14px',borderTop:'1px solid var(--fill-03)'}}><button onClick={saveAI} className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{CdI('Check',{style:{width:13,height:13}})} Duyệt &amp; lưu hợp đồng</button><button onClick={genAI} className="btn btn-ghost btn-sm">Sinh lại</button></div>
                </div>
              </div>
            );})()}
          </div>
          <div style={{padding:'12px 14px',borderTop:'1px solid var(--fill-03)',background:'white'}}>
            {!aiDraft && <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:9}}>{['Hợp đồng niềng Invisalign 24 tháng cho anh Quân','Liệu trình Spa 12 buổi cho chị Lan'].map(x=>(<button key={x} onClick={()=>setAiPrompt(x)} style={{padding:'6px 11px',borderRadius:14,border:'1px solid var(--fill-04)',background:'var(--fill-02)',cursor:'pointer',fontSize:11.5,fontFamily:'inherit',color:'var(--label-02)'}}>{x}</button>))}</div>}
            <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
              <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={1} placeholder="Nhắn cho AppChat AI…" onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); if(aiPrompt.trim())genAI(); } }} style={{flex:1,padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:12,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'none',lineHeight:1.4,maxHeight:90}}/>
              <button onClick={genAI} disabled={!aiPrompt.trim()} className="btn btn-sm" style={{flexShrink:0,justifyContent:'center',background:'var(--primary)',color:'white',border:'none',opacity:aiPrompt.trim()?1:.5,width:40,height:40,borderRadius:'50%',padding:0}}>{CdI('Send',{style:{width:16,height:16}})}</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </Shell></>);
}

window.QuotesModule = QuotesModule;
window.ContractsModule = ContractsModule;
} catch(e){ console.error('crm-docs.jsx', e); }
})();
