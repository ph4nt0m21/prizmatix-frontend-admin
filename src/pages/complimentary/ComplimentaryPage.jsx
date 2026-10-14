import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiDownload, FiExternalLink, FiMail, FiSlash, FiClock, FiX } from "react-icons/fi";
import styles from "./complimentaryPage.module.scss";
import {
  GetAdminComplimentaryTicketsAPI,
  ResendComplimentaryTicketAPI,
  RevokeComplimentaryTicketAPI,
  GetComplimentaryTicketHistoryAPI,
} from "../../services/allApis";

const STATUS_LABEL = {
  ACTIVE: "Active",
  PARTIALLY_CHECKED_IN: "Partly checked in",
  CHECKED_IN: "Checked in",
  REVOKED: "Revoked",
};
const ACTION_LABEL = {
  ISSUED: "Issued",
  EMAIL_SENT: "Email sent",
  EMAIL_FAILED: "Email failed",
  RESENT: "Resent",
  CHECKED_IN: "Checked in",
  REVOKED: "Revoked",
};

const errorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  (typeof err?.response?.data === "string" ? err.response.data : null) ||
  fallback;

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Super-admin view of every organiser-issued complimentary ticket. Supervises the same
 * tickets the organiser console manages — no separate ticket system, and no QR content is
 * ever loaded here.
 */
const ComplimentaryPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await GetAdminComplimentaryTicketsAPI();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(errorMessage(err, "Could not load complimentary tickets."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (!q) return true;
      return [r.recipientName, r.recipientEmail, r.eventName, r.organizationName, r.complimentaryType, String(r.orderId)]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [rows, status, query]);

  const totals = useMemo(() => {
    const active = filtered.filter((r) => r.status !== "REVOKED");
    return {
      issuances: filtered.length,
      entries: active.reduce((n, r) => n + (r.entries || 0), 0),
      checkedIn: filtered.reduce((n, r) => n + (r.checkedIn || 0), 0),
    };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Reference", "Organisation", "Event", "Recipient", "Email", "Description", "Entries",
      "Checked in", "Ticket type", "Status", "Issued by", "Issued at", "Revoked at", "Internal note"];
    const lines = filtered.map((r) => [r.orderId, r.organizationName, r.eventName, r.recipientName, r.recipientEmail,
      r.complimentaryType, r.entries, r.checkedIn, r.ticketTypeName, STATUS_LABEL[r.status] || r.status,
      r.issuedByName, r.issuedAt, r.revokedAt, r.internalNote].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complimentary-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resend = async (r) => {
    setBusyOrderId(r.orderId);
    try {
      await ResendComplimentaryTicketAPI(r.eventId, r.orderId);
      toast.success(`Ticket resent to ${r.recipientEmail}.`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not resend the ticket."));
    } finally {
      setBusyOrderId(null);
    }
  };

  const revoke = async () => {
    const r = revokeTarget;
    setBusyOrderId(r.orderId);
    try {
      await RevokeComplimentaryTicketAPI(r.eventId, r.orderId);
      toast.success("Ticket revoked.");
      setRevokeTarget(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not revoke the ticket."));
    } finally {
      setBusyOrderId(null);
    }
  };

  const openHistory = async (r) => {
    setHistoryFor(r);
    setHistory(null);
    try {
      const res = await GetComplimentaryTicketHistoryAPI(r.eventId, r.orderId);
      setHistory(res.data || []);
    } catch (err) {
      setHistory([]);
      toast.error(errorMessage(err, "Could not load history."));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Complimentary tickets</h1>
          <p className={styles.subtitle}>Organiser-issued free entries across all organisations.</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={exportCsv} disabled={!filtered.length}>
          <FiDownload aria-hidden="true" /> Export CSV
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><span>Issuances</span><strong>{totals.issuances}</strong></div>
        <div className={styles.stat}><span>Active entries</span><strong>{totals.entries}</strong></div>
        <div className={styles.stat}><span>Checked in</span><strong>{totals.checkedIn}</strong></div>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Search name, email, event, organisation or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className={styles.muted}>Loading…</p>
      ) : error ? (
        <p className={styles.errorText}>{error}</p>
      ) : filtered.length === 0 ? (
        <p className={styles.muted}>No complimentary tickets match.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Event</th>
                <th>Recipient</th>
                <th>Description</th>
                <th>Entries</th>
                <th>Issued</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const busy = busyOrderId === r.orderId;
                return (
                  <tr key={r.orderId} className={r.status === "REVOKED" ? styles.revoked : undefined}>
                    <td>{r.organizationName || `#${r.organizationId}`}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.inlineLink}
                        onClick={() => navigate(`/events/manage/${r.eventId}/overview`)}
                      >
                        {r.eventName} <FiExternalLink aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <div className={styles.recipient}>{r.recipientName}</div>
                      <div className={styles.email}>{r.recipientEmail}</div>
                    </td>
                    <td>
                      <span className={styles.tag}>{r.complimentaryType}</span>
                      {r.internalNote && <div className={styles.note}>{r.internalNote}</div>}
                    </td>
                    <td>
                      {r.checkedIn}/{r.entries}
                      <div className={styles.email}>{r.ticketTypeName}</div>
                    </td>
                    <td>
                      <div>{r.issuedByName || "—"}</div>
                      <div className={styles.email}>{formatDateTime(r.issuedAt)}</div>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[`status_${r.status}`] || ""}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button type="button" className={styles.iconAction} title="History" onClick={() => openHistory(r)}>
                        <FiClock />
                      </button>
                      {r.status !== "REVOKED" && (
                        <button type="button" className={styles.iconAction} title="Resend" disabled={busy} onClick={() => resend(r)}>
                          <FiMail />
                        </button>
                      )}
                      {r.status === "ACTIVE" && (
                        <button
                          type="button"
                          className={`${styles.iconAction} ${styles.danger}`}
                          title="Revoke"
                          disabled={busy}
                          onClick={() => setRevokeTarget(r)}
                        >
                          <FiSlash />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {revokeTarget && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Revoke ticket">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h4>Revoke ticket?</h4>
              <button type="button" className={styles.iconAction} onClick={() => setRevokeTarget(null)} aria-label="Close"><FiX /></button>
            </div>
            <p className={styles.bodyText}>
              {revokeTarget.recipientName}'s {revokeTarget.complimentaryType} ticket for{" "}
              <strong>{revokeTarget.eventName}</strong> ({revokeTarget.organizationName}) will stop working at the door
              and its entries return to capacity. The organiser will see this in their history.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setRevokeTarget(null)}>Keep ticket</button>
              <button type="button" className={styles.dangerButton} onClick={revoke} disabled={busyOrderId === revokeTarget.orderId}>
                {busyOrderId === revokeTarget.orderId ? "Revoking…" : "Revoke ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyFor && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Ticket history">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h4>History · {historyFor.recipientName} (#{historyFor.orderId})</h4>
              <button type="button" className={styles.iconAction} onClick={() => setHistoryFor(null)} aria-label="Close"><FiX /></button>
            </div>
            {history === null ? (
              <p className={styles.muted}>Loading…</p>
            ) : history.length === 0 ? (
              <p className={styles.muted}>No history recorded.</p>
            ) : (
              <ol className={styles.history}>
                {history.map((h, i) => (
                  <li key={i}>
                    <strong>{ACTION_LABEL[h.action] || h.action}</strong>
                    <span className={styles.email}>{h.actorName} · {formatDateTime(h.at)}</span>
                    {h.detail && <span>{h.detail}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplimentaryPage;
