/* ===== billing-page.jsx — Gói dịch vụ & Thanh toán =====
 * Settings → Gói & thanh toán:
 * 1) Thông tin gói hiện tại (hạn dùng, user, connection, token, trạng thái)
 * 2) Token: định mức + phí phát sinh, ngưỡng tạm ngừng 5.000.000 ₫
 * 3) Mua thêm User / Account Connection — bảng giá + QR Code
 * 4) Lịch sử hóa đơn + bộ lọc (mã, gói, trạng thái, thời gian)
 * 5) Popup hết hạn / chạm ngưỡng (demo)
 * ======================================================= */
;(function(){
try {
const { useState: useBP, useMemo: useBPM } = React;
const IcBP = (n,p)=>{ const C = window.Icon && window.Icon[n]; return C ? <C {...p}/> : null; };

const bpCard = {background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:18};
const bpBtn  = {height:34, padding:'0 14px', borderRadius:8, border:'1px solid var(--fill-04)', background:'white', fontSize:12.5, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap'};
const bpPri  = {...bpBtn, background:'var(--primary)', color:'white', border:'none', fontWeight:700};
const bpChip = (bg,fg)=>({display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:700, background:bg, color:fg, whiteSpace:'nowrap'});
const fmtVnd = n => n.toLocaleString('vi-VN') + ' ₫';

/* ── Fake QR (deterministic) ── */
function BPQr({size=148, seed=7}) {
  const cells=[]; let s=seed;
  const rnd=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  const N=21;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const corner=(x<7&&y<7)||(x>=N-7&&y<7)||(x<7&&y>=N-7);
    if(corner){
      const lx=x%(N-7), ly=y%(N-7);
      const on=(lx===0||lx===6||ly===0||ly===6||(lx>1&&lx<5&&ly>1&&ly<5));
      if(on) cells.push([x,y]);
    } else if(rnd()>0.52) cells.push([x,y]);
  }
  const u=size/N;
  return (
    <svg width={size} height={size} style={{borderRadius:8, border:'1px solid var(--fill-04)', background:'white', padding:6, boxSizing:'content-box'}}>
      {cells.map(([x,y],i)=><rect key={i} x={x*u} y={y*u} width={u*0.92} height={u*0.92} fill="#1A2B20"/>)}
    </svg>
  );
}

/* ── QR payment modal ── */
function BPPayModal({title, amount, note, onClose}) {
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(15,20,28,.5)', zIndex:200, display:'grid', placeItems:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:560, background:'white', borderRadius:16, padding:24, boxShadow:'0 30px 80px rgba(0,0,0,.3)'}}>
        <div style={{display:'flex', alignItems:'center', marginBottom:4}}>
          <div style={{fontSize:17, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{title}</div>
          <span style={{flex:1}}/>
          <button className="btn-icon" onClick={onClose} style={{width:28, height:28}}>{IcBP('Close',{width:14, height:14})}</button>
        </div>
        <div style={{fontSize:12.5, color:'var(--label-02)', marginBottom:16}}>Quét QR bằng app ngân hàng hoặc chuyển khoản thủ công — hệ thống tự xác nhận trong ~1 phút.</div>
        <div style={{display:'flex', gap:18}}>
          <div style={{textAlign:'center', flexShrink:0}}>
            <BPQr/>
            <div style={{fontSize:10.5, color:'var(--label-03)', marginTop:6}}>VietQR · Napas 247</div>
          </div>
          <div style={{flex:1, fontSize:13}}>
            {[
              ['Số tiền', <b key="a" style={{fontSize:16, color:'var(--pr-dark-2)'}}>{fmtVnd(amount)}</b>],
              ['Ngân hàng', <b key="b">Vietcombank — CN HCM</b>],
              ['Số tài khoản', <b key="c" style={{fontFamily:'ui-monospace, monospace'}}>0071 000 888 999</b>],
              ['Chủ tài khoản', <b key="d">CTY CP MEDIASOFT VN</b>],
              ['Nội dung CK', <b key="e" style={{fontFamily:'ui-monospace, monospace', fontSize:12}}>{note}</b>],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex', justifyContent:'space-between', gap:10, padding:'8px 0', borderBottom:'1px solid var(--fill-03)'}}>
                <span style={{color:'var(--label-02)', whiteSpace:'nowrap'}}>{k}</span><span style={{textAlign:'right', minWidth:0}}>{v}</span>
              </div>
            ))}
            <div style={{display:'flex', gap:8, marginTop:14}}>
              <button style={{...bpPri, flex:1, justifyContent:'center'}} onClick={onClose}>{IcBP('Check',{width:14, height:14})} Tôi đã chuyển khoản</button>
              <button style={{...bpBtn}} onClick={onClose}>Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Popup hết hạn / tạm ngừng (demo) ── */
function BPTokenPacks({ onPick, onClose }){
  const PACKS=[
    {k:'A', name:'Gói A', tok:1000000, price:1000000, sub:'Tối thiểu · dùng linh hoạt'},
    {k:'B', name:'Gói B', tok:3000000, price:2850000, sub:'Tiết kiệm 5%', tag:'Phổ biến'},
    {k:'C', name:'Gói C', tok:5000000, price:4500000, sub:'Tiết kiệm 10%', tag:'Tốt nhất'},
  ];
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(15,20,28,.5)', zIndex:200, display:'grid', placeItems:'center', padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:760, maxWidth:'95vw', background:'white', borderRadius:16, padding:24, boxShadow:'0 30px 80px rgba(0,0,0,.3)'}}>
        <div style={{display:'flex', alignItems:'flex-start', marginBottom:6}}>
          <div><div style={{fontSize:18, fontWeight:800}}>Mua thêm Token</div><div style={{fontSize:12.5, color:'var(--label-02)', marginTop:2}}>Chọn gói token để nạp vào tài khoản — thanh toán qua QR Code.</div></div>
          <span style={{flex:1}}/>
          <button className="btn-icon" onClick={onClose}>{IcBP('Close',{width:18, height:18}) || '✕'}</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:14}}>
          {PACKS.map(p=>(
            <div key={p.k} style={{border:'1px solid '+(p.tag?'var(--primary)':'var(--fill-04)'), borderRadius:14, padding:18, position:'relative', display:'flex', flexDirection:'column'}}>
              {p.tag && <span style={{position:'absolute', top:-10, left:16, ...bpChip('var(--primary)','white')}}>{p.tag}</span>}
              <div style={{fontSize:13, fontWeight:700, color:'var(--label-02)'}}>{p.name}</div>
              <div style={{fontSize:26, fontWeight:800, margin:'6px 0 0', color:'var(--label-01)'}}>{(p.tok/1000000)}M <span style={{fontSize:13, fontWeight:600, color:'var(--label-03)'}}>token</span></div>
              <div style={{fontSize:11.5, color:'var(--label-03)', marginBottom:14}}>{p.sub}</div>
              <div style={{fontSize:20, fontWeight:800, color:'var(--pr-dark-2)'}}>{fmtVnd(p.price)}</div>
              <div style={{flex:1}}/>
              <button style={{...bpPri, width:'100%', justifyContent:'center', marginTop:14}} onClick={()=>onPick({title:'Mua thêm Token · '+p.name+' ('+(p.tok/1000000)+'M)', amount:p.price, note:'APPCHAT TOKEN '+p.k+' '+(p.tok/1000000)+'M'})}>{IcBP('CreditCard',{width:14, height:14})} Thanh toán QR</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const BP_PLANS=[
  {k:'starter', name:'Starter', price:24000000, users:5, tok:'30K', sub:'Đội nhỏ bắt đầu'},
  {k:'growth',  name:'Growth',  price:48000000, users:10, tok:'60K', sub:'Doanh nghiệp tăng trưởng'},
  {k:'ultimate',name:'Ultimate',price:90000000, users:15, tok:'100K', sub:'Gói hiện tại', current:true},
  {k:'enterprise',name:'Enterprise', price:180000000, users:'Không giới hạn', tok:'300K', sub:'Quy mô lớn · SLA riêng'},
];
function BPPlanModal({ onPick, onClose }){
  const [step, setStep] = useBP('choose'); // choose | plans
  const CUR_IDX = BP_PLANS.findIndex(p=>p.current);
  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(15,20,28,.5)', zIndex:200, display:'grid', placeItems:'center', padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width: step==='choose'?460:880, maxWidth:'95vw', background:'white', borderRadius:16, padding:24, boxShadow:'0 30px 80px rgba(0,0,0,.3)'}}>
        <div style={{display:'flex', alignItems:'flex-start', marginBottom:6}}>
          <div><div style={{fontSize:18, fontWeight:800}}>{step==='choose'?'Thanh toán gói dịch vụ':'Chọn gói nâng cấp / hạ gói'}</div><div style={{fontSize:12.5, color:'var(--label-02)', marginTop:2}}>{step==='choose'?'Gia hạn gói hiện tại hoặc đổi sang gói khác.':'Gói hiện tại: AppChat Ultimate · 90.000.000 ₫ / năm'}</div></div>
          <span style={{flex:1}}/>
          <button className="btn-icon" onClick={onClose}>{IcBP('Close',{width:18, height:18}) || '✕'}</button>
        </div>

        {step==='choose' ? (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:16}}>
            <button onClick={()=>onPick({title:'Gia hạn AppChat Ultimate · 12 tháng', amount:90000000, note:'APPCHAT GIAHAN MSVN2026'})} style={{textAlign:'left', border:'1px solid var(--fill-04)', borderRadius:14, padding:'18px 16px', cursor:'pointer', background:'white', fontFamily:'inherit'}}>
              <span style={{width:36, height:36, borderRadius:10, background:'var(--bg-green)', color:'var(--pr-dark-1)', display:'grid', placeItems:'center', marginBottom:10}}>{IcBP('Refresh',{width:18, height:18})}</span>
              <div style={{fontSize:15, fontWeight:800}}>Gia hạn gói hiện tại</div>
              <div style={{fontSize:12, color:'var(--label-02)', margin:'4px 0 10px'}}>Tiếp tục AppChat Ultimate, giữ nguyên tính năng & hạn mức.</div>
              <div style={{fontSize:16, fontWeight:800, color:'var(--pr-dark-2)'}}>{fmtVnd(90000000)} <span style={{fontSize:12, fontWeight:600, color:'var(--label-03)'}}>/ năm</span></div>
            </button>
            <button onClick={()=>setStep('plans')} style={{textAlign:'left', border:'1px solid var(--primary)', borderRadius:14, padding:'18px 16px', cursor:'pointer', background:'var(--bg-green)', fontFamily:'inherit'}}>
              <span style={{width:36, height:36, borderRadius:10, background:'var(--primary)', color:'white', display:'grid', placeItems:'center', marginBottom:10}}>{IcBP('Zap',{width:18, height:18})}</span>
              <div style={{fontSize:15, fontWeight:800}}>Nâng cấp / hạ gói</div>
              <div style={{fontSize:12, color:'var(--label-02)', margin:'4px 0 10px'}}>Đổi sang gói cao hơn (nhiều token/user) hoặc gói thấp hơn.</div>
              <div style={{fontSize:13, fontWeight:700, color:'var(--pr-dark-2)'}}>Xem các gói →</div>
            </button>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginTop:16}}>
            {BP_PLANS.map((p,i)=>{ const rel = p.current?'current':(i>CUR_IDX?'up':'down'); return (
              <div key={p.k} style={{border:'1px solid '+(p.current?'var(--primary)':'var(--fill-04)'), borderRadius:14, padding:16, display:'flex', flexDirection:'column', background:p.current?'var(--bg-green)':'white'}}>
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                  <span style={{fontSize:14, fontWeight:800}}>{p.name}</span>
                  {rel==='current' && <span style={bpChip('var(--fill-03)','var(--label-02)')}>Hiện tại</span>}
                  {rel==='up' && <span style={bpChip('#E7F0FF','#1B5FCC')}>Nâng cấp</span>}
                  {rel==='down' && <span style={bpChip('#FCF3E2','#8A5A10')}>Hạ gói</span>}
                </div>
                <div style={{fontSize:11.5, color:'var(--label-03)', marginBottom:10, minHeight:30}}>{p.sub}</div>
                <div style={{fontSize:18, fontWeight:800, color:'var(--pr-dark-2)'}}>{fmtVnd(p.price)}</div>
                <div style={{fontSize:10.5, color:'var(--label-03)', marginBottom:10}}>/ năm</div>
                <div style={{fontSize:11.5, color:'var(--label-02)', lineHeight:1.7, marginBottom:12}}>{p.users} user · {p.tok} token/tháng</div>
                <div style={{flex:1}}/>
                {p.current ? (
                  <button disabled style={{...bpBtn, width:'100%', justifyContent:'center', opacity:.5, cursor:'default'}}>Đang dùng</button>
                ) : (
                  <button style={{...bpPri, width:'100%', justifyContent:'center'}} onClick={()=>onPick({title:(rel==='up'?'Nâng cấp':'Hạ gói')+' → '+p.name+' · 12 tháng', amount:p.price, note:'APPCHAT '+(rel==='up'?'NANGCAP':'HAGOI')+' '+p.k.toUpperCase()})}>{IcBP('CreditCard',{width:13, height:13})} {rel==='up'?'Nâng cấp':'Hạ gói'}</button>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pricing (Cá nhân / Doanh nghiệp · kiểu ChatGPT) ── */
const BP_PRICING = {
  ca_nhan: {
    label:'Cá nhân', sub:'Cho freelancer, chủ shop, người dùng đơn lẻ',
    plans:[
      {k:'free', name:'Miễn phí', m:0, y:0, desc:'Bắt đầu trải nghiệm AppChat', cta:'Đang miễn phí', free:true,
        feats:['1 người dùng','1 kênh kết nối','1 AI Agent (Claude Haiku)','5.000 token AI / tháng','CRM cơ bản · 500 liên hệ','Hỗ trợ cộng đồng']},
      {k:'personal', name:'Cá nhân', m:199000, y:2030000, desc:'Cá nhân hoá & bán hàng đa kênh', cta:'Chọn gói',
        feats:['1 người dùng','3 kênh kết nối','AI Haiku + Sonnet','30.000 token AI / tháng','CRM + pipeline + báo giá','Tickets cơ bản · Quick-reply']},
      {k:'personal_pro', name:'Cá nhân Pro', m:499000, y:5090000, desc:'Toàn bộ sức mạnh cho cá nhân', cta:'Chọn gói', best:true,
        feats:['1 người dùng','8 kênh kết nối','AI full model (cả Opus)','100.000 token AI / tháng','Reports nâng cao + Marketing','Ưu tiên hỗ trợ 24/7']},
      {k:'personal_max', name:'Cá nhân Max', m:999000, y:10190000, desc:'Cá nhân chuyên nghiệp tối đa', cta:'Chọn gói',
        feats:['1 người dùng','19 kênh kết nối','AI full + Call Center','250.000 token AI / tháng','Reports tuỳ biến + tất cả add-on','Hỗ trợ ưu tiên cao nhất']},
    ],
  },
  doanh_nghiep: {
    label:'Doanh nghiệp', sub:'Cho đội nhóm, công ty & tập đoàn',
    plans:[
      {k:'team', name:'Team', m:2400000, y:24480000, desc:'Đội nhỏ vận hành chuyên nghiệp', cta:'Chọn gói',
        feats:['5 người dùng','12 kênh kết nối','AI Agents + Workflow','200.000 token AI / tháng','SLA · Escalation · CSAT','Marketing ZNS / Email / ZBS']},
      {k:'business', name:'Business', m:6000000, y:61200000, desc:'Gói hiện tại của bạn', cta:'Đang dùng', current:true,
        feats:['15 người dùng','19 kênh kết nối','500.000 token AI / tháng','Call Center · Tổng đài','Reports tuỳ biến + API','Customer Success Manager']},
      {k:'premium', name:'Premium', m:12000000, y:122400000, desc:'Doanh nghiệp quy mô lớn', cta:'Chọn gói', best:true,
        feats:['40 người dùng','19 kênh + ưu tiên băng thông','1.200.000 token AI / tháng','Call Center nâng cao','AI Governance + Audit','CSM riêng + SLA 99.9%']},
      {k:'enterprise', name:'Enterprise', m:null, y:null, desc:'Quy mô tập đoàn · tuỳ biến', cta:'Liên hệ tư vấn', contact:true,
        feats:['Người dùng không giới hạn','19 kênh + tích hợp riêng','Token theo nhu cầu','AI Governance ISO 42001','SLA riêng · On-premise','Triển khai & đào tạo riêng']},
    ],
  },
};
function BPPricing({ onPick, onContact, seg, setSeg }){
  const [cycle, setCycle] = useBP('year');
  const [pg, setPg] = useBP(0);
  React.useEffect(()=>{ setPg(0); }, [seg]);
  const data = BP_PRICING[seg];
  return (
    <div style={{...bpCard, marginBottom:14}}>
      <div style={{display:'flex', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:6}}>
        <div>
          <div style={{fontSize:16, fontWeight:800}}>Nâng cấp gói</div>
          <div style={{fontSize:12.5, color:'var(--label-02)'}}>{data.sub} · tính năng theo nền tảng AppChat</div>
        </div>
        <span style={{flex:1}}/>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:9, gap:2}}>
          {[['ca_nhan','Cá nhân'],['doanh_nghiep','Doanh nghiệp']].map(([k,l])=>(
            <button key={k} onClick={()=>setSeg(k)} style={{padding:'6px 14px', border:'none', borderRadius:7, cursor:'pointer', fontSize:12.5, fontWeight:700, fontFamily:'inherit', background:seg===k?'white':'transparent', color:seg===k?'var(--label-01)':'var(--label-02)', boxShadow:seg===k?'0 1px 2px rgba(0,0,0,.08)':'none'}}>{l}</button>
          ))}
        </div>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:9, gap:2}}>
          {[['month','Tháng'],['year','Năm · -15%']].map(([k,l])=>(
            <button key={k} onClick={()=>setCycle(k)} style={{padding:'6px 12px', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', background:cycle===k?'white':'transparent', color:cycle===k?'var(--label-01)':'var(--label-02)', boxShadow:cycle===k?'0 1px 2px rgba(0,0,0,.08)':'none'}}>{l}</button>
          ))}
        </div>
      </div>

      {(()=>{ const per=2; const pages=Math.ceil(data.plans.length/per); const slice=data.plans.slice(pg*per,pg*per+per);
      return (<>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:14}}>
        {slice.map(p=>{ const price = cycle==='year'?p.y:p.m; const hl=p.best||p.current; return (
          <div key={p.k} style={{border:'1px solid '+(hl?'var(--primary)':'var(--fill-04)'), borderRadius:14, padding:'20px 20px', position:'relative', display:'flex', flexDirection:'column', background:p.current?'var(--bg-green)':'white'}}>
            {p.best && <span style={{position:'absolute', top:-10, left:18, ...bpChip('var(--primary)','white')}}>Phổ biến nhất</span>}
            {p.current && <span style={{position:'absolute', top:-10, left:18, ...bpChip('var(--pr-dark-1)','white')}}>Gói hiện tại</span>}
            <div style={{fontSize:17, fontWeight:800}}>{p.name}</div>
            <div style={{fontSize:12.5, color:'var(--label-02)', margin:'4px 0 14px', minHeight:36}}>{p.desc}</div>
            <div style={{display:'flex', alignItems:'baseline', gap:5, marginBottom:16}}>
              {price==null ? <span style={{fontSize:26, fontWeight:800, color:'var(--label-01)'}}>Liên hệ</span>
                : price===0 ? <span style={{fontSize:26, fontWeight:800, color:'var(--label-01)'}}>Miễn phí</span>
                : <><span style={{fontSize:26, fontWeight:800, color:'var(--label-01)'}}>{fmtVnd(price)}</span><span style={{fontSize:13, color:'var(--label-03)'}}>/ {cycle==='year'?'năm':'tháng'}</span></>}
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:18}}>
              {p.feats.map((f,i)=>(<div key={i} style={{display:'flex', gap:9, fontSize:12.5, lineHeight:1.45}}><span style={{color:'var(--primary)', flexShrink:0, marginTop:1}}>{IcBP('Check',{width:14, height:14})}</span><span style={{color:'var(--label-01)'}}>{f}</span></div>))}
            </div>
            <div style={{flex:1}}/>
            {p.current ? (
              <button disabled style={{...bpBtn, width:'100%', justifyContent:'center', opacity:.55, cursor:'default'}}>Đang dùng</button>
            ) : p.free ? (
              <button disabled style={{...bpBtn, width:'100%', justifyContent:'center', opacity:.55, cursor:'default'}}>{p.cta}</button>
            ) : p.contact ? (
              <button style={{...bpBtn, width:'100%', justifyContent:'center', borderColor:'var(--primary)', color:'var(--pr-dark-2)'}} onClick={onContact}>{p.cta}</button>
            ) : (
              <button style={{...bpPri, width:'100%', justifyContent:'center'}} onClick={()=>onPick({title:'Đăng ký gói '+p.name+' · '+(cycle==='year'?'12 tháng':'1 tháng'), amount:price, note:'APPCHAT '+seg.toUpperCase()+' '+p.k.toUpperCase()})}>{p.cta}</button>
            )}
          </div>
        );})}
      </div>
      {pages>1 && (
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginTop:16}}>
          <button onClick={()=>setPg(p=>Math.max(0,p-1))} disabled={pg===0} style={{...bpBtn, width:38, height:38, padding:0, justifyContent:'center', borderRadius:'50%', opacity:pg===0?.4:1}}>{IcBP('ChevronDown',{width:18, height:18, style:{transform:'rotate(90deg)'}}) || '‹'}</button>
          <div style={{display:'flex', gap:7}}>
            {Array.from({length:pages}).map((_,i)=>(
              <button key={i} onClick={()=>setPg(i)} style={{width:pg===i?22:8, height:8, borderRadius:5, border:'none', cursor:'pointer', padding:0, background:pg===i?'var(--primary)':'var(--fill-04)', transition:'width .2s'}}/>
            ))}
          </div>
          <button onClick={()=>setPg(p=>Math.min(pages-1,p+1))} disabled={pg>=pages-1} style={{...bpBtn, width:38, height:38, padding:0, justifyContent:'center', borderRadius:'50%', opacity:pg>=pages-1?.4:1}}>{IcBP('ChevronDown',{width:18, height:18, style:{transform:'rotate(-90deg)'}}) || '›'}</button>
        </div>
      )}
      </>); })()}

      <BPCompare seg={seg}/>

      <div style={{display:'flex', gap:10, marginTop:16, padding:'12px 15px', background:'var(--fill-02)', borderRadius:10}}>
        {IcBP('Zap',{width:16, height:16, style:{color:'var(--primary)', flexShrink:0, marginTop:1}})}
        <div style={{fontSize:11.5, color:'var(--label-02)', lineHeight:1.6}}>
          <b style={{color:'var(--label-01)'}}>Lộ trình nâng cấp:</b> Gói Cá nhân có thể nâng lên gói Cá nhân cao hơn hoặc chuyển thẳng sang gói Doanh nghiệp. Gói Doanh nghiệp có thể nâng lên gói cao hơn hoặc chủ động hạ gói theo từng thời điểm. <b style={{color:'#A63322'}}>Lưu ý:</b> khi nâng cấp/đổi gói, Token và tính năng được tính lại theo <b>gói mới</b> — không quy đổi hay cộng dồn Token còn lại của gói cũ. Khi hạ gói cũng không hoàn/quy đổi thời gian sử dụng hoặc dịch vụ đi kèm.
        </div>
      </div>
    </div>
  );
}

/* ── Bảng so sánh chi tiết theo phân khúc ── */
const BP_COMPARE = {
  ca_nhan: {
    cols:['Miễn phí','Cá nhân','Cá nhân Pro','Cá nhân Max'],
    groups:[
      {g:'Cơ bản', rows:[
        ['Người dùng','1','1','1','1'],
        ['Kênh kết nối','1','3','8','19'],
        ['Hội thoại / tháng','Không giới hạn','Không giới hạn','Không giới hạn','Không giới hạn'],
        ['Lưu trữ','1 GB','10 GB','50 GB','200 GB'],
      ]},
      {g:'AI Agent', rows:[
        ['Model AI','Haiku','Haiku + Sonnet','Full (cả Opus)','Full (cả Opus)'],
        ['Token AI / tháng','5.000','30.000','100.000','250.000'],
        ['Knowledge Base (RAG)','—','✓','✓','✓'],
        ['Workflow tự động','—','—','✓','✓'],
      ]},
      {g:'Nghiệp vụ', rows:[
        ['CRM 360° + pipeline','Cơ bản','✓','✓','✓'],
        ['Tickets & SLA','—','Cơ bản','✓','✓'],
        ['Marketing (ZNS/Email/ZBS)','—','—','✓','✓'],
        ['Call Center / Tổng đài','—','—','—','✓'],
        ['Reports','Cơ bản','Cơ bản','Nâng cao','Tuỳ biến'],
      ]},
      {g:'Hỗ trợ', rows:[
        ['Kênh hỗ trợ','Cộng đồng','Email','24/7','Ưu tiên cao nhất'],
      ]},
    ],
  },
  doanh_nghiep: {
    cols:['Team','Business','Premium','Enterprise'],
    groups:[
      {g:'Cơ bản', rows:[
        ['Người dùng','5','15','40','Không giới hạn'],
        ['Kênh kết nối','12','19','19 + ưu tiên','19 + tích hợp riêng'],
        ['Hội thoại / tháng','Không giới hạn','Không giới hạn','Không giới hạn','Không giới hạn'],
        ['Lưu trữ','100 GB','500 GB','1 TB','Tuỳ nhu cầu'],
      ]},
      {g:'AI Agent', rows:[
        ['Model AI','Full','Full','Full','Full + tuỳ biến'],
        ['Token AI / tháng','200.000','500.000','1.200.000','Theo nhu cầu'],
        ['Workflow + Routing','✓','✓','✓','✓'],
        ['AI Governance (ISO 42001)','—','—','✓','✓'],
      ]},
      {g:'Nghiệp vụ', rows:[
        ['CRM + Hợp đồng/Báo giá','✓','✓','✓','✓'],
        ['Tickets · SLA · Escalation','✓','✓','✓','✓'],
        ['Marketing đa kênh','✓','✓','✓','✓'],
        ['Call Center','—','✓','Nâng cao','Tuỳ biến'],
        ['Reports','Tiêu chuẩn','Tuỳ biến + API','Tuỳ biến + API','Tuỳ biến + BI'],
      ]},
      {g:'Hỗ trợ & vận hành', rows:[
        ['Hỗ trợ','Email','CSM','CSM riêng','CSM riêng 24/7'],
        ['SLA cam kết','—','99%','99.9%','SLA riêng'],
        ['On-premise / đào tạo','—','—','—','✓'],
      ]},
    ],
  },
};
function BPCompare({ seg }){
  const [open, setOpen] = useBP(true);
  const d = BP_COMPARE[seg];
  const cell = (v)=> v==='✓'
    ? <span style={{color:'var(--primary)'}}>{IcBP('Check',{width:15, height:15})}</span>
    : v==='—' ? <span style={{color:'var(--label-04)'}}>—</span>
    : <span style={{fontSize:12, color:'var(--label-01)', fontWeight:600}}>{v}</span>;
  return (
    <div style={{marginTop:18, border:'1px solid var(--fill-04)', borderRadius:12, overflow:'hidden'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'13px 16px', border:'none', background:'var(--fill-02)', cursor:'pointer', fontFamily:'inherit'}}>
        <span style={{fontSize:13.5, fontWeight:800, color:'var(--label-01)', flex:1, textAlign:'left'}}>So sánh chi tiết các gói {seg==='ca_nhan'?'Cá nhân':'Doanh nghiệp'}</span>
        <span style={{fontSize:12, color:'var(--label-02)', fontWeight:600}}>{open?'Thu gọn':'Xem bảng so sánh'}</span>
        <span style={{transform:open?'rotate(180deg)':'none', transition:'transform .15s', color:'var(--label-03)'}}>{IcBP('ChevronDown',{width:16, height:16}) || '▾'}</span>
      </button>
      {open && (
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:680}}>
            <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr 1fr', position:'sticky', top:0, background:'white', borderBottom:'2px solid var(--fill-04)'}}>
              <span style={{padding:'12px 16px', fontSize:12, fontWeight:800, color:'var(--label-02)'}}>Tính năng</span>
              {d.cols.map(c=><span key={c} style={{padding:'12px 10px', fontSize:12.5, fontWeight:800, textAlign:'center', color:'var(--label-01)'}}>{c}</span>)}
            </div>
            {d.groups.map(grp=>(
              <div key={grp.g}>
                <div style={{padding:'8px 16px', fontSize:11, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--pr-dark-2)', background:'var(--bg-green)'}}>{grp.g}</div>
                {grp.rows.map((r,i)=>(
                  <div key={i} style={{display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr 1fr', borderBottom:'1px solid var(--fill-03)', alignItems:'center'}}>
                    <span style={{padding:'10px 16px', fontSize:12, color:'var(--label-02)'}}>{r[0]}</span>
                    {r.slice(1).map((v,j)=><span key={j} style={{padding:'10px', textAlign:'center'}}>{cell(v)}</span>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Popup hết hạn / tạm ngừng (demo) ── */
function BPBlockPopup({kind, onRenew, onBuyToken, onUpgrade, onClose}) {
  const expired = kind==='expired'; const token = kind==='token';
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(15,20,28,.55)', zIndex:200, display:'grid', placeItems:'center'}}>
      <div style={{width:480, background:'white', borderRadius:16, padding:28, textAlign:'center', boxShadow:'0 30px 80px rgba(0,0,0,.3)'}}>
        <div style={{width:60, height:60, borderRadius:16, margin:'0 auto 14px', display:'grid', placeItems:'center', background: expired?'#FDECEA':(token?'#EAF6FF':'#FFF4E4'), color: expired?'#E33F3F':(token?'#0E6FCC':'#C27614')}}>
          {IcBP(expired?'Clock':(token?'Sparkles':'AlertTri'),{width:30, height:30})}
        </div>
        <div style={{fontSize:19, fontWeight:800, marginBottom:8}}>{expired ? 'Gói dịch vụ đã hết hạn' : token ? 'Bạn đã dùng hết Token của gói' : 'Đã chạm ngưỡng phí Token 5.000.000 ₫'}</div>
        <div style={{fontSize:13.5, color:'var(--label-02)', lineHeight:1.6, marginBottom:20}}>
          {expired
            ? <>Gói <b>AppChat Ultimate</b> đã hết hạn ngày <b>20/12/2026</b>. Vui lòng gia hạn hoặc mua gói mới để tiếp tục sử dụng. Dữ liệu của bạn được giữ nguyên trong 30 ngày.</>
            : token
            ? <>Gói của bạn <b>vẫn còn hạn</b> nhưng lượng Token đi kèm đã dùng hết. Để tiếp tục sử dụng AI Agent, vui lòng <b>mua thêm Token</b> hoặc nâng cấp lên gói cao hơn.</>
            : <>Chi phí Token phát sinh đã đạt <b style={{color:'#A63322'}}>5.000.000 ₫</b> — hệ thống tạm ngừng sử dụng AI theo chính sách. Vui lòng thanh toán để tiếp tục.</>}
        </div>
        <div style={{display:'flex', gap:10, justifyContent:'center'}}>
          {token
            ? <>
                <button style={{...bpPri, height:42, padding:'0 22px', fontSize:13.5}} onClick={onBuyToken}>{IcBP('Sparkles',{width:14, height:14})} Mua thêm Token</button>
                <button style={{...bpBtn, height:42}} onClick={onUpgrade}>Nâng cấp gói</button>
              </>
            : <>
                <button style={{...bpPri, height:42, padding:'0 22px', fontSize:13.5}} onClick={onRenew}>{IcBP('Zap',{width:14, height:14})} {expired?'Gia hạn ngay':'Thanh toán ngay'}</button>
                {expired && <button style={{...bpBtn, height:42}} onClick={onRenew}>Mua gói mới</button>}
              </>}
          <button style={{...bpBtn, height:42, color:'var(--label-02)'}} onClick={onClose}>Để sau</button>
        </div>
      </div>
    </div>
  );
}

/* ── data ── */
const BP_INVOICES = [
  {code:'INV-2026-0612', plan:'Ultimate · 12 tháng', date:'2025-12-20', amt:90000000, via:'Chuyển khoản', st:'paid'},
  {code:'INV-2026-0588', plan:'Mua thêm 5 User', date:'2026-04-12', amt:9000000, via:'QR Code', st:'paid'},
  {code:'INV-2026-0541', plan:'Token bổ sung 50K', date:'2026-03-01', amt:5000000, via:'QR Code', st:'paid'},
  {code:'INV-2026-0712', plan:'Phí Token phát sinh T5', date:'2026-06-05', amt:1240000, via:'Chuyển khoản', st:'pending'},
  {code:'INV-2026-0488', plan:'Mua thêm 3 Account Connection', date:'2026-02-14', amt:1800000, via:'QR Code', st:'paid'},
  {code:'INV-2025-1102', plan:'Growth · 6 tháng (gói cũ)', date:'2025-06-20', amt:23400000, via:'Chuyển khoản', st:'paid'},
  {code:'INV-2025-0931', plan:'Token bổ sung 20K', date:'2025-09-02', amt:2000000, via:'QR Code', st:'overdue'},
];
const BP_ST = {
  paid:    {l:'Đã thanh toán', bg:'var(--bg-green)', fg:'var(--pr-dark-2)'},
  pending: {l:'Chờ xác nhận',  bg:'#FFF4E4', fg:'#8A5A10'},
  overdue: {l:'Quá hạn',       bg:'#FDECEA', fg:'#A63322'},
};

/* Biểu giá lưu trữ — theo gói lưu trữ Zalo Cloud */
const BP_STORAGE = [
  {gb:'100 GB', price:50000},
  {gb:'500 GB', price:200000},
  {gb:'1 TB',  price:350000},
  {gb:'2 TB',  price:650000},
];

/* Add-on tính năng */
const BP_FEATURES = [
  {k:'em',  t:'Email Marketing & Zalo ZBS', ic:'Broadcast', price:990000, unit:'/ tháng', cta:'Kích hoạt', note:'APPCHAT ADDON EMAIL-ZBS',
    desc:'Gửi chiến dịch Email + Zalo Broadcast (ZBS) — phân khúc, A/B test, lịch gửi, báo cáo mở/click.'},
  {k:'gs',  t:'Tích hợp Google Sheet', ic:'FileText', price:300000, unit:'/ tháng', cta:'Kích hoạt', note:'APPCHAT ADDON GSHEET',
    desc:'Đồng bộ 2 chiều liên hệ, deal, đơn hàng sang Google Sheet theo thời gian thực.'},
  {k:'api', t:'Gói tích hợp (theo yêu cầu)', ic:'Plug', price:null, unit:'', cta:'Liên hệ tư vấn', note:null,
    desc:'Kết nối ERP/CRM/Webhook riêng, API tuỳ biến — đội kỹ thuật triển khai &amp; báo giá riêng.'},
  {k:'train', t:'Gói dịch vụ đào tạo (theo buổi)', ic:'Users', price:1500000, unit:'/ buổi', cta:'Đặt buổi', note:'APPCHAT ADDON DAOTAO',
    desc:'Đào tạo trực tiếp đội ngũ vận hành AppChat — chuẩn hoá quy trình, AI Agent, báo cáo (2 giờ/buổi).'},
];

function BPStat({label, value, sub, bar, warn}) {
  return (
    <div style={{flex:1, minWidth:0}}>
      <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600, whiteSpace:'nowrap'}}>{label}</div>
      <div style={{fontSize:17, fontWeight:800, margin:'3px 0 2px', whiteSpace:'nowrap'}}>{value}</div>
      {bar!=null && (
        <div style={{height:5, borderRadius:3, background:'var(--fill-03)', margin:'6px 0 4px'}}>
          <div style={{width:Math.min(bar,100)+'%', height:'100%', borderRadius:3, background: warn?'#F5A830':'var(--primary)'}}/>
        </div>
      )}
      <div style={{fontSize:10.5, color: warn?'#8A5A10':'var(--label-03)', whiteSpace:'nowrap'}}>{sub}</div>
    </div>
  );
}

/* ══════════ MAIN PAGE ══════════ */
function BillingPageInner({ mode }) {
  const P = mode === 'pricing';
  const B = !P;
  const [pay, setPay]   = useBP(null);   // {title, amount, note}
  const [popup, setPopup] = useBP(null); // 'expired' | 'cap'
  const [q, setQ]       = useBP('');
  const [stF, setStF]   = useBP('all');
  const [from, setFrom] = useBP('');
  const [to, setTo]     = useBP('');
  const [qtyU, setQtyU] = useBP(5);
  const [qtyC, setQtyC] = useBP(3);
  const [qtyT, setQtyT] = useBP(2);
  const [stor, setStor] = useBP(1);
  const [contacted, setContacted] = useBP(false);
  const [seg, setSeg] = useBP('ca_nhan');
  const [budget, setBudget] = useBP(5000000);
  const [unlimited, setUnlimited] = useBP(false);
  const [autoStop, setAutoStop] = useBP(true);
  const [alert80, setAlert80] = useBP(true);
  const [capSaved, setCapSaved] = useBP(false);
  const [tokenOpen, setTokenOpen] = useBP(false);
  const [planOpen, setPlanOpen] = useBP(false);

  const invoices = useBPM(()=> BP_INVOICES.filter(i =>
    (!q || (i.code+' '+i.plan).toLowerCase().includes(q.toLowerCase()))
    && (stF==='all' || i.st===stF)
    && (!from || i.date>=from) && (!to || i.date<=to)
  ), [q, stF, from, to]);

  const inputS = {height:32, border:'1px solid var(--fill-04)', borderRadius:8, padding:'0 10px', fontSize:12, outline:'none', background:'white', fontFamily:'inherit'};

  return (
    <div style={{maxWidth:'100%', overflowX:'hidden'}}>
      {P && <BPPricing onPick={(p)=>setPay(p)} onContact={()=>setContacted(true)} seg={seg} setSeg={setSeg}/>}

      {B && (<>
      {/* 1 · GÓI HIỆN TẠI */}
      <div style={{...bpCard, marginBottom:14, background:'linear-gradient(135deg, #0B3D2C, #11271B)', border:'none', color:'white'}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
          <div>
            <div style={{fontSize:11, letterSpacing:'.08em', opacity:.65, fontWeight:700}}>GÓI HIỆN TẠI</div>
            <div style={{fontSize:22, fontWeight:800}}>AppChat <span style={{color:'var(--primary)'}}>Ultimate</span></div>
          </div>
          <span style={{...bpChip('rgba(45,197,106,.18)','#7EE2A4'), border:'1px solid rgba(45,197,106,.35)'}}>● Còn hiệu lực</span>
          <span style={{flex:1}}/>
          <button style={{...bpBtn, background:'transparent', color:'white', borderColor:'rgba(255,255,255,.3)'}} onClick={()=>setPopup('expired')}>Demo: hết hạn</button>
          <button style={bpPri} onClick={()=>setPlanOpen(true)}>{IcBP('Zap',{width:13, height:13})} Gia hạn</button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:18, padding:'14px 0 2px', borderTop:'1px solid rgba(255,255,255,.12)'}}>
          {[
            ['Ngày kích hoạt','20/12/2025', null, null],
            ['Ngày hết hạn','20/12/2026', 53, '192 ngày còn lại'],
            ['Người dùng (User)','12 / 15', 80, 'Còn 3 chỗ trống'],
            ['Account Connection','9 / 12', 75, 'Còn 3 kết nối'],
            ['Token còn lại','51.8K / 100K', 52, 'Reset theo chu kỳ tháng'],
          ].map(([l,v,bar,sub])=>(
            <div key={l} style={{minWidth:0}}>
              <div style={{fontSize:10.5, opacity:.6, fontWeight:600, whiteSpace:'nowrap'}}>{l}</div>
              <div style={{fontSize:16, fontWeight:800, margin:'3px 0', whiteSpace:'nowrap'}}>{v}</div>
              {bar!=null && <div style={{height:4, borderRadius:2, background:'rgba(255,255,255,.15)'}}><div style={{width:bar+'%', height:'100%', borderRadius:2, background:'var(--primary)'}}/></div>}
              {sub && <div style={{fontSize:10, opacity:.55, marginTop:3, whiteSpace:'nowrap'}}>{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      </>)}

      {P && (<>
      {/* 2 · TOKEN PHÁT SINH */}
      <div style={{...bpCard, marginBottom:14}}>
        <div style={{display:'flex', alignItems:'center', marginBottom:12}}>
          <div>
            <div style={{fontSize:15, fontWeight:700, whiteSpace:'nowrap'}}>Token & chi phí phát sinh</div>
            <div style={{fontSize:12, color:'var(--label-02)'}}>Vượt định mức được ghi nhận tự động · tạm ngừng khi phí đạt ngưỡng 5.000.000 ₫</div>
          </div>
          <span style={{flex:1}}/>
          <button style={{...bpBtn, marginRight:8, color:'var(--label-02)'}} onClick={()=>setPopup('token')}>Demo: hết token</button>
          <button style={{...bpPri}} onClick={()=>setTokenOpen(true)}>{IcBP('Sparkles',{width:14, height:14})} Mua thêm token</button>
          <button style={{...bpBtn, marginLeft:8}} onClick={()=>setPay({title:'Thanh toán phí Token phát sinh', amount:1240000, note:'APPCHAT TOKEN T6-2026'})}>Thanh toán {fmtVnd(1240000)}</button>
        </div>
        <div style={{display:'flex', gap:24}}>
          <BPStat label="Định mức gói / tháng" value="100.000 token" sub="Đã dùng 48.200 trong định mức"/>
          <BPStat label="Vượt định mức (tháng này)" value="8.240 token" sub="Đơn giá vượt: 150 ₫ / token" />
          <BPStat label="Phí phát sinh" value={fmtVnd(1240000)} bar={1240000/5000000*100} warn sub={`Ngưỡng tạm ngừng: ${fmtVnd(5000000)} · còn ${fmtVnd(3760000)}`}/>
        </div>
      </div>

      {/* 2b · NGÂN SÁCH TOKEN (đơn giản kiểu Replit/Claude) */}
      <div style={{...bpCard, marginBottom:14}}>
        <div style={{display:'flex', alignItems:'center', marginBottom:14}}>
          <div>
            <div style={{fontSize:15, fontWeight:700, whiteSpace:'nowrap'}}>Ngân sách chi tiêu Token</div>
            <div style={{fontSize:12, color:'var(--label-02)'}}>Đặt hạn mức chi phí AI mỗi tháng — đơn giản, kiểm soát toàn bộ trong 1 con số.</div>
          </div>
          <span style={{flex:1}}/>
          <label style={{display:'inline-flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight:600, color:'var(--label-02)', cursor:'pointer', marginRight:12}}>
            <button onClick={()=>setUnlimited(u=>!u)} style={{width:40, height:23, borderRadius:14, border:'none', position:'relative', cursor:'pointer', flexShrink:0, background:unlimited?'var(--primary)':'var(--fill-04)', transition:'background .18s'}}><span style={{position:'absolute', top:2, left:unlimited?19:2, width:19, height:19, borderRadius:'50%', background:'white', transition:'left .18s'}}/></button>
            Không giới hạn
          </label>
          <button style={{...bpPri}} onClick={()=>{ setCapSaved(true); setTimeout(()=>setCapSaved(false), 1900); }}>{IcBP('Check',{width:14, height:14})} {capSaved ? 'Đã lưu' : 'Lưu'}</button>
        </div>

        {unlimited ? (
          <div style={{display:'flex', gap:10, padding:'14px 16px', background:'#FCF3E2', borderRadius:10}}>
            {IcBP('Zap',{width:17, height:17, style:{color:'#C9820B', flexShrink:0, marginTop:1}})}
            <div style={{fontSize:12.5, lineHeight:1.55}}><b style={{color:'var(--label-01)'}}>Không giới hạn ngân sách.</b> <span style={{color:'var(--label-02)'}}>AI chạy thoải mái, phí vượt định mức được ghi nhận &amp; đối soát cuối kỳ. Vẫn tự tạm ngừng khi chạm ngưỡng an toàn 5.000.000 ₫.</span></div>
          </div>
        ) : (<>
          {/* thanh tiến độ đã dùng / ngân sách */}
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:7}}>
              <span style={{fontSize:22, fontWeight:800, color:'var(--label-01)'}}>{fmtVnd(1240000)}</span>
              <span style={{fontSize:13, color:'var(--label-02)'}}>đã dùng trong <b style={{color:'var(--label-01)'}}>{fmtVnd(budget)}</b> tháng này</span>
              <span style={{flex:1}}/>
              <span style={{fontSize:12.5, fontWeight:700, color: 1240000/budget>0.8?'#C9820B':'var(--pr-dark-2)'}}>{Math.round(1240000/budget*100)}%</span>
            </div>
            <div style={{height:10, borderRadius:5, background:'var(--fill-03)', overflow:'hidden'}}><div style={{width:Math.min(100,1240000/budget*100)+'%', height:'100%', borderRadius:5, background: 1240000/budget>0.8?'#F5A830':'var(--primary)'}}/></div>
          </div>
          {/* preset hạn mức */}
          <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600, marginBottom:7}}>Hạn mức / tháng</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:14}}>
            {[1000000,3000000,5000000,10000000,20000000].map(v=>{ const on=budget===v; return (
              <button key={v} onClick={()=>setBudget(v)} style={{padding:'8px 14px', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'), background:on?'var(--bg-green)':'white', color:on?'var(--pr-dark-2)':'var(--label-01)'}}>{(v/1000000)}M₫</button>
            );})}
            <span style={{fontSize:12, color:'var(--label-03)'}}>hoặc</span>
            <div style={{display:'flex', alignItems:'center', gap:6, border:'1px solid var(--fill-04)', borderRadius:9, padding:'0 10px', height:36}}>
              <input type="number" value={budget} onChange={e=>setBudget(Math.max(0,+e.target.value||0))} style={{width:120, border:'none', outline:'none', fontSize:13, fontWeight:700, fontFamily:'inherit', background:'transparent'}}/>
              <span style={{fontSize:12, color:'var(--label-02)'}}>₫</span>
            </div>
          </div>
          {/* tùy chọn */}
          <div style={{display:'flex', flexDirection:'column', gap:1, borderTop:'1px solid var(--fill-03)', paddingTop:6}}>
            {[
              {on:alert80, set:setAlert80, t:'Cảnh báo khi đạt 80% hạn mức', d:'Gửi thông báo cho admin trước khi chạm hạn.'},
              {on:autoStop, set:setAutoStop, t:'Tự động dừng AI khi chạm hạn mức', d:'AI tạm ngừng đến hết kỳ hoặc khi bạn nâng hạn mức.'},
            ].map((o,i)=>(
              <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 0'}}>
                <div style={{flex:1}}><div style={{fontSize:13, fontWeight:600}}>{o.t}</div><div style={{fontSize:11.5, color:'var(--label-03)', marginTop:1}}>{o.d}</div></div>
                <button onClick={()=>o.set(v=>!v)} style={{width:42, height:24, borderRadius:14, border:'none', position:'relative', cursor:'pointer', flexShrink:0, background:o.on?'var(--primary)':'var(--fill-04)', transition:'background .18s'}}><span style={{position:'absolute', top:2, left:o.on?20:2, width:20, height:20, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .18s'}}/></button>
              </div>
            ))}
          </div>
        </>)}
      </div>

      {/* 3 · MUA THÊM TÀI NGUYÊN */}
      <div style={{fontSize:13.5, fontWeight:800, color:'var(--label-01)', margin:'2px 2px 8px'}}>Mua thêm tài nguyên <span style={{fontSize:11, fontWeight:600, color:'var(--label-03)'}}>· {seg==='ca_nhan'?'Gói Cá nhân':'Gói Doanh nghiệp'}</span></div>
      {seg==='ca_nhan' && (
        <div style={{display:'flex', gap:10, padding:'12px 15px', background:'#FCF3E2', borderRadius:10, marginBottom:14}}>
          {IcBP('Users',{width:17, height:17, style:{color:'#C9820B', flexShrink:0, marginTop:1}})}
          <div style={{flex:1, fontSize:12, lineHeight:1.55, color:'var(--label-02)'}}>
            <b style={{color:'var(--label-01)'}}>Gói Cá nhân chỉ dùng cho 1 người.</b> Muốn thêm người dùng để dùng chung, hãy nâng cấp lên gói <b>Doanh nghiệp</b> (kèm sẵn số lượng user theo gói).
          </div>
          <button style={{...bpPri, flexShrink:0}} onClick={()=>setSeg('doanh_nghiep')}>{IcBP('Zap',{width:13, height:13})} Nâng cấp lên Doanh nghiệp</button>
        </div>
      )}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
        {[
          {k:'u', t:'Người dùng (User)', price:300000, unit:'user / tháng', qty:qtyU, set:setQtyU, ic:'Users', note:'APPCHAT MUA USER', sub:'Thêm chỗ ngồi dùng chung cho đội', biz:true},
          {k:'t', t:'User Tổng đài', price:150000, unit:'user tổng đài / tháng', qty:qtyT, set:setQtyT, ic:'Phone', note:'APPCHAT MUA USER-TONGDAI', sub:'License agent gọi ra/vào trên Call Center'},
          {k:'c', t:'Account Connection', price:200000, unit:'kết nối / tháng', qty:qtyC, set:setQtyC, ic:'Plug', note:'APPCHAT MUA CONNECTION', sub:'Kết nối thêm kênh / trang / tài khoản'},
        ].filter(o=> seg==='doanh_nghiep' || !o.biz).map(o=>(
          <div key={o.k} style={bpCard}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
              <span style={{width:34, height:34, borderRadius:9, background:'var(--bg-green)', color:'var(--pr-dark-1)', display:'grid', placeItems:'center'}}>{IcBP(o.ic,{width:16, height:16})}</span>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700, fontSize:13.5, whiteSpace:'nowrap'}}>{o.t}</div>
                <div style={{fontSize:11.5, color:'var(--label-02)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{o.sub}</div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--fill-02)', borderRadius:9, marginBottom:10}}>
              <span style={{fontSize:12.5, color:'var(--label-02)', whiteSpace:'nowrap'}}>Đơn giá: <b style={{color:'var(--label-01)'}}>{fmtVnd(o.price)}</b></span>
              <span style={{flex:1}}/>
              <button style={{...bpBtn, width:28, height:28, padding:0, justifyContent:'center'}} onClick={()=>o.set(Math.max(1,o.qty-1))}>−</button>
              <b style={{width:26, textAlign:'center'}}>{o.qty}</b>
              <button style={{...bpBtn, width:28, height:28, padding:0, justifyContent:'center'}} onClick={()=>o.set(o.qty+1)}>+</button>
            </div>
            <button style={{...bpPri, width:'100%', justifyContent:'center'}}
              onClick={()=>setPay({title:'Mua thêm '+o.t+` · ${o.qty}`, amount:o.price*o.qty, note:o.note+' x'+o.qty})}>
              {IcBP('CreditCard',{width:14, height:14})} Mua thêm — {fmtVnd(o.price*o.qty)} / tháng
            </button>
          </div>
        ))}
        {/* Lưu trữ — tier */}
        <div style={bpCard}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
            <span style={{width:34, height:34, borderRadius:9, background:'var(--bg-green)', color:'var(--pr-dark-1)', display:'grid', placeItems:'center'}}>{IcBP('Files',{width:16, height:16})}</span>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:700, fontSize:13.5, whiteSpace:'nowrap'}}>Mua lưu trữ</div>
              <div style={{fontSize:11.5, color:'var(--label-02)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>Biểu giá theo gói lưu trữ Zalo Cloud</div>
            </div>
          </div>
          <div style={{display:'flex', gap:6, marginBottom:10}}>
            {BP_STORAGE.map((s,i)=>(
              <button key={s.gb} onClick={()=>setStor(i)} style={{flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', textAlign:'center',
                border:'1px solid '+(stor===i?'var(--primary)':'var(--fill-04)'), background: stor===i?'var(--bg-green)':'white'}}>
                <div style={{fontWeight:800, fontSize:12.5, color: stor===i?'var(--pr-dark-2)':'var(--label-01)', whiteSpace:'nowrap'}}>{s.gb}</div>
                <div style={{fontSize:10, color:'var(--label-02)', whiteSpace:'nowrap'}}>{fmtVnd(s.price)}</div>
              </button>
            ))}
          </div>
          <button style={{...bpPri, width:'100%', justifyContent:'center'}}
            onClick={()=>setPay({title:'Mua lưu trữ '+BP_STORAGE[stor].gb, amount:BP_STORAGE[stor].price, note:'APPCHAT MUA LUUTRU '+BP_STORAGE[stor].gb.replace(' ','')})}>
            {IcBP('CreditCard',{width:14, height:14})} Mua lưu trữ — {fmtVnd(BP_STORAGE[stor].price)} / tháng
          </button>
        </div>
      </div>

      {/* 3b · ADD-ON TÍNH NĂNG */}
      <div style={{fontSize:13.5, fontWeight:800, color:'var(--label-01)', margin:'2px 2px 8px'}}>Mua thêm tính năng (Add-on)</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14}}>
        {BP_FEATURES.map(f=>(
          <div key={f.k} style={bpCard}>
            <span style={{width:36, height:36, borderRadius:9, background:'#F3EFFE', color:'#6E48E6', display:'grid', placeItems:'center', marginBottom:10}}>{IcBP(f.ic,{width:17, height:17})}</span>
            <div style={{fontWeight:700, fontSize:13.5, marginBottom:4}}>{f.t}</div>
            <div style={{fontSize:11.5, color:'var(--label-02)', lineHeight:1.5, marginBottom:12, minHeight:48}} dangerouslySetInnerHTML={{__html:f.desc}}/>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:13.5, fontWeight:800, color:'var(--label-01)', whiteSpace:'nowrap'}}>{f.price!=null ? fmtVnd(f.price) : 'Liên hệ'}</span>
              {f.unit && <span style={{fontSize:11, color:'var(--label-03)'}}>{f.unit}</span>}
              <span style={{flex:1}}/>
              {f.price!=null
                ? <button style={{...bpPri}} onClick={()=>setPay({title:f.t, amount:f.price, note:f.note})}>{f.cta}</button>
                : <button style={{...bpBtn, borderColor:'var(--primary)', color:'var(--pr-dark-2)'}} onClick={()=>setContacted(true)}>{contacted?'✓ Đã gửi yêu cầu':f.cta}</button>}
            </div>
          </div>
        ))}
      </div>

      </>)}

      {B && (<>
      {/* 4 · LỊCH SỬ HÓA ĐƠN */}
      <div style={{...bpCard, padding:0, overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
        <div style={{minWidth:760}}>
        <div style={{display:'flex', alignItems:'center', gap:8, padding:'14px 18px', borderBottom:'1px solid var(--fill-04)', flexWrap:'wrap'}}>
          <div style={{fontWeight:700, fontSize:14, whiteSpace:'nowrap', marginRight:6}}>Lịch sử hóa đơn</div>
          <div style={{position:'relative'}}>
            {IcBP('Search',{width:13, height:13, style:{position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--label-03)'}})}
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm mã hóa đơn, tên gói…" style={{...inputS, paddingLeft:28, width:210}}/>
          </div>
          <select value={stF} onChange={e=>setStF(e.target.value)} style={inputS}>
            <option value="all">Mọi trạng thái</option>
            <option value="paid">Đã thanh toán</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="overdue">Quá hạn</option>
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inputS}/>
          <span style={{color:'var(--label-03)', fontSize:12}}>→</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inputS}/>
          {(q||stF!=='all'||from||to) && <button style={{...bpBtn, height:32}} onClick={()=>{setQ(''); setStF('all'); setFrom(''); setTo('');}}>Xoá lọc</button>}
          <span style={{flex:1}}/>
          <span style={{fontSize:11.5, color:'var(--label-03)', whiteSpace:'nowrap'}}>{invoices.length} hóa đơn</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'130px 1.6fr 100px 120px 110px 110px 90px', gap:10, padding:'9px 18px', fontSize:10.5, fontWeight:700, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-03)'}}>
          <span>Mã hóa đơn</span><span>Gói dịch vụ</span><span>Ngày TT</span><span style={{textAlign:'right'}}>Số tiền</span><span>Phương thức</span><span>Trạng thái</span><span style={{textAlign:'right'}}>Invoice</span>
        </div>
        {invoices.map(i=>{
          const st=BP_ST[i.st]; const d=i.date.split('-');
          return (
            <div key={i.code} style={{display:'grid', gridTemplateColumns:'130px 1.6fr 100px 120px 110px 110px 90px', gap:10, padding:'12px 18px', alignItems:'center', borderBottom:'1px solid var(--fill-03)', fontSize:12.5}}>
              <span style={{fontFamily:'ui-monospace, monospace', fontWeight:700, fontSize:11.5, whiteSpace:'nowrap'}}>{i.code}</span>
              <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:600}}>{i.plan}</span>
              <span style={{color:'var(--label-02)', whiteSpace:'nowrap'}}>{d[2]}/{d[1]}/{d[0]}</span>
              <span style={{textAlign:'right', fontWeight:700, whiteSpace:'nowrap'}}>{fmtVnd(i.amt)}</span>
              <span style={{color:'var(--label-02)', whiteSpace:'nowrap'}}>{i.via}</span>
              <span><span style={bpChip(st.bg, st.fg)}>{st.l}</span></span>
              <span style={{textAlign:'right', display:'flex', gap:5, justifyContent:'flex-end'}}>
                {i.st==='paid'
                  ? <button style={{...bpBtn, height:28, fontSize:11.5}} title="Xem & tải hoá đơn" onClick={()=>bpDownloadInvoice(i)}>{IcBP('Download',{width:12, height:12})} Xem</button>
                  : <button style={{...bpBtn, height:28, fontSize:11.5, color:'var(--pr-dark-2)', borderColor:'var(--primary)'}} onClick={()=>setPay({title:'Thanh toán '+i.code, amount:i.amt, note:'APPCHAT '+i.code})}>Thanh toán</button>}
              </span>
            </div>
          );
        })}
        {invoices.length===0 && <div style={{padding:30, textAlign:'center', color:'var(--label-03)', fontSize:13}}>Không có hóa đơn khớp bộ lọc.</div>}
        </div>
        </div>
      </div>

      </>)}

      {pay && <BPPayModal title={pay.title} amount={pay.amount} note={pay.note} onClose={()=>setPay(null)}/>}
      {tokenOpen && <BPTokenPacks onClose={()=>setTokenOpen(false)} onPick={(p)=>{ setTokenOpen(false); setPay(p); }}/>}
      {planOpen && <BPPlanModal onClose={()=>setPlanOpen(false)} onPick={(p)=>{ setPlanOpen(false); setPay(p); }}/>}
      {popup && <BPBlockPopup kind={popup} onClose={()=>setPopup(null)} onBuyToken={()=>{ setPopup(null); setTokenOpen(true); }} onUpgrade={()=>{ setPopup(null); setPlanOpen(true); }} onRenew={()=>{ setPopup(null); setPay(popup==='expired' ? {title:'Gia hạn AppChat Ultimate · 12 tháng', amount:90000000, note:'APPCHAT GIAHAN MSVN2026'} : {title:'Thanh toán phí Token phát sinh', amount:5000000, note:'APPCHAT TOKEN CAP'}); }}/>}
    </div>
  );
}

function bpDownloadInvoice(i){
  const d=i.date.split('-'); const dd=d[2]+'/'+d[1]+'/'+d[0];
  const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+i.code+'</title>'+
    '<style>body{font-family:system-ui,Arial,sans-serif;color:#11271B;max-width:720px;margin:32px auto;padding:0 24px}h1{font-size:22px;margin:0}.muted{color:#6B7280;font-size:13px}.box{border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-top:20px}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1f3f5;font-size:14px}.row:last-child{border:none}.tot{font-size:20px;font-weight:800;color:#1B9E5A}table{width:100%;border-collapse:collapse;margin-top:8px}.brand{display:flex;align-items:center;gap:10px}.dot{width:30px;height:30px;border-radius:8px;background:#2DC56A;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}</style></head><body>'+
    '<div class="brand"><span class="dot">A</span><div><h1>HOÁ ĐƠN · '+i.code+'</h1><div class="muted">AppChat · MediaSoft JSC</div></div></div>'+
    '<div class="box"><div class="row"><span>Gói dịch vụ</span><b>'+i.plan+'</b></div>'+
    '<div class="row"><span>Ngày thanh toán</span><b>'+dd+'</b></div>'+
    '<div class="row"><span>Phương thức</span><b>'+i.via+'</b></div>'+
    '<div class="row"><span>Trạng thái</span><b>'+(i.st==='paid'?'Đã thanh toán':i.st==='pending'?'Chờ xác nhận':'Quá hạn')+'</b></div>'+
    '<div class="row"><span class="tot">Tổng cộng</span><span class="tot">'+fmtVnd(i.amt)+'</span></div></div>'+
    '<p class="muted">Hoá đơn điện tử phát hành tự động từ AppChat. Cảm ơn quý khách.</p></body></html>';
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='HoaDon-'+i.code+'.html';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function BillingPage(){ return <BillingPageInner mode="billing"/>; }
function PricingPage(){ return <BillingPageInner mode="pricing"/>; }
window.BillingPage = BillingPage;
window.PricingPage = PricingPage;
} catch(e) { console.error('billing-page.jsx', e); }
})();
