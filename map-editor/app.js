/* Shell for the map pages: choose a map, switch language, view or edit, save as JSON. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const SH={
 de:{map:"Karte",view:"Ansehen",edit:"Bearbeiten",open:"JSON öffnen",undo:"Rückgängig",newE:"Neuer Eintrag",save:"Als JSON speichern",
  own:"Eigene Datei",loading:"Lade Karte …",loadErr:"Die Karte konnte nicht geladen werden",badFile:"Diese Datei ist keine Landkarte im Format landkarte/1.",
  dirty:"Ungespeicherte Änderungen",clean:"Alles gespeichert",saved:"Gespeichert als",declined:"Speichern abgebrochen",
  draft:"Für diese Karte gibt es einen ungespeicherten Entwurf vom",draftLoad:"Entwurf laden",draftDrop:"Verwerfen",
  hintEdit:"Texte direkt in der Seite anklicken und ändern. Punkte auf der Karte lassen sich verschieben, ein Doppelklick auf eine freie Stelle setzt dort einen neuen Punkt (in der Farbe der gerade gewählten Klasse). Einträge bearbeitest du im Feld neben der Karte (auf schmalen Bildschirmen darunter).",
  addPara:"+ Absatz",addSource:"+ Quelle",
  f:{id:"Kennung",k:"Klasse",x:"x (links −1 … rechts 1)",y:"y (oben −1 … unten 1)",label:"Name auf der Karte",name:"Überschrift",say:"Zitat",own:"Eigene Bewegung (leer = Text der Klasse)",links:"Links",linkText:"Text",linkUrl:"Adresse",addLink:"+ Link",del:"Eintrag löschen",delSure:"Wirklich löschen?",dup:"Duplizieren",idTaken:"Diese Kennung gibt es schon.",idBad:"Nur Kleinbuchstaben, Ziffern und Bindestriche."},
  set:{title:"Weitere Einstellungen",axes:"Achsen und Mitte",classes:"Klassen",gloss:"Glossar",links:"Verlinkung",layout:"Darstellung und Beschriftungen",file:"Ganze Datei als JSON",
   apply:"Übernehmen",applied:"Übernommen",l:"Links",ls:"Links, Unterzeile",r:"Rechts",rs:"Rechts, Unterzeile",t:"Oben",ts:"Oben, Unterzeile",b:"Unten",bs:"Unten, Unterzeile",
   lines:"Mitte, eine Zeile pro Zeile",sub:"Mitte, Unterzeile",vert:["Senkrecht: oberer Bereich","Senkrecht: unterer Bereich","Senkrecht: Mitte"],
   cid:"Buchstabe",cname:"Name",ckanon:"Stellen",ccolor:"Farbe (nur für neue Klassen)",addClass:"+ Klasse",delClass:"Entfernen",inUse:"wird noch benutzt",
   term:"Begriff",expl:"Erklärung",addTerm:"+ Begriff",
   linkHelp:"Jede Regel hat lang (de, en oder *), pattern (regulärer Ausdruck) und url. In der url stehen {1}, {2} … für die Gruppen des Ausdrucks, mit Filtern wie {1|pad3}, {1|enc}, {1|map:TABELLE}, {2|or:1}. Teile in [eckigen Klammern] fallen weg, wenn eine Gruppe darin leer ist.",
   jsonErr:"Fehler im JSON:"},
  exportT:"Die Datei konnte hier nicht gespeichert werden. Kopiere den Inhalt und speichere ihn selbst als",copy:"Kopieren",copied:"Kopiert",close:"Schließen"},
 en:{map:"Map",view:"View",edit:"Edit",open:"Open JSON",undo:"Undo",newE:"New entry",save:"Save as JSON",
  own:"Own file",loading:"Loading map …",loadErr:"The map could not be loaded",badFile:"This file is not a map in the landkarte/1 format.",
  dirty:"Unsaved changes",clean:"All saved",saved:"Saved as",declined:"Save cancelled",
  draft:"There is an unsaved draft of this map from",draftLoad:"Load draft",draftDrop:"Discard",
  hintEdit:"Click any text on the page to change it. Drag points on the map to move them; double-click an empty spot to add a new point there (in the colour of the selected class). Edit entries in the panel beside the map (below it on narrow screens).",
  addPara:"+ Paragraph",addSource:"+ Source",
  f:{id:"Identifier",k:"Class",x:"x (left −1 … right 1)",y:"y (top −1 … bottom 1)",label:"Name on the map",name:"Heading",say:"Quote",own:"Own movement (empty = class text)",links:"Links",linkText:"Text",linkUrl:"Address",addLink:"+ Link",del:"Delete entry",delSure:"Really delete?",dup:"Duplicate",idTaken:"This identifier is already used.",idBad:"Only lowercase letters, digits and hyphens."},
  set:{title:"More settings",axes:"Axes and centre",classes:"Classes",gloss:"Glossary",links:"Linking",layout:"Layout and labels",file:"Whole file as JSON",
   apply:"Apply",applied:"Applied",l:"Left",ls:"Left, second line",r:"Right",rs:"Right, second line",t:"Top",ts:"Top, second line",b:"Bottom",bs:"Bottom, second line",
   lines:"Centre, one line per line",sub:"Centre, second line",vert:["Vertical: upper area","Vertical: lower area","Vertical: middle"],
   cid:"Letter",cname:"Name",ckanon:"Passages",ccolor:"Colour (new classes only)",addClass:"+ Class",delClass:"Remove",inUse:"still in use",
   term:"Term",expl:"Explanation",addTerm:"+ Term",
   linkHelp:"Each rule has lang (de, en or *), pattern (a regular expression) and url. In the url, {1}, {2} … stand for the groups of the expression, with filters such as {1|pad3}, {1|enc}, {1|map:TABLE}, {2|or:1}. Parts in [square brackets] are dropped when a group inside is empty.",
   jsonErr:"Error in JSON:"},
  exportT:"The file could not be saved here. Copy the content and save it yourself as",copy:"Copy",copied:"Copied",close:"Close"}
};
const S=()=>SH[state.lang];
const state={lang:"de",mode:"view",index:[],id:null,data:null,view:null,undo:[],dirty:false,ownName:null};
const store={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(_){}},del(k){try{localStorage.removeItem(k)}catch(_){}}};
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- paths into the data ---------- */
const parts=p=>p.split("/").map(x=>/^\d+$/.test(x)?+x:x);
function getPath(o,p){for(const k of parts(p)){if(o==null)return undefined;o=o[k]}return o}
function setPath(o,p,v){const a=parts(p);for(let i=0;i<a.length-1;i++){if(o[a[i]]==null)o[a[i]]=typeof a[i+1]==="number"?[]:{};o=o[a[i]]}
  const last=a[a.length-1];
  if(Array.isArray(o)&&v===""&&/\/(intro|p|items)\/\d+$/.test(p)){o.splice(last,1);return}
  if(v===""&&/\/own\//.test(p)){delete o[last];return}
  o[last]=v}
function cleanOwn(d){for(const e of d.entries||[])for(const l of d.langs||["de","en"]){const t=e[l];if(t&&t.own&&!Object.keys(t.own).length)delete t.own}}

/* ---------- loading ---------- */
const HTTP=/^https?:$/.test(location.protocol);
async function loadIndex(){
  try{if(window.__indexP){const p=window.__indexP;window.__indexP=null;state.index=await p}else{if(!HTTP)throw 0;const r=await fetch("maps/index.json");if(!r.ok)throw 0;state.index=await r.json()}}catch(_){state.index=(window.__MAPS&&window.__MAPS.index)||[]}
  const sel=$("mapsel");sel.replaceChildren();
  for(const m of state.index){const o=document.createElement("option");o.value=m.id;o.textContent=(m.title&&(m.title[state.lang]||m.title.de))||m.id;sel.appendChild(o)}
  if(state.ownName){const o=document.createElement("option");o.value="__own";o.textContent=S().own+": "+state.ownName;sel.appendChild(o)}
}
function validate(d){return d&&typeof d==="object"&&d.format==="landkarte/1"&&Array.isArray(d.entries)&&Array.isArray(d.classes)}
async function loadMap(id){
  const m=state.index.find(x=>x.id===id)||state.index[0];if(!m)return;
  setStatus(S().loading);
  try{let d;try{if(!HTTP)throw 0;const r=await fetch(m.file);if(!r.ok)throw new Error(r.status);d=await r.json()}catch(e){const em=window.__MAPS&&window.__MAPS.files[m.file];if(!em)throw e;d=JSON.parse(JSON.stringify(em))}if(!validate(d))throw new Error("format");
    state.id=m.id;state.ownName=null;useData(d);if(location.hash.slice(1)!==m.id)history.replaceState(null,"","#"+m.id);
  }catch(e){setStatus(S().loadErr+" ("+m.file+").")}
  $("mapsel").value=state.id||"";
}
function useData(d){state.data=d;state.undo=[];setDirty(false);mount();checkDraft()}

/* ---------- mount viewer or editor ---------- */
function mount(){
  const app=$("app");
  document.body.classList.toggle("editing",state.mode==="edit");
  const sel=state.view&&state.view.selected;
  state.view=LK.create(app,{data:state.data,lang:state.lang,editable:state.mode==="edit",
    editLabels:{addPara:S().addPara,addSource:S().addSource},
    panelRenderer:state.mode==="edit"?entryForm:null,
    onMove:(e,done)=>{if(done==="start"){commit();return}if(done===true){setDirty(true);safeUpdate()}const f=$("ef-x");if(f&&state.view.selected===e.id){f.value=e.x;$("ef-y").value=e.y}},
    onAdd:(x,y,k)=>newEntry(x,y,k),
    onSelect:null});
  if(sel)state.view.selected=sel;
  state.view.render();
  renderSettings();
  $("edit-hint").textContent=S().hintEdit;
}
function rerender(){safeUpdate();renderSettingsLight()}

/* ---------- undo, dirty, drafts ---------- */
let snapT=null,snapOpen=false;
function beginChange(){if(!snapOpen){state.undo.push(JSON.stringify(state.data));if(state.undo.length>80)state.undo.shift();snapOpen=true}clearTimeout(snapT);snapT=setTimeout(()=>{snapOpen=false},900)}
function commit(){beginChange();setDirty(true);store.set("lk-draft-"+state.data.id,JSON.stringify({at:new Date().toISOString(),data:state.data}))}
function setDirty(v){state.dirty=v;setStatus(state.mode==="edit"?(v?S().dirty:S().clean):"");$("b-undo").disabled=!state.undo.length}
function setStatus(t){$("status").textContent=t||""}
function undo(){const s=state.undo.pop();if(!s)return;snapOpen=false;state.data=JSON.parse(s);state.view.data=state.data;state.view.render();renderSettings();setDirty(true)}
function checkDraft(){
  const b=$("banner");b.hidden=true;if(state.mode!=="edit"||!state.data)return;
  const raw=store.get("lk-draft-"+state.data.id);if(!raw)return;
  let dr;try{dr=JSON.parse(raw)}catch(_){return}
  if(!dr||!dr.data||JSON.stringify(dr.data)===JSON.stringify(state.data))return;
  b.replaceChildren();const p=document.createElement("span");p.textContent=S().draft+" "+new Date(dr.at).toLocaleString(state.lang==="de"?"de-DE":"en-GB")+".";b.appendChild(p);
  const l=mkBtn(S().draftLoad,()=>{state.undo.push(JSON.stringify(state.data));state.data=dr.data;b.hidden=true;mount();setDirty(true)},"primary");
  const x=mkBtn(S().draftDrop,()=>{store.del("lk-draft-"+state.data.id);b.hidden=true});
  b.append(l,x);b.hidden=false;
}
function mkBtn(t,fn,cls){const b=document.createElement("button");b.type="button";b.textContent=t;if(cls)b.className=cls;b.addEventListener("click",fn);return b}

/* ---------- inline editing of page texts ---------- */
function prepEditable(root){
  root.querySelectorAll("[data-path]").forEach(n=>{if(!n.isContentEditable){n.setAttribute("contenteditable","plaintext-only");n.setAttribute("spellcheck","true")}});
}
document.addEventListener("focusin",ev=>{
  const n=ev.target.closest&&ev.target.closest("#app [data-path]");if(!n||state.mode!=="edit")return;
  if(n.dataset.editing)return;n.dataset.editing="1";
  const v=getPath(state.data,n.dataset.path);n.textContent=v==null?"":String(v);n.classList.add("ed-active");
  const r=document.createRange();r.selectNodeContents(n);r.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);
});
document.addEventListener("focusout",ev=>{
  const n=ev.target.closest&&ev.target.closest("#app [data-path]");if(!n||!n.dataset.editing||state.mode!=="edit")return;
  delete n.dataset.editing;n.classList.remove("ed-active");
  const nv=n.textContent.replace(/\u00a0/g," ").replace(/\n+$/,"");const ov=getPath(state.data,n.dataset.path);
  const isItem=/\/(intro|p)\/\d+$/.test(n.dataset.path);
  if(nv!==(ov==null?"":String(ov))||(nv===""&&isItem)){commit();setPath(state.data,n.dataset.path,nv);cleanOwn(state.data)}
  const rel=ev.relatedTarget&&ev.relatedTarget.closest&&ev.relatedTarget.closest("#app [data-path]");
  if(rel){const p=rel.dataset.path;safeUpdate();focusPath(p)}
  else setTimeout(safeUpdate,220);
});
function safeUpdate(){if(!state.view||document.querySelector("#app [data-editing]"))return;state.view.update();prepEditable($("app"))}
function focusPath(p){const n=document.querySelector(`#app [data-path="${CSS.escape(p)}"]`);if(!n)return;n.focus();if(n.isContentEditable){const r=document.createRange();r.selectNodeContents(n);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}}
document.addEventListener("keydown",ev=>{
  const n=ev.target.closest&&ev.target.closest("#app [data-path]");
  if(n&&ev.key==="Escape"){const v=getPath(state.data,n.dataset.path);n.textContent=v==null?"":String(v);n.blur()}
  if(n&&ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();n.blur()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key==="z"&&state.mode==="edit"&&!(ev.target.matches&&ev.target.matches("input,textarea,[contenteditable]"))){ev.preventDefault();undo()}
});
document.addEventListener("click",ev=>{
  if(state.mode!=="edit")return;
  const a=ev.target.closest&&ev.target.closest("#app [data-path] a");if(a){ev.preventDefault()}
  const add=ev.target.closest&&ev.target.closest("#app .ed-add[data-add]");
  if(add){const act=document.activeElement;if(act&&act.dataset&&act.dataset.editing)act.blur();
    const p=add.dataset.add;let arr=getPath(state.data,p);commit();const blank=/items$/.test(p)?{b:"",t:""}:"";if(!Array.isArray(arr)){setPath(state.data,p+"/0",blank);arr=getPath(state.data,p)}else arr.push(blank);
    const i=arr.length-1;state.view.update();prepEditable($("app"));focusPath(p+"/"+i+(/items$/.test(p)?"/b":""))}
},true);
document.addEventListener("mousedown",ev=>{if(ev.target.closest&&ev.target.closest("#app .ed-add[data-add]"))ev.preventDefault()},true);
const mo=new MutationObserver(()=>{if(state.mode==="edit")prepEditable($("app"))});

