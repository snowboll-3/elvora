$p=".\public\app\camera\index.html"
$c=[IO.File]::ReadAllText((Resolve-Path $p))

# 1) izbaci sve izmeðu "async function fetchName" i iduæe "async function startCamera"
$start = $c.IndexOf("async function fetchName")
if($start -lt 0){ throw "fetchName() nije naðen" }
$next  = $c.IndexOf("async function startCamera", $start)
if($next -lt 0){ throw "startCamera() nije naðen" }

$before = $c.Substring(0,$start)
$after  = $c.Substring($next)

$fn = @"
async function fetchName(code){
  try{
    const r = await fetch("/api/products?code=" + encodeURIComponent(code), { cache:"no-store" });
    const j = await r.json();
    if(j && j.ok && j.product && j.product.name){
      const n = String(j.product.name).trim();
      return n ? n : "—";
    }
  }catch(e){}
  return "—";
}

"@

$c2 = $before + $fn + $after
[IO.File]::WriteAllText((Resolve-Path $p), $c2, (New-Object System.Text.UTF8Encoding($false)))
"OK"
