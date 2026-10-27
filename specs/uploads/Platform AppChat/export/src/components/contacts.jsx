/* Liên hệ — Zoho CRM style */
const { useState: useCs } = React;

const CONTACT_VIEWS = [
  { k:'all',        l:'Tất cả liên hệ' },
  { k:'mine',       l:'Liên hệ của tôi' },
  { k:'unassigned', l:'Chưa phân công' },
  { k:'recently',   l:'Vừa tạo' },
  { k:'recently_m', l:'Vừa chỉnh sửa' },
  { k:'vip',        l:'Khách VIP', color:'#F59E0B' },
  { k:'hot',        l:'Lead nóng', color:'#E8553D' },
  { k:'intl',       l:'Quốc tế', color:'#7C3AED' },
  { k:'locked',     l:'Liên hệ khoá' },
  { k:'inactive',   l:'Không hoạt động (30+ ngày)' },
];

function ContactsModule() {
  const { CONTACTS } = window.AppData;
  const [view, setView]   = useCs('all');
  const [layout, setLayout] = useCs('list'); // list | kanban | chart
  const [selected, setSelected] = useCs([]);
  const [open, setOpen]   = useCs(null);
  const [q, setQ]         = useCs('');

  const filtered = CONTACTS.filter(c => {
    if (view==='mine') return c.owner==='Trâm';
    if (view==='unassigned') return c.owner==='Claude Cowork';
    if (view==='vip') return c.tags.includes('VIP');
    if (view==='hot') return c.tags.includes('Lead nóng');
    if (view==='intl') return c.tags.includes('Quốc tế');
    return true;
  }).filter(c => !q || (c.first+' '+c.last+' '+c.email+' '+c.company).toLowerCase().includes(q.toLowerCase()));

  const toggle = (id) => setSelected(s => s.includes(id)?s.filter(x=>x!==id):[...s,id]);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div className="topbar">
        <h1>Liên hệ</h1>
        <span className="crumb">Liên hệ · Khách hàng · Lead</span>
        <span className="spacer"/>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> Claude làm giàu dữ liệu</button>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Nhập</button>
        <button className="btn btn-ghost btn-sm"><Icon.Download style={{transform:'rotate(180deg)'}}/> Xuất</button>
        <button className="btn btn-primary"><Icon.Plus/> Tạo liên hệ</button>
      </div>

      {/* Sub tabs */}
      <div style={{display:'flex', alignItems:'flex-end', gap:4, padding:'0 20px', background:'white', borderBottom:'1px solid var(--fill-04)', height:40}}>
        {[
          {k:'contacts', l:'Liên hệ', i:<Icon.User/>, n:CONTACTS.length, active:true},
          {k:'accounts', l:'Khách hàng', i:<Icon.Folder/>, n:48},
          {k:'leads', l:'Lead', i:<Icon.UserPlus/>, n:74},
        ].map(t => (
          <button key={t.k} style={{
            padding:'0 14px', height:40, background:'transparent', border:'none',
            borderBottom:'2px solid '+(t.active?'var(--primary)':'transparent'),
            color: t.active?'var(--primary)':'var(--label-02)',
            fontWeight:600, fontSize:13, cursor:'pointer', display:'inline-flex', gap:7, alignItems:'center'
          }}>
            {React.cloneElement(t.i,{style:{width:13,height:13}})}{t.l}
            <span style={{fontSize:10.5, fontWeight:700, padding:'1px 6px', borderRadius:8, background: t.active?'var(--bg-green)':'var(--fill-03)', color: t.active?'var(--primary)':'var(--label-02)'}}>{t.n}</span>
          </button>
        ))}
        <span style={{flex:1}}/>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, marginBottom:5, gap:2}}>
          {[{k:'list',i:<Icon.List/>,l:'Danh sách'},{k:'kanban',i:<Icon.Grid/>,l:'Kanban'},{k:'chart',i:<Icon.Reports/>,l:'Biểu đồ'}].map(v=>(
            <button key={v.k} onClick={()=>setLayout(v.k)} style={{
              padding:'4px 9px', border:'none', borderRadius:5, cursor:'pointer',
              background: layout===v.k?'white':'transparent',
              color: layout===v.k?'var(--label-01)':'var(--label-02)',
              boxShadow: layout===v.k?'var(--shadow-sm)':'none', display:'inline-flex', gap:5, alignItems:'center', fontSize:11.5, fontWeight:600
            }}>
              {React.cloneElement(v.i,{style:{width:12,height:12}})}{v.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1, display:'flex', minHeight:0, background:'var(--fill-02)'}}>
        {/* Left rail */}
        <div style={{width:240, background:'white', borderRight:'1px solid var(--fill-04)', padding:'14px 0', overflowY:'auto'}}>
          <div style={{padding:'0 14px 6px', display:'flex', alignItems:'center'}}>
            <span style={{fontSize:11, fontWeight:700, letterSpacing:'.05em', color:'var(--label-03)'}}>BỘ LỌC</span>
            <span style={{flex:1}}/>
            <button className="btn-icon" style={{width:20, height:20}}><Icon.Plus style={{width:12,height:12}}/></button>
          </div>
          {CONTACT_VIEWS.map(v=>{
            const active = view===v.k;
            return (
              <button key={v.k} onClick={()=>setView(v.k)} style={{
                width:'100%', padding:'8px 14px', display:'flex', alignItems:'center', gap:8,
                border:'none', background: active?'var(--bg-green)':'transparent',
                borderLeft:'3px solid '+(active?'var(--primary)':'transparent'),
                cursor:'pointer', textAlign:'left', fontSize:12.5,
                fontWeight: active?600:500, color: active?'var(--pr-dark-2)':'var(--label-01)'
              }}>
                {v.color && <span style={{width:6, height:6, borderRadius:3, background:v.color}}/>}
                <span style={{flex:1}}>{v.l}</span>
              </button>
            );
          })}
          <div style={{margin:'18px 14px 8px', paddingTop:12, borderTop:'1px solid var(--fill-04)'}}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:'.05em', marginBottom:6}}>LỌC THEO TRƯỜNG</div>
            {['Phụ trách','Vòng đời','Nguồn','Quốc gia','Thẻ','Kênh','Điểm','Ngày tạo','Hoạt động gần nhất'].map(f=>(
              <div key={f} style={{padding:'5px 0', fontSize:12, color:'var(--label-02)', display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
                <Icon.Plus style={{width:10, height:10}}/>{f}
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
          <div style={{padding:'10px 16px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
            <label style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600}}>
              <input type="checkbox" style={{accentColor:'var(--primary)'}}/>
              <span>{selected.length>0? selected.length+' selected' : 'Select all'}</span>
            </label>
            {selected.length>0 && <>
              <button className="btn btn-ghost btn-sm">Cập nhật hàng loạt</button>
              <button className="btn btn-ghost btn-sm">Gán phụ trách</button>
              <button className="btn btn-ghost btn-sm">Gửi email</button>
              <button className="btn btn-ghost btn-sm">Gộp</button>
              <button className="btn btn-ghost btn-sm"><Icon.Trash/> Xoá</button>
            </>}
            <span style={{flex:1}}/>
            <div style={{position:'relative'}}>
              <Icon.Search style={{position:'absolute', left:8, top:7, width:13, height:13, color:'var(--label-03)'}}/>
              <input placeholder="Tìm tên, email, công ty…" value={q} onChange={e=>setQ(e.target.value)} style={{height:28, width:240, paddingLeft:28, border:'1px solid var(--fill-04)', borderRadius:6, fontSize:12, outline:'none'}}/>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon.Filter/> Lọc</button>
            <button className="btn btn-ghost btn-sm"><Icon.Sort/> Sắp xếp</button>
            <button className="btn btn-ghost btn-sm"><Icon.Columns/></button>
          </div>

          <div className="scroll" style={{flex:1, overflow:'auto'}}>
            {layout==='list'   && <ContactList items={filtered} selected={selected} toggle={toggle} open={open} setOpen={setOpen}/>}
            {layout==='kanban' && <ContactKanban items={filtered}/>}
            {layout==='chart'  && <ContactChart items={filtered}/>}
          </div>
        </div>

        {open && <ContactDetail c={open} onClose={()=>setOpen(null)}/>}
      </div>
    </div>
  );
}

function ContactList({items, selected, toggle, open, setOpen}) {
  const lcMap = {
    'Khách hàng':  {bg:'rgba(45,197,106,.15)', c:'#0F5E33'},
    'Lead':      {bg:'#DBEAFE', c:'#1E40AF'},
    'Khách tiềm năng':  {bg:'#FEF3C7', c:'#92400E'},
    'Cơ hội':{bg:'#F3E8FF', c:'#6B21A8'},
    'Đối tác':   {bg:'#FCE7F3', c:'#9F1239'},
  };
  const lcDefault = {bg:'#F1F5F9', c:'#475569'};
  const lc = new Proxy(lcMap, { get: (t,k) => t[k] || lcDefault });
  return (
    <div style={{background:'white'}}>
      <div style={{display:'grid', gridTemplateColumns:'32px 32px 2fr 1.6fr 1.4fr 120px 120px 110px 120px 80px',
        gap:8, padding:'10px 16px', fontSize:11, color:'var(--label-02)', fontWeight:700, textTransform:'uppercase',
        letterSpacing:.4, borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)', position:'sticky', top:0, zIndex:1}}>
        <span/><span/><span>Name</span><span>Email</span><span>Account</span><span>Phone</span><span>Vòng đời</span><span>Phụ trách</span><span>Hoạt động gần nhất</span><span>Điểm</span>
      </div>
      {items.map(c => {
        const active = open && open.id===c.id;
        return (
          <div key={c.id} onClick={()=>setOpen(c)} style={{
            display:'grid', gridTemplateColumns:'32px 32px 2fr 1.6fr 1.4fr 120px 120px 110px 120px 80px',
            gap:8, padding:'12px 16px', fontSize:13, alignItems:'center',
            borderBottom:'1px solid var(--fill-04)', cursor:'pointer',
            background: active?'var(--bg-green)':'white'
          }} onMouseEnter={e=>{if(!active) e.currentTarget.style.background='var(--fill-02)'}} onMouseLeave={e=>{if(!active) e.currentTarget.style.background='white'}}>
            <div onClick={e=>{e.stopPropagation(); toggle(c.id);}}>
              <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>{}} style={{accentColor:'var(--primary)'}}/>
            </div>
            <span style={{color: c.starred?'#F59E0B':'var(--fill-04)', fontSize:15, cursor:'pointer'}} onClick={e=>e.stopPropagation()}>★</span>
            <div style={{display:'flex', gap:9, alignItems:'center', minWidth:0}}>
              <div className="avatar sm" style={{background:'hsl('+((c.first+c.last).length*28)%360+' 55% 48%)', width:30, height:30, fontSize:11, flexShrink:0}}>{c.first[0]}{c.last[0]}</div>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:600, color:'var(--primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.last} {c.first}</div>
                <div style={{fontSize:10.5, color:'var(--label-03)'}}>{c.title} · {c.id}</div>
              </div>
            </div>
            <div style={{fontSize:12, color:'var(--info)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.email}</div>
            <div style={{fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.account}</div>
            <div style={{fontSize:12, fontFamily:'monospace'}}>{c.phone}</div>
            <span style={{background:lc[c.lifecycle].bg, color:lc[c.lifecycle].c, padding:'3px 8px', borderRadius:10, fontSize:10.5, fontWeight:600, justifySelf:'start'}}>{c.lifecycle}</span>
            <div style={{fontSize:12, display:'flex', alignItems:'center', gap:5}}>
              <div className="avatar sm" style={{background: c.owner==='Claude Cowork'?'var(--grad-signature)':'hsl('+((c.owner||'').length*34)%360+' 50% 48%)', width:20, height:20, fontSize:9.5}}>{c.owner==='Claude Cowork'?'✦':c.owner[0]}</div>
              {c.owner}
            </div>
            <div style={{fontSize:11, color:'var(--label-02)'}}>{c.lastActivity}</div>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <div style={{width:30, height:30, borderRadius:15, display:'grid', placeItems:'center', fontWeight:800, fontSize:11,
                background: c.score>=80?'rgba(45,197,106,.15)':c.score>=60?'#FEF3C7':'rgba(232,85,61,.15)',
                color: c.score>=80?'var(--primary)':c.score>=60?'#92400E':'#E8553D'
              }}>{c.score}</div>
            </div>
          </div>
        );
      })}
      {items.length===0 && <div style={{padding:60, textAlign:'center', color:'var(--label-03)'}}>Không có contact nào khớp.</div>}
    </div>
  );
}

function ContactKanban({items}) {
  const stages = ['Lead','Khách tiềm năng','Cơ hội','Khách hàng','Đối tác'];
  const colors = {'Lead':'#2B9EF3', 'Khách tiềm năng':'#F59E0B', 'Cơ hội':'#7C3AED', 'Khách hàng':'#22C55E', 'Đối tác':'#EC4899'};
  return (
    <div style={{padding:16, display:'grid', gridTemplateColumns:`repeat(${stages.length}, minmax(230px, 1fr))`, gap:12, minHeight:'100%'}}>
      {stages.map(s=>(
        <div key={s} style={{background:'var(--fill-02)', borderRadius:10, padding:10}}>
          <div style={{display:'flex', alignItems:'center', gap:6, padding:'2px 4px 10px'}}>
            <span style={{width:8, height:8, borderRadius:4, background:colors[s]}}/>
            <span style={{fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.4}}>{s}</span>
            <span style={{fontSize:11, color:'var(--label-03)'}}>{items.filter(c=>c.lifecycle===s).length}</span>
          </div>
          {items.filter(c=>c.lifecycle===s).map(c=>(
            <div key={c.id} className="card" style={{padding:10, marginBottom:8}}>
              <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:6}}>
                <div className="avatar sm" style={{background:'hsl('+((c.first+c.last).length*28)%360+' 55% 48%)', width:26, height:26, fontSize:10}}>{c.first[0]}{c.last[0]}</div>
                <div style={{minWidth:0, flex:1}}>
                  <div style={{fontWeight:600, fontSize:12.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.last} {c.first}</div>
                  <div style={{fontSize:10, color:'var(--label-03)'}}>{c.company || c.account}</div>
                </div>
              </div>
              <div style={{fontSize:10.5, color:'var(--label-02)'}}>📧 {c.email}</div>
              <div style={{fontSize:10.5, color:'var(--label-02)', marginTop:2}}>💰 {c.totalValue}</div>
              <div style={{display:'flex', gap:4, marginTop:6}}>
                {c.tags.slice(0,2).map(t=>(<span key={t} className="chip outline" style={{height:16, fontSize:9.5, padding:'0 5px'}}>{t}</span>))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ContactChart({items}) {
  const byCountry = {};
  items.forEach(c => byCountry[c.country] = (byCountry[c.country]||0)+1);
  const byOwner = {};
  items.forEach(c => byOwner[c.owner] = (byOwner[c.owner]||0)+1);
  return (
    <div style={{padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
      <div className="card" style={{padding:16}}>
        <div style={{fontSize:13, fontWeight:700, marginBottom:14}}>Liên hệ by Quốc gia</div>
        {Object.entries(byCountry).map(([k,v])=>(
          <div key={k} style={{marginBottom:10}}>
            <div style={{display:'flex', fontSize:12, marginBottom:3}}><span style={{flex:1}}>{k}</span><span>{v}</span></div>
            <div style={{height:8, background:'var(--fill-03)', borderRadius:4}}>
              <div style={{width:(v/items.length*100)+'%', height:'100%', background:'var(--primary)', borderRadius:4}}/>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:16}}>
        <div style={{fontSize:13, fontWeight:700, marginBottom:14}}>Liên hệ by Phụ trách</div>
        {Object.entries(byOwner).map(([k,v])=>(
          <div key={k} style={{marginBottom:10}}>
            <div style={{display:'flex', fontSize:12, marginBottom:3}}><span style={{flex:1}}>{k}</span><span>{v}</span></div>
            <div style={{height:8, background:'var(--fill-03)', borderRadius:4}}>
              <div style={{width:(v/items.length*100)+'%', height:'100%', background:'var(--info)', borderRadius:4}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactDetail({c, onClose}) {
  const [tab, setTab] = useCs('overview');
  return (
    <div style={{width:420, background:'white', borderLeft:'1px solid var(--fill-04)', display:'flex', flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:18, borderBottom:'1px solid var(--fill-04)', position:'relative'}}>
        <button className="btn-icon" style={{position:'absolute', top:10, right:10}} onClick={onClose}><Icon.Close/></button>
        <div style={{display:'flex', gap:14, alignItems:'center', marginBottom:14}}>
          <div className="avatar lg" style={{background:'hsl('+((c.first+c.last).length*28)%360+' 55% 48%)', width:64, height:64, fontSize:22, borderRadius:14}}>{c.first[0]}{c.last[0]}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:18, fontWeight:800}}>{c.last} {c.first}</div>
            <div style={{fontSize:12.5, color:'var(--label-02)'}}>{c.title}{c.company && c.company!=='—'?' · '+c.company:''}</div>
            <div style={{display:'flex', gap:4, marginTop:6}}>
              {c.tags.map(t=>(<span key={t} className="chip outline" style={{height:18, fontSize:10, padding:'0 6px'}}>{t}</span>))}
            </div>
          </div>
        </div>
        <div style={{display:'flex', gap:6}}>
          <button className="btn btn-primary btn-sm" style={{flex:1}}><Icon.MessageSquare/> Nhắn tin</button>
          <button className="btn btn-ghost btn-sm" style={{flex:1}}><Icon.Phone/> Gọi</button>
          <button className="btn btn-ghost btn-sm"><Icon.Calendar/></button>
          <button className="btn btn-ghost btn-sm"><Icon.More/></button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', borderBottom:'1px solid var(--fill-04)', padding:'0 12px'}}>
        {['overview','activities','deals','notes','emails'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'10px 12px', background:'transparent', border:'none', cursor:'pointer',
            borderBottom:'2px solid '+(tab===t?'var(--primary)':'transparent'),
            color: tab===t?'var(--primary)':'var(--label-02)', fontWeight:600, fontSize:12, textTransform:'capitalize'
          }}>{t}</button>
        ))}
      </div>

      <div className="scroll" style={{flex:1, overflow:'auto', padding:16}}>
        {tab==='overview' && <>
          {/* Claude insight */}
          <div style={{padding:12, borderRadius:10, background:'linear-gradient(135deg, rgba(45,197,106,.08), rgba(43,158,243,.06))', border:'1px solid rgba(45,197,106,.2)', marginBottom:16}}>
            <div style={{display:'flex', gap:6, alignItems:'center', marginBottom:6}}>
              <Icon.Sparkles style={{width:13, height:13, color:'var(--primary)'}}/>
              <span className="ai-gradient-text" style={{fontWeight:700, fontSize:11.5}}>Claude Điểm · {c.score}/100</span>
              <span style={{flex:1}}/>
              <span style={{fontSize:10.5, color:'var(--label-03)'}}>{c.score>=80?'Ưu tiên cao':c.score>=60?'Trung bình':'Cần nuôi'}</span>
            </div>
            <div style={{fontSize:11.5, lineHeight:1.5}}>
              {c.score>=80 && 'Khách active, hay mở tin trong 24h qua. Gợi ý: gửi ưu đãi VIP hoặc upsell combo.'}
              {c.score>=60 && c.score<80 && 'Phản hồi tốt, đang cân nhắc. Gợi ý: gửi case study + nhắc follow-up sau 2 ngày.'}
              {c.score<60 && 'Ít tương tác. Gợi ý: gửi khảo sát ngắn + giảm tần suất campaign.'}
            </div>
          </div>

          <Section title="Thông tin liên hệ">
            <Field l="Email" v={c.email} link/>
            <Field l="Điện thoại" v={c.phone} mono/>
            <Field l="Khách hàng" v={c.account}/>
            <Field l="Chức danh" v={c.title}/>
            <Field l="City / Quốc gia" v={c.city+', '+c.country}/>
          </Section>

          <Section title="CRM">
            <Field l="Phụ trách" v={c.owner}/>
            <Field l="Vòng đời" v={c.lifecycle}/>
            <Field l="Nguồn" v={c.leadSource}/>
            <Field l="Claude Điểm" v={c.score+' / 100'}/>
            <Field l="Ngày tạo" v={c.createdAt}/>
            <Field l="Hoạt động gần nhất" v={c.lastActivity}/>
          </Section>

          <Section title="Kênh">
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {c.channels.map(ch=>(<ChannelBadge key={ch} name={ch} size={24}/>))}
            </div>
          </Section>

          <Section title="Kinh doanh">
            <Field l="Tổng giá trị" v={c.totalValue} bold/>
            <Field l="Thương vụ đang mở" v={c.deals+''}/>
          </Section>
        </>}

        {tab==='activities' && <>
          <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, marginBottom:10}}>HOẠT ĐỘNG GẦN ĐÂY</div>
          {[
            {t:'Hôm nay 11:28', e:'Gọi Zalo · 4m 12s', i:<Icon.Phone/>},
            {t:'Hôm nay 10:15', e:'Gửi báo giá BST Hè 2026', i:<Icon.Send/>},
            {t:'Hôm qua',       e:'Mở email "Flash Sale 20/04"', i:<Icon.Mail/>},
            {t:'20/04',         e:'Đặt đơn #SP290411 · 189.000₫', i:<Icon.ShoppingCart/>},
            {t:'18/04',         e:'Ghi chú: "Khách muốn size lớn hơn"', i:<Icon.Note/>},
          ].map((a,i)=>(
            <div key={i} style={{display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid var(--fill-04)'}}>
              <div style={{width:28, height:28, borderRadius:8, background:'var(--bg-green)', color:'var(--primary)', display:'grid', placeItems:'center', flexShrink:0}}>
                {React.cloneElement(a.i,{style:{width:13, height:13}})}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5, fontWeight:500}}>{a.e}</div>
                <div style={{fontSize:10.5, color:'var(--label-03)'}}>{a.t}</div>
              </div>
            </div>
          ))}
        </>}

        {tab==='deals' && <>
          <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, marginBottom:10}}>{c.deals} DEALS</div>
          {c.deals===0 && <div style={{color:'var(--label-03)', padding:20, textAlign:'center'}}>Chưa có deal nào.</div>}
          {Array.from({length:Math.min(c.deals,3)}).map((_,i)=>(
            <div key={i} className="card" style={{padding:12, marginBottom:8}}>
              <div style={{fontWeight:600, fontSize:13}}>Deal #{c.id.replace('CT','DL')}-{i+1}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>Stage · Negotiation · {c.totalValue}</div>
            </div>
          ))}
        </>}

        {tab==='notes' && <>
          <textarea placeholder="Thêm ghi chú…" style={{width:'100%', minHeight:70, border:'1px solid var(--fill-04)', borderRadius:8, padding:10, fontFamily:'inherit', fontSize:13, resize:'vertical'}}/>
          <button className="btn btn-primary btn-sm" style={{marginTop:8}}>Lưu ghi chú</button>
        </>}

        {tab==='emails' && <div style={{color:'var(--label-03)', padding:20, textAlign:'center'}}>Chưa có email nào.</div>}
      </div>
    </div>
  );
}

function Section({title, children}) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:.4, marginBottom:8, textTransform:'uppercase'}}>{title}</div>
      {children}
    </div>
  );
}
function Field({l, v, link, mono, bold}) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'110px 1fr', padding:'5px 0', fontSize:12.5, alignItems:'center'}}>
      <span style={{color:'var(--label-02)'}}>{l}</span>
      <span style={{color:link?'var(--info)':'var(--label-01)', fontFamily:mono?'monospace':'inherit', fontWeight:bold?700:500, wordBreak:'break-word'}}>{v}</span>
    </div>
  );
}

window.ContactsModule = ContactsModule;
