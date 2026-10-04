import { useRef, useState, type RefObject } from "react";
import { Box, Button, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { capturePausedVideoFrame } from "../../utils/videoPoster";

export default function MarkVideoFrameButton({
  videoRef,
  onMarkFrame,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  onMarkFrame: (frameUrl: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const mark = async () => {
    const frame = await pausedFrameUrl(videoRef.current);
    if (!frame) {
      setFailed(true);
      return;
    }
    setFailed(false);
    onMarkFrame(frame);
  };
  return (
    <Box sx={{ mt: 1 }}>
      <Button size="small" variant="outlined" onClick={() => void mark()} sx={{ minHeight: 36 }}>
        {he.reviewMarkVideoFrame}
      </Button>
      <Typography variant="caption" color={failed ? "error" : "text.secondary"} display="block" mt={0.5}>
        {failed ? he.reviewMarkVideoFailed : he.reviewMarkVideoHint}
      </Typography>
    </Box>
  );
}

async function pausedFrameUrl(video: HTMLVideoElement | null): Promise<string | null> {
  if (!video) return null;
  try {
    const blob = await capturePausedVideoFrame(video);
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export function ReviewableVideo({
  src,
  onMarkFrame,
  autoPlay = false,
  maxHeight = 480,
}: {
  src: string;
  onMarkFrame?: (frameUrl: string) => void;
  autoPlay?: boolean;
  maxHeight?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <Box>
      <video
        ref={videoRef}
        src={src}
        controls
        autoPlay={autoPlay}
        playsInline
        style={{ width: "100%", maxHeight, borderRadius: 8, display: "block", background: "#000" }}
      />
      {onMarkFrame ? <MarkVideoFrameButton videoRef={videoRef} onMarkFrame={onMarkFrame} /> : null}
    </Box>
  );
}
