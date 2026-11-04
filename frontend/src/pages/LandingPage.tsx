import React from 'react';
import { LandingNavbar } from '../components/landing/Navbar';
import { LandingHero } from '../components/landing/Hero';
import { LandingFeatures } from '../components/landing/Features';
import { LandingHowItWorks } from '../components/landing/HowItWorks';
import { LandingProductPreview } from '../components/landing/ProductPreview';
import { LandingAbout } from '../components/landing/About';
import { LandingFinalCTA } from '../components/landing/FinalCTA';
import { LandingFooter } from '../components/landing/Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingProductPreview />
        <LandingAbout />
        <LandingFinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
};
