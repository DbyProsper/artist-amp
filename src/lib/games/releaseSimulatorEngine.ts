export const RELEASE_RULESET_VERSION = "release-v3";

export type CampaignId =
  | "first-single"
  | "campus-launch"
  | "independent-hustle"
  | "collaboration-release"
  | "regional-campaign"
  | "release-under-pressure";
export type Difficulty = "starter" | "professional" | "expert";
export type Variant = "core" | "replay";
export type Workspace =
  | "production"
  | "calendar"
  | "planner"
  | "collaboration"
  | "route"
  | "incidents";

export interface ReleaseAction {
  id: string;
  title: string;
  description: string;
  expectation: string;
  costCents: number;
  duration: number;
  energyCost: number;
  readiness: number;
  interest: number;
  trust: number;
  planning: number;
  tags: string[];
  requires?: string[];
  delayed?: Partial<
    Pick<ReleaseState, "readiness" | "interest" | "trust" | "planning">
  >;
}
export interface CampaignConfig {
  id: CampaignId;
  title: string;
  summary: string;
  mechanic: string;
  workspace: Workspace;
  difficulty: string;
  session: string;
  turns: number;
  startingCashCents: number;
  cover: string;
  scenes: string[];
  outcome: string;
  objectives: string[];
  failure: string[];
  actions: ReleaseAction[];
  events: string[];
  weights: {
    readiness: number;
    planning: number;
    finance: number;
    trust: number;
    interest: number;
  };
}
export interface ReleaseHistory {
  actionId: string;
  title: string;
  turn: number;
  cashDeltaCents: number;
  summary: string;
  tags: string[];
}
export interface ScheduledEffect {
  dueTurn: number;
  source: string;
  effect: NonNullable<ReleaseAction["delayed"]>;
}
export interface ReleaseState {
  campaignId: CampaignId;
  difficulty: Difficulty;
  variant: Variant;
  seed: string;
  revision: number;
  turn: number;
  cashCents: number;
  reservedCents: number;
  calendarDay: number;
  energy: number;
  readiness: number;
  interest: number;
  trust: number;
  planning: number;
  completed: string[];
  history: ReleaseHistory[];
  scheduled: ScheduledEffect[];
  ledger: Array<{ turn: number; label: string; amountCents: number }>;
  resolvedEvents: string[];
  status: "planning" | "complete" | "failed";
}

const ROOT = "/assets/games/release-simulator";
const spec = (
  id: string,
  title: string,
  description: string,
  index: number,
  requires?: string[],
): ReleaseAction => ({
  id,
  title,
  description,
  expectation:
    index % 3 === 0
      ? "Strong preparation, with a delayed audience benefit."
      : index % 3 === 1
        ? "A balanced, dependable improvement."
        : "Lower cash cost but heavier personal workload.",
  costCents: [0, 18000, 35000, 55000, 80000, 120000][index % 6],
  duration: 1 + (index % 3),
  energyCost: 5 + (index % 4) * 3,
  readiness: 4 + (index % 4) * 2,
  interest: 2 + (index % 5) * 2,
  trust: index % 4 === 3 ? 1 : 3 + (index % 3),
  planning: 3 + (index % 4),
  tags: [id, index % 2 ? "delivery" : "relationship"],
  requires,
  delayed: index % 3 === 0 ? { interest: 4, trust: 2 } : undefined,
});
const actions = (
  id: CampaignId,
  rows: Array<[string, string, string, string[]?]>,
): ReleaseAction[] =>
  rows.map((row, index) =>
    spec(`${id}:${row[0]}`, row[1], row[2], index, row[3]),
  );
const art = (id: CampaignId, names: string[]) =>
  names.map((name) => `${ROOT}/campaigns/${id}/${name}.webp`);

