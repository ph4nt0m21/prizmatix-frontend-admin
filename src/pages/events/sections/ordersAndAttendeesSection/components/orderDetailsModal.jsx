import React from 'react';
import styles from './orderDetailsModal.module.scss';
import { FiX, FiDownload } from 'react-icons/fi';

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{order.id}</h3>
          <p>Order Details</p>
          <button onClick={onClose} className={styles.closeButton}>
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {/* Purchase Details */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Purchase Details</h4>
            </div>
            <div className={styles.detailBlock}>
              <div className={styles.detailItem}>
                <span>Purchase Date</span>
                <strong>{order.purchaseDate}</strong>
              </div>
              <div className={styles.detailItem}>
                <span>Payment Method</span>
                <strong>{order.paymentMethod}</strong>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          {order.feeBreakdown && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>Financial Breakdown</h4>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailItem}>
                  <span>Ticket face value</span>
                  <strong>${order.feeBreakdown.ticketFaceValue.toFixed(2)}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Platform/gateway fee (buyer-paid)</span>
                  <strong>${order.feeBreakdown.platformFee.toFixed(2)}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>GST on platform fee</span>
                  <strong>${order.feeBreakdown.gstOnPlatformFee.toFixed(2)}</strong>
                </div>
                {order.feeBreakdown.afterpayFeeExGst > 0 && (
                  <>
                    <div className={styles.detailItem}>
                      <span>Afterpay fee (organiser-absorbed)</span>
                      <strong>${order.feeBreakdown.afterpayFeeExGst.toFixed(2)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span>GST on Afterpay fee</span>
                      <strong>${order.feeBreakdown.afterpayGst.toFixed(2)}</strong>
                    </div>
                  </>
                )}
                {order.feeBreakdown.internationalFeeExGst > 0 && (
                  <>
                    <div className={styles.detailItem}>
                      <span>International card fee (organiser-absorbed)</span>
                      <strong>${order.feeBreakdown.internationalFeeExGst.toFixed(2)}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span>GST on international card fee</span>
                      <strong>${order.feeBreakdown.internationalGst.toFixed(2)}</strong>
                    </div>
                  </>
                )}
                <div className={styles.detailItem}>
                  <span>Net to organiser</span>
                  <strong>${order.feeBreakdown.netToOrganiser.toFixed(2)}</strong>
                </div>
                <div className={styles.detailItem}>
                  <span>Total paid by buyer</span>
                  <strong>${order.feeBreakdown.grandTotal.toFixed(2)}</strong>
                </div>
              </div>
              {order.refundPolicy && (
                <p style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>
                  <strong>Refund policy at purchase:</strong> {order.refundPolicy}
                </p>
              )}
            </div>
          )}

          {/* Customer */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Customer</h4>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Full Name</span>
              <span className={styles.infoValue}>{order.customer.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>E-Mail</span>
              <span className={styles.infoValue}>{order.customer.email}</span>
            </div>
          </div>

          {/* Tickets */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Tickets</h4>
            </div>
            {order.tickets &&
              order.tickets.map((ticket, index) => (
                <div
                  key={ticket.ticketId || index}
                  className={styles.ticketItem}
                >
                  <div className={styles.ticketInfo}>
                    <span className={styles.ticketName}>
                      {ticket.ticketType}
                      {ticket.donation ? ' (Donation)' : ''}
                    </span>
                    <div style={{ marginTop: 6, color: '#4B5563', fontSize: 13 }}>
                      <strong>{ticket.donation ? 'Donator' : 'Attendee'}:</strong>{' '}
                      {ticket.attendeeName || 'N/A'}
                    </div>
                    {ticket.donationNote ? (
                      <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', color: '#4B5563', fontSize: 13 }}>
                        <strong>Notes:</strong> {ticket.donationNote}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>

          {/* Attendees */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Attendees</h4>
            </div>
            {order.attendees && order.attendees.length > 0 ? (
              order.attendees.map((attendee, index) => (
                <div key={index} className={styles.attendeeNameRow}>
                  {attendee.name}
                </div>
              ))
            ) : (
              <div className={styles.attendeeNameRow} style={{ color: '#9CA3AF' }}>
                No ticket attendees
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.downloadInvoice}>
            <FiDownload /> Download Invoice
          </button>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsModal;