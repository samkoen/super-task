# APK release branche sur l'API d'apercu.
# Meme dossier que la prod, fichier app-preview.apk.
# From frontend:
#   .\build-android-preview.ps1
# From anywhere:
#   powershell -ExecutionPolicy Bypass -File .\frontend\build-android-preview.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$PreviewApiUrl = "https://super-api-preview.onrender.com/api"
$ApkFileName = "app-preview.apk"

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
Write-Host "APK preview version : $($apkVersion.Name)" -ForegroundColor Cyan
Write-Host "APK API : VITE_API_URL=$PreviewApiUrl" -ForegroundColor Cyan

# Prioritaire sur .env.production : ce build parle a l'apercu, le fichier reste celui de la prod.
$env:VITE_API_URL = $PreviewApiUrl

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
$built = Join-Path $apkDir "app-release.apk"
$previewApk = Join-Path $apkDir $ApkFileName
if (-not (Test-Path $built)) {
    Write-Host "Echec : $built introuvable" -ForegroundColor Red
    exit 1
}
Move-Item -Path $built -Destination $previewApk -Force

Write-Host "`nOK - APK preview $($apkVersion.Name) :" -ForegroundColor Green
Write-Host $previewApk -ForegroundColor Green

Set-Location ..
