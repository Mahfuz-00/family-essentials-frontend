import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { FEATURES, SOLUTIONS } from './marketingData';

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
    setSolutionsDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-on-surface antialiased selection:bg-secondary/20 selection:text-secondary">
      {/* -------------------------------------------------------------
          1. STICKY / GLASSMORPHIC NAVIGATION BAR (Softrly Style)
      -------------------------------------------------------------- */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          scrolled
            ? 'bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-e1 py-3'
            : 'bg-canvas/90 backdrop-blur-md border-b border-outline-variant/15 py-4'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Emblem */}
          <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.01]">
            <BrandLogo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {/* Features Dropdown Menu */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesDropdownOpen(true)}
              onMouseLeave={() => setFeaturesDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
                aria-expanded={featuresDropdownOpen}
              >
                <span>Features</span>
                <Icon
                  name="expand_more"
                  className={`text-[18px] transition-transform duration-200 ${
                    featuresDropdownOpen ? 'rotate-180 text-secondary' : ''
                  }`}
                />
              </button>

              {/* Mega Dropdown Panel */}
              {featuresDropdownOpen && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2 w-[640px] z-50">
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface/98 p-4 shadow-e3 backdrop-blur-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="mb-2 flex items-center justify-between border-b border-outline-variant/20 px-2 pb-2">
                      <span className="text-label-xs font-bold uppercase tracking-wider text-muted">
                        Core Household Modules
                      </span>
                      <Link
                        to="/features"
                        className="text-label-xs font-bold text-secondary hover:underline inline-flex items-center gap-1"
                      >
                        <span>View all modules</span>
                        <Icon name="arrow_forward" className="text-[12px]" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {FEATURES.map((feat) => (
                        <Link
                          key={feat.slug}
                          to="/features/$slug"
                          params={{ slug: feat.slug }}
                          className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-sage-soft/70"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary transition-transform group-hover:scale-105 group-hover:bg-secondary group-hover:text-white">
                            <Icon name={feat.icon} className="text-[20px]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface group-hover:text-secondary">
                              {feat.name}
                            </span>
                            <span className="text-xs text-muted line-clamp-1 leading-normal">
                              {feat.shortTag}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-forest-soft/50 px-4 py-2.5">
                      <span className="text-body-xs font-medium text-on-surface-variant">
                        Need multi-home or estate management?
                      </span>
                      <Link
                        to="/contact"
                        className="text-label-sm font-bold text-secondary hover:underline"
                      >
                        Talk to an architect →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Dropdown Menu */}
            <div
              className="relative"
              onMouseEnter={() => setSolutionsDropdownOpen(true)}
              onMouseLeave={() => setSolutionsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
                aria-expanded={solutionsDropdownOpen}
              >
                <span>Solutions</span>
                <Icon
                  name="expand_more"
                  className={`text-[18px] transition-transform duration-200 ${
                    solutionsDropdownOpen ? 'rotate-180 text-secondary' : ''
                  }`}
                />
              </button>

              {/* Solutions Mega Dropdown */}
              {solutionsDropdownOpen && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2 w-[480px] z-50">
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface/98 p-4 shadow-e3 backdrop-blur-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="mb-2 flex items-center justify-between border-b border-outline-variant/20 px-2 pb-2">
                      <span className="text-label-xs font-bold uppercase tracking-wider text-muted">
                        Tailored for Your Family
                      </span>
                      <Link
                        to="/solutions"
                        className="text-label-xs font-bold text-secondary hover:underline inline-flex items-center gap-1"
                      >
                        <span>All solutions</span>
                        <Icon name="arrow_forward" className="text-[12px]" />
                      </Link>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {SOLUTIONS.map((sol) => (
                        <Link
                          key={sol.slug}
                          to="/solutions/$slug"
                          params={{ slug: sol.slug }}
                          className="group flex items-center gap-3.5 rounded-xl p-3 transition-colors hover:bg-sage-soft/70"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary transition-transform group-hover:scale-105 group-hover:bg-secondary group-hover:text-white">
                            <Icon name={sol.icon} className="text-[20px]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface group-hover:text-secondary">
                              {sol.title}
                            </span>
                            <span className="text-xs text-muted line-clamp-1 leading-normal">
                              {sol.subtitle}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Links */}
            <Link
              to="/pricing"
              className="rounded-xl px-3.5 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
            >
              Pricing
            </Link>

            <Link
              to="/about"
              className="rounded-xl px-3.5 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
            >
              About
            </Link>

            <Link
              to="/faq"
              className="rounded-xl px-3.5 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
            >
              FAQ
            </Link>

            <Link
              to="/contact"
              className="rounded-xl px-3.5 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
            >
              Contact
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="primary" size="md" className="shadow-e1 gap-2">
                  <Icon name="cottage" className="text-[18px]" />
                  <span>Open Dashboard</span>
                  <Icon name="arrow_forward" className="text-[14px]" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="md">
                    Sign In
                  </Button>
                </Link>

                <Link to="/register">
                  <Button variant="primary" size="md" className="shadow-e1 gap-1.5">
                    <span>Get Started Free</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant transition-colors hover:bg-sage-soft lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[22px]" />
          </button>
        </div>

        {/* -------------------------------------------------------------
            MOBILE DRAWER (Softrly Style)
        -------------------------------------------------------------- */}
        {mobileMenuOpen && (
          <div className="border-b border-outline-variant/30 bg-surface px-4 py-5 shadow-e4 lg:hidden">
            <div className="flex flex-col gap-4">
              {/* Features Accordion */}
              <div>
                <span className="text-label-xs font-bold uppercase tracking-wider text-muted">
                  Features
                </span>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {FEATURES.map((feat) => (
                    <Link
                      key={feat.slug}
                      to="/features/$slug"
                      params={{ slug: feat.slug }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-body-md font-medium text-on-surface hover:bg-sage-soft"
                    >
                      <Icon name={feat.icon} className="text-[18px] text-secondary" />
                      <span>{feat.name}</span>
                    </Link>
                  ))}
                  <Link
                    to="/features"
                    className="flex items-center gap-2 px-3 py-1.5 text-label-sm font-bold text-secondary"
                  >
                    <span>All Features Hub →</span>
                  </Link>
                </div>
              </div>

              {/* Solutions Accordion */}
              <div className="border-t border-outline-variant/20 pt-3">
                <span className="text-label-xs font-bold uppercase tracking-wider text-muted">
                  Solutions
                </span>
                <div className="mt-2 flex flex-col gap-1">
                  {SOLUTIONS.map((sol) => (
                    <Link
                      key={sol.slug}
                      to="/solutions/$slug"
                      params={{ slug: sol.slug }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-body-md font-medium text-on-surface hover:bg-sage-soft"
                    >
                      <Icon name={sol.icon} className="text-[18px] text-secondary" />
                      <span>{sol.title}</span>
                    </Link>
                  ))}
                  <Link
                    to="/solutions"
                    className="flex items-center gap-2 px-3 py-1.5 text-label-sm font-bold text-secondary"
                  >
                    <span>All Solutions Hub →</span>
                  </Link>
                </div>
              </div>

              {/* Direct Links */}
              <div className="flex flex-col gap-2 border-t border-outline-variant/20 pt-3">
                <Link
                  to="/pricing"
                  className="rounded-xl px-3 py-2 text-body-md font-semibold text-on-surface hover:bg-sage-soft"
                >
                  Pricing
                </Link>
                <Link
                  to="/about"
                  className="rounded-xl px-3 py-2 text-body-md font-semibold text-on-surface hover:bg-sage-soft"
                >
                  About Our Mission
                </Link>
                <Link
                  to="/faq"
                  className="rounded-xl px-3 py-2 text-body-md font-semibold text-on-surface hover:bg-sage-soft"
                >
                  Frequently Asked Questions
                </Link>
                <Link
                  to="/contact"
                  className="rounded-xl px-3 py-2 text-body-md font-semibold text-on-surface hover:bg-sage-soft"
                >
                  Contact & Enterprise
                </Link>
              </div>

              {/* Mobile CTA */}
              <div className="flex flex-col gap-2 pt-2">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="w-full">
                    <Button variant="primary" size="lg" className="w-full justify-center gap-2">
                      <Icon name="cottage" className="text-[20px]" />
                      <span>Open Dashboard</span>
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="w-full">
                      <Button variant="primary" size="lg" className="w-full justify-center">
                        Get Started Free
                      </Button>
                    </Link>
                    <Link to="/login" className="w-full">
                      <Button variant="outline" size="md" className="w-full justify-center">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------
          3. MAIN CONTENT
      -------------------------------------------------------------- */}
      <main className="flex-1">{children}</main>

      {/* -------------------------------------------------------------
          4. FOOTER (Softrly Style Multi-Column & SEO Rich)
      -------------------------------------------------------------- */}
      <footer className="border-t border-outline-variant/30 bg-surface pt-16 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            {/* Column 1: Brand & Bio */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <BrandLogo />
              <p className="max-w-sm text-body-md text-on-surface-variant leading-relaxed">
                The household logistics operating system for modern families. Eliminating bystander apathy,
                domestic mental load, and forgotten chores through single named accountability, saved-place
                checklists, and one-tap direct calling.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft px-3 py-1 text-label-sm font-semibold text-secondary">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span>PostgreSQL Row-Level Security</span>
                </span>
              </div>
            </div>

            {/* Column 2: Product & Modules */}
            <div className="flex flex-col gap-3">
              <span className="text-label-sm font-bold uppercase tracking-wider text-muted">
                Product Features
              </span>
              <ul className="flex flex-col gap-2">
                {FEATURES.map((feat) => (
                  <li key={feat.slug}>
                    <Link
                      to="/features/$slug"
                      params={{ slug: feat.slug }}
                      className="text-body-sm text-on-surface-variant transition-colors hover:text-secondary"
                    >
                      {feat.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/features"
                    className="text-body-sm font-bold text-secondary transition-colors hover:underline"
                  >
                    All Features Hub →
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Solutions by Household */}
            <div className="flex flex-col gap-3">
              <span className="text-label-sm font-bold uppercase tracking-wider text-muted">
                Solutions
              </span>
              <ul className="flex flex-col gap-2">
                {SOLUTIONS.map((sol) => (
                  <li key={sol.slug}>
                    <Link
                      to="/solutions/$slug"
                      params={{ slug: sol.slug }}
                      className="text-body-sm text-on-surface-variant transition-colors hover:text-secondary"
                    >
                      {sol.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/solutions"
                    className="text-body-sm font-bold text-secondary transition-colors hover:underline"
                  >
                    All Solutions Hub →
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Trust, Pricing & Company */}
            <div className="flex flex-col gap-3">
              <span className="text-label-sm font-bold uppercase tracking-wider text-muted">
                Company & Trust
              </span>
              <ul className="flex flex-col gap-2">
                <li>
                  <Link to="/pricing" className="text-body-sm text-on-surface-variant hover:text-secondary">
                    Transparent Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="text-body-sm text-on-surface-variant hover:text-secondary">
                    Subscription &amp; Refund Policy
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-body-sm text-on-surface-variant hover:text-secondary">
                    Our Mission & Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-body-sm text-on-surface-variant hover:text-secondary">
                    FAQ & Knowledge Base
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-body-sm text-on-surface-variant hover:text-secondary">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-body-sm text-on-surface-variant hover:text-secondary">
                    Household Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-body-sm font-bold text-secondary hover:underline">
                    Live Web Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-footer bottom row */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-outline-variant/20 pt-8 sm:flex-row text-label-sm text-muted">
            <p>© {new Date().getFullYear()} Family Essentials Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/refund-policy" className="hover:text-on-surface cursor-pointer">
                Refund Policy
              </Link>
              <span className="hover:text-on-surface cursor-pointer">Privacy Policy</span>
              <span className="hover:text-on-surface cursor-pointer">Terms of Service</span>
              <span className="hover:text-on-surface cursor-pointer">Security Safeguards</span>
              <span className="hover:text-on-surface cursor-pointer">Status: 99.99%</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
