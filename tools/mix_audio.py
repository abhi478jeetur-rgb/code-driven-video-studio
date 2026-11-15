#!/usr/bin/env python3
"""Audio EDL -> one ffmpeg command (sample-accurate delays, sidechain ducking, EBU R128 loudness).
Usage: python3 mix_audio.py edl.json video_silent.mp4 final.mp4 [--dry]
edl.json: {"sampleRate":48000,"targetLUFS":-14,"bgm":{"src":"bgm.wav","gainDb":-6,"duckAgainst":"voiceover"},
           "voiceover":{"src":"vo.wav","startMs":300,"gainDb":0},"events":[{"src":"whoosh.wav","startMs":0,"gainDb":-3}]}"""
import json, sys, subprocess, shlex
E = json.load(open(sys.argv[1])); vid, out = sys.argv[2], sys.argv[3]; sr = E.get('sampleRate', 48000)
ins, fl, mix = ['-i', vid], [], []; n = 1
def add(src): global n; ins.extend(['-i', src]); n += 1; return n - 1
def prep(i, ms, db): return f"[{i}:a]aresample={sr},aformat=channel_layouts=stereo,adelay=delays={int(ms)}:all=1,volume={db}dB"
vo = E.get('voiceover'); bgm = E.get('bgm')
if vo:
    i = add(vo['src']); duck = bgm and bgm.get('duckAgainst') == 'voiceover'
    fl.append(prep(i, vo.get('startMs', 0), vo.get('gainDb', 0)) + ('[vo_raw];[vo_raw]asplit=2[vo_sc][vo]' if duck else '[vo]')); mix.append('[vo]')
if bgm:
    i = add(bgm['src']); fl.append(prep(i, bgm.get('startMs', 0), bgm.get('gainDb', -6)) + '[bgm0]')
    if vo and bgm.get('duckAgainst') == 'voiceover': fl.append('[bgm0][vo_sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[bgm]'); mix.append('[bgm]')
    else: mix.append('[bgm0]')
for k, ev in enumerate(E.get('events', [])):
    i = add(ev['src']); fl.append(prep(i, ev.get('startMs', 0), ev.get('gainDb', 0)) + f'[e{k}]'); mix.append(f'[e{k}]')
if not mix: sys.exit('EDL has no audio')
fl.append(''.join(mix) + f"amix=inputs={len(mix)}:normalize=0:duration=longest,loudnorm=I={E.get('targetLUFS', -14)}:TP=-1.0:LRA=11,aresample={sr}[aout]")
cmd = ['ffmpeg', '-y'] + ins + ['-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', out]
print(' '.join(shlex.quote(c) for c in cmd))
if '--dry' not in sys.argv: sys.exit(subprocess.run(cmd).returncode)
