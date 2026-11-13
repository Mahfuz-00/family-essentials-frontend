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
    label: '1. Errand Kanban',
    badge: 'SINGLE NAMED OWNERSHIP',
    title: 'One Errand, One Clear Owner',
    description:
      'Eliminate bystander apathy. Every errand has exactly one named person responsible, urgency tags, and real-time status visible to the whole house.',
  },
  {
    id: 2,
    stepNumber: 2,
    label: '2. Store Geofence',
    badge: 'OPENSTREETMAP TRIGGER',
    title: 'Automated Arrival & Departure',
    description:
      'When leaving work or arriving within 250m of CVS Pharmacy, native hardware geofences trigger automatic notifications with store checklists even with the app closed.',
  },
  {
    id: 3,
    stepNumber: 3,
    label: '3. Shopping Mode',
    badge: 'IN-STORE CHECKLIST',
    title: 'In-Store Item Checking',
    description:
      'Inside the store, one-handed checklist mode lets runners tap to check off items in seconds, syncing completion live back to the home dashboard.',
  },
  {
    id: 4,
    stepNumber: 4,
    label: '4. Direct Calling',
    badge: 'ZERO ROBOCALLS',
    title: 'Direct 1-Tap Carrier Escalation',
    description:
      'Need an urgent prescription pickup or brand substitution? Call the family member directly through your smartphone dialer with zero third-party robocalls.',
  },
  {
    id: 5,
    stepNumber: 5,
    label: '5. Household Money',
    badge: 'INTEGER AUDIT LEDGER',
    title: 'Shared Expenses & Balance',
    description:
      'Log receipts, grocery expenses, and reimbursements directly against tasks. Real-time integer ledger prevents rounding drift and tracks who paid what.',
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
      {/* Step Navigation Tabs with Active Duration Progress Bars */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3 mb-8">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStepIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(idx)}
              className={`relative overflow-hidden rounded-2xl p-3.5 sm:p-4 text-left transition-all cursor-pointer border ${
                isActive
                  ? 'border-secondary/40 bg-surface shadow-e2 -translate-y-0.5'
                  : 'border-outline-variant/30 bg-canvas/80 hover:bg-surface text-muted'
              }`}
            >
              {/* Duration Progress Indicator (Fills smoothly like before) */}
              {isActive && isPlaying && (
                <div
                  className="absolute bottom-0 left-0 top-0 bg-secondary/10 transition-all duration-75 pointer-events-none"
                  style={{ width: `${progress}%` }}
                />
              )}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-secondary rounded-t-2xl" />
              )}
              <div className="relative z-10">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isActive ? 'text-secondary' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`mt-1 text-xs sm:text-sm font-bold block truncate ${
                    isActive ? 'text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Simulation Container: Left Description, Right Phone Screen */}
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 rounded-3xl border border-secondary/20 bg-gradient-to-br from-surface via-forest-soft/20 to-sage-soft/40 p-6 sm:p-8 shadow-e2">
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
                    <span>250m OpenStreetMap geofence radar trigger</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Automatic notification pops up as you pull into parking</span>
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
                    <span>Direct pass-to-dialer phone call with zero robocalls</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-on-surface">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-secondary">
                      <Icon name="check" className="text-[14px]" />
                    </span>
                    <span>Instant brand substitution or prescription approval</span>
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#376847] text-white font-bold text-xs">
                      FS
                    </div>
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
                      STEP 1: ERRAND KANBAN
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
                      STEP 2: OPENSTREETMAP GEOFENCE ARRIVAL
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
                              250m Geofence
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

                        {/* OpenStreetMap attribution badge */}
                        <div className="mt-auto p-1.5 text-[8px] text-slate-500 bg-white/80 backdrop-blur-xs flex items-center justify-between">
                          <span>Map data © OpenStreetMap</span>
                          <span className="font-bold text-emerald-700">GPS Arrival Detected</span>
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
                              2 errands waiting. Tap to open checklist →
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
                              <span className="text-[9px] text-slate-500">Pharmacy Counter</span>
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
                              <span className="text-[9px] text-slate-500">Aisle 3 · Out of stock</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            Need Sub
                          </span>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-900 text-[10px]">
                        ⚠️ Generic brand missing. One-tap direct call to family runner:
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
                      STEP 4: DIRECT CARRIER PHONE CALLING
                  ========================================================= */}
                  {currentStepIndex === 3 && (
                    <div className="flex-1 flex flex-col justify-between animate-fadeIn p-1">
                      {/* Top Context Card */}
                      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Direct Carrier Calling
                        </span>
                        <h6 className="mt-1 text-xs font-bold text-slate-900">
                          CVS Pharmacy Run · Maya
                        </h6>
                        <p className="text-[10px] text-slate-500">
                          Direct phone dialer pass — zero robocalls or IVR delay.
                        </p>
                      </div>

                      {/* Simulated Native Smartphone Calling Overlay */}
                      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-xl flex flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg animate-pulse">
                          <Icon name="phone" className="text-[26px]" />
                        </div>

                        <span className="mt-3 text-sm font-bold text-white">Samir Rahman</span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          Connected (0:18)
                        </span>

                        <div className="mt-3 flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-[9px] text-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span>Direct Carrier Line · Confirmed Brand</span>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-6">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                            <Icon name="mic_off" className="text-[16px]" />
                          </span>
                          <span
                            onClick={advanceNext}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-colors shadow-md"
                          >
                            <Icon name="call_end" className="text-[18px]" />
                          </span>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                            <Icon name="volume_up" className="text-[16px]" />
                          </span>
                        </div>
                      </div>

                      {/* Interactive In-App Action Trigger to advance to Step 5 (Money) */}
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
                          <span>Complete Call & Log Pharmacy Expense</span>
                        </div>
                        <Icon name="arrow_forward" className="text-[14px] group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      STEP 5: HOUSEHOLD MONEY & EXPENSES
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
                          Shared Family Expenses
                        </h6>
                        <p className="text-[10px] text-slate-500">
                          Exact integer math · Zero hidden fees or rounding drift.
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
                          <span>Save Ledger & Return to Kanban</span>
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
  );
}
