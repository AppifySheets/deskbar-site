"""
find-offset.py: find where a trimmed web clip starts inside its raw recording.

encode.ps1 trims each raw (raw\<name>.mkv) into out\<name>.mp4, but the trim point is not
written anywhere unless the shoot notes give it. To cut a site version (a crop, a different
size) from the lossless raw instead of re-encoding the lossy mp4, you need that start time.

This compares the first 3 seconds of the mp4 with every 0.1 s offset in the first 8 seconds of
the raw, both reduced to small grey frames, and prints the offset with the smallest difference.
An error under about 1.0 is a confident match.

Usage (run from the shoot folder, e.g. C:\\Users\\Public\\deskbar-shoot):
    python -I find-offset.py switch quick-find tiling-drop
Prints, per clip:  name  offset <seconds>  dur <seconds of the mp4>  err <mean abs difference>
"""
import subprocess
import sys

import numpy as np


def frames(path, start, dur, fps, w=320, h=180):
    """Decode a span of a video into an array of small greyscale frames."""
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur), '-i', path,
           '-vf', f'fps={fps},scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    raw = subprocess.run(cmd, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(int)


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return float(out)


for name in sys.argv[1:]:
    clip = frames(f'out/{name}.mp4', 0, 3, 10)   # the first 3 s of the trimmed clip
    raw = frames(f'raw/{name}.mkv', 0, 8, 10)    # the first 8 s of the untrimmed raw
    best = min(range(len(raw) - len(clip) + 1),
               key=lambda o: np.abs(raw[o:o + len(clip)] - clip).mean())
    err = np.abs(raw[best:best + len(clip)] - clip).mean()
    print(name, 'offset', best / 10, 'dur', duration(f'out/{name}.mp4'), 'err', round(err, 2))
