import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Flag,
  HeartHandshake,
  Inbox,
  Lock,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  createGameSession,
  getActiveReleaseState,
  saveReleaseState,
  submitGameResult,
  type GameProfile,
} from "@/lib/games/gameApi";
import {
  RELEASE_CAMPAIGNS_V2,
  RELEASE_GOALS,
  RELEASE_RULESET_VERSION,
  actionAvailability,
  applyReleaseAction,
  campaignById,
  initialReleaseState,
  releaseActionRisk,
  releaseGoalProgress,
  releaseScore,
  type CampaignConfig,
  type CampaignId,
  type Difficulty,
  type ReleaseAction,
  type ReleaseState,
  type Variant,
} from "@/lib/games/releaseSimulatorEngine";
import { preloadReleaseCampaign } from "@/lib/games/releaseSimulatorAssets";

type RewardGrant = { points: number; kind: string; amount: number };
const ROOT = "/assets/games/release-simulator";
const money = (cents: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export function ReleaseDaySimulator({
  profile,
  onExit,
  onVerified,
}: {
  profile: GameProfile;
  onExit: () => void;
  onVerified: (p: GameProfile, g: RewardGrant[]) => void;
}) {
  const reduced = useReducedMotion();
  const unlocked = Math.min(6, profile.progress["release-day"]?.unlocked || 1);
  const [screen, setScreen] = useState<"hq" | "intro" | "play" | "result">(
    "hq",
  );
  const [campaignId, setCampaignId] = useState<CampaignId>("first-single");
  const [difficulty, setDifficulty] = useState<Difficulty>("starter");
  const [variant, setVariant] = useState<Variant>("core");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Amapiano");
  const [language, setLanguage] = useState("Code-switching");
  const [setting, setSetting] = useState("Eastern Cape");
  const [state, setState] = useState<ReleaseState | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [resolving, setResolving] = useState(false);
  const [verification, setVerification] = useState<
    "idle" | "pending" | "verified" | "error" | "practice"
  >("idle");
  const started = useRef(0);
  const cloudSave = useRef(Promise.resolve());
  const lastSavedRevision = useRef(0);
  const campaign = campaignById(campaignId);
  const result = useMemo(
    () => (state ? releaseScore(state, campaign) : null),
    [state, campaign],
  );
  const stars = profile.progress["release-day"]?.starsByLevel || {};
  useEffect(() => {
    if (!state) return;
    localStorage.setItem(
      `musicinsta:release-v3:${campaignId}`,
      JSON.stringify(state),
    );
  }, [campaignId, state]);
  useEffect(() => {
    if (!state || !sessionId || state.revision <= lastSavedRevision.current)
      return;
    const revision = state.revision;
    const actions = state.history.map((item) => item.actionId);
    cloudSave.current = cloudSave.current
      .then(() => saveReleaseState(sessionId, revision - 1, actions))
      .then(() => {
        lastSavedRevision.current = revision;
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Campaign progress could not be saved to the cloud.",
        );
      });
  }, [sessionId, state]);
  useEffect(() => {
    preloadReleaseCampaign(campaignId);
  }, [campaignId]);
  useEffect(() => {
    if (
      !state ||
      state.status === "planning" ||
      verification !== "idle" ||
      !sessionId ||
      !result
    )
      return;
    setVerification("pending");
    void submitGameResult({
      sessionId,
      game: "release-day",
      level: RELEASE_CAMPAIGNS_V2.findIndex((c) => c.id === campaignId) + 1,
      score: result.score,
      durationMs: Math.max(1600, Date.now() - started.current),
      completed: state.status === "complete",
      actions: state.history.map((item) => item.actionId),
      rulesetVersion: RELEASE_RULESET_VERSION,
    })
      .then((response) => {
        setVerification("verified");
        onVerified(response.profile, response.milestones);
        toast.success(
          `${response.pointsAwarded} verified reward points earned.`,
        );
      })
      .catch((error) => {
        setVerification("error");
        toast.error(
          error instanceof Error
            ? error.message
            : "Reward verification is pending.",
        );
      });
  }, [campaignId, onVerified, result, sessionId, state, verification]);
  const begin = async () => {
    if (!artist.trim())
      return toast.error("Add your artist name before starting.");
    try {
      const level =
        RELEASE_CAMPAIGNS_V2.findIndex((c) => c.id === campaignId) + 1;
      const session = await createGameSession(
        "release-day",
        level,
        `${campaignId}-${Date.now()}`,
        `release-v3:${campaignId}:${difficulty}:${variant}`,
      );
      lastSavedRevision.current = 0;
      setSessionId(session.sessionId);
      setState(
        initialReleaseState(campaign, difficulty, variant, session.seed),
      );
      started.current = Date.now();
      setVerification("idle");
      setScreen("play");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not prepare the campaign.",
      );
    }
  };
  const restore = async () => {
    try {
      const saved = await getActiveReleaseState();
      if (saved.rulesetVersion !== RELEASE_RULESET_VERSION)
        throw new Error(
          "This saved campaign uses an older ruleset and can only be replayed in practice mode.",
        );
      const selected = RELEASE_CAMPAIGNS_V2[saved.level - 1];
      if (!selected) throw new Error("The saved campaign is not compatible.");
      const parts = saved.mode.split(":");
      const savedDifficulty = (parts[2] || "starter") as Difficulty;
      const savedVariant = (parts[3] || "core") as Variant;
      let restored = initialReleaseState(
        selected,
        savedDifficulty,
        savedVariant,
        saved.seed,
      );
      for (const actionId of saved.actions) {
        const action = selected.actions.find((item) => item.id === actionId);
        if (!action)
          throw new Error("The saved campaign contains an unavailable action.");
        restored = applyReleaseAction(restored, action, selected);
      }
      lastSavedRevision.current = saved.revision;
      setCampaignId(selected.id);
      setDifficulty(savedDifficulty);
      setVariant(savedVariant);
      setState(restored);
      setSessionId(saved.sessionId);
      setVerification("idle");
      started.current = Date.now();
      setScreen("play");
      toast.success("Campaign restored from the cloud.");
      return;
    } catch (cloudError) {
      const raw = localStorage.getItem(`musicinsta:release-v3:${campaignId}`);
      if (!raw)
        return toast.error(
          cloudError instanceof Error
            ? cloudError.message
            : "No saved campaign was found.",
        );
      try {
        const saved = JSON.parse(raw) as ReleaseState;
        if (saved.status !== "planning")
          return toast.info("The saved campaign is already complete.");
        setState(saved);
        setSessionId("");
        setVerification("practice");
        started.current = Date.now();
        setScreen("play");
        toast.info("Local campaign restored in practice mode.");
      } catch {
        toast.error("The saved campaign could not be restored.");
      }
    }
  };
  const choose = (action: ReleaseAction) => {
    if (!state || resolving) return;
    const unavailable = actionAvailability(state, action);
    if (unavailable) return toast.error(unavailable);
    const risk = releaseActionRisk(state, action, campaign);
    if (
      !window.confirm(
        `${risk.level === "critical" || risk.level === "high" ? `WARNING: ${risk.label}\n\n` : ""}Commit to “${action.title}” for ${money(action.costCents)}, ${action.duration} day${action.duration === 1 ? "" : "s"} and ${action.energyCost} energy?`,
      )
    )
      return;
    setResolving(true);
    window.setTimeout(
      () => {
        try {
          setState((current) =>
            current ? applyReleaseAction(current, action, campaign) : current,
          );
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "That action is unavailable.",
          );
        } finally {
          setResolving(false);
        }
      },
      reduced ? 0 : 420,
    );
  };
  if (screen === "hq")
    return (
      <Shell title="Campaign HQ" onExit={onExit}>
        <section className="overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-[#120b18]">
          <div className="relative min-h-56 overflow-hidden p-6 sm:p-8">
            <img
              src={`${ROOT}/ui/game-cover.webp`}
              alt="Independent artists planning a release campaign"
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />
            <div className="relative max-w-2xl">
              <img
                src={`${ROOT}/brand/musicinsta-logo.png`}
                alt="MusicInsta"
                className="h-16 w-16 object-contain"
              />
              <p className="mt-3 text-xs font-bold uppercase tracking-[.25em] text-pink-300">
                Release Day Simulator
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">
                From first single to regional headliner.
              </h1>
              <p className="mt-3 text-white/70">
                Plan sustainable releases through six distinct South African
                independent music campaigns.
              </p>
            </div>
          </div>
        </section>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {RELEASE_CAMPAIGNS_V2.map((item, index) => {
            const locked = index + 1 > unlocked;
            const earned = Number(stars[String(index + 1)] || 0);
            return (
              <motion.article
                key={item.id}
                whileHover={reduced ? undefined : { y: -4 }}
                className={`group overflow-hidden rounded-2xl border bg-[#120f15] ${campaignId === item.id ? "border-pink-400" : "border-white/10"}`}
              >
                <div className="relative aspect-[16/8] overflow-hidden">
                  <img
                    src={item.cover}
                    alt={item.summary}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs">
                    {item.difficulty}
                  </span>
                  {locked && (
                    <div className="absolute inset-0 grid place-items-center bg-black/65">
                      <Lock />
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 flex">
                    {[1, 2, 3].map((value) => (
                      <Star
                        key={value}
                        className={`h-4 w-4 ${value <= earned ? "fill-amber-400 text-amber-400" : "text-white/35"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold">
                    {index + 1}. {item.title}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {item.mechanic} · {item.session}
                  </p>
                  <p className="mt-3 min-h-10 text-sm text-white/75">
                    {item.summary}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    disabled={locked}
                    onClick={() => {
                      setCampaignId(item.id);
                      setScreen("intro");
                      setState(null);
                    }}
                  >
                    {earned
                      ? "Play again"
                      : index + 1 === unlocked
                        ? "Start campaign"
                        : "Open campaign"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </Shell>
    );
  if (screen === "intro")
    return (
      <Shell title={campaign.title} onExit={() => setScreen("hq")}>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="overflow-hidden rounded-3xl border border-pink-400/25 bg-[#120f15]">
            <img
              src={campaign.cover}
              alt={campaign.summary}
              className="aspect-[16/7] w-full object-cover"
            />
            <div className="p-5 sm:p-7">
              <p className="text-sm font-bold text-pink-300">
                {campaign.mechanic}
              </p>
              <h1 className="mt-1 text-3xl font-black">{campaign.title}</h1>
              <p className="mt-3 text-white/65">{campaign.summary}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Select
                  label="Difficulty"
                  value={difficulty}
                  onChange={(value) => setDifficulty(value as Difficulty)}
                  options={["starter", "professional", "expert"]}
                />
                <Select
                  label="Campaign approach"
                  value={variant}
                  onChange={(value) => setVariant(value as Variant)}
                  options={["core", "replay"]}
                />
                <label className="text-sm font-semibold">
                  Artist name
                  <Input
                    className="mt-1 bg-black/30"
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    placeholder="Your artist name"
                  />
                </label>
                <Select
                  label="Genre"
                  value={genre}
                  onChange={setGenre}
                  options={[
                    "Amapiano",
                    "Hip Hop",
                    "Afro House",
                    "R&B",
                    "Maskandi",
                    "Afrosoul",
                    "Gospel",
                    "Pop",
                    "Rock",
                  ]}
                />
                <Select
                  label="Language strategy"
                  value={language}
                  onChange={setLanguage}
                  options={["English", "isiXhosa", "isiZulu", "Code-switching"]}
                />
                <Select
                  label="Setting"
                  value={setting}
                  onChange={setSetting}
                  options={[
                    "Eastern Cape",
                    "University town",
                    "Home studio",
                    "Regional network",
                  ]}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="lg" onClick={() => void begin()}>
                  <Play className="mr-2 h-4 w-4" />
                  Prepare campaign
                </Button>
                <Button size="lg" variant="outline" onClick={restore}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Continue saved
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/45">
                Budgets, attendance, streams and income are fictional gameplay
                values—not prices or financial forecasts. Genre and language
                shape context, not automatic success.
              </p>
            </div>
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Your starting point
              </p>
              <p className="mt-2 font-semibold">
                {RELEASE_GOALS[campaign.id].startingPoint}
              </p>
            </div>
            <InfoCard
              title="How to win"
              items={[
                `Complete every Essential action within ${campaign.turns} decisions.`,
                `Finish with a projected score of at least ${RELEASE_GOALS[campaign.id].targetScore}.`,
                "Keep energy above zero and never commit more cash than you have.",
              ]}
            />
            <InfoCard
              title="How you lose"
              items={[
                "Use all decisions while Essential actions are unfinished.",
                `Finish below ${RELEASE_GOALS[campaign.id].targetScore} projected points.`,
                ...campaign.failure,
              ]}
            />
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <b>Session structure</b>
              <p className="mt-2 text-sm text-white/60">
                {campaign.turns} decisions · {campaign.session} · deterministic
                seed ·{" "}
                {variant === "replay"
                  ? "alternate replay constraints"
                  : "core campaign"}
              </p>
            </div>
          </aside>
        </div>
      </Shell>
    );
  if (!state) return null;
  if (screen === "result" || state.status !== "planning")
    return (
      <Result
        campaign={campaign}
        state={state}
        verification={verification}
        onRetry={() => {
          setVerification("idle");
        }}
        onReplay={() => {
          setState(null);
          setScreen("intro");
        }}
        onExit={() => setScreen("hq")}
      />
    );
  return (
    <Shell
      title={campaign.title}
      onExit={() => {
        if (window.confirm("Save and exit this campaign?")) setScreen("hq");
      }}
    >
      <ResourceBar state={state} />
      <MissionGuide campaign={campaign} state={state} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <main>
          <div className="relative overflow-hidden rounded-3xl border border-pink-400/25 bg-[#120f15]">
            <img
              src={campaign.scenes[state.turn % campaign.scenes.length]}
              alt="Current campaign situation"
              className="aspect-[16/6] w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120f15] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-xs font-bold uppercase tracking-widest text-pink-300">
                Decision {state.turn + 1} of {campaign.turns}
              </p>
              <h2 className="text-2xl font-black">{campaign.mechanic}</h2>
            </div>
          </div>
          <Workspace
            campaign={campaign}
            state={state}
            onChoose={choose}
            resolving={resolving}
          />
        </main>
        <aside className="space-y-4">
          <ObjectiveTracker campaign={campaign} state={state} />
          <InboxCard campaign={campaign} state={state} />
          <details className="rounded-2xl border border-white/10 bg-[#120f15] p-4">
            <summary className="cursor-pointer font-bold">
              Decision history
            </summary>
            <div className="mt-3 space-y-3 text-sm">
              {state.history.length ? (
                state.history.map((item) => (
                  <div
                    key={`${item.turn}-${item.actionId}`}
                    className="border-l-2 border-pink-400 pl-3"
                  >
                    <b>{item.title}</b>
                    <p className="text-white/55">{item.summary}</p>
                  </div>
                ))
              ) : (
                <p className="text-white/45">No commitments yet.</p>
              )}
            </div>
          </details>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              localStorage.setItem(
                `musicinsta:release-v3:${campaignId}`,
                JSON.stringify(state),
              );
              toast.success(
                sessionId
                  ? "Campaign is saved locally and synced to the cloud."
                  : "Practice campaign saved on this device.",
              );
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            Save campaign
          </Button>
        </aside>
      </div>
    </Shell>
  );
}

function MissionGuide({
  campaign,
  state,
}: {
  campaign: CampaignConfig;
  state: ReleaseState;
}) {
  const progress = releaseGoalProgress(state, campaign);
  const nextRequired = progress.remaining
    .map((id) => campaign.actions.find((action) => action.id === id))
    .find((action) => action && !actionAvailability(state, action));
  return (
    <section
      className={`mt-4 rounded-2xl border p-4 ${progress.canStillWin ? "border-pink-400/35 bg-pink-950/15" : "border-red-500/50 bg-red-950/20"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-pink-300">
            Campaign mission
          </p>
          <h2 className="mt-1 text-xl font-black">
            Complete {progress.remaining.length} remaining Essential action
            {progress.remaining.length === 1 ? "" : "s"} and finish at 58+
          </h2>
          <p className="mt-1 text-sm text-white/65">
            {nextRequired
              ? `Recommended next move: ${nextRequired.title}.`
              : progress.remaining.length
                ? "Complete the prerequisite shown on the blocked Essential action."
                : "All essential work is complete. Use remaining decisions to improve your projected score."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-black/35 px-3 py-2">
            <b className="block text-lg">{progress.turnsLeft}</b>turns left
          </div>
          <div className="rounded-xl bg-black/35 px-3 py-2">
            <b className="block text-lg">{progress.remaining.length}</b>
            essential
          </div>
          <div className="rounded-xl bg-black/35 px-3 py-2">
            <b
              className={`block text-lg ${progress.projectedScore >= 58 ? "text-emerald-300" : "text-amber-300"}`}
            >
              {progress.projectedScore}
            </b>
            projected
          </div>
        </div>
      </div>
      {!progress.canStillWin && (
        <p className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm font-semibold text-red-200">
          The campaign can no longer meet every win condition. Finish the run
          to see exactly what caused the loss, then replay with the recommended
          order.
        </p>
      )}
    </section>
  );
}

function ObjectiveTracker({
  campaign,
  state,
}: {
  campaign: CampaignConfig;
  state: ReleaseState;
}) {
  const progress = releaseGoalProgress(state, campaign);
  return (
    <div className="rounded-2xl border border-white/10 bg-[#120f15] p-4">
      <h3 className="font-bold">Win checklist</h3>
      <div className="mt-3 space-y-2 text-sm">
        {progress.goal.required.map((id) => {
          const action = campaign.actions.find((item) => item.id === id);
          const done = state.completed.includes(id);
          return (
            <div key={id} className="flex items-center gap-2">
              <Check
                className={`h-4 w-4 ${done ? "text-emerald-300" : "text-white/25"}`}
              />
              <span className={done ? "text-white/45 line-through" : ""}>
                {action?.title || id}
              </span>
            </div>
          );
        })}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span>Projected score target</span>
          <b
            className={
              progress.projectedScore >= progress.goal.targetScore
                ? "text-emerald-300"
                : "text-amber-300"
            }
          >
            {progress.projectedScore} / {progress.goal.targetScore}
          </b>
        </div>
      </div>
    </div>
  );
}

function Workspace({
  campaign,
  state,
  onChoose,
  resolving,
}: {
  campaign: CampaignConfig;
  state: ReleaseState;
  onChoose: (a: ReleaseAction) => void;
  resolving: boolean;
}) {
  const essential = new Set(RELEASE_GOALS[campaign.id].required);
  const available = campaign.actions
    .filter((action) => !state.completed.includes(action.id))
    .sort((first, second) => Number(essential.has(second.id)) - Number(essential.has(first.id)));
  return (
    <section className="mt-4 rounded-3xl border border-white/10 bg-[#0d0b0f] p-4 sm:p-5">
      <WorkspaceHeader campaign={campaign} state={state} />
      <div
        className={`mt-4 grid gap-3 ${campaign.workspace === "calendar" ? "sm:grid-cols-2 lg:grid-cols-4" : campaign.workspace === "route" ? "sm:grid-cols-2" : campaign.workspace === "incidents" ? "lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {available.slice(0, 6).map((action, index) => {
          const unavailable = actionAvailability(state, action);
          const risk = releaseActionRisk(state, action, campaign);
          const riskStyle =
            risk.level === "critical"
              ? "border-red-500/70 bg-red-950/20"
              : risk.level === "high"
                ? "border-amber-400/50 bg-amber-950/15"
                : risk.level === "recommended"
                  ? "border-emerald-400/45 bg-emerald-950/15"
                  : "border-white/10 bg-white/[.035]";
          return (
            <motion.button
              key={action.id}
              layout
              disabled={!!unavailable || resolving}
              onClick={() => onChoose(action)}
              className={`group overflow-hidden rounded-2xl border text-left transition hover:border-pink-400 disabled:opacity-45 ${riskStyle}`}
            >
              <img
                src={campaign.scenes[index % campaign.scenes.length]}
                alt=""
                className="h-28 w-full object-cover opacity-65"
              />
              <div className="p-4">
                <span
                  className={`mb-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${risk.level === "critical" ? "bg-red-500/20 text-red-200" : risk.level === "high" ? "bg-amber-500/20 text-amber-200" : risk.level === "recommended" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/60"}`}
                >
                  {risk.level === "recommended"
                    ? "Essential"
                    : risk.level === "optional"
                      ? "Optional"
                      : `${risk.level} risk`}
                </span>
                <div className="flex items-start justify-between gap-2">
                  <b>{action.title}</b>
                  <span className="shrink-0 text-sm text-pink-300">
                    {money(action.costCents)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  {action.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/55">
                  <span>
                    <Clock3 className="mr-1 inline h-3 w-3" />
                    {action.duration}d
                  </span>
                  <span>
                    <Zap className="mr-1 inline h-3 w-3" />
                    {action.energyCost}
                  </span>
                </div>
                <p className="mt-2 text-xs text-pink-200">
                  {unavailable || risk.label}
                </p>
                {!unavailable && state.difficulty === "starter" && (
                  <p className="mt-2 text-[11px] text-white/55">
                    Forecast: readiness +{action.readiness}, planning +
                    {action.planning}, interest +{action.interest}, trust +
                    {action.trust}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
function WorkspaceHeader({
  campaign,
  state,
}: {
  campaign: CampaignConfig;
  state: ReleaseState;
}) {
  if (campaign.workspace === "route")
    return (
      <div>
        <h3 className="flex items-center gap-2 text-xl font-bold">
          <Route className="text-pink-400" />
          Eastern Cape route network
        </h3>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-fuchsia-950 to-blue-950 p-4">
          <MapPin />
          <span>Alice</span>
          <span className="h-px flex-1 border-t border-dashed border-pink-300" />
          <span>East London</span>
          <span className="h-px flex-1 border-t border-dashed border-pink-300" />
          <span>Gqeberha</span>
          <Flag />
        </div>
      </div>
    );
  if (campaign.workspace === "calendar")
    return (
      <div>
        <h3 className="flex items-center gap-2 text-xl font-bold">
          <CalendarDays className="text-pink-400" />
          Campus campaign calendar
        </h3>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              key={index}
              className={`rounded-lg p-2 text-center text-xs ${index < state.calendarDay % 7 ? "bg-pink-500/25" : "bg-white/5"}`}
            >
              D{index + 1}
            </div>
          ))}
        </div>
      </div>
    );
  if (campaign.workspace === "collaboration")
    return (
      <h3 className="flex items-center gap-2 text-xl font-bold">
        <HeartHandshake className="text-pink-400" />
        Shared board · {state.trust}% relationship trust
      </h3>
    );
  if (campaign.workspace === "incidents")
    return (
      <h3 className="flex items-center gap-2 text-xl font-bold">
        <ShieldCheck className="text-pink-400" />
        Incident queue · prioritise impact before urgency
      </h3>
    );
  if (campaign.workspace === "planner")
    return (
      <h3 className="flex items-center gap-2 text-xl font-bold">
        <Coins className="text-pink-400" />
        Weekly planner · available cash only
      </h3>
    );
  return (
    <h3 className="flex items-center gap-2 text-xl font-bold">
      <Check className="text-pink-400" />
      Production dependency board
    </h3>
  );
}
function ResourceBar({ state }: { state: ReleaseState }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/65 p-3 sm:grid-cols-6">
      {[
        [Coins, "Cash", money(state.cashCents)],
        [CalendarDays, "Day", state.calendarDay],
        [Zap, "Energy", state.energy],
        [Check, "Readiness", state.readiness],
        [Users, "Interest", state.interest],
        [HeartHandshake, "Trust", state.trust],
      ].map(([Icon, label, value]) => {
        const C = Icon as typeof Coins;
        return (
          <div key={String(label)} className="rounded-xl bg-white/5 p-3">
            <span className="flex items-center gap-2 text-xs text-white/45">
              <C className="h-4 w-4 text-pink-400" />
              {String(label)}
            </span>
            <b className="mt-1 block text-lg">{String(value)}</b>
          </div>
        );
      })}
    </div>
  );
}
function InboxCard({
  campaign,
  state,
}: {
  campaign: CampaignConfig;
  state: ReleaseState;
}) {
  const portraits = [
    "producer",
    "designer",
    "radio-presenter",
    "student-ambassador",
    "venue-coordinator",
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#120f15] p-4">
      <h3 className="flex items-center gap-2 font-bold">
        <Inbox className="h-4 w-4 text-pink-400" />
        Inbox
      </h3>
      <div className="mt-3 flex gap-3">
        <img
          src={`${ROOT}/characters/${portraits[state.turn % portraits.length]}.webp`}
          alt="Campaign contact"
          className="h-12 w-12 rounded-full object-cover"
        />
        <p className="text-sm text-white/65">
          {campaign.events[state.turn % campaign.events.length]}
        </p>
      </div>
    </div>
  );
}
function Result({
  campaign,
  state,
  verification,
  onRetry,
  onReplay,
  onExit,
}: {
  campaign: CampaignConfig;
  state: ReleaseState;
  verification: string;
  onRetry: () => void;
  onReplay: () => void;
  onExit: () => void;
}) {
  const result = releaseScore(state, campaign);
  return (
    <Shell title="Campaign result" onExit={onExit}>
      <section className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-pink-400/30">
          <img
            src={campaign.outcome}
            alt={result.ending}
            className="h-72 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
          <div className="absolute bottom-5 left-5">
            <p className="text-sm uppercase tracking-widest text-pink-300">
              Overall score
            </p>
            <h1 className="text-6xl font-black">{result.score}</h1>
            <p className="text-xl font-bold">{result.ending}</p>
            <div className="mt-2 flex">
              {[1, 2, 3].map((value) => (
                <Star
                  key={value}
                  className={`h-7 w-7 ${value <= result.stars ? "fill-amber-400 text-amber-400" : "text-white/35"}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {Object.entries(result.components).map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[.03] p-4"
            >
              <b className="text-2xl">{value}</b>
              <span className="block text-xs capitalize text-white/50">
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-5">
            <h3 className="font-bold">Fictional campaign outcome</h3>
            <p className="mt-2 text-white/60">
              {result.streams.toLocaleString()} streams · {result.turnout}{" "}
              attendees · {money(result.incomeCents)} simulated income.
            </p>
            <h3 className="mt-4 font-bold">Lessons from your decisions</h3>
            <ul className="mt-2 space-y-2 text-sm text-white/60">
              {result.lessons.map((lesson) => (
                <li key={lesson}>• {lesson}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <b>Stronger replay:</b> {result.suggestion}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <h3 className="font-bold">Causal timeline</h3>
            <div className="mt-3 space-y-3">
              {state.history.slice(-5).map((item) => (
                <div
                  key={`${item.turn}-${item.actionId}`}
                  className="flex gap-3 text-sm"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-500/20 text-pink-300">
                    {item.turn}
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <p className="text-white/50">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span
            className={`text-sm ${verification === "verified" ? "text-emerald-300" : "text-amber-300"}`}
          >
            {verification === "pending"
              ? "Verifying rewards automatically…"
              : verification === "verified"
                ? "Rewards verified"
                : verification === "error"
                  ? "Verification pending; retry is safe."
                  : verification === "practice"
                    ? "Practice restore · no reward points"
                    : "Preparing verification…"}
          </span>
          {verification === "error" && (
            <Button variant="outline" onClick={onRetry}>
              Retry verification
            </Button>
          )}
          <Button onClick={onReplay}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Replay campaign
          </Button>
          <Button variant="outline" onClick={onExit}>
            Campaign HQ
          </Button>
        </div>
      </section>
    </Shell>
  );
}
function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#120f15] p-4">
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-white/60">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/35 px-3 capitalize"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
function Shell({
  title,
  onExit,
  children,
}: {
  title: string;
  onExit: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#080709] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-pink-500/20 bg-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-2">
          <button
            onClick={onExit}
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <img
            src={`${ROOT}/brand/musicinsta-symbol.png`}
            alt=""
            className="h-8 w-8 object-contain"
          />
          <b>{title}</b>
          <span className="ml-auto hidden text-xs text-white/45 sm:block">
            Release Day Simulator
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] p-3 sm:p-5">{children}</div>
    </main>
  );
}
