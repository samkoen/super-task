# Build web + sync Capacitor + APK release.
# From frontend:
#   .\build-android.ps1
# From anywhere:
#   powershell -ExecutionPolicy Bypass -File .\frontend\build-android.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Assert-Success {
    param([string]$Step)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Echec : $Step (code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

function Read-ApkVersion {
    $gradle = Join-Path $PSScriptRoot "android\app\build.gradle"
    $text = Get-Content $gradle -Raw
    $name = if ($text -match 'versionName\s+"([^"]+)"') { $Matches[1] } else { "?" }
    $code = if ($text -match '(?m)^\s*versionCode\s+(\d+)') { $Matches[1] } else { "?" }
    return @{ Name = $name; Code = $code }
}

$apkVersion = Read-ApkVersion
Write-Host "APK version : $($apkVersion.Name)" -ForegroundColor Cyan

$envProd = Join-Path $PSScriptRoot ".env.production"
$envExample = Join-Path $PSScriptRoot "env.production.example"
if (-not (Test-Path $envProd) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envProd
    Write-Host "Cree .env.production depuis env.production.example" -ForegroundColor Yellow
}
if (Test-Path $envProd) {
    $apiUrlLine = Get-Content $envProd | Where-Object { $_ -match "^\s*VITE_API_URL=" } | Select-Object -First 1
    Write-Host "APK API : $apiUrlLine" -ForegroundColor Cyan
    if ($apiUrlLine -match "vercel\.app") {
        Write-Host "Refuse : VITE_API_URL pointe encore vers Vercel. Utiliser l'API Render." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[1/3] npm run build" -ForegroundColor Cyan
npm run build
Assert-Success "npm run build"

Write-Host "`n[2/3] npx cap sync android" -ForegroundColor Cyan
npx cap sync android
Assert-Success "npx cap sync android"

Write-Host "`n[3/3] gradle assembleRelease" -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "android")
& .\gradlew.bat assembleRelease
Assert-Success "gradlew assembleRelease"

$apkDir = Join-Path $PSScriptRoot "android\app\build\outputs\apk\release"
Write-Host "`nOK - APK $($apkVersion.Name) :" -ForegroundColor Green
Get-ChildItem -Path $apkDir -Filter *.apk | ForEach-Object {
    Write-Host $_.FullName -ForegroundColor Green
}

Set-Location ..
