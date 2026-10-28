/* ============================================================
   reports-module.jsx — Reports / Analytics (5 tabs)
   Tổng quan · Chat · Call · Ticket & SLA · Nhân sự
   Pure SVG/CSS charts · mock data scales with date range
   ============================================================ */
;(function(){
try {
const { useState: useRp, useMemo: useRpM } = React;
const RpI = (n,p)=>{ const Cc=window.Icon&&window.Icon[n]; return Cc?React.createElement(Cc,p):null; };

const C = { green:'#2DC56A', greenD:'#1B9E5A', blue:'#2A6FDB', amber:'#C9820B', violet:'#6E48E6', red:'#DC2626', cyan:'#0E9B94', pink:'#E1306C' };
const fmt = (n)=> Math.round(n).toLocaleString('vi-VN');
function rng(seed){ let s=seed; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
const RANGES = [{k:'today',l:'Hôm nay',d:1},{k:'7d',l:'7 ngày',d:7},{k:'30d',l:'30 ngày',d:30},{k:'90d',l:'Quý này',d:90}];

/* ---------- charts ---------- */
function LineChart({ series, labels, height=220, money }){
  const W=680, H=height, pad={l:40,r:12,t:14,b:26};
  const all=series.flatMap(s=>s.data); const max=Math.max(...all,1)*1.15;
  const x=(i,n)=>pad.l+i/(Math.max(1,n-1))*(W-pad.l-pad.r);
  const y=(v)=>pad.t+(1-v/max)*(H-pad.t-pad.b);
  return (
    <svg viewBox={'0 0 '+W+' '+H} style={{width:'100%',height:H}} preserveAspectRatio="none">
      {[0,1,2,3,4].map(i=>{ const v=max/4*i, yy=y(v); return <g key={i}><line x1={pad.l} y1={yy} x2={W-pad.r} y2={yy} stroke="var(--fill-03)"/><text x={pad.l-6} y={yy+3} textAnchor="end" fontSize="9" fill="var(--label-03)">{money?Math.round(v/1e6)+'M':Math.round(v)}</text></g>; })}
      {labels.map((l,i)=> i%Math.ceil(labels.length/8||1)===0 && <text key={i} x={x(i,labels.length)} y={H-8} textAnchor="middle" fontSize="9" fill="var(--label-03)">{l}</text>)}
      {series.map((s,si)=>{ const pts=s.data.map((v,i)=>[x(i,s.data.length),y(v)]); const line=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
        return (<g key={si}><polygon points={pad.l+','+(H-pad.b)+' '+line+' '+(W-pad.r)+','+(H-pad.b)} fill={s.color} opacity="0.07"/><polyline points={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>{pts.map((p,i)=> i===pts.length-1 && <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={s.color}/>)}</g>);
      })}
    </svg>
  );
}
function StackBars({ rows, labels, height=220 }){
  const W=680,H=height,pad={l:30,r:12,t:14,b:24};
  const totals=labels.map((_,i)=>rows.reduce((a,r)=>a+r.data[i],0)); const max=Math.max(...totals,1)*1.1;
  const gap=(W-pad.l-pad.r)/labels.length, bw=gap*0.6, yh=(v)=>v/max*(H-pad.t-pad.b);
  return (
    <svg viewBox={'0 0 '+W+' '+H} style={{width:'100%',height:H}}>
      {[0,.25,.5,.75,1].map((f,i)=>{ const yy=pad.t+(1-f)*(H-pad.t-pad.b); return <line key={i} x1={pad.l} y1={yy} x2={W-pad.r} y2={yy} stroke="var(--fill-03)"/>; })}
      {labels.map((lb,i)=>{ let yc=H-pad.b; const xc=pad.l+i*gap+(gap-bw)/2; return (<g key={i}>{rows.map((r,ri)=>{ const h=yh(r.data[i]); yc-=h; return <rect key={ri} x={xc} y={yc} width={bw} height={Math.max(0,h-1)} fill={r.color}/>; })}<text x={xc+bw/2} y={H-8} textAnchor="middle" fontSize="9" fill="var(--label-03)">{lb}</text></g>); })}
    </svg>
  );
}
function Donut({ data, size=170, onSlice }){
  const total=data.reduce((a,d)=>a+d.v,0)||1; let acc=0; const r=size/2-6,cx=size/2,cy=size/2,sw=22;
  const arcs=data.map(d=>{ const a0=acc/total*2*Math.PI-Math.PI/2; acc+=d.v; const a1=acc/total*2*Math.PI-Math.PI/2; const large=(a1-a0)>Math.PI?1:0;
    return {d:`M ${cx+r*Math.cos(a0)} ${cy+r*Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx+r*Math.cos(a1)} ${cy+r*Math.sin(a1)}`, c:d.c, k:d.l}; });
  return (<svg viewBox={'0 0 '+size+' '+size} style={{width:size,height:size}}><circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--fill-03)" strokeWidth={sw}/>{arcs.map((a,i)=><path key={i} d={a.d} fill="none" stroke={a.c} strokeWidth={sw} style={{cursor:onSlice?'pointer':'default'}} onClick={()=>onSlice&&onSlice(a.k)}/>)}<text x={cx} y={cy-2} textAnchor="middle" fontSize="21" fontWeight="800" fill="var(--label-01)">{fmt(total)}</text><text x={cx} y={cy+15} textAnchor="middle" fontSize="10" fill="var(--label-03)">tổng</text></svg>);
}
function Funnel({ steps }){
  const max=steps[0].v||1;
  return (<div style={{display:'flex',flexDirection:'column',gap:8}}>{steps.map((s,i)=>{ const pct=Math.round(s.v/max*100), conv=i>0?Math.round(s.v/steps[i-1].v*100):100; return (
    <div key={i}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{fontWeight:600}}>{s.l}</span><span style={{color:'var(--label-02)'}}>{fmt(s.v)} <span style={{color:'var(--label-03)'}}>· {conv}%</span></span></div>
    <div style={{height:26,background:'var(--fill-03)',borderRadius:7,overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:'linear-gradient(90deg,'+s.c+'cc,'+s.c+')',borderRadius:7}}/></div></div>
  );})}</div>);
}
function Heatmap({ grid, rowLabels, colLabels }){
  const max=Math.max(...grid.flat(),1);
  return (<div style={{overflowX:'auto'}}><div style={{display:'grid',gridTemplateColumns:'34px repeat('+colLabels.length+',1fr)',gap:3,minWidth:520}}>
    <span/>{colLabels.map(c=><span key={c} style={{fontSize:9,color:'var(--label-03)',textAlign:'center'}}>{c}</span>)}
    {grid.map((row,ri)=>(<React.Fragment key={ri}><span style={{fontSize:10,color:'var(--label-03)',display:'flex',alignItems:'center'}}>{rowLabels[ri]}</span>{row.map((v,ci)=><div key={ci} title={v+' hội thoại'} style={{height:20,borderRadius:4,background:'var(--primary)',opacity:0.12+v/max*0.88}}/>)}</React.Fragment>))}
  </div></div>);
}

/* ---------- blocks ---------- */
function Card({ title, sub, right, children, pad=18 }){
  return (<div className="card" style={{padding:pad}}>{title && <div style={{display:'flex',alignItems:'flex-start',marginBottom:14}}><div><div style={{fontWeight:700,fontSize:14.5}}>{title}</div>{sub && <div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>{sub}</div>}</div><span style={{flex:1}}/>{right}</div>}{children}</div>);
}
function Legend({ items }){ return <div style={{display:'flex',flexWrap:'wrap',gap:12,fontSize:11,color:'var(--label-02)'}}>{items.map(it=><span key={it.l} style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:9,height:9,borderRadius:2,background:it.c}}/>{it.l}</span>)}</div>; }
function Kpi({ k, onClick }){
  const mn=Math.min(...k.sp), mx=Math.max(...k.sp);
  return (<div className="card" onClick={onClick} style={{padding:14, cursor:onClick?'pointer':'default'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{width:28,height:28,borderRadius:8,background:k.c+'18',color:k.c,display:'grid',placeItems:'center',flexShrink:0}}>{RpI(k.ic,{style:{width:15,height:15}})}</span><span style={{fontSize:11.5,color:'var(--label-02)',fontWeight:600,lineHeight:1.3}}>{k.l}</span></div>
    <div style={{display:'flex',alignItems:'baseline',gap:7}}><span style={{fontSize:22,fontWeight:800,color:'var(--label-01)'}}>{k.v}</span><span style={{fontSize:10.5,fontWeight:700,color:k.down?C.red:C.greenD}}>{k.down?'▼':'▲'} {k.delta}</span></div>
    <svg viewBox="0 0 100 22" style={{width:'100%',height:22,marginTop:5}} preserveAspectRatio="none"><polyline fill="none" stroke={k.c} strokeWidth="2" points={k.sp.map((p,i)=>(i/(k.sp.length-1)*100)+','+(20-(p-mn)/((mx-mn)||1)*16)).join(' ')}/></svg>
  </div>);
}

/* ---------- data ---------- */
function buildData(days){
  const r=rng(days*7+3);
  const labels = days<=1 ? Array.from({length:12},(_,i)=>(8+i)+'h') : days<=7 ? ['T2','T3','T4','T5','T6','T7','CN'] : Array.from({length:days<=30?15:13},(_,i)=>'N'+(i+1));
  const scale = days<=1?1:days<=7?7:days<=30?26:70;
  const gen=(base,amp)=> labels.map((_,i)=> Math.max(0,Math.round(base*scale*(0.7+r()*0.6)+Math.sin(i)*amp*scale)));
  return { labels, scale, gen, r };
}
const AGENTS=[
  {n:'Hương',team:'Hỗ trợ 1',conv:312,frt:'1m 12s',csat:4.9,closed:148,rev:48.7},
  {n:'Minh',team:'Hỗ trợ 2',conv:286,frt:'1m 44s',csat:4.7,closed:132,rev:41.2},
  {n:'Trâm',team:'Kế toán',conv:198,frt:'2m 06s',csat:4.6,closed:96,rev:33.8},
  {n:'Khoa',team:'Hỗ trợ 2',conv:174,frt:'2m 30s',csat:4.4,closed:84,rev:22.1},
  {n:'Lan Anh',team:'Hỗ trợ 1',conv:160,frt:'1m 58s',csat:4.8,closed:78,rev:19.6},
  {n:'AI Agent',team:'Tự động',conv:1480,frt:'4s',csat:4.5,closed:512,rev:64.0,ai:true},
];
const avC=(n)=>['#2A6FDB','#1B9E5A','#E8602C','#6E48E6','#0A65C2','#C9820B'][(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%6];

/* ---------- drill-down + cross-filter bus ---------- */
const rpDrill=(t,sub,rows)=>{ if(window.__rpDrill) window.__rpDrill({t,sub,rows}); };
const rpXF=(v)=>{ if(window.__rpXF) window.__rpXF(v); };
const rpToast=(m)=>{ if(window.__rpToast) window.__rpToast(m); };
const RP_CUST=['Chị Lan','Nguyễn T. Hiếu','Linh Phạm','Trần M. Khoa','Phạm Q. Anh','Đỗ Thu Hà','Vũ Đức Anh','Ngô Bích','Lê Hoàng Nam','Trịnh Mai','Bùi Quang','Mẹ Cu Bin'];
const RP_CH=['Zalo OA','Facebook','Shopee','TikTok','Web'];
function rpRecords(seedStr, n, chan){
  const r=rng((seedStr||'x').length*37+n+7); const out=[];
  for(let i=0;i<Math.min(n,14);i++){ out.push({
    name:RP_CUST[(i*3+seedStr.length)%RP_CUST.length],
    ch: chan || RP_CH[Math.floor(r()*RP_CH.length)],
    val:Math.round(r()*1800+200),
    when:(Math.floor(r()*23)+1)+'h trước',
    st:['Đã xử lý','Đang mở','Chờ KH'][Math.floor(r()*3)]
  }); }
  return out;
}
function DrillDrawer({ drill, onClose }){
  if(!drill) return null;
  const STC={'Đã xử lý':'#1B9E5A','Đang mở':'#2A6FDB','Chờ KH':'#C9820B'};
  return (
    <div style={{position:'fixed',inset:0,zIndex:1200}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(15,23,42,.35)'}}/>
      <div className="scroll" style={{position:'absolute',top:0,right:0,bottom:0,width:430,maxWidth:'92vw',background:'white',boxShadow:'-12px 0 40px rgba(17,24,39,.2)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--fill-03)',display:'flex',alignItems:'flex-start',gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:C.green,textTransform:'uppercase',letterSpacing:'.05em'}}>Chi tiết dữ liệu</div>
            <div style={{fontSize:16,fontWeight:800,marginTop:2}}>{drill.t}</div>
            {drill.sub && <div style={{fontSize:12,color:'var(--label-02)',marginTop:2}}>{drill.sub}</div>}
          </div>
          <button className="btn-icon" onClick={onClose}>{RpI('Close',{style:{width:18,height:18}}) || '✕'}</button>
        </div>
        <div className="scroll" style={{flex:1,overflowY:'auto',padding:'8px 12px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr 0.8fr 0.9fr',gap:8,padding:'8px 10px',fontSize:10,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',borderBottom:'1px solid var(--fill-04)'}}>
            <span>Khách hàng</span><span>Kênh</span><span style={{textAlign:'right'}}>Giá trị</span><span style={{textAlign:'right'}}>Trạng thái</span>
          </div>
          {drill.rows.map((r,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'1.4fr 1fr 0.8fr 0.9fr',gap:8,padding:'10px',borderBottom:'1px solid var(--fill-03)',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><span style={{width:24,height:24,borderRadius:'50%',background:avC(r.name),color:'white',display:'grid',placeItems:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{r.name[0]}</span><div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.name}</div><div style={{fontSize:10.5,color:'var(--label-03)'}}>{r.when}</div></div></div>
              <span style={{fontSize:12,color:'var(--label-02)'}}>{r.ch}</span>
              <span style={{fontSize:12.5,fontWeight:700,color:C.greenD,textAlign:'right'}}>{fmt(r.val)}k</span>
              <span style={{fontSize:11,fontWeight:700,color:STC[r.st],textAlign:'right'}}>{r.st}</span>
            </div>
          ))}
        </div>
        <div style={{padding:'12px 20px',borderTop:'1px solid var(--fill-03)',display:'flex',gap:8}}>
          <button className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{RpI('Download',{style:{width:13,height:13,transform:'rotate(180deg)'}})} Xuất danh sách</button>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- AI narrative insight ---------- */
function AINarrative({ D, mult, xf }){
  const [seed,setSeed]=useRp(1);
  const chan = xf || 'toàn kênh';
  const conv = fmt(177*mult), aiPct = 60+seed%5, csat=(4.6+((seed%3)*0.1)).toFixed(1);
  const summary = `Trong kỳ này, AppChat ghi nhận ${conv} hội thoại ${xf?('trên kênh '+xf):'trên 19 kênh'}, tăng 12% so với kỳ trước. AI Agent tự xử lý ${aiPct}% khối lượng, giúp thời gian phản hồi đầu rút còn 1m48s. CSAT trung bình đạt ${csat}/5; điểm nóng cần lưu ý là nhóm hoàn tiền trên Shopee và khung giờ tối 19–21h đang quá tải.`;
  const findings=[
    {t:'Giờ vàng 19h–21h chiếm 38% hội thoại', s:'Cơ hội', c:C.amber, ic:'Clock'},
    {t:'AI tự xử lý tăng lên '+aiPct+'%, tiết kiệm ~120 giờ NS/tháng', s:'Tích cực', c:C.green, ic:'Sparkles'},
    {t:'Doanh thu attributed kênh Zalo dẫn đầu, +18%', s:'Tích cực', c:C.greenD, ic:'TrendUp'},
  ];
  const anomalies=[
    {t:'CSAT Shopee giảm 0.3đ do chậm phản hồi đơn đổi/trả', sev:'Cảnh báo', c:C.red},
    {t:'12 ca breach SLA nhóm ưu tiên Cao, tập trung ca tối', sev:'Cảnh báo', c:C.red},
  ];
  const recs=[
    {t:'Tăng 1 agent ca tối 19–21h hoặc bật AI fallback', ic:'Users'},
    {t:'Tạo workflow tự nhắc đơn đổi/trả Shopee quá 2h', ic:'Workflow'},
  ];
  return (
    <div className="card" style={{padding:0, overflow:'hidden', border:'1px solid rgba(45,197,106,.25)'}}>
      <div style={{display:'flex',alignItems:'center',gap:11,padding:'14px 18px',background:'linear-gradient(135deg,rgba(45,197,106,.12),rgba(43,158,243,.07))',borderBottom:'1px solid var(--fill-03)'}}>
        <span style={{width:32,height:32,borderRadius:9,background:'var(--grad-signature)',color:'white',display:'grid',placeItems:'center',flexShrink:0}}>{RpI('Sparkles',{style:{width:17,height:17}})}</span>
        <div style={{flex:1,minWidth:0}}>
          <div className="ai-gradient-text" style={{fontSize:14.5,fontWeight:800}}>AI phân tích &amp; nhận định kỳ này</div>
          <div style={{fontSize:11.5,color:'var(--label-02)'}}>Tự động tổng hợp từ Chat · Call · Ticket · Marketing · {chan}</div>
        </div>
        <button onClick={()=>{ setSeed(s=>s+1); rpToast('AI đang tạo lại phân tích…'); }} className="btn btn-ghost btn-sm" style={{gap:5,flexShrink:0}}>{RpI('Refresh',{style:{width:13,height:13}})} Tạo lại</button>
      </div>
      <div style={{padding:'14px 18px'}}>
        <div style={{fontSize:13.5,lineHeight:1.7,color:'var(--label-01)',marginBottom:16}}>{summary}</div>
        <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr 1fr',gap:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',marginBottom:8}}>Điểm nổi bật</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {findings.map((f,i)=>(<div key={i} style={{display:'flex',gap:8,alignItems:'flex-start'}}><span style={{width:22,height:22,borderRadius:6,background:f.c+'18',color:f.c,display:'grid',placeItems:'center',flexShrink:0}}>{RpI(f.ic,{style:{width:12,height:12}})}</span><div><div style={{fontSize:12,lineHeight:1.45}}>{f.t}</div><span style={{fontSize:9.5,fontWeight:700,color:f.c}}>{f.s}</span></div></div>))}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',marginBottom:8}}>Cảnh báo bất thường</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {anomalies.map((a,i)=>(<div key={i} style={{display:'flex',gap:8,padding:'8px 10px',background:'#FDECEA',borderRadius:9}}><span style={{color:a.c,flexShrink:0,marginTop:1}}>{RpI('Bell',{style:{width:13,height:13}})}</span><div style={{fontSize:11.5,lineHeight:1.45,color:'#A63322'}}>{a.t}</div></div>))}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',marginBottom:8}}>Khuyến nghị hành động</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {recs.map((rc,i)=>(<div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'8px 10px',border:'1px solid var(--fill-04)',borderRadius:9}}><span style={{width:22,height:22,borderRadius:6,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{RpI(rc.ic,{style:{width:12,height:12}})}</span><div style={{flex:1,fontSize:11.5,lineHeight:1.4}}>{rc.t}</div><button onClick={()=>rpToast('Đã áp dụng khuyến nghị')} style={{fontSize:11,fontWeight:700,color:'var(--primary)',background:'none',border:'none',cursor:'pointer',flexShrink:0,fontFamily:'inherit'}}>Áp dụng</button></div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- TAB: Overview ---------- */
function Overview({ D, mult, xf }){
  const kpis=[
    {l:'Tổng hội thoại', v:fmt(177*mult), delta:'12%', ic:'Chat', c:C.blue, sp:[8,10,7,11,9,13,10,14,12,15]},
    {l:'Phản hồi đầu (FRT)', v:'1m 48s', delta:'8%', ic:'Clock', c:C.green, sp:[20,18,17,15,14,13,12,11,10,9]},
    {l:'Tỷ lệ giải quyết', v:'92.4%', delta:'3%', ic:'Check', c:C.greenD, sp:[85,86,88,87,90,91,90,92,92,92]},
    {l:'CSAT trung bình', v:'4.7/5', delta:'0.2', ic:'Star', c:C.amber, sp:[44,45,46,45,46,47,46,47,47,47]},
    {l:'Doanh thu attributed', v:fmt(44*mult)+'M', delta:'18%', ic:'TrendUp', c:C.violet, sp:[30,34,32,38,36,42,40,46,44,48]},
    {l:'% AI tự xử lý', v:'63%', delta:'9%', ic:'Sparkles', c:C.cyan, sp:[48,50,52,54,55,58,60,61,62,63]},
  ];
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12}}>{kpis.map(k=><Kpi key={k.l} k={k} onClick={()=>rpDrill(k.l, 'Bản ghi đứng sau chỉ số · '+k.v, rpRecords(k.l, 12, xf))}/>)}</div>
    <AINarrative D={D} mult={mult} xf={xf}/>
    <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:16}}>
      <Card title="Xu hướng hội thoại" sub="Tổng vs AI tự xử lý" right={<Legend items={[{l:'Tổng',c:C.blue},{l:'AI xử lý',c:C.cyan}]}/>}>
        <LineChart labels={D.labels} series={[{data:D.gen(24,4),color:C.blue},{data:D.gen(15,3),color:C.cyan}]}/>
      </Card>
      <Card title="Hội thoại theo kênh" sub="Bấm để lọc chéo cả trang">
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <Donut data={[{l:'Zalo OA',v:420,c:'#0068FF'},{l:'Facebook',v:310,c:'#1877F2'},{l:'Shopee',v:280,c:'#EE4D2D'},{l:'TikTok',v:190,c:'#111'},{l:'Web/Khác',v:140,c:C.green}]} onSlice={rpXF}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
            {[{l:'Zalo OA',v:420,c:'#0068FF'},{l:'Facebook',v:310,c:'#1877F2'},{l:'Shopee',v:280,c:'#EE4D2D'},{l:'TikTok',v:190,c:'#111'},{l:'Web/Khác',v:140,c:C.green}].map(x=>{ const on=xf===x.l; return (
              <div key={x.l} onClick={()=>rpXF(x.l)} title="Lọc chéo theo kênh này" style={{display:'flex',alignItems:'center',gap:8,fontSize:12,padding:'4px 7px',borderRadius:7,cursor:'pointer',background:on?'var(--bg-green)':'transparent',border:'1px solid '+(on?'var(--primary)':'transparent')}}><span style={{width:9,height:9,borderRadius:2,background:x.c}}/><span style={{flex:1,color:on?'var(--pr-dark-2)':'var(--label-01)',fontWeight:on?700:500}}>{x.l}</span><b>{fmt(x.v)}</b></div>
            );})}
          </div>
        </div>
      </Card>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16}}>
      <Card title="Doanh thu attributed theo kênh" sub="Triệu ₫"><LineChart money labels={D.labels} series={[{data:D.gen(8e6,1e6),color:C.violet}]} height={190}/></Card>
    </div>
  </div>);
}

/* ---------- TAB: Chat ---------- */
function ChatTab({ D, mult }){
  const kpis=[
    {l:'Hội thoại chat', v:fmt(150*mult), delta:'11%', ic:'Chat', c:C.blue, sp:[10,12,11,14,13,16,15]},
    {l:'Phản hồi đầu', v:'1m 32s', delta:'7%', ic:'Clock', c:C.green, sp:[18,16,15,14,13,12,11]},
    {l:'Tỷ lệ chat→mua', v:'8.6%', delta:'1.4%', ic:'TrendUp', c:C.violet, sp:[6,6.5,7,7.2,8,8.3,8.6]},
    {l:'Tin nhắn/hội thoại', v:'7.2', delta:'0.5', ic:'Inbox', c:C.amber, sp:[6.4,6.6,6.8,7,7.1,7.1,7.2]},
  ];
  const cols=['T2','T3','T4','T5','T6','T7','CN'];
  const rowL=['8h','11h','14h','17h','20h','23h'];
  const r=rng(99); const grid=rowL.map(()=>cols.map(()=>Math.round(r()*100)));
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>{kpis.map(k=><Kpi key={k.l} k={k}/>)}</div>
    <Card title="Hội thoại theo kênh" sub="Phân tầng theo nền tảng" right={<Legend items={[{l:'Zalo',c:'#0068FF'},{l:'Facebook',c:'#1877F2'},{l:'Shopee',c:'#EE4D2D'},{l:'TikTok',c:'#111'}]}/>}>
      <StackBars labels={D.labels} rows={[{data:D.gen(8,1),color:'#0068FF'},{data:D.gen(6,1),color:'#1877F2'},{data:D.gen(5,1),color:'#EE4D2D'},{data:D.gen(3,1),color:'#111'}]}/>
    </Card>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="Phễu chuyển đổi chat" sub="Tin đến → chốt đơn"><Funnel steps={[{l:'Tin nhắn đến',v:1240*mult/7|0,c:C.blue},{l:'Đã phản hồi',v:1180*mult/7|0,c:C.cyan},{l:'Tư vấn sâu',v:430*mult/7|0,c:C.amber},{l:'Chốt đơn',v:107*mult/7|0,c:C.green}]}/></Card>
      <Card title="Giờ vàng hội thoại" sub="Mật độ theo giờ × ngày"><Heatmap grid={grid} rowLabels={rowL} colLabels={cols}/></Card>
    </div>
  </div>);
}

/* ---------- TAB: Call ---------- */
function CallTab({ D, mult }){
  const kpis=[
    {l:'Tổng cuộc gọi', v:fmt(64*mult), delta:'9%', ic:'Phone', c:C.blue, sp:[8,9,8,10,11,10,12]},
    {l:'Tỷ lệ nghe máy', v:'87%', delta:'2%', ic:'Check', c:C.greenD, sp:[82,83,84,85,86,86,87]},
    {l:'Thời lượng TB', v:'3m 42s', delta:'12s', ic:'Clock', c:C.amber, sp:[200,210,215,220,218,222,222], down:true},
    {l:'Cuộc gọi nhỡ', v:fmt(8*mult/7|0), delta:'4%', ic:'Bell', c:C.red, sp:[3,2,3,4,3,2,2], down:true},
  ];
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>{kpis.map(k=><Kpi key={k.l} k={k}/>)}</div>
    <Card title="Cuộc gọi ra / vào" right={<Legend items={[{l:'Gọi vào',c:C.blue},{l:'Gọi ra',c:C.green}]}/>}>
      <StackBars labels={D.labels} rows={[{data:D.gen(7,1),color:C.blue},{data:D.gen(5,1),color:C.green}]}/>
    </Card>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="Kết quả cuộc gọi"><div style={{display:'flex',alignItems:'center',gap:16}}><Donut data={[{v:540,c:C.green},{v:120,c:C.amber},{v:80,c:C.red}]} size={150}/><div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>{[{l:'Nghe máy',v:540,c:C.green},{l:'Bận / không nghe',v:120,c:C.amber},{l:'Gọi nhỡ',v:80,c:C.red}].map(x=>(<div key={x.l} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}><span style={{width:9,height:9,borderRadius:2,background:x.c}}/><span style={{flex:1}}>{x.l}</span><b>{fmt(x.v)}</b></div>))}</div></div></Card>
      <Card title="Giờ cao điểm cuộc gọi" sub="Theo khung giờ"><StackBars labels={['8h','10h','12h','14h','16h','18h','20h']} rows={[{data:[12,28,18,32,40,30,16],color:C.blue}]} height={190}/></Card>
    </div>
  </div>);
}

