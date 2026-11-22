# Deskbar screencast shoot: brief for the Claude session in the deskbartest account

You run in `deskbartest`, a clean Windows account on Petre's PC, reached over RDP. The job is to
film Deskbar's features and take stills for deskbar.app. The site session (a Claude session in
Petre's own account, working in the deskbar-site repo) wrote this brief, copied the scripts beside
it into `C:\Users\Public\deskbar-shoot`, and picks up what you leave in `out\` and `raw\`.

## Rules

- **Nothing private on screen, ever.** No real names, email addresses, client or company names,
  personal accounts, notifications or chat content. Everything in the frame is made up for the
  demo. Sign in to nothing.
- **Real footage only.** Never edit a frame to show something that did not happen.
- **Never minimise the RDP window** while recording: a minimised session stops drawing.
- **Files that were here before you are not yours.** Don't open, close or delete them; keep them out
  of every frame (minimise their windows).
- If something needs Petre's hands (a Store update, a UAC prompt, a sign-out), ask him in your
  own window.

## Setup (check every item; the site session will ask for a still)

1. Petre connects with `deskbartest-1080p.rdp` on his desktop: 1920x1080 at 125%. Check: the
   screen is 1920x1080 and Deskbar's strip is 30 px tall. 4K is too much for a demo, and at 100%
   everything is too small.
2. Deskbar is the GitHub build, the latest release from
   https://github.com/AppifySheets/Deskbar/releases/latest, run from `%USERPROFILE%\Programs\Deskbar\`.
   GitHub is ahead of the Store, so the Store copy stays exited and off at sign-in. Check with
   `& "$env:APPDATA\Deskbar\deskbar.cmd" version`: the latest version, not packaged. Both copies
   share `%APPDATA%\Deskbar`, so switching keeps the workspaces and settings.
3. In `%APPDATA%\Deskbar\state.json` (exit Deskbar before editing, start it after): `"BarScale": null`,
   `"BarTextOffset": 4.5` (Petre's own settings, so the bar's text matches the strip's), and
   `"TileGap": 12` (or set the gap in Manage and press Apply).
4. Wallpaper: solid `#5A7896`. A dark wallpaper hides the gaps between dark windows, so tiling
   doesn't read. Taskbar on auto-hide, no desktop icons.
5. The bar docked to the right edge at its natural width.
6. Notepad set to "Open in a new window" so each file is its own window.
7. Demo workspaces, built with `deskbar.cmd` (run it with no arguments for the commands):
   - `Website` (current at the start): Edge on https://en.wikipedia.org/wiki/Taskbar, Notepad
     `launch-notes.txt` with a made-up checklist, Explorer on Documents. Never deskbar.app: its hero
     shows Petre's real workspace names.
   - `Invoices`: Calculator, Notepad `Invoice 1042 - Northwind Studio.txt` (made up).
   - `Research`: Edge on Wikipedia "Virtual desktop"; VS Code with a demo folder for the Claude clip.
   - `Music`: Explorer on Music. Park your own terminal here, minimised.
   - `Messengers`: Edge on Wikipedia "Instant messaging", then `pin-workspace Messengers`.
   Give each workspace its own colour.
8. Take `still.ps1 -Name setup-check -Screen` and message the site session. **Wait for its go.**

## Scripts (in C:\Users\Public\deskbar-shoot; run with `powershell -ExecutionPolicy Bypass -File`)

- `record.ps1 -Name <clip> -Seconds <n>`: starts recording (hidden ffmpeg, 30 fps, pointer drawn,
  lossless) into `raw\<clip>.mkv` and returns at once, so you act while it records.
- `encode.ps1 -Name <clip> [-From s] [-To s]`: trims into `out\<clip>.mp4` plus `-poster.png`.
- `still.ps1 -Name <still> (-Hwnd 0x.. | -Title text | -Screen)`: PNG into `out\`.
- `mouse.ps1`: dot-source it for `Move-Smooth`, `Click-At`, `Right-Click-At`, `Drag-Smooth`,
  `Get-WindowRect`. Every pointer action goes through these, so motion looks like a hand.

## Shot list

The site session sends the list for this run (all of it, or only what changed). The full set, by
name, with what each must show:

| Clip | Shows |
|---|---|
| `tiling-on` | three overlapping windows; click the tile button beside Search; they fall into tiles |
| `tiling-drop` | drag a tile onto another's edge (preview shows), it lands beside; drop one on a middle to swap |
| `tiling-resize` | drag the line between tiles; right-click the tile button, Even out tiles |
| `tiling-new-window` | click into a tile, open a new Notepad; it splits that tile |
| `strip-and-pin` | click the pinned Messengers item on the strip to go in, the same item to come back |
| `switch` | hold Win+Ctrl, tap Tab three times, release; the switcher walks and lands |
| `quick-find` | Win+Alt+Space, type a few letters, Enter lands on the tab in its workspace |
| `task-timer-start`, `task-timer-due` | park a workspace from the stopwatch; when due its row blinks (cut the wait) |
| `claude-flash` | a Claude Code session in Research finishes while you're on Website; Research flashes |

Stills: `bar` (floating, by hwnd), `bar-docked`, `tiled-screen`, `stopwatch-menu`, `quick-find`
(window only), `manage-time` (crop to the table).

Clips are 10 to 20 seconds. Start recording a second before the first action, stop a second after.
If a clip fails twice, note why and move on.

## When done

Write `out\NOTES.md`: per file, what it shows, its `-From` offset, and anything that didn't work.
Then message the site session.
