/* Journey Module — list of journeys + opens canvas builder */
const { useState: useJM } = React;

const JOURNEY_LIST = [
  { id:'j1', name:'Welcome · Khách đăng ký mới', status:'published', audience:2840, completion:68, channels:['zalo','email','zns'], updated:'2026-04-22', steps:9, conv:24.6 },
  { id:'j2', name:'Win-back · Khách 60 ngày không đặt', status:'published', audience:1240, completion:42, channels:['zns','sms'], updated:'2026-04-20', steps:7, conv:18.2 },
  { id:'j3', name:'Cart abandonment · Hội thoại có ý định mua nhưng chưa chốt', status:'published', audience:520, completion:81, channels:['zalo','fb'], updated:'2026-04-19', steps:5, conv:32.4 },
  { id:'j4', name:'VIP onboarding · Khách lần đầu mua > 2 triệu', status:'published', audience:184, completion:91, channels:['zalo','email'], updated:'2026-04-18', steps:6, conv:54.8 },
  { id:'j5', name:'(Draft) NPS Survey · Sau 14 ngày nhận đơn', status:'draft', audience:0, completion:0, channels:['zns'], updated:'2026-04-21', steps:4, conv:0 },
  { id:'j6', name:'Re-engage · Mở app nhưng không chat', status:'paused', audience:840, completion:24, channels:['fb','sms'], updated:'2026-04-15', steps:8, conv:9.4 },
];

const JM_STATUS = {
  published: { bg:'#DCFCE7', fg:'#15803D', l:'Đang chạy', dot:'#22C55E' },
  draft:     { bg:'#F1F5F9', fg:'#475569', l:'Nháp', dot:'#94A3B8' },
  paused:    { bg:'#FEF3C7', fg:'#92400E', l:'Tạm dừng', dot:'#F59E0B' },
};

