import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
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

const RULES = [
  "Match will be played with Black and White coins only.",
  "Team/player who pots all their coins first wins the board.",
  "Toss/coin flip will decide the first break.",
  "No thumb shots allowed.",
  "Player continues turn until they miss or commit a foul.",
  "Red coin must be covered after potting.",
  "Red can be covered only after potting at least one own coin.",
  "If red is not covered, it will be placed back at the center.",
  "If striker is also potted while potting red, player must still cover the red.",
  "If striker is potted, penalty applies only if player has already potted their own coin.",
  "If player pots own coin and striker together, player can either continue with penalty or lose the turn.",
  "Any penalty coin or coin flying out must be placed back in center.",
  "Intentional direct hitting/blocking of opponent's last coin is not allowed.",
  "Referee/coordinator decision will be final.",
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

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string }> = {
  "Singles (Men)": { icon: Target, color: "from-blue-500/20 to-blue-600/5" },
  "Singles (Women)": { icon: Zap, color: "from-pink-500/20 to-pink-600/5" },
  "Doubles (Men)": { icon: Users, color: "from-emerald-500/20 to-emerald-600/5" },
  "Doubles (Women)": { icon: Award, color: "from-purple-500/20 to-purple-600/5" },
};

function getCategoryMeta(name: string) {
  return CATEGORY_META[name] ?? { icon: LayoutGrid, color: "from-slate-500/20 to-slate-600/5" };
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
  return [...standings].sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
}

// ─── Decorative Components ─────────────────────────────────────────────────────

