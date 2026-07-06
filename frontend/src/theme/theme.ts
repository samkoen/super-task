import { alpha, createTheme } from "@mui/material/styles";

const primaryMain = "#0B7B6A";

export const theme = createTheme({
  direction: "rtl",
  typography: {
    fontFamily: '"Heebo", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  palette: {
    mode: "light",
    primary: {
      main: primaryMain,
      dark: "#065A4D",
      light: "#14A892",
      contrastText: "#ffffff",
    },
    success: { main: "#2E7D4F" },
    warning: { main: "#E67E22" },
    error: { main: "#C62828" },
    background: {
      default: "#F0F4F3",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A2332",
      secondary: "#5C6B7A",
    },
    divider: alpha("#1A2332", 0.08),
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          direction: "rtl",
          backgroundColor: "#F0F4F3",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, padding: "10px 20px", gap: 8 },
        startIcon: { margin: 0 },
        endIcon: { margin: 0 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha("#1A2332", 0.06)}`,
          boxShadow: "0 4px 20px rgba(26, 35, 50, 0.06)",
        },
      },
    },
  },
});

export const sidebarWidth = 268;

export const healthColors = {
  green: { main: "#2E7D4F", bg: "#e8f5e9" },
  orange: { main: "#E67E22", bg: "#fff3e0" },
  red: { main: "#C62828", bg: "#ffebee" },
};