/* ---------- TAB: Ticket & SLA ---------- */
function TicketTab({ D, mult }){
  const kpis=[
    {l:'Ticket tạo', v:fmt(42*mult/7|0), delta:'6%', ic:'Activity', c:C.blue, sp:[6,7,6,8,7,9,8]},
    {l:'Ticket đóng', v:fmt(39*mult/7|0), delta:'8%', ic:'Check', c:C.greenD, sp:[5,6,6,7,7,8,8]},
    {l:'% đạt SLA', v:'94.2%', delta:'2%', ic:'Clock', c:C.green, sp:[90,91,92,92,93,94,94]},
    {l:'CSAT sau xử lý', v:'4.6/5', delta:'0.1', ic:'Star', c:C.amber, sp:[44,45,45,46,46,46,46]},
  ];
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>{kpis.map(k=><Kpi key={k.l} k={k}/>)}</div>
    <Card title="Ticket tạo vs đóng" right={<Legend items={[{l:'Tạo',c:C.blue},{l:'Đóng',c:C.green}]}/>}>
      <LineChart labels={D.labels} series={[{data:D.gen(6,1),color:C.blue},{data:D.gen(5.5,1),color:C.green}]}/>
    </Card>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <Card title="Phân bố theo danh mục" sub="Bấm danh mục để xem ticket"><div style={{display:'flex',alignItems:'center',gap:16}}><Donut data={[{l:'Giao hàng',v:180,c:C.blue},{l:'Hoàn tiền',v:140,c:C.amber},{l:'Chính sách',v:120,c:C.violet},{l:'Kỹ thuật',v:90,c:C.green},{l:'Khiếu nại',v:60,c:C.red}]} size={150} onSlice={(k)=>rpDrill('Ticket · '+k, 'Danh sách ticket thuộc danh mục '+k, rpRecords(k, 11))}/><div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>{[{l:'Giao hàng',v:180,c:C.blue},{l:'Hoàn tiền',v:140,c:C.amber},{l:'Chính sách',v:120,c:C.violet},{l:'Kỹ thuật',v:90,c:C.green},{l:'Khiếu nại',v:60,c:C.red}].map(x=>(<div key={x.l} onClick={()=>rpDrill('Ticket · '+x.l, 'Danh sách ticket thuộc danh mục '+x.l, rpRecords(x.l, 11))} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',padding:'3px 6px',borderRadius:6}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><span style={{width:9,height:9,borderRadius:2,background:x.c}}/><span style={{flex:1}}>{x.l}</span><b>{fmt(x.v)}</b></div>))}</div></div></Card>
      <Card title="Tuân thủ SLA" sub="Theo mức ưu tiên">
        <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:4}}>
          {[{l:'Ưu tiên Cao',pct:89,c:C.red},{l:'Trung bình',pct:95,c:C.amber},{l:'Thấp',pct:98,c:C.green}].map(x=>(
            <div key={x.l}><div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:5}}><span style={{fontWeight:600}}>{x.l}</span><b style={{color:x.c}}>{x.pct}%</b></div><div style={{height:10,background:'var(--fill-03)',borderRadius:5,overflow:'hidden'}}><div style={{width:x.pct+'%',height:'100%',background:x.c,borderRadius:5}}/></div></div>
          ))}
          <div style={{marginTop:6,padding:'10px 13px',background:'#FDECEA',borderRadius:9,fontSize:12,color:'#A63322',fontWeight:600}}>{RpI('Bell',{style:{width:14,height:14,verticalAlign:'middle'}})} 12 ca breach SLA kỳ này — chủ yếu nhóm ưu tiên Cao.</div>
        </div>
      </Card>
    </div>
  </div>);
}

