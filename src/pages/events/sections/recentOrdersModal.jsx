import React from 'react';
import PropTypes from 'prop-types';
import styles from './recentOrdersModal.module.scss';
import { FiX } from 'react-icons/fi';
import { format } from 'date-fns';

const RecentOrdersModal = ({ isOpen, onClose, orders, onViewAllOrders }) => {
  if (!isOpen) {
    return null;
  }

  const handleViewAll = () => {
    onViewAllOrders?.();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Recent Orders</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <FiX />
          </button>
        </div>
        <div className={styles.content}>
          {/* NEW: Added a container for horizontal scrolling */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Name</th>
                  <th>Email</th> {/* ADDED */}
                  <th>Ticket Type</th> {/* ADDED */}
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map((order) => (
                  <tr key={order.orderId}>
                    <td data-label="Order ID">#{order.orderId}</td>
                    <td data-label="Name">{order.name}</td>
                    <td data-label="Email">{order.email}</td> {/* ADDED */}
                    <td data-label="Ticket Type">{order.ticketType}</td> {/* ADDED */}
                    <td data-label="Date">{format(new Date(order.orderDate), 'dd MMM yyyy')}</td>
                    <td data-label="Amount">${(order.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {orders?.length > 0 && (
          <div className={styles.footer}>
            <button type="button" className={styles.viewAllLink} onClick={handleViewAll}>
              View all orders &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

RecentOrdersModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  orders: PropTypes.array,
  onViewAllOrders: PropTypes.func,
};

export default RecentOrdersModal;