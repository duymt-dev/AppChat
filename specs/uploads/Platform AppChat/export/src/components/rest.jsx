// Automation, Files, Reports, Settings modules
const { useState: useStM } = React;

/* ============ AUTOMATION ============ */
function AutomationModule() {
  const { WORKFLOWS, AI_AGENTS } = window.AppData;
  const [tab, setTab] = useStM('agents');
  const [showJourney, setShowJourney] = useStM(false);
  const [showTraining, setShowTraining] = useStM(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {showJourney && window.JourneyBuilder && <window.JourneyBuilder onClose={()=>setShowJourney(false)}/>}
      {showTraining && window.TrainingStudio && <window.TrainingStudio onClose={()=>setShowTraining(false)}/>}
      <div className="topbar">
        <h1>Automation</h1>
        <span className="crumb">Bộ não Intelligence · AI Agent · Workflow · Journey</span>
        <span className="spacer"/>
        <div style={{ display:'flex', background:'var(--fill-03)', padding:3, borderRadius:8, gap:2 }}>
          {[{k:'agents', l:'AI Agents'},{k:'workflows', l:'Workflows'},{k:'routing', l:'Routing rules'}].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{padding:'6px 12px', borderRadius:6, fontSize:13, fontWeight:600,
                background: tab===t.k?'white':'transparent',
                color: tab===t.k?'var(--label-01)':'var(--label-02)',
                boxShadow: tab===t.k?'var(--shadow-sm)':'none'}}>{t.l}</button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={()=>setShowJourney(true)}><Icon.Route/> Journey Builder</button>
        <button className="btn btn-ghost" onClick={()=>setShowTraining(true)}><Icon.Sparkles/> Training Studio</button>
        <button className="btn btn-primary"><Icon.Plus/> Tạo {tab==='agents'?'AI Agent':tab==='workflows'?'Workflow':'Rule'}</button>
      </div>

      {window.__showJourneyFromAutomation && window.JourneyBuilder && <window.JourneyBuilder onClose={()=>{ window.__showJourneyFromAutomation = false; window.dispatchEvent(new Event('journey-close')); }}/>}

      <div className="scroll" style={{ flex:1, padding:'20px 28px', background:'var(--fill-02)' }}>
        {tab === 'agents' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14, marginBottom:20 }}>
              {AI_AGENTS.map(a => (
                <div key={a.id} className="card" style={{ padding:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white' }}>
                      <Icon.Bot/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{a.name}</div>
                      <div style={{ fontSize:12, color:'var(--label-02)' }}>{a.role}</div>
                    </div>
                    <Toggle on={a.status==='on'}/>
                  </div>
                  <div style={{ fontSize:12, color:'var(--label-01)', background:'var(--fill-02)', borderRadius:8, padding:'8px 10px', marginBottom:12, lineHeight:1.5 }}>
                    <i>"{a.persona}"</i>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                    <MiniStat label="Hội thoại" v={a.conv.toLocaleString()}/>
                    <MiniStat label="Resolve" v={a.resolve+'%'}/>
                    <MiniStat label="CSAT" v={a.satisfaction ? a.satisfaction+'★' : '—'}/>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'space-between' }}>
                    <span className="chip outline" style={{fontSize:10.5}}>{a.model}</span>
                    <button className="btn btn-ghost btn-sm"><Icon.Edit/> Cấu hình</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Orchestration diagram */}
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Sơ đồ phối hợp Người × AI</div>
              <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:20 }}>Luồng hội thoại khi khách mới vào — AI xử lý đầu, chuyển người khi cần.</div>
              <div style={{ display:'flex', alignItems:'center', gap:12, overflowX:'auto', paddingBottom:8 }}>
                {[
                  {c:'#EDFAF3', icon:<Icon.Inbox/>, t:'Tin nhắn đến', s:'Từ 12+ kênh'},
                  {c:'#EEF3FB', icon:<Icon.Sparkles/>, t:'AI phân loại', s:'Intent + Sentiment'},
                  {c:'#FFF4E4', icon:<Icon.Layers/>, t:'Phân luồng', s:'Sales / Support / Sourcing'},
                  {c:'#EFEAFA', icon:<Icon.Bot/>, t:'AI trả lời', s:'85% không cần người'},
                  {c:'#FEECE9', icon:<Icon.Users/>, t:'Escalate người', s:'Khi AI confidence < 70%'},
                ].map((n,i,arr) => (
                  <React.Fragment key={i}>
                    <div style={{ flex:1, minWidth:160, background:n.c, borderRadius:12, padding:14, textAlign:'center' }}>
                      <div style={{ width:36, height:36, margin:'0 auto 8px', borderRadius:10, background:'white', display:'grid', placeItems:'center', color:'var(--label-01)' }}>
                        {React.cloneElement(n.icon, {style:{width:18, height:18}})}
                      </div>
                      <div style={{ fontSize:12.5, fontWeight:700 }}>{n.t}</div>
                      <div style={{ fontSize:11, color:'var(--label-02)' }}>{n.s}</div>
                    </div>
                    {i < arr.length-1 && <Icon.ChevronRight style={{width:18, height:18, color:'var(--label-03)', flexShrink:0}}/>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'workflows' && (
          <div>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              {[
                {l:'Workflow đang chạy', v: WORKFLOWS.filter(w=>w.status==='on').length, c:'var(--success)'},
                {l:'Lần trigger hôm nay', v:'13,940', c:'var(--info)'},
                {l:'Tỉ lệ thành công', v:'92.8%', c:'var(--primary)'},
                {l:'Tiết kiệm nhân lực', v:'≈ 48h/ngày', c:'var(--premium)'},
              ].map(k => (
                <div key={k.l} className="card" style={{ flex:1, padding:14 }}>
                  <div style={{ fontSize:12, color:'var(--label-02)' }}>{k.l}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:k.c, marginTop:2 }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div className="card">
              {WORKFLOWS.map((w,i) => (
                <div key={w.id} style={{ display:'grid', gridTemplateColumns:'40px 2fr 1fr 1fr 1fr 1fr 100px', gap:14, padding:'16px', alignItems:'center', borderBottom: i<WORKFLOWS.length-1?'1px solid var(--fill-04)':'none' }}>
                  <Toggle on={w.status==='on'}/>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{w.name}</div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>Cập nhật lần cuối: {w.lastRun}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>Kênh</div>
                    <div style={{ display:'flex', gap:4, marginTop:3 }}>
                      {w.channel.split(',').slice(0,3).map(ch => ch==='all' ? <span key={ch} className="chip outline" style={{height:18, fontSize:10}}>All</span> : <ChannelBadge key={ch} name={ch} size={16}/>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>Triggers</div>
                    <div style={{ fontWeight:700 }}>{w.triggers.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>Success</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ flex:1, height:5, background:'var(--fill-03)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:w.success+'%', height:'100%', background: w.success>90?'var(--success)':w.success>75?'var(--warning)':'var(--error)' }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700 }}>{w.success}%</span>
                    </div>
                  </div>
                  <div>
                    {w.status==='on' ? <span className="chip green">Active</span> : <span className="chip yellow">Paused</span>}
                  </div>
                  <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                    <button className="btn-icon"><Icon.Edit/></button>
                    <button className="btn-icon"><Icon.More/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'routing' && (
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontWeight:700, marginBottom:4, fontSize:15 }}>Quy tắc phân luồng hội thoại</div>
            <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:20 }}>Tin nhắn đến được phân đến đúng người/AI theo điều kiện</div>
            {[
              {c:'Tin nhắn chứa từ "hoàn tiền", "refund", "đổi trả"', a:'→ Support Agent · cc. Hương', p:'Cao'},
              {c:'Khách VIP (LTV > 5M₫) · kênh Zalo', a:'→ Gán trực tiếp Trâm (Sales Lead)', p:'Cao'},
              {c:'Ngôn ngữ EN/CN · ngoài giờ', a:'→ International AI Agent', p:'Trung bình'},
              {c:'Khách mới vào từ livechat web', a:'→ Sales Agent · greeting + qualify', p:'Trung bình'},
              {c:'Mặc định — không match rule nào', a:'→ AI Sales Agent · fallback', p:'Thấp'},
            ].map((r,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:14, borderRadius:10, background: i%2?'var(--fill-02)':'white', border:'1px solid var(--fill-04)', marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--bg-green)', color:'var(--pr-dark-2)', display:'grid', placeItems:'center', fontWeight:800, fontSize:12 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13 }}><b>Nếu</b> {r.c}</div>
                  <div style={{ fontSize:13, color:'var(--primary)' }}>{r.a}</div>
                </div>
                <span className={'chip '+(r.p==='Cao'?'red':r.p==='Trung bình'?'yellow':'outline')}>{r.p}</span>
                <button className="btn-icon"><Icon.Edit/></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Toggle = ({on}) => (
  <div style={{ width:34, height:20, borderRadius:10, background: on ? 'var(--primary)' : 'var(--fill-04)', position:'relative', cursor:'pointer', transition:'background .2s' }}>
    <div style={{ width:16, height:16, borderRadius:8, background:'white', position:'absolute', top:2, left: on?16:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
  </div>
);
const MiniStat = ({label, v}) => (
  <div style={{ background:'var(--fill-02)', borderRadius:8, padding:'6px 8px', textAlign:'center' }}>
    <div style={{ fontSize:10, color:'var(--label-02)' }}>{label}</div>
    <div style={{ fontSize:14, fontWeight:700 }}>{v}</div>
  </div>
);

/* ============ FILES ============ */
function FilesModule() {
  const { FILES } = window.AppData;
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="topbar">
        <h1>Files</h1>
        <span className="crumb">Knowledge Base · AI tự học từ tệp của bạn</span>
        <span className="spacer"/>
        <div className="search-wrap"><Icon.Search/><input className="search" placeholder="Hỏi AI về tệp của bạn…"/></div>
        <button className="btn btn-ghost"><Icon.Folder/> Thư mục mới</button>
        <button className="btn btn-primary"><Icon.Upload/> Upload</button>
      </div>
      <div className="scroll" style={{ flex:1, padding:'20px 28px', background:'var(--fill-02)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20 }}>
          {/* Sidebar */}
          <div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {[
                {i:<Icon.Files/>, l:'Tất cả tệp', n:412, a:true},
                {i:<Icon.Sparkles/>, l:'AI đã học', n:284},
                {i:<Icon.MessageSquare/>, l:'Từ hội thoại', n:186},
                {i:<Icon.Upload/>, l:'Do bạn upload', n:128},
                {i:<Icon.Star/>, l:'Đánh dấu sao', n:24},
                {i:<Icon.Trash/>, l:'Thùng rác', n:8},
              ].map(s => (
                <button key={s.l} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8,
                  background: s.a?'var(--bg-green)':'transparent',
                  color: s.a?'var(--pr-dark-2)':'var(--label-01)', fontWeight:600, fontSize:13, textAlign:'left'
                }}>
                  {React.cloneElement(s.i,{style:{width:16,height:16}})}
                  <span style={{flex:1}}>{s.l}</span>
                  <span style={{fontSize:11, color:'var(--label-03)'}}>{s.n}</span>
                </button>
              ))}
            </div>
            <div className="section-title" style={{marginTop:20, marginBottom:8, padding:'0 12px'}}>Thư mục</div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {['Catalogues', 'Bảng giá', 'Policy & Contracts', 'Ảnh sản phẩm', 'Reports'].map(f => (
                <button key={f} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', borderRadius:8, fontSize:13, textAlign:'left' }}>
                  <Icon.Folder style={{width:14,height:14, color:'var(--label-02)'}}/>
                  {f}
                </button>
              ))}
            </div>
            <div className="card" style={{ marginTop:20, padding:14, background:'linear-gradient(135deg, rgba(45,197,106,.08), rgba(43,158,243,.05))', border:'1px solid rgba(45,197,106,.2)' }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <div style={{width:22,height:22, borderRadius:6, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white'}}><Icon.Sparkles style={{width:14,height:14}}/></div>
                <div style={{ fontWeight:700, fontSize:12.5 }} className="ai-gradient-text">AI Knowledge</div>
              </div>
              <div style={{ fontSize:11.5, color:'var(--label-01)', lineHeight:1.5 }}>
                AI đã học <b>284 tệp</b>. Khi khách hỏi, AI sẽ tự động tra cứu và trả lời.
              </div>
              <button className="btn btn-primary btn-sm" style={{width:'100%', marginTop:10, justifyContent:'center'}}>Train lại kho tri thức</button>
            </div>
          </div>

          {/* File list */}
          <div>
            <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>Tất cả tệp <span style={{color:'var(--label-02)', fontWeight:500}}>· 412 tệp · 4.2 GB</span></div>
              <span style={{flex:1}}/>
              <div style={{display:'flex', borderRadius:6, border:'1px solid var(--fill-04)', overflow:'hidden'}}>
                <button className="btn-icon" style={{borderRadius:0, background:'var(--fill-03)'}}><Icon.List/></button>
                <button className="btn-icon" style={{borderRadius:0}}><Icon.Grid/></button>
              </div>
            </div>
            <div className="card">
              <div style={{ display:'grid', gridTemplateColumns:'40px 3fr 1fr 1fr 1fr 1fr 60px', gap:12, padding:'12px 16px', fontSize:11.5, color:'var(--label-02)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)' }}>
                <div></div><div>Tên</div><div>Size</div><div>Nguồn</div><div>Người tạo</div><div>Ngày</div><div></div>
              </div>
              {FILES.map(f => (
                <div key={f.id} style={{ display:'grid', gridTemplateColumns:'40px 3fr 1fr 1fr 1fr 1fr 60px', gap:12, padding:'12px 16px', fontSize:13, alignItems:'center', borderBottom:'1px solid var(--fill-04)' }}>
                  <div>
                    <FileIcon type={f.type}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:600, marginBottom:2 }}>{f.name}</div>
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      {f.tags.map(t => <span key={t} className="chip outline" style={{height:16, fontSize:10, padding:'0 5px'}}>{t}</span>)}
                      {f.ai && <span className="chip green" style={{height:16, fontSize:10, padding:'0 5px'}}><Icon.Sparkles style={{width:9, height:9}}/> Đã học</span>}
                    </div>
                  </div>
                  <div style={{ color:'var(--label-02)', fontSize:12 }}>{f.size}</div>
                  <div style={{ fontSize:12, color:'var(--label-02)' }}>{f.source}</div>
                  <div style={{ fontSize:12 }}>{f.by}</div>
                  <div style={{ fontSize:12, color:'var(--label-02)' }}>{f.date}</div>
                  <div style={{display:'flex', gap:2, justifyContent:'flex-end'}}>
                    <button className="btn-icon"><Icon.Download/></button>
                    <button className="btn-icon"><Icon.More/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileIcon({type}) {
  const map = {
    pdf: {c:'#FEECE9', tc:'#E94B38', l:'PDF'},
    xlsx: {c:'#EDFAF3', tc:'#1F9C4F', l:'XLS'},
    docx: {c:'#EEF3FB', tc:'#2B6FE0', l:'DOC'},
    pptx: {c:'#FFF4E4', tc:'#E07B00', l:'PPT'},
    md: {c:'#EFEAFA', tc:'#6E48E6', l:'MD'},
    video: {c:'#231F20', tc:'white', l:'MP4'},
    folder: {c:'#FFF4E4', tc:'#E07B00', l:'📁'},
  };
  const m = map[type] || map.pdf;
  return (
    <div style={{ width:30, height:36, borderRadius:5, background:m.c, color:m.tc, display:'grid', placeItems:'center', fontSize:9, fontWeight:800 }}>{m.l}</div>
  );
}

/* ============ REPORTS ============ */
function ReportsModule() {
  const { KPI } = window.AppData;
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="topbar">
        <h1>Reports</h1>
        <span className="crumb">Phân tích vận hành · AI insights</span>
        <span className="spacer"/>
        <button className="btn btn-ghost">7 ngày qua <Icon.ChevronDown/></button>
        <button className="btn btn-ghost"><Icon.Download/> Export</button>
        <button className="btn btn-primary"><Icon.Sparkles/> AI Insights</button>
      </div>
      <div className="scroll" style={{ flex:1, padding:'20px 28px', background:'var(--fill-02)' }}>
        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
          {KPI.map((k,i) => (
            <div key={k.label} className="card" style={{ padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--label-02)', fontSize:12 }}>
                {k.label}
                <span className={'chip '+(k.trend==='up'?'green':'red')} style={{marginLeft:'auto', height:18, fontSize:10}}>
                  {k.trend==='up' ? '▲' : '▼'} {k.delta}
                </span>
              </div>
              <div style={{ fontSize:30, fontWeight:800, color:'var(--label-01)', margin:'4px 0' }}>{k.value}</div>
              <div style={{ fontSize:11, color:'var(--label-03)' }}>{k.sub}</div>
              {/* Sparkline */}
              <svg viewBox="0 0 100 20" style={{ width:'100%', height:28, marginTop:6 }}>
                <polyline fill="none" stroke="var(--primary)" strokeWidth="1.5"
                  points={Array.from({length:20}, (_,j) => `${j*5},${15 - Math.sin(j*0.5+i)*4 - j*0.2}`).join(' ')}/>
              </svg>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:20 }}>
          {/* Chart */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>Hội thoại theo kênh</div>
                <div style={{ fontSize:12, color:'var(--label-02)' }}>Phân bổ 7 ngày gần đây</div>
              </div>
              <span style={{flex:1}}/>
              <div style={{ display:'flex', gap:8, fontSize:11, color:'var(--label-02)' }}>
                <span><span style={{ display:'inline-block', width:8, height:8, background:'var(--primary)', borderRadius:2, marginRight:4 }}/>Zalo</span>
                <span><span style={{ display:'inline-block', width:8, height:8, background:'#1877F2', borderRadius:2, marginRight:4 }}/>Facebook</span>
                <span><span style={{ display:'inline-block', width:8, height:8, background:'#EE4D2D', borderRadius:2, marginRight:4 }}/>Shopee</span>
                <span><span style={{ display:'inline-block', width:8, height:8, background:'#000', borderRadius:2, marginRight:4 }}/>TikTok</span>
                <span><span style={{ display:'inline-block', width:8, height:8, background:'#FF9900', borderRadius:2, marginRight:4 }}/>Amazon</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:220, padding:'0 0 20px' }}>
              {['T2','T3','T4','T5','T6','T7','CN'].map((d,i) => {
                const stack = [
                  {c:'var(--primary)', h:50+Math.sin(i)*10},
                  {c:'#1877F2', h:30+Math.cos(i)*8},
                  {c:'#EE4D2D', h:22+Math.sin(i*2)*5},
                  {c:'#000', h:18+Math.cos(i*2)*4},
                  {c:'#FF9900', h:10+Math.sin(i*3)*3},
                ];
                return (
                  <div key={d} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ display:'flex', flexDirection:'column', width:'100%', borderRadius:'6px 6px 0 0', overflow:'hidden' }}>
                      {stack.map((s,j) => <div key={j} style={{height:s.h+'px', background:s.c, opacity: j===0?1:.85}}/>)}
                    </div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>{d}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI insights */}
          <div className="card" style={{ padding:16, background:'linear-gradient(135deg, rgba(45,197,106,.05), rgba(43,158,243,.04))' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
              <div style={{width:26,height:26, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white'}}><Icon.Sparkles style={{width:14,height:14}}/></div>
              <div style={{ fontWeight:700, fontSize:13 }} className="ai-gradient-text">AI Insights</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                {t:'Zalo là kênh chuyển đổi cao nhất', d:'Tỷ lệ chat-to-buy 12.4%, gấp 2.1× Facebook', c:'var(--success)'},
                {t:'Giờ vàng: 20h–22h', d:'38% hội thoại chốt đơn — nhân sự trực sau 22h đang thiếu', c:'var(--warning)'},
                {t:'AI confidence giảm trên TikTok', d:'74% → đề xuất bổ sung catalogue TikTok', c:'var(--error)'},
                {t:'Khách Etsy hỏi shipping quốc tế nhiều', d:'+420% vs tháng trước — nên làm FAQ tự động', c:'var(--info)'},
              ].map((ins,i) => (
                <div key={i} style={{ background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:10 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <div style={{ width:6, height:6, borderRadius:3, background:ins.c, marginTop:6 }}/>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:700 }}>{ins.t}</div>
                      <div style={{ fontSize:11.5, color:'var(--label-02)', lineHeight:1.5 }}>{ins.d}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Funnel Sourcing → Doanh thu</div>
          <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:20 }}>Hành trình khách từ câu hỏi đầu tiên đến đơn hàng hoàn thành</div>
          <div style={{ display:'flex', gap:0, alignItems:'stretch' }}>
            {[
              {l:'Tin nhắn vào', v:'24,810', pct:100, c:'#BCEDCC'},
              {l:'AI qualify', v:'18,240', pct:73, c:'#8AE0AC'},
              {l:'Có intent mua', v:'9,480', pct:38, c:'#58D28A'},
              {l:'Sourcing / Quote', v:'4,120', pct:17, c:'#2DC56A'},
              {l:'Đơn hàng', v:'2,890', pct:12, c:'#1F9C4F'},
              {l:'Doanh thu', v:'1.24B₫', pct:null, c:'#176E3A'},
            ].map((s,i,a) => (
              <div key={i} style={{ flex:1, padding:'14px 12px', background: s.c, color: i>2?'white':'var(--label-01)', clipPath: i<a.length-1 ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)' : 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)', paddingLeft: i>0 ? 26:14 }}>
                <div style={{ fontSize:11, opacity:.85 }}>{s.l}</div>
                <div style={{ fontSize:20, fontWeight:800 }}>{s.v}</div>
                {s.pct && <div style={{ fontSize:11, opacity:.8 }}>{s.pct}%</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ SETTINGS ============ */
function SettingsModule() {
  const { TEAM, CHANNELS_CONNECTED } = window.AppData;
  const [tab, setTab] = useStM('workspace');
  const tabs = [
    {k:'workspace', l:'Workspace', i:<Icon.Users/>},
    {k:'team', l:'Nhân sự & phân quyền', i:<Icon.Users/>},
    {k:'channels', l:'Kết nối kênh', i:<Icon.Globe/>},
    {k:'ai', l:'AI Governance', i:<Icon.Shield/>},
    {k:'billing', l:'Gói & thanh toán', i:<Icon.Dollar/>},
    {k:'api', l:'API & Webhook', i:<Icon.Key/>},
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="topbar">
        <h1>Settings</h1>
        <span className="crumb">Quản trị workspace & AI governance</span>
        <span className="spacer"/>
      </div>
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <div style={{ width:260, borderRight:'1px solid var(--fill-04)', padding:'16px 12px', background:'white' }}>
          {tabs.map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, fontSize:13, fontWeight:600, textAlign:'left', marginBottom:2,
              background: tab===t.k?'var(--bg-green)':'transparent',
              color: tab===t.k?'var(--pr-dark-2)':'var(--label-01)',
            }}>
              {React.cloneElement(t.i,{style:{width:16,height:16}})}
              {t.l}
            </button>
          ))}
        </div>
        <div className="scroll" style={{ flex:1, padding:'24px 32px', background:'var(--fill-02)' }}>
          {tab === 'workspace' && (
            <div style={{ maxWidth:800 }}>
              <h2 style={{margin:'0 0 4px', fontSize:22}}>Workspace</h2>
              <div style={{ color:'var(--label-02)', fontSize:13, marginBottom:20 }}>Cấu hình chung cho tổ chức của bạn</div>
              <div className="card" style={{ padding:20, marginBottom:16 }}>
                <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                  <div style={{ width:80, height:80, borderRadius:18, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white', fontWeight:800, fontSize:24 }}>MS</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:18, fontWeight:700 }}>MediaSoft Vietnam</div>
                    <div style={{ fontSize:12, color:'var(--label-02)' }}>workspace-id: ms-vn-2026 · mediasoft.vn</div>
                    <div style={{ display:'flex', gap:6, marginTop:8 }}>
                      <span className="chip violet">Ultimate plan</span>
                      <span className="chip green">12/15 seats</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost">Đổi logo</button>
                </div>
              </div>
              <div className="card" style={{ padding:20 }}>
                <Field l="Tên công ty" v="MediaSoft Vietnam Corp."/>
                <Field l="Email quản trị" v="admin@mediasoft.vn"/>
                <Field l="Múi giờ" v="(GMT+7) Asia/Ho_Chi_Minh"/>
                <Field l="Ngôn ngữ mặc định" v="Tiếng Việt + English"/>
                <Field l="Tiền tệ" v="VND (₫)"/>
              </div>
            </div>
          )}

          {tab === 'team' && (
            <div style={{ maxWidth:900 }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
                <div>
                  <h2 style={{margin:'0 0 4px', fontSize:22}}>Nhân sự & phân quyền</h2>
                  <div style={{ color:'var(--label-02)', fontSize:13 }}>12 người dùng · 5 phòng ban</div>
                </div>
                <span style={{flex:1}}/>
                <button className="btn btn-primary"><Icon.Plus/> Mời nhân viên</button>
              </div>
              <div className="card">
                {TEAM.map((m,i) => (
                  <div key={m.email} style={{ display:'grid', gridTemplateColumns:'auto 2fr 1.5fr 1fr 1fr 80px', gap:14, padding:14, alignItems:'center', borderBottom: i<TEAM.length-1?'1px solid var(--fill-04)':'none' }}>
                    <div className="avatar" style={{background:'hsl('+(m.name.length*40)%360+' 55% 48%)'}}>
                      {m.name.split(' ').slice(-1)[0][0]}
                      {m.online && <span style={{position:'absolute', bottom:-2, right:-2, width:10, height:10, borderRadius:5, background:'var(--success)', border:'2px solid white'}}/>}
                    </div>
                    <div>
                      <div style={{fontWeight:600, fontSize:13.5}}>{m.name}</div>
                      <div style={{fontSize:11.5, color:'var(--label-02)'}}>{m.email}</div>
                    </div>
                    <div style={{fontSize:13}}>{m.role}</div>
                    <div><span className="chip outline">{m.dept}</span></div>
                    <div style={{fontSize:12, color:'var(--label-02)'}}>{m.online? 'Online': 'Offline'}</div>
                    <div style={{display:'flex', gap:4, justifyContent:'flex-end'}}>
                      <button className="btn-icon"><Icon.Edit/></button>
                      <button className="btn-icon"><Icon.More/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'channels' && (
            <div style={{ maxWidth:900 }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
                <div>
                  <h2 style={{margin:'0 0 4px', fontSize:22}}>Kết nối kênh bán hàng</h2>
                  <div style={{ color:'var(--label-02)', fontSize:13 }}>Omnichannel · 9 kênh · Đang đồng bộ</div>
                </div>
                <span style={{flex:1}}/>
                <button className="btn btn-primary"><Icon.Plus/> Kết nối kênh mới</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:12 }}>
                {CHANNELS_CONNECTED.map(c => (
                  <div key={c.name} className="card" style={{ padding:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <ChannelBadge name={c.channel} size={32}/>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontWeight:600, fontSize:13.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.name}</div>
                        <div style={{fontSize:11, color:'var(--label-02)'}}>{c.acct}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                      <div>
                        {c.status==='connected' && <span className="chip green"><span className="dot" style={{background:'var(--success)', width:6, height:6, borderRadius:3, display:'inline-block'}}/> Đang hoạt động</span>}
                        {c.status==='error' && <span className="chip red">Lỗi · cần đăng nhập lại</span>}
                        {c.status==='disconnected' && <span className="chip">Chưa kết nối</span>}
                      </div>
                      <div style={{color:'var(--label-02)'}}>{c.msgs} tin</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div style={{ maxWidth:800 }}>
              <h2 style={{margin:'0 0 4px', fontSize:22}}>AI Governance</h2>
              <div style={{ color:'var(--label-02)', fontSize:13, marginBottom:20 }}>Kiểm soát phạm vi và hành vi của AI trong toàn hệ thống</div>
              <div className="card" style={{ padding:18, marginBottom:12 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Phạm vi dữ liệu AI được dùng</div>
                {[
                  {l:'Tin nhắn khách (30 ngày gần nhất)', on:true},
                  {l:'Catalogue & bảng giá nội bộ', on:true},
                  {l:'Chính sách đổi trả / FAQ', on:true},
                  {l:'Hợp đồng & hồ sơ tài chính', on:false},
                  {l:'Dữ liệu nhạy cảm (CCCD, STK)', on:false},
                ].map(r => (
                  <div key={r.l} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--fill-03)' }}>
                    <div style={{flex:1, fontSize:13}}>{r.l}</div>
                    <Toggle on={r.on}/>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:18, marginBottom:12 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Giới hạn hành vi AI</div>
                {[
                  {l:'AI được tự chốt đơn (không cần xác nhận)', on:false, warn:true},
                  {l:'AI được gửi thông tin thanh toán', on:false, warn:true},
                  {l:'AI được escalate lên người khi confidence < 70%', on:true},
                  {l:'Log lại toàn bộ hành vi AI cho audit', on:true},
                ].map(r => (
                  <div key={r.l} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--fill-03)' }}>
                    <div style={{flex:1, fontSize:13}}>
                      {r.l}
                      {r.warn && <span className="chip yellow" style={{marginLeft:8, height:18, fontSize:10}}>⚠ Rủi ro cao</span>}
                    </div>
                    <Toggle on={r.on}/>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:18 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Model & provider</div>
                <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:12 }}>Model AI được dùng trong workspace</div>
                <div style={{display:'flex', gap:10}}>
                  <div style={{ flex:1, padding:12, border:'2px solid var(--primary)', borderRadius:10, background:'var(--bg-green)' }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>Claude Haiku 4.5</div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>Nhanh · Chi phí thấp · Co-pilot</div>
                  </div>
                  <div style={{ flex:1, padding:12, border:'1px solid var(--fill-04)', borderRadius:10 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>Claude Sonnet 4.5</div>
                    <div style={{ fontSize:11, color:'var(--label-02)' }}>Mạnh · Sourcing & reasoning</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div style={{ maxWidth:800 }}>
              <h2 style={{margin:'0 0 4px', fontSize:22}}>Gói & thanh toán</h2>
              <div style={{ color:'var(--label-02)', fontSize:13, marginBottom:20 }}>Ultimate · 12/15 seats · Gia hạn 20/12/2026</div>
              <div className="card" style={{ padding:20, background:'linear-gradient(135deg, #231F20, #374151)', color:'white', marginBottom:16 }}>
                <div style={{ fontSize:12, opacity:.7 }}>GÓI HIỆN TẠI</div>
                <div style={{ fontSize:30, fontWeight:800 }}>AppChat <span className="ai-gradient-text" style={{fontWeight:800}}>Ultimate</span></div>
                <div style={{fontSize:13, opacity:.85, marginBottom:16}}>8 modules · Unlimited channels · AI Agents · Priority support</div>
                <div style={{display:'flex', gap:20, fontSize:13}}>
                  <div><div style={{opacity:.7, fontSize:11}}>SEATS</div><b style={{fontSize:18}}>12 / 15</b></div>
                  <div><div style={{opacity:.7, fontSize:11}}>AI CREDITS</div><b style={{fontSize:18}}>48.2K / 100K</b></div>
                  <div><div style={{opacity:.7, fontSize:11}}>GIÁ / THÁNG</div><b style={{fontSize:18}}>7.500.000₫</b></div>
                </div>
              </div>
              <div className="card" style={{ padding:16 }}>
                <div style={{ fontWeight:700, marginBottom:12 }}>Lịch sử hóa đơn</div>
                {['20/03/2026','20/02/2026','20/01/2026','20/12/2025'].map(d => (
                  <div key={d} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--fill-03)', fontSize:13 }}>
                    <div style={{flex:1}}>Hóa đơn tháng — {d}</div>
                    <div style={{ marginRight:16, color:'var(--label-02)' }}>7.500.000₫</div>
                    <span className="chip green">Đã thanh toán</span>
                    <button className="btn-icon" style={{marginLeft:8}}><Icon.Download/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'api' && (
            <div style={{ maxWidth:800 }}>
              <h2 style={{margin:'0 0 4px', fontSize:22}}>API & Webhook</h2>
              <div style={{ color:'var(--label-02)', fontSize:13, marginBottom:20 }}>Tích hợp AppChat vào hệ thống nội bộ của bạn</div>
              <div className="card" style={{ padding:18, marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700 }}>API Keys</div>
                  <span style={{flex:1}}/>
                  <button className="btn btn-primary btn-sm"><Icon.Plus/> Tạo key mới</button>
                </div>
                {[
                  {n:'Production key', k:'ac_live_sk_••••7F2A', date:'Tạo 12/03/2026'},
                  {n:'Staging key', k:'ac_test_sk_••••91DC', date:'Tạo 05/01/2026'},
                ].map(k => (
                  <div key={k.n} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--fill-03)', gap:12 }}>
                    <Icon.Key style={{width:18,height:18, color:'var(--label-02)'}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13, fontWeight:600}}>{k.n}</div>
                      <div style={{fontSize:11, color:'var(--label-02)', fontFamily:'monospace'}}>{k.k} · {k.date}</div>
                    </div>
                    <button className="btn-icon"><Icon.Copy/></button>
                    <button className="btn-icon"><Icon.Trash/></button>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:18 }}>
                <div style={{ fontWeight:700, marginBottom:4 }}>Webhook endpoints</div>
                <div style={{ fontSize:12, color:'var(--label-02)', marginBottom:12 }}>Nhận sự kiện real-time khi có tin nhắn mới / đơn hàng mới</div>
                <div style={{ padding:12, background:'var(--fill-06)', color:'#8AE0AC', borderRadius:8, fontFamily:'monospace', fontSize:12 }}>
                  POST https://api.mediasoft.vn/webhooks/appchat<br/>
                  <span style={{color:'#58D28A'}}>  message.received · order.created · ticket.updated</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const Field = ({l, v}) => (
  <div style={{ display:'flex', padding:'10px 0', borderBottom:'1px solid var(--fill-03)', fontSize:13, alignItems:'center' }}>
    <div style={{ width:160, color:'var(--label-02)' }}>{l}</div>
    <div style={{ flex:1, fontWeight:600 }}>{v}</div>
    <button className="btn btn-ghost btn-sm">Sửa</button>
  </div>
);

window.AutomationModule = AutomationModule;
window.FilesModule = FilesModule;
window.ReportsModule = ReportsModule;
window.SettingsModule = SettingsModule;
