import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MarketingLayout } from './MarketingLayout';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'Errand Kanban',
    question: 'How is Family Essentials different from Apple Reminders or Google Keep?',
    answer:
      'Apple Reminders and Google Keep are general-purpose scratchpads. They lack single-assignee enforcement (leading to bystander apathy), store geofence arrival detection, integer-minor-unit ledgers, and direct one-tap mobile calling when urgent tasks need immediate attention.',
  },
  {
    category: 'Errand Kanban',
    question: 'Can two people share responsibility for the same errand?',
    answer:
      'We intentionally enforce single named ownership. Our research shows that shared ownership breeds ambiguity where both partners assume the other took care of it. One person is assigned, but anyone in the household can reassign or complete it with one tap.',
  },
  {
    category: 'Geofencing',
    question: 'Does Family Essentials track my continuous GPS location or live speed?',
    answer:
      'No. We strictly use native iOS and Android region-monitoring APIs (geofences). Your device only checks in when entering or leaving a 150m perimeter around your explicitly saved stores (e.g. Costco, Pharmacy). We never store or trace your continuous breadcrumb route.',
  },
  {
    category: 'Geofencing',
    question: 'Will background geofencing drain my smartphone battery?',
    answer:
      'No. Because we utilize cellular tower and Wi-Fi assisted OS region monitoring rather than constant high-power GPS polling, the daily battery impact is negligible (under 1% per full day).',
  },
  {
    category: 'Direct Calling',
    question: 'How does direct phone calling work on mobile phones?',
    answer:
      'When an errand is flagged as urgent or becomes overdue, any family member can tap the Call button. The app immediately passes the assignee’s phone number into your smartphone’s native dialer so you can ring them directly—with zero third-party setup or robocall fees required.',
  },
  {
    category: 'Direct Calling',
    question: 'Do I need any third-party telephony accounts or special setup to make calls?',
    answer:
      'No! Family Essentials requires no third-party telephony or telecom APIs. It leverages your mobile phone’s built-in dialer (iOS Phone app or Android dialer) using standard device calling.',
  },
  {
    category: 'Shared Ledgers',
    question: 'Do I need to connect my credit card or bank login to use the Money ledger?',
    answer:
      'Never. Family Essentials uses lightweight manual entry. We do not use Plaid or scrape your bank transactions. You maintain 100% financial privacy while keeping domestic reimbursements clear.',
  },
  {
    category: 'Security & Privacy',
    question: 'How is our family’s data isolated in your database?',
    answer:
      'Family Essentials is built on PostgreSQL Row-Level Security (RLS) with strict multi-tenant schema isolation. Every API request is verified against your tenant token, making it mathematically impossible for one household to query another household’s data.',
  },
  {
    category: 'Security & Privacy',
    question: 'Can kids access household billing or financial ledgers?',
    answer:
      'No. We offer four distinct role tiers: Household Admin, Adult, Teen, and Child. Non-admin members are prevented from accessing billing, and Teen/Child roles can be restricted to view task checklists only.',
  },
];

export function FaqPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const categories = ['All', 'Errand Kanban', 'Geofencing', 'Direct Calling', 'Shared Ledgers', 'Security & Privacy'];

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
      const matchesSearch =
        search.trim() === '' ||
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Knowledge Base & AEO Direct Answers</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Frequently Asked Questions
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about Family Essentials, geofences, phone escalations, privacy, and plans.
          </p>

          {/* Search Bar */}
          <div className="mt-7 relative max-w-xl mx-auto">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <Icon name="search" className="text-[20px]" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions (e.g. battery, geofencing, bank sync)..."
              className="w-full h-12 rounded-2xl border border-outline-variant/40 bg-surface pl-12 pr-4 text-body-md text-on-surface placeholder:text-muted focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 shadow-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-label-sm font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-secondary text-white shadow-xs'
                    : 'bg-surface border border-outline-variant/30 text-on-surface-variant hover:bg-sage-soft'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs List */}
        <div className="mt-12 flex flex-col gap-3.5">
          {filteredFaqs.length === 0 ? (
            <Card className="p-8 text-center text-muted">
              <p>No questions matched your query. Try a different search term or contact support.</p>
            </Card>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;

              return (
                <Card
                  key={faq.question}
                  className="p-4 sm:p-5 border-outline-variant/30 cursor-pointer transition-colors hover:border-secondary/30"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-bold text-secondary block sm:hidden">
                      {faq.category}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-on-surface text-left">
                      {faq.question}
                    </h2>
                    <Icon
                      name="expand_more"
                      className={`text-[20px] text-muted shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-secondary' : ''
                      }`}
                    />
                  </div>

                  {isOpen && (
                    <p className="mt-2.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant/15 pt-2.5">
                      {faq.answer}
                    </p>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Still Have Questions Card */}
        <div className="mt-14 rounded-3xl bg-forest-soft/60 border border-secondary/20 p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Still have questions?</h2>
          <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">
            Our engineering and support team is here to assist with custom household requirements or multi-home setups.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link to="/contact">
              <Button variant="primary" size="lg">
                Contact Family Essentials Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
