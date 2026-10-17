import { useRef, useState } from "react";
import { Button, Typography } from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { he } from "../../i18n/he";
import { referenceFileKind } from "../../utils/referenceMediaFile";

/** « תמונה מקובץ » : choisit une image existante comme exemple, sans passer par la caméra. */
export default function ExampleFileButton({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/*"
        data-testid="example-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (referenceFileKind(file) !== "photo") {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onPick(file);
        }}
      />
      <Button
        variant="outlined"
        startIcon={<ImageOutlinedIcon />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {he.completionSlotExampleFromFile}
      </Button>
      {invalid ? (
        <Typography variant="caption" color="error" sx={{ flexBasis: "100%" }}>
          {he.referencePhotoFileInvalid}
        </Typography>
      ) : null}
    </>
  );
}
