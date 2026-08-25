import { useCallback, useEffect } from "react";
import { PhotoCaptureDialog } from "../media/MediaCaptureActions";
import { useCameraStream } from "../../hooks/useCameraStream";
import { he } from "../../i18n/he";

function afterPaint(run: () => void) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
    return;
  }
  run();
}

interface EmployeeAvatarCaptureProps {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
}

export default function EmployeeAvatarCapture({
  open,
  uploading,
  onClose,
  onCapture,
}: EmployeeAvatarCaptureProps) {
  const camera = useCameraStream();

  useEffect(() => {
    if (!open) {
      camera.stop();
      return;
    }
    afterPaint(() => {
      void camera.start();
    });
    return () => camera.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = useCallback(() => {
    camera.stop();
    onClose();
  }, [camera, onClose]);

  return (
    <PhotoCaptureDialog
      open={open}
      uploading={uploading}
      camera={camera}
      onClose={handleClose}
      onCapture={onCapture}
      title={he.employeeChangePhoto}
    />
  );
}
