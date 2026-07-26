import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../components/common/loadingSpinner/loadingSpinner";
import { GetAllOrganizationsAPI } from "../../services/allApis";
import styles from "./listPage.module.scss";

const PAGE_SIZE = 10;

export default function OrganizationList({ onSelectOrg }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          page,
          size: PAGE_SIZE,
          sortBy: "id",
          sortDirection: "id",
        };
        const response = await GetAllOrganizationsAPI(payload);
        const apiData = response?.data?.data;
        setOrganizations(apiData?.content ?? []);
        setTotalPages(apiData?.totalPages ?? 1);
      } catch (fetchError) {
        console.error("Failed to fetch organizations:", fetchError);
        setOrganizations([]);
        setError("Failed to load organisations. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [page]);

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
        <div className={styles.pageTitle}>
          <h1>Organisations</h1>
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
                            <h3 className={styles.eventName}>{org.name}</h3>
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
                      <h3 className={styles.cardEventName}>{org.name}</h3>
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
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
