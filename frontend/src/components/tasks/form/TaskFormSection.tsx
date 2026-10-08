import type { ReactNode } from "react";
import { Box } from "@mui/material";
import SectionHeading from "../../ui/SectionHeading";

/** Un bloc du formulaire de tâche : titre à barre d'accent, puis les champs espacés. */
export default function TaskFormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box component="section" aria-label={title} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SectionHeading title={title} mb={0} />
      {children}
    </Box>
  );
}
