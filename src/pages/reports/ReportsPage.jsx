import React, { useState } from "react";
import styles from "./reportsPage.module.scss";

export default function ReportsPage() {
  const [tab, setTab] = useState("reports"); // "reports" | "history"
  const [dropdownIndex, setDropdownIndex] = useState(null);

  const toggleDropdown = (index) => {
    setDropdownIndex(dropdownIndex === index ? null : index);
  };

  // Active reports
  const reports = [
    {
      eventName: "AARANYA",
      orgName: "MOKSHA",
      timestamp: "Today at 9:18:50 AM",
      userName: "Sarath Babu John",
      email: "sarathbabujohn@gmail.com",
      device: ["iPhone 16", "Chrome v 14.23.1"],
      location: "Auckland, New Zealand",
      details: "The description for the event has profanity in it",
    },
    {
      eventName: "AARANYA",
      orgName: "MOKSHA",
      timestamp: "Today at 9:18:50 AM",
      userName: "Sarath Babu John",
      email: "sarathbabujohn@gmail.com",
      device: ["Desktop", "Chrome v 14.23.1"],
      location: "Auckland, New Zealand",
      details: "The cover image of the event has offensive..",
    },
  ];

  // History reports
  const history = [
    {
      eventName: "AARANYA",
      orgName: "MOKSHA",
      timestamp: "12/01/25 9:18:50 AM",
      resolvedAt: "12/01/25 10:02:10 AM",
      userName: "Sarath Babu John",
      email: "sarathbabujohn@gmail.com",
      device: ["Desktop", "Chrome v 14.23.1"],
      location: "Auckland, New Zealand",
      details: "The description contained offensive content. Fixed.",
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.pageTitle}>Reports Tickets</h1>

      {/* TABS */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "reports" ? styles.active : ""}`}
          onClick={() => setTab("reports")}
        >
          Reports
        </button>

        <button
          className={`${styles.tab} ${tab === "history" ? styles.active : ""}`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {/* ======================================= */}
      {/* REPORTS TABLE */}
      {/* ======================================= */}
      {tab === "reports" && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Org Name</th>
                <th>Timestamp</th>
                <th>Username & Email</th>
                <th>Device</th>
                <th>Location</th>
                <th>Report Details</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((r, i) => (
                <tr key={i}>
                  <td className={styles.linkCell}>{r.eventName}</td>
                  <td className={styles.linkCell}>{r.orgName}</td>
                  <td>{r.timestamp}</td>
                  <td>
                    <div>{r.userName}</div>
                    <div className={styles.subEmail}>{r.email}</div>
                  </td>
                  <td>
                    {r.device.map((d, idx) => (
                      <div key={idx}>{d}</div>
                    ))}
                  </td>
                  <td>{r.location}</td>
                  <td>{r.details}</td>

                  <td className={styles.actionCell}>
                    <div
                      className={styles.actionButton}
                      onClick={() => toggleDropdown(i)}
                    >
                      Action
                    </div>

                    {dropdownIndex === i && (
                      <div className={styles.dropdownMenu}>
                        <div>View Event</div>
                        <div>Organizer contact details</div>
                        <div>Edit Event</div>
                        <div>Delete Event</div>
                        <div>Mark as Resolved</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.pagination}>
            <span className={styles.disabled}>← Previous</span>
            <span className={styles.activePage}>1</span>
            <span>2</span>
            <span>3</span>
            <span>...</span>
            <span>67</span>
            <span>→</span>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* HISTORY TABLE */}
      {/* ======================================= */}
      {tab === "history" && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Org Name</th>
                <th>Report Timestamp</th>
                <th>Resolved At</th>
                <th>User</th>
                <th>Device</th>
                <th>Location</th>
                <th>Details</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className={styles.linkCell}>{h.eventName}</td>
                  <td className={styles.linkCell}>{h.orgName}</td>
                  <td>{h.timestamp}</td>
                  <td>{h.resolvedAt}</td>
                  <td>
                    <div>{h.userName}</div>
                    <div className={styles.subEmail}>{h.email}</div>
                  </td>
                  <td>
                    {h.device.map((d, idx) => (
                      <div key={idx}>{d}</div>
                    ))}
                  </td>
                  <td>{h.location}</td>
                  <td>{h.details}</td>

                  <td className={styles.actionCell}>
                    <div
                      className={styles.actionButton}
                      onClick={() => toggleDropdown(i + "h")}
                    >
                      Action
                    </div>

                    {dropdownIndex === i + "h" && (
                      <div className={styles.dropdownMenu}>
                        <div>View Event</div>
                        <div>Organizer contact details</div>
                        <div>Delete History Entry</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.pagination}>
            <span className={styles.disabled}>← Previous</span>
            <span className={styles.activePage}>1</span>
            <span>2</span>
            <span>3</span>
            <span>...</span>
            <span>10</span>
            <span>→</span>
          </div>
        </div>
      )}
    </div>
  );
}