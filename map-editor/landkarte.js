/* Landkarte renderer: draws a map page from a JSON file in the format "landkarte/1".
   Used by the viewer and by the editor. Exposes window.LK. */
(function(){
"use strict";
const NS="http://www.w3.org/2000/svg";
const esc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const stripTags=s=>String(s==null?"":s).replace(/<[^>]*>/g,"");

/* ---------- safe HTML: only a few inline tags, links open in a new tab ---------- */
const OK_TAGS=new Set(["A","SPAN","I","EM","B","STRONG","BR","SUB","SUP","SMALL","ABBR","CODE"]);
const OK_ATTR=new Set(["href","title","class","lang"]);
function setHTML(el,html){
  const t=document.createElement("template");t.innerHTML=html==null?"":String(html);
  (function clean(node){
    for(const c of [...node.childNodes]){
      if(c.nodeType===1){
        if(!OK_TAGS.has(c.tagName)){const frag=document.createDocumentFragment();while(c.firstChild)frag.appendChild(c.firstChild);c.replaceWith(frag);clean(node);return}
        for(const a of [...c.attributes]){if(!OK_ATTR.has(a.name))c.removeAttribute(a.name)}
        if(c.tagName==="A"){const h=c.getAttribute("href")||"";if(!/^(https?:|#|mailto:)/i.test(h))c.removeAttribute("href");c.setAttribute("target","_blank");c.setAttribute("rel","noopener")}
        clean(c);
      }else if(c.nodeType!==3){c.remove()}
    }
  })(t.content);
  el.replaceChildren(t.content);
  return el;
}
function h(tag,attrs,html){const n=document.createElement(tag);if(attrs)for(const k in attrs){if(attrs[k]!=null)n.setAttribute(k,attrs[k])}if(html!=null)setHTML(n,html);return n}

/* ---------- link templates ----------
   {1}            text of capture group 1
   {1|f|g}        with filters: pad2, pad3, ceil10, enc, lower, or:VALUE, map:TABLE, range:TABLE, max:N
   [ ... ]        optional part, left out when a group inside it is empty                  */
const MISSING={};
function fill(tpl,m,tables){
  let fail=false;
  const sub=(s,opt)=>s.replace(/\{(\d+)((?:\|[^{}|]+)*)\}/g,(all,n,fs)=>{
    let v=m[+n];
    for(const f of (fs?fs.slice(1).split("|"):[])){
      const i=f.indexOf(":"),name=i<0?f:f.slice(0,i),arg=i<0?"":f.slice(i+1);
      if(name==="or"){if(v==null||v==="")v=arg;continue}
      if(v==null||v==="")break;
      switch(name){
        case "pad2":v=String(v).padStart(2,"0");break;
        case "pad3":v=String(v).padStart(3,"0");break;
        case "ceil10":v=String(Math.ceil(parseInt(v,10)/10)*10);break;
        case "enc":v=encodeURIComponent(v);break;
        case "lower":v=String(v).toLowerCase();break;
        case "max":if(parseInt(v,10)>parseInt(arg,10))fail=true;break;
        case "map":{const t=tables&&tables[arg];v=t?t[v]:undefined;if(v==null)fail=true;break}
        case "range":{const t=(tables&&tables[arg])||[];const x=parseInt(v,10);const r=t.find(r=>x>=r[0]&&x<=r[1])||t[0];v=r?r[0]+"-"+r[1]:v;break}
      }
    }
    if(v==null||v===""){if(opt)throw MISSING;v=""}
    return v;
  });
  let out=tpl.replace(/\[([^\[\]]*)\]/g,(all,inner)=>{try{return sub(inner,true)}catch(e){if(e===MISSING)return "";throw e}});
  out=sub(out,false);
  return fail?null:out;
}

function compileRules(data,lang){
  const L=data.linking||{},out=[];
  for(const r of (L.rules||[])){
    if(r.lang&&r.lang!=="*"&&r.lang!==lang)continue;
    try{out.push({rx:new RegExp(r.pattern,"gu"),url:r.url})}catch(e){console.warn("Verlinkungsregel ungültig:",r.pattern,e.message)}
  }
  return {rules:out,tables:L.tables||{}};
}
function compileGlossary(data,lang){
  const g=(data.glossary&&data.glossary[lang])||{};
  const keys=Object.keys(g).filter(k=>k.trim()).sort((a,b)=>b.length-a.length);
  if(!keys.length)return null;
  return {rx:new RegExp("(?<![\\p{L}ʿʾ])("+keys.map(esc).join("|")+")(?![\\p{L}ʿʾ])","giu"),map:new Map(keys.map(k=>[k.toLowerCase(),g[k]]))};
}
function textNodes(root,skip,rx){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||p.closest(skip))return NodeFilter.FILTER_REJECT;rx.lastIndex=0;return rx.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  const a=[];while(w.nextNode())a.push(w.currentNode);return a;
}
function linkify(root,C){
  for(const r of C.rules){
    for(const n of textNodes(root,"a,script,style,svg,button,dt,h1,h2,textarea,input,.lk-noenrich",r.rx)){
      const s=n.nodeValue,frag=document.createDocumentFragment();let last=0,m;r.rx.lastIndex=0;
      while((m=r.rx.exec(s))){if(!m[0]){r.rx.lastIndex++;continue}const u=fill(r.url,m,C.tables);if(!u)continue;frag.append(s.slice(last,m.index));const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener";a.textContent=m[0];frag.append(a);last=m.index+m[0].length}
      frag.append(s.slice(last));n.replaceWith(frag);
    }
  }
}
function annotate(root,G){
  if(!G)return;
  for(const n of textNodes(root,".term,a,script,style,svg,button,dt,h1,textarea,input,.lk-noenrich",G.rx)){
    const s=n.nodeValue,frag=document.createDocumentFragment();let last=0,m;G.rx.lastIndex=0;
    while((m=G.rx.exec(s))){frag.append(s.slice(last,m.index));const sp=document.createElement("span");sp.className="term";sp.title=G.map.get(m[0].toLowerCase())||"";sp.tabIndex=0;sp.textContent=m[0];frag.append(sp);last=m.index+m[0].length}
    frag.append(s.slice(last));n.replaceWith(frag);
  }
}

/* ---------- tooltip for glossary terms (tap and keyboard) ---------- */
let tip=null;
function ensureTip(){
  if(tip)return;
  tip=document.createElement("div");tip.id="tip";tip.hidden=true;tip.setAttribute("role","tooltip");document.body.appendChild(tip);
  const show=sp=>{tip.textContent=sp.textContent+": "+sp.title;tip.hidden=false;const r=sp.getBoundingClientRect();const tw=tip.offsetWidth;let left=r.left+window.scrollX;left=Math.max(16,Math.min(left,document.documentElement.clientWidth-tw-16));tip.style.left=left+"px";tip.style.top=(r.bottom+window.scrollY+6)+"px"};
  document.addEventListener("click",ev=>{const sp=ev.target.closest&&ev.target.closest(".term");if(sp&&!ev.target.closest("a"))show(sp);else tip.hidden=true});
  document.addEventListener("keydown",ev=>{const sp=document.activeElement;if(ev.key==="Escape")tip.hidden=true;else if(ev.key==="Enter"&&sp&&sp.classList&&sp.classList.contains("term"))show(sp)});
}

/* ---------- class colours: A–G come from the page tokens, others from the JSON ---------- */
function classColors(data){
  let st=document.getElementById("lk-colors");
  if(!st){st=document.createElement("style");st.id="lk-colors";document.head.appendChild(st)}
  const light=[],dark=[];
  for(const c of data.classes||[]){if(c.color){light.push(`--c${c.id}:${c.color.light||c.color};`);dark.push(`--c${c.id}:${c.color.dark||c.color.light||c.color};`)}}
  st.textContent=light.length?`:root{${light.join("")}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark.join("")}}}:root[data-theme="dark"]{${dark.join("")}}`:"";
}
const colorOf=k=>`var(--c${k})`;

/* ---------- the view ---------- */
function create(root,opts){
  ensureTip();
  const V={data:opts.data,lang:opts.lang||"de",active:null,selected:null,editable:!!opts.editable,
    onSelect:opts.onSelect||null,onMove:opts.onMove||null,onAdd:opts.onAdd||null,panelRenderer:opts.panelRenderer||null,els:{}};
  const D=()=>V.data, L=()=>V.lang;
  const tx=o=>(o&&o[L()])||{};
  const ui=()=>tx(D().ui);
  const lay=()=>D().layout||{};
  const cls=k=>(D().classes||[]).find(c=>c.id===k);
  const ct=k=>tx(cls(k));
  const et=e=>tx(e);
  const entries=()=>D().entries||[];
  const title=e=>{const t=et(e);return t[lay().title||"label"]||t.label||e.id};
  const tag=(own,withTag)=>withTag&&ui().own?" · "+(own?ui().own:ui().cls):"";
  const pth=(...a)=>V.editable?a.join("/"):null;
  const addBtn=(parent,path,label,before)=>{if(!V.editable)return;const b=h("button",{type:"button",class:"ed-add","data-add":path});b.textContent=label;if(before)parent.insertBefore(b,before);else parent.appendChild(b)};
  const EL=()=>opts.editLabels||{};
  const idx=e=>entries().indexOf(e);
  const cidx=k=>(D().classes||[]).findIndex(c=>c.id===k);
  const vert=e=>{const v=tx(D().map&&D().map.vertical);const th=(D().map&&D().map.verticalThreshold)||.35;const a=Array.isArray(v)?v:[];return e.y<-th?a[0]:e.y>th?a[1]:a[2]};

  function row(label,html,italic,path){const d=h("div");d.appendChild(h("dt",null,label));const dd=h("dd",{"data-path":path});if(italic){const i=h("i",null,html);dd.appendChild(i)}else setHTML(dd,html);d.appendChild(dd);return d}
  function linkList(e){
    const ul=h("ul",{class:"links"});
    for(const l of (e.links||[])){const v=l[L()]||l.de||l.en;if(!v)continue;const li=h("li");
      if(l.tag&&ui().tags&&ui().tags[l.tag])li.appendChild(h("span",{class:"pill"},ui().tags[l.tag]));
      const a=h("a",{href:v[1]});a.textContent=v[0];li.appendChild(a);
      if(/^https?:/i.test(v[1])){a.target="_blank";a.rel="noopener"}else a.removeAttribute("href");
      ul.appendChild(li)}
    return ul;
  }
  function movementRows(dl,e,k,withTag){
    const c=ct(k),o=(e&&et(e).own)||{},dt=ui().dt||{};
    for(const key of (lay().movement||["bew"])){const v=o[key]||c[key];if(v==null||v==="")continue;dl.appendChild(row((dt[key]||key)+tag(o[key],withTag&&!!e),v,false,e&&o[key]?pth("entries",idx(e),L(),"own",key):null))}
    if(e){const v=vert(e);if(v)dl.appendChild(row(dt.vert||"",v,false,pth("map","vertical",L(),e.y<-((D().map&&D().map.verticalThreshold)||.35)?0:e.y>((D().map&&D().map.verticalThreshold)||.35)?1:2)))}
  }
  function body(e,withQ){
    const t=et(e),c=ct(e.k),dt=ui().dt||{},Ly=lay(),frag=document.createDocumentFragment();
    const i=idx(e);
    if(Ly.quote&&(t.say||V.editable))frag.appendChild(h("p",{class:"say","data-path":pth("entries",i,L(),"say")},t.say||""));
    const dl=h("dl",{class:"dl"});
    for(const key of (Ly.fields||[])){if((t[key]==null||t[key]==="")&&!V.editable)continue;dl.appendChild(row(dt[key]||key,t[key]||"",false,pth("entries",i,L(),key)))}
    if(withQ&&Ly.question!=="hint"&&c.q)dl.appendChild(row(dt.q||"",c.q,true,pth("classes",cidx(e.k),L(),"q")));
    frag.appendChild(dl);
    if(withQ&&Ly.question==="hint"&&c.q){const p=h("p",{class:"hint"});p.append((dt.q||"")+": ");p.appendChild(h("i",null,c.q));frag.appendChild(p)}
    let mdl=dl;
    if(Ly.movementSeparate){mdl=h("dl",{class:"dl",style:"border-top:1px solid var(--line);padding-top:10px"});frag.appendChild(mdl)}
    movementRows(mdl,e,e.k,true);
    if(e.links&&e.links.length){const d=h("div");d.appendChild(h("dt",null,dt.links||"Links"));const dd=h("dd");dd.appendChild(linkList(e));d.appendChild(dd);mdl.appendChild(d)}
    return frag;
  }

  /* --- skeleton from sections --- */
  function build(){
    const d=D(),P=tx(d.page);
    document.documentElement.lang=L();
    if(opts.setTitle!==false)document.title=stripTags(P.title||"");
    classColors(d);
    const wrap=h("div",{class:"wrap"});V.els={wrap};
    const head=h("header",{class:"lede"});
    head.appendChild(h("div",{class:"eyebrow","data-path":pth("page",L(),"eyebrow")},P.eyebrow||""));
    head.appendChild(h("h1",{"data-path":pth("page",L(),"h1")},P.h1||P.title||""));
    (P.intro||[]).forEach((p,j)=>head.appendChild(h("p",{"data-path":pth("page",L(),"intro",j)},p)));
    addBtn(head,pth("page",L(),"intro"),EL().addPara);
    wrap.appendChild(head);
    (d.sections||[]).forEach((s,i)=>{const t=tx(s);let sec;
      switch(s.type){
        case "prose":
          sec=h("section",{class:s.style==="centre"?"centre":s.style==="tension"?"tension":"lede"});
          if(t.h||V.editable)sec.appendChild(h("h2",{"data-path":pth("sections",i,L(),"h")},t.h||""));(t.p||[]).forEach((p,j)=>sec.appendChild(h("p",{"data-path":pth("sections",i,L(),"p",j)},p)));addBtn(sec,pth("sections",i,L(),"p"),EL().addPara);break;
        case "sources":{
          sec=h("section",{class:"lede"});if(t.h)sec.appendChild(h("h2",{"data-path":pth("sections",i,L(),"h")},t.h));
          const g=h("div",{class:"sources"});(t.items||[]).forEach((it,j)=>{const s2=h("div",{class:"src"});s2.appendChild(h("b",{"data-path":pth("sections",i,L(),"items",j,"b")},it.b));s2.appendChild(h("span",{"data-path":pth("sections",i,L(),"items",j,"t")},it.t));g.appendChild(s2)});
          sec.appendChild(g);addBtn(sec,pth("sections",i,L(),"items"),EL().addSource);if(t.hint||V.editable)sec.appendChild(h("p",{class:"hint","data-path":pth("sections",i,L(),"hint")},t.hint||""));break}
        case "map":{
          sec=h("section",{id:"lk-map-section"});if(t.h)sec.appendChild(h("h2",{style:"margin-bottom:14px","data-path":pth("sections",i,L(),"h")},t.h));
          V.els.filters=sec.appendChild(h("div",{class:"filters",role:"group"}));
          const atlas=sec.appendChild(h("div",{class:"atlas"}));
          const box=atlas.appendChild(h("div",{class:"mapbox"}));
          V.els.svg=box.appendChild(document.createElementNS(NS,"svg"));V.els.svg.setAttribute("viewBox","0 0 1000 1000");V.els.svg.setAttribute("role","img");V.els.svg.id="map";
          if(V.editable&&V.onAdd){const sv=V.els.svg;sv.classList.add("addable");
            sv.addEventListener("dblclick",ev=>{if(ev.target.closest(".node"))return;ev.preventDefault();
              const pt=sv.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const p=pt.matrixTransform(sv.getScreenCTM().inverse());
              const cl=v=>Math.max(-.98,Math.min(.98,Math.round(v*100)/100));V.onAdd(cl((p.x-500)/400),cl((p.y-500)/400),V.active)})}
          V.els.panel=atlas.appendChild(h("aside",{class:"panel","aria-live":"polite"}));
          if(t.hint)sec.appendChild(h("p",{class:"hint",style:"margin-top:10px","data-path":pth("sections",i,L(),"hint")},t.hint));
          V.els.mapSection=sec;break}
        case "classes":
          sec=h("section",{style:"display:grid;gap:18px"});if(t.h)sec.appendChild(h("h2",{"data-path":pth("sections",i,L(),"h")},t.h));
          (t.p||[]).forEach((p,j)=>sec.appendChild(h("p",{style:"max-width:68ch","data-path":pth("sections",i,L(),"p",j)},p)));
          addBtn(sec,pth("sections",i,L(),"p"),EL().addPara);
          V.els.classes=sec.appendChild(h("div",{class:"classes"}));break;
        case "catalog":
          sec=h("section",{style:"display:grid;gap:18px"});if(t.h)sec.appendChild(h("h2",{"data-path":pth("sections",i,L(),"h")},t.h));
          V.els.catalog=sec.appendChild(h("div",{class:"catalog"}));break;
        case "footer":
          sec=h("footer",{class:"foot"});(t.p||[]).forEach((p,j)=>sec.appendChild(h("p",{"data-path":pth("sections",i,L(),"p",j)},p)));addBtn(sec,pth("sections",i,L(),"p"),EL().addPara);break;
        default:return;
      }
      sec.dataset.section=i;wrap.appendChild(sec);
    });
    root.replaceChildren(wrap);
    if(V.els.catalog)V.els.catalog.addEventListener("click",ev=>{const b=ev.target.closest("button[data-id]");if(!b)return;V.active=null;select(b.dataset.id);if(V.els.mapSection)V.els.mapSection.scrollIntoView({behavior:"smooth"})});
  }

  /* --- map --- */
  function el(t,a,txt){const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);if(txt!=null)n.textContent=txt;return n}
  const P=(x,y)=>[500+x*400,500+y*400];
  function drawMap(){
    const svg=V.els.svg;if(!svg)return;
    const M=D().map||{},A=tx(M.axes),Ce=M.centre||{},ct2=tx(Ce);
    svg.replaceChildren();svg.setAttribute("aria-label",stripTags(ui().mapLabel||""));
    svg.appendChild(el("rect",{x:0,y:0,width:1000,height:1000,fill:"var(--surface)"}));
    [200,400].forEach(r=>svg.appendChild(el("circle",{cx:500,cy:500,r,class:"ring","stroke-dasharray":"2 6"})));
    const al=M.axisLine||[64,936];
    svg.appendChild(el("line",{x1:40,y1:500,x2:960,y2:500,class:"axis"}));
    svg.appendChild(el("line",{x1:500,y1:al[0],x2:500,y2:al[1],class:"axis"}));
    const T=(x,y,c,anchor,s)=>{if(s)svg.appendChild(el("text",{x,y,class:c,"text-anchor":anchor},stripTags(s)))};
    T(22,530,"axislbl","start",A.l);T(22,548,"axissub","start",A.ls);
    T(978,530,"axislbl","end",A.r);T(978,548,"axissub","end",A.rs);
    const subs=!!(A.ts||A.bs);
    T(500,subs?28:30,"axislbl","middle",A.t);T(500,46,"axissub","middle",A.ts);
    T(500,subs?972:990,"axislbl","middle",A.b);T(500,990,"axissub","middle",A.bs);
    if(M.ring){const r=M.ring.r||150;svg.appendChild(el("circle",{cx:500,cy:500,r,class:"ring","stroke-dasharray":"5 5"}));
      for(const lb of (M.ring.labels||[])){const ra=lb.angle*Math.PI/180;svg.appendChild(el("text",{x:500+r*Math.cos(ra),y:504+r*Math.sin(ra),class:"trad","text-anchor":"middle"},stripTags(lb.text)))}}
    const cr=Ce.r||80;
    if(Ce.underlay)svg.appendChild(el("circle",{cx:500,cy:500,r:cr,fill:"var(--surface)"}));
    svg.appendChild(el("circle",{cx:500,cy:500,r:cr,fill:"var(--accent)","fill-opacity":".12",stroke:"var(--accent)","stroke-width":"1.5"}));
    const cs=`font-family:var(--display);font-size:${Ce.size||18}px;font-weight:700;fill:var(--accent)`;
    (ct2.lines||[]).forEach((line,i)=>svg.appendChild(el("text",{x:500,y:(Ce.y||494)+i*(Ce.gap||23),"text-anchor":"middle",style:cs},stripTags(line))));
    if(ct2.sub)svg.appendChild(el("text",{x:500,y:Ce.subY||540,"text-anchor":"middle",style:`font-size:${Ce.subSize||12}px;fill:var(--accent)`+(Ce.halo?";paint-order:stroke;stroke:var(--surface);stroke-width:4px":"")},stripTags(ct2.sub)));
    for(const e of entries()){
      const [cx,cy]=P(e.x,e.y);const left=cx>760;
      const g=el("g",{class:"node",tabindex:0,role:"button","data-id":e.id,"aria-label":stripTags(title(e))});
      g.appendChild(el("circle",{cx,cy,r:8,fill:colorOf(e.k),stroke:"var(--surface)","stroke-width":2}));
      g.appendChild(el("text",{x:left?cx-14:cx+14,y:cy+5,"text-anchor":left?"end":"start"},stripTags(et(e).label||e.id)));
      g.addEventListener("click",ev=>{if(V.dragged){V.dragged=false;return}select(e.id)});
      g.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();select(e.id)}});
      if(V.editable)makeDraggable(g,e);
      svg.appendChild(g);
    }
    const G=compileGlossary(D(),L());
    if(G)svg.querySelectorAll("text").forEach(t=>{G.rx.lastIndex=0;const m=G.rx.exec(t.textContent);if(m){const ti=document.createElementNS(NS,"title");ti.textContent=m[0]+": "+G.map.get(m[0].toLowerCase());t.appendChild(ti)}});
    refresh();
  }
  function makeDraggable(g,e){
    g.classList.add("draggable");
    g.addEventListener("pointerdown",ev=>{
      if(ev.button!==0)return;
      const svg=V.els.svg,pt=svg.createSVGPoint(),ctm=svg.getScreenCTM().inverse();
      const start={x:ev.clientX,y:ev.clientY};let moved=false;
      g.setPointerCapture(ev.pointerId);
      const move=m=>{
        if(!moved&&Math.hypot(m.clientX-start.x,m.clientY-start.y)<4)return;
        if(!moved&&V.onMove)V.onMove(e,"start");
        moved=true;pt.x=m.clientX;pt.y=m.clientY;const p=pt.matrixTransform(ctm);
        const cl=v=>Math.max(-.98,Math.min(.98,Math.round(v*100)/100));
        e.x=cl((p.x-500)/400);e.y=cl((p.y-500)/400);
        const [cx,cy]=P(e.x,e.y),left=cx>760,c=g.querySelector("circle"),t=g.querySelector("text");
        c.setAttribute("cx",cx);c.setAttribute("cy",cy);t.setAttribute("x",left?cx-14:cx+14);t.setAttribute("y",cy+5);t.setAttribute("text-anchor",left?"end":"start");
        if(V.onMove)V.onMove(e,false);
      };
      const up=()=>{g.removeEventListener("pointermove",move);g.removeEventListener("pointerup",up);g.removeEventListener("pointercancel",up);
        if(moved){V.dragged=true;setTimeout(()=>{V.dragged=false},0);select(e.id);if(V.onMove)V.onMove(e,true)}};
      g.addEventListener("pointermove",move);g.addEventListener("pointerup",up);g.addEventListener("pointercancel",up);
    });
  }
  function refresh(){
    if(V.els.svg)V.els.svg.querySelectorAll(".node").forEach(g=>{const e=entries().find(x=>x.id===g.dataset.id);if(!e)return;g.classList.toggle("dim",!!V.active&&e.k!==V.active);g.classList.toggle("sel",e.id===V.selected)});
    root.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c.dataset.k===(V.active||"")?"true":"false"));
  }

  /* --- lists --- */
  function renderLists(){
    const U=ui(),Ly=lay(),dt=U.dt||{};
    if(V.els.filters){const f=V.els.filters;f.replaceChildren();f.setAttribute("aria-label",stripTags(U.filterLabel||""));
      const all=h("button",{class:"chip",type:"button","data-k":""});all.textContent=U.all||"Alle";all.onclick=()=>{V.active=null;refresh()};f.appendChild(all);
      for(const c of D().classes||[]){const b=h("button",{class:"chip",type:"button","data-k":c.id});const i=h("i");i.style.background=colorOf(c.id);b.appendChild(i);b.append((Ly.chipLetters!==false?c.id+" · ":"")+stripTags(ct(c.id).name||""));b.onclick=()=>{V.active=V.active===c.id?null:c.id;refresh()};f.appendChild(b)}}
    if(V.els.classes){const cl=V.els.classes;cl.replaceChildren();
      for(const c of D().classes||[]){const t=ct(c.id),mine=entries().filter(e=>e.k===c.id);
        const d=h("div",{class:"klass","data-class":c.id});d.style.setProperty("--c",colorOf(c.id));
        const j=cidx(c.id),cp=k2=>pth("classes",j,L(),k2);
        const tg=h("div",{class:"tag"});tg.append(c.id+" · ");tg.appendChild(h("span",{"data-path":cp("sub")},t.sub||""));d.appendChild(tg);d.appendChild(h("h3",{"data-path":cp("name")},t.name||""));
        if(Ly.classQuestion==="p"){if(t.q||V.editable)d.appendChild(h("p",{class:"q","data-path":cp("q")},t.q||""));if(t.mech||V.editable)d.appendChild(h("p",{"data-path":cp("mech")},t.mech||""));
          const dl=h("dl",{class:"dl",style:"border-top:1px solid var(--line);padding-top:10px"});for(const key of ["erk","bew"]){if(t[key]||V.editable)dl.appendChild(row(dt[key]||key,t[key]||"",false,cp(key)))}d.appendChild(dl)}
        else{if(t.mech||V.editable)d.appendChild(h("p",{"data-path":cp("mech")},t.mech||""));const dl=h("dl",{class:"dl"});if(t.q||V.editable)dl.appendChild(row(dt.q||"",t.q||"",true,cp("q")));for(const key of ["erk","bew"]){if(t[key]||V.editable)dl.appendChild(row(dt[key]||key,t[key]||"",false,cp(key)))}d.appendChild(dl)}
        const meta=h("p",{class:"meta"});
        if(Ly.classMeta==="labels")setHTML(meta,`${mine.length} ${U.entries||""}: `+mine.map(e=>et(e).label||e.id).join(", "));
        else setHTML(meta,(t.kanon?`${U.canon||""}: ${t.kanon} · `:"")+`${mine.length} ${U.entries||""}`);
        d.appendChild(meta);cl.appendChild(d)}}
    if(V.els.catalog){const cat=V.els.catalog;cat.replaceChildren();
      for(const c of D().classes||[]){const t=ct(c.id);const g=h("div",{class:"group"});
        const h3=h("h3");const i=h("i");i.style.background=colorOf(c.id);h3.appendChild(i);h3.append((Ly.catalogLetters!==false?c.id+" · ":"")+stripTags(t.name||""));g.appendChild(h3);
        if(Ly.catalogQuestion&&t.q)g.appendChild(h("p",{class:"gq","data-path":pth("classes",cidx(c.id),L(),"q")},t.q));
        const items=h("div",{class:"items"});
        for(const e of entries().filter(e=>e.k===c.id)){const a=h("article",{class:"item","data-id":e.id});a.appendChild(h("h4",{"data-path":pth("entries",idx(e),L(),lay().title==="name"?"name":"label")},title(e)));a.appendChild(body(e,false));const b=h("button",{type:"button","data-id":e.id});b.textContent=U.show||"";a.appendChild(b);items.appendChild(a)}
        g.appendChild(items);cat.appendChild(g)}}
  }

  /* --- panel --- */
  function panelView(e){
    const frag=document.createDocumentFragment();if(!e)return frag;
    const t=ct(e.k);
    const cl=h("div",{class:"cls"});cl.style.color=colorOf(e.k);cl.textContent=`${ui().cls||""} ${e.k} · ${stripTags(t.name||"")}`;frag.appendChild(cl);
    frag.appendChild(h("h3",null,title(e)));frag.appendChild(body(e,true));
    return frag;
  }
  function select(id){
    if(!entries().some(e=>e.id===id))id=entries()[0]&&entries()[0].id;
    V.selected=id;const e=entries().find(x=>x.id===id);
    if(V.els.panel){
      if(V.panelRenderer)V.els.panel.replaceChildren(V.panelRenderer(e));
      else{V.els.panel.replaceChildren(panelView(e));enrich(V.els.panel)}
    }
    refresh();if(V.onSelect)V.onSelect(e);
  }
  function enrich(node){const C=compileRules(D(),L());linkify(node,C);annotate(node,compileGlossary(D(),L()))}

  function render(){
    if(tip)tip.hidden=true;
    build();renderLists();drawMap();
    enrich(V.els.wrap);
    select(V.selected||D().start);
  }
  /* Re-render everything except the panel (used by the editor while typing). */
  function update(){
    if(tip)tip.hidden=true;
    const keepPanel=V.els.panel,y=window.scrollY;
    build();
    if(keepPanel&&V.els.panel){V.els.panel.replaceWith(keepPanel);V.els.panel=keepPanel}
    renderLists();drawMap();
    for(const n of V.els.wrap.children){if(!n.contains(V.els.panel))enrich(n);else{for(const c of n.querySelectorAll(".hint,h2"))enrich(c)}}
    refresh();window.scrollTo(0,y);
  }
  Object.assign(V,{render,update,select,refresh,drawMap,renderLists,panelView,enrich,
    setLang(l){V.lang=l;render()},setData(d){V.data=d;V.selected=null;V.active=null;render()}});
  return V;
}

window.LK={create,setHTML,fill,stripTags,FORMAT:"landkarte/1"};
})();
