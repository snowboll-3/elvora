const $ = (q)=>document.querySelector(q);
const LS = { role:"elvora.comm.role", workers:"elvora.comm.workers", threads:"elvora.comm.threads", me:"elvora.comm.me" };
const uid = ()=>"u"+Math.random().toString(16).slice(2)+Date.now().toString(16);

const loadJSON=(k,f)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch(e){ return f; } };
const saveJSON=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const now=()=>new Date().toLocaleString();

function getRole(){
  const urlRole = new URLSearchParams(location.search).get("role");
  return urlRole || localStorage.getItem(LS.role) || "worker";
}
function setRole(r){
  document.body.dataset.role = r;
  localStorage.setItem(LS.role, r);
  $("#roleBadge").textContent = r==="manager" ? "Voditelj" : "Radnik";
  $("#rolePick").value = r;
  render();
}

function defaultWorkers(){ return [{id:"w1",name:"Radnik 1",lang:"ne-NP"},{id:"w2",name:"Radnik 2",lang:"fil"}]; }
const getWorkers=()=>loadJSON(LS.workers, defaultWorkers());
const setWorkers=(ws)=>saveJSON(LS.workers, ws);
const getThreads=()=>loadJSON(LS.threads, {});
const setThreads=(t)=>saveJSON(LS.threads, t);

function getMe(){
  let me = loadJSON(LS.me, null);
  if(!me){ me = { id: uid(), name:"Elvora User", lang: navigator.language || "hr-HR" }; saveJSON(LS.me, me); }
  return me;
}

let state = { activeWorkerId: null };

function ensureActive(){
  const ws = getWorkers();
  if(!state.activeWorkerId && ws.length) state.activeWorkerId = ws[0].id;
}
function activeWorker(){ return getWorkers().find(w=>w.id===state.activeWorkerId) || null; }
function tid(workerId){ return "t_"+workerId; }

async function translateText(text, from, to){
  if(window.ElvoraTranslate){
    try{ return await window.ElvoraTranslate(text, from, to); }catch(e){}
  }
  return text;
}

function pushMsg(t, msg){
  const threads = getThreads();
  threads[t] = threads[t] || [];
  threads[t].push(msg);
  setThreads(threads);
}

function msgView(m){
  const mine = m.from === getMe().id;
  const div = document.createElement("div");
  div.className = "msg"+(mine?" me":"");
  div.innerHTML = `
    <div class="meta">
      <span>${mine?"Ti":m.fromName}</span>
      <span>${m.when}</span>
      ${m.langTo?`<span>${m.langFrom} → ${m.langTo}</span>`:""}
    </div>
    <div class="text"></div>
    ${m.img?`<img src="${m.img}" alt="img"/>`:""}
  `;
  div.querySelector(".text").textContent = m.text || "";
  return div;
}

function renderWorkers(){
  const list = $("#workerList"); if(!list) return;
  const ws = getWorkers();
  list.innerHTML = "";
  ws.forEach(w=>{
    const item = document.createElement("div");
    item.className = "worker-item"+(w.id===state.activeWorkerId?" active":"");
    item.innerHTML = `<div><div><b>${w.name}</b></div><div class="worker-meta">${w.lang}</div></div><button class="chip" data-del="${w.id}">🗑️</button>`;
    item.addEventListener("click",(e)=>{
      const del = e.target?.getAttribute?.("data-del");
      if(del){
        if(confirm("Obrisati radnika?")){
          const next = getWorkers().filter(x=>x.id!==del);
          setWorkers(next);
          if(state.activeWorkerId===del) state.activeWorkerId = next[0]?.id || null;
          render();
        }
        return;
      }
      state.activeWorkerId = w.id;
      render();
    });
    list.appendChild(item);
  });
}

