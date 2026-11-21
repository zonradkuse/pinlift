import { useEffect, useRef, useState } from 'preact/hooks';

type Detect = (v: HTMLVideoElement) => Promise<string[]>;

/** Native BarcodeDetector where available (Android/Chrome, macOS), otherwise jsQR (loaded on demand). */
async function makeDetector(): Promise<Detect> {
  const BD = (globalThis as { BarcodeDetector?: any }).BarcodeDetector;
  if (BD && (await BD.getSupportedFormats?.())?.includes('qr_code')) {
    const det = new BD({ formats: ['qr_code'] });
    return async (v) => (await det.detect(v)).map((r: { rawValue: string }) => r.rawValue);
  }
  const jsQR = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return async (v) => {
    const scale = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    return r ? [r.data] : [];
  };
}

/** Camera preview that calls onCode for every decoded QR payload (deduplicated per 1.5 s). */
export function Scanner({ onCode }: { onCode: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | undefined, stopped = false, timer = 0;
    const seen = new Map<string, number>();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const detect = await makeDetector();
        const loop = async () => {
          if (stopped) return;
          if (v.readyState >= 2) {
            try {
              for (const text of await detect(v)) {
                const now = Date.now();
                if ((seen.get(text) ?? 0) + 1500 < now) { seen.set(text, now); cb.current(text); }
              }
            } catch { /* frame not ready */ }
          }
          timer = window.setTimeout(loop, 60);
        };
        loop();
      } catch (e) {
        setError(e instanceof Error && e.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera access for this site in your browser settings.'
          : `Camera unavailable: ${e instanceof Error ? e.message : e}`);
      }
    })();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <>
      <video ref={video} playsInline muted />
      {!error && <div class="frame" aria-hidden="true" />}
      {error && <p role="alert" style={{ position: 'relative', zIndex: 1, padding: '24px', marginTop: '30vh', textAlign: 'center' }}>{error}</p>}
    </>
  );
}