export const RELEASE_CAMPAIGNS_V2: CampaignConfig[] = [
  {
    id: "first-single",
    title: "First Single",
    summary: "Build a release through a visual production board.",
    mechanic: "Task dependencies",
    workspace: "production",
    difficulty: "Starter",
    session: "8–10 turns",
    turns: 9,
    startingCashCents: 600000,
    cover: `${ROOT}/campaigns/first-single/cover.webp`,
    scenes: art("first-single", [
      "recording-session",
      "artwork-planning",
      "release-checklist",
      "listener-feedback",
    ]),
    outcome: `${ROOT}/campaigns/first-single/outcome.webp`,
    objectives: [
      "Finish the song and mix",
      "Confirm credits and permissions",
      "Prepare artwork and release information",
    ],
    failure: ["Essential release tasks unfinished", "Energy reaches zero"],
    events: [
      "A useful mix note arrives",
      "A designer offers an earlier slot",
      "A listener asks for a clean preview",
      "A file version needs checking",
      "A collaborator confirms credits",
      "A playlist editor requests metadata",
      "A transport plan changes",
      "A final quality check reveals a fix",
    ],
    weights: {
      readiness: 0.4,
      planning: 0.25,
      finance: 0.2,
      trust: 0.15,
      interest: 0,
    },
    actions: actions("first-single", [
      [
        "prepare",
        "Prepare the song",
        "Define structure, references and a realistic recording brief.",
      ],
      [
        "record-diy",
        "Record at home",
        "Use available equipment and spend more time editing.",
      ],
      [
        "record-pro",
        "Book a focused studio session",
        "Pay for a shorter, prepared professional session.",
      ],
      [
        "mix",
        "Review the mix",
        "Test translation and capture actionable notes.",
        ["first-single:prepare"],
      ],
      [
        "artwork",
        "Prepare original artwork",
        "Brief a designer with a clear visual direction.",
      ],
      [
        "credits",
        "Confirm credits and permissions",
        "Record ownership, contributors and approvals.",
      ],
      [
        "metadata",
        "Prepare release information",
        "Complete title, genre, language and clean metadata.",
        ["first-single:credits"],
      ],
      [
        "distribution",
        "Schedule the release",
        "Upload verified files with enough review time.",
        ["first-single:mix", "first-single:metadata"],
      ],
      [
        "content",
        "Create launch content",
        "Capture reusable short-form assets.",
      ],
      [
        "radio-edit",
        "Prepare a radio edit",
        "Create an accessible edit and press note.",
      ],
      [
        "release",
        "Approve release readiness",
        "Run the final checklist before committing.",
        ["first-single:distribution", "first-single:artwork"],
      ],
      [
        "follow-up",
        "Follow up with listeners",
        "Thank early listeners and capture useful feedback.",
        ["first-single:release"],
      ],
    ]),
  },
  {
    id: "campus-launch",
    title: "Campus Launch",
    summary: "Build a coherent calendar for student and local audiences.",
    mechanic: "Calendar and audience strategy",
    workspace: "calendar",
    difficulty: "Intermediate",
    session: "10–12 turns",
    turns: 11,
    startingCashCents: 850000,
    cover: `${ROOT}/campaigns/campus-launch/cover.webp`,
    scenes: art("campus-launch", [
      "radio-interview",
      "ambassador-planning",
      "pop-up-performance",
      "content-shoot",
    ]),
    outcome: `${ROOT}/campaigns/campus-launch/outcome.webp`,
    objectives: [
      "Schedule a coherent campus week",
      "Reach two audience segments",
      "Leave time for follow-up",
    ],
    failure: [
      "Three calendar conflicts",
      "Promotion begins before release materials are ready",
    ],
    events: [
      "A campus society offers a slot",
      "Community radio requests a clean edit",
      "Rain threatens an outdoor activation",
      "A student ambassador shares feedback",
      "Exam week reduces foot traffic",
      "A residence page offers a collaboration",
      "The venue changes access time",
      "A listening group asks for a Q&A",
    ],
    weights: {
      readiness: 0.2,
      planning: 0.25,
      finance: 0.2,
      trust: 0,
      interest: 0.35,
    },
    actions: actions("campus-launch", [
      [
        "radio",
        "Pitch community radio",
        "Prepare and send a professional pitch; submission itself is free.",
      ],
      [
        "ambassador",
        "Meet student ambassadors",
        "Align message, timing and responsibilities.",
      ],
      [
        "content",
        "Schedule a content shoot",
        "Capture campus-focused assets before launch.",
      ],
      [
        "popup",
        "Book a pop-up performance",
        "Reserve a prepared, accessible performance slot.",
      ],
      [
        "listening",
        "Host a listening session",
        "Gather focused feedback from a small group.",
      ],
      [
        "whatsapp",
        "Plan WhatsApp promotion",
        "Create light, shareable updates without spamming.",
      ],
      [
        "followup",
        "Schedule follow-up content",
        "Extend the campaign after the event.",
      ],
      [
        "society",
        "Partner with a student society",
        "Build a relevant campus relationship.",
      ],
      [
        "rehearse",
        "Rehearse the live set",
        "Protect performance quality and confidence.",
      ],
      [
        "radio-visit",
        "Attend a radio interview",
        "Use transport budget and prepared talking points.",
      ],
      [
        "street-team",
        "Coordinate volunteers",
        "Set ethical boundaries and clear tasks.",
      ],
      [
        "review",
        "Review the calendar",
        "Remove conflicts and protect recovery time.",
      ],
    ]),
  },
  {
    id: "independent-hustle",
    title: "Independent Hustle",
    summary: "Balance cash-flow, paid work and release commitments.",
    mechanic: "Weekly planner and cash-flow",
    workspace: "planner",
    difficulty: "Strategic",
    session: "12–14 turns",
    turns: 12,
    startingCashCents: 800000,
    cover: `${ROOT}/campaigns/independent-hustle/cover.webp`,
    scenes: art("independent-hustle", [
      "side-work",
      "transport-planning",
      "home-recording",
      "budget-review",
    ]),
    outcome: `${ROOT}/campaigns/independent-hustle/outcome.webp`,
    objectives: [
      "Complete essential production",
      "Keep a positive cash position",
      "Protect sustainable workload",
    ],
    failure: ["Cash commitments exceed available funds", "Energy reaches zero"],
    events: [
      "A client payment is delayed",
      "A home session produces a reusable template",
      "Transport costs change",
      "A data bundle expires earlier than expected",
      "A paid brief expands in scope",
      "A studio slot becomes available",
      "A collaborator offers remote help",
      "Rest improves the next production block",
    ],
    weights: {
      readiness: 0.3,
      planning: 0.2,
      finance: 0.35,
      trust: 0,
      interest: 0.15,
    },
    actions: actions("independent-hustle", [
      [
        "paid-work",
        "Accept paid creative work",
        "Earn later income while committing time and energy.",
      ],
      [
        "invoice",
        "Follow up an invoice",
        "Improve payment certainty without spending future money.",
      ],
      [
        "studio",
        "Book a prepared studio block",
        "Use available cash for essential production.",
      ],
      [
        "transport",
        "Reserve transport",
        "Protect the session with a realistic travel plan.",
      ],
      [
        "data",
        "Buy a focused data bundle",
        "Cover uploads and collaborator file transfers.",
      ],
      [
        "home",
        "Record at home",
        "Save cash while spending more time on editing.",
      ],
      [
        "rest",
        "Schedule recovery",
        "Restore sustainable energy before demanding work.",
      ],
      [
        "promo",
        "Keep a promotion commitment",
        "Deliver one useful, prepared audience update.",
      ],
      [
        "forecast",
        "Review cash-flow",
        "Separate available funds from future payments.",
      ],
      [
        "skill",
        "Build a reusable session template",
        "Invest time in faster future production.",
      ],
      ["mix", "Complete the mix", "Close an essential release dependency."],
      [
        "deliver",
        "Deliver the release package",
        "Finish the campaign without relying on unpaid future income.",
      ],
    ]),
  },
  {
    id: "collaboration-release",
    title: "Collaboration Release",
    summary: "Coordinate ownership, approvals and creative alignment.",
    mechanic: "Shared task board and inbox",
    workspace: "collaboration",
    difficulty: "Strategic",
    session: "12–14 turns",
    turns: 12,
    startingCashCents: 900000,
    cover: `${ROOT}/campaigns/collaboration-release/cover.webp`,
    scenes: art("collaboration-release", [
      "shared-session",
      "remote-feedback",
      "creative-disagreement",
      "joint-promotion",
    ]),
    outcome: `${ROOT}/campaigns/collaboration-release/outcome.webp`,
    objectives: [
      "Agree credits and scope",
      "Complete both artists’ dependencies",
      "Protect working trust",
    ],
    failure: [
      "Release is submitted without approval",
      "Critical relationship trust is lost",
    ],
    events: [
      "The collaborator proposes a new hook",
      "A producer needs consolidated feedback",
      "Availability changes next week",
      "A credit line is ambiguous",
      "Two promotional dates conflict",
      "A remote file has the wrong version",
      "The designer needs one final approver",
      "A boundary-setting conversation clears the scope",
    ],
    weights: {
      readiness: 0.35,
      planning: 0.3,
      finance: 0.15,
      trust: 0.2,
      interest: 0,
    },
    actions: actions("collaboration-release", [
      [
        "scope",
        "Agree the collaboration scope",
        "Define deliverables, ownership and decision rights.",
      ],
      [
        "session",
        "Run the shared studio session",
        "Capture agreed parts with a focused plan.",
      ],
      [
        "feedback",
        "Consolidate remote feedback",
        "Send one clear note instead of conflicting messages.",
      ],
      [
        "boundary",
        "Set a respectful boundary",
        "Protect scope and quality without automatic agreement.",
      ],
      [
        "credits",
        "Confirm shared credits",
        "Record approvals before promotion begins.",
      ],
      [
        "version",
        "Lock the correct master",
        "Name, review and approve the delivery version.",
      ],
      [
        "art",
        "Approve joint artwork",
        "Give both artists a fair review window.",
      ],
      [
        "promo-plan",
        "Agree promotional commitments",
        "Assign realistic tasks to both teams.",
      ],
      [
        "shoot",
        "Run the joint content shoot",
        "Capture assets that serve both audiences.",
      ],
      [
        "renegotiate",
        "Renegotiate a deadline",
        "Move a date openly when dependencies require it.",
      ],
      [
        "approval",
        "Collect final approvals",
        "Close outstanding decisions before release.",
      ],
      [
        "launch",
        "Coordinate launch handoff",
        "Deliver links, messages and follow-up ownership.",
      ],
    ]),
  },
  {
    id: "regional-campaign",
    title: "Regional Campaign",
    summary: "Plan an Eastern Cape route or remote-first channel strategy.",
    mechanic: "Route and channel planning",
    workspace: "route",
    difficulty: "Advanced",
    session: "14–16 turns",
    turns: 14,
    startingCashCents: 1400000,
    cover: `${ROOT}/campaigns/regional-campaign/cover.webp`,
    scenes: art("regional-campaign", [
      "travel-preparation",
      "local-performance",
      "media-appearance",
      "remote-engagement",
    ]),
    outcome: `${ROOT}/campaigns/regional-campaign/outcome.webp`,
    objectives: [
      "Choose a coherent route or remote plan",
      "Build local partnerships",
      "Protect time and fatigue",
    ],
    failure: [
      "Travel commitments exceed time available",
      "Campaign ends without follow-up",
    ],
    events: [
      "An Alice partner confirms a venue",
      "East London radio offers a remote slot",
      "A Gqeberha show time changes",
      "Travel fatigue affects rehearsal",
      "A local photographer offers a fair package",
      "Weather affects one road leg",
      "A partner can host a remote listening room",
      "A regional page requests follow-up content",
    ],
    weights: {
      readiness: 0.2,
      planning: 0.3,
      finance: 0.2,
      trust: 0,
      interest: 0.3,
    },
    actions: actions("regional-campaign", [
      [
        "alice",
        "Schedule Alice appearance",
        "Pair a small performance with a local partner.",
      ],
      [
        "east-london",
        "Schedule East London media day",
        "Combine a radio visit and content session.",
      ],
      [
        "gqeberha",
        "Schedule Gqeberha performance",
        "Commit to the longest physical travel leg.",
      ],
      [
        "remote-alice",
        "Run remote Alice session",
        "Work through a trusted local host.",
      ],
      [
        "remote-east",
        "Pitch East London remotely",
        "Use a prepared digital press pack.",
      ],
      [
        "remote-gqeberha",
        "Host Gqeberha listening room",
        "Build presence without another travel day.",
      ],
      [
        "route",
        "Optimise the route",
        "Remove unnecessary backtracking and protect rest.",
      ],
      [
        "transport",
        "Reserve reliable transport",
        "Commit known travel expenditure.",
      ],
      [
        "partner",
        "Brief local partners",
        "Align audience, venue and responsibilities.",
      ],
      [
        "rehearse",
        "Prepare the regional set",
        "Adapt the show without overloading production.",
      ],
      [
        "capture",
        "Capture regional content",
        "Create one reusable story from each stop.",
      ],
      [
        "press-pack",
        "Prepare the regional press pack",
        "Give every partner one accurate, lightweight media package.",
      ],
      [
        "recovery-day",
        "Protect a recovery day",
        "Reduce fatigue before the longest commitment.",
      ],
      [
        "followup",
        "Deliver regional follow-up",
        "Thank partners and retain the new audience.",
      ],
    ]),
  },
  {
    id: "release-under-pressure",
    title: "Release Under Pressure",
    summary: "Prioritise incidents while protecting delivery and trust.",
    mechanic: "Incident queue",
    workspace: "incidents",
    difficulty: "Expert",
    session: "14–18 turns",
    turns: 15,
    startingCashCents: 900000,
    cover: `${ROOT}/campaigns/release-under-pressure/cover.webp`,
    scenes: art("release-under-pressure", [
      "technical-fault",
      "missed-delivery",
      "team-discussion",
      "recovery-announcement",
    ]),
    outcome: `${ROOT}/campaigns/release-under-pressure/outcome.webp`,
    objectives: [
      "Resolve essential delivery incidents",
      "Communicate material changes",
      "Choose recovery over reckless rushing",
    ],
    failure: [
      "Critical incident remains unresolved",
      "Trust collapses through avoidable silence",
    ],
    events: [
      "The master upload fails validation",
      "A collaborator becomes unavailable",
      "Connectivity interrupts a handoff",
      "A promotional commitment is missed",
      "Release information contains an error",
      "Two urgent deadlines overlap",
      "A backup file is available",
      "A calm postponement protects the campaign",
    ],
    weights: {
      readiness: 0.3,
      planning: 0.35,
      finance: 0.15,
      trust: 0.2,
      interest: 0,
    },
    actions: actions("release-under-pressure", [
      [
        "triage",
        "Triage the incident queue",
        "Rank urgency, impact and dependency before acting.",
      ],
      [
        "delegate",
        "Delegate a contained task",
        "Give a clear owner and check-in time.",
      ],
      [
        "technical",
        "Fix the technical fault",
        "Use the backup path and verify the output.",
      ],
      [
        "metadata",
        "Correct release information",
        "Repair the source and notify affected partners.",
      ],
      [
        "collaborator",
        "Renegotiate collaborator delivery",
        "Protect the relationship while securing a fallback.",
      ],
      [
        "connectivity",
        "Move to the offline handoff",
        "Use prepared files and scheduled communication.",
      ],
      [
        "promo",
        "Repair the missed commitment",
        "Acknowledge the miss and offer a useful replacement.",
      ],
      [
        "postpone",
        "Postpone responsibly",
        "Move the release when essential delivery is not safe.",
      ],
      [
        "status",
        "Publish a recovery update",
        "Share accurate expectations without overpromising.",
      ],
      [
        "quality",
        "Run a final quality gate",
        "Prevent a second failure before resubmission.",
      ],
      [
        "backup",
        "Verify the backup package",
        "Confirm files, contacts and offline handoff routes.",
      ],
      [
        "slots",
        "Reserve response slots",
        "Limit simultaneous incidents to protect focus.",
      ],
      [
        "restore",
        "Restore partner confidence",
        "Close the loop with collaborators and outlets.",
      ],
      [
        "lessons",
        "Document the incident",
        "Capture causes and safeguards before the next release.",
      ],
      [
        "recover",
        "Complete the recovery plan",
        "Document lessons and resume the campaign safely.",
      ],
    ]),
  },
];

