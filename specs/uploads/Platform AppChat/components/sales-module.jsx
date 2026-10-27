/* ============================================================
   sales-module.jsx — Bán hàng (Sản phẩm/Dịch vụ · Đơn hàng)
   Catalog dataset cho AI Agent tư vấn + quản lý đơn hàng
   ============================================================ */
;(function(){
try {
const { useState: useSl } = React;
const SlI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const Badge = (p)=> window.ChannelBadge ? React.createElement(window.ChannelBadge, p) : null;
const fmtV = (n)=> (n||0).toLocaleString('vi-VN')+' ₫';

const PRODUCTS = [
  { id:'DV-001', name:'Chăm sóc da mặt cơ bản', sku:'SPA-CSDA-01', type:'service', cat:'Spa & Thẩm mỹ', price:450000, stock:null, status:'active', img:'🌸' },
  { id:'DV-002', name:'Trị mụn chuyên sâu 10 buổi', sku:'SPA-TRIMUN-10', type:'service', cat:'Spa & Thẩm mỹ', price:4500000, stock:null, status:'active', img:'✨' },
  { id:'DV-003', name:'Niềng răng trong suốt', sku:'NHA-NIENG-01', type:'service', cat:'Nha khoa', price:35000000, stock:null, status:'active', img:'🦷' },
  { id:'DV-004', name:'Cạo vôi & đánh bóng răng', sku:'NHA-VOIRANG', type:'service', cat:'Nha khoa', price:300000, stock:null, status:'active', img:'🪥' },
  { id:'DV-005', name:'Khám tổng quát', sku:'PK-KHAM-TQ', type:'service', cat:'Phòng khám', price:500000, stock:null, status:'active', img:'🩺' },
  { id:'DV-006', name:'Gói tiêm chủng trẻ em', sku:'PK-TIEM-TE', type:'service', cat:'Phòng khám', price:2800000, stock:null, status:'active', img:'💉' },
  { id:'DV-007', name:'Khoá tiếng Anh giao tiếp', sku:'EDU-IELTS-01', type:'service', cat:'Giáo dục', price:6500000, stock:null, status:'active', img:'📚' },
  { id:'SP-001', name:'Combo mỹ phẩm dưỡng da', sku:'SP-MYPHAM-01', type:'product', cat:'Sản phẩm', price:890000, stock:42, status:'active', img:'🧴' },
];

const OD_STATUS = {
  new:       {l:'Mới đặt',     c:'#2A6FDB'},
  confirmed: {l:'Đã xác nhận', c:'#C9820B'},
  shipping:  {l:'Đang phục vụ', c:'#6E48E6'},
  done:      {l:'Hoàn tất',    c:'#22C55E'},
  cancelled: {l:'Đã huỷ',      c:'#94A3B8'},
};
const PAY = { paid:{l:'Đã thanh toán',c:'#1B9E5A'}, pending:{l:'Chờ thanh toán',c:'#C9820B'}, refunded:{l:'Đã hoàn',c:'#94A3B8'} };
const ORDERS = [
  { id:'#LH-7041', cust:'Chị Lan', ch:'zalo', items:'Chăm sóc da mặt · 10h00', total:450000, status:'new', pay:'pending', date:'14/06 · 09:12' },
  { id:'#LH-7040', cust:'Nguyễn T. Hiếu', ch:'facebook', items:'Cạo vôi răng · 14h30', total:300000, status:'confirmed', pay:'paid', date:'14/06 · 08:40' },
  { id:'#LH-7039', cust:'Phạm Quỳnh', ch:'zalo', items:'Trị mụn buổi 3/10', total:450000, status:'shipping', pay:'paid', date:'13/06 · 19:05' },
  { id:'#LH-7038', cust:'Trần M. Khoa', ch:'instagram', items:'Khám tổng quát', total:500000, status:'done', pay:'paid', date:'13/06 · 15:22' },
  { id:'#LH-7037', cust:'Đỗ Thu Hà', ch:'zalo', items:'Khoá tiếng Anh · ghi danh', total:6500000, status:'done', pay:'paid', date:'12/06 · 11:30' },
  { id:'#LH-7036', cust:'Vũ Đức Anh', ch:'web', items:'Tư vấn niềng răng', total:0, status:'cancelled', pay:'refunded', date:'12/06 · 10:14' },
  { id:'#LH-7035', cust:'Ngô Bích', ch:'facebook', items:'Chăm sóc da mặt · 16h00', total:450000, status:'confirmed', pay:'pending', date:'11/06 · 16:48' },
];

const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];

function Kpi({ l, v, sub, c, ic }){
  return (<div className="card" style={{padding:14, display:'flex', alignItems:'center', gap:11}}>
    <span style={{width:34, height:34, borderRadius:9, background:c+'18', color:c, display:'grid', placeItems:'center', flexShrink:0}}>{SlI(ic,{style:{width:17,height:17}})}</span>
    <div style={{minWidth:0}}><div style={{fontSize:11.5, color:'var(--label-02)', fontWeight:600, whiteSpace:'nowrap'}}>{l}</div><div style={{fontSize:19, fontWeight:800, color:'var(--label-01)', lineHeight:1.2}}>{v}</div>{sub && <div style={{fontSize:10.5, color:'var(--label-03)'}}>{sub}</div>}</div>
  </div>);
}
const sst = {height:32, border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12.5, fontFamily:'inherit', background:'white', color:'var(--label-01)', padding:'0 10px', cursor:'pointer', outline:'none'};

/* ---------------- Products ---------------- */
function ProductsTab(){
  const [q, setQ] = useSl('');
  const [cat, setCat] = useSl('all');
  const [ptype, setPtype] = useSl('all');
  const [pst, setPst] = useSl('all');
  const cats = ['all', ...new Set(PRODUCTS.map(p=>p.cat))];
  const list = PRODUCTS.filter(p=> (cat==='all'||p.cat===cat) && (ptype==='all'||p.type===ptype) && (pst==='all'||p.status===pst) && (!q.trim() || (p.name+' '+p.sku).toLowerCase().includes(q.toLowerCase())));
  return (<div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
      <Kpi l="Sản phẩm/Dịch vụ" v={PRODUCTS.length} sub={PRODUCTS.filter(p=>p.type==='service').length+' dịch vụ'} c="#2A6FDB" ic="Package"/>
      <Kpi l="Đang bán" v={PRODUCTS.filter(p=>p.status==='active').length} c="#1B9E5A" ic="Check"/>
      <Kpi l="Sắp hết / Hết hàng" v={PRODUCTS.filter(p=>p.status==='low'||p.status==='out').length} c="#C9820B" ic="Bell"/>
      <Kpi l="Dùng cho AI tư vấn" v="100%" sub="catalog đồng bộ AI Agent" c="#0E9B94" ic="Sparkles"/>
    </div>
    <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
      <div style={{position:'relative', flex:'1 1 200px', minWidth:180, maxWidth:280}}>
        {SlI('Search',{style:{position:'absolute', left:11, top:9, width:14, height:14, color:'var(--label-03)'}})}
        <input placeholder="Tìm sản phẩm, SKU…" value={q} onChange={e=>setQ(e.target.value)} style={{height:34, width:'100%', paddingLeft:34, border:'1px solid var(--fill-04)', borderRadius:9, fontSize:12.5, outline:'none', fontFamily:'inherit', boxSizing:'border-box'}}/>
      </div>
      <select value={cat} onChange={e=>setCat(e.target.value)} style={{...sst, height:34}}>{cats.map(c=><option key={c} value={c}>{c==='all'?'Tất cả danh mục':c}</option>)}</select>
      <select value={ptype} onChange={e=>setPtype(e.target.value)} style={{...sst, height:34}}><option value="all">Loại</option><option value="product">Sản phẩm</option><option value="service">Dịch vụ</option></select>
      <select value={pst} onChange={e=>setPst(e.target.value)} style={{...sst, height:34}}><option value="all">Trạng thái</option><option value="active">Đang bán</option><option value="low">Sắp hết</option><option value="out">Hết hàng</option></select>
      <span style={{flex:1}}/>
      <button className="btn btn-primary btn-sm">{SlI('Plus',{style:{width:14,height:14}})} Thêm sản phẩm</button>
    </div>
    <div className="card" style={{padding:0, overflow:'hidden'}}>
      <div style={{display:'grid', gridTemplateColumns:'minmax(0,2.2fr) 1fr 1.2fr 1fr 0.9fr 0.9fr 44px', gap:14, padding:'10px 16px', borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)'}}>
        {['Sản phẩm / Dịch vụ','SKU','Danh mục','Giá','Tồn kho','Trạng thái','Thao tác'].map((h,i)=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', textAlign:i>=3&&i<6?'right':(i===6?'right':'left')}}>{h}</span>)}
      </div>
      {list.map(p=>{ const st = p.status==='active'?{l:'Đang bán',c:'#1B9E5A'}:p.status==='low'?{l:'Sắp hết',c:'#C9820B'}:p.status==='out'?{l:'Hết hàng',c:'#DC2626'}:{l:'Ẩn',c:'#94A3B8'}; return (
        <div key={p.id} style={{display:'grid', gridTemplateColumns:'minmax(0,2.2fr) 1fr 1.2fr 1fr 0.9fr 0.9fr 44px', gap:14, padding:'11px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
          <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
            <span style={{width:34, height:34, borderRadius:9, background:'var(--fill-02)', display:'grid', placeItems:'center', fontSize:18, flexShrink:0}}>{p.img}</span>
            <div style={{minWidth:0}}><div style={{fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.name}</div><div style={{fontSize:10.5, color:'var(--label-03)'}}>{p.type==='service'?'Dịch vụ':'Sản phẩm'}</div></div>
          </div>
          <span style={{fontSize:11.5, fontFamily:'monospace', color:'var(--label-02)'}}>{p.sku}</span>
          <span style={{fontSize:12.5}}>{p.cat}</span>
          <span style={{fontSize:13, fontWeight:700, color:'var(--pr-dark-2)', textAlign:'right'}}>{fmtV(p.price)}</span>
          <span style={{fontSize:12.5, fontWeight:600, textAlign:'right', color: p.stock===0?'#DC2626':'var(--label-01)'}}>{p.stock==null?'—':p.stock}</span>
          <span style={{textAlign:'right'}}><span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:st.c}}><span style={{width:6,height:6,borderRadius:3,background:st.c}}/>{st.l}</span></span>
          <button className="btn-icon" style={{width:28,height:28,justifySelf:'end'}}>{SlI('More',{style:{width:15,height:15}})}</button>
        </div>
      );})}
    </div>
  </div>);
}

/* ---------------- Orders ---------------- */
function OrdersTab(){
  const [q, setQ] = useSl('');
  const [status, setStatus] = useSl('all');
  const [pay, setPay2] = useSl('all');
  const [ch, setCh] = useSl('all');
  const [ords, setOrds] = useSl(ORDERS);
  const [omenu, setOmenu] = useSl(null);
  const [otoast, setOtoast] = useSl('');
  React.useEffect(()=>{ if(otoast){ const x=setTimeout(()=>setOtoast(''),2400); return ()=>clearTimeout(x); } },[otoast]);
  const complete=(o)=>{ const pts=Math.floor((o.total||0)/1000); setOrds(os=>os.map(x=>x.id===o.id?{...x,status:'done',pay:'paid'}:x)); setOmenu(null); setOtoast('Hoàn tất “'+o.id+'” · +'+pts.toLocaleString('vi-VN')+' điểm cho '+o.cust); };
  const list = ords.filter(o=> (status==='all'||o.status===status) && (pay==='all'||o.pay===pay) && (ch==='all'||o.ch===ch) && (!q.trim() || (o.id+' '+o.cust+' '+o.items).toLowerCase().includes(q.toLowerCase())));
  const rev = ords.filter(o=>o.pay==='paid').reduce((a,o)=>a+o.total,0);
  return (<div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
      <Kpi l="Tổng đơn" v={ords.length} sub="kỳ này" c="#2A6FDB" ic="ShoppingCart"/>
      <Kpi l="Chờ xử lý" v={ords.filter(o=>o.status==='new').length} c="#C9820B" ic="Clock"/>
      <Kpi l="Đang giao" v={ords.filter(o=>o.status==='shipping').length} c="#6E48E6" ic="Truck"/>
      <Kpi l="Doanh thu (đã thu)" v={(rev/1e6).toFixed(1)+'tr ₫'} c="#1B9E5A" ic="TrendUp"/>
    </div>
    <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
      <div style={{position:'relative', flex:'1 1 200px', minWidth:180, maxWidth:280}}>
        {SlI('Search',{style:{position:'absolute', left:11, top:9, width:14, height:14, color:'var(--label-03)'}})}
        <input placeholder="Tìm đơn, khách hàng…" value={q} onChange={e=>setQ(e.target.value)} style={{height:34, width:'100%', paddingLeft:34, border:'1px solid var(--fill-04)', borderRadius:9, fontSize:12.5, outline:'none', fontFamily:'inherit', boxSizing:'border-box'}}/>
      </div>
      <select value={status} onChange={e=>setStatus(e.target.value)} style={{...sst, height:34}}><option value="all">Tất cả trạng thái</option>{Object.entries(OD_STATUS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select>
      <select value={pay} onChange={e=>setPay2(e.target.value)} style={{...sst, height:34}}><option value="all">Thanh toán</option>{Object.entries(PAY).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select>
      <select value={ch} onChange={e=>setCh(e.target.value)} style={{...sst, height:34}}><option value="all">Kênh</option><option value="zalo">Zalo</option><option value="facebook">Facebook</option><option value="shopee">Shopee</option><option value="tiktok">TikTok</option><option value="web">Web</option></select>
      <span style={{flex:1}}/>
      <button className="btn btn-primary btn-sm">{SlI('Plus',{style:{width:14,height:14}})} Tạo đơn hàng</button>
    </div>
    <div className="card" style={{padding:0, overflow:'hidden'}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1.2fr 1.8fr 1fr 1.1fr 1.1fr 44px', gap:14, padding:'10px 16px', borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)'}}>
        {['Mã đơn','Khách hàng','Sản phẩm','Tổng tiền','Trạng thái','Thanh toán','Thao tác'].map((h,i)=><span key={h} style={{fontSize:10.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', textAlign:i===3?'right':(i===6?'right':'left')}}>{h}</span>)}
      </div>
      {list.map(o=>{ const st=OD_STATUS[o.status], py=PAY[o.pay]; return (
        <div key={o.id} style={{display:'grid', gridTemplateColumns:'1fr 1.2fr 1.8fr 1fr 1.1fr 1.1fr 44px', gap:14, padding:'11px 16px', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
          <span style={{fontSize:12, fontFamily:'monospace', fontWeight:700, color:'var(--pr-dark-2)'}}>{o.id}</span>
          <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0}}>
            <span style={{width:26,height:26,borderRadius:'50%',background:avC(o.cust),color:'white',display:'grid',placeItems:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{o.cust[0]}</span>
            <div style={{display:'flex', alignItems:'center', gap:5, minWidth:0}}><Badge name={o.ch} size={15}/><span style={{fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{o.cust}</span></div>
          </div>
          <span style={{fontSize:12.5, color:'var(--label-02)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{o.items}</span>
          <span style={{fontSize:13, fontWeight:700, color:'var(--pr-dark-2)', textAlign:'right'}}>{fmtV(o.total)}</span>
          <span><span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:700, color:st.c}}><span style={{width:6,height:6,borderRadius:3,background:st.c}}/>{st.l}</span></span>
          <span style={{fontSize:11.5, fontWeight:600, color:py.c}}>{py.l}</span>
          <div style={{position:'relative', justifySelf:'end'}}>
            <button className="btn-icon" style={{width:28,height:28}} onClick={()=>setOmenu(m=>m===o.id?null:o.id)}>{SlI('More',{style:{width:15,height:15}})}</button>
            {omenu===o.id && <>
              <div onClick={()=>setOmenu(null)} style={{position:'fixed',inset:0,zIndex:60}}/>
              <div style={{position:'absolute',right:0,top:32,zIndex:61,width:210,background:'white',border:'1px solid var(--fill-04)',borderRadius:10,boxShadow:'0 16px 40px rgba(17,24,39,.2)',padding:5}}>
                {o.status!=='done' ? (
                  <button onClick={()=>complete(o)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',border:'none',background:'transparent',borderRadius:7,cursor:'pointer',textAlign:'left',fontFamily:'inherit',fontSize:12.5,fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {SlI('Check',{style:{width:15,height:15,color:'#16A34A'}})}<span style={{flex:1}}>Hoàn tất đơn</span><span style={{fontSize:10.5,fontWeight:700,color:'#16A34A'}}>+{Math.floor((o.total||0)/1000).toLocaleString('vi-VN')}đ</span>
                  </button>
                ) : (
                  <div style={{padding:'9px 10px',fontSize:12,color:'var(--label-03)',display:'flex',alignItems:'center',gap:8}}>{SlI('Check',{style:{width:14,height:14,color:'#16A34A'}})}Đã hoàn tất · đã cộng điểm</div>
                )}
                <div style={{fontSize:10.5,color:'var(--label-03)',padding:'4px 10px 2px',lineHeight:1.4,borderTop:'1px solid var(--fill-03)',marginTop:3}}>Tỷ lệ: 1.000đ = 1 điểm → tự cộng vào Loyalty khi hoàn tất.</div>
              </div>
            </>}
          </div>
        </div>
      );})}
    </div>
    {otoast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{SlI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{otoast}</div>}
  </div>);
}

function SalesModule(){
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Sản phẩm / Dịch vụ</h1>
        <span className="crumb">Catalog cho AI Agent tư vấn &amp; báo giá</span>
        <span className="spacer"/>
      </div>
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'18px 22px', background:'var(--fill-02)'}}>
        <ProductsTab/>
      </div>
    </div>
  );
}
function OrdersModule(){
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Đơn hàng</h1>
        <span className="crumb">Quản lý đơn · chốt đơn từ hội thoại · doanh thu</span>
        <span className="spacer"/>
      </div>
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'18px 22px', background:'var(--fill-02)'}}>
        <OrdersTab/>
      </div>
    </div>
  );
}

window.SalesModule = SalesModule;
window.OrdersModule = OrdersModule;
} catch(e){ console.error('sales-module.jsx', e); }
})();
