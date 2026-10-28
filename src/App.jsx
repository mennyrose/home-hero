import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithPopup, signInWithCustomToken, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  Shield, Zap, Settings, Lock, LogOut, User, BedDouble, 
  BookOpen, Backpack, Guitar, Brush, Star, Check, CheckCircle,
  Clock, Loader2, AlertTriangle, RefreshCcw, RotateCcw, Minus, Plus, Trash2,
  Sun, Moon, Cloud, ShoppingBag, List, Menu, Utensils,
  Wifi, WifiOff, Gamepad2, Sparkles, Shirt, Bath, Dog, Footprints, ThumbsUp,
  Disc, // For dishwasher plate representation
  Home, ListChecks, Coins, SlidersHorizontal, Hourglass, Pencil, FlaskConical
} from 'lucide-react';

// ==========================================
// 1. הגדרות וסגנונות קומיקס
// ==========================================

const COMIC_BORDER = "border-4 border-black";
const COMIC_SHADOW = "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
const COMIC_SHADOW_SM = "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
const COMIC_BTN = `transition-all active:translate-y-1 active:shadow-none ${COMIC_BORDER} ${COMIC_SHADOW}`;

const BG_STYLE = {
  backgroundImage: `
    radial-gradient(circle, #3b82f6 2px, transparent 2.5px),
    linear-gradient(to bottom, #60a5fa, #2563eb)
  `,
  backgroundSize: '20px 20px, 100% 100%',
  backgroundPosition: '0 0, 0 0'
};

const AVATARS = {
  1: "./itamar.png",
  2: "./roni.png",
  3: "./noam.png"
};

// --- Custom Icons ---

// מברשת, משחה ושיניים
const ToothbrushIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Tooth */}
    <path d="M4.5 9c0-1.5 1-2.5 2.5-2.5S9 7 9 8.5c0 1.5-1 2.5-1 4s.5 2.5 1.5 3 2 1 2 3v2a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-2c0-2 1-2.5 2-3s-1.5-1.5-1.5-3z" />
    {/* Brush Handle */}
    <path d="M12 18l7 3" />
    <path d="M11 14l8 4" />
    {/* Brush Head & Paste */}
    <rect x="10" y="13" width="6" height="4" rx="1" transform="rotate(-25 13 15)" />
    <path d="M10 12c.5-1 1.5-1.5 2.5-1s2 2 3 2" strokeDasharray="2 2" /> 
  </svg>
);

// קוביות / לגו
const ToyIcon = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Bottom Block */}
    <rect x="4" y="14" width="10" height="8" rx="1" />
    <line x1="9" y1="14" x2="9" y2="22" />
    {/* Top Block */}
    <rect x="10" y="6" width="10" height="8" rx="1" />
    <line x1="15" y1="6" x2="15" y2="14" />
    {/* Studs */}
    <path d="M11 6V4h2v2" />
    <path d="M17 6V4h2v2" />
  </svg>
);

const DishwasherIcon = ({ size = 24 }) => (
    <div className="relative" style={{ width: size, height: size }}>
        <Disc size={size} />
        <Sparkles size={size / 2} className="absolute -top-1 -right-1 text-blue-400 fill-current" />
    </div>
);

const DinnerTimeIcon = ({ size = 24 }) => (
    <div className="flex items-center gap-0">
        <Utensils size={size} />
        <Clock size={size * 0.7} className="text-red-500 -ml-2 mb-2" />
    </div>
);

const ICON_MAP = {
  bed: { icon: BedDouble, label: 'מיטה' },
  brush: { icon: ToothbrushIcon, label: 'צחצוח' },
  book: { icon: BookOpen, label: 'לימודים' },
  backpack: { icon: Backpack, label: 'תיק' },
  guitar: { icon: Guitar, label: 'נגינה' },
  food: { icon: Utensils, label: 'אוכל' },
  dishwasher: { icon: DishwasherIcon, label: 'מדיח' },
  dinner: { icon: DinnerTimeIcon, label: 'ארוחה בזמן' },
  toy: { icon: ToyIcon, label: 'צעצועים' }, 
  clean: { icon: Sparkles, label: 'ניקיון' },
  clothes: { icon: Shirt, label: 'בגדים' },
  bath: { icon: Bath, label: 'מקלחת' },
  dog: { icon: Dog, label: 'חיה' },
  shoes: { icon: Footprints, label: 'נעליים' },
  star: { icon: Star, label: 'כללי' }
};

// ==========================================
// 2. הגדרות מערכת
// ==========================================
const ADMIN_EMAILS = ["mennyr@gmail.com", "reulita10@gmail.com"];

const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCpN2ExfgyJhWGhAZieXdo0G9-i3qVXPiw",
  authDomain: "homehero-f43e7.firebaseapp.com",
  projectId: "homehero-f43e7",
  storageBucket: "homehero-f43e7.firebasestorage.app",
  messagingSenderId: "542278887454",
  appId: "1:542278887454:web:60d2bdeb8e82e8d2c8260f",
  measurementId: "G-Q10D5WT1YD"
};

let firebaseConfig = null;
let app, auth, db;
let appId = 'family-game-v1'; 

try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
    if (typeof __app_id !== 'undefined') appId = __app_id;
  } 
  else if (MANUAL_FIREBASE_CONFIG.apiKey !== "PASTE_API_KEY_HERE") {
    firebaseConfig = MANUAL_FIREBASE_CONFIG;
  }

  if (firebaseConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase config missing.");
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

const MAIN_DOC_REF = db ? doc(db, 'artifacts', appId, 'public', 'data', 'family', 'main') : null;

const getIconComponent = (iconKey, title) => {
  if (iconKey && ICON_MAP[iconKey]) {
      const Icon = ICON_MAP[iconKey].icon;
      return <Icon size={32} />;
  }
  if (title.includes("מיטה")) return <BedDouble size={32} />;
  if (title.includes("שיניים")) return <ToothbrushIcon size={32} />;
  return <Star size={32} />;
};


const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_HEBREW = { sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת' };
const TIME_HEBREW = { morning: 'בוקר', noon: 'צהריים', evening: 'ערב' };

// ==========================================
// זמן (שעון ישראל) + סימולטור
// ==========================================

const OVERRIDE_TTL_MS = 30 * 60 * 1000; // מצב בדיקה פג אחרי חצי שעה

const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const toDateKey = (date) => date.toISOString().slice(0, 10);
const pad2 = (n) => String(n).padStart(2, '0');

const getPhase = (hour) => {
  if (hour >= 17 || hour < 6) return 'evening';
  if (hour >= 12) return 'noon';
  return 'morning';
};

// מצב בדיקה פעיל רק כשהוגדר לאחרונה (כדי שלא יישכח "תקוע")
const getActiveOverride = (override) =>
  override && Date.now() - (override.setAt || 0) < OVERRIDE_TTL_MS ? override : null;

// date הוא תאריך UTC "טהור" של היום בישראל (שימושי לחישובי ימים/שבועות)
const getJerusalemNow = (override) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', hourCycle: 'h23', weekday: 'long',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date());
  const get = (type) => parts.find(p => p.type === type).value;

  let day = get('weekday').toLowerCase();
  let hour = parseInt(get('hour'), 10) % 24;
  let minute = parseInt(get('minute'), 10);
  let date = new Date(Date.UTC(parseInt(get('year'), 10), parseInt(get('month'), 10) - 1, parseInt(get('day'), 10)));

  const active = getActiveOverride(override);
  if (active) {
    date = addDays(date, DAY_KEYS.indexOf(active.day) - DAY_KEYS.indexOf(day));
    day = active.day; hour = active.hour; minute = active.minute;
  }
  return { day, hour, minute, minutes: hour * 60 + minute, date, dateKey: toDateKey(date), phase: getPhase(hour), simulated: !!active };
};

// "יום" לצורך איפוס משימות ושינה מסתיים ב-04:00 ולא בחצות
const DAY_ROLLOVER_MIN = 4 * 60;
const getLogicalDate = (now) => (now.minutes < DAY_ROLLOVER_MIN ? addDays(now.date, -1) : now.date);

const useNow = (override) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(i);
  }, []);
  return getJerusalemNow(override);
};

