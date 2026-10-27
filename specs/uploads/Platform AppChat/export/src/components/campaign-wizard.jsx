/* ============================================================
   Campaign Wizard — Broadcast: Tạo chiến dịch đa kênh
   Step 1: chọn kênh  →  Step 2: chọn người nhận  →  Step 3: nội dung  →  Step 4: lên lịch
   Người nhận: từ segment có sẵn / chọn từ contacts / upload CSV / dán SĐT
   ============================================================ */
const { useState: useCW } = React;

const CW_CHANNELS = [
  { k:'zns',        l:'Zalo ZNS',     d:'Tin chính thức · template duyệt sẵn',     cost:'120₫/tin',  ic:'Z', c:'#0068FF' },
  { k:'zalo_oa',    l:'Zalo OA',      d:'Tin tự do tới khách đã quan tâm OA',       cost:'Miễn phí',   ic:'Z', c:'#0068FF' },
  { k:'sms',        l:'SMS',          d:'160 ký tự · brandname đã đăng ký',         cost:'80₫/tin',   ic:'S', c:'#A66B0E' },
  { k:'email',      l:'Email',        d:'HTML · 18,400 contacts có email',          cost:'Miễn phí',   ic:'@', c:'#1F8A4D' },
  { k:'facebook',   l:'FB Messenger', d:'Khách đã chat 24h gần đây',                cost:'Miễn phí',   ic:'f', c:'#1877F2' },
  { k:'whatsapp',   l:'WhatsApp',     d:'Template đã duyệt qua Meta',                cost:'250₫/tin',  ic:'W', c:'#25D366' },
];

const CW_SEGMENTS = [
  { k:'vip',        l:'Khách VIP',                  n:1240, d:'Hạng Vàng + Bạch kim · LTV ≥ 20M' },
  { k:'returning',  l:'Khách quay lại 90 ngày',     n:3820, d:'Đã mua ≥ 2 đơn trong 90 ngày qua' },
  { k:'cart_drop',  l:'Bỏ giỏ hàng 7 ngày',         n:642,  d:'Có sản phẩm trong giỏ chưa thanh toán' },
  { k:'cold',       l:'Khách inactive 90 ngày',     n:5430, d:'Chưa mua / chưa mở chat 90+ ngày' },
  { k:'new',        l:'Khách mới 30 ngày',          n:892,  d:'Đăng ký hoặc mua lần đầu trong 30 ngày' },
  { k:'all',        l:'Toàn bộ contacts',           n:18400, d:'Tất cả khách hàng có opt-in marketing' },
];

const CW_LISTS = [
  { k:'list_flash',   l:'Flash Sale 20/04 — đã mua', n:2420, when:'20/04/2026', src:'Auto' },
  { k:'list_birthday',l:'Khách sinh nhật T5/2026',    n:340,  when:'01/05/2026', src:'Smart' },
  { k:'list_event',   l:'Tham dự sự kiện Hè 2025',    n:870,  when:'08/2025',    src:'Manual' },
  { k:'list_lead',    l:'Lead form Landing — Q1',     n:1218, when:'Q1/2026',    src:'Form' },
];

