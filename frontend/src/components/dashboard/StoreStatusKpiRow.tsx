import { useState } from "react";
import { Alert, Grid, Snackbar } from "@mui/material";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import type { StoreKpis } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { resolveStoreKpis } from "../../utils/storeKpis";
import StoreStatusKpiCard from "./StoreStatusKpiCard";

interface StoreStatusKpiRowProps {
  storeKpis: StoreKpis | null | undefined;
}

export default function StoreStatusKpiRow({ storeKpis }: StoreStatusKpiRowProps) {
  const kpis = resolveStoreKpis(storeKpis);
  const [showSoon, setShowSoon] = useState(false);

  return (
    <>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <StoreStatusKpiCard
            title={he.dashboardKpiCleaning}
            approvalPct={kpis.cleaning.approval_pct}
            reportPct={kpis.cleaning.report_pct}
            approvalLabel={he.dashboardKpiApprovalLabel}
            reportLabel={he.dashboardKpiReportLabel}
            totalLabel={he.dashboardKpiTasksCount(kpis.cleaning.total)}
            icon={<CleaningServicesIcon />}
            accent="#0A6B5C"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StoreStatusKpiCard
            title={he.dashboardKpiFronts}
            approvalPct={kpis.fronts_signage.approval_pct}
            reportPct={kpis.fronts_signage.report_pct}
            approvalLabel={he.dashboardKpiApprovalLabel}
            reportLabel={he.dashboardKpiReportLabel}
            totalLabel={he.dashboardKpiTasksCount(kpis.fronts_signage.total)}
            icon={<ViewWeekIcon />}
            accent="#1565c0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StoreStatusKpiCard
            title={he.dashboardKpiGoals}
            approvalPct={0}
            reportPct={0}
            approvalLabel=""
            reportLabel=""
            totalLabel={he.dashboardKpiUnderConstructionShort}
            icon={<TrendingUpIcon />}
            accent="#757575"
            disabled
            onClick={() => setShowSoon(true)}
          />
        </Grid>
      </Grid>

      <Snackbar
        open={showSoon}
        autoHideDuration={4000}
        onClose={() => setShowSoon(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" onClose={() => setShowSoon(false)} variant="filled">
          {he.dashboardKpiUnderConstruction}
        </Alert>
      </Snackbar>
    </>
  );
}
