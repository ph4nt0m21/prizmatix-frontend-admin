import apiClient from "./apiClient";

// =============== AUTH APIs ===============

// Step 1: Initiate registration with email
export const OrganizationRegisterInitiateAPI = async (data) => {
  return await apiClient.post("/api/organizations/register/initiate", data);
};

// Step 2: Resend OTP if needed
export const OrganizationResendOtpAPI = async (data) => {
  return await apiClient.post("/api/organizations/register/resend-otp", data);
};

// Step 3: Verify OTP
export const OrganizationVerifyOtpAPI = async (data) => {
  return await apiClient.post("/api/organizations/register/verify-otp", data);
};

// Final Step: Complete organization registration
export const OrganizationRegisterAPIComplete = async (data) => {
  return await apiClient.post("/api/organizations/register/complete", data);
};

// API for login
export const LoginAPI = async (data) => {
  return await apiClient.post("/login", data);
};

// API for forgot password
export const ForgotPasswordAPI = async (data) => {
  return await apiClient.post("/forgot-password", data);
};

// API for reset password
export const ResetPasswordAPI = async (data) => {
  return await apiClient.post("/reset-password", data);
};

// Profile API
export const ProfileAPI = async () => {
  return await apiClient.get("/user/profile");
};

// =============== EVENT APIs ===============

// Create a new event with basic info (Step 1)
export const CreateEventAPI = async (data) => {
  return await apiClient.post("/api/events", data);
};

// Get event by ID
export const GetEventAPI = async (eventId) => {
  return await apiClient.get(`/api/events/${eventId}`);
};

// Update event by ID
export const UpdateEventAPI = async (eventId, data) => {
  return await apiClient.put(`/api/events/${eventId}`, data);
};

// Get all events with pagination
export const GetAllEventsAPI = async (params) => {
  return await apiClient.get(`/api/events/`, { params });
};

// Get all events with pagination
export const GetAllOrganizationEventsAPI = async (organizationId) => {
  return await apiClient.get(`/api/events/organization/${organizationId}`);
};

// Delete an event
export const DeleteEventAPI = async (eventId, userId) => {
  return await apiClient.delete(`/api/events/${eventId}`, {
    params: { userId }
  });
};

// Update event status
export const GetEventStatusAPI = async (eventId, statusData) => {
  return await apiClient.get(`/api/events/${eventId}/status`, statusData);
};

// =============== EVENT CREATION STEPS APIs ===============

// Step 2: Update event location
export const UpdateEventLocationAPI = async (eventId, locationData) => {
  return await apiClient.put(`/api/events/${eventId}/location`, locationData);
};

// Step 3: Update event date and time
export const UpdateEventDateTimeAPI = async (eventId, dateTimeData) => {
  return await apiClient.put(`/api/events/${eventId}/date-time`, dateTimeData);
};

// Step 4: Update event description
export const UpdateEventDescriptionAPI = async (eventId, descriptionData) => {
  return await apiClient.put(`/api/events/${eventId}/description`, descriptionData);
};

// Step 5: Upload event banner image
export const UploadEventBannerAPI = async (eventId, formData) => {
  return await apiClient.put(`/api/events/${eventId}/banner-image`, formData);
};

// Step 6: Update event tickets
export const UpdateEventTicketsAPI = async (eventId, ticketsData) => {
  return await apiClient.put(`/api/events/${eventId}/tickets`, ticketsData);
};

// Step 7: Update event discount codes
export const UpdateEventDiscountCodesAPI = async (eventId, discountCodesData) => {
  return await apiClient.put(`/api/events/${eventId}/discount-codes`, discountCodesData);
};

// Step 8: Publish event
export const PublishEventAPI = async (eventId, publishData) => {
  return await apiClient.put(`/api/events/${eventId}/publish`, publishData);
};

// =============== EVENT DATA FETCHING APIs ===============

// Get event location
export const GetEventLocationAPI = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/location`);
};

// Get event date and time
export const GetEventDateTimeAPI = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/date-time`);
};