function FloatingCoin({ color, className, delay = 0 }: { color: "white" | "black" | "red"; className?: string; delay?: number }) {
  const bg =
    color === "white" ? "bg-coin-white shadow-inner" : color === "black" ? "bg-coin-black" : "bg-coin-red";
  return (
    <motion.div
      className={`absolute w-8 h-8 md:w-10 md:h-10 rounded-full ${bg} border-2 border-white/20 shadow-lg ${className}`}
      animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function FloatingStriker({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute w-12 h-12 md:w-14 md:h-14 rounded-full bg-striker border-4 border-striker-ring shadow-xl ${className}`}
      animate={{ y: [0, -24, 0], x: [0, 6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
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

function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
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
      <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      {subtitle && <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">{subtitle}</p>}
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
  return <span className="text-slate-500 dark:text-slate-400 font-medium">#{rank}</span>;
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-strong shadow-lg py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => scrollTo("hero")}
            className="flex items-center gap-2 font-display font-bold text-lg text-slate-900 dark:text-white"
          >
            <div className="w-9 h-9 rounded-lg bg-board flex items-center justify-center">
              <Target className="w-5 h-5 text-coin-white" />
            </div>
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
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
    <section id="hero" className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden board-pattern">
      <div className="absolute inset-0 bg-gradient-to-b from-board-light/20 via-transparent to-transparent dark:from-board-dark/30 pointer-events-none" />

      <FloatingCoin color="white" className="top-32 left-[8%] opacity-60" />
      <FloatingCoin color="black" className="top-48 right-[12%] opacity-50" delay={1} />
      <FloatingCoin color="red" className="bottom-40 left-[15%] opacity-70" delay={2} />
      <FloatingStriker className="top-40 right-[20%] opacity-40" />

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
                {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
                  <div key={unit} className="text-center">
                    <div className="text-2xl md:text-3xl font-display font-bold text-accent-teal">
                      {String(countdown[unit]).padStart(2, "0")}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 capitalize">{unit}</div>
                  </div>
                ))}
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
                <div className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-white">{value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
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
  categories,
  onSelectCategory,
}: {
  categories: string[];
  onSelectCategory: (c: Category) => void;
}) {
  return (
    <section id="categories" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Tournament Categories"
          subtitle="Each category has separate groups — round-robin within every group"
          icon={LayoutGrid}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((name, i) => {
            const { icon: Icon, color } = getCategoryMeta(name);
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <button onClick={() => onSelectCategory(name)} className="w-full text-left">
                  <GlassCard className={`bg-gradient-to-br ${color} h-full`}>
                    <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-slate-800/80 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-accent-teal" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      View groups, points & schedule →
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

function RulesSection({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section id="rules" className="py-20 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Tournament Rules" subtitle="Play fair, play fun — know the rules before you strike" icon={Shield} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {RULES.map((rule, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 6) * 0.05 }}
            >
              <GlassCard className="h-full flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-board text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{rule}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
        <div className="text-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-teal text-white font-semibold shadow-lg shadow-accent-teal/30"
          >
            <Info className="w-5 h-5" />
            View Full Rules Modal
          </motion.button>
        </div>
      </div>
    </section>
  );
}

function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            className="glass-strong rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-display text-2xl font-bold">Complete Tournament Rules</h3>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-4">
              {RULES.map((rule, i) => (
                <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-accent-teal">{i + 1}.</span>
                  {rule}
                </li>
              ))}
            </ol>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
        <SectionHeader title="Scoring System" subtitle="Understand how points are calculated per board" icon={Award} />
        <div className="grid md:grid-cols-2 gap-8">
          {scenarios.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: i ? 20 : -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <GlassCard className={`bg-gradient-to-br ${s.gradient}`}>
                <s.icon className="w-10 h-10 text-accent-gold mb-4" />
                <h3 className="font-display text-xl font-bold mb-3">{s.title}</h3>
                <p className="font-mono text-sm bg-slate-900/5 dark:bg-white/5 rounded-lg px-4 py-3 mb-4">{s.formula}</p>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{s.example}</p>
                <div className="text-5xl font-display font-extrabold text-gradient">{s.highlight}</div>
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

function AdminBanner({ adminMode, onLogout }: { adminMode: boolean; onLogout: () => void }) {
  if (!adminMode) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-accent-teal text-white text-sm font-medium shadow-lg flex items-center gap-3"
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
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Enter the organizer secret key to manage the tournament.</p>
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
  onRefresh,
}: {
  categories: ApiCategory[];
  players: ApiPlayer[];
  teams: ApiTeam[];
  onRefresh: () => Promise<void>;
}) {
  const [playerName, setPlayerName] = useState("");
  const [playerEmployeeId, setPlayerEmployeeId] = useState("");
  const [playerGender, setPlayerGender] = useState<Gender>("MALE");
  const [teamName, setTeamName] = useState("");
  const [teamCategoryId, setTeamCategoryId] = useState("");
  const [teamPlayer1, setTeamPlayer1] = useState("");
  const [teamPlayer2, setTeamPlayer2] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupCategoryId, setGroupCategoryId] = useState("");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignPlayerId, setAssignPlayerId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [message, setMessage] = useState("");
  const [groups, setGroups] = useState<{ id: string; name: string; category_id: string }[]>([]);

  useEffect(() => {
    api.getGroups().then(setGroups).catch(() => setGroups([]));
  }, [categories]);

  const doublesCategories = categories.filter((c) => c.format === "DOUBLES");
  const activePlayers = players.filter((p) => p.is_active);

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setMessage("");
    try {
      await action();
      setMessage(success);
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
          <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-lg glass" />
          <input value={playerEmployeeId} onChange={(e) => setPlayerEmployeeId(e.target.value)} placeholder="Employee ID" className="w-full px-3 py-2 rounded-lg glass" />
          <select value={playerGender} onChange={(e) => setPlayerGender(e.target.value as Gender)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          <button
            onClick={() =>
              runAction(
                () => api.createPlayer({ name: playerName, employee_id: playerEmployeeId || undefined, gender: playerGender }),
                "Player created"
              )
            }
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm"
          >
            Add Player
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Create Team</h4>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" className="w-full px-3 py-2 rounded-lg glass" />
          <select value={teamCategoryId} onChange={(e) => setTeamCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Select doubles category</option>
            {doublesCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={teamPlayer1} onChange={(e) => setTeamPlayer1(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Player 1</option>
            {activePlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={teamPlayer2} onChange={(e) => setTeamPlayer2(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Player 2</option>
            {activePlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() =>
              runAction(
                () => api.createTeam({ team_name: teamName, player1_id: teamPlayer1, player2_id: teamPlayer2, category_id: teamCategoryId }),
                "Team created"
              )
            }
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm"
          >
            Create Team
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Create Group</h4>
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="w-full px-3 py-2 rounded-lg glass" />
          <select value={groupCategoryId} onChange={(e) => setGroupCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => runAction(() => api.createGroup({ name: groupName, category_id: groupCategoryId }), "Group created")}
            className="px-4 py-2 rounded-lg bg-accent-teal text-white text-sm"
          >
            Create Group
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Assign to Group</h4>
          <select value={assignGroupId} onChange={(e) => setAssignGroupId(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Select group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select value={assignPlayerId} onChange={(e) => setAssignPlayerId(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Assign player (singles)</option>
            {activePlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => runAction(() => api.assignPlayer(assignGroupId, assignPlayerId), "Player assigned")}
            className="px-4 py-2 rounded-lg bg-board-dark text-white text-sm mr-2"
          >
            Assign Player
          </button>
          <select value={assignTeamId} onChange={(e) => setAssignTeamId(e.target.value)} className="w-full px-3 py-2 rounded-lg glass">
            <option value="">Assign team (doubles)</option>
            {teams.filter((t) => t.is_active).map((t) => (
              <option key={t.id} value={t.id}>{t.team_name}</option>
            ))}
          </select>
          <button
            onClick={() => runAction(() => api.assignTeam(assignGroupId, assignTeamId), "Team assigned")}
            className="px-4 py-2 rounded-lg bg-board-dark text-white text-sm"
          >
            Assign Team
          </button>
        </div>
      </div>
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
    update: { status?: MatchStatus; winnerParticipantId?: string; winnerScore?: number }
  ) => Promise<void>;
}) {
  const categoryData = data.find((d) => d.category === activeCategory);
  const statusColors: Record<MatchStatus, string> = {
    Live: "bg-red-500 text-white animate-pulse",
    Scheduled: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    Completed: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  };

  const liveMatch = useMemo(() => {
    if (!categoryData) return null;
    for (const g of categoryData.groups) {
      const m = g.matches.find((x) => x.status === "Live");
      if (m) return { match: m, group: g.name };
    }
    return null;
  }, [categoryData]);

  const filteredGroups = useMemo(() => {
    if (!categoryData) return [];
    const q = search.toLowerCase().trim();
    if (!q) return categoryData.groups;
    return categoryData.groups
      .map((g) => {
        const nameMatch = g.name.toLowerCase().includes(q);
        const playerMatch = g.standings.some((s) => s.name.toLowerCase().includes(q));
        if (nameMatch || playerMatch) return g;
        const matchHit = g.matches.some(
          (m) => m.playerA.toLowerCase().includes(q) || m.playerB.toLowerCase().includes(q)
        );
        return matchHit ? g : null;
      })
      .filter(Boolean) as TournamentGroup[];
  }, [categoryData, search]);

  const totalMatches = categoryData?.groups.reduce((n, g) => n + g.matches.length, 0) ?? 0;

  const saveMatch = async (
    match: GroupMatch,
    update: { status?: MatchStatus; winnerParticipantId?: string; winnerScore?: number }
  ) => {
    await onMatchUpdate(match.id, update);
  };

  return (
    <section id="standings" className="py-20 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Tournament Standings"
          subtitle="Category → Groups → Points & round-robin schedule (every player plays everyone in their group)"
          icon={Trophy}
        />

        <CategoryTabs categories={categories} active={activeCategory} onChange={setActiveCategory} />

        <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-slate-500">
          <span className="glass px-3 py-1.5 rounded-lg">
            {categoryData?.groups.length ?? 0} groups in {activeCategory}
          </span>
          <span className="glass px-3 py-1.5 rounded-lg">{totalMatches} round-robin matches</span>
          <span className="glass px-3 py-1.5 rounded-lg">Points tracked separately per group</span>
        </div>

        {liveMatch && (
          <motion.div
            id="live-match"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 rounded-2xl border-2 border-red-500/50 bg-red-500/10 dark:bg-red-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-4 py-1 bg-red-500 text-white text-xs font-bold rounded-bl-xl flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE — {activeCategory}
            </div>
            <h3 className="font-display text-lg font-bold mb-1">
              {liveMatch.group} · Table {liveMatch.match.table}
            </h3>
            <p className="text-2xl font-bold">
              {liveMatch.match.playerA} <span className="text-red-500 mx-2">vs</span> {liveMatch.match.playerB}
            </p>
            <p className="text-sm text-slate-500 mt-2">{liveMatch.match.time}</p>
          </motion.div>
        )}

        <div className="space-y-10">
          {filteredGroups.map((group) => {
            const sorted = sortStandings(group.standings);
            const completed = group.matches.filter((m) => m.status === "Completed").length;

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <GlassCard hover={false} className="overflow-hidden p-0">
                  <div className={`px-6 py-4 bg-gradient-to-r ${getCategoryMeta(activeCategory).color} border-b border-white/20`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent-teal">{activeCategory}</p>
                        <h3 className="font-display text-2xl font-bold">{group.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="glass px-3 py-1 rounded-full">{group.standings.length} players</span>
                        <span className="glass px-3 py-1 rounded-full">
                          {completed}/{group.matches.length} matches done
                        </span>
                        <span className="glass px-3 py-1 rounded-full">Round-robin</span>
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
                          <li key={s.id} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
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
                        Group points (not combined)
                      </h4>
                      <div className="overflow-x-auto rounded-xl glass">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="px-3 py-3 font-semibold">#</th>
                              <th className="px-3 py-3 font-semibold">Player</th>
                              <th className="px-3 py-3 text-center font-semibold">MP</th>
                              <th className="px-3 py-3 text-center font-semibold">W</th>
                              <th className="px-3 py-3 text-center font-semibold">L</th>
                              <th className="px-3 py-3 text-center font-semibold">Pts</th>
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
                                <td className="px-3 py-3 font-medium">{entry.name}</td>
                                {(["matchesPlayed", "wins", "losses", "points"] as const).map((field) => (
                                  <td key={field} className="px-3 py-3 text-center">
                                    <span className={field === "points" ? "font-bold text-accent-teal" : ""}>
                                      {entry[field]}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Round-robin schedule */}
                    <div>
                      <h4 className="font-display font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-accent-teal" />
                        Group schedule (everyone vs everyone)
                      </h4>
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {group.matches.map((match, mi) => (
                          <div
                            key={match.id}
                            className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl glass text-sm ${
                              match.status === "Live" ? "ring-2 ring-red-500/40" : ""
                            }`}
                          >
                            <span className="text-xs font-mono text-slate-400 w-16">#{mi + 1}</span>
                            <div className="flex items-center gap-2 min-w-[72px]">
                              <Clock className="w-4 h-4 text-accent-teal shrink-0" />
                              <span className="font-medium">{match.time}</span>
                            </div>
                            <div className="flex-1 font-medium">
                              {match.playerA} <span className="text-accent-teal">vs</span> {match.playerB}
                              {match.status === "Completed" && match.winnerScore != null && (
                                <span className="block text-xs text-slate-500 mt-1">
                                  Winner score: {match.winnerScore}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              <span className="text-slate-500 text-xs">T{match.table}</span>
                              {adminMode ? (
                                <div className="flex flex-col gap-2">
                                  <select
                                    value={match.status}
                                    onChange={(e) => {
                                      const status = e.target.value as MatchStatus;
                                      if (status === "Completed") return;
                                      void saveMatch(match, { status });
                                    }}
                                    className="px-2 py-0.5 rounded border text-xs"
                                  >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Live">Live</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                  {match.status === "Completed" && (
                                    <>
                                      <select
                                        defaultValue={match.winnerParticipantId || match.participant1Id}
                                        onChange={(e) => {
                                          const winnerParticipantId = e.target.value;
                                          const winnerScore = match.winnerScore ?? 25;
                                          void saveMatch(match, { status: "Completed", winnerParticipantId, winnerScore });
                                        }}
                                        className="px-2 py-0.5 rounded border text-xs"
                                      >
                                        <option value={match.participant1Id}>{match.playerA}</option>
                                        <option value={match.participant2Id}>{match.playerB}</option>
                                      </select>
                                      <input
                                        type="number"
                                        defaultValue={match.winnerScore ?? 25}
                                        onBlur={(e) => {
                                          const winnerScore = Number(e.target.value);
                                          const winnerParticipantId =
                                            match.winnerParticipantId || match.participant1Id;
                                          void saveMatch(match, {
                                            status: "Completed",
                                            winnerParticipantId,
                                            winnerScore,
                                          });
                                        }}
                                        className="w-16 px-2 py-0.5 rounded border text-xs"
                                        placeholder="Score"
                                      />
                                    </>
                                  )}
                                  {match.status !== "Completed" && (
                                    <button
                                      onClick={() => {
                                        const winnerParticipantId = match.participant1Id;
                                        void saveMatch(match, {
                                          status: "Completed",
                                          winnerParticipantId,
                                          winnerScore: 25,
                                        });
                                      }}
                                      className="text-xs text-accent-teal hover:underline text-left"
                                    >
                                      Mark completed
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[match.status]}`}>
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
          <p className="text-center text-slate-500 py-12">No groups or players match your search in this category.</p>
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
    { icon: Users, label: "Format", value: "Round-robin groups per category — points tracked per group" },
    { icon: Gamepad2, label: "Spirit", value: "Friendly office tournament with local rules" },
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
                <p className="font-display font-bold text-lg text-slate-900 dark:text-white">{value}</p>
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
        <SectionHeader title="Tournament Gallery" subtitle="Photos will be added after the tournament" icon={Camera} />
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
          <div className="text-center md:text-left">
            <p className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Designed for Thoughtworks Hyderabad Office
            </p>
            <p className="text-sm text-slate-500 mt-1">Carrom Tournament 2026 · Internal Event</p>
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
          <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2">
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
    return localStorage.getItem("theme") === "dark" || window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [adminMode, setAdminMode] = useState(() => isAdmin());
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("Singles (Men)");
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
            : data.tournament[0].category
        );
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load tournament data");
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

  const categoryLabels = useMemo(() => tournament.map((c) => c.category), [tournament]);
  const matchCount = useMemo(
    () => tournament.reduce((n, c) => n + c.groups.reduce((g, grp) => g + grp.matches.length, 0), 0),
    [tournament]
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
    update: { status?: MatchStatus; winnerParticipantId?: string; winnerScore?: number }
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
      <StatsBar categoryCount={categoryLabels.length} playerCount={players.length} matchCount={matchCount} />
      <Categories categories={categoryLabels} onSelectCategory={goToStandings} />
      <RulesSection onOpenModal={() => setRulesModalOpen(true)} />
      <Scoring />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlobalSearch value={globalSearch} onChange={setGlobalSearch} />
        {loading && <p className="text-center text-slate-500 mb-8">Loading tournament data...</p>}
        {loadError && (
          <p className="text-center text-red-500 mb-8">
            {loadError} — ensure the backend is running at {import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}
          </p>
        )}
        {adminMode && (
          <AdminPanel
            categories={apiCategories}
            players={players}
            teams={teams}
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

      <RulesModal open={rulesModalOpen} onClose={() => setRulesModalOpen(false)} />
      <AdminLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setAdminMode(true)}
      />
    </div>
  );
}
