/* ============================================================
   onboarding.jsx — First-run Onboarding Checklist
   • Widget card on Dashboard + floating launcher (persists across modules)
   • Admin/Owner only · progress bar + step counter (n/6)
   • Each step jumps to the real module/screen to do it for real
   • Auto-hides at 100%; re-openable from the floating launcher
   ============================================================ */
;(function(){
try {
const { useState: useOb, useEffect: useObEf, useCallback: useObCb } = React;

/* --- which user sees it: Admin/Owner only.
   In production this reads the authenticated user's workspace role;
   the demo account is the workspace Owner, so it shows. --- */
const OB_IS_ADMIN = true;

const OB_KEY = 'ac_onboarding_v1';

/* small icon helper bound to the global registry, with graceful fallback */
const ObIc = (name, props) => {
  const C = window.Icon && window.Icon[name];
  return C ? React.createElement(C, props) : null;
};

/* 6 activation steps — order = fastest path to the "aha" (channel → inbox) */
const OB_STEPS = [
  { k:'channel',    icon:'Plug',       title:'Kết nối kênh đầu tiên',
    desc:'Zalo OA, Facebook, Instagram… để tin nhắn chảy vào Hộp thư.',
    cta:'Kết nối kênh', run:()=> window.acOpenChannel && window.acOpenChannel() },
  { k:'ai',         icon:'Sparkles',   title:'Cấu hình AI Agent + Knowledge Base',
    desc:'Chọn persona, nối dataset để AI tự phân luồng & trả lời khách 24/7.',
    cta:'Thiết lập AI', nav:['automation'] },
  { k:'team',       icon:'Users',      title:'Mời thành viên team',
    desc:'Thêm đồng đội, phân quyền theo vai trò để cùng xử lý hội thoại.',
    cta:'Mời thành viên', nav:['settings','members'] },
  { k:'template',   icon:'Broadcast',  title:'Tạo Quick-reply / Template',
    desc:'Soạn câu trả lời nhanh & mẫu tin để phản hồi tức thì.',
    cta:'Tạo mẫu', nav:['broadcast'] },
  { k:'sla',        icon:'Activity',   title:'Thiết lập SLA & phân luồng Ticket',
    desc:'Quy tắc phản hồi, phân loại và escalation cho đội hỗ trợ.',
    cta:'Thiết lập SLA', nav:['activities'] },
];
const OB_TOTAL = OB_STEPS.length;

function obRead(){
  try { const v = JSON.parse(localStorage.getItem(OB_KEY)); return v && typeof v==='object' ? { done:v.done||{}, dismissed:!!v.dismissed } : { done:{}, dismissed:false }; }
  catch(e){ return { done:{}, dismissed:false }; }
}
function obWrite(v){ localStorage.setItem(OB_KEY, JSON.stringify(v)); window.dispatchEvent(new Event('ac-onboarding-change')); }

function useOnboard(){
  const [state, setState] = useOb(obRead);
  useObEf(()=>{ const h=()=>setState(obRead()); window.addEventListener('ac-onboarding-change', h); window.addEventListener('storage', h); return ()=>{ window.removeEventListener('ac-onboarding-change', h); window.removeEventListener('storage', h); }; },[]);
  const toggle  = useObCb((k)=>{ const s=obRead(); s.done={...s.done, [k]:!s.done[k]}; obWrite(s); },[]);
  const mark    = useObCb((k)=>{ const s=obRead(); if(!s.done[k]){ s.done={...s.done, [k]:true}; obWrite(s); } },[]);
  const dismiss = useObCb(()=>{ const s=obRead(); s.dismissed=true; obWrite(s); },[]);
  const reopen  = useObCb(()=>{ const s=obRead(); s.dismissed=false; obWrite(s); },[]);
  const reset   = useObCb(()=>{ obWrite({done:{}, dismissed:false}); },[]);
  const doneCount = OB_STEPS.filter(s=>state.done[s.k]).length;
  const pct = Math.round(doneCount/OB_TOTAL*100);
  return { state, toggle, mark, dismiss, reopen, reset, doneCount, pct };
}

function obRunStep(step, mark){
  if (step.run) step.run();
  else if (step.nav) window.acNavigate && window.acNavigate(step.nav[0], step.nav[1]);
  mark(step.k);
}

/* ---------- shared step list ---------- */
function ObStepList({ done, toggle, mark, onAfterRun }){
  return (
    <div style={{display:'flex', flexDirection:'column'}}>
      {OB_STEPS.map((s, i) => {
        const isDone = !!done[s.k];
        return (
          <div key={s.k} style={{
            display:'flex', alignItems:'flex-start', gap:12, padding:'13px 4px',
            borderTop: i===0 ? 'none' : '1px solid var(--fill-03)'
          }}>
            {/* check circle — toggleable */}
            <button onClick={()=>toggle(s.k)} title={isDone?'Đánh dấu chưa xong':'Đánh dấu đã xong'} style={{
              flexShrink:0, width:24, height:24, marginTop:1, borderRadius:'50%', cursor:'pointer',
              border: isDone ? 'none' : '2px solid var(--fill-04)',
              background: isDone ? 'var(--primary)' : 'white',
              color:'white', display:'grid', placeItems:'center', padding:0, transition:'all .15s'
            }}>
              {isDone ? ObIc('Check',{style:{width:14, height:14}}) : <span style={{fontSize:11, fontWeight:700, color:'var(--label-03)'}}>{i+1}</span>}
            </button>

            {/* icon chip */}
            <span style={{flexShrink:0, width:32, height:32, marginTop:-2, borderRadius:9,
              background: isDone ? 'var(--bg-green)' : 'var(--fill-02)',
              color: isDone ? 'var(--pr-dark-1)' : 'var(--label-02)',
              display:'grid', placeItems:'center'}}>{ObIc(s.icon,{style:{width:16, height:16}})}</span>

            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13.5, fontWeight:700, color:'var(--label-01)',
                textDecoration: isDone?'line-through':'none', opacity:isDone?.6:1}}>{s.title}</div>
              <div style={{fontSize:12, color:'var(--label-02)', marginTop:2, lineHeight:1.45}}>{s.desc}</div>
            </div>

            {/* CTA */}
            <button onClick={()=>{ obRunStep(s, mark); onAfterRun && onAfterRun(); }} style={{
              flexShrink:0, marginTop:1, display:'inline-flex', alignItems:'center', gap:5,
              padding:'6px 11px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
              border: isDone ? '1px solid var(--fill-04)' : '1px solid transparent',
              background: isDone ? 'white' : 'var(--primary)',
              color: isDone ? 'var(--label-02)' : 'white'
            }}>
              {isDone ? 'Mở lại' : s.cta} {!isDone && ObIc('ArrowRight',{style:{width:13, height:13}})}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- progress header (bar + counter) ---------- */
function ObProgress({ doneCount, pct }){
  return (
    <div>
      <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:7}}>
        <span style={{fontSize:12.5, fontWeight:700, color:'var(--pr-dark-2)'}}>{doneCount}/{OB_TOTAL} hoàn tất</span>
        <span style={{fontSize:12, color:'var(--label-03)'}}>· {pct}%</span>
      </div>
      <div style={{height:7, borderRadius:4, background:'var(--fill-03)', overflow:'hidden'}}>
        <div style={{height:'100%', width:pct+'%', borderRadius:4, background:'var(--grad-signature, var(--primary))', transition:'width .35s cubic-bezier(.4,0,.2,1)'}}/>
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard widget — shown when !dismissed && pct<100 (admin only)
   ============================================================ */
function OnboardingWidget(){
  const { state, toggle, mark, dismiss, reopen, doneCount, pct } = useOnboard();
  if (!OB_IS_ADMIN) return null;
  if (pct===100) return null;

  // "Ẩn" = thu gọn (collapsed) — vẫn hiển thị thanh nhỏ; chỉ mất khi hoàn tất 100%
  if (state.dismissed) {
    return (
      <button onClick={reopen} title="Mở lại checklist" style={{
        display:'flex', alignItems:'center', gap:11, width:'100%', textAlign:'left',
        background:'white', border:'1px solid var(--fill-04)', borderRadius:12,
        padding:'11px 16px', marginBottom:4, cursor:'pointer', fontFamily:'inherit', flexShrink:0
      }}>
        <span style={{flexShrink:0, width:30, height:30, borderRadius:9, background:'var(--grad-signature, var(--primary))', color:'white', display:'grid', placeItems:'center'}}>
          {ObIc('Sparkles',{style:{width:16, height:16}})}
        </span>
        <span style={{flex:1, minWidth:0}}>
          <span style={{display:'block', fontSize:13.5, fontWeight:700, color:'var(--label-01)'}}>Bắt đầu với AppChat</span>
          <span style={{display:'block', fontSize:11.5, color:'var(--label-02)'}}>{doneCount}/{OB_TOTAL} bước · {pct}% hoàn tất</span>
        </span>
        <span style={{flexShrink:0, height:6, width:90, borderRadius:3, background:'var(--fill-03)', overflow:'hidden'}}>
          <span style={{display:'block', height:'100%', width:pct+'%', background:'var(--grad-signature, var(--primary))'}}/>
        </span>
        <span style={{flexShrink:0, fontSize:12, fontWeight:700, color:'var(--primary)'}}>Mở rộng ›</span>
      </button>
    );
  }

  return (
    <div style={{
      background:'white', border:'1px solid var(--fill-04)', borderRadius:16,
      boxShadow:'0 1px 2px rgba(17,24,39,.04)', overflow:'hidden', marginBottom:4, flexShrink:0
    }}>
      <div style={{display:'flex', alignItems:'flex-start', gap:14, padding:'16px 18px 14px'}}>
        <span style={{flexShrink:0, width:40, height:40, borderRadius:11, background:'var(--grad-signature, var(--primary))', color:'white', display:'grid', placeItems:'center'}}>
          {ObIc('Sparkles',{style:{width:20, height:20}})}
        </span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:16, fontWeight:800, letterSpacing:'-.01em', color:'var(--label-01)'}}>Bắt đầu với AppChat</div>
          <div style={{fontSize:12.5, color:'var(--label-02)', marginTop:2}}>Hoàn tất {OB_TOTAL} bước để kích hoạt workspace và đưa AI Agent vào vận hành.</div>
        </div>
        <button onClick={dismiss} title="Thu gọn checklist" style={{flexShrink:0, padding:'5px 10px', borderRadius:7, border:'1px solid var(--fill-04)', background:'white', fontSize:12, fontWeight:600, color:'var(--label-02)', cursor:'pointer'}}>Thu gọn</button>
      </div>

      <div style={{padding:'0 18px 6px'}}><ObProgress doneCount={doneCount} pct={pct}/></div>

      <div style={{padding:'6px 18px 14px'}}>
        <ObStepList done={state.done} toggle={toggle} mark={mark}/>
      </div>
    </div>
  );
}

/* ============================================================
   Floating launcher — persists across all modules (admin only)
   ============================================================ */
function OnboardingLauncher(){
  /* Đã tắt theo yêu cầu: không hiển thị launcher checklist ở footer.
     Checklist vẫn còn dưới dạng card trên Dashboard. */
  return null;
}

function OnboardingLauncherLegacy(){
  const { state, toggle, mark, dismiss, doneCount, pct } = useOnboard();
  const [open, setOpen] = useOb(false);
  if (!OB_IS_ADMIN) return null;

  const complete = pct===100;
  const R=15, C=2*Math.PI*R, off=C*(1-pct/100);

  return (
    <>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed', inset:0, zIndex:1099}}/>
          <div style={{
            position:'fixed', left:90, bottom:84, width:392, maxWidth:'calc(100vw - 110px)', zIndex:1100,
            background:'white', border:'1px solid var(--fill-04)', borderRadius:16,
            boxShadow:'0 24px 64px rgba(17,24,39,.24)', overflow:'hidden'
          }}>
            <div style={{padding:'15px 18px 13px', borderBottom:'1px solid var(--fill-03)'}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{fontSize:15, fontWeight:800, color:'var(--label-01)', flex:1}}>
                  {complete ? 'Đã hoàn tất onboarding 🎉' : 'Bắt đầu với AppChat'}
                </span>
                <button onClick={()=>setOpen(false)} className="btn-icon" style={{flexShrink:0}}>{ObIc('Close',{style:{width:16, height:16}}) || '✕'}</button>
              </div>
              <div style={{marginTop:11}}><ObProgress doneCount={doneCount} pct={pct}/></div>
            </div>
            <div style={{padding:'4px 18px 12px', maxHeight:'56vh', overflowY:'auto'}}>
              <ObStepList done={state.done} toggle={toggle} mark={mark} onAfterRun={()=>setOpen(false)}/>
            </div>
            {complete && (
              <div style={{padding:'12px 18px', borderTop:'1px solid var(--fill-03)', background:'var(--bg-green)'}}>
                <button onClick={()=>{ dismiss(); setOpen(false); }} style={{width:'100%', height:38, borderRadius:9, border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:13, cursor:'pointer'}}>Tuyệt vời — đóng checklist</button>
              </div>
            )}
          </div>
        </>
      )}

      <button onClick={()=>setOpen(o=>!o)} title="Onboarding checklist" style={{
        position:'fixed', left:90, bottom:22, zIndex:900,
        display:'inline-flex', alignItems:'center', gap:9, padding:'8px 15px 8px 9px',
        borderRadius:26, border:'1px solid var(--fill-04)', background:'white',
        boxShadow:'0 10px 28px rgba(17,24,39,.16)', cursor:'pointer'
      }}>
        <span style={{position:'relative', width:34, height:34, flexShrink:0, display:'grid', placeItems:'center'}}>
          <svg width="34" height="34" viewBox="0 0 34 34" style={{position:'absolute', inset:0, transform:'rotate(-90deg)'}}>
            <circle cx="17" cy="17" r={R} fill="none" stroke="var(--fill-03)" strokeWidth="3"/>
            <circle cx="17" cy="17" r={R} fill="none" stroke="url(#ob-grad)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{transition:'stroke-dashoffset .4s'}}/>
            <defs><linearGradient id="ob-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--pr-dark-1, #16A34A)"/><stop offset="1" stopColor="var(--primary, #22C55E)"/></linearGradient></defs>
          </svg>
          <span style={{fontSize: complete?14:11, fontWeight:800, color:'var(--pr-dark-2)'}}>
            {complete ? (ObIc('Check',{style:{width:15, height:15, color:'var(--primary)'}}) || '✓') : doneCount+'/'+OB_TOTAL}
          </span>
        </span>
        <span style={{textAlign:'left', lineHeight:1.15, whiteSpace:'nowrap'}}>
          <span style={{display:'block', fontSize:12.5, fontWeight:800, color:'var(--label-01)'}}>Bắt đầu</span>
          <span style={{display:'block', fontSize:10.5, color:'var(--label-02)'}}>{doneCount}/{OB_TOTAL} bước</span>
        </span>
      </button>
    </>
  );
}

window.OnboardingWidget = OnboardingWidget;
window.OnboardingLauncher = OnboardingLauncher;
} catch(e){ console.error('onboarding.jsx', e); }
})();
