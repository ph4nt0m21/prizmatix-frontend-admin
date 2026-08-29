import React, { useEffect, useState } from "react";
import { GetOrganizationEarningsOverviewAPI } from "../../services/allApis";
import styles from "./organizationEarningsOverview.module.scss";

const formatCurrency = (value) =>
  `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrganizationEarningsOverview({ orgId }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await GetOrganizationEarningsOverviewAPI(orgId);
        if (!cancelled) setOverview(response.data);
      } catch (err) {
        console.error("Failed to fetch organisation earnings overview:", err);
        if (!cancelled) setError("Failed to load earnings overview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOverview();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (loading) return null;
  if (error) return <div className={styles.errorMessage}>{error}</div>;
  if (!overview) return null;

  return (
    <div className={styles.earningsCard}>
      <h2 className={styles.title}>Earnings Overview</h2>
      <div className={styles.statsGrid}>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Gross ticket sales</span>
          <span className={styles.statValue}>{formatCurrency(overview.grossTicketSales)}</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Buyer-paid fees</span>
          <span className={styles.statValue}>{formatCurrency(overview.buyerAbsorbedFees)}</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Afterpay fees (organiser-absorbed)</span>
          <span className={styles.statValue}>{formatCurrency(overview.afterpayFees)}</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>International card fees (organiser-absorbed)</span>
          <span className={styles.statValue}>{formatCurrency(overview.internationalCardFees)}</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Total organiser deductions</span>
          <span className={styles.statValue}>{formatCurrency(overview.organiserPayoutDeductions)}</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Net revenue payable to organiser</span>
          <span className={styles.statValue}>{formatCurrency(overview.totalRevenue)}</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Tickets sold</span>
          <span className={styles.statValue}>{overview.totalTicketsSold ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
