/* Inventory consumables — vật tư tiêu hao, auto-deduct theo dịch vụ */
const { useState: useInv } = React;

const ITEMS = [
  { id:'I-001', sku:'SKN-HA-30',  name:'Serum HA Premium 30ml',     cat:'Mỹ phẩm', unit:'chai',   stock:42, min:20, cost:380000, supplier:'Bena Cosmetic', branch:'CN Q1', last:'18/04', autoDeduct:0.3 },
  { id:'I-002', sku:'SKN-VITC-50',name:'Serum Vitamin C 50ml',      cat:'Mỹ phẩm', unit:'chai',   stock:8,  min:15, cost:420000, supplier:'Bena Cosmetic', branch:'CN Q1', last:'19/04', autoDeduct:0.5 },
  { id:'I-003', sku:'MASK-ALG',   name:'Mặt nạ tảo biển',           cat:'Mặt nạ', unit:'gói',    stock:120,min:50, cost:45000,  supplier:'Korea Beauty',  branch:'CN Q1', last:'20/04', autoDeduct:1   },
  { id:'I-004', sku:'OIL-ARG',    name:'Tinh dầu Argan 100ml',      cat:'Tinh dầu',unit:'chai',  stock:5,  min:10, cost:280000, supplier:'Aromatherapy VN',branch:'CN Q1', last:'17/04', autoDeduct:0.4 },
  { id:'I-005', sku:'NAIL-GEL-R',name:'Sơn gel đỏ ruby',           cat:'Nail',    unit:'lọ',    stock:18, min:8,  cost:85000,  supplier:'OPI Vietnam',   branch:'CN Q3', last:'19/04', autoDeduct:0.2 },
  { id:'I-006', sku:'NAIL-TIP',  name:'Móng giả tip clear (50pcs)',cat:'Nail',    unit:'hộp',   stock:32, min:15, cost:65000,  supplier:'OPI Vietnam',   branch:'CN Q3', last:'18/04', autoDeduct:0.5 },
  { id:'I-007', sku:'PAPER-BED', name:'Giấy lót giường (cuộn)',    cat:'Tiêu hao',unit:'cuộn',  stock:24, min:30, cost:120000, supplier:'Spa Supply VN', branch:'CN Q1', last:'20/04', autoDeduct:0.1 },
  { id:'I-008', sku:'GLOVE-NIT', name:'Găng tay nitrile (100c)',   cat:'Tiêu hao',unit:'hộp',   stock:60, min:25, cost:180000, supplier:'Medical VN',    branch:'CN Q1', last:'15/04', autoDeduct:0.04 },
  { id:'I-009', sku:'TOWEL-WH',  name:'Khăn bông trắng',           cat:'Lin',     unit:'chiếc', stock:140,min:80, cost:55000,  supplier:'Linen House',   branch:'CN Q1', last:'12/04', autoDeduct:1   },
  { id:'I-010', sku:'CRM-DETOX', name:'Kem detox body 500g',       cat:'Mỹ phẩm', unit:'hũ',    stock:3,  min:6,  cost:520000, supplier:'Bena Cosmetic', branch:'CN Q1', last:'10/04', autoDeduct:0.15 },
  { id:'I-011', sku:'WAX-BR',    name:'Sáp wax brazil 500g',       cat:'Tiêu hao',unit:'hũ',    stock:14, min:8,  cost:240000, supplier:'Beauty Pro',    branch:'CN Q3', last:'19/04', autoDeduct:0.2 },
  { id:'I-012', sku:'COTTON-PD', name:'Bông tẩy trang (200pcs)',   cat:'Tiêu hao',unit:'gói',   stock:48, min:30, cost:35000,  supplier:'Spa Supply VN', branch:'CN Q1', last:'19/04', autoDeduct:0.15 },
];

const RECIPES = [
  { svc:'Facial Hydra Premium 90 phút', items:[{sku:'SKN-HA-30',qty:0.3},{sku:'MASK-ALG',qty:1},{sku:'COTTON-PD',qty:0.15},{sku:'GLOVE-NIT',qty:0.04}], cost:159500 },
  { svc:'Massage Body Detox 60 phút',   items:[{sku:'OIL-ARG',qty:0.4},{sku:'CRM-DETOX',qty:0.15},{sku:'TOWEL-WH',qty:1},{sku:'PAPER-BED',qty:0.1}], cost:255000 },
  { svc:'Nail Art Premium',              items:[{sku:'NAIL-GEL-R',qty:0.2},{sku:'NAIL-TIP',qty:0.5},{sku:'GLOVE-NIT',qty:0.04}], cost:56700 },
  { svc:'Wax Brazil',                    items:[{sku:'WAX-BR',qty:0.2},{sku:'COTTON-PD',qty:0.15},{sku:'GLOVE-NIT',qty:0.04}], cost:60450 },
];

