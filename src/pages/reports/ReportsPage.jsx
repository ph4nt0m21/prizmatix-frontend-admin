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
                  <td className={styles.linkCell} data-label="Event Name">{r.eventName}</td>
                  <td className={styles.linkCell} data-label="Org Name">{r.orgName}</td>
                  <td data-label="Timestamp">{r.timestamp}</td>
                  <td data-label="User">
                    <div>{r.userName}</div>
                    <div className={styles.subEmail}>{r.email}</div>
                  </td>
                  <td data-label="Device">
                    {r.device.map((d, idx) => (
                      <div key={idx}>{d}</div>
                    ))}
                  </td>
                  <td data-label="Location">{r.location}</td>
                  <td data-label="Report Details">{r.details}</td>

                  <td className={styles.actionCell} data-label="Action">
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
                  <td className={styles.linkCell} data-label="Event Name">{h.eventName}</td>
                  <td className={styles.linkCell} data-label="Org Name">{h.orgName}</td>
                  <td data-label="Report Timestamp">{h.timestamp}</td>
                  <td data-label="Resolved At">{h.resolvedAt}</td>
                  <td data-label="User">
                    <div>{h.userName}</div>
                    <div className={styles.subEmail}>{h.email}</div>
                  </td>
                  <td data-label="Device">
                    {h.device.map((d, idx) => (
                      <div key={idx}>{d}</div>
                    ))}
                  </td>
                  <td data-label="Location">{h.location}</td>
                  <td data-label="Details">{h.details}</td>

                  <td className={styles.actionCell} data-label="Action">
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