import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithPopup, signInWithCustomToken, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  Shield, Zap, Settings, Lock, LogOut, User, BedDouble, 
  BookOpen, Backpack, Guitar, Brush, Star, Check, CheckCircle,
  Clock, Loader2, AlertTriangle, RefreshCcw, RotateCcw, Minus, Plus, Trash2,
  Sun, Moon, Cloud, ShoppingBag, List, Menu, Utensils,
  Wifi, WifiOff, Gamepad2, Sparkles, Shirt, Bath, Dog, Footprints
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

// מאגר האייקונים לבחירה
const ICON_MAP = {
  bed: { icon: BedDouble, label: 'מיטה' },
  brush: { icon: Brush, label: 'צחצוח' },
  book: { icon: BookOpen, label: 'לימודים' },
  backpack: { icon: Backpack, label: 'תיק' },
  guitar: { icon: Guitar, label: 'נגינה' },
  food: { icon: Utensils, label: 'אוכל' },
  toy: { icon: Gamepad2, label: 'צעצועים' },
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

// --- קונפיגורציה ידנית לשימוש ב-GitHub/Localhost ---
const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCpN2ExfgyJhWGhAZieXdo0G9-i3qVXPiw",
  authDomain: "homehero-f43e7.firebaseapp.com",
  projectId: "homehero-f43e7",
  storageBucket: "homehero-f43e7.firebasestorage.app",
  messagingSenderId: "542278887454",
  appId: "1:542278887454:web:60d2bdeb8e82e8d2c8260f",
  measurementId: "G-Q10D5WT1YD"
};

// --- אתחול Firebase ---
let firebaseConfig = null;
let app, auth, db;
let appId = 'family-game-v1'; // מזהה קבוע לאפליקציה בחוץ

