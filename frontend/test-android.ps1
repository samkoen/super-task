# Unit tests JVM, ou tests instrumented sur téléphone / émulateur.
# From frontend:
#   .\test-android.ps1
#   .\test-android.ps1 -Device
# Android Studio : ouvrir frontend/android, brancher le tel (USB debug),
#   clic droit sur app/src/androidTest → Run 'All Tests'.

param(
    [switch]$Device
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Get-AdbPath {
    $sdk = $env:ANDROID_HOME
    if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
    $props = Join-Path $PSScriptRoot "android\local.properties"
    if (-not $sdk -and (Test-Path $props)) {
        $raw = (Select-String -Path $props -Pattern '^sdk\.dir=' | Select-Object -First 1).Line
        if ($raw) {
            $sdk = $raw.Substring('sdk.dir='.Length).Replace('\:', ':').Replace('\\', '\')
        }
    }
    if ($sdk) {
        $adb = Join-Path $sdk "platform-tools\adb.exe"
        if (Test-Path $adb) { return $adb }
    }
    return $null
}

function Assert-AndroidDevice {
    $adb = Get-AdbPath
    if (-not $adb) {
        Write-Host "Echec : adb introuvable. Ouvrez frontend/android dans Android Studio une fois." -ForegroundColor Red
        exit 1
    }
    $lines = & $adb devices
    $ready = @($lines | Where-Object { $_ -match '\tdevice$' })
    if ($ready.Count -lt 1) {
        Write-Host "Echec : aucun telephone/emulateur (adb devices)." -ForegroundColor Red
        Write-Host "Branchez le tel (USB debug) ou lancez un AVD, puis reessayez." -ForegroundColor Yellow
        & $adb devices -l
        exit 1
    }
}

function Assert-Success {
    param([string]$Step)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Echec : $Step (code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Set-Location (Join-Path $PSScriptRoot "android")

if ($Device) {
    Assert-AndroidDevice
    Write-Host "`nTests instrumented (device USB ou emulateur Android Studio)" -ForegroundColor Cyan
    & .\gradlew.bat connectedDebugAndroidTest
    Assert-Success "gradlew connectedDebugAndroidTest"
} else {
    Write-Host "`nUnit tests JVM (sans telephone)" -ForegroundColor Cyan
    & .\gradlew.bat testDebugUnitTest
    Assert-Success "gradlew testDebugUnitTest"
}

Set-Location ..
