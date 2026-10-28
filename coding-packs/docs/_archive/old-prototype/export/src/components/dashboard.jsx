/* Dashboard — respond.io style */
const { useState: useDs } = React;

function DashboardModule() {
  const D = window.AppData.DASHBOARD_STATS;
  const [range, setRange] = useDs('today');
  const [builderOpen, setBuilderOpen] = useDs(false);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Dashboard</h1>
        <span className="crumb">Tổng quan workspace · thời gian thực</span>
        <span className="spacer"/>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:8, gap:2}}>
          {[{k:'today',l:'Hôm nay'},{k:'week',l:'7 ngày'},{k:'month',l:'30 ngày'},{k:'quarter',l:'Quý'}].map(r=>(
            <button key={r.k} onClick={()=>setRange(r.k)} style={{
              padding:'6px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background: range===r.k?'white':'transparent', color: range===r.k?'var(--label-01)':'var(--label-02)',
              boxShadow: range===r.k?'var(--shadow-sm)':'none'
            }}>{r.l}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất</button>
        <button className="btn btn-ghost btn-sm"><Icon.Refresh/> Refresh</button>
        <button className="btn btn-primary btn-sm" onClick={()=>setBuilderOpen(true)}><Icon.Edit/> Tuỳ chỉnh layout</button>
      </div>
      {builderOpen && <DashboardBuilder onClose={()=>setBuilderOpen(false)}/>}

      <div className="scroll" style={{flex:1, padding:'18px 24px', background:'var(--fill-02)', display:'flex', flexDirection:'column', gap:16}}>
        {/* Live now ribbon */}
        <div className="card" style={{padding:'14px 18px', display:'flex', gap:32, alignItems:'center', background:'linear-gradient(135deg, #0B3D2C 0%, #1B6F45 100%)', color:'white', border:'none'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{width:8, height:8, borderRadius:4, background:'#4ADE80', boxShadow:'0 0 8px #4ADE80', animation:'livePulse 1.6s ease-in-out infinite'}}/>
            <span style={{fontWeight:700, fontSize:12, letterSpacing:'.04em', textTransform:'uppercase', opacity:.9}}>Live now</span>
          </div>
          {[
            {l:'Đang vào', v:D.liveNow.incoming, hot:true},
            {l:'Chờ trả lời', v:D.liveNow.waitingReply, warn:true},
            {l:'Quá SLA', v:D.liveNow.overdue, danger:true},
            {l:'Hội thoại mở', v:D.liveNow.openConv},
            {l:'Agent online', v:D.liveNow.online.agents+'/'+D.liveNow.online.total},
          ].map((x,i)=>(
            <div key={i} style={{display:'flex', flexDirection:'column'}}>
              <span style={{fontSize:10.5, opacity:.7, textTransform:'uppercase', letterSpacing:'.04em'}}>{x.l}</span>
              <span style={{fontSize:22, fontWeight:800, color: x.danger?'#FCA5A5':x.warn?'#FCD34D':x.hot?'#86EFAC':'white'}}>{x.v}</span>
            </div>
          ))}
          <span style={{flex:1}}/>
          <button className="btn btn-sm" style={{background:'rgba(255,255,255,.15)', color:'white', border:'1px solid rgba(255,255,255,.2)'}}>Mở Inbox →</button>
          <style>{`@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }`}</style>
        </div>

        {/* KPI cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:12}}>
          {D.today.map(k=>(
            <div key={k.k} className="card" style={{padding:14}}>
              <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600}}>{k.k}</div>
              <div style={{fontSize:26, fontWeight:800, color:k.color, lineHeight:1.15, marginTop:4}}>{k.v}</div>
              <div style={{fontSize:11, color:'var(--label-03)', display:'flex', gap:6, marginTop:2}}>
                <span style={{color: k.delta.startsWith('-') && k.k.includes('Time') ? 'var(--success)' : k.delta.startsWith('+') ? 'var(--success)' : 'var(--danger)', fontWeight:700}}>{k.delta}</span>
                <span>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16}}>
          {/* Volume chart */}
          <div className="card" style={{padding:18}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
              <div>
                <div style={{fontSize:13, fontWeight:700}}>Khối lượng tin nhắn theo giờ</div>
                <div style={{fontSize:11, color:'var(--label-03)'}}>24 giờ qua · {D.volumeSeries.reduce((a,b)=>a+b,0).toLocaleString()} tin</div>
              </div>
              <span style={{flex:1}}/>
              <span className="chip green">Inbound</span>
              <span className="chip outline">Outbound</span>
            </div>
            <VolumeChart series={D.volumeSeries}/>
          </div>

          {/* Kênh donut */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:13, fontWeight:700, marginBottom:12}}>Phân bổ theo kênh</div>
            <DonutChart data={D.channelBreakdown}/>
            <div style={{marginTop:12, display:'grid', gap:6}}>
              {D.channelBreakdown.map(c=>(
                <div key={c.name} style={{display:'flex', alignItems:'center', gap:8, fontSize:12}}>
                  <span style={{width:9, height:9, borderRadius:2, background:c.color}}/>
                  <span style={{flex:1, color:'var(--label-01)'}}>{c.name}</span>
                  <span style={{color:'var(--label-02)'}}>{c.value.toLocaleString()}</span>
                  <span style={{color:'var(--label-03)', width:36, textAlign:'right'}}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr', gap:16}}>
          {/* Agent leaderboard */}
          <div className="card" style={{padding:18}}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
              <div style={{fontSize:13, fontWeight:700}}>Hiệu suất agent</div>
              <span style={{flex:1}}/>
              <button className="btn btn-ghost btn-sm">Xem tất cả</button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1.6fr 70px 80px 60px 1fr', gap:8, fontSize:10.5, color:'var(--label-03)', fontWeight:700, letterSpacing:'.04em', paddingBottom:6, borderBottom:'1px solid var(--fill-04)'}}>
              <span>AGENT</span><span>CONV.</span><span>RESP.</span><span>CSAT</span><span>LOAD</span>
            </div>
            {D.agents.map(a=>(
              <div key={a.name} style={{display:'grid', gridTemplateColumns:'1.6fr 70px 80px 60px 1fr', gap:8, padding:'10px 0', alignItems:'center', borderBottom:'1px solid var(--fill-04)', fontSize:12.5}}>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <div style={{position:'relative'}}>
                    <div className="avatar sm" style={{background: a.status==='ai'?'var(--grad-signature)':'hsl('+(a.name.length*34)%360+' 50% 48%)', width:26, height:26, fontSize:11}}>{a.status==='ai'?'✦':a.name[0]}</div>
                    <span style={{position:'absolute', bottom:-1, right:-1, width:8, height:8, borderRadius:4, border:'2px solid white',
                      background: a.status==='online'?'#22C55E':a.status==='busy'?'#EF4444':a.status==='ai'?'#8B5CF6':'#94A3B8'}}/>
                  </div>
                  <div>
                    <div style={{fontWeight:600}}>{a.name}</div>
                    <div style={{fontSize:10.5, color:'var(--label-03)'}}>{a.role}</div>
                  </div>
                </div>
                <span style={{fontWeight:700}}>{a.conv}</span>
                <span style={{fontFamily:'monospace'}}>{a.resp}</span>
                <span>{'★ '+a.csat}</span>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <div style={{flex:1, height:5, background:'var(--fill-03)', borderRadius:3}}>
                    <div style={{width:a.load+'%', height:'100%', background: a.load>80?'var(--danger)':a.load>60?'var(--warning)':'var(--primary)', borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:10.5, color:'var(--label-03)', width:28}}>{a.load}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Top intents */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:13, fontWeight:700, marginBottom:14}}>Top ý định khách hàng</div>
            {D.topIntents.map(it=>(
              <div key={it.i} style={{marginBottom:12}}>
                <div style={{display:'flex', fontSize:12, marginBottom:4}}>
                  <span style={{flex:1, fontWeight:500}}>{it.i}</span>
                  <span style={{color:'var(--label-03)'}}>{it.v} · {it.pct}%</span>
                </div>
                <div style={{height:6, background:'var(--fill-03)', borderRadius:3, overflow:'hidden'}}>
                  <div style={{width:(it.pct*2.8)+'%', height:'100%', background:'var(--primary)', borderRadius:3}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Conversation status */}
          <div className="card" style={{padding:18}}>
            <div style={{fontSize:13, fontWeight:700, marginBottom:14}}>Trạng thái hội thoại</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              {D.convStatus.map(s=>(
                <div key={s.s} style={{padding:12, borderRadius:10, background:'var(--fill-02)', borderLeft:'3px solid '+s.c}}>
                  <div style={{fontSize:22, fontWeight:800, color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11, color:'var(--label-02)', fontWeight:600}}>{s.s}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14, padding:12, background:'linear-gradient(135deg, rgba(45,197,106,.08), rgba(43,158,243,.06))', borderRadius:10, border:'1px solid rgba(45,197,106,.2)'}}>
              <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                <Icon.Sparkles style={{width:13, height:13, color:'var(--primary)'}}/>
                <span style={{fontSize:11, fontWeight:700}} className="ai-gradient-text">Claude Cowork insight</span>
              </div>
              <div style={{fontSize:11.5, lineHeight:1.5}}>42 conversations Pending — nhiều hơn trung bình <b>3 ngày</b> qua. Gợi ý bổ sung agent vào 10-11h.</div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="card" style={{padding:18}}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
            <div style={{fontSize:13, fontWeight:700}}>Heatmap hoạt động · Thứ × Giờ</div>
            <span style={{fontSize:11, color:'var(--label-03)'}}>7 ngày gần nhất</span>
            <span style={{flex:1}}/>
            <span style={{fontSize:10.5, color:'var(--label-03)'}}>Ít</span>
            {[0.15,0.35,0.55,0.75,0.95].map((v,i)=>(
              <span key={i} style={{width:14, height:14, borderRadius:3, background:`rgba(45,197,106, ${v})`, border:'1px solid var(--fill-04)'}}/>
            ))}
            <span style={{fontSize:10.5, color:'var(--label-03)'}}>Nhiều</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'32px repeat(24, 1fr)', gap:3}}>
            <span/>
            {Array.from({length:24}).map((_,h)=>(<span key={h} style={{fontSize:9.5, color:'var(--label-03)', textAlign:'center'}}>{h%3===0?h:''}</span>))}
            {['T2','T3','T4','T5','T6','T7','CN'].map((d,di)=>(
              <React.Fragment key={d}>
                <span style={{fontSize:10.5, color:'var(--label-02)', fontWeight:600, alignSelf:'center'}}>{d}</span>
                {D.hourlyHeatmap[di].map((v,hi)=>(
                  <div key={hi} style={{height:20, borderRadius:3, background:`rgba(45,197,106, ${Math.max(.08, v)})`, border:'1px solid rgba(0,0,0,.03)'}} title={d+' '+hi+'h: '+Math.round(v*100)}/>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VolumeChart({series}) {
  const max = Math.max(...series);
  const W = 720, H = 160, step = W/(series.length-1);
  const pts = series.map((v,i)=>[i*step, H - (v/max)*(H-10)]);
  const path = pts.map((p,i)=>(i===0?'M':'L')+p[0]+','+p[1]).join(' ');
  const area = path + ` L ${W},${H} L 0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:180}}>
      <defs>
        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2DC56A" stopOpacity=".3"/>
          <stop offset="100%" stopColor="#2DC56A" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75].map(f=>(<line key={f} x1="0" x2={W} y1={H*f} y2={H*f} stroke="#E5E7EB" strokeDasharray="3 3"/>))}
      <path d={area} fill="url(#volGrad)"/>
      <path d={path} fill="none" stroke="#2DC56A" strokeWidth="2.2"/>
      {pts.map((p,i)=>i%3===0 && <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#2DC56A"/>)}
    </svg>
  );
}

function DonutChart({data}) {
  const R=70, C=84, cx=C, cy=C;
  const total = data.reduce((s,d)=>s+d.value,0);
  let ang = -Math.PI/2;
  const arcs = data.map(d=>{
    const a = (d.value/total)*Math.PI*2, a2 = ang + a;
    const x1 = cx + R*Math.cos(ang), y1 = cy + R*Math.sin(ang);
    const x2 = cx + R*Math.cos(a2),  y2 = cy + R*Math.sin(a2);
    const big = a>Math.PI?1:0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${big} 1 ${x2} ${y2} Z`;
    ang = a2;
    return {path, color:d.color};
  });
  return (
    <svg viewBox={`0 0 ${C*2} ${C*2}`} style={{width:'100%', maxWidth:200, display:'block', margin:'0 auto'}}>
      {arcs.map((a,i)=>(<path key={i} d={a.path} fill={a.color}/>))}
      <circle cx={cx} cy={cy} r={R*0.62} fill="white"/>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="22" fontWeight="800" fill="#18181B">{total.toLocaleString()}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#71717A">tin nhắn</text>
    </svg>
  );
}

window.DashboardModule = DashboardModule;