const MOVEMENTS = [
  { id:'M-1', when:'21/04 10:42', type:'out', sku:'SKN-HA-30',  qty:0.3, ref:'BK-2042 · Facial Hydra', staff:'KTV.Linh' },
  { id:'M-2', when:'21/04 10:30', type:'out', sku:'MASK-ALG',   qty:1,   ref:'BK-2042 · Facial Hydra', staff:'KTV.Linh' },
  { id:'M-3', when:'21/04 10:15', type:'out', sku:'OIL-ARG',    qty:0.4, ref:'BK-2041 · Massage Detox',staff:'KTV.Tuyết' },
  { id:'M-4', when:'21/04 09:50', type:'in',  sku:'TOWEL-WH',   qty:60,  ref:'PO-088 · Linen House',   staff:'Lễ tân Mai' },
  { id:'M-5', when:'21/04 09:32', type:'out', sku:'NAIL-GEL-R', qty:0.2, ref:'BK-2038 · Nail Art',     staff:'KTV.Bích' },
  { id:'M-6', when:'21/04 09:00', type:'adj', sku:'CRM-DETOX',  qty:-1,  ref:'Hỏng / hết hạn',         staff:'Quản lý' },
  { id:'M-7', when:'20/04 18:20', type:'out', sku:'WAX-BR',     qty:0.2, ref:'BK-2034 · Wax Brazil',   staff:'KTV.Vân' },
  { id:'M-8', when:'20/04 17:45', type:'in',  sku:'SKN-HA-30',  qty:20,  ref:'PO-087 · Bena Cosmetic', staff:'Quản lý' },
];

const PURCHASE_ORDERS = [
  { id:'PO-091', supplier:'Bena Cosmetic', items:3, total:7800000, status:'pending', date:'21/04', eta:'25/04', auto:true },
  { id:'PO-090', supplier:'Spa Supply VN', items:2, total:1450000, status:'pending', date:'21/04', eta:'24/04', auto:true },
  { id:'PO-089', supplier:'Aromatherapy VN', items:1, total:2240000, status:'approved', date:'20/04', eta:'23/04', auto:false },
  { id:'PO-088', supplier:'Linen House',   items:1, total:3300000, status:'received', date:'19/04', eta:'21/04', auto:false },
  { id:'PO-087', supplier:'Bena Cosmetic', items:2, total:15200000,status:'received', date:'18/04', eta:'20/04', auto:false },
];

const invStyles = {
  topbar: { display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--fill-04)', background:'#fff', flexShrink:0 },
  tabs: { display:'flex', gap:2, padding:'8px 20px', borderBottom:'1px solid var(--fill-04)', background:'#fff' },
  tab: (a)=>({ padding:'8px 14px', borderRadius:7, fontSize:13, fontWeight:600, color:a?'var(--label-01)':'var(--label-02)', background:a?'var(--fill-04)':'transparent', border:'none', cursor:'pointer' }),
  page: { flex:1, overflow:'auto', padding:20, background:'var(--fill-05)' },
  card: { background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:16 },
  kpi: { background:'#fff', border:'1px solid var(--fill-04)', borderRadius:10, padding:14 },
};
const fmt = n => n.toLocaleString('vi-VN');