/* ---------- entry form in the panel ---------- */
function field(label,id,el){const w=document.createElement("label");w.className="ed-field";w.htmlFor=id;const s=document.createElement("span");s.textContent=label;w.appendChild(s);el.id=id;w.appendChild(el);return w}
function input(v,type){const i=document.createElement("input");i.type=type||"text";i.value=v==null?"":v;return i}
function area(v,rows){const t=document.createElement("textarea");t.rows=rows||3;t.value=v==null?"":v;return t}
let updT=null;function soon(){clearTimeout(updT);updT=setTimeout(safeUpdate,350)}
function entryForm(e){
  const d=state.data,L=state.lang,F=S().f,U=(d.ui&&d.ui[L])||{},dt=U.dt||{},lay=d.layout||{};
  const wrap=document.createElement("div");wrap.className="ed-form";
  if(!e){wrap.appendChild(mkBtn(S().newE,()=>newEntry(),"primary"));return wrap}
  const t=e[L]||(e[L]={});
  const c=(d.classes||[]).find(c=>c.id===e.k);
  const head=document.createElement("div");head.className="cls";head.style.color=`var(--c${e.k})`;head.textContent=`${U.cls||""} ${e.k} · ${LK.stripTags(c&&c[L]&&c[L].name||"")}`;wrap.appendChild(head);
  const grid=document.createElement("div");grid.className="ed-grid";
  const idI=input(e.id);const idMsg=document.createElement("small");idMsg.className="ed-err";
  idI.addEventListener("change",()=>{const v=idI.value.trim();if(!/^[a-z0-9][a-z0-9-]*$/.test(v)){idMsg.textContent=F.idBad;idI.value=e.id;return}
    if(v!==e.id&&d.entries.some(x=>x.id===v)){idMsg.textContent=F.idTaken;idI.value=e.id;return}idMsg.textContent="";commit();if(d.start===e.id)d.start=v;e.id=v;state.view.selected=v;rerender()});
  grid.appendChild(field(F.id,"ef-id",idI));
  const kS=document.createElement("select");for(const cc of d.classes){const o=document.createElement("option");o.value=cc.id;o.textContent=cc.id+" · "+LK.stripTags(cc[L]&&cc[L].name||"");kS.appendChild(o)}kS.value=e.k;
  kS.addEventListener("change",()=>{commit();e.k=kS.value;state.view.select(e.id);rerender()});
  grid.appendChild(field(F.k,"ef-k",kS));
  for(const ax of ["x","y"]){const n=input(e[ax],"number");n.step="0.01";n.min="-0.98";n.max="0.98";
    n.addEventListener("input",()=>{const v=parseFloat(n.value);if(isNaN(v))return;commit();e[ax]=Math.max(-.98,Math.min(.98,v));soon()});grid.appendChild(field(F[ax],"ef-"+ax,n))}
  wrap.appendChild(grid);wrap.appendChild(idMsg);
  const txt=(key,label,rows)=>{const a=rows?area(t[key],rows):input(t[key]);a.addEventListener("input",()=>{commit();t[key]=a.value;soon()});wrap.appendChild(field(label,"ef-"+key,a))};
  txt("label",F.label);
  if(lay.title==="name")txt("name",F.name);
  if(lay.quote)txt("say",F.say,2);
  for(const key of lay.fields||[])txt(key,dt[key]||key,3);
  for(const key of lay.movement||["bew"]){const own=(t.own&&t.own[key])||"";const a=area(own,2);a.placeholder=LK.stripTags(c&&c[L]&&c[L][key]||"");
    a.addEventListener("input",()=>{commit();t.own=t.own||{};if(a.value)t.own[key]=a.value;else delete t.own[key];if(!Object.keys(t.own).length)delete t.own;soon()});
    wrap.appendChild(field(F.own+" · "+(dt[key]||key),"ef-own-"+key,a))}
  /* links */
  const lw=document.createElement("fieldset");lw.className="ed-links";const lg=document.createElement("legend");lg.textContent=F.links;lw.appendChild(lg);
  const tags=U.tags||null;
  (e.links||[]).forEach((l,i)=>{const r=document.createElement("div");r.className="ed-linkrow";
    const v=l[L]||(l[L]=["",""]);
    if(tags){const s=document.createElement("select");s.setAttribute("aria-label","Art");for(const k in tags){const o=document.createElement("option");o.value=k;o.textContent=tags[k];s.appendChild(o)}s.value=l.tag||"";s.addEventListener("change",()=>{commit();l.tag=s.value;soon()});r.appendChild(s)}
    const a=input(v[0]);a.placeholder=F.linkText;a.setAttribute("aria-label",F.linkText);a.addEventListener("input",()=>{commit();v[0]=a.value;soon()});
    const u=input(v[1],"url");u.placeholder="https://…";u.setAttribute("aria-label",F.linkUrl);u.addEventListener("input",()=>{commit();v[1]=u.value;soon()});
    const x=mkBtn("×",()=>{commit();e.links.splice(i,1);if(!e.links.length)delete e.links;state.view.select(e.id);rerender()},"ed-x");x.setAttribute("aria-label","Link entfernen");
    r.append(a,u,x);lw.appendChild(r)});
  lw.appendChild(mkBtn(F.addLink,()=>{commit();e.links=e.links||[];const n={de:["",""],en:["",""]};if(tags)n.tag=Object.keys(tags)[0];e.links.push(n);state.view.select(e.id)},"ed-add"));
  wrap.appendChild(lw);
  const act=document.createElement("div");act.className="ed-actions";
  act.appendChild(mkBtn(F.dup,()=>{commit();const n=clone(e);let id=e.id+"-kopie",i=2;while(d.entries.some(x=>x.id===id))id=e.id+"-kopie-"+(i++);n.id=id;n.x=Math.min(.98,e.x+.05);n.y=Math.min(.98,e.y+.05);d.entries.splice(d.entries.indexOf(e)+1,0,n);state.view.selected=id;state.view.render();renderSettings()}));
  const del=mkBtn(F.del,()=>{if(!del.dataset.sure){del.dataset.sure="1";del.textContent=F.delSure;del.classList.add("danger");return}
    commit();const i=d.entries.indexOf(e);d.entries.splice(i,1);state.view.selected=(d.entries[i]||d.entries[i-1]||{}).id;state.view.render();renderSettings()});
  act.appendChild(del);wrap.appendChild(act);
  return wrap;
}
function newEntry(x,y,k){
  const d=state.data,atMap=typeof x==="number";let i=1;while(d.entries.some(e=>e.id==="neu-"+i))i++;
  const ks=(d.classes||[]).map(c=>c.id);
  const e={id:"neu-"+i,k:ks.includes(k)?k:(ks[0]||"A"),x:atMap?x:.3,y:atMap?y:.3};for(const l of d.langs||["de","en"])e[l]={label:l==="de"?"Neuer Eintrag":"New entry"};
  snapOpen=false;commit();d.entries.push(e);state.view.selected=e.id;state.view.render();renderSettings();
  const m=document.getElementById("lk-map-section");if(m&&!atMap)m.scrollIntoView({behavior:"smooth"});
  setTimeout(()=>{const f=$("ef-label");if(f){f.focus({preventScroll:atMap&&innerWidth>900});f.select()}},atMap?0:300);
}

