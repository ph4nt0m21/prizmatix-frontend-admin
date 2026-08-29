import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "react-toastify";
import {
  GetPayoutsAPI,
  CancelPayoutAPI,
  MarkPayoutPaidAPI,
  GetPayoutOrganizerContactAPI,
  ContactOrganizerAPI,
  GetPayoutBillAPI,
  GetRevenueDashboardAPI,
  GetFeeConfigDefaultAPI,
  GetFeeConfigListAPI,
  GetFeeConfigOrganizationsAPI,
  SaveFeeConfigAPI,
  DeleteFeeConfigAPI,
  GetFeeConfigHistoryAPI,
} from "../../services/allApis";
import styles from "./revenuePage.module.scss";

/**
 * RevenuePage – Revenue Dashboard, Payout Management, Fee Configuration (super admin).
 * Fee Configuration uses GET/POST/DELETE /admin/fee-config APIs; requires super admin.
 */

// Format ISO date for display
function formatRequestedAt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

// Event status from eventFinished
function eventStatusLabel(eventFinished) {
  if (eventFinished === true) return "Finished";
  return "Upcoming";
}

// Amount as NZD (full precision for tables/tooltips)
function formatAmount(amount) {
  if (amount == null) return "—";
  return `NZD $${Number(amount).toFixed(2)}`;
}

// Compact currency for dashboard metrics (e.g. "$ 1.2 M", "$ 12,500.00")
function formatRevenueCurrency(amount) {
  if (amount == null) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000) return `$ ${(n / 1_000).toFixed(1)} K`;
  return `$ ${n.toFixed(2)}`;
}

