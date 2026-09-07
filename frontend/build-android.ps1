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
Write-Host "`nOK - APK :" -ForegroundColor Green
Get-ChildItem -Path $apkDir -Filter *.apk | ForEach-Object {
    Write-Host $_.FullName -ForegroundColor Green
}
