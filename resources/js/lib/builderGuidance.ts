/**
 * Scalable field-level and step-level guidance registry for Serbizyu listing builders.
 *
 * Mode Contract:
 * - Guided Mode (Onboarding Q&A):
 *   - Granular bite-sized steps (1 focused screen per step on mobile).
 *   - Conversational questions as titles (e.g. "What do you want to call your listing?").
 *   - Step descriptions contain the clear, actionable guidance natively in the subtext.
 *   - Inputs have helpful contextual placeholders.
 * - Standard Mode (All-in-One Studio):
 *   - Single scrollable form for rapid keyboard entry.
 *   - Plain, terse, professional input labels (e.g. "Service Title").
 *   - Strictly NO descriptions cluttering the form.
 *   - Plain inputs without placeholders.
 *   - FieldGuide info icons (i) are available here on demand for power users.
 *
 * Strict Rule: Guidance statements are purely UI cues; they never pollute
 * descriptions or database payload data.
 */

export type BuilderMode = 'guided' | 'standard';

export interface FieldGuidanceItem {
    id: string;
    question: string;
    answer: string;
    example?: string;
}

export interface FieldDefinition {
    id: string;
    guidedLabel: string;
    advancedLabel: string;
    placeholder?: string;
    guidance: FieldGuidanceItem;
}

export interface StepDefinition {
    step: number;
    shortTitle: string;
    guidedTitle: string;
    guidedDescription: string;
    standardTitle: string;
}

export const SERVICE_GUIDED_STEPS: StepDefinition[] = [
    {
        step: 1,
        shortTitle: 'Craft & Title',
        guidedTitle: 'What do you want to call your service?',
        guidedDescription:
            'Use a clear trade title with your primary craft (e.g. "Inverter Split AC Cleaning") so clients in Tagudin find you quickly.',
        standardTitle: 'Trade Identity & Scope',
    },
    {
        step: 2,
        shortTitle: 'Proof & Photos',
        guidedTitle: 'Show proof of your craft',
        guidedDescription:
            'Authentic photos of past jobs, branded gear, or specialized tools build local trust. A short video demonstration earns a verified badge on the browse feed.',
        standardTitle: 'Listing Media & Proof',
    },
    {
        step: 3,
        shortTitle: 'Work Plan',
        guidedTitle: 'How do you execute this service step-by-step?',
        guidedDescription:
            'Milestones (like diagnostic check, chemical wash, delta temp test) are tracked with customers. Sign-off on evidence gates unlocks escrow payment.',
        standardTitle: 'Work Execution Plan',
    },
    {
        step: 4,
        shortTitle: 'Deliverables',
        guidedTitle: 'What is physically included in your base labor?',
        guidedDescription:
            'Itemize physical tasks and clarify whether specialized tools or chemical supplies are covered in base labor so customers know exactly what will be completed.',
        standardTitle: 'Standard Deliverables Checklist',
    },
    {
        step: 5,
        shortTitle: 'Dispatch Base',
        guidedTitle: 'Where are you based for dispatch in Tagudin?',
        guidedDescription:
            'Clients see your dispatch barangay to calculate travel distance and dispatch times.',
        standardTitle: 'Service Base & Dispatch Location',
    },
    {
        step: 6,
        shortTitle: 'Pricing',
        guidedTitle: 'How do you charge for this service?',
        guidedDescription:
            'Choose Fixed for routine standard jobs, Range if on-site diagnostics vary, or Packages (Basic/Standard/Premium) for tiered scope options.',
        standardTitle: 'Rates & Pricing Model',
    },
    {
        step: 7,
        shortTitle: 'Partners & Review',
        guidedTitle: 'Optionally connect local partner services',
        guidedDescription:
            'Connect local supply stores and motorcycle couriers for turnkey bundled delivery, or publish labor directly.',
        standardTitle: 'Partnered Deal Chains & Review',
    },
];

export const PRODUCT_GUIDED_STEPS: StepDefinition[] = [
    {
        step: 1,
        shortTitle: 'Item & Aisle',
        guidedTitle: 'What merchandise or part are you selling?',
        guidedDescription:
            'Include brand, part number, and key technical specifications so buyers find the exact part or goods they need.',
        standardTitle: 'Product Identity & Aisle',
    },
    {
        step: 2,
        shortTitle: 'Photos',
        guidedTitle: 'Add authentic product photos',
        guidedDescription:
            'Show the physical item clearly, including labels, rating plates, and packaging condition (Brand New or Tested Surplus).',
        standardTitle: 'Product Photos & Proof',
    },
    {
        step: 3,
        shortTitle: 'Pickup Point',
        guidedTitle: 'Where can buyers collect this item?',
        guidedDescription:
            'Your physical store, stall, or home workshop in Tagudin where buyers or couriers collect paid orders.',
        standardTitle: 'Shop & Collection Point',
    },
    {
        step: 4,
        shortTitle: 'Pricing & Stock',
        guidedTitle: 'Set your unit pricing & stock variants',
        guidedDescription:
            'Set unit cash price in Philippine Pesos (₱). Add variants if you stock multiple sizes, flavors, or pack counts.',
        standardTitle: 'Inventory Variants & Unit Pricing',
    },
    {
        step: 5,
        shortTitle: 'Fulfillment & Review',
        guidedTitle: 'How do customers receive this product?',
        guidedDescription:
            'Offer direct customer pickup at your stall, or attach motorcycle courier partners so customers can opt for direct home delivery.',
        standardTitle: 'Fulfillment & Partner Extensions',
    },
];

