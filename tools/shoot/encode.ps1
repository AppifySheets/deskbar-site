<#
  encode.ps1: turn a raw recording into the copy deskbar.app serves, plus a poster frame.

  Usage:
    powershell -ExecutionPolicy Bypass -File C:\Users\Public\deskbar-shoot\encode.ps1 -Name tiling-drop
    powershell -ExecutionPolicy Bypass -File C:\Users\Public\deskbar-shoot\encode.ps1 -Name tiling-drop -From 1.5 -To 17

  Output, in out\:
    <Name>.mp4         H.264, no sound, at most 1600 px wide, fast start, for a looping <video>
    <Name>-poster.png  the first frame of the trimmed clip, shown before the video plays

  -From and -To trim the clip in seconds (optional). Keep clips short, 10 to 20 seconds: they
  loop silently beside the feature they show.
#>
param(
    [Parameter(Mandatory)] [string] $Name,
    [double] $From = 0,
    [double] $To = 0,
    [int] $MaxWidth = 1600
)

$root = 'C:\Users\Public\deskbar-shoot'
$in = Join-Path $root "raw\$Name.mkv"
$outDir = Join-Path $root 'out'
New-Item -ItemType Directory -Force $outDir | Out-Null
if (-not (Test-Path $in)) { throw "no raw recording at $in" }

# Trim arguments only when asked for.
$trim = @('-ss', $From) + ($(if ($To -gt 0) { @('-to', $To) } else { @() }))

# Scale down to MaxWidth (never up), keep even dimensions for yuv420p, and use a sharp scaler so
# text on the bar stays crisp. CRF 22 at preset slow is small and clean for UI footage.
$scale = "scale='min($MaxWidth,iw)':-2:flags=lanczos"

ffmpeg -y -hide_banner -loglevel error @trim -i $in -an -vf $scale `
    -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart `
    (Join-Path $outDir "$Name.mp4")

ffmpeg -y -hide_banner -loglevel error @trim -i $in -vf $scale -frames:v 1 `
    (Join-Path $outDir "$Name-poster.png")

Get-ChildItem $outDir -Filter "$Name*" | Select-Object Name, @{ n = 'KB'; e = { [int]($_.Length / 1KB) } }
