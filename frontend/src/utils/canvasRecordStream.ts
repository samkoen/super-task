export function startCanvasRecordStream(
  video: HTMLVideoElement,
  audioFrom: MediaStream,
): { stream: MediaStream; stop: () => void } | null {
  const canvas = document.createElement("canvas");
  if (typeof canvas.captureStream !== "function") return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  sizeCanvasToVideo(canvas, video);
  let frame = 0;
  const draw = () => {
    sizeCanvasToVideo(canvas, video);
    if (video.videoWidth > 0) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frame = requestAnimationFrame(draw);
  };
  draw();
  const stream = canvas.captureStream(30);
  for (const track of audioFrom.getAudioTracks()) {
    stream.addTrack(track);
  }
  return {
    stream,
    stop: () => cancelAnimationFrame(frame),
  };
}

function sizeCanvasToVideo(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  const width = Math.max(2, video.videoWidth || 640);
  const height = Math.max(2, video.videoHeight || 480);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}
