param([switch]$SkipWebBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
    $toolsRoot = Join-Path $projectRoot '.system_generated/android-tools'
    $localJdk = Get-ChildItem (Join-Path $toolsRoot 'jdk') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($localJdk) { $env:JAVA_HOME = $localJdk.FullName }
    $localSdk = Join-Path $toolsRoot 'sdk'
    if (Test-Path -LiteralPath $localSdk) { $env:ANDROID_HOME = $localSdk }
    if (!$env:JAVA_HOME -or !$env:ANDROID_HOME) { throw 'Install Java 21 and Android SDK 36, then set JAVA_HOME and ANDROID_HOME.' }
    $env:ANDROID_USER_HOME = Join-Path $toolsRoot 'android-user'
    $env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle'

    if (!$SkipWebBuild) {
        & npm --prefix client run build
        if ($LASTEXITCODE) { throw 'Web build failed.' }
    }
    & npx --no-install cap sync android
    if ($LASTEXITCODE) { throw 'Capacitor sync failed.' }

    $localGradle = Join-Path $toolsRoot 'gradle-dist/gradle-8.14.3/bin/gradle.bat'
    if (Test-Path -LiteralPath $localGradle) {
        & $localGradle --project-dir android assembleDebug testDebugUnitTest --no-daemon --console=plain
    } else {
        & "$env:JAVA_HOME/bin/java.exe" -classpath 'android/gradle/wrapper/gradle-wrapper.jar' org.gradle.wrapper.GradleWrapperMain --project-dir android assembleDebug testDebugUnitTest --no-daemon --console=plain
    }
    if ($LASTEXITCODE) { throw 'Android build failed.' }
    New-Item -ItemType Directory -Path 'release-output' -Force | Out-Null
    $appVersion = [regex]::Match((Get-Content 'android/app/build.gradle' -Raw), 'versionName\s+"([^"]+)"').Groups[1].Value
    $output = "release-output/UniCore-$appVersion-debug.apk"
    Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination $output -Force
    Write-Output (Join-Path $projectRoot $output)
} finally { Pop-Location }
