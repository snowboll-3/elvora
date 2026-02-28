/* Elvora • logistics.js – early check-in + notify manager */
import "/shared/events.js";

const QK="elvora.logistics.queue";
const q=()=>{try{return JSON.parse(localStorage.getItem(QK)||"[]")}catch{return[]}};
const s=(rows)=>localStorage.setItem(QK,JSON.stringify(rows));

function ev(type, action, payload, meta){
  try{
    if(window.ElvoraEvents && typeof window.ElvoraEvents.emit==="function"){
      window.ElvoraEvents.emit(type, action, payload, meta);
    }
  }catch{}
}

export function earlyCheckIn(truckId, etaMin){
  const rows=q();
  rows.unshift({ts:new Date().toISOString(),truckId,etaMin,event:"EARLY_CHECKIN"});
  s(rows);

  ev("LOGISTICS","EARLY_CHECKIN",{ truckId, etaMin },{
    hub:"logistics",
    source:"logistics.js"
  });

  notify(`Early check-in: ${truckId} (${etaMin} min)`);
}

export function notifyManager(msg){
  const rows=q();
  rows.unshift({ts:new Date().toISOString(),event:"NOTIFY_MANAGER",msg});
  s(rows);

  ev("LOGISTICS","NOTIFY_MANAGER",{ msg },{
    hub:"logistics",
    source:"logistics.js"
  });

  notify(msg);
}

function notify(body){
  if(!("Notification" in window)) return;
  if(Notification.permission==="default"){
    Notification.requestPermission().catch(()=>{});
  }
  if(Notification.permission==="granted"){
    new Notification("Logistics", {body, icon:"/assets/icon-192.png"});
  }
}
