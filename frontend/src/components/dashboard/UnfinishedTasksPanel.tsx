import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import type { UnfinishedTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { dueDateIso, formatDueAt } from "../../utils/dateView";

export interface UnfinishedTasksPanelProps {
  tasks: UnfinishedTask[];
}

export default function UnfinishedTasksPanel({ tasks }: UnfinishedTasksPanelProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, open) => setExpanded(open)}
      sx={{ mb: 3, boxShadow: 0, border: 1, borderColor: "divider", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" width="100%" pr={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            {he.dashboardUnfinished}
          </Typography>
          <Chip
            size="small"
            label={tasks.length}
            color={tasks.length > 0 ? "error" : "default"}
            variant={tasks.length > 0 ? "filled" : "outlined"}
          />
          {tasks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {he.dashboardUnfinishedEmpty}
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        {tasks.length > 0 && (
          <>
            <Box display="flex" justifyContent="flex-end" mb={1.5}>
              <Button size="small" variant="outlined" onClick={() => navigate("/manager/tasks")}>
                {he.dashboardGoToTasks}
              </Button>
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{he.taskTitle}</TableCell>
                    <TableCell>{he.roleEmployee}</TableCell>
                    <TableCell>{he.department}</TableCell>
                    <TableCell>{he.dashboardDueAt}</TableCell>
                    <TableCell>{he.status}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.occurrence_id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{task.title}</Typography>
                      </TableCell>
                      <TableCell>{task.assignee_name || "—"}</TableCell>
                      <TableCell>{task.department_name || he.noDepartment}</TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{formatDueAt(task.due_at)}</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {dueDateIso(task.due_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {task.overdue_days > 0 ? (
                          <Chip
                            label={he.dashboardOverdueDays(task.overdue_days)}
                            size="small"
                            color="error"
                          />
                        ) : (
                          <Chip label={he.taskStatusLabels.overdue} size="small" color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
