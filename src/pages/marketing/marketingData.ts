export interface FeatureData {
  slug: string;
  name: string;
  shortTag: string;
  icon: string;
  category: string;
  summary: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  metrics: { value: string; label: string }[];
  problemQuote: string;
  problemAuthor: string;
  beforeBulletPoints: string[];
  afterBulletPoints: string[];
  capabilities: { title: string; description: string; icon: string }[];
  workflowSteps: { step: string; title: string; description: string }[];
  faqs: { question: string; answer: string }[];
}

export interface SolutionData {
  slug: string;
  title: string;
  subtitle: string;
  heroTitle: string;
  heroDescription: string;
  icon: string;
  badge: string;
  audienceDescription: string;
  painPoints: { problem: string; impact: string }[];
  solutionFeatures: { title: string; description: string; icon: string }[];
  recommendedFeatureSlugs: string[];
  testimonial: { quote: string; author: string; role: string; householdSize: string };
  faqs: { question: string; answer: string }[];
}

export const FEATURES: FeatureData[] = [
  {
    slug: 'errands',
    name: 'Errand Kanban & Delegated Requests',
    shortTag: 'Single Named Ownership',
    icon: 'view_kanban',
    category: 'Daily Execution',
    summary: 'Coordinate grocery runs, pharmacy pickups, and school tasks with a live Kanban board that enforces single-person accountability.',
    heroEyebrow: 'Execution Engine · Module 01',
    heroTitle: 'Turn Unspoken Domestic Chores into Trackable, Named Errands',
    heroDescription:
      'Eliminate bystander apathy and ambiguous chore lists. Family Essentials assigns every domestic errand to exactly one person with clear deadlines, store tags, and live progress statuses.',
    metrics: [
      { value: '3.4 hrs', label: 'Average hours saved per family weekly' },
      { value: '0%', label: 'Bystander ambiguity on task ownership' },
      { value: '100%', label: 'Visibility from request to completion' },
    ],
    problemQuote: 'I used to think my partner saw the empty carton of milk, while they assumed I was stopping on my drive home. We both showed up with groceries or neither of us did.',
    problemAuthor: 'Sarah K., Mother of two, Seattle',
    beforeBulletPoints: [
      'Vague text messages lost in chat threads ("Could someone grab eggs?")',
      'Double-purchases or forgotten critical items because nobody took explicit ownership',
      'Endless "Did you do it yet?" nagging that creates domestic tension',
    ],
    afterBulletPoints: [
      'Single named assignee with visual completion states (Pending → In Progress → Complete)',
      'Instant notifications when an errand is accepted and marked done',
      'Store tags that automatically group errands by supermarket, hardware store, or pharmacy',
    ],
    capabilities: [
      {
        title: 'Strict Single Assignee',
        description: 'No joint or orphaned tasks. When everyone is responsible, no one is. Family Essentials requires exactly one primary owner per task.',
        icon: 'person_check',
      },
      {
        title: 'Priority & Urgency Signals',
        description: 'Categorize requests as Low, Medium, High, or Urgent. High-priority errands display prominent status badges and trigger alert cadences.',
        icon: 'priority_high',
      },
      {
        title: 'Store & Location Association',
        description: 'Tie errands directly to a saved place (Costco, Target, School). Tasks automatically highlight when family members arrive near the store.',
        icon: 'storefront',
      },
      {
        title: 'Estimated Budget & Minor Units',
        description: 'Specify an optional budget for the errand. Financial limits prevent surprises and feed directly into the shared household ledger.',
        icon: 'payments',
      },
    ],
    workflowSteps: [
      {
        step: '01',
        title: 'Create the Errand in Seconds',
        description: 'Type the item, pick an urgency level, choose a saved store, and assign it to a family member or leave it open for quick acceptance.',
      },
      {
        step: '02',
        title: 'One-Tap Acceptance & In-Flight Tracking',
        description: 'The assignee receives a push notification, accepts the task with a tap, and marks it in progress when they head out.',
      },
      {
        step: '03',
        title: 'Receipt & Auto-Archival',
        description: 'Upon checkout, one tap marks the errand complete. The household board updates instantly across all phones and web browsers.',
      },
    ],
    faqs: [
      {
        question: 'Why does Family Essentials enforce a single assignee instead of multiple assignees?',
        answer: 'Decades of organizational psychology and domestic research show that shared ownership breeds bystander apathy. When an errand is assigned to "Mom and Dad", both assume the other will handle it. Giving every request a single owner guarantees clarity, accountability, and peace of mind.',
      },
      {
        question: 'Can an errand be reassigned if someone gets held up at work?',
        answer: 'Yes! Any household member with appropriate permissions can easily reassign a task with a single tap, and the new assignee is notified immediately.',
      },
      {
        question: 'Does the board work across both desktop web and mobile phones?',
        answer: 'Yes. Family Essentials features real-time synchronization between the Flutter mobile app (iOS and Android) and the React web dashboard.',
      },
    ],
  },
  {
    slug: 'geofencing',
    name: 'Store Geofencing & Location Reminders',
    shortTag: 'Smart Contextual Cues',
    icon: 'pin_drop',
    category: 'Contextual Intelligence',
    summary: 'Trigger grocery and errand checklists automatically the second a family member enters a store parking lot or leaves work.',
    heroEyebrow: 'Location Intelligence · Module 02',
    heroTitle: 'Never Drive Past the Supermarket and Forget the Eggs Again',
    heroDescription:
      'Time-based reminders fail because you cannot predict when you will finish work. Geofencing reminders fire exactly when you pull into Trader Joe’s, Costco, or the pharmacy parking lot.',
    metrics: [
      { value: '88%', label: 'Reduction in second-trip store runs' },
      { value: '150m', label: 'Precise boundary radius detection' },
      { value: '0 KB', label: 'Location data sold to third-party brokers' },
    ],
    problemQuote: 'I would set a reminder for 5:30 PM, but if I was still in a meeting, I dismissed it. By 6:15 PM when I drove right past Walgreens, the thought was completely gone.',
    problemAuthor: 'David L., Father of three, Austin',
    beforeBulletPoints: [
      'Reminders firing at arbitrary times when you are unable to take action',
      'Driving past the grocery store and remembering what you needed only after getting home',
      'Spamming family chat with "Are you near the supermarket right now?"',
    ],
    afterBulletPoints: [
      'Store checklists surface when the app checks your position inside a saved store radius',
      'The checklist opens in one swipe so you see exactly what to grab',
      'Privacy-first architecture: your position is only compared against your family’s saved pins, never stored as a route',
    ],
    capabilities: [
      {
        title: 'Custom Geofence Radii',
        description: 'Define custom coordinates and radius boundaries (from 50m up to 1,000m) for favorite grocery stores, schools, pharmacies, and hardware hubs.',
        icon: 'radar',
      },
      {
        title: 'Entry & Exit Triggers',
        description: 'Choose whether an alert fires upon arriving (e.g., entering the grocery store) or upon leaving (e.g., leaving the office to prompt a commute errand).',
        icon: 'swap_horiz',
      },
      {
        title: 'Foreground Location Checks',
        description: 'Your position is read only when the app opens or resumes, then compared with your saved store radiuses. No continuous GPS polling and no background tracking.',
        icon: 'battery_saver',
      },
      {
        title: 'Opt-in Member Consent',
        description: 'Each family member has individual control over location monitoring. Family Essentials tracks store boundaries, never personal movement histories.',
        icon: 'security',
      },
    ],
    workflowSteps: [
      {
        step: '01',
        title: 'Pin Your Frequent Stops',
        description: 'Add your regular grocery store, pharmacy, or dry cleaner in the Saved Places directory with custom latitude/longitude and detection radius.',
      },
      {
        step: '02',
        title: 'Tag Errands to the Place',
        description: 'Whenever an item is requested (e.g., "Refill allergy medication"), link it to "Local Pharmacy".',
      },
      {
        step: '03',
        title: 'Automatic Arrival Notification',
        description: 'When a household member opens the app inside a saved store’s radius, the full store shopping list is waiting.',
      },
    ],
    faqs: [
      {
        question: 'Does Family Essentials track my continuous GPS location or live speed?',
        answer: 'No. The app reads your position only when it opens or resumes and compares it with the radiuses of your saved stores. We never record, store, or sell continuous breadcrumb movement history.',
      },
      {
        question: 'Will location checks drain my smartphone battery?',
        answer: 'No. There is no continuous GPS polling: a position is read only when the app is open or resumes, so battery impact stays negligible.',
      },
    ],
  },
  {
    slug: 'recurring',
    name: 'Recurring Household Staples',
    shortTag: 'Set-and-Forget Rules',
    icon: 'event_repeat',
    category: 'Automation',
    summary: 'Automate weekly trash night, bi-weekly water filter replacements, and monthly pantry restocks without manual calendar reminders.',
    heroEyebrow: 'Domestic Automation · Module 03',
    heroTitle: 'Put Repeatable Household Errands on Autopilot',
    heroDescription:
      'Every household has dozens of cyclic tasks: taking the bins out on Tuesday, changing furnace filters every 90 days, or ordering dog food on the 1st of every month. Family Essentials schedules, generates, and delegates them automatically.',
    metrics: [
      { value: '100%', label: 'On-time routine maintenance completion' },
      { value: '24+', label: 'Automated tasks generated per month' },
      { value: '0', label: 'Forgotten trash or recycling mornings' },
    ],
    problemQuote: 'Trash collection alternated every week between regular and yard waste. We consistently missed yard waste week until our bins were overflowing.',
    problemAuthor: 'Elena R., Toronto',
    beforeBulletPoints: [
      'Messy recurring calendar events that clutter personal work calendars',
      'Forgetting monthly preventative home maintenance like filter swaps and water softener salt',
      'Having to remember who is responsible for which recurring chore this week',
    ],
    afterBulletPoints: [
      'Clean cadence rules (Daily, Weekly on specific days, Monthly on chosen dates)',
      'Automatic generation into the errand board with pre-assigned ownership and default budgets',
      'One-tap pause and resume controls for when the family goes on vacation',
    ],
    capabilities: [
      {
        title: 'Flexible Cadence Engine',
        description: 'Set rules for weekly days (e.g., every Tuesday at 7:00 PM) or specific monthly dates (e.g., 1st of every month).',
        icon: 'schedule',
      },
      {
        title: 'Location & Store Integration',
        description: 'Link recurring chores to stores so that the newly generated task immediately carries store geofence metadata.',
        icon: 'store',
      },
      {
        title: 'Pause When Away',
        description: 'Going out of town? Toggle "Pause All Recurring Tasks" with a single click, and resume smoothly when you return.',
        icon: 'pause_circle',
      },
      {
        title: 'Automated Budget Pre-allocation',
        description: 'Attach a standard cost to recurring items (e.g., $45 for monthly dog food) to forecast monthly domestic cash flow.',
        icon: 'attach_money',
      },
    ],
    workflowSteps: [
      {
        step: '01',
        title: 'Define the Routine',
        description: 'Select what repeats, choose the cadence (Weekly or Monthly), and specify the designated day.',
      },
      {
        step: '02',
        title: 'Assign Owner & Location',
        description: 'Set the family member responsible and link any relevant store or location trigger.',
      },
      {
        step: '03',
        title: 'System Auto-Dispatches',
        description: 'When the cadence arrives, Family Essentials automatically creates an active errand on the board and alerts the assignee.',
      },
    ],
    faqs: [
      {
        question: 'What happens to recurring tasks if we go on vacation?',
        answer: 'You can pause any individual rule or pause the entire recurring schedule from the Recurring page. No overdue notifications will fire while rules are paused.',
      },
      {
        question: 'Can recurring tasks include spending amounts for budgeting?',
        answer: 'Yes! You can specify an anticipated minor unit amount that automatically registers on the board and ledger when the task triggers.',
      },
    ],
  },
  {
    slug: 'money',
    name: 'Shared Family Ledger & Budgets',
    shortTag: 'Transparent Cash Flow',
    icon: 'account_balance_wallet',
    category: 'Household Finance',
    summary: 'Track grocery bills, sports equipment, and domestic reimbursements with role-based visibility and zero invasive bank account connections.',
    heroEyebrow: 'Household Finance · Module 04',
    heroTitle: 'Domestic Expense Sharing Without the Financial Awkwardness',
    heroDescription:
      'Bank sync tools like Mint or YNAB are either over-complicated or expose too much private personal data. Family Essentials gives your household simple, multi-currency ledgers where each family member sees only what they need to see.',
    metrics: [
      { value: '$420', label: 'Average monthly unneeded expense reduction' },
      { value: '3 Roles', label: 'Owner, Manager, and Totals-only Summary' },
      { value: '100%', label: 'Manual privacy control — no Plaid or bank scraping' },
    ],
    problemQuote: 'Splitting kids expenses between co-parents was an endless debate of crumpled receipts and spreadsheets. Family Essentials created a single undisputed ledger.',
    problemAuthor: 'Marcus & Jessica, Co-parents, Denver',
    beforeBulletPoints: [
      'Hunting through receipt photos in WhatsApp or text message archives',
      'Overly complex budget apps demanding full banking credentials and Plaid logins',
      'Awkward end-of-month tallying and arguing over who paid for soccer camp or grocery supplies',
    ],
    afterBulletPoints: [
      'Simple, instantaneous entry logging with category, description, and date',
      'Privacy role grants: Owners manage access, Managers add expenses, Summary members see totals only',
      'Automatic calculation of month-to-date spending versus budget caps',
    ],
    capabilities: [
      {
        title: 'Granular Role-Based Access',
        description: 'Assign Owner, Manager, or Summary permissions per ledger. Keep kids or extended family members informed without revealing granular transactions.',
        icon: 'admin_panel_settings',
      },
      {
        title: 'Zero Bank Credentials Needed',
        description: 'Keep your financial privacy intact. Family Essentials uses lightweight manual entry rather than scraping your bank accounts.',
        icon: 'lock',
      },
      {
        title: 'Multi-Currency Support',
        description: 'Support for USD, EUR, GBP, CAD, AUD, and more. Ideal for expatriate families or international travel.',
        icon: 'currency_exchange',
      },
      {
        title: 'Integer Minor Units Precision',
        description: 'All financial math is calculated in exact cents (minor units) to prevent floating-point rounding errors on balances.',
        icon: 'calculate',
      },
      {
        title: 'Optical Receipt Scanning (OCR)',
        description: 'Snap a photo of any grocery or store receipt to auto-parse merchant, itemized lines, taxes, and totals directly into your ledger. (Note: Receipts must be machine-printed and in English).',
        icon: 'document_scanner',
      },
    ],
    workflowSteps: [
      {
        step: '01',
        title: 'Create Your Household Ledger',
        description: 'Set up ledgers for Groceries, Kids Activities, Home Repairs, or Holiday Spending.',
      },
      {
        step: '02',
        title: 'Invite Family with Roles',
        description: 'Grant spouses Manager access, give teens Summary access, and maintain Owner governance.',
      },
      {
        step: '03',
        title: 'Log Entries in 5 Seconds',
        description: 'Type amount, pick category, and save. Balances and monthly totals update instantaneously.',
      },
    ],
    faqs: [
      {
        question: 'Do I have to link my credit card or bank login?',
        answer: 'Never. Family Essentials does not connect to banking APIs or require financial credentials. It is a lightweight, privacy-first ledger designed for domestic coordination.',
      },
      {
        question: 'Can teenagers see the family budget without seeing individual purchases?',
        answer: 'Yes! Grant them the "Summary" role. They will see the total budget and remaining balance for the month, but cannot view individual line-item expenses.',
      },
      {
        question: 'What kinds of receipts does the OCR receipt scanner support?',
        answer: 'The OCR scanner supports standard machine-printed store receipts in English (PDF, PNG, JPG, WEBP). Handwritten receipts or non-English receipts are not currently supported. The scanner automatically detects the merchant, date, itemized lines, subtotal, tax, and total, and can cross-reference matching pantry items to recommend restocks.',
      },
    ],
  },
  {
    slug: 'escalation',
    name: 'Direct Mobile Phone Calling',
    shortTag: 'Native Mobile Phone Dialer',
    icon: 'ring_volume',
    category: 'Direct Communication',
    summary: 'When critical tasks like heart medication refills go overdue, one tap passes directly to your smartphone’s native dialer. Zero extra setup or robocalls required.',
    heroEyebrow: 'Fail-Safe Reliability · Module 05',
    heroTitle: 'Direct One-Tap Phone Calling When an Errand Is Too Urgent for a Text',
    heroDescription:
      'Push notifications get silenced, swiped away, or buried under social media alerts. For life-critical tasks—like picking up an inhaler or collecting a child from soccer—Family Essentials lets you pass the assignee’s number directly into your smartphone dialer with a single tap. Zero robocalls and zero telephony surcharges.',
    metrics: [
      { value: '1 Tap', label: 'Direct pass to native phone dialer' },
      { value: '$0', label: 'No third-party telecom or add-on fees' },
      { value: '100%', label: 'Uses your phone’s built-in dialer' },
    ],
    problemQuote: 'My daughter’s EpiPen was expiring. A push notification came during a loud meeting and I dismissed it. Having an instant call button directly on the urgent task let my partner ring me immediately without digging for my number.',
    problemAuthor: 'Rachel B., Mother of two, Chicago',
    beforeBulletPoints: [
      'Critical health and safety errands buried under 50 promotional notifications',
      'Having to leave the chore app, search contacts, and copy phone numbers during an emergency',
      'Over-complicated third-party telephony services that charge monthly fees and get flagged as spam robocalls',
    ],
    afterBulletPoints: [
      'One-tap direct calling that passes the assignee’s phone number straight into your device’s native dialer',
      'Clear urgency badges that prompt family members when a task requires an immediate call',
      'Private family directory where phone numbers are securely shared only inside your household',
    ],
    capabilities: [
      {
        title: 'Native Mobile Phone Dialer',
        description: 'Passes directly into your smartphone’s built-in dialer (iOS & Android). Zero third-party telephony or API keys required.',
        icon: 'phone_in_talk',
      },
      {
        title: 'Single-Tap Contact',
        description: 'Tap the phone icon on any urgent request to instantly dial the responsible family member without searching your address book.',
        icon: 'contact_phone',
      },
      {
        title: 'Zero Surcharges or Fees',
        description: 'Uses your existing mobile carrier plan. No per-minute charges, no prepaid credits, and no surprise telecom invoices.',
        icon: 'money_off',
      },
      {
        title: 'Audit Logging & Transparency',
        description: 'Records when urgent phone calls were initiated so the entire household knows who has been contacted.',
        icon: 'receipt_long',
      },
    ],
    workflowSteps: [
      {
        step: '01',
        title: 'Add Family Phone Numbers',
        description: 'Family members add their mobile number in their profile so the household can reach them during urgent errands.',
      },
      {
        step: '02',
        title: 'Flag Task as Urgent',
        description: 'When creating or reviewing a time-sensitive chore, set priority to Urgent to highlight the direct phone call action.',
      },
      {
        step: '03',
        title: 'One-Tap Pass to Call',
        description: 'Tap the Call button on the task. Your mobile phone immediately opens the phone dialer ready to connect.',
      },
    ],
    faqs: [
      {
        question: 'Do I need any third-party phone service or telecom subscription?',
        answer: 'No! Family Essentials requires no external telecom services, API credentials, or extra phone subscriptions. Calls are passed directly into your smartphone’s native dialer application.',
      },
      {
        question: 'Does this work on both iPhone and Android?',
        answer: 'Yes! Tapping the call action on iOS opens the Phone app, and on Android it opens the native Phone dialer with the number ready to call.',
      },
    ],
  },
  {
    slug: 'roles',
    name: 'Multi-Tenant Security & Family Roles',
    shortTag: 'Tenant Isolation',
    icon: 'shield_person',
    category: 'Privacy & Governance',
    summary: 'Row-level database tenant isolation, adult vs. kid permission tiers, and zero data leakage across households.',
    heroEyebrow: 'Enterprise Architecture · Module 06',
    heroTitle: 'Enterprise-Grade Security Built Specifically for Family Privacy',
    heroDescription:
      'Your family’s daily locations, schedules, and budgets are sensitive personal data. Family Essentials isolates every household with strict multi-tenant database partitions, custom family roles, and cryptographic audit logs.',
    metrics: [
      { value: '100%', label: 'Cryptographic tenant schema isolation' },
      { value: '4 Tiers', label: 'Admin, Adult, Teen, and Child roles' },
      { value: '0', label: 'Cross-tenant data leakage incidents' },
    ],
    problemQuote: 'We wanted a tool that our 13-year-old could use for chores without seeing our bank balances or household bills. The role permissions are brilliant.',
    problemAuthor: 'Ken T., Father, Melbourne',
    beforeBulletPoints: [
      'All-or-nothing access where every family member sees all confidential financial data',
      'Consumer apps that bundle all family data into shared, unpartitioned cloud tables',
      'No audit trail of who modified or deleted household requests',
    ],
    afterBulletPoints: [
      'Tailored role permissions: Admins control billing, Adults manage chores, Teens check off tasks',
      'Strict multi-tenant isolation ensuring no family can ever query another household’s data',
      'Immutable audit trail recording every invitation, role modification, and sensitive update',
    ],
    capabilities: [
      {
        title: 'Role-Based Access Control (RBAC)',
        description: 'Assign Household Admin, Adult Member, Teen, or Child permissions to control who can view finances, invite members, or delete tasks.',
        icon: 'manage_accounts',
      },
      {
        title: 'Multi-Tenant Isolation',
        description: 'Built on PostgreSQL Row-Level Security (RLS) and scoped tenant middleware. Your family’s data exists in an isolated operational plane.',
        icon: 'domain',
      },
      {
        title: 'Invitation Expiry & Revocation',
        description: 'Send secure, time-limited invitation links via email. Revoke pending invites with one click if sent to an incorrect address.',
        icon: 'mail_lock',
      },
      {
        title: 'Detailed Audit Logging',
        description: 'Inspect a full timestamped security log of logins, membership modifications, and system configuration adjustments.',
        icon: 'history',
      },
    ],
    workflowSteps: [
      {
        step: '01',
        title: 'Set Up Your Family Workspace',
        description: 'Choose your household name and automatically receive Household Admin credentials with full governance control.',
      },
      {
        step: '02',
        title: 'Invite Members with Custom Roles',
        description: 'Send invitations to spouses, children, or grandparents with specific permissions tailored to their age and responsibility.',
      },
      {
        step: '03',
        title: 'Review Audit Logs Anytime',
        description: 'Access the Roles & Permissions dashboard to adjust access privileges or review security events whenever needed.',
      },
    ],
    faqs: [
      {
        question: 'Can one person belong to multiple households?',
        answer: 'Yes! Co-parents, grandparents, and other family members can belong to multiple family workspaces and seamlessly switch between them using the top-bar household selector.',
      },
      {
        question: 'What happens if a child clicks on the Billing or Money tabs?',
        answer: 'They are blocked by client and server-side role guards. Non-admin members receive clean permission alerts and cannot view billing, subscription, or restricted financial ledgers.',
      },
    ],
  },
];

