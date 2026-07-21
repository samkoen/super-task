import { useCallback, useEffect } from "react";
import { PhotoCaptureDialog } from "../media/MediaCaptureActions";
import { useCameraStream } from "../../hooks/useCameraStream";
import { he } from "../../i18n/he";

function scheduleAfterDialogPaint(run: () => void) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
    return;
  }
  run();
}

interface NewTaskPhotoStepProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onPhoto: (file: File) => void;
}

/** Étape caméra optionnelle (+ annotation) avant le formulaire nouvelle tâche. */
export default function NewTaskPhotoStep({
  open,
  onClose,
  onSkip,
  onPhoto,
}: NewTaskPhotoStepProps) {
  const camera = useCameraStream();

  useEffect(() => {
    if (!open) {
      camera.stop();
      return;
    }
    scheduleAfterDialogPaint(() => {
      void camera.start();
    });
    return () => camera.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start/stop stables via hook
  }, [open]);

  const handleClose = useCallback(() => {
    camera.stop();
    onClose();
  }, [camera, onClose]);

  const handleSkip = useCallback(() => {
    camera.stop();
    onSkip();
  }, [camera, onSkip]);

  return (
    <PhotoCaptureDialog
      open={open}
      uploading={false}
      camera={camera}
      onClose={handleClose}
      onSkip={handleSkip}
      onCapture={onPhoto}
      title={he.newTask}
    />
  );
}

/** Hint exporté pour tests / éventuel bandeau. */
export function newTaskPhotoStepHint(): string {
  return he.newTaskPhotoStepHint;
}