/* ---------- settings below the toolbar ---------- */
function details(title,id){const d=document.createElement("details");d.className="ed-sec";d.id=id;const s=document.createElement("summary");s.textContent=title;d.appendChild(s);const b=document.createElement("div");b.className="ed-body";d.appendChild(b);return [d,b]}
const openSet=new Set();
function renderSettings(){
  const box=$("settings");box.replaceChildren();if(state.mode!=="edit"||!state.data)return;
  const d=state.data,L=state.lang,T=S().set;
  const h=document.createElement("h2");h.textContent=T.title;box.appendChild(h);
  /* axes and centre */
  {const [sec,b]=details(T.axes,"set-axes");const M=d.map=d.map||{};M.axes=M.axes||{};const A=M.axes[L]=M.axes[L]||{};
   const g=document.createElement("div");g.className="ed-grid";
   for(const k of ["l","ls","r","rs","t","ts","b","bs"]){const i=input(A[k]);i.addEventListener("input",()=>{commit();if(i.value)A[k]=i.value;else delete A[k];state.view.drawMap()});g.appendChild(field(T[k],"set-ax-"+k,i))}
   b.appendChild(g);
   const C=M.centre=M.centre||{};const CL=C[L]=C[L]||{lines:[]};
   const ln=area((CL.lines||[]).join("\n"),3);ln.addEventListener("input",()=>{commit();CL.lines=ln.value.split("\n").filter(x=>x.trim());state.view.drawMap()});b.appendChild(field(T.lines,"set-c-lines",ln));
   const sb=input(CL.sub);sb.addEventListener("input",()=>{commit();if(sb.value)CL.sub=sb.value;else delete CL.sub;if(sb.value&&!C.subY){C.subY=(C.y||494)+(CL.lines||[]).length*(C.gap||23)+12;C.subSize=12}state.view.drawMap()});b.appendChild(field(T.sub,"set-c-sub",sb));
   M.vertical=M.vertical||{};const V=M.vertical[L]=M.vertical[L]||["","",""];
   [0,1,2].forEach(i=>{const a=area(V[i],2);a.addEventListener("input",()=>{commit();V[i]=a.value;soon()});b.appendChild(field(T.vert[i],"set-v-"+i,a))});
   box.appendChild(sec)}
  /* classes */
  {const [sec,b]=details(T.classes,"set-classes");sec.dataset.k="classes";
   const tb=document.createElement("div");tb.className="ed-table";
   d.classes.forEach((c,i)=>{const r=document.createElement("div");r.className="ed-crow";
     const dot=document.createElement("i");dot.className="ed-dot";dot.style.background=`var(--c${c.id})`;r.appendChild(dot);
     const idI=input(c.id);idI.className="ed-short";idI.setAttribute("aria-label",T.cid);
     idI.addEventListener("change",()=>{const v=idI.value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9]*$/.test(v)||d.classes.some(x=>x!==c&&x.id===v)){idI.value=c.id;return}commit();for(const e of d.entries)if(e.k===c.id)e.k=v;c.id=v;state.view.render();renderSettings()});
     const ct=c[L]=c[L]||{};
     const nm=input(ct.name);nm.setAttribute("aria-label",T.cname);nm.placeholder=T.cname;nm.addEventListener("input",()=>{commit();ct.name=nm.value;soon()});
     const kn=input(ct.kanon);kn.setAttribute("aria-label",T.ckanon);kn.placeholder=T.ckanon;kn.addEventListener("input",()=>{commit();if(kn.value)ct.kanon=kn.value;else delete ct.kanon;soon()});
     const col=input(c.color&&(c.color.light||c.color)||"#888888","color");col.setAttribute("aria-label",T.ccolor);col.title=T.ccolor;
     col.addEventListener("input",()=>{commit();c.color={light:col.value,dark:col.value};state.view.render();renderSettings()});
     if(/^[A-G]$/.test(c.id)&&!c.color)col.disabled=true;
     const used=d.entries.filter(e=>e.k===c.id).length;
     const x=mkBtn(T.delClass,()=>{commit();d.classes.splice(i,1);state.view.render();renderSettings()},"ed-x-text");if(used){x.disabled=true;x.title=used+" · "+T.inUse}
     r.append(idI,nm,kn,col,x);tb.appendChild(r)});
   b.appendChild(tb);
   b.appendChild(mkBtn(T.addClass,()=>{const used=new Set(d.classes.map(c=>c.id));let id="";for(const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ")if(!used.has(ch)){id=ch;break}
     const c={id};if(!/^[A-G]$/.test(id))c.color={light:"#6B7280",dark:"#A1A1AA"};for(const l of d.langs||["de","en"])c[l]={name:l==="de"?"Neue Klasse":"New class",sub:"",q:"",mech:"",erk:"",bew:""};
     commit();d.classes.push(c);state.view.render();renderSettings();openSet.add("set-classes");document.getElementById("set-classes").open=true},"ed-add"));
   box.appendChild(sec)}
  /* glossary */
  {const [sec,b]=details(T.gloss,"set-gloss");d.glossary=d.glossary||{};const G=d.glossary[L]=d.glossary[L]||{};
   const tb=document.createElement("div");tb.className="ed-table";
   const rows=Object.entries(G);
   rows.forEach(([k,v])=>{const r=document.createElement("div");r.className="ed-grow";
     const ti=input(k);ti.setAttribute("aria-label",T.term);const ei=input(v);ei.setAttribute("aria-label",T.expl);
     let cur=k;
     ti.addEventListener("change",()=>{const nk=ti.value.trim();commit();const val=G[cur];delete G[cur];if(nk)G[nk]=val;cur=nk;soon()});
     ei.addEventListener("input",()=>{commit();G[cur]=ei.value;soon()});
     const x=mkBtn("×",()=>{commit();delete G[cur];r.remove();soon()},"ed-x");x.setAttribute("aria-label",T.term+" entfernen");
     r.append(ti,ei,x);tb.appendChild(r)});
   b.appendChild(tb);
   b.appendChild(mkBtn(T.addTerm,()=>{commit();let k="neuer Begriff",i=2;while(G[k]!=null)k="neuer Begriff "+(i++);G[k]="";renderSettings();const s=document.getElementById("set-gloss");s.open=true;const last=s.querySelector(".ed-grow:last-child input");if(last){last.focus();last.select()}},"ed-add"));
   box.appendChild(sec)}
  /* json areas */
  const jsonSec=(title,id,get,put,help)=>{const [sec,b]=details(title,id);if(help){const p=document.createElement("p");p.className="hint";p.textContent=help;b.appendChild(p)}
    const a=area(JSON.stringify(get(),null,2),14);a.className="ed-code";a.spellcheck=false;b.appendChild(field(title,id+"-ta",a));
    const msg=document.createElement("small");msg.className="ed-err";msg.setAttribute("aria-live","polite");
    b.appendChild(mkBtn(T.apply,()=>{let v;try{v=JSON.parse(a.value)}catch(err){msg.textContent=T.jsonErr+" "+err.message;return}
      try{commit();put(v);msg.textContent=T.applied;state.view.render();renderSettings();const s=document.getElementById(id);if(s)s.open=true}catch(err){msg.textContent=err.message}},"primary"));
    b.appendChild(msg);box.appendChild(sec)};
  jsonSec(T.links,"set-links",()=>d.linking||{tables:{},rules:[]},v=>{for(const r of v.rules||[])new RegExp(r.pattern,"gu");d.linking=v},T.linkHelp);
  jsonSec(T.layout,"set-layout",()=>({layout:d.layout,ui:d.ui}),v=>{if(v.layout)d.layout=v.layout;if(v.ui)d.ui=v.ui});
  jsonSec(T.file,"set-file",()=>d,v=>{if(!validate(v))throw new Error(S().badFile);state.data=v;state.view.data=v});
  box.querySelectorAll("details").forEach(x=>{if(openSet.has(x.id))x.open=true;x.addEventListener("toggle",()=>{if(x.open)openSet.add(x.id);else openSet.delete(x.id)})});
}
function renderSettingsLight(){const f=document.getElementById("set-file-ta");if(f&&document.activeElement!==f)f.value=JSON.stringify(state.data,null,2)}