// Get event description
export const GetEventDescriptionAPI = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/description`);
};

// Get event banner image
export const GetEventBannerAPI = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/banner-image`);
};

// Get event tickets
export const GetEventTicketsAPI = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/tickets`);
};

// Get event discount codes
export const GetEventDiscountCodesAPI = async (eventId) => {
  return await apiClient.get(`/api/events/${eventId}/discount-codes`);
};

// Get event creation status
export const GetEventCreationStatusAPI = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/status`);
};

// Get all orders for a specific event
export const GetEventOrdersAPI = async (eventId) => {
  return await apiClient.get(`/orgDashboard/admin/events/${eventId}/orders`);
};

// NEW: API to get all attendees for a specific event
export const GetEventAttendeesAPI = async (eventId) => {
  return await apiClient.get(`/orgDashboard/admin/events/${eventId}/attendees`);
};

// Donation notes for an event (donation ticket lines)
export const GetEventDonationNotesAPI = async (eventId) => {
  return await apiClient.get(`/orgDashboard/admin/events/${eventId}/donation-notes`);
};

// NEW: API to get all dashboard overview data for a specific event
export const GetEventDashboardAPI = async (eventId) => {
  return await apiClient.get(`/orgDashboard/events/${eventId}/dashboard`);
};

export const ReissueOrderEmailAPI = async (orderId) => {
  return await apiClient.post(`/api/admin/orders/${orderId}/reissue-email`);
};

// Org-console style payout APIs (used for event manage payout view)
export const GetPayoutEligibilityAPI = async (eventId) => {
  return await apiClient.get('/api/payouts/eligibility', { params: { eventId: Number(eventId) } });
};

export const GetPayoutRequestsAPI = async (eventId) => {
  return await apiClient.get('/api/payouts/requests', { params: { eventId: Number(eventId) } });
};

export const CreatePayoutRequestAPI = async (body) => {
  return await apiClient.post('/api/payouts/request', {
    eventId: Number(body.eventId),
    amount: Number(body.amount),
    payoutType: body.payoutType,
  });
};

export const GetEventTicketStructuresAPI = async (eventId) => {
  return await apiClient.get(`/api/events/${eventId}/ticket-structures`);
};

// NEW: API to update a ticket structure by its ID
export const UpdateTicketStructureAPI = async (ticketStructureId, data) => {
  return await apiClient.put(`/api/events/ticket-structures/${ticketStructureId}`, data);
};

export const DeleteTicketStructureAPI = async (ticketStructureId) => {
  return await apiClient.delete(`/api/events/ticket-structures/${ticketStructureId}`);
};

export const CreateTicketStructureAPI = async (eventId, data) => {
  return await apiClient.post(`/api/events/${eventId}/ticket-structures`, data);
};

// =============== EMAIL CAMPAIGN APIs ===============

// Create a new campaign
export const CreateEmailCampaignAPI = async (data) => {
  return await apiClient.post("/admin/email-campaigns", data);
};

// Send a campaign by ID
export const SendEmailCampaignAPI = async (campaignId) => {
  return await apiClient.post(`/admin/email-campaigns/${campaignId}/send`);
};

// Get all campaigns (optional, for listing/history)
export const GetAllEmailCampaignsAPI = async () => {
  return await apiClient.get("/admin/email-campaigns");
};

// Get campaign by ID (optional, for preview/edit)
export const GetEmailCampaignByIdAPI = async (id) => {
  return await apiClient.get(`/admin/email-campaigns/${id}`);
};

// =============== SCANNER USER APIs ===============
export const CreateScannerUserAPI = async (data) => {
  return await apiClient.post("/admin/scanner-users", data);
};

export const GetAttendeeScanner = async () => {
  return await apiClient.get(`/scanner/attendees`);
};

export const CheckInAttendeeAPI = async (ticketId) => {
  return await apiClient.post(`/scanner/checkin/${ticketId}`);
};