function StockHealth(){
  const total = ITEMS.length;
  const low = ITEMS.filter(i=>i.stock<i.min).length;
  const ok  = ITEMS.filter(i=>i.stock>=i.min).length;
  const value = ITEMS.reduce((s,i)=>s+i.stock*i.cost, 0);
  const burn = MOVEMENTS.filter(m=>m.type==='out').length;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:18 }}>
      <div style={invStyles.kpi}><div style={{fontSize:12,color:'var(--label-02)'}}>Tổng SKU</div><div style={{fontSize:28,fontWeight:700,marginTop:4}}>{total}</div><div style={{fontSize:11,color:'var(--label-03)',marginTop:6}}>4 nhóm hàng</div></div>
      <div style={invStyles.kpi}><div style={{fontSize:12,color:'var(--label-02)'}}>Sắp hết</div><div style={{fontSize:28,fontWeight:700,color:'#ef4444',marginTop:4}}>{low}</div><div style={{fontSize:11,color:'var(--label-03)',marginTop:6}}>cần bổ sung gấp</div></div>
      <div style={invStyles.kpi}><div style={{fontSize:12,color:'var(--label-02)'}}>Đủ tồn</div><div style={{fontSize:28,fontWeight:700,color:'#16a34a',marginTop:4}}>{ok}</div><div style={{fontSize:11,color:'var(--label-03)',marginTop:6}}>{Math.round(ok/total*100)}% an toàn</div></div>
      <div style={invStyles.kpi}><div style={{fontSize:12,color:'var(--label-02)'}}>Giá trị tồn</div><div style={{fontSize:22,fontWeight:700,color:'#0ea5e9',marginTop:4}}>{fmt(Math.round(value/1000000))}M₫</div><div style={{fontSize:11,color:'var(--label-03)',marginTop:6}}>2 chi nhánh</div></div>
      <div style={invStyles.kpi}><div style={{fontSize:12,color:'var(--label-02)'}}>Auto-deduct hôm nay</div><div style={{fontSize:28,fontWeight:700,color:'#8b5cf6',marginTop:4}}>{burn}</div><div style={{fontSize:11,color:'var(--label-03)',marginTop:6}}>từ booking đã hoàn thành</div></div>
    </div>
  );
}