export const SERVICE_FIELD_GUIDANCE: Record<string, FieldDefinition> = {
    title: {
        id: 'title',
        guidedLabel: 'What do you want to call your service?',
        advancedLabel: 'Service Title',
        placeholder: 'e.g. Inverter Split AC Deep Clean & Checkup',
        guidance: {
            id: 'title',
            question: 'How should I name my service?',
            answer: 'Use a clear trade title with your primary craft (e.g. "Inverter Split AC Cleaning" rather than generic "AC Repair"). Specific trade names help local Tagudin clients find you quickly.',
            example: 'Inverter Split AC Deep Clean & Checkup',
        },
    },
    category: {
        id: 'category',
        guidedLabel: 'What trade category best fits your craft?',
        advancedLabel: 'Trade Category',
        guidance: {
            id: 'category',
            question: 'Why does the trade category matter?',
            answer: 'It determines your municipal dispatch classification in Tagudin and links you to compatible work execution workflows and partner deal chains.',
        },
    },
    media: {
        id: 'media',
        guidedLabel: 'Show proof of your craft (Photos & Video)',
        advancedLabel: 'Listing Media & Proof',
        guidance: {
            id: 'media',
            question: 'What photos or media work best?',
            answer: 'Authentic photos of past jobs, branded gear, or specialized tools build local trust. Video walk-throughs receive prominent badges on the browse feed.',
            example: 'Coil cleaning before/after or photo of diagnostic gauge',
        },
    },
    workPlan: {
        id: 'workPlan',
        guidedLabel: 'How do you execute this service step-by-step?',
        advancedLabel: 'Work Execution Plan',
        guidance: {
            id: 'workPlan',
            question: 'What is a Work Execution Plan?',
            answer: 'Step-by-step milestones (like chemical flush, delta temp test) tracked for customer verification and escrow sign-off. Sign-off on evidence gates unlocks payment release.',
            example: '4-step linear project with customer sign-off gate',
        },
    },
    inclusions: {
        id: 'inclusions',
        guidedLabel: 'What is physically included in your base labor?',
        advancedLabel: 'Deliverables Checklist',
        guidance: {
            id: 'inclusions',
            question: 'What should I list in deliverables?',
            answer: 'Itemize physical tasks and specify whether specialized chemicals or equipment are covered in your base labor so customers know exactly what will be completed.',
            example: 'Evaporator foam wash, blower wheel flush, delta temp drop test',
        },
    },
    geography: {
        id: 'geography',
        guidedLabel: 'Where are you based for dispatch in Tagudin?',
        advancedLabel: 'Dispatch Location',
        guidance: {
            id: 'geography',
            question: 'How is my dispatch location used?',
            answer: 'Identifies your home barangay or workshop in Tagudin. Clients see your base location to calculate travel distance and dispatch times.',
            example: 'Tagudin Centro (Poblacion)',
        },
    },
    description: {
        id: 'description',
        guidedLabel: 'Tell clients about your trade experience & standards',
        advancedLabel: 'Detailed Description',
        guidance: {
            id: 'description',
            question: 'What should I write in the description?',
            answer: 'Briefly mention your trade experience, certifications, and what clients should prepare (e.g. water access or clearance) before you arrive.',
        },
    },
    pricing: {
        id: 'pricing',
        guidedLabel: 'How do you charge for this service?',
        advancedLabel: 'Pricing Model & Rates',
        guidance: {
            id: 'pricing',
            question: 'Which pricing model fits my trade?',
            answer: 'Choose Fixed for routine standard jobs, Range if on-site diagnostics vary, or Packages (Basic/Standard/Premium) for tiered scope options.',
            example: 'Fixed: ₱450.00 / unit',
        },
    },
    dealChain: {
        id: 'dealChain',
        guidedLabel: 'Offer turnkey parts or delivery with local partners?',
        advancedLabel: 'Partnered Deal Chains',
        guidance: {
            id: 'dealChain',
            question: 'How do partner deal chains work?',
            answer: 'Connect local parts stores or motorcycle couriers so clients can order required materials, courier transit, and your labor in one single checkout.',
            example: 'Store (₱180) + Courier (₱80) + Your Labor (₱450)',
        },
    },
};

