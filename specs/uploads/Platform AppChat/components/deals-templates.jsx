// Deals Pipeline Module (P0) + Template Studio for Broadcast (P0)
const { useState: useDT, useMemo: useDTMemo } = React;

/* ============================================================
   DEALS PIPELINE MODULE — Kanban Lead → Won/Lost
   ============================================================ */

const fmtVND = (n) => {
  if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(1).replace(/\.0$/,'') + 'B₫';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace(/\.0$/,'') + 'M₫';
  if (n >= 1_000) return Math.round(n/1_000) + 'K₫';
  return n + '₫';
};

function DealsModule() {
  const { DEALS, DEAL_STAGES } = window.AppData;
  const [view, setView] = useDT('kanban');     // kanban | list | forecast
  const [ownerFilter, setOwnerFilter] = useDT('all');
  const [monthFilter, setMonthFilter] = useDT('this');
  const [draggingId, setDraggingId] = useDT(null);
  const [overStage, setOverStage] = useDT(null);
  const [deals, setDeals] = useDT(DEALS);
  const [openDeal, setOpenDeal] = useDT(null);

  const owners = [...new Set(DEALS.map(d=>d.owner))];
  const filtered = deals.filter(d =>
    (ownerFilter==='all' || d.owner===ownerFilter)
  );

  const active = filtered.filter(d => d.stage!=='won' && d.stage!=='lost');
  const pipelineValue = active.reduce((s,d) => s + d.amount, 0);
  const weightedForecast = active.reduce((s,d) => s + d.amount * (DEAL_STAGES.find(x=>x.k===d.stage)?.prob||0)/100, 0);
  const wonThisMonth = filtered.filter(d => d.stage==='won').reduce((s,d)=>s+d.amount,0);
  const wonCount = filtered.filter(d => d.stage==='won').length;
  const lostCount = filtered.filter(d => d.stage==='lost').length;
  const winRate = (wonCount+lostCount) ? Math.round(wonCount/(wonCount+lostCount)*100) : 0;

  const onDrop = (stageKey) => {
    if (draggingId == null) return;
    const stage = DEAL_STAGES.find(s=>s.k===stageKey);
    setDeals(ds => ds.map(d => d.id===draggingId ? {...d, stage:stageKey, prob: stage?.prob ?? d.prob } : d));
    setDraggingId(null); setOverStage(null);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="topbar">
        <h1>Deals Pipeline</h1>
        <span className="crumb">Sales · Revenue Forecasting · AI-powered</span>
        <span className="spacer"/>
        <div style={{ display:'flex', gap:4, background:'var(--fill-02)', padding:3, borderRadius:8 }}>
          {['kanban','list','forecast'].map(v => (
            <button key={v} onClick={()=>setView(v)}
              className={'btn btn-sm '+(view===v?'btn-primary':'btn-ghost')}
              style={{ minWidth:80, textTransform:'capitalize' }}>
              {v==='kanban' ? 'Kanban' : v==='list' ? 'Danh sách' : 'Forecast'}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost"><Icon.Sparkles/> AI Insight</button>
        <button className="btn btn-primary"><Icon.Plus/> Deal mới</button>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, padding:'16px 28px 0', background:'var(--fill-02)' }}>
        <DealKpi label="Pipeline value" value={fmtVND(pipelineValue)} sub={active.length+' deals đang mở'} color="var(--info)"/>
        <DealKpi label="Weighted forecast" value={fmtVND(weightedForecast)} sub="Tính theo xác suất" color="#8B5CF6"/>
        <DealKpi label="Won tháng này" value={fmtVND(wonThisMonth)} sub={wonCount+' deals thắng'} color="var(--primary)"/>
        <DealKpi label="Win rate" value={winRate+'%'} sub={wonCount+' won · '+lostCount+' lost'} color="#F59E0B"/>
        <DealKpi label="AI Health Score" value="78/100" sub="3 deals có rủi ro" color="var(--primary)" ai/>
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 28px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase' }}>Owner</span>
          <select value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:12.5, background:'white' }}>
            <option value="all">Tất cả</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase' }}>Kỳ</span>
          <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:12.5, background:'white' }}>
            <option value="this">Tháng 04/2026</option>
            <option value="q2">Q2 2026</option>
            <option value="ytd">Năm 2026</option>
          </select>
        </div>
        <span style={{flex:1}}/>
        <span style={{ fontSize:12, color:'var(--label-03)' }}>
          <Icon.Sparkles style={{width:12, height:12, color:'var(--primary)', verticalAlign:'middle'}}/> Claude Cowork đã update {filtered.length} deals
        </span>
      </div>

      <div className="scroll" style={{ flex:1, background:'var(--fill-02)', overflow:'auto' }}>
        {view==='kanban' && <DealsKanban deals={filtered} stages={DEAL_STAGES}
          draggingId={draggingId} setDraggingId={setDraggingId}
          overStage={overStage} setOverStage={setOverStage}
          onDrop={onDrop} onOpen={setOpenDeal}/>}
        {view==='list' && <DealsList deals={filtered} stages={DEAL_STAGES} onOpen={setOpenDeal}/>}
        {view==='forecast' && <DealsForecast deals={filtered} stages={DEAL_STAGES}/>}
      </div>

      {openDeal && <DealDrawer deal={openDeal} stages={DEAL_STAGES} onClose={()=>setOpenDeal(null)}/>}
    </div>
  );
}

function DealKpi({ label, value, sub, color, ai }) {
  return (
    <div className="card" style={{ padding:14, position:'relative', overflow:'hidden' }}>
      {ai && <div style={{ position:'absolute', top:10, right:10, fontSize:10, color:'var(--primary)', display:'inline-flex', alignItems:'center', gap:3, fontWeight:700 }}>
        <Icon.Sparkles style={{width:11, height:11}}/> AI
      </div>}
      <div style={{ fontSize:11.5, color:'var(--label-02)', fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:color, letterSpacing:'-.02em', marginTop:3 }}>{value}</div>
      <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2 }}>{sub}</div>
    </div>
  );
}