function StockTab(){
  const [q,setQ] = useInv('');
  const [cat,setCat] = useInv('all');
  const cats = Array.from(new Set(ITEMS.map(i=>i.cat)));
  const list = ITEMS.filter(i => (cat==='all'||i.cat===cat) && (i.name.toLowerCase().includes(q.toLowerCase())||i.sku.toLowerCase().includes(q.toLowerCase())));

  return (
    <div style={invStyles.page}>
      <StockHealth/>

      <div style={invStyles.card}>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input placeholder="Tìm SKU, tên vật tư…" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,padding:'8px 12px',border:'1px solid var(--fill-04)',borderRadius:7,fontSize:13}}/>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'7px 10px',borderRadius:7,border:'1px solid var(--fill-04)',fontSize:12}}>
            <option value="all">Tất cả nhóm</option>
            {cats.map(c=> <option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm"><Icon.Filter/> Lọc</button>
          <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất Excel</button>
          <button className="btn btn-primary btn-sm"><Icon.Plus/> Vật tư mới</button>
        </div>

        <div style={{overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:920}}>
            <thead>
              <tr style={{background:'var(--fill-05)'}}>
                {['SKU','TÊN VẬT TƯ','NHÓM','TỒN','TỐI THIỂU','ĐƠN GIÁ','GIÁ TRỊ','NCC','CHI NHÁNH',''].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign: h==='TỒN'||h==='TỐI THIỂU'||h==='ĐƠN GIÁ'||h==='GIÁ TRỊ'?'right':'left',fontSize:11,fontWeight:700,color:'var(--label-02)',borderBottom:'1px solid var(--fill-04)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(it => {
                const low = it.stock < it.min;
                const ratio = Math.min(100, Math.round(it.stock/it.min*100));
                return (
                  <tr key={it.id} style={{borderBottom:'1px solid var(--fill-04)', background: low?'rgba(239,68,68,0.04)':'transparent'}}>
                    <td style={{padding:'12px',fontSize:11,fontFamily:'ui-monospace,monospace',color:'var(--label-02)'}}>{it.sku}</td>
                    <td style={{padding:'12px'}}>
                      <div style={{fontWeight:600,fontSize:13}}>{it.name}</div>
                      <div style={{fontSize:11,color:'var(--label-03)',marginTop:2}}>Cập nhật {it.last} · {it.unit}</div>
                    </td>
                    <td style={{padding:'12px'}}><span style={{padding:'2px 8px',background:'var(--fill-05)',borderRadius:5,fontSize:11,fontWeight:600}}>{it.cat}</span></td>
                    <td style={{padding:'12px',textAlign:'right'}}>
                      <div style={{fontWeight:700,fontSize:13,color: low?'#ef4444':'inherit'}}>{it.stock}</div>
                      <div style={{height:4,background:'var(--fill-05)',borderRadius:2,marginTop:4,width:60,marginLeft:'auto',overflow:'hidden'}}>
                        <div style={{width:`${ratio}%`,height:'100%',background: low?'#ef4444':'#16a34a'}}/>
                      </div>
                    </td>
                    <td style={{padding:'12px',textAlign:'right',color:'var(--label-03)'}}>{it.min}</td>
                    <td style={{padding:'12px',textAlign:'right'}}>{fmt(it.cost)}</td>
                    <td style={{padding:'12px',textAlign:'right',fontWeight:600}}>{fmt(it.stock*it.cost)}</td>
                    <td style={{padding:'12px',fontSize:11,color:'var(--label-02)'}}>{it.supplier}</td>
                    <td style={{padding:'12px',fontSize:11,color:'var(--label-03)'}}>{it.branch}</td>
                    <td style={{padding:'12px'}}>{low ? <button className="btn btn-primary btn-sm" style={{fontSize:11}}>Đặt hàng</button> : <button className="btn-icon"><Icon.More/></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RecipesTab(){
  return (
    <div style={invStyles.page}>
      <div style={{...invStyles.card, marginBottom:14, display:'flex', alignItems:'center', gap:14}}>
        <div style={{width:44,height:44,borderRadius:10,background:'rgba(139,92,246,0.12)',color:'#8b5cf6',display:'grid',placeItems:'center'}}><Icon.Sparkles/></div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>Auto-deduct theo dịch vụ</div>
          <div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>Khi booking chuyển sang trạng thái <b>Hoàn thành</b>, hệ thống tự trừ vật tư theo định mức bên dưới — không cần nhập tay.</div>
        </div>
        <span style={{padding:'4px 10px',background:'#dcfce7',color:'#166534',borderRadius:999,fontSize:11,fontWeight:600}}>● Đang hoạt động</span>
        <button className="btn btn-ghost btn-sm"><Icon.Set/> Cấu hình</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:14}}>
        {RECIPES.map((r,i)=>(
          <div key={i} style={invStyles.card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{r.svc}</div>
                <div style={{fontSize:11,color:'var(--label-03)',marginTop:2}}>{r.items.length} vật tư · COGS {fmt(r.cost)}₫</div>
              </div>
              <button className="btn btn-ghost btn-sm"><Icon.Edit/></button>
            </div>
            <div style={{display:'grid',gap:6}}>
              {r.items.map(it=>{
                const meta = ITEMS.find(x=>x.sku===it.sku);
                return (
                  <div key={it.sku} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--fill-05)',borderRadius:7}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600}}>{meta?.name||it.sku}</div>
                      <div style={{fontSize:10,color:'var(--label-03)',fontFamily:'ui-monospace,monospace'}}>{it.sku}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,fontWeight:700}}>{it.qty} {meta?.unit}</div>
                      <div style={{fontSize:10,color:'var(--label-03)'}}>~{fmt(Math.round(it.qty*(meta?.cost||0)))}₫</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementsTab(){
  const TY = { in:{l:'Nhập',bg:'#dcfce7',fg:'#166534'}, out:{l:'Xuất',bg:'#dbeafe',fg:'#1e40af'}, adj:{l:'Điều chỉnh',bg:'#fef3c7',fg:'#92400e'} };
  return (
    <div style={invStyles.page}>
      <div style={invStyles.card}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontWeight:700}}>Lịch sử nhập / xuất / điều chỉnh</div>
          <div style={{display:'flex',gap:6}}>
            <button className="btn btn-ghost btn-sm"><Icon.Filter/> Lọc</button>
            <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất CSV</button>
            <button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo phiếu</button>
          </div>
        </div>
        <div style={{display:'grid',gap:6}}>
          {MOVEMENTS.map(m => {
            const ty = TY[m.type];
            const meta = ITEMS.find(i=>i.sku===m.sku);
            return (
              <div key={m.id} style={{display:'grid',gridTemplateColumns:'120px 90px 1fr 120px 140px',gap:14,padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:7,alignItems:'center'}}>
                <div style={{fontSize:11,color:'var(--label-03)'}}>{m.when}</div>
                <span style={{padding:'3px 9px',background:ty.bg,color:ty.fg,borderRadius:5,fontSize:11,fontWeight:600,textAlign:'center'}}>{ty.l}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{meta?.name || m.sku}</div>
                  <div style={{fontSize:11,color:'var(--label-03)',marginTop:2}}>{m.ref}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color: m.type==='in'?'#16a34a': m.type==='out'?'#1e40af':'#92400e'}}>{m.type==='in'?'+':m.type==='out'?'-':''}{Math.abs(m.qty)} {meta?.unit||''}</div>
                <div style={{fontSize:11,color:'var(--label-02)'}}>{m.staff}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function POTab(){
  const ST = { pending:{l:'Chờ duyệt',bg:'#fef3c7',fg:'#92400e'}, approved:{l:'Đã duyệt',bg:'#dbeafe',fg:'#1e40af'}, received:{l:'Đã nhận',bg:'#dcfce7',fg:'#166534'} };
  return (
    <div style={invStyles.page}>
      <div style={{...invStyles.card, marginBottom:14, display:'flex', alignItems:'center', gap:14}}>
        <div style={{width:44,height:44,borderRadius:10,background:'rgba(245,158,11,0.12)',color:'#f59e0b',display:'grid',placeItems:'center'}}><Icon.Refresh/></div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>Auto-reorder thông minh</div>
          <div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>Khi tồn kho dưới mức tối thiểu, Claude Cowork tự gom các SKU cùng nhà cung cấp thành 1 phiếu PO chờ duyệt.</div>
        </div>
        <span style={{padding:'4px 10px',background:'#fef3c7',color:'#92400e',borderRadius:999,fontSize:11,fontWeight:600}}>2 phiếu chờ</span>
        <button className="btn btn-primary btn-sm"><Icon.Check/> Duyệt tất cả</button>
      </div>

      <div style={invStyles.card}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontWeight:700}}>Phiếu đặt hàng (Purchase Orders)</div>
          <button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo PO</button>
        </div>
        <div style={{overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'var(--fill-05)'}}>
                {['MÃ PO','NHÀ CUNG CẤP','SỐ MỤC','GIÁ TRỊ','NGÀY','ETA','TRẠNG THÁI',''].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign: h==='SỐ MỤC'||h==='GIÁ TRỊ'?'right':'left',fontSize:11,fontWeight:700,color:'var(--label-02)',borderBottom:'1px solid var(--fill-04)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PURCHASE_ORDERS.map(p=>{
                const st = ST[p.status];
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid var(--fill-04)'}}>
                    <td style={{padding:'12px',fontFamily:'ui-monospace,monospace',fontWeight:600}}>{p.id}{p.auto && <span style={{marginLeft:8,padding:'1px 6px',background:'rgba(139,92,246,0.12)',color:'#8b5cf6',borderRadius:4,fontSize:10,fontWeight:700}}>AUTO</span>}</td>
                    <td style={{padding:'12px'}}>{p.supplier}</td>
                    <td style={{padding:'12px',textAlign:'right'}}>{p.items}</td>
                    <td style={{padding:'12px',textAlign:'right',fontWeight:700}}>{fmt(p.total)}₫</td>
                    <td style={{padding:'12px'}}>{p.date}</td>
                    <td style={{padding:'12px',color:'var(--label-02)'}}>{p.eta}</td>
                    <td style={{padding:'12px'}}><span style={{padding:'3px 9px',background:st.bg,color:st.fg,borderRadius:999,fontSize:11,fontWeight:600}}>{st.l}</span></td>
                    <td style={{padding:'12px'}}>
                      {p.status==='pending' && <button className="btn btn-primary btn-sm" style={{fontSize:11}}>Duyệt</button>}
                      {p.status==='approved' && <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>Nhận hàng</button>}
                      {p.status==='received' && <button className="btn-icon"><Icon.More/></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventoryModule(){
  const [tab, setTab] = useInv('stock');
  const TABS = [
    { k:'stock',     l:'Tồn kho' },
    { k:'recipes',   l:'Định mức dịch vụ' },
    { k:'movements', l:'Lịch sử' },
    { k:'po',        l:'Đặt hàng' },
  ];
  const low = ITEMS.filter(i=>i.stock<i.min).length;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={invStyles.topbar}>
        <Icon.Package width="20" height="20"/>
        <span style={{fontWeight:700,fontSize:15}}>Inventory & Vật tư</span>
        <span style={{padding:'2px 8px',background:'var(--fill-05)',borderRadius:999,fontSize:11,color:'var(--label-02)'}}>{ITEMS.length} SKU</span>
        {low>0 && <span style={{padding:'2px 8px',background:'#fee2e2',color:'#991b1b',borderRadius:999,fontSize:11,fontWeight:600}}>● {low} sắp hết</span>}
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Refresh/> Kiểm kê</button>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Báo cáo tồn</button>
        <button className="btn btn-primary btn-sm"><Icon.Plus/> Nhập kho</button>
      </div>
      <div style={invStyles.tabs}>
        {TABS.map(t => <button key={t.k} onClick={()=>setTab(t.k)} style={invStyles.tab(tab===t.k)}>{t.l}</button>)}
      </div>
      {tab==='stock'     && <StockTab/>}
      {tab==='recipes'   && <RecipesTab/>}
      {tab==='movements' && <MovementsTab/>}
      {tab==='po'        && <POTab/>}
    </div>
  );
}

window.InventoryModule = InventoryModule;
