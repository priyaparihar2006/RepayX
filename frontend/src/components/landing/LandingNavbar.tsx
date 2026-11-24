import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router';

interface LandingNavbarProps {
  onOpenDemoModal: () => void;
  onOpenLoginModal: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onOpenDemoModal,
  onOpenLoginModal,
}) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 84;
      const elementPosition = element.getBoundingClientRect().top;
      const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const offsetPosition = elementPosition + currentScroll - navOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
      try {
        window.history.pushState(null, '', `#${id}`);
      } catch {}
    } else if (id === 'contact') {
      onOpenDemoModal();
    }
  };

  const navLinks = [
    { label: 'Home', id: 'hero' },
    { label: 'Platform', id: 'platform' },
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Simulator', id: 'simulator' },
    { label: 'Security', id: 'security' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#101D25]/90 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/20 py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 flex-nowrap">
          {/* Logo & Brand */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-3 group text-left cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#168653] to-[#5DE5A1] p-0.5 shadow-md shadow-[#168653]/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#101D25] rounded-[10px] flex items-center justify-center text-white font-extrabold text-base tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5DE5A1] to-white">
                  R
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white font-heading">
                  Repay<span className="text-[#5DE5A1]">X</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#168653]/30 text-[#5DE5A1] border border-[#5DE5A1]/20">
                  AI
                </span>
              </div>
              <span className="block text-[10px] font-medium text-slate-400 tracking-wide uppercase">
                Loan Recovery Platform
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex-nowrap shrink-0" aria-label="Main menu">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer whitespace-nowrap"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3 shrink-0">
            <button
              onClick={onOpenLoginModal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="relative group overflow-hidden px-4 py-2 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold text-xs shadow-md shadow-[#168653]/30 hover:shadow-lg hover:shadow-[#5DE5A1]/30 hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold text-xs"
            >
              Get Started
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#142630] border-b border-white/10 px-4 pt-4 pb-6 space-y-3 shadow-2xl animate-fadeIn">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-left px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemoModal();
              }}
              className="text-left px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
            >
              Contact / Request Demo
            </button>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/whatsapp');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#101D25] border border-[#5DE5A1]/40 text-[#5DE5A1] font-bold text-xs flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open WhatsApp Automation</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/dashboard');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#168653] to-[#5DE5A1] text-[#101D25] font-bold text-xs shadow-md shadow-[#168653]/30 flex items-center justify-center gap-1.5"
            >
              <span>Explore Operational Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLoginModal();
              }}
              className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-white"
            >
              Sign In with API Key
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