/* ---------- Kanban ---------- */
function DealsKanban({ deals, stages, draggingId, setDraggingId, overStage, setOverStage, onDrop, onOpen }) {
  return (
    <div style={{ padding:18, display:'grid', gridTemplateColumns:'repeat(6, minmax(260px, 1fr))', gap:12, minWidth:1600 }}>
      {stages.map(stage => {
        const col = deals.filter(d => d.stage===stage.k);
        const colValue = col.reduce((s,d)=>s+d.amount, 0);
        const over = overStage===stage.k;
        const isClosed = stage.k==='won' || stage.k==='lost';
        return (
          <div key={stage.k}
            onDragOver={(e)=>{e.preventDefault(); setOverStage(stage.k);}}
            onDragLeave={()=>setOverStage(null)}
            onDrop={()=>onDrop(stage.k)}
            style={{
              background: over ? 'rgba(45,197,106,.08)' : 'white',
              border: over ? '2px dashed var(--primary)' : '1px solid var(--fill-04)',
              borderRadius:12,
              display:'flex', flexDirection:'column',
              minHeight:400,
              transition:'background .12s'
            }}>
            {/* Col header */}
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:8,
              background: isClosed ? (stage.k==='won'?'rgba(45,197,106,.08)':'rgba(227,63,63,.06)') : 'var(--fill-02)',
              borderTopLeftRadius:12, borderTopRightRadius:12
            }}>
              <span style={{ width:8, height:8, borderRadius:4, background: stage.color, boxShadow:`0 0 0 3px ${stage.color}22` }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12.5, fontWeight:700, letterSpacing:'-.01em' }}>{stage.l}</div>
                <div style={{ fontSize:10.5, color:'var(--label-03)', fontWeight:500 }}>{col.length} deals · {fmtVND(colValue)}</div>
              </div>
              <button style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--label-03)', padding:4 }}>
                <Icon.More style={{width:14, height:14}}/>
              </button>
            </div>
            {/* Cards */}
            <div style={{ padding:10, display:'flex', flexDirection:'column', gap:8, flex:1 }}>
              {col.map(d => (
                <DealCard key={d.id} deal={d} stage={stage}
                  draggable
                  onDragStart={()=>setDraggingId(d.id)}
                  onDragEnd={()=>{setDraggingId(null); setOverStage(null);}}
                  dragging={draggingId===d.id}
                  onClick={()=>onOpen(d)}/>
              ))}
              {col.length===0 && (
                <div style={{ padding:20, textAlign:'center', fontSize:11.5, color:'var(--label-03)', border:'1px dashed var(--fill-04)', borderRadius:8 }}>
                  Kéo deal vào đây
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealCard({ deal, stage, draggable, onDragStart, onDragEnd, dragging, onClick }) {
  const healthColor = deal.health==='hot' ? '#E33F3F' : deal.health==='warm' ? '#F59E0B' : '#94A3B8';
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background:'white', border:'1px solid var(--fill-04)', borderRadius:10,
        padding:12, cursor:'grab', userSelect:'none',
        opacity: dragging?0.4:1, transform: dragging?'rotate(2deg)':'none',
        transition:'transform .08s, box-shadow .12s, border-color .12s',
        boxShadow: dragging ? '0 10px 24px rgba(0,0,0,.12)' : 'none',
      }}
      onMouseEnter={(e)=>{ if(!dragging){ e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(45,197,106,.1)';}}}
      onMouseLeave={(e)=>{ e.currentTarget.style.borderColor='var(--fill-04)'; e.currentTarget.style.boxShadow='none';}}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
        <div style={{ flex:1, fontSize:13, fontWeight:600, lineHeight:1.3 }}>{deal.name}</div>
        <span style={{ width:6, height:6, borderRadius:3, background:healthColor, marginTop:5, flexShrink:0, boxShadow:`0 0 0 3px ${healthColor}22` }} title={'Health: '+deal.health}/>
      </div>
      <div style={{ fontSize:18, fontWeight:800, color: stage.k==='won'?'var(--primary)': stage.k==='lost'?'#94A3B8':'var(--label-01)', letterSpacing:'-.02em', marginBottom:8 }}>
        {fmtVND(deal.amount)}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--label-02)', marginBottom:6 }}>
        <div className="avatar sm" style={{ background:'hsl('+(deal.contact.length*30)%360+' 50% 48%)', width:20, height:20, fontSize:9 }}>
          {deal.contact.split(' ').slice(-1)[0][0]}
        </div>
        <span style={{ flex:1 }}>{deal.contact}</span>
        <span style={{ color:'var(--label-03)', fontSize:10 }}>{deal.close}</span>
      </div>
      {stage.k!=='won' && stage.k!=='lost' && (
        <div style={{ marginBottom:8 }}>
          <div style={{ height:3, background:'var(--fill-03)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ width:deal.prob+'%', height:'100%', background: stage.color }}/>
          </div>
          <div style={{ fontSize:10, color:'var(--label-03)', marginTop:3, display:'flex', justifyContent:'space-between' }}>
            <span>Prob. {deal.prob}%</span>
            <span>{deal.age}</span>
          </div>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'flex-start', gap:5, background:'var(--fill-02)', padding:'6px 8px', borderRadius:6, fontSize:10.5, color:'var(--label-02)', lineHeight:1.4 }}>
        <Icon.Sparkles style={{ width:10, height:10, color:'var(--primary)', flexShrink:0, marginTop:2 }}/>
        <span>{deal.aiNote}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, fontSize:10.5, color:'var(--label-03)' }}>
        <span className="chip" style={{ height:16, fontSize:9.5, padding:'1px 6px' }}>{deal.source}</span>
        <span style={{ flex:1 }}/>
        <span>{deal.id}</span>
      </div>
    </div>
  );
}

/* ---------- List view ---------- */
function DealsList({ deals, stages, onOpen }) {
  return (
    <div style={{ padding:18 }}>
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 1fr 1fr 1fr 1fr 60px', gap:12, padding:'12px 16px',
          fontSize:11, color:'var(--label-02)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
          borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)' }}>
          <div>Deal</div><div>Amount</div><div>Stage</div><div>Owner</div><div>Close date</div><div>Prob.</div><div></div>
        </div>
        {deals.map(d => {
          const stage = stages.find(s=>s.k===d.stage);
          return (
            <div key={d.id} onClick={()=>onOpen(d)}
              style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 1fr 1fr 1fr 1fr 60px', gap:12, padding:'14px 16px',
                fontSize:13, alignItems:'center', borderBottom:'1px solid var(--fill-04)', cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--fill-01)'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              <div>
                <div style={{ fontWeight:600, color:'var(--primary)' }}>{d.name}</div>
                <div style={{ fontSize:11, color:'var(--label-03)' }}>{d.account} · {d.contact}</div>
              </div>
              <div style={{ fontWeight:700 }}>{fmtVND(d.amount)}</div>
              <div>
                <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 8px', borderRadius:10,
                  background: stage.color+'22', color: stage.color }}>{stage.l}</span>
              </div>
              <div>{d.owner}</div>
              <div style={{ fontSize:12, color: d.health==='hot'?'#E33F3F':'var(--label-01)' }}>{d.close}</div>
              <div>
                <div style={{ height:4, background:'var(--fill-03)', borderRadius:2, overflow:'hidden', width:60 }}>
                  <div style={{ width:d.prob+'%', height:'100%', background:stage.color }}/>
                </div>
                <div style={{ fontSize:10, color:'var(--label-03)', marginTop:2 }}>{d.prob}%</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <button className="btn-icon" onClick={(e)=>{e.stopPropagation();}}><Icon.More/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Forecast view ---------- */
function DealsForecast({ deals, stages }) {
  const byStage = stages.filter(s=>s.k!=='lost').map(s => {
    const col = deals.filter(d=>d.stage===s.k);
    return { stage:s, count:col.length, total: col.reduce((sum,d)=>sum+d.amount,0), weighted: col.reduce((sum,d)=>sum+d.amount*s.prob/100,0) };
  });
  const maxVal = Math.max(...byStage.map(x=>x.total), 1);
  const totalWeighted = byStage.reduce((s,x)=>s+x.weighted,0);
  const totalCommitted = byStage.filter(x=>x.stage.k==='won'||x.stage.k==='negotiate').reduce((s,x)=>s+x.weighted,0);

  return (
    <div style={{ padding:18, display:'grid', gridTemplateColumns:'2fr 1fr', gap:18 }}>
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:15 }}>Funnel · Q2 2026</h3>
          <span style={{ flex:1 }}/>
          <span style={{ fontSize:11.5, color:'var(--label-02)' }}>Weighted = Amount × Probability</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {byStage.map(x => (
            <div key={x.stage.k} style={{ display:'grid', gridTemplateColumns:'160px 1fr 130px 130px', gap:12, alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:4, background:x.stage.color }}/>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600 }}>{x.stage.l}</div>
                  <div style={{ fontSize:10.5, color:'var(--label-03)' }}>{x.count} deals</div>
                </div>
              </div>
              <div style={{ height:26, background:'var(--fill-02)', borderRadius:6, overflow:'hidden', position:'relative' }}>
                <div style={{ width:(x.total/maxVal*100)+'%', height:'100%', background:x.stage.color+'44', borderRight:'2px solid '+x.stage.color }}/>
                <div style={{ width:(x.weighted/maxVal*100)+'%', height:'100%', background:x.stage.color, position:'absolute', top:0, left:0 }}/>
              </div>
              <div style={{ fontSize:13, fontWeight:700, textAlign:'right' }}>{fmtVND(x.total)}</div>
              <div style={{ fontSize:13, fontWeight:700, textAlign:'right', color:x.stage.color }}>{fmtVND(x.weighted)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:20, padding:14, background:'var(--fill-02)', borderRadius:10,
          display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.5 }}>Total weighted</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--primary)' }}>{fmtVND(totalWeighted)}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.5 }}>Committed (≥75%)</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{fmtVND(totalCommitted)}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.5 }}>Quota Q2</div>
            <div style={{ fontSize:22, fontWeight:800 }}>450M₫</div>
            <div style={{ fontSize:11, color: totalWeighted>=450_000_000?'var(--primary)':'#F59E0B', fontWeight:600 }}>
              {Math.round(totalWeighted/450_000_000*100)}% attainment
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:18, background:'linear-gradient(135deg, rgba(45,197,106,.04), white 60%)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white' }}>
            <Icon.Sparkles style={{width:14, height:14}}/>
          </div>
          <div style={{ fontWeight:700 }} className="ai-gradient-text">Claude Cowork · Risk signals</div>
        </div>
        {[
          { deal:'D-2043 · An Khang Pharma', risk:'high', msg:'Stuck ở Needs Analysis 6 ngày — chưa có follow-up. Đề xuất: Book call lại.' },
          { deal:'D-2042 · MomBaby · Team 5', risk:'mid',  msg:'Khách đã xem báo giá 3 lần nhưng chưa reply. Gợi ý: Gửi case study.' },
          { deal:'D-2049 · Green Market',    risk:'mid',  msg:'Lead mới 2 ngày · chưa có engagement. Claude sẽ gửi welcome message.' },
          { deal:'D-2045 · KhoaShop',        risk:'low',  msg:'Đang ở Negotiation · close trong 3 ngày · chỉ cần duyệt discount 10%.' },
        ].map((x,i) => (
          <div key={i} style={{ padding:10, marginBottom:8, background:'white', border:'1px solid var(--fill-04)', borderRadius:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span style={{ width:6, height:6, borderRadius:3,
                background: x.risk==='high'?'#E33F3F':x.risk==='mid'?'#F59E0B':'var(--primary)' }}/>
              <span style={{ fontSize:11.5, fontWeight:700 }}>{x.deal}</span>
            </div>
            <div style={{ fontSize:11.5, color:'var(--label-02)', lineHeight:1.5 }}>{x.msg}</div>
          </div>
        ))}
        <button className="btn btn-primary btn-sm" style={{ width:'100%', marginTop:6, justifyContent:'center' }}>
          <Icon.Sparkles style={{width:12,height:12}}/> Tạo action plan tự động
        </button>
      </div>
    </div>
  );
}

/* ---------- Deal detail drawer ---------- */
function DealDrawer({ deal, stages, onClose }) {
  const stage = stages.find(s=>s.k===deal.stage);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(14,27,19,.35)', backdropFilter:'blur(2px)' }}/>
      <div style={{ position:'relative', width:520, background:'white', height:'100%', boxShadow:'-20px 0 40px rgba(0,0,0,.12)',
        display:'flex', flexDirection:'column', animation:'slideIn .2s ease-out' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--fill-04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--label-03)' }}>{deal.id}</span>
            <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 8px', borderRadius:10, background:stage.color+'22', color:stage.color }}>{stage.l}</span>
            <span style={{ flex:1 }}/>
            <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
          </div>
          <h2 style={{ margin:0, fontSize:18, letterSpacing:'-.01em' }}>{deal.name}</h2>
          <div style={{ fontSize:28, fontWeight:800, color:'var(--primary)', letterSpacing:'-.025em', marginTop:8 }}>{fmtVND(deal.amount)}</div>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:22 }}>
          {/* Stage progress */}
          <div style={{ display:'flex', gap:3, marginBottom:22 }}>
            {stages.filter(s=>s.k!=='lost').map((s,i) => {
              const ord = stages.filter(x=>x.k!=='lost').findIndex(x=>x.k===deal.stage);
              const done = i<=ord && deal.stage!=='lost';
              return (
                <div key={s.k} style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ height:4, borderRadius:2, background: done?s.color:'var(--fill-03)' }}/>
                  <div style={{ fontSize:10, color: done?s.color:'var(--label-03)', fontWeight: done?700:500 }}>{s.l}</div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, textTransform:'uppercase', marginBottom:8 }}>Chi tiết</div>
          <div style={{ display:'grid', gridTemplateColumns:'130px 1fr', rowGap:10, fontSize:13, marginBottom:22 }}>
            <div style={{color:'var(--label-02)'}}>Contact</div><div style={{fontWeight:600}}>{deal.contact}</div>
            <div style={{color:'var(--label-02)'}}>Account</div><div style={{color:'var(--info)', fontWeight:500}}>{deal.account}</div>
            <div style={{color:'var(--label-02)'}}>Owner</div><div>{deal.owner}</div>
            <div style={{color:'var(--label-02)'}}>Close date</div><div>{deal.close}</div>
            <div style={{color:'var(--label-02)'}}>Source</div><div>{deal.source}</div>
            <div style={{color:'var(--label-02)'}}>Age</div><div>{deal.age}</div>
            <div style={{color:'var(--label-02)'}}>Probability</div><div>{deal.prob}%</div>
          </div>

          <div style={{ padding:14, background:'linear-gradient(135deg, rgba(45,197,106,.06), rgba(45,197,106,.02))',
            border:'1px solid rgba(45,197,106,.2)', borderRadius:10, marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <Icon.Sparkles style={{width:14, height:14, color:'var(--primary)'}}/>
              <span style={{ fontSize:11.5, fontWeight:700 }} className="ai-gradient-text">Claude Cowork khuyến nghị</span>
            </div>
            <div style={{ fontSize:13, lineHeight:1.5 }}>{deal.aiNote}</div>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              <button className="btn btn-primary btn-sm">Áp dụng</button>
              <button className="btn btn-ghost btn-sm">Xem thêm</button>
            </div>
          </div>

          <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, textTransform:'uppercase', marginBottom:8 }}>Hoạt động gần đây</div>
          <div style={{ display:'grid', gap:10 }}>
            {[
              {t:'Hôm nay 14:20', e:'Claude Cowork tóm tắt cuộc gọi 18 phút'},
              {t:'Hôm qua 10:00', e:'Gửi báo giá qua Email'},
              {t:'2 ngày trước', e:'Stage: Proposal → Negotiation'},
              {t:'5 ngày trước', e:'Demo sản phẩm (Google Meet)'},
            ].map((a,i) => (
              <div key={i} style={{ display:'flex', gap:10, fontSize:12.5 }}>
                <div style={{ width:90, fontSize:11, color:'var(--label-03)', flexShrink:0 }}>{a.t}</div>
                <div style={{flex:1, color:'var(--label-01)'}}>{a.e}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:16, borderTop:'1px solid var(--fill-04)', display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm"><Icon.Chat/> Nhắn tin</button>
          <button className="btn btn-ghost btn-sm"><Icon.Phone/> Gọi</button>
          <span style={{flex:1}}/>
          <button className="btn btn-primary btn-sm">Edit Deal →</button>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   TEMPLATE STUDIO — Drag-drop builder for Broadcast
   ============================================================ */

const BLOCK_TYPES = [
  { t:'header', icon:'H', label:'Header', defaults:{text:'Tiêu đề'} },
  { t:'text',   icon:'T', label:'Đoạn text', defaults:{text:'Viết nội dung tại đây...'} },
  { t:'image',  icon:'📷', label:'Hình ảnh', defaults:{alt:'Ảnh mô tả'} },
  { t:'button', icon:'⧉', label:'Nút CTA', defaults:{text:'Mua ngay', url:'https://'} },
  { t:'divider',icon:'—', label:'Đường kẻ', defaults:{} },
  { t:'product',icon:'🛍', label:'Sản phẩm', defaults:{name:'Sản phẩm', price:'299.000₫'} },
  { t:'variable',icon:'{}',label:'Biến động', defaults:{text:'{{firstName}}'} },
];

const CHANNEL_META = {
  zns:   { label:'Zalo ZNS',       color:'#0068FF', preview:'zalo',   limit:'500 ký tự · approved template', header:'Zalo Official Account' },
  zalo:  { label:'Zalo Message',   color:'#0068FF', preview:'zalo',   limit:'Không giới hạn · 24h window',   header:'Zalo Chat' },
  email: { label:'Email',          color:'#6366F1', preview:'email',  limit:'HTML + MJML · ~102KB',          header:'Inbox · AppChat' },
  sms:   { label:'SMS',            color:'#F59E0B', preview:'sms',    limit:'160 ký tự · plain text',        header:'SMS Brandname' },
  fb:    { label:'Facebook Msg',   color:'#0084FF', preview:'zalo',   limit:'Message Tag · 24h+1',           header:'Facebook Messenger' },
};

function TemplateStudio({ onClose, initialTemplate }) {
  const { TEMPLATES } = window.AppData;
  const [library, setLibrary] = useDT(TEMPLATES);
  const [selected, setSelected] = useDT(initialTemplate || TEMPLATES[0]);
  const [selectedBlockIdx, setSelectedBlockIdx] = useDT(null);
  const [draggingBlockType, setDraggingBlockType] = useDT(null);
  const [libFilter, setLibFilter] = useDT('all');

  const updateSelected = (patch) => {
    setSelected(s => {
      const updated = { ...s, ...patch };
      setLibrary(L => L.map(t => t.id===s.id ? updated : t));
      return updated;
    });
  };
  const updateBlock = (idx, patch) => {
    updateSelected({ blocks: selected.blocks.map((b,i) => i===idx ? {...b, ...patch} : b) });
  };
  const addBlock = (type, atIdx) => {
    const bt = BLOCK_TYPES.find(x=>x.t===type);
    const newBlock = { t:type, ...bt.defaults };
    const blocks = [...selected.blocks];
    if (atIdx==null) blocks.push(newBlock); else blocks.splice(atIdx, 0, newBlock);
    updateSelected({ blocks });
    setSelectedBlockIdx(atIdx==null ? blocks.length-1 : atIdx);
  };
  const removeBlock = (idx) => {
    updateSelected({ blocks: selected.blocks.filter((_,i)=>i!==idx) });
    setSelectedBlockIdx(null);
  };
  const moveBlock = (from, to) => {
    if (from===to || to<0 || to>=selected.blocks.length) return;
    const blocks = [...selected.blocks];
    const [b] = blocks.splice(from,1);
    blocks.splice(to, 0, b);
    updateSelected({ blocks });
    setSelectedBlockIdx(to);
  };

  const channelMeta = CHANNEL_META[selected.channel] || CHANNEL_META.zalo;
  const filteredLib = library.filter(t => libFilter==='all' || t.channel===libFilter);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'var(--fill-01)', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'14px 22px', borderBottom:'1px solid var(--fill-04)', background:'white',
        display:'flex', alignItems:'center', gap:14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon.Close/> Đóng Studio</button>
        <div style={{ width:1, height:22, background:'var(--fill-04)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white' }}>
            <Icon.Sparkles style={{width:14, height:14}}/>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>Template Studio</div>
            <div style={{ fontSize:11, color:'var(--label-03)' }}>Kéo thả · Preview realtime · Duyệt nội bộ</div>
          </div>
        </div>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> AI viết lại</button>
        <button className="btn btn-ghost btn-sm">Test send</button>
        <button className="btn btn-ghost btn-sm">Lưu nháp</button>
        <button className="btn btn-primary btn-sm">Gửi duyệt →</button>
      </div>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'280px 1fr 320px', overflow:'hidden' }}>
        {/* ======= LEFT: Library + Blocks ======= */}
        <div style={{ borderRight:'1px solid var(--fill-04)', background:'white', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px 8px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Khối kéo thả</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6 }}>
              {BLOCK_TYPES.map(b => (
                <div key={b.t}
                  draggable
                  onDragStart={()=>setDraggingBlockType(b.t)}
                  onDragEnd={()=>setDraggingBlockType(null)}
                  onClick={()=>addBlock(b.t)}
                  style={{
                    border:'1px solid var(--fill-04)', borderRadius:8, padding:'10px 8px',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    cursor:'grab', background:draggingBlockType===b.t?'var(--fill-02)':'white',
                    transition:'border-color .1s, background .1s'
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--fill-04)'}
                >
                  <div style={{ width:26, height:26, background:'var(--fill-02)', borderRadius:6, display:'grid', placeItems:'center', fontSize:14, fontWeight:700, color:'var(--label-01)' }}>{b.icon}</div>
                  <div style={{ fontSize:10.5, color:'var(--label-02)', fontWeight:500 }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'14px 16px 8px', borderTop:'1px solid var(--fill-04)', marginTop:8,
            display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase' }}>Thư viện</div>
            <span style={{ flex:1 }}/>
            <button className="btn-icon" title="Tạo mới" onClick={()=>{
              const id = 'T-'+(Math.random().toString(36).slice(2,5).toUpperCase());
              const t = { id, name:'Template mới', channel:'zns', cat:'Khuyến mãi', status:'draft', usage:0, updated:'Vừa tạo', blocks:[] };
              setLibrary([t, ...library]);
              setSelected(t);
              setSelectedBlockIdx(null);
            }}><Icon.Plus style={{width:14, height:14}}/></button>
          </div>
          <div style={{ padding:'0 16px 8px' }}>
            <select value={libFilter} onChange={e=>setLibFilter(e.target.value)}
              style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:12, background:'white' }}>
              <option value="all">Tất cả kênh</option>
              {Object.entries(CHANNEL_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:'0 10px 10px' }}>
            {filteredLib.map(t => {
              const cm = CHANNEL_META[t.channel];
              const active = t.id===selected.id;
              return (
                <div key={t.id} onClick={()=>{setSelected(t); setSelectedBlockIdx(null);}}
                  style={{
                    padding:'10px 12px', borderRadius:8, marginBottom:4, cursor:'pointer',
                    background: active?'var(--pr-soft, rgba(45,197,106,.1))':'transparent',
                    border: active?'1px solid rgba(45,197,106,.3)':'1px solid transparent',
                    transition:'background .1s'
                  }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='var(--fill-02)'; }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ width:6, height:6, borderRadius:3, background:cm?.color||'#94A3B8' }}/>
                    <span style={{ fontSize:10.5, color:'var(--label-03)', fontWeight:600, textTransform:'uppercase', letterSpacing:.3 }}>{cm?.label || t.channel}</span>
                    <span style={{ flex:1 }}/>
                    {t.status==='approved' && <span style={{ fontSize:9.5, fontWeight:700, color:'var(--primary)' }}>✓ Duyệt</span>}
                    {t.status==='pending' && <span style={{ fontSize:9.5, fontWeight:700, color:'#F59E0B' }}>⏱ Chờ</span>}
                    {t.status==='draft' && <span style={{ fontSize:9.5, fontWeight:700, color:'var(--label-03)' }}>Nháp</span>}
                  </div>
                  <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.3, marginBottom:2 }}>{t.name}</div>
                  <div style={{ fontSize:10.5, color:'var(--label-03)' }}>{t.cat} · Dùng {t.usage} lần</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======= MIDDLE: Preview ======= */}
        <div style={{ overflow:'auto', padding:30, background:'var(--fill-02)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, maxWidth:700, margin:'0 auto 18px' }}>
            <input value={selected.name} onChange={e=>updateSelected({name:e.target.value})}
              style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:17, fontWeight:700, letterSpacing:'-.01em' }}/>
            <select value={selected.channel} onChange={e=>updateSelected({channel:e.target.value})}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--fill-04)', fontSize:12, background:'white', fontWeight:600 }}>
              {Object.entries(CHANNEL_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span style={{ fontSize:11, color:'var(--label-03)' }}>{channelMeta.limit}</span>
          </div>

          {/* Phone/email preview */}
          {channelMeta.preview==='zalo' && (
            <PhonePreview channelMeta={channelMeta} brand="AppChat">
              <BlockStack blocks={selected.blocks}
                selectedIdx={selectedBlockIdx}
                setSelectedIdx={setSelectedBlockIdx}
                onDropAt={(idx) => { if(draggingBlockType) addBlock(draggingBlockType, idx); }}
                onMove={moveBlock} channel={selected.channel}/>
            </PhonePreview>
          )}
          {channelMeta.preview==='email' && (
            <EmailPreview brand="AppChat · noreply@appchat.vn" subject={selected.name}>
              <BlockStack blocks={selected.blocks}
                selectedIdx={selectedBlockIdx}
                setSelectedIdx={setSelectedBlockIdx}
                onDropAt={(idx)=>{ if(draggingBlockType) addBlock(draggingBlockType, idx); }}
                onMove={moveBlock} channel={selected.channel}/>
            </EmailPreview>
          )}
          {channelMeta.preview==='sms' && (
            <SmsPreview brand="APPCHAT">
              <BlockStack blocks={selected.blocks}
                selectedIdx={selectedBlockIdx}
                setSelectedIdx={setSelectedBlockIdx}
                onDropAt={(idx)=>{ if(draggingBlockType) addBlock(draggingBlockType, idx); }}
                onMove={moveBlock} channel={selected.channel}/>
            </SmsPreview>
          )}
        </div>

        {/* ======= RIGHT: Inspector ======= */}
        <div style={{ borderLeft:'1px solid var(--fill-04)', background:'white', overflow:'auto' }}>
          <InspectorPanel
            template={selected}
            selectedBlockIdx={selectedBlockIdx}
            onUpdateBlock={updateBlock}
            onRemoveBlock={removeBlock}
            onUpdateTemplate={updateSelected}
            onMoveBlock={moveBlock}
          />
        </div>
      </div>
    </div>
  );
}

function BlockStack({ blocks, selectedIdx, setSelectedIdx, onDropAt, onMove, channel }) {
  const [dragFrom, setDragFrom] = useDT(null);
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <DropZone idx={0} onDropAt={onDropAt}/>
      {blocks.map((b, i) => (
        <React.Fragment key={i}>
          <div
            draggable
            onDragStart={()=>setDragFrom(i)}
            onDragEnd={()=>setDragFrom(null)}
            onClick={()=>setSelectedIdx(i)}
            style={{
              padding:2, position:'relative',
              outline: selectedIdx===i ? '2px solid var(--primary)' : 'none',
              outlineOffset: 2,
              borderRadius:4,
              cursor:'move',
              opacity: dragFrom===i ? 0.4 : 1,
            }}>
            <RenderBlock block={b} channel={channel}/>
            {selectedIdx===i && (
              <div style={{ position:'absolute', top:-12, right:-6, display:'flex', gap:2 }}>
                <div style={{ background:'var(--primary)', color:'white', fontSize:10, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>
                  {b.t}
                </div>
              </div>
            )}
          </div>
          <DropZone idx={i+1} onDropAt={onDropAt}/>
        </React.Fragment>
      ))}
      {blocks.length===0 && (
        <div style={{ padding:40, textAlign:'center', color:'var(--label-03)', fontSize:13, border:'2px dashed var(--fill-04)', borderRadius:10, margin:16 }}>
          Kéo khối từ bên trái vào đây
        </div>
      )}
    </div>
  );
}

function DropZone({ idx, onDropAt }) {
  const [over, setOver] = useDT(false);
  return (
    <div
      onDragOver={e=>{e.preventDefault(); setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{onDropAt(idx); setOver(false);}}
      style={{
        height: over?24:6,
        background: over?'rgba(45,197,106,.2)':'transparent',
        borderRadius:3,
        margin:'2px 0',
        transition:'height .1s, background .1s',
        border: over?'2px dashed var(--primary)':'2px dashed transparent',
      }}
    />
  );
}

function RenderBlock({ block, channel }) {
  if (block.t==='header') {
    return <div style={{ fontSize:16, fontWeight:800, padding:'8px 14px', color:'var(--label-01)', lineHeight:1.3 }}>{block.text}</div>;
  }
  if (block.t==='text') {
    return <div style={{ fontSize:13, padding:'6px 14px', color:'var(--label-01)', lineHeight:1.55, whiteSpace:'pre-wrap' }}>{block.text}</div>;
  }
  if (block.t==='image') {
    return (
      <div style={{ padding:'4px 14px' }}>
        <div style={{ background:'linear-gradient(135deg, #8FE1B0, #BCEDCC, #E8F8EE)', aspectRatio:'16/9', borderRadius:8, display:'grid', placeItems:'center', color:'var(--pr-dark-2)', fontSize:11, fontWeight:600 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:2 }}>🖼</div>
            {block.alt || 'Hình ảnh'}
          </div>
        </div>
      </div>
    );
  }
  if (block.t==='button') {
    return (
      <div style={{ padding:'8px 14px' }}>
        <div style={{ background:'var(--primary)', color:'white', padding:'10px 14px', borderRadius:8, textAlign:'center', fontSize:13, fontWeight:600 }}>{block.text || 'CTA'}</div>
      </div>
    );
  }
  if (block.t==='divider') return <div style={{ margin:'6px 14px', height:1, background:'var(--fill-04)' }}/>;
  if (block.t==='product') {
    return (
      <div style={{ padding:'6px 14px' }}>
        <div style={{ display:'flex', gap:10, padding:10, border:'1px solid var(--fill-04)', borderRadius:8, background:'white' }}>
          <div style={{ width:56, height:56, background:'linear-gradient(135deg, #BCEDCC, #E8F8EE)', borderRadius:6, flexShrink:0, display:'grid', placeItems:'center', fontSize:20 }}>🛍</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:600 }}>{block.name}</div>
            <div style={{ fontSize:14, color:'var(--primary)', fontWeight:700, marginTop:2 }}>{block.price}</div>
            <div style={{ fontSize:10.5, color:'var(--label-03)' }}>Xem chi tiết →</div>
          </div>
        </div>
      </div>
    );
  }
  if (block.t==='variable') {
    return <div style={{ padding:'4px 14px', fontFamily:'monospace', fontSize:12, color:'#8B5CF6', background:'rgba(139,92,246,.06)', margin:'2px 14px', padding:'4px 8px', borderRadius:4, display:'inline-block' }}>{block.text}</div>;
  }
  return null;
}

function PhonePreview({ channelMeta, brand, children }) {
  return (
    <div style={{ maxWidth:380, margin:'0 auto' }}>
      <div style={{
        background:'#0E1B13', borderRadius:36, padding:12,
        boxShadow:'0 20px 60px rgba(0,0,0,.2)',
      }}>
        <div style={{ background:'white', borderRadius:26, overflow:'hidden', minHeight:620 }}>
          {/* Status bar */}
          <div style={{ height:30, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', fontSize:11, fontWeight:600 }}>
            <span>9:41</span>
            <span style={{ display:'flex', gap:4, alignItems:'center' }}>
              <span>••••</span><span>📶</span><span>100%</span>
            </span>
          </div>
          {/* App header */}
          <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--fill-03)', display:'flex', alignItems:'center', gap:10, background:channelMeta.color }}>
            <div style={{ color:'white', fontSize:18, cursor:'pointer' }}>‹</div>
            <div style={{ width:32, height:32, borderRadius:16, background:'white', display:'grid', placeItems:'center', fontWeight:800, color:channelMeta.color }}>A</div>
            <div style={{ flex:1, color:'white' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{brand}</div>
              <div style={{ fontSize:10, opacity:.8 }}>{channelMeta.header}</div>
            </div>
            <div style={{ color:'white', fontSize:16 }}>⋯</div>
          </div>
          {/* Chat bg */}
          <div style={{ padding:'16px 10px', background:'#F4F6F8', minHeight:540 }}>
            <div style={{ textAlign:'center', fontSize:10, color:'var(--label-03)', marginBottom:14 }}>Hôm nay · 10:24</div>
            <div style={{ maxWidth:'85%', background:'white', borderRadius:14, overflow:'hidden', marginBottom:6, boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
              {children}
            </div>
            <div style={{ fontSize:9, color:'var(--label-03)', marginLeft:4 }}>Đã gửi</div>
          </div>
        </div>
      </div>
      <div style={{ textAlign:'center', fontSize:11, color:'var(--label-03)', marginTop:10 }}>Preview · iPhone 14 · {channelMeta.label}</div>
    </div>
  );
}

function EmailPreview({ brand, subject, children }) {
  return (
    <div style={{ maxWidth:560, margin:'0 auto', background:'white', borderRadius:10, boxShadow:'0 6px 20px rgba(0,0,0,.06)', overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--fill-04)', background:'var(--fill-01)' }}>
        <div style={{ fontSize:11, color:'var(--label-03)' }}>TỪ</div>
        <div style={{ fontSize:13, fontWeight:600 }}>{brand}</div>
        <div style={{ fontSize:11, color:'var(--label-03)', marginTop:8 }}>CHỦ ĐỀ</div>
        <div style={{ fontSize:15, fontWeight:700 }}>{subject}</div>
      </div>
      <div style={{ padding:'18px 0' }}>
        {children}
      </div>
      <div style={{ padding:'12px 18px', borderTop:'1px solid var(--fill-04)', fontSize:10.5, color:'var(--label-03)', background:'var(--fill-02)' }}>
        Bạn nhận email này vì đã đăng ký AppChat · <span style={{ textDecoration:'underline' }}>Huỷ đăng ký</span>
      </div>
    </div>
  );
}

function SmsPreview({ brand, children }) {
  return (
    <div style={{ maxWidth:340, margin:'0 auto' }}>
      <div style={{ background:'#0E1B13', borderRadius:34, padding:10, boxShadow:'0 20px 40px rgba(0,0,0,.2)' }}>
        <div style={{ background:'white', borderRadius:26, padding:'12px 10px 100px', minHeight:500 }}>
          <div style={{ textAlign:'center', fontSize:10.5, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase', marginBottom:12 }}>{brand}</div>
          <div style={{ background:'#E5E5EA', borderRadius:16, padding:'10px 4px', maxWidth:'80%', color:'#0E1B13', fontSize:12.5, lineHeight:1.5 }}>
            {children}
          </div>
          <div style={{ fontSize:10, color:'var(--label-03)', marginTop:4, marginLeft:4 }}>9:41 AM</div>
        </div>
      </div>
    </div>
  );
}

function InspectorPanel({ template, selectedBlockIdx, onUpdateBlock, onRemoveBlock, onUpdateTemplate, onMoveBlock }) {
  const block = selectedBlockIdx!=null ? template.blocks[selectedBlockIdx] : null;
  if (!block) {
    // Template-level inspector
    return (
      <div style={{ padding:18 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>Thiết lập template</div>

        <InField label="Tên template">
          <input value={template.name} onChange={e=>onUpdateTemplate({name:e.target.value})} className="in"/>
        </InField>
        <InField label="Danh mục">
          <select value={template.cat} onChange={e=>onUpdateTemplate({cat:e.target.value})} className="in">
            <option>Khuyến mãi</option><option>Onboarding</option><option>Transactional</option>
            <option>Re-engage</option><option>Cá nhân hoá</option><option>Sales</option>
          </select>
        </InField>
        <InField label="Kênh">
          <select value={template.channel} onChange={e=>onUpdateTemplate({channel:e.target.value})} className="in">
            {Object.entries(CHANNEL_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </InField>
        <InField label="Trạng thái">
          <div style={{ display:'flex', gap:6 }}>
            {['draft','pending','approved'].map(s => (
              <button key={s} onClick={()=>onUpdateTemplate({status:s})}
                className={'btn btn-sm '+(template.status===s?'btn-primary':'btn-ghost')}
                style={{ flex:1, textTransform:'capitalize' }}>
                {s==='draft'?'Nháp':s==='pending'?'Chờ duyệt':'Đã duyệt'}
              </button>
            ))}
          </div>
        </InField>

        <div style={{ height:1, background:'var(--fill-04)', margin:'16px 0' }}/>

        <div style={{ padding:12, background:'linear-gradient(135deg, rgba(45,197,106,.05), rgba(139,92,246,.04))',
          border:'1px solid rgba(45,197,106,.2)', borderRadius:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <Icon.Sparkles style={{ width:14, height:14, color:'var(--primary)' }}/>
            <span style={{ fontSize:11.5, fontWeight:700 }} className="ai-gradient-text">Claude Cowork hỗ trợ</span>
          </div>
          <div style={{ display:'grid', gap:6 }}>
            <button className="btn btn-ghost btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>✍ Viết lại ngắn gọn hơn</button>
            <button className="btn btn-ghost btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>🌐 Dịch sang EN/CN</button>
            <button className="btn btn-ghost btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>🎯 Tối ưu CTR (A/B)</button>
            <button className="btn btn-ghost btn-sm" style={{ justifyContent:'flex-start', width:'100%' }}>✓ Kiểm tra tuân thủ ZNS</button>
          </div>
        </div>

        <div style={{ height:1, background:'var(--fill-04)', margin:'16px 0' }}/>

        <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>Biến động (Merge tags)</div>
        <div style={{ display:'grid', gap:4, fontFamily:'monospace', fontSize:11.5 }}>
          {['{{firstName}}','{{lastName}}','{{orderId}}','{{amount}}','{{link}}','{{company}}'].map(v => (
            <div key={v} style={{ padding:'4px 8px', background:'var(--fill-02)', borderRadius:4, cursor:'pointer', color:'#8B5CF6', fontWeight:600 }}>{v}</div>
          ))}
        </div>

        <style>{`.in{width:100%; padding:8px 10px; border:1px solid var(--fill-04); border-radius:7px; font-size:12.5px; background:white; font-family:inherit}`}</style>
      </div>
    );
  }

  // Block-level inspector
  return (
    <div style={{ padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.5, textTransform:'uppercase' }}>Khối · {block.t}</span>
        <span style={{ flex:1 }}/>
        <button className="btn-icon" onClick={()=>onMoveBlock(selectedBlockIdx, selectedBlockIdx-1)} title="Di lên">↑</button>
        <button className="btn-icon" onClick={()=>onMoveBlock(selectedBlockIdx, selectedBlockIdx+1)} title="Di xuống">↓</button>
        <button className="btn-icon" onClick={()=>onRemoveBlock(selectedBlockIdx)} title="Xoá" style={{ color:'var(--danger)' }}>
          <Icon.Trash style={{ width:14, height:14 }}/>
        </button>
      </div>

      {(block.t==='header' || block.t==='text' || block.t==='variable') && (
        <InField label={block.t==='header'?'Tiêu đề':block.t==='variable'?'Biến':'Nội dung'}>
          <textarea value={block.text} onChange={e=>onUpdateBlock(selectedBlockIdx,{text:e.target.value})}
            rows={block.t==='text'?6:2}
            style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12.5, background:'white', fontFamily: block.t==='variable'?'monospace':'inherit', resize:'vertical' }}/>
        </InField>
      )}

      {block.t==='button' && (
        <>
          <InField label="Nhãn nút">
            <input value={block.text||''} onChange={e=>onUpdateBlock(selectedBlockIdx,{text:e.target.value})} className="in"/>
          </InField>
          <InField label="URL">
            <input value={block.url||''} onChange={e=>onUpdateBlock(selectedBlockIdx,{url:e.target.value})} className="in"/>
          </InField>
          <InField label="Theo dõi click">
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
              <input type="checkbox" defaultChecked style={{ accentColor:'var(--primary)' }}/> UTM tự động
            </label>
          </InField>
        </>
      )}

      {block.t==='image' && (
        <>
          <InField label="Alt text">
            <input value={block.alt||''} onChange={e=>onUpdateBlock(selectedBlockIdx,{alt:e.target.value})} className="in"/>
          </InField>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center' }}>📁 Upload hình</button>
        </>
      )}

      {block.t==='product' && (
        <>
          <InField label="Tên sản phẩm">
            <input value={block.name||''} onChange={e=>onUpdateBlock(selectedBlockIdx,{name:e.target.value})} className="in"/>
          </InField>
          <InField label="Giá">
            <input value={block.price||''} onChange={e=>onUpdateBlock(selectedBlockIdx,{price:e.target.value})} className="in"/>
          </InField>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center' }}>🔗 Chọn từ catalog</button>
        </>
      )}

      <div style={{ height:1, background:'var(--fill-04)', margin:'16px 0' }}/>

      <div style={{ padding:10, background:'rgba(45,197,106,.06)', borderRadius:8, display:'flex', gap:8, fontSize:11.5, color:'var(--label-02)', lineHeight:1.5 }}>
        <Icon.Sparkles style={{ width:12, height:12, color:'var(--primary)', flexShrink:0, marginTop:2 }}/>
        <span>Dùng <code style={{background:'rgba(139,92,246,.1)', padding:'1px 4px', borderRadius:3, color:'#8B5CF6'}}>{'{{firstName}}'}</code> để cá nhân hoá. Claude Cowork sẽ tự phát hiện biến chưa match.</span>
      </div>
      <style>{`.in{width:100%; padding:8px 10px; border:1px solid var(--fill-04); border-radius:7px; font-size:12.5px; background:white; font-family:inherit}`}</style>
    </div>
  );
}

function InField({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, color:'var(--label-02)', fontWeight:600, marginBottom:4 }}>{label}</div>
      {children}
    </div>
  );
}

window.DealsModule = DealsModule;
window.TemplateStudio = TemplateStudio;
