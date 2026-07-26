import React from "react";
import Dashboard from "./Dashboard";
import styles from "./dashboardPage.module.scss";

export default function DashboardPage() {
  return (
    <div className={styles.pageWrapper}>
      <Dashboard />
    </div>
  );
}
