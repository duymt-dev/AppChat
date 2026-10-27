/* ===== call-center.jsx — Call Center module + Tổng đài settings =====
 * 1) CallCenterModule  — thống kê gọi vào/ra, AI Voice, agent board, nghe lại
 * 2) CallCenterSettings — cấu hình tổng đài kiểu StringeeX (hotline, IVR,
 *    hàng đợi, máy nhánh, gọi ra, ghi âm/giám sát, SIP trunk)
 * =================================================================== */
;(function(){
try {
const { useState: useCC2 } = React;
const IcCC = (n,p)=>{ const C = window.Icon && window.Icon[n]; return C ? <C {...p}/> : null; };

/* ───────── shared bits ───────── */
const ccCard = {background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:16};
const ccChip = (bg,fg)=>({display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700, background:bg, color:fg, whiteSpace:'nowrap'});
const ccBtn  = {height:32, padding:'0 12px', borderRadius:8, border:'1px solid var(--fill-04)', background:'white', fontSize:12, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap'};

function CCToggle({on}) {
  const [v,setV]=useCC2(on);
  return (
    <button onClick={()=>setV(!v)} style={{width:34, height:20, borderRadius:10, padding:2, border:'none', background:v?'var(--primary)':'var(--fill-05)', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0}}>
      <div style={{width:16, height:16, borderRadius:8, background:'white', transform:v?'translateX(14px)':'none', transition:'transform .2s', boxShadow:'0 1px 2px rgba(0,0,0,.2)'}}/>
    </button>
  );
}

/* ═══════════════ 1 · CALL CENTER MODULE ═══════════════ */

const CC_KPI = [
  {l:'Tổng cuộc gọi', v:'1.248', d:'+8.4%', up:true},
  {l:'Gọi vào',       v:'736',   d:'+12%',  up:true},
  {l:'Gọi ra',        v:'512',   d:'+3.1%', up:true},
  {l:'Gọi nhỡ',       v:'42',    d:'3.4%',  warn:true},
  {l:'Thời lượng TB', v:'3m 12s', d:'-18s', up:true},
  {l:'AI Voice tự xử', v:'38%',  d:'+6pp',  ai:true},
];

const CC_AGENTS = [
  {ext:'101', n:'Trâm',  st:'oncall', note:'Đang gọi · 02:14', c:'#2DC56A'},
  {ext:'102', n:'Minh',  st:'ready',  note:'Sẵn sàng', c:'#2B9EF3'},
  {ext:'103', n:'Hương', st:'busy',   note:'Sau cuộc gọi (ACW)', c:'#F5A830'},
  {ext:'104', n:'Khoa',  st:'away',   note:'Nghỉ trưa', c:'#9CA3AF'},
  {ext:'900', n:'AI Voice Agent', st:'oncall', note:'3 cuộc đang xử lý', c:'#6E48E6', ai:true},
];

const CC_CALLS = [
  {id:1, dir:'in',  name:'Chị Lan · Shop Bé Na', num:'0987 123 421', agent:'Trâm · 101', line:'1900 1234', time:'10:42', dur:'4:18', st:'done', ai:false, sum:'Khách xác nhận lịch demo thứ 6, hỏi thêm về giá gói Enterprise.', sent:'Tích cực'},
  {id:2, dir:'out', name:'Anh Hiếu · MomBaby',  num:'0902 334 571', agent:'Minh · 102', line:'028 7300 5588', time:'10:15', dur:'2:51', st:'done', ai:false, sum:'Gọi nhắc thanh toán đơn #SP290411 — khách hẹn chuyển khoản chiều nay.', sent:'Trung lập'},
  {id:3, dir:'in',  name:'0912 448 773',         num:'0912 448 773', agent:'AI Voice · 900', line:'1900 1234', time:'09:58', dur:'1:47', st:'ai', ai:true, sum:'AI tiếp nhận: khách hỏi giờ làm việc & địa chỉ — đã trả lời tự động, không cần chuyển người.', sent:'Tích cực'},
  {id:4, dir:'in',  name:'Chị Hạnh · MomBaby VN', num:'0903 552 221', agent:'—', line:'1900 1234', time:'09:31', dur:'—', st:'missed', ai:false, sum:'Gọi nhỡ trong giờ cao điểm — đã tự tạo task gọi lại cho Trâm.', sent:'—'},
  {id:5, dir:'out', name:'Anh Quân · An Khang',  num:'0912 448 773', agent:'Trâm · 101', line:'028 7300 5588', time:'09:12', dur:'6:02', st:'done', ai:false, sum:'Tư vấn triển khai: khách cần báo giá 50 user + tích hợp MISA.', sent:'Tích cực'},
  {id:6, dir:'in',  name:'0938 221 904',          num:'0938 221 904', agent:'Voicemail', line:'1900 1234', time:'08:47', dur:'0:38', st:'vm', ai:false, sum:'Voicemail ngoài giờ: khách cần đổi lịch hẹn sang tuần sau.', sent:'Trung lập'},
];

const CC_ST = {
  done:   {l:'Hoàn tất',  bg:'var(--bg-green)', fg:'var(--pr-dark-2)'},
  missed: {l:'Gọi nhỡ',   bg:'#FDECEA', fg:'#A63322'},
  ai:     {l:'AI xử lý',  bg:'#F6F2FF', fg:'#6E48E6'},
  vm:     {l:'Voicemail', bg:'#FFF4E4', fg:'#8A5A10'},
};

function CCDirIcon({dir, st}) {
  const missed = st==='missed';
  const color = missed ? '#E33F3F' : dir==='in' ? 'var(--primary)' : 'var(--info)';
  const bg = missed ? '#FDECEA' : dir==='in' ? 'var(--bg-green)' : 'var(--bg-blue)';
  return (
    <span style={{width:28, height:28, borderRadius:8, background:bg, color, display:'grid', placeItems:'center', flexShrink:0}}>
      {IcCC(dir==='in'?'ArrowDown':'ArrowUp',{width:13, height:13, style:{transform:'rotate(45deg)'}})}
    </span>
  );
}

function CCVolumeChart() {
  const hours=[8,9,10,11,12,13,14,15,16,17,18,19,20];
  const inb =[18,42,56,48,22,16,38,52,61,58,44,30,12];
  const outb=[10,26,38,34,12,8, 30,42,38,33,26,14,6];
  const max=70;
  return (
    <div style={{...ccCard, flex:1, minWidth:0}}>
      <div style={{display:'flex', alignItems:'center', marginBottom:14}}>
        <div>
          <div style={{fontWeight:700, fontSize:14}}>Cuộc gọi theo giờ</div>
          <div style={{fontSize:11.5, color:'var(--label-02)'}}>Hôm nay · 1.248 cuộc</div>
        </div>
        <span style={{flex:1}}/>
        <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--label-02)', marginRight:12}}><span style={{width:9, height:9, borderRadius:2, background:'var(--primary)'}}/> Gọi vào</span>
        <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--label-02)'}}><span style={{width:9, height:9, borderRadius:2, background:'var(--info)'}}/> Gọi ra</span>
      </div>
      <div style={{display:'flex', alignItems:'flex-end', gap:6, height:150}}>
        {hours.map((h,i)=>(
          <div key={h} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:0}}>
            <div style={{display:'flex', gap:2, alignItems:'flex-end', height:124, width:'100%', justifyContent:'center'}}>
              <div title={`Vào: ${inb[i]}`} style={{width:'38%', maxWidth:13, height:(inb[i]/max*124)+'px', borderRadius:'3px 3px 0 0', background:'var(--primary)'}}/>
              <div title={`Ra: ${outb[i]}`} style={{width:'38%', maxWidth:13, height:(outb[i]/max*124)+'px', borderRadius:'3px 3px 0 0', background:'var(--info)', opacity:.85}}/>
            </div>
            <div style={{fontSize:9.5, color:'var(--label-03)'}}>{h}h</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CCAgentBoard() {
  return (
    <div style={{...ccCard, width:320, flexShrink:0}}>
      <div style={{display:'flex', alignItems:'center', marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:14}}>Trạng thái máy nhánh</div>
        <span style={{flex:1}}/>
        <span style={ccChip('var(--bg-green)','var(--pr-dark-2)')}>● 2 đang chờ trong hàng đợi</span>
      </div>
      {CC_AGENTS.map(a=>(
        <div key={a.ext} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--fill-03)'}}>
          <div style={{position:'relative', flexShrink:0}}>
            <div style={{width:32, height:32, borderRadius:'50%', background:a.ai?'#6E48E6':'var(--pr-dark-1)', color:'white', display:'grid', placeItems:'center', fontWeight:700, fontSize:12}}>{a.ai?'AI':a.n[0]}</div>
            <span style={{position:'absolute', right:-1, bottom:-1, width:10, height:10, borderRadius:'50%', background:a.c, border:'2px solid white'}}/>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:12.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{a.n} <span style={{color:'var(--label-03)', fontWeight:600}}>· {a.ext}</span></div>
            <div style={{fontSize:11, color:a.c, fontWeight:600, whiteSpace:'nowrap'}}>{a.note}</div>
          </div>
          <button className="btn-icon" title="Nghe xen / giám sát" style={{width:26, height:26}}>{IcCC('Eye',{width:13, height:13})}</button>
        </div>
      ))}
      <button style={{...ccBtn, width:'100%', justifyContent:'center', marginTop:10}}>{IcCC('Settings',{width:13, height:13})} Cấu hình tổng đài</button>
    </div>
  );
}

function CCPlayer({call}) {
  const [playing, setPlaying] = useCC2(false);
  const bars = [4,9,14,8,16,11,6,13,18,10,7,15,9,5,12,17,8,11,14,6,10,16,7,12,9,13,5,11,15,8];
  return (
    <div style={{gridColumn:'1 / -1', background:'var(--fill-02)', border:'1px solid var(--fill-03)', borderRadius:10, padding:'12px 14px', marginTop:4}}>
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
        <button onClick={()=>setPlaying(p=>!p)} style={{width:36, height:36, borderRadius:'50%', border:'none', background:'var(--primary)', color:'white', display:'grid', placeItems:'center', cursor:'pointer', flexShrink:0}}>
          {IcCC(playing?'Pause':'Play',{width:15, height:15})}
        </button>
        <div style={{display:'flex', alignItems:'center', gap:2, flex:1, height:36}}>
          {bars.map((b,i)=>(<div key={i} style={{flex:1, height:b*2, maxWidth:6, borderRadius:2, background: i < (playing?18:7) ? 'var(--primary)' : 'var(--fill-04)'}}/>))}
        </div>
        <span style={{fontSize:11.5, color:'var(--label-02)', fontWeight:600, whiteSpace:'nowrap'}}>{playing?'1:32':'0:00'} / {call.dur}</span>
        <button style={{...ccBtn, height:28, padding:'0 9px', fontSize:11}}>1.5×</button>
        <button className="btn-icon" title="Tải file ghi âm" style={{width:28, height:28}}>{IcCC('Download',{width:13, height:13})}</button>
      </div>
      <div style={{display:'flex', gap:10, alignItems:'flex-start'}}>
        <span style={{width:20, height:20, borderRadius:6, background:'linear-gradient(135deg, var(--primary), #6E48E6)', display:'grid', placeItems:'center', color:'white', flexShrink:0}}>{IcCC('Sparkles',{width:11, height:11})}</span>
        <div style={{fontSize:12.5, lineHeight:1.5, flex:1}}>
          <b>AI tóm tắt:</b> {call.sum}
          <span style={{marginLeft:8, ...ccChip('var(--bg-green)','var(--pr-dark-2)')}}>Sentiment: {call.sent}</span>
        </div>
        <button style={{...ccBtn, height:28, fontSize:11.5, flexShrink:0}}>{IcCC('FileText',{width:12, height:12})} Transcript đầy đủ</button>
      </div>
    </div>
  );
}

function CallCenterModule() {
  const [tab, setTab] = useCC2('all');
  const [openId, setOpenId] = useCC2(1);
  const tabs = [
    {k:'all', l:'Tất cả', n:CC_CALLS.length},
    {k:'in', l:'Gọi vào', n:CC_CALLS.filter(c=>c.dir==='in'&&c.st!=='missed'&&c.st!=='vm').length},
    {k:'out', l:'Gọi ra', n:CC_CALLS.filter(c=>c.dir==='out').length},
    {k:'missed', l:'Gọi nhỡ', n:CC_CALLS.filter(c=>c.st==='missed').length},
    {k:'vm', l:'Voicemail', n:CC_CALLS.filter(c=>c.st==='vm').length},
    {k:'ai', l:'AI Voice', n:CC_CALLS.filter(c=>c.ai).length},
  ];
  const list = CC_CALLS.filter(c =>
    tab==='all' || (tab==='in' && c.dir==='in' && c.st!=='missed' && c.st!=='vm') || (tab==='out' && c.dir==='out')
    || (tab==='missed' && c.st==='missed') || (tab==='vm' && c.st==='vm') || (tab==='ai' && c.ai));
  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', minHeight:0}}>
      <div className="topbar">
        <h1>Call Center</h1>
        <span className="crumb">Tổng đài · Voice AI · Ghi âm cuộc gọi</span>
        <span className="spacer"/>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:8, gap:2}}>
          {['Hôm nay','7 ngày','30 ngày'].map((r,i)=>(
            <button key={r} style={{padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', whiteSpace:'nowrap', background:i===0?'white':'transparent', color:i===0?'var(--label-01)':'var(--label-02)', boxShadow:i===0?'var(--shadow-sm)':'none'}}>{r}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm">{IcCC('Download',{width:14, height:14})} Export</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>window.dispatchEvent(new CustomEvent('webphone:incoming',{detail:{name:'Chị Lan · Shop Bé Na', num:'0987 123 421'}}))}>{IcCC('ArrowDown',{width:14, height:14, style:{transform:'rotate(45deg)'}})} Cuộc gọi đến (demo)</button>
        <button className="btn btn-primary btn-sm" onClick={()=>window.dispatchEvent(new CustomEvent('webphone:dial',{detail:{}}))}>{IcCC('Phone',{width:14, height:14})} Gọi đi</button>
      </div>

      <div className="scroll" style={{flex:1, overflowY:'auto', padding:20, background:'var(--fill-02)'}}>
        {/* KPI */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:10, marginBottom:14}}>
          {CC_KPI.map(k=>(
            <div key={k.l} style={{...ccCard, padding:'12px 14px'}}>
              <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600, whiteSpace:'nowrap'}}>{k.l}</div>
              <div style={{fontSize:21, fontWeight:800, margin:'2px 0', color:k.ai?'#6E48E6':'var(--label-01)'}}>{k.v}</div>
              <div style={{fontSize:10.5, fontWeight:700, whiteSpace:'nowrap', color: k.warn?'#A63322': k.up?'var(--pr-dark-1)':'var(--label-03)'}}>{k.d}{k.warn?' tỉ lệ nhỡ':''}</div>
            </div>
          ))}
        </div>

        {/* Chart + agent board */}
        <div style={{display:'flex', gap:12, marginBottom:14}}>
          <CCVolumeChart/>
          <CCAgentBoard/>
        </div>

        {/* Call log */}
        <div style={{...ccCard, padding:0, overflow:'hidden'}}>
          <div style={{display:'flex', alignItems:'center', gap:4, padding:'12px 16px', borderBottom:'1px solid var(--fill-04)'}}>
            <div style={{fontWeight:700, fontSize:14, marginRight:10, whiteSpace:'nowrap'}}>Nhật ký cuộc gọi</div>
            {tabs.map(t=>(
              <button key={t.k} onClick={()=>{setTab(t.k); setOpenId(null);}} style={{
                padding:'5px 11px', borderRadius:16, fontSize:11.5, fontWeight:600, border:'1px solid '+(tab===t.k?'transparent':'var(--fill-04)'),
                background: tab===t.k?'var(--label-01)':'white', color: tab===t.k?'white':'var(--label-02)', cursor:'pointer', whiteSpace:'nowrap'
              }}>{t.l} · {t.n}</button>
            ))}
            <span style={{flex:1}}/>
            <span style={{fontSize:11.5, color:'var(--label-03)', whiteSpace:'nowrap'}}>Ghi âm lưu 12 tháng</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'34px 1.6fr 1.1fr 1fr 70px 70px 96px 86px', gap:10, padding:'9px 16px', fontSize:10.5, fontWeight:700, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--label-03)', borderBottom:'1px solid var(--fill-03)', background:'var(--fill-02)'}}>
            <span/><span>Khách / Số</span><span>Agent · Máy nhánh</span><span>Số tổng đài</span><span>Giờ</span><span>Dài</span><span>Trạng thái</span><span style={{textAlign:'right'}}>Ghi âm</span>
          </div>
          {list.map(c=>{
            const st=CC_ST[c.st];
            return (
            <div key={c.id} style={{display:'grid', gridTemplateColumns:'34px 1.6fr 1.1fr 1fr 70px 70px 96px 86px', gap:10, padding:'11px 16px', alignItems:'center', borderBottom:'1px solid var(--fill-03)', fontSize:12.5, background: openId===c.id?'var(--bg-green)':'white'}}>
              <CCDirIcon dir={c.dir} st={c.st}/>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.name}</div>
                <div style={{fontSize:11, color:'var(--label-03)', whiteSpace:'nowrap'}}>{c.num}</div>
              </div>
              <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color: c.ai?'#6E48E6':'var(--label-01)', fontWeight:c.ai?700:500}}>{c.agent}</span>
              <span style={{whiteSpace:'nowrap', color:'var(--label-02)'}}>{c.line}</span>
              <span style={{color:'var(--label-02)'}}>{c.time}</span>
              <span style={{fontWeight:600}}>{c.dur}</span>
              <span style={ccChip(st.bg, st.fg)}>{st.l}</span>
              <span style={{textAlign:'right'}}>
                {c.st!=='missed'
                  ? <button onClick={()=>setOpenId(openId===c.id?null:c.id)} style={{...ccBtn, height:28, fontSize:11.5, borderColor: openId===c.id?'var(--primary)':'var(--fill-04)', color: openId===c.id?'var(--pr-dark-2)':'var(--label-01)'}}>{IcCC(openId===c.id?'ChevronDown':'Play',{width:11, height:11})} Nghe lại</button>
                  : <button onClick={()=>window.dispatchEvent(new CustomEvent('webphone:dial',{detail:{num:c.num, name:c.name}}))} style={{...ccBtn, height:28, fontSize:11.5}}>{IcCC('Phone',{width:11, height:11})} Gọi lại</button>}
              </span>
              {openId===c.id && c.st!=='missed' && <CCPlayer call={c}/>}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ 2 · TỔNG ĐÀI SETTINGS (StringeeX-style) ═══════════════ */

function CCSection({title, sub, children, right}) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:'flex', alignItems:'flex-end', marginBottom:10}}>
        <div>
          <div style={{fontSize:15, fontWeight:700, whiteSpace:'nowrap'}}>{title}</div>
          {sub && <div style={{fontSize:12, color:'var(--label-02)', marginTop:2}}>{sub}</div>}
        </div>
        <span style={{flex:1}}/>{right}
      </div>
      <div style={ccCard}>{children}</div>
    </div>
  );
}
const ccRowS = {display:'flex', alignItems:'center', gap:14, padding:'11px 0', borderBottom:'1px solid var(--fill-03)', fontSize:13};

function CallCenterSettings() {
  return (
    <div>
      {/* 1 · Số tổng đài */}
      <CCSection title="Số tổng đài (Hotline)" sub="Số gọi vào / hiển thị khi gọi ra — đấu nối qua nhà mạng hoặc SIP trunk"
        right={<button className="btn btn-primary btn-sm">{IcCC('Plus',{width:13, height:13})} Thêm số</button>}>
        {[
          {num:'1900 1234', telco:'Viettel', type:'Hotline 1900 · 20 kênh thoại', def:'Gọi vào mặc định', on:true},
          {num:'028 7300 5588', telco:'VNPT', type:'Số cố định · 10 kênh thoại', def:'Caller ID gọi ra', on:true},
          {num:'0877 088 088', telco:'iTel', type:'Di động · SIM box', def:'Backup', on:false},
        ].map(s=>(
          <div key={s.num} style={ccRowS}>
            <span style={{width:30, height:30, borderRadius:8, background:'var(--bg-green)', color:'var(--pr-dark-1)', display:'grid', placeItems:'center', flexShrink:0}}>{IcCC('Phone',{width:14, height:14})}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, whiteSpace:'nowrap'}}>{s.num} <span style={{fontWeight:600, color:'var(--label-03)', fontSize:11.5}}>· {s.telco}</span></div>
              <div style={{fontSize:11.5, color:'var(--label-02)', whiteSpace:'nowrap'}}>{s.type}</div>
            </div>
            <span style={ccChip('var(--fill-03)','var(--label-02)')}>{s.def}</span>
            <span style={ccChip(s.on?'var(--bg-green)':'#FDECEA', s.on?'var(--pr-dark-2)':'#A63322')}>● {s.on?'Hoạt động':'Tạm tắt'}</span>
            <CCToggle on={s.on}/>
          </div>
        ))}
      </CCSection>

      {/* 2 · Định tuyến gọi vào (IVR) */}
      <CCSection title="Định tuyến gọi vào (IVR)" sub="Kịch bản trả lời tự động khi khách gọi tới"
        right={<button className="btn btn-ghost btn-sm">{IcCC('Play',{width:12, height:12})} Nghe thử kịch bản</button>}>
        <div style={ccRowS}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600}}>Lời chào (greeting)</div>
            <div style={{fontSize:11.5, color:'var(--label-02)'}}>loichao-appchat-2026.mp3 · 12s · "Cảm ơn quý khách đã gọi tới AppChat…"</div>
          </div>
          <button style={{...ccBtn, height:28}}>{IcCC('Play',{width:11, height:11})} Nghe</button>
          <button style={{...ccBtn, height:28}}>{IcCC('Upload',{width:11, height:11})} Thay file</button>
        </div>
        <div style={ccRowS}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600}}>AI Voice Agent trả lời trước</div>
            <div style={{fontSize:11.5, color:'var(--label-02)'}}>AI nghe máy, tự xử lý câu hỏi thường gặp — chuyển người khi cần (deflect 38%)</div>
          </div>
          <span style={ccChip('#F6F2FF','#6E48E6')}>AI VOICE</span>
          <CCToggle on={true}/>
        </div>
        <div style={{padding:'12px 0 4px'}}>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)', textTransform:'uppercase', marginBottom:8}}>Menu phím bấm</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {[
              {key:'1', to:'Hàng đợi Sales', sub:'4 agent · round-robin'},
              {key:'2', to:'Hàng đợi CSKH', sub:'3 agent · đổ chuông tất cả'},
              {key:'3', to:'Kỹ thuật / Bảo hành', sub:'2 agent'},
              {key:'0', to:'Gặp tổng đài viên', sub:'bất kỳ agent rảnh'},
            ].map(m=>(
              <div key={m.key} style={{display:'flex', alignItems:'center', gap:10, border:'1px solid var(--fill-04)', borderRadius:9, padding:'9px 11px'}}>
                <span style={{width:26, height:26, borderRadius:7, background:'var(--label-01)', color:'white', display:'grid', placeItems:'center', fontWeight:800, fontSize:13, flexShrink:0}}>{m.key}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:700, whiteSpace:'nowrap'}}>{m.to}</div>
                  <div style={{fontSize:11, color:'var(--label-03)', whiteSpace:'nowrap'}}>{m.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CCSection>

      {/* 3 · Hàng đợi & nhóm nhận */}
      <CCSection title="Hàng đợi & nhóm nhận cuộc gọi" sub="Chiến lược phân phối cuộc gọi cho agent"
        right={<button className="btn btn-primary btn-sm">{IcCC('Plus',{width:13, height:13})} Tạo hàng đợi</button>}>
        {[
          {n:'Sales', agents:'Trâm · Minh · Khoa · +1', strat:'Round-robin', wait:'Tối đa chờ 120s', sla:'SLA 20s · 92%'},
          {n:'CSKH', agents:'Hương · Vy · Long', strat:'Đổ chuông tất cả', wait:'Tối đa chờ 90s', sla:'SLA 15s · 88%'},
        ].map(q=>(
          <div key={q.n} style={ccRowS}>
            <span style={{width:30, height:30, borderRadius:8, background:'var(--bg-blue)', color:'#1a5caf', display:'grid', placeItems:'center', flexShrink:0}}>{IcCC('Users',{width:14, height:14})}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700}}>{q.n}</div>
              <div style={{fontSize:11.5, color:'var(--label-02)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{q.agents}</div>
            </div>
            <span style={ccChip('var(--fill-03)','var(--label-02)')}>{q.strat}</span>
            <span style={ccChip('var(--fill-03)','var(--label-02)')}>{q.wait}</span>
            <span style={ccChip('var(--bg-green)','var(--pr-dark-2)')}>{q.sla}</span>
            <button style={{...ccBtn, height:28}}>Sửa</button>
          </div>
        ))}
        <div style={{...ccRowS, borderBottom:'none'}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600}}>Ngoài giờ làm việc</div>
            <div style={{fontSize:11.5, color:'var(--label-02)'}}>Phát lời chào ngoài giờ → ghi voicemail → tự tạo task gọi lại sáng hôm sau</div>
          </div>
          <CCToggle on={true}/>
        </div>
      </CCSection>

      {/* 4 · Gọi ra */}
      <CCSection title="Gọi ra (Outbound)" sub="Quy tắc hiển thị số & quay số cho từng đội">
        <div style={ccRowS}>
          <div style={{flex:1}}><div style={{fontWeight:600}}>Caller ID theo đội</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Sales → 1900 1234 · CSKH → 028 7300 5588</div></div>
          <button style={{...ccBtn, height:28}}>Cấu hình</button>
        </div>
        <div style={ccRowS}>
          <div style={{flex:1}}><div style={{fontWeight:600}}>Click-to-call từ hồ sơ khách</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Bấm số điện thoại trong Customers / Hồ sơ 360° để gọi ngay qua web phone</div></div>
          <CCToggle on={true}/>
        </div>
        <div style={{...ccRowS, borderBottom:'none'}}>
          <div style={{flex:1}}><div style={{fontWeight:600}}>Auto-dialer chiến dịch gọi ra</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Quay số tự động theo danh sách segment từ Marketing</div></div>
          <span style={ccChip('#FFF4E4','#8A5A10')}>PRO</span>
          <CCToggle on={false}/>
        </div>
      </CCSection>

      {/* 5 · Máy nhánh & thiết bị */}
      <CCSection title="Máy nhánh & thiết bị (Extension)" sub="Gán số máy lẻ cho từng agent"
        right={<button className="btn btn-primary btn-sm">{IcCC('Plus',{width:13, height:13})} Thêm máy nhánh</button>}>
        {[
          {ext:'101', n:'Trâm', dev:'Web phone (trình duyệt)', on:true},
          {ext:'102', n:'Minh', dev:'IP Phone · Yealink T31G', on:true},
          {ext:'103', n:'Hương', dev:'Mobile app (iOS)', on:true},
          {ext:'900', n:'AI Voice Agent', dev:'Claude Voice · tự động', on:true, ai:true},
        ].map(e=>(
          <div key={e.ext} style={ccRowS}>
            <span style={{width:34, height:26, borderRadius:7, background:e.ai?'#F6F2FF':'var(--fill-03)', color:e.ai?'#6E48E6':'var(--label-01)', display:'grid', placeItems:'center', fontWeight:800, fontSize:12, flexShrink:0}}>{e.ext}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, whiteSpace:'nowrap'}}>{e.n}</div>
              <div style={{fontSize:11.5, color:'var(--label-02)', whiteSpace:'nowrap'}}>{e.dev}</div>
            </div>
            <span style={ccChip(e.on?'var(--bg-green)':'var(--fill-03)', e.on?'var(--pr-dark-2)':'var(--label-03)')}>● Online</span>
            <button style={{...ccBtn, height:28}}>Sửa</button>
          </div>
        ))}
      </CCSection>

      {/* 6 · Ghi âm & giám sát */}
      <CCSection title="Ghi âm & giám sát" sub="Tuân thủ: thông báo ghi âm tự động phát đầu cuộc gọi">
        <div style={ccRowS}>
          <div style={{flex:1}}><div style={{fontWeight:600}}>Ghi âm 100% cuộc gọi</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Lưu trữ 12 tháng · chỉ Admin & Manager được nghe</div></div>
          <CCToggle on={true}/>
        </div>
        <div style={ccRowS}>
          <div style={{flex:1}}><div style={{fontWeight:600}}>AI transcript & tóm tắt sau cuộc gọi</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Tự chuyển giọng nói → văn bản, chấm sentiment, đính vào hồ sơ khách</div></div>
          <span style={ccChip('#F6F2FF','#6E48E6')}>AI</span>
          <CCToggle on={true}/>
        </div>
        <div style={{...ccRowS, borderBottom:'none'}}>
          <div style={{flex:1}}><div style={{fontWeight:600}}>Giám sát realtime</div><div style={{fontSize:11.5, color:'var(--label-02)'}}>Nghe xen (monitor) · Nhắc thì thầm (whisper) · Cướp cuộc gọi (barge-in) — dành cho Manager</div></div>
          <CCToggle on={true}/>
        </div>
      </CCSection>

      {/* 7 · SIP Trunk */}
      <CCSection title="SIP Trunk / Kết nối nhà mạng" sub="Thông số kỹ thuật đấu nối tổng đài">
        {[
          ['SIP host', 'sip.appchat-pbx.vn:5060'],
          ['Trạng thái', '● Đã kết nối · ping 12ms'],
          ['Codec', 'G.711A · G.729'],
          ['Kênh thoại đồng thời', '30 / 50 đang dùng'],
        ].map(([k,v],i,arr)=>(
          <div key={k} style={{...ccRowS, borderBottom: i<arr.length-1?'1px solid var(--fill-03)':'none'}}>
            <span style={{width:170, color:'var(--label-02)', flexShrink:0}}>{k}</span>
            <span style={{fontWeight:600, fontFamily: k==='SIP host'?'ui-monospace, monospace':'inherit', fontSize: k==='SIP host'?12:13, color: k==='Trạng thái'?'var(--pr-dark-1)':'var(--label-01)'}}>{v}</span>
          </div>
        ))}
      </CCSection>
    </div>
  );
}

window.CallCenterModule = CallCenterModule;
window.CallCenterSettings = CallCenterSettings;
} catch(e) { console.error('call-center.jsx', e); }
})();
