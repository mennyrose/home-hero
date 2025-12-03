import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  Shield, 
  Zap, 
  CheckCircle, 
  Clock, 
  Settings, 
  Star,
  Heart,
  Pizza,
  Sun,
  Moon,
  Cloud,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Lock,
  LogOut,
  User,
  Ban,
  Plus,
  Minus,
  RefreshCcw,
  Trash2,
  FileKey
} from 'lucide-react';

// ==========================================
// 1. הגדרות אבטחה
// ==========================================
const ADMIN_EMAILS = [
  "mennyr@gmail.com", 
  "reulita10@gmail.com"
];

// ==========================================
// 2. הגדרות Firebase - משתני סביבה (Production Ready)
// ==========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// --- אתחול המערכת ובדיקת תקינות ---
let app, auth, db;
let configError = null;

try {
  // בדיקה שכל המפתחות קיימים
  if (!firebaseConfig.apiKey) {
    throw new Error("Missing Firebase Configuration in .env file");
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error:", e);
  configError = e.message;
}

const MAIN_DOC_REF = db ? doc(db, 'families', 'myFamily') : null;

// --- עזרים לזמן ---
const DAYS_HEBREW = {
  sunday: 'ראשון',
  monday: 'שני',
  tuesday: 'שלישי',
  wednesday: 'רביעי',
  thursday: 'חמישי',
  friday: 'שישי',
  saturday: 'שבת'
};

const TIME_HEBREW = {
  morning: 'בוקר',
  noon: 'צהריים',
  evening: 'ערב'
};

// פונקציה לחישוב הזמן האמיתי עכשיו
const getRealTimeStatus = () => {
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = now.getDay(); // 0 = Sunday
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[dayIndex];
  
  let currentTimePhase = 'morning'; // ברירת מחדל (06:00-12:00)
  if (hour >= 12 && hour < 17) currentTimePhase = 'noon'; // 12:00-17:00
  if (hour >= 17 || hour < 6) currentTimePhase = 'evening'; // 17:00-06:00
  
  return { currentDay, currentTimePhase };
};

const realTime = getRealTimeStatus();

// נתונים התחלתיים
const INITIAL_DATA = {
  familyGoal: 350,
  bossHP: 500,
  maxBossHP: 500,
  currentDay: realTime.currentDay,
  currentTimePhase: realTime.currentTimePhase,
  kids: [
    {
      id: 1,
      name: "איתמר",
      ageGroup: "big",
      color: "bg-blue-500",
      lightColor: "bg-blue-100",
      points: 120,
      lifetimePoints: 1500,
      inventory: { shields: 2 },
      activeEffects: { doublePointsUntil: 0 },
      tasks: []
    },
    {
      id: 2,
      name: "רוני",
      ageGroup: "big",
      color: "bg-purple-500",
      lightColor: "bg-purple-100",
      points: 90,
      lifetimePoints: 800,
      inventory: { shields: 0 },
      activeEffects: { doublePointsUntil: 0 },
      tasks: []
    },
    {
      id: 3,
      name: "נועם",
      ageGroup: "toddler",
      color: "bg-pink-500",
      lightColor: "bg-pink-100",
      points: 40,
      lifetimePoints: 200,
      inventory: { shields: 0 },
      activeEffects: { doublePointsUntil: 0 },
      tasks: []
    }
  ]
};

// --- רכיבי תצוגה ---

const ProgressBar = ({ current, max, colorClass, icon: Icon, label }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-sm font-bold mb-1 text-slate-700">
        <span className="flex items-center gap-2">{Icon && <Icon size={18} />} {label}</span>
        <span>{current} / {max}</span>
      </div>
      <div className="h-6 w-full bg-slate-200 rounded-full overflow-hidden border-2 border-slate-300 shadow-inner">
        <div 
          className={`h-full ${colorClass} transition-all duration-500 flex items-center justify-center text-xs text-white font-bold shadow-lg`}
          style={{ width: `${percent}%` }}
        >
          {percent > 10 && `${Math.round(percent)}%`}
        </div>
      </div>
    </div>
  );
};

const Confetti = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="absolute animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${0.5 + Math.random()}s`,
            fontSize: `${20 + Math.random() * 30}px`
          }}
        >
          {['⭐', '✨', '🎉', '🎈'][Math.floor(Math.random() * 4)]}
        </div>
      ))}
    </div>
  );
};