/* ---------- saving ---------- */
let downloads=null;
if(window.claude&&window.claude.use)window.claude.use("downloads").then(x=>{downloads=x}).catch(()=>{});
async function save(){
  const d=clone(state.data);d.version=(parseInt(d.version,10)||0)+1;d.modified=new Date().toISOString().slice(0,10);cleanOwn(d);
  const name=`${d.id||"landkarte"}-v${d.version}.json`,text=JSON.stringify(d,null,2)+"\n";
  const done=()=>{state.data.version=d.version;state.data.modified=d.modified;store.del("lk-draft-"+d.id);setDirty(false);setStatus(S().saved+" "+name)};
  if(downloads){try{await downloads.save({filename:name,data:text});done();return}catch(err){if(err&&err.code==="declined"){setStatus(S().declined);return}}}
  if(!(window.claude&&window.claude.use)){try{const u=URL.createObjectURL(new Blob([text],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);done();return}catch(_){}}
  showExport(name,text,done);
}
function showExport(name,text,done){
  const b=$("export");b.replaceChildren();
  const p=document.createElement("p");p.textContent=S().exportT+" "+name+".";b.appendChild(p);
  const a=area(text,12);a.className="ed-code";a.readOnly=true;a.id="export-ta";a.setAttribute("aria-label",name);b.appendChild(a);
  const row=document.createElement("div");row.className="ed-actions";
  const c=mkBtn(S().copy,async()=>{try{await navigator.clipboard.writeText(text);c.textContent=S().copied;done()}catch(_){a.focus();a.select()}},"primary");
  row.append(c,mkBtn(S().close,()=>{b.hidden=true}));b.appendChild(row);b.hidden=false;b.scrollIntoView({behavior:"smooth",block:"nearest"});
}

/* ---------- toolbar ---------- */
function labels(){
  const s=S();$("l-map").textContent=s.map;$("m-view").textContent=s.view;$("m-edit").textContent=s.edit;$("b-open").textContent=s.open;
  $("b-undo").textContent=s.undo;$("b-new").textContent=s.newE;$("b-save").textContent=s.save;
  document.querySelectorAll(".lang button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lang===state.lang?"true":"false"));
  $("m-view").setAttribute("aria-pressed",state.mode==="view");$("m-edit").setAttribute("aria-pressed",state.mode==="edit");
}
function setLang(l){if(l===state.lang)return;state.lang=l;store.set("lang",l);labels();const v=$("mapsel").value;loadIndex().then(()=>{$("mapsel").value=v});if(state.data)mount();setDirty(state.dirty)}
function setMode(m){state.mode=m;store.set("lk-mode",m);labels();if(state.data){mount();checkDraft()}setDirty(state.dirty)}
document.querySelectorAll(".lang button").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
$("m-view").addEventListener("click",()=>setMode("view"));
$("m-edit").addEventListener("click",()=>setMode("edit"));
$("b-undo").addEventListener("click",undo);
$("b-new").addEventListener("click",()=>newEntry());
$("b-save").addEventListener("click",save);
$("b-open").addEventListener("click",()=>$("f-open").click());
$("f-open").addEventListener("change",ev=>{const f=ev.target.files&&ev.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{let d;try{d=JSON.parse(r.result)}catch(_){setStatus(S().badFile);return}if(!validate(d)){setStatus(S().badFile);return}
    state.ownName=f.name;state.id="__own";loadIndex().then(()=>{$("mapsel").value="__own"});useData(d)};r.readAsText(f);ev.target.value=""});
$("mapsel").addEventListener("change",()=>{const v=$("mapsel").value;if(v!=="__own")loadMap(v)});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(h&&h!==state.id&&state.index.some(m=>m.id===h))loadMap(h)});
window.addEventListener("beforeunload",ev=>{if(state.dirty){ev.preventDefault()}});

/* ---------- start ---------- */
(async function(){
  try{const q=new URLSearchParams(location.search);const s=q.get("lang")||store.get("lang");if(s==="de"||s==="en")state.lang=s;const m=q.get("mode")||store.get("lk-mode");if(m==="edit"||m==="view")state.mode=m}catch(_){}
  labels();
  mo.observe($("app"),{childList:true,subtree:true});
  await loadIndex();
  const h=location.hash.slice(1);
  await loadMap(state.index.some(m=>m.id===h)?h:(state.index[0]&&state.index[0].id));
})();
})();
