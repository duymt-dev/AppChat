// Messages module — Professional Omnichannel inbox with AI Co-pilot v2
const { useState: useS, useMemo: useM, useEffect: useE, useRef: useR } = React;

// =====================================================================
// FOLDER RAIL — Left-most column grouping conversations by source/status
// =====================================================================
function FolderRail({ active, setActive }) {
  const items = [
    { group: 'HỘP THƯ' },
    { k:'all',      l:'Tất cả',        i:<Icon.Inbox/>,   n:128 },
    { k:'unread',   l:'Chưa đọc',      i:<Icon.Mail/>,    n:23, accent:'var(--primary)' },
    { k:'mentions', l:'Mention tôi',   i:<Icon.AtSign/>,  n:4 },
    { k:'starred',  l:'Đã gắn sao',    i:<Icon.Star/>,    n:12 },
    { k:'mine',     l:'Của tôi',       i:<Icon.User/>,    n:18 },
    { k:'team',     l:'Của nhóm',      i:<Icon.Users/>,   n:56 },
    { k:'spam',     l:'Spam / đã chặn',i:<Icon.Shield/>,  n:2 },
    { group: 'TRẠNG THÁI AI' },
    { k:'ai_auto',  l:'AI tự xử',      i:<Icon.Bot/>,     n:41, accent:'var(--primary)' },
    { k:'ai_wait',  l:'AI chờ duyệt',  i:<Icon.Sparkles/>,n:7,  accent:'var(--warning)' },
    { k:'ai_esc',   l:'Cần can thiệp', i:<Icon.AlertTri/>,n:3,  accent:'var(--danger)' },
    { group: 'KÊNH' },
    { k:'zalo',     l:'Zalo OA',       ch:'zalo',        n:42 },
    { k:'facebook', l:'Facebook',      ch:'facebook',    n:28 },
    { k:'tiktok',   l:'TikTok Shop',   ch:'tiktok',      n:19 },
    { k:'shopee',   l:'Shopee',        ch:'shopee',      n:15 },
    { k:'web',      l:'Livechat web',  ch:'web',         n:9  },
    { k:'whatsapp', l:'WhatsApp',      ch:'whatsapp',    n:5  },
    { k:'instagram',l:'Instagram',     ch:'instagram',   n:4  },
    { k:'email',    l:'Email',         i:<Icon.Mail/>,   n:11 },
    { group: 'BỘ LỌC ĐÃ LƯU' },
    { k:'vip',      l:'⭐ Khách VIP',        n:24 },
    { k:'cart',     l:'🛒 Giỏ hàng chờ',    n:17 },
    { k:'complain', l:'⚠️ Khiếu nại mới',   n:2  },
  ];

  return (
    <div style={{
      width:216, flexShrink:0, borderRight:'1px solid var(--fill-04)',
      background:'var(--fill-01)', display:'flex', flexDirection:'column', overflow:'hidden'
    }}>
      <div style={{padding:'12px 14px', borderBottom:'1px solid var(--fill-04)'}}>
        <button className="btn btn-primary" style={{width:'100%', justifyContent:'center'}}>
          <Icon.Plus/> Tin nhắn mới
        </button>
      </div>
      <div className="scroll" style={{flex:1, padding:'8px 8px 16px'}}>
        {items.map((it, idx) => {
          if (it.group) return (
            <div key={'g'+idx} style={{
              fontSize:10, fontWeight:700, letterSpacing:'.1em', color:'var(--label-03)',
              padding:'14px 8px 6px'
            }}>{it.group}</div>
          );
          const on = active === it.k;
          return (
            <button key={it.k} onClick={()=>setActive(it.k)} style={{
              width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 9px',
              borderRadius:7, fontSize:13, fontWeight: on?600:500,
              color: on ? 'var(--pr-dark-2)' : 'var(--label-01)',
              background: on ? 'var(--bg-green)' : 'transparent',
              cursor:'pointer', border:'none', textAlign:'left', marginBottom:1
            }}>
              <span style={{width:16, height:16, display:'grid', placeItems:'center', color: it.accent||'var(--label-02)'}}>
                {it.ch ? <ChannelBadge name={it.ch} size={16}/> :
                 it.i ? React.cloneElement(it.i, {style:{width:14, height:14}}) : null}
              </span>
              <span style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{it.l}</span>
              <span style={{
                fontSize:10.5, fontWeight:700,
                color: on ? 'var(--pr-dark-2)' : 'var(--label-03)',
                minWidth:18, textAlign:'right'
              }}>{it.n}</span>
            </button>
          );
        })}
      </div>
      <div style={{padding:12, borderTop:'1px solid var(--fill-04)', background:'white'}}>
        <button
          onClick={()=>window.dispatchEvent(new CustomEvent('ac:open-connect-channel'))}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 10px',
            borderRadius:8, border:'1px dashed var(--primary)', background:'var(--bg-green)',
            color:'var(--pr-dark-2)', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit',
            marginBottom:8
          }}>
          <Icon.Plus style={{width:14, height:14}}/>
          <span style={{flex:1, textAlign:'left'}}>Kết nối kênh mới</span>
          <span style={{fontSize:10, color:'var(--label-03)', fontWeight:500}}>+9</span>
        </button>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:6, height:6, borderRadius:3, background:'var(--success)'}}/>
          <span style={{fontSize:10.5, color:'var(--label-03)'}}>9 kênh · đồng bộ <b style={{color:'var(--label-02)'}}>vừa xong</b></span>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// CONVERSATION LIST — with search, filter chips, sort, density toggle