const ParentLogin = ({ onLogin }) => (
  <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-300">
    <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto text-blue-600">
      <User size={32} />
    </div>
    <div>
      <h3 className="text-xl font-bold text-slate-800 mb-1">כניסת הורים</h3>
      <p className="text-sm text-slate-500">התחבר עם Google כדי לנהל את המשימות</p>
    </div>
    <button 
      onClick={onLogin}
      className="bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors font-bold shadow-lg"
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="" />
      התחברות באמצעות Google
    </button>
  </div>
);

// --- האפליקציה הראשית ---

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('connecting'); 
  const [errorMsg, setErrorMsg] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // בדיקת קונפיגורציה לפני הכל
  if (configError) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 text-center font-sans" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg border-2 border-red-200">
          <FileKey className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">חסרות הגדרות מערכת</h1>
          <p className="text-slate-600 mb-6">
            נראה שלא הוגדר קובץ <code>.env</code> בפרויקט שלך, או שהפרטים בתוכו חסרים.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-xs font-mono text-slate-500 mb-4 dir-ltr overflow-auto">
            VITE_FIREBASE_API_KEY=...<br/>
            VITE_FIREBASE_AUTH_DOMAIN=...<br/>
            (see instructions)
          </div>
          <p className="text-sm text-blue-600">עקוב אחרי הוראות ההתקנה בצ'אט כדי להמשיך.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        subscribeToData();
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous auth failed:", error);
          setStatus('error');
          setErrorMsg("שגיאת התחברות: " + error.message);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // מנגנון עדכון זמן אמת
  useEffect(() => {
    if (!data) return;

    const checkTime = () => {
      const now = getRealTimeStatus();
      // אם הזמן השתנה לעומת מה ששמור בדאטהבייס - נעדכן
      if (now.currentDay !== data.currentDay || now.currentTimePhase !== data.currentTimePhase) {
        console.log("Updating time to real-time:", now);
        saveData({ ...data, ...now });
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [data]); 

  const subscribeToData = () => {
    setStatus('loading_data');
    if (!MAIN_DOC_REF) return;

    const unsubscribeSnapshot = onSnapshot(MAIN_DOC_REF, async (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        setData(snapshot.data());
        setStatus('connected');
      } else {
        try {
          await setDoc(MAIN_DOC_REF, INITIAL_DATA);
        } catch (err) {
          setStatus('error');
          setErrorMsg("שגיאה ביצירת נתונים: " + err.message);
        }
      }
    }, (err) => {
      setStatus('error');
      setErrorMsg("שגיאת קריאה: " + err.message);
      setLoading(false);
    });
    return unsubscribeSnapshot;
  };

  const handleParentLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (error) {
      alert("שגיאה בהתחברות: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const saveData = async (newData) => {
    setData(newData); 
    try {
      await updateDoc(MAIN_DOC_REF, newData);
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  // --- לוגיקת המשחק (ילדים) ---

  const handleTaskClick = async (kidId, task) => {
    if (task.status !== 'open') return;
    const newData = { ...data };
    const kid = newData.kids.find(k => k.id === kidId);
    if (!kid) return;
    const t = kid.tasks.find(t => t.id === task.id);
    const isDouble = kid.activeEffects?.doublePointsUntil > Date.now();
    const points = isDouble ? t.value * 2 : t.value;
    
    if (kid.ageGroup === 'toddler') {
      kid.points += points;
      kid.lifetimePoints += points;
      newData.bossHP = Math.max(0, newData.bossHP - points);
      t.status = 'done';
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } else {
      t.status = 'pending_approval';
    }
    await saveData(newData);
  };

  const buyDouble = async (kidId) => {
    const newData = { ...data };
    const kid = newData.kids.find(k => k.id === kidId);
    if (kid.points >= 100) {
      kid.points -= 100;
      kid.activeEffects.doublePointsUntil = Date.now() + 3600000;
      await saveData(newData);
    }
  };

  const buyShield = async (kidId) => {
    const newData = { ...data };
    const kid = newData.kids.find(k => k.id === kidId);
    if (kid.points >= 150) {
      kid.points -= 150;
      kid.inventory.shields += 1;
      await saveData(newData);
    }
  };

  const useShield = async (kidId, taskId) => {
    const newData = { ...data };
    const kid = newData.kids.find(k => k.id === kidId);
    const t = kid.tasks.find(t => t.id === taskId);
    if (kid.inventory.shields > 0 && t.status === 'open') {
      kid.inventory.shields--;
      const points = Math.floor(t.value * 0.5);
      kid.points += points;
      kid.lifetimePoints += points;
      newData.bossHP = Math.max(0, newData.bossHP - points);
      t.status = 'skipped';
      await saveData(newData);
    }
  };

  // --- לוגיקת הורים (Admin) ---

  const handleAdminAction = async (action, payload) => {
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
    
    } else if (action === 'add_task') {
        const kid = newData.kids.find(k => k.id === parseInt(payload.targetKidId));
        if (kid) {
            kid.tasks.push(payload.task);
        }
    
    } else if (action === 'reset_boss') {
        newData.bossHP = newData.maxBossHP;
    
    } else if (action === 'set_time') {
        newData.currentTimePhase = payload;
    
    } else if (action === 'set_day') {
        newData.currentDay = payload;
    
    } else if (action === 'sync_real_time') {
        const now = getRealTimeStatus();
        newData.currentDay = now.currentDay;
        newData.currentTimePhase = now.currentTimePhase;

    } else if (action === 'manage_points') {
        const { kidId, amount, mode } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        if (kid) {
            if (mode === 'reset') kid.points = 0;
            if (mode === 'add') kid.points += amount;
            if (mode === 'subtract') kid.points = Math.max(0, kid.points - amount);
        }
    } else if (action === 'reset_task') {
        const { kidId, taskId } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        const t = kid.tasks.find(t => t.id === taskId);
        if (t) t.status = 'open';
    } else if (action === 'delete_task') {
        const { kidId, taskId } = payload;
        const kid = newData.kids.find(k => k.id === kidId);
        if (kid) kid.tasks = kid.tasks.filter(t => t.id !== taskId);
    }
    
    await saveData(newData);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 text-slate-500" dir="rtl">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p>טוען נתונים...</p>
    </div>
  );

  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-600 p-8 text-center" dir="rtl">
      <AlertTriangle className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-bold">שגיאה במערכת</h2>
      <p className="mb-4">{errorMsg}</p>
      <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-lg">רענן</button>
    </div>
  );

  // תצוגת הורים (Admin View)
  if (user && !user.isAnonymous) {
    if (!ADMIN_EMAILS.includes(user.email)) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
               <Ban size={32} />
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">אין גישה</h2>
             <p className="text-slate-600 mb-6">
               האימייל <strong>{user.email}</strong> אינו מופיע ברשימת המנהלים המורשים.
             </p>
             <button onClick={handleLogout} className="bg-slate-800 text-white px-6 py-3 rounded-xl w-full hover:bg-slate-700">
               יציאה
             </button>
           </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 pb-20" dir="rtl">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
             <Settings />
             <div>
               <h1 className="text-xl font-bold">פאנל ניהול הורים</h1>
               <div className="text-xs opacity-70">מחובר כ: {user.email}</div>
             </div>
          </div>
          <button onClick={handleLogout} className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 flex items-center gap-2">
            <LogOut size={14}/> יציאה לקיוסק
          </button>
        </div>
        <div className="p-4">
           <AdminPanelContent data={data} onAction={handleAdminAction} />
        </div>
      </div>
    );
  }

  // תצוגת קיוסק לילדים
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans" dir="rtl">
      <Confetti active={showConfetti} />
      
      <button 
        onClick={() => setShowLoginModal(true)}
        className="fixed bottom-6 left-6 z-50 bg-white/80 hover:bg-white p-4 rounded-full shadow-lg text-slate-500 hover:text-blue-600 transition-all border border-slate-200"
        title="כניסת הורים"
      >
        <Lock size={24} />
      </button>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="relative w-full max-w-sm">
             <button onClick={() => setShowLoginModal(false)} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-md hover:bg-slate-100 z-10">✕</button>
             <ParentLogin onLogin={handleParentLogin} />
           </div>
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <ProgressBar current={data.bossHP} max={data.maxBossHP} colorClass="bg-red-500" icon={Heart} label="מפלצת הבלגן" />
            </div>
            <div className="hidden md:block bg-yellow-400 px-4 py-1 transform -skew-x-12 border-2 border-black shadow-[3px_3px_0px_black] font-black text-xl">
              גיבורי הבית
            </div>
            <div className="flex-1">
               <ProgressBar current={data.kids.reduce((a, b) => a + b.points, 0)} max={data.familyGoal} colorClass="bg-yellow-400" icon={Pizza} label="פיצה משפחתית" />
            </div>
          </div>
          <div className="flex justify-center mt-2">
             <div className="bg-slate-100 px-4 py-1 rounded-full text-xs font-bold text-slate-500 flex items-center gap-3 shadow-sm border border-slate-200">
                <span className="flex items-center gap-1">
                  {data.currentTimePhase === 'morning' ? <Sun size={14} className="text-orange-500"/> : data.currentTimePhase === 'noon' ? <Cloud size={14} className="text-blue-400"/> : <Moon size={14} className="text-indigo-600"/>}
                  {TIME_HEBREW[data.currentTimePhase]}
                </span>
                <span className="w-px h-3 bg-slate-300"></span>
                <span>יום {DAYS_HEBREW[data.currentDay] || data.currentDay}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {data.bossHP === 0 && (
          <div className="mb-8 bg-green-100 border-2 border-green-500 text-green-800 p-6 rounded-2xl text-center shadow-lg animate-bounce">
            <h2 className="text-3xl font-black mb-2">🎉 המפלצת הובסה!</h2>
            <p className="text-lg font-medium">כל הכבוד גיבורים! הרווחתם ערב פיצה!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.kids.map(kid => (
            <div key={kid.id} className={`bg-white rounded-3xl border-4 ${kid.color.replace('bg-', 'border-')} shadow-lg overflow-hidden flex flex-col`}>
              <div className={`${kid.lightColor} p-4 text-center border-b border-slate-100`}>
                 <div className={`w-16 h-16 mx-auto rounded-full ${kid.color} border-4 border-white shadow-md flex items-center justify-center text-white text-2xl font-bold mb-2`}>
                   {kid.name[0]}
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">{kid.name}</h2>
                 <div className="flex justify-center gap-3 mt-2">
                    <div className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" /> {kid.points}
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      רמה {Math.floor(kid.lifetimePoints / 100)}
                    </div>
                 </div>
                 {kid.ageGroup !== 'toddler' && (
                   <div className="flex justify-center gap-2 mt-3">
                      {/* כפתור דאבל */}
                      <button 
                        onClick={() => buyDouble(kid.id)}
                        disabled={kid.points < 100}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all ${kid.activeEffects.doublePointsUntil > Date.now() ? 'bg-yellow-100 border-yellow-400 animate-pulse text-yellow-600' : 'bg-white border-slate-200 text-slate-400'}`}
                        title="קנה דאבל (100 נק')"
                      >
                        <Zap size={18} fill={kid.activeEffects.doublePointsUntil > Date.now() ? "currentColor" : "none"} />
                      </button>
                      
                      {/* מגן + כפתור רכישה */}
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 bg-white border-slate-200 text-blue-500 relative group">
                        <Shield size={18} fill={kid.inventory.shields > 0 ? "currentColor" : "none"} />
                        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                          {kid.inventory.shields}
                        </span>
                        
                        {/* כפתור קניית מגן שמופיע בהובר */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); buyShield(kid.id); }}
                            className="absolute -bottom-8 bg-green-500 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap disabled:opacity-50"
                            disabled={kid.points < 150}
                        >
                            + קנה (150)
                        </button>
                      </div>
                   </div>
                 )}
              </div>

              <div className="flex-1 p-3 space-y-3 bg-slate-50 min-h-[300px]">
                {kid.tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && t.time === data.currentTimePhase && t.days.includes(data.currentDay)).map(task => (
                  <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-bold text-slate-700">{task.title}</span>
                       <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">
                         {kid.activeEffects.doublePointsUntil > Date.now() ? task.value * 2 : task.value} נק'
                       </span>
                    </div>
                    {task.status === 'pending_approval' ? (
                      <div className="w-full py-2 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 border border-yellow-100">
                        <Clock size={12}/> ממתין לאישור
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleTaskClick(kid.id, task)}
                          className={`flex-1 py-2 rounded-lg text-white font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 ${kid.color}`}
                        >
                          {kid.ageGroup === 'toddler' ? <Star size={14} className="animate-spin-slow"/> : <CheckCircle size={14}/>}
                          {kid.ageGroup === 'toddler' ? 'סיימתי!' : 'בוצע'}
                        </button>
                        {kid.ageGroup !== 'toddler' && kid.inventory.shields > 0 && (
                          <button onClick={() => useShield(kid.id, task.id)} className="px-3 bg-blue-50 text-blue-500 rounded-lg border border-blue-100">
                             <Shield size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {kid.tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && t.time === data.currentTimePhase && t.days.includes(data.currentDay)).length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-2xl mb-2">😴</div>
                    <div className="text-sm font-bold text-slate-500">אין משימות לזמן זה</div>
                    <div className="text-xs bg-slate-100 p-2 rounded mt-2 inline-block text-slate-400">
                        מוצג עבור: <br/>
                        {DAYS_HEBREW[data.currentDay]} - {TIME_HEBREW[data.currentTimePhase]}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      
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

const AdminPanelContent = ({ data, onAction }) => {
  // תיקון: הגדרת ברירות מחדל לפי מצב הסימולטור הנוכחי
  const [newTask, setNewTask] = useState({ 
      title: '', 
      value: 10, 
      time: data.currentTimePhase, // ברירת מחדל: הזמן הנוכחי בסימולטור
      isOneTime: false, 
      targetKidId: data.kids[0]?.id,
      days: [data.currentDay] // ברירת מחדל: היום הנוכחי בסימולטור
  });

  const [pointsManager, setPointsManager] = useState({ kidId: data.kids[0]?.id, amount: 10 });
  const [selectedKidForView, setSelectedKidForView] = useState(data.kids[0]?.id);

  const toggleDay = (dayKey) => {
      setNewTask(prev => {
          const newDays = prev.days.includes(dayKey) 
              ? prev.days.filter(d => d !== dayKey)
              : [...prev.days, dayKey];
          return { ...prev, days: newDays };
      });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 1. אישור משימות */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">אישור משימות</h3>
        <div className="space-y-2">
          {data.kids.map(kid => (
            kid.tasks.filter(t => t.status === 'pending_approval').map(t => (
              <div key={t.id} className="flex items-center justify-between bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                  <span className="font-bold text-slate-700">{kid.name}: {t.title} ({t.value})</span>
                  <button 
                    onClick={() => onAction('approve', { kidId: kid.id, taskId: t.id })}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-600 flex items-center gap-2"
                  >
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

      {/* 2. ניהול ניקוד */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">ניהול ניקוד</h3>
          <div className="grid grid-cols-2 gap-4 items-end">
             <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">בחר ילד</label>
                 <select 
                    className="w-full p-2 rounded-lg border border-slate-300"
                    value={pointsManager.kidId}
                    onChange={e => setPointsManager({...pointsManager, kidId: parseInt(e.target.value)})}
                 >
                    {data.kids.map(k => <option key={k.id} value={k.id}>{k.name} ({k.points} נק')</option>)}
                 </select>
             </div>
             <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">כמות לשינוי</label>
                 <input 
                    type="number" 
                    className="w-full p-2 rounded-lg border border-slate-300"
                    value={pointsManager.amount}
                    onChange={e => setPointsManager({...pointsManager, amount: parseInt(e.target.value)})}
                 />
             </div>
             <div className="col-span-2 flex gap-2 mt-2">
                 <button 
                    onClick={() => onAction('manage_points', { kidId: pointsManager.kidId, amount: pointsManager.amount, mode: 'subtract' })}
                    className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-bold hover:bg-red-200 flex justify-center gap-2"
                 >
                    <Minus size={16}/> הורד ניקוד
                 </button>
                 <button 
                    onClick={() => onAction('manage_points', { kidId: pointsManager.kidId, amount: 0, mode: 'reset' })}
                    className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 flex justify-center gap-2"
                 >
                    <RefreshCcw size={16}/> אפס הכל
                 </button>
                 <button 
                    onClick={() => onAction('manage_points', { kidId: pointsManager.kidId, amount: pointsManager.amount, mode: 'add' })}
                    className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-bold hover:bg-green-200 flex justify-center gap-2"
                 >
                    <Plus size={16}/> הוסף בונוס
                 </button>
             </div>
          </div>
      </section>

      {/* 3. מעקב משימות (חדש) */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">מעקב משימות</h3>
        
        <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 mb-1">בחר ילד לצפייה</label>
            <select 
                className="w-full p-2 rounded-lg border border-slate-300"
                value={selectedKidForView}
                onChange={(e) => setSelectedKidForView(parseInt(e.target.value))}
            >
                {data.kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.kids.find(k => k.id === selectedKidForView)?.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                        <div className="font-bold text-slate-700 flex items-center gap-2">
                            {task.title}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                task.status === 'done' ? 'bg-green-100 text-green-700' :
                                task.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-slate-200 text-slate-600'
                            }`}>
                                {task.status === 'done' ? 'בוצע' : task.status === 'pending_approval' ? 'ממתין' : 'פתוח'}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500">
                            {task.value} נק' • {TIME_HEBREW[task.time]} • {task.isOneTime ? 'חד פעמי' : 'קבוע'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {task.status !== 'open' && (
                            <button 
                                onClick={() => onAction('reset_task', { kidId: selectedKidForView, taskId: task.id })}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="החזר לביצוע (סטטוס פתוח)"
                            >
                                <RotateCcw size={16} />
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if(window.confirm('למחוק את המשימה לצמיתות?')) 
                                    onAction('delete_task', { kidId: selectedKidForView, taskId: task.id })
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="מחק משימה"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            {data.kids.find(k => k.id === selectedKidForView)?.tasks.length === 0 && (
                <div className="text-center text-slate-400 py-4">אין משימות לילד זה</div>
            )}
        </div>
      </section>

      {/* 4. סימולטור */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">סימולטור זמן (לבדיקה)</h3>
             <button 
               onClick={() => onAction('sync_real_time')}
               className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 flex items-center gap-1 font-bold"
             >
               <RotateCcw size={12}/> סנכרן לזמן אמת
             </button>
          </div>
          <div className="flex gap-4 flex-wrap">
            <select 
              value={data.currentTimePhase} 
              onChange={(e) => onAction('set_time', e.target.value)}
              className="p-2 rounded-lg border border-slate-300"
            >
              <option value="morning">בוקר</option>
              <option value="noon">צהריים</option>
              <option value="evening">ערב</option>
            </select>
            <select 
              value={data.currentDay} 
              onChange={(e) => onAction('set_day', e.target.value)}
              className="p-2 rounded-lg border border-slate-300"
            >
              {Object.entries(DAYS_HEBREW).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button 
              onClick={() => onAction('reset_boss')}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 text-sm ml-auto"
            >
              איפוס בוס
            </button>
          </div>
      </section>

      {/* 5. הוספת משימה */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider border-b pb-2">הוספת משימה חדשה</h3>
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-blue-800 mb-1">שם המשימה</label>
              <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-blue-200"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-blue-800 mb-1">עבור ילד</label>
              <select 
                className="w-full p-2 rounded-lg border border-blue-200"
                value={newTask.targetKidId}
                onChange={e => setNewTask({...newTask, targetKidId: e.target.value})}
              >
                {data.kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-800 mb-1">זמן ביום</label>
              <select 
                className="w-full p-2 rounded-lg border border-blue-200"
                value={newTask.time}
                onChange={e => setNewTask({...newTask, time: e.target.value})}
              >
                <option value="morning">בוקר</option>
                <option value="noon">צהריים</option>
                <option value="evening">ערב</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-800 mb-1">ניקוד</label>
              <input 
                type="number" 
                className="w-full p-2 rounded-lg border border-blue-200"
                value={newTask.value}
                onChange={e => setNewTask({...newTask, value: parseInt(e.target.value)})}
              />
            </div>

            {/* בחירת ימים */}
            <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                <label className="block text-xs font-bold text-blue-800 mb-2">ימי הופעה</label>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(DAYS_HEBREW).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={newTask.days.includes(key)}
                                onChange={() => toggleDay(key)}
                                className="w-4 h-4 rounded text-blue-600"
                            />
                            <span className="text-sm text-blue-700">{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-blue-600"
                  checked={newTask.isOneTime}
                  onChange={e => setNewTask({...newTask, isOneTime: e.target.checked})}
                />
                <span className="text-sm font-bold text-blue-800">זו משימה חד פעמית?</span>
              </label>
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
                    days: newTask.days
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
    </div>
  );
};