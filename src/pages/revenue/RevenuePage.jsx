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
  GetPayoutBillAPI,
  GetRevenueDashboardAPI,
} from "../../services/allApis";
import styles from "./revenuePage.module.scss";

/**
 * RevenuePage (updated) - includes full Fee Configuration CRUD UI (mocked data).
 *
 * How to wire to real APIs later:
 * - replace fetchMockedFeeConfigs() with API GET /fee-config
 * - replace fetchMockedOrgs() with API GET /organizations
 * - replace save/update/delete functions with POST/PUT/DELETE accordingly
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

// Amount as NZD
function formatAmount(amount) {
  if (amount == null) return "—";
  return `NZD $${Number(amount).toFixed(2)}`;
}

export default function RevenuePage() {
  const [activeTab, setActiveTab] = useState("revenue-dashboard");
  const [payoutTab, setPayoutTab] = useState("requests");

  // Super admin payout requests (from API)
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState(null);
  const [payoutsForbidden, setPayoutsForbidden] = useState(false);
  const [contactModal, setContactModal] = useState(null); // { email, firstName, lastName, mobileNumber, organizationName }
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Revenue dashboard (all organizations)
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: null,
    absorberFee: null,
    topOrganizers: [],
    netRevenueChart: [],
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [chartRange, setChartRange] = useState("month"); // 'week' | 'month' | 'year'

  // Fallback static data when API is unavailable
  const fallbackRevenueChart = [
    { label: "Jan", value: 400 },
    { label: "Feb", value: 250 },
    { label: "Mar", value: 300 },
    { label: "Apr", value: 480 },
    { label: "May", value: 350 },
    { label: "Jun", value: 420 },
    { label: "Today", value: 500 },
  ];
  const fallbackTopOrganizers = [
    { name: "Name 1", revenue: 500 },
    { name: "Name 2", revenue: 800 },
    { name: "Name 3", revenue: 120 },
    { name: "Name 4", revenue: 600 },
    { name: "Name 5", revenue: 320 },
    { name: "Name 6", revenue: 420 },
  ];

  const payoutHistory = [
    {
      organizer: "City Music Festival",
      event: "City Music Fest 2025",
      eventStatus: "Completed",
      requestTimestamp: "12/01/25 at 9:18:50 AM",
      actionTimestamp: "12/01/25 at 9:18:50 AM",
      payoutType: "Partial Payout",
      amount: "$230",
      notes: "--",
    },
    {
      organizer: "City Music Festival",
      event: "City Music Fest 2025",
      eventStatus: "Completed",
      requestTimestamp: "12/01/25 at 9:18:50 AM",
      actionTimestamp: "12/01/25 at 9:18:50 AM",
      payoutType: "Full Payout",
      amount: "$230",
      notes: "--",
    },
  ];

  // --------------------------
  // Fee Configuration (new)
  // --------------------------

  // LocalStorage key for mocked persistence
  const LS_KEY = "prizmatix_fee_config_v1";

  // Mocked organizations (option B: we don't have an org API yet)
  const mockedOrgs = useMemo(
    () => [
      { id: "org_city_music", name: "City Music Festival" },
      { id: "org_tech_expo", name: "Tech Expo" },
      { id: "org_food_fair", name: "Global Food Fair" },
      { id: "org_local_theatre", name: "Local Theatre Co." },
    ],
    []
  );

  // Fee config shape:
  // { id, organizationId, organizationName, mode: "override"|"addon", percent, fixed, notes, updatedAt, history: [ ... ] }
  const [feeConfigs, setFeeConfigs] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null); // null => create new
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Form state used inside modal
  const defaultForm = {
    organizationId: "",
    percent: 0,
    fixed: 0,
    mode: "override", // 'override' | 'addon'
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  // Fetch payout requests when on Revenue Dashboard (for counts) or Payout Management (super admin API)
  useEffect(() => {
    if (activeTab !== "revenue-dashboard" && (activeTab !== "payout-management" || payoutTab !== "requests"))
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
  }, [activeTab, payoutTab]);

  // Fetch revenue dashboard when on Revenue Dashboard tab
  useEffect(() => {
    if (activeTab !== "revenue-dashboard") return;
    setDashboardLoading(true);
    setDashboardError(null);
    GetRevenueDashboardAPI({ range: chartRange })
      .then((res) => {
        const d = res?.data?.data ?? res?.data;
        if (d) {
          setDashboardData({
            totalRevenue: d.totalRevenue ?? null,
            absorberFee: d.absorberFee ?? null,
            topOrganizers: Array.isArray(d.topOrganizers) ? d.topOrganizers : [],
            netRevenueChart: Array.isArray(d.netRevenueChart) ? d.netRevenueChart : [],
          });
        }
      })
      .catch(() => {
        setDashboardError("Could not load dashboard");
        setDashboardData({
          totalRevenue: 2700,
          absorberFee: 200,
          topOrganizers: fallbackTopOrganizers,
          netRevenueChart: fallbackRevenueChart,
        });
      })
      .finally(() => setDashboardLoading(false));
  }, [activeTab, chartRange]);

  // Utility: load mocked fee configs from localStorage or seed example
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        setFeeConfigs(JSON.parse(raw));
        return;
      } catch (e) {
        // ignore and seed default
      }
    }

    // seed with example config
    const seed = [
      {
        id: "cfg_1",
        organizationId: "org_city_music",
        organizationName: "City Music Festival",
        mode: "addon",
        percent: 2,
        fixed: 5,
        notes: "Summer season add-on",
        updatedAt: new Date().toISOString(),
        history: [
          {
            at: new Date().toISOString(),
            by: "system",
            action: "create",
            old: null,
            new: { percent: 2, fixed: 5, mode: "addon" },
          },
        ],
      },
    ];
    setFeeConfigs(seed);
    localStorage.setItem(LS_KEY, JSON.stringify(seed));
  }, []);

  // Persist to localStorage whenever feeConfigs changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(feeConfigs));
    } catch (e) {
      // ignore
    }
  }, [feeConfigs]);

  // ---------- Mocked fetch functions (replace later with real API calls) ----------
  // Example:
  // async function fetchFeeConfigs() { return fetch('/fee-config').then(r => r.json()) }
  const fetchMockedOrgs = async () => {
    // Simulate API latency if needed
    return new Promise((res) => setTimeout(() => res(mockedOrgs), 150));
  };

  const fetchMockedFeeConfigs = async () => {
    return new Promise((res) =>
      setTimeout(() => res(JSON.parse(localStorage.getItem(LS_KEY) || "[]")), 150)
    );
  };

  // (Optional) If you want to reload from "server"
  async function reloadFeeConfigs() {
    const list = await fetchMockedFeeConfigs();
    setFeeConfigs(list || []);
  }

  // ---------- Handlers ----------
  function openCreateModal() {
    setEditingConfig(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEditModal(cfg) {
    setEditingConfig(cfg);
    setForm({
      organizationId: cfg.organizationId,
      percent: cfg.percent,
      fixed: cfg.fixed,
      mode: cfg.mode,
      notes: cfg.notes || "",
    });
    setShowModal(true);
  }

  function openHistoryModal(cfg) {
    setHistoryFor(cfg);
    setShowHistoryModal(true);
  }

  function onFormChange(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function validateForm() {
    if (!form.organizationId) return "Organization is required";
    if (Number.isNaN(Number(form.percent)) || Number(form.percent) < 0) return "Percent must be >= 0";
    if (Number.isNaN(Number(form.fixed)) || Number(form.fixed) < 0) return "Fixed fee must be >= 0";
    if (!["override", "addon"].includes(form.mode)) return "Invalid mode";
    return null;
  }

  function generateId() {
    return "cfg_" + Math.random().toString(36).slice(2, 9);
  }

  function findOrgNameById(id) {
    const o = mockedOrgs.find((x) => x.id === id);
    return o ? o.name : "—";
  }

  // Save (create or update)
  function handleSave() {
    const err = validateForm();
    if (err) {
      alert(err);
      return;
    }

    const timestamp = new Date().toISOString();
    if (editingConfig) {
      // update
      setFeeConfigs((prev) =>
        prev.map((p) => {
          if (p.id !== editingConfig.id) return p;
          const old = { percent: p.percent, fixed: p.fixed, mode: p.mode, notes: p.notes };
          const updated = {
            ...p,
            organizationId: form.organizationId,
            organizationName: findOrgNameById(form.organizationId),
            percent: Number(form.percent),
            fixed: Number(form.fixed),
            mode: form.mode,
            notes: form.notes,
            updatedAt: timestamp,
            history: [
              ...(p.history || []),
              {
                at: timestamp,
                by: "admin", // replace with real admin id/name
                action: "update",
                old,
                new: { percent: Number(form.percent), fixed: Number(form.fixed), mode: form.mode },
              },
            ],
          };
          return updated;
        })
      );
    } else {
      // create
      const newCfg = {
        id: generateId(),
        organizationId: form.organizationId,
        organizationName: findOrgNameById(form.organizationId),
        percent: Number(form.percent),
        fixed: Number(form.fixed),
        mode: form.mode,
        notes: form.notes,
        updatedAt: timestamp,
        history: [
          {
            at: timestamp,
            by: "admin",
            action: "create",
            old: null,
            new: { percent: Number(form.percent), fixed: Number(form.fixed), mode: form.mode },
          },
        ],
      };
      setFeeConfigs((prev) => [newCfg, ...prev]);
    }

    setShowModal(false);
  }

  function handleDelete(cfg) {
    setDeleteCandidate(cfg);
    setConfirmDeleteOpen(true);
  }

  function confirmDelete() {
    const cfg = deleteCandidate;
    if (!cfg) return;
    setFeeConfigs((prev) => prev.filter((p) => p.id !== cfg.id));
    setConfirmDeleteOpen(false);
    setDeleteCandidate(null);
  }

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
        a.href = url;
        a.download = `payout-bill-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success("Bill downloaded.");
      })
      .catch(() => {
        toast.error("Failed to download bill.");
      })
      .finally(() => setActionLoadingId(null));
  }

  function handleContactOrganizer(id) {
    GetPayoutOrganizerContactAPI(id)
      .then((res) => {
        const d = res?.data?.data;
        if (d) setContactModal({ email: d.email, firstName: d.firstName, lastName: d.lastName, mobileNumber: d.mobileNumber, organizationName: d.organizationName });
        else toast.error("Contact details not found.");
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Failed to load contact.";
        toast.error(msg);
      });
  }

  // ---------- Derived values ----------
  const orgsWithConfigMap = useMemo(() => {
    const map = {};
    feeConfigs.forEach((c) => (map[c.organizationId] = true));
    return map;
  }, [feeConfigs]);

  // For UI: show organizations and whether they have custom config
  const orgRows = mockedOrgs.map((o) => {
    const cfg = feeConfigs.find((c) => c.organizationId === o.id);
    return {
      org: o,
      config: cfg || null,
    };
  });

  // Helper: compute final fee display for given config (for table)
  function computeDisplayFee(cfg) {
    if (!cfg) return "—";
    const percent = cfg.percent || 0;
    const fixed = cfg.fixed || 0;
    return `${percent}% ${fixed ? `+ ${fixed}` : ""}`;
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
          <div className={styles.cardRow}>
            <div className={styles.bigCard}>
              <div className={styles.cardAmount}>
                {dashboardLoading ? "—" : formatAmount(dashboardData.totalRevenue)}
              </div>
              <div className={styles.cardLabel}>Total Revenue (all organizations)</div>
            </div>

            <div className={styles.bigCard}>
              <div className={styles.cardAmount}>
                {dashboardLoading ? "—" : formatAmount(dashboardData.absorberFee)}
              </div>
              <div className={styles.cardLabel}>Absorber Fee (all organizations)</div>
            </div>

            <div className={styles.bigCard}>
              <div className={styles.cardAmount}>
                {dashboardLoading
                  ? "—"
                  : formatAmount(
                      (Number(dashboardData.totalRevenue) || 0) - (Number(dashboardData.absorberFee) || 0)
                    )}
              </div>
              <div className={styles.cardLabel}>Net Revenue</div>
            </div>
          </div>

          <div className={styles.midRow}>
            <div className={styles.leftPanel}>
              <div className={styles.panelTitle}>Top Performing Organisers</div>

              <div className={styles.smallCard}>
                {dashboardLoading ? (
                  <div className={styles.chartPlaceholder}>Loading…</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={
                        dashboardData.topOrganizers.length > 0
                          ? dashboardData.topOrganizers
                          : fallbackTopOrganizers
                      }
                    >
                      <CartesianGrid stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip formatter={(v) => formatAmount(v)} />
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
                    <div className={styles.payoutMeta}>
                      {payouts.filter((p) => p.status === "PENDING").length}
                    </div>
                  </div>
                  <div
                    className={styles.payoutAction}
                    onClick={() => setActiveTab("payout-management")}
                    onKeyDown={(e) => e.key === "Enter" && setActiveTab("payout-management")}
                    role="button"
                    tabIndex={0}
                  >
                    View
                  </div>
                </div>

                <div className={styles.payoutRow} style={{ marginTop: 12 }}>
                  <div>
                    <div className={styles.payoutTitle}>Completed Requests</div>
                    <div className={styles.payoutMetaGreen}>
                      {payouts.filter((p) => p.status === "PAID").length}
                    </div>
                  </div>
                  <div
                    className={styles.payoutAction}
                    onClick={() => setActiveTab("payout-management")}
                    onKeyDown={(e) => e.key === "Enter" && setActiveTab("payout-management")}
                    role="button"
                    tabIndex={0}
                  >
                    View
                  </div>
                </div>

                <div className={styles.sparklineWrapper}>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart
                      data={
                        dashboardData.netRevenueChart.length > 0
                          ? dashboardData.netRevenueChart
                          : fallbackRevenueChart
                      }
                    >
                      <Line type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.largeChartCard}>
            <div className={styles.largeChartHeader}>
              <div className={styles.largeChartTitle}>Net Revenue</div>

              <div>
                <select
                  className={styles.rangeSelect}
                  value={chartRange}
                  onChange={(e) => setChartRange(e.target.value)}
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>

            {dashboardError && (
              <div className={styles.dashboardError}>{dashboardError} — showing sample data.</div>
            )}

            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={
                    dashboardData.netRevenueChart.length > 0
                      ? dashboardData.netRevenueChart
                      : fallbackRevenueChart
                  }
                >
                  <CartesianGrid stroke="#f0f0f0" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => [formatAmount(v), "Net revenue"]} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6C63FF"
                    strokeWidth={3}
                    dot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#6C63FF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* (unchanged) Payout Management */}
      {activeTab === "payout-management" && (
        <div className={styles.payoutWrapper}>
          <h2 className={styles.sectionTitle}>Payout Requests</h2>

          <div className={styles.payoutCardRow}>
            <div className={styles.summaryCard}>
              <div>Active events</div>
              <h3>02</h3>
            </div>

            <div className={styles.summaryCard}>
              <div>Finished Events Pending payout</div>
              <h3>02</h3>
            </div>

            <div className={styles.summaryCard}>
              <div>Advance Payout requests</div>
              <h3>02</h3>
            </div>

            <div className={styles.summaryCard}>
              <div>Pending Payout amount</div>
              <h3>$ 12123</h3>
            </div>
          </div>

          <div className={styles.subTabs}>
            <button
              className={`${styles.subTab} ${payoutTab === "requests" ? styles.active : ""}`}
              onClick={() => setPayoutTab("requests")}
            >
              Requests
            </button>

            <button
              className={`${styles.subTab} ${payoutTab === "history" ? styles.active : ""}`}
              onClick={() => setPayoutTab("history")}
            >
              History
            </button>
          </div>

          {payoutTab === "requests" && (
            <>
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
                      {payouts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={styles.emptyCell}>No payout requests.</td>
                        </tr>
                      ) : (
                        payouts.map((row) => (
                          <tr key={row.id}>
                            <td>{row.organizerName ?? "—"}</td>
                            <td>{row.eventName ?? "—"}</td>
                            <td>{eventStatusLabel(row.eventFinished)}</td>
                            <td>{formatRequestedAt(row.requestedAt)}</td>
                            <td>{row.payoutType ?? "—"}</td>
                            <td>{formatAmount(row.amount)}</td>
                            <td>
                              <span className={styles[`status_${row.status?.toLowerCase()}`] ?? styles.statusBadge}>
                                {row.status ?? "—"}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                {row.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.linkButton}
                                      disabled={actionLoadingId === row.id}
                                      onClick={() => handleCancelPayout(row.id)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.linkButton}
                                      disabled={actionLoadingId === row.id}
                                      onClick={() => handleMarkPaid(row.id)}
                                    >
                                      Mark as paid
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className={styles.linkButton}
                                  disabled={actionLoadingId === row.id}
                                  onClick={() => handleDownloadBill(row.id)}
                                >
                                  Download bill
                                </button>
                                <button
                                  type="button"
                                  className={styles.linkButton}
                                  onClick={() => handleContactOrganizer(row.id)}
                                >
                                  Contact organizer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {payoutTab === "history" && (
            <>
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Organizer</th>
                      <th>Event</th>
                      <th>Event Status at Payout</th>
                      <th>Request Timestamp</th>
                      <th>Action Timestamp</th>
                      <th>Payout Type</th>
                      <th>Amount</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payoutHistory.map((row, i) => (
                      <tr key={i}>
                        <td>{row.organizer}</td>
                        <td>{row.event}</td>
                        <td>{row.eventStatus}</td>
                        <td>{row.requestTimestamp}</td>
                        <td>{row.actionTimestamp}</td>
                        <td>{row.payoutType}</td>
                        <td>{row.amount}</td>
                        <td>{row.notes}</td>
                        <td>
                          <div className={styles.actionDropdown}>Action</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.downloadButton}>Download Invoice</div>
            </>
          )}
        </div>
      )}

      {/* 3) FEE CONFIGURATION - FULL CRUD */}
      {activeTab === "fee-configuration" && (
        <div className={styles.feeWrapper}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className={styles.sectionTitle}>Fee Configuration</h2>
            <div style={{ display: "flex", gap: 10 }}>
              {/* <button className={styles.primaryButton} onClick={openCreateModal}>
                + Add Configuration
              </button> */}
              {/* <button
                className={styles.secondaryButton}
                onClick={() => {
                  // reload from mocked "server"
                  reloadFeeConfigs();
                }}
              >
                Reload
              </button> */}
            </div>
          </div>

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
                {orgRows.map(({ org, config }, i) => (
                  <tr key={org.id}>
                    <td>{org.name}</td>
                    <td>{config ? (config.mode === "override" ? "Override" : "Add-on") : "Default"}</td>
                    <td>{config ? computeDisplayFee(config) : "Platform default"}</td>
                    <td>{config ? config.notes || "—" : "—"}</td>
                    <td>{config ? new Date(config.updatedAt).toLocaleString() : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {config ? (
                          <>
                            <button className={styles.linkButton} onClick={() => openEditModal(config)}>
                              Edit
                            </button>
                            <button className={styles.linkButton} onClick={() => openHistoryModal(config)}>
                              History
                            </button>
                            <button className={styles.dangerButton} onClick={() => handleDelete(config)}>
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={styles.linkButton}
                              onClick={() => {
                                // quick create preselecting this org
                                setEditingConfig(null);
                                setForm({ ...defaultForm, organizationId: org.id });
                                setShowModal(true);
                              }}
                            >
                              Add
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* If there are orphan configs for removed orgs, show them in a separate table */}
          {feeConfigs.some((c) => !mockedOrgs.find((o) => o.id === c.organizationId)) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: "#a00", marginBottom: 8 }}>Unmapped configurations (organizations missing)</div>
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Organization (ID)</th>
                      <th>Mode</th>
                      <th>Fee</th>
                      <th>Last Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeConfigs
                      .filter((c) => !mockedOrgs.find((o) => o.id === c.organizationId))
                      .map((c) => (
                        <tr key={c.id}>
                          <td>{c.organizationName || c.organizationId}</td>
                          <td>{c.mode}</td>
                          <td>{computeDisplayFee(c)}</td>
                          <td>{new Date(c.updatedAt).toLocaleString()}</td>
                          <td>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className={styles.linkButton} onClick={() => openEditModal(c)}>
                                Edit
                              </button>
                              <button className={styles.dangerButton} onClick={() => handleDelete(c)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add / Edit Modal */}
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
              {/* Organization */}
              <label className={styles.inputLabel}>Organization</label>
              <select
                className={styles.inputFull}
                value={form.organizationId}
                onChange={(e) => onFormChange("organizationId", e.target.value)}
              >
                <option value="">— select organization —</option>
                {mockedOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>

              {/* Mode */}
              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Mode
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="mode"
                    value="override"
                    checked={form.mode === "override"}
                    onChange={() => onFormChange("mode", "override")}
                  />{" "}
                  Override
                </label>

                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="mode"
                    value="addon"
                    checked={form.mode === "addon"}
                    onChange={() => onFormChange("mode", "addon")}
                  />{" "}
                  Add-on
                </label>
              </div>

              {/* Percent */}
              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Percentage
              </label>
              <div className={styles.inputContainer}>
                <input
                  type="number"
                  value={form.percent}
                  onChange={(e) => onFormChange("percent", e.target.value)}
                />
                <span className={styles.suffix}>%</span>
              </div>

              {/* Fixed */}
              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Fixed Fee
              </label>
              <div className={styles.inputContainer}>
                <input type="number" value={form.fixed} onChange={(e) => onFormChange("fixed", e.target.value)} />
                <span className={styles.suffix}>₹</span>
              </div>

              {/* Notes */}
              <label className={styles.inputLabel} style={{ marginTop: 12 }}>
                Notes
              </label>
              <textarea
                className={styles.textarea}
                value={form.notes}
                onChange={(e) => onFormChange("notes", e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.ghostButton} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className={styles.primaryButton} onClick={handleSave}>
                Save
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
                    {(historyFor.history || []).map((h, idx) => (
                      <tr key={idx}>
                        <td>{new Date(h.at).toLocaleString()}</td>
                        <td>{h.by}</td>
                        <td style={{ textTransform: "capitalize" }}>{h.action}</td>
                        <td>
                          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                            {h.old ? JSON.stringify(h.old) : "—"}
                          </pre>
                        </td>
                        <td>
                          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                            {h.new ? JSON.stringify(h.new) : "—"}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              Are you sure you want to delete fee configuration for{" "}
              <strong>{deleteCandidate.organizationName || deleteCandidate.organizationId}</strong>? This action
              cannot be undone.
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.ghostButton} onClick={() => setConfirmDeleteOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.dangerButton}
                onClick={() => {
                  confirmDelete();
                }}
              >
                Delete
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
              <p><strong>Name:</strong> {[contactModal.firstName, contactModal.lastName].filter(Boolean).join(" ") || "—"}</p>
              <p><strong>Organization:</strong> {contactModal.organizationName || "—"}</p>
              <p><strong>Email:</strong> {contactModal.email || "—"}</p>
              <p><strong>Phone:</strong> {contactModal.mobileNumber || "—"}</p>
              {contactModal.email && (
                <div className={styles.modalFooter} style={{ borderTop: "none", paddingTop: 12 }}>
                  <a href={`mailto:${contactModal.email}`} className={styles.primaryButton} style={{ textDecoration: "none" }}>
                    Send email
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
