import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  AlertCircle,
  Calendar,
  Camera,
  Circle,
  Clock,
  Coins,
  Edit3,
  Gamepad2,
  Info,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Search,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api, ApiCategory, ApiPlayer, ApiTeam, Gender } from "./lib/api";
import { clearAdminKey, isAdmin, setAdminKey } from "./lib/auth";
import {
  CategoryData,
  GroupMatch,
  PlayerStanding,
  TournamentGroup,
  fetchTournamentData,
  toApiStatus,
} from "./lib/tournament";

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = string;
type MatchStatus = GroupMatch["status"];

const TOURNAMENT_START = new Date("2026-06-09T10:00:00");

const RULES_CATEGORIES = [
  {
    title: "General Rules",
    icon: Shield,
    rules: [
      "The Pieces: Matches will be played using standard White and Black coins, along with one Red coin (the Queen).",
      "Winning a Board: The team or player who successfully pockets all of their designated coins first wins the board.",
      "The Opening Break: A toss or coin flip will decide who gets the choice of strike or color for the first break.",
      "Flicking Restriction: Thumb shots are strictly prohibited. All shots must be played using the index or middle finger. Pushing the striker is a foul.",
      "Turn Continuity: A player continues their turn as long as they legally pocket their own coin. The turn ends on a miss, foul, or pocketing only an opponent's coin.",
      "Striker Placement: When placing the striker on the baselines, it must touch both parallel lines and either completely cover or not touch the red end circles.",
    ],
  },
  {
    title: "Official Red Coin (Queen) Rules",
    icon: Coins,
    rules: [
      "The Pre-requisite: A player can only pocket and attempt to cover the Queen if they have already pocketed at least one of their own coins.",
      "Covering the Queen: Once the Queen is pocketed, it must be 'covered' by pocketing one of the player's own coins on the immediate subsequent shot.",
      "Failure to Cover: If the player fails to cover the Queen on the next shot, the Queen is returned to the center circle, and the turn ends.",
      "Simultaneous Pocketing: If a player pockets the Queen and one of their own coins in the same strike, the Queen is automatically covered.",
      "The Final Piece Rule: A player cannot pocket their last remaining coin before the Queen has been covered.",
    ],
  },
  {
    title: "Striker, Fouls & Penalties",
    icon: AlertCircle,
    rules: [
      "Foul Penalty: A foul immediately ends the player's turn. Under ICF rules, a foul incurs a one-coin penalty.",
      "Striker Pocketed: If the striker is pocketed, it is a foul with one penalty coin returned. If no coins pocketed yet, the penalty is owed.",
      "Coin + Striker Together: If a player pockets their own coin and striker in the same shot, that coin is placed back and an additional penalty applies.",
      "Touching Pieces: Physically touching any coin in play (other than the striker during positioning) is a foul.",
    ],
  },
  {
    title: "Coin Replacement & Conduct",
    icon: Award,
    rules: [
      "Placement Protocol: Any penalty coin or coin that flies out must be placed inside the center circle.",
      "No Disturbance: Coins must be placed flat on the board without disturbing other pieces. If center is occupied, coins are packed closely as per referee's discretion.",
      "Authorized Personnel: Coins must only be replaced by the referee, coordinator, or opponent player—never by the foul committer.",
      "Sportsmanlike Conduct: Players must maintain decorum. Intentional distractions or unsporting behavior will result in warning or forfeit.",
      "Direct Hitting: ICF rules allow tactical blocking and direct hitting of any coin on the board, provided the strike is legal.",
    ],
  },
];

const NAV_LINKS = [
  { id: "hero", label: "Home" },
  { id: "categories", label: "Categories" },
  { id: "rules", label: "Rules" },
  { id: "scoring", label: "Scoring" },
  { id: "standings", label: "Standings" },
  { id: "info", label: "Info" },
  { id: "gallery", label: "Gallery" },
];

const CATEGORY_META: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  "Men's Singles": { icon: Target, color: "from-blue-500/20 to-blue-600/5" },
  "Women's Singles": { icon: Zap, color: "from-pink-500/20 to-pink-600/5" },
  "Men's Doubles": {
    icon: Users,
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  "Women's Doubles": {
    icon: Award,
    color: "from-purple-500/20 to-purple-600/5",
  },
  "Mixed Doubles": { icon: Users, color: "from-teal-500/20 to-teal-600/5" },
};

function getCategoryMeta(name: string) {
  return (
    CATEGORY_META[name] ?? {
      icon: LayoutGrid,
      color: "from-slate-500/20 to-slate-600/5",
    }
  );
}

// ─── Hooks & Utils ─────────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState(getRemaining(target));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function sortStandings(standings: PlayerStanding[]): PlayerStanding[] {
  return [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.score - a.score ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name),
  );
}

// ─── Decorative Components ─────────────────────────────────────────────────────