function renderThread(){
  ensureActive();
  const w = activeWorker();
  $("#chatTitle").textContent = w ? w.name : "Chat";
  $("#chatSub").textContent = w ? `Prijevod: ${getMe().lang} → ${w.lang}` : "—";

  const threads = getThreads();
  const msgs = w ? (threads[tid(w.id)] || []) : [];
  const box = $("#msgList"); box.innerHTML = "";
  msgs.forEach(m=>box.appendChild(msgView(m)));
  box.scrollTop = box.scrollHeight;
}

async function send(kind){
  ensureActive();
  const w = activeWorker();
  if(!w){ alert("Nema radnika."); return; }

  let text = $("#msgText").value.trim();
  if(kind==="ack") text="Razumio ✅";
  if(kind==="help") text="Ne razumijem ❓ Molim pojasni.";
  if(!text) return;

  const me = getMe();
  const out = await translateText(text, me.lang, w.lang);

  pushMsg(tid(w.id), {
    id: uid(),
    from: me.id,
    fromName: getRole()==="manager" ? "Voditelj" : "Radnik",
    when: now(),
    text: out,
    langFrom: me.lang,
    langTo: w.lang
  });

  $("#msgText").value="";
  renderThread();
}

async function sendImage(file){
  ensureActive(); const w=activeWorker(); if(!w) return;
  const me=getMe();
  const dataUrl = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
  pushMsg(tid(w.id), { id:uid(), from:me.id, fromName:getRole()==="manager"?"Voditelj":"Radnik", when:now(), text:"📷 Slika", img:dataUrl });
  renderThread();
}

function stt(){
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!R){ alert("STT nije podržan u ovom browseru."); return; }
  const rec = new R();
  rec.lang = getMe().lang || "hr-HR";
  rec.interimResults = true;
  let finalText="";
  rec.onresult = (ev)=>{
    let t="";
    for(const r of ev.results){
      t += r[0].transcript;
      if(r.isFinal) finalText += r[0].transcript+" ";
    }
    $("#msgText").value = (finalText || t).trim();
  };
  rec.start();
}

function ttsLast(){
  ensureActive(); const w=activeWorker(); if(!w) return;
  const threads=getThreads(); const msgs=threads[tid(w.id)]||[];
  const last=[...msgs].reverse().find(m=>m.text && m.text.trim());
  if(!last){ alert("Nema poruka."); return; }
  try{
    const u = new SpeechSynthesisUtterance(last.text);
    u.lang = w.lang || "hr-HR";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch(e){ alert("TTS nije dostupan."); }
}

function wire(){
  $("#rolePick").addEventListener("change",(e)=>setRole(e.target.value));

  $("#openWorkerLink").addEventListener("click",()=>{ const u=new URL(location.href); u.searchParams.set("role","worker"); window.open(u.toString(),"_blank"); });
  $("#openManagerLink").addEventListener("click",()=>{ const u=new URL(location.href); u.searchParams.set("role","manager"); window.open(u.toString(),"_blank"); });

  $("#addWorkerBtn")?.addEventListener("click",()=>{
    const name=$("#wName").value.trim();
    const lang=$("#wLang").value.trim();
    if(!name || !lang){ alert("Upiši ime i jezik."); return; }
    const ws=getWorkers();
    const w={ id:uid(), name, lang };
    ws.push(w); setWorkers(ws);
    $("#wName").value=""; $("#wLang").value="";
    state.activeWorkerId = w.id;
    render();
  });

  $("#btnSend").addEventListener("click",()=>send("text"));
  $("#btnAck").addEventListener("click",()=>send("ack"));
  $("#btnHelp").addEventListener("click",()=>send("help"));
  $("#btnSTT").addEventListener("click",stt);
  $("#btnTTS").addEventListener("click",ttsLast);

  $("#imgPick").addEventListener("change",(e)=>{ const f=e.target.files?.[0]; if(f) sendImage(f); e.target.value=""; });

  $("#msgText").addEventListener("keydown",(e)=>{ if(e.key==="Enter" && (e.ctrlKey||e.metaKey)){ e.preventDefault(); send("text"); }});
}

function render(){ renderWorkers(); renderThread(); }

(function init(){
  setRole(getRole());
  ensureActive();
  wire();
  render();
})();
