/* Help Center / Knowledge Base — Public site builder + RAG dataset cho Claude Cowork */
const { useState: useHC } = React;

const HC_CATS = [
  { id:'getting-started', name:'Bắt đầu nhanh',     color:'#2DC56A', count:18 },
  { id:'orders',          name:'Đơn hàng & vận chuyển', color:'#0EA5E9', count:32 },
  { id:'returns',         name:'Đổi trả & hoàn tiền',  color:'#F59E0B', count:24 },
  { id:'payments',        name:'Thanh toán & ví',      color:'#A855F7', count:14 },
  { id:'sourcing',        name:'Sourcing xuyên biên',  color:'#22C55E', count:21 },
  { id:'integrations',    name:'Tích hợp kênh',        color:'#EC4899', count:16 },
  { id:'ai',              name:'Claude Cowork',        color:'#8B5CF6', count:12 },
  { id:'troubleshoot',    name:'Khắc phục sự cố',      color:'#EF4444', count:19 },
];

const HC_ARTICLES = [
  { id:'a1', title:'Cách bật Claude Cowork tự trả lời cho hội thoại Zalo', cat:'ai', status:'published', views:4821, helpful:94, updated:'2026-04-18', author:'Trâm', words:1240, ragSync:true, featured:true, version:7 },
  { id:'a2', title:'Hướng dẫn theo dõi đơn 1688 tới kho TP.HCM', cat:'orders', status:'published', views:8204, helpful:91, updated:'2026-04-15', author:'Khoa', words:980, ragSync:true, featured:true, version:12 },
  { id:'a3', title:'Quy trình đổi trả trong 7 ngày — đầy đủ', cat:'returns', status:'published', views:6712, helpful:88, updated:'2026-04-12', author:'Vy', words:1580, ragSync:true, featured:false, version:5 },
  { id:'a4', title:'Tại sao đơn hàng bị hold ở Hải quan và cách xử lý', cat:'orders', status:'published', views:3412, helpful:76, updated:'2026-04-10', author:'Khoa', words:2100, ragSync:true, featured:false, version:8 },
  { id:'a5', title:'Kết nối Zalo OA chính chủ trong 3 phút', cat:'integrations', status:'published', views:2890, helpful:96, updated:'2026-04-08', author:'Long', words:760, ragSync:true, featured:true, version:4 },
  { id:'a6', title:'Phân quyền nhóm Sales / Support / Ops', cat:'getting-started', status:'published', views:1980, helpful:87, updated:'2026-04-05', author:'Trâm', words:920, ragSync:true, featured:false, version:3 },
  { id:'a7', title:'Bảng giá xuyên biên 1688 cập nhật tháng 4/2026', cat:'sourcing', status:'published', views:5430, helpful:82, updated:'2026-04-02', author:'Khoa', words:1340, ragSync:true, featured:true, version:9 },
  { id:'a8', title:'Cài đặt thanh toán VietQR cho web chat', cat:'payments', status:'published', views:2104, helpful:89, updated:'2026-03-29', author:'Hà', words:680, ragSync:true, featured:false, version:2 },
  { id:'a9', title:'(Draft) Tích hợp Shopee Live với AppChat', cat:'integrations', status:'draft', views:0, helpful:0, updated:'2026-04-19', author:'Long', words:420, ragSync:false, featured:false, version:1 },
  { id:'a10', title:'(Draft) Claude Cowork hiểu được tiếng địa phương?', cat:'ai', status:'draft', views:0, helpful:0, updated:'2026-04-20', author:'Trâm', words:180, ragSync:false, featured:false, version:1 },
  { id:'a11', title:'(Review) Tự động chốt đơn cho hội thoại lâu không phản hồi', cat:'troubleshoot', status:'review', views:0, helpful:0, updated:'2026-04-19', author:'Vy', words:1080, ragSync:false, featured:false, version:1 },
  { id:'a12', title:'Bí quyết viết broadcast ZNS đạt CTR > 30%', cat:'getting-started', status:'published', views:3210, helpful:93, updated:'2026-03-25', author:'Hà', words:1120, ragSync:true, featured:false, version:6 },
];

const STATUS_STYLE = {
  published: { bg:'#DCFCE7', fg:'#15803D', l:'Đã đăng' },
  draft:     { bg:'#F1F5F9', fg:'#475569', l:'Nháp' },
  review:    { bg:'#FEF3C7', fg:'#92400E', l:'Chờ duyệt' },
};

