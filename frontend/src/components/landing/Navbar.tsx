import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-zinc-200/80 shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-md shadow-zinc-950/10 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-black tracking-tight flex items-center gap-1.5">
                SeatWise
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-300 font-semibold">
                  JU
                </span>
              </span>
              <p className="text-[10px] text-zinc-500 font-medium leading-none">
                Jain University Seating
              </p>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
            >
              Planner Preview
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium text-zinc-600 hover:text-black transition-colors"
            >
              About
            </button>
          </div>

          {/* Right: Sign In / Portal CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 group border border-black"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-zinc-200 px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-zinc-700 hover:text-black"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="block w-full text-left py-2 text-sm font-medium text-zinc-700 hover:text-black"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="block w-full text-left py-2 text-sm font-medium text-zinc-700 hover:text-black"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('preview')}
            className="block w-full text-left py-2 text-sm font-medium text-zinc-700 hover:text-black"
          >
            Planner Preview
          </button>
          <button
            onClick={() => scrollToSection('about')}
            className="block w-full text-left py-2 text-sm font-medium text-zinc-700 hover:text-black"
          >
            About
          </button>
          <div className="pt-3 border-t border-zinc-200">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-sm font-semibold flex items-center justify-center gap-2 border border-black"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