export const PRODUCT_FIELD_GUIDANCE: Record<string, FieldDefinition> = {
    title: {
        id: 'title',
        guidedLabel: 'What merchandise or part are you selling?',
        advancedLabel: 'Product Name',
        placeholder: 'e.g. AC Run Capacitor (35uF 450V)',
        guidance: {
            id: 'title',
            question: 'How should I name my product?',
            answer: 'Include brand, part number, and key technical specifications (capacitance, voltage, size, or weight) so buyers find the exact part they need.',
            example: 'AC Run Capacitor 35uF 450V',
        },
    },
    category: {
        id: 'category',
        guidedLabel: 'Which marketplace aisle does this belong to?',
        advancedLabel: 'Product Category',
        guidance: {
            id: 'category',
            question: 'Why is the aisle category important?',
            answer: 'Places your item in the correct Tagudin browse aisle and allows service providers to attach it to their repair deal chains.',
        },
    },
    media: {
        id: 'media',
        guidedLabel: 'Add authentic product photos',
        advancedLabel: 'Product Photos & Proof',
        guidance: {
            id: 'media',
            question: 'What photos work best for products?',
            answer: 'Show the physical item clearly, including labels, rating plates, and packaging condition (Brand New or Tested Surplus).',
        },
    },
    pricing: {
        id: 'pricing',
        guidedLabel: 'Set your unit pricing & variants',
        advancedLabel: 'Pricing & Inventory Variants',
        guidance: {
            id: 'pricing',
            question: 'How should I price and list variants?',
            answer: 'Set unit cash price in Philippine Pesos (₱). Add variants if you stock multiple sizes, flavors, or pack counts so customers can select their exact requirement.',
            example: '₱50.00 / pack or piece',
        },
    },
    geography: {
        id: 'geography',
        guidedLabel: 'Where can buyers or couriers pick up this item?',
        advancedLabel: 'Shop & Pickup Location',
        guidance: {
            id: 'geography',
            question: 'Where is pickup located?',
            answer: 'Your physical store, stall, or home workshop in Tagudin where buyers or couriers collect paid orders.',
            example: 'e.g. Public Market Stall #14, Tagudin',
        },
    },
    description: {
        id: 'description',
        guidedLabel: 'Item details, specifications, or origin',
        advancedLabel: 'Detailed Description',
        guidance: {
            id: 'description',
            question: 'What should I write in the product description?',
            answer: 'Specify dimensions, compatibility, ingredients, or brand origin in Tagudin so buyers know exactly what they are purchasing.',
            example: 'e.g. 35uF ±5% explosion-proof run capacitor, standard 4-pin quick connect terminals.',
        },
    },
    fulfillment: {
        id: 'fulfillment',
        guidedLabel: 'How do customers receive this product?',
        advancedLabel: 'Fulfillment & Courier Partners',
        guidance: {
            id: 'fulfillment',
            question: 'How does delivery work?',
            answer: 'Offer direct customer pickup at your location, or attach motorcycle courier partners so customers can opt for direct home delivery.',
            example: 'Stall Pickup + Danny Express Courier (₱80)',
        },
    },
};

export const REQUEST_GUIDED_STEPS: StepDefinition[] = [
    {
        step: 1,
        shortTitle: 'Need & Category',
        guidedTitle: 'What do you need help with?',
        guidedDescription:
            'Describe the task, repair, or errand clearly so qualified local providers and specialists can understand your problem.',
        standardTitle: 'Request Identity & Category',
    },
    {
        step: 2,
        shortTitle: 'Scope & Pipeline',
        guidedTitle: 'Detail the scope and required work steps',
        guidedDescription:
            'List specific tasks to complete, or attach a governed catalog pipeline with SLA and milestone evidence requirements.',
        standardTitle: 'Scope & Governed Pipeline',
    },
    {
        step: 3,
        shortTitle: 'Schedule & Location',
        guidedTitle: 'When and where should the work take place?',
        guidedDescription:
            'Select your preferred timing and barangay. Exact address is kept protected and only revealed to your chosen provider.',
        standardTitle: 'Location & Execution Window',
    },
    {
        step: 4,
        shortTitle: 'Budget & Tender Rules',
        guidedTitle: 'Set your budget and bidding rules',
        guidedDescription:
            'Choose your budget expectations and tender privacy mode: Open Tender for visible activity or Sealed Bidding for confidential quotes.',
        standardTitle: 'Budget Semantics & Tender Rules',
    },
    {
        step: 5,
        shortTitle: 'Fulfillment & Review',
        guidedTitle: 'Review your request and publish',
        guidedDescription:
            'Check your terms, select delivery or courier preferences, and post your request to local providers.',
        standardTitle: 'Fulfillment & Final Review',
    },
];

