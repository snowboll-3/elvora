(() => {
  const devices = [
    {user:"Marko",   device:"Pixel 7",   last:"2025-09-20 10:20", status:"active"},
    {user:"Ivana",   device:"iPhone 14", last:"2025-09-19 15:02", status:"active"},
    {user:"Stari",   device:"Galaxy S10",last:"2025-08-02 08:12", status:"revocable"}
  ];
  const $tbl=document.getElementById("tbl");
  $tbl.innerHTML=`<thead><tr><th>Korisnik</th><th>Uređaj</th><th>Zadnje</th><th>Status</th><th>Akcija</th></tr></thead>
  <tbody>
    ${devices.map(d=>`<tr>
      <td>${d.user}</td><td>${d.device}</td><td>${d.last}</td><td>${d.status}</td>
      <td>${d.status==="active" ? '<button class="btn small revoke">Odjavi</button>' : '<button class="btn small">Obrisan</button>'}</td>
    </tr>`).join("")}
  </tbody>`;
  $tbl.addEventListener("click",e=>{
    if(e.target.classList.contains("revoke")){
      const row=e.target.closest("tr"); const user=row.children[0].textContent;
      alert("Odjavljujem uređaj korisnika: "+user);
      // TODO: fetch('/api/devices/revoke', {method:'POST', body: JSON.stringify({user})})
      e.target.outerHTML='<span class="badge">Revoked</span>';
    }
  });
})();