/* ---------- TAB: Agent ---------- */
function AgentTab({ mult }){
  const max=Math.max(...AGENTS.map(a=>a.conv));
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
      <Kpi k={{l:'Agent hoạt động',v:'5',delta:'1',ic:'Users',c:C.blue,sp:[3,3,4,4,5,5,5]}}/>
      <Kpi k={{l:'CSAT đội ngũ',v:'4.7/5',delta:'0.2',ic:'Star',c:C.amber,sp:[44,45,46,46,47,47,47]}}/>
      <Kpi k={{l:'AI vs Người',v:'63 / 37',delta:'9%',ic:'Sparkles',c:C.cyan,sp:[52,54,56,58,60,62,63]}}/>
      <Kpi k={{l:'Ticket đóng',v:fmt(1050),delta:'14%',ic:'Check',c:C.greenD,sp:[120,130,128,140,138,148,150]}}/>
    </div>
    <Card title="Bảng xếp hạng nhân sự" sub="Theo hiệu suất kỳ này">
      <div style={{display:'grid',gridTemplateColumns:'28px 1.6fr 1.1fr 0.9fr 0.8fr 0.9fr 1fr',gap:12,padding:'8px 10px',borderBottom:'1px solid var(--fill-04)',fontSize:10.5,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)'}}>
        <span>#</span><span>Nhân sự</span><span>Hội thoại</span><span>FRT</span><span>CSAT</span><span>Đóng</span><span style={{textAlign:'right'}}>Doanh thu</span>
      </div>
      {AGENTS.map((a,i)=>(
        <div key={a.n} onClick={()=>rpDrill('Hội thoại của '+a.n, a.team+' · '+fmt(a.conv)+' hội thoại kỳ này', rpRecords(a.n, 12))} style={{display:'grid',gridTemplateColumns:'28px 1.6fr 1.1fr 0.9fr 0.8fr 0.9fr 1fr',gap:12,padding:'11px 10px',borderBottom:'1px solid var(--fill-03)',alignItems:'center',cursor:'pointer'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <span style={{fontSize:13,fontWeight:800,color:i<3?C.amber:'var(--label-03)'}}>{i+1}</span>
          <div style={{display:'flex',alignItems:'center',gap:9,minWidth:0}}>
            <span style={{width:28,height:28,borderRadius:'50%',background:a.ai?'var(--bg-green)':avC(a.n),color:a.ai?'var(--pr-dark-1)':'white',display:'grid',placeItems:'center',fontSize:12,fontWeight:800,flexShrink:0}}>{a.ai?RpI('Sparkles',{style:{width:14,height:14}}):a.n[0]}</span>
            <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.n}</div><div style={{fontSize:10.5,color:'var(--label-03)'}}>{a.team}</div></div>
          </div>
          <div><div style={{height:6,background:'var(--fill-03)',borderRadius:3,overflow:'hidden',marginBottom:3}}><div style={{width:(a.conv/max*100)+'%',height:'100%',background:a.ai?C.cyan:C.blue,borderRadius:3}}/></div><span style={{fontSize:11.5,fontWeight:700}}>{fmt(a.conv)}</span></div>
          <span style={{fontSize:12.5,fontWeight:600}}>{a.frt}</span>
          <span style={{fontSize:12.5,fontWeight:700,color:C.amber}}>★ {a.csat}</span>
          <span style={{fontSize:12.5,fontWeight:600}}>{a.closed}</span>
          <span style={{fontSize:12.5,fontWeight:800,color:C.greenD,textAlign:'right'}}>{a.rev}M₫</span>
        </div>
      ))}
    </Card>
    <Card title="So sánh AI vs Người" sub="Phân bổ khối lượng xử lý">
      <div style={{display:'flex',gap:24,alignItems:'center'}}>
        <Donut data={[{v:1480,c:C.cyan},{v:870,c:C.blue}]} size={160}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>
          {[{l:'AI Agent tự xử lý',v:1480,c:C.cyan,note:'63% · phản hồi tức thì, tiết kiệm ~120 giờ/tháng'},{l:'Nhân sự xử lý',v:870,c:C.blue,note:'37% · ca phức tạp, tư vấn sâu & khiếu nại'}].map(x=>(
            <div key={x.l} style={{display:'flex',gap:11}}><span style={{width:11,height:11,borderRadius:3,background:x.c,marginTop:3,flexShrink:0}}/><div><div style={{fontSize:13.5,fontWeight:700}}>{x.l} · {fmt(x.v)}</div><div style={{fontSize:11.5,color:'var(--label-02)',marginTop:2,lineHeight:1.5}}>{x.note}</div></div></div>
          ))}
        </div>
      </div>
    </Card>
  </div>);
}

/* ---------- TAB: Token & ROI ---------- */
function CostTab({ D, mult }){
  const kpis=[
    {l:'Token tiêu thụ', v:fmt(2.4*mult/7*1000)+'', delta:'14%', ic:'Sparkles', c:C.cyan, sp:[120,140,135,160,155,180,175], down:false},
    {l:'Chi phí AI', v:fmt(3.2*mult/7|0)+'M₫', delta:'11%', ic:'TrendUp', c:C.violet, sp:[20,24,22,28,26,31,30], down:false},
    {l:'Chi phí / hội thoại', v:'1.180₫', delta:'6%', ic:'Chat', c:C.green, sp:[14,13.5,13,12.5,12,11.8,11.8], down:true},
    {l:'ROI Marketing', v:'4.8×', delta:'0.6×', ic:'Broadcast', c:C.amber, sp:[3.8,4,4.1,4.3,4.4,4.6,4.8]},
  ];
  const MODELS=[{l:'Claude Haiku 4.5',tok:1.48,cost:1.18,c:C.green},{l:'Claude Sonnet 4.5',tok:0.74,cost:1.62,c:C.blue},{l:'Claude Opus 4.5',tok:0.18,cost:0.40,c:C.violet}];
  const totTok=MODELS.reduce((a,m)=>a+m.tok,0);
  const CAMP=[
    {n:'Flash Sale 20/04 — ZNS',ch:'ZNS',cost:8.4,rev:48.7},
    {n:'Zalo ZBS — Ưu đãi VIP',ch:'ZBS',cost:6.1,rev:31.2},
    {n:'Email — Newsletter Hè #5',ch:'Email',cost:3.2,rev:54.0},
    {n:'Win-back 60 ngày — Email',ch:'Email',cost:4.2,rev:18.6},
    {n:'Remind giỏ hàng — SMS',ch:'SMS',cost:1.6,rev:12.4},
  ];
  const maxRoi=Math.max(...CAMP.map(c=>c.rev/c.cost));
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>{kpis.map(k=><Kpi key={k.l} k={k}/>)}</div>
    <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:16}}>
      <Card title="Token tiêu thụ theo ngày" sub="Nghìn token" right={<Legend items={[{l:'Token',c:C.cyan}]}/>}>
        <LineChart labels={D.labels} series={[{data:D.gen(180,30),color:C.cyan}]}/>
      </Card>
      <Card title="Token theo mô hình AI" sub="Triệu token · chi phí">
        <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:2}}>
          {MODELS.map(m=>(<div key={m.l}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><span style={{fontWeight:600}}>{m.l}</span><span style={{color:'var(--label-02)'}}>{m.tok}M · <b style={{color:m.c}}>{m.cost}M₫</b></span></div><div style={{height:9,background:'var(--fill-03)',borderRadius:5,overflow:'hidden'}}><div style={{width:(m.tok/totTok*100)+'%',height:'100%',background:m.c,borderRadius:5}}/></div></div>))}
          <div style={{marginTop:6,padding:'10px 13px',background:'var(--fill-02)',borderRadius:9,fontSize:12,color:'var(--label-02)'}}>{RpI('Sparkles',{style:{width:13,height:13,verticalAlign:'middle',color:C.cyan}})} Haiku gánh 60% khối lượng với chi phí/token thấp — tối ưu cho CSKH số lượng lớn.</div>
        </div>
      </Card>
    </div>
    <Card title="ROI chiến dịch Marketing" sub="Chi phí gửi tin vs doanh thu attributed · bấm để xem chi tiết">
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1.4fr 0.8fr',gap:12,padding:'8px 10px',borderBottom:'1px solid var(--fill-04)',fontSize:10.5,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)'}}>
        <span>Chiến dịch</span><span>Kênh</span><span style={{textAlign:'right'}}>Chi phí</span><span>Doanh thu · ROI</span><span style={{textAlign:'right'}}>ROI</span>
      </div>
      {CAMP.map((c,i)=>{ const roi=c.rev/c.cost; return (
        <div key={i} onClick={()=>rpDrill('Chiến dịch · '+c.n, 'Doanh thu '+c.rev+'M₫ · ROI '+roi.toFixed(1)+'×', rpRecords(c.n, 11, c.ch))} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1.4fr 0.8fr',gap:12,padding:'11px 10px',borderBottom:'1px solid var(--fill-03)',alignItems:'center',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <span style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.n}</span>
          <span style={{fontSize:12,color:'var(--label-02)'}}>{c.ch}</span>
          <span style={{fontSize:12.5,fontWeight:600,textAlign:'right'}}>{c.cost}M₫</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:7,background:'var(--fill-03)',borderRadius:4,overflow:'hidden'}}><div style={{width:(roi/maxRoi*100)+'%',height:'100%',background:roi>=4?C.green:roi>=2?C.amber:C.red,borderRadius:4}}/></div><span style={{fontSize:12,fontWeight:700,color:C.greenD}}>{c.rev}M₫</span></div>
          <span style={{fontSize:13,fontWeight:800,color:roi>=4?C.greenD:roi>=2?C.amber:C.red,textAlign:'right'}}>{roi.toFixed(1)}×</span>
        </div>
      );})}
    </Card>
  </div>);
}

