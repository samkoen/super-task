import { useState, type ReactNode } from "react";
import { Alert, Box, Snackbar } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import type { StoreCategoryKpi, StoreKpis } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { remainingCount, resolveStoreKpis } from "../../utils/storeKpis";
import StoreStatusKpiCard from "./StoreStatusKpiCard";

interface StoreStatusKpiRowProps {
  storeKpis: StoreKpis | null | undefined;
}

function KpiSlide({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minWidth: 260,
        maxWidth: 280,
        width: "78%",
        flex: "0 0 auto",
        scrollSnapAlign: "start",
      }}
    >
      {children}
    </Box>
  );
}

function categoryCard(
  title: string,
  kpi: StoreCategoryKpi,
  icon: ReactNode,
  accent: string,
) {
  return (
    <StoreStatusKpiCard
      title={title}
      approvalPct={kpi.approval_pct}
      reportPct={kpi.report_pct}
      approvalLabel={he.dashboardKpiApprovalLabel}
      reportLabel={he.dashboardKpiReportLabel}
      totalLabel={he.dashboardKpiTasksCount(kpi.total)}
      icon={icon}
      accent={accent}
    />
  );
}

export default function StoreStatusKpiRow({ storeKpis }: StoreStatusKpiRowProps) {
  const kpis = resolveStoreKpis(storeKpis);
  const [showSoon, setShowSoon] = useState(false);
  const generalRemaining = remainingCount(kpis.general);
  const generalOpenPct =
    typeof kpis.general.open_pct === "number"
      ? kpis.general.open_pct
      : kpis.general.total > 0
        ? Math.round((generalRemaining * 100) / kpis.general.total)
        : 0;

  return (
    <>
      <Box
        mb={3}
        sx={{
          display: "flex",
          gap: 1.5,
          overflowX: "auto",
          pb: 1,
          mx: -0.5,
          px: 0.5,
          scrollSnapType: "x mandatory",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "action.disabled",
            borderRadius: 3,
          },
        }}
      >
        <KpiSlide>
          <StoreStatusKpiCard
            title={he.dashboardKpiGeneral}
            approvalPct={generalOpenPct}
            reportPct={kpis.general.approval_pct}
            approvalLabel={he.dashboardKpiRemainingLabel}
            reportLabel={he.dashboardKpiCompletedLabel}
            totalLabel={he.dashboardKpiRemainingCount(generalRemaining)}
            icon={<AssessmentIcon />}
            accent="#5e35b1"
          />
        </KpiSlide>
        <KpiSlide>
          {categoryCard(
            he.dashboardKpiCleaning,
            kpis.cleaning,
            <CleaningServicesIcon />,
            "#0A6B5C",
          )}
        </KpiSlide>
        <KpiSlide>
          {categoryCard(
            he.dashboardKpiFronts,
            kpis.fronts_signage,
            <ViewWeekIcon />,
            "#1565c0",
          )}
        </KpiSlide>
        <KpiSlide>
          {categoryCard(
            he.dashboardKpiOrders,
            kpis.orders,
            <ShoppingCartIcon />,
            "#ef6c00",
          )}
        </KpiSlide>
        <KpiSlide>
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
        </KpiSlide>
      </Box>

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
