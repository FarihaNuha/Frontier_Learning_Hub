param([Parameter(Mandatory=$true)][string]$LogoPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$res = Join-Path $root 'android/app/src/main/res'
$brand = Join-Path $root 'branding'
New-Item -ItemType Directory -Force $brand | Out-Null
$master = Join-Path $brand 'unicore-logo.png'
if ([IO.Path]::GetFullPath($LogoPath) -ne $master) { Copy-Item -LiteralPath $LogoPath -Destination $master -Force }
$source = [Drawing.Image]::FromFile($master)
function Save-BrandIcon([string]$Path, [int]$Size, [double]$Scale = 1) {
    $bitmap = [Drawing.Bitmap]::new($Size, $Size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([Drawing.Color]::White)
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $edge = [int]($Size * $Scale)
        $offset = [int](($Size - $edge) / 2)
        $graphics.DrawImage($source, [Drawing.Rectangle]::new($offset, $offset, $edge, $edge))
        $bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
try {
    foreach ($density in @(@('mdpi',48,108),@('hdpi',72,162),@('xhdpi',96,216),@('xxhdpi',144,324),@('xxxhdpi',192,432))) {
        $folder = Join-Path $res "mipmap-$($density[0])"
        Save-BrandIcon (Join-Path $folder 'ic_launcher.png') $density[1]
        Save-BrandIcon (Join-Path $folder 'ic_launcher_round.png') $density[1] 0.90
        # Adaptive icon masks crop the outer area; keep the entire supplied artwork safe.
        Save-BrandIcon (Join-Path $folder 'ic_launcher_foreground.png') $density[2] 0.75
    }
    $drawable = Join-Path $res 'drawable-nodpi'
    New-Item -ItemType Directory -Force $drawable | Out-Null
    Save-BrandIcon (Join-Path $drawable 'unicore_logo.png') 256
    Save-BrandIcon (Join-Path $root 'client/public/logo192.png') 192
    Save-BrandIcon (Join-Path $root 'client/public/logo512.png') 512
} finally { $source.Dispose() }
