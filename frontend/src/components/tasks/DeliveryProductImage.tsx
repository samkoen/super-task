import { useState } from "react";
import { Box } from "@mui/material";

/** Photo du produit (masquée si l'image ne charge pas). */
export default function DeliveryProductImage({ url, size = 56 }: { url?: string | null; size?: number }) {
  const [hidden, setHidden] = useState(false);
  if (!url || hidden) return null;
  return (
    <Box
      component="img"
      src={url}
      alt=""
      onError={() => setHidden(true)}
      sx={{ width: size, height: size, objectFit: "contain", flexShrink: 0, borderRadius: "10px", bgcolor: "action.hover" }}
    />
  );
}
