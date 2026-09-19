import { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Mic,
  IndianRupee,
  Zap,
  Bell,
  TrendingUp,
  ShoppingBag,
  ChevronDown,
  Smartphone,
  WifiOff,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Language = "en" | "hi";
type PaymentApp = "PhonePe" | "Google Pay" | "Paytm" | "BHIM" | "Amazon Pay";

interface Payment {
  id: string;
  amount: number;
  payerName: string;
  app: PaymentApp;
  timestamp: number;
}

// ─── Data: Indian payer names for simulation ─────────────────────────────────
const PAYER_NAMES = [
  "Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Reddy", "Vikram Singh",
  "Anjali Gupta", "Rohan Verma", "Deepika Nair", "Arjun Mehta", "Pooja Iyer",
  "Karan Malhotra", "Nisha Agarwal", "Sanjay Rao", "Meera Joshi", "Aditya Chopra",
  "Kavya Desai", "Manish Tiwari", "Ritu Saxena", "Harsh Patel", "Divya Menon",
  "Rajesh Khanna", "Sonia Kapoor", "Naveen Pillai", "Tanvi Bhat", "Yash Goyal",
];

const PAYMENT_APPS: PaymentApp[] = ["PhonePe", "Google Pay", "Paytm", "BHIM", "Amazon Pay"];

// ─── App badge colors ────────────────────────────────────────────────────────
const APP_BADGE_STYLES: Record<PaymentApp, string> = {
  "PhonePe":    "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Google Pay": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Paytm":      "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "BHIM":       "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Amazon Pay": "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

// ─── Backend API ────────────────────────────────────────────────────────────
const API_BASE = "https://xvrt6j73l8.execute-api.ap-south-2.amazonaws.com";

// Raw shape returned by GET {API_BASE}/payments
interface ApiPayment {
  paymentId: string;
  amount: number;
  payer: string;
  app: PaymentApp;
  createdAt: number;
}

// ─── API functions ───────────────────────────────────────────────────────────
// Fetch the full payment list from the backend. Returns mapped Payment[].
// Throws on network error or non-2xx response so the caller can show "Offline".
async function fetchPayments(): Promise<Payment[]> {
  const res = await fetch(`${API_BASE}/payments`);
  if (!res.ok) throw new Error(`GET /payments failed: ${res.status}`);
  const data: ApiPayment[] = await res.json();
  return data.map((d) => ({
    id: d.paymentId,
    amount: d.amount,
    payerName: d.payer,
    app: d.app,
    timestamp: d.createdAt,
  }));
}

// POST a new payment to the backend. The polling loop will pick it up.
async function createPayment(amount: number, payer: string, app: PaymentApp): Promise<void> {
  const res = await fetch(`${API_BASE}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, payer, app }),
  });
  if (!res.ok) throw new Error(`POST /payment failed: ${res.status}`);
}

// ─── Number → words (Indian English + Hindi) ─────────────────────────────────
const ONES_EN = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS_EN = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigitsEn(n: number): string {
  if (n < 20) return ONES_EN[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS_EN[t]} ${ONES_EN[o]}` : TENS_EN[t];
}

function amountToWordsEn(num: number): string {
  if (num === 0) return "zero";
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = "";
  if (rupees > 0) {
    if (rupees >= 10000000) words += `${twoDigitsEn(Math.floor(rupees / 10000000))} crore `;
    const r1 = rupees % 10000000;
    if (r1 >= 100000) words += `${twoDigitsEn(Math.floor(r1 / 100000))} lakh `;
    const r2 = r1 % 100000;
    if (r2 >= 1000) words += `${twoDigitsEn(Math.floor(r2 / 1000))} thousand `;
    const r3 = r2 % 1000;
    if (r3 >= 100) words += `${ONES_EN[Math.floor(r3 / 100)]} hundred `;
    const r4 = r3 % 100;
    if (r4 > 0) words += twoDigitsEn(r4);
    words = words.trim();
  }
  if (paise > 0) words += ` ${twoDigitsEn(paise)} paise`;
  return words.trim();
}

const ONES_HI = ["", "ek", "do", "teen", "char", "panch", "chh", "saat", "aath", "nao", "das",
  "gyarah", "barah", "terah", "chaudah", "pandrah", "solah", "satrah", "atharah", "unnis"];
const TENS_HI = ["", "", "bees", "tees", "chalis", "pachas", "saath", "sattar", "assi", "nabbe"];

function twoDigitsHi(n: number): string {
  if (n < 20) return ONES_HI[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (o === 0) return TENS_HI[t];
  return `${TENS_HI[t]} ${ONES_HI[o]}`;
}

function amountToWordsHi(num: number): string {
  const rupees = Math.floor(num);
  let words = "";
  if (rupees >= 100000) words += `${twoDigitsHi(Math.floor(rupees / 100000))} lakh `;
  const r2 = rupees % 100000;
  if (r2 >= 1000) words += `${twoDigitsHi(Math.floor(r2 / 1000))} hazar `;
  const r3 = r2 % 1000;
  if (r3 >= 100) {
    const h = Math.floor(r3 / 100);
    const hWords = ["", "ek sau", "do sau", "teen sau", "char sau", "panch sau"];
    words += (h <= 5 ? hWords[h] : `${ONES_HI[h]} sau`) + " ";
  }
  const r4 = r3 % 100;
  if (r4 > 0) words += twoDigitsHi(r4);
  return words.trim() || "shunya";
}

function buildAnnouncement(p: Payment, lang: Language): string {
  if (lang === "hi") {
    return `${p.payerName} ne ${p.app} se ${amountToWordsHi(p.amount)} rupaye bheje.`;
  }
  return `${p.payerName} paid ${amountToWordsEn(p.amount)} rupees via ${p.app}.`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-IN");
}

function randomPaymentInput(): { amount: number; payer: string; app: PaymentApp } {
  const amount = Math.floor(Math.random() * 1991) + 10; // ₹10–₹2000
  const payer = PAYER_NAMES[Math.floor(Math.random() * PAYER_NAMES.length)];
  const app = PAYMENT_APPS[Math.floor(Math.random() * PAYMENT_APPS.length)];
  return { amount, payer, app };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function App() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<Payment | null>(null);
  const [flashTotal, setFlashTotal] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const speechSupported = useRef<boolean>(
    typeof window !== "undefined" && "speechSynthesis" in window
  );

  // Track which payment IDs we've already seen (to detect genuinely new ones)
  const knownIds = useRef<Set<string>>(new Set());
  // Track whether the first load has completed (so we don't announce pre-existing payments)
  const firstLoadDone = useRef(false);
  // Latest muted/language values for the polling closure
  const mutedRef = useRef(muted);
  const langRef = useRef(language);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { langRef.current = language; }, [language]);

  // Speak announcement
  const announce = useCallback((p: Payment, lang: Language) => {
    if (!speechSupported.current) return;
    const text = buildAnnouncement(p, lang);
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  }, []);

  // Show visual toast + flash for a new payment
  const showPaymentVisuals = useCallback((p: Payment) => {
    setToast(p);
    setFlashTotal(true);
    window.setTimeout(() => setFlashTotal(false), 700);
    window.setTimeout(() => setToast((cur) => (cur?.id === p.id ? null : cur)), 5000);
  }, []);

  // Poll fetchPayments() every 3 seconds; announce only genuinely new payments
  useEffect(() => {
    const poll = async () => {
      try {
        const fetched = await fetchPayments();
        setOffline(false);
        // Sort newest-first for display
        const sorted = [...fetched].sort((a, b) => b.timestamp - a.timestamp);

        // Find new IDs we haven't seen before
        const newPayments = sorted.filter((p) => !knownIds.current.has(p.id));

        // Mark all fetched IDs as known
        for (const p of sorted) knownIds.current.add(p.id);

        if (newPayments.length > 0) {
          setPayments(sorted.slice(0, 50));

          // Only announce if this isn't the first load (i.e. payments that arrived
          // while the app was already running)
          if (firstLoadDone.current) {
            const latest = newPayments[0];
            showPaymentVisuals(latest);
            if (!mutedRef.current) announce(latest, langRef.current);
          }
        } else if (!firstLoadDone.current) {
          // First load with data — populate UI but don't announce
          setPayments(sorted.slice(0, 50));
        }

        firstLoadDone.current = true;
      } catch {
        setOffline(true);
        firstLoadDone.current = true;
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [announce, showPaymentVisuals]);

  // Simulate: POST a random payment to the backend. The polling loop will
  // pick it up and announce it automatically.
  const simulatePayment = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { amount, payer, app } = randomPaymentInput();
      await createPayment(amount, payer, app);
    } catch {
      setOffline(true);
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  // Only count payments whose createdAt is today (local date)
  const todayPayments = payments.filter((p) => {
    const d = new Date(p.timestamp);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const todayCount = todayPayments.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen flex flex-col bg-slate-950 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute top-32 -left-20 w-52 h-52 rounded-full bg-teal-500/10 blur-3xl" />

        {/* ─── Header ─── */}
        <header className="relative px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Mic className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">PingPay</h1>
                <p className="text-[11px] text-slate-400 leading-tight">Payment Soundbox</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {offline && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-medium">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
              <button
                onClick={() => setMuted((m) => !m)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                  muted
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Shop name */}
          <div className="mt-3 flex items-center gap-2 text-slate-300">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Sharma General Store</span>
          </div>
        </header>

        {/* ─── Today's Total Card ─── */}
        <section className="px-5">
          <div
            className={`relative rounded-2xl p-5 transition-all duration-500 ${
              flashTotal
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 scale-[1.02] shadow-2xl shadow-emerald-500/40"
                : "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Today's Collection
                </span>
              </div>
              {offline && (
                <span className="text-[10px] text-red-400/70">showing last cached</span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <IndianRupee
                className="w-8 h-8 text-emerald-400 -ml-1"
                strokeWidth={2.5}
              />
              <span className="text-5xl font-bold tracking-tight tabular-nums text-white">
                {formatCurrency(todayTotal)}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {todayCount} payment{todayCount !== 1 ? "s" : ""} received today
            </p>
          </div>
        </section>

        {/* ─── Language Toggle ─── */}
        <section className="px-5 mt-4">
          <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/40">
            <button
              onClick={() => setLanguage("en")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                language === "en"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "text-slate-400"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                language === "hi"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "text-slate-400"
              }`}
            >
              हिंदी
            </button>
          </div>
        </section>

        {/* ─── Payment Feed ─── */}
        <section className="px-5 mt-5 flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-300">Recent Payments</h2>
            </div>
            {payments.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-slate-500">Live</span>
              </span>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm font-medium">No payments yet</p>
              <p className="text-slate-600 text-xs mt-1">
                Use "Simulate customer payment" below to see it in action
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {payments.map((p, idx) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl p-3.5 border transition-all ${
                    idx === 0 && toast?.id === p.id
                      ? "bg-emerald-500/15 border-emerald-500/40 animate-[cardPop_0.4s_ease-out]"
                      : idx === 0
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-slate-800/40 border-slate-700/30"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                      idx === 0
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    <IndianRupee className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.payerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{formatTime(p.timestamp)}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${APP_BADGE_STYLES[p.app]}`}
                      >
                        <Smartphone className="w-2.5 h-2.5" />
                        {p.app}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-emerald-400 tabular-nums">
                      +₹{formatCurrency(p.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ─── Demo Controls (collapsible) ─── */}
        <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/40 overflow-hidden">
            <button
              onClick={() => setDemoOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-slate-300"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Demo Controls
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${demoOpen ? "rotate-180" : ""}`}
              />
            </button>
            {demoOpen && (
              <div className="px-4 pb-4">
                <button
                  onClick={simulatePayment}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100"
                >
                  <Zap className="w-5 h-5" fill="white" />
                  {submitting ? "Sending..." : "Simulate customer payment"}
                </button>
                <p className="text-center text-[11px] text-slate-500 mt-2">
                  Adds a random payment — it'll be announced automatically
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Incoming Payment Toast ─── */}
        {toast && (
          <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 mx-auto max-w-md">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 shadow-2xl shadow-emerald-500/40 animate-[slideDown_0.4s_ease-out]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <IndianRupee className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-xs font-medium">Payment Received</p>
                  <p className="text-white text-2xl font-bold tabular-nums">
                    ₹{formatCurrency(toast.amount)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-white/80 text-xs">from {toast.payerName}</p>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white">
                      <Smartphone className="w-2.5 h-2.5" />
                      {toast.app}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-120%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes cardPop {
          0%   { transform: scale(0.96); opacity: 0; }
          50%  { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
