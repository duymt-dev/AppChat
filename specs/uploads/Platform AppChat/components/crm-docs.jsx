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
  React.useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(''),2400); return ()=>clearTimeout(t); } },[toast]);
  const win=(x)=>{ setRows(rs=>rs.map(r=>r.id===x.id?{...r,status:'accepted'}:r)); if(window.AppFlow)window.AppFlow.push({type:'quote_won', cust:x.cust, ref:x.id, total:x.total}); setMenu(null); setSel(null); setToast('Đã chốt “'+x.id+'” → tạo Hợp đồng cho '+x.cust); };
  const list=rows.filter(x=>(st==='all'||x.status===st)&&(!q.trim()||(x.id+x.cust+x.item).toLowerCase().includes(q.toLowerCase())));
  const sum=rows.filter(x=>x.status==='accepted').reduce((a,x)=>a+x.total,0);
  const cnt=(k)=>rows.filter(x=>x.status===k).length;
  const FUNNEL=[['draft','Nháp','#94A3B8'],['sent','Đã gửi','#2A6FDB'],['accepted','Đã chốt','#1B9E5A'],['expired','Hết hạn','#C9820B'],['rejected','Từ chối','#DC2626']];
  return <Shell title="Báo giá" sub="Quản lý báo giá dịch vụ · gửi & theo dõi chốt"
    cta={<button className="btn btn-primary btn-sm">{CdI('Plus',{style:{width:14,height:14}})} Tạo báo giá</button>}
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
  </Shell>;
}

