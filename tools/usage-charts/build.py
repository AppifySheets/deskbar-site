"""
Builds the "How I use it" charts on deskbar.app's home page from Petre's own machine.

What it reads (all local, nothing is fetched):
  - Claude Code's session transcripts, ~/.claude/projects/<project>/<session>.jsonl. Only the
    timestamp, type and entrypoint of each line are read, never the content. A session counts
    as working in a 10-minute slot when Claude wrote a reply into its transcript in that slot. Scripted runs
    (entrypoint sdk-cli, sdk-ts and the like) are left out; claude-vscode is a VS Code session,
    cli is a terminal or background session (the ones Deskbar starts with claude --bg).
    Subagent transcripts live one folder deeper and are not counted.
  - Deskbar's own task numbers: `deskbar.cmd task stats` and `deskbar.cmd task list`
    (open and closed), for tasks added and finished per day and the share handed to Claude.

What it writes: the HTML between the markers
  <!-- usage-charts:start --> and <!-- usage-charts:end --> in site/index.html, with inline
SVG charts (no script, the page has none), native <title> tooltips and a table view. Only
counts leave the machine: no task titles, folders or session ids are written.

Run it from the repo root, on the machine whose usage the page shows:
  python -I tools/usage-charts/build.py            # last 14 full days
  python -I tools/usage-charts/build.py --days 14 --end 2026-11-25
"""

import argparse
import collections
import datetime as dt
import glob
import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INDEX = os.path.join(ROOT, "site", "index.html")
START, END = "<!-- usage-charts:start -->", "<!-- usage-charts:end -->"

# Series colours, validated with the dataviz skill's validator against the page's dark
# surface #07070d (lightness band, chroma, colour-blind separation, contrast all pass).
VSCODE, BACKGROUND = "#8b5cf6", "#d08a35"
ADDED, FINISHED = "#2a9fbd", "#c0507a"

TS = re.compile(rb'"timestamp":"(20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?)"')
EP = re.compile(rb'"entrypoint":"([^"]+)"')


def deskbar(*args):
    """Runs deskbar.cmd and parses its JSON output."""
    cmd = os.path.join(os.environ["APPDATA"], "Deskbar", "deskbar.cmd")
    out = subprocess.run([cmd, *args], capture_output=True, check=True).stdout
    return json.loads(out.decode("utf-8-sig"))


