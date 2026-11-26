import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import RefundsPage from "./RefundsPage";
import { GetAdminRefundsAPI, ProcessRefundAPI, LookupOrderForRefundAPI, RecordStripeRefundAPI } from "../../services/allApis";

jest.mock("../../services/allApis", () => ({
  GetAdminRefundsAPI: jest.fn(),
  ProcessRefundAPI: jest.fn(),
  LookupOrderForRefundAPI: jest.fn(),
  RecordStripeRefundAPI: jest.fn(),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const row = (status = "APPROVED", over = {}) => ({
  request: {
    id: 5, status, orderId: 91827, customerName: "Alex R", customerEmail: "alex@example.com", reason: "Unable to attend",
    tickets: [{ ticketId: 10, attendeeName: "Alex", ticketType: "Early bird", amount: 15 }],
    wholeOrder: true, orderTicketCount: 1, originalPayment: 16.77, serviceFee: 1.77, refundAmount: 15,
  },
  eventId: 201, eventName: "Singularity", organizationName: "Org", stripePaymentIntentId: "pi_1", problem: null,
  failureReason: null, organiserShortfall: null, ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  GetAdminRefundsAPI.mockResolvedValue({ data: [row()] });
  ProcessRefundAPI.mockResolvedValue({ data: row("REFUNDED") });
});

test("refunds only after confirming, without sending an amount", async () => {
  render(<RefundsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Refund $15.00" }));
  expect(ProcessRefundAPI).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Refund $15.00" }));
  await waitFor(() => expect(ProcessRefundAPI).toHaveBeenCalledWith(5));
  expect(ProcessRefundAPI).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("a refund that can't be sent is blocked and says why", async () => {
  GetAdminRefundsAPI.mockResolvedValue({ data: [row("APPROVED", { problem: "Alex has already checked in with this ticket." })] });
  render(<RefundsPage />);
  expect(await screen.findByRole("button", { name: "Refund $15.00" })).toBeDisabled();
  expect(screen.getByText(/already checked in/)).toBeInTheDocument();
});

test("warns before refunding money the organiser was already paid", async () => {
  GetAdminRefundsAPI.mockResolvedValue({ data: [row("APPROVED", { organiserShortfall: 10 })] });
  render(<RefundsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Refund $15.00" }));
  expect(within(screen.getByRole("dialog")).getByText(/\$10\.00 short/)).toBeInTheDocument();
});

test("a processing refund can only be checked, not sent again", async () => {
  GetAdminRefundsAPI.mockResolvedValue({ data: [row("PROCESSING")] });
  render(<RefundsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Processing (1)" }));
  expect(screen.getByRole("button", { name: "Check with Stripe" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Refund \$/ })).not.toBeInTheDocument();
});

test("records a refund made in the Stripe Dashboard", async () => {
  LookupOrderForRefundAPI.mockResolvedValue({
    data: { orderId: 339, status: "CANCELLED", customerName: "Dean", eventName: "Event", grandTotal: 53.72,
      tickets: [{ ticketId: 1, attendeeName: "Dean", ticketType: "Donation", amount: 50, refunded: false }] },
  });
  RecordStripeRefundAPI.mockResolvedValue({});
  render(<RefundsPage />);
  await screen.findByText("Alex R");
  fireEvent.click(screen.getByRole("button", { name: /Record a Stripe refund/ }));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("button", { name: "Record refund" })).toBeDisabled();
  fireEvent.change(dialog.getByLabelText(/Order number/), { target: { value: "#339" } });
  fireEvent.click(dialog.getByRole("button", { name: "Find" }));
  fireEvent.change(await dialog.findByLabelText(/Stripe refund ID/), { target: { value: " re_abc123 " } });
  fireEvent.click(dialog.getByRole("button", { name: "Record refund" }));
  await waitFor(() => expect(RecordStripeRefundAPI).toHaveBeenCalledWith({ orderId: 339, stripeRefundId: "re_abc123", ticketIds: [1] }));
  expect(LookupOrderForRefundAPI).toHaveBeenCalledWith("339");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
