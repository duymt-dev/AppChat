/* ============================================================
   tag-store.jsx — Nguồn TAG dùng chung toàn workspace
   Settings (quản lý) ⇄ Customers ⇄ Hộp thư đều đọc/ghi tại đây
   Loaded BEFORE _bundle.jsx
   ============================================================ */
;(function(){
try {
  var KEY='ac_tags_v2';
  var DEFAULT=[
    {id:'t_vip',     n:'VIP',          c:'#DC2626', u:124},
    {id:'t_gold',    n:'Gold',         c:'#F59E0B', u:348},
    {id:'t_hot',     n:'Hot lead',     c:'#EF4444', u:86},
    {id:'t_potential',n:'Tiềm năng',   c:'#2563EB', u:210},
    {id:'t_care',    n:'Đã chăm sóc',  c:'#16A34A', u:175},
    {id:'t_callback',n:'Cần gọi lại',  c:'#D97706', u:64},
    {id:'t_order',   n:'Đơn hàng',     c:'#7C3AED', u:298},
    {id:'t_complain',n:'Khiếu nại',    c:'#B91C1C', u:23},
    {id:'t_member',  n:'Thành viên',   c:'#0E9B94', u:412},
    {id:'t_tier_kim', n:'Kim cương', c:'#6E48E6', u:48},
    {id:'t_tier_vang',n:'Vàng',      c:'#F59E0B', u:186},
    {id:'t_tier_bac', n:'Bạc',       c:'#64748B', u:512},
  ];
  function read(){ try{ var v=JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v)&&v.length?v:DEFAULT.slice(); }catch(e){ return DEFAULT.slice(); } }
  function write(list){ try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){} window.dispatchEvent(new Event('ac-tags-change')); }
  var store = {
    list: function(){ return read(); },
    add: function(n, c){ var l=read(); var id='t_'+Date.now(); l.push({id:id, n:n, c:c||'#64748B', u:0}); write(l); return id; },
    update: function(id, patch){ var l=read().map(function(t){ return t.id===id?Object.assign({},t,patch):t; }); write(l); },
    remove: function(id){ write(read().filter(function(t){ return t.id!==id; })); },
  };
  window.AppTags = store;
  // ===== Luồng nghiệp vụ dùng chung: Báo giá → Hợp đồng → Đơn hàng → Pipeline =====
  window.AppFlow = window.AppFlow || { log:[], push:function(ev){ ev.at=Date.now(); this.log.unshift(ev); try{ window.dispatchEvent(new CustomEvent('ac-flow', {detail:ev})); }catch(e){} } };
  // ===== Loyalty lookup dùng chung (panel 360 đọc hạng/điểm theo khách) =====
  var TIER={kim:{l:'Kim cương',c:'#6E48E6'},vang:{l:'Vàng',c:'#F59E0B'},bac:{l:'Bạc',c:'#64748B'},tv:{l:'Thành viên',c:'#0E9B94'}};
  var MEMBERS={
    'Chị Lan':{tier:'kim',pts:24800},'Nguyễn T. Hiếu':{tier:'vang',pts:9200},'Phạm Quỳnh':{tier:'vang',pts:8600},
    'Đỗ Thu Hà':{tier:'bac',pts:4200},'Vũ Đức Anh':{tier:'bac',pts:3100},'Trần Minh Tâm':{tier:'tv',pts:2800},
    'Lê Thị Mai':{tier:'tv',pts:2400},'Hoàng Quốc Bảo':{tier:'tv',pts:2100},'Ngô Bích':{tier:'tv',pts:680},
  };
  window.AppLoyalty={
    byName:function(name){ var m=MEMBERS[name]||{tier:'tv',pts:0}; var t=TIER[m.tier]; return {tier:m.tier, label:t.l, color:t.c, pts:m.pts, money:m.pts*100}; },
    tierTag:function(name){ var t=TIER[(MEMBERS[name]||{tier:'tv'}).tier]; return t.l; }
  };
  // React hook — subscribe để mọi nơi tự đồng bộ khi tag thay đổi
  window.useTags = function(){
    var s = React.useState(read());
    React.useEffect(function(){ var h=function(){ s[1](read()); }; window.addEventListener('ac-tags-change',h); return function(){ window.removeEventListener('ac-tags-change',h); }; }, []);
    return s[0];
  };
} catch(e){ console.error('tag-store.jsx', e); }
})();
