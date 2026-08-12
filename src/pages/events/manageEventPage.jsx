import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import EventHeaderNav from "./components/eventHeaderNav";
import EventManageSidebar from "./components/eventManageSidebar";
import LoadingSpinner from "../../components/common/loadingSpinner/loadingSpinner";
import styles from "./manageEventPage.module.scss";

import {
  GetEventDashboardAPI,
  GetEventAPI,
  GetEventStatusAPI,
  GetEventTicketStructuresAPI,
} from "../../services/allApis";
import OverviewSection from "./sections/overviewSection";
import OrdersAndAttendeesSection from "./sections/ordersAndAttendeesSection/ordersAndAttendeesSection";
import TicketSection from "./sections/ticketSection";
import DiscountSection from "./sections/discountSection";
import EventPageSection from "./sections/eventPageSection";
import { getPublishedEventTimingStatus } from "./eventStatusUtils";

/** Super-admin monitoring: same manage UI as org, read-only. */
const VIEW_ONLY = true;

const EventManagePage = () => {
  const navigate = useNavigate();
  const { eventId, section } = useParams();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("orgId");
  const orgName = searchParams.get("orgName");
  const orgListPage = searchParams.get("orgListPage");

  const buildOrgQueryString = useCallback(() => {
    if (!orgId) return "";
    const qs = new URLSearchParams({ orgId });
    if (orgName) qs.set("orgName", orgName);
    if (orgListPage != null) qs.set("orgListPage", orgListPage);
    return `?${qs.toString()}`;
  }, [orgId, orgName, orgListPage]);

  const [isManageSidebarOpen, setIsManageSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [currentSection, setCurrentSection] = useState("overview");

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      const [dashboardRes, eventRes, statusRes, ticketsRes] = await Promise.all([
        GetEventDashboardAPI(eventId),
        GetEventAPI(eventId),
        GetEventStatusAPI(eventId),
        GetEventTicketStructuresAPI(eventId),
      ]);

      const isPublished =
        statusRes.data?.step8Completed ?? eventRes.data?.isPublished ?? false;
      const ticketStructures = Array.isArray(ticketsRes?.data)
        ? ticketsRes.data.filter((ticket) => ticket?.isDeleted !== true)
        : [];
      setDashboardData(dashboardRes.data);
      setEventData({
        ...eventRes.data,
        tickets: ticketStructures,
        ticketStructures,
        isPublished,
      });
      setError(null);
    } catch (fetchError) {
      console.error("Error fetching event data:", fetchError);
      setError("Failed to load event data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    // Payout uses org-console APIs and is not available for admin monitoring.
    if (section === "payout") {
      navigate(`/events/manage/${eventId}/overview${buildOrgQueryString()}`, { replace: true });
      return;
    }
    setCurrentSection(section || "overview");
  }, [section, eventId, buildOrgQueryString, navigate]);

  const navigateToManageSection = (sectionName) => {
    navigate(`/events/manage/${eventId}/${sectionName}${buildOrgQueryString()}`);
    if (window.innerWidth <= 768 && isManageSidebarOpen) {
      setIsManageSidebarOpen(false);
    }
  };

  const handleBack = () => {
    if (orgId) {
      navigate("/", {
        state: {
          selectedOrgId: Number(orgId) || orgId,
          selectedOrgName: orgName || null,
          orgListPage: orgListPage != null ? Number(orgListPage) : 0,
        },
      });
      return;
    }
    navigate("/");
  };

  const eventStatus = eventData?.isPublished
    ? getPublishedEventTimingStatus(eventData)
    : "DRAFT";

  const goToOrdersAndAttendees = () => navigateToManageSection("ordersAndAttendees");

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "overview":
        return (
          <OverviewSection
            dashboardData={dashboardData}
            eventData={eventData}
            onViewAllOrders={goToOrdersAndAttendees}
          />
        );
      case "ordersAndAttendees":
        return <OrdersAndAttendeesSection eventId={eventId} viewOnly={VIEW_ONLY} />;
      case "eventPage":
        return <EventPageSection eventData={eventData} />;
      case "tickets":
        return <TicketSection viewOnly={VIEW_ONLY} />;
      case "discounts":
        return <DiscountSection viewOnly={VIEW_ONLY} />;
      default:
        return (
          <OverviewSection
            dashboardData={dashboardData}
            eventData={eventData}
            onViewAllOrders={goToOrdersAndAttendees}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainerFullPage}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <>
      <EventHeaderNav
        eventName={eventData?.name || ""}
        isDraft={!eventData?.isPublished}
        eventStatus={eventStatus}
        toggleMobileSidebar={() => setIsManageSidebarOpen(!isManageSidebarOpen)}
        eventId={eventId}
        eventSlug={eventData?.slug}
        showActions={!VIEW_ONLY}
        onBack={handleBack}
        backLabel={orgId ? "Back to events" : "Back to organisations"}
      />
      <div className={styles.contentWrapper}>
        {isManageSidebarOpen && (
          <div
            className={styles.sidebarOverlay}
            onClick={() => setIsManageSidebarOpen(false)}
          />
        )}
        <EventManageSidebar
          currentSection={currentSection}
          sectionStatus={{}}
          navigateToSection={navigateToManageSection}
          navigateToEventEditPage={() => navigateToManageSection("eventPage")}
          eventId={eventId}
          isPublished={!!eventData?.isPublished}
          viewOnly={VIEW_ONLY}
          isMobileSidebarOpen={isManageSidebarOpen}
          toggleMobileSidebar={() => setIsManageSidebarOpen(!isManageSidebarOpen)}
        />
        <main className={styles.mainContent}>{renderCurrentSection()}</main>
      </div>
    </>
  );
};

export default EventManagePage;
