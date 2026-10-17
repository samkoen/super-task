import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";
import type { AgrolineOrderPdf } from "../../utils/deliveryNote";
import DeliveryPdfButton from "./DeliveryPdfButton";

type Props = {
  occurrenceId: string;
  disabled?: boolean;
};

/** Tâche קריאת הזמנות : le clic lit Agroline et montre les PDF. */
export default function OrderRead({ occurrenceId, disabled = false }: Props) {
  const [orders, setOrders] = useState<AgrolineOrderPdf[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    loadOrders(occurrenceId).then((result) => {
      if (cancelled) return;
      if (result === "error") setLoadFailed(true);
      else setOrders(result);
    });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId, attempt]);

  if (loadFailed) return <LoadError onRetry={() => setAttempt(attempt + 1)} />;
  if (!orders) return null;
  return <OrderPanel occurrenceId={occurrenceId} orders={orders} disabled={disabled} onRead={setOrders} />;
}

async function loadOrders(occurrenceId: string): Promise<AgrolineOrderPdf[] | null | "error"> {
  try {
    const view = await deliveryNoteService.ordersForOccurrence(occurrenceId);
    return view.orders;
  } catch (err) {
    return err instanceof ApiError && err.status === 404 ? null : "error";
  }
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" onClick={onRetry} sx={{ fontWeight: 800, minHeight: 44 }}>
          {he.mediaCaptureRetry}
        </Button>
      }
    >
      {he.deliveryNoteLoadFailed}
    </Alert>
  );
}

function OrderPanel({
  occurrenceId,
  orders,
  disabled,
  onRead,
}: {
  occurrenceId: string;
  orders: AgrolineOrderPdf[];
  disabled: boolean;
  onRead: (orders: AgrolineOrderPdf[]) => void;
}) {
  const [reading, setReading] = useState(false);
  const [looked, setLooked] = useState(false);
  const [error, setError] = useState("");
  const read = async () => {
    const next = await readOrders(occurrenceId, setReading, setError);
    if (!next) return;
    setLooked(true);
    onRead(next);
  };
  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {orders.map((order) => (
        <OrderPdf key={order.agroline_number} order={order} />
      ))}
      {looked && !orders.length ? <Typography color="text.secondary">{he.orderReadEmpty}</Typography> : null}
      {!looked && !orders.length ? <Typography color="text.secondary">{he.orderReadHint}</Typography> : null}
      {error ? <Typography color="error">{error}</Typography> : null}
      <Button variant="contained" disabled={disabled || reading} onClick={() => void read()} sx={employeePrimaryButtonSx}>
        {reading ? <CircularProgress size={24} color="inherit" /> : he.orderReadButton}
      </Button>
    </Box>
  );
}

function OrderPdf({ order }: { order: AgrolineOrderPdf }) {
  const label = `${he.orderReadPdf} ${order.agroline_number}`;
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
      <Typography fontWeight={800}>{order.customer_name || label}</Typography>
      {order.pdf_url ? <DeliveryPdfButton url={order.pdf_url} label={label} /> : <Typography>{he.orderReadNoPdf}</Typography>}
    </Box>
  );
}

async function readOrders(
  occurrenceId: string,
  setReading: (value: boolean) => void,
  setError: (value: string) => void,
): Promise<AgrolineOrderPdf[] | null> {
  setReading(true);
  setError("");
  try {
    const next = await deliveryNoteService.readOrders(occurrenceId);
    if (next.errors.length) setError(next.errors.map((item) => item.error).join(" · "));
    return next.orders;
  } catch (err) {
    setError(err instanceof ApiError ? err.message : he.errorGeneric);
    return null;
  } finally {
    setReading(false);
  }
}