// ==========================================
// שעת שינה של איתמר + "בנק דקות" שבועי
// ==========================================

const BED_KID_ID = 1;
const BED_BASE_MIN = 21 * 60;            // שעת השינה המוסכמת: 21:00
const BED_CREDIT_MIN = 30;               // בונוס יומי לבנק
const BED_BUTTON_FROM = 20 * 60 + 45;    // הכפתור מופיע מ-20:45
const BED_SKIP_EVENING = 'friday';       // ערב שבת - בלי טאבלט

const getEveningInfo = (now) => {
  const afterMidnight = now.minutes < DAY_ROLLOVER_MIN;
  const date = getLogicalDate(now);
  return {
    date, dateKey: toDateKey(date), day: DAY_KEYS[date.getUTCDay()],
    nowMinutes: now.minutes + (afterMidnight ? 1440 : 0),
    inWindow: DAY_KEYS[date.getUTCDay()] !== BED_SKIP_EVENING && (afterMidnight || now.minutes >= BED_BUTTON_FROM)
  };
};

// סדר הלילות בשבוע (ראשון עד שבת, בלי ליל שישי)
const getWeekNights = (eveningDate) => {
  const sunday = addDays(eveningDate, -eveningDate.getUTCDay());
  return DAY_KEYS
    .map((day, i) => ({ day, dateKey: toDateKey(addDays(sunday, i)) }))
    .filter(n => n.day !== BED_SKIP_EVENING);
};

const sleepAtToMinutes = (sleepAt) => {
  const [h, m] = sleepAt.split(':').map(Number);
  return h * 60 + m + (h < 4 ? 1440 : 0);
};
const spentFromSleepAt = (sleepAt) => Math.max(0, sleepAtToMinutes(sleepAt) - BED_BASE_MIN);

// liveMinutes: הדקות הנוכחיות (אחרי 21:00 נספרות כצריכה גם לפני שלחצו על הכפתור)
const getBedtimeBank = (data, eveningDate, live) => {
  const days = data.bedtime?.days || {};
  const nights = getWeekNights(eveningDate).map(n => {
    const rec = days[n.dateKey] || {};
    let spent = 0;
    let isLive = false;
    if (!rec.off) {
      if (rec.sleepAt) spent = spentFromSleepAt(rec.sleepAt);
      else if (live && live.dateKey === n.dateKey) { spent = Math.max(0, live.minutes - BED_BASE_MIN); isLive = true; }
    }
    return { ...n, off: !!rec.off, sleepAt: rec.sleepAt || null, spent, isLive };
  });
  const budget = nights.filter(n => !n.off).length * BED_CREDIT_MIN;
  const spent = nights.reduce((a, n) => a + n.spent, 0);
  return { nights, budget, spent, remaining: budget - spent };
};

const formatDuration = (mins) => {
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return h > 0 ? `${h} שע' ${pad2(m)} דק'` : `${m} דק'`;
};

const realTime = getJerusalemNow();

const INITIAL_DATA = { 
  familyGoal: 350, bossHP: 500, maxBossHP: 500, currentDay: realTime.day, currentTimePhase: realTime.phase,
  lastResetDate: toDateKey(getLogicalDate(realTime)), timeOverride: null, bedtime: { days: {} },
  kids: [
    { id: 1, name: "איתמר", ageGroup: "big", color: "bg-cyan-400", lightColor: "bg-cyan-100", points: 120, lifetimePoints: 1500, familyPoints: 120, inventory: { shields: 2 }, activeEffects: { doublePointsUntil: 0 }, tasks: [] },
    { id: 2, name: "רוני", ageGroup: "big", color: "bg-purple-400", lightColor: "bg-purple-100", points: 90, lifetimePoints: 800, familyPoints: 90, inventory: { shields: 0 }, activeEffects: { doublePointsUntil: 0 }, tasks: [] },
    { id: 3, name: "נועם", ageGroup: "toddler", color: "bg-orange-400", lightColor: "bg-orange-100", points: 40, lifetimePoints: 200, familyPoints: 40, inventory: { shields: 0 }, activeEffects: { doublePointsUntil: 0 }, tasks: [] }
  ]
};

// ==========================================
// לוגיקה משותפת (רצה בתוך טרנזקציה על המסמך העדכני)
// ==========================================

const isDoubleActive = (kid) => (kid.activeEffects?.doublePointsUntil || 0) > Date.now();

const applyApproval = (d, kid, t) => {
  const points = (Number(t.value) || 0) * ((t.doubled ?? isDoubleActive(kid)) ? 2 : 1);
  const impact = t.impact || 'boss';

  kid.points += points;
  kid.lifetimePoints += points;
  if (impact === 'boss') {
    d.bossHP = Math.max(0, d.bossHP - points);
    kid.familyPoints = (kid.familyPoints || 0) + points;
  } else if (impact === 'pizza') {
    kid.familyPoints = (kid.familyPoints || 0) + points;
  }

  if (t.isOneTime) kid.tasks = kid.tasks.filter(x => x.id !== t.id);
  else { t.status = 'done'; delete t.doubled; }
};

// משימות שחוזרות (לא חד-פעמיות) נפתחות מחדש בכל יום חדש
const reopenDoneTasks = (d) => {
  d.kids.forEach(kid => kid.tasks.forEach(t => { if (t.status === 'done') t.status = 'open'; }));
};

// ==========================================
// 3. קומפוננטות UI
// ==========================================

const MainTitle = () => (
  <div className="relative z-20 transform -rotate-2 mb-2">
    <div className={`absolute inset-0 bg-yellow-400 transform skew-x-12 scale-110 ${COMIC_BORDER} ${COMIC_SHADOW}`}></div>
    <h1 className="relative text-2xl md:text-5xl font-black text-black px-4 md:px-6 py-2 uppercase tracking-tighter text-center whitespace-nowrap" style={{ textShadow: "2px 2px 0 #fff" }}>
      גיבורי הבית
    </h1>
  </div>
);

const BossBar = ({ current, max, label, color }) => {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1 px-1">
        <span className="font-black text-white text-xs md:text-sm bg-black px-2 skew-x-[-10deg] border border-white">{label}</span>
        <span className="font-bold text-white text-shadow-black text-xs">{current} / {max}</span>
      </div>
      <div className={`h-4 md:h-6 w-full bg-slate-800 ${COMIC_BORDER} relative overflow-hidden rounded-sm`}>
        <div className={`h-full ${color} transition-all duration-500 relative`} style={{ width: `${percent}%` }}>
          <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: "linear-gradient(45deg,rgba(0,0,0,.1) 25%,transparent 25%,transparent 50%,rgba(0,0,0,.1) 50%,rgba(0,0,0,.1) 75%,transparent 75%,transparent)", backgroundSize: "10px 10px" }}></div>
        </div>
      </div>
    </div>
  );
};

const NameBubble = ({ name, points }) => (
  <div className={`bg-yellow-400 p-2 rounded-xl ${COMIC_BORDER} ${COMIC_SHADOW_SM} w-full relative text-center mb-2 transform hover:scale-105 transition-transform`}>
    <h2 className="text-2xl font-black leading-none text-black">{name}</h2>
    <div className="flex gap-2 justify-center text-lg font-bold text-black items-center mt-1">
        <Star className="fill-black text-black w-4 h-4" /> 
        <span>{points}</span>
    </div>
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-black"></div>
    <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[12px] border-t-yellow-400"></div>
  </div>
);

