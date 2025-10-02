param([switch]$Commit)

$ErrorActionPreference = "Stop"
$Root   = "C:\Users\Mrcina\elvora"
$Backup = Join-Path $Root "backup"
New-Item -ItemType Directory -Force -Path $Backup | Out-Null

# Unique ZIP name (avoid lock collisions)
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rand  = Get-Random -Minimum 1000 -Maximum 9999
$zip   = Join-Path $Backup ("elvora_snapshot_{0}_{1}.zip" -f $stamp, $rand)

# Build a list of items to archive, EXCLUDING backup/.git/node_modules/tmp
$excludeNames = @("backup", ".git", "node_modules", "tmp", "logs")
$items = Get-ChildItem -LiteralPath $Root -Force | Where-Object { $excludeNames -notcontains $_.Name }

function Try-Compress {
  param([string]$Dest, [System.IO.FileSystemInfo[]]$Paths, [int]$Attempts=3)
  for($i=1;$i -le $Attempts;$i++){
    try{
      if(Test-Path $Dest){ Remove-Item $Dest -Force }
      Compress-Archive -Path ($Paths | ForEach-Object { $_.FullName }) -DestinationPath $Dest -CompressionLevel Optimal
      return $true
    }catch{
      if($i -eq $Attempts){ throw }
      Start-Sleep -Milliseconds (350*$i)  # brief backoff
    }
  }
}

Write-Host "▶ Kreiram backup u: $zip" -ForegroundColor Cyan
[void](Try-Compress -Dest $zip -Paths $items -Attempts 4)
Write-Host "✔ Backup OK" -ForegroundColor Green

# SHA-256
$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $zip
$shaLine = "SHA256  {0}  {1}" -f $hash.Hash, (Split-Path $zip -Leaf)
$shaPath = "$zip.sha256.txt"
$shaLine | Out-File -Encoding ascii $shaPath
Write-Host ("✔ SHA256: {0}" -f $hash.Hash) -ForegroundColor Cyan

# Optional Git
if($Commit){
  try{
    Set-Location $Root
    git add .
    git commit -m ("Freeze snapshot {0}" -f $stamp)
    git tag ("snapshot-{0}-{1}" -f $stamp, $rand)
    git push
    git push --tags
    Write-Host "✔ Git push + tag snapshot-$stamp-$rand" -ForegroundColor Green
  }catch{
    Write-Host "⚠ Git korak nije uspio: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host "`n✅ Freeze kompletiran." -ForegroundColor Green
Write-Host "   ZIP: $zip" -ForegroundColor Cyan
Write-Host "   HASH: $shaPath" -ForegroundColor Cyan
