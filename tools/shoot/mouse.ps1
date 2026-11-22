<#
  mouse.ps1: move, click and drag the real mouse smoothly, so recorded drags look like a hand.

  Dot-source it, then call the functions (coordinates are physical screen pixels):
    . C:\Users\Public\deskbar-shoot\mouse.ps1
    Move-Smooth 900 500 -Ms 600          # glide to a point with an ease-in-out curve
    Click-At 1200 40                     # glide there, then a left click
    Drag-Smooth 400 300 1400 300 -Ms 900 # press, glide, pause, release (a tile drag, a separation)
    Right-Click-At 1200 40
    Get-WindowRect 0x1A2B3C              # a window's visible frame: L T R B, for aiming

  Moves are 60 steps a second with easing and a small pause before and after a press, which is
  what makes them read as deliberate on video rather than teleporting.
#>
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Mouse {
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, IntPtr e);
    [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);
}
'@
[Mouse]::SetProcessDPIAware() | Out-Null

function Move-Smooth([int] $X, [int] $Y, [int] $Ms = 500) {
    $p = New-Object Mouse+POINT; [Mouse]::GetCursorPos([ref]$p) | Out-Null
    $steps = [Math]::Max(1, [int]($Ms / 16))
    1..$steps | ForEach-Object {
        $t = $_ / $steps
        $e = if ($t -lt 0.5) { 2 * $t * $t } else { 1 - [Math]::Pow(-2 * $t + 2, 2) / 2 }   # ease in-out
        [Mouse]::SetCursorPos([int]($p.X + ($X - $p.X) * $e), [int]($p.Y + ($Y - $p.Y) * $e)) | Out-Null
        Start-Sleep -Milliseconds 16
    }
}

function Click-At([int] $X, [int] $Y, [int] $Ms = 500) {
    Move-Smooth $X $Y $Ms; Start-Sleep -Milliseconds 150
    [Mouse]::mouse_event(0x2, 0, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 60
    [Mouse]::mouse_event(0x4, 0, 0, 0, [IntPtr]::Zero)
}

function Right-Click-At([int] $X, [int] $Y, [int] $Ms = 500) {
    Move-Smooth $X $Y $Ms; Start-Sleep -Milliseconds 150
    [Mouse]::mouse_event(0x8, 0, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 60
    [Mouse]::mouse_event(0x10, 0, 0, 0, [IntPtr]::Zero)
}

function Drag-Smooth([int] $X1, [int] $Y1, [int] $X2, [int] $Y2, [int] $Ms = 900) {
    Move-Smooth $X1 $Y1 400; Start-Sleep -Milliseconds 200
    [Mouse]::mouse_event(0x2, 0, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 250
    Move-Smooth $X2 $Y2 $Ms; Start-Sleep -Milliseconds 400   # let the drop preview show
    [Mouse]::mouse_event(0x4, 0, 0, 0, [IntPtr]::Zero)
}

function Get-WindowRect([string] $Hwnd) {
    $r = New-Object Mouse+RECT
    [Mouse]::DwmGetWindowAttribute([IntPtr][Convert]::ToInt64($Hwnd, 16), 9, [ref]$r, 16) | Out-Null
    $r
}