def session_slots(first_day, last_day):
    """{slot start (local, 10 min): {session id: entrypoint}} for the days asked for."""
    slots = collections.defaultdict(dict)
    since = dt.datetime.combine(first_day, dt.time()).timestamp()
    for path in glob.glob(os.path.expanduser("~/.claude/projects/*/*.jsonl")):
        if os.path.getmtime(path) < since:
            continue
        sid = os.path.basename(path)[:-6]
        with open(path, "rb") as f:
            for line in f:
                # Only Claude's own replies count as work. Lines a session writes when VS Code
                # restores it, or when it is resumed, would otherwise make a reload of thirty
                # idle sessions look like thirty at work.
                if b'"type":"assistant"' not in line[:600] and b'"type":"assistant"' not in line:
                    continue
                m, e = TS.search(line), EP.search(line)
                if not m:
                    continue
                # Read per line: a VS Code session that Deskbar later resumes in the background
                # keeps its transcript, and its later lines say cli.
                entry = e and e.group(1).decode()
                t = dt.datetime.fromisoformat(m.group(1).decode().replace("Z", "+00:00")).astimezone()
                if not first_day <= t.date() <= last_day:
                    continue
                slots[t.replace(minute=t.minute // 10 * 10, second=0, microsecond=0, tzinfo=None)][sid] = entry
    # Keep interactive sessions only (VS Code, and terminal or background); scripted runs drop out.
    return {k: {s: e for s, e in v.items() if e in ("claude-vscode", "cli")} for k, v in slots.items()}


def busiest_per_day(slots, days):
    """For each day, the slot with the most sessions at work, split by where they ran."""
    rows = []
    for d in days:
        best = max((v for k, v in slots.items() if k.date() == d), key=len, default={})
        vs = sum(1 for e in best.values() if e == "claude-vscode")
        rows.append({"day": d, "vscode": vs, "background": len(best) - vs})
    return rows


def esc(s):
    return html.escape(str(s), quote=True)


def label_day(d):
    return f"{d.day} {d.strftime('%b')}"


def ticks(top):
    """Clean y-axis ticks: 0 to a round number at or above the top value."""
    step = next(s for s in (1, 2, 5, 10, 20, 25, 50, 100, 200, 500) if top / s <= 5)
    return list(range(0, (top // step + 1) * step + 1, step)) if top % step else list(range(0, top + 1, step))


def columns_svg(title_id, days, series, stacked, value_label):
    """Column chart in SVG. series: [(name, colour, [values per day])]. Stacked or grouped."""
    # 560 wide: drawn at about 540 px in its card, so the SVG's text sizes are close to CSS px.
    w, h, left, bottom, top_pad = 560, 250, 34, 28, 24
    totals = [sum(s[2][i] for s in series) if stacked else max(s[2][i] for s in series) for i in range(len(days))]
    ys = ticks(max(max(totals), 1))
    ymax = ys[-1]
    plot_h = h - bottom - top_pad
    band = (w - left) / len(days)
    y = lambda v: top_pad + plot_h - v / ymax * plot_h
    out = [f'<svg class="chart-svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{title_id}">']
    for t in ys:  # hairline grid and tick labels
        out.append(f'<line class="grid" x1="{left}" x2="{w}" y1="{y(t):.1f}" y2="{y(t):.1f}" />')
        out.append(f'<text class="tick" x="{left - 8}" y="{y(t) + 4:.1f}" text-anchor="end">{t}</text>')
    peak = totals.index(max(totals))
    for i, d in enumerate(days):
        x0 = left + i * band
        tip = f"{label_day(d)}: " + ", ".join(f"{s[2][i]} {s[0].lower()}" for s in series)
        out.append(f"<g><title>{esc(tip)}</title>")
        out.append(f'<rect class="hit" x="{x0:.1f}" y="{top_pad}" width="{band:.1f}" height="{plot_h}" />')
        if stacked:
            bw = min(24, band * 0.6)
            bx, base = x0 + (band - bw) / 2, 0
            for k, (_, colour, vals) in enumerate(series):
                v = vals[i]
                if v:
                    last = k == len(series) - 1 or all(series[j][2][i] == 0 for j in range(k + 1, len(series)))
                    out.append(bar(bx, y(base + v), bw, y(base) - y(base + v) - (0 if base == 0 else 2), colour, last))
                    base += v
        else:
            bw = min(18, band * 0.32)
            gx = x0 + (band - (bw * len(series) + 2 * (len(series) - 1))) / 2
            for k, (_, colour, vals) in enumerate(series):
                v = vals[i]
                if v:
                    out.append(bar(gx + k * (bw + 2), y(v), bw, y(0) - y(v), colour, True))
        out.append("</g>")
        out.append(f'<text class="tick" x="{x0 + band / 2:.1f}" y="{h - 8}" text-anchor="middle">{label_day(d) if len(days) <= 8 or (len(days) - 1 - i) % 2 == 0 else ""}</text>')
    # One direct label, on the day that tops the chart.
    out.append(f'<text class="peak" x="{left + peak * band + band / 2:.1f}" y="{y(totals[peak]) - 7:.1f}" text-anchor="middle">{totals[peak]} {value_label}</text>')
    out.append("</svg>")
    return "".join(out)


def bar(x, top, width, height, colour, rounded_top):
    """A column with a 4px rounded top and a square foot, as the dataviz mark spec asks."""
    if height <= 0:
        return ""
    r = min(4, width / 2, height) if rounded_top else 0
    b = top + height
    return (f'<path fill="{colour}" d="M{x:.1f},{b:.1f}V{top + r:.1f}Q{x:.1f},{top:.1f} {x + r:.1f},{top:.1f}'
            f'H{x + width - r:.1f}Q{x + width:.1f},{top:.1f} {x + width:.1f},{top + r:.1f}V{b:.1f}Z" />')


def legend(series):
    return '<ul class="chart-legend">' + "".join(
        # The key is a tiny SVG with a fill attribute: the page's CSP allows no inline style.
        f'<li><svg class="key" viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" rx="3" fill="{c}" /></svg>{esc(n)}</li>'
        for n, c, _ in series) + "</ul>"


def table(days, series, first_col):
    head = "".join(f"<th scope=\"col\">{esc(n)}</th>" for n, _, _ in series)
    rows = "".join(f"<tr><th scope=\"row\">{label_day(d)}</th>" + "".join(f"<td>{s[2][i]}</td>" for s in series) + "</tr>"
                   for i, d in enumerate(days))
    return (f'<details class="chart-table"><summary>The numbers</summary><table><thead><tr><th scope="col">{first_col}</th>'
            f"{head}</tr></thead><tbody>{rows}</tbody></table></details>")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--end", type=dt.date.fromisoformat, default=dt.date.today() - dt.timedelta(days=1))
    a = ap.parse_args()
    days = [a.end - dt.timedelta(days=a.days - 1 - i) for i in range(a.days)]

    slots = session_slots(days[0], days[-1])
    sessions = set().union(*slots.values()) if slots else set()
    busiest = busiest_per_day(slots, days)
    most = max(busiest, key=lambda r: r["vscode"] + r["background"])
    # The most sessions running in the background at once, on any day (Deskbar starts its task
    # sessions with claude --bg, so this is the count Petre asked to see).
    bg_counts = [sum(1 for e in v.values() if e == "cli") for v in slots.values()] or [0]

    stats = deskbar("task", "stats", "--days", str(a.days))
    tasks = deskbar("task", "list") + deskbar("task", "list", "--closed")
    claude_share = sum(1 for t in tasks if t.get("claudes")) / max(len(tasks), 1)
    by_day = {d["date"]: d for d in stats["days"]}
    # The task chart covers the last unbroken run of days with task activity, at most 7 days,
    # so it starts when the board came into daily use instead of on a row of empty days.
    active = lambda d: by_day.get(d.isoformat(), {}).get("added") or by_day.get(d.isoformat(), {}).get("finished")
    tdays = []
    for d in reversed(days[-7:]):
        if not active(d):
            break
        tdays.insert(0, d)
    tdays = tdays or days[-7:]
    added = [len(by_day.get(d.isoformat(), {}).get("added", [])) for d in tdays]
    finished = [len(by_day.get(d.isoformat(), {}).get("finished", [])) for d in tdays]

    s1 = [("In VS Code", VSCODE, [r["vscode"] for r in busiest]),
          ("In the background or a terminal", BACKGROUND, [r["background"] for r in busiest])]
    s2 = [("Added", ADDED, added), ("Finished", FINISHED, finished)]
    share = round(claude_share * 4) if round(claude_share * 4) in (1, 2, 3, 4) else None
    share_text = f"{share} in 4" if share else f"{claude_share:.0%}"

    frag = f"""
          <!-- Generated by tools/usage-charts/build.py on {dt.date.today().isoformat()} from Petre's machine,
               {label_day(days[0])} to {label_day(days[-1])} {days[-1].year}. Edit the script, not this block. -->
          <ul class="stats">
            <li><span class="stat-value">{len(sessions)}</span><span class="stat-label">Claude sessions in {a.days} days</span></li>
            <li><span class="stat-value">{most['vscode'] + most['background']}</span><span class="stat-label">at work in the same ten minutes, at the busiest</span></li>
            <li><span class="stat-value">{max(bg_counts)}</span><span class="stat-label">in the background in the same ten minutes</span></li>
            <li><span class="stat-value">{share_text}</span><span class="stat-label">tasks handed to a Claude session</span></li>
          </ul>
          <div class="charts">
            <figure class="chart">
              <figcaption id="chart-sessions">Claude sessions at work in the same ten minutes, at each day's busiest moment</figcaption>
              {legend(s1)}
              {columns_svg("chart-sessions", days, s1, True, "at once")}
              {table(days, s1, "Day")}
            </figure>
            <figure class="chart">
              <figcaption id="chart-tasks">Tasks added and finished each day: {sum(finished)} finished since {label_day(tdays[0])}</figcaption>
              {legend(s2)}
              {columns_svg("chart-tasks", tdays, s2, False, "added")}
              {table(tdays, s2, "Day")}
            </figure>
          </div>
          """
    src = open(INDEX, encoding="utf-8").read()
    i, j = src.index(START) + len(START), src.index(END)
    open(INDEX, "w", encoding="utf-8", newline="").write(src[:i] + frag + src[j:])
    print(f"sessions {len(sessions)}, most at once {most}, claude share {claude_share:.2f}, "
          f"tasks {list(zip(map(str, tdays), added, finished))}", file=sys.stderr)


if __name__ == "__main__":
    main()
