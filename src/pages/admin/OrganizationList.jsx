// import React from "react";
// import styles from './organizationList.module.scss';

// export default function OrganizationList({ onSelectOrg }) {
//   const org = { id: 6, name: "Default Organization", created_at: "2025-01-01" };

//   return (
//     <div>
//       <h2>Organizations</h2>
//       <div onClick={() => onSelectOrg(org.id)} className={styles.orgCard}>
//         <h3>{org.name}</h3>
//         <p>Created: {new Date(org.created_at).toLocaleDateString()}</p>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import styles from "./organizationList.module.scss";
import { GetAllOrganizationsAPI } from "../../services/allApis";

export default function OrganizationList({ onSelectOrg }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state (API-driven)
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_SIZE = 5;

  // Default organization (existing feature)
  // const defaultOrganization = {
  //   id: 6,
  //   name: "Default Organization",
  //   email: "default@prizmatix.nz",
  //   createdAt: "2025-01-01T00:00:00.000Z",
  // };

  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true);

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
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [page]);

  if (loading) {
    return <p>Loading organizations...</p>;
  }

  return (
    <div>
      <h2>Organizations</h2>

      {/* ⭐ Default Organization */}
      {/* <div
        className={styles.orgCard}
        onClick={() => onSelectOrg(defaultOrganization.id)}
      >
        <h3>{defaultOrganization.name}</h3>
        <p>Email: {defaultOrganization.email}</p>
        <p>
          Created:{" "}
          {new Date(defaultOrganization.createdAt).toLocaleDateString()}
        </p>
      </div> */}

      {/* 🔹 Organizations from API */}
      {organizations.length === 0 ? (
        <p>No organizations found.</p>
      ) : (
        organizations.map((org) => (
          <div
            key={org.id}
            className={styles.orgCard}
            onClick={() => onSelectOrg(org.id)}
          >
            <h3>{org.name}</h3>

            <p>Email: {org.email}</p>

            <p>
              Owner: {org.firstName} {org.lastName}
            </p>

            {/* <p>
              Status:{" "}
              <strong>{org.isActive ? "Active" : "Inactive"}</strong>
            </p> */}

            <p>
              Created:{" "}
              {org.createdAt
                ? new Date(org.createdAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
        ))
      )}

      {/* 🔁 Pagination Controls */}
      <div className={styles.pagination}>
  <button
    disabled={page === 0}
    onClick={() => setPage((p) => p - 1)}
  >
    Previous
  </button>

  <span>
    Page {page + 1} of {totalPages}
  </span>

  <button
    disabled={page + 1 >= totalPages}
    onClick={() => setPage((p) => p + 1)}
  >
    Next
  </button>
</div>

    </div>
  );
}
