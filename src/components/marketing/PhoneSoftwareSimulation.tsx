import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';

interface Step {
  id: number;
  stepNumber: number;
  label: string;
  badge: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    stepNumber: 1,
    label: '1. Errand',
    badge: 'SINGLE NAMED OWNER',
    title: 'One Errand, One Clear Owner',
    description:
      'Every errand on the board has exactly one named owner, a due time and a priority. Nothing is shared and nothing is unowned.',
  },
  {
    id: 2,
    stepNumber: 2,
    label: '2. Saved Place',
    badge: 'SAVED PLACE',
    title: 'The Store Knows What Is Needed',
    description:
      'Save the stores you actually visit. When the app checks your position inside a saved store’s radius, that store’s open items surface in shopping mode.',
  },
  {
    id: 3,
    stepNumber: 3,
    label: '3. Shopping Mode',
    badge: 'ASKED VS. GOT',
    title: 'Shop the List, Adjust Quantities',
    description:
      'Shop the list in-store. Each line keeps the asked quantity next to what was actually picked up, so the household sees substitutions as they happen.',
  },
  {
    id: 4,
    stepNumber: 4,
    label: '4. Complete & Log',
    badge: 'TASK → EXPENSE',
    title: 'Completing the Errand Records the Cost',
    description:
      'Completing a request posts its expense to the household ledger. A receipt scan reads the merchant, date and total from a machine-printed receipt.',
  },
  {
    id: 5,
    stepNumber: 5,
    label: '5. Ledger',
    badge: 'SHARED LEDGER',
    title: 'Expenses the Household Can See',
    description:
      'Expenses land in a shared ledger with explicit member roles. Owner, manager and summary roles decide who sees entries and who sees totals only.',
  },
  {
    id: 6,
    stepNumber: 6,
    label: '6. Budgets',
    badge: 'WEEKLY · MONTHLY · YEARLY',
    title: 'Budget Limits With Live Gauges',
    description:
      'Set a spending cap for each period. Gauges show what has been spent and what remains, so the household sees an over-budget week before it becomes a problem.',
  },
  {
    id: 7,
    stepNumber: 7,
    label: '7. Expense Log',
    badge: 'EXPENSE TRACKER',
    title: 'Log an Expense in Seconds',
    description:
      'Record an expense with an amount, category and payer. Amounts are stored in integer minor units, and a receipt scan can fill them from a machine-printed receipt.',
  },
  {
    id: 8,
    stepNumber: 8,
    label: '8. Financial Health',
    badge: 'NET WORTH',
    title: 'The Whole Household Position',
    description:
      'Net worth, savings goals, loans and annual taxes sit next to the ledger, so the expense tracker rolls up into one financial picture.',
  },
];

const STEP_DURATION = 5000; // 5 seconds per step

