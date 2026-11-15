import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingPage } from './LandingPage';
import { location, renderAt } from '../test/render';

describe('LandingPage', () => {
  it('renders hero headline, tagline, and CTA buttons', () => {
    renderAt(<LandingPage />, { url: '/', path: '/' });

    expect(screen.getAllByText(/Recover Smarter\./i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Collect Faster\./i).length).toBeGreaterThan(0);
    expect(screen.getByText(/AI-powered loan recovery platform/i)).toBeInTheDocument();

    const exploreBtns = screen.getAllByRole('button', { name: /Explore RepayX/i });
    expect(exploreBtns.length).toBeGreaterThan(0);

    const demoBtns = screen.getAllByRole('button', { name: /Request a Demo/i });
    expect(demoBtns.length).toBeGreaterThan(0);
  });

  it('renders all four statistical metric cards', () => {
    renderAt(<LandingPage />, { url: '/', path: '/' });

    expect(screen.getAllByText('Customers Managed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active Reminders').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delivery Rate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Amount Recovered').length).toBeGreaterThan(0);
  });

  it('renders how it works 4-step workflow', () => {
    renderAt(<LandingPage />, { url: '/', path: '/' });

    expect(screen.getAllByText('STEP 01').length).toBeGreaterThan(0);
    expect(screen.getByText('Upload Customer Data')).toBeInTheDocument();
    expect(screen.getAllByText('STEP 02').length).toBeGreaterThan(0);
    expect(screen.getByText('AI-Powered Analysis')).toBeInTheDocument();
    expect(screen.getAllByText('STEP 03').length).toBeGreaterThan(0);
    expect(screen.getByText('Automated Communication')).toBeInTheDocument();
    expect(screen.getAllByText('STEP 04').length).toBeGreaterThan(0);
    expect(screen.getByText('Intelligent Recovery')).toBeInTheDocument();
  });

  it('allows interacting with the AI Recovery Simulator', async () => {
    renderAt(<LandingPage />, { url: '/', path: '/' });

    expect(screen.getByText(/Experience Autonomous Recovery/i)).toBeInTheDocument();
    expect(screen.getByText('Rahul Verma (5 DPD)')).toBeInTheDocument();

    // Switch scenario
    const ananyaBtn = screen.getByRole('button', { name: /Ananya Deshmukh/i });
    fireEvent.click(ananyaBtn);

    expect(screen.getByText('Ananya Deshmukh')).toBeInTheDocument();
    expect(screen.getByText(/LN-91823/i)).toBeInTheDocument();

    // Start simulation
    const startBtn = screen.getByRole('button', { name: /Start AI Recovery Demo/i });
    fireEvent.click(startBtn);

    expect(screen.getByText(/Simulating Recovery/i)).toBeInTheDocument();
  });

  it('opens and submits the Demo Request modal', async () => {
    const user = userEvent.setup();
    renderAt(<LandingPage />, { url: '/', path: '/' });

    const [demoBtn] = screen.getAllByRole('button', { name: /Request a Demo/i });
    await user.click(demoBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Request a Custom Demo')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Priya Sharma');
    const emailInput = screen.getByPlaceholderText('priya@fintech-nbfc.in');
    const institutionInput = screen.getByPlaceholderText('Apex Capital');

    await user.type(nameInput, 'Amit Saxena');
    await user.type(emailInput, 'amit@nbfc-loans.in');
    await user.type(institutionInput, 'Prism Finance');

    const submitBtn = screen.getByRole('button', { name: /Confirm Request/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Demo Request Confirmed')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('opens the Quick Login modal', async () => {
    const user = userEvent.setup();
    renderAt(<LandingPage />, { url: '/', path: '/' });

    const [loginBtn] = screen.getAllByRole('button', { name: /Login/i });
    await user.click(loginBtn);

    expect(screen.getByText('Welcome to RepayX')).toBeInTheDocument();
    expect(screen.getByText('Recovery Operational Cockpit')).toBeInTheDocument();
    expect(screen.getByText('Reminder Automation Key Gate')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter API authorization key/i)).toBeInTheDocument();
  });

  it('switches steps in How It Works section and shows corresponding action buttons', async () => {
    const user = userEvent.setup();
    renderAt(<LandingPage />, { url: '/', path: '/' });

    // Step 01 default
    expect(screen.getByRole('button', { name: /Try CSV Customer Ingestion/i })).toBeInTheDocument();

    // Click step 2
    const [step2] = screen.getAllByText('STEP 02');
    await user.click(step2);
    expect(screen.getByRole('button', { name: /Explore Delinquency Risk Models/i })).toBeInTheDocument();

    // Click step 3
    const [step3] = screen.getAllByText('STEP 03');
    await user.click(step3);
    expect(screen.getByRole('button', { name: /Launch WhatsApp & Channel Outreach/i })).toBeInTheDocument();

    // Click step 4
    const [step4] = screen.getAllByText('STEP 04');
    await user.click(step4);
    expect(screen.getByRole('button', { name: /View Settlement Cockpit on Dashboard/i })).toBeInTheDocument();
  });

  it('navigates to dashboard when clicking Explore RepayX', async () => {
    const user = userEvent.setup();
    renderAt(<LandingPage />, { url: '/', path: '/' });

    const [exploreBtn] = screen.getAllByRole('button', { name: /Explore RepayX/i });
    await user.click(exploreBtn);

    expect(location()).toBe('/dashboard');
  });

  it('navigates to whatsapp when clicking floating WhatsApp quick launcher', async () => {
    const user = userEvent.setup();
    renderAt(<LandingPage />, { url: '/', path: '/' });

    const [waFloatingBtn] = screen.getAllByRole('button', { name: /WhatsApp/i });
    await user.click(waFloatingBtn);

    expect(location()).toBe('/whatsapp');
  });
});
