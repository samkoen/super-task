import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { isStaleChunkError } from "../../utils/staleChunkError";

type Props = { children: ReactNode };
type State = { error: Error | null };

function crashDetail(error: Error): string {
  return isStaleChunkError(error) ? he.pageCrashStaleChunk : error.message;
}

/** Empêche un crash de page d’effacer tout l’écran (sidebar comprise). */
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Box
        role="alert"
        py={4}
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
        textAlign="center"
      >
        <Typography variant="h6">{he.pageCrashTitle}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
          {crashDetail(this.state.error)}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          {he.pageCrashRetry}
        </Button>
      </Box>
    );
  }
}
