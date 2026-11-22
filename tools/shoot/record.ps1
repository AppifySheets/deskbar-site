<#
  record.ps1: record the whole screen of THIS Windows session for a fixed time, for deskbar.app.

  Usage (returns at once; ffmpeg keeps recording in the background for -Seconds):
    powershell -ExecutionPolicy Bypass -File C:\Users\Public\deskbar-shoot\record.ps1 -Name tiling-drop -Seconds 20

  What it does:
    1. Starts ffmpeg hidden (so its own window is never in the shot), grabbing the desktop with
       gdigrab at 30 fps with the mouse pointer drawn, lossless, into raw\<Name>.mkv.
    2. Returns straight away, so the caller can perform the actions while it records.
  Afterwards run encode.ps1 -Name <Name> to make the web copy.

  Notes:
    - gdigrab records only the session that runs it, and only while that session is drawn: in an
      RDP session, keep the RDP window open on the client, never minimised.
    - Start a second or so before the first action and stop a second after the last; trimming
      happens in encode.ps1.
#>
param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [int] $Seconds,
    [int] $Fps = 30
)

$root = 'C:\Users\Public\deskbar-shoot'
$raw = Join-Path $root 'raw'
New-Item -ItemType Directory -Force $raw | Out-Null
$out = Join-Path $raw "$Name.mkv"

# Lossless RGB capture with the fastest preset: the recording must never drop frames while the
# machine is busy moving windows. The file is big; encode.ps1 makes the small web copy from it.
$ffArgs = @(
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'gdigrab', '-framerate', $Fps, '-draw_mouse', '1', '-i', 'desktop',
    '-t', $Seconds,
    '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-crf', '0',
    $out
)
Start-Process -FilePath 'ffmpeg' -ArgumentList $ffArgs -WindowStyle Hidden | Out-Null
Write-Output "recording $Seconds s to $out"
