import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GetAllOrganizationEventsAPI,
  GetEventStatusAPI,
  GetEventDashboardAPI,
} from "../../services/allApis";
import LoadingSpinner from "../../components/common/loadingSpinner/loadingSpinner";
import OrganizationEarningsOverview from "./organizationEarningsOverview";
import { getPublishedEventTimingStatus } from "../events/eventStatusUtils";
import {
  ART_PLACEHOLDER_THUMBNAIL,
  applyArtImageFallback,
} from "../../constants/artImagePlaceholders";
import styles from "./listPage.module.scss";

const FILTER_OPTIONS = ["All Events", "Live Events", "Drafts", "Paused", "Archive", "Deleted"];

export default function EventList({ orgId, orgName, orgListPage, onBack }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentFilter, setCurrentFilter] = useState("All Events");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = { page: 0, size: 100, sort: "startDate,desc" };
        const response = await GetAllOrganizationEventsAPI(orgId, params);
        const initialEvents = response.data || [];

        const eventsWithDetails = await Promise.all(
          initialEvents.map(async (event) => {
            try {
              const statusResponse = await GetEventStatusAPI(event.id);
              const isPublished = statusResponse.data?.step8Completed || false;

              let status = "DRAFT";
              if (event.pendingDeletionAt) {
                status = "DELETED";
              } else if (isPublished) {
                status = getPublishedEventTimingStatus(event);
              }

              const dashboardResponse = await GetEventDashboardAPI(event.id);
              return {
                ...event,
                status,
                totalTicketsIssued: dashboardResponse.data?.totalTicketsIssued || 0,
                totalTicketCapacity: dashboardResponse.data?.totalTicketCapacity || 0,
                revenue: dashboardResponse.data?.revenue || 0,
              };
            } catch (detailError) {
              console.error(`Failed to get details for event ${event.id}:`, detailError);
              return {
                ...event,
                status: "DRAFT",
                totalTicketsIssued: 0,
                totalTicketCapacity: 0,
                revenue: 0,
              };
            }
          })
        );
        setEvents(eventsWithDetails);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events. Please try again.");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [orgId]);

  const isPendingDeletion = (event) => Boolean(event?.pendingDeletionAt);
  const activeEvents = useMemo(
    () => events.filter((event) => !isPendingDeletion(event)),
    [events]
  );

  const counts = useMemo(
    () => ({
      all: activeEvents.length,
      live: activeEvents.filter((e) => e.status === "LIVE").length,
      draft: activeEvents.filter((e) => e.status === "DRAFT").length,
      paused: activeEvents.filter((e) => e.status === "Paused").length,
      archive: activeEvents.filter((e) => e.status === "PAST").length,
      deleted: events.filter(isPendingDeletion).length,
    }),
    [activeEvents, events]
  );

  const filteredEvents = useMemo(() => {
    if (currentFilter === "Deleted") {
      return events.filter(isPendingDeletion);
    }
    let filtered = activeEvents;
    if (currentFilter === "Live Events") {
      filtered = filtered.filter((e) => e.status === "LIVE");
    } else if (currentFilter === "Drafts") {
      filtered = filtered.filter((e) => e.status === "DRAFT");
    } else if (currentFilter === "Paused") {
      filtered = filtered.filter((e) => e.status === "Paused");
    } else if (currentFilter === "Archive") {
      filtered = filtered.filter((e) => e.status === "PAST");
    }
    return filtered;
  }, [activeEvents, currentFilter, events]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "LIVE":
        return styles.liveBadge;
      case "DRAFT":
        return styles.draftBadge;
      case "PAST":
        return styles.pastBadge;
      case "DELETED":
        return styles.deletedBadge;
      default:
        return "";
    }
  };

  const formatTicketSales = (event) => {
    const sold = event.totalTicketsIssued || 0;
    const total = event.totalTicketCapacity || 0;
    return total === 0 ? `${sold}/-` : `${sold}/${total}`;
  };

  const calculateGrossRevenue = (event) =>
    (event.revenue || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const formatEventDate = (event) => {
    if (!event.startDate) return "TBD";
    return new Date(event.startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const openEventManage = (event) => {
    if (event?.pendingDeletionAt) return;
    const qs = new URLSearchParams({ orgId: String(orgId) });
    if (orgName) qs.set("orgName", orgName);
    if (typeof orgListPage === "number") qs.set("orgListPage", String(orgListPage));
    navigate(`/events/manage/${event.id}/overview?${qs.toString()}`);
  };

  const filterCount = (filter) => {
    switch (filter) {
      case "All Events":
        return counts.all;
      case "Live Events":
        return counts.live;
      case "Drafts":
        return counts.draft;
      case "Paused":
        return counts.paused;
      case "Archive":
        return counts.archive;
      case "Deleted":
        return counts.deleted;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const title = orgName ? orgName : `Organisation #${orgId}`;

  return (
    <div className={styles.adminListRoot}>
      <div className={styles.adminListHeader}>
        <button type="button" onClick={onBack} className={styles.backButton}>
          ← Back to Organisations
        </button>
        <div className={styles.pageTitle}>
          <h1>{title}</h1>
          <p className={styles.pageSubtitle}>Events</p>
        </div>
      </div>

      <OrganizationEarningsOverview orgId={orgId} />

      <div className={styles.pageWrapper}>
        <aside className={styles.sidebarInnerCard}>
          <h2 className={styles.sidebarTitle}>Manage Event</h2>
          <nav className={styles.filterNav}>
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterItem} ${
                  currentFilter === filter ? styles.activeFilter : ""
                }`}
                onClick={() => setCurrentFilter(filter)}
              >
                {filter}
                <span>{filterCount(filter)}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.mainContent}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Sold</th>
                  <th>Gross</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className={styles.eventRow}
                      onClick={() => openEventManage(event)}
                    >
                      <td>
                        <div className={styles.eventInfoCell}>
                          <div className={styles.eventThumbnail}>
                            <img
                              src={event.bannerImage || ART_PLACEHOLDER_THUMBNAIL}
                              alt={event.name}
                              onError={(e) =>
                                applyArtImageFallback(e, ART_PLACEHOLDER_THUMBNAIL)
                              }
                            />
                          </div>
                          <div className={styles.eventDetails}>
                            <h3 className={styles.eventName}>{event.name}</h3>
                            <p className={styles.eventLocation}>
                              {event.location?.city}
                              {event.location?.city && ", "}
                              {event.location?.country}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.statusCell}>
                          <span
                            className={`${styles.statusBadge} ${getStatusBadgeClass(
                              event.status
                            )}`}
                          >
                            {event.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.soldCell}>
                          <span>{formatTicketSales(event)}</span>
                          <div className={styles.salesProgress}>
                            <div
                              className={styles.progressBar}
                              style={{
                                width: `${
                                  event.totalTicketCapacity > 0
                                    ? (event.totalTicketsIssued /
                                        event.totalTicketCapacity) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.grossCell}>
                          <span>{calculateGrossRevenue(event)}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <span>{formatEventDate(event)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className={styles.noEventsMessage}>
                        No events found for the selected filter.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileCardList}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={styles.eventCard}
                  onClick={() => openEventManage(event)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardThumbnail}>
                      <img
                        src={event.bannerImage || ART_PLACEHOLDER_THUMBNAIL}
                        alt={event.name}
                        onError={(e) =>
                          applyArtImageFallback(e, ART_PLACEHOLDER_THUMBNAIL)
                        }
                      />
                    </div>
                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardEventName}>{event.name}</h3>
                      <p className={styles.cardEventLocation}>
                        {event.location?.city}
                        {event.location?.city && ", "}
                        {event.location?.country}
                      </p>
                    </div>
                    <div className={styles.cardActions}>
                      <span
                        className={`${styles.statusBadge} ${getStatusBadgeClass(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardStats}>
                    <div className={styles.cardStat}>
                      <span className={styles.cardStatLabel}>Sold</span>
                      <span className={styles.cardStatValue}>
                        {formatTicketSales(event)}
                      </span>
                      <div className={styles.salesProgress}>
                        <div
                          className={styles.progressBar}
                          style={{
                            width: `${
                              event.totalTicketCapacity > 0
                                ? (event.totalTicketsIssued /
                                    event.totalTicketCapacity) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className={styles.cardStat}>
                      <span className={styles.cardStatLabel}>Gross</span>
                      <span className={styles.cardStatValue}>
                        {calculateGrossRevenue(event)}
                      </span>
                    </div>
                    <div className={styles.cardStat}>
                      <span className={styles.cardStatLabel}>Date</span>
                      <span className={styles.cardStatValue}>
                        {formatEventDate(event)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noEventsMessage}>
                No events found for the selected filter.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
