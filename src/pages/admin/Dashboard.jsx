import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import OrganizationList from "./OrganizationList";
import EventList from "./EventList";

/**
 * Admin dashboard drill-down:
 * Organisations → Events → Event manage (view-only) pages.
 */
export default function Dashboard() {
  const location = useLocation();
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    const fromManage = location.state?.selectedOrgId;
    if (fromManage != null && fromManage !== "") {
      setSelectedOrg({
        id: fromManage,
        name: location.state?.selectedOrgName || null,
      });
    }
  }, [location.state]);

  if (selectedOrg) {
    return (
      <EventList
        orgId={selectedOrg.id}
        orgName={selectedOrg.name}
        onBack={() => setSelectedOrg(null)}
      />
    );
  }

  return <OrganizationList onSelectOrg={setSelectedOrg} />;
}
