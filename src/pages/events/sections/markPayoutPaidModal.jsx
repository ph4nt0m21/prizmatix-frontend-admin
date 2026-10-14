import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { RecordManualPayoutAPI } from '../../../services/allApis';
import styles from './markPayoutPaidModal.module.scss';

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

/** Super admin: record that the organiser has been paid outside the payout-request flow. */
const MarkPayoutPaidModal = ({ isOpen, onClose, eventId, availablePayout, onRecorded }) => {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setAmount(Number(availablePayout || 0).toFixed(2));
  }, [isOpen, availablePayout]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount);
  const amountError =
    !Number.isFinite(parsedAmount) || parsedAmount <= 0
      ? 'Enter an amount greater than $0.00.'
      : parsedAmount > Number(availablePayout) + 0.000001
        ? `Amount cannot exceed the available payout of ${formatCurrency(availablePayout)}.`
        : null;

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amountError) return;
    setSubmitting(true);
    try {
      await RecordManualPayoutAPI(eventId, parsedAmount.toFixed(2));
      toast.success(`${formatCurrency(parsedAmount)} recorded as paid out.`);
      onClose();
      onRecorded?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h3 className={styles.title}>Mark as paid out</h3>
          <button type="button" onClick={handleClose} className={styles.closeButton} aria-label="Close">
            <FiX />
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.description}>
            Record a payout you have already sent to the organiser. The amount is saved as a paid
            payout and deducted from this event&apos;s available payout.
          </p>
          <label className={styles.label} htmlFor="manualPayoutAmount">Amount paid</label>
          <div className={styles.inputWrap}>
            <span className={styles.currency}>$</span>
            <input
              id="manualPayoutAmount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={Number(availablePayout || 0).toFixed(2)}
              className={styles.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <p className={amountError ? styles.error : styles.hint}>
            {amountError || `Available payout: ${formatCurrency(availablePayout)}`}
          </p>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.ghostButton} onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton} disabled={isSubmitting || !!amountError}>
            {isSubmitting ? 'Saving…' : 'Mark as paid out'}
          </button>
        </div>
      </form>
    </div>
  );
};

MarkPayoutPaidModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  availablePayout: PropTypes.number,
  onRecorded: PropTypes.func,
};

export default MarkPayoutPaidModal;