const Confetti = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div key={i} className="absolute animate-bounce" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s`, fontSize: `${20 + Math.random() * 30}px` }}>
          {['⭐', '✨', '🎉', '💥', 'POW!'][Math.floor(Math.random() * 5)]}
        </div>
      ))}
    </div>
  );
};

const Toast = ({ message }) => (
  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] animate-in zoom-in fade-in duration-300">
    <div className={`bg-white px-6 py-4 rounded-2xl ${COMIC_BORDER} shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col items-center gap-2`}>
      <ThumbsUp size={48} className="text-green-500" />
      <span className="text-2xl font-black text-black text-center whitespace-nowrap">{message}</span>
    </div>
  </div>
);

const ParentLogin = ({ onLogin }) => (
  <div className={`flex flex-col gap-4 p-6 bg-white rounded-xl ${COMIC_BORDER} ${COMIC_SHADOW} text-center animate-in fade-in zoom-in duration-300 max-w-xs w-full`}>
    <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto text-blue-600 border-2 border-black">
      <User size={32} />
    </div>
    <div>
      <h3 className="text-xl font-black text-slate-800 mb-1">כניסת הורים</h3>
      <p className="text-sm text-slate-500 font-bold">התחבר עם Google כדי לנהל</p>
    </div>
    <button onClick={onLogin} className={`bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-blue-700 font-bold ${COMIC_BTN}`}>
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5 border border-black" alt="" />
      התחברות Google
    </button>
  </div>
);

const BigRedButton = ({ onClick, label, iconKey, points }) => (
  <button 
    onClick={onClick}
    className={`w-40 h-40 rounded-full bg-red-500 ${COMIC_BORDER} shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 transition-all flex flex-col items-center justify-center text-white animate-pulse`}
  >
    <div className="transform scale-150 mb-2 text-white drop-shadow-[2px_2px_0_#000]">
        {getIconComponent(iconKey, label)}
    </div>
    <span className="text-xl font-black mt-1 leading-none text-center px-2 text-shadow-black">{label}</span>
    <span className="text-sm font-bold bg-yellow-400 text-black px-2 rounded-full border border-black shadow-sm transform -rotate-3">{points} נק'</span>
  </button>
);

const TaskItem = ({ title, points, iconKey, isDone, onClick }) => (
  <div className="relative group mb-3 w-full">
     <div className={`bg-white border-4 border-black p-2 rounded-xl flex items-center justify-between shadow-[4px_4px_0px_0px_#ccc] group-hover:shadow-[4px_4px_0px_0px_#000] transition-all`}>
        <div className="flex items-center gap-2 overflow-hidden">
           <div className={`p-2 rounded-lg border-2 border-black flex-shrink-0 bg-gray-50`}>
              {getIconComponent(iconKey, title)}
           </div>
           <div className="min-w-0">
              <div className="font-black text-base leading-tight truncate">{title}</div>
              <div className="text-xs font-bold bg-yellow-300 inline-block px-1 border border-black mt-1">
                {points} נק'
              </div>
           </div>
        </div>
        <button 
          onClick={onClick}
          className="w-10 h-10 border-4 border-black rounded-lg bg-white hover:bg-green-400 flex-shrink-0 flex items-center justify-center transition-colors ml-2"
        >
          {isDone && <Check size={24} strokeWidth={4} />}
        </button>
     </div>
  </div>
);