export const SOLUTIONS: SolutionData[] = [
  {
    slug: 'busy-parents',
    title: 'Busy Working Parents',
    subtitle: 'Eliminate the invisible mental load of juggling dual careers, school runs, and domestic chores.',
    heroTitle: 'Household Coordination for Dual-Career Parents Who Refuse to Drop the Ball',
    heroDescription:
      'When both partners work full-time, domestic logistics often turn into an unwritten second shift. Family Essentials transforms frantic WhatsApp texts into a quiet, reliable operational system.',
    icon: 'family_restroom',
    badge: 'Dual-Career Households',
    audienceDescription:
      'Designed for couples and single working parents managing demanding professional schedules alongside children’s school, sports, healthcare, and pantry replenishment.',
    painPoints: [
      {
        problem: 'The "Mental Load" Tax',
        impact: 'One partner carries the invisible burden of tracking grocery supplies, laundry detergent, and doctor appointments in their head.',
      },
      {
        problem: 'Duplicated or Missed Errands',
        impact: 'Both parents stop for groceries on the drive home, or both assume the other is picking up the dry cleaning.',
      },
      {
        problem: 'Nagging Creates Marital Friction',
        impact: 'Constant reminders feel like micromanagement, leading to resentment and domestic tension.',
      },
    ],
    solutionFeatures: [
      {
        title: 'Single Named Ownership',
        description: 'Every errand has one clear assignee. No more guessing who is handling school pickups or grocery runs.',
        icon: 'check_circle',
      },
      {
        title: 'Store Parking Lot Geofences',
        description: 'Get notified when your commute takes you past Target or Costco, with the full household checklist ready in one tap.',
        icon: 'near_me',
      },
      {
        title: 'Set-and-Forget Recurring Tasks',
        description: 'Trash nights, HVAC filters, and weekly grocery staples are dispatched automatically without manual planning.',
        icon: 'autorenew',
      },
    ],
    recommendedFeatureSlugs: ['errands', 'geofencing', 'recurring'],
    testimonial: {
      quote:
        'Family Essentials literally saved our evenings. We used to spend our first 45 minutes after work debriefing chores and arguing over what was missed. Now everything is on the board.',
      author: 'Amanda & Chris M.',
      role: 'Product Manager & Software Architect',
      householdSize: 'Family of 4, Austin, TX',
    },
    faqs: [
      {
        question: 'How long does it take to set up Family Essentials for our family?',
        answer: 'Less than 5 minutes. Create your household workspace, invite your partner with a link, and pin 2 or 3 of your regular grocery stores.',
      },
      {
        question: 'Can we use this if one partner uses iPhone and the other uses Android?',
        answer: 'Absolutely. Our native Flutter mobile apps run seamlessly on iOS and Android with identical real-time push and geofence capabilities.',
      },
    ],
  },
  {
    slug: 'co-parenting',
    title: 'Co-Parents & Blended Families',
    subtitle: 'Transparent expense tracking, split custody schedules, and objective accountability across separate households.',
    heroTitle: 'High-Clarity Logistics for Co-Parents Who Want Peace of Mind',
    heroDescription:
      'Co-parenting works best when expectations are explicit, schedules are visible, and financial splits are indisputable. Family Essentials provides a neutral, documented platform that keeps the focus where it belongs: on the kids.',
    icon: 'diversity_1',
    badge: 'Co-Parents & Blended Families',
    audienceDescription:
      'Tailored for separated, divorced, or blended families sharing custody, medical expenses, extracurricular fees, and transportation duties.',
    painPoints: [
      {
        problem: 'Contested Expense Splitting',
        impact: 'Debating who paid for soccer uniforms or prescription medications over heated email threads.',
      },
      {
        problem: 'Communication Friction',
        impact: 'Important medical, school, and routine tasks get lost in emotional text conversations.',
      },
      {
        problem: 'Inconsistent Routines Between Homes',
        impact: 'Kids struggle when expectations and recurring habits differ wildly between two different households.',
      },
    ],
    solutionFeatures: [
      {
        title: 'Objective Shared Ledger',
        description: 'Log kids’ medical and school costs with exact amounts and categories. Both parents see live, transparent totals without arguments.',
        icon: 'account_balance_wallet',
      },
      {
        title: 'Documented Task History',
        description: 'Every errand has a clear audit trail showing when it was requested, accepted, and completed.',
        icon: 'fact_check',
      },
      {
        title: 'Multi-Household Switching',
        description: 'Parents and teens can belong to both households and toggle between workspaces seamlessly from the app.',
        icon: 'swap_horiz',
      },
    ],
    recommendedFeatureSlugs: ['money', 'errands', 'roles'],
    testimonial: {
      quote:
        'Having an impartial ledger and task board took all the venom out of our co-parenting communications. Receipts are logged, tasks are assigned, and we don’t argue anymore.',
      author: 'Jason & Danielle T.',
      role: 'Co-parents of two teenagers',
      householdSize: 'Two households, Seattle, WA',
    },
    faqs: [
      {
        question: 'Can our lawyers or mediators see the ledger if needed?',
        answer: 'You can easily export complete PDF and CSV records of all ledger entries and completed errands for legal or mediation reviews.',
      },
      {
        question: 'Does my ex see my personal finances or work schedule?',
        answer: 'Never. Each ledger and household is strictly isolated. They only see the specific shared family ledgers and errands you explicitly create together.',
      },
    ],
  },
];