function FloatingCoin({
  color,
  className,
  delay = 0,
}: {
  color: "white" | "black" | "red";
  className?: string;
  delay?: number;
}) {
  const styles =
    color === "white"
      ? "bg-stone-200 dark:bg-slate-100 border-slate-400/80 shadow-inner"
      : color === "black"
        ? "bg-slate-900 border-slate-800/90 shadow-inner"
        : "bg-rose-600 border-rose-400 shadow-inner";
  return (
    <motion.div
      className={`absolute w-8 h-8 md:w-10 md:h-10 rounded-full ${styles} border-2 shadow-lg ${className}`}
      animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
      transition={{
        duration: 5 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

function FloatingStriker({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute w-20 h-20 md:w-16 md:h-16 rounded-full bg-striker border-4 border-striker-ring shadow-2xl overflow-hidden ${className}`}
      animate={{
        x: [0, 12, -10, 0],
        y: [0, -6, -3, 0],
        rotate: [0, 20, -20, 0],
      }}
      transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
    >
      <img
        src="/tw.jpg"
        alt="Thoughtworks logo"
        className="absolute inset-0 w-full h-full object-cover rounded-full opacity-95"
      />
    </motion.div>
  );
}

function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`glass rounded-2xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      {Icon && (
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-teal/10 dark:bg-accent-teal/20 text-accent-teal mb-4">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
        <Trophy className="w-3.5 h-3.5" /> 1st
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">
        2nd
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-bold">
        3rd
      </span>
    );
  return (
    <span className="text-slate-500 dark:text-slate-400 font-medium">
      #{rank}
    </span>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────

function Navbar({
  dark,
  toggleTheme,
  adminMode,
  toggleAdmin,
  menuOpen,
  setMenuOpen,
}: {
  dark: boolean;
  toggleTheme: () => void;
  adminMode: boolean;
  toggleAdmin: () => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-strong shadow-lg py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => scrollTo("hero")}
            className="flex items-center gap-3 font-display font-bold text-lg text-slate-900 dark:text-white"
          >
            <img
              src="/tw.jpg"
              alt="Thoughtworks"
              className="w-10 h-10 rounded-lg bg-white/90 p-1 shadow-sm object-contain"
            />
            <span className="hidden sm:inline">TW Carrom</span>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-accent-teal dark:hover:text-accent-teal rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAdmin}
              title="Organizer admin mode"
              className={`p-2 rounded-xl transition-all ${
                adminMode
                  ? "bg-accent-teal text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {dark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden mt-3"
            >
              <div className="glass rounded-xl p-3 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      scrollTo(link.id);
                      setMenuOpen(false);
                    }}
                    className="px-4 py-3 text-left font-medium rounded-lg hover:bg-accent-teal/10 dark:hover:bg-accent-teal/20 transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero({
  countdown,
  onViewStandings,
}: {
  countdown: ReturnType<typeof useCountdown>;
  onViewStandings: () => void;
}) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden board-pattern"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-board-light/20 via-transparent to-transparent dark:from-board-dark/30 pointer-events-none" />

      <FloatingCoin color="white" className="top-24 left-[12%] opacity-90" />
      <FloatingCoin
        color="black"
        className="top-28 left-[22%] opacity-90"
        delay={0.6}
      />
      <FloatingCoin
        color="white"
        className="top-[34%] right-[18%] opacity-90"
        delay={1.2}
      />
      <FloatingCoin
        color="black"
        className="bottom-[28%] left-[26%] opacity-90"
        delay={1.8}
      />
      <FloatingCoin
        color="black"
        className="bottom-[18%] left-[16%] opacity-90"
        delay={2.1}
      />
      <FloatingCoin
        color="white"
        className="bottom-[24%] right-[28%] opacity-90"
        delay={2.4}
      />
      <FloatingCoin
        color="red"
        className="bottom-[18%] right-[16%] opacity-90"
        delay={3}
      />
      <FloatingStriker className="top-[24%] left-[28%] opacity-100" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-accent-teal mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Thoughtworks Hyderabad Office
          </motion.div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
            Thoughtworks Hyderabad{" "}
            <span className="text-gradient">Carrom Tournament 2026</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            From beginners to boardroom champions — everyone is welcome!
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollTo("rules")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-board-dark hover:bg-board text-white shadow-lg shadow-board-dark/30 transition-colors"
            >
              <Shield className="w-5 h-5" />
              View Rules
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewStandings}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-accent-teal hover:bg-accent-teal/90 text-white shadow-lg shadow-accent-teal/30 transition-colors"
            >
              <Trophy className="w-5 h-5" />
              View Standings
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewStandings}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-board-dark hover:bg-board text-white shadow-lg shadow-board-dark/30 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Group Schedules
            </motion.button>
          </div>

          {!countdown.done && (
            <GlassCard className="max-w-lg mx-auto" hover={false}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> Tournament starts in
              </p>
              <div className="grid grid-cols-4 gap-3">
                {(["days", "hours", "minutes", "seconds"] as const).map(
                  (unit) => (
                    <div key={unit} className="text-center">
                      <div className="text-2xl md:text-3xl font-display font-bold text-accent-teal">
                        {String(countdown[unit]).padStart(2, "0")}
                      </div>
                      <div className="text-xs tracking-wider text-slate-500 capitalize">
                        {unit}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

function StatsBar({
  categoryCount,
  playerCount,
  matchCount,
}: {
  categoryCount: number;
  playerCount: number;
  matchCount: number;
}) {
  const stats = [
    { label: "Categories", value: String(categoryCount), icon: LayoutGrid },
    { label: "Players", value: String(playerCount), icon: Users },
    { label: "Matches", value: String(matchCount), icon: Gamepad2 },
    { label: "Tables", value: "3", icon: Circle },
  ];

  return (
    <section className="py-12 -mt-8 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="text-center">
                <Icon className="w-8 h-8 mx-auto text-accent-gold mb-2" />
                <div className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-white">
                  {value}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {label}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Categories ────────────────────────────────────────────────────────────────

function Categories({
  tournament,
  onSelectCategory,
}: {
  tournament: CategoryData[];
  onSelectCategory: (c: Category) => void;
}) {
  return (
    <section id="categories" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Tournament Categories"
          subtitle="Browse categories and their groups"
          icon={LayoutGrid}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournament.map(({ category, groups }, i) => {
            const { icon: Icon, color } = getCategoryMeta(category);
            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <button
                  onClick={() => onSelectCategory(category)}
                  className="w-full text-left"
                >
                  <GlassCard className={`bg-gradient-to-br ${color} h-full`}>
                    <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-slate-800/80 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-accent-teal" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      {category}
                    </h3>
                    {groups.length > 0 ? (
                      <ul className="mt-3 space-y-1">
                        {groups.map((group) => (
                          <li
                            key={group.id}
                            className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2"
                          >
                            <Circle className="w-2 h-2 fill-accent-teal text-accent-teal" />
                            {group.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        No groups yet
                      </p>
                    )}
                    <p className="text-sm text-accent-teal mt-3 font-medium">
                      View standings & matches →
                    </p>
                  </GlassCard>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Rules ─────────────────────────────────────────────────────────────────────

function RulesSection() {
  return (
    <section id="rules" className="py-20 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Tournament Rules"
          subtitle="Fully aligned with ICF standards with local adjustments"
          icon={Shield}
        />
        <div className="space-y-12">
          {RULES_CATEGORIES.map(({ title, icon: Icon, rules }, categoryIdx) => (
            <div key={categoryIdx}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-lg bg-accent-teal/10 dark:bg-accent-teal/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-accent-teal" />
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {rules.map((rule, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 4) * 0.05 }}
                  >
                    <GlassCard className="h-full flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-board text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                        {rule}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Scoring ───────────────────────────────────────────────────────────────────

function Scoring() {
  const scenarios = [
    {
      title: "Winning team pots red",
      formula: "Score = 5 + remaining opponent coins",
      example: "Opponent has 3 coins left → Final score = 8",
      highlight: "8",
      icon: Trophy,
      gradient: "from-amber-500/30 to-orange-500/10",
    },
    {
      title: "Losing team had potted red",
      formula: "Winning team gets only remaining opponent coins",
      example: "Opponent has 3 coins left → Final score = 3",
      highlight: "3",
      icon: Coins,
      gradient: "from-accent-teal/30 to-emerald-500/10",
    },
  ];

  return (
    <section id="scoring" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Scoring System"
          subtitle="Understand how points are calculated per board"
          icon={Award}
        />
        <div className="grid md:grid-cols-2 gap-8">
          {scenarios.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard className={`bg-gradient-to-br ${s.gradient}`}>
                <s.icon className="w-10 h-10 text-accent-gold mb-4" />
                <h3 className="font-display text-xl font-bold mb-3">
                  {s.title}
                </h3>
                <p className="font-mono text-sm bg-slate-900/5 dark:bg-white/5 rounded-lg px-4 py-3 mb-4">
                  {s.formula}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {s.example}
                </p>
                <div className="text-5xl font-display font-extrabold text-gradient">
                  {s.highlight}
                </div>
                <p className="text-xs text-slate-500 mt-1">points example</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Admin Editors ─────────────────────────────────────────────────────────────

function AdminBanner({
  adminMode,
  onLogout,
}: {
  adminMode: boolean;
  onLogout: () => void;
}) {
  if (!adminMode) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-[7rem] left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-accent-teal text-white text-sm font-medium shadow-lg flex items-center gap-3"
    >
      <Edit3 className="w-4 h-4" />
      Admin Mode — changes sync to server
      <button onClick={onLogout} className="underline text-xs opacity-90">
        Logout
      </button>
    </motion.div>
  );
}

function AdminLoginModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.verifyAdmin(secret);
      setAdminKey(secret);
      onSuccess();
      onClose();
      setSecret("");
    } catch {
      setError("Invalid admin secret");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl max-w-md w-full p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                <Lock className="w-6 h-6 text-accent-teal" />
                Admin Login
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Enter the organizer secret key to manage the tournament.
            </p>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Admin secret"
              className="w-full px-4 py-3 rounded-xl glass mb-3"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              onClick={submit}
              disabled={loading || !secret}
              className="w-full py-3 rounded-xl bg-accent-teal text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Login"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AdminPanel({
  categories,
  players,
  teams,
  tournament,
  onRefresh,
}: {
  categories: ApiCategory[];
  players: ApiPlayer[];
  teams: ApiTeam[];
  tournament: CategoryData[];
  onRefresh: () => Promise<void>;
}) {
  const [playerName, setPlayerName] = useState("");
  const [playerEmployeeId, setPlayerEmployeeId] = useState("");
  const [playerGender, setPlayerGender] = useState<Gender | "">("");
  const [teamCategoryId, setTeamCategoryId] = useState("");
  const [teamGroupId, setTeamGroupId] = useState("");
  const [teamPlayer1, setTeamPlayer1] = useState("");
  const [teamPlayer2, setTeamPlayer2] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupCategoryId, setGroupCategoryId] = useState("");
  const [assignCategoryId, setAssignCategoryId] = useState("");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignPlayerId, setAssignPlayerId] = useState("");
  const [message, setMessage] = useState("");
  const [groups, setGroups] = useState<
    { id: string; name: string; category_id: string }[]
  >([]);

  useEffect(() => {
    api
      .getGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [categories, tournament]);

  const activePlayers = players.filter((p) => p.is_active);
  const singlesCategories = categories.filter((c) => c.format === "SINGLES");
  const doublesCategories = categories.filter((c) => c.format === "DOUBLES");

  const assignedPlayerIdsInCategory = (categoryId: string) => {
    const categoryData = tournament.find((c) => c.categoryId === categoryId);
    if (!categoryData) return new Set<string>();
    return new Set(
      categoryData.groups.flatMap((g) => g.standings.map((s) => s.id)),
    );
  };

  const playersOnTeamsInCategory = (categoryId: string) => {
    const ids = new Set<string>();
    teams
      .filter((t) => t.is_active && t.category_id === categoryId)
      .forEach((t) => {
        ids.add(t.player1_id);
        ids.add(t.player2_id);
      });
    return ids;
  };

  const groupsForCategory = (categoryId: string) =>
    groups.filter((g) => g.category_id === categoryId);

  const availableSinglesPlayers = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return [];
    const assigned = assignedPlayerIdsInCategory(categoryId);
    return activePlayers.filter((p) => {
      if (assigned.has(p.id)) return false;
      if (category.gender === "MALE") return p.gender === "MALE";
      if (category.gender === "FEMALE") return p.gender === "FEMALE";
      return false;
    });
  };

  const availableDoublesPlayers = (categoryId: string, excludeId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return [];
    const onTeam = playersOnTeamsInCategory(categoryId);
    return activePlayers.filter((p) => {
      if (p.id === excludeId) return false;
      if (onTeam.has(p.id)) return false;
      if (category.gender === "MALE") return p.gender === "MALE";
      if (category.gender === "FEMALE") return p.gender === "FEMALE";
      return true;
    });
  };

  const teamPlayer2Options = (categoryId: string, player1Id: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const player1 = activePlayers.find((p) => p.id === player1Id);
    if (!category || !player1)
      return availableDoublesPlayers(categoryId, player1Id);
    if (category.gender === "MIXED") {
      return availableDoublesPlayers(categoryId, player1Id).filter(
        (p) => p.gender !== player1.gender,
      );
    }
    return availableDoublesPlayers(categoryId, player1Id);
  };

  const resetPlayerForm = () => {
    setPlayerName("");
    setPlayerEmployeeId("");
    setPlayerGender("");
  };

  const resetAssignForm = () => {
    setAssignCategoryId("");
    setAssignGroupId("");
    setAssignPlayerId("");
  };

  const resetTeamForm = () => {
    setTeamCategoryId("");
    setTeamGroupId("");
    setTeamPlayer1("");
    setTeamPlayer2("");
  };

  const resetGroupForm = () => {
    setGroupName("");
    setGroupCategoryId("");
  };

  const runAction = async (
    action: () => Promise<unknown>,
    success: string,
    onSuccess?: () => void,
  ) => {
    setMessage("");
    try {
      await action();
      setMessage(success);
      onSuccess?.();
      await onRefresh();
      const updatedGroups = await api.getGroups();
      setGroups(updatedGroups);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div className="mb-10 glass rounded-2xl p-6 space-y-6">
      <h3 className="font-display text-xl font-bold">Organizer Tools</h3>
      {message && <p className="text-sm text-accent-teal">{message}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="font-semibold">Add Player</h4>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-2 rounded-lg glass"
          />
          <input
            value={playerEmployeeId}
            onChange={(e) => setPlayerEmployeeId(e.target.value)}
            placeholder="Employee ID"
            className="w-full px-3 py-2 rounded-lg glass"
          />
          <select
            value={playerGender}
            onChange={(e) => setPlayerGender(e.target.value as Gender | "")}
            className="w-full px-3 py-2 rounded-lg glass"
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          <button
            onClick={() =>
              runAction(
                () =>
                  api.createPlayer({
                    name: playerName,
                    employee_id: playerEmployeeId || undefined,
                    gender: playerGender as Gender,
                  }),
                "Player created",
                resetPlayerForm,
              )
            }
            disabled={!playerName.trim() || !playerGender}
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm disabled:opacity-50"
          >
            Add Player
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Assign Player to Group</h4>
          <select
            value={assignCategoryId}
            onChange={(e) => {
              setAssignCategoryId(e.target.value);
              setAssignGroupId("");
              setAssignPlayerId("");
            }}
            className="w-full px-3 py-2 rounded-lg glass"
          >
            <option value="">Select category</option>
            {singlesCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={assignGroupId}
            onChange={(e) => setAssignGroupId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass"
            disabled={!assignCategoryId}
          >
            <option value="">Select group</option>
            {groupsForCategory(assignCategoryId).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={assignPlayerId}
            onChange={(e) => setAssignPlayerId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass"
            disabled={!assignCategoryId}
          >
            <option value="">Select player</option>
            {availableSinglesPlayers(assignCategoryId).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              runAction(
                () => api.assignPlayer(assignGroupId, assignPlayerId),
                "Player assigned to group",
                resetAssignForm,
              )
            }
            disabled={!assignGroupId || !assignPlayerId}
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm disabled:opacity-50"
          >
            Save Assignment
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Create Doubles Team</h4>
          <select
            value={teamCategoryId}
            onChange={(e) => {
              setTeamCategoryId(e.target.value);
              setTeamGroupId("");
              setTeamPlayer1("");
              setTeamPlayer2("");
            }}
            className="w-full px-3 py-2 rounded-lg glass"
          >
            <option value="">Select category</option>
            {doublesCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={teamGroupId}
            onChange={(e) => setTeamGroupId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass"
            disabled={!teamCategoryId}
          >
            <option value="">Select group</option>
            {groupsForCategory(teamCategoryId).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={teamPlayer1}
            onChange={(e) => {
              setTeamPlayer1(e.target.value);
              setTeamPlayer2("");
            }}
            className="w-full px-3 py-2 rounded-lg glass"
            disabled={!teamCategoryId}
          >
            <option value="">Player 1</option>
            {availableDoublesPlayers(teamCategoryId).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={teamPlayer2}
            onChange={(e) => setTeamPlayer2(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass"
            disabled={!teamCategoryId || !teamPlayer1}
          >
            <option value="">Player 2</option>
            {teamPlayer2Options(teamCategoryId, teamPlayer1).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              runAction(
                () =>
                  api.createTeam({
                    player1_id: teamPlayer1,
                    player2_id: teamPlayer2,
                    category_id: teamCategoryId,
                    group_id: teamGroupId,
                  }),
                "Team created and assigned to group",
                resetTeamForm,
              )
            }
            disabled={
              !teamCategoryId || !teamGroupId || !teamPlayer1 || !teamPlayer2
            }
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm disabled:opacity-50"
          >
            Save Team
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Create Group</h4>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-3 py-2 rounded-lg glass"
          />
          <select
            value={groupCategoryId}
            onChange={(e) => setGroupCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg glass"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              runAction(
                () =>
                  api.createGroup({
                    name: groupName,
                    category_id: groupCategoryId,
                  }),
                "Group created",
                resetGroupForm,
              )
            }
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchAdminControls({
  match,
  groupName,
  categoryName,
  onSave,
}: {
  match: GroupMatch;
  groupName: string;
  categoryName: string;
  onSave: (
    match: GroupMatch,
    update: {
      status?: MatchStatus;
      winnerParticipantId?: string;
      winnerScore?: number;
    },
  ) => Promise<void>;
}) {
  const [winnerId, setWinnerId] = useState(
    match.winnerParticipantId || match.participant1Id,
  );
  const [winnerScore, setWinnerScore] = useState(
    String(match.winnerScore ?? ""),
  );

  const resetMatchForm = () => {
    setWinnerId(match.participant1Id);
    setWinnerScore("");
  };

  const handleSave = async (update: {
    status?: MatchStatus;
    winnerParticipantId?: string;
    winnerScore?: number;
  }) => {
    try {
      await onSave(match, update);
      if (update.status === "Completed") {
        resetMatchForm();
      }
    } catch {
      // Keep form values when the API call fails.
    }
  };

  if (match.status === "Completed") {
    const winnerName =
      match.winnerParticipantId === match.participant1Id
        ? match.playerA
        : match.playerB;
    return (
      <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
        <span>Winner: {winnerName}</span>
        <span>Score: {match.winnerScore ?? "—"}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold w-fit bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300`}
        >
          Completed
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={match.status}
        onChange={(e) => {
          const status = e.target.value as MatchStatus;
          void handleSave({ status });
        }}
        className="px-2 py-0.5 rounded border text-xs"
      >
        <option value="Scheduled">Scheduled</option>
        <option value="Live">Live</option>
      </select>
      <select
        value={winnerId}
        onChange={(e) => setWinnerId(e.target.value)}
        className="px-2 py-0.5 rounded border text-xs"
      >
        <option value={match.participant1Id}>{match.playerA}</option>
        <option value={match.participant2Id}>{match.playerB}</option>
      </select>
      <input
        type="number"
        value={winnerScore}
        onChange={(e) => setWinnerScore(e.target.value)}
        className="w-20 px-2 py-0.5 rounded border text-xs"
        placeholder="Score"
        min={0}
      />
      <button
        onClick={() => {
          const score = Number(winnerScore);
          if (!winnerId || Number.isNaN(score)) return;
          void handleSave({
            status: "Completed",
            winnerParticipantId: winnerId,
            winnerScore: score,
          });
        }}
        className="text-xs text-accent-teal hover:underline text-left"
      >
        Complete match
      </button>
      <span className="text-xs text-slate-500">
        {groupName} · {categoryName}
      </span>
    </div>
  );
}

function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-10">
      {categories.map((cat) => {
        const { icon: Icon } = getCategoryMeta(cat);
        const isActive = active === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-accent-teal text-white shadow-lg shadow-accent-teal/30"
                : "glass text-slate-700 dark:text-slate-300 hover:bg-accent-teal/10"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{cat}</span>
            <span className="sm:hidden">{cat.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

function CategoryTournamentSection({
  data,
  categories,
  activeCategory,
  setActiveCategory,
  adminMode,
  search,
  onMatchUpdate,
}: {
  data: CategoryData[];
  categories: string[];
  activeCategory: Category;
  setActiveCategory: (c: Category) => void;
  adminMode: boolean;
  search: string;
  onMatchUpdate: (
    matchId: string,
    update: {
      status?: MatchStatus;
      winnerParticipantId?: string;
      winnerScore?: number;
    },
  ) => Promise<void>;
}) {
  const categoryData = data.find((d) => d.category === activeCategory);
  const statusColors: Record<MatchStatus, string> = {
    Live: "bg-red-500 text-white animate-pulse",
    Scheduled:
      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    Completed:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  };

  const liveMatches = useMemo(() => {
    const results: { match: GroupMatch; group: string; category: string }[] =
      [];
    for (const cat of data) {
      for (const group of cat.groups) {
        for (const match of group.matches) {
          if (match.status === "Live") {
            results.push({ match, group: group.name, category: cat.category });
          }
        }
      }
    }
    return results;
  }, [data]);

  const filteredGroups = useMemo(() => {
    if (!categoryData) return [];
    const q = search.toLowerCase().trim();
    if (!q) return categoryData.groups;
    return categoryData.groups
      .map((g) => {
        const nameMatch = g.name.toLowerCase().includes(q);
        const playerMatch = g.standings.some((s) =>
          s.name.toLowerCase().includes(q),
        );
        if (nameMatch || playerMatch) return g;
        const matchHit = g.matches.some(
          (m) =>
            m.playerA.toLowerCase().includes(q) ||
            m.playerB.toLowerCase().includes(q),
        );
        return matchHit ? g : null;
      })
      .filter(Boolean) as TournamentGroup[];
  }, [categoryData, search]);

  const saveMatch = async (
    match: GroupMatch,
    update: {
      status?: MatchStatus;
      winnerParticipantId?: string;
      winnerScore?: number;
    },
  ) => {
    await onMatchUpdate(match.id, update);
  };

  return (
    <section
      id="standings"
      className="py-20 bg-slate-50/50 dark:bg-slate-900/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Tournament Standings"
          subtitle="Category → Groups → Standings & matches"
          icon={Trophy}
        />

        <CategoryTabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />

        {categoryData && categoryData.groups.length > 0 && (
          <div className="mb-8 glass rounded-xl p-4 max-w-md mx-auto">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {activeCategory}
            </p>
            <ul className="space-y-1">
              {categoryData.groups.map((group) => (
                <li
                  key={group.id}
                  className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2"
                >
                  <Circle className="w-2 h-2 fill-accent-teal text-accent-teal" />
                  {group.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {liveMatches.length > 0 && (
          <motion.div
            id="live-matches"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 rounded-2xl border-2 border-red-500/50 bg-red-500/10 dark:bg-red-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-4 py-1 bg-red-500 text-white text-xs font-bold rounded-bl-xl flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
            <h3 className="font-display text-lg font-bold mb-4">
              Live Matches
            </h3>
            <ul className="space-y-3">
              {liveMatches.map(({ match, group, category }) => (
                <li
                  key={match.id}
                  className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-red-500/20"
                >
                  <p className="text-xl font-bold">
                    {match.playerA}{" "}
                    <span className="text-red-500 mx-2">vs</span>{" "}
                    {match.playerB}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {group} · {category}
                  </p>
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-bold ${statusColors.Live}`}
                  >
                    Live
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <div className="space-y-10">
          {filteredGroups.map((group) => {
            const sorted = sortStandings(group.standings);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <GlassCard hover={false} className="overflow-hidden p-0">
                  <div
                    className={`px-6 py-4 bg-gradient-to-r ${getCategoryMeta(activeCategory).color} border-b border-white/20`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent-teal">
                          {activeCategory}
                        </p>
                        <h3 className="font-display text-2xl font-bold">
                          {group.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid lg:grid-cols-2 gap-8">
                    {/* Group players */}
                    <div>
                      <h4 className="font-display font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-accent-teal" />
                        Players in group
                      </h4>
                      <ul className="space-y-2 mb-6">
                        {group.standings.map((s, i) => (
                          <li
                            key={s.id}
                            className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-6 h-6 rounded-full bg-board/20 text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <Circle className="w-2 h-2 fill-board text-board" />
                            {s.name}
                          </li>
                        ))}
                      </ul>

                      {/* Points table — per group only */}
                      <h4 className="font-display font-semibold mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent-gold" />
                        Standings
                      </h4>
                      <div className="overflow-x-auto rounded-xl glass">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="px-3 py-3 font-semibold">#</th>
                              <th className="px-3 py-3 font-semibold">
                                Player
                              </th>
                              <th className="px-3 py-3 text-center font-semibold">
                                Played
                              </th>
                              <th className="px-3 py-3 text-center font-semibold">
                                W
                              </th>
                              <th className="px-3 py-3 text-center font-semibold">
                                L
                              </th>
                              <th className="px-3 py-3 text-center font-semibold">
                                Points
                              </th>
                              <th className="px-3 py-3 text-center font-semibold">
                                Score
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((entry, idx) => (
                              <tr
                                key={entry.id}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-accent-teal/5"
                              >
                                <td className="px-3 py-3">
                                  <RankBadge rank={idx + 1} />
                                </td>
                                <td className="px-3 py-3 font-medium">
                                  {entry.name}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {entry.matchesPlayed}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {entry.wins}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {entry.losses}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="font-bold text-accent-teal">
                                    {entry.points}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {entry.score}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Matches */}
                    <div>
                      <h4 className="font-display font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-accent-teal" />
                        Matches
                      </h4>
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {group.matches.map((match, mi) => (
                          <div
                            key={match.id}
                            className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl glass text-sm ${
                              match.status === "Live"
                                ? "ring-2 ring-red-500/40"
                                : ""
                            }`}
                          >
                            <span className="text-xs font-mono text-slate-400 w-16">
                              Match {mi + 1}
                            </span>
                            <div className="flex-1 font-medium">
                              {match.playerA}{" "}
                              <span className="text-accent-teal">vs</span>{" "}
                              {match.playerB}
                            </div>
                            <div className="text-xs text-slate-500">
                              {group.name} · {activeCategory}
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              {adminMode ? (
                                <MatchAdminControls
                                  match={match}
                                  groupName={group.name}
                                  categoryName={activeCategory}
                                  onSave={saveMatch}
                                />
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[match.status]}`}
                                >
                                  {match.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <p className="text-center text-slate-500 py-12">
            No groups or players match your search in this category.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Info, Gallery, Footer, Coming Soon ────────────────────────────────────────

function TournamentInfo() {
  const items = [
    { icon: MapPin, label: "Venue", value: "Thoughtworks Hyderabad Office" },
    { icon: Calendar, label: "Starts", value: "June 2nd Week, 2026" },
    {
      icon: Users,
      label: "Format",
      value: "Group stage tournament across categories",
    },
    {
      icon: Gamepad2,
      label: "Spirit",
      value: "Friendly office tournament with local rules",
    },
  ];

  return (
    <section id="info" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Tournament Info" icon={Info} />
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {items.map(({ icon: Icon, label, value }) => (
            <GlassCard key={label} className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-board/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-board-dark dark:text-board-light" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  {value}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const placeholders = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <section id="gallery" className="py-20 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Tournament Gallery"
          subtitle="Photos will be added after the tournament"
          icon={Camera}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {placeholders.map((n) => (
            <motion.div
              key={n}
              whileHover={{ scale: 1.03 }}
              className="aspect-square rounded-2xl glass flex flex-col items-center justify-center gap-2 text-slate-400"
            >
              <Camera className="w-10 h-10 opacity-40" />
              <span className="text-sm font-medium">Photo {n}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComingSoonBanner() {
  return (
    <div className="bg-gradient-to-r from-board-dark via-accent-teal to-board-dark text-white py-3 text-center text-sm font-medium">
      <span className="inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Coming Soon: Live streaming, player profiles & match highlights
        <Sparkles className="w-4 h-4" />
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <img
              src="/thoughtworks_flamingo_wave.png"
              alt="Thoughtworks"
              className="w-12 h-12 rounded-lg bg-white/90 p-1 shadow-sm object-contain"
            />
            <div>
              <p className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Designed for Thoughtworks Hyderabad Office
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Carrom Tournament 2026 · Internal Event
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <Mail className="w-4 h-4" /> organizers@thoughtworks.com
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="w-4 h-4" /> +91 XXX XXX XXXX
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Search Provider (shared) ──────────────────────────────────────────────────

function GlobalSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto mb-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search players, groups & matches..."
          className="w-full pl-10 pr-4 py-3 rounded-xl glass focus:ring-2 focus:ring-accent-teal border-0"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("theme") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  const [adminMode, setAdminMode] = useState(() => isAdmin());
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<Category>("Men's Singles");
  const [tournament, setTournament] = useState<CategoryData[]>([]);
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const countdown = useCountdown(TOURNAMENT_START);

  const loadTournament = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTournamentData();
      setTournament(data.tournament);
      setApiCategories(data.categories);
      setPlayers(data.players);
      setTeams(data.teams);
      setLoadError(null);
      if (data.tournament.length > 0) {
        setActiveCategory((current) =>
          data.tournament.some((c) => c.category === current)
            ? current
            : data.tournament[0].category,
        );
      }
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Failed to load tournament data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const categoryLabels = useMemo(
    () => tournament.map((c) => c.category),
    [tournament],
  );
  const matchCount = useMemo(
    () =>
      tournament.reduce(
        (n, c) => n + c.groups.reduce((g, grp) => g + grp.matches.length, 0),
        0,
      ),
    [tournament],
  );

  const goToStandings = (category?: Category) => {
    if (category) setActiveCategory(category);
    scrollTo("standings");
  };

  const handleAdminToggle = () => {
    if (adminMode) {
      setAdminMode(false);
      clearAdminKey();
      return;
    }
    if (isAdmin()) {
      setAdminMode(true);
    } else {
      setLoginOpen(true);
    }
  };

  const handleMatchUpdate = async (
    matchId: string,
    update: {
      status?: MatchStatus;
      winnerParticipantId?: string;
      winnerScore?: number;
    },
  ) => {
    await api.updateMatch(matchId, {
      status: update.status ? toApiStatus(update.status) : undefined,
      winner_participant_id: update.winnerParticipantId,
      winner_score: update.winnerScore,
    });
    await loadTournament();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ComingSoonBanner />
      <Navbar
        dark={dark}
        toggleTheme={() => setDark((d) => !d)}
        adminMode={adminMode}
        toggleAdmin={handleAdminToggle}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <AdminBanner
        adminMode={adminMode}
        onLogout={() => {
          clearAdminKey();
          setAdminMode(false);
        }}
      />

      <Hero countdown={countdown} onViewStandings={() => goToStandings()} />
      <StatsBar
        categoryCount={categoryLabels.length}
        playerCount={players.length}
        matchCount={matchCount}
      />
      <Categories tournament={tournament} onSelectCategory={goToStandings} />
      <RulesSection />
      <Scoring />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlobalSearch value={globalSearch} onChange={setGlobalSearch} />
        {loading && (
          <p className="text-center text-slate-500 mb-8">
            Loading tournament data...
          </p>
        )}
        {loadError && (
          <p className="text-center text-red-500 mb-8">
            {loadError} — ensure the backend is running at{" "}
            {import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}
          </p>
        )}
        {adminMode && (
          <AdminPanel
            categories={apiCategories}
            players={players}
            teams={teams}
            tournament={tournament}
            onRefresh={loadTournament}
          />
        )}
      </div>

      <CategoryTournamentSection
        data={tournament}
        categories={categoryLabels}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        adminMode={adminMode}
        search={globalSearch}
        onMatchUpdate={handleMatchUpdate}
      />
      <TournamentInfo />
      <Gallery />
      <Footer />

      <AdminLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setAdminMode(true)}
      />
    </div>
  );
}
