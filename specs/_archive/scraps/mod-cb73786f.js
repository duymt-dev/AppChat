/* ============================================================
   ai-assist.jsx — Nút "Trợ lý AI" dùng chung + popup chat trung tâm
   Dùng: <window.AIAssistBtn label="Trợ lý AI" ctx="Tickets"/>
   Load sau tag-store.jsx, trước _bundle.jsx
   ============================================================ */
;(function(){
try {
  const AI = (n,p)=>{ const C=window.Icon&&window.Icon[n]; return C?React.createElement(C,p):null; };
  function AIAssistPanel({ ctx, onClose }){
    const [prompt,setPrompt]=React.useState('');
    const [msgs,setMsgs]=React.useState([]);
    const send=()=>{ if(!prompt.trim())return; const p=prompt; setMsgs(m=>[...m,{r:'u',t:p},{r:'a',t:p}]); setPrompt(''); };
    const sug={
      'Tickets':['Tóm tắt ticket quá hạn hôm nay','Gợi ý phản hồi cho khiếu nại trị liệu'],
      'Marketing':['Soạn chiến dịch ZNS nhắc tái khám','Phân khúc khách VIP chưa quay lại 60 ngày'],
      'Calendar':['Tạo lịch hẹn tư vấn tuần sau','Nhắc lịch tái khám cho khách hạng Vàng'],
      'Call Center':['Tóm tắt cuộc gọi nhỡ hôm nay','Soạn kịch bản gọi ra chăm sóc sau dịch vụ'],
      'AI Agents':['Tạo AI Agent CSKH cho Spa','Cấu hình routing theo intent đặt lịch'],
      'Workflow':['Tạo workflow chào mừng khách mới','Quy trình nhắc gia hạn thẻ tập'],
      'Báo cáo':['Phân tích xu hướng hội thoại tuần này','Vì sao tỷ lệ chuyển đổi AI giảm?'],
    }[ctx] || ['Tôi có thể giúp gì cho bạn?'];
    return (
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.5)',zIndex:2000,display:'grid',placeItems:'center',padding:24}}>
        <div onClick={e=>e.stopPropagation()} style={{width:480,maxWidth:'94vw',maxHeight:'86vh',display:'flex',flexDirection:'column',background:'white',borderRadius:16,boxShadow:'0 30px 80px rgba(17,24,39,.3)',overflow:'hidden'}}>
          <div style={{padding:'15px 18px',borderBottom:'1px solid var(--fill-03)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:34,height:34,borderRadius:10,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center'}}>{AI('Sparkles',{style:{width:17,height:17}})}</span>
            <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>Trợ lý AI · {ctx}</div><div style={{fontSize:11.5,color:'var(--label-02)'}}>Ra lệnh — AppChat AI hỗ trợ ngay trong {ctx}</div></div>
            <button className="btn-icon" onClick={onClose}>{AI('Close',{style:{width:18,height:18}})||'✕'}</button>
          </div>
          <div className="scroll" style={{flex:1,overflowY:'auto',padding:'16px 18px',display:'flex',flexDirection:'column',gap:11,background:'var(--fill-02)'}}>
            <div style={{display:'flex',gap:9,alignItems:'flex-start'}}>
              <span style={{width:28,height:28,borderRadius:8,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{AI('Sparkles',{style:{width:14,height:14}})}</span>
              <div style={{background:'white',border:'1px solid var(--fill-04)',borderRadius:'4px 12px 12px 12px',padding:'10px 12px',fontSize:12.5,lineHeight:1.55,maxWidth:'85%'}}>Xin chào! Mình là Trợ lý AI cho <b>{ctx}</b>. Mô tả việc cần làm — mình đề xuất &amp; thực hiện sau khi bạn xác nhận.</div>
            </div>
            {msgs.map((m,i)=> m.r==='u' ? (
              <div key={i} style={{display:'flex',justifyContent:'flex-end'}}><div style={{background:'var(--pr-dark-1)',color:'white',borderRadius:'12px 4px 12px 12px',padding:'9px 12px',fontSize:12.5,lineHeight:1.5,maxWidth:'85%'}}>{m.t}</div></div>
            ) : (
              <div key={i} style={{display:'flex',gap:9,alignItems:'flex-start'}}>
                <span style={{width:28,height:28,borderRadius:8,background:'var(--bg-green)',color:'var(--pr-dark-1)',display:'grid',placeItems:'center',flexShrink:0}}>{AI('Sparkles',{style:{width:14,height:14}})}</span>
                <div style={{flex:1,border:'1px solid var(--fill-04)',borderRadius:'4px 12px 12px 12px',overflow:'hidden',maxWidth:'88%',background:'white'}}>
                  <div style={{padding:'10px 13px',fontSize:12.5,color:'var(--label-01)',lineHeight:1.55}}>Mình đã hiểu yêu cầu: “<b>{m.t}</b>”. Mình đề xuất luồng xử lý phù hợp cho {ctx}. Bạn xác nhận để mình thực hiện, hay cần điều chỉnh gì không?</div>
                  {i===msgs.length-1 && <div style={{display:'flex',gap:8,padding:'10px 13px',borderTop:'1px solid var(--fill-03)'}}><button onClick={onClose} className="btn btn-primary btn-sm" style={{flex:1,justifyContent:'center'}}>{AI('Check',{style:{width:13,height:13}})} Xác nhận thực hiện</button></div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'12px 14px',borderTop:'1px solid var(--fill-03)',background:'white'}}>
            {msgs.length===0 && <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:9}}>{sug.map(x=>(<button key={x} onClick={()=>setPrompt(x)} style={{padding:'6px 11px',borderRadius:14,border:'1px solid var(--fill-04)',background:'var(--fill-02)',cursor:'pointer',fontSize:11.5,fontFamily:'inherit',color:'var(--label-02)'}}>{x}</button>))}</div>}
            <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={1} placeholder="Nhắn cho Trợ lý AI…" onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }} style={{flex:1,padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:12,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'none',lineHeight:1.4,maxHeight:90}}/>
              <button onClick={send} disabled={!prompt.trim()} className="btn btn-sm" style={{flexShrink:0,justifyContent:'center',background:'var(--primary)',color:'white',border:'none',opacity:prompt.trim()?1:.5,width:40,height:40,borderRadius:'50%',padding:0}}>{AI('Send',{style:{width:16,height:16}})}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  window.AIAssistBtn = function({ label='Trợ lý AI', ctx='AppChat', cls='btn btn-primary btn-sm' }){
    const [open,setOpen]=React.useState(false);
    return React.createElement(React.Fragment,null,
      React.createElement('button',{type:'button',className:cls,onClick:()=>setOpen(true),style:{gap:6}}, AI('Sparkles',{style:{width:14,height:14,color:'#fff'}}), label),
      open && React.createElement(AIAssistPanel,{ctx,onClose:()=>setOpen(false)})
    );
  };
  window.AIAssistOpen = function(ctx){
    var id='__ai_assist_global'; var d=document.getElementById(id);
    if(!d){ d=document.createElement('div'); d.id=id; document.body.appendChild(d); }
    var root = d.__root || (d.__root = ReactDOM.createRoot(d));
    var close=function(){ root.render(null); };
    root.render(React.createElement(AIAssistPanel,{ctx:ctx||'AppChat',onClose:close}));
  };
} catch(e){ console.error('ai-assist.jsx', e); }
})();