// =====================================================================
function ConversationList({ active, setActive }) {
  const { CONVERSATIONS } = window.AppData;
  const { initials, avatarBgFromName } = window.AppData.helpers;
  const [q, setQ] = useS('');
  const [sort, setSort] = useS('recent');
  const [density, setDensity] = useS('comfortable'); // comfortable | compact
  const [multi, setMulti] = useS(false);
  const [selected, setSelected] = useS(new Set());

  const filtered = useM(() => {
    let list = CONVERSATIONS;
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || (c.last||'').toLowerCase().includes(s));
    }
    if (sort === 'unread') list = [...list].sort((a,b) => (b.unread||0) - (a.unread||0));
    if (sort === 'priority') list = [...list].sort((a,b) => (b.priority||0) - (a.priority||0));
    return list;
  }, [q, sort]);

  const intentMeta = {
    'BUY': {bg:'rgba(45,197,106,.12)', color:'var(--pr-dark-2)', label:'Mua hàng'},
    'COMPARE': {bg:'rgba(43,158,243,.12)', color:'#0A65C2', label:'So sánh'},
    'COMPLAIN': {bg:'rgba(227,63,63,.12)', color:'var(--danger)', label:'Khiếu nại'},
    'SUPPORT': {bg:'rgba(245,168,48,.15)', color:'#C27614', label:'Hỗ trợ'},
    'CHITCHAT': {bg:'var(--fill-03)', color:'var(--label-02)', label:'Hỏi thường'},
    'RETURN': {bg:'rgba(143,109,235,.12)', color:'#6645C7', label:'Đổi/Trả'},
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%', borderRight:'1px solid var(--fill-04)',
      minWidth:360, width:360, background:'white'
    }}>
      {/* Header */}
      <div style={{padding:'12px 14px 10px', borderBottom:'1px solid var(--fill-04)'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
          <div>
            <div style={{fontWeight:700, fontSize:16, letterSpacing:-0.2}}>Hộp thư</div>
            <div style={{fontSize:11, color:'var(--label-03)'}}>{filtered.length} hội thoại · 23 chưa đọc</div>
          </div>
          <button className="btn btn-primary btn-sm" title="Kết nối kênh mới"
            onClick={()=>window.dispatchEvent(new CustomEvent('ac:open-connect-channel'))}
            style={{gap:6, fontWeight:700, whiteSpace:'nowrap'}}>
            <Icon.Plus style={{width:15, height:15}}/> Kết Nối Kênh
          </button>
        </div>

        <div className="search-wrap" style={{marginBottom:10}}>
          <Icon.Search/>
          <input className="search" placeholder="Tìm khách, SĐT, nội dung, mã lịch hẹn…"
            value={q} onChange={e=>setQ(e.target.value)} style={{width:'100%'}}/>
          <span className="kbd" style={{position:'absolute', right:8, top:'50%', transform:'translateY(-50%)'}}>⌘K</span>
        </div>

        {/* Sắp xếp + quick filter chips */}
        <div style={{display:'flex', gap:6, overflowX:'auto', marginBottom: multi?10:0}}>
          {[
            {k:'recent',   l:'Mới nhất'},
            {k:'unread',   l:'Chưa đọc'},
            {k:'priority', l:'Ưu tiên'},
            {k:'vip',      l:'VIP'},
            {k:'sla',      l:'Sắp quá SLA'},
            {k:'cart',     l:'Có giỏ hàng'},
          ].map(s => (
            <button key={s.k} onClick={()=>setSort(s.k)} style={{
              padding:'4px 10px', borderRadius:14, fontSize:11.5, fontWeight:600, whiteSpace:'nowrap',
              border:'1px solid '+(sort===s.k?'transparent':'var(--fill-04)'),
              background: sort===s.k ? 'var(--label-01)' : 'white',
              color: sort===s.k ? 'white' : 'var(--label-02)', cursor:'pointer'
            }}>{s.l}</button>
          ))}
        </div>

        {multi && (
          <div style={{display:'flex', gap:6, padding:'8px 0 0', fontSize:11.5}}>
            <span style={{color:'var(--label-02)'}}>Đã chọn {selected.size}</span>
            <span style={{flex:1}}/>
            <button className="btn btn-ghost btn-sm"><Icon.Tag/></button>
            <button className="btn btn-ghost btn-sm"><Icon.User/></button>
            <button className="btn btn-ghost btn-sm"><Icon.Archive/></button>
          </div>
        )}
      </div>

      {/* Danh sách */}
      <div className="scroll" style={{flex:1}}>
        {filtered.map(c => {
          const on = active === c.id;
          const im = intentMeta[c.intent || 'CHITCHAT'] || intentMeta.CHITCHAT;
          const compact = density === 'compact';
          return (
            <button key={c.id} onClick={()=>setActive(c.id)}
              style={{
                width:'100%', display:'flex', gap:10, padding: compact?'8px 12px':'11px 14px',
                borderLeft: on ? '3px solid var(--primary)' : '3px solid transparent',
                background: on ? 'var(--bg-green)' : 'white',
                borderBottom:'1px solid var(--fill-03)',
                textAlign:'left', cursor:'pointer', alignItems:'flex-start', position:'relative'
              }}>
              {multi && (
                <input type="checkbox" style={{marginTop:6, accentColor:'var(--primary)'}}
                  checked={selected.has(c.id)}
                  onChange={e=>{
                    e.stopPropagation();
                    const n = new Set(selected);
                    e.target.checked ? n.add(c.id) : n.delete(c.id);
                    setSelected(n);
                  }}
                  onClick={e=>e.stopPropagation()}/>
              )}
              <div style={{position:'relative', flexShrink:0}}>
                <div className="avatar" style={{background:avatarBgFromName(c.name), width: compact?34:40, height: compact?34:40, fontSize: compact?12:13}}>
                  {initials(c.name)}
                </div>
                <span style={{position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:7, background:'white', display:'grid', placeItems:'center', boxShadow:'0 0 0 1px white'}}>
                  <ChannelBadge name={c.channel} size={12}/>
                </span>
                {c.online && <span style={{position:'absolute', top:-1, right:-1, width:9, height:9, borderRadius:5, background:'var(--success)', border:'2px solid white'}}/>}
              </div>

              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6}}>
                  <div style={{display:'flex', alignItems:'center', gap:4, minWidth:0, flex:1}}>
                    {c.priority === 2 && <span title="Ưu tiên cao" style={{color:'var(--danger)', fontSize:12}}>●</span>}
                    {c.pinned && <Icon.Pin style={{width:11, height:11, color:'var(--label-03)', flexShrink:0}}/>}
                    <span style={{
                      fontWeight: c.unread>0 ? 700 : 600, fontSize:13.5,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                    }}>{c.name}</span>
                    {c.vip && <span style={{
                      fontSize:9, fontWeight:800, padding:'1px 4px', borderRadius:3,
                      background:'linear-gradient(135deg,#F5A830,#E88A1C)', color:'white', flexShrink:0
                    }}>VIP</span>}
                  </div>
                  <div style={{color: c.sla ? 'var(--danger)':'var(--label-03)', fontSize:11, flexShrink:0, fontWeight: c.sla?700:400}}>
                    {c.sla ? '⏱ '+c.sla : c.time}
                  </div>
                </div>

                {!compact && (
                  <div style={{color:'var(--label-03)', fontSize:11, marginBottom:3, display:'flex', gap:6, alignItems:'center'}}>
                    <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.channelAccount}</span>
                  </div>
                )}

                <div style={{
                  color: c.unread>0 ? 'var(--label-01)':'var(--label-02)',
                  fontSize:12.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  fontWeight: c.unread>0 ? 600 : 400, marginBottom: compact?2:5
                }}>
                  {c.lastFrom==='me' && <span style={{color:'var(--label-03)'}}>Bạn: </span>}
                  {c.last}
                </div>

                {!compact && (
                  <div style={{display:'flex', gap:4, alignItems:'center', flexWrap:'wrap'}}>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                      background: im.bg, color: im.color
                    }}>{im.label}</span>
                    {c.assignee === 'Claude Cowork' ? (
                      <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--bg-green)', color:'var(--pr-dark-2)', fontWeight:600, display:'inline-flex', alignItems:'center', gap:3}}>
                        <Icon.Sparkles style={{width:9, height:9}}/> AI
                      </span>
                    ) : (
                      <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--fill-03)', color:'var(--label-02)', fontWeight:600}}>
                        {c.assignee}
                      </span>
                    )}
                    {c.hasOrder && <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(43,158,243,.1)', color:'#0A65C2', fontWeight:600}}>📅 Lịch hẹn</span>}
                    {c.tags?.slice(0,1).map(t => (
                      <span key={t} style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'white', border:'1px solid var(--fill-04)', color:'var(--label-02)', fontWeight:500}}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {c.unread > 0 && (
                <span style={{
                  minWidth:18, height:18, padding:'0 5px', borderRadius:9,
                  background:'var(--primary)', color:'white', fontSize:10, fontWeight:800,
                  display:'grid', placeItems:'center', position:'absolute',
                  right:14, top: compact?11:14
                }}>{c.unread}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// CHAT HEADER — Enhanced with SLA timer, quick actions
// =====================================================================
function ChatHeader({ conv }) {
  const { initials, avatarBgFromName } = window.AppData.helpers;
  return (
    <div style={{padding:'10px 16px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:12, background:'white'}}>
      <div style={{position:'relative'}}>
        <div className="avatar lg" style={{background:avatarBgFromName(conv.name)}}>
          {initials(conv.name)}
        </div>
        <span style={{position:'absolute', bottom:-2, right:-2, width:16, height:16, borderRadius:8, background:'white', display:'grid', placeItems:'center'}}>
          <ChannelBadge name={conv.channel} size={14}/>
        </span>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{fontWeight:700, fontSize:15}}>{conv.name}</div>
          {conv.online && <span style={{fontSize:11, color:'var(--success)', display:'inline-flex', alignItems:'center', gap:4, fontWeight:600}}>
            <span style={{width:6, height:6, borderRadius:3, background:'var(--success)'}}/> Đang online
          </span>}
          <span style={{fontSize:9, fontWeight:800, padding:'2px 5px', borderRadius:3, background:'linear-gradient(135deg,#F5A830,#E88A1C)', color:'white'}}>VIP BẠC</span>
          <span style={{fontSize:10.5, padding:'2px 6px', borderRadius:4, background:'var(--bg-green)', color:'var(--pr-dark-2)', fontWeight:600}}>
            Ý định MUA · độ tin 92%
          </span>
        </div>
        <div style={{color:'var(--label-02)', fontSize:11.5, display:'flex', gap:10, alignItems:'center', marginTop:2}}>
          <span>{conv.channelAccount}</span>
          <span style={{opacity:.4}}>·</span>
          <span>Phụ trách: <b style={{color:'var(--label-01)'}}>{conv.assignee}</b></span>
          <span style={{opacity:.4}}>·</span>
          <span>5 buổi liệu trình · <b style={{color:'var(--pr-dark-2)'}}>3.214.000 ₫</b></span>
          <span style={{opacity:.4}}>·</span>
          <span style={{display:'inline-flex', alignItems:'center', gap:3, color:'var(--warning)', fontWeight:600}}>
            <Icon.Clock style={{width:11, height:11}}/> SLA còn 3:42
          </span>
        </div>
      </div>
      <div style={{display:'flex', gap:2}}>
        <button className="btn-icon" title="Tìm trong hội thoại"><Icon.Search/></button>
        <button className="btn-icon" title="Gọi thoại"><Icon.Phone/></button>
        <button className="btn-icon" title="Gọi video"><Icon.Video/></button>
        <button className="btn-icon" title="Chuyển agent"><Icon.UserPlus/></button>
        <div style={{width:1, background:'var(--fill-04)', margin:'0 4px'}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles style={{color:'var(--primary)'}}/> Tóm tắt</button>
        <button className="btn btn-ghost btn-sm"><Icon.Star/> Gắn sao</button>
        <button className="btn-icon"><Icon.More/></button>
      </div>
    </div>
  );
}

// =====================================================================
// PINNED ACTION BAR — Order in progress + live AI translation
// =====================================================================
function PinnedBar() {
  return (
    <div style={{
      borderBottom:'1px solid var(--fill-04)', background:'linear-gradient(90deg, #FFF8E8, #FFFDF7)',
      padding:'8px 16px', display:'flex', alignItems:'center', gap:12, fontSize:12
    }}>
      <div style={{display:'flex', alignItems:'center', gap:6, color:'#8B5E0C', fontWeight:600}}>
        <Icon.Pin style={{width:12, height:12}}/>
        <span>📌 Ghim:</span>
      </div>
      <span>Khách nhờ <b>giữ buổi liệu trình HIFU lúc 14:00 hôm nay</b></span>
      <span style={{flex:1}}/>
      <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>Bỏ ghim</button>
    </div>
  );
}

// =====================================================================
// CHAT THREAD — enriched with reactions, reply-to, system events
// =====================================================================
function ChatThread() {
  const { ACTIVE_THREAD } = window.AppData;
  const endRef = useR();
  useE(() => { endRef.current?.scrollTo?.(0, 999999); }, []);

  return (
    <div ref={endRef} className="scroll" style={{
      flex:1, padding:'16px 24px',
      background:`
        radial-gradient(circle at 20% 0%, rgba(45,197,106,.04), transparent 40%),
        radial-gradient(circle at 80% 100%, rgba(43,158,243,.03), transparent 40%),
        linear-gradient(180deg, #FAFBFC 0%, #ffffff 80%)
      `,
    }}>
      {/* System event */}
      <div style={{textAlign:'center', margin:'6px 0 14px'}}>
        <span style={{fontSize:10.5, color:'var(--label-03)', padding:'3px 10px', background:'white', border:'1px solid var(--fill-04)', borderRadius:12}}>
          Claude Cowork đã chuyển hội thoại cho <b>Trâm (Sales Lead)</b> · 10:42
        </span>
      </div>
      <div style={{textAlign:'center', marginBottom:16}}>
        <span style={{fontSize:11, color:'var(--label-02)', padding:'3px 10px', background:'white', border:'1px solid var(--fill-04)', borderRadius:12, fontWeight:600}}>
          Hôm nay · 20/04/2026
        </span>
      </div>

      {/* Khách hàng msg 1 */}
      <MsgBubble
        from="them" name="CL" avatarBg="hsl(12 62% 52%)"
        text="Em ơi, bên spa mình còn lịch HIFU chiều nay không ạ? Chị muốn đặt buổi 6 trong liệu trình."
        time="10:38" channel="Zalo OA" replyTo={null}
        reactions={[{e:'❤️', n:1}]}
      />

      {/* Khách hàng msg 2 — with image */}
      <MsgBubble
        from="them" name="CL" avatarBg="hsl(12 62% 52%)"
        text="Em xem mẫu này nha 👇"
        time="10:38" channel="Zalo OA"
        image={{label:'Soi da tuần trước', grad:'linear-gradient(135deg,#FFD5C2,#FF9A66)'}}
      />

      {/* Voice message from customer */}
      <MsgBubble
        from="them" name="CL" avatarBg="hsl(12 62% 52%)"
        voice={{duration:'0:12'}} time="10:39" channel="Zalo OA"
      />

      {/* AI intent analyzer inline */}
      <div style={{display:'flex', justifyContent:'center', margin:'4px 0 12px'}}>
        <div style={{
          display:'inline-flex', gap:8, alignItems:'center',
          background:'white', border:'1px dashed rgba(45,197,106,.4)',
          padding:'6px 12px', borderRadius:20, fontSize:11
        }}>
          <Icon.Sparkles style={{width:12, height:12, color:'var(--primary)'}}/>
          <span style={{fontWeight:600, color:'var(--pr-dark-2)'}}>AI phân tích:</span>
          <span style={{color:'var(--label-02)'}}>Ý định <b style={{color:'var(--label-01)'}}>MUA HÀNG</b> · đã chuyển giọng nói → text</span>
          <span style={{color:'var(--label-03)'}}>· độ tin 92%</span>
        </div>
      </div>

      {/* Agent msg — reply-to the voice */}
      <MsgBubble
        from="me" name="T" time="10:40" agent="Trâm"
        replyTo={{who:'Chị Lan', text:'🎤 Tin nhắn thoại · 0:12'}}
        text="Dạ chị ơi, em check kho ngay giúp chị 💚"
        status="read"
      />

      {/* Agent sticker */}
      <MsgBubble
        from="me" name="T" time="10:40" agent="Trâm"
        sticker="💚" status="read"
      />

      {/* Agent product card */}
      <MsgBubble
        from="me" name="T" time="10:41" agent="Trâm" status="read"
        product={{name:'HIFU nâng cơ + Mesotherapy', price:'1.500.000 ₫/buổi', sku:'LT-HIFU-06', stock:'Còn lịch 14:00'}}
        reactions={[{e:'❤️', n:1},{e:'👍', n:1}]}
      />

      {/* Khách hàng file */}
      <MsgBubble
        from="them" name="CL" avatarBg="hsl(12 62% 52%)"
        file={{name:'bang-size-be-na.pdf', size:'420 KB', pages:'2 trang', ext:'PDF'}}
        time="10:41" channel="Zalo OA"
      />

      {/* Khách hàng location */}
      <MsgBubble
        from="them" name="CL" avatarBg="hsl(12 62% 52%)"
        location={{name:'Số 128 Tôn Đức Thắng', addr:'Đống Đa, Hà Nội'}}
        text="Địa chỉ giao cho chị nha em 📍"
        time="10:42" channel="Zalo OA"
      />

      {/* Typing indicator */}
      <div style={{display:'flex', gap:8, marginBottom:10, maxWidth:'72%'}}>
        <div className="avatar sm" style={{background:'hsl(12 62% 52%)'}}>CL</div>
        <div style={{background:'white', border:'1px solid var(--fill-04)', borderRadius:14, padding:'12px 14px', display:'flex', gap:4, alignItems:'center'}}>
          <span style={{width:6, height:6, borderRadius:3, background:'var(--label-03)', animation:'typDot 1.2s infinite'}}/>
          <span style={{width:6, height:6, borderRadius:3, background:'var(--label-03)', animation:'typDot 1.2s infinite .2s'}}/>
          <span style={{width:6, height:6, borderRadius:3, background:'var(--label-03)', animation:'typDot 1.2s infinite .4s'}}/>
          <span style={{fontSize:10.5, color:'var(--label-03)', marginLeft:4}}>Chị Lan đang soạn…</span>
        </div>
      </div>

      {/* AI Co-pilot card */}
      <AISuggestionCard/>
      <style>{`@keyframes typDot { 0%, 60%, 100% { opacity:.3; transform: translateY(0); } 30% { opacity:1; transform: translateY(-2px); } }`}</style>
    </div>
  );
}

function MsgHoverBar({isMe}) {
  return (
    <div className="msg-hover-bar" style={{
      position:'absolute', top:-14, [isMe?'right':'left']: 8,
      display:'none', gap:2, background:'white',
      border:'1px solid var(--fill-04)', borderRadius:20, padding:'3px 4px',
      boxShadow:'0 4px 12px rgba(0,0,0,.08)', zIndex:2
    }}>
      {['❤️','👍','😆','😮','😢','🙏'].map((e,i)=>(
        <button key={i} style={{width:22, height:22, border:'none', background:'transparent', cursor:'pointer', borderRadius:11, fontSize:13, padding:0, transition:'transform .15s'}}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.3)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          {e}
        </button>
      ))}
      <div style={{width:1, background:'var(--fill-04)', margin:'3px 2px'}}/>
      <button className="btn-icon" style={{width:22, height:22}} title="Trả lời"><Icon.MessageSquare style={{width:11, height:11}}/></button>
      <button className="btn-icon" style={{width:22, height:22}} title="Chuyển tiếp"><Icon.Send style={{width:11, height:11}}/></button>
      <button className="btn-icon" style={{width:22, height:22}} title="Sao chép"><Icon.Copy style={{width:11, height:11}}/></button>
      <button className="btn-icon" style={{width:22, height:22}} title="Ghim"><Icon.Pin style={{width:11, height:11}}/></button>
      <button className="btn-icon" style={{width:22, height:22}} title="Gắn sao"><Icon.Star style={{width:11, height:11}}/></button>
      <button className="btn-icon" style={{width:22, height:22}} title="Thêm"><Icon.More style={{width:11, height:11}}/></button>
    </div>
  );
}

function MsgBubble({from, name, avatarBg, text, time, channel, image, product, agent, status, reactions, replyTo, voice, sticker, file, location, seenBy}) {
  const isMe = from === 'me';
  return (
    <div className="msg-row" style={{
      display:'flex', marginBottom:10, gap:8, maxWidth:'70%',
      marginLeft: isMe ? 'auto' : 0, flexDirection: isMe ? 'row-reverse' : 'row',
      position:'relative'
    }}
    onMouseEnter={e=>{const bar = e.currentTarget.querySelector('.msg-hover-bar'); if(bar) bar.style.display='inline-flex';}}
    onMouseLeave={e=>{const bar = e.currentTarget.querySelector('.msg-hover-bar'); if(bar) bar.style.display='none';}}
    >
      <div className="avatar sm" style={{background: isMe ? 'var(--primary)' : avatarBg}}>{name}</div>
      <div style={{textAlign: isMe ? 'right' : 'left', position:'relative'}}>
        <MsgHoverBar isMe={isMe}/>
        {replyTo && (
          <div style={{
            fontSize:11, color:'var(--label-02)', padding:'6px 10px',
            borderLeft:'3px solid '+(isMe?'rgba(255,255,255,.5)':'var(--primary)'),
            background: isMe?'rgba(45,197,106,.1)':'var(--fill-02)',
            borderRadius:6, marginBottom:3, maxWidth:280, textAlign:'left'
          }}>
            <div style={{fontWeight:700, fontSize:10.5, color: isMe?'var(--pr-dark-2)':'var(--primary)', marginBottom:2}}>↳ {replyTo.who}</div>
            <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{replyTo.text}</div>
          </div>
        )}
        {sticker && (
          <div style={{fontSize:72, lineHeight:1, padding:'4px 0'}}>{sticker}</div>
        )}
        {voice && (
          <div style={{
            background: isMe?'var(--primary)':'white', color: isMe?'white':'var(--label-01)',
            border: isMe?'none':'1px solid var(--fill-04)',
            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding:'8px 12px', display:'flex', alignItems:'center', gap:10, minWidth:220,
            boxShadow: isMe?'0 2px 6px rgba(45,197,106,.2)':'0 1px 2px rgba(0,0,0,.03)'
          }}>
            <button style={{width:30, height:30, borderRadius:15, border:'none', background: isMe?'rgba(255,255,255,.25)':'var(--primary)', color: isMe?'white':'white', cursor:'pointer', display:'grid', placeItems:'center'}}>
              <Icon.Play style={{width:12, height:12}}/>
            </button>
            <div style={{display:'flex', gap:1.5, alignItems:'center', flex:1}}>
              {[4,8,14,20,16,22,10,18,24,14,20,12,16,22,10,14,18,8,12,6].map((h,i)=>(
                <div key={i} style={{width:2, height:h, borderRadius:1, background: isMe?'rgba(255,255,255,.7)':'var(--label-03)'}}/>
              ))}
            </div>
            <span style={{fontSize:10.5, opacity:.85, fontVariantNumeric:'tabular-nums'}}>{voice.duration}</span>
          </div>
        )}
        {file && (
          <div style={{
            background: isMe?'var(--primary)':'white', color: isMe?'white':'var(--label-01)',
            border: isMe?'none':'1px solid var(--fill-04)',
            borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'center', gap:10, minWidth:240, textAlign:'left',
            boxShadow: isMe?'0 2px 6px rgba(45,197,106,.2)':'0 1px 2px rgba(0,0,0,.03)'
          }}>
            <div style={{width:38, height:38, borderRadius:8, background: isMe?'rgba(255,255,255,.2)':'#FEE2E2', color: isMe?'white':'#DC2626', display:'grid', placeItems:'center', fontSize:10, fontWeight:800, flexShrink:0}}>
              {file.ext || 'PDF'}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{file.name}</div>
              <div style={{fontSize:10.5, opacity:.75}}>{file.size} · {file.pages || ''}</div>
            </div>
            <button className="btn-icon" style={{width:24, height:24, color: isMe?'white':'var(--label-02)'}}><Icon.Download style={{width:13, height:13}}/></button>
          </div>
        )}
        {location && (
          <div style={{
            background:'white', border:'1px solid var(--fill-04)', borderRadius:12, overflow:'hidden', width:260
          }}>
            <div style={{
              height:120, background:`
                linear-gradient(120deg, #D5E8D4 25%, transparent 25%),
                linear-gradient(60deg, #DFEAD8 25%, transparent 25%),
                linear-gradient(#E8F0E4, #D8E8D4)`,
              position:'relative'
            }}>
              <div style={{position:'absolute', top:'45%', left:'50%', transform:'translate(-50%,-100%)', fontSize:28}}>📍</div>
            </div>
            <div style={{padding:10, textAlign:'left'}}>
              <div style={{fontSize:12.5, fontWeight:700}}>{location.name}</div>
              <div style={{fontSize:11, color:'var(--label-02)'}}>{location.addr}</div>
            </div>
          </div>
        )}
        {text && (
          <div style={{
            background: isMe ? 'var(--primary)' : 'white',
            color: isMe ? 'white' : 'var(--label-01)',
            border: isMe ? 'none' : '1px solid var(--fill-04)',
            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            padding:'10px 13px', fontSize:13.5, textAlign:'left',
            boxShadow: isMe ? '0 2px 6px rgba(45,197,106,.2)' : '0 1px 2px rgba(0,0,0,.03)'
          }}>
            {text}
          </div>
        )}
        {image && (
          <div style={{width:180, height:200, background:image.grad, borderRadius:12, marginTop:4, border:'1px solid var(--fill-04)', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', inset:0, display:'grid', placeItems:'center', color:'white', fontWeight:700, fontSize:11, textAlign:'center', padding:10}}>
              👗<br/>{image.label}
            </div>
            <div style={{position:'absolute', top:8, right:8, display:'flex', gap:4}}>
              <button style={{width:24, height:24, borderRadius:12, background:'rgba(0,0,0,.5)', color:'white', border:'none', cursor:'pointer', fontSize:10}} title="Tìm nguồn hàng">🔍</button>
            </div>
          </div>
        )}
        {product && (
          <div style={{marginTop:6, background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:10, width:280, display:'flex', gap:10, textAlign:'left', boxShadow:'var(--shadow-sm)'}}>
            <div style={{width:60, height:60, borderRadius:8, background:'linear-gradient(135deg,#BCEDCC,#58D28A)', display:'grid', placeItems:'center', fontSize:26, flexShrink:0}}>👗</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:12.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{product.name}</div>
              <div style={{color:'var(--primary)', fontWeight:800, fontSize:15}}>{product.price}</div>
              <div style={{display:'flex', gap:8, fontSize:10.5, color:'var(--label-02)', marginTop:2}}>
                <span>{product.sku}</span>
                <span style={{color:'var(--success)', fontWeight:600}}>{product.stock}</span>
              </div>
              <div style={{display:'flex', gap:4, marginTop:6}}>
                <button style={{fontSize:10.5, padding:'3px 8px', borderRadius:12, border:'1px solid var(--primary)', background:'var(--primary)', color:'white', cursor:'pointer', fontWeight:600}}>+ Thêm vào đơn</button>
                <button style={{fontSize:10.5, padding:'3px 8px', borderRadius:12, border:'1px solid var(--fill-04)', background:'white', cursor:'pointer', color:'var(--label-02)'}}>Xem</button>
              </div>
            </div>
          </div>
        )}
        {reactions?.length > 0 && (
          <div style={{display:'inline-flex', gap:4, marginTop:3, background:'white', border:'1px solid var(--fill-04)', borderRadius:12, padding:'2px 7px', fontSize:11.5, boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>
            {reactions.map((r,i) => <span key={i} style={{display:'inline-flex', gap:2, alignItems:'center'}}><span style={{fontSize:13}}>{r.e}</span><span style={{color:'var(--label-02)', fontWeight:600}}>{r.n}</span></span>)}
          </div>
        )}
        <div style={{color:'var(--label-03)', fontSize:10.5, marginTop:3, display:'flex', gap:4, alignItems:'center', justifyContent: isMe?'flex-end':'flex-start'}}>
          {isMe && agent && <span>{agent} · </span>}
          <span>{time}</span>
          {channel && <span>· qua {channel}</span>}
          {status === 'sent'   && <span style={{color:'var(--label-03)'}}> · ✓</span>}
          {status === 'delivered' && <span style={{color:'var(--label-03)'}}> · ✓✓</span>}
          {status === 'read' && <span style={{color:'var(--primary)', fontWeight:600}}> · ✓✓ đã xem</span>}
        </div>
      </div>
    </div>
  );
}

function AISuggestionCard() {
  const [tab, setTab] = useS(0);
  const replies = [
    {tag:'Thân thiện', text:'Dạ size 3–5 tuổi vẫn còn nhiều chị Lan nhé! Em gửi lại link size đầy đủ. Shop giao Đống Đa trong 4–6 giờ nếu đặt trước 14h, freeship đơn từ 200k. Chị muốn em giữ 1 cái size 4 chị qua xem thử không ạ? 💚'},
    {tag:'Ngắn gọn', text:'Dạ còn đủ size chị Lan ơi. Em giữ 1 cái size 4 tới 15h chiều cho chị thử nhé? Freeship nội HN.'},
    {tag:'Up-sell',  text:'Dạ còn size 3, 4, 5 chị Lan nhé. Mẫu này đi kèm áo thun họa tiết 99k rất hợp — bộ sưu tập SS26 đang sale 15% combo. Em gửi link cả set chị xem nha? 💚'},
  ];

  return (
    <div style={{maxWidth:'72%', marginBottom:10}}>
      <div style={{
        background:'linear-gradient(135deg, rgba(45,197,106,.08), rgba(43,158,243,.06))',
        border:'1px solid rgba(45,197,106,.3)', borderRadius:14, padding:12,
        boxShadow:'0 4px 16px rgba(45,197,106,.08)'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
          <div style={{width:22, height:22, borderRadius:6, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white'}}>
            <Icon.Sparkles style={{width:14, height:14}}/>
          </div>
          <div style={{fontWeight:700, fontSize:12.5}} className="ai-gradient-text">AI Co-pilot · 3 đề xuất</div>
          <span style={{marginLeft:'auto', fontSize:10, padding:'2px 6px', background:'white', border:'1px solid var(--fill-04)', borderRadius:10, color:'var(--label-02)'}}>
            Dựa trên lịch sử + catalogue + giọng thương hiệu
          </span>
        </div>

        <div style={{display:'flex', gap:4, marginBottom:8}}>
          {replies.map((r,i) => (
            <button key={i} onClick={()=>setTab(i)} style={{
              padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:600, cursor:'pointer',
              border: '1px solid '+(tab===i?'var(--primary)':'var(--fill-04)'),
              background: tab===i ? 'var(--primary)' : 'white',
              color: tab===i ? 'white' : 'var(--label-02)'
            }}>{r.tag}</button>
          ))}
        </div>

        <div style={{background:'white', borderRadius:10, padding:'10px 12px', fontSize:13, border:'1px solid var(--fill-04)', lineHeight:1.5}}>
          {replies[tab].text}
        </div>
        <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
          <button className="btn btn-primary btn-sm"><Icon.Send style={{width:12, height:12}}/> Gửi ngay</button>
          <button className="btn btn-ghost btn-sm"><Icon.Edit/> Chỉnh rồi gửi</button>
          <button className="btn btn-ghost btn-sm"><Icon.Refresh/> Tạo lại</button>
          <span style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm" style={{color:'var(--label-03)'}}>👎 Không phù hợp</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// COMPOSER — Tabs, rich actions, slash commands, attached order
// =====================================================================
function Composer() {
  const [mode, setMode] = useS('manual');
  const [text, setText] = useS('');
  const [recording, setRecording] = useS(false);
  const [showSlash, setShowSlash] = useS(false);
  const [showSticker, setShowSticker] = useS(false);
  const [showAttach, setShowAttach] = useS(false);
  const [replyPreview, setReplyPreview] = useS({who:'Chị Lan', text:'Địa chỉ giao cho chị nha em 📍'});
  const [attachedItems, setAttachedItems] = useS([
    {name:'HIFU nâng cơ + Meso', sku:'LT-HIFU-06', qty:1, price:1500000},
  ]);
  const total = attachedItems.reduce((s,x)=>s+x.price*x.qty, 0);

  const slashCmds = [
    {k:'/reply',   l:'Chọn quick reply đã lưu', i:<Icon.Bolt/>},
    {k:'/service', l:'Chèn dịch vụ / liệu trình', i:<Icon.Bolt/>},
    {k:'/booking', l:'Đặt lịch hẹn nhanh', i:<Icon.Calendar/>},
    {k:'/translate',l:'AI dịch tin nhắn',  i:<Icon.Globe/>},
    {k:'/rewrite', l:'AI viết lại / sửa giọng', i:<Icon.Sparkles/>},
    {k:'/profile', l:'Tra cứu hồ sơ điều trị / khách hàng', i:<Icon.User/>},
    {k:'/summary', l:'Tóm tắt hội thoại cho đồng nghiệp', i:<Icon.List/>},
    {k:'/note',    l:'Ghi chú nội bộ (khách không thấy)', i:<Icon.Note/>},
  ];

  const attachItems = [
    {i:'🖼️', l:'Ảnh', s:'Từ máy'},
    {i:'📹', l:'Video', s:'Tối đa 200MB'},
    {i:'📎', l:'Tệp tin', s:'PDF, DOCX, XLS…'},
    {i:'📍', l:'Vị trí', s:'Chia sẻ địa điểm'},
    {i:'👤', l:'Danh thiếp', s:'Liên hệ từ CRM'},
    {i:'📅', l:'Lịch hẹn', s:'Đặt lịch / dờ lịch'},
    {i:'📊', l:'Bình chọn', s:'Poll nhiều lựa chọn'},
    {i:'🎁', l:'Voucher / Gói', s:'Gửi ưu đãi'},
    {i:'💳', l:'Thanh toán', s:'Gửi QR / link'},
    {i:'🎫', l:'Voucher', s:'Gửi mã giảm giá'},
    {i:'📦', l:'Vận đơn', s:'Tracking đơn hàng'},
    {i:'🎙️', l:'Voice note', s:'Ghi âm nhanh'},
  ];

  const stickerPacks = {
    'Yêu thích': ['❤️','💚','🔥','👍','😍','😆','🥰','🤗','💪','🙏','👏','✨','💯','😎','🎉','🌸'],
    'Bé Na OA': ['👗','👚','🛍️','✂️','🧵','👶','🎀','⭐'],
    'Thường dùng': ['Dạ','Vâng ạ','Cảm ơn chị','Em gửi ạ','Shop đã nhận','Freeship 🚚','Sale 🔥','Còn hàng ✅','Hết hàng ❌','Chị chờ em xíu 🙏']
  };

  return (
    <div style={{borderTop:'1px solid var(--fill-04)', background:'white'}}>
      {/* Reply-to preview */}
      {replyPreview && (
        <div style={{padding:'8px 16px', background:'var(--fill-02)', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:3, height:30, borderRadius:2, background:'var(--primary)', flexShrink:0}}/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:10.5, fontWeight:700, color:'var(--primary)', marginBottom:1}}>
              <Icon.MessageSquare style={{width:10, height:10, display:'inline', marginRight:3}}/>
              Đang trả lời · {replyPreview.who}
            </div>
            <div style={{fontSize:12, color:'var(--label-02)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{replyPreview.text}</div>
          </div>
          <button className="btn-icon" onClick={()=>setReplyPreview(null)} style={{width:22, height:22}}><Icon.Close/></button>
        </div>
      )}

      {/* Attached treatment preview */}
      {attachedItems.length > 0 && (
        <div style={{padding:'8px 16px', background:'var(--bg-green)', borderBottom:'1px solid rgba(45,197,106,.2)', display:'flex', alignItems:'center', gap:12}}>
          <Icon.Calendar style={{width:14, height:14, color:'var(--pr-dark-2)'}}/>
          <span style={{fontSize:12, fontWeight:600, color:'var(--pr-dark-2)'}}>
            Đính kèm: {attachedItems.length} dịch vụ · <b>{total.toLocaleString('vi-VN')} ₫</b>
          </span>
          <span style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm" style={{fontSize:11}}>Sửa</button>
          <button className="btn-icon" onClick={()=>setAttachedItems([])} style={{width:22, height:22}}><Icon.Close/></button>
        </div>
      )}

      <div style={{padding:'10px 16px 6px', display:'flex', alignItems:'center', gap:8}}>
        <div style={{display:'flex', borderRadius:8, background:'var(--fill-03)', padding:3, gap:2}}>
          {[
            {k:'manual', label:'Trả lời', icon:<Icon.MessageSquare/>},
            {k:'note',   label:'Ghi chú nội bộ', icon:<Icon.Note/>},
            {k:'copilot',label:'Co-pilot', icon:<Icon.Sparkles/>},
            {k:'auto',   label:'AI tự xử', icon:<Icon.Bot/>},
          ].map(m => (
            <button key={m.k} onClick={()=>setMode(m.k)} style={{
              padding:'5px 10px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
              background: mode===m.k ? 'white' : 'transparent',
              color: mode===m.k ? (m.k==='note'?'#C27614':m.k==='copilot'?'var(--pr-dark-2)':'var(--label-01)') : 'var(--label-02)',
              boxShadow: mode===m.k ? 'var(--shadow-sm)' : 'none',
              display:'inline-flex', gap:5, alignItems:'center',
            }}>
              {React.cloneElement(m.icon, {style:{width:12, height:12}})}
              {m.label}
            </button>
          ))}
        </div>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Bolt/> Quick replies</button>
        <button className="btn btn-ghost btn-sm" style={{color:'var(--pr-dark-2)'}}><Icon.Calendar style={{width:14, height:14}}/> Đặt lịch hẹn</button>
        <button className="btn btn-ghost btn-sm"><Icon.Globe/> Dịch</button>
      </div>

      <div style={{padding:'0 16px 10px', position:'relative'}}>
        {showSlash && (
          <div style={{
            position:'absolute', bottom:'100%', left:16, right:16, marginBottom:6,
            background:'white', border:'1px solid var(--fill-04)', borderRadius:12,
            boxShadow:'0 8px 24px rgba(0,0,0,.08)', padding:6, zIndex:10
          }}>
            <div style={{fontSize:10, color:'var(--label-03)', padding:'6px 10px', fontWeight:700, letterSpacing:'.05em'}}>LỆNH NHANH</div>
            {slashCmds.map(c => (
              <button key={c.k} onClick={()=>{setText(''); setShowSlash(false);}} style={{
                width:'100%', padding:'8px 10px', display:'flex', gap:10, alignItems:'center',
                border:'none', background:'transparent', cursor:'pointer', borderRadius:6, textAlign:'left'
              }} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {React.cloneElement(c.i, {style:{width:14, height:14, color:'var(--primary)'}})}
                <span style={{fontSize:12.5, fontWeight:600, color:'var(--label-01)', fontFamily:'monospace'}}>{c.k}</span>
                <span style={{fontSize:12, color:'var(--label-02)'}}>{c.l}</span>
              </button>
            ))}
          </div>
        )}

        {/* Attach menu popup */}
        {showAttach && (
          <div style={{
            position:'absolute', bottom:'100%', left:16, marginBottom:6,
            background:'white', border:'1px solid var(--fill-04)', borderRadius:14,
            boxShadow:'0 8px 24px rgba(0,0,0,.1)', padding:10, zIndex:10, width:360
          }}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', padding:'4px 6px 8px', letterSpacing:'.05em'}}>ĐÍNH KÈM</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4}}>
              {attachItems.map((a,i)=>(
                <button key={i} onClick={()=>setShowAttach(false)} style={{
                  padding:'10px 6px', border:'none', background:'transparent', borderRadius:10, cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4
                }} onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{fontSize:26, lineHeight:1}}>{a.i}</span>
                  <span style={{fontSize:11, fontWeight:600}}>{a.l}</span>
                  <span style={{fontSize:9.5, color:'var(--label-03)'}}>{a.s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sticker picker */}
        {showSticker && (
          <div style={{
            position:'absolute', bottom:'100%', right:16, marginBottom:6,
            background:'white', border:'1px solid var(--fill-04)', borderRadius:14,
            boxShadow:'0 8px 24px rgba(0,0,0,.1)', padding:10, zIndex:10, width:340, maxHeight:320, overflowY:'auto'
          }}>
            {Object.entries(stickerPacks).map(([pack, items]) => (
              <div key={pack} style={{marginBottom:10}}>
                <div style={{fontSize:10.5, fontWeight:700, color:'var(--label-03)', padding:'4px 0 6px', letterSpacing:'.05em'}}>{pack.toUpperCase()}</div>
                <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                  {items.map((s,i)=>(
                    <button key={i} onClick={()=>setShowSticker(false)} style={{
                      padding: s.length>2 ? '6px 10px' : '4px 6px',
                      border:'1px solid var(--fill-04)', background:'var(--fill-02)',
                      borderRadius:8, cursor:'pointer', fontSize: s.length>2 ? 12 : 22, fontWeight:600
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          border:'1px solid '+(mode==='note'?'#F5A830':'var(--fill-04)'),
          borderRadius:12, padding:10,
          background: mode==='note' ? '#FFFDF4' : 'var(--fill-02)'
        }}>
          {recording ? (
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'4px 0'}}>
              <div style={{display:'flex', gap:3, alignItems:'center'}}>
                {[10,16,22,14,18,12,20,16,10].map((h,i)=>(
                  <div key={i} style={{width:3, height:h, background:'var(--danger)', borderRadius:2, animation:`vu ${0.6+Math.random()*.4}s ease-in-out infinite alternate ${i*.08}s`}}/>
                ))}
              </div>
              <span style={{fontSize:12.5, fontWeight:600, color:'var(--danger)'}}>● Đang ghi âm · 0:07</span>
              <span style={{flex:1}}/>
              <span style={{fontSize:11, color:'var(--label-02)'}}>AI sẽ chuyển giọng nói thành văn bản</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setRecording(false)}>Huỷ</button>
              <button className="btn btn-primary btn-sm" onClick={()=>setRecording(false)}><Icon.Check/> Dừng & gửi</button>
              <style>{`@keyframes vu { 0%{opacity:.3;transform:scaleY(.3)} 100%{opacity:1;transform:scaleY(1)} }`}</style>
            </div>
          ) : (
            <textarea placeholder={mode==='note' ? 'Ghi chú nội bộ — khách không thấy…' : 'Nhập tin cho Chị Lan…  ( / = lệnh AI · @ = mention · # = dịch vụ )'}
              value={text}
              onChange={e => {
                setText(e.target.value);
                setShowSlash(e.target.value.startsWith('/'));
              }}
              style={{width:'100%', border:'none', outline:'none', background:'transparent', resize:'none', fontSize:14, lineHeight:1.5, minHeight:48, fontFamily:'inherit'}}/>
          )}

          <div style={{display:'flex', alignItems:'center', gap:2, marginTop:4}}>
            <button className="btn-icon" title="Emoji" onClick={()=>{setShowSticker(!showSticker); setShowAttach(false);}}
              style={{background: showSticker?'var(--bg-green)':'transparent'}}><Icon.Smile/></button>
            <button className="btn-icon" title="Sticker" onClick={()=>{setShowSticker(!showSticker); setShowAttach(false);}}
              style={{background: showSticker?'var(--bg-green)':'transparent', fontSize:14}}>😀</button>
            <button className="btn-icon" title="Đính kèm" onClick={()=>{setShowAttach(!showAttach); setShowSticker(false);}}
              style={{background: showAttach?'var(--bg-green)':'transparent'}}><Icon.Paperclip/></button>
            <button className="btn-icon" title="Ảnh / video"><Icon.Image/></button>
            <button className="btn-icon" title="Ghi âm tin nhắn" onClick={()=>setRecording(true)} style={{color: recording?'var(--danger)':'var(--label-02)'}}><Icon.Mic/></button>
            <button className="btn-icon" title="Gọi thoại"><Icon.Phone/></button>
            <button className="btn-icon" title="Gọi video"><Icon.Video/></button>
            <button className="btn-icon" title="Dịch vụ"><Icon.Bolt/></button>
            <button className="btn-icon" title="Đặt lịch hẹn"><Icon.Calendar/></button>
            <button className="btn-icon" title="Link"><Icon.Link/></button>
            <button className="btn-icon" title="Quick reply"><Icon.Bolt/></button>
            <div style={{width:1, background:'var(--fill-04)', margin:'0 4px', height:16}}/>
            <button className="btn-icon" title="Lên lịch gửi"><Icon.Clock/></button>
            <span style={{flex:1}}/>
            <span style={{fontSize:10.5, color:'var(--label-03)'}}>
              Gửi qua <b style={{color:'var(--label-01)'}}>Zalo OA</b> · <span className="kbd">Enter</span> gửi · <span className="kbd">⇧Enter</span> xuống dòng
            </span>
            <button className="btn btn-ghost btn-sm" style={{padding:'4px 8px'}} title="Gửi lên lịch"><Icon.Clock/></button>
            <button className="btn btn-primary btn-sm" style={{background: mode==='note'?'#F5A830':'var(--primary)', border:'none'}}>
              {mode==='note' ? <><Icon.Note/> Lưu note</> : <><Icon.Send style={{width:12, height:12}}/> Gửi</>}
            </button>
          </div>
        </div>

        {/* Quick emoji reactions bar */}
        <div style={{display:'flex', gap:4, marginTop:6, justifyContent:'flex-end'}}>
          <span style={{fontSize:10.5, color:'var(--label-03)', marginRight:4, alignSelf:'center'}}>Thả nhanh:</span>
          {['❤️','👍','😆','😮','😢','🙏','💯','🔥'].map((e,i)=>(
            <button key={i} style={{
              width:26, height:26, border:'1px solid var(--fill-04)', background:'white',
              borderRadius:13, cursor:'pointer', fontSize:13, padding:0, transition:'transform .15s'
            }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// CONTEXT PANEL — Tabs: AI / Khách hàng / Order / History / Tệp
// =====================================================================
function ContextPanel() {
  const [tab, setTab] = useS('ai');
  return (
    <div style={{width:340, borderLeft:'1px solid var(--fill-04)', background:'white', display:'flex', flexDirection:'column'}}>
      {/* Tab header */}
      <div style={{display:'flex', borderBottom:'1px solid var(--fill-04)', padding:'0 8px', gap:2, background:'white'}}>
        {[
          {k:'ai',       l:'AI',       i:<Icon.Sparkles/>},
          {k:'customer', l:'Khách',    i:<Icon.User/>},
          {k:'order',    l:'Liệu trình & Lịch hẹn', i:<Icon.Calendar/>, badge:1},
          {k:'history',  l:'Lịch sử',  i:<Icon.Clock/>},
          {k:'files',    l:'Tệp',      i:<Icon.Paperclip/>},
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'12px 8px', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:'transparent',
            color: tab===t.k ? 'var(--primary)' : 'var(--label-02)',
            borderBottom: '2px solid '+(tab===t.k?'var(--primary)':'transparent'),
            display:'inline-flex', alignItems:'center', gap:5, position:'relative'
          }}>
            {React.cloneElement(t.i, {style:{width:13, height:13}})}
            {t.l}
            {t.badge && <span style={{minWidth:14, height:14, padding:'0 4px', borderRadius:7, background:'var(--primary)', color:'white', fontSize:9, fontWeight:800, display:'grid', placeItems:'center'}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="scroll" style={{flex:1, padding:'14px 16px'}}>
        {tab==='ai' && <AIPanel/>}
        {tab==='customer' && <CustomerPanel/>}
        {tab==='order' && <OrderPanel/>}
        {tab==='history' && <HistoryPanel/>}
        {tab==='files' && <TệpPanel/>}
      </div>
    </div>
  );
}

function AIPanel() {
  return <>
    {/* AI Health */}
    <div style={{background:'linear-gradient(135deg, rgba(45,197,106,.1), rgba(43,158,243,.08))', border:'1px solid rgba(45,197,106,.25)', borderRadius:12, padding:12, marginBottom:16}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
        <div style={{width:28, height:28, borderRadius:8, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white'}}>
          <Icon.Sparkles style={{width:14, height:14}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:700}} className="ai-gradient-text">AI Co-pilot · hoạt động</div>
          <div style={{fontSize:10.5, color:'var(--label-02)'}}>Model: AppChat-VN · v2.4</div>
        </div>
        <span style={{width:8, height:8, borderRadius:4, background:'var(--success)'}}/>
      </div>
      <div style={{display:'flex', gap:8, fontSize:10.5}}>
        <div style={{flex:1, background:'white', padding:'6px 8px', borderRadius:6, border:'1px solid var(--fill-04)'}}>
          <div style={{color:'var(--label-03)', fontSize:9}}>ĐỘ TIN</div>
          <div style={{fontWeight:800, fontSize:14, color:'var(--pr-dark-2)'}}>92%</div>
        </div>
        <div style={{flex:1, background:'white', padding:'6px 8px', borderRadius:6, border:'1px solid var(--fill-04)'}}>
          <div style={{color:'var(--label-03)', fontSize:9}}>TỐC ĐỘ</div>
          <div style={{fontWeight:800, fontSize:14}}>1.2s</div>
        </div>
        <div style={{flex:1, background:'white', padding:'6px 8px', borderRadius:6, border:'1px solid var(--fill-04)'}}>
          <div style={{color:'var(--label-03)', fontSize:9}}>TOKENS</div>
          <div style={{fontWeight:800, fontSize:14}}>2.1K</div>
        </div>
      </div>
    </div>

    <div className="section-title" style={{marginBottom:8}}>AI tóm tắt hội thoại</div>
    <div style={{background:'var(--bg-green)', borderRadius:10, padding:12, fontSize:12.5, lineHeight:1.55, marginBottom:16}}>
      Khách đã <b>hoàn thành 5/8 buổi liệu trình trẻ hoá da</b>, hôm nay nhắn hỏi đặt buổi tiếp theo. Ý định đặt lịch <b style={{color:'var(--pr-dark-2)'}}>92%</b> (quan tâm lịch rảnh chiều nay). <b>Đề xuất:</b> chốt buổi 6 lúc 14:00, nhắc khách mang theo sổ liệu trình, gợi ý combo Meso hoặc upgrade VIP Vàng.
    </div>

    <div className="section-title" style={{marginBottom:8}}>Ý định & Cảm xúc</div>
    <div style={{display:'grid', gap:6, marginBottom:16}}>
      {[
        {l:'Ý định', v:'MUA HÀNG', p:92, c:'var(--primary)'},
        {l:'Cảm xúc', v:'Tích cực', p:78, c:'var(--success)'},
        {l:'Mức khẩn', v:'Trung bình', p:55, c:'var(--warning)'},
        {l:'Khả năng chốt', v:'Cao', p:84, c:'var(--pr-dark-2)'},
      ].map(it => (
        <div key={it.l} style={{background:'var(--fill-02)', borderRadius:8, padding:'8px 10px'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11.5}}>
            <span style={{color:'var(--label-02)'}}>{it.l}</span>
            <span style={{fontWeight:700}}>{it.v} <span style={{color:'var(--label-03)', fontWeight:400}}>· {it.p}%</span></span>
          </div>
          <div style={{height:4, borderRadius:2, background:'var(--fill-04)', overflow:'hidden'}}>
            <div style={{width:it.p+'%', height:'100%', background:it.c}}/>
          </div>
        </div>
      ))}
    </div>

    <div className="section-title" style={{marginBottom:8}}>Hành động nhanh</div>
    <div style={{display:'grid', gap:4, marginBottom:16}}>
      {[
        {i:<Icon.Calendar/>, l:'Đặt lịch hẹn cho khách'},
        {i:<Icon.Bolt/>, l:'Tạo liệu trình / gói dịch vụ'},
        {i:<Icon.Ticket/>, l:'Tạo ticket ưu tiên'},
        {i:<Icon.Phone/>, l:'Đặt lịch gọi lại'},
        {i:<Icon.UserPlus/>, l:'Chuyển cho đồng nghiệp'},
        {i:<Icon.Tag/>, l:'Thêm tag cho khách'},
        {i:<Icon.Globe/>, l:'Dịch sang Tiếng Anh'},
      ].map(a => (
        <button key={a.l} className="btn btn-ghost btn-sm" style={{justifyContent:'flex-start', width:'100%'}}>
          {React.cloneElement(a.i, {style:{width:13, height:13, color:'var(--primary)'}})}
          <span style={{fontWeight:500}}>{a.l}</span>
        </button>
      ))}
    </div>
  </>;
}

function CustomerPanel() {
  const { initials, avatarBgFromName } = window.AppData.helpers;
  return <>
    <div style={{textAlign:'center', padding:'8px 0 16px'}}>
      <div className="avatar" style={{width:64, height:64, fontSize:20, margin:'0 auto 10px', background:avatarBgFromName('Chị Lan')}}>CL</div>
      <div style={{fontWeight:700, fontSize:15}}>Chị Lan — Shop Bé Na</div>
      <div style={{fontSize:11.5, color:'var(--label-02)', marginTop:2}}>Khách VIP Bạc · từ 06/2024</div>
      <div style={{display:'flex', gap:4, justifyContent:'center', marginTop:8}}>
        <button className="btn btn-ghost btn-sm"><Icon.Phone/></button>
        <button className="btn btn-ghost btn-sm"><Icon.Mail/></button>
        <button className="btn btn-ghost btn-sm"><Icon.User/> Hồ sơ đầy đủ</button>
      </div>
    </div>

    <div className="section-title" style={{marginBottom:8}}>Thông tin liên hệ</div>
    <div style={{display:'grid', gap:8, fontSize:12.5, marginBottom:16, background:'var(--fill-02)', padding:10, borderRadius:8}}>
      <Row l="Số điện thoại" v="0987 123 421"/>
      <Row l="Email" v="lan.tran@gmail.com"/>
      <Row l="Địa chỉ" v="Đống Đa, HN"/>
      <Row l="Ngôn ngữ" v="Tiếng Việt"/>
      <Row l="Tham gia" v="06/2024"/>
    </div>

    <div className="section-title" style={{marginBottom:8}}>Chỉ số khách hàng</div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16}}>
      <Stat l="LTV" v="3.214.000₫" c="var(--primary)"/>
      <Stat l="Buổi đã dùng" v="5/8" c="var(--label-01)"/>
      <Stat l="Avg deal" v="803.500₫" c="var(--label-01)"/>
      <Stat l="Lần ghé cuối" v="12 ngày" c="var(--label-01)"/>
    </div>

    <div className="section-title" style={{marginBottom:8}}>Thẻ</div>
    <div style={{display:'flex', flexWrap:'wrap', gap:4, marginBottom:16}}>
      {['VIP Bạc','Thời trang trẻ em','Khách Hà Nội','Ưu thích Zalo','Phản hồi nhanh'].map(t => (
        <span key={t} style={{fontSize:11, padding:'3px 8px', borderRadius:10, background:'var(--fill-03)', color:'var(--label-02)', fontWeight:500}}>#{t}</span>
      ))}
      <button className="btn-icon" style={{width:22, height:22}}><Icon.Plus/></button>
    </div>

    <div className="section-title" style={{marginBottom:8}}>Ghi chú CRM</div>
    <div style={{background:'#FFFDF4', border:'1px solid #F5E6B8', borderRadius:8, padding:10, fontSize:12, lineHeight:1.5}}>
      Thường mua cho con gái 4 tuổi. Ưa màu hồng/cam. Đã review 5⭐ trên Shopee. <span style={{color:'var(--label-03)'}}>— Trâm · 2 tuần trước</span>
    </div>
  </>;
}

function Row({l, v}) {
  return <div style={{display:'flex', justifyContent:'space-between'}}><span style={{color:'var(--label-02)'}}>{l}</span><span style={{fontWeight:600}}>{v}</span></div>;
}
function Stat({l, v, c}) {
  return (
    <div style={{background:'var(--fill-02)', padding:'8px 10px', borderRadius:8}}>
      <div style={{fontSize:10, color:'var(--label-03)', fontWeight:700, letterSpacing:'.05em'}}>{l}</div>
      <div style={{fontSize:14, fontWeight:800, color:c, marginTop:2}}>{v}</div>
    </div>
  );
}

function OrderPanel() {
  // Liệu trình hiện tại
  const program = {name:'Liệu trình Trẻ hoá da Premium', total:8, used:5, value:12000000};
  const sessions = [
    {n:'Buổi 1 · Soi da & tư vấn', d:'05/01/2026', st:'done'},
    {n:'Buổi 2 · HIFU vùng mặt', d:'19/01/2026', st:'done'},
    {n:'Buổi 3 · Mesotherapy', d:'02/02/2026', st:'done'},
    {n:'Buổi 4 · HIFU + Mask', d:'16/02/2026', st:'done'},
    {n:'Buổi 5 · Mesotherapy', d:'08/03/2026', st:'done'},
    {n:'Buổi 6 · HIFU vùng cổ', d:'25/04/2026 · 14:00', st:'next'},
    {n:'Buổi 7 · Mesotherapy', d:'Chưa đặt', st:'pending'},
    {n:'Buổi 8 · Tổng kết & soi da', d:'Chưa đặt', st:'pending'},
  ];

  return <>
    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
      <div className="section-title" style={{margin:0, flex:1}}>Liệu trình đang dùng</div>
      <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(45,197,106,.15)', color:'var(--pr-dark-2)', fontWeight:700}}>ACTIVE</span>
    </div>

    <div style={{background:'linear-gradient(135deg, var(--bg-green), #FFF)', border:'1px solid rgba(45,197,106,.25)', borderRadius:10, padding:12, marginBottom:12}}>
      <div style={{fontSize:13, fontWeight:700, marginBottom:6}}>{program.name}</div>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
        <span style={{fontSize:11, color:'var(--label-02)'}}>Tiến độ</span>
        <div style={{flex:1, height:6, background:'var(--fill-04)', borderRadius:3, overflow:'hidden'}}>
          <div style={{width: (program.used/program.total*100)+'%', height:'100%', background:'var(--primary)'}}/>
        </div>
        <span style={{fontSize:11, fontWeight:800, color:'var(--pr-dark-2)'}}>{program.used}/{program.total}</span>
      </div>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:11.5}}>
        <span style={{color:'var(--label-02)'}}>Giá trị</span>
        <span style={{fontWeight:800, color:'var(--primary)'}}>{program.value.toLocaleString('vi-VN')} ₫</span>
      </div>
    </div>

    <div className="section-title" style={{marginBottom:8}}>Lịch buổi</div>
    <div style={{display:'grid', gap:4, marginBottom:14}}>
      {sessions.map((s, i) => {
        const styleMap = {
          done:    {bg:'var(--fill-02)', dot:'var(--success)', tag:'Đã xong', tagBg:'rgba(45,197,106,.12)', tagColor:'var(--pr-dark-2)'},
          next:    {bg:'#FFFBEB', dot:'#F59E0B', tag:'Sắp tới', tagBg:'rgba(245,158,11,.15)', tagColor:'#92400E'},
          pending: {bg:'white', dot:'var(--label-04)', tag:'Chưa đặt', tagBg:'var(--fill-03)', tagColor:'var(--label-02)'},
        }[s.st];
        return (
          <div key={i} style={{display:'flex', gap:10, alignItems:'center', padding:'8px 10px', background:styleMap.bg, border:'1px solid var(--fill-04)', borderRadius:8}}>
            <span style={{width:8, height:8, borderRadius:4, background:styleMap.dot, flexShrink:0}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.n}</div>
              <div style={{fontSize:10.5, color:'var(--label-03)'}}>{s.d}</div>
            </div>
            <span style={{fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:4, background:styleMap.tagBg, color:styleMap.tagColor}}>{styleMap.tag}</span>
          </div>
        );
      })}
    </div>

    <div style={{display:'grid', gap:6, marginBottom:16}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
        <button className="btn btn-ghost btn-sm"><Icon.Calendar/> Đặt buổi tiếp</button>
        <button className="btn btn-ghost btn-sm"><Icon.Bell/> Nhắc khách</button>
      </div>
      <button className="btn btn-primary" style={{width:'100%', justifyContent:'center'}}><Icon.Check/> Xác nhận buổi 6 · 25/04 14:00</button>
      <button className="btn btn-ghost btn-sm" style={{width:'100%', justifyContent:'center'}}>Xem hồ sơ điều trị đầy đủ</button>
    </div>

    <div className="section-title" style={{marginBottom:8}}>Membership & gói khác</div>
    {[
      {id:'GD-2024-08', d:'08/2024', st:'Hoàn thành 12/12', v:'9.600.000 ₫', c:'var(--success)', n:'Liệu trình Detox da'},
      {id:'GD-2024-03', d:'03/2024', st:'VIP Bạc · còn 4 tháng', v:'2.400.000 ₫', c:'#F59E0B', n:'Membership năm'},
    ].map(o => (
      <div key={o.id} style={{display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid var(--fill-03)', fontSize:12}}>
        <Icon.Star style={{width:14, height:14, color:'var(--label-03)'}}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{o.n}</div>
          <div style={{fontSize:10.5, color:'var(--label-03)'}}>{o.d} · <span style={{color:o.c, fontWeight:600}}>{o.st}</span></div>
        </div>
        <span style={{fontWeight:700}}>{o.v}</span>
      </div>
    ))}
  </>;
}

function HistoryPanel() {
  const events = [
    {t:'10:42', i:<Icon.UserPlus/>, c:'var(--primary)', l:'Claude Cowork chuyển hội thoại cho Trâm'},
    {t:'10:38', i:<Icon.MessageSquare/>, c:'var(--label-02)', l:'Khách gửi tin nhắn đầu tiên (hôm nay)'},
    {t:'08/03', i:<Icon.Check/>, c:'var(--success)', l:'Hoàn thành buổi 5 · Mesotherapy · 1.500.000 ₫'},
    {t:'10/04', i:<Icon.Star/>, c:'var(--warning)', l:'Khách để lại review 5⭐ trên Google Maps'},
    {t:'16/02', i:<Icon.Calendar/>, c:'var(--primary)', l:'Đặt lịch buổi 4 · HIFU + Mask'},
    {t:'18/02', i:<Icon.Refresh/>, c:'var(--warning)', l:'Dời lịch buổi 4 (báo ốm)'},
    {t:'02/01', i:<Icon.Ticket/>, c:'var(--label-02)', l:'Tạo ticket #T-104 (đã giải quyết)'},
    {t:'05/01', i:<Icon.User/>, c:'var(--primary)', l:'Đăng ký liệu trình Trẻ hoá da Premium · 12.000.000 ₫'},
    {t:'06/2024', i:<Icon.User/>, c:'var(--primary)', l:'Khách đăng ký tài khoản qua Zalo OA'},
  ];
  return <>
    <div className="section-title" style={{marginBottom:12}}>Dòng thời gian</div>
    <div style={{position:'relative', paddingLeft:18}}>
      <div style={{position:'absolute', left:7, top:6, bottom:6, width:1, background:'var(--fill-04)'}}/>
      {events.map((e,i) => (
        <div key={i} style={{display:'flex', gap:10, paddingBottom:14, position:'relative'}}>
          <div style={{position:'absolute', left:-18, top:0, width:15, height:15, borderRadius:8, background:'white', border:'2px solid '+e.c, display:'grid', placeItems:'center'}}>
            {React.cloneElement(e.i, {style:{width:8, height:8, color:e.c}})}
          </div>
          <div>
            <div style={{fontSize:10.5, color:'var(--label-03)', fontWeight:700, letterSpacing:'.05em'}}>{e.t.toUpperCase()}</div>
            <div style={{fontSize:12, marginTop:2}}>{e.l}</div>
          </div>
        </div>
      ))}
    </div>
  </>;
}

function TệpPanel() {
  return <>
    <div className="section-title" style={{marginBottom:8}}>Tệp đã chia sẻ (7)</div>
    <div style={{display:'grid', gap:6, marginBottom:16}}>
      {[
        {n:'bang-size-ss26.pdf', s:'420 KB', t:'pdf'},
        {n:'hop-dong-dai-ly.docx', s:'180 KB', t:'doc'},
        {n:'anh-mau-vay-hoa.jpg', s:'1.2 MB', t:'img'},
        {n:'anh-tham-khao-tt.jpg', s:'840 KB', t:'img'},
      ].map(f => (
        <div key={f.n} style={{display:'flex', alignItems:'center', gap:10, padding:8, background:'var(--fill-02)', borderRadius:8}}>
          <div style={{width:32, height:32, borderRadius:6, background:f.t==='pdf'?'#FEE2E2':f.t==='doc'?'#DBEAFE':'#D1FAE5', display:'grid', placeItems:'center', fontSize:10, fontWeight:800, color:f.t==='pdf'?'#DC2626':f.t==='doc'?'#2563EB':'#059669'}}>
            {f.t.toUpperCase()}
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{f.n}</div>
            <div style={{fontSize:10.5, color:'var(--label-03)'}}>{f.s}</div>
          </div>
          <button className="btn-icon" style={{width:22, height:22}}><Icon.Download/></button>
        </div>
      ))}
    </div>

    <div className="section-title" style={{marginBottom:8}}>Ảnh & video (12)</div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4}}>
      {Array.from({length:6}).map((_,i)=>(
        <div key={i} style={{aspectRatio:'1', borderRadius:6, background:`linear-gradient(${120+i*30}deg, hsl(${140+i*30} 50% 70%), hsl(${120+i*20} 60% 55%))`, display:'grid', placeItems:'center', fontSize:18}}>
          {['👗','👚','👖','🧥','👕','👜'][i]}
        </div>
      ))}
    </div>
  </>;
}

// =====================================================================
// SOURCE LOOKUP MODAL — Triggered by /source command or "Tra nguồn hàng"
// =====================================================================

// =====================================================================
// CONNECT CHANNEL MODAL
// =====================================================================
function ConnectKênhModal({ onClose }) {
  const [step, setStep] = useS('pick');   // pick | config | connecting | done
  const [picked, setPicked] = useS(null);
  const [cat, setCat]   = useS('all');

  const channels = [
    {ch:'zalo',      n:'Zalo OA',             cat:'msg',    tag:'Phổ biến nhất VN', free:false, time:'5 phút'},
    {ch:'facebook',  n:'Facebook Messenger',  cat:'msg',    tag:'Tự động sync comment', free:false, time:'3 phút'},
    {ch:'instagram', n:'Instagram DM',        cat:'msg',    tag:'DM + Story reply', free:false, time:'3 phút'},
    {ch:'tiktok',    n:'TikTok Shop',         cat:'ecom',   tag:'Chat + đơn hàng', free:false, time:'8 phút'},
    {ch:'shopee',    n:'Shopee',              cat:'ecom',   tag:'Chat + đơn hàng', free:false, time:'5 phút'},
    {ch:'lazada',    n:'Lazada',              cat:'ecom',   tag:'Seller Center',   free:false, time:'5 phút'},
    {ch:'whatsapp',  n:'WhatsApp Kinh doanh',   cat:'msg',    tag:'Cloud API chính thức', free:false, time:'15 phút'},
    {ch:'viber',     n:'Viber for Kinh doanh',  cat:'msg',    tag:'Broadcast + chat', free:false, time:'10 phút'},
    {ch:'telegram',  n:'Telegram',            cat:'msg',    tag:'Bot API',         free:true,  time:'2 phút'},
    {ch:'email',     n:'Email (IMAP/SMTP)',   cat:'email',  tag:'Gmail · Outlook · Custom', free:true,  time:'3 phút'},
    {ch:'gmail',     n:'Gmail',               cat:'email',  tag:'OAuth 1-click',   free:true,  time:'1 phút'},
    {ch:'web',       n:'Livechat Website',    cat:'web',    tag:'Widget embed',    free:true,  time:'2 phút'},
    {ch:'sms',       n:'SMS brandname',       cat:'voice',  tag:'Qua VNPT/Viettel', free:false, time:'1-2 ngày'},
    {ch:'zns',       n:'Zalo ZNS',            cat:'voice',  tag:'Template OTP/HD',  free:false, time:'5 phút'},
    {ch:'1688',      n:'1688 (Alibaba CN)',   cat:'ecom',   tag:'Sourcing · giá NCC', free:false, time:'10 phút'},
    {ch:'amazon',    n:'Amazon Seller',       cat:'ecom',   tag:'MWS API',         free:false, time:'20 phút'},
    {ch:'etsy',      n:'Etsy',                cat:'ecom',   tag:'Shop API',        free:false, time:'5 phút'},
    {ch:'line',      n:'LINE',                cat:'msg',    tag:'OA + broadcast',  free:false, time:'10 phút'},
  ];
  const cats = [
    {k:'all',   l:'Tất cả kênh',     n: channels.length},
    {k:'msg',   l:'Mạng xã hội',     n: channels.filter(c=>c.cat==='msg').length},
    {k:'ecom',  l:'Sàn TMĐT',        n: channels.filter(c=>c.cat==='ecom').length},
    {k:'email', l:'Email',           n: channels.filter(c=>c.cat==='email').length},
    {k:'web',   l:'Livechat',        n: channels.filter(c=>c.cat==='web').length},
    {k:'voice', l:'SMS / ZNS',       n: channels.filter(c=>c.cat==='voice').length},
  ];
  const list = channels.filter(c => cat==='all' || c.cat===cat);

  const onPick = (c) => { setPicked(c); setStep('config'); };
  const onConnect = () => {
    setStep('connecting');
    setTimeout(()=>setStep('done'), 2200);
  };

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.5)', zIndex:100,
      display:'grid', placeItems:'center', padding:20, backdropFilter:'blur(3px)'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'white', borderRadius:16, width:'min(960px, 100%)', maxHeight:'86vh',
        display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,.25)', overflow:'hidden'
      }}>
        {/* Header */}
        <div style={{padding:'18px 24px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:12}}>
          {step!=='pick' && <button className="btn-icon" onClick={()=>setStep('pick')} style={{width:28, height:28}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{width:16,height:16}}><path d="M15 6l-6 6 6 6"/></svg>
          </button>}
          <div style={{flex:1}}>
            <div style={{fontSize:10.5, fontWeight:700, color:'var(--pr-dark-2)', letterSpacing:'.06em', textTransform:'uppercase'}}>
              {step==='pick' ? 'Kết nối kênh mới' : step==='config' ? 'Cấu hình' : step==='connecting' ? 'Đang kết nối' : 'Hoàn tất'}
            </div>
            <h2 style={{margin:'2px 0 0', fontSize:20, fontWeight:700}}>
              {step==='pick' && 'Chọn kênh bạn muốn thêm vào AppChat'}
              {step==='config' && picked && (picked.n + ' — cấu hình kết nối')}
              {step==='connecting' && 'Claude AI đang xác thực kết nối…'}
              {step==='done' && picked && (picked.n + ' đã kết nối thành công!')}
            </h2>
          </div>
          {step==='pick' && <div style={{fontSize:11.5, color:'var(--label-03)'}}>{list.length} kênh · Omnichannel</div>}
          <button className="btn-icon" onClick={onClose} style={{width:28, height:28}}><Icon.Close/></button>
        </div>

        {/* Body */}
        <div className="scroll" style={{flex:1, overflow:'auto'}}>
          {step==='pick' && (
            <div style={{display:'flex', minHeight:420}}>
              {/* Cat sidebar */}
              <div style={{width:200, borderRight:'1px solid var(--fill-04)', background:'var(--fill-02)', padding:'14px 10px'}}>
                {cats.map(c=>(
                  <button key={c.k} onClick={()=>setCat(c.k)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:7,
                    background: cat===c.k?'white':'transparent', border:'none',
                    color: cat===c.k?'var(--pr-dark-2)':'var(--label-02)',
                    fontWeight: cat===c.k?600:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', textAlign:'left', marginBottom:2,
                    boxShadow: cat===c.k?'var(--shadow-sm)':'none'
                  }}>
                    <span style={{flex:1}}>{c.l}</span>
                    <span style={{fontSize:10.5, color:'var(--label-03)'}}>{c.n}</span>
                  </button>
                ))}
                <div style={{padding:'14px 10px 8px', fontSize:10.5, color:'var(--label-03)', fontWeight:700, letterSpacing:'.06em'}}>THEO NGÀNH</div>
                {['Thời trang','Mỹ phẩm / Sức khoẻ','Gia dụng','F&B'].map(s=>(
                  <button key={s} style={{width:'100%', padding:'7px 10px', textAlign:'left', border:'none', background:'transparent', fontSize:12, color:'var(--label-02)', borderRadius:6, cursor:'pointer'}}>{s}</button>
                ))}
              </div>
              {/* Kênh grid */}
              <div style={{flex:1, padding:18}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10}}>
                  {list.map(c=>(
                    <button key={c.ch} onClick={()=>onPick(c)} style={{
                      padding:14, border:'1px solid var(--fill-04)', borderRadius:12, background:'white',
                      textAlign:'left', cursor:'pointer', fontFamily:'inherit', transition:'all .15s'
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 18px rgba(0,0,0,.08)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--fill-04)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none';}}>
                      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
                        <ChannelBadge name={c.ch} size={34}/>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.n}</div>
                          <div style={{fontSize:10.5, color:'var(--label-03)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.tag}</div>
                        </div>
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:4, fontSize:10.5}}>
                        <span style={{padding:'2px 7px', borderRadius:10, background: c.free?'var(--bg-green)':'var(--fill-03)', color: c.free?'var(--pr-dark-2)':'var(--label-02)', fontWeight:600}}>
                          {c.free?'Miễn phí':'Đã có trong gói'}
                        </span>
                        <span style={{flex:1}}/>
                        <span style={{color:'var(--label-03)'}}>⏱ {c.time}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Suggested by AI */}
                <div style={{marginTop:20, padding:14, borderRadius:10, background:'linear-gradient(135deg, var(--bg-green), white)', border:'1px solid rgba(45,197,106,.3)', display:'flex', gap:12, alignItems:'center'}}>
                  <div style={{width:36, height:36, borderRadius:10, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white', flexShrink:0}}>
                    <Icon.Sparkles style={{width:18,height:18}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5, fontWeight:700}}>Claude gợi ý: kết nối <b>TikTok Shop</b> để tăng 42% đơn tự động</div>
                    <div style={{fontSize:11, color:'var(--label-02)'}}>Dựa trên traffic 30 ngày: 34% khách hỏi qua TikTok nhưng chưa gộp về inbox chung</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>onPick(channels.find(c=>c.ch==='tiktok'))}>Kết nối ngay</button>
                </div>
              </div>
            </div>
          )}

          {step==='config' && picked && (
            <div style={{padding:24, maxWidth:620}}>
              <div style={{display:'flex', gap:14, alignItems:'center', marginBottom:20, padding:14, background:'var(--fill-02)', borderRadius:12}}>
                <ChannelBadge name={picked.ch} size={48}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, fontSize:15}}>{picked.n}</div>
                  <div style={{fontSize:12, color:'var(--label-02)'}}>{picked.tag} · thiết lập khoảng {picked.time}</div>
                </div>
              </div>

              <div style={{fontSize:13, fontWeight:700, marginBottom:10}}>Cách kết nối</div>
              <div style={{display:'flex', gap:8, marginBottom:18}}>
                <label style={cfgOption(true)}>
                  <input type="radio" name="m" defaultChecked style={{accentColor:'var(--primary)'}}/>
                  <div><div style={{fontWeight:600, fontSize:13}}>OAuth · 1-click</div><div style={{fontSize:11, color:'var(--label-03)'}}>Khuyến nghị · bảo mật</div></div>
                </label>
                <label style={cfgOption(false)}>
                  <input type="radio" name="m" style={{accentColor:'var(--primary)'}}/>
                  <div><div style={{fontWeight:600, fontSize:13}}>Access Token</div><div style={{fontSize:11, color:'var(--label-03)'}}>Dán token thủ công</div></div>
                </label>
              </div>

              <div style={{fontSize:13, fontWeight:700, marginBottom:10}}>Tên hiển thị kênh</div>
              <input defaultValue={`${picked.n} — MediaSoft Official`} style={inputS}/>
              <div style={{fontSize:11, color:'var(--label-03)', marginTop:6, marginBottom:16}}>Tên này sẽ hiển thị trong inbox và context panel</div>

              <div style={{fontSize:13, fontWeight:700, marginBottom:10}}>Phân công mặc định</div>
              <select style={{...inputS, appearance:'auto'}}>
                <option>Tự động (Claude Cowork trả lời trước)</option>
                <option>Round-robin đội Sales Zalo/FB (5 người)</option>
                <option>Gán cho Trâm — Sales Lead</option>
                <option>Chưa phân công</option>
              </select>

              <div style={{marginTop:18, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <label style={toggleRow}>
                  <div><div style={{fontSize:12.5, fontWeight:600}}>Bật Claude Cowork trả lời trước</div><div style={{fontSize:11, color:'var(--label-03)'}}>Tự escalate nếu confidence &lt; 70%</div></div>
                  <input type="checkbox" defaultChecked style={{accentColor:'var(--primary)', width:18, height:18}}/>
                </label>
                <label style={toggleRow}>
                  <div><div style={{fontSize:12.5, fontWeight:600}}>Đồng bộ comment</div><div style={{fontSize:11, color:'var(--label-03)'}}>Gộp cả comment & DM về 1 hội thoại</div></div>
                  <input type="checkbox" defaultChecked style={{accentColor:'var(--primary)', width:18, height:18}}/>
                </label>
                <label style={toggleRow}>
                  <div><div style={{fontSize:12.5, fontWeight:600}}>Broadcast</div><div style={{fontSize:11, color:'var(--label-03)'}}>Gửi chiến dịch qua kênh này</div></div>
                  <input type="checkbox" defaultChecked style={{accentColor:'var(--primary)', width:18, height:18}}/>
                </label>
                <label style={toggleRow}>
                  <div><div style={{fontSize:12.5, fontWeight:600}}>Giờ làm việc</div><div style={{fontSize:11, color:'var(--label-03)'}}>Auto-reply ngoài giờ</div></div>
                  <input type="checkbox" defaultChecked style={{accentColor:'var(--primary)', width:18, height:18}}/>
                </label>
              </div>

              <div style={{marginTop:20, padding:12, borderRadius:10, background:'#FEF3C7', border:'1px solid #FCD34D', display:'flex', gap:10, alignItems:'flex-start'}}>
                <Icon.AlertTri style={{width:16, height:16, color:'#B45309', flexShrink:0, marginTop:2}}/>
                <div style={{fontSize:11.5, color:'#78350F', lineHeight:1.5}}>
                  Bạn sẽ được chuyển sang trang đăng nhập chính thức của <b>{picked.n}</b> để cấp quyền. AppChat chỉ nhận quyền <b>đọc/gửi tin nhắn</b> và <b>đọc thông tin đơn hàng</b> — không truy cập dữ liệu cá nhân khác.
                </div>
              </div>
            </div>
          )}

          {step==='connecting' && picked && (
            <div style={{padding:'60px 24px', textAlign:'center'}}>
              <div style={{margin:'0 auto 18px', width:80, height:80, borderRadius:20, background:'var(--grad-signature)', display:'grid', placeItems:'center', color:'white', position:'relative'}}>
                <ChannelBadge name={picked.ch} size={50}/>
                <div className="pulse" style={{position:'absolute', inset:-8, borderRadius:24, border:'2px solid var(--primary)', opacity:.4}}/>
              </div>
              <div style={{fontSize:16, fontWeight:700, marginBottom:20}}>Đang xác thực với {picked.n}…</div>
              <div style={{maxWidth:420, margin:'0 auto', display:'flex', flexDirection:'column', gap:8}}>
                {[
                  {l:'Xác thực OAuth', d:0, done:true},
                  {l:'Kiểm tra quyền truy cập', d:400, done:true},
                  {l:'Đồng bộ danh sách cuộc hội thoại 30 ngày', d:900, done:false, loading:true},
                  {l:'Kích hoạt Claude Cowork cho kênh này', d:1600, done:false},
                ].map((s,i)=>(
                  <div key={i} style={{display:'flex', gap:10, alignItems:'center', padding:10, background:'var(--fill-02)', borderRadius:8, textAlign:'left'}}>
                    {s.done ? <Icon.Check style={{width:14, height:14, color:'var(--primary)'}}/> :
                     s.loading ? <div className="spin" style={{width:14, height:14, border:'2px solid var(--fill-04)', borderTopColor:'var(--primary)', borderRadius:7}}/> :
                     <div style={{width:14, height:14, borderRadius:7, border:'2px solid var(--fill-05)'}}/>}
                    <span style={{fontSize:12.5, fontWeight:500, flex:1, color: s.done?'var(--label-01)':'var(--label-03)'}}>{s.l}</span>
                  </div>
                ))}
              </div>
              <style>{`.spin{animation:sp 0.8s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}.pulse{animation:pl 1.6s ease-in-out infinite}@keyframes pl{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.15);opacity:.1}}`}</style>
            </div>
          )}

          {step==='done' && picked && (
            <div style={{padding:'48px 24px', textAlign:'center', maxWidth:520, margin:'0 auto'}}>
              <div style={{margin:'0 auto 16px', width:72, height:72, borderRadius:18, background:'var(--bg-green)', display:'grid', placeItems:'center', color:'var(--primary)'}}>
                <Icon.Check style={{width:40, height:40}}/>
              </div>
              <h3 style={{margin:'0 0 6px', fontSize:20}}>Kết nối thành công 🎉</h3>
              <div style={{fontSize:13, color:'var(--label-02)', marginBottom:24, lineHeight:1.6}}>
                <b>{picked.n}</b> đã được thêm vào inbox. AppChat đã đồng bộ <b>142 cuộc hội thoại</b> trong 30 ngày gần nhất.
              </div>
              <div style={{display:'flex', gap:10, justifyContent:'center'}}>
                <button className="btn btn-ghost" onClick={()=>{setPicked(null); setStep('pick');}}>Thêm kênh khác</button>
                <button className="btn btn-primary" onClick={onClose}>Vào Inbox ngay</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step==='config' && (
          <div style={{padding:'14px 24px', borderTop:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10, background:'var(--fill-02)'}}>
            <span style={{fontSize:11.5, color:'var(--label-03)'}}>🔒 Kết nối được bảo vệ bằng SSL và OAuth 2.0</span>
            <span style={{flex:1}}/>
            <button className="btn btn-ghost" onClick={onClose}>Huỷ</button>
            <button className="btn btn-primary" onClick={onConnect} style={{padding:'9px 22px'}}>Kết nối {picked.n}</button>
          </div>
        )}
      </div>
    </div>
  );
}
const cfgOption = (active) => ({
  flex:1, display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
  border:'1px solid '+(active?'var(--primary)':'var(--fill-04)'),
  background: active?'var(--bg-green)':'white',
  borderRadius:10, cursor:'pointer'
});
const inputS = {width:'100%', height:36, padding:'0 12px', border:'1px solid var(--fill-04)', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white'};
const toggleRow = {display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:'1px solid var(--fill-04)', borderRadius:10, cursor:'pointer'};

// =====================================================================
// MAIN MODULE
// =====================================================================
function MessagesModule() {
  const { CONVERSATIONS } = window.AppData;
  const [folder, setFolder] = useS('all');
  const [activeId, setActiveId] = useS('c1');
  const [showConnect, setShowConnect] = useS(false);
  const active = CONVERSATIONS.find(c => c.id === activeId) || CONVERSATIONS[0];

  useE(() => {
    const h = () => setShowConnect(true);
    window.addEventListener('ac:open-connect-channel', h);
    return () => window.removeEventListener('ac:open-connect-channel', h);
  }, []);

  return (
    <div style={{display:'flex', height:'100%', minHeight:0, background:'var(--fill-01)'}}>
      <FolderRail active={folder} setActive={setFolder}/>
      <ConversationList active={activeId} setActive={setActiveId}/>
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'white'}}>
        <ChatHeader conv={active}/>
        <PinnedBar/>
        <ChatThread/>
        <Composer/>
      </div>
      <ContextPanel/>
      {showConnect && <ConnectKênhModal onClose={()=>setShowConnect(false)}/>}
    </div>
  );
}

window.MessagesModule = MessagesModule;
