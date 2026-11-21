import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encode } from 'uqr';

const W = 640, H = 480;

/** Writes a Y4M video (Chromium's fake camera input) that shows each payload as a QR code for `framesPer` frames. */
export function writeQrVideo(path: string, payloads: string[], framesPer = 3) {
  const chunks: Buffer[] = [Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`)];
  const chroma = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  for (const text of payloads) {
    const { data, size } = encode(text, { ecc: 'M', border: 4 });
    const scale = Math.floor(H / size);
    const off = [Math.floor((W - size * scale) / 2), Math.floor((H - size * scale) / 2)];
    const y = Buffer.alloc(W * H, 235);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (!data[r][c]) continue;
      for (let dy = 0; dy < scale; dy++) y.fill(16, (off[1] + r * scale + dy) * W + off[0] + c * scale, (off[1] + r * scale + dy) * W + off[0] + (c + 1) * scale);
    }
    for (let i = 0; i < framesPer; i++) chunks.push(Buffer.from('FRAME\n'), y, chroma);
  }
  writeFileSync(path, Buffer.concat(chunks));
}

export const cameraArgs = (video: string) => [
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`,
];

/** Launch options for a browser whose camera shows the given QR payloads (one video file per worker process). */
export function fakeCamera(name: string, payloads: string[]) {
  // Per worker: rewriting a file another browser is reading breaks its camera.
  const video = join(tmpdir(), `pinlift-${name}-${process.pid}.y4m`);
  writeQrVideo(video, payloads);
  return { launchOptions: { args: cameraArgs(video) } };
}