function JourneyModule() {
  const [open, setOpen] = useJM(null);
  const [filter, setFilter] = useJM('all');
  const list = JOURNEY_LIST.filter(j => filter==='all' || j.status===filter);

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--fill-02)'}}>
      <div style={{padding:'14px 24px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:12}}>
        <div>
          <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, letterSpacing:'.04em'}}>JOURNEY BUILDER · 2D CANVAS</div>
          <div style={{fontSize:18, fontWeight:700, marginTop:2}}>Hành trình khách hàng đa bước</div>
        </div>
        <span style={{flex:1}}/>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, gap:2}}>
          {[{k:'all',l:'Tất cả',n:JOURNEY_LIST.length},{k:'published',l:'Đang chạy',n:4},{k:'draft',l:'Nháp',n:1},{k:'paused',l:'Tạm dừng',n:1}].map(f => (
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{
              padding:'5px 12px', borderRadius:5, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background: filter===f.k?'white':'transparent', color: filter===f.k?'var(--label-01)':'var(--label-02)',
              boxShadow: filter===f.k?'var(--shadow-sm)':'none', display:'flex', alignItems:'center', gap:6
            }}>{f.l} <span style={{fontSize:10, color:'var(--label-03)'}}>{f.n}</span></button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> Claude đề xuất journey</button>
        <button className="btn btn-primary btn-sm" onClick={()=>setOpen({ id:'new' })}><Icon.Plus/> Tạo journey mới</button>
      </div>

      <div className="scroll" style={{flex:1, overflow:'auto', padding:24}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16}}>
          {[
            {l:'Đang chạy', v:'4', d:'4,784 khách', c:'#22C55E'},
            {l:'Tổng conversion', v:'27.3%', d:'+4.2 vs tháng trước', c:'#0EA5E9'},
            {l:'Bước AI Claude', v:'12', d:'across 6 journeys', c:'#8B5CF6'},
            {l:'Đã tiết kiệm thời gian', v:'184h', d:'Tự động hoá tuần qua', c:'#F59E0B'},
          ].map(k => (
            <div key={k.l} style={{padding:14, background:'white', borderRadius:10, border:'1px solid var(--fill-04)'}}>
              <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em'}}>{k.l}</div>
              <div style={{fontSize:24, fontWeight:800, marginTop:6, color:k.c}}>{k.v}</div>
              <div style={{fontSize:11, color:'var(--label-02)', marginTop:4}}>{k.d}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:14}}>
          {list.map(j => {
            const st = JM_STATUS[j.status];
            return (
              <div key={j.id} onClick={()=>setOpen(j)} style={{background:'white', borderRadius:11, border:'1px solid var(--fill-04)', padding:18, cursor:'pointer', transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(45,197,106,.1)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--fill-04)'; e.currentTarget.style.boxShadow='none';}}>
                <div style={{display:'flex', alignItems:'flex-start', gap:10, marginBottom:12}}>
                  <div style={{width:38, height:38, borderRadius:9, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white', flexShrink:0}}>
                    <Icon.Route style={{width:18, height:18}}/>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:14, fontWeight:700, lineHeight:1.4}}>{j.name}</div>
                    <div style={{display:'flex', alignItems:'center', gap:8, marginTop:5}}>
                      <span style={{padding:'2px 8px', borderRadius:5, fontSize:10, fontWeight:700, background:st.bg, color:st.fg, display:'inline-flex', alignItems:'center', gap:5}}>
                        <span style={{width:6, height:6, borderRadius:3, background:st.dot}}/>
                        {st.l}
                      </span>
                      <span style={{fontSize:11, color:'var(--label-03)'}}>· {j.steps} bước · cập nhật {j.updated.slice(5)}</span>
                    </div>
                  </div>
                </div>

                {/* Mini canvas preview — horizontal flow of nodes */}
                <div style={{padding:'12px 14px', background:'#F8FBF9', border:'1px dashed #C4E8D2', borderRadius:8, marginBottom:12, overflow:'hidden'}}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    {[
                      {c:'#8B5CF6', i:'⚡'},
                      {c:'#2DC56A', i:'💬'},
                      {c:'#F59E0B', i:'⏱'},
                      {c:'#2B9EF3', i:'⇄'},
                      {c:'#16A34A', i:'◉'},
                    ].slice(0, Math.min(5, j.steps)).map((n, i, arr) => (
                      <React.Fragment key={i}>
                        <div style={{width:30, height:30, borderRadius:7, background:'white', border:`1.5px solid ${n.c}`, color:n.c, display:'grid', placeItems:'center', fontSize:13, fontWeight:700, flexShrink:0}}>{n.i}</div>
                        {i<arr.length-1 && <div style={{flex:1, height:2, background:`linear-gradient(90deg, ${n.c}55, ${arr[i+1].c}55)`, minWidth:8}}/>}
                      </React.Fragment>
                    ))}
                    {j.steps>5 && <span style={{fontSize:11, color:'var(--label-03)', marginLeft:4}}>+{j.steps-5}</span>}
                  </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:10}}>
                  <div><div style={{fontSize:10, color:'var(--label-03)', fontWeight:600}}>KHÁCH ĐANG CHẠY</div><div style={{fontSize:15, fontWeight:700, marginTop:2}}>{j.audience.toLocaleString()}</div></div>
                  <div><div style={{fontSize:10, color:'var(--label-03)', fontWeight:600}}>HOÀN THÀNH</div><div style={{fontSize:15, fontWeight:700, marginTop:2, color:'#0EA5E9'}}>{j.completion}%</div></div>
                  <div><div style={{fontSize:10, color:'var(--label-03)', fontWeight:600}}>CONVERSION</div><div style={{fontSize:15, fontWeight:700, marginTop:2, color:j.conv>=20?'#22C55E':j.conv>=10?'#F59E0B':'var(--label-02)'}}>{j.conv}%</div></div>
                </div>

                <div style={{display:'flex', alignItems:'center', gap:6, paddingTop:10, borderTop:'1px solid var(--fill-04)'}}>
                  {j.channels.map(c => {
                    const ch = {zalo:{c:'#0068FF',l:'Zalo'},email:{c:'#EA580C',l:'Email'},zns:{c:'#0068FF',l:'ZNS'},sms:{c:'#16A34A',l:'SMS'},fb:{c:'#006AFF',l:'Messenger'}}[c];
                    return <span key={c} style={{padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:600, background:ch.c+'18', color:ch.c}}>{ch.l}</span>;
                  })}
                  <span style={{flex:1}}/>
                  <span style={{fontSize:11, color:'var(--primary)', fontWeight:700, display:'flex', alignItems:'center', gap:4}}>Mở canvas <Icon.ArrowRight style={{width:12, height:12}}/></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {open && <JourneyBuilder onClose={()=>setOpen(null)}/>}
    </div>
  );
}

window.JourneyModule = JourneyModule;
