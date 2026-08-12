import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/loadingSpinner/loadingSpinner";
import { GetAllOrganizationsAPI } from "../../services/allApis";
import styles from "./listPage.module.scss";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "liveFirst", label: "Live events first" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name (A–Z)" },
];

const buildPayload = (sortMode, page) => {
  switch (sortMode) {
    case "name":
      return { page, size: PAGE_SIZE, sortBy: "name", sortDirection: "asc" };
    case "newest":
      return { page, size: PAGE_SIZE, sortBy: "id", sortDirection: "desc" };
    case "liveFirst":
    default:
      return { page, size: PAGE_SIZE, liveEventsFirst: true };
  }
};

export default function OrganizationList({ onSelectOrg, page = 0, onPageChange }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [sortMode, setSortMode] = useState("liveFirst");

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = buildPayload(sortMode, page);
        const response = await GetAllOrganizationsAPI(payload);
        const apiData = response?.data?.data;
        const fetchedTotalPages = apiData?.totalPages ?? 1;
        setOrganizations(apiData?.content ?? []);
        setTotalPages(fetchedTotalPages);
        if (page > 0 && page >= fetchedTotalPages) {
          onPageChange?.(0);
        }
      } catch (fetchError) {
        console.error("Failed to fetch organizations:", fetchError);
        setOrganizations([]);
        setError("Failed to load organisations. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [page, sortMode]);

  const handleSortChange = (e) => {
    setSortMode(e.target.value);
    onPageChange?.(0);
  };

  const getInitials = (org) => {
    const name = String(org?.name || "").trim();
    if (!name) return "OR";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const formatCreated = (org) => {
    if (!org.createdAt) return "—";
    return new Date(org.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && organizations.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={styles.adminListRoot}>
      <div className={styles.adminListHeader}>
        <div className={styles.headerTopRow}>
          <div className={styles.pageTitle}>
            <h1>Organisations</h1>
          </div>
          <select
            className={styles.sortSelector}
            value={sortMode}
            onChange={handleSortChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${styles.pageWrapper} ${styles.pageWrapperNoSidebar}`}>
        <main className={styles.mainContent}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <tr
                      key={org.id}
                      className={styles.eventRow}
                      onClick={() => onSelectOrg({ id: org.id, name: org.name })}
                    >
                      <td>
                        <div className={styles.eventInfoCell}>
                          <div className={styles.orgAvatar}>{getInitials(org)}</div>
                          <div className={styles.eventDetails}>
                            <h3 className={styles.eventName}>
                              {org.name}
                              {org.hasLiveEvent && (
                                <span className={`${styles.statusBadge} ${styles.liveBadge} ${styles.orgLiveBadge}`}>
                                  LIVE
                                </span>
                              )}
                            </h3>
                            <p className={styles.eventLocation}>ID #{org.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <span>
                            {[org.firstName, org.lastName].filter(Boolean).join(" ") ||
                              "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <span>{org.email || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <span>{formatCreated(org)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">
                      <div className={styles.noEventsMessage}>
                        No organisations found.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileCardList}>
            {organizations.length > 0 ? (
              organizations.map((org) => (
                <div
                  key={org.id}
                  className={styles.eventCard}
                  onClick={() => onSelectOrg({ id: org.id, name: org.name })}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.orgAvatar}>{getInitials(org)}</div>
                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardEventName}>
                        {org.name}
                        {org.hasLiveEvent && (
                          <span className={`${styles.statusBadge} ${styles.liveBadge} ${styles.orgLiveBadge}`}>
                            LIVE
                          </span>
                        )}
                      </h3>
                      <p className={styles.cardEventLocation}>
                        {org.email || "No email"}
                      </p>
                    </div>
                  </div>
                  <div className={styles.cardStats}>
                    <div className={styles.cardStat}>
                      <span className={styles.cardStatLabel}>Owner</span>
                      <span className={styles.cardStatValue}>
                        {[org.firstName, org.lastName].filter(Boolean).join(" ") ||
                          "—"}
                      </span>
                    </div>
                    <div className={styles.cardStat}>
                      <span className={styles.cardStatLabel}>Created</span>
                      <span className={styles.cardStatValue}>
                        {formatCreated(org)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noEventsMessage}>No organisations found.</div>
            )}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => onPageChange?.(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
