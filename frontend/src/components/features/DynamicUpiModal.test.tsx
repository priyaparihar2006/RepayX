import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamicUpiModal } from './DynamicUpiModal';
import { paymentsApi } from '../../services/payments';

vi.mock('../../services/payments', () => ({
  paymentsApi: {
    createPaymentLink: vi.fn(),
    simulateWebhook: vi.fn(),
  },
}));

describe('DynamicUpiModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (paymentsApi.createPaymentLink as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      payment_link_id: 'plink_test123',
      short_url: 'https://rzp.io/rzp/test123',
      amount: 8500,
      currency: 'INR',
      status: 'created',
      customer_id: '385057',
      loan_id: 'LN1001',
    });
    (paymentsApi.simulateWebhook as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { status: 'paid' },
    });
  });

  it('renders modal with Razorpay header, borrower details, and switches tabs', async () => {
    render(
      <DynamicUpiModal
        isOpen={true}
        onClose={vi.fn()}
        borrowerName="Rahul Sharma"
        loanId="LN1001"
        amount={8500}
      />
    );

    expect(screen.getByText(/Razorpay Dynamic QR & Payment Gateway/i)).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('₹8,500')).toBeInTheDocument();

    // Verify tabs
    const upiTab = screen.getByText(/UPI Apps/i);
    const rzpTab = screen.getByText(/Razorpay Web Checkout/i);
    expect(upiTab).toBeInTheDocument();
    expect(rzpTab).toBeInTheDocument();

    // Click Razorpay tab
    fireEvent.click(rzpTab);

    // Wait for payment link data
    await waitFor(() => {
      expect(screen.getByText('plink_test123')).toBeInTheDocument();
    });
  });

  it('simulates instant webhook payment settlement and shows reconciled status', async () => {
    const handleSettled = vi.fn();
    render(
      <DynamicUpiModal
        isOpen={true}
        onClose={vi.fn()}
        borrowerName="Rahul Sharma"
        loanId="LN1001"
        amount={8500}
        onPaymentSettled={handleSettled}
      />
    );

    const simulateBtn = screen.getByText(/Simulate Instant Razorpay Webhook Settlement/i);
    expect(simulateBtn).toBeInTheDocument();

    fireEvent.click(simulateBtn);

    await waitFor(
      () => {
        expect(screen.getByText(/Payment Successfully Reconciled!/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(handleSettled).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'LN1001',
        amount: 8500,
        borrowerName: 'Rahul Sharma',
      })
    );
  });
});
