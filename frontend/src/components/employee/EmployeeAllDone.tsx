import { Box, Typography, alpha } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { he } from "../../i18n/he";
import { EMPLOYEE_CARD_RADIUS, employeeCardSx } from "../../styles/employeeUi";

const SUCCESS = "#15803D";

/** Plus rien à faire : un message simple et encourageant. */
export default function EmployeeAllDone() {
  return (
    <Box
      role="status"
      sx={{
        ...employeeCardSx,
        borderRadius: EMPLOYEE_CARD_RADIUS,
        textAlign: "center",
        px: 3,
        py: 5,
        mb: 2.5,
        bgcolor: alpha(SUCCESS, 0.05),
        borderColor: alpha(SUCCESS, 0.2),
      }}
    >
      <Box
        sx={{
          width: 88,
          height: 88,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          bgcolor: SUCCESS,
          boxShadow: `0 10px 24px ${alpha(SUCCESS, 0.35)}`,
        }}
      >
        <CheckRoundedIcon sx={{ fontSize: 56 }} />
      </Box>
      <Typography variant="h5" component="p" fontWeight={800} gutterBottom>
        {he.noTasksToday}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {he.employeeAllDoneHint}
      </Typography>
    </Box>
  );
}
