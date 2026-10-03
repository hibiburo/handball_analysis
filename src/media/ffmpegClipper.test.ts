import { describe, expect, it } from 'vitest';
import { buildClipArgs, isHevcFromLog } from './ffmpegClipper';

describe('buildClipArgs', () => {
  it('開始・長さを指定し、再エンコードせずに MP4 に切り抜く引数を作る', () => {
    expect(buildClipArgs('/input/match.mp4', { start: 96.3, duration: 7 }, false)).toEqual([
      '-ss',
      '96.3',
      '-i',
      '/input/match.mp4',
      '-t',
      '7.0',
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c',
      'copy',
      '-avoid_negative_ts',
      'make_zero',
      '-movflags',
      '+faststart',
      '-sn',
      '-dn',
      '-y',
      'clip.mp4',
    ]);
  });

  it('HEVC の映像には hvc1 のタグを付ける（iPhone で再生できるように）', () => {
    const args = buildClipArgs('/input/a.mov', { start: 0, duration: 5.5 }, true);
    expect(args).toContain('hvc1');
    expect(args[args.indexOf('-tag:v') + 1]).toBe('hvc1');
  });
});

describe('isHevcFromLog', () => {
  it('ffmpeg の入力情報のログから映像のコーデックを判定する', () => {
    expect(isHevcFromLog('  Stream #0:0[0x1](und): Video: hevc (Main) (hvc1 / 0x31637668), yuv420p')).toBe(true);
    expect(isHevcFromLog('  Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p')).toBe(false);
    expect(isHevcFromLog('  Stream #0:1(und): Audio: aac (LC)')).toBe(false);
  });
});
