// import React from "react";
// import styles from "./usersPage.module.scss";

// export default function UsersPage() {
//   const staticUsers = [
//     {
//       uid: "AD01564",
//       email: "username1@gmail.com",
//       mobile: "+12 897462",
//       type: "Customer",
//       location: "Auckland, New Zealand",
//       createdOn: "20/01/2025 08:15",
//       age: "21 Days",
//       lastActivity: "Bought 5 tickets for ‘Event name’ from org name"
//     },
//     {
//       uid: "AD01564",
//       email: "username2@gmail.com",
//       mobile: "+12 897462",
//       type: "Customer",
//       location: "Auckland, New Zealand",
//       createdOn: "20/01/2025 08:15",
//       age: "21 Days",
//       lastActivity: "Bought 5 tickets for ‘Event name’ from org name"
//     },
//     {
//       uid: "AD01564",
//       email: "username3@gmail.com",
//       mobile: "+12 897462",
//       type: "Organizer",
//       location: "Auckland, New Zealand",
//       createdOn: "20/01/2025 08:15",
//       age: "21 Days",
//       lastActivity: "Created event ‘City Music Fest 2025’"
//     },
//     {
//       uid: "AD01564",
//       email: "username4@gmail.com",
//       mobile: "+12 897462",
//       type: "Organizer",
//       location: "Auckland, New Zealand",
//       createdOn: "20/01/2025 08:15",
//       age: "21 Days",
//       lastActivity: "Requested Payout"
//     }
//   ];

//   return (
//     <div className={styles.pageWrapper}>
//       <h1 className={styles.title}>Users</h1>

//       <div className={styles.tableWrapper}>
//         <table className={styles.table}>
//           <thead>
//             <tr>
//               <th>UID</th>
//               <th>E-Mail</th>
//               <th>Mobile</th>
//               <th>Type</th>
//               <th>Location</th>
//               <th>Created on</th>
//               <th>Account age</th>
//               <th>Last Activity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {staticUsers.map((user, i) => (
//               <tr key={i}>
//                 <td>{user.uid}</td>
//                 <td>{user.email}</td>
//                 <td>{user.mobile}</td>
//                 <td>{user.type}</td>
//                 <td>{user.location}</td>
//                 <td>{user.createdOn}</td>
//                 <td>{user.age}</td>
//                 <td>{user.lastActivity}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import styles from "./usersPage.module.scss";
import { GetAllAdminsAPI } from "../../services/allApis";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [columns, setColumns] = useState([]);

  // pagination state
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchUsers = async (pageNumber) => {
    setLoading(true);

    try {
      const payload = {
        page: pageNumber,
        size: size,
        sortBy: "id",
        sortDirection: "asc",
      };

      const response = await GetAllAdminsAPI(payload);
      const data = response?.data?.data;

      const content = data?.content || [];

      setUsers(content);
      setTotalPages(data?.totalPages || 0);

      // derive columns dynamically
      if (content.length > 0) {
        setColumns(
  Object.keys(content[0]).filter(
    (col) => !HIDDEN_COLUMNS.includes(col)
  )
);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const HIDDEN_COLUMNS = [
    "updatedTimestamp",
  ];

  const renderCellValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((v) => v.name || JSON.stringify(v)).join(", ");
    }

    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    return value.toString();
  };

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.title}>Users</h1>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div>Loading users...</div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.map((user, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col) => (
                      <td key={col}>{renderCellValue(user[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </button>

              <span>
                Page {page + 1} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