export default function RevenuePage() {
  const [activeTab, setActiveTab] = useState("revenue-dashboard");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState(null); // null | 'PENDING' | 'PAID' (set by View from dashboard)

  // Super admin payout requests (from API)
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState(null);
  const [payoutsForbidden, setPayoutsForbidden] = useState(false);
  const [contactModal, setContactModal] = useState(null); // { email, firstName, lastName, mobileNumber, organizationName }
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [openActionsRowId, setOpenActionsRowId] = useState(null); // which row's three-dot menu is open
  // Contact modal email form (subject, message, attachments)
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Revenue dashboard (all organizations); 403 = super admin required
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: null,
    netProfit: null,
    topPerformingOrganisers: [],
    netRevenueTrend: [],
    payoutSummary: { pendingCount: 0, completedCount: 0 },
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [dashboardForbidden, setDashboardForbidden] = useState(false);
  const [chartGranularity, setChartGranularity] = useState("MONTHLY"); // WEEKLY | MONTHLY | YEARLY


  // --------------------------
  // Fee Configuration (API-driven)
  // --------------------------
  const [feeConfigList, setFeeConfigList] = useState([]); // rows from GET /admin/fee-config
  const [feeConfigOrgs, setFeeConfigOrgs] = useState([]); // dropdown from GET /admin/fee-config/organizations
  const [defaultFee, setDefaultFee] = useState(null); // optional GET /admin/fee-config/default
  const [feeConfigLoading, setFeeConfigLoading] = useState(false);
  const [feeConfigError, setFeeConfigError] = useState(null);
  const [feeConfigForbidden, setFeeConfigForbidden] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null); // null => add new
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFor, setHistoryFor] = useState(null); // { organizationId, organizationName }
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const defaultForm = { organizationId: "", percent: 0, fixed: 0, notes: "" };
  const [form, setForm] = useState(defaultForm);

  // Fetch payout requests when on Revenue Dashboard (for counts) or Payout Management (super admin API)
  useEffect(() => {
    if (activeTab !== "revenue-dashboard" && activeTab !== "payout-management")
      return;
    setPayoutsLoading(true);
    setPayoutsError(null);
    setPayoutsForbidden(false);
    GetPayoutsAPI()
      .then((res) => {
        const list = res?.data?.data ?? [];
        setPayouts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        const status = err?.response?.status;
        const message = err?.response?.data?.message;
        if (status === 403) {
          setPayoutsForbidden(true);
          setPayouts([]);
        } else {
          setPayoutsError(message || "Failed to load payout requests.");
          setPayouts([]);
        }
      })
      .finally(() => setPayoutsLoading(false));
  }, [activeTab]);

  // Fetch revenue dashboard when on Revenue Dashboard tab (only trend uses from/to/granularity)
  useEffect(() => {
    if (activeTab !== "revenue-dashboard") return;
    setDashboardLoading(true);
    setDashboardError(null);
    setDashboardForbidden(false);
    const params = { granularity: chartGranularity };
    GetRevenueDashboardAPI(params)
      .then((res) => {
        const d = res?.data?.data ?? res?.data;
        if (d) {
          setDashboardData({
            totalRevenue: d.totalRevenue ?? null,
            netProfit: d.netProfit ?? null,
            topPerformingOrganisers: Array.isArray(d.topPerformingOrganisers) ? d.topPerformingOrganisers : [],
            netRevenueTrend: Array.isArray(d.netRevenueTrend) ? d.netRevenueTrend : [],
            payoutSummary: {
              pendingCount: d.payoutSummary?.pendingCount ?? 0,
              completedCount: d.payoutSummary?.completedCount ?? 0,
            },
          });
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        const message = err?.response?.data?.message;
        if (status === 403) {
          setDashboardForbidden(true);
          setDashboardData({ totalRevenue: null, netProfit: null, topPerformingOrganisers: [], netRevenueTrend: [], payoutSummary: { pendingCount: 0, completedCount: 0 } });
        } else {
          setDashboardError(message || "Could not load dashboard.");
        }
      })
      .finally(() => setDashboardLoading(false));
  }, [activeTab, chartGranularity]);

  // Fetch fee config list and organizations when on Fee Configuration tab
  useEffect(() => {
    if (activeTab !== "fee-configuration") return;
    setFeeConfigLoading(true);
    setFeeConfigError(null);
    setFeeConfigForbidden(false);
    Promise.all([GetFeeConfigListAPI(), GetFeeConfigOrganizationsAPI(), GetFeeConfigDefaultAPI().catch(() => null)])
      .then(([listRes, orgsRes, defaultRes]) => {
        const list = listRes?.data?.data ?? [];
        const orgs = orgsRes?.data?.data ?? [];
        setFeeConfigList(Array.isArray(list) ? list : []);
        setFeeConfigOrgs(Array.isArray(orgs) ? orgs : []);
        if (defaultRes?.data?.data) setDefaultFee(defaultRes.data.data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        const message = err?.response?.data?.message;
        if (status === 403) {
          setFeeConfigForbidden(true);
          setFeeConfigList([]);
          setFeeConfigOrgs([]);
        } else {
          setFeeConfigError(message || "Failed to load fee configuration.");
          setFeeConfigList([]);
          setFeeConfigOrgs([]);
        }
      })
      .finally(() => setFeeConfigLoading(false));
  }, [activeTab]);

  // Fetch history when History modal opens
  useEffect(() => {
    if (!showHistoryModal || !historyFor?.organizationId) return;
    setHistoryLoading(true);
    setHistoryList([]);
    GetFeeConfigHistoryAPI(historyFor.organizationId)
      .then((res) => {
        const data = res?.data?.data ?? [];
        setHistoryList(Array.isArray(data) ? data : []);
      })
      .catch(() => setHistoryList([]))
      .finally(() => setHistoryLoading(false));
  }, [showHistoryModal, historyFor?.organizationId]);

  function refetchFeeConfig() {
    GetFeeConfigListAPI()
      .then((res) => {
        const list = res?.data?.data ?? [];
        setFeeConfigList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }

  function openCreateModal(preselectedOrgId = null) {
    setEditingConfig(null);
    setForm({ ...defaultForm, organizationId: preselectedOrgId ?? "" });
    setShowModal(true);
  }

  function openEditModal(row) {
    setEditingConfig(row);
    setForm({
      organizationId: row.organizationId,
      percent: row.percent ?? 0,
      fixed: row.fixed ?? 0,
      notes: row.notes || "",
    });
    setShowModal(true);
  }

  function openHistoryModal(row) {
    setHistoryFor({ organizationId: row.organizationId, organizationName: row.organizationName });
    setShowHistoryModal(true);
  }

  function onFormChange(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function validateForm() {
    if (!form.organizationId) return "Organization is required";
    const pct = Number(form.percent);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return "Percent must be between 0 and 100";
    const fix = Number(form.fixed);
    if (Number.isNaN(fix) || fix < 0) return "Fixed fee must be >= 0";
    return null;
  }

  function handleSave() {
    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }
    setSaveLoading(true);
    const body = {
      organizationId: Number(form.organizationId),
      mode: "OVERRIDE",
      percent: Number(form.percent),
      fixed: Number(form.fixed),
      notes: form.notes || undefined,
    };
    SaveFeeConfigAPI(body)
      .then(() => {
        toast.success(editingConfig ? "Fee configuration updated." : "Fee configuration saved.");
        setShowModal(false);
        refetchFeeConfig();
      })
      .catch((err) => {
        const message = err?.response?.data?.message || "Failed to save fee configuration.";
        toast.error(message);
      })
      .finally(() => setSaveLoading(false));
  }

  function handleDelete(row) {
    setDeleteCandidate(row);
    setConfirmDeleteOpen(true);
  }

  function confirmDelete() {
    const row = deleteCandidate;
    if (!row) return;
    setDeleteLoading(true);
    DeleteFeeConfigAPI(row.organizationId)
      .then(() => {
        toast.success("Fee override deleted.");
        setConfirmDeleteOpen(false);
        setDeleteCandidate(null);
        refetchFeeConfig();
      })
      .catch((err) => {
        const message = err?.response?.data?.message || "Failed to delete.";
        toast.error(message);
      })
      .finally(() => setDeleteLoading(false));
  }

  const orgsWithoutOverride = useMemo(() => {
    return feeConfigOrgs.filter(
      (org) => !feeConfigList.some((r) => Number(r.organizationId) === Number(org.id) && r.hasOverride)
    );
  }, [feeConfigOrgs, feeConfigList]);

  const filteredPayouts = useMemo(() => {
    if (!payoutStatusFilter) return payouts;
    return payouts.filter((p) => p.status === payoutStatusFilter);
  }, [payouts, payoutStatusFilter]);

  const payoutSummary = useMemo(() => {
    const activeEventIds = new Set(
      payouts.filter((p) => !p.eventFinished).map((p) => p.eventId)
    );
    const finishedPendingEventIds = new Set(
      payouts.filter((p) => p.eventFinished && p.status === "PENDING").map((p) => p.eventId)
    );
    const advanceRequestCount = payouts.filter((p) => p.payoutType === "ADVANCE").length;
    const pendingAmount = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      activeEvents: activeEventIds.size,
      finishedEventsPendingPayout: finishedPendingEventIds.size,
      advanceRequestCount,
      pendingAmount,
    };
  }, [payouts]);

  // ---------- Payout actions (super admin) ----------
  function handleCancelPayout(id) {
    setActionLoadingId(id);
    CancelPayoutAPI(id)
      .then(() => {
        setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "CANCELLED" } : p)));
        toast.success("Payout request cancelled.");
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Failed to cancel.";
        toast.error(msg);
      })
      .finally(() => setActionLoadingId(null));
  }

  function handleMarkPaid(id) {
    setActionLoadingId(id);
    MarkPayoutPaidAPI(id)
      .then(() => {
        setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "PAID" } : p)));
        toast.success("Marked as paid.");
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Failed to mark as paid.";
        toast.error(msg);
      })
      .finally(() => setActionLoadingId(null));
  }

  function handleDownloadBill(id) {
    setActionLoadingId(id);
    GetPayoutBillAPI(id)
      .then((res) => {
        const blob = res.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `payout-bill-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Delay revocation slightly to ensure the browser captures the download
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          a.remove();
        }, 100);
        
        toast.success("Bill downloaded.");
      })
      .catch((err) => {
        console.error("Download bill error:", err);
        toast.error("Failed to download bill.");
      })
      .finally(() => setActionLoadingId(null));
  }

  function handleContactOrganizer(id) {
    setOpenActionsRowId(null);
    GetPayoutOrganizerContactAPI(id)
      .then((res) => {
        const d = res?.data?.data;
        if (d) {
          setContactModal({
            id,
            email: d.email,
            firstName: d.firstName,
            lastName: d.lastName,
            mobileNumber: d.mobileNumber,
            organizationName: d.organizationName,
          });
          setEmailSubject("");
          setEmailMessage("");
        } else toast.error("Contact details not found.");
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Failed to load contact.";
        toast.error(msg);
      });
  }

  function handleSendEmail() {
    if (!contactModal?.id) return;
    const subject = emailSubject.trim();
    const message = emailMessage.trim();

    if (!subject || !message) {
      toast.error("Subject and message are required.");
      return;
    }

    setActionLoadingId(contactModal.id);
    ContactOrganizerAPI(contactModal.id, { subject, message })
      .then((res) => {
        if (res.status === 200 && res.data?.sent === true) {
          toast.success("Email sent to organizer");
          setContactModal(null);
          setEmailSubject("");
          setEmailMessage("");
        } else {
          toast.error(res.data?.message || "Failed to send email.");
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        const message = err?.response?.data?.message;

        if (status === 400) {
          toast.error(message || "Validation error.");
        } else if (status === 403) {
          toast.error("Super admin access required");
        } else if (status === 503) {
          toast.error("Could not send email now. Please try again later.");
        } else {
          toast.error(message || "An unexpected error occurred.");
        }
      })
      .finally(() => setActionLoadingId(null));
  }



  // --------------------------
  // UI RENDER
  // --------------------------
  return (
    <div className={styles.pageWrapper}>
      {/* TOP-LEVEL TABS */}
      <div className={styles.topTabs}>
        <button
          className={`${styles.tab} ${activeTab === "revenue-dashboard" ? styles.active : ""}`}
          onClick={() => setActiveTab("revenue-dashboard")}
        >
          Revenue Dashboard
        </button>

        <button
          className={`${styles.tab} ${activeTab === "payout-management" ? styles.active : ""}`}
          onClick={() => setActiveTab("payout-management")}
        >
          Payout Management
        </button>

        <button
          className={`${styles.tab} ${activeTab === "fee-configuration" ? styles.active : ""}`}
          onClick={() => setActiveTab("fee-configuration")}
        >
          Fee Configuration
        </button>
      </div>

      {/* Revenue Dashboard */}
      {activeTab === "revenue-dashboard" && (
        <>
          {dashboardForbidden && (
            <div className={styles.tableCard}>
              <p className={styles.forbiddenMessage}>
                Super admin access required. You do not have permission to view the revenue dashboard.
              </p>
            </div>
          )}
          {!dashboardForbidden && (
            <>
              {dashboardError && (
                <div className={styles.dashboardError}>{dashboardError}</div>
              )}
              <div className={styles.cardRow}>
                <div className={styles.bigCard}>
                  <div className={styles.cardAmount}>
                    {dashboardLoading ? "—" : formatRevenueCurrency(dashboardData.totalRevenue)}
                  </div>
                  <div className={styles.cardLabel}>Total Revenue</div>
                </div>
                <div className={styles.bigCard}>
                  <div className={styles.cardAmount}>
                    {dashboardLoading ? "—" : formatRevenueCurrency(dashboardData.netProfit)}
                  </div>
                  <div className={styles.cardLabel}>Net Profit</div>
                </div>
              </div>

              <div className={styles.midRow}>
                <div className={styles.leftPanel}>
                  <div className={styles.panelTitle}>Top Performing Organisers</div>
                  <div className={styles.smallCard}>
                    {dashboardLoading ? (
                      <div className={styles.chartPlaceholder}>Loading…</div>
                    ) : dashboardData.topPerformingOrganisers.length === 0 ? (
                      <div className={styles.chartPlaceholder}>No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={dashboardData.topPerformingOrganisers} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid stroke="#f0f0f0" />
                          <XAxis dataKey="organizationName" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => formatRevenueCurrency(v)} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0].payload;
                              return (
                                <div className={styles.tooltipBox}>
                                  {p.organizationName} — {formatAmount(p.revenue)}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="revenue" fill="#6C63FF" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={styles.rightPanel}>
                  <div className={styles.smallCard}>
                    <div className={styles.payoutRow}>
                      <div>
                        <div className={styles.payoutTitle}>Pending Requests</div>
                        <div className={styles.payoutMeta}>{dashboardLoading ? "—" : dashboardData.payoutSummary.pendingCount}</div>
                      </div>
                      <div
                        className={styles.payoutAction}
                        onClick={() => { setPayoutStatusFilter("PENDING"); setActiveTab("payout-management"); }}
                        onKeyDown={(e) => e.key === "Enter" && (setPayoutStatusFilter("PENDING"), setActiveTab("payout-management"))}
                        role="button"
                        tabIndex={0}
                      >
                        View
                      </div>
                    </div>
                    <div className={styles.payoutRow} style={{ marginTop: 12 }}>
                      <div>
                        <div className={styles.payoutTitle}>Completed Requests</div>
                        <div className={styles.payoutMetaGreen}>{dashboardLoading ? "—" : dashboardData.payoutSummary.completedCount}</div>
                      </div>
                      <div
                        className={styles.payoutAction}
                        onClick={() => { setPayoutStatusFilter("PAID"); setActiveTab("payout-management"); }}
                        onKeyDown={(e) => e.key === "Enter" && (setPayoutStatusFilter("PAID"), setActiveTab("payout-management"))}
                        role="button"
                        tabIndex={0}
                      >
                        View
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.largeChartCard}>
                <div className={styles.largeChartHeader}>
                  <div className={styles.largeChartTitle}>Net Revenue trend</div>
                  <div>
                    <select
                      className={styles.rangeSelect}
                      value={chartGranularity}
                      onChange={(e) => setChartGranularity(e.target.value)}
                    >
                      <option value="WEEKLY">Week</option>
                      <option value="MONTHLY">Month</option>
                      <option value="YEARLY">Year</option>
                    </select>
                  </div>
                </div>
                <div style={{ width: "100%", height: 300 }}>
                  {dashboardLoading ? (
                    <div className={styles.chartPlaceholder} style={{ height: 300 }}>Loading…</div>
                  ) : dashboardData.netRevenueTrend.length === 0 ? (
                    <div className={styles.chartPlaceholder} style={{ height: 300 }}>No trend data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dashboardData.netRevenueTrend}>
                        <CartesianGrid stroke="#f0f0f0" />
                        <XAxis dataKey="periodLabel" />
                        <YAxis tickFormatter={(v) => formatRevenueCurrency(v)} />
                        <Tooltip formatter={(v) => [formatAmount(v), "Revenue"]} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#6C63FF"
                          strokeWidth={3}
                          dot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#6C63FF" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* (unchanged) Payout Management */}
      {activeTab === "payout-management" && (
        <div className={styles.payoutWrapper}>
          <h2 className={styles.sectionTitle}>Payout Requests</h2>

          <div className={styles.payoutCardRow}>
            <div className={styles.summaryCard}>
              <div>Active events</div>
              <h3>{String(payoutSummary.activeEvents).padStart(2, "0")}</h3>
            </div>

            <div className={styles.summaryCard}>
              <div>Finished Events Pending payout</div>
              <h3>{String(payoutSummary.finishedEventsPendingPayout).padStart(2, "0")}</h3>
            </div>

            <div className={styles.summaryCard}>
              <div>Advance Payout requests</div>
              <h3>{String(payoutSummary.advanceRequestCount).padStart(2, "0")}</h3>
            </div>

            <div className={styles.summaryCard}>
              <div>Pending Payout amount</div>
              <h3>{formatAmount(payoutSummary.pendingAmount)}</h3>
            </div>
          </div>

              {payoutsForbidden && (
                <div className={styles.tableCard}>
                  <p className={styles.forbiddenMessage}>Super admin access required. You do not have permission to view or manage payout requests.</p>
                </div>
              )}
              {!payoutsForbidden && payoutsError && (
                <div className={styles.tableCard}>
                  <p className={styles.errorMessage}>{payoutsError}</p>
                </div>
              )}
              {!payoutsForbidden && !payoutsError && payoutsLoading && (
                <div className={styles.tableCard}>
                  <p className={styles.loadingMessage}>Loading payout requests…</p>
                </div>
              )}
              {!payoutsForbidden && !payoutsError && !payoutsLoading && (
                <div className={styles.tableCard}>
                  {payoutStatusFilter && (
                    <p className={styles.payoutFilterNote}>
                      Showing only: {payoutStatusFilter === "PENDING" ? "Pending" : "Completed"}.
                      <button type="button" className={styles.linkButton} onClick={() => setPayoutStatusFilter(null)}> Show all</button>
                    </p>
                  )}
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Organizer</th>
                        <th>Event</th>
                        <th>Event status</th>
                        <th>Requested at</th>
                        <th>Payout type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayouts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={styles.emptyCell}>
                            {payoutStatusFilter ? `No ${payoutStatusFilter === "PENDING" ? "pending" : "completed"} payout requests.` : "No payout requests."}
                          </td>
                        </tr>
                      ) : (
                        filteredPayouts.map((row) => (
                          <tr key={row.id}>
                            <td data-label="Organizer">{row.organizerName ?? "—"}</td>
                            <td data-label="Event">{row.eventName ?? "—"}</td>
                            <td data-label="Event status">{eventStatusLabel(row.eventFinished)}</td>
                            <td data-label="Requested at">{formatRequestedAt(row.requestedAt)}</td>
                            <td data-label="Payout type">{row.payoutType ?? "—"}</td>
                            <td data-label="Amount">{formatAmount(row.amount)}</td>
                            <td data-label="Status">
                              <span className={styles[`status_${row.status?.toLowerCase()}`] ?? styles.statusBadge}>
                                {row.status ?? "—"}
                              </span>
                            </td>
                            <td data-label="Actions">
                              <div className={styles.actionsCell}>
                                <button
                                  type="button"
                                  className={styles.kebabButton}
                                  onClick={() => setOpenActionsRowId((prev) => (prev === row.id ? null : row.id))}
                                  aria-label="Actions"
                                  aria-expanded={openActionsRowId === row.id}
                                >
                                  <span className={styles.kebabDot} />
                                  <span className={styles.kebabDot} />
                                  <span className={styles.kebabDot} />
                                </button>
                                {openActionsRowId === row.id && (
                                  <>
                                    <div className={styles.actionsBackdrop} onClick={() => setOpenActionsRowId(null)} aria-hidden="true" />
                                    <div className={styles.actionsDropdown}>
                                      {row.status === "PENDING" && (
                                        <>
                                          <button
                                            type="button"
                                            className={styles.actionsDropdownItem}
                                            disabled={actionLoadingId === row.id}
                                            onClick={() => { handleCancelPayout(row.id); setOpenActionsRowId(null); }}
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            className={styles.actionsDropdownItem}
                                            disabled={actionLoadingId === row.id}
                                            onClick={() => { handleMarkPaid(row.id); setOpenActionsRowId(null); }}
                                          >
                                            Mark as paid
                                          </button>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        className={styles.actionsDropdownItem}
                                        disabled={actionLoadingId === row.id}
                                        onClick={() => { handleDownloadBill(row.id); setOpenActionsRowId(null); }}
                                      >
                                        Download bill
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.actionsDropdownItem}
                                        onClick={() => handleContactOrganizer(row.id)}
                                      >
                                        Contact organizer
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

        </div>
      )}

      {/* 3) FEE CONFIGURATION */}
      {activeTab === "fee-configuration" && (
        <div className={styles.feeWrapper}>
          <h2 className={styles.sectionTitle}>Fee Configuration</h2>
          {defaultFee?.display && (
            <p className={styles.feeDefaultHint}>Platform default: {defaultFee.display}</p>
          )}

          {feeConfigForbidden && (
            <div className={styles.tableCard} style={{ marginTop: 12 }}>
              <p className={styles.forbiddenMessage}>
                Super admin access required. You do not have permission to view or manage fee configuration.
              </p>
            </div>
          )}
          {!feeConfigForbidden && feeConfigError && (
            <div className={styles.tableCard} style={{ marginTop: 12 }}>
              <p className={styles.errorMessage}>{feeConfigError}</p>
            </div>
          )}
          {!feeConfigForbidden && !feeConfigError && feeConfigLoading && (
            <div className={styles.tableCard} style={{ marginTop: 12 }}>
              <p className={styles.loadingMessage}>Loading fee configuration…</p>
            </div>
          )}
          {!feeConfigForbidden && !feeConfigError && !feeConfigLoading && (
            <div className={styles.tableCard} style={{ marginTop: 12 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Mode</th>
                    <th>Fee (percent + fixed)</th>
                    <th>Notes</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feeConfigList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyCell}>
                        No organizations. Fee configuration list is empty.
                      </td>
                    </tr>
                  ) : (
                    feeConfigList.map((row) => (
                      <tr key={row.organizationId}>
                        <td data-label="Organization">{row.organizationName ?? "—"}</td>
                        <td data-label="Mode">{row.mode ?? "Default"}</td>
                        <td data-label="Fee">{row.feeDisplay ?? "—"}</td>
                        <td data-label="Notes">{row.notes ?? "—"}</td>
                        <td data-label="Last Updated">{row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : "—"}</td>
                        <td data-label="Action">
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {row.hasOverride ? (
                              <>
                                <button className={styles.linkButton} onClick={() => openEditModal(row)}>
                                  Edit
                                </button>
                                <button className={styles.linkButton} onClick={() => openHistoryModal(row)}>
                                  History
                                </button>
                                <button className={styles.dangerButton} onClick={() => handleDelete(row)}>
                                  Delete
                                </button>
                              </>
                            ) : (
                              <button
                                className={styles.linkButton}
                                onClick={() => openCreateModal(row.organizationId)}
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add / Edit Fee Configuration Modal */}
      {showModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingConfig ? "Edit Fee Configuration" : "Add Fee Configuration"}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <label className={styles.inputLabel}>Organization</label>
              <select
                className={styles.inputFull}
                value={String(form.organizationId ?? "")}
                onChange={(e) => onFormChange("organizationId", e.target.value)}
                disabled={!!editingConfig}
              >
                <option value="">— select organization —</option>
                {(editingConfig
                  ? [{ id: editingConfig.organizationId, name: editingConfig.organizationName }]
                  : orgsWithoutOverride
                ).map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>

              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Percentage (0–100)
              </label>
              <div className={styles.inputContainer}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percent}
                  onChange={(e) => onFormChange("percent", e.target.value)}
                />
                <span className={styles.suffix}>%</span>
              </div>

              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Fixed fee (NZD $, ≥ 0)
              </label>
              <div className={styles.inputContainer}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.fixed}
                  onChange={(e) => onFormChange("fixed", e.target.value)}
                />
                <span className={styles.suffix}>NZD</span>
              </div>

              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Notes
              </label>
              <textarea
                className={styles.textarea}
                value={form.notes}
                onChange={(e) => onFormChange("notes", e.target.value)}
                rows={3}
                placeholder="Optional note (e.g. Summer season add-on)"
              />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.ghostButton} onClick={() => setShowModal(false)} disabled={saveLoading}>
                Cancel
              </button>
              <button className={styles.primaryButton} onClick={handleSave} disabled={saveLoading}>
                {saveLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyFor && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal} style={{ width: 720 }}>
            <div className={styles.modalHeader}>
              <h3>History — {historyFor.organizationName}</h3>
              <button className={styles.modalClose} onClick={() => setShowHistoryModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {historyLoading ? (
                <p className={styles.loadingMessage}>Loading history…</p>
              ) : (
                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Old</th>
                        <th>New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={styles.emptyCell}>
                            No history for this organization.
                          </td>
                        </tr>
                      ) : (
                        historyList.map((h, idx) => (
                          <tr key={idx}>
                            <td data-label="Timestamp">{h.timestamp ? new Date(h.timestamp).toLocaleString() : "—"}</td>
                            <td data-label="Admin">{h.admin ?? "—"}</td>
                            <td data-label="Action">{h.action ?? "—"}</td>
                            <td data-label="Old">
                              <pre className={styles.historyJson}>
                                {h.oldValue != null ? (typeof h.oldValue === "string" ? h.oldValue : JSON.stringify(h.oldValue)) : "—"}
                              </pre>
                            </td>
                            <td data-label="New">
                              <pre className={styles.historyJson}>
                                {h.newValue != null ? (typeof h.newValue === "string" ? h.newValue : JSON.stringify(h.newValue)) : "—"}
                              </pre>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.primaryButton} onClick={() => setShowHistoryModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteOpen && deleteCandidate && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm delete</h3>
            </div>

            <div className={styles.modalBody}>
              Are you sure you want to delete the fee override for{" "}
              <strong>{deleteCandidate.organizationName ?? deleteCandidate.organizationId}</strong>? This
              organization will use the platform default fee. This action cannot be undone.
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.ghostButton}
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button className={styles.dangerButton} onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact organizer modal */}
      {contactModal && (
        <div className={styles.modalBackdrop} onClick={() => setContactModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Contact organizer</h3>
              <button className={styles.modalClose} onClick={() => setContactModal(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.contactDetails}>
                <p><strong>Name:</strong> {[contactModal.firstName, contactModal.lastName].filter(Boolean).join(" ") || "—"}</p>
                <p><strong>Organization:</strong> {contactModal.organizationName || "—"}</p>
                <p><strong>Email:</strong> {contactModal.email || "—"}</p>
                <p><strong>Phone:</strong> {contactModal.mobileNumber || "—"}</p>
              </div>
              {contactModal.email && (
                <div className={styles.sendEmailForm}>
                  <label className={styles.emailFormLabel}>Subject</label>
                  <input
                    type="text"
                    className={styles.inputFull}
                    placeholder="e.g. Early Bird Ticket Issue"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                  <label className={styles.emailFormLabel}>Message</label>
                  <textarea
                    className={styles.emailTextarea}
                    placeholder="e.g. The great Music Festival 2025"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={4}
                  />
                  <div className={styles.modalFooter} style={{ borderTop: "none", paddingTop: 16, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={handleSendEmail}
                      disabled={actionLoadingId === contactModal.id}
                    >
                      {actionLoadingId === contactModal.id ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