export function PhoneSoftwareSimulation() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    amox: true,
    electrolytes: false,
  });
  const [ledgerEntries, setLedgerEntries] = useState([
    { id: 1, title: 'CVS Pharmacy Prescription', amount: '$42.50', paidBy: 'Maya R.', type: 'expense' },
    { id: 2, title: 'Costco Bulk Groceries', amount: '$134.20', paidBy: 'Samir R.', type: 'expense' },
  ]);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryAmount, setNewEntryAmount] = useState('');

  // Strict 1 -> 2 -> 3 -> 4 -> 1 looping timer with smooth duration progress bar
  useEffect(() => {
    if (!isPlaying) return;

    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / STEP_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= STEP_DURATION) {
        clearInterval(interval);
        setProgress(0);
        setCurrentStepIndex((curr) => (curr + 1) % STEPS.length);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isPlaying, currentStepIndex]);

  const goToStep = (index: number) => {
    setProgress(0);
    setCurrentStepIndex(index);
  };

  const advanceNext = () => {
    setProgress(0);
    setCurrentStepIndex((curr) => (curr + 1) % STEPS.length);
  };

  const activeStep = STEPS[currentStepIndex];

  return (
    <div className="w-full">
      {/* Main Simulation Container: step tabs, explainer and phone screen */}
      <div className="rounded-3xl border border-secondary/20 bg-gradient-to-br from-surface via-forest-soft/20 to-sage-soft/40 p-6 sm:p-8 shadow-e2">
        {/* Step navigation — one scrollable line inside the box */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-outline-variant/30 pb-4">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(idx)}
                className={`relative shrink-0 overflow-hidden rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'border-secondary/40 bg-surface text-secondary shadow-e1'
                    : 'border-outline-variant/30 bg-canvas/70 text-muted hover:bg-surface hover:text-on-surface'
                }`}
              >
                {/* Duration progress fill rides with the active step */}
                {isActive && isPlaying && (
                  <span
                    className="absolute inset-y-0 left-0 bg-secondary/10 transition-all duration-75 pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <span className="relative z-10">{step.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left Side: Explainer Content */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-forest-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span>{activeStep.badge}</span>
            </div>

            <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
              {activeStep.stepNumber}. {activeStep.title}
            </h3>

            <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed">
              {activeStep.description}
            </p>

            {/* Feature bullets matching current step */}
            <div className="mt-6 space-y-3">
              {currentStepIndex === 0 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Single named assignment ensures clear responsibility</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Urgent countdown & real-time household visibility</span>
                  </div>
                </>
              )}

              {currentStepIndex === 1 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Saved stores carry a radius you choose</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>The store’s open items surface when the app checks your position inside it</span>
                  </div>
                </>
              )}

              {currentStepIndex === 2 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>One-handed tap targets designed for busy grocery aisles</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Live cross-check prevents spouse from buying double items</span>
                  </div>
                </>
              )}

              {currentStepIndex === 3 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Completing an errand can record its expense</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Receipt OCR reads machine-printed English receipts</span>
                  </div>
                </>
              )}

              {currentStepIndex === 4 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Owner, manager and summary roles on every ledger</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Amounts stored in integer minor units</span>
                  </div>
                </>
              )}

              {currentStepIndex === 5 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Weekly, monthly and yearly caps per category</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Gauges show what is spent and what remains</span>
                  </div>
                </>
              )}

              {currentStepIndex === 6 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Amount, category and payer on every entry</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Receipt OCR fills machine-printed receipts</span>
                  </div>
                </>
              )}

              {currentStepIndex === 7 && (
                <>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Net worth from real assets and liabilities</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Goals, loans, assets and taxes in one view</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Play / Pause / Step Controls */}
          <div className="mt-8 flex items-center gap-3 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/30 bg-surface px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-forest-soft transition-colors cursor-pointer"
            >
              <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-[16px]" />
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => goToStep((currentStepIndex - 1 + STEPS.length) % STEPS.length)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface text-muted hover:text-on-surface hover:bg-canvas transition-colors cursor-pointer"
              aria-label="Previous step"
            >
              <Icon name="arrow_back" className="text-[16px]" />
            </button>

            <button
              type="button"
              onClick={advanceNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface text-muted hover:text-on-surface hover:bg-canvas transition-colors cursor-pointer"
              aria-label="Next step"
            >
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>

            <span className="ml-auto text-xs font-bold text-secondary">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
          </div>
        </div>

        {/* Right Side: Simulated Smartphone Frame with In-App Actions */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[340px]">
            {/* Phone Outer Chassis */}
            <div className="relative rounded-[46px] border-[6px] border-slate-800 bg-slate-900 p-2.5 shadow-2xl ring-1 ring-slate-700/50">
              {/* Dynamic Island Notch */}
              <div className="absolute left-1/2 top-4 z-40 h-5 w-24 -translate-x-1/2 rounded-full bg-black flex items-center justify-between px-2.5">
                <span className="h-2 w-2 rounded-full bg-slate-800" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-950 border border-slate-800" />
              </div>

              {/* Phone Inner Screen Display */}
              <div className="relative h-[560px] w-full overflow-hidden rounded-[36px] bg-[#FDFCF7] text-slate-800 font-sans shadow-inner flex flex-col justify-between">
                {/* Status Bar */}
                <div className="relative z-30 flex items-center justify-between px-5 pt-2 text-[11px] font-semibold text-slate-700">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">5G</span>
                    <Icon name="wifi" className="text-[12px]" />
                    <Icon name="battery_full" className="text-[14px]" />
                  </div>
                </div>

                {/* Simulated App Header */}
                <div className="relative z-20 flex items-center justify-between px-4 py-2 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <img
                      src="/favicon.svg"
                      alt="FairShare"
                      className="h-7 w-7 shrink-0 rounded-lg"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">FairShare</h4>
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] text-slate-500 font-medium">Step {currentStepIndex + 1} of {STEPS.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Icon name="notifications" className="text-[15px]" />
                  </div>
                </div>

                {/* Screen Content With In-App Action Triggering Next Step */}
                <div className="relative flex-1 overflow-hidden p-3.5 flex flex-col">
                  {/* ========================================================
                      STEP 1: TODAY BOARD
                  ========================================================= */}
                  {currentStepIndex === 0 && (
                    <div className="flex-1 flex flex-col gap-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Today&apos;s Errands
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          1 Urgent
                        </span>
                      </div>

                      {/* Focused Errand Card */}
                      <div
                        onClick={advanceNext}
                        className="rounded-2xl border-2 border-red-300 bg-red-50/70 p-3 shadow-xs cursor-pointer hover:border-red-400 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                            Urgent · Due 2:00 PM
                          </span>
                          <span className="text-[10px] font-bold text-slate-600">CVS Pharmacy</span>
                        </div>
                        <h5 className="mt-1.5 text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                          Prescription Refill (Amoxicillin)
                        </h5>
                        <div className="mt-2 flex items-center justify-between border-t border-red-200/60 pt-2 text-[10px]">
                          <span className="font-semibold text-slate-700">👤 Assigned: Maya</span>
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 font-bold text-red-700">
                            Single Owner
                          </span>
                        </div>
                      </div>

                      {/* Backlog Item */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                        <div className="flex items-start justify-between">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            Grocery Run
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">Trader Joe&apos;s</span>
                        </div>
                        <h5 className="mt-1.5 text-xs font-semibold text-slate-900">
                          Organic Whole Milk & Apples
                        </h5>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                          <span className="text-slate-600">👤 Assigned: Samir</span>
                          <span className="text-slate-400">Backlog</span>
                        </div>
                      </div>

                      {/* Interactive In-App Action Trigger */}
                      <div className="mt-auto">
                        <button
                          type="button"
                          onClick={advanceNext}
                          className="w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group"
                        >
                          <div className="flex items-center gap-2">
                            {/* Animated tap circle indicator */}
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                            </span>
                            <span>Start Run: Drive to CVS</span>
                          </div>
                          <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 2: SAVED-PLACE ARRIVAL
                  ========================================================= */}
                  {currentStepIndex === 1 && (
                    <div className="flex-1 flex flex-col gap-2 animate-fadeIn relative">
                      {/* Map Graphics */}
                      <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-emerald-50/50 flex flex-col">
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#376847_1px,transparent_1px)] [background-size:14px_14px]" />

                        {/* Geofence 250m Circle & Pulsing Radar */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-ping absolute h-36 w-36 rounded-full bg-emerald-500/20" />
                          <div className="h-32 w-32 rounded-full border-2 border-dashed border-emerald-600 bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-emerald-800 bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                              Saved radius
                            </span>
                          </div>
                          {/* CVS Pin */}
                          <div className="absolute flex flex-col items-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#376847] text-white shadow-md">
                              <Icon name="local_pharmacy" className="text-[16px]" />
                            </span>
                            <span className="mt-1 text-[10px] font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-full shadow-sm">
                              CVS Pharmacy
                            </span>
                          </div>
                        </div>

                        {/* Saved-place marker */}
                        <div className="mt-auto p-1.5 text-[8px] text-slate-500 bg-white/80 backdrop-blur-xs flex items-center justify-between">
                          <span>Saved place</span>
                          <span className="font-bold text-emerald-700">Position checked</span>
                        </div>
                      </div>

                      {/* Drop-down Push Notification Trigger with In-App Action */}
                      <div
                        onClick={advanceNext}
                        className="rounded-2xl border-2 border-emerald-400 bg-white p-2.5 shadow-md cursor-pointer hover:bg-emerald-50/50 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
                            <Icon name="pin_drop" className="text-[16px]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h6 className="text-[11px] font-bold text-slate-900 leading-tight">
                                Arrived at CVS Pharmacy
                              </h6>
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-600 truncate">
                              Open items for this store. Tap to shop →
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Interactive In-App Action Trigger */}
                      <button
                        type="button"
                        onClick={advanceNext}
                        className="w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                          </span>
                          <span>Open Store Checklist</span>
                        </div>
                        <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 3: IN-STORE SHOPPING CHECKLIST
                  ========================================================= */}
                  {currentStepIndex === 2 && (
                    <div className="flex-1 flex flex-col gap-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between rounded-xl bg-[#376847] px-3 py-1.5 text-white">
                        <div className="flex items-center gap-1.5">
                          <Icon name="shopping_cart" className="text-[14px]" />
                          <span className="text-xs font-bold">CVS Store Mode</span>
                        </div>
                        <span className="text-[9px] font-semibold bg-white/20 px-1.5 py-0.5 rounded">
                          In Store
                        </span>
                      </div>

                      <div className="space-y-2 mt-1">
                        {/* Item 1 */}
                        <div
                          onClick={() => setCheckedItems({ ...checkedItems, amox: !checkedItems.amox })}
                          className={`rounded-xl border p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                            checkedItems.amox
                              ? 'border-emerald-300 bg-emerald-50/70 line-through opacity-75'
                              : 'border-slate-200 bg-white shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                                checkedItems.amox
                                  ? 'border-emerald-600 bg-emerald-600 text-white font-bold'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checkedItems.amox && '✓'}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block leading-tight">
                                Amoxicillin 500mg (Refill)
                              </span>
                              <span className="text-[9px] text-slate-500">Asked 1 · Got 1</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Picked Up
                          </span>
                        </div>

                        {/* Item 2 */}
                        <div
                          onClick={() => setCheckedItems({ ...checkedItems, electrolytes: !checkedItems.electrolytes })}
                          className={`rounded-xl border p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                            checkedItems.electrolytes
                              ? 'border-emerald-300 bg-emerald-50/70 line-through opacity-75'
                              : 'border-slate-200 bg-white shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                                checkedItems.electrolytes
                                  ? 'border-emerald-600 bg-emerald-600 text-white font-bold'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checkedItems.electrolytes && '✓'}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block leading-tight">
                                Electrolyte Hydration Pack
                              </span>
                              <span className="text-[9px] text-slate-500">Asked 2 · Got 1</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            Need Sub
                          </span>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-900 text-[10px]">
                        ⚠️ Out of stock? Call the other member about a substitution:
                      </div>

                      {/* Interactive In-App Action Trigger */}
                      <div className="mt-auto">
                        <button
                          type="button"
                          onClick={advanceNext}
                          className="w-full relative flex items-center justify-between rounded-xl bg-amber-600 p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-amber-700 transition-all cursor-pointer active:scale-95 group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                            </span>
                            <span>Direct 1-Tap Call to Samir</span>
                          </div>
                          <Icon name="phone" className="text-[14px]" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 4: COMPLETE THE ERRAND & LOG THE EXPENSE
                  ========================================================= */}
                  {currentStepIndex === 3 && (
                    <div className="flex-1 flex flex-col gap-2.5 animate-fadeIn p-1">
                      {/* Completion context */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Errand Complete
                            </span>
                            <h6 className="mt-1.5 text-xs font-bold text-slate-900">
                              Prescription Refill · CVS Pharmacy
                            </h6>
                            <p className="text-[10px] text-slate-600">
                              Completed by Maya · 2 items, 1 substitution
                            </p>
                          </div>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Icon name="check" className="text-[16px]" />
                          </span>
                        </div>
                      </div>

                      {/* Receipt scan */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                            <Icon name="receipt_long" className="text-[16px]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-slate-900 block leading-tight">
                              Receipt scan
                            </span>
                            <span className="text-[9px] text-slate-500">
                              Machine-printed · English
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            OCR
                          </span>
                        </div>

                        <dl className="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2 text-[10px]">
                          <div className="flex items-center justify-between">
                            <dt className="text-slate-500">Merchant</dt>
                            <dd className="font-semibold text-slate-800">CVS Pharmacy</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-slate-500">Items</dt>
                            <dd className="font-semibold text-slate-800">2 lines</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-slate-500">Total</dt>
                            <dd className="font-extrabold text-slate-900">$42.50</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600">
                        The expense posts to the household ledger in integer minor units, with the payer recorded.
                      </div>

                      {/* Interactive In-App Action Trigger to advance to Step 5 (Ledger) */}
                      <button
                        type="button"
                        onClick={advanceNext}
                        className="mt-auto w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                          </span>
                          <span>Post $42.50 to the Ledger</span>
                        </div>
                        <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 5: HOUSEHOLD LEDGER & BUDGET
                  ========================================================= */}
                  {currentStepIndex === 4 && (
                    <div className="flex-1 flex flex-col justify-between animate-fadeIn p-1">
                      {/* Top Context Card */}
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Household Ledger
                          </span>
                          <span className="text-[10px] font-bold text-slate-800">
                            Total: $176.70
                          </span>
                        </div>
                        <h6 className="mt-1 text-xs font-bold text-slate-900">
                          Household Ledger
                        </h6>
                        <p className="text-[10px] text-slate-500">
                          Owner, manager and summary roles · Integer minor units.
                        </p>
                      </div>

                      {/* Ledger Entries List */}
                      <div className="space-y-1.5 my-2">
                        {ledgerEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-between shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                $
                              </span>
                              <div>
                                <span className="text-xs font-bold text-slate-900 block leading-tight">
                                  {entry.title}
                                </span>
                                <span className="text-[9px] text-slate-500">Paid by {entry.paidBy}</span>
                              </div>
                            </div>
                            <span className="text-xs font-extrabold text-slate-900">
                              {entry.amount}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Add Expense Input Form */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-xs">
                        <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                          + Log Quick Receipt / Reimbursement
                        </span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Store or item"
                            value={newEntryTitle}
                            onChange={(e) => setNewEntryTitle(e.target.value)}
                            className="w-3/5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-900 focus:outline-emerald-600"
                          />
                          <input
                            type="text"
                            placeholder="$ Amount"
                            value={newEntryAmount}
                            onChange={(e) => setNewEntryAmount(e.target.value)}
                            className="w-2/5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-900 focus:outline-emerald-600"
                          />
                        </div>
                      </div>

                      {/* Interactive In-App Action Trigger to Loop back to Step 1 */}
                      <button
                        type="button"
                        onClick={() => {
                          if (newEntryTitle && newEntryAmount) {
                            setLedgerEntries([
                              ...ledgerEntries,
                              {
                                id: Date.now(),
                                title: newEntryTitle,
                                amount: newEntryAmount.startsWith('$') ? newEntryAmount : `$${newEntryAmount}`,
                                paidBy: 'Maya R.',
                                type: 'expense',
                              },
                            ]);
                            setNewEntryTitle('');
                            setNewEntryAmount('');
                          }
                          advanceNext();
                        }}
                        className="w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group mt-auto"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                          </span>
                          <span>Set Budget Limits</span>
                        </div>
                        <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 6: BUDGET LIMITS
                  ========================================================= */}
                  {currentStepIndex === 5 && (
                    <div className="flex-1 flex flex-col gap-2.5 animate-fadeIn p-1">
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Budget Limits
                        </span>
                        <h6 className="mt-1 text-xs font-bold text-slate-900">Weekly · Monthly · Yearly</h6>
                        <p className="text-[10px] text-slate-500">A cap per period, with live gauges.</p>
                      </div>

                      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                        {[
                          { label: 'Weekly groceries', spent: '$124', cap: '$200', pct: 62 },
                          { label: 'Monthly household', spent: '$640', cap: '$1,000', pct: 64 },
                          { label: 'Yearly essentials', spent: '$3,180', cap: '$6,000', pct: 53 },
                        ].map((budget) => (
                          <div key={budget.label}>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-slate-800">{budget.label}</span>
                              <span className="text-slate-500">{budget.spent} / {budget.cap}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#376847]" style={{ width: `${budget.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600">
                        Reaching a cap warns the household instead of blocking the shop.
                      </div>

                      <button
                        type="button"
                        onClick={advanceNext}
                        className="mt-auto w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                          </span>
                          <span>Log an Expense</span>
                        </div>
                        <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 7: EXPENSE ENTRY
                  ========================================================= */}
                  {currentStepIndex === 6 && (
                    <div className="flex-1 flex flex-col gap-2.5 animate-fadeIn p-1">
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Expense Entry
                        </span>
                        <h6 className="mt-1 text-xs font-bold text-slate-900">Log an Expense in Seconds</h6>
                        <p className="text-[10px] text-slate-500">Amount, category and payer, in integer minor units.</p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</span>
                          <span className="text-lg font-extrabold text-slate-900">$42.50</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {['Groceries', 'Pharmacy', 'Utilities', 'Household'].map((category, index) => (
                            <span
                              key={category}
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                index === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payer</span>
                            <span className="font-semibold text-slate-800">Maya</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Source</span>
                            <span className="font-semibold text-slate-800">Receipt scan (OCR)</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">
                        Machine-printed English receipts only; handwriting is not supported.
                      </div>

                      <button
                        type="button"
                        onClick={advanceNext}
                        className="mt-auto w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                          </span>
                          <span>Save to Ledger</span>
                        </div>
                        <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 8: FINANCIAL HEALTH
                  ========================================================= */}
                  {currentStepIndex === 7 && (
                    <div className="flex-1 flex flex-col gap-2.5 animate-fadeIn p-1">
                      <div className="rounded-xl bg-[#376847] p-3 text-white shadow-xs">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-100">Net Worth</span>
                        <div className="text-xl font-extrabold">$263,500.00</div>
                        <span className="text-[10px] text-emerald-100">Assets minus liabilities</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Goals', value: '3 active' },
                          { label: 'Loans', value: '1 active' },
                          { label: 'Assets', value: '12 tracked' },
                          { label: 'Taxes', value: '1 pending' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-xs font-bold text-slate-900">{item.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-600">
                        Goals, loans, savings and annual taxes sit next to the ledger.
                      </div>

                      <button
                        type="button"
                        onClick={advanceNext}
                        className="mt-auto w-full relative flex items-center justify-between rounded-xl bg-[#376847] p-2.5 text-white text-[11px] font-bold shadow-md hover:bg-[#2c5339] transition-all cursor-pointer active:scale-95 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                          </span>
                          <span>Restart Tour</span>
                        </div>
                        <Icon name="refresh" className="text-[14px] group-hover:rotate-180 transition-transform duration-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulated Phone Home Bottom Bar */}
                <div className="relative z-20 flex justify-center pb-2 pt-1">
                  <div className="h-1 w-28 rounded-full bg-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
