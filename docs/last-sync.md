# Last sync with Deskbar

The update-site skill (`.claude/skills/update-site/SKILL.md`) starts from the commit below and
looks at everything Deskbar has changed since. Update both lines at the end of every run.

- Deskbar commit covered: `a3137645339cb448abb883a76c33079ec23d69e0` (main, 2026-11-22)
- Latest release at the time: v2.5.95

Covered in that run: quick find, the strips and pinned workspaces, tiling, tasks and timers,
time per workspace, arranging rows, Claude Code ([deskbar-site #7](https://github.com/AppifySheets/deskbar-site/pull/7));
free for personal use and Deskbar Pro for work, Report a problem in the privacy page
([deskbar-site #8](https://github.com/AppifySheets/deskbar-site/pull/8)).

Clips and docs: the wall and the docs went live with
[deskbar-site #10](https://github.com/AppifySheets/deskbar-site/pull/10). On 2026-11-23 a re-shoot on
Deskbar v2.5.189 (`406f275`) replaced `claude-many` and `session-start`, which had not shown their
feature, and replaced the stopwatch clip `task-due` with `tasks-bar`. The home page's tasks row was
rewritten from the README's Tasks section. That re-shoot did not review the rest of the copy, so the
commit covered above stays at a3137645.

Filmed but not on the site yet: `tasks-window` and `tasks-matrix` (raws in
`C:\Users\Public\deskbar-shoot\raw`). Add them when a docs page names them.

Pending: a full run from a3137645 (goals, the see-through bar, anything else since), and stills for
the docs pages with no clip, which needs `still:` support in `tools/build-docs`.
