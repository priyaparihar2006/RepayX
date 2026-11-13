import React, { useState } from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingHero } from '../components/landing/LandingHero';
import { StatsSection } from '../components/landing/StatsSection';
import { InteractiveDashboardPreview } from '../components/landing/InteractiveDashboardPreview';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { FeatureShowcase } from '../components/landing/FeatureShowcase';
import { AiRecoverySimulator } from '../components/landing/AiRecoverySimulator';
import { SecurityTrustSection } from '../components/landing/SecurityTrustSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';
import { LandingFooter } from '../components/landing/LandingFooter';
import { DemoRequestModal } from '../components/landing/DemoRequestModal';
import { LoginQuickModal } from '../components/landing/LoginQuickModal';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#101D25] text-white selection:bg-[#168653] selection:text-white font-sans antialiased">
      {/* Modals */}
      <DemoRequestModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
      <LoginQuickModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onOpenContactModal={() => setDemoModalOpen(true)}
      />

      {/* Top Navbar */}
      <LandingNavbar
        onOpenDemoModal={() => setDemoModalOpen(true)}
        onOpenLoginModal={() => setLoginModalOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        {/* 1. Cinematic Hero */}
        <LandingHero onOpenDemoModal={() => setDemoModalOpen(true)} />

        {/* 2. Platform Statistics */}
        <StatsSection />

        {/* 3. Interactive Product Dashboard Preview */}
        <InteractiveDashboardPreview />

        {/* 4. How RepayX Works (4-Stage Workflow) */}
        <HowItWorksSection />

        {/* 5. Deep-Dive Feature Showcase */}
        <FeatureShowcase />

        {/* 6. Interactive AI Recovery Simulator */}
        <AiRecoverySimulator />

        {/* 7. Security & Trust Architecture */}
        <SecurityTrustSection />

        {/* 8. Final High-Impact CTA */}
        <FinalCtaSection onOpenDemoModal={() => setDemoModalOpen(true)} />
      </main>

      {/* Footer */}
      <LandingFooter onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* Floating Operational App Launcher Pill */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#142630]/90 hover:bg-[#142630] border border-[#5DE5A1]/40 text-white shadow-2xl shadow-black/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
        >
          <span className="w-2 h-2 rounded-full bg-[#5DE5A1] animate-ping" />
          <span>Launch Live Cockpit</span>
          <ArrowUpRight className="w-4 h-4 text-[#5DE5A1] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