function HelpCenterModule() {
  const [tab, setTab] = useHC('articles');
  const [editorOpen, setEditorOpen] = useHC(null);
  const [previewOpen, setPreviewOpen] = useHC(false);

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--fill-02)'}}>
      <div style={{padding:'14px 24px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:12}}>
        <div>
          <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, letterSpacing:'.04em'}}>HELP CENTER · KNOWLEDGE BASE</div>
          <div style={{fontSize:18, fontWeight:700, marginTop:2}}>Trung tâm trợ giúp khách hàng</div>
        </div>
        <span style={{flex:1}}/>
        <div style={{display:'flex', gap:8, alignItems:'center', padding:'6px 12px', background:'#DCFCE7', color:'#15803D', borderRadius:7, fontSize:11, fontWeight:600}}>
          <span style={{width:7, height:7, borderRadius:4, background:'currentColor', boxShadow:'0 0 0 3px rgba(34,197,94,.2)'}}/>
          help.appchat.vn · Public · 24,890 lượt/tháng
        </div>
        <button className="btn btn-ghost btn-sm" onClick={()=>setPreviewOpen(true)}><Icon.Globe/> Xem trang public</button>
        <button className="btn btn-primary btn-sm" onClick={()=>setEditorOpen({id:'new'})}><Icon.Plus/> Bài viết mới</button>
      </div>

      <div style={{padding:'0 24px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex'}}>
        {[
          {k:'articles', l:'Bài viết', n:HC_ARTICLES.length},
          {k:'categories', l:'Chuyên mục', n:HC_CATS.length},
          {k:'site', l:'Cấu hình trang public'},
          {k:'branding', l:'Thương hiệu & giao diện'},
          {k:'rag', l:'Đồng bộ Claude RAG', n:9},
          {k:'analytics', l:'Analytics & deflection'},
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer',
            borderBottom: tab===t.k?'2px solid var(--primary)':'2px solid transparent',
            color: tab===t.k?'var(--primary)':'var(--label-02)',
            fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7
          }}>
            {t.l}
            {t.n!==undefined && <span style={{background: tab===t.k?'var(--primary)':'var(--fill-03)', color: tab===t.k?'white':'var(--label-02)', padding:'1px 7px', borderRadius:8, fontSize:10, fontWeight:700}}>{t.n}</span>}
          </button>
        ))}
      </div>

      <div style={{flex:1, overflow:'hidden', display:'flex'}}>
        {tab==='articles' && <ArticlesTab onOpen={(a)=>setEditorOpen(a)}/>}
        {tab==='categories' && <CategoriesTab/>}
        {tab==='site' && <SiteConfigTab/>}
        {tab==='branding' && <BrandingTab/>}
        {tab==='rag' && <RagSyncTab/>}
        {tab==='analytics' && <AnalyticsTab/>}
      </div>

      {editorOpen && <ArticleEditor article={editorOpen} onClose={()=>setEditorOpen(null)}/>}
      {previewOpen && <PublicSitePreview onClose={()=>setPreviewOpen(false)}/>}
    </div>
  );
}

