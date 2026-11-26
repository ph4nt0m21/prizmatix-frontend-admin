import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiExternalLink, FiPlus, FiX } from "react-icons/fi";
import styles from "./refundsPage.module.scss";
import {
  GetAdminRefundsAPI,
  ProcessRefundAPI,
  LookupOrderForRefundAPI,
  RecordStripeRefundAPI,
} from "../../services/allApis";
import { formatRefundMoney } from "../../utils/refundUtil";

const FILTERS = [
  { key: "TODO", label: "To process", statuses: ["APPROVED"] },
  { key: "PROCESSING", label: "Processing", statuses: ["PROCESSING"] },
  { key: "FAILED", label: "Failed", statuses: ["FAILED"] },
  { key: "REFUNDED", label: "Refunded", statuses: ["REFUNDED"] },
  { key: "WAITING", label: "With organiser", statuses: ["REQUESTED"] },
  { key: "CLOSED", label: "Declined", statuses: ["DECLINED", "WITHDRAWN"] },
];

const STATUS_LABEL = {
  REQUESTED: "With organiser",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const emptyRecord = { orderId: "", order: null, ticketIds: [], stripeRefundId: "" };

/** Super admin: send organiser-approved refunds to Stripe and follow them through. */
const RefundsPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("TODO");
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [record, setRecord] = useState(null);
  const [recordError, setRecordError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await GetAdminRefundsAPI();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(errorMessage(err, "Could not load refunds."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, rows.filter((r) => f.statuses.includes(r.request.status)).length])),
    [rows]
  );

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter);
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!active.statuses.includes(r.request.status)) return false;
      if (!q) return true;
      return [r.request.customerName, r.request.customerEmail, r.eventName, r.organizationName, String(r.request.orderId), r.stripeRefundId]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  const process = async (row) => {
    const id = row.request.id;
    setBusyId(id);
    try {
      const res = await ProcessRefundAPI(id);
      const status = res.data?.request?.status;
      if (status === "REFUNDED") toast.success(`${formatRefundMoney(row.request.refundAmount)} refunded for order #${row.request.orderId}.`);
      else if (status === "FAILED") toast.error(res.data.failureReason || "Stripe refused the refund.");
      else toast.info(res.data?.failureReason || "Stripe is still processing this refund.");
      setConfirming(null);
    } catch (err) {
      // The reply may be lost after Stripe acted; the list shows the real state.
      toast.error(errorMessage(err, "No reply received. Check the Processing list before trying again."));
      setConfirming(null);
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const closeRecord = () => {
    if (!isRecording) setRecord(null);
  };

  const findOrder = async () => {
    setRecordError(null);
    setIsRecording(true);
    try {
      const res = await LookupOrderForRefundAPI(record.orderId.trim().replace("#", ""));
      const refundable = res.data.tickets.filter((t) => !t.refunded && Number(t.amount) > 0);
      setRecord((prev) => ({ ...prev, order: res.data, ticketIds: refundable.map((t) => t.ticketId) }));
    } catch (err) {
      setRecordError(errorMessage(err, "Could not find that order."));
    } finally {
      setIsRecording(false);
    }
  };

  const saveRecord = async () => {
    setRecordError(null);
    setIsRecording(true);
    try {
      await RecordStripeRefundAPI({
        orderId: record.order.orderId,
        stripeRefundId: record.stripeRefundId.trim(),
        ticketIds: record.ticketIds,
      });
      toast.success(`Refund recorded on order #${record.order.orderId}.`);
      setRecord(null);
      await load();
    } catch (err) {
      setRecordError(errorMessage(err, "Could not record the refund."));
    } finally {
      setIsRecording(false);
    }
  };

  const toggleTicket = (id) =>
    setRecord((prev) => ({
      ...prev,
      ticketIds: prev.ticketIds.includes(id) ? prev.ticketIds.filter((t) => t !== id) : [...prev.ticketIds, id],
    }));

  const recordTotal = record?.order
    ? record.order.tickets.filter((t) => record.ticketIds.includes(t.ticketId)).reduce((sum, t) => sum + Number(t.amount || 0), 0)
    : 0;

  const renderAction = (row) => {
    const { status, id, refundAmount } = row.request;
    const busy = busyId === id;
    if (status === "APPROVED" || status === "FAILED") {
      return (
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!!row.problem || busyId !== null}
          onClick={() => setConfirming(row)}
        >
          {status === "FAILED" ? "Retry refund" : "Refund"} {formatRefundMoney(refundAmount)}
        </button>
      );
    }
    if (status === "PROCESSING") {
      return (
        <button type="button" className={styles.secondaryButton} disabled={busyId !== null} onClick={() => process(row)}>
          {busy ? "Checking…" : "Check with Stripe"}
        </button>
      );
    }
    return null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Refunds</h1>
          <p className={styles.subtitle}>Refunds approved by organisers. Only ticket value is refunded; the booking fee is kept.</p>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setRecord(emptyRecord);
            setRecordError(null);
          }}
        >
          <FiPlus aria-hidden="true" /> Record a Stripe refund
        </button>
      </div>

      <div className={styles.tabs} role="group" aria-label="Filter refunds">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            className={`${styles.tab} ${filter === f.key ? styles.tabActive : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <input
        className={styles.search}
        aria-label="Search refunds"
        placeholder="Search customer, event, organisation, order or Stripe refund ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading ? (
        <p className={styles.muted}>Loading…</p>
      ) : error ? (
        <p className={styles.errorText} role="alert">{error}</p>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>Nothing here.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Event</th>
                <th>Tickets</th>
                <th>Payment</th>
                <th>Status</th>
                <th className={styles.numeric}>Refund</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const r = row.request;
                return (
                  <tr key={r.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.inlineLink}
                        onClick={() => navigate(`/events/manage/${row.eventId}/ordersAndAttendees`)}
                      >
                        #{r.orderId}
                      </button>
                      <div className={styles.strong}>{r.customerName}</div>
                      <div className={styles.small}>{r.customerEmail}</div>
                    </td>
                    <td>
                      <div>{row.eventName || "—"}</div>
                      <div className={styles.small}>{row.organizationName}</div>
                    </td>
                    <td>
                      <div>{r.wholeOrder ? "Whole order" : `${r.tickets.length} of ${r.orderTicketCount}`}</div>
                      {r.tickets.map((t) => (
                        <div key={t.ticketId} className={styles.small}>
                          {t.attendeeName ? `${t.attendeeName} · ` : ""}{t.ticketType} · {formatRefundMoney(t.amount)}
                        </div>
                      ))}
                      <div className={styles.reason}>“{r.reason}”</div>
                    </td>
                    <td>
                      <div>{formatRefundMoney(r.originalPayment)} paid</div>
                      <div className={styles.small}>{formatRefundMoney(r.serviceFee)} booking fee kept</div>
                      <div className={styles.small}>{row.paymentMethod}</div>
                      {row.stripePaymentIntentId && (
                        <a
                          className={styles.inlineLink}
                          href={`https://dashboard.stripe.com/payments/${row.stripePaymentIntentId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Stripe <FiExternalLink aria-hidden="true" />
                        </a>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[`status_${r.status}`] || ""}`}>{STATUS_LABEL[r.status] || r.status}</span>
                      {r.status === "REQUESTED" && <div className={styles.small}>Asked {formatDateTime(r.requestedAt)}</div>}
                      {r.status === "APPROVED" && (
                        <div className={styles.small}>
                          {row.decidedBy ? `By ${row.decidedBy}, ` : ""}{formatDateTime(r.decidedAt)}
                        </div>
                      )}
                      {r.status === "REFUNDED" && (
                        <div className={styles.small}>
                          {formatDateTime(r.refundedAt)}{row.processedBy ? ` by ${row.processedBy}` : ""}
                        </div>
                      )}
                      {row.stripeRefundId && <div className={styles.small}>{row.stripeRefundId}</div>}
                      {r.declineReason && <div className={styles.small}>{r.declineReason}</div>}
                      {row.failureReason && <div className={styles.warn}>{row.failureReason}</div>}
                      {row.problem && <div className={styles.warn}>Can't be sent: {row.problem}</div>}
                      {row.organiserShortfall && (
                        <div className={styles.warn}>
                          Organiser already paid out: this event would be {formatRefundMoney(row.organiserShortfall)} short.
                        </div>
                      )}
                    </td>
                    <td className={styles.numeric}><strong>{formatRefundMoney(r.refundAmount)}</strong></td>
                    <td className={styles.actions}>{renderAction(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <div className={styles.overlay} onClick={() => busyId === null && setConfirming(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="refund-confirm" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 id="refund-confirm">Refund {formatRefundMoney(confirming.request.refundAmount)}?</h4>
              <button type="button" className={styles.iconButton} aria-label="Close" disabled={busyId !== null} onClick={() => setConfirming(null)}>
                <FiX />
              </button>
            </div>
            <p className={styles.bodyText}>
              {formatRefundMoney(confirming.request.refundAmount)} will be sent to{" "}
              {confirming.request.customerName || confirming.request.customerEmail}
              {confirming.paymentMethod ? ` (${confirming.paymentMethod})` : ""} for order #{confirming.request.orderId},{" "}
              {confirming.eventName}. The {confirming.request.wholeOrder ? "order's tickets" : "refunded tickets"} will stop
              working. This can't be undone.
            </p>
            {confirming.organiserShortfall && (
              <p className={styles.warn}>
                The organiser has already been paid this money. The event would be{" "}
                {formatRefundMoney(confirming.organiserShortfall)} short, to recover from the organiser.
              </p>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} disabled={busyId !== null} onClick={() => setConfirming(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} disabled={busyId !== null} onClick={() => process(confirming)}>
                {busyId !== null ? "Sending…" : `Refund ${formatRefundMoney(confirming.request.refundAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {record && (
        <div className={styles.overlay} onClick={closeRecord}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="refund-record" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 id="refund-record">Record a Stripe refund</h4>
              <button type="button" className={styles.iconButton} aria-label="Close" onClick={closeRecord}>
                <FiX />
              </button>
            </div>
            <p className={styles.bodyText}>
              For refunds already made in the Stripe Dashboard. No money is sent; it is checked with Stripe before saving.
            </p>
            <label className={styles.field}>
              <span>Order number</span>
              <div className={styles.fieldRow}>
                <input
                  value={record.orderId}
                  disabled={isRecording}
                  onChange={(e) => setRecord({ ...record, orderId: e.target.value, order: null, ticketIds: [] })}
                />
                <button type="button" className={styles.secondaryButton} disabled={isRecording || !record.orderId.trim()} onClick={findOrder}>
                  Find
                </button>
              </div>
            </label>
            {record.order && (
              <>
                <p className={styles.bodyText}>
                  <strong>{record.order.customerName}</strong> · {record.order.eventName} · paid {formatRefundMoney(record.order.grandTotal)} ·{" "}
                  {record.order.status.toLowerCase()}
                </p>
                <fieldset className={styles.tickets}>
                  <legend>Tickets refunded</legend>
                  {record.order.tickets.map((t) => (
                    <label key={t.ticketId}>
                      <input
                        type="checkbox"
                        checked={record.ticketIds.includes(t.ticketId)}
                        disabled={isRecording || t.refunded || !(Number(t.amount) > 0)}
                        onChange={() => toggleTicket(t.ticketId)}
                      />
                      <span>{t.attendeeName || "Ticket"} · {t.ticketType}{t.refunded ? " · already refunded" : ""}</span>
                      <span>{formatRefundMoney(t.amount)}</span>
                    </label>
                  ))}
                </fieldset>
                <label className={styles.field}>
                  <span>Stripe refund ID (re_…) for {formatRefundMoney(recordTotal)}</span>
                  <input
                    value={record.stripeRefundId}
                    disabled={isRecording}
                    onChange={(e) => setRecord({ ...record, stripeRefundId: e.target.value })}
                  />
                </label>
              </>
            )}
            {recordError && <p className={styles.errorText} role="alert">{recordError}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} disabled={isRecording} onClick={closeRecord}>Cancel</button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={isRecording || !record.order || record.ticketIds.length === 0 || !record.stripeRefundId.trim()}
                onClick={saveRecord}
              >
                {isRecording ? "Checking…" : "Record refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsPage;
