(() => {
  const sensors = [
    {id:"CH-01", name:"Chilled #1", proto:"BLE"},
    {id:"FR-02", name:"Frozen #2",  proto:"BLE"},
    {id:"AM-03", name:"Ambient #3", proto:"WiFi"}
  ];
  const $list = document.getElementById("list");
  $list.innerHTML = sensors.map(s=>`
    <label class="tile" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span><b>${s.name}</b> <span class="muted">(${s.proto})</span></span>
      <input type="checkbox" value="${s.id}"/>
    </label>
  `).join("");
  document.getElementById("pair").onclick=()=>{
    const selected=[...$list.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value);
    alert(selected.length?("Uparujem: "+selected.join(", ")): "Ništa nije odabrano.");
    // TODO: navigator.bluetooth.requestDevice(...) ili fetch('/api/sensors/pair', ...)
  };
})();
