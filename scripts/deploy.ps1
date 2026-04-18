# Script de Despliegue Maestro - Android Device Manager (Simplificado)

Write-Host "🚀 Iniciando proceso de despliegue..." -ForegroundColor Cyan

# 1. Entorno
if (-Not (Test-Path ".env")) {
    Write-Error "ERR: No existe .env"
    exit 1
}

# 2. Build Frontend
Write-Host "🏗️ Compilando frontend..."
npm run build --prefix client
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERR: Falló el build"
    exit 1
}

# 3. Git Push
$status = git status --porcelain
if ($status -ne $null -and $status -ne "") {
    Write-Host "📤 Subiendo cambios..." -ForegroundColor Yellow
    git add .
    git commit -m "🚀 Deployment update [$(Get-Date)]"
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git Push exitoso." -ForegroundColor Green
    } else {
        Write-Warning "⚠️ Git Push falló."
    }
} else {
    Write-Host "ℹ️ Sin cambios pendientes."
}

Write-Host "`n--- DESPLIEGUE FINALIZADO ---" -ForegroundColor Cyan
Write-Host "ACCESO: https://android-device-manager-frontend.vercel.app"
Write-Host "API: https://android-device-manager-one.onrender.com"
