# Lancement du serveur statique local en PowerShell
$Port = 8000
Write-Host "Lancement du serveur web statique local sur le port $Port..." -ForegroundColor Cyan
Start-Process "http://localhost:$Port"
Set-Location $PSScriptRoot
python -m http.server $Port