// --- Bedtime (kiosk) ---
const BedtimePanel = ({ data, now, onSleep }) => {
  const ev = getEveningInfo(now);
  if (!ev.inWindow) return null;

  const rec = data.bedtime?.days?.[ev.dateKey] || {};
  if (rec.off) {
    return (
      <div className={`w-full mt-3 relative z-20 bg-purple-200 p-3 rounded-xl text-center font-black ${COMIC_BORDER} ${COMIC_SHADOW_SM}`}>
        🎉 מחר חופש! אין שעת שינה הערב
      </div>
    );
  }

  const bank = getBedtimeBank(data, ev.date, { dateKey: ev.dateKey, minutes: ev.nowMinutes });
  const over = bank.remaining < 0;

  return (
    <div className="w-full mt-3 relative z-20 space-y-2">
      <div className={`${over ? 'bg-red-500 text-white' : 'bg-yellow-300 text-black'} rounded-xl p-2 text-center ${COMIC_BORDER} ${COMIC_SHADOW_SM}`}>
        <div className="text-xs font-black flex items-center justify-center gap-1"><Hourglass size={14} /> {over ? 'חריגה מהבנק השבועי' : 'נשאר לבזבז השבוע'}</div>
        <div className="text-2xl font-black leading-tight">{formatDuration(bank.remaining)}</div>
      </div>
      <button onClick={onSleep} className={`w-full bg-indigo-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 ${COMIC_BTN}`}>
        <Moon size={20} /> איתמר הלך לישון
      </button>
      {rec.sleepAt && (
        <div className="text-center text-xs font-black bg-white rounded-lg border-2 border-black px-2 py-1">
          נרשם: {rec.sleepAt}. קם וחזר לישון? לחץ שוב
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. האפליקציה הראשית
// ==========================================

// קורא את המסמך העדכני, מריץ את fn עליו ושומר - כך שני מכשירים לא דורסים אחד את השני
const mutateDoc = (fn) => runTransaction(db, async (tx) => {
  const snap = await tx.get(MAIN_DOC_REF);
  const d = snap.data();
  if (fn(d) === false) return;
  tx.update(MAIN_DOC_REF, d);
});

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [toastMsg, setToastMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [errorMsg, setErrorMsg] = useState(null);
  const now = useNow(data?.timeOverride);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // --- Auth & Data ---
  useEffect(() => {
    if (!auth) {
      setStatus('error');
      setErrorMsg("הגדרות Firebase חסרות");
      setLoading(false);
      return;
    }
    const signInKiosk = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setStatus('error');
        setErrorMsg("שגיאת התחברות: " + err.message + ". וודא שאפשרת כניסה אנונימית ב-Firebase Console.");
        setLoading(false);
      }
    };
    // גם אחרי יציאה של הורה חוזרים אוטומטית למצב קיוסק (כניסה אנונימית)
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else { setUser(null); signInKiosk(); }
    });
    return () => unsub();
  }, []);

  // --- Data Sync ---
  useEffect(() => {
    if (!user || !db) return; 
    
    const docRef = MAIN_DOC_REF;
    if (!docRef) return;
    
    const unsubSnap = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const serverData = snap.data();
        // Migration for familyPoints if missing
        if (serverData.kids && serverData.kids[0] && serverData.kids[0].familyPoints === undefined) {
            serverData.kids = serverData.kids.map(k => ({ ...k, familyPoints: k.points }));
            updateDoc(MAIN_DOC_REF, { kids: serverData.kids });
        }
        setData(serverData);
        setStatus('connected');
        setLoading(false);
      } else {
        try { 
          await setDoc(docRef, INITIAL_DATA); 
        } 
        catch (err) { 
          console.error("Init Data Error:", err);
          setStatus('error'); 
          setErrorMsg(err.message); 
          setLoading(false);
        }
      }
    }, (err) => {
      console.error("Snapshot Error:", err);
      setStatus('error');
      setErrorMsg("שגיאת קריאת נתונים: " + err.message);
      setLoading(false);
    });

    return () => unsubSnap();
  }, [user]);

  // Time Auto-Update + פתיחה מחדש של משימות חוזרות בכל יום חדש
  useEffect(() => {
    if (!data || !db) return;

    const checkTime = () => {
        const n = getJerusalemNow(data.timeOverride);
        const patch = {};
        if (n.day !== data.currentDay) patch.currentDay = n.day;
        if (n.phase !== data.currentTimePhase) patch.currentTimePhase = n.phase;
        if (data.timeOverride && !n.simulated) patch.timeOverride = null;
        if (Object.keys(patch).length) updateDoc(MAIN_DOC_REF, patch).catch(console.error);

        const today = toDateKey(getLogicalDate(getJerusalemNow()));
        if ((data.lastResetDate || '') < today) {
            mutateDoc(d => {
                if ((d.lastResetDate || '') >= today) return false;
                d.lastResetDate = today;
                reopenDoneTasks(d);
            }).catch(console.error);
        }
    };

    checkTime();
    const interval = setInterval(checkTime, 30000);
    return () => clearInterval(interval);
  }, [data]);

  // --- Handlers ---
  const handleTaskAction = async (kidId, task, action = 'complete') => {
    if (!db) { alert("שגיאה: אין חיבור למסד נתונים"); return; }
    
    try {
        let msg = null;
        await mutateDoc(d => {
            const kid = d.kids.find(k => k.id === kidId);
            if (!kid) return false;
            kid.activeEffects = kid.activeEffects || { doublePointsUntil: 0 };
            kid.inventory = kid.inventory || { shields: 0 };

            if (action === 'complete') {
                const t = kid.tasks.find(t => t.id === task.id);
                if (!t || t.status !== 'open') return false;
                // Always move to pending for parents to approve effects
                t.status = 'pending_approval';
                t.doubled = isDoubleActive(kid); // הכפל נקבע ברגע הביצוע, לא ברגע האישור
                msg = "נשלח לאישור הורים!";
            }
            else if (action === 'buy_double' && kid.points >= 100) {
                kid.points -= 100;
                kid.activeEffects.doublePointsUntil = Math.max(Date.now(), kid.activeEffects.doublePointsUntil || 0) + 3600000;
                msg = "דאבל פעיל לשעה!";
            }
            else if (action === 'buy_shield' && kid.points >= 150) {
                kid.points -= 150;
                kid.inventory.shields = (kid.inventory.shields || 0) + 1;
                msg = "קנית מגן!";
            }
            else return false;
        });
        if (msg) showToast(msg);
    } catch (err) {
        console.error("Update Error:", err);
        alert("שגיאה בשמירת הפעולה: " + err.message);
    }
  };

  const handleSleepNow = async () => {
    try {
        const n = getJerusalemNow(data.timeOverride);
        const ev = getEveningInfo(n);
        if (!ev.inWindow) return;
        const sleepAt = `${pad2(n.hour)}:${pad2(n.minute)}`;
        await mutateDoc(d => {
            d.bedtime = d.bedtime || { days: {} };
            d.bedtime.days = d.bedtime.days || {};
            const rec = d.bedtime.days[ev.dateKey] || {};
            if (rec.off) return false;
            d.bedtime.days[ev.dateKey] = { ...rec, sleepAt };
        });
        showToast(`לילה טוב! נרשם ${sleepAt}`);
    } catch (err) {
        console.error("Sleep Error:", err);
        alert("שגיאה בשמירת שעת השינה: " + err.message);
    }
  };

  const handleAdminAction = async (action, payload) => {
    if (!db) return;
    try {
        let msg = null;
        await mutateDoc(d => {
            const kid = payload?.kidId !== undefined ? d.kids.find(k => k.id === payload.kidId) : null;
            const task = kid && payload.taskId ? kid.tasks.find(t => t.id === payload.taskId) : null;

            switch (action) {
                case 'approve':
                    if (!task || task.status !== 'pending_approval') return false;
                    applyApproval(d, kid, task);
                    msg = "המשימה אושרה";
                    break;
                case 'approve_all':
                    d.kids.forEach(k => [...k.tasks].filter(t => t.status === 'pending_approval').forEach(t => applyApproval(d, k, t)));
                    msg = "הכל אושר";
                    break;
                case 'reset_task':
                    if (!task) return false;
                    task.status = 'open';
                    delete task.doubled;
                    break;
                case 'delete_task':
                    if (!kid) return false;
                    kid.tasks = kid.tasks.filter(t => t.id !== payload.taskId);
                    break;
                case 'add_task': {
                    const target = d.kids.find(k => k.id === payload.kidId);
                    if (!target) return false;
                    target.tasks.push(payload.task);
                    msg = "המשימה נוספה בהצלחה!";
                    break;
                }
                case 'manage_points':
                    if (!kid) return false;
                    if (payload.mode === 'reset') kid.points = 0;
                    if (payload.mode === 'add') kid.points += payload.amount;
                    if (payload.mode === 'subtract') kid.points = Math.max(0, kid.points - payload.amount);
                    break;
                case 'reset_boss':
                    d.bossHP = d.maxBossHP;
                    break;
                case 'reset_all': {
                    // איפוס משחק מלא; שומרים זמן, מצב בדיקה ויומן שעות השינה
                    const fresh = structuredClone(INITIAL_DATA);
                    fresh.currentDay = d.currentDay;
                    fresh.currentTimePhase = d.currentTimePhase;
                    fresh.lastResetDate = d.lastResetDate || fresh.lastResetDate;
                    fresh.timeOverride = d.timeOverride || null;
                    fresh.bedtime = d.bedtime || fresh.bedtime;
                    Object.assign(d, fresh);
                    break;
                }
                case 'set_override': {
                    const ov = { ...payload, setAt: Date.now() };
                    d.timeOverride = ov;
                    d.currentDay = ov.day;
                    d.currentTimePhase = getPhase(ov.hour);
                    msg = "מצב בדיקה פעיל";
                    break;
                }
                case 'clear_override': {
                    const real = getJerusalemNow();
                    d.timeOverride = null;
                    d.currentDay = real.day;
                    d.currentTimePhase = real.phase;
                    break;
                }
                case 'set_night_off': {
                    d.bedtime = d.bedtime || { days: {} };
                    d.bedtime.days = d.bedtime.days || {};
                    d.bedtime.days[payload.dateKey] = { ...(d.bedtime.days[payload.dateKey] || {}), off: payload.off };
                    msg = payload.off ? "סומן: מחר חופש / בייביסיטר" : "הסימון בוטל";
                    break;
                }
                case 'set_sleep': {
                    d.bedtime = d.bedtime || { days: {} };
                    d.bedtime.days = d.bedtime.days || {};
                    const rec = { ...(d.bedtime.days[payload.dateKey] || {}) };
                    if (payload.sleepAt) rec.sleepAt = payload.sleepAt; else delete rec.sleepAt;
                    d.bedtime.days[payload.dateKey] = rec;
                    msg = "שעת השינה עודכנה";
                    break;
                }
                default:
                    return false;
            }
        });
        if (msg) showToast(msg);
    } catch (err) {
        console.error("Admin Action Error:", err);
        alert("שגיאה בפעולת ניהול: " + err.message);
    }
  };

  const handleParentLogin = async () => {
    if (!auth) { alert("הגדרות Firebase חסרות"); return; }
    try { await signInWithPopup(auth, new GoogleAuthProvider()); setShowLoginModal(false); } 
    catch (e) { alert(e.message); }
  };

  if (status === 'error') return <div className="text-center p-10 text-red-600 font-bold" dir="rtl">
      <h2 className="text-2xl mb-2">אופס! שגיאה בחיבור</h2>
      <p>{errorMsg}</p>
      <p className="text-sm mt-4 text-gray-500">ודא שהגדרת Anonymous Auth ב-Firebase Console.</p>
  </div>;

  if (loading || !data) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;

  // --- תצוגת הורים (Admin) ---
  if (user && !user.isAnonymous && ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
      return (
        <div className="min-h-screen bg-slate-100 pb-20 font-comic" dir="rtl">
          <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
               <Settings />
               <div>
                 <h1 className="text-xl font-bold">מפקדת הורים</h1>
                 <div className="text-xs opacity-70">מחובר: {user.email}</div>
               </div>
            </div>
            <button onClick={() => signOut(auth)} className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 flex items-center gap-2">
              <LogOut size={14}/> יציאה
            </button>
          </div>
          <div className="p-4">
             {toastMsg && <Toast message={toastMsg} />}
             <AdminPanelContent data={data} onAction={handleAdminAction} />
          </div>
        </div>
      );
  }

  // --- תצוגת קיוסק (ילדים) ---
  const [itamar, roni, noam] = [1, 2, 3].map(id => data.kids.find(k => k.id === id));
  if (!itamar || !roni || !noam) return <div className="text-center p-10 text-red-600 font-bold" dir="rtl">חסרים נתוני ילדים. היכנס כהורה ובצע איפוס מערכת.</div>;

  const openTasks = (kid) => kid.tasks.filter(t => t.time === data.currentTimePhase && t.status === 'open' && (t.days || []).includes(data.currentDay));
  const taskPoints = (kid, task) => (isDoubleActive(kid) ? task.value * 2 : task.value);

  return (
    <div className="min-h-screen font-comic overflow-hidden flex flex-col relative" style={BG_STYLE}>
      
      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
      {toastMsg && <Toast message={toastMsg} />}

      {/* HEADER */}
      <header className="relative z-20 p-2">
        <div className="flex justify-between items-center mb-2">
           <button onClick={() => setShowLoginModal(true)} className="opacity-50 hover:opacity-100 transition"><Settings className="text-white drop-shadow-md"/></button>
           <div className={`bg-white px-3 py-1 rounded-full text-xs font-black text-black flex items-center gap-2 ${COMIC_BORDER} shadow-sm`}>
                <span className="flex items-center gap-1">
                  {data.currentTimePhase === 'morning' ? <Sun size={14} className="text-orange-500"/> : data.currentTimePhase === 'noon' ? <Cloud size={14} className="text-blue-400"/> : <Moon size={14} className="text-indigo-600"/>}
                  {TIME_HEBREW[data.currentTimePhase]}
                </span>
                <span className="w-px h-3 bg-black"></span>
                <span>יום {DAYS_HEBREW[data.currentDay]}</span>
                {now.simulated && <span className="bg-yellow-300 px-2 rounded-full border border-black">מצב בדיקה</span>}
           </div>
        </div>
        
        <div className="flex justify-between items-end gap-4 mt-4">
           <div className="flex-1 min-w-[30%]">
               {/* Updated to use familyPoints for Pizza progress */}
               <BossBar current={data.kids.reduce((a,b)=>a+(b.familyPoints || b.points),0)} max={data.familyGoal} label="פיצה משפחתית" color="bg-yellow-400" />
           </div>
           <div className="flex-none z-30 mx-2">
               <MainTitle />
           </div>
           <div className="flex-1 min-w-[30%]">
               <BossBar current={data.bossHP} max={data.maxBossHP} label="מפלצת הבלגן" color="bg-red-500" />
           </div>
        </div>
      </header>

      {/* MAIN COMIC PANELS */}
      {activeTab === 'tasks' && (
      <div className="flex-1 relative z-30 px-2 md:px-4 pb-4 mt-44 md:mt-56 overflow-visible">
        
        {/* Layer 1: Names (Z-50) */}
        <div className="grid grid-cols-3 gap-0 absolute top-[-30px] md:top-[-40px] left-2 md:left-4 right-2 md:right-4 z-50 pointer-events-none">
            {/* NOAM NAME */}
            <div className="relative h-20 flex flex-col justify-end px-2">
                 <NameBubble name={noam.name} points={noam.points} />
            </div>
            {/* RONI NAME */}
            <div className="relative h-20 flex flex-col justify-end px-2">
                 <NameBubble name={roni.name} points={roni.points} />
            </div>
            {/* ITAMAR NAME */}
            <div className="relative h-20 flex flex-col justify-end px-2">
                 <NameBubble name={itamar.name} points={itamar.points} />
            </div>
        </div>

        {/* Layer 2: Characters (Z-40) */}
        <div className="grid grid-cols-3 gap-0 absolute top-[-50px] md:top-[-70px] left-2 md:left-4 right-2 md:right-4 z-40 pointer-events-none">
            {/* NOAM - LEFT */}
            <div className="relative h-20 flex justify-start pl-4 items-end">
                <img src={AVATARS[3]} className="w-40 md:w-56 h-auto object-contain z-20 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform scale-[1.3] origin-bottom-left" alt="Noam" />
            </div>
            {/* RONI - CENTER */}
            <div className="relative h-20 flex justify-start pl-4 items-end">
                <img src={AVATARS[2]} className="w-52 md:w-64 h-auto object-contain z-20 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform scale-[1.3] origin-bottom-left" alt="Roni" />
            </div>
            {/* ITAMAR - RIGHT */}
            <div className="relative h-20 flex justify-center items-end"> 
                <img src={AVATARS[1]} className="w-56 md:w-72 h-auto object-contain z-20 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform scale-x-[-1.3] scale-y-[1.3] origin-bottom" alt="Itamar" />
            </div>
        </div>

        {/* Layer 3: Main Grid Content (Z-30) */}
        <div className="grid grid-cols-3 h-full gap-0 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative z-30 pt-10">
            
            {/* NOAM COLUMN */}
            <div className="relative border-l-4 border-black p-2 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-pink-100 overflow-visible">
               <div className="flex-1 flex flex-col items-center justify-start relative z-20 w-full gap-4 mt-4">
                  {openTasks(noam).map(task => (
                     <BigRedButton 
                        key={task.id} 
                        label={task.title} 
                        points={taskPoints(noam, task)}
                        iconKey={task.icon} 
                        onClick={() => handleTaskAction(3, task, 'complete')} 
                     />
                  ))}
               </div>
            </div>

            {/* RONI COLUMN */}
            <div className="relative border-l-4 border-black p-2 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-purple-100 overflow-visible">
               <div className="flex-1 w-full relative z-20 space-y-3 overflow-y-auto mt-4">
                  {openTasks(roni).map(task => (
                     <TaskItem 
                        key={task.id} 
                        title={task.title} 
                        points={taskPoints(roni, task)} 
                        iconKey={task.icon} 
                        onClick={() => handleTaskAction(2, task, 'complete')} 
                     />
                  ))}
               </div>
            </div>

            {/* ITAMAR COLUMN */}
            <div className="relative p-2 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-blue-100 overflow-visible">
               <div className="flex-1 w-full relative z-20 space-y-3 overflow-y-auto mt-4">
                  {openTasks(itamar).map(task => (
                     <TaskItem 
                        key={task.id} 
                        title={task.title} 
                        points={taskPoints(itamar, task)} 
                        iconKey={task.icon} 
                        onClick={() => handleTaskAction(1, task, 'complete')} 
                     />
                  ))}
               </div>
               <BedtimePanel data={data} now={now} onSleep={handleSleepNow} />
            </div>
        </div>
      </div>
      )}

      {activeTab === 'shop' && <ShopView kids={data.kids} onBuy={handleTaskAction} />}

      <div className="relative z-20 px-4 pb-4 flex justify-center gap-2 md:gap-4 mt-auto">
         <button onClick={() => setActiveTab('tasks')} className={`bg-blue-500 text-white text-sm md:text-xl font-black px-4 md:px-8 py-3 rounded-xl ${COMIC_BTN} ${activeTab === 'tasks' ? 'ring-4 ring-yellow-400' : ''}`}>משימות</button>
         <button onClick={() => setActiveTab('shop')} className={`bg-orange-500 text-white text-sm md:text-xl font-black px-4 md:px-8 py-3 rounded-xl ${COMIC_BTN} ${activeTab === 'shop' ? 'ring-4 ring-yellow-400' : ''}`}>חנות</button>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
           <div className="relative w-full max-w-sm">
             <button onClick={() => setShowLoginModal(false)} className="absolute -top-10 right-0 text-white font-bold text-xl">סגור</button>
             <ParentLogin onLogin={handleParentLogin} />
           </div>
        </div>
      )}
      
      <div className="fixed bottom-6 right-6 z-40 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-mono shadow border border-slate-200 flex items-center gap-2" dir="ltr">
        {status === 'connected' ? (
          <><Wifi size={12} className="text-green-500"/> <span className="text-green-700">Online</span></>
        ) : (
          <><WifiOff size={12} className="text-red-500"/> <span className="text-red-600">{status}</span></>
        )}
      </div>
    </div>
  );
}

