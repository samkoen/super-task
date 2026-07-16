import { alpha, createTheme } from "@mui/material/styles";

/** Deep teal — retail ops brand */
const primaryMain = "#0A6B5C";
const ink = "#0F172A";
const muted = "#64748B";
const surface = "#F5F7F6";
const paper = "#FFFFFF";

export const theme = createTheme({
  direction: "rtl",
  typography: {
    fontFamily: '"Heebo", "Segoe UI", "Arial", sans-serif',
    fontSize: 14,
    h3: { fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 },
    h4: { fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.25 },
    h5: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3 },
    h6: { fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.35 },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600, letterSpacing: "-0.01em" },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55, color: muted },
    overline: {
      fontWeight: 700,
      letterSpacing: "0.08em",
      fontSize: "0.7rem",
    },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "-0.01em" },
  },
  palette: {
    mode: "light",
    primary: {
      main: primaryMain,
      dark: "#064C42",
      light: "#1A9B86",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#1E293B",
      light: "#334155",
      dark: "#0F172A",
      contrastText: "#ffffff",
    },
    success: { main: "#15803D", light: "#22C55E", dark: "#166534" },
    warning: { main: "#D97706", light: "#F59E0B", dark: "#B45309" },
    error: { main: "#DC2626", light: "#EF4444", dark: "#B91C1C" },
    info: { main: "#0284C7", light: "#38BDF8", dark: "#0369A1" },
    background: {
      default: surface,
      paper,
    },
    text: {
      primary: ink,
      secondary: muted,
    },
    divider: alpha(ink, 0.08),
    action: {
      hover: alpha(primaryMain, 0.06),
      selected: alpha(primaryMain, 0.1),
    },
  },
  shape: { borderRadius: 14 },
  shadows: [
    "none",
    "0 1px 2px rgba(15, 23, 42, 0.04)",
    "0 2px 8px rgba(15, 23, 42, 0.06)",
    "0 4px 16px rgba(15, 23, 42, 0.07)",
    "0 8px 24px rgba(15, 23, 42, 0.08)",
    "0 12px 32px rgba(15, 23, 42, 0.1)",
    "0 16px 40px rgba(15, 23, 42, 0.12)",
    "0 20px 48px rgba(15, 23, 42, 0.12)",
    "0 24px 56px rgba(15, 23, 42, 0.14)",
    "0 28px 64px rgba(15, 23, 42, 0.14)",
    "0 32px 72px rgba(15, 23, 42, 0.16)",
    "0 36px 80px rgba(15, 23, 42, 0.16)",
    "0 40px 88px rgba(15, 23, 42, 0.18)",
    "0 44px 96px rgba(15, 23, 42, 0.18)",
    "0 48px 104px rgba(15, 23, 42, 0.2)",
    "0 52px 112px rgba(15, 23, 42, 0.2)",
    "0 56px 120px rgba(15, 23, 42, 0.22)",
    "0 60px 128px rgba(15, 23, 42, 0.22)",
    "0 64px 136px rgba(15, 23, 42, 0.24)",
    "0 68px 144px rgba(15, 23, 42, 0.24)",
    "0 72px 152px rgba(15, 23, 42, 0.26)",
    "0 76px 160px rgba(15, 23, 42, 0.26)",
    "0 80px 168px rgba(15, 23, 42, 0.28)",
    "0 84px 176px rgba(15, 23, 42, 0.28)",
    "0 88px 184px rgba(15, 23, 42, 0.3)",
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          direction: "rtl",
          backgroundColor: surface,
          backgroundImage:
            "radial-gradient(ellipse 120% 80% at 100% 0%, rgba(10, 107, 92, 0.06) 0%, transparent 55%)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: alpha(ink, 0.18),
          borderRadius: 8,
        },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 11,
          padding: "10px 20px",
          gap: 8,
          transition: "background-color 0.15s, box-shadow 0.15s, transform 0.12s",
        },
        containedPrimary: {
          boxShadow: `0 2px 8px ${alpha(primaryMain, 0.28)}`,
          "&:hover": {
            boxShadow: `0 4px 14px ${alpha(primaryMain, 0.35)}`,
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: alpha(ink, 0.14),
          "&:hover": { borderColor: alpha(primaryMain, 0.4), bgcolor: alpha(primaryMain, 0.04) },
        },
        startIcon: { margin: 0 },
        endIcon: { margin: 0 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: "background-color 0.15s",
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha(ink, 0.07)}`,
          boxShadow: `0 1px 2px ${alpha(ink, 0.03)}, 0 8px 24px ${alpha(ink, 0.04)}`,
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: {
          borderColor: alpha(ink, 0.08),
          borderRadius: 14,
        },
        elevation1: {
          boxShadow: `0 1px 2px ${alpha(ink, 0.04)}, 0 4px 16px ${alpha(ink, 0.05)}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${alpha(ink, 0.06)}`,
          boxShadow: `0 24px 64px ${alpha(ink, 0.18)}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: "1.15rem",
          letterSpacing: "-0.02em",
          paddingBottom: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "medium" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha(paper, 0.9),
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(ink, 0.22),
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(primaryMain, 0.14)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1.5,
          },
        },
        notchedOutline: {
          borderColor: alpha(ink, 0.12),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        filled: {
          border: `1px solid ${alpha(ink, 0.06)}`,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: muted,
            backgroundColor: alpha(ink, 0.02),
            borderBottom: `1px solid ${alpha(ink, 0.08)}`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: alpha(ink, 0.06),
          paddingTop: 14,
          paddingBottom: 14,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 0.12s",
          "&:hover": { backgroundColor: alpha(primaryMain, 0.03) },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: "background-color 0.15s, transform 0.12s",
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: `0 4px 16px ${alpha(primaryMain, 0.35)}`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${alpha(ink, 0.06)}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: "0.75rem",
          bgcolor: ink,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 8,
          backgroundColor: alpha(ink, 0.08),
        },
        bar: { borderRadius: 999 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          borderColor: alpha(ink, 0.12),
          "&.Mui-selected": {
            bgcolor: alpha(primaryMain, 0.12),
            color: primaryMain,
            borderColor: alpha(primaryMain, 0.35),
            "&:hover": { bgcolor: alpha(primaryMain, 0.18) },
          },
        },
      },
    },
  },
});

export const sidebarWidth = 272;

export const healthColors = {
  green: { main: "#15803D", bg: "#ecfdf5" },
  orange: { main: "#D97706", bg: "#fffbeb" },
  red: { main: "#DC2626", bg: "#fef2f2" },
};