export const campaignById = (id: CampaignId) =>
  RELEASE_CAMPAIGNS_V2.find((c) => c.id === id)!;
export interface ReleaseGoal {
  startingPoint: string;
  required: string[];
  targetScore: number;
}
const goal = (
  campaignId: CampaignId,
  startingPoint: string,
  required: string[],
): ReleaseGoal => ({
  startingPoint,
  required: required.map((id) => `${campaignId}:${id}`),
  targetScore: 58,
});
export const RELEASE_GOALS: Record<CampaignId, ReleaseGoal> = {
  "first-single": goal(
    "first-single",
    "Start by preparing the song. Then secure the mix, credits, metadata, artwork and distribution before approving release readiness.",
    [
      "prepare",
      "mix",
      "credits",
      "metadata",
      "artwork",
      "distribution",
      "release",
    ],
  ),
  "campus-launch": goal(
    "campus-launch",
    "Start with student ambassadors. Rehearse before committing to the event, then protect a follow-up slot.",
    ["ambassador", "rehearse", "popup", "followup", "review"],
  ),
  "independent-hustle": goal(
    "independent-hustle",
    "Start with a cash-flow review. Choose a recording route, protect recovery time, finish the mix and deliver.",
    ["forecast", "rest", "mix", "deliver"],
  ),
  "collaboration-release": goal(
    "collaboration-release",
    "Agree scope before creative work. Credits, the correct master and both artists’ approval must be locked before launch.",
    ["scope", "credits", "version", "approval", "launch"],
  ),
  "regional-campaign": goal(
    "regional-campaign",
    "Optimise the route first, brief local partners, secure transport, prepare the set and complete regional follow-up.",
    ["route", "partner", "transport", "rehearse", "followup"],
  ),
  "release-under-pressure": goal(
    "release-under-pressure",
    "Triage first. Verify the backup, repair essential faults, run quality control, communicate and complete recovery.",
    ["triage", "backup", "technical", "quality", "status", "recover"],
  ),
};
export function releaseGoalProgress(
  state: ReleaseState,
  campaign: CampaignConfig,
) {
  const goalConfig = RELEASE_GOALS[campaign.id];
  const remaining = goalConfig.required.filter(
    (id) => !state.completed.includes(id),
  );
  const turnsLeft = Math.max(0, campaign.turns - state.turn);
  const projectedScore = releaseScore(state, campaign).score;
  return {
    goal: goalConfig,
    remaining,
    turnsLeft,
    projectedScore,
    won:
      remaining.length === 0 &&
      projectedScore >= goalConfig.targetScore &&
      state.energy > 0,
    canStillWin: remaining.length <= turnsLeft && state.energy > 0,
  };
}
export function releaseActionRisk(
  state: ReleaseState,
  action: ReleaseAction,
  campaign: CampaignConfig,
) {
  const progress = releaseGoalProgress(state, campaign);
  const isRequired = progress.goal.required.includes(action.id);
  const remainingAfter = progress.remaining.filter(
    (id) => id !== action.id,
  ).length;
  const turnsAfter = Math.max(0, progress.turnsLeft - 1);
  if (!isRequired && remainingAfter > turnsAfter)
    return {
      level: "critical" as const,
      label:
        "Wrong move now: this uses a turn needed for essential work and can make the campaign unwinnable.",
    };
  if (!isRequired && progress.remaining.length >= progress.turnsLeft - 1)
    return {
      level: "high" as const,
      label:
        "High risk: finish the remaining essential work before choosing this optional action.",
    };
  if (isRequired)
    return {
      level: "recommended" as const,
      label: "Essential for winning this campaign.",
    };
  return {
    level: "optional" as const,
    label: "Optional improvement. Check your turns, cash and energy first.",
  };
}
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
export function initialReleaseState(
  campaign: CampaignConfig,
  difficulty: Difficulty,
  variant: Variant,
  seed: string,
): ReleaseState {
  const factor =
    difficulty === "starter" ? 1 : difficulty === "professional" ? 0.9 : 0.78;
  return {
    campaignId: campaign.id,
    difficulty,
    variant,
    seed,
    revision: 0,
    turn: 0,
    cashCents: Math.round(campaign.startingCashCents * factor),
    reservedCents: 0,
    calendarDay: 1,
    energy: difficulty === "expert" ? 82 : 100,
    readiness: 20,
    interest: 10,
    trust: 60,
    planning: 25,
    completed: [],
    history: [],
    scheduled: [],
    ledger: [],
    resolvedEvents: [],
    status: "planning",
  };
}
function seeded(seed: string, turn: number) {
  let h = 2166136261;
  for (const char of `${seed}:${turn}`) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
export function actionAvailability(state: ReleaseState, action: ReleaseAction) {
  if (state.completed.includes(action.id)) return "Completed";
  const missing = (action.requires || []).filter(
    (id) => !state.completed.includes(id),
  );
  if (missing.length)
    return "Requires " + missing.map((id) => id.split(":").at(-1)).join(", ");
  if (action.costCents > state.cashCents - state.reservedCents)
    return "Not enough available cash";
  if (action.energyCost > state.energy) return "Not enough energy";
  return "";
}
export function applyReleaseAction(
  state: ReleaseState,
  action: ReleaseAction,
  campaign: CampaignConfig,
): ReleaseState {
  const unavailable = actionAvailability(state, action);
  if (unavailable) throw new Error(unavailable);
  const risk = seeded(state.seed, state.turn);
  const difficultyPenalty =
    state.difficulty === "expert"
      ? 2
      : state.difficulty === "professional"
        ? 1
        : 0;
  let next: { [K in keyof ReleaseState]: ReleaseState[K] } = {
    ...state,
    history: [...state.history],
    completed: [...state.completed],
    scheduled: [...state.scheduled],
    ledger: [...state.ledger],
    resolvedEvents: [...state.resolvedEvents],
  };
  const betweenDecisionRecovery = 6;
  next.cashCents -= action.costCents;
  next.energy = clamp(
    next.energy - action.energyCost + betweenDecisionRecovery,
  );
  next.calendarDay += action.duration;
  next.turn += 1;
  next.revision += 1;
  next.readiness = clamp(next.readiness + action.readiness - difficultyPenalty);
  next.interest = clamp(next.interest + action.interest);
  next.trust = clamp(next.trust + action.trust);
  next.planning = clamp(next.planning + action.planning);
  next.completed.push(action.id);
  next.ledger.push({
    turn: next.turn,
    label: action.title,
    amountCents: -action.costCents,
  });
  if (action.delayed)
    next.scheduled.push({
      dueTurn: next.turn + 2,
      source: action.title,
      effect: action.delayed,
    });
  const due = next.scheduled.filter((effect) => effect.dueTurn <= next.turn);
  next.scheduled = next.scheduled.filter(
    (effect) => effect.dueTurn > next.turn,
  );
  for (const item of due) {
    next.readiness = clamp(next.readiness + (item.effect.readiness || 0));
    next.interest = clamp(next.interest + (item.effect.interest || 0));
    next.trust = clamp(next.trust + (item.effect.trust || 0));
    next.planning = clamp(next.planning + (item.effect.planning || 0));
  }
  let eventSummary = "The action completed as planned.";
  if (risk < 0.18 && campaign.events.length) {
    const event =
      campaign.events[
        Math.floor(seeded(state.seed, state.turn + 19) * campaign.events.length)
      ];
    next.resolvedEvents.push(event);
    next.energy = clamp(next.energy - 3);
    eventSummary = `${event}. You adapted without losing the campaign.`;
  }
  next.history.push({
    actionId: action.id,
    title: action.title,
    turn: next.turn,
    cashDeltaCents: -action.costCents,
    summary: eventSummary,
    tags: action.tags,
  });
  if (next.energy <= 0) next.status = "failed";
  else if (next.turn >= campaign.turns)
    next.status = releaseGoalProgress(next, campaign).won
      ? "complete"
      : "failed";
  return next;
}
export function releaseScore(state: ReleaseState, campaign: CampaignConfig) {
  const finance = clamp(
    35 +
      (state.cashCents / campaign.startingCashCents) * 45 +
      state.readiness / 5,
  );
  const components = {
    readiness: state.readiness,
    planning: state.planning,
    finance,
    trust: state.trust,
    interest: state.interest,
  };
  const score = Math.round(
    Object.entries(campaign.weights).reduce(
      (total, [key, weight]) =>
        total + components[key as keyof typeof components] * weight,
      0,
    ),
  );
  const stars = state.status === "failed" ? 0 : score >= 82 ? 3 : score >= 64 ? 2 : 1;
  const ending =
    state.status === "failed"
      ? "Campaign objective missed"
      : score >= 82
        ? "A confident, sustainable campaign"
        : score >= 58
          ? "A focused campaign with useful momentum"
          : "A mixed result with a clear recovery path";
  const missing = RELEASE_GOALS[campaign.id].required
    .filter((id) => !state.completed.includes(id))
    .map(
      (id) => campaign.actions.find((action) => action.id === id)?.title || id,
    );
  const lessons = missing.length
    ? [
        `Essential work left unfinished: ${missing.join(", ")}.`,
        ...state.history
          .slice(-2)
          .map((item) => `${item.title}: ${item.summary}`),
      ]
    : state.history.slice(-3).map((item) => `${item.title}: ${item.summary}`);
  return {
    score,
    stars,
    ending,
    components,
    streams: Math.round(180 + score * 21 + state.interest * 11),
    turnout: Math.round(10 + score * 0.55),
    incomeCents: Math.round(score * 2600),
    lessons,
    suggestion:
      state.readiness < 65
        ? "Complete essential dependencies earlier before expanding promotion."
        : state.energy < 35
          ? "Protect recovery time so strong planning remains sustainable."
          : "Replay with the alternate variant and a tighter commitment mix.",
  };
}