// --- Shop View ---
const ShopView = ({ kids, onBuy }) => (
  <div className="flex-1 p-4 overflow-y-auto bg-white/95 m-4 border-4 border-black rounded-xl relative z-20 mt-20">
     <h2 className="text-4xl font-black text-center mb-8 uppercase tracking-widest bg-yellow-300 border-4 border-black inline-block px-4 rotate-[-2deg] mx-auto shadow-[4px_4px_0px_0px_#000]">חנות הכוחות</h2>
     <div className="grid grid-cols-1 gap-6">
        {kids.filter(k => k.ageGroup !== 'toddler').map(kid => (
           <div key={kid.id} className="border-b-4 border-dashed border-gray-300 pb-6">
              <div className="flex items-center gap-3 mb-4 bg-gray-100 p-2 rounded-lg border-2 border-black">
                 <img src={AVATARS[kid.id]} className="w-10 h-10 rounded-full border-2 border-black bg-white object-cover"/>
                 <span className="font-black text-lg">{kid.name}</span>
                 <span className="bg-yellow-400 px-2 border-2 border-black font-bold text-sm ml-auto shadow-[2px_2px_0px_0px_#000]">יש לך: {kid.points} נק'</span>
              </div>
              <div className="flex gap-4">
                 <button 
                   onClick={() => onBuy(kid.id, null, 'buy_double')}
                   disabled={kid.points < 100}
                   className={`flex-1 bg-cyan-200 p-4 border-4 border-black flex flex-col items-center shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all ${kid.points < 100 ? 'opacity-50 grayscale' : ''}`}
                 >
                    <Zap size={32} className="mb-2" />
                    <span className="font-black text-base">דאבל (100)</span>
                    <span className="text-xs font-bold mt-1">x2 נקודות לשעה!</span>
                 </button>
                 <button 
                   onClick={() => onBuy(kid.id, null, 'buy_shield')}
                   disabled={kid.points < 150}
                   className={`flex-1 bg-green-200 p-4 border-4 border-black flex flex-col items-center shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all ${kid.points < 150 ? 'opacity-50 grayscale' : ''}`}
                 >
                    <Shield size={32} className="mb-2" />
                    <span className="font-black text-base">מגן (150)</span>
                    <span className="text-xs font-bold mt-1">מדלג על מטלה אחת</span>
                 </button>
              </div>
           </div>
        ))}
     </div>
  </div>
);

