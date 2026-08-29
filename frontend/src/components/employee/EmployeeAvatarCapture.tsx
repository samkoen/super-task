import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoCaptureDialog } from "../media/MediaCaptureActions";
import { useCameraStream } from "../../hooks/useCameraStream";
import { he } from "../../i18n/he";
import AvatarCropDialog from "./AvatarCropDialog";

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
  uploadingLabel?: string;
}

export default function EmployeeAvatarCapture({
  open,
  uploading,
  onClose,
  onCapture,
  uploadingLabel,
}: EmployeeAvatarCaptureProps) {
  const camera = useCameraStream({ defaultFacing: "user" });
  const [cropFile, setCropFile] = useState<File | null>(null);
  const skipParentClose = useRef(false);

  useEffect(() => {
    if (!open || cropFile) {
      camera.stop();
      return;
    }
    afterPaint(() => {
      void camera.start();
    });
    return () => camera.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cropFile]);

  const handlePhotoDialogClose = useCallback(() => {
    camera.stop();
    if (skipParentClose.current) {
      skipParentClose.current = false;
      return;
    }
    onClose();
  }, [camera, onClose]);

  const handlePhotoTaken = useCallback((file: File) => {
    skipParentClose.current = true;
    setCropFile(file);
  }, []);

  const handleCropClose = useCallback(() => {
    setCropFile(null);
    onClose();
  }, [onClose]);

  const handleCropConfirm = useCallback(
    async (file: File) => {
      await onCapture(file);
      setCropFile(null);
    },
    [onCapture],
  );

  return (
    <>
      <PhotoCaptureDialog
        open={open && !cropFile}
        uploading={false}
        camera={camera}
        onClose={handlePhotoDialogClose}
        onCapture={handlePhotoTaken}
        title={he.employeeChangePhoto}
        annotate={false}
      />
      <AvatarCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        uploading={uploading}
        busyLabel={uploadingLabel}
        onClose={handleCropClose}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