function ArticlesTab({ onOpen }) {
  const [filter, setFilter] = useHC('all');
  const [search, setSearch] = useHC('');
  const [catFilter, setCatFilter] = useHC('all');

  const filtered = HC_ARTICLES.filter(a => {
    if (filter!=='all' && a.status!==filter) return false;
    if (catFilter!=='all' && a.cat!==catFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    all: HC_ARTICLES.length,
    published: HC_ARTICLES.filter(a=>a.status==='published').length,
    draft: HC_ARTICLES.filter(a=>a.status==='draft').length,
    review: HC_ARTICLES.filter(a=>a.status==='review').length,
  };

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
      <div style={{padding:'12px 24px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
        <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, gap:2}}>
          {[{k:'all',l:'Tất cả',n:stats.all},{k:'published',l:'Đã đăng',n:stats.published},{k:'review',l:'Chờ duyệt',n:stats.review},{k:'draft',l:'Nháp',n:stats.draft}].map(f => (
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{
              padding:'5px 12px', borderRadius:5, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background: filter===f.k?'white':'transparent',
              color: filter===f.k?'var(--label-01)':'var(--label-02)',
              boxShadow: filter===f.k?'var(--shadow-sm)':'none', display:'flex', alignItems:'center', gap:6
            }}>
              {f.l} <span style={{fontSize:10, color:'var(--label-03)'}}>{f.n}</span>
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:'7px 10px', border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12}}>
          <option value="all">Mọi chuyên mục</option>
          {HC_CATS.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{position:'relative', flex:1, maxWidth:280}}>
          <Icon.Search style={{position:'absolute', left:9, top:8, width:14, height:14, color:'var(--label-03)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm bài viết..." style={{width:'100%', padding:'7px 10px 7px 30px', border:'1px solid var(--fill-04)', borderRadius:7, fontSize:12, outline:'none'}}/>
        </div>
        <span style={{flex:1}}/>
        <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> AI: Đề xuất chủ đề</button>
        <button className="btn btn-ghost btn-sm"><Icon.Download/> Xuất CSV</button>
      </div>

      <div className="scroll" style={{flex:1, overflow:'auto', padding:'0 24px 24px'}}>
        <div style={{background:'white', borderRadius:9, border:'1px solid var(--fill-04)', overflow:'hidden', marginTop:14}}>
          <div style={{display:'grid', gridTemplateColumns:'minmax(360px, 2.4fr) 130px 90px 110px 110px 100px 80px', padding:'10px 16px', borderBottom:'1px solid var(--fill-04)', background:'var(--fill-02)', fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:'.04em'}}>
            <span>BÀI VIẾT</span><span>CHUYÊN MỤC</span><span>TRẠNG THÁI</span><span>LƯỢT XEM</span><span>HỮU ÍCH</span><span>RAG</span><span>CẬP NHẬT</span>
          </div>
          {filtered.map(a => {
            const cat = HC_CATS.find(c=>c.id===a.cat);
            const st = STATUS_STYLE[a.status];
            return (
              <div key={a.id} onClick={()=>onOpen(a)} style={{display:'grid', gridTemplateColumns:'minmax(360px, 2.4fr) 130px 90px 110px 110px 100px 80px', padding:'12px 16px', borderBottom:'1px solid var(--fill-04)', alignItems:'center', cursor:'pointer', fontSize:13}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--fill-02)'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div>
                  <div style={{fontWeight:600, color:'var(--label-01)', display:'flex', alignItems:'center', gap:6}}>
                    {a.featured && <span title="Nổi bật" style={{color:'#F59E0B'}}>★</span>}
                    {a.title}
                  </div>
                  <div style={{fontSize:11, color:'var(--label-03)', marginTop:3}}>v{a.version} · {a.words} từ · {a.author}</div>
                </div>
                <span style={{fontSize:11, color:cat?.color, fontWeight:600}}>● {cat?.name}</span>
                <span style={{padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:700, background:st.bg, color:st.fg, justifySelf:'start'}}>{st.l}</span>
                <span style={{fontSize:12, fontWeight:600}}>{a.views ? a.views.toLocaleString() : '—'}</span>
                <span>
                  {a.helpful>0 ? (
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <div style={{width:50, height:5, background:'var(--fill-04)', borderRadius:3, overflow:'hidden'}}>
                        <div style={{width:`${a.helpful}%`, height:'100%', background: a.helpful>=85?'#22C55E':a.helpful>=70?'#F59E0B':'#EF4444'}}/>
                      </div>
                      <span style={{fontSize:11, fontWeight:600}}>{a.helpful}%</span>
                    </div>
                  ) : <span style={{color:'var(--label-03)'}}>—</span>}
                </span>
                <span>
                  {a.ragSync ? <span style={{padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:700, background:'#EDE9FE', color:'#6D28D9', display:'inline-flex', alignItems:'center', gap:4}}><Icon.Sparkles style={{width:10, height:10}}/>Synced</span> : <span style={{color:'var(--label-03)', fontSize:11}}>—</span>}
                </span>
                <span style={{fontSize:11, color:'var(--label-02)'}}>{a.updated.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoriesTab() {
  return (
    <div className="scroll" style={{flex:1, overflow:'auto', padding:24}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14}}>
        {HC_CATS.map(c => (
          <div key={c.id} style={{background:'white', borderRadius:10, border:'1px solid var(--fill-04)', padding:16}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
              <div style={{width:34, height:34, borderRadius:8, background:c.color+'22', color:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>●</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:14}}>{c.name}</div>
                <div style={{fontSize:11, color:'var(--label-03)', marginTop:1}}>{c.count} bài · /{c.id}</div>
              </div>
              <button className="btn-icon"><Icon.Edit/></button>
            </div>
            <div style={{display:'flex', gap:6, marginTop:10}}>
              <button className="btn btn-ghost btn-sm" style={{flex:1, fontSize:11}}>Sắp xếp</button>
              <button className="btn btn-ghost btn-sm" style={{flex:1, fontSize:11}}>Cấu hình SEO</button>
            </div>
          </div>
        ))}
        <div style={{background:'white', borderRadius:10, border:'2px dashed var(--fill-04)', padding:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, color:'var(--label-02)', cursor:'pointer'}}>
          <Icon.Plus style={{width:24, height:24}}/>
          <span style={{fontWeight:600, fontSize:13}}>Thêm chuyên mục</span>
        </div>
      </div>
    </div>
  );
}

function SiteConfigTab() {
  return (
    <div className="scroll" style={{flex:1, overflow:'auto', padding:24}}>
      <div style={{maxWidth:820, margin:'0 auto', display:'flex', flexDirection:'column', gap:14}}>
        <HCCard title="Tên miền & SEO">
          <HCField label="Tên miền chính" value="help.appchat.vn"/>
          <HCField label="Tên miền tuỳ chỉnh" value="support.shopbena.vn" hint="SSL đã active · Cloudflare"/>
          <HCField label="Tiêu đề trang (SEO)" value="Trợ giúp ShopBena — Hỏi đáp & hướng dẫn"/>
          <HCField label="Mô tả meta" value="Hơn 150 bài hướng dẫn cho khách hàng ShopBena. Trả lời 24/7 bởi Claude Cowork." textarea/>
          <HCField label="Open Graph image" value="og-help-1200x630.png" hint="1200×630px · cập nhật 18/04"/>
          <HCRow label="Sitemap.xml" value="https://help.appchat.vn/sitemap.xml" toggle/>
          <HCRow label="Robots.txt" value="Cho phép mọi crawler" toggle/>
          <HCRow label="Google Search Console" value="Đã xác minh · 24/03" toggle/>
        </HCCard>
        <HCCard title="Tìm kiếm & navigation">
          <HCRow label="Search bar trên header" value="Hiển thị" toggle/>
          <HCRow label="Auto-suggest từ Claude" value="Bật · debounce 280ms" toggle/>
          <HCRow label="Top 6 bài viết nổi bật" value="Cập nhật theo lượt xem 7 ngày" toggle/>
          <HCRow label="Breadcrumb" value="Hiển thị trên bài viết" toggle/>
        </HCCard>
        <HCCard title="Đa ngôn ngữ">
          <HCRow label="Tiếng Việt (mặc định)" value="150 bài · 100% dịch" toggle/>
          <HCRow label="English" value="42 bài · 28%" toggle/>
          <HCRow label="中文 (简体)" value="18 bài · 12%" toggle off/>
          <button className="btn btn-ghost btn-sm" style={{marginTop:8}}><Icon.Sparkles/> Dịch hàng loạt với Claude</button>
        </HCCard>
        <HCCard title="Cấu hình bài viết">
          <HCRow label="Hiện thông tin tác giả" value="Tên + avatar" toggle/>
          <HCRow label="Hiện ngày cập nhật" value="Cuối bài" toggle/>
          <HCRow label="Phản hồi 'Bài viết có hữu ích?'" value="Cuối bài + heatmap" toggle/>
          <HCRow label="Bài viết liên quan" value="3 bài cùng chuyên mục" toggle/>
          <HCRow label="Live chat fallback" value="Mở widget khi user chấm 1-2 sao" toggle/>
        </HCCard>
      </div>
    </div>
  );
}

function BrandingTab() {
  const [color, setColor] = useHC('#2DC56A');
  return (
    <div style={{flex:1, display:'flex', overflow:'hidden'}}>
      <div className="scroll" style={{width:380, borderRight:'1px solid var(--fill-04)', overflow:'auto', padding:'18px 20px', background:'white'}}>
        <div style={{fontSize:11, color:'var(--label-03)', fontWeight:700, letterSpacing:'.04em', marginBottom:10}}>NHẬN DIỆN</div>
        <HCField label="Tên trang public" value="Trợ giúp ShopBena"/>
        <HCField label="Slogan" value="Câu trả lời, ngay khi bạn cần."/>
        <div style={{marginTop:12, marginBottom:8, fontSize:12, fontWeight:600}}>Logo</div>
        <div style={{display:'flex', gap:8, marginBottom:14}}>
          <div style={{flex:1, height:60, borderRadius:8, background:'var(--fill-02)', border:'1px solid var(--fill-04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--label-03)'}}>Light · 240×60</div>
          <div style={{flex:1, height:60, borderRadius:8, background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#94A3B8'}}>Dark · 240×60</div>
        </div>
        <div style={{fontSize:12, fontWeight:600, marginBottom:6}}>Màu chủ đạo</div>
        <div style={{display:'flex', gap:6, marginBottom:14, flexWrap:'wrap'}}>
          {['#2DC56A','#0EA5E9','#A855F7','#F59E0B','#EC4899','#0F172A'].map(c => (
            <button key={c} onClick={()=>setColor(c)} style={{width:32, height:32, borderRadius:8, background:c, border: color===c?'3px solid #0F172A':'2px solid white', boxShadow:'0 0 0 1px var(--fill-04)', cursor:'pointer'}}/>
          ))}
        </div>
        <HCField label="Font hero" value="Plus Jakarta Sans · 800"/>
        <HCField label="Font body" value="Inter · 400"/>
        <div style={{marginTop:16, fontSize:11, color:'var(--label-03)', fontWeight:700, letterSpacing:'.04em', marginBottom:10}}>HERO SECTION</div>
        <HCField label="Tiêu đề hero" value="Bạn cần giúp gì?" textarea/>
        <HCField label="Background" value="Gradient lá · #2DC56A → #18A85A"/>
        <HCRow label="Hiện logo Powered by AppChat" value="Footer" toggle/>
        <HCRow label="Live chat trong góc phải" value="Mở Widget Studio" toggle/>
      </div>
      <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background:'#F1F5F9'}}>
        <div style={{padding:'12px 20px', background:'white', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:13, fontWeight:600}}>Live preview</span>
          <span style={{fontSize:11, color:'var(--label-03)'}}>help.appchat.vn</span>
          <span style={{flex:1}}/>
          <div style={{display:'flex', padding:3, background:'var(--fill-03)', borderRadius:7, gap:2}}>
            <button style={{padding:'4px 10px', borderRadius:5, border:'none', background:'white', boxShadow:'var(--shadow-sm)', cursor:'pointer', fontSize:11, fontWeight:600}}>Desktop</button>
            <button style={{padding:'4px 10px', borderRadius:5, border:'none', background:'transparent', cursor:'pointer', fontSize:11, fontWeight:600, color:'var(--label-02)'}}>Mobile</button>
          </div>
        </div>
        <div className="scroll" style={{flex:1, overflow:'auto', padding:24}}>
          <PublicSiteMock color={color}/>
        </div>
      </div>
    </div>
  );
}

function PublicSiteMock({ color='#2DC56A' }) {
  return (
    <div style={{maxWidth:980, margin:'0 auto', background:'white', borderRadius:14, overflow:'hidden', boxShadow:'0 12px 40px rgba(15,23,42,.08)', border:'1px solid var(--fill-04)'}}>
      <div style={{padding:'14px 24px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:14}}>
        <div style={{width:120, height:26, background:`linear-gradient(135deg, ${color}, ${color}cc)`, borderRadius:6, display:'flex', alignItems:'center', padding:'0 10px', color:'white', fontWeight:700, fontSize:13}}>ShopBena Help</div>
        <span style={{flex:1}}/>
        <span style={{fontSize:13, color:'var(--label-02)'}}>Liên hệ</span>
        <span style={{fontSize:13, color:'var(--label-02)'}}>Trạng thái</span>
        <button style={{padding:'6px 14px', borderRadius:6, background:color, color:'white', border:'none', fontWeight:600, fontSize:12}}>Chat ngay</button>
      </div>
      <div style={{padding:'56px 24px 36px', background:`linear-gradient(135deg, ${color}, ${color}cc)`, color:'white', textAlign:'center'}}>
        <div style={{fontSize:32, fontWeight:800, marginBottom:8}}>Bạn cần giúp gì?</div>
        <div style={{fontSize:14, opacity:.9, marginBottom:24}}>Hơn 150 bài hướng dẫn · Hỗ trợ 24/7 bởi Claude Cowork</div>
        <div style={{maxWidth:520, margin:'0 auto', background:'white', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 24px rgba(0,0,0,.16)'}}>
          <Icon.Search style={{width:18, height:18, color:'var(--label-02)'}}/>
          <span style={{flex:1, color:'var(--label-03)', textAlign:'left'}}>VD: Cách theo dõi đơn 1688...</span>
          <span style={{padding:'3px 8px', background:'var(--fill-02)', borderRadius:5, fontSize:11, color:'var(--label-02)', fontWeight:600}}>⌘K</span>
        </div>
      </div>
      <div style={{padding:'28px 24px'}}>
        <div style={{fontSize:12, fontWeight:700, color:'var(--label-03)', letterSpacing:'.05em', marginBottom:14}}>BÀI VIẾT NỔI BẬT</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
          {HC_ARTICLES.filter(a=>a.featured).slice(0,3).map(a => (
            <div key={a.id} style={{padding:14, border:'1px solid var(--fill-04)', borderRadius:9}}>
              <div style={{fontSize:11, color:color, fontWeight:700, marginBottom:6}}>{HC_CATS.find(c=>c.id===a.cat)?.name}</div>
              <div style={{fontSize:13, fontWeight:600, lineHeight:1.4, marginBottom:8}}>{a.title}</div>
              <div style={{fontSize:11, color:'var(--label-03)'}}>{a.views.toLocaleString()} lượt xem · {a.helpful}% hữu ích</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12, fontWeight:700, color:'var(--label-03)', letterSpacing:'.05em', margin:'24px 0 14px'}}>CHUYÊN MỤC</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
          {HC_CATS.slice(0,8).map(c => (
            <div key={c.id} style={{padding:'12px 14px', border:'1px solid var(--fill-04)', borderRadius:9, display:'flex', alignItems:'center', gap:10}}>
              <div style={{width:28, height:28, borderRadius:7, background:c.color+'22', color:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>●</div>
              <div>
                <div style={{fontSize:12, fontWeight:600}}>{c.name}</div>
                <div style={{fontSize:10, color:'var(--label-03)'}}>{c.count} bài</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RagSyncTab() {
  return (
    <div className="scroll" style={{flex:1, overflow:'auto', padding:24}}>
      <div style={{maxWidth:920, margin:'0 auto'}}>
        <div style={{padding:'18px 20px', background:'linear-gradient(135deg, #EDE9FE, white)', borderRadius:12, border:'1px solid #DDD6FE', marginBottom:16}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
            <div style={{width:42, height:42, borderRadius:10, background:'#8B5CF6', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon.Sparkles/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:15, fontWeight:700}}>Đồng bộ knowledge base sang Claude Cowork RAG</div>
              <div style={{fontSize:12, color:'var(--label-02)', marginTop:2}}>Mỗi bài viết được embedding thành vector và sử dụng làm ngữ cảnh khi Claude trả lời khách</div>
            </div>
            <button className="btn btn-primary btn-sm"><Icon.Refresh/> Đồng bộ ngay</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
            {[{l:'Bài đã sync', v:'9 / 12'},{l:'Vector tokens', v:'48,210'},{l:'Embedding model', v:'voyage-3'},{l:'Lần sync gần nhất', v:'2 phút trước'}].map(s => (
              <div key={s.l} style={{padding:'10px 12px', background:'white', borderRadius:8, border:'1px solid #DDD6FE'}}>
                <div style={{fontSize:18, fontWeight:700, color:'#6D28D9'}}>{s.v}</div>
                <div style={{fontSize:11, color:'var(--label-03)', marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <HCCard title="Cấu hình embedding">
          <HCField label="Embedding model" value="voyage-3 · 1024 dim"/>
          <HCField label="Chunk size" value="800 tokens · overlap 80"/>
          <HCField label="Vector store" value="Pinecone · index appchat-kb-prod"/>
          <HCRow label="Tự động re-embed khi bài viết thay đổi" value="Bật" toggle/>
          <HCRow label="Loại trừ bài viết status Draft / Review" value="Bật" toggle/>
        </HCCard>

        <HCCard title="Truy vấn RAG (tuần qua)">
          <div style={{padding:'12px 16px'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 80px 80px 100px', fontSize:11, color:'var(--label-03)', fontWeight:700, letterSpacing:'.04em', paddingBottom:8, borderBottom:'1px solid var(--fill-04)'}}>
              <span>TRUY VẤN PHỔ BIẾN</span><span>SỐ HIT</span><span>HIT RATE</span><span>BÀI ĐƯỢC LẤY</span>
            </div>
            {[
              {q:'Cách theo dõi đơn 1688', n:412, r:96, a:'a2'},
              {q:'Bao lâu thì hoàn tiền?', n:298, r:91, a:'a3'},
              {q:'Đơn bị giữ ở Hải quan', n:184, r:88, a:'a4'},
              {q:'Kết nối Zalo OA', n:142, r:94, a:'a5'},
              {q:'Claude trả lời sai sản phẩm', n:24, r:42, a:null},
            ].map((r,i) => (
              <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 80px 80px 100px', padding:'10px 0', borderBottom:'1px solid var(--fill-04)', alignItems:'center', fontSize:13}}>
                <span style={{fontWeight:500}}>{r.q}</span>
                <span style={{fontWeight:600}}>{r.n}</span>
                <span style={{color: r.r>=80?'#15803D':'#B45309', fontWeight:700}}>{r.r}%</span>
                <span style={{fontSize:11, color:'var(--label-02)'}}>{r.a || 'Không có bài phù hợp ⚠️'}</span>
              </div>
            ))}
          </div>
        </HCCard>

        <HCCard title="Khoảng trống nội dung (AI phát hiện)">
          {[
            {t:'Khách hỏi về Claude trả lời sai sản phẩm', d:'24 truy vấn không có bài phù hợp · gợi ý viết bài "Khi Claude trả lời sai, làm sao báo lỗi?"'},
            {t:'Hoàn tiền cho thẻ tín dụng quốc tế', d:'18 truy vấn · chỉ có bài hoàn tiền VietQR · cần bài riêng'},
            {t:'Đặt hàng số lượng lớn từ 1688', d:'12 truy vấn · cần FAQ về MOQ + chiết khấu B2B'},
          ].map((g,i) => (
            <div key={i} style={{padding:'12px 16px', borderBottom: i<2?'1px solid var(--fill-04)':'none', display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:30, height:30, borderRadius:8, background:'#FEF3C7', color:'#B45309', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0}}>!</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>{g.t}</div>
                <div style={{fontSize:11, color:'var(--label-02)', marginTop:2}}>{g.d}</div>
              </div>
              <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> AI viết draft</button>
            </div>
          ))}
        </HCCard>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="scroll" style={{flex:1, overflow:'auto', padding:24}}>
      <div style={{maxWidth:1100, margin:'0 auto'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginBottom:14}}>
          {[
            {l:'Lượt xem', v:'24,890', d:'+18% so tuần trước', c:'#0EA5E9'},
            {l:'Khách self-serve', v:'76%', d:'Không cần chat', c:'#22C55E'},
            {l:'Ticket giảm', v:'−42%', d:'so cùng kỳ Q1', c:'#22C55E'},
            {l:'Hữu ích avg', v:'89%', d:'Hài lòng 4.4/5', c:'#A855F7'},
            {l:'Tìm kiếm rỗng', v:'3.2%', d:'Cần nội dung mới', c:'#F59E0B'},
          ].map(k => (
            <div key={k.l} style={{padding:14, background:'white', borderRadius:10, border:'1px solid var(--fill-04)'}}>
              <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em'}}>{k.l}</div>
              <div style={{fontSize:24, fontWeight:800, marginTop:6, color:k.c}}>{k.v}</div>
              <div style={{fontSize:11, color:'var(--label-02)', marginTop:4}}>{k.d}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14}}>
          <HCCard title="Lưu lượng 30 ngày qua">
            <div style={{padding:'14px 16px', height:240, position:'relative'}}>
              <svg viewBox="0 0 600 200" style={{width:'100%', height:'100%'}}>
                <defs>
                  <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2DC56A" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#2DC56A" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {[40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#E2E8F0" strokeDasharray="3 3"/>)}
                <path d="M0 140 L40 130 L80 110 L120 120 L160 90 L200 100 L240 70 L280 80 L320 60 L360 70 L400 50 L440 60 L480 30 L520 40 L560 20 L600 30 L600 200 L0 200 Z" fill="url(#hcGrad)"/>
                <path d="M0 140 L40 130 L80 110 L120 120 L160 90 L200 100 L240 70 L280 80 L320 60 L360 70 L400 50 L440 60 L480 30 L520 40 L560 20 L600 30" stroke="#2DC56A" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          </HCCard>

          <HCCard title="Top 5 bài xem nhiều">
            {HC_ARTICLES.filter(a=>a.status==='published').sort((a,b)=>b.views-a.views).slice(0,5).map((a,i) => (
              <div key={a.id} style={{padding:'10px 16px', borderBottom: i<4?'1px solid var(--fill-04)':'none', display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:22, height:22, borderRadius:5, background:'var(--fill-02)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700}}>{i+1}</div>
                <div style={{flex:1, fontSize:12, fontWeight:500, lineHeight:1.4}}>{a.title}</div>
                <div style={{fontSize:11, fontWeight:700, color:'var(--label-01)'}}>{a.views.toLocaleString()}</div>
              </div>
            ))}
          </HCCard>
        </div>

        <HCCard title="Ticket đã được tự deflect (Help Center thay vì chat)" style={{marginTop:14}}>
          <div style={{padding:'14px 16px', display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6, alignItems:'end', height:140}}>
            {[42,58,72,68,85,62,78].map((v,i) => (
              <div key={i} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                <div style={{width:'100%', height:`${v}%`, background:'#22C55E', borderRadius:'4px 4px 0 0', position:'relative'}}>
                  <div style={{position:'absolute', top:-18, left:0, right:0, textAlign:'center', fontSize:10, fontWeight:700, color:'#15803D'}}>{v*4}</div>
                </div>
                <div style={{fontSize:10, color:'var(--label-03)'}}>{['T2','T3','T4','T5','T6','T7','CN'][i]}</div>
              </div>
            ))}
          </div>
        </HCCard>
      </div>
    </div>
  );
}

function ArticleEditor({ article, onClose }) {
  const isNew = article.id === 'new';
  const a = isNew ? { title:'', cat:'getting-started', status:'draft', words:0, version:1, ragSync:false, featured:false, author:'Trâm', updated:'2026-04-21' } : article;
  const cat = HC_CATS.find(c=>c.id===a.cat);
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,.5)', zIndex:60, display:'flex', justifyContent:'flex-end'}}>
      <div onClick={onClose} style={{flex:1}}/>
      <div style={{width:'72%', background:'white', display:'flex', flexDirection:'column', boxShadow:'-12px 0 40px rgba(0,0,0,.18)'}}>
        <div style={{padding:'12px 20px', borderBottom:'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
          <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
          <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600}}>{isNew?'Tạo bài viết':'Sửa bài viết'} · {cat?.name}</div>
          <span style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm"><Icon.Sparkles/> Claude viết hộ</button>
          <button className="btn btn-ghost btn-sm">Xem trước</button>
          <button className="btn btn-ghost btn-sm">Lưu nháp</button>
          <button className="btn btn-primary btn-sm">Xuất bản</button>
        </div>

        <div style={{flex:1, display:'flex', overflow:'hidden'}}>
          <div className="scroll" style={{flex:1, overflow:'auto', padding:'24px 32px'}}>
            <input defaultValue={a.title || 'Nhập tiêu đề bài viết...'} style={{width:'100%', border:'none', outline:'none', fontSize:28, fontWeight:800, padding:'8px 0', marginBottom:6}}/>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14, color:'var(--label-02)', fontSize:12}}>
              <span>{a.author} · {a.updated}</span>
              <span>·</span>
              <span style={{color:cat?.color, fontWeight:600}}>● {cat?.name}</span>
              <span>·</span>
              <span>v{a.version}</span>
            </div>

            <div style={{display:'flex', gap:4, padding:6, background:'var(--fill-02)', borderRadius:8, marginBottom:14, alignItems:'center', flexWrap:'wrap'}}>
              {['B','I','U','S'].map(t => <button key={t} style={{width:28, height:28, border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontWeight:700, fontSize:13}}>{t}</button>)}
              <span style={{width:1, height:18, background:'var(--fill-04)', margin:'0 4px'}}/>
              {['H1','H2','H3'].map(t => <button key={t} style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontWeight:700, fontSize:11}}>{t}</button>)}
              <span style={{width:1, height:18, background:'var(--fill-04)', margin:'0 4px'}}/>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>≡</button>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>•</button>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>1.</button>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>&lt;/&gt;</button>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>🖼</button>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>🎬</button>
              <button style={{padding:'4px 8px', border:'none', background:'transparent', borderRadius:5, cursor:'pointer', fontSize:11}}>🔗</button>
              <span style={{flex:1}}/>
              <button className="btn btn-ghost btn-sm" style={{fontSize:11}}><Icon.Sparkles/> Cải thiện</button>
            </div>

            <div style={{lineHeight:1.7, fontSize:14, color:'var(--label-01)'}}>
              <p>Để bật <b>Claude Cowork</b> tự trả lời cho hội thoại Zalo, bạn cần thực hiện 4 bước sau:</p>
              <h3 style={{marginTop:18}}>1. Kết nối kênh Zalo OA</h3>
              <p>Vào <b>Settings → Kênh kết nối → Zalo OA</b>, dán access token và verify domain. Quy trình mất khoảng 3 phút.</p>
              <h3 style={{marginTop:18}}>2. Cấu hình Claude Cowork agent</h3>
              <p>Mở <b>Automation → Training Studio</b>, chọn agent "Sales Cowork" (hoặc tạo mới). Persona đề xuất: thân thiện, ngắn gọn, không dùng tiếng Anh.</p>
              <h3 style={{marginTop:18}}>3. Đẩy knowledge base lên RAG</h3>
              <p>Sang <b>Help Center → Đồng bộ Claude RAG</b>, bật toggle "Tự động re-embed". Bài viết status Published sẽ được sync trong vòng 2 phút.</p>
              <h3 style={{marginTop:18}}>4. Bật Auto-reply trong Inbox</h3>
              <p>Vào <b>Messages</b>, chọn folder Zalo, bật "AI tự trả lời" với confidence threshold ≥ 80%. Câu hỏi dưới 80% sẽ chuyển cho human agent.</p>
              <div style={{padding:'14px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, marginTop:18}}>
                <div style={{fontSize:12, fontWeight:700, color:'#1E40AF', marginBottom:4}}>💡 Mẹo</div>
                <div style={{fontSize:13, color:'#1E40AF'}}>Bật chế độ "Shadow mode" trong tuần đầu — Claude soạn reply nhưng human review trước khi gửi. Sau khi đạt 90% accuracy thì chuyển sang Auto.</div>
              </div>
            </div>
          </div>

          <div className="scroll" style={{width:280, borderLeft:'1px solid var(--fill-04)', overflow:'auto', padding:'18px 16px', background:'var(--fill-02)'}}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:'.04em', marginBottom:8}}>METADATA</div>
            <HCField label="Slug URL" value="bat-claude-cowork-zalo" small/>
            <HCField label="Chuyên mục" value={cat?.name} small/>
            <HCField label="Tags" value="zalo, claude, auto-reply" small/>
            <HCField label="Tác giả" value={a.author} small/>
            <HCRow label="Bài nổi bật" value={a.featured?'Có':'Không'} toggle on={a.featured} compact/>
            <HCRow label="Đồng bộ RAG" value={a.ragSync?'Bật':'Tắt'} toggle on={a.ragSync} compact/>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:'.04em', margin:'18px 0 8px'}}>SEO</div>
            <HCField label="Meta title" value={a.title} small/>
            <HCField label="Meta description" value="Hướng dẫn 4 bước để Claude Cowork tự trả lời cho hội thoại Zalo OA" small textarea/>
            <div style={{fontSize:11, fontWeight:700, color:'var(--label-03)', letterSpacing:'.04em', margin:'18px 0 8px'}}>VERSION HISTORY</div>
            {[
              {v:7, who:'Trâm', when:'18/04 14:32', d:'Cập nhật bước 4 - shadow mode'},
              {v:6, who:'Long', when:'10/04 09:18', d:'Thêm phần SEO meta'},
              {v:5, who:'Trâm', when:'02/04 11:40', d:'Sửa lỗi token Zalo'},
            ].map(v => (
              <div key={v.v} style={{padding:'8px 0', borderBottom:'1px solid var(--fill-04)', fontSize:11}}>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <span style={{fontWeight:700}}>v{v.v}</span>
                  <span style={{color:'var(--label-02)'}}>· {v.who}</span>
                  <span style={{flex:1}}/>
                  <span style={{color:'var(--label-03)'}}>{v.when}</span>
                </div>
                <div style={{color:'var(--label-02)', marginTop:2}}>{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicSitePreview({ onClose }) {
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,.65)', zIndex:60, display:'flex', flexDirection:'column'}}>
      <div style={{padding:'10px 16px', background:'white', display:'flex', alignItems:'center', gap:10}}>
        <button className="btn-icon" onClick={onClose}><Icon.Close/></button>
        <div style={{display:'flex', gap:6}}>
          <span style={{width:11, height:11, borderRadius:6, background:'#FF5F57'}}/>
          <span style={{width:11, height:11, borderRadius:6, background:'#FEBC2E'}}/>
          <span style={{width:11, height:11, borderRadius:6, background:'#28C840'}}/>
        </div>
        <div style={{padding:'5px 14px', background:'var(--fill-02)', borderRadius:6, fontSize:12, color:'var(--label-02)', flex:1, maxWidth:520, margin:'0 auto', display:'flex', alignItems:'center', gap:8}}>
          <span style={{color:'#22C55E'}}>🔒</span>
          help.appchat.vn
        </div>
        <button className="btn btn-ghost btn-sm">Mở tab mới</button>
      </div>
      <div className="scroll" style={{flex:1, overflow:'auto', padding:'24px', background:'#F1F5F9'}}>
        <PublicSiteMock color="#2DC56A"/>
      </div>
    </div>
  );
}

function HCCard({ title, children, style={} }) {
  return (
    <div style={{background:'white', borderRadius:10, border:'1px solid var(--fill-04)', overflow:'hidden', marginBottom:14, ...style}}>
      <div style={{padding:'12px 16px', borderBottom:'1px solid var(--fill-04)', fontSize:13, fontWeight:700}}>{title}</div>
      {children}
    </div>
  );
}

function HCField({ label, value, hint, textarea, small }) {
  return (
    <div style={{padding: small?'8px 0':'10px 16px', borderBottom: small?'none':'1px solid var(--fill-04)'}}>
      <div style={{fontSize:11, color:'var(--label-03)', fontWeight:600, marginBottom:5}}>{label}</div>
      {textarea ? (
        <div style={{padding:'8px 10px', background:'var(--fill-02)', borderRadius:6, fontSize:13, lineHeight:1.5, minHeight:50}}>{value}</div>
      ) : (
        <input defaultValue={value} style={{width:'100%', padding:'7px 10px', border:'1px solid var(--fill-04)', borderRadius:6, fontSize:13, outline:'none', background:'white'}}/>
      )}
      {hint && <div style={{fontSize:10, color:'var(--label-03)', marginTop:4}}>{hint}</div>}
    </div>
  );
}

function HCRow({ label, value, toggle, on=true, compact }) {
  return (
    <div style={{padding: compact?'8px 0':'12px 16px', borderBottom: compact?'none':'1px solid var(--fill-04)', display:'flex', alignItems:'center', gap:10}}>
      <div style={{flex:1}}>
        <div style={{fontSize:13, fontWeight:600}}>{label}</div>
        <div style={{fontSize:11, color:'var(--label-02)', marginTop:2}}>{value}</div>
      </div>
      {toggle && (
        <div style={{width:34, height:20, borderRadius:11, background: on?'#2DC56A':'var(--fill-04)', position:'relative', cursor:'pointer', flexShrink:0}}>
          <div style={{position:'absolute', top:2, left: on?16:2, width:16, height:16, borderRadius:9, background:'white', boxShadow:'0 2px 4px rgba(0,0,0,.15)', transition:'left .15s'}}/>
        </div>
      )}
    </div>
  );
}

window.HelpCenterModule = HelpCenterModule;