// --- Admin Panel Content ---

const IMPACT_OPTIONS = [
  { key: 'boss', label: 'מפלצת הבלגן', hint: 'מוריד חיים למפלצת' },
  { key: 'pizza', label: 'פיצה משפחתית', hint: 'ממלא את הפיצה' },
  { key: 'none', label: 'ללא השפעה', hint: 'רק נקודות לילד' }
];

const formatDays = (days = []) => {
  if (days.length === 7) return 'כל יום';
  return DAY_KEYS.filter(d => days.includes(d)).map(d => DAYS_HEBREW[d]).join(', ') || 'ללא ימים';
};

const formatShortDate = (dateKey) => `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}`;

const Card = ({ title, icon: Icon, right, children }) => (
  <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
      <h3 className="font-black text-slate-700 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-slate-500" />}{title}
      </h3>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Chip = ({ active, onClick, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-colors ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'} ${className}`}
  >
    {children}
  </button>
);

// ---- בית: אישורים + שעת שינה ----

const ApprovalsCard = ({ data, onAction }) => {
  const pending = data.kids.flatMap(kid => kid.tasks.filter(t => t.status === 'pending_approval').map(t => ({ kid, t })));
  return (
    <Card
      title={`ממתינות לאישור${pending.length ? ` (${pending.length})` : ''}`}
      icon={CheckCircle}
      right={pending.length > 1 && (
        <button onClick={() => onAction('approve_all')} className="bg-green-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-green-600">אשר הכל</button>
      )}
    >
      {pending.length === 0 ? (
        <div className="text-center py-4 text-slate-400">הכל מאושר, אין משימות שמחכות 🎉</div>
      ) : (
        <div className="space-y-2">
          {pending.map(({ kid, t }) => (
            <div key={t.id} className="flex items-center gap-3 bg-yellow-50 p-3 rounded-xl border border-yellow-100">
              <span className={`w-3 h-10 rounded-full ${kid.color}`}></span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 truncate">{t.title}</div>
                <div className="text-xs text-slate-500">
                  {kid.name} • {t.value} נק'{t.doubled ? ' (דאבל x2)' : ''}
                </div>
              </div>
              <button onClick={() => onAction('reset_task', { kidId: kid.id, taskId: t.id })} title="החזר לילד" className="p-2 text-slate-500 hover:bg-yellow-100 rounded-lg"><RotateCcw size={18} /></button>
              <button onClick={() => onAction('approve', { kidId: kid.id, taskId: t.id })} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 flex items-center gap-1"><Check size={16} /> אשר</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const BedtimeCard = ({ data, now, onAction }) => {
  const [showWeek, setShowWeek] = useState(false);
  const [editKey, setEditKey] = useState(null);
  const [editTime, setEditTime] = useState('21:00');

  const ev = getEveningInfo(now);
  const live = ev.inWindow ? { dateKey: ev.dateKey, minutes: ev.nowMinutes } : null;
  const bank = getBedtimeBank(data, ev.date, live);
  const tonight = bank.nights.find(n => n.dateKey === ev.dateKey);
  const over = bank.remaining < 0;
  const pct = bank.budget ? Math.min(100, Math.max(0, (bank.spent / bank.budget) * 100)) : 0;

  const startEdit = (n) => { setEditKey(n.dateKey); setEditTime(n.sleepAt || '21:00'); };

  return (
    <Card title="שעת שינה של איתמר" icon={Moon}>
      {/* מחר חופש */}
      {tonight ? (
        <button
          onClick={() => onAction('set_night_off', { dateKey: ev.dateKey, off: !tonight.off })}
          className={`w-full p-4 rounded-xl border-2 text-right flex items-center gap-3 transition-colors ${tonight.off ? 'bg-purple-600 border-purple-700 text-white' : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'}`}
        >
          <Sparkles size={24} />
          <div className="flex-1">
            <div className="font-black">מחר חופש / בייביסיטר</div>
            <div className={`text-xs ${tonight.off ? 'text-purple-100' : 'text-purple-600'}`}>
              {tonight.off ? `פעיל עבור ליל ${DAYS_HEBREW[ev.day]}: השעה לא משנה ואין בונוס. לחץ לביטול` : `לחץ אם הערב (ליל ${DAYS_HEBREW[ev.day]}) לא נספר`}
            </div>
          </div>
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-sm">ערב שבת: אין מעקב שינה והטאבלט לא בשימוש.</div>
      )}

      {/* בנק שבועי */}
      <div className="mt-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-sm font-bold text-slate-600">הבנק השבועי</span>
          <span className={`text-lg font-black ${over ? 'text-red-600' : 'text-green-700'}`}>
            {over ? `חריגה של ${formatDuration(bank.remaining)}` : `נשארו ${formatDuration(bank.remaining)}`}
          </span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full ${over ? 'bg-red-500' : 'bg-indigo-500'} transition-all`} style={{ width: `${over ? 100 : pct}%` }}></div>
        </div>
        <div className="text-xs text-slate-400 mt-1">נוצלו {formatDuration(bank.spent)} מתוך {formatDuration(bank.budget)} (30 דק' לכל לילה, 21:00 + בנק)</div>
      </div>

      {/* פירוט */}
      <button onClick={() => setShowWeek(!showWeek)} className="mt-3 text-sm font-bold text-blue-600 hover:underline">
        {showWeek ? 'הסתר פירוט השבוע' : 'פירוט השבוע ועריכה'}
      </button>
      {showWeek && (
        <div className="mt-2 space-y-2">
          {bank.nights.map(n => (
            <div key={n.dateKey} className={`rounded-xl border p-3 ${n.dateKey === ev.dateKey ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <div className="w-20 font-bold text-slate-700">{DAYS_HEBREW[n.day]} <span className="text-xs text-slate-400 font-normal">{formatShortDate(n.dateKey)}</span></div>
                <div className="flex-1 text-sm text-slate-600">
                  {n.off ? <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">חופש / בייביסיטר</span>
                    : n.sleepAt ? <span>ישן ב-<b>{n.sleepAt}</b> • נוצלו {n.spent} דק'</span>
                    : n.isLive ? <span className="text-indigo-600">ער כרגע • נוצלו {n.spent} דק'</span>
                    : <span className="text-slate-400">לא נרשם</span>}
                </div>
                <button onClick={() => (editKey === n.dateKey ? setEditKey(null) : startEdit(n))} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg" title="ערוך"><Pencil size={16} /></button>
              </div>
              {editKey === n.dateKey && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="p-2 rounded-lg border border-slate-300" />
                  <button onClick={() => { onAction('set_sleep', { dateKey: n.dateKey, sleepAt: editTime }); setEditKey(null); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm">שמור שעה</button>
                  {n.sleepAt && <button onClick={() => { onAction('set_sleep', { dateKey: n.dateKey, sleepAt: null }); setEditKey(null); }} className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-bold text-sm">נקה</button>}
                  <button onClick={() => { onAction('set_night_off', { dateKey: n.dateKey, off: !n.off }); setEditKey(null); }} className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm">{n.off ? 'בטל חופש' : 'סמן חופש / בייביסיטר'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const StatusCard = ({ data }) => {
  const pizza = data.kids.reduce((a, b) => a + (b.familyPoints || b.points), 0);
  return (
    <Card title="מצב המשחק" icon={Star}>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
          <div className="text-xs text-slate-500">פיצה משפחתית</div>
          <div className="text-xl font-black text-yellow-700">{pizza} / {data.familyGoal}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <div className="text-xs text-slate-500">מפלצת הבלגן</div>
          <div className="text-xl font-black text-red-600">{data.bossHP} / {data.maxBossHP}</div>
        </div>
      </div>
    </Card>
  );
};

const HomeTab = ({ data, now, onAction }) => (
  <div className="space-y-4">
    <ApprovalsCard data={data} onAction={onAction} />
    <BedtimeCard data={data} now={now} onAction={onAction} />
    <StatusCard data={data} />
  </div>
);

// ---- משימות ----

const TaskForm = ({ kid, data, onSubmit, onCancel }) => {
  const [task, setTask] = useState({
    title: '', value: 10, time: data.currentTimePhase, isOneTime: false, days: [data.currentDay], icon: 'star', impact: 'boss'
  });
  const [error, setError] = useState('');

  const toggleDay = (key) => setTask(prev => ({ ...prev, days: prev.days.includes(key) ? prev.days.filter(d => d !== key) : [...prev.days, key] }));

  const submit = () => {
    if (!task.title.trim()) return setError('חסר שם למשימה');
    if (task.days.length === 0) return setError('בחר לפחות יום אחד');
    if (!Number.isInteger(task.value) || task.value < 1) return setError('הניקוד צריך להיות מספר חיובי');
    onSubmit({ id: 't' + Date.now(), title: task.title.trim(), value: task.value, time: task.time, status: 'open', isOneTime: task.isOneTime, days: task.days, icon: task.icon, impact: task.impact });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">משימה חדשה עבור <b className="text-slate-800">{kid.name}</b></div>

      <input type="text" placeholder="שם המשימה (למשל: סידור חדר)" className="w-full p-3 rounded-xl border border-slate-300 text-lg" value={task.title} onChange={e => setTask({ ...task, title: e.target.value })} />

      <div>
        <div className="text-xs font-bold text-slate-500 mb-2">אייקון</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ICON_MAP).map(([key, { icon: Icon, label }]) => (
            <button key={key} type="button" onClick={() => setTask({ ...task, icon: key })} className={`flex flex-col items-center p-2 rounded-xl border-2 w-16 ${task.icon === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
              <Icon size={22} />
              <span className="text-[10px] mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 mb-2">מתי ביום</div>
        <div className="flex gap-2">
          {Object.entries(TIME_HEBREW).map(([key, label]) => <Chip key={key} active={task.time === key} onClick={() => setTask({ ...task, time: key })} className="flex-1">{label}</Chip>)}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">באילו ימים</span>
          <div className="flex gap-3 text-xs font-bold text-blue-600">
            <button type="button" onClick={() => setTask({ ...task, days: [...DAY_KEYS] })}>כל יום</button>
            <button type="button" onClick={() => setTask({ ...task, days: DAY_KEYS.filter(d => d !== 'friday' && d !== 'saturday') })}>ראשון-חמישי</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS.map(key => <Chip key={key} active={task.days.includes(key)} onClick={() => toggleDay(key)}>{DAYS_HEBREW[key]}</Chip>)}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 mb-2">כמה נקודות</div>
        <div className="flex flex-wrap gap-2 items-center">
          {[5, 10, 15, 20, 30].map(v => <Chip key={v} active={task.value === v} onClick={() => setTask({ ...task, value: v })}>{v}</Chip>)}
          <input type="number" min="1" className="w-20 p-2 rounded-xl border border-slate-300" value={Number.isNaN(task.value) ? '' : task.value} onChange={e => setTask({ ...task, value: parseInt(e.target.value, 10) })} />
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 mb-2">מה המשימה משפיעה</div>
        <div className="grid grid-cols-3 gap-2">
          {IMPACT_OPTIONS.map(o => (
            <button key={o.key} type="button" onClick={() => setTask({ ...task, impact: o.key })} className={`p-2 rounded-xl border-2 text-center ${task.impact === o.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
              <div className="text-sm font-bold text-slate-700">{o.label}</div>
              <div className="text-[10px] text-slate-400">{o.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
        <input type="checkbox" className="w-5 h-5" checked={task.isOneTime} onChange={e => setTask({ ...task, isOneTime: e.target.checked })} />
        משימה חד-פעמית (נמחקת אחרי האישור)
      </label>

      {error && <div className="text-red-600 text-sm font-bold">{error}</div>}

      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md">הוסף משימה</button>
        <button onClick={onCancel} className="px-5 bg-slate-200 text-slate-700 rounded-xl font-bold">ביטול</button>
      </div>
    </div>
  );
};

const TASK_STATUS = {
  open: { label: 'פתוח', cls: 'bg-slate-200 text-slate-600' },
  pending_approval: { label: 'ממתין לאישור', cls: 'bg-yellow-100 text-yellow-700' },
  done: { label: 'בוצע', cls: 'bg-green-100 text-green-700' }
};

const TasksTab = ({ data, onAction }) => {
  const [kidId, setKidId] = useState(data.kids[0].id);
  const [showForm, setShowForm] = useState(false);
  const kid = data.kids.find(k => k.id === kidId) || data.kids[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {data.kids.map(k => (
          <button key={k.id} onClick={() => { setKidId(k.id); setShowForm(false); }} className={`flex-1 py-3 rounded-xl border-2 font-black flex items-center justify-center gap-2 ${k.id === kid.id ? `${k.color} border-black text-black` : 'bg-white border-slate-200 text-slate-500'}`}>
            {k.name}
          </button>
        ))}
      </div>

      {showForm ? (
        <Card title="משימה חדשה" icon={Plus}>
          <TaskForm kid={kid} data={data} onCancel={() => setShowForm(false)} onSubmit={(task) => { onAction('add_task', { kidId: kid.id, task }); setShowForm(false); }} />
        </Card>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center justify-center gap-2"><Plus size={20} /> משימה חדשה ל{kid.name}</button>
      )}

      {Object.entries(TIME_HEBREW).map(([time, label]) => {
        const tasks = kid.tasks.filter(t => t.time === time);
        if (tasks.length === 0) return null;
        return (
          <Card key={time} title={label} icon={time === 'morning' ? Sun : time === 'noon' ? Cloud : Moon}>
            <div className="space-y-2">
              {tasks.map(task => {
                const st = TASK_STATUS[task.status] || TASK_STATUS.open;
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-slate-600">{getIconComponent(task.icon, task.title)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                        {task.title}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {task.value} נק' • {formatDays(task.days)}{task.isOneTime ? ' • חד-פעמית' : ''}
                      </div>
                    </div>
                    {task.status !== 'open' && (
                      <button title="החזר למצב פתוח" onClick={() => onAction('reset_task', { kidId: kid.id, taskId: task.id })} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><RotateCcw size={18} /></button>
                    )}
                    <button title="מחק" onClick={() => { if (window.confirm(`למחוק את "${task.title}"?`)) onAction('delete_task', { kidId: kid.id, taskId: task.id }); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
      {kid.tasks.length === 0 && <div className="text-center text-slate-400 py-6">עדיין אין משימות ל{kid.name}</div>}
    </div>
  );
};

// ---- ניקוד ----

const PointsTab = ({ data, onAction }) => {
  const [amounts, setAmounts] = useState({});
  const amountOf = (id) => (amounts[id] === undefined ? 10 : amounts[id]);

  return (
    <div className="space-y-4">
      {data.kids.map(kid => {
        const amount = Math.max(0, amountOf(kid.id) || 0);
        const double = isDoubleActive(kid);
        return (
          <Card key={kid.id} title={kid.name} icon={User} right={<span className="bg-yellow-300 border-2 border-black px-3 rounded-full font-black text-sm">{kid.points} נק'</span>}>
            <div className="text-xs text-slate-500 mb-3">
              סה"כ לאורך זמן: {kid.lifetimePoints} • מגנים: {kid.inventory?.shields || 0}{double ? ' • דאבל פעיל ⚡' : ''}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onAction('manage_points', { kidId: kid.id, amount, mode: 'subtract' })} className="bg-red-100 text-red-700 w-14 h-12 rounded-xl font-bold hover:bg-red-200 flex items-center justify-center"><Minus size={20} /></button>
              <input type="number" min="0" className="flex-1 min-w-0 p-3 rounded-xl border border-slate-300 text-center text-lg font-bold" value={Number.isNaN(amounts[kid.id]) ? '' : amountOf(kid.id)} onChange={e => setAmounts({ ...amounts, [kid.id]: parseInt(e.target.value, 10) })} />
              <button onClick={() => onAction('manage_points', { kidId: kid.id, amount, mode: 'add' })} className="bg-green-100 text-green-700 w-14 h-12 rounded-xl font-bold hover:bg-green-200 flex items-center justify-center"><Plus size={20} /></button>
            </div>
            <div className="flex gap-2 mt-3">
              {[5, 10, 50].map(v => <button key={v} onClick={() => setAmounts({ ...amounts, [kid.id]: v })} className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">{v}</button>)}
              <button onClick={() => { if (window.confirm(`לאפס את הנקודות של ${kid.name}?`)) onAction('manage_points', { kidId: kid.id, amount: 0, mode: 'reset' }); }} className="mr-auto text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1"><RefreshCcw size={12} /> אפס</button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ---- הגדרות ----

const SettingsTab = ({ data, now, onAction }) => {
  const [simDay, setSimDay] = useState(data.currentDay);
  const [simTime, setSimTime] = useState('21:00');

  const startSim = () => {
    const [hour, minute] = simTime.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;
    onAction('set_override', { day: simDay, hour, minute });
  };

  return (
    <div className="space-y-4">
      <Card title="בדיקת האפליקציה (מצב בדיקה)" icon={FlaskConical}>
        <p className="text-xs text-slate-500 mb-3">נותן לראות איך האפליקציה נראית ביום ושעה אחרים (למשל 21:10 כדי לבדוק את כפתור השינה). המצב חוזר לזמן אמת אחרי חצי שעה.</p>
        {now.simulated && (
          <div className="mb-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-xl p-3 text-sm font-bold flex items-center justify-between gap-2">
            <span>מצב בדיקה פעיל: יום {DAYS_HEBREW[now.day]} {pad2(now.hour)}:{pad2(now.minute)}</span>
            <button onClick={() => onAction('clear_override')} className="bg-yellow-400 text-black px-3 py-1 rounded-lg">חזור לזמן אמת</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={simDay} onChange={e => setSimDay(e.target.value)} className="p-2 rounded-xl border border-slate-300">
            {DAY_KEYS.map(k => <option key={k} value={k}>יום {DAYS_HEBREW[k]}</option>)}
          </select>
          <input type="time" value={simTime} onChange={e => setSimTime(e.target.value)} className="p-2 rounded-xl border border-slate-300" />
          <button onClick={startSim} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold">הפעל</button>
        </div>
      </Card>

      <Card title="מפלצת הבלגן" icon={Zap}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">חיים: <b>{data.bossHP} / {data.maxBossHP}</b></span>
          <button onClick={() => { if (window.confirm('למלא את חיי המפלצת מחדש?')) onAction('reset_boss'); }} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200 text-sm">מלא חיים מחדש</button>
        </div>
      </Card>

      <section className="bg-red-50 p-4 rounded-2xl border border-red-200">
        <h3 className="font-black text-red-600 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> אזור סכנה</h3>
        <p className="text-xs text-red-500 mb-3">מוחק את כל הניקוד, המשימות וההתקדמות ומחזיר את המשחק למצב התחלתי. יומן שעות השינה נשמר.</p>
        <button
          onClick={() => { if (window.confirm('האם אתה בטוח? פעולה זו תאפס את כל הניקוד והמשימות לכולם! לא ניתן לשחזר.')) onAction('reset_all'); }}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 shadow-md flex items-center justify-center gap-2"
        >
          <AlertTriangle size={20} />
          איפוס מערכת מלא
        </button>
      </section>
    </div>
  );
};

const AdminPanelContent = ({ data, onAction }) => {
  const [tab, setTab] = useState('home');
  const now = useNow(data.timeOverride);
  const pendingCount = data.kids.reduce((a, k) => a + k.tasks.filter(t => t.status === 'pending_approval').length, 0);

  const tabs = [
    { key: 'home', label: 'בית', icon: Home, badge: pendingCount },
    { key: 'tasks', label: 'משימות', icon: ListChecks },
    { key: 'points', label: 'ניקוד', icon: Coins },
    { key: 'settings', label: 'הגדרות', icon: SlidersHorizontal }
  ];

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {now.simulated && tab !== 'settings' && (
        <div className="mb-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-xl p-3 text-sm font-bold">
          מצב בדיקה פעיל: יום {DAYS_HEBREW[now.day]} {pad2(now.hour)}:{pad2(now.minute)}
        </div>
      )}
      {tab === 'home' && <HomeTab data={data} now={now} onAction={onAction} />}
      {tab === 'tasks' && <TasksTab data={data} onAction={onAction} />}
      {tab === 'points' && <PointsTab data={data} onAction={onAction} />}
      {tab === 'settings' && <SettingsTab data={data} now={now} onAction={onAction} />}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] flex">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 py-3 flex flex-col items-center gap-0.5 relative ${tab === key ? 'text-blue-600' : 'text-slate-400'}`}>
            <Icon size={22} />
            <span className="text-xs font-bold">{label}</span>
            {badge > 0 && <span className="absolute top-1.5 right-[28%] bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
};