/* ---------------- HỢP ĐỒNG ---------------- */
const C_STATUS={ active:{l:'Hiệu lực',c:'#1B9E5A'}, pending:{l:'Chờ ký',c:'#C9820B'}, expiring:{l:'Sắp hết hạn',c:'#E8602C'}, ended:{l:'Đã kết thúc',c:'#94A3B8'} };
const CONTRACTS=[
  {id:'HĐ-1042', cust:'Nha khoa Minh Châu', item:'Niềng răng Invisalign · trả góp 12 tháng', total:48_000_000, status:'active', owner:'Khoa', sign:'11/06/2026', end:'11/06/2027'},
  {id:'HĐ-1041', cust:'Phòng khám Quốc tế', item:'Gói chăm sóc sức khoẻ doanh nghiệp', total:120_000_000, status:'active', owner:'Hương', sign:'05/06/2026', end:'05/06/2027'},
  {id:'HĐ-1040', cust:'Spa Hương Sen', item:'Thẻ thành viên VIP 1 năm', total:24_000_000, status:'expiring', owner:'Hương', sign:'20/06/2025', end:'20/06/2026'},
  {id:'HĐ-1039', cust:'Trung tâm Anh ngữ Sao Mai', item:'Khoá IELTS trọn gói 6 tháng', total:21_000_000, status:'pending', owner:'Minh', sign:'—', end:'—'},
  {id:'HĐ-1038', cust:'Thẩm mỹ viện Á Đông', item:'Liệu trình trẻ hoá da 1 năm', total:60_000_000, status:'active', owner:'Trâm', sign:'01/05/2026', end:'01/05/2027'},
  {id:'HĐ-1037', cust:'Spa Hương Sen', item:'Gói chăm sóc da định kỳ', total:8_400_000, status:'ended', owner:'Hương', sign:'01/01/2025', end:'01/01/2026'},
];
function ContractsModule(){
  const [q,setQ]=useCD(''); const [st,setSt]=useCD('all');
  const [rows,setRows]=useCD(CONTRACTS);
  const [menu,setMenu]=useCD(null); const [toast,setToast]=useCD('');
  React.useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(''),2400); return ()=>clearTimeout(t); } },[toast]);
  const order=(x)=>{ const pts=Math.floor((x.total||0)/1000); if(window.AppFlow)window.AppFlow.push({type:'contract_order', cust:x.cust, ref:x.id, total:x.total}); setMenu(null); setToast('Đã tạo Đơn hàng từ “'+x.id+'” · +'+pts.toLocaleString('vi-VN')+' điểm · Pipeline → Đã mua'); };
  const list=rows.filter(x=>(st==='all'||x.status===st)&&(!q.trim()||(x.id+x.cust+x.item).toLowerCase().includes(q.toLowerCase())));
  const sum=rows.filter(x=>x.status==='active'||x.status==='expiring').reduce((a,x)=>a+x.total,0);
  return <Shell title="Hợp đồng" sub="Quản lý hợp đồng dịch vụ · ký & gia hạn"
    cta={<button className="btn btn-primary btn-sm">{CdI('Plus',{style:{width:14,height:14}})} Tạo hợp đồng</button>}
    kpis={<><Kpi l="Tổng hợp đồng" v={CONTRACTS.length} c="#2A6FDB" ic="FileText"/><Kpi l="Đang hiệu lực" v={CONTRACTS.filter(x=>x.status==='active').length} c="#1B9E5A" ic="Check"/><Kpi l="Sắp hết hạn" v={CONTRACTS.filter(x=>x.status==='expiring').length} c="#E8602C" ic="Bell"/><Kpi l="Giá trị hiệu lực" v={(sum/1e6).toFixed(0)+'tr ₫'} c="#0E9B94" ic="TrendUp"/></>}
    filters={<><div style={{position:'relative',flex:'1 1 200px',minWidth:180,maxWidth:280}}>{CdI('Search',{style:{position:'absolute',left:11,top:9,width:14,height:14,color:'var(--label-03)'}})}<input placeholder="Tìm hợp đồng, khách hàng…" value={q} onChange={e=>setQ(e.target.value)} style={{height:34,width:'100%',paddingLeft:34,border:'1px solid var(--fill-04)',borderRadius:9,fontSize:12.5,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div><select value={st} onChange={e=>setSt(e.target.value)} style={sst}><option value="all">Tất cả trạng thái</option>{Object.entries(C_STATUS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select></>}>
    <Table cols={[{l:'Mã hợp đồng',w:'1fr'},{l:'Khách hàng',w:'1.3fr'},{l:'Nội dung',w:'1.9fr'},{l:'Giá trị',w:'1fr',r:true},{l:'Trạng thái',w:'1fr'},{l:'Hết hạn',w:'1fr'},{l:'',w:'44px',r:true}]}>
      {list.map(x=>{const s=C_STATUS[x.status];return(
        <div key={x.id} style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 1.9fr 1fr 1fr 1fr 44px',gap:14,padding:'11px 16px',borderBottom:'1px solid var(--fill-03)',alignItems:'center'}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
          <span style={{fontSize:12,fontFamily:'monospace',fontWeight:700,color:'var(--pr-dark-2)'}}>{x.id}</span>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><Av n={x.cust} size={24}/><span style={{fontSize:12.5,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.cust}</span></div>
          <span style={{fontSize:12.5,color:'var(--label-02)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x.item}</span>
          <span style={{fontSize:13,fontWeight:700,color:'var(--pr-dark-2)',textAlign:'right'}}>{fmtV(x.total)}</span>
          <span><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:700,color:s.c}}><span style={{width:6,height:6,borderRadius:3,background:s.c}}/>{s.l}</span></span>
          <span style={{fontSize:11.5,color:'var(--label-02)'}}>{x.end}</span>
          <div style={{position:'relative',justifySelf:'end'}} onClick={e=>e.stopPropagation()}>
            <button className="btn-icon" style={{width:28,height:28}} onClick={()=>setMenu(m=>m===x.id?null:x.id)}>{CdI('More',{style:{width:15,height:15}})}</button>
            {menu===x.id && <><div onClick={()=>setMenu(null)} style={{position:'fixed',inset:0,zIndex:60}}/><div style={{position:'absolute',right:0,top:32,zIndex:61,width:240,background:'white',border:'1px solid var(--fill-04)',borderRadius:10,boxShadow:'0 16px 40px rgba(17,24,39,.2)',padding:5}}>
              <button onClick={()=>order(x)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',border:'none',background:'transparent',borderRadius:7,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12.5,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{CdI('ShoppingCart',{style:{width:15,height:15,color:'#2563EB'}})||CdI('Package',{style:{width:15,height:15,color:'#2563EB'}})}<span style={{flex:1}}>Tạo Đơn hàng từ HĐ</span></button>
              <div style={{fontSize:10.5,color:'var(--label-03)',padding:'4px 10px 2px',lineHeight:1.4,borderTop:'1px solid var(--fill-03)',marginTop:3}}>Sinh đơn → cộng điểm Loyalty → Pipeline khách → “Đã mua”.</div>
            </div></>}
          </div>
        </div>);})}
    </Table>
    {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{CdI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
  </Shell>;
}

window.QuotesModule = QuotesModule;
window.ContractsModule = ContractsModule;
} catch(e){ console.error('crm-docs.jsx', e); }
})();