try {
  // 1. בדיקה אם אנחנו בקאנבס (אוטומטי)
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
    if (typeof __app_id !== 'undefined') appId = __app_id;
  } 
  // 2. אחרת, נסה להשתמש בקונפיגורציה הידנית
  else if (MANUAL_FIREBASE_CONFIG.apiKey !== "PASTE_API_KEY_HERE") {
    firebaseConfig = MANUAL_FIREBASE_CONFIG;
  }

  // אתחול בפועל
  if (firebaseConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase config missing. Fill MANUAL_FIREBASE_CONFIG in the code.");
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// תיקון: הוספת 'main' בסוף הנתיב כדי שיהיה הפניה למסמך תקין (6 חלקים)
const MAIN_DOC_REF = db ? doc(db, 'artifacts', appId, 'public', 'data', 'family', 'main') : null;

// Fallback לאייקון אם לא נבחר ידנית
const getIconComponent = (iconKey, title) => {
  if (iconKey && ICON_MAP[iconKey]) {
      const Icon = ICON_MAP[iconKey].icon;
      return <Icon size={32} />;
  }
  // Fallback לפי טקסט (תמיכה לאחור)
  if (title.includes("מיטה")) return <BedDouble size={32} />;
  if (title.includes("שיניים")) return <Brush size={32} />;
  return <Star size={32} />;
};

const DAYS_HEBREW = { sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי', wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת' };
const TIME_HEBREW = { morning: 'בוקר', noon: 'צהריים', evening: 'ערב' };

const getRealTimeStatus = () => {
  const now = new Date();
  const hour = now.getHours();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let phase = 'morning';
  if (hour >= 12 && hour < 17) phase = 'noon';
  if (hour >= 17 || hour < 6) phase = 'evening';
  return { currentDay: days[now.getDay()], currentTimePhase: phase };
};
const realTime = getRealTimeStatus();

const INITIAL_DATA = { 
  familyGoal: 350, bossHP: 500, maxBossHP: 500, currentDay: realTime.currentDay, currentTimePhase: realTime.currentTimePhase,
  kids: [
    { id: 1, name: "איתמר", ageGroup: "big", color: "bg-cyan-400", lightColor: "bg-cyan-100", points: 120, lifetimePoints: 1500, inventory: { shields: 2 }, activeEffects: { doublePointsUntil: 0 }, tasks: [] },
    { id: 2, name: "רוני", ageGroup: "big", color: "bg-purple-400", lightColor: "bg-purple-100", points: 90, lifetimePoints: 800, inventory: { shields: 0 }, activeEffects: { doublePointsUntil: 0 }, tasks: [] },
    { id: 3, name: "נועם", ageGroup: "toddler", color: "bg-orange-400", lightColor: "bg-orange-100", points: 40, lifetimePoints: 200, inventory: { shields: 0 }, activeEffects: { doublePointsUntil: 0 }, tasks: [] }
  ]
};

// ==========================================
// 3. קומפוננטות UI
// ==========================================

const MainTitle = () => (
  // תיקון: הסרת הטיה ויישור למרכז ללא חפיפה
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

const BigRedButton = ({ onClick, label, iconKey }) => (
  <button 
    onClick={onClick}
    className={`w-40 h-40 rounded-full bg-red-500 ${COMIC_BORDER} shadow-[0_6px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 transition-all flex flex-col items-center justify-center text-white animate-pulse`}
  >
    <div className="transform scale-150 mb-2 text-white drop-shadow-[2px_2px_0_#000]">
        {getIconComponent(iconKey, label)}
    </div>
    <span className="text-xl font-black mt-1 leading-none text-center px-2 text-shadow-black">{label}</span>
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

// ==========================================
// 5. האפליקציה הראשית
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [errorMsg, setErrorMsg] = useState(null);

  // --- Auth & Data ---
  useEffect(() => {
    if (!auth) {
        setData(INITIAL_DATA);
        setLoading(false);
        setStatus('demo-mode');
        return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setStatus('error');
        setErrorMsg(err.message);
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
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
        setData(snap.data());
        setStatus('connected');
      } else {
        try { 
          await setDoc(docRef, INITIAL_DATA); 
        } 
        catch (err) { 
          console.error("Init Data Error:", err);
          setStatus('error'); 
          setErrorMsg(err.message); 
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Snapshot Error:", err);
      setStatus('error');
      setErrorMsg(err.message);
      setLoading(false);
    });

    return () => unsubSnap();
  }, [user]);

  // Time Auto-Update
  useEffect(() => {
    if (!data || !db) return;
    const interval = setInterval(() => {
      const now = getRealTimeStatus();
      if (now.currentDay !== data.currentDay || now.currentTimePhase !== data.currentTimePhase) {
        updateDoc(MAIN_DOC_REF, now).catch(console.error);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [data]);

  // --- Handlers ---
  const handleTaskAction = async (kidId, task, action = 'complete') => {
    if (!db) { alert("מצב דמו - הפעולה לא נשמרת"); return; }
    const newData = { ...data };
    const kid = newData.kids.find(k => k.id === kidId);
    if (!kid) return;
    
    if (action === 'complete') {
        const t = kid.tasks.find(t => t.id === task.id);
        const isDouble = kid.activeEffects?.doublePointsUntil > Date.now();
        const points = isDouble ? t.value * 2 : t.value;

        if (kid.ageGroup === 'toddler') {
            kid.points += points;
            kid.lifetimePoints += points;
            newData.bossHP = Math.max(0, newData.bossHP - points);
            t.status = 'done';
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);
        } else {
            t.status = 'pending_approval';
        }
    }
    if (action === 'buy_double' && kid.points >= 100) {
        kid.points -= 100;
        kid.activeEffects.doublePointsUntil = Date.now() + 3600000;
    }
    if (action === 'buy_shield' && kid.points >= 150) {
        kid.points -= 150;
        kid.inventory.shields++;
    }
    await updateDoc(MAIN_DOC_REF, newData);
  };

  const handleAdminAction = async (action, payload) => {
    if (!db) return;
    const newData = { ...data };
    if (action === 'approve') {
        const { kidId, taskId } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        const t = kid.tasks.find(t => t.id === taskId);
        if (!t) return;
        const isDouble = kid.activeEffects?.doublePointsUntil > Date.now();
        const points = isDouble ? t.value * 2 : t.value;
        kid.points += points;
        kid.lifetimePoints += points;
        newData.bossHP = Math.max(0, newData.bossHP - points);
        if (t.isOneTime) kid.tasks = kid.tasks.filter(task => task.id !== taskId);
        else t.status = 'done';
    } 
    else if (action === 'add_task') {
        const kid = newData.kids.find(k => k.id === parseInt(payload.targetKidId));
        if (kid) kid.tasks.push(payload.task);
    } 
    else if (action === 'reset_boss') newData.bossHP = newData.maxBossHP;
    else if (action === 'set_time') newData.currentTimePhase = payload;
    else if (action === 'set_day') newData.currentDay = payload;
    else if (action === 'sync_real_time') {
        const now = getRealTimeStatus();
        newData.currentDay = now.currentDay;
        newData.currentTimePhase = now.currentTimePhase;
    }
    else if (action === 'manage_points') {
        const { kidId, amount, mode } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        if (kid) {
            if (mode === 'reset') kid.points = 0;
            if (mode === 'add') kid.points += amount;
            if (mode === 'subtract') kid.points = Math.max(0, kid.points - amount);
        }
    }
    else if (action === 'reset_task') {
        const { kidId, taskId } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        const t = kid.tasks.find(t => t.id === taskId);
        if (t) t.status = 'open';
    }
    else if (action === 'delete_task') {
        const { kidId, taskId } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        if (kid) kid.tasks = kid.tasks.filter(t => t.id !== taskId);
    }
    await updateDoc(MAIN_DOC_REF, newData);
  };

  const handleParentLogin = async () => {
    if (!auth) { alert("הגדרות Firebase חסרות"); return; }
    try { await signInWithPopup(auth, new GoogleAuthProvider()); setShowLoginModal(false); } 
    catch (e) { alert(e.message); }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;

  if (status === 'error') return <div className="text-center p-10 text-red-600 font-bold">שגיאה: {errorMsg}</div>;

  // --- תצוגת הורים (Admin) ---
  if (user && !user.isAnonymous && ADMIN_EMAILS.includes(user.email)) {
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
             <AdminPanelContent data={data} onAction={handleAdminAction} />
          </div>
        </div>
      );
  }

  // --- תצוגת קיוסק (ילדים) ---
  return (
    <div className="min-h-screen font-comic overflow-hidden flex flex-col relative" style={BG_STYLE}>
      
      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
      {showConfetti && <div className="fixed inset-0 z-50 pointer-events-none"><Confetti active={true}/></div>}

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
           </div>
        </div>
        
        {/* תיקון: ריווח בין כותרת למדדים כדי למנוע חפיפה */}
        <div className="flex justify-between items-end gap-4 mt-4">
           <div className="flex-1 min-w-[30%]">
               <BossBar current={data.kids.reduce((a,b)=>a+b.points,0)} max={data.familyGoal} label="פיצה משפחתית" color="bg-yellow-400" />
           </div>
           {/* הכותרת ללא margin שלילי ובמרכז */}
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
        
        {/* Layer 1: Names (Z-50) - מעל הדמויות */}
        {/* הורדנו את הבועות שיהיו בגובה המותניים */}
        <div className="grid grid-cols-3 gap-0 absolute top-[-30px] md:top-[-40px] left-2 md:left-4 right-2 md:right-4 z-50 pointer-events-none">
            {/* NOAM NAME */}
            <div className="relative h-20 flex flex-col justify-end px-2">
                 <NameBubble name={data.kids[2].name} points={data.kids[2].points} />
            </div>
            {/* RONI NAME */}
            <div className="relative h-20 flex flex-col justify-end px-2">
                 <NameBubble name={data.kids[1].name} points={data.kids[1].points} />
            </div>
            {/* ITAMAR NAME */}
            <div className="relative h-20 flex flex-col justify-end px-2">
                 <NameBubble name={data.kids[0].name} points={data.kids[0].points} />
            </div>
        </div>

        {/* Layer 2: Characters (Z-40) - מתחת לשמות, מעל הגריד. מוצמדים לשמאל ומוגדלים פי 1.3 */}
        {/* דמויות מוצמדות לתחתית האבסולוטית של הרווח העליון, כלומר על הקו של הלוחות */}
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
            {/* תיקון: הזזת איתמר למרכז/צד ימין כדי למנוע חפיפה עם רוני */}
            <div className="relative h-20 flex justify-center items-end"> 
                {/* Removed pl-4, changed justify-start to justify-center. Changed origin to bottom for safe centered flipping */}
                <img src={AVATARS[1]} className="w-56 md:w-72 h-auto object-contain z-20 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform scale-x-[-1.3] scale-y-[1.3] origin-bottom" alt="Itamar" />
            </div>
        </div>

        {/* Layer 3: Main Grid Content (Z-30) - מתחת להכל */}
        <div className="grid grid-cols-3 h-full gap-0 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative z-30 pt-10">
            
            {/* NOAM COLUMN */}
            <div className="relative border-l-4 border-black p-2 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-pink-100 overflow-visible">
               <div className="flex-1 flex flex-col items-center justify-start relative z-20 w-full gap-4 mt-4">
                  {data.kids[2].tasks.filter(t => t.time === data.currentTimePhase).map(task => (
                     <BigRedButton key={task.id} label={task.title} iconKey={task.icon} onClick={() => handleTaskAction(3, task, 'complete')} />
                  ))}
               </div>
            </div>

            {/* RONI COLUMN */}
            <div className="relative border-l-4 border-black p-2 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-purple-100 overflow-visible">
               <div className="flex-1 w-full relative z-20 space-y-3 overflow-y-auto mt-4">
                  {data.kids[1].tasks.filter(t => t.time === data.currentTimePhase && t.status === 'open' && t.days.includes(data.currentDay)).map(task => (
                     <TaskItem key={task.id} title={task.title} points={kid => kid.activeEffects.doublePointsUntil > Date.now() ? task.value * 2 : task.value} iconKey={task.icon} onClick={() => handleTaskAction(2, task, 'complete')} />
                  ))}
               </div>
            </div>

            {/* ITAMAR COLUMN */}
            <div className="relative p-2 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-blue-100 overflow-visible">
               <div className="flex-1 w-full relative z-20 space-y-3 overflow-y-auto mt-4">
                  {data.kids[0].tasks.filter(t => t.time === data.currentTimePhase && t.status === 'open' && t.days.includes(data.currentDay)).map(task => (
                     <TaskItem key={task.id} title={task.title} points={kid => kid.activeEffects.doublePointsUntil > Date.now() ? task.value * 2 : task.value} iconKey={task.icon} onClick={() => handleTaskAction(1, task, 'complete')} />
                  ))}
               </div>
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
        ) : status === 'demo-mode' ? (
          <><WifiOff size={12} className="text-gray-500"/> <span className="text-gray-600">Demo (Local)</span></>
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
const AdminPanelContent = ({ data, onAction }) => {
  const [newTask, setNewTask] = useState({ 
      title: '', value: 10, time: data.currentTimePhase, isOneTime: false, targetKidId: data.kids[0]?.id, days: [data.currentDay], icon: 'star'
  });
  const [pointsManager, setPointsManager] = useState({ kidId: data.kids[0]?.id, amount: 10 });
  const [selectedKidForView, setSelectedKidForView] = useState(data.kids[0]?.id);

  const toggleDay = (dayKey) => {
      setNewTask(prev => ({
          ...prev, days: prev.days.includes(dayKey) ? prev.days.filter(d => d !== dayKey) : [...prev.days, dayKey]
      }));
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-10">
      
      {/* מעקב משימות */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">מעקב משימות</h3>
        <div className="mb-4">
            <select className="w-full p-2 rounded-lg border border-slate-300" value={selectedKidForView} onChange={(e) => setSelectedKidForView(parseInt(e.target.value))}>
                {data.kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.kids.find(k => k.id === selectedKidForView)?.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                        {getIconComponent(task.icon, task.title)}
                        <div>
                            <div className="font-bold text-slate-700 flex items-center gap-2">
                                {task.title}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${task.status === 'done' ? 'bg-green-100 text-green-700' : task.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {task.status === 'done' ? 'בוצע' : task.status === 'pending_approval' ? 'ממתין' : 'פתוח'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500">
                                {task.value} נק' • {TIME_HEBREW[task.time]}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {task.status !== 'open' && (
                            <button onClick={() => onAction('reset_task', { kidId: selectedKidForView, taskId: task.id })} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><RotateCcw size={16} /></button>
                        )}
                        <button onClick={() => { if(window.confirm('למחוק?')) onAction('delete_task', { kidId: selectedKidForView, taskId: task.id }) }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* הוספת משימה */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">הוספת משימה</h3>
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-blue-800 mb-1">שם המשימה</label>
              <input type="text" className="w-full p-2 rounded-lg border border-blue-200" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            
            <div className="col-span-2">
                <label className="block text-xs font-bold text-blue-800 mb-2">בחר אייקון</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {Object.entries(ICON_MAP).map(([key, { icon: Icon, label }]) => (
                        <button 
                            key={key}
                            onClick={() => setNewTask({...newTask, icon: key})}
                            className={`flex flex-col items-center p-2 rounded-lg border-2 min-w-[60px] ${newTask.icon === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                        >
                            <Icon size={24} />
                            <span className="text-[10px] mt-1">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-800 mb-1">עבור ילד</label>
              <select className="w-full p-2 rounded-lg border border-blue-200" value={newTask.targetKidId} onChange={e => setNewTask({...newTask, targetKidId: e.target.value})}>
                {data.kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-800 mb-1">זמן</label>
              <select className="w-full p-2 rounded-lg border border-blue-200" value={newTask.time} onChange={e => setNewTask({...newTask, time: e.target.value})}>
                <option value="morning">בוקר</option>
                <option value="noon">צהריים</option>
                <option value="evening">ערב</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-800 mb-1">ניקוד</label>
              <input type="number" className="w-full p-2 rounded-lg border border-blue-200" value={newTask.value} onChange={e => setNewTask({...newTask, value: parseInt(e.target.value)})} />
            </div>
            <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                <label className="block text-xs font-bold text-blue-800 mb-2">ימי הופעה</label>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(DAYS_HEBREW).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={newTask.days.includes(key)} onChange={() => toggleDay(key)} className="w-4 h-4 rounded text-blue-600" />
                            <span className="text-sm text-blue-700">{label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <button 
              onClick={() => {
                if (!newTask.title) return;
                onAction('add_task', {
                  targetKidId: newTask.targetKidId,
                  task: {
                    id: 't' + Date.now(),
                    title: newTask.title,
                    value: newTask.value,
                    time: newTask.time,
                    status: 'open',
                    isOneTime: newTask.isOneTime,
                    days: newTask.days,
                    icon: newTask.icon
                  }
                });
                setNewTask(prev => ({ ...prev, title: '' }));
              }}
              className="col-span-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md"
            >
              + הוסף משימה
            </button>
        </div>
      </section>
      
      {/* אישור משימות + ניהול ניקוד + סימולטור (כמו קודם) */}
       <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">אישור משימות</h3>
        <div className="space-y-2">
          {data.kids.map(kid => (
            kid.tasks.filter(t => t.status === 'pending_approval').map(t => (
              <div key={t.id} className="flex items-center justify-between bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                  <span className="font-bold text-slate-700">{kid.name}: {t.title} ({t.value})</span>
                  <button onClick={() => onAction('approve', { kidId: kid.id, taskId: t.id })} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-600 flex items-center gap-2">
                    <CheckCircle size={16} /> אשר
                  </button>
              </div>
            ))
          ))}
           {data.kids.every(k => k.tasks.filter(t => t.status === 'pending_approval').length === 0) && (
            <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-400 italic">אין משימות הממתינות לאישור</div>
          )}
        </div>
      </section>

       <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">ניהול ניקוד</h3>
          <div className="grid grid-cols-2 gap-4 items-end">
             <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">בחר ילד</label>
                 <select className="w-full p-2 rounded-lg border border-slate-300" value={pointsManager.kidId} onChange={e => setPointsManager({...pointsManager, kidId: parseInt(e.target.value)})}>
                    {data.kids.map(k => <option key={k.id} value={k.id}>{k.name} ({k.points} נק')</option>)}
                 </select>
             </div>
             <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">כמות</label>
                 <input type="number" className="w-full p-2 rounded-lg border border-slate-300" value={pointsManager.amount} onChange={e => setPointsManager({...pointsManager, amount: parseInt(e.target.value)})}/>
             </div>
             <div className="col-span-2 flex gap-2 mt-2">
                 <button onClick={() => onAction('manage_points', { kidId: pointsManager.kidId, amount: pointsManager.amount, mode: 'subtract' })} className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-bold hover:bg-red-200 flex justify-center gap-2"><Minus size={16}/> הורד</button>
                 <button onClick={() => onAction('manage_points', { kidId: pointsManager.kidId, amount: 0, mode: 'reset' })} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 flex justify-center gap-2"><RefreshCcw size={16}/> אפס</button>
                 <button onClick={() => onAction('manage_points', { kidId: pointsManager.kidId, amount: pointsManager.amount, mode: 'add' })} className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-bold hover:bg-green-200 flex justify-center gap-2"><Plus size={16}/> הוסף</button>
             </div>
          </div>
      </section>

      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">סימולטור זמן</h3>
             <button onClick={() => onAction('sync_real_time')} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 flex items-center gap-1 font-bold"><RotateCcw size={12}/> סנכרן לאמת</button>
          </div>
          <div className="flex gap-4 flex-wrap">
            <select value={data.currentTimePhase} onChange={(e) => onAction('set_time', e.target.value)} className="p-2 rounded-lg border border-slate-300">
              <option value="morning">בוקר</option>
              <option value="noon">צהריים</option>
              <option value="evening">ערב</option>
            </select>
            <select value={data.currentDay} onChange={(e) => onAction('set_day', e.target.value)} className="p-2 rounded-lg border border-slate-300">
              {Object.entries(DAYS_HEBREW).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <button onClick={() => onAction('reset_boss')} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 text-sm ml-auto">איפוס בוס</button>
          </div>
      </section>
    </div>
  );
};