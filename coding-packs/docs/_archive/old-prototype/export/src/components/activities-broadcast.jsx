// Activities, Broadcast, Automation, Files, Reports, Settings modules
const { useState: useSt } = React;

/* ============ ACTIVITIES (Zoho CRM-style) ============ */
const TASK_FILTERS = {
  Tasks: [
    { k:'all_open', l:"All Open Tasks", c:'var(--info)' },
    { k:'my_open',  l:"My Open Tasks", c:'var(--primary)' },
    { k:'today',    l:"Today's Tasks" },
    { k:'overdue',  l:'Overdue Tasks', c:'var(--danger)' },
    { k:'next7',    l:'Due in Next 7 Days' },
    { k:'high',     l:'High Priority' },
    { k:'completed',l:'Completed Tasks' },
    { k:'all',      l:'All Tasks' },
  ],
  Meetings: [
    { k:'today',    l:"Today's Meetings" },
    { k:'this_week',l:'This Week' },
    { k:'upcoming', l:'All Upcoming' },
    { k:'my',       l:'My Meetings' },
    { k:'past',     l:'Completed' },
  ],
  Calls: [
    { k:'today',   l:"Today's Calls" },
    { k:'missed',  l:'Missed Calls', c:'var(--danger)' },
    { k:'inbound', l:'Inbound Calls' },
    { k:'outbound',l:'Outbound Calls' },
    { k:'scheduled',l:'Scheduled Calls' },
    { k:'all',     l:'All Calls' },
  ],
};