function CampaignWizard({ onClose }){
  const [step, setStep] = useCW(1); // 1..4
  const [channels, setChannels] = useCW(['zns']);
  const [audMode, setAudMode] = useCW('segment'); // segment | list | upload | manual
  const [pickedSegments, setPickedSegments] = useCW(['vip']);
  const [pickedLists, setPickedLists] = useCW([]);
  const [campaignName, setCampaignName] = useCW('Flash Sale Hè 2026 — Khách Vàng');
  const [content, setContent] = useCW('Chào anh/chị {{name}}! Flash Sale 30% áo polo cotton tới 23:59 hôm nay. Xem ngay 👉 {{link}}');
  const [schedule, setSchedule] = useCW('now'); // now | later | optimal
  const [sendDate, setSendDate] = useCW('22/04/2026');
  const [sendTime, setSendTime] = useCW('18:00');

  // compute audience size
  const audSize = (
    audMode==='segment' ? pickedSegments.reduce((s,k)=>s+(CW_SEGMENTS.find(x=>x.k===k)?.n||0),0) :
    audMode==='list'    ? pickedLists.reduce((s,k)=>s+(CW_LISTS.find(x=>x.k===k)?.n||0),0) :
    audMode==='upload'  ? 1842 :
    /* manual */          12
  );
  const cost = channels.includes('zns') ? Math.round(audSize * 120 / 1000) : channels.includes('sms') ? Math.round(audSize * 80 / 1000) : 0;

  const next = ()=> setStep(s=>Math.min(4, s+1));
  const prev = ()=> setStep(s=>Math.max(1, s-1));

  const toggleArr = (arr, set, k) => set(arr.includes(k) ? arr.filter(x=>x!==k) : [...arr, k]);

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(14,21,16,.5)',zIndex:200,
        display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',width:'min(900px, 100%)',maxHeight:'90vh',
          borderRadius:16,boxShadow:'0 24px 60px rgba(0,0,0,.25)',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* HEADER */}
        <div style={{padding:'18px 24px',borderBottom:'1px solid var(--fill-04)'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
            <div>
              <h2 style={{margin:0,fontSize:18,letterSpacing:'-0.01em'}}>Tạo chiến dịch Broadcast</h2>
              <p style={{margin:'2px 0 0',fontSize:12,color:'var(--label-02)'}}>Gửi tin tới khách hàng qua nhiều kênh — chọn từ phân khúc có sẵn hoặc danh sách đã lưu.</p>
            </div>
            <span style={{flex:1}}/>
            <button onClick={onClose} className="btn btn-ghost btn-sm"><Icon.Close/></button>
          </div>
          {/* Step indicator */}
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {[
              {n:1, l:'Kênh gửi'},
              {n:2, l:'Người nhận'},
              {n:3, l:'Nội dung'},
              {n:4, l:'Lên lịch & gửi'},
            ].map((s,i)=>{
              const active = step >= s.n;
              const current = step === s.n;
              return (
                <React.Fragment key={s.n}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 10px',borderRadius:99,
                      background:current?'var(--primary)':active?'var(--bg-green,rgba(45,197,106,.1))':'var(--fill-03)',
                      color:current?'white':active?'var(--pr-dark-2,#0F5D30)':'var(--label-03)',
                      fontWeight:current?700:500,fontSize:12.5}}>
                    <span style={{width:18,height:18,borderRadius:9,background:current?'rgba(255,255,255,.3)':active?'var(--primary)':'var(--fill-04)',
                        color:current?'white':active?'white':'var(--label-03)',
                        display:'grid',placeItems:'center',fontSize:10.5,fontWeight:800}}>{active?(current?s.n:'✓'):s.n}</span>
                    {s.l}
                  </div>
                  {i<3 && <div style={{flex:1,height:1,background:step>s.n?'var(--primary)':'var(--fill-04)',maxWidth:40}}/>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* BODY scroll */}
        <div className="scroll" style={{flex:1,overflow:'auto',padding:'20px 24px'}}>
          {step===1 && <Step1Channels channels={channels} toggle={(k)=>toggleArr(channels,setChannels,k)}/>}
          {step===2 && <Step2Audience
            audMode={audMode} setAudMode={setAudMode}
            pickedSegments={pickedSegments} setPickedSegments={setPickedSegments}
            pickedLists={pickedLists} setPickedLists={setPickedLists}
            audSize={audSize}/>}
          {step===3 && <Step3Content
            channels={channels} campaignName={campaignName} setCampaignName={setCampaignName}
            content={content} setContent={setContent}/>}
          {step===4 && <Step4Schedule
            schedule={schedule} setSchedule={setSchedule}
            sendDate={sendDate} setSendDate={setSendDate}
            sendTime={sendTime} setSendTime={setSendTime}
            channels={channels} audSize={audSize} cost={cost}
            campaignName={campaignName} content={content}/>}
        </div>

        {/* FOOTER */}
        <div style={{padding:'14px 24px',borderTop:'1px solid var(--fill-04)',display:'flex',gap:10,alignItems:'center',background:'var(--fill-02)'}}>
          <div style={{fontSize:12,color:'var(--label-02)'}}>
            <b>Tóm tắt:</b> {channels.length} kênh · {audSize.toLocaleString('vi-VN')} người nhận
            {cost>0 && <> · ~<b style={{color:'var(--label-01)'}}>{cost.toLocaleString('vi-VN')}.000₫</b></>}
          </div>
          <span style={{flex:1}}/>
          {step>1 && <button className="btn btn-ghost" onClick={prev}>← Quay lại</button>}
          {step<4
            ? <button className="btn btn-primary" onClick={next} disabled={
                (step===1 && channels.length===0) ||
                (step===2 && audSize===0)
              }>Tiếp tục →</button>
            : <>
              <button className="btn btn-ghost">Lưu nháp</button>
              <button className="btn btn-ghost"><Icon.Shield/> Gửi duyệt</button>
              <button className="btn btn-primary"><Icon.Send/> Gửi ngay</button>
            </>}
        </div>
      </div>
    </div>
  );
}

/* ============= STEP 1: Channels ============= */
function Step1Channels({ channels, toggle }){
  return (
    <div>
      <div style={{marginBottom:16}}>
        <h3 style={{margin:'0 0 6px',fontSize:15}}>Chọn kênh gửi</h3>
        <p style={{margin:0,fontSize:13,color:'var(--label-02)'}}>Có thể chọn nhiều kênh — hệ thống sẽ ưu tiên kênh khách quan tâm OA / có app, fallback sang SMS / Email.</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
        {CW_CHANNELS.map(ch=>{
          const on = channels.includes(ch.k);
          return (
            <div key={ch.k} onClick={()=>toggle(ch.k)}
              style={{padding:14,border:'2px solid '+(on?'var(--primary)':'var(--fill-04)'),
                  borderRadius:12,background:on?'rgba(45,197,106,.04)':'white',
                  display:'flex',gap:12,alignItems:'flex-start',cursor:'pointer',transition:'.15s'}}>
              <div style={{width:36,height:36,borderRadius:10,background:ch.c,
                color:'white',display:'grid',placeItems:'center',fontWeight:800,flexShrink:0}}>{ch.ic}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <b style={{fontSize:13.5}}>{ch.l}</b>
                  <span style={{fontSize:10.5,color:'var(--label-03)',padding:'1px 6px',background:'var(--fill-03)',borderRadius:4}}>{ch.cost}</span>
                </div>
                <p style={{margin:0,fontSize:12,color:'var(--label-02)',lineHeight:1.4}}>{ch.d}</p>
              </div>
              <div style={{width:20,height:20,borderRadius:10,border:'2px solid '+(on?'var(--primary)':'var(--fill-04)'),
                  background:on?'var(--primary)':'white',display:'grid',placeItems:'center',flexShrink:0,marginTop:2}}>
                {on && <Icon.Check style={{width:12,height:12,color:'white'}}/>}
              </div>
            </div>
          );
        })}
      </div>

      {channels.length>1 && (
        <div style={{marginTop:14,padding:'10px 14px',background:'rgba(43,158,243,.08)',borderRadius:10,
            display:'flex',alignItems:'center',gap:10,fontSize:12.5,color:'var(--label-02)'}}>
          <Icon.Sparkles style={{width:16,height:16,color:'var(--info)',flexShrink:0}}/>
          <span><b>Đa kênh thông minh:</b> AI sẽ chọn kênh tối ưu cho từng khách (OA → SMS → Email). Tiết kiệm ~32% chi phí so với gửi tất cả.</span>
        </div>
      )}
    </div>
  );
}

/* ============= STEP 2: Audience ============= */
function Step2Audience({ audMode, setAudMode, pickedSegments, setPickedSegments, pickedLists, setPickedLists, audSize }){
  const tabs = [
    { k:'segment', l:'Phân khúc thông minh', d:'Tự cập nhật theo điều kiện', ic:Icon.Users },
    { k:'list',    l:'Danh sách đã lưu',     d:'CSV / lead form / sự kiện',  ic:Icon.Files },
    { k:'upload',  l:'Upload CSV mới',       d:'SĐT, email từ Excel',         ic:Icon.Upload },
    { k:'manual',  l:'Nhập thủ công',        d:'Dán SĐT / email từng dòng',  ic:Icon.Edit },
  ];

  const toggleArr = (arr, set, k) => set(arr.includes(k) ? arr.filter(x=>x!==k) : [...arr, k]);

  return (
    <div>
      <div style={{marginBottom:16}}>
        <h3 style={{margin:'0 0 6px',fontSize:15}}>Chọn người nhận</h3>
        <p style={{margin:0,fontSize:13,color:'var(--label-02)'}}>Chọn từ phân khúc động, danh sách có sẵn, upload CSV, hoặc nhập thủ công.</p>
      </div>

      {/* Mode tabs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:18}}>
        {tabs.map(t=>{
          const Ic = t.ic;
          const on = audMode===t.k;
          return (
            <button key={t.k} onClick={()=>setAudMode(t.k)}
              style={{padding:'12px 10px',border:'2px solid '+(on?'var(--primary)':'var(--fill-04)'),
                  borderRadius:10,background:on?'rgba(45,197,106,.04)':'white',cursor:'pointer',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:6,fontFamily:'inherit',transition:'.15s'}}>
              <Ic style={{width:18,height:18,color:on?'var(--primary)':'var(--label-02)'}}/>
              <div style={{fontWeight:700,fontSize:12.5,color:on?'var(--primary)':'var(--label-01)',textAlign:'center'}}>{t.l}</div>
              <div style={{fontSize:10.5,color:'var(--label-03)',textAlign:'center'}}>{t.d}</div>
            </button>
          );
        })}
      </div>

      {/* Mode content */}
      {audMode==='segment' && (
        <div>
          <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-03)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>
            Phân khúc thông minh ({CW_SEGMENTS.length})
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {CW_SEGMENTS.map(seg=>{
              const on = pickedSegments.includes(seg.k);
              return (
                <div key={seg.k} onClick={()=>toggleArr(pickedSegments,setPickedSegments,seg.k)}
                  style={{padding:'12px 14px',border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'),
                      background:on?'rgba(45,197,106,.04)':'white',
                      borderRadius:10,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'.15s'}}>
                  <div style={{width:18,height:18,borderRadius:4,border:'2px solid '+(on?'var(--primary)':'var(--fill-04)'),
                      background:on?'var(--primary)':'white',display:'grid',placeItems:'center',flexShrink:0}}>
                    {on && <Icon.Check style={{width:10,height:10,color:'white'}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <b style={{fontSize:13.5}}>{seg.l}</b>
                    <div style={{fontSize:11.5,color:'var(--label-02)',marginTop:1}}>{seg.d}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--label-01)',fontVariantNumeric:'tabular-nums'}}>{seg.n.toLocaleString('vi-VN')}</div>
                    <div style={{fontSize:10.5,color:'var(--label-03)'}}>người</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {audMode==='list' && (
        <div>
          <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:11.5,fontWeight:700,color:'var(--label-03)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
              Danh sách đã lưu ({CW_LISTS.length})
            </span>
            <span style={{flex:1}}/>
            <button className="btn btn-ghost btn-sm"><Icon.Plus/> Tạo danh sách mới</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {CW_LISTS.map(ls=>{
              const on = pickedLists.includes(ls.k);
              return (
                <div key={ls.k} onClick={()=>toggleArr(pickedLists,setPickedLists,ls.k)}
                  style={{padding:'12px 14px',border:'1px solid '+(on?'var(--primary)':'var(--fill-04)'),
                      background:on?'rgba(45,197,106,.04)':'white',
                      borderRadius:10,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'.15s'}}>
                  <div style={{width:18,height:18,borderRadius:4,border:'2px solid '+(on?'var(--primary)':'var(--fill-04)'),
                      background:on?'var(--primary)':'white',display:'grid',placeItems:'center',flexShrink:0}}>
                    {on && <Icon.Check style={{width:10,height:10,color:'white'}}/>}
                  </div>
                  <Icon.Files style={{width:16,height:16,color:'var(--label-03)'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <b style={{fontSize:13.5}}>{ls.l}</b>
                    <div style={{fontSize:11.5,color:'var(--label-02)',marginTop:1}}>Tạo {ls.when} · Nguồn: {ls.src}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--label-01)',fontVariantNumeric:'tabular-nums'}}>{ls.n.toLocaleString('vi-VN')}</div>
                    <div style={{fontSize:10.5,color:'var(--label-03)'}}>contacts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {audMode==='upload' && (
        <div>
          <div style={{padding:'40px 20px',border:'2px dashed var(--fill-04)',borderRadius:12,textAlign:'center',
              background:'var(--fill-02)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'var(--bg-green,rgba(45,197,106,.1))',
                display:'grid',placeItems:'center',color:'var(--primary)',margin:'0 auto 12px'}}>
              <Icon.Upload style={{width:24,height:24}}/>
            </div>
            <h4 style={{margin:'0 0 6px',fontSize:14}}>Kéo file CSV / Excel vào đây</h4>
            <p style={{margin:'0 0 14px',fontSize:12,color:'var(--label-02)'}}>Hoặc bấm để chọn từ máy tính · Tối đa 100,000 dòng</p>
            <button className="btn btn-primary btn-sm">Chọn file</button>
            <p style={{margin:'14px 0 0',fontSize:11.5,color:'var(--label-03)'}}>
              Cột bắt buộc: <code style={{padding:'1px 5px',background:'var(--fill-03)',borderRadius:4}}>phone</code> hoặc <code style={{padding:'1px 5px',background:'var(--fill-03)',borderRadius:4}}>email</code> · Optional: name, tag, custom fields
            </p>
          </div>
          <div style={{marginTop:14,padding:'10px 14px',background:'#FEF7E5',borderRadius:10,
              borderLeft:'3px solid var(--warning)',fontSize:12,color:'var(--label-02)'}}>
            <b style={{color:'var(--label-01)'}}>Lưu ý PDPL:</b> Chỉ upload danh sách có opt-in marketing rõ ràng. AppChat sẽ scan và bỏ các số trong danh sách chặn (DNC).
          </div>
          <div style={{marginTop:10,padding:'10px 14px',background:'rgba(45,197,106,.06)',borderRadius:10,
              display:'flex',alignItems:'center',gap:10,fontSize:12.5}}>
            <Icon.Check style={{width:16,height:16,color:'var(--primary)'}}/>
            <span>Đã upload <b>customers_april.csv</b> · <b>1,842</b> dòng hợp lệ · 38 trùng / 12 chặn</span>
          </div>
        </div>
      )}

      {audMode==='manual' && (
        <div>
          <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-03)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>
            Nhập SĐT / email · mỗi dòng một số
          </div>
          <textarea defaultValue={"0909123456\n0938224901\nlinh.pham@bena.vn\n0906998234\n+84935110287\n..."}
            style={{width:'100%',minHeight:180,padding:12,border:'1px solid var(--fill-04)',
                borderRadius:10,fontFamily:"'JetBrains Mono','SF Mono',monospace",fontSize:12.5,resize:'vertical',
                fontFamily:'inherit'}}/>
          <div style={{marginTop:10,fontSize:11.5,color:'var(--label-03)'}}>
            12 số hợp lệ · hỗ trợ định dạng <code>0909...</code>, <code>+84...</code>, email
          </div>
        </div>
      )}

      {/* AUDIENCE SUMMARY */}
      <div style={{marginTop:20,padding:'14px 16px',background:'var(--fill-02)',borderRadius:12,
          display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:42,height:42,borderRadius:12,background:'var(--primary)',
            color:'white',display:'grid',placeItems:'center',flexShrink:0}}>
          <Icon.Users style={{width:20,height:20}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11.5,color:'var(--label-03)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Tổng người nhận</div>
          <div style={{fontSize:24,fontWeight:800,color:'var(--label-01)',letterSpacing:'-0.02em',lineHeight:1.1,fontVariantNumeric:'tabular-nums'}}>
            {audSize.toLocaleString('vi-VN')}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11.5,color:'var(--label-03)'}}>Đã lọc trùng / DNC</div>
          <div style={{fontSize:13,fontWeight:600,color:'var(--success)'}}>−86 trùng · −12 chặn</div>
        </div>
      </div>
    </div>
  );
}

/* ============= STEP 3: Content ============= */
function Step3Content({ channels, campaignName, setCampaignName, content, setContent }){
  const len = content.length;
  const sms_segments = Math.ceil(len / 160);
  const hasZNS = channels.includes('zns');

  return (
    <div>
      <div style={{marginBottom:16}}>
        <h3 style={{margin:'0 0 6px',fontSize:15}}>Soạn nội dung</h3>
        <p style={{margin:0,fontSize:13,color:'var(--label-02)'}}>Cá nhân hóa với <code style={{padding:'1px 5px',background:'var(--fill-03)',borderRadius:4}}>{'{{'}name{'}}'}</code>, <code style={{padding:'1px 5px',background:'var(--fill-03)',borderRadius:4}}>{'{{'}order_id{'}}'}</code>, <code style={{padding:'1px 5px',background:'var(--fill-03)',borderRadius:4}}>{'{{'}link{'}}'}</code></p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:18}}>
        {/* Editor */}
        <div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--label-02)',marginBottom:6}}>Tên chiến dịch (nội bộ)</label>
            <input value={campaignName} onChange={e=>setCampaignName(e.target.value)}
              style={{width:'100%',padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10,fontSize:13.5,fontFamily:'inherit'}}/>
          </div>

          {hasZNS && (
            <div style={{marginBottom:12,padding:'10px 14px',background:'rgba(43,158,243,.08)',borderRadius:10,
                display:'flex',alignItems:'center',gap:10,fontSize:12,color:'var(--label-02)'}}>
              <Icon.Shield style={{width:16,height:16,color:'var(--info)',flexShrink:0}}/>
              <span><b>ZNS:</b> phải dùng template đã duyệt. <span style={{color:'var(--info)',fontWeight:600,cursor:'pointer'}}>Chọn từ 24 template duyệt sẵn →</span></span>
            </div>
          )}

          <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--label-02)',marginBottom:6}}>Nội dung tin</label>
          <textarea value={content} onChange={e=>setContent(e.target.value)}
            style={{width:'100%',minHeight:160,padding:12,border:'1px solid var(--fill-04)',
                borderRadius:10,fontSize:13.5,resize:'vertical',fontFamily:'inherit',lineHeight:1.5}}/>
          <div style={{display:'flex',gap:14,marginTop:6,fontSize:11.5,color:'var(--label-03)'}}>
            <span>{len} ký tự</span>
            {channels.includes('sms') && <span>SMS: {sms_segments} phân đoạn (×80₫)</span>}
            <span style={{flex:1}}/>
            <button className="btn btn-ghost btn-sm" style={{padding:'4px 8px',fontSize:11.5}}><Icon.Sparkles style={{width:12,height:12}}/> AI viết lại</button>
          </div>

          {/* Variable chips */}
          <div style={{marginTop:14,padding:'10px 14px',background:'var(--fill-02)',borderRadius:10}}>
            <div style={{fontSize:11.5,fontWeight:600,color:'var(--label-02)',marginBottom:6}}>Chèn biến cá nhân hóa:</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {['{{name}}','{{phone}}','{{order_id}}','{{tier}}','{{points}}','{{link}}'].map(v=>(
                <span key={v} style={{padding:'3px 10px',background:'white',border:'1px solid var(--fill-04)',
                    borderRadius:6,fontSize:11.5,fontFamily:"'JetBrains Mono','SF Mono',monospace",
                    color:'var(--primary)',cursor:'pointer'}}>{v}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-03)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Preview</div>
          <div style={{padding:'14px 14px 18px',background:'#0e151022',backgroundImage:'linear-gradient(180deg, #2DC56A11, #0e151011)',borderRadius:14,border:'1px solid var(--fill-04)'}}>
            <div style={{background:'white',borderRadius:12,padding:'12px 14px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',
                marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,paddingBottom:8,borderBottom:'1px solid var(--fill-03)'}}>
                <div style={{width:24,height:24,borderRadius:6,background:'#0068FF',color:'white',
                    display:'grid',placeItems:'center',fontSize:11,fontWeight:800}}>Z</div>
                <div style={{fontSize:11.5}}>
                  <b>BênA Official</b>
                  <div style={{fontSize:10,color:'var(--label-03)'}}>Zalo OA · Tin chính thức</div>
                </div>
              </div>
              <div style={{fontSize:12.5,lineHeight:1.5,color:'var(--label-01)'}}>
                {content.replace('{{name}}','anh Hoàng').replace('{{link}}','bena.vn/sale')}
              </div>
              <div style={{marginTop:10,padding:'8px 12px',background:'#0068FF',color:'white',
                  borderRadius:8,fontSize:12,fontWeight:600,textAlign:'center'}}>Mua ngay</div>
            </div>
            <div style={{fontSize:11,color:'var(--label-03)',textAlign:'center',marginTop:6}}>
              Hiển thị với <b>Hoàng Mai Hà</b> · {channels.length} kênh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============= STEP 4: Schedule ============= */
function Step4Schedule({ schedule, setSchedule, sendDate, setSendDate, sendTime, setSendTime, channels, audSize, cost, campaignName, content }){
  return (
    <div>
      <div style={{marginBottom:16}}>
        <h3 style={{margin:'0 0 6px',fontSize:15}}>Lên lịch &amp; Gửi</h3>
        <p style={{margin:0,fontSize:13,color:'var(--label-02)'}}>Chọn thời điểm gửi — AI có thể tối ưu giờ gửi theo từng khách.</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
        {[
          {k:'now',     l:'Gửi ngay',                          d:'Bắt đầu gửi sau khi duyệt · ~3 phút cho 1,000 tin'},
          {k:'later',   l:'Hẹn giờ cố định',                   d:'Gửi vào thời điểm bạn chọn'},
          {k:'optimal', l:'AI tối ưu giờ gửi (Smart Send)',     d:'Mỗi khách nhận tin vào giờ họ thường mở app · Open rate +24%'},
        ].map(opt=>(
          <div key={opt.k} onClick={()=>setSchedule(opt.k)}
            style={{padding:14,border:'2px solid '+(schedule===opt.k?'var(--primary)':'var(--fill-04)'),
                background:schedule===opt.k?'rgba(45,197,106,.04)':'white',
                borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'.15s'}}>
            <div style={{width:18,height:18,borderRadius:9,border:'2px solid '+(schedule===opt.k?'var(--primary)':'var(--fill-04)'),
                background:schedule===opt.k?'var(--primary)':'white',display:'grid',placeItems:'center',flexShrink:0}}>
              {schedule===opt.k && <span style={{width:8,height:8,borderRadius:4,background:'white'}}/>}
            </div>
            <div style={{flex:1}}>
              <b style={{fontSize:13.5}}>{opt.l}{opt.k==='optimal' && <span style={{marginLeft:6,fontSize:10,padding:'1px 6px',background:'var(--grad-signature,linear-gradient(135deg,#2DC56A,#2B9EF3))',color:'white',borderRadius:4}}>AI</span>}</b>
              <div style={{fontSize:12,color:'var(--label-02)',marginTop:1}}>{opt.d}</div>
            </div>
          </div>
        ))}
      </div>

      {schedule==='later' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18,padding:14,background:'var(--fill-02)',borderRadius:10}}>
          <div>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--label-02)',marginBottom:6}}>Ngày gửi</label>
            <input value={sendDate} onChange={e=>setSendDate(e.target.value)}
              style={{width:'100%',padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10,fontSize:13.5,fontFamily:'inherit'}}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--label-02)',marginBottom:6}}>Giờ gửi</label>
            <input value={sendTime} onChange={e=>setSendTime(e.target.value)}
              style={{width:'100%',padding:'10px 12px',border:'1px solid var(--fill-04)',borderRadius:10,fontSize:13.5,fontFamily:'inherit'}}/>
          </div>
        </div>
      )}

      {/* Final review */}
      <div style={{padding:16,border:'1px solid var(--fill-04)',borderRadius:12,background:'var(--fill-02)'}}>
        <div style={{fontSize:11.5,fontWeight:700,color:'var(--label-03)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Tóm tắt chiến dịch</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {l:'Tên chiến dịch', v:campaignName},
            {l:'Kênh gửi',       v:channels.map(k=>CW_CHANNELS.find(x=>x.k===k)?.l).join(', ')},
            {l:'Người nhận',     v:audSize.toLocaleString('vi-VN')+' người'},
            {l:'Thời điểm gửi',  v:schedule==='now'?'Ngay sau duyệt':schedule==='later'?`${sendDate} · ${sendTime}`:'AI Smart Send'},
            {l:'Chi phí ước tính', v:cost>0?cost.toLocaleString('vi-VN')+'.000₫':'Miễn phí (Email/Zalo OA)'},
            {l:'Doanh thu dự kiến', v:Math.round(audSize*0.045*450).toLocaleString('vi-VN')+'.000₫', good:true},
          ].map((r,i)=>(
            <div key={i}>
              <div style={{fontSize:11,color:'var(--label-03)',fontWeight:500,marginBottom:2}}>{r.l}</div>
              <div style={{fontSize:13,fontWeight:600,color:r.good?'var(--success)':'var(--label-01)',lineHeight:1.4}}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:14,padding:'10px 14px',background:'#FEF7E5',borderRadius:10,
          borderLeft:'3px solid var(--warning)',fontSize:12,color:'var(--label-02)',display:'flex',alignItems:'center',gap:10}}>
        <Icon.Shield style={{width:16,height:16,color:'var(--warning)',flexShrink:0}}/>
        <span><b>Cần duyệt:</b> Chiến dịch &gt; 1,000 người sẽ tự động gửi sang quy trình duyệt 2 tầng (Marketing Lead + Compliance) trước khi chạy.</span>
      </div>
    </div>
  );
}

window.CampaignWizard = CampaignWizard;