export const REQUEST_FIELD_GUIDANCE: Record<string, FieldDefinition> = {
    title: {
        id: 'title',
        guidedLabel: 'What do you want to call your request?',
        advancedLabel: 'Request Title',
        placeholder: 'e.g. Repair water line in kitchen and replace gate valve',
        guidance: {
            id: 'title',
            question: 'How should I summarize my request?',
            answer: 'State the exact problem and primary object or location (e.g. "Kitchen pipe leak and valve replacement"). Specific titles attract experienced technicians faster.',
            example: 'Repair water line in kitchen and replace gate valve before weekend',
        },
    },
    category: {
        id: 'category',
        guidedLabel: 'Which category best matches this job?',
        advancedLabel: 'Category',
        guidance: {
            id: 'category',
            question: 'Why does category matter?',
            answer: 'It determines which local Tagudin specialists are notified and whether governed work milestone templates can be attached.',
            example: 'Plumbing & Water, Electrical, Carpentry, Errands & Delivery',
        },
    },
    description: {
        id: 'description',
        guidedLabel: 'Describe what needs to be done in detail',
        advancedLabel: 'Task Description & Condition',
        placeholder: 'Describe current symptoms, materials needed, access limitations, or specific instructions...',
        guidance: {
            id: 'description',
            question: 'What should I include in the task description?',
            answer: 'Mention what is happening, what materials you already have, what needs to be replaced, and any house or gate access rules.',
            example: 'Main gate valve is leaking under the sink. We already shut off main water. Need technician to bring new 1/2-inch brass ball valve.',
        },
    },
    pipeline: {
        id: 'pipeline',
        guidedLabel: 'Attach Governed Work Pipeline',
        advancedLabel: 'Governed Workflow & SLA Gates',
        guidance: {
            id: 'pipeline',
            question: 'What is a governed work pipeline?',
            answer: 'A structured sequence of milestones with defined durations and evidence gates (e.g. before/after photo, pressure test sign-off). This protects both you and the provider.',
            example: 'A1 Linear: 1. Diagnosis (15m) → 2. Valve Repair (25m) → 3. Pressure Test Sign-off (15m)',
        },
    },
    timing: {
        id: 'timing',
        guidedLabel: 'When do you need this completed?',
        advancedLabel: 'Execution Timing Window',
        guidance: {
            id: 'timing',
            question: 'How does timing affect quotes?',
            answer: 'Urgent requests alert nearby available providers immediately. Flexible schedules give you more competitive bids over a wider window.',
            example: 'Urgent (Today), Flexible this week, or Specific Date & Time Window',
        },
    },
    location: {
        id: 'location',
        guidedLabel: 'Where is the job location?',
        advancedLabel: 'Barangay & Address Privacy',
        guidance: {
            id: 'location',
            question: 'Will everyone see my exact house address?',
            answer: 'No. Only your barangay (e.g. Tagudin Centro) is visible during bidding. Your exact house coordinates and street address are only revealed to the provider you choose to award.',
            example: 'Barangay Centro, Tagudin · Coarse area only',
        },
    },
    budget: {
        id: 'budget',
        guidedLabel: 'What is your budget expectation?',
        advancedLabel: 'Budget Semantics',
        guidance: {
            id: 'budget',
            question: 'Which budget mode should I choose?',
            answer: '"Need Estimate" lets providers propose based on inspection. "Exact Budget" signals a firm maximum. "Undisclosed" keeps your budget private for unbiased competitive bidding.',
            example: 'Need Estimate (~₱500) or Exact Budget (₱850.00)',
        },
    },
    tenderMode: {
        id: 'tenderMode',
        guidedLabel: 'How should providers bid?',
        advancedLabel: 'Tender Privacy Mode',
        guidance: {
            id: 'tenderMode',
            question: 'What is the difference between Open Tender and Sealed Bidding?',
            answer: 'In Open Tender, providers see that other bids have been submitted and can submit competitive proposals. In Sealed Bidding, quotes are blind/sealed until review opens, preventing race-to-the-bottom undercutting.',
            example: 'Open Tender (Active comparison) vs Sealed Bidding (Blind proposals)',
        },
    },
    fulfillment: {
        id: 'fulfillment',
        guidedLabel: 'Fulfillment & Logistics Preference',
        advancedLabel: 'Fulfillment Preference',
        guidance: {
            id: 'fulfillment',
            question: 'Can I request delivery or courier assistance?',
            answer: 'Yes. If your job requires picking up parts or materials from market hardware stores, providers can bundle courier transit directly into their bid.',
            example: 'Direct On-Site Service or Courier Runner Sourcing',
        },
    },
};