function ActivitiesModule() {
  const { TASKS, MEETINGS, CALL_LOGS } = window.AppData;
  const [tab, setTab] = useSt('Tasks');        // Tasks | Meetings | Calls
  const [view, setView] = useSt('list');        // list | kanban | calendar
  const [filter, setFilter] = useSt('all_open');
  const [selected, setSelected] = useSt([]);
  const [openItem, setOpenItem] = useSt(null);

  // Reset filter when switching tabs
  const onTab = (t) => { setTab(t); setFilter(TASK_FILTERS[t][0].k); setSelected([]); setOpenItem(null); };

  const counts = {
    Tasks: TASKS.filter(t=>t.status!=='Completed').length,
    Meetings: MEETINGS.filter(m=>m.status==='Scheduled').length,
    Calls: CALL_LOGS.length,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Top bar */}
      <div className="topbar">
        <h1>Activities</h1>
        <span className="crumb">Tasks · Meetings · Calls</span>
        <span className="spacer"/>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> AI đề xuất follow-up</button>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Import</button>
        <div className="btn-split">
          <button className="btn btn-primary"><Icon.Plus/> Create {tab.slice(0,-1)}</button>
        </div>
      </div>

      {/* Zoho-style sub-tabs */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:4, padding:'0 20px', background:'white', borderBottom:'1px solid var(--fill-04)', height:42 }}>
        {['Tasks','Meetings','Calls'].map(t => {
          const icons = { Tasks:<Icon.CheckSquare/>, Meetings:<Icon.Calendar/>, Calls:<Icon.Phone/> };
          const active = tab===t;
          return (
            <button key={t} onClick={()=>onTab(t)} style={{
              padding:'0 16px', height:42, background:'transparent', border:'none',
              borderBottom:'2px solid '+(active?'var(--primary)':'transparent'),
              color: active?'var(--primary)':'var(--label-02)',
              fontWeight:600, fontSize:13, cursor:'pointer', display:'inline-flex', gap:8, alignItems:'center'
            }}>
              {React.cloneElement(icons[t],{style:{width:14,height:14}})}
              {t}
              <span style={{
                fontSize:10.5, fontWeight:700, padding:'2px 6px', borderRadius:8,
                background: active?'var(--bg-green)':'var(--fill-03)',
                color: active?'var(--primary)':'var(--label-02)'
              }}>{counts[t]}</span>
            </button>
          );
        })}
        <span style={{flex:1}}/>
        {/* Views */}
        <div style={{ display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, marginBottom:6, gap:2 }}>
          {[
            {k:'list', i:<Icon.List/>, l:'List'},
            {k:'kanban', i:<Icon.Grid/>, l:'Kanban'},
            ...(tab!=='Calls'? [{k:'calendar', i:<Icon.Calendar/>, l:'Calendar'}]:[]),
          ].map(v => (
            <button key={v.k} onClick={()=>setView(v.k)} title={v.l} style={{
              padding:'4px 9px', border:'none', borderRadius:5, background: view===v.k?'white':'transparent',
              color: view===v.k?'var(--label-01)':'var(--label-02)', cursor:'pointer',
              boxShadow: view===v.k?'var(--shadow-sm)':'none', display:'inline-flex', gap:5, alignItems:'center', fontSize:11.5, fontWeight:600
            }}>
              {React.cloneElement(v.i,{style:{width:12,height:12}})}{v.l}
            </button>
          ))}
        </div>
      </div>

      {/* Zoho-style body: left filter rail + list + right detail */}
      <div style={{ flex:1, display:'flex', minHeight:0, background:'var(--fill-02)' }}>
        {/* Left filter rail */}
        <div style={{ width:232, background:'white', borderRight:'1px solid var(--fill-04)', padding:'14px 0', overflowY:'auto' }}>
          <div style={{ padding:'0 14px 6px', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)' }}>FILTER {tab.toUpperCase()} BY</span>
            <span style={{flex:1}}/>
            <button className="btn-icon" style={{width:20, height:20}} title="Tạo view"><Icon.Plus style={{width:12,height:12}}/></button>
          </div>
          {TASK_FILTERS[tab].map(f => {
            const active = filter===f.k;
            return (
              <button key={f.k} onClick={()=>setFilter(f.k)} style={{
                width:'100%', padding:'8px 14px', display:'flex', alignItems:'center', gap:8,
                border:'none', background: active?'var(--bg-green)':'transparent',
                borderLeft:'3px solid '+(active?'var(--primary)':'transparent'),
                cursor:'pointer', textAlign:'left', fontSize:12.5,
                fontWeight: active?600:500, color: active?'var(--pr-dark-2)':'var(--label-01)',
              }}>
                {f.c && <span style={{width:6, height:6, borderRadius:3, background:f.c}}/>}
                <span style={{flex:1}}>{f.l}</span>
              </button>
            );
          })}
          <div style={{ margin:'18px 14px 8px', paddingTop:12, borderTop:'1px solid var(--fill-04)' }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)', marginBottom:6 }}>FILTER BY FIELDS</div>
            {['Owner','Priority','Status','Due Date','Related Module','Channel','Tag'].map(f => (
              <div key={f} style={{ padding:'5px 0', fontSize:12, color:'var(--label-02)', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                <Icon.Plus style={{width:10,height:10}}/> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Center: list/kanban/calendar */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {/* List toolbar */}
          <div style={{ padding:'10px 16px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10 }}>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--label-02)', fontWeight:600 }}>
              <input type="checkbox" style={{accentColor:'var(--primary)'}}/>
              <span>{selected.length>0 ? selected.length+' selected' : 'Select All'}</span>
            </label>
            {selected.length>0 && (
              <>
                <button className="btn btn-ghost btn-sm"><Icon.Check/> Mark Complete</button>
                <button className="btn btn-ghost btn-sm"><Icon.User/> Assign</button>
                <button className="btn btn-ghost btn-sm"><Icon.Trash/> Delete</button>
                <button className="btn btn-ghost btn-sm">Mass Update</button>
              </>
            )}
            <span style={{flex:1}}/>
            <div style={{ position:'relative' }}>
              <Icon.Search style={{position:'absolute', left:8, top:7, width:13, height:13, color:'var(--label-03)'}}/>
              <input placeholder={'Search '+tab.toLowerCase()+'…'} style={{
                height:28, width:220, paddingLeft:28, paddingRight:8, border:'1px solid var(--fill-04)', borderRadius:6, fontSize:12, outline:'none'
              }}/>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon.Filter/> Filter</button>
            <button className="btn btn-ghost btn-sm"><Icon.Sort/> Sort</button>
            <button className="btn btn-ghost btn-sm" title="Columns"><Icon.Columns/></button>
          </div>

          <div className="scroll" style={{ flex:1, overflow:'auto' }}>
            {tab==='Tasks'    && view==='list'     && <TaskList items={filterTasks(TASKS, filter)} openItem={openItem} setOpenItem={setOpenItem} selected={selected} setSelected={setSelected}/>}
            {tab==='Tasks'    && view==='kanban'   && <TaskKanban items={TASKS}/>}
            {tab==='Tasks'    && view==='calendar' && <ActivityCalendar items={TASKS.map(t=>({id:t.id,title:t.subject,date:t.due,type:'task',priority:t.priority}))}/>}
            {tab==='Meetings' && view==='list'     && <MeetingList items={filterMeetings(MEETINGS, filter)} openItem={openItem} setOpenItem={setOpenItem}/>}
            {tab==='Meetings' && view==='kanban'   && <MeetingKanban items={MEETINGS}/>}
            {tab==='Meetings' && view==='calendar' && <ActivityCalendar items={MEETINGS.map(m=>({id:m.id,title:m.title,date:m.start.slice(0,10),type:'meeting'}))}/>}
            {tab==='Calls'    && view==='list'     && <CallList items={filterCalls(CALL_LOGS, filter)} openItem={openItem} setOpenItem={setOpenItem}/>}
            {tab==='Calls'    && view==='kanban'   && <CallKanban items={CALL_LOGS}/>}
          </div>
        </div>

        {/* Right detail panel */}
        {openItem && (
          <ActivityDetailPanel tab={tab} item={openItem} onClose={()=>setOpenItem(null)}/>
        )}
      </div>
    </div>
  );
}

function filterTasks(items, f) {
  if (f==='overdue')   return items.filter(t=>t.overdue && t.status!=='Completed');
  if (f==='today')     return items.filter(t=>t.dueLabel.includes('Hôm nay'));
  if (f==='completed') return items.filter(t=>t.status==='Completed');
  if (f==='high')      return items.filter(t=>t.priority==='High' || t.priority==='Highest');
  if (f==='all_open' || f==='my_open') return items.filter(t=>t.status!=='Completed');
  return items;
}
function filterMeetings(items, f) {
  if (f==='past')  return items.filter(m=>m.status==='Completed');
  if (f==='today') return items.filter(m=>m.dateLabel.startsWith('Hôm nay'));
  return items.filter(m=>m.status==='Scheduled');
}
function filterCalls(items, f) {
  if (f==='missed')   return items.filter(c=>c.status==='missed');
  if (f==='inbound')  return items.filter(c=>c.dir==='in');
  if (f==='outbound') return items.filter(c=>c.dir==='out');
  return items;
}

/* --- TASK LIST (Zoho list view) --- */
function TaskList({ items, openItem, setOpenItem, selected, setSelected }) {
  const tog = (id) => setSelected(s => s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const priorityPill = (p) => {
    const c = p==='Highest' ? '#C8263A' : p==='High' ? '#E8553D' : p==='Normal' ? '#2B9EF3' : '#6B7280';
    return <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:c}}>
      <span style={{width:6,height:6,borderRadius:3,background:c}}/>{p}
    </span>;
  };
  const statusPill = (s) => {
    const m = { 'Not Started':{bg:'#F4F4F5',c:'#52525B'}, 'In Progress':{bg:'#FEF3C7',c:'#92400E'},
                'Waiting for Input':{bg:'#DBEAFE',c:'#1E40AF'}, 'Completed':{bg:'rgba(45,197,106,.15)',c:'#0F5E33'},
                'Deferred':{bg:'#F4F4F5',c:'#52525B'} };
    const x = m[s] || m['Not Started'];
    return <span style={{background:x.bg, color:x.c, padding:'3px 8px', borderRadius:10, fontSize:11, fontWeight:600}}>{s}</span>;
  };
  return (
    <div style={{ background:'white' }}>
      <div style={{
        display:'grid', gridTemplateColumns:'32px 2.2fr 150px 140px 110px 1.4fr 110px 110px',
        gap:10, padding:'10px 16px', fontSize:11, color:'var(--label-02)', fontWeight:700,
        textTransform:'uppercase', letterSpacing:.4, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)',
        position:'sticky', top:0, zIndex:1
      }}>
        <span/>
        <span>Subject</span>
        <span>Due Date</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Related To</span>
        <span>Contact</span>
        <span>Owner</span>
      </div>
      {items.map(t => {
        const active = openItem && openItem.id===t.id;
        return (
          <div key={t.id} onClick={()=>setOpenItem(t)} style={{
            display:'grid', gridTemplateColumns:'32px 2.2fr 150px 140px 110px 1.4fr 110px 110px',
            gap:10, padding:'12px 16px', fontSize:13, alignItems:'center',
            borderBottom:'1px solid var(--fill-04)', cursor:'pointer',
            background: active?'var(--bg-green)':'white'
          }} onMouseEnter={e=>{if(!active) e.currentTarget.style.background='var(--fill-02)'}} onMouseLeave={e=>{if(!active) e.currentTarget.style.background='white'}}>
            <div onClick={(e)=>{e.stopPropagation(); tog(t.id);}}>
              <input type="checkbox" checked={selected.includes(t.id)} onChange={()=>{}} style={{accentColor:'var(--primary)'}}/>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:600, color:'var(--primary)', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                {t.owner==='AI Agent' && <span className="chip green" style={{height:16, fontSize:9.5, padding:'0 5px'}}><Icon.Sparkles style={{width:9,height:9}}/>AI</span>}
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--label-03)', fontFamily:'monospace' }}>{t.id}</div>
            </div>
            <div style={{fontSize:12}}>
              <div style={{ color: t.overdue?'var(--danger)':'var(--label-01)', fontWeight: t.overdue?600:500 }}>{t.dueLabel}</div>
              <div style={{fontSize:10.5, color:'var(--label-03)'}}>{t.due}</div>
            </div>
            <div>{statusPill(t.status)}</div>
            <div>{priorityPill(t.priority)}</div>
            <div style={{fontSize:12, minWidth:0}}>
              <div style={{fontSize:10, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.4}}>{t.relatedTo.type}</div>
              <div style={{ fontWeight:500, overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap', color:'var(--info)' }}>{t.relatedTo.name}</div>
            </div>
            <div style={{fontSize:12}}>{t.contact}</div>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <div className="avatar sm" style={{background: t.owner==='AI Agent'?'var(--grad-signature)':'hsl('+((t.owner||'').length*34)%360+' 50% 48%)', width:22, height:22, fontSize:10}}>
                {t.owner==='AI Agent' ? '✦' : (t.owner||'?')[0]}
              </div>
              <span style={{fontSize:12}}>{t.owner}</span>
            </div>
          </div>
        );
      })}
      {items.length===0 && <div style={{padding:60, textAlign:'center', color:'var(--label-03)'}}>Không có task nào khớp bộ lọc.</div>}
    </div>
  );
}

/* --- TASK KANBAN --- */
function TaskKanban({ items }) {
  const cols = ['Not Started','In Progress','Waiting for Input','Completed','Deferred'];
  const colColors = { 'Not Started':'#6B7280', 'In Progress':'#F59E0B', 'Waiting for Input':'#2B9EF3', 'Completed':'var(--primary)', 'Deferred':'#94A3B8' };
  return (
    <div style={{ padding:16, display:'grid', gridTemplateColumns:`repeat(${cols.length}, minmax(240px, 1fr))`, gap:12, minHeight:'100%' }}>
      {cols.map(col => {
        const list = items.filter(t=>t.status===col);
        return (
          <div key={col} style={{ background:'var(--fill-02)', borderRadius:10, padding:10, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 4px 6px' }}>
              <span style={{ width:8, height:8, borderRadius:4, background:colColors[col] }}/>
              <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.4 }}>{col}</span>
              <span style={{ fontSize:11, color:'var(--label-03)' }}>{list.length}</span>
              <span style={{flex:1}}/>
              <button className="btn-icon" style={{width:20,height:20}}><Icon.Plus style={{width:12,height:12}}/></button>
            </div>
            {list.map(t => (
              <div key={t.id} className="card" style={{ padding:10 }}>
                <div style={{fontSize:10.5, color:'var(--label-03)', fontFamily:'monospace', marginBottom:4}}>{t.id}</div>
                <div style={{ fontWeight:600, fontSize:12.5, lineHeight:1.4, marginBottom:6 }}>{t.subject}</div>
                <div style={{ fontSize:10.5, color: t.overdue?'var(--danger)':'var(--label-02)', marginBottom:8 }}>
                  <Icon.Clock style={{width:10,height:10, verticalAlign:'middle'}}/> {t.dueLabel}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:10, padding:'1px 6px', borderRadius:8, background: t.priority==='Highest'||t.priority==='High'?'rgba(232,85,61,.15)':'var(--fill-03)', color: t.priority==='Highest'||t.priority==='High'?'#E8553D':'var(--label-02)', fontWeight:600}}>{t.priority}</span>
                  <span style={{flex:1}}/>
                  <div className="avatar sm" style={{background:'hsl('+((t.owner||'').length*34)%360+' 50% 48%)', width:20, height:20, fontSize:9.5}}>{(t.owner||'?')[0]}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* --- MEETING LIST --- */
function MeetingList({ items, openItem, setOpenItem }) {
  return (
    <div style={{ background:'white' }}>
      <div style={{
        display:'grid', gridTemplateColumns:'2.4fr 180px 150px 1.4fr 1.2fr 100px 110px',
        gap:10, padding:'10px 16px', fontSize:11, color:'var(--label-02)', fontWeight:700,
        textTransform:'uppercase', letterSpacing:.4, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)'
      }}>
        <span>Title</span><span>From → To</span><span>Location</span><span>Related To</span><span>Participants</span><span>Host</span><span>Action</span>
      </div>
      {items.map(m => {
        const active = openItem && openItem.id===m.id;
        return (
          <div key={m.id} onClick={()=>setOpenItem(m)} style={{
            display:'grid', gridTemplateColumns:'2.4fr 180px 150px 1.4fr 1.2fr 100px 110px',
            gap:10, padding:'14px 16px', fontSize:13, alignItems:'center',
            borderBottom:'1px solid var(--fill-04)', cursor:'pointer',
            background: active?'var(--bg-green)':'white'
          }}>
            <div>
              <div style={{fontWeight:600, color:'var(--primary)'}}>{m.title}</div>
              <div style={{fontSize:11, color:'var(--label-03)', display:'flex', gap:8, marginTop:2}}>
                <span className="chip outline" style={{height:16, fontSize:9.5, padding:'0 5px'}}>{m.type}</span>
                <span style={{fontFamily:'monospace'}}>{m.id}</span>
              </div>
            </div>
            <div style={{fontSize:12}}>{m.dateLabel}</div>
            <div style={{fontSize:12, display:'flex', alignItems:'center', gap:5}}>
              <Icon.Video style={{width:12, height:12, color:'var(--info)'}}/>{m.location}
            </div>
            <div style={{fontSize:12}}>
              <div style={{fontSize:10, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.4}}>{m.relatedTo.type}</div>
              <div style={{color:'var(--info)', fontWeight:500}}>{m.relatedTo.name}</div>
            </div>
            <div style={{fontSize:12, color:'var(--label-02)'}}>{m.participants.join(', ')}</div>
            <div style={{fontSize:12}}>{m.host}</div>
            <div style={{display:'flex', gap:4}} onClick={e=>e.stopPropagation()}>
              <button className="btn btn-primary btn-sm">Join</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MeetingKanban({ items }) {
  const cols = ['Scheduled','In Progress','Completed','Cancelled'];
  return (
    <div style={{ padding:16, display:'grid', gridTemplateColumns:`repeat(${cols.length}, minmax(240px,1fr))`, gap:12 }}>
      {cols.map(col => (
        <div key={col} style={{ background:'var(--fill-02)', borderRadius:10, padding:10 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.4, marginBottom:8 }}>
            {col} <span style={{color:'var(--label-03)'}}>{items.filter(m=>m.status===col).length}</span>
          </div>
          {items.filter(m=>m.status===col).map(m => (
            <div key={m.id} className="card" style={{padding:10, marginBottom:8}}>
              <div style={{fontWeight:600, fontSize:12.5, marginBottom:4}}>{m.title}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>{m.dateLabel}</div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:4}}>{m.location} · {m.host}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* --- CALL LIST (Zoho-style) --- */
function CallList({ items, openItem, setOpenItem }) {
  return (
    <div style={{ background:'white' }}>
      <div style={{
        display:'grid', gridTemplateColumns:'32px 1.8fr 90px 110px 110px 90px 2.2fr 120px',
        gap:10, padding:'10px 16px', fontSize:11, color:'var(--label-02)', fontWeight:700,
        textTransform:'uppercase', letterSpacing:.4, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)'
      }}>
        <span/><span>Contact</span><span>Channel</span><span>Type</span><span>Status</span><span>Duration</span><span>AI Summary</span><span>Actions</span>
      </div>
      {items.map(l => {
        const active = openItem && openItem.id===l.id;
        return (
          <div key={l.id} onClick={()=>setOpenItem(l)} style={{
            display:'grid', gridTemplateColumns:'32px 1.8fr 90px 110px 110px 90px 2.2fr 120px',
            gap:10, padding:'14px 16px', fontSize:13, alignItems:'center',
            borderBottom:'1px solid var(--fill-04)', cursor:'pointer',
            background: active?'var(--bg-green)':'white'
          }}>
            <input type="checkbox" style={{accentColor:'var(--primary)'}}/>
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              <div className="avatar sm" style={{background:'hsl('+(l.name.length*24)%360+' 50% 48%)', width:30, height:30, fontSize:11}}>{l.name.split(' ').slice(-1)[0][0]}</div>
              <div>
                <div style={{fontWeight:600, color:'var(--primary)'}}>{l.name}</div>
                <div style={{fontSize:11, color:'var(--label-03)'}}>{l.time}</div>
              </div>
            </div>
            <div><ChannelBadge name={l.channel} size={18}/></div>
            <div style={{fontSize:12, display:'inline-flex', alignItems:'center', gap:4, color: l.dir==='in'?'#2B9EF3':'var(--primary)', fontWeight:600}}>
              {l.dir==='in' ? '↓ Inbound' : '↑ Outbound'}
            </div>
            <div>
              {l.status==='answered'
                ? <span style={{background:'rgba(45,197,106,.15)', color:'#0F5E33', padding:'3px 8px', borderRadius:10, fontSize:11, fontWeight:600}}>Answered</span>
                : <span style={{background:'rgba(232,85,61,.15)', color:'#C8263A', padding:'3px 8px', borderRadius:10, fontSize:11, fontWeight:600}}>Missed</span>}
            </div>
            <div style={{fontFamily:'monospace', fontSize:12}}>{l.duration}</div>
            <div style={{fontSize:12, color:'var(--label-02)', display:'flex', gap:6, alignItems:'flex-start'}}>
              <Icon.Sparkles style={{width:12,height:12, color:'var(--primary)', flexShrink:0, marginTop:2}}/>
              <span style={{lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>{l.summary}</span>
            </div>
            <div style={{display:'flex', gap:4}} onClick={e=>e.stopPropagation()}>
              {l.recording && <button className="btn-icon" title="Play recording"><Icon.Play style={{width:12, height:12}}/></button>}
              <button className="btn-icon" title="Call back"><Icon.Phone/></button>
              <button className="btn-icon" title="Create task"><Icon.Plus/></button>
              <button className="btn-icon"><Icon.More/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CallKanban({ items }) {
  const cols = [
    { k:'in_answered',  l:'Inbound Answered', f:c=>c.dir==='in'  && c.status==='answered' },
    { k:'out_answered', l:'Outbound Answered',f:c=>c.dir==='out' && c.status==='answered' },
    { k:'missed',       l:'Missed',           f:c=>c.status==='missed' },
  ];
  return (
    <div style={{padding:16, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
      {cols.map(col => (
        <div key={col.k} style={{ background:'var(--fill-02)', borderRadius:10, padding:10 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.4, marginBottom:8 }}>{col.l}</div>
          {items.filter(col.f).map(c => (
            <div key={c.id} className="card" style={{padding:10, marginBottom:8}}>
              <div style={{fontWeight:600, fontSize:12.5}}>{c.name}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>{c.time} · {c.duration}</div>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{c.summary}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* --- CALENDAR --- */
function ActivityCalendar({ items }) {
  // Simple month grid — Apr 2026
  const dayCount = 30, start = 2; // Apr 1 is Wednesday (index 3 if Sun=0). Using 2 = Tue for simplicity
  const today = 20;
  const map = {};
  items.forEach(i => { const d = parseInt(i.date.slice(-2),10); if(!map[d]) map[d]=[]; map[d].push(i); });
  return (
    <div style={{ padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <h2 style={{margin:0, fontSize:18, fontWeight:700}}>April 2026</h2>
        <button className="btn btn-ghost btn-sm">←</button>
        <button className="btn btn-ghost btn-sm">Today</button>
        <button className="btn btn-ghost btn-sm">→</button>
        <span style={{flex:1}}/>
        <div style={{display:'flex', gap:4, fontSize:11, color:'var(--label-02)'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:4,background:'var(--primary)'}}/>Task</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:4,background:'var(--info)'}}/>Meeting</span>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', background:'white', border:'1px solid var(--fill-04)', borderRadius:10, overflow:'hidden' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ padding:'8px 10px', fontSize:11, fontWeight:700, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.4, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)' }}>{d}</div>
        ))}
        {Array.from({length: start}).map((_,i)=>(
          <div key={'e'+i} style={{ minHeight:96, background:'var(--fill-02)', borderRight:'1px solid var(--fill-04)', borderBottom:'1px solid var(--fill-04)'}}/>
        ))}
        {Array.from({length: dayCount}).map((_,i)=>{
          const d = i+1; const isToday = d===today; const evs = map[d]||[];
          return (
            <div key={d} style={{
              minHeight:96, padding:6, borderRight:'1px solid var(--fill-04)', borderBottom:'1px solid var(--fill-04)',
              background: isToday?'var(--bg-green)':'white', position:'relative'
            }}>
              <div style={{ fontSize:12, fontWeight:isToday?800:600, color:isToday?'var(--primary)':'var(--label-01)' }}>{d}</div>
              {evs.slice(0,3).map((e,j)=>(
                <div key={j} style={{
                  marginTop:3, padding:'2px 5px', borderRadius:4, fontSize:10.5,
                  background: e.type==='task' ? 'rgba(45,197,106,.15)' : 'rgba(43,158,243,.15)',
                  color: e.type==='task' ? 'var(--pr-dark-2)' : '#1E40AF',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500
                }}>{e.title}</div>
              ))}
              {evs.length>3 && <div style={{fontSize:10, color:'var(--label-03)', marginTop:2}}>+{evs.length-3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- DETAIL RIGHT PANEL --- */
function ActivityDetailPanel({ tab, item, onClose }) {
  return (
    <div style={{ width:380, background:'white', borderLeft:'1px solid var(--fill-04)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:8, background:'var(--bg-green)', display:'grid', placeItems:'center', color:'var(--primary)' }}>
          {tab==='Tasks' ? <Icon.CheckSquare/> : tab==='Meetings' ? <Icon.Calendar/> : <Icon.Phone/>}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:10.5, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.4}}>{tab.slice(0,-1)}</div>
          <div style={{fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {item.subject || item.title || item.name}
          </div>
        </div>
        <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
      </div>
      <div className="scroll" style={{ flex:1, overflow:'auto', padding:'14px 16px' }}>
        {/* AI box */}
        <div style={{ padding:12, borderRadius:10, background:'linear-gradient(135deg, rgba(45,197,106,.08), rgba(43,158,243,.06))', border:'1px solid rgba(45,197,106,.2)', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <Icon.Sparkles style={{width:14,height:14, color:'var(--primary)'}}/>
            <span className="ai-gradient-text" style={{fontWeight:700, fontSize:12}}>Zia AI · Next best action</span>
          </div>
          <div style={{ fontSize:12, lineHeight:1.5, color:'var(--label-01)' }}>
            {tab==='Tasks' && 'Khách thường phản hồi tốt sau tin nhắn Zalo ngắn. Gợi ý: gửi template "Nhắc đơn hàng" rồi tạo follow-up sau 24h.'}
            {tab==='Meetings' && 'Đã gửi tự động agenda + link join trước 10 phút. Sau meeting Zia sẽ tóm tắt và tạo task follow-up.'}
            {tab==='Calls' && 'Zia đã transcribe cuộc gọi và phát hiện ý định "khiếu nại giao nhầm" → gợi ý tạo ticket + hoàn tiền.'}
          </div>
          <div style={{display:'flex', gap:6, marginTop:8}}>
            <button className="btn btn-primary btn-sm" style={{flex:1}}>Áp dụng</button>
            <button className="btn btn-ghost btn-sm">Bỏ qua</button>
          </div>
        </div>

        {/* Details grid */}
        <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, textTransform:'uppercase', marginBottom:8}}>Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'110px 1fr', rowGap:10, fontSize:12.5 }}>
          {tab==='Tasks' && <>
            <div style={{color:'var(--label-02)'}}>Due Date</div><div style={{fontWeight:500, color:item.overdue?'var(--danger)':'var(--label-01)'}}>{item.dueLabel}</div>
            <div style={{color:'var(--label-02)'}}>Status</div><div>{item.status}</div>
            <div style={{color:'var(--label-02)'}}>Priority</div><div>{item.priority}</div>
            <div style={{color:'var(--label-02)'}}>Related To</div><div style={{color:'var(--info)'}}>{item.relatedTo.type} · {item.relatedTo.name}</div>
            <div style={{color:'var(--label-02)'}}>Contact</div><div>{item.contact}</div>
            <div style={{color:'var(--label-02)'}}>Owner</div><div>{item.owner}</div>
            <div style={{color:'var(--label-02)'}}>Reminder</div><div>30 phút trước · Zalo + Email</div>
            <div style={{color:'var(--label-02)'}}>Repeat</div><div>None</div>
          </>}
          {tab==='Meetings' && <>
            <div style={{color:'var(--label-02)'}}>From → To</div><div>{item.dateLabel}</div>
            <div style={{color:'var(--label-02)'}}>Location</div><div>{item.location}</div>
            <div style={{color:'var(--label-02)'}}>Host</div><div>{item.host}</div>
            <div style={{color:'var(--label-02)'}}>Participants</div><div>{item.participants.join(', ')}</div>
            <div style={{color:'var(--label-02)'}}>Related To</div><div style={{color:'var(--info)'}}>{item.relatedTo.type} · {item.relatedTo.name}</div>
            <div style={{color:'var(--label-02)'}}>Status</div><div>{item.status}</div>
          </>}
          {tab==='Calls' && <>
            <div style={{color:'var(--label-02)'}}>Contact</div><div>{item.name}</div>
            <div style={{color:'var(--label-02)'}}>Channel</div><div>{item.channel}</div>
            <div style={{color:'var(--label-02)'}}>Direction</div><div>{item.dir==='in'?'Inbound':'Outbound'}</div>
            <div style={{color:'var(--label-02)'}}>Duration</div><div style={{fontFamily:'monospace'}}>{item.duration}</div>
            <div style={{color:'var(--label-02)'}}>Status</div><div>{item.status==='answered'?'Answered':'Missed'}</div>
            <div style={{color:'var(--label-02)'}}>AI Summary</div><div>{item.summary}</div>
          </>}
        </div>

        {/* Timeline */}
        <div style={{ fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, textTransform:'uppercase', margin:'18px 0 8px' }}>Timeline</div>
        <div style={{ fontSize:12, color:'var(--label-02)', display:'grid', gap:8 }}>
          {[
            {t:'09:12', e:'Created by Minh'},
            {t:'09:45', e:'Status → In Progress'},
            {t:'10:30', e:'Zia AI gửi tin nhắn template'},
            {t:'11:05', e:'Khách trả lời — đã cập nhật note'},
          ].map((x,i) => (
            <div key={i} style={{ display:'flex', gap:8 }}>
              <div style={{width:56, fontFamily:'monospace', color:'var(--label-03)'}}>{x.t}</div>
              <div style={{flex:1}}>{x.e}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:'10px 14px', borderTop:'1px solid var(--fill-04)', display:'flex', gap:6}}>
        <button className="btn btn-ghost btn-sm" style={{flex:1}}><Icon.Edit/> Edit</button>
        <button className="btn btn-ghost btn-sm" style={{flex:1}}><Icon.MessageSquare/> Note</button>
        <button className="btn btn-primary btn-sm" style={{flex:1}}><Icon.Check/> Complete</button>
      </div>
    </div>
  );
}

function TicketBoard({ tickets }) {
  const cols = [
    { key:'open', label:'Mở', color:'var(--info)' },
    { key:'in_progress', label:'Đang xử lý', color:'var(--warning)' },
    { key:'waiting', label:'Chờ khách', color:'var(--premium)' },
    { key:'resolved', label:'Đã giải quyết', color:'var(--success)' },
  ];
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[
          {l:'Tổng ticket', v:'428', d:'+12% tuần này'},
          {l:'SLA đạt', v:'94.2%', d:'Mục tiêu 90%'},
          {l:'Thời gian xử lý TB', v:'3h 12m', d:'-45m so với Q1'},
          {l:'AI tự xử lý', v:'38%', d:'164 / 428 ticket'},
        ].map(k => (
          <div key={k.l} className="card" style={{ flex:1, padding:14 }}>
            <div style={{ fontSize:12, color:'var(--label-02)' }}>{k.l}</div>
            <div style={{ fontSize:24, fontWeight:800, color:'var(--label-01)', marginTop:2 }}>{k.v}</div>
            <div style={{ fontSize:11, color:'var(--label-03)' }}>{k.d}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
        {cols.map(col => (
          <div key={col.key}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 4px 10px', fontSize:12, fontWeight:700 }}>
              <span style={{ width:8, height:8, borderRadius:4, background:col.color }}/>
              <span style={{textTransform:'uppercase', letterSpacing:.5}}>{col.label}</span>
              <span style={{color:'var(--label-03)'}}>{tickets.filter(t=>t.status===col.key).length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {tickets.filter(t=>t.status===col.key).map(t => (
                <div key={t.id} className="card" style={{ padding:12, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:'var(--label-02)', fontFamily:'monospace', fontWeight:600 }}>{t.id}</span>
                    <span className={'chip '+(t.priority==='high'?'red':t.priority==='medium'?'yellow':'outline')} style={{height:18, fontSize:10}}>
                      {t.priority}
                    </span>
                  </div>
                  <div style={{ fontWeight:600, fontSize:13, lineHeight:1.4, marginBottom:8 }}>{t.title}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--label-02)', marginBottom:8 }}>
                    <ChannelBadge name={t.channel} size={14}/>
                    <span>{t.customer}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    {t.assignee==='AI Agent'
                      ? <span className="chip green" style={{fontSize:10, height:18}}><Icon.Sparkles style={{width:10,height:10}}/> AI</span>
                      : <span className="chip" style={{fontSize:10, height:18}}>{t.assignee}</span>}
                    <span style={{fontSize:10.5, color:'var(--label-03)'}}><Icon.Clock style={{width:10,height:10, verticalAlign:'middle'}}/> {t.age}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleList({ schedules }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <h2 style={{margin:0, fontSize:18}}>Thứ hai · 20/04/2026</h2>
          <span className="chip green">{schedules.filter(s=>s.date==='Hôm nay').length} lịch hôm nay</span>
          <span style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm">← Tuần trước</button>
          <button className="btn btn-ghost btn-sm">Tuần này</button>
          <button className="btn btn-ghost btn-sm">Tuần sau →</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {schedules.map(e => (
            <div key={e.id} className="card" style={{ padding:14, display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ textAlign:'center', minWidth:76 }}>
                <div style={{ fontSize:11, color:'var(--label-02)', textTransform:'uppercase' }}>{e.date.split(',')[0]}</div>
                <div style={{ fontSize:16, fontWeight:800 }}>{e.time.split(' — ')[0]}</div>
                <div style={{ fontSize:10, color:'var(--label-03)' }}>{e.time.split(' — ')[1]}</div>
              </div>
              <div style={{ width:3, height:48, background: e.type==='meeting'?'var(--primary)':'var(--info)', borderRadius:2 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{e.title}</div>
                <div style={{ fontSize:11.5, color:'var(--label-02)', display:'flex', gap:10, alignItems:'center' }}>
                  <span>{e.type==='meeting' ? <Icon.Video style={{width:12,height:12, verticalAlign:'middle'}}/> : <Icon.Phone style={{width:12,height:12, verticalAlign:'middle'}}/>} {e.channel}</span>
                  <span>·</span>
                  <span>{e.attendees.join(', ')}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-sm">Tham gia</button>
              <button className="btn-icon"><Icon.More/></button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:'var(--grad-signature)', display:'grid', placeItems:'center' }}>
              <Icon.Sparkles style={{width:14, height:14, color:'white'}}/>
            </div>
            <div style={{ fontWeight:700, fontSize:13 }} className="ai-gradient-text">AI gợi ý hôm nay</div>
          </div>
          <div style={{ fontSize:12.5, lineHeight:1.6, color:'var(--label-01)' }}>
            • <b>Chị Lan</b> chưa mở tin sau 2 ngày — nên gọi lại lúc <b>11h</b> (thời điểm khách hay online)<br/>
            • <b>Yiwu Home Goods</b> sắp hết hợp đồng — đặt lịch ký lại<br/>
            • 3 khách VIP chưa liên hệ &gt; 30 ngày — gợi ý campaign
          </div>
        </div>
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontWeight:700, marginBottom:10, fontSize:13 }}>Công cụ nhanh</div>
          <div style={{ display:'grid', gap:6 }}>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:'flex-start'}}><Icon.Video/> Tạo AppChat Meet</button>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:'flex-start'}}><Icon.Calendar/> Gửi link đặt lịch</button>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:'flex-start'}}><Icon.Phone/> Khởi tạo cuộc gọi</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallLogList({ logs }) {
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[
          {l:'Cuộc gọi hôm nay', v:'24', c:'var(--info)'},
          {l:'Đã tiếp', v:'19', c:'var(--success)'},
          {l:'Nhỡ', v:'5', c:'var(--error)'},
          {l:'Tổng thời lượng', v:'2h 14m', c:'var(--label-01)'},
        ].map(k => (
          <div key={k.l} className="card" style={{ flex:1, padding:14 }}>
            <div style={{ fontSize:12, color:'var(--label-02)' }}>{k.l}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.c, marginTop:2 }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{ display:'grid', gridTemplateColumns:'2fr 80px 80px 1fr 80px 3fr 100px', gap:12, padding:'12px 16px', fontSize:11.5, color:'var(--label-02)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)' }}>
          <div>Liên hệ</div><div>Kênh</div><div>Hướng</div><div>Trạng thái</div><div>Thời lượng</div><div>AI Tóm tắt</div><div>Hành động</div>
        </div>
        {logs.map(l => (
          <div key={l.id} style={{ display:'grid', gridTemplateColumns:'2fr 80px 80px 1fr 80px 3fr 100px', gap:12, padding:'14px 16px', fontSize:13, alignItems:'center', borderBottom:'1px solid var(--fill-04)' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div className="avatar sm" style={{ background:'hsl('+(l.name.length*24)%360+' 50% 48%)' }}>{l.name.split(' ').slice(-1)[0][0]}</div>
              <div>
                <div style={{ fontWeight:600 }}>{l.name}</div>
                <div style={{ fontSize:11, color:'var(--label-02)' }}>{l.time}</div>
              </div>
            </div>
            <div><ChannelBadge name={l.channel} size={18}/></div>
            <div style={{fontSize:12, color: l.dir==='in'?'var(--info)':'var(--primary)'}}>
              {l.dir==='in' ? '↓ Đến' : '↑ Đi'}
            </div>
            <div>
              {l.status==='answered' ? <span className="chip green">Đã tiếp</span> : <span className="chip red">Nhỡ</span>}
            </div>
            <div style={{fontFamily:'monospace', fontSize:12}}>{l.duration}</div>
            <div style={{ fontSize:12, color:'var(--label-02)', display:'flex', gap:6, alignItems:'flex-start' }}>
              <Icon.Sparkles style={{width:12,height:12, color:'var(--primary)', flexShrink:0, marginTop:2}}/>
              <span style={{lineHeight:1.4}}>{l.summary}</span>
            </div>
            <div style={{display:'flex', gap:4}}>
              {l.recording && <button className="btn-icon" title="Nghe ghi âm"><Icon.Play style={{width:14, height:14}}/></button>}
              <button className="btn-icon"><Icon.Phone/></button>
              <button className="btn-icon"><Icon.More/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ BROADCAST ============ */
function BroadcastModule() {
  const { CAMPAIGNS } = window.AppData;
  const [showStudio, setShowStudio] = useSt(false);
  const [showJourney, setShowJourney] = useSt(false);
  const [showWizard, setShowWizard] = useSt(false);
  const [tab, setTab] = useSt('campaigns'); // campaigns | approvals
  const pendingCount = 4;
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {showStudio && window.TemplateStudio && <window.TemplateStudio onClose={()=>setShowStudio(false)}/>}
      {showJourney && window.JourneyBuilder && <window.JourneyBuilder onClose={()=>setShowJourney(false)}/>}
      {showWizard && <CampaignWizard onClose={()=>setShowWizard(false)}/>}
      <div className="topbar">
        <h1>Broadcast</h1>
        <span className="crumb">Gửi chiến dịch đa kênh · Email · ZNS · SMS · Zalo OA · Facebook</span>
        <span className="spacer"/>
        <button className="btn btn-ghost" onClick={()=>setShowStudio(true)}><Icon.Palette/> Template Studio</button>
        <button className="btn btn-ghost" onClick={()=>setShowJourney(true)}><Icon.Route/> Journey Builder</button>
        <button className="btn btn-ghost"><Icon.Sparkles/> AI gợi ý campaign</button>
        <button className="btn btn-primary" onClick={()=>setShowWizard(true)}><Icon.Plus/> Tạo chiến dịch</button>
      </div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:0, padding:'0 28px', background:'white', borderBottom:'1px solid var(--fill-04)' }}>
        {[
          {k:'campaigns', l:'Tất cả chiến dịch', icon: Icon.Bell || Icon.Send},
          {k:'approvals', l:'Duyệt & phê duyệt',  icon: Icon.Shield, n: pendingCount, dot:true},
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'12px 16px', background:'none', border:'none',
            borderBottom:'2px solid '+(tab===t.k?'var(--primary)':'transparent'),
            color: tab===t.k?'var(--label-01)':'var(--label-02)', fontWeight: tab===t.k?700:500,
            fontSize:13, cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:8
          }}>
            {t.icon && <t.icon style={{width:14, height:14}}/>}
            {t.l}
            {t.n != null && <span style={{background:t.dot?'var(--risk,#E33F3F)':'var(--fill-03)', color:t.dot?'white':'var(--label-02)', padding:'1px 7px', borderRadius:10, fontSize:10.5, fontWeight:700}}>{t.n}</span>}
          </button>
        ))}
      </div>

      {tab==='approvals' ? <BroadcastApprovals/> : <BroadcastCampaigns campaigns={CAMPAIGNS}/>}
    </div>
  );
}

function BroadcastCampaigns({ campaigns }) {
  return (
      <div className="scroll" style={{ flex:1, padding:'20px 28px', background:'var(--fill-02)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
          {[
            {l:'Chiến dịch tháng này', v:'18', s:'4 đang chạy', c:'var(--primary)'},
            {l:'Tin đã gửi', v:'248,420', s:'Open rate 68%', c:'var(--info)'},
            {l:'Click rate', v:'24.8%', s:'+6.2% vs Q1', c:'var(--warning)'},
            {l:'Doanh thu attributed', v:'312M₫', s:'ROI 4.8×', c:'var(--success)'},
          ].map(k => (
            <div key={k.l} className="card" style={{ padding:16 }}>
              <div style={{ fontSize:12, color:'var(--label-02)' }}>{k.l}</div>
              <div style={{ fontSize:28, fontWeight:800, color:k.c, lineHeight:1.2, marginTop:2 }}>{k.v}</div>
              <div style={{ fontSize:11, color:'var(--label-03)' }}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* AI recommend */}
        <div className="card" style={{
          padding:16, marginBottom:20,
          background:'linear-gradient(135deg, rgba(45,197,106,.05), rgba(43,158,243,.04))',
          borderColor:'rgba(45,197,106,.2)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white' }}>
              <Icon.Sparkles style={{width:16, height:16}}/>
            </div>
            <div style={{ fontWeight:700 }} className="ai-gradient-text">AI Campaign Optimizer</div>
            <span className="chip outline" style={{marginLeft:'auto'}}>3 đề xuất mới</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            {[
              {t:'Gửi lại Flash Sale cho 420 khách chưa mở', exp:'+18M₫ ước tính', ch:'ZNS'},
              {t:'Personalize email Hè 2026 theo phân khúc', exp:'CTR ~32% (vs 24%)', ch:'Email'},
              {t:'Cross-sell combo phụ kiện cho khách đã mua áo', exp:'AOV +23%', ch:'SMS'},
            ].map((s,i) => (
              <div key={i} style={{ background:'white', border:'1px solid var(--fill-04)', borderRadius:10, padding:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span className="chip green" style={{height:18, fontSize:10}}>{s.ch}</span>
                  <span style={{fontSize:10.5, color:'var(--label-03)'}}>{s.exp}</span>
                </div>
                <div style={{ fontSize:12.5, fontWeight:600, marginBottom:8, lineHeight:1.4 }}>{s.t}</div>
                <button className="btn btn-ghost btn-sm" style={{width:'100%', justifyContent:'center'}}>Áp dụng</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontWeight:700, fontSize:15, marginBottom:10 }}>Tất cả chiến dịch</div>
        <div style={{ display:'grid', gap:10 }}>
          {campaigns.map(c => (
            <div key={c.id} className="card" style={{ padding:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 120px', gap:16, alignItems:'center' }}>
                <div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                    <ChannelBadge name={c.channel==='zns'?'zns':c.channel==='email'?'email':'sms'} size={18}/>
                    <span style={{ fontWeight:700, fontSize:14 }}>{c.name}</span>
                    {c.status==='running' && <span className="chip green"><span className="dot" style={{background:'var(--success)', width:6, height:6, borderRadius:3, display:'inline-block'}}/> Đang chạy</span>}
                    {c.status==='scheduled' && <span className="chip blue">Hẹn giờ · {c.when}</span>}
                    {c.status==='completed' && <span className="chip">Đã xong</span>}
                    {c.status==='draft' && <span className="chip yellow">Nháp</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--label-02)' }}>{c.segment}</div>
                </div>
                <Metric label="Đã gửi" v={c.sent.toLocaleString()}/>
                <Metric label="Mở" v={c.open.toLocaleString()} sub={c.sent?Math.round(c.open/c.sent*100)+'%':'—'}/>
                <Metric label="Click" v={c.click.toLocaleString()} sub={c.open?Math.round(c.click/c.open*100)+'%':'—'}/>
                <Metric label="Doanh thu" v={c.revenue} color="var(--primary)"/>
                <div style={{ textAlign:'right' }}>
                  {c.status==='running' ? <button className="btn btn-ghost btn-sm"><Icon.Pause/> Pause</button>
                   : c.status==='draft' ? <button className="btn btn-primary btn-sm">Gửi</button>
                   : <button className="btn btn-ghost btn-sm">Xem</button>}
                </div>
              </div>
              {c.progress > 0 && c.progress < 100 && (
                <div style={{ marginTop:10, height:4, background:'var(--fill-03)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ width:`${c.progress}%`, height:'100%', background:'var(--primary)' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
  );
}

/* ============ BROADCAST APPROVALS ============ */
function BroadcastApprovals() {
  const [selected, setSelected] = useSt('apv_01');
  const [filter, setFilter] = useSt('pending'); // pending | approved | rejected | all
  const [showAudit, setShowAudit] = useSt(false);

  const APPROVALS = [
    {
      id:'apv_01', name:'ZNS — Xác nhận đơn hàng Flash Sale 20/04', channel:'zns', submitter:'Trâm · Marketing',
      submittedAt:'21/04 · 09:42', audience:'2.420 khách (VIP + Returning)', cost:'290.400₫',
      status:'pending', priority:'P0', stage:2, sendAt:'21/04 · 18:00',
      preview:'Chào anh/chị {{name}}! Đơn #{{order_id}} đang được chuẩn bị. Flash Sale 30% tới 23:59 hôm nay — xem ngay 👉',
      reviewers:[
        {n:'Lan · Head of Marketing', r:'Brand & Copy',     s:'approved',  at:'09:58', note:'Copy OK, đổi emoji 🔥 thay ⚡'},
        {n:'Minh · Compliance Lead',  r:'GDPR/Zalo policy', s:'pending'},
        {n:'Hoàng · Finance',          r:'Budget > 250k',    s:'waiting'},
      ],
      aiChecks:[
        {k:'ZNS Template ID', v:'VN_FLASH_01 · Đã duyệt Zalo OA', ok:true},
        {k:'Opt-in coverage', v:'100% (2.420/2.420)', ok:true},
        {k:'Frequency cap',   v:'Vượt ngưỡng 2 msg/ngày · 180 user', ok:false},
        {k:'Giờ gửi',          v:'18:00 · Trong khung 06:00–22:00', ok:true},
        {k:'Từ khoá nhạy cảm', v:'Không phát hiện', ok:true},
        {k:'Personalization',  v:'3 biến · {{name}}, {{order_id}}, {{amount}}', ok:true},
      ]
    },
    {
      id:'apv_02', name:'Email — Hè 2026 · Bộ sưu tập mới', channel:'email', submitter:'Minh · Sales',
      submittedAt:'21/04 · 08:15', audience:'18.400 contacts', cost:'0₫',
      status:'pending', priority:'P1', stage:1, sendAt:'22/04 · 07:00',
      preview:'Chào mùa hè với BST mới — giảm 25% toàn bộ áo linen.',
      reviewers:[
        {n:'Lan · Head of Marketing', r:'Brand & Copy',     s:'pending'},
        {n:'Hoàng · Finance',          r:'Budget < 100k',   s:'auto-approved', at:'08:16'},
      ],
      aiChecks:[
        {k:'Subject line A/B', v:'2 biến · Claude Haiku suggest', ok:true},
        {k:'Spam score',       v:'2.1 / 10 (Low)', ok:true},
        {k:'Unsubscribe link', v:'Có · footer', ok:true},
        {k:'Dark mode preview',v:'OK', ok:true},
      ]
    },
    {
      id:'apv_03', name:'SMS — Nhắc lịch giao hàng T4', channel:'sms', submitter:'Zia AI (auto)',
      submittedAt:'21/04 · 07:30', audience:'840 đơn', cost:'67.200₫',
      status:'pending', priority:'P2', stage:1, sendAt:'21/04 · 14:00',
      preview:'[AppChat] Đơn {{order_id}} sẽ giao trong 2h. Shipper gọi trước 15 phút.',
      reviewers:[
        {n:'Lan · Head of Marketing', r:'Brand',           s:'pending'},
      ],
      aiChecks:[
        {k:'Brand prefix',    v:'[AppChat] ✓', ok:true},
        {k:'160 ký tự',        v:'118 ký tự (1 SMS)', ok:true},
        {k:'Số short-code',    v:'8080 (đã đăng ký)', ok:true},
      ]
    },
    {
      id:'apv_04', name:'ZNS — Gia hạn gói dịch vụ', channel:'zns', submitter:'Trâm · Sales',
      submittedAt:'20/04 · 16:22', audience:'320 khách', cost:'38.400₫',
      status:'rejected', priority:'P1', stage:2, sendAt:'—',
      preview:'Gói của anh/chị sắp hết hạn, gia hạn ngay để giữ ưu đãi 2026.',
      rejectReason:'Không đủ dữ liệu opt-in rõ ràng cho 40% danh sách. Yêu cầu bổ sung consent log.',
      reviewers:[
        {n:'Lan · Head of Marketing', r:'Brand',           s:'approved',  at:'16:30'},
        {n:'Minh · Compliance Lead',  r:'GDPR/Zalo policy',s:'rejected',  at:'17:05', note:'Opt-in chưa đủ'},
      ],
      aiChecks:[
        {k:'Opt-in coverage', v:'60% (192/320)', ok:false},
      ]
    },
    {
      id:'apv_05', name:'Email — Cảm ơn khách hàng mới Q2', channel:'email', submitter:'Zia AI',
      submittedAt:'19/04 · 11:02', audience:'1.240 contacts', cost:'0₫',
      status:'approved', priority:'P2', stage:3, sendAt:'19/04 · 15:00',
      preview:'Cảm ơn anh/chị đã đồng hành 💚',
      reviewers:[
        {n:'Lan · Head of Marketing', r:'Brand',      s:'approved', at:'11:30'},
      ],
      aiChecks:[{k:'Tất cả OK', v:'Zia không phát hiện vấn đề', ok:true}]
    },
  ];

  const current = APPROVALS.find(a => a.id === selected) || APPROVALS[0];
  const filtered = APPROVALS.filter(a => filter === 'all' || a.status === filter);

  const chanMeta = {
    zns:   {c:'#0068FF', bg:'#E6F0FF', l:'Zalo ZNS'},
    email: {c:'#EA580C', bg:'#FEF2E9', l:'Email'},
    sms:   {c:'#16A34A', bg:'#E8F8EE', l:'SMS'},
  };

  return (
    <div className="scroll" style={{ flex:1, padding:'20px 28px', background:'var(--fill-02)' }}>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginBottom:18 }}>
        {[
          {l:'Đang chờ duyệt',  v:'4',  s:'2 vượt ngưỡng', c:'var(--warning,#F5A830)'},
          {l:'Đã duyệt tháng này', v:'42', s:'98% thành công', c:'var(--success,#2DC56A)'},
          {l:'Bị từ chối',       v:'3',  s:'Chủ yếu do opt-in', c:'var(--danger,#E33F3F)'},
          {l:'SLA trung bình',   v:'1h 28m', s:'Target < 2h', c:'var(--info,#2B9EF3)'},
          {l:'Auto-approved',    v:'18', s:'Zia AI · low-risk', c:'var(--primary)'},
        ].map(k => (
          <div key={k.l} className="card" style={{ padding:14 }}>
            <div style={{ fontSize:11, color:'var(--label-02)' }}>{k.l}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.c, lineHeight:1.2, marginTop:2 }}>{k.v}</div>
            <div style={{ fontSize:10.5, color:'var(--label-03)' }}>{k.s}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:16 }}>
        {/* LEFT: queue */}
        <div className="card" style={{ padding:0, overflow:'hidden', alignSelf:'flex-start' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--fill-04)', display:'flex', gap:6 }}>
            {[
              {k:'pending',  l:'Đang chờ', n: APPROVALS.filter(a=>a.status==='pending').length},
              {k:'approved', l:'Duyệt',    n: APPROVALS.filter(a=>a.status==='approved').length},
              {k:'rejected', l:'Từ chối',  n: APPROVALS.filter(a=>a.status==='rejected').length},
              {k:'all',      l:'Tất cả',   n: APPROVALS.length},
            ].map(f => (
              <button key={f.k} onClick={()=>setFilter(f.k)} style={{
                padding:'5px 10px', fontSize:11.5, borderRadius:6, cursor:'pointer', border:'1px solid',
                borderColor: filter===f.k ? 'var(--primary)' : 'var(--fill-04)',
                background: filter===f.k ? 'var(--pr-soft, #E8F8EE)' : 'white',
                color: filter===f.k ? 'var(--pr-dark-2, #157A40)' : 'var(--label-02)',
                fontWeight: 600, fontFamily:'inherit'
              }}>{f.l} · {f.n}</button>
            ))}
          </div>

          <div style={{ maxHeight:560, overflow:'auto' }}>
            {filtered.map((a,i) => {
              const m = chanMeta[a.channel];
              const isSel = selected === a.id;
              return (
                <div key={a.id} onClick={()=>setSelected(a.id)} style={{
                  padding:'14px 16px', cursor:'pointer',
                  borderBottom: i < filtered.length-1 ? '1px solid var(--fill-04)' : 'none',
                  borderLeft:'3px solid '+(isSel ? 'var(--primary)' : 'transparent'),
                  background: isSel ? 'var(--fill-01)' : 'white'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:4, background:m.bg, color:m.c, letterSpacing:'.04em' }}>{m.l.toUpperCase()}</span>
                    {a.status==='pending'  && <span className="chip yellow" style={{ fontSize:10 }}>Chờ duyệt</span>}
                    {a.status==='approved' && <span className="chip green"  style={{ fontSize:10 }}>✓ Đã duyệt</span>}
                    {a.status==='rejected' && <span className="chip red"    style={{ fontSize:10 }}>✗ Từ chối</span>}
                    <span style={{ fontSize:10, fontWeight:700, color: a.priority==='P0'?'var(--risk,#E33F3F)':a.priority==='P1'?'var(--warning,#F5A830)':'var(--label-03)', marginLeft:'auto' }}>{a.priority}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, lineHeight:1.35, marginBottom:5 }}>{a.name}</div>
                  <div style={{ fontSize:11, color:'var(--label-02)', display:'flex', justifyContent:'space-between' }}>
                    <span>{a.submitter}</span>
                    <span>{a.submittedAt}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--label-03)', marginTop:3 }}>{a.audience} · {a.cost}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: detail */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <ApprovalDetail approval={current} chanMeta={chanMeta} onShowAudit={()=>setShowAudit(true)}/>
        </div>
      </div>

      {showAudit && <AuditLogModal onClose={()=>setShowAudit(false)} approval={current}/>}
    </div>
  );
}

function ApprovalDetail({ approval: a, chanMeta, onShowAudit }) {
  const m = chanMeta[a.channel];
  const okChecks = a.aiChecks.filter(c=>c.ok).length;
  const failChecks = a.aiChecks.length - okChecks;

  const STAGES = ['Nháp','Đang duyệt','Phê duyệt cuối','Gửi'];

  return (
    <>
      {/* Header */}
      <div className="card" style={{ padding:18 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:m.bg, color:m.c, display:'grid', placeItems:'center', fontWeight:800, fontSize:12, letterSpacing:'.04em' }}>{a.channel==='zns'?'ZNS':a.channel==='email'?'@':'SMS'}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'var(--label-03)', marginBottom:2 }}>{m.l} · Gửi dự kiến {a.sendAt}</div>
            <div style={{ fontSize:18, fontWeight:800, lineHeight:1.3 }}>{a.name}</div>
            <div style={{ fontSize:12, color:'var(--label-02)', marginTop:3 }}>{a.submitter} · {a.submittedAt} · {a.audience} · {a.cost}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onShowAudit}><Icon.Clock style={{width:12, height:12}}/> Audit log</button>
        </div>

        {/* Stage progress */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:0, border:'1px solid var(--fill-04)', borderRadius:10, overflow:'hidden' }}>
          {STAGES.map((s, i) => {
            const done = i < a.stage;
            const current = i === a.stage;
            const rejected = a.status === 'rejected' && i === a.stage;
            return (
              <div key={i} style={{
                padding:'10px 12px', fontSize:11.5, fontWeight:600,
                borderRight: i<STAGES.length-1 ? '1px solid var(--fill-04)' : 'none',
                background: rejected ? 'rgba(227,63,63,.08)' : done ? 'var(--pr-soft,#E8F8EE)' : current ? 'rgba(245,168,48,.12)' : 'white',
                color: rejected ? 'var(--risk,#E33F3F)' : done ? 'var(--pr-dark-2,#157A40)' : current ? 'var(--warning,#F5A830)' : 'var(--label-03)',
                display:'flex', alignItems:'center', gap:8
              }}>
                <span style={{
                  width:18, height:18, borderRadius:9, display:'grid', placeItems:'center', fontSize:10, fontWeight:800,
                  background: rejected ? 'var(--risk,#E33F3F)' : done ? 'var(--pr-dark-2,#157A40)' : current ? 'var(--warning,#F5A830)' : 'var(--fill-03)',
                  color: (rejected || done || current) ? 'white' : 'var(--label-03)'
                }}>{rejected ? '✗' : done ? '✓' : i+1}</span>
                {s}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:16 }}>
        {/* Preview */}
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:11, color:'var(--label-03)', textTransform:'uppercase', letterSpacing:.8, fontWeight:700, marginBottom:10 }}>Preview nội dung</div>
          <div style={{ background:'var(--fill-02)', borderRadius:10, padding:14, fontSize:12.5, lineHeight:1.55, color:'var(--label-01)' }}>
            {a.channel==='email' && <div style={{ fontWeight:700, marginBottom:6, paddingBottom:6, borderBottom:'1px solid var(--fill-04)' }}>Subject: {a.name}</div>}
            {a.channel==='sms' && <div style={{ fontSize:10, color:'var(--label-03)', marginBottom:4 }}>From: 8080</div>}
            {a.preview}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}><Icon.Eye style={{width:12, height:12}}/> Preview đầy đủ</button>
            <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}><Icon.Send style={{width:12, height:12}}/> Gửi test tới tôi</button>
          </div>
        </div>

        {/* AI checks */}
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:22, height:22, borderRadius:6, background:'var(--grad-signature, linear-gradient(135deg,#2DC56A,#2B9EF3))', display:'grid', placeItems:'center', color:'white' }}>
              <Icon.Sparkles style={{width:12, height:12}}/>
            </div>
            <div style={{ fontSize:12, fontWeight:700 }} className="ai-gradient-text">Zia AI · Pre-flight checks</div>
            <span style={{ marginLeft:'auto', fontSize:11, color: failChecks ? 'var(--risk,#E33F3F)' : 'var(--pr-dark-2,#157A40)', fontWeight:700 }}>
              {okChecks}/{a.aiChecks.length} OK
            </span>
          </div>
          {a.aiChecks.map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderTop: i ? '1px dashed var(--fill-03)' : 'none' }}>
              <span style={{
                width:18, height:18, borderRadius:9, display:'grid', placeItems:'center', fontSize:10, fontWeight:800,
                background: c.ok ? 'var(--pr-soft,#E8F8EE)' : 'rgba(227,63,63,.1)',
                color: c.ok ? 'var(--pr-dark-2,#157A40)' : 'var(--risk,#E33F3F)'
              }}>{c.ok ? '✓' : '!'}</span>
              <div style={{ flex:1, fontSize:12 }}>
                <div style={{ fontWeight:600, color:'var(--label-01)' }}>{c.k}</div>
                <div style={{ fontSize:11, color: c.ok ? 'var(--label-02)' : 'var(--risk,#E33F3F)' }}>{c.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviewers */}
      <div className="card" style={{ padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Chuỗi người duyệt ({a.reviewers.length})</div>
          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--label-03)' }}>Theo thứ tự tuần tự · SLA 2 giờ mỗi bước</span>
        </div>
        <div style={{ display:'grid', gap:10 }}>
          {a.reviewers.map((r, i) => {
            const sColor = {approved:'var(--pr-dark-2,#157A40)', rejected:'var(--risk,#E33F3F)', pending:'var(--warning,#F5A830)', waiting:'var(--label-03)', 'auto-approved':'var(--info,#2B9EF3)'}[r.s];
            const sBg    = {approved:'var(--pr-soft,#E8F8EE)', rejected:'rgba(227,63,63,.08)', pending:'rgba(245,168,48,.12)', waiting:'var(--fill-02)', 'auto-approved':'rgba(43,158,243,.1)'}[r.s];
            const sLabel = {approved:'✓ Đã duyệt', rejected:'✗ Từ chối', pending:'⏳ Chờ duyệt', waiting:'⊙ Chưa đến lượt', 'auto-approved':'🤖 Auto-duyệt'}[r.s];
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--fill-02)', borderRadius:10 }}>
                <div className="avatar sm" style={{ background:'hsl('+(r.n.length*24)%360+' 50% 48%)', color:'white', width:32, height:32, display:'grid', placeItems:'center', borderRadius:16, fontWeight:700, fontSize:12 }}>{r.n.charAt(0)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700 }}>{r.n}</div>
                  <div style={{ fontSize:11, color:'var(--label-03)' }}>{r.r}{r.note ? ' · "'+r.note+'"' : ''}</div>
                </div>
                {r.at && <div style={{ fontSize:11, color:'var(--label-03)' }}>{r.at}</div>}
                <span style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700, background:sBg, color:sColor, whiteSpace:'nowrap' }}>{sLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reject reason (if any) */}
      {a.rejectReason && (
        <div style={{ padding:14, background:'rgba(227,63,63,.06)', border:'1px solid rgba(227,63,63,.2)', borderRadius:10, color:'var(--risk,#E33F3F)', fontSize:12.5, display:'flex', gap:10 }}>
          <Icon.Shield style={{width:16, height:16, flexShrink:0, marginTop:1}}/>
          <div><b>Lý do từ chối:</b> {a.rejectReason}</div>
        </div>
      )}

      {/* Action bar */}
      {a.status === 'pending' && (
        <div className="card" style={{ padding:14, display:'flex', alignItems:'center', gap:10, background:'linear-gradient(180deg, white 0%, var(--fill-01) 100%)', position:'sticky', bottom:0 }}>
          <div style={{ fontSize:12, color:'var(--label-02)' }}>
            <b style={{ color:'var(--label-01)' }}>Bạn đang duyệt với quyền Compliance Lead</b><br/>
            <span style={{ fontSize:11, color:'var(--label-03)' }}>Quyết định sẽ được ghi nhận vào audit log.</span>
          </div>
          <div style={{ flex:1 }}/>
          <button className="btn btn-ghost btn-sm"><Icon.Edit/> Yêu cầu chỉnh sửa</button>
          <button className="btn btn-ghost btn-sm" style={{ color:'var(--risk,#E33F3F)', borderColor:'rgba(227,63,63,.3)' }}><Icon.Close/> Từ chối</button>
          <button className="btn btn-primary btn-sm"><Icon.Check/> Phê duyệt &amp; tiếp tục</button>
        </div>
      )}
    </>
  );
}

function AuditLogModal({ onClose, approval }) {
  const events = [
    {t:'21/04 · 09:42', u:'Trâm · Marketing',       a:'Submitted', d:'Gửi chiến dịch vào hàng đợi duyệt'},
    {t:'21/04 · 09:43', u:'Zia AI',                 a:'Pre-flight', d:'Hoàn thành 6 pre-flight check · 5 OK · 1 cảnh báo'},
    {t:'21/04 · 09:58', u:'Lan · Head of Marketing',a:'Approved',  d:'Approved with comment: "Copy OK, đổi emoji 🔥 thay ⚡"'},
    {t:'21/04 · 10:01', u:'System',                 a:'Escalated', d:'Chuyển sang Minh · Compliance Lead (stage 2)'},
    {t:'21/04 · 10:05', u:'Minh · Compliance Lead', a:'Viewing',   d:'Đang xem chiến dịch + audit ZNS template'},
  ];
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(14,27,19,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <div onClick={e=>e.stopPropagation()} className="card" style={{ width:720, maxHeight:'80vh', display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>Audit log</div>
            <div style={{ fontSize:11.5, color:'var(--label-03)' }}>{approval.name}</div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ marginLeft:'auto' }}><Icon.Close/></button>
        </div>
        <div className="scroll" style={{ padding:20, overflow:'auto' }}>
          {events.map((e, i) => (
            <div key={i} style={{ display:'flex', gap:12, paddingBottom:14, position:'relative' }}>
              <div style={{ position:'relative', width:24, flexShrink:0 }}>
                <div style={{ width:10, height:10, borderRadius:5, background:'var(--primary)', position:'absolute', top:4, left:7 }}/>
                {i < events.length-1 && <div style={{ position:'absolute', top:14, left:11, bottom:-14, width:2, background:'var(--fill-03)' }}/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{e.a} <span style={{ color:'var(--label-03)', fontWeight:400 }}>· {e.u}</span></div>
                <div style={{ fontSize:11.5, color:'var(--label-02)', marginTop:2 }}>{e.d}</div>
                <div style={{ fontSize:10.5, color:'var(--label-03)', marginTop:2, fontFamily:'ui-monospace, monospace' }}>{e.t}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--fill-04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--label-03)' }}>Hash: 0x8A4F···C3 · ISO 27001 compliant · Lưu 5 năm</span>
          <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất CSV</button>
        </div>
      </div>
    </div>
  );
}
const Metric = ({label, v, sub, color}) => (
  <div>
    <div style={{ fontSize:10.5, color:'var(--label-02)', textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
    <div style={{ fontSize:16, fontWeight:800, color:color||'var(--label-01)' }}>{v}</div>
    {sub && <div style={{ fontSize:10.5, color:'var(--label-03)' }}>{sub}</div>}
  </div>
);

window.ActivitiesModule = ActivitiesModule;
window.BroadcastModule = BroadcastModule;
