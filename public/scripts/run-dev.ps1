Write-Host "▶ Dev server" -ForegroundColor Cyan

# Ako postoji package.json -> koristi npm (Vite/React)
if (Test-Path ".\web\package.json") {
  Push-Location web
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "NPM nije pronađen. Instaliraj Node.js ili koristi Python server." -ForegroundColor Yellow
    Pop-Location
    exit 1
  }
  npm run dev
  Pop-Location
  exit 0
}

# Ako NEMA package.json -> posluži statički HTML
if (Test-Path ".\web\index.html") {
  # Preferiraj Python ako postoji
  if (Get-Command python -ErrorAction SilentlyContinue) {
    Push-Location web
    Write-Host "Pokrećem Python http.server na http://localhost:8080" -ForegroundColor Green
    python -m http.server 8080
    Pop-Location
  } else {
    Write-Host "Nema Node/NPM ni Python — otvaram web\index.html u pregledniku." -ForegroundColor Yellow
    Start-Process ".\web\index.html"
  }
} else {
  Write-Host "Nema web\index.html — kreiram minimalni landing pa ga otvaram." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path ".\web" | Out-Null
  @"
<!doctype html><meta charset="utf-8"><title>Elvora</title>
<style>body{margin:0;background:#0b0f14;color:#e6eef7;font:16px system-ui;display:grid;place-items:center;height:100vh}
h1{color:#19b5ff}</style>
<h1>Elvora</h1><p>Scan • Track • Predict</p>
"@ | Out-File ".\web\index.html" -Encoding utf8
  Start-Process ".\web\index.html"
}
