<#
  still.ps1: take a PNG still for deskbar.app, of one window or of the whole screen.

  Usage:
    # One window, by a piece of its title or by its handle from `deskbar.cmd windows`.
    # PrintWindow asks the window to draw itself, so nothing behind it is in the picture and
    # its rounded corners stay transparent. This is how the site's hero capture of the bar was made.
    powershell -ExecutionPolicy Bypass -File C:\Users\Public\deskbar-shoot\still.ps1 -Name bar -Hwnd 0x1A2B3C
    powershell -ExecutionPolicy Bypass -File C:\Users\Public\deskbar-shoot\still.ps1 -Name quickfind -Title "Quick find"

    # The whole screen, exactly as it looks (strip on top, tiles, bar and all).
    powershell -ExecutionPolicy Bypass -File C:\Users\Public\deskbar-shoot\still.ps1 -Name tiled-screen -Screen

  Output: out\<Name>.png
#>
param(
    [Parameter(Mandatory)] [string] $Name,
    [string] $Title,
    [string] $Hwnd,
    [switch] $Screen
)

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Shot {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
}
'@
# Physical pixels everywhere, so a 125% or 150% screen is captured at full sharpness.
[Shot]::SetProcessDPIAware() | Out-Null

$outDir = 'C:\Users\Public\deskbar-shoot\out'
New-Item -ItemType Directory -Force $outDir | Out-Null
$path = Join-Path $outDir "$Name.png"

if ($Screen) {
    Add-Type -AssemblyName System.Windows.Forms
    $r =[System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap $r.Width, $r.Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
    $g.Dispose()
}
else {
    $h = if ($Hwnd) { [IntPtr][Convert]::ToInt64($Hwnd, 16) }
         elseif ($Title) {
             $p = Get-Process | Where-Object { $_.MainWindowTitle -like "*$Title*" } | Select-Object -First 1
             if (-not $p) { throw "no window with '$Title' in its title (try -Hwnd from deskbar.cmd windows)" }
             $p.MainWindowHandle
         }
         else { throw 'give -Title, -Hwnd or -Screen' }

    # The visible frame (DWMWA_EXTENDED_FRAME_BOUNDS = 9) excludes the invisible resize border;
    # PrintWindow draws from the window rect, so crop the difference off afterwards.
    $vis = New-Object Shot+RECT; $win = New-Object Shot+RECT
    [Shot]::DwmGetWindowAttribute($h, 9, [ref]$vis, 16) | Out-Null
    [Shot]::GetWindowRect($h, [ref]$win) | Out-Null
    $full = New-Object System.Drawing.Bitmap ($win.R - $win.L), ($win.B - $win.T), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($full)
    $dc = $g.GetHdc()
    # PW_RENDERFULLCONTENT (2): ask DWM for the composed content, which WPF and Chromium need.
    [Shot]::PrintWindow($h, $dc, 2) | Out-Null
    $g.ReleaseHdc($dc); $g.Dispose()
    $crop = New-Object System.Drawing.Rectangle ($vis.L - $win.L), ($vis.T - $win.T), ($vis.R - $vis.L), ($vis.B - $vis.T)
    $bmp = $full.Clone($crop, $full.PixelFormat)
    $full.Dispose()
}

$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
"$path  $($bmp.Width)x$($bmp.Height)"
$bmp.Dispose()
