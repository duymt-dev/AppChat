/* ============================================================
   reports-v2.jsx — Bộ báo cáo AppChat (10 trang · gom 5 nhóm)
   Tổng quan · Vận hành · Tăng trưởng · AI&Tự động · Con người
   Nguyên tắc "1 con số 1 nguồn": Executive chỉ tóm tắt + link sâu.
   ============================================================ */
;(function(){
try {
const { useState: useRv } = React;
const RvI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
const fmt=(n)=>(n||0).toLocaleString('vi-VN');
const C = { blue:'#2563EB', green:'#16A34A', amber:'#D97706', red:'#DC2626', violet:'#7C3AED', teal:'#0E9B94', pink:'#DB2777', slate:'#64748B' };

/* ---------- shells ---------- */
function Page({ title, sub, children, list }){
  const [from,setFrom]=useRv(''); const [to,setTo]=useRv(''); const [toast,setToast]=useRv('');
  React.useEffect(()=>{ if(toast){ const x=setTimeout(()=>setToast(''),2000); return ()=>clearTimeout(x); } },[toast]);
  const di={height:32, border:'1px solid var(--fill-04)', borderRadius:8, fontSize:12, fontFamily:'inherit', background:'white', color:'var(--label-01)', padding:'0 9px', outline:'none'};
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>{title}</h1>
        <span className="crumb">{sub}</span>
        <span className="spacer"/>
        <input type="date" title="Từ ngày" placeholder="Từ ngày" value={from} onChange={e=>setFrom(e.target.value)} onFocus={e=>e.target.type='date'} style={{...di, width:122}}/>
        <span style={{color:'var(--label-03)', fontSize:13}}>→</span>
        <input type="date" title="Đến ngày" value={to} onChange={e=>setTo(e.target.value)} style={{...di, width:122}}/>
        <button className="btn btn-ghost btn-sm" onClick={()=>setToast(from&&to?('Đã xuất báo cáo '+from+' → '+to):'Chọn khoảng ngày để xuất')}>{RvI('Download',{style:{width:13,height:13}})} Xuất khoảng</button>
        <button className="btn btn-primary btn-sm" onClick={()=>setToast('Đã xuất báo cáo tổng "'+title+'" (.xlsx)')}>{RvI('Download',{style:{width:13,height:13}})} Xuất tổng</button>
        {window.AIAssistBtn && <window.AIAssistBtn label="Trợ lý AI" ctx="Báo cáo"/>}
      </div>
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'18px 22px', background:'var(--fill-02)'}}>
        {children}
        {list && <Card title={list.title||'Danh sách chi tiết'} sub={list.sub}><Tbl cols={list.cols} rows={list.rows}/></Card>}
      </div>
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'var(--label-01)',color:'white',padding:'10px 18px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:1400,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{RvI('Check',{style:{width:16,height:16,color:'#4ADE80'}})}{toast}</div>}
    </div>
  );
}
function Kpi({ l, v, sub, c, ic, link }){
  return (<div className="card" style={{padding:15, position:'relative'}}>
    <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:9}}>
      <span style={{width:32,height:32,borderRadius:8,background:c+'18',color:c,display:'grid',placeItems:'center',flexShrink:0}}>{RvI(ic,{style:{width:16,height:16}})}</span>
      <span style={{fontSize:11.5,color:'var(--label-02)',fontWeight:600,lineHeight:1.25}}>{l}</span>
      {link && <span title={'Nguồn: '+link} style={{position:'absolute',top:10,right:10,fontSize:9.5,fontWeight:700,color:'var(--label-04)'}}>↗</span>}
    </div>
    <div style={{fontSize:23,fontWeight:800,lineHeight:1}}>{v}</div>
    {sub && <div style={{fontSize:10.5,color: (sub+'').startsWith('-')?'#DC2626':'#16A34A',fontWeight:600,marginTop:5}}>{sub}</div>}
  </div>);
}
const KpiGrid = ({cols=4, children})=> <div style={{display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, marginBottom:16}}>{children}</div>;
function Card({ title, sub, right, children }){
  return (<div className="card" style={{padding:18, marginBottom:16}}>
    {(title||right) && <div style={{display:'flex',alignItems:'flex-start',marginBottom:14}}><div><div style={{fontWeight:800,fontSize:14.5}}>{title}</div>{sub&&<div style={{fontSize:11.5,color:'var(--label-02)',marginTop:2}}>{sub}</div>}</div><span style={{flex:1}}/>{right}</div>}
    {children}
  </div>);
}
/* mini bar chart */
function Bars({ data, h=170 }){
  const max=Math.max(...data.map(d=>d.v),1);
  return (<div style={{display:'flex', alignItems:'flex-end', gap:10, height:h, padding:'0 4px'}}>
    {data.map((d,i)=>(
      <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
        <div style={{fontSize:10.5, fontWeight:700, color:'var(--label-02)'}}>{d.label2||''}</div>
        <div style={{width:'100%', maxWidth:46, height:(d.v/max)*(h-40), background:d.c||C.blue, borderRadius:'6px 6px 0 0', minHeight:4}}/>
        <div style={{fontSize:10.5, color:'var(--label-03)', whiteSpace:'nowrap'}}>{d.label}</div>
      </div>
    ))}
  </div>);
}
/* horizontal ranking rows */
function Rank({ rows }){
  const max=Math.max(...rows.map(r=>r.v),1);
  return (<div style={{display:'flex', flexDirection:'column', gap:9}}>
    {rows.map((r,i)=>(
      <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
        <span style={{width:120, fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.l}</span>
        <div style={{flex:1, height:9, background:'var(--fill-03)', borderRadius:5, overflow:'hidden'}}><div style={{width:(r.v/max*100)+'%', height:'100%', background:r.c||C.blue, borderRadius:5}}/></div>
        <span style={{width:64, textAlign:'right', fontSize:12.5, fontWeight:700}}>{fmt(r.v)}</span>
      </div>
    ))}
  </div>);
}
/* simple data table */
function Tbl({ cols, rows }){
  return (<div style={{border:'1px solid var(--fill-04)', borderRadius:10, overflow:'hidden'}}>
    <div style={{display:'grid', gridTemplateColumns:cols.map(c=>c.w||'1fr').join(' '), gap:10, padding:'9px 14px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)'}}>
      {cols.map((c,i)=><span key={i} style={{fontSize:10.5,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--label-03)',textAlign:c.r?'right':'left'}}>{c.l}</span>)}
    </div>
    {rows.map((r,ri)=>(
      <div key={ri} style={{display:'grid', gridTemplateColumns:cols.map(c=>c.w||'1fr').join(' '), gap:10, padding:'10px 14px', borderBottom: ri<rows.length-1?'1px solid var(--fill-03)':'none', alignItems:'center'}}>
        {r.map((cell,ci)=><span key={ci} style={{fontSize:12.5, fontWeight:ci===0?600:500, textAlign:cols[ci].r?'right':'left', color:cols[ci].r?'var(--pr-dark-2)':'var(--label-01)'}}>{cell}</span>)}
      </div>
    ))}
  </div>);
}
/* funnel */
function Funnel({ steps }){
  const max=steps[0].v||1;
  return (<div style={{display:'flex', flexDirection:'column', gap:6}}>
    {steps.map((s,i)=>{ const pct=s.v/max*100; const drop= i>0? Math.round(s.v/steps[i-1].v*100):100; return (
      <div key={i} style={{display:'flex', alignItems:'center', gap:12}}>
        <span style={{width:130, fontSize:12.5, fontWeight:600}}>{s.l}</span>
        <div style={{flex:1, height:30, background:'var(--fill-03)', borderRadius:7, overflow:'hidden', position:'relative'}}>
          <div style={{width:pct+'%', height:'100%', background:`linear-gradient(90deg,${C.blue},${C.teal})`, borderRadius:7, display:'flex', alignItems:'center', paddingLeft:10}}><span style={{fontSize:12, fontWeight:700, color:'white'}}>{fmt(s.v)}</span></div>
        </div>
        <span style={{width:48, textAlign:'right', fontSize:11.5, fontWeight:700, color: i>0&&drop<60?'#DC2626':'var(--label-02)'}}>{drop}%</span>
      </div>
    );})}
  </div>);
}

/* =================== 1 · EXECUTIVE =================== */
function ExecDashboard(){
  return (<Page title="Executive Dashboard" sub="Báo cáo điều hành tổng quan · số liệu tóm tắt, bấm để xem chi tiết" list={{title:'Danh sách chỉ số chi tiết', cols:[{l:'Chỉ số'},{l:'Giá trị',r:true},{l:'Nguồn'}], rows:[['Tổng hội thoại','18.420','Conversations'],['Leads mới','1.240','Sales & CRM'],['Ticket quá hạn','18','Tickets & SLA'],['AI xử lý thành công','63%','AI Agents'],['Tỷ lệ chuyển đổi','24,8%','Sales & CRM']]}}>
    <KpiGrid cols={3}>
      <Kpi l="Tổng hội thoại" v="18.420" sub="+12.5%" c={C.blue} ic="Chat" link="Conversations"/>
      <Kpi l="Tổng khách hàng" v="9.860" sub="+6.2%" c={C.teal} ic="Users" link="Customers"/>
      <Kpi l="Leads mới" v="1.240" sub="+8.4%" c={C.green} ic="TrendUp" link="Sales & CRM"/>
      <Kpi l="Cơ hội mới" v="386" sub="+5.1%" c={C.violet} ic="Star" link="Sales & CRM"/>
      <Kpi l="Ticket mở" v="142" sub="-3.0%" c={C.amber} ic="Activity" link="Tickets & SLA"/>
      <Kpi l="Ticket quá hạn" v="18" sub="-12%" c={C.red} ic="Clock" link="Tickets & SLA"/>
      <Kpi l="Chiến dịch đang chạy" v="18" c={C.pink} ic="Broadcast" link="Marketing"/>
      <Kpi l="AI xử lý thành công" v="63%" sub="+9.3%" c={C.teal} ic="Sparkles" link="AI Agents"/>
      <Kpi l="Tỷ lệ chuyển đổi" v="24.8%" sub="+2.1%" c={C.blue} ic="TrendUp" link="Sales & CRM"/>
    </KpiGrid>
    <Card title="Xu hướng tăng trưởng" sub="Hội thoại · Leads · Doanh thu (6 tháng)">
      <Bars data={[{label:'T1',v:62},{label:'T2',v:70},{label:'T3',v:78},{label:'T4',v:85},{label:'T5',v:92},{label:'T6',v:100}]}/>
    </Card>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Top nhân viên" sub="↗ Team Performance"><Rank rows={[{l:'Trâm',v:482,c:C.green},{l:'Hương',v:421,c:C.green},{l:'Minh',v:388,c:C.blue},{l:'Khoa',v:344,c:C.blue},{l:'Lan Anh',v:296,c:C.slate}]}/></Card>
      <Card title="Top kênh" sub="↗ Channels"><Rank rows={[{l:'Zalo OA',v:6240,c:C.blue},{l:'Facebook',v:4180,c:C.violet},{l:'Website',v:3020,c:C.teal},{l:'TikTok',v:2410,c:C.pink},{l:'Hotline',v:1560,c:C.amber}]}/></Card>
      <Card title="Top chiến dịch" sub="↗ Marketing"><Rank rows={[{l:'Flash Sale ZNS',v:642,c:C.pink},{l:'Nhắc tái khám',v:518,c:C.teal},{l:'Win-back 60d',v:388,c:C.violet},{l:'Newsletter Hè',v:296,c:C.blue}]}/></Card>
      <Card title="Top AI Agent" sub="↗ AI Agents"><Rank rows={[{l:'AI CSKH',v:8420,c:C.teal},{l:'AI Sales',v:5240,c:C.green},{l:'AI Marketing',v:3180,c:C.pink},{l:'AI Internal',v:1640,c:C.slate}]}/></Card>
    </div>
  </Page>);
}

/* =================== 2 · CONVERSATIONS =================== */
function RepConversations(){
  return (<Page title="Conversations" sub="Hiệu quả hội thoại đa kênh" list={{title:'Danh sách hội thoại nổi bật', cols:[{l:'Khách hàng'},{l:'Kênh'},{l:'Nhân viên'},{l:'FRT',r:true}], rows:[['Chị Lan','Zalo OA','Trâm','1,2 phút'],['Anh Quân','Facebook','Hương','2,4 phút'],['Cô Mai','Website','Minh','3,1 phút'],['Anh Đức','Hotline','Khoa','5,0 phút']]}}>
    <KpiGrid cols={3}>
      <Kpi l="Tổng hội thoại" v="18.420" sub="+12.5%" c={C.blue} ic="Chat"/>
      <Kpi l="Hội thoại mới" v="3.240" sub="+8.1%" c={C.green} ic="Plus"/>
      <Kpi l="Đã xử lý" v="16.980" sub="+11%" c={C.teal} ic="Check"/>
      <Kpi l="Chưa xử lý" v="1.440" sub="-4.2%" c={C.amber} ic="Clock"/>
      <Kpi l="First Response Time" v="2,4 phút" sub="-0.6 phút" c={C.violet} ic="Zap"/>
      <Kpi l="Resolution Time" v="3,8 giờ" sub="-0.4 giờ" c={C.pink} ic="Activity"/>
    </KpiGrid>
    <Card title="Hội thoại theo ngày"><Bars data={[{label:'T2',v:82},{label:'T3',v:74},{label:'T4',v:90},{label:'T5',v:68},{label:'T6',v:96},{label:'T7',v:58},{label:'CN',v:40}]}/></Card>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Theo kênh"><Rank rows={[{l:'Zalo OA',v:6240,c:C.blue},{l:'Facebook',v:4180,c:C.violet},{l:'Website',v:3020,c:C.teal},{l:'TikTok',v:2410,c:C.pink}]}/></Card>
      <Card title="Theo nhân viên"><Rank rows={[{l:'Trâm',v:482,c:C.green},{l:'Hương',v:421,c:C.green},{l:'Minh',v:388,c:C.blue},{l:'Khoa',v:344,c:C.blue}]}/></Card>
    </div>
    <Card title="Theo phòng ban"><Tbl cols={[{l:'Phòng ban'},{l:'Hội thoại',r:true},{l:'Đã xử lý',r:true},{l:'FRT',r:true}]} rows={[['Kinh doanh','7.420','6.980','1,9 phút'],['CSKH','8.640','8.210','2,6 phút'],['Kỹ thuật','2.360','1.790','4,1 phút']]}/></Card>
  </Page>);
}

/* =================== 3 · TICKETS & SLA =================== */
function RepTicketsSLA(){
  return (<Page title="Tickets & SLA" sub="CSKH và vận hành" list={{title:'Danh sách ticket quá hạn', cols:[{l:'Mã ticket'},{l:'Khách hàng'},{l:'Phụ trách'},{l:'Trễ',r:true}], rows:[['#TK-2041','Linh Phạm','Khoa','2,1 giờ'],['#TK-2038','Quân Trần','Hương','1,4 giờ'],['#TK-2033','Mai Anh','Minh','0,8 giờ']]}}>
    <KpiGrid cols={5}>
      <Kpi l="Ticket mở" v="142" c={C.blue} ic="Activity"/>
      <Kpi l="Ticket đóng" v="1.286" sub="+9%" c={C.green} ic="Check"/>
      <Kpi l="Ticket quá hạn" v="18" sub="-12%" c={C.red} ic="Clock"/>
      <Kpi l="SLA đạt" v="94,2%" sub="+1.8%" c={C.teal} ic="TrendUp"/>
      <Kpi l="SLA vi phạm" v="5,8%" sub="-1.8%" c={C.amber} ic="AlertTri"/>
    </KpiGrid>
    <Card title="SLA theo phòng ban"><Tbl cols={[{l:'Phòng ban'},{l:'Ticket',r:true},{l:'SLA đạt',r:true},{l:'Vi phạm',r:true}]} rows={[['CSKH','842','95,1%','41'],['Kỹ thuật','386','91,2%','34'],['Kinh doanh','216','96,8%','7']]}/></Card>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Theo nhân viên"><Rank rows={[{l:'Khoa',v:312,c:C.green},{l:'Hương',v:286,c:C.green},{l:'Minh',v:244,c:C.blue},{l:'Trâm',v:198,c:C.blue}]}/></Card>
      <Card title="Theo mức ưu tiên"><Rank rows={[{l:'Khẩn cấp',v:48,c:C.red},{l:'Cao',v:186,c:C.amber},{l:'Trung bình',v:642,c:C.blue},{l:'Thấp',v:410,c:C.slate}]}/></Card>
    </div>
    <Card title="Theo nhóm dịch vụ"><Bars data={[{label:'Spa',v:88},{label:'Nha khoa',v:72},{label:'PK',v:60},{label:'Anh ngữ',v:44},{label:'Gym',v:30}]}/></Card>
  </Page>);
}

/* =================== 4 · CHANNELS =================== */
function RepChannels(){
  const CH=[['Zalo OA',C.blue],['Zalo Cá nhân',C.blue],['Facebook',C.violet],['Instagram',C.pink],['TikTok','#111'],['Website',C.teal],['Hotline',C.amber]];
  return (<Page title="Channels" sub="Hiệu quả từng kênh kết nối" list={{title:'Danh sách tài khoản kênh', cols:[{l:'Tài khoản'},{l:'Kênh'},{l:'Hội thoại',r:true}], rows:[['Spa Hương Sen','Zalo OA','6.240'],['AppChat Spa','Facebook','4.180'],['appchat.vn','Website','3.020'],['@appchatspa','TikTok','2.410']]}}>
    <KpiGrid cols={4}>
      <Kpi l="Hội thoại" v="18.420" sub="+12%" c={C.blue} ic="Chat"/>
      <Kpi l="Leads" v="1.240" sub="+8%" c={C.green} ic="TrendUp"/>
      <Kpi l="Chuyển đổi" v="24,8%" sub="+2.1%" c={C.violet} ic="Star"/>
      <Kpi l="Chi phí / lead" v="42.000₫" sub="-6%" c={C.amber} ic="CreditCard"/>
    </KpiGrid>
    <Card title="Hiệu quả theo kênh"><Tbl cols={[{l:'Kênh'},{l:'Hội thoại',r:true},{l:'Leads',r:true},{l:'Chuyển đổi',r:true},{l:'Chi phí',r:true}]} rows={CH.map((c,i)=>[c[0], fmt(6240-i*820), fmt(420-i*48), (28-i*2.4).toFixed(1)+'%', fmt(38000+i*5000)+'₫'])}/></Card>
    <Card title="Phân bổ hội thoại theo kênh"><Rank rows={CH.map((c,i)=>({l:c[0],v:6240-i*820,c:c[1]}))}/></Card>
  </Page>);
}

/* =================== 5 · MARKETING =================== */
function RepMarketing(){
  return (<Page title="Marketing Campaigns" sub="Chiến dịch đa kênh · phễu chuyển đổi" list={{title:'Danh sách chiến dịch', cols:[{l:'Chiến dịch'},{l:'Kênh'},{l:'Người nhận',r:true},{l:'Phản hồi',r:true}], rows:[['Flash Sale 20/04','Zalo ZNS','12.480','8,4%'],['Nhắc tái khám','Zalo ZNS','8.420','11,2%'],['Win-back 60 ngày','Email','6.240','3,8%'],['Newsletter Hè','Email','21.200','2,1%']]}}>
    <KpiGrid cols={5}>
      <Kpi l="Chiến dịch" v="42" c={C.blue} ic="Broadcast"/>
      <Kpi l="Người nhận" v="248.420" sub="+14%" c={C.violet} ic="Users"/>
      <Kpi l="Đã xem" v="61,6%" sub="+3.2%" c={C.teal} ic="Eye"/>
      <Kpi l="Đã click" v="12,6%" sub="+1.1%" c={C.green} ic="TrendUp"/>
      <Kpi l="Đã phản hồi" v="4,8%" sub="+0.6%" c={C.pink} ic="Chat"/>
    </KpiGrid>
    <Card title="Phễu chuyển đổi" sub="Người nhận → Deal"><Funnel steps={[{l:'Người nhận',v:248420},{l:'Đã nhận',v:241800},{l:'Đã xem',v:148900},{l:'Đã click',v:30460},{l:'Đã phản hồi',v:11900},{l:'Lead',v:4200},{l:'Deal',v:920}]}/></Card>
    <Card title="Hiệu quả theo loại"><Tbl cols={[{l:'Kênh gửi'},{l:'Đã gửi',r:true},{l:'Tỷ lệ mở',r:true},{l:'Tỷ lệ click',r:true}]} rows={[['Email Marketing','98.400','24,8%','12,6%'],['Zalo ZNS','86.200','61,2%','18,4%'],['Zalo OA Broadcast','42.600','38,1%','9,2%'],['SMS Marketing','21.220','—','4,1%']]}/></Card>
  </Page>);
}

/* =================== 6 · SALES & CRM =================== */
function RepSales(){
  return (<Page title="Sales & CRM" sub="Pipeline · cơ hội · doanh số (CRM360)" list={{title:'Danh sách cơ hội lớn', cols:[{l:'Khách hàng'},{l:'Dịch vụ'},{l:'Giá trị',r:true},{l:'Sale'}], rows:[['Nha khoa Minh Châu','Invisalign','48tr ₫','Khoa'],['Phòng khám QT','Khám DN','120tr ₫','Hương'],['Thẩm mỹ Á Đông','Trẻ hoá da','60tr ₫','Trâm']]}}>
    <KpiGrid cols={5}>
      <Kpi l="Leads" v="1.240" sub="+8.4%" c={C.blue} ic="TrendUp"/>
      <Kpi l="Cơ hội" v="386" sub="+5.1%" c={C.violet} ic="Star"/>
      <Kpi l="Hợp đồng" v="148" sub="+11%" c={C.green} ic="Check"/>
      <Kpi l="Tỷ lệ chốt" v="38,3%" sub="+2.4%" c={C.teal} ic="Activity"/>
      <Kpi l="Giá trị pipeline" v="3,14 tỷ" sub="+18%" c={C.amber} ic="CreditCard"/>
    </KpiGrid>
    <Card title="Pipeline theo giai đoạn"><Funnel steps={[{l:'Lead',v:1240},{l:'Tiềm năng',v:720},{l:'Đang tư vấn',v:480},{l:'Báo giá',v:286},{l:'Hợp đồng',v:148}]}/></Card>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Theo Sale"><Rank rows={[{l:'Trâm',v:48,c:C.green},{l:'Hương',v:41,c:C.green},{l:'Minh',v:34,c:C.blue},{l:'Khoa',v:25,c:C.blue}]}/></Card>
      <Card title="Theo nguồn Lead"><Rank rows={[{l:'Zalo OA',v:420,c:C.blue},{l:'Facebook',v:286,c:C.violet},{l:'Giới thiệu',v:210,c:C.amber},{l:'Website',v:184,c:C.teal}]}/></Card>
    </div>
    <Card title="Theo sản phẩm/dịch vụ"><Bars data={[{label:'Spa',v:92},{label:'Nha khoa',v:78},{label:'Thẩm mỹ',v:64},{label:'Anh ngữ',v:48},{label:'Gym',v:30}]}/></Card>
  </Page>);
}

/* =================== 7 · CUSTOMERS =================== */
function RepCustomers(){
  return (<Page title="Customers" sub="Báo cáo khách hàng" list={{title:'Danh sách khách VIP', cols:[{l:'Khách hàng'},{l:'Hạng'},{l:'Điểm',r:true},{l:'Khu vực'}], rows:[['Chị Lan','Kim cương','24.800','TP.HCM'],['Cô Thu Hà','Vàng','9.200','Hà Nội'],['Anh Đức Anh','Vàng','8.600','Đà Nẵng']]}}>
    <KpiGrid cols={5}>
      <Kpi l="Khách hàng mới" v="1.860" sub="+8.2%" c={C.green} ic="Plus"/>
      <Kpi l="Khách quay lại" v="3.420" sub="+12%" c={C.blue} ic="Refresh"/>
      <Kpi l="Khách tiềm năng" v="2.140" sub="+5.4%" c={C.violet} ic="Star"/>
      <Kpi l="Khách VIP" v="412" sub="+9%" c={C.amber} ic="Star"/>
      <Kpi l="Không tương tác" v="1.280" sub="-3%" c={C.slate} ic="Clock"/>
    </KpiGrid>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Theo nguồn"><Rank rows={[{l:'Zalo OA',v:3240,c:C.blue},{l:'Facebook',v:2180,c:C.violet},{l:'Giới thiệu',v:1620,c:C.amber},{l:'Website',v:1240,c:C.teal}]}/></Card>
      <Card title="Theo ngành"><Rank rows={[{l:'Spa & Beauty',v:2840,c:C.pink},{l:'Nha khoa',v:1920,c:C.blue},{l:'Phòng khám',v:1480,c:C.teal},{l:'Anh ngữ',v:1120,c:C.green}]}/></Card>
      <Card title="Theo khu vực"><Rank rows={[{l:'TP.HCM',v:4820,c:C.blue},{l:'Hà Nội',v:3210,c:C.violet},{l:'Đà Nẵng',v:1140,c:C.teal},{l:'Khác',v:690,c:C.slate}]}/></Card>
      <Card title="Theo hành vi"><Rank rows={[{l:'Mua thường xuyên',v:2410,c:C.green},{l:'Mua 1 lần',v:3680,c:C.blue},{l:'Chỉ hỏi',v:2140,c:C.amber},{l:'Ngủ đông',v:1280,c:C.slate}]}/></Card>
    </div>
  </Page>);
}

/* =================== 8 · AI AGENTS =================== */
function RepAIAgents(){
  return (<Page title="AI Agents" sub="Báo cáo riêng cho AI" list={{title:'Danh sách phiên AI gần đây', cols:[{l:'AI Agent'},{l:'Khách hàng'},{l:'Token',r:true},{l:'Kết quả'}], rows:[['AI CSKH','Chị Lan','420','Tự xử lý'],['AI Sales','Anh Quân','680','Chuyển người'],['AI Marketing','Cô Mai','310','Tự xử lý']]}}>
    <KpiGrid cols={5}>
      <Kpi l="Tổng lượt AI xử lý" v="18.480" sub="+22%" c={C.teal} ic="Sparkles"/>
      <Kpi l="Tỷ lệ tự động hoá" v="63%" sub="+9.3%" c={C.green} ic="Zap"/>
      <Kpi l="Token sử dụng" v="48.200" sub="+14%" c={C.blue} ic="Activity"/>
      <Kpi l="Chi phí AI" v="9,6tr ₫" sub="+11%" c={C.amber} ic="CreditCard"/>
      <Kpi l="Chuyển người thật" v="37%" sub="-9.3%" c={C.violet} ic="Users"/>
    </KpiGrid>
    <Card title="Hiệu quả từng AI Agent"><Tbl cols={[{l:'AI Agent'},{l:'Lượt xử lý',r:true},{l:'Tự động hoá',r:true},{l:'Token',r:true},{l:'Chi phí',r:true}]} rows={[['AI Sales Agent','5.240','58%','14.200','2,8tr ₫'],['AI CSKH Agent','8.420','71%','19.800','4,0tr ₫'],['AI Marketing Agent','3.180','64%','9.600','1,9tr ₫'],['AI Internal Agent','1.640','52%','4.600','0,9tr ₫']]}/></Card>
    <Card title="Token theo ngày"><Bars data={[{label:'T2',v:72},{label:'T3',v:64},{label:'T4',v:88},{label:'T5',v:60},{label:'T6',v:96},{label:'T7',v:48},{label:'CN',v:34}]}/></Card>
  </Page>);
}

/* =================== 9 · AUTOMATION =================== */
function RepAutomation(){
  return (<Page title="Automation & Workflow" sub="Hiệu quả tự động hoá" list={{title:'Danh sách workflow chạy', cols:[{l:'Workflow'},{l:'Trigger'},{l:'Trạng thái'}], rows:[['Chào mừng khách mới','Tin nhắn đến','Thành công'],['Nhắc tái khám','Lịch hẹn','Thành công'],['Win-back 60 ngày','Đơn hàng','Lỗi']]}}>
    <KpiGrid cols={4}>
      <Kpi l="Workflow chạy" v="3.480" sub="+16%" c={C.blue} ic="Workflow"/>
      <Kpi l="Thành công" v="3.286" sub="94,4%" c={C.green} ic="Check"/>
      <Kpi l="Lỗi" v="194" sub="5,6%" c={C.red} ic="AlertTri"/>
      <Kpi l="Trigger kích hoạt" v="12.640" sub="+19%" c={C.violet} ic="Zap"/>
    </KpiGrid>
    <Card title="Theo Workflow"><Tbl cols={[{l:'Workflow'},{l:'Chạy',r:true},{l:'Thành công',r:true},{l:'Lỗi',r:true}]} rows={[['Chào mừng khách mới','1.240','98,2%','22'],['Nhắc tái khám','842','96,1%','33'],['Win-back 60 ngày','486','91,4%','42'],['Phân luồng intent','912','93,2%','62']]}/></Card>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Theo Trigger"><Rank rows={[{l:'Tin nhắn đến',v:6240,c:C.blue},{l:'Lịch hẹn',v:2180,c:C.teal},{l:'Đơn hàng',v:1840,c:C.green},{l:'Ticket',v:1420,c:C.amber}]}/></Card>
      <Card title="Theo AI Agent"><Rank rows={[{l:'AI CSKH',v:1640,c:C.teal},{l:'AI Sales',v:1080,c:C.green},{l:'AI Marketing',v:620,c:C.pink}]}/></Card>
    </div>
  </Page>);
}

/* =================== 10 · TEAM PERFORMANCE =================== */
function RepTeam(){
  return (<Page title="Team Performance" sub="Đánh giá nhân sự" list={{title:'Danh sách nhân viên', cols:[{l:'Nhân viên'},{l:'Phòng ban'},{l:'CSAT',r:true},{l:'Chốt',r:true}], rows:[['Trâm','Kinh doanh','4,8','48'],['Hương','CSKH','4,7','41'],['Minh','Kinh doanh','4,5','34'],['Khoa','Kỹ thuật','4,4','25']]}}>
    <KpiGrid cols={5}>
      <Kpi l="Hội thoại xử lý" v="14.980" sub="+11%" c={C.blue} ic="Chat"/>
      <Kpi l="Ticket xử lý" v="1.286" sub="+9%" c={C.teal} ic="Activity"/>
      <Kpi l="SLA đạt" v="94,2%" sub="+1.8%" c={C.green} ic="Check"/>
      <Kpi l="Điểm CSAT" v="4,6/5" sub="+0.2" c={C.amber} ic="Star"/>
      <Kpi l="Tỷ lệ chốt sale" v="38,3%" sub="+2.4%" c={C.violet} ic="TrendUp"/>
    </KpiGrid>
    <Card title="Bảng xếp hạng cá nhân"><Tbl cols={[{l:'Nhân viên'},{l:'Hội thoại',r:true},{l:'Ticket',r:true},{l:'SLA',r:true},{l:'CSAT',r:true},{l:'Chốt',r:true}]} rows={[['Trâm','482','198','96,8%','4,8','48'],['Hương','421','286','95,1%','4,7','41'],['Minh','388','244','94,2%','4,5','34'],['Khoa','344','312','91,2%','4,4','25'],['Lan Anh','296','164','93,6%','4,6','22']]}/></Card>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <Card title="Theo phòng ban"><Rank rows={[{l:'Kinh doanh',v:96,c:C.green},{l:'CSKH',v:92,c:C.blue},{l:'Kỹ thuật',v:88,c:C.amber}]}/></Card>
      <Card title="Theo chi nhánh"><Rank rows={[{l:'Chi nhánh HN',v:94,c:C.blue},{l:'Chi nhánh HCM',v:91,c:C.violet},{l:'VP Singapore',v:88,c:C.teal}]}/></Card>
    </div>
  </Page>);
}

Object.assign(window, {
  RepExec: ExecDashboard,
  RepConversations, RepTicketsSLA, RepChannels,
  RepMarketing, RepSales, RepCustomers,
  RepAIAgents, RepAutomation, RepTeam,
});
} catch(e){ console.error('reports-v2.jsx', e); }
})();