export const VerifyQrCodeAPI = async (data) => {
  return await apiClient.post("/scanner/verify", data);
};

export const CheckoutAttendeeAPI = async (ticketId) => {
  return await apiClient.post(`/scanner/checkout/${ticketId}`);
};

// =============== ORGANIZATION APIs ===============

// Get all organizations (Super Admin)
export const GetAllOrganizationsAPI = async (data) => {
  return await apiClient.post("/api/organizations/getAll", data);
};

// =============== USERS / ADMINS APIs ===============
export const GetAllAdminsAPI = async (data) => {
  return await apiClient.post("/admin/getAllAdmins", data);
};

// =============== SUPER ADMIN – PAYOUT REQUESTS ===============
// All require Bearer token; 403 = super admin access required.

export const GetPayoutsAPI = async () => {
  return await apiClient.get("/admin/payouts");
};

export const CancelPayoutAPI = async (id) => {
  return await apiClient.post(`/admin/payouts/${id}/cancel`);
};

export const MarkPayoutPaidAPI = async (id) => {
  return await apiClient.post(`/admin/payouts/${id}/mark-paid`);
};

export const GetPayoutOrganizerContactAPI = async (id) => {
  return await apiClient.get(`/admin/payouts/${id}/organizer-contact`);
};

export const ContactOrganizerAPI = async (payoutRequestId, payload) => {
  return await apiClient.post(`/admin/payouts/${payoutRequestId}/contact-organizer`, payload);
};

/** Returns binary PDF; use responseType 'arraybuffer' or 'blob' and trigger download. */
export const GetPayoutBillAPI = async (id) => {
  return await apiClient.get(`/admin/payouts/${id}/bill`, { responseType: "blob" });
};

// =============== SUPER ADMIN – REVENUE DASHBOARD ===============
/** Get revenue dashboard (super admin only). 403 = super admin required.
 *  params: { from?: string (YYYY-MM-DD), to?: string (YYYY-MM-DD), granularity?: 'WEEKLY' | 'MONTHLY' | 'YEARLY' }
 *  Only netRevenueTrend is filtered by from/to/granularity; other metrics are platform-wide.
 *  Response: { data: { totalRevenue, netProfit, topPerformingOrganisers, netRevenueTrend, payoutSummary: { pendingCount, completedCount } } }
 */
export const GetRevenueDashboardAPI = async (params = {}) => {
  return await apiClient.get("/admin/revenue-dashboard", { params });
};

// =============== SUPER ADMIN – FEE CONFIGURATION ===============
// All require Bearer token; 403 = super admin access required.

/** Get default platform fee. Response: { data: { percent, fixed, display } } */
export const GetFeeConfigDefaultAPI = async () => {
  return await apiClient.get("/admin/fee-config/default");
};

/** List fee configuration (one row per org). Response: { data: [{ organizationId, organizationName, mode, feeDisplay, percent, fixed, notes, lastUpdated, hasOverride, feeMode }] } */
export const GetFeeConfigListAPI = async () => {
  return await apiClient.get("/admin/fee-config");
};

/** List organizations for Add/Edit dropdown. Response: { data: [{ id, name }] } */
export const GetFeeConfigOrganizationsAPI = async () => {
  return await apiClient.get("/admin/fee-config/organizations");
};

/** Create or update organization fee. Body: { organizationId, mode?, percent, fixed, notes }. mode optional, only OVERRIDE supported. */
export const SaveFeeConfigAPI = async (body) => {
  return await apiClient.post("/admin/fee-config", body);
};

/** Delete organization fee override. */
export const DeleteFeeConfigAPI = async (organizationId) => {
  return await apiClient.delete(`/admin/fee-config/${organizationId}`);
};

/** Get fee history for an organization. Response: { data: [{ timestamp, admin, action, oldValue, newValue }] } */
export const GetFeeConfigHistoryAPI = async (organizationId) => {
  return await apiClient.get("/admin/fee-config/history", { params: { organizationId } });
};