/* ---------- module root ---------- */
const RP_TABS=[{k:'overview',l:'Tổng quan',ic:'Grid'},{k:'chat',l:'Messages',ic:'Chat'},{k:'call',l:'Call',ic:'Phone'},{k:'ticket',l:'Ticket & SLA',ic:'Activity'},{k:'agent',l:'Nhân sự',ic:'Users'},{k:'cost',l:'Token & ROI',ic:'TrendUp'}];
function ReportsModule({ page }){
  const [tab,setTab]=useRp(page||'overview');
  React.useEffect(()=>{
    if(page){ setTab(page); return; }
    const apply=()=>{ if(window.__acRepTab){ setTab(window.__acRepTab); window.__acRepTab=null; } };
    apply();
    window.addEventListener('ac-rep-tab', apply);
    return ()=>window.removeEventListener('ac-rep-tab', apply);
  },[page]);
  const [range,setRange]=useRp('7d');
  const [compare,setCompare]=useRp(true);
  const [toast,setToast]=useRp('');
  const [drill,setDrill]=useRp(null);
  const [xf,setXf]=useRp(null);
  React.useEffect(()=>{ if(toast){ const x=setTimeout(()=>setToast(''),2000); return ()=>clearTimeout(x); } },[toast]);
  React.useEffect(()=>{ window.__rpDrill=(p)=>setDrill(p); window.__rpXF=(v)=>setXf(cur=>cur===v?null:v); window.__rpToast=(m)=>setToast(m); return ()=>{ try{delete window.__rpDrill; delete window.__rpXF; delete window.__rpToast;}catch(e){} }; },[]);
  const days=(RANGES.find(r=>r.k===range)||RANGES[1]).d;
  const D=useRpM(()=>buildData(days),[days]);
  const mult=days<=1?177:days<=7?177:days<=30?720:2100;
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="topbar">
        <h1>Reports</h1>
        <span className="crumb">Hiệu suất Chat · Call · Ticket · CSAT · Doanh thu · Nhân sự</span>
        <span className="spacer"/>
        <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:'var(--label-02)',cursor:'pointer'}}>
          <input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)} style={{width:14,height:14,accentColor:'var(--primary)'}}/> So sánh kỳ trước
        </label>
        <div style={{display:'flex',padding:3,background:'var(--fill-03)',borderRadius:7,gap:2}}>
          {RANGES.map(r=>(<button key={r.k} onClick={()=>setRange(r.k)} style={{padding:'4px 10px',border:'none',borderRadius:5,cursor:'pointer',background:range===r.k?'white':'transparent',color:range===r.k?'var(--label-01)':'var(--label-02)',boxShadow:range===r.k?'var(--shadow-sm)':'none',fontSize:11.5,fontWeight:600,fontFamily:'inherit'}}>{r.l}</button>))}
        </div>
        <button onClick={()=>setToast('Đang xuất báo cáo ra Excel…')} className="btn btn-ghost btn-sm" style={{gap:5}}>{RpI('Download',{style:{width:13,height:13,transform:'rotate(180deg)'}})} Xuất</button>
      </div>
      {!page && (<div style={{display:'flex',gap:4,padding:'10px 22px 0',borderBottom:'1px solid var(--fill-04)',background:'white'}}>
        {RP_TABS.map(t=>(<button key={t.k} onClick={()=>setTab(t.k)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 14px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontFamily:'inherit',fontWeight:tab===t.k?700:500,color:tab===t.k?'var(--primary)':'var(--label-02)',borderBottom:'2px solid '+(tab===t.k?'var(--primary)':'transparent'),marginBottom:-1}}>{RpI(t.ic,{style:{width:14,height:14}})} {t.l}</button>))}
      </div>)}
      {xf && (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 22px',background:'var(--bg-green)',borderBottom:'1px solid var(--fill-04)'}}>
          {RpI('Plug',{style:{width:14,height:14,color:'var(--pr-dark-1)'}})}
          <span style={{fontSize:12.5,color:'var(--pr-dark-2)'}}>Đang lọc chéo toàn trang theo kênh: <b>{xf}</b></span>
          <span style={{flex:1}}/>
          <button onClick={()=>setXf(null)} className="btn btn-ghost btn-sm" style={{gap:5}}>{RpI('Close',{style:{width:13,height:13}}) || '✕'} Bỏ lọc</button>
        </div>
      )}
      <div className="scroll" style={{flex:1,overflow:'auto',padding:'18px 22px',background:'var(--fill-02)'}}>
        {tab==='overview' && <Overview D={D} mult={mult} xf={xf}/>}
        {tab==='chat' && <ChatTab D={D} mult={mult}/>}
        {tab==='call' && <CallTab D={D} mult={mult}/>}
        {tab==='ticket' && <TicketTab D={D} mult={mult}/>}
        {tab==='agent' && <AgentTab mult={mult}/>}
        {tab==='cost' && <CostTab D={D} mult={mult}/>}
      </div>
      <DrillDrawer drill={drill} onClose={()=>setDrill(null)}/>
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1000,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{RpI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    </div>
  );
}

window.ReportsModule = ReportsModule;
window.RepOverview = ()=> <ReportsModule page="overview"/>;
window.RepMessages = ()=> <ReportsModule page="chat"/>;
window.RepTicket   = ()=> <ReportsModule page="ticket"/>;
window.RepAgent    = ()=> <ReportsModule page="agent"/>;
window.RepCost     = ()=> <ReportsModule page="cost"/>;
} catch(e){ console.error('reports-module.jsx', e); }
})();
