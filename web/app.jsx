/**
 * ==============================================================================
 * PHARMARACK REACT APPLICATION
 * 100% React 18 Implementation of PharmaRack Android System Architecture
 * 
 * Includes:
 * - Full Authentication & Role Management (Admin & Worker)
 * - Guaranteed Working Admin Dashboard with on-the-fly Mode Switcher
 * - 25 Racks Matrix (Rack 1 (A) to Rack 25 (Y, Z))
 * - Realtime Hardware LED Triggering (Firebase /racks/rack_X/opened & /active_rack)
 * - Worker Flow: Taking medicine only (Pick 1 Tablet / Custom Qty)
 * - Admin Flow: Add Medicine (Letter validated), Low Stock Refill, User Management, Edit/Delete
 * ==============================================================================
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyD2woTELcOFNesVLWtNaqgimq0FlPKvaKA",
  authDomain: "smartpharmarack.firebaseapp.com",
  databaseURL: "https://smartpharmarack-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartpharmarack",
  storageBucket: "smartpharmarack.firebasestorage.app",
  messagingSenderId: "438675377207",
  appId: "1:438675377207:web:3dc7cce0b45ca328cd83b2"
};

const LED_COLORS = [
  { label: "Green (Default)", value: "#00FF00" },
  { label: "Red", value: "#FF0000" },
  { label: "Blue", value: "#0000FF" },
  { label: "Yellow", value: "#FFFF00" },
  { label: "Magenta", value: "#FF00FF" },
  { label: "Cyan", value: "#00FFFF" },
  { label: "Orange", value: "#FF8000" },
  { label: "Purple", value: "#8000FF" },
  { label: "Pink", value: "#FF007F" },
  { label: "White", value: "#FFFFFF" }
];

// Material Vector Icon Registry (1:1 Android Vector Drawable Parity — zero emojis)
const ICON_PATHS = {
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  slots: "M19 5v14H5V5H19m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z",
  users: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  led: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
  check: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
};

function AppIcon({ name, size = 20, color = "currentColor", style = {} }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

// Initialize Primary Firebase Instance
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();

// Polyfill setValue on Firebase Web SDK Reference for 100% Android SDK parity
try {
  const dummyRef = db.ref();
  const refProto = Object.getPrototypeOf(dummyRef);
  if (refProto && !refProto.setValue) {
    refProto.setValue = function (val, onComplete) {
      return this.set(val, onComplete);
    };
  }
} catch (e) {
  console.warn("Polyfill notice:", e);
}

// 2. RACK UTILITIES (com.simats.pharmaRack.utils.RackUtils)
const RackUtils = {
  getRacks: () => {
    const racks = [];
    for (let i = 0; i < 24; i++) {
      const letter = String.fromCharCode(65 + i);
      racks.push(`Rack ${i + 1} (${letter})`);
    }
    racks.push("Rack 25 (Y, Z)");
    return racks;
  },

  getRackNumber: (rackName) => {
    if (rackName === null || rackName === undefined || rackName === "") return 0;
    if (typeof rackName === "number") return isNaN(rackName) ? 0 : Math.trunc(rackName);
    const str = String(rackName).trim();
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  },

  getRackNumberFromMedicine: (medicine) => {
    if (!medicine) return 0;
    const byRackNum = parseInt(medicine.rackNumber, 10);
    if (!isNaN(byRackNum) && byRackNum > 0) return byRackNum;
    const byRackStr = RackUtils.getRackNumber(medicine.rack);
    if (byRackStr > 0) return byRackStr;
    if (medicine.name) {
      const ch = medicine.name.trim().charAt(0).toUpperCase();
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 88) return code - 64;
      if (code === 89 || code === 90) return 25;
    }
    return 0;
  },

  getAllowedLetters: (rackName) => {
    if (!rackName) return [];
    const str = String(rackName);
    if (!str.includes("(") || !str.includes(")")) return [];
    const inside = str.substring(str.indexOf("(") + 1, str.indexOf(")"));
    return inside.split(",").map(s => s.trim().toUpperCase());
  },

  formatRackDisplay: (rack, rackNumber) => {
    if (typeof rack === "string" && rack.startsWith("Rack ")) {
      return rack;
    }
    const num = rackNumber || parseInt(rack) || 0;
    if (num >= 1 && num <= 24) {
      const letter = String.fromCharCode(65 + num - 1);
      return `Rack ${num} (${letter})`;
    } else if (num === 25) {
      return "Rack 25 (Y, Z)";
    }
    return rack ? `Rack ${rack}` : "Unknown Rack";
  },

  isMedicineInRack: (medicine, rackName) => {
    if (!medicine || !rackName) return false;
    const targetRackNum = RackUtils.getRackNumber(rackName);

    // 1. Direct rack string equality (e.g. "Rack 8 (H)" === "Rack 8 (H)")
    if (medicine.rack === rackName) return true;
    if (typeof medicine.rack === "string" && medicine.rack.trim().toLowerCase() === rackName.trim().toLowerCase()) return true;

    // 2. Numeric rack number equality (e.g. rackNumber 8 === 8 or rack "8" === 8)
    const medRackNum = medicine.rackNumber || RackUtils.getRackNumber(medicine.rack);
    if (targetRackNum > 0 && medRackNum === targetRackNum) return true;

    // 3. String prefix match (e.g. "Rack 8" in "Rack 8 (H)")
    if (typeof medicine.rack === "string" && targetRackNum > 0) {
      const cleanRack = medicine.rack.trim();
      if (cleanRack === `Rack ${targetRackNum}` || cleanRack.startsWith(`Rack ${targetRackNum} `) || cleanRack.startsWith(`Rack ${targetRackNum}(`)) return true;
    }

    // 4. Letter-based rack assignment fallback only when no explicit rack number exists
    if (medRackNum <= 0 && medicine.name) {
      const firstLetter = medicine.name.trim().charAt(0).toUpperCase();
      const allowed = RackUtils.getAllowedLetters(rackName);
      if (allowed.includes(firstLetter)) return true;
    }

    return false;
  }
};

// 3. MAIN REACT APP COMPONENT
function App() {
  // Authentication & Profile State
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ name: "User", email: "", role: "worker", color: "#00FF00" });
  const [adminModeOverride, setAdminModeOverride] = useState(null); // Allows toggling between Admin & Worker view
  const [authLoading, setAuthLoading] = useState(true);

  // Screen & Navigation State ("main", "rack-details", "add-medicine", "empty-slots", "manage-users")
  const [activeScreen, setActiveScreen] = useState("main");
  const [selectedRackName, setSelectedRackName] = useState(null);

  // Real-time Database Models
  const [medicines, setMedicines] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [activeBeaconRack, setActiveBeaconRack] = useState(0);
  const [glowingRack, setGlowingRack] = useState(0);
  const glowTimerRef = useRef(null);

  // Dialog Overlays State
  const [pickDialogMedicine, setPickDialogMedicine] = useState(null);
  const [editDialogMedicine, setEditDialogMedicine] = useState(null);
  const [fillSlotMedicine, setFillSlotMedicine] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Floating Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "normal") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2400);
  }, []);

  // Compute actual & effective role (Strict: Workers can never switch into Admin mode)
  const isActualAdmin = useMemo(() => {
    const r = (profile.role || "").toLowerCase();
    return r === "admin" || Boolean(profile.email && (profile.email.includes("admin") || profile.email === "layna4115@gmail.com"));
  }, [profile]);

  const isEffectiveAdmin = useMemo(() => {
    if (!isActualAdmin) return false;
    if (adminModeOverride !== null) return adminModeOverride;
    return true;
  }, [isActualAdmin, adminModeOverride]);

  // Hardware Signal Trigger (Matches PHARMACYFINAL.ino + working HTML selectRack protocol)
  const triggerHardwareSignal = useCallback((rackNameOrNum, colorOverride = null) => {
    const rackNum = typeof rackNameOrNum === "number"
      ? rackNameOrNum
      : (rackNameOrNum && typeof rackNameOrNum === "object"
          ? RackUtils.getRackNumberFromMedicine(rackNameOrNum)
          : RackUtils.getRackNumber(rackNameOrNum));

    if (isNaN(rackNum) || rackNum < 0 || rackNum > 25) return;

    const userColor = profile.color && profile.color !== "#000000" ? profile.color : "#00FF00";
    const finalColor = rackNum === 0
      ? "#000000"
      : (colorOverride && colorOverride !== "#000000" ? colorOverride : userColor);

    // 1. Write active_rack & active_color first so ESP32 never reads stale rack/color when command_id bumps
    Promise.all([
      db.ref("active_rack").set(parseInt(rackNum, 10)),
      db.ref("active_color").set(finalColor),
      db.ref("blink_trigger").set(parseInt(rackNum, 10)),
      db.ref("last_click_time").set(Date.now())
    ])
      .then(() => {
        return db.ref("command_id").transaction((currentVal) => (currentVal || 0) + 1);
      })
      .catch((err) => {
        console.error("Hardware signal failed:", err);
        showToast("Hardware signal error: " + (err && err.message ? err.message : "Check permissions"), "danger");
      });

    if (rackNum === 0) {
      setGlowingRack(0);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
      showToast("All Rack LEDs turned OFF");
    } else {
      setGlowingRack(rackNum);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
      glowTimerRef.current = setTimeout(() => setGlowingRack(0), 4200);
      showToast(`Signal sent to Rack ${rackNum}`);

      // Legacy /racks state sync (does NOT reset active_rack to 0)
      const rackRef = db.ref(`racks/rack_${rackNum}`);
      rackRef.child("rackNumber").set(rackNum).catch(() => {});
      rackRef.child("opened").set(true).catch(() => {});
      setTimeout(() => {
        rackRef.child("opened").set(false).catch(() => {});
      }, 4000);
    }
  }, [profile.color, showToast]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currUser) => {
      setAuthLoading(false);
      if (currUser) {
        setUser(currUser);
        // Load Realtime Database Profile
        db.ref("users/" + currUser.uid).on("value", (snap) => {
          const val = snap.val();
          const email = currUser.email || "";
          let role = val && val.role ? val.role.toLowerCase() : "worker";
          const color = (val && val.color) || "#00FF00";

          // If user is developer/admin email, ensure they have Admin role
          if (email === "layna4115@gmail.com" || email.includes("admin")) {
            role = "admin";
            // Persist into database if not yet marked as admin
            if (!val || val.role !== "admin") {
              db.ref("users/" + currUser.uid).update({
                uid: currUser.uid,
                email: email,
                name: (val && val.name) || email.split("@")[0],
                role: "admin",
                color: color
              });
            }
          }

          setProfile({
            uid: currUser.uid,
            name: (val && val.name) || email.split("@")[0] || "User",
            email: email,
            role: role,
            color: color
          });
        });
      } else {
        setUser(null);
        setProfile({ name: "User", email: "", role: "worker", color: "#00FF00" });
        setAdminModeOverride(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase Realtime Listeners
  useEffect(() => {
    // 1. Connection state
    db.ref(".info/connected").on("value", snap => {
      setIsOnline(snap.val() === true);
    });

    // 2. Active LED Beacon
    db.ref("active_rack").on("value", snap => {
      setActiveBeaconRack(parseInt(snap.val()) || 0);
    });

    // 3. Medicines List
    db.ref("medicines").on("value", snap => {
      const list = [];
      if (snap.exists()) {
        snap.forEach(child => {
          const val = child.val();
          if (val) {
            list.push({
              id: child.key,
              name: val.name || "",
              rack: val.rack || "",
              rackNumber: val.rackNumber || RackUtils.getRackNumber(val.rack),
              slot: val.slot !== undefined ? val.slot : "",
              quantity: parseInt(val.quantity) || 0,
              status: val.status || "Available"
            });
          }
        });
      }
      setMedicines(list);
    });

    // 4. Users List
    db.ref("users").on("value", snap => {
      const list = [];
      if (snap.exists()) {
        snap.forEach(child => {
          const val = child.val();
          if (val) {
            list.push({
              uid: child.key,
              name: val.name || "User",
              email: val.email || "",
              role: (val.role || "worker").toLowerCase(),
              color: val.color || "#00FF00"
            });
          }
        });
      }
      setUsers(list);
    });
  }, []);

  // Navigation Guard for non-admin
  const navigateTo = (screenId) => {
    if (!isEffectiveAdmin && (screenId === "add-medicine" || screenId === "empty-slots" || screenId === "manage-users")) {
      showToast("Access Restricted: Staff/Worker account", "danger");
      setActiveScreen("main");
      return;
    }
    setActiveScreen(screenId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F4F8", color: "#0066FF", fontWeight: 700 }}>
        Loading PharmaRack Application...
      </div>
    );
  }

  // Not logged in -> Show Auth Screen
  if (!user) {
    return (
      <div className="android-viewport">
        <AuthScreen showToast={showToast} />
        <ToastShelf toasts={toasts} />
      </div>
    );
  }

  // Logged In -> Show PharmaRack App
  return (
    <div className="android-viewport">
      {/* Top Header Bar (Main Racks Screen Only) */}
      {activeScreen === "main" && (
        <TopBar
          profile={profile}
          isActualAdmin={isActualAdmin}
          isEffectiveAdmin={isEffectiveAdmin}
          setAdminModeOverride={setAdminModeOverride}
          isOnline={isOnline}
          onSignOut={() => auth.signOut()}
          showToast={showToast}
        />
      )}

      {/* Screen Views */}
      {activeScreen === "main" && (
        <MainRacksScreen
          medicines={medicines}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeBeaconRack={activeBeaconRack}
          glowingRack={glowingRack}
          onTurnOffAll={() => triggerHardwareSignal(0, "#000000")}
          onSelectRack={(rackName) => {
            setSelectedRackName(rackName);
            triggerHardwareSignal(rackName);
            setActiveScreen("rack-details");
          }}
          onMedicineClick={(med) => {
            triggerHardwareSignal(med);
            if (isEffectiveAdmin) {
              setEditDialogMedicine(med);
            } else {
              setPickDialogMedicine(med);
            }
          }}
        />
      )}

      {activeScreen === "rack-details" && (
        <RackDetailsScreen
          rackName={selectedRackName}
          medicines={medicines}
          isEffectiveAdmin={isEffectiveAdmin}
          onBack={() => setActiveScreen("main")}
          onAddMedicine={() => setActiveScreen("add-medicine")}
          onMedicineClick={(med) => {
            triggerHardwareSignal(med);
            if (isEffectiveAdmin) {
              setEditDialogMedicine(med);
            } else {
              setPickDialogMedicine(med);
            }
          }}
        />
      )}

      {activeScreen === "add-medicine" && isEffectiveAdmin && (
        <AddMedicineScreen
          onBack={() => setActiveScreen("main")}
          showToast={showToast}
          onSuccess={() => setActiveScreen("main")}
        />
      )}

      {activeScreen === "empty-slots" && isEffectiveAdmin && (
        <EmptySlotsScreen
          medicines={medicines}
          onBack={() => setActiveScreen("main")}
          onRefillClick={(med) => setFillSlotMedicine(med)}
        />
      )}

      {activeScreen === "manage-users" && isEffectiveAdmin && (
        <ManageUsersScreen
          users={users}
          currentUid={user.uid}
          onBack={() => setActiveScreen("main")}
          onOpenCreateUser={() => setShowCreateUserModal(true)}
          showToast={showToast}
        />
      )}

      {/* Persistent Floating Bottom Nav (Visible for Admin, Excluded on Rack Details) */}
      {isEffectiveAdmin && activeScreen !== "rack-details" && (
        <BottomNavBar
          activeScreen={activeScreen}
          onNavigate={navigateTo}
        />
      )}

      {/* Dialog Overlays */}
      {pickDialogMedicine && (
        <PickTabletDialog
          medicine={pickDialogMedicine}
          isEffectiveAdmin={isEffectiveAdmin}
          onClose={() => setPickDialogMedicine(null)}
          onSwitchToEdit={() => {
            const med = pickDialogMedicine;
            setPickDialogMedicine(null);
            setEditDialogMedicine(med);
          }}
          onPickSuccess={(toPick, newQty) => {
            db.ref(`medicines/${pickDialogMedicine.id}/quantity`).set(newQty);
            triggerHardwareSignal(pickDialogMedicine);
            showToast(`Picked ${toPick} unit(s) of ${pickDialogMedicine.name}. Stock left: ${newQty}`);
            setPickDialogMedicine(null);
          }}
          showToast={showToast}
        />
      )}

      {editDialogMedicine && isEffectiveAdmin && (
        <EditMedicineDialog
          medicine={editDialogMedicine}
          onClose={() => setEditDialogMedicine(null)}
          onSwitchToPick={() => {
            const med = editDialogMedicine;
            setEditDialogMedicine(null);
            setPickDialogMedicine(med);
          }}
          triggerHardwareSignal={triggerHardwareSignal}
          showToast={showToast}
        />
      )}

      {fillSlotMedicine && isEffectiveAdmin && (
        <FillSlotDialog
          medicine={fillSlotMedicine}
          onClose={() => setFillSlotMedicine(null)}
          showToast={showToast}
        />
      )}

      {showCreateUserModal && isEffectiveAdmin && (
        <CreateUserDialog
          onClose={() => setShowCreateUserModal(false)}
          showToast={showToast}
        />
      )}

      {/* Floating Toast Bubble Shelf */}
      <ToastShelf toasts={toasts} />
    </div>
  );
}

// ==============================================================================
// COMPONENT: TOP BAR (Android headerBackground & main top bar)
// ==============================================================================
function TopBar({ profile, isActualAdmin, isEffectiveAdmin, setAdminModeOverride, isOnline, onSignOut, showToast }) {
  const roleDisplay = isEffectiveAdmin ? "Admin" : "Worker";

  return (
    <header className="header-main-topbar">
      <div className="main-topbar-row">
        <div className="logo-and-title">
          <div className="logo-card-thumb">
            <img src="assets/logo.png" alt="Logo" />
          </div>
          <div>
            <div className="topbar-app-name">PharmaRack</div>
            <div className="topbar-welcome-subtitle" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>
                Welcome, {profile.name} <span style={{ fontWeight: 800, color: isEffectiveAdmin ? "#E0F2FE" : "#F1F5F9" }}>({roleDisplay})</span>
              </span>
              <span
                title={`Assigned LED Color: ${profile.color || "#00FF00"}`}
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: profile.color || "#00FF00",
                  border: "1.5px solid rgba(255,255,255,0.85)",
                  display: "inline-block",
                  flexShrink: 0
                }}
              />
            </div>
          </div>
        </div>

        <div className="topbar-actions-group">
          {/* Admin Preview Switcher (Only visible to verified Admins) */}
          {isActualAdmin && (
            <button
              type="button"
              onClick={() => {
                const newMode = !isEffectiveAdmin;
                setAdminModeOverride(newMode);
                showToast(`Switched view to ${newMode ? "Admin (Full Control)" : "Worker (Pick Only)"}`);
              }}
              title="Toggle Admin / Worker Preview"
              style={{
                background: isEffectiveAdmin ? "#E0F2FE" : "rgba(255,255,255,0.2)",
                color: isEffectiveAdmin ? "#0284C7" : "#fff",
                border: "none",
                borderRadius: "14px",
                padding: "5px 10px",
                fontSize: "0.74rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <AppIcon name={isEffectiveAdmin ? "shield" : "users"} size={14} color={isEffectiveAdmin ? "#0284C7" : "#FFFFFF"} />
              <span>{isEffectiveAdmin ? "Admin" : "Worker"}</span>
            </button>
          )}

          {/* Hardware Connection Dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.16)", padding: "5px 9px", borderRadius: "14px", fontSize: "0.72rem", fontWeight: 700, color: "#fff" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isOnline ? "#10B981" : "#EF4444" }}></span>
            <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
          </div>

          {/* Logout Button (Android ic_logout vector) */}
          <button className="topbar-icon-action" onClick={onSignOut} title="Log out" aria-label="Log out">
            <AppIcon name="logout" size={19} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ==============================================================================
// COMPONENT: MAIN RACKS SCREEN (MainActivity.kt)
// ==============================================================================
function MainRacksScreen({ medicines, searchQuery, setSearchQuery, activeBeaconRack, glowingRack, onTurnOffAll, onSelectRack, onMedicineClick }) {
  const racks = useMemo(() => RackUtils.getRacks(), []);

  // Filter medicines by query
  const filteredMedicines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return medicines.filter(m => 
      m.name.toLowerCase().includes(q) ||
      String(m.rack).toLowerCase().includes(q) ||
      String(m.slot).toLowerCase().includes(q)
    );
  }, [medicines, searchQuery]);

  const bannerRack = glowingRack > 0 ? glowingRack : activeBeaconRack;

  return (
    <section className="screen-view active" style={{ display: "flex" }}>
      {/* Floating Search Card */}
      <div className="floating-search-card">
        <span className="search-card-icon" style={{ display: "flex", alignItems: "center" }}>
          <AppIcon name="search" size={20} color="#0066FF" />
        </span>
        <input
          type="text"
          className="search-card-input"
          placeholder="Search Medicine by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear-cross" onClick={() => setSearchQuery("")} aria-label="Clear search" style={{ display: "flex", alignItems: "center" }}>
            <AppIcon name="close" size={18} color="#94A3B8" />
          </button>
        )}
      </div>

      {/* Active LED Signal Banner */}
      {bannerRack > 0 && (
        <div className="active-hardware-beacon">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AppIcon name="led" size={18} color="#0284C7" />
            <span>{glowingRack > 0 ? `Blinking Rack ${glowingRack} LED` : `Last Active: Rack ${bannerRack}`}</span>
          </div>
          <button
            type="button"
            onClick={onTurnOffAll}
            style={{
              background: "#EF4444",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "12px",
              padding: "4px 10px",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Turn Off LEDs
          </button>
        </div>
      )}

      {/* Search Mode or Racks Grid Mode */}
      {searchQuery ? (
        <div className="medicines-list-container">
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            Search Results ({filteredMedicines.length})
          </div>
          {filteredMedicines.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">
                <AppIcon name="search" size={44} color="#94A3B8" />
              </div>
              <div className="empty-title">No medicines found matching "{searchQuery}"</div>
            </div>
          ) : (
            filteredMedicines.map(med => (
              <MedicineCard key={med.id} medicine={med} onClick={() => onMedicineClick(med)} />
            ))
          )}
        </div>
      ) : (
        <div className="racks-grid-view">
          {racks.map((rackName, idx) => {
            const rackNum = idx + 1;
            const count = medicines.filter(m => RackUtils.isMedicineInRack(m, rackName)).length;
            const isSignaled = glowingRack === rackNum;

            return (
              <div
                key={rackName}
                className={`rack-card ${isSignaled ? "is-active-light" : ""}`}
                onClick={() => onSelectRack(rackName)}
              >
                <div className="rack-card-name">{rackName}</div>
                <div className="rack-card-count">{count} {count === 1 ? "Medicine" : "Medicines"}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ==============================================================================
// COMPONENT: RACK DETAILS SCREEN (RackDetailsActivity.kt) - Matches Screenshot 1
// ==============================================================================
function RackDetailsScreen({ rackName, medicines, isEffectiveAdmin, onBack, onAddMedicine, onMedicineClick }) {
  const rackMedicines = useMemo(() => {
    return medicines.filter(m => RackUtils.isMedicineInRack(m, rackName));
  }, [medicines, rackName]);

  return (
    <section className="screen-view active" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F0F4F8", paddingBottom: "24px" }}>
      {/* Top Bar - Curved Royal Blue with Back Arrow & Rack Title (Screenshot 1) */}
      <div className="header-sub-topbar">
        <button className="btn-topbar-back" onClick={onBack} title="Back to Racks" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="sub-topbar-title">{rackName}</div>
      </div>

      {/* Recycler View List of Medicine Cards (Screenshot 1) */}
      <div className="medicines-list-container" style={{ marginTop: "14px", padding: "0 16px 24px 16px" }}>
        {rackMedicines.length === 0 ? (
          <div className="empty-state-card" style={{ marginTop: "40px" }}>
            <div className="empty-icon" style={{ opacity: 0.6 }}>
              <svg width="68" height="68" viewBox="0 0 24 24" fill="#94A3B8">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8H6V6h12v3z"/>
              </svg>
            </div>
            <div className="empty-title">No medicines in this rack</div>
            <div style={{ fontSize: "0.85rem", color: "#64748B", marginTop: "4px" }}>
              {isEffectiveAdmin ? "Add medicines to get started stocking this shelf." : "This shelf is currently vacant."}
            </div>
            {isEffectiveAdmin && (
              <button
                type="button"
                className="btn-solid-save-blue"
                style={{ width: "auto", padding: "0 24px", height: "46px", marginTop: "18px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                onClick={onAddMedicine}
              >
                <AppIcon name="add" size={20} color="#FFFFFF" />
                <span>Add Medicine to {rackName}</span>
              </button>
            )}
          </div>
        ) : (
          rackMedicines.map(med => (
            <MedicineCard key={med.id} medicine={med} onClick={() => onMedicineClick(med)} />
          ))
        )}
      </div>
    </section>
  );
}

// ==============================================================================
// COMPONENT: ADD MEDICINE SCREEN (AddMedicineActivity.kt - ADMIN ONLY)
// ==============================================================================
function AddMedicineScreen({ onBack, showToast, onSuccess }) {
  const racks = useMemo(() => RackUtils.getRacks(), []);
  const [name, setName] = useState("");
  const [selectedRack, setSelectedRack] = useState(racks[0] || "Rack 1 (A)");
  const [slot, setSlot] = useState("");
  const [qty, setQty] = useState("");

  const allowedLetters = useMemo(() => RackUtils.getAllowedLetters(selectedRack), [selectedRack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSlot = slot.trim();
    const cleanQty = parseInt(qty) || 0;

    if (!cleanName || !cleanSlot || cleanQty <= 0) {
      showToast("Please fill all fields properly", "danger");
      return;
    }

    const firstLetter = cleanName.charAt(0).toUpperCase();
    if (!allowedLetters.includes(firstLetter)) {
      alert(`Validation Failed:\nThis rack only stores medicines starting with ${allowedLetters.join(", ")}`);
      return;
    }

    const rackNum = RackUtils.getRackNumber(selectedRack);
    const newRef = db.ref("medicines").push();
    newRef.set({
      id: newRef.key,
      name: cleanName,
      rack: selectedRack,
      rackNumber: rackNum,
      slot: cleanSlot,
      quantity: cleanQty,
      status: "Available"
    }).then(() => {
      showToast("Medicine added successfully");
      onSuccess();
    }).catch(err => {
      showToast("Failed to add: " + err.message, "danger");
    });
  };

  return (
    <section className="screen-view active" style={{ display: "flex" }}>
      <div className="header-sub-topbar">
        <button className="btn-topbar-back" onClick={onBack} title="Back" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="sub-topbar-title">Add New Medicine</div>
      </div>

      <div style={{ padding: "18px" }}>
        <div style={{ background: "#fff", borderRadius: "24px", padding: "24px", border: "1.5px solid #D4E4F7", boxShadow: "var(--shadow-card)" }}>
          <form onSubmit={handleSubmit}>
            <div className="form-input-group">
              <label>Medicine Name</label>
              <input
                type="text"
                className="android-input-field"
                placeholder="Enter medicine name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <label>Rack Number</label>
              <select
                className="android-select-field"
                value={selectedRack}
                onChange={e => setSelectedRack(e.target.value)}
              >
                {racks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={{ fontSize: "0.75rem", color: "#0066FF", fontWeight: 600, marginTop: "5px" }}>
                This rack only stores medicines starting with {allowedLetters.join(", ")}
              </div>
            </div>

            <div className="form-input-group">
              <label>Slot Number</label>
              <input
                type="text"
                className="android-input-field"
                placeholder="e.g. A1, B2, 1"
                value={slot}
                onChange={e => setSlot(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <label>Quantity</label>
              <input
                type="number"
                className="android-input-field"
                placeholder="Enter quantity"
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="android-btn-primary" style={{ marginTop: "14px" }}>
              Add Medicine
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ==============================================================================
// COMPONENT: EMPTY SLOTS SCREEN (EmptySlotsActivity.kt - ADMIN ONLY)
// ==============================================================================
function EmptySlotsScreen({ medicines, onBack, onRefillClick }) {
  const lowStock = useMemo(() => medicines.filter(m => m.quantity < 10), [medicines]);

  return (
    <section className="screen-view active" style={{ display: "flex" }}>
      <div className="header-sub-topbar">
        <button className="btn-topbar-back" onClick={onBack} title="Back" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="sub-topbar-title">Low Stock Medicines</div>
      </div>

      <div style={{ padding: "16px 20px 8px 20px" }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
          Medicines with Low Stock (&lt; 10 units):
        </div>
        <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
          Click "Refill" to replenish inventory stock in the rack.
        </p>
      </div>

      <div className="medicines-list-container" style={{ marginTop: "8px" }}>
        {lowStock.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">
              <AppIcon name="check" size={44} color="#10B981" />
            </div>
            <div className="empty-title" style={{ color: "#10B981" }}>All medicines adequately stocked</div>
            <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "4px" }}>No items currently below 10 units threshold.</div>
          </div>
        ) : (
          lowStock.map(med => {
            const rackDisplay = RackUtils.formatRackDisplay(med.rack, med.rackNumber);
            return (
              <div key={med.id} className="empty-slot-card">
                <div>
                  <div className="empty-slot-title">{med.name} ({rackDisplay})</div>
                  <div className="empty-slot-qty">Current Qty: {med.quantity}</div>
                </div>
                <button type="button" className="btn-slot-refill" onClick={() => onRefillClick(med)}>
                  Refill
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

// ==============================================================================
// COMPONENT: MANAGE USERS SCREEN (ManageUsersActivity.kt - ADMIN ONLY)
// ==============================================================================
function ManageUsersScreen({ users, currentUid, onBack, onOpenCreateUser, showToast }) {
  const handleDeleteUser = (u) => {
    if (confirm(`Are you sure you want to remove ${u.name} (${u.email})?`)) {
      db.ref("users/" + u.uid).remove().then(() => {
        showToast(`User ${u.name} deleted`);
      }).catch(err => {
        showToast("Error: " + err.message, "danger");
      });
    }
  };

  return (
    <section className="screen-view active" style={{ display: "flex" }}>
      <div className="header-sub-topbar">
        <button className="btn-topbar-back" onClick={onBack} title="Back" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="sub-topbar-title">User Management</div>
      </div>

      <div style={{ padding: "16px 20px 6px 20px", fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
        System Accounts ({users.length}):
      </div>

      <div className="medicines-list-container" style={{ marginTop: "8px" }}>
        {users.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">
              <AppIcon name="users" size={44} color="#94A3B8" />
            </div>
            <div className="empty-title">No users found</div>
          </div>
        ) : (
          users.map(u => {
            const isSelf = currentUid === u.uid;
            return (
              <div key={u.uid} className="user-row-card">
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div className="user-avatar-circle">
                    <AppIcon name="users" size={22} color="#0066FF" />
                  </div>
                  <div className="user-text-info">
                    <div className="user-name-title">{u.name} {isSelf && "(You)"}</div>
                    <div className="user-email-subtitle">{u.email || "Staff Account"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    title={`Hardware LED Color: ${u.color || "#00FF00"}`}
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: u.color || "#00FF00",
                      border: "1.5px solid #CBD5E1",
                      flexShrink: 0
                    }}
                  />
                  <span className={`user-role-badge ${u.role}`}>{u.role}</span>
                  {!isSelf && (
                    <button type="button" className="btn-user-delete-icon" onClick={() => handleDeleteUser(u)} title="Delete user" aria-label="Delete user">
                      <AppIcon name="trash" size={20} color="#EF4444" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Extended Floating Action Button */}
      <button type="button" className="android-fab" onClick={onOpenCreateUser}>
        <AppIcon name="add" size={20} color="#FFFFFF" />
        <span>Create User</span>
      </button>
    </section>
  );
}

// ==============================================================================
// COMPONENT: FLOATING BOTTOM NAVIGATION BAR (VISIBLE FOR ADMIN ONLY)
// ==============================================================================
function BottomNavBar({ activeScreen, onNavigate }) {
  return (
    <nav className="android-bottom-nav">
      <button
        type="button"
        className={`bottom-nav-action ${activeScreen === "main" ? "active" : ""}`}
        onClick={() => onNavigate("main")}
      >
        <span className="nav-tab-icon">
          <AppIcon name="home" size={22} color={activeScreen === "main" ? "#0066FF" : "#475569"} />
        </span>
        <span>Racks</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-action ${activeScreen === "add-medicine" ? "active" : ""}`}
        onClick={() => onNavigate("add-medicine")}
      >
        <span className="nav-tab-icon">
          <AppIcon name="add" size={22} color={activeScreen === "add-medicine" ? "#0066FF" : "#475569"} />
        </span>
        <span>Add Medicine</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-action ${activeScreen === "empty-slots" ? "active" : ""}`}
        onClick={() => onNavigate("empty-slots")}
      >
        <span className="nav-tab-icon">
          <AppIcon name="slots" size={22} color={activeScreen === "empty-slots" ? "#0066FF" : "#475569"} />
        </span>
        <span>Empty Slots</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-action ${activeScreen === "manage-users" ? "active" : ""}`}
        onClick={() => onNavigate("manage-users")}
      >
        <span className="nav-tab-icon">
          <AppIcon name="users" size={22} color={activeScreen === "manage-users" ? "#0066FF" : "#475569"} />
        </span>
        <span>Users</span>
      </button>
    </nav>
  );
}

// ==============================================================================
// COMPONENT: MEDICINE CARD (item_medicine.xml) - Matches Screenshot 1
// ==============================================================================
function MedicineCard({ medicine, onClick }) {
  const rackDisplay = RackUtils.formatRackDisplay(medicine.rack, medicine.rackNumber);
  const slotDisplay = medicine.slot !== undefined && medicine.slot !== "" ? medicine.slot : "1";

  return (
    <div className="medicine-item-card" onClick={onClick}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left", flex: 1, minWidth: 0, paddingRight: "12px" }}>
        <div className="med-card-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {medicine.name}
        </div>
        <div className="med-card-slot">Rack: {rackDisplay}, Slot: {slotDisplay}</div>
      </div>
      <div className="med-card-qty-badge">
        Qty: {medicine.quantity}
      </div>
    </div>
  );
}

// ==============================================================================
// DIALOG 1: PICK TABLET DIALOG (dialog_pick_tablet.xml)
// WORKER & ADMIN MAIN WORKING PROCESS: MEDICINE SELECTION AND PICKING
// ==============================================================================
function PickTabletDialog({ medicine, isEffectiveAdmin, onClose, onSwitchToEdit, onPickSuccess, showToast }) {
  const [customQty, setCustomQty] = useState("");
  const rackDisplay = RackUtils.formatRackDisplay(medicine.rack, medicine.rackNumber);

  const handlePickOne = () => {
    if (medicine.quantity <= 0) {
      showToast("Out of stock! Cannot pick.", "danger");
      return;
    }
    onPickSuccess(1, medicine.quantity - 1);
  };

  const handlePickCustom = () => {
    const toPick = parseInt(customQty) || 0;
    if (toPick <= 0 || toPick > medicine.quantity) {
      showToast("Invalid quantity! Must be between 1 and available stock.", "danger");
      return;
    }
    onPickSuccess(toPick, medicine.quantity - toPick);
  };

  return (
    <div
      className="android-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="android-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className="dialog-title-blue">Pick Tablet</h3>
            {isEffectiveAdmin && (
              <button
                type="button"
                onClick={onSwitchToEdit}
                style={{
                  background: "#E0F2FE",
                  border: "1px solid #BAE6FD",
                  color: "#0284C7",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
                title="Edit medicine name or delete"
              >
                <AppIcon name="edit" size={14} color="#0284C7" />
                <span>Edit</span>
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }} aria-label="Close">
            <AppIcon name="close" size={22} color="#94A3B8" />
          </button>
        </div>

        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", marginTop: "12px" }}>
          {medicine.name}
        </div>
        <div style={{ fontSize: "0.9rem", color: "#64748B", marginTop: "4px" }}>
          Rack: {rackDisplay}, Slot: {medicine.slot !== undefined && medicine.slot !== "" ? medicine.slot : "1"}
        </div>
        <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#0A2540", marginTop: "12px" }}>
          Available Quantity: <span style={{ color: medicine.quantity > 0 ? "#0066FF" : "#EF4444" }}>{medicine.quantity}</span>
        </div>

        <div className="dialog-separator-line"></div>

        {/* Action 1: Pick 1 Tablet */}
        <button
          type="button"
          className="btn-solid-save-blue"
          style={{ marginTop: "4px", opacity: medicine.quantity <= 0 ? 0.6 : 1 }}
          onClick={handlePickOne}
          disabled={medicine.quantity <= 0}
        >
          PICK 1 TABLET
        </button>

        {/* Action 2: Custom Qty */}
        <div style={{ marginTop: "18px", fontSize: "0.85rem", color: "#475569", textAlign: "left", fontWeight: 600 }}>
          Or specify quantity to pick:
        </div>
        <div className="remove-qty-row">
          <input
            type="number"
            className="remove-qty-input-box"
            placeholder="Enter Qty"
            min="1"
            max={medicine.quantity}
            value={customQty}
            onChange={e => setCustomQty(e.target.value)}
          />
          <button
            type="button"
            className="btn-solid-save-blue"
            style={{ width: "auto", height: "52px", padding: "0 24px", marginTop: 0, opacity: medicine.quantity <= 0 ? 0.6 : 1, background: "#0A2540" }}
            onClick={handlePickCustom}
            disabled={medicine.quantity <= 0}
          >
            PICK
          </button>
        </div>

        <button type="button" onClick={onClose} style={{ width: "100%", height: "44px", background: "none", border: "none", color: "#64748B", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", marginTop: "14px" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ==============================================================================
// DIALOG 2: EDIT MEDICINE DIALOG (dialog_edit_medicine.xml) - Matches Screenshot 2
// ==============================================================================
function EditMedicineDialog({ medicine, onClose, onSwitchToPick, triggerHardwareSignal, showToast }) {
  const [name, setName] = useState(medicine.name || "");
  const [removeQty, setRemoveQty] = useState("");

  const handleMinusOne = () => {
    if (medicine.quantity <= 0) {
      showToast("Quantity is already 0", "danger");
      return;
    }
    const newQty = medicine.quantity - 1;
    db.ref(`medicines/${medicine.id}/quantity`).set(newQty).then(() => {
      if (triggerHardwareSignal) triggerHardwareSignal(medicine);
      showToast(`Quantity reduced to ${newQty}`);
      onClose();
    }).catch(err => {
      showToast("Error updating quantity: " + err.message, "danger");
    });
  };

  const handleRemoveCustom = () => {
    const toRemove = parseInt(removeQty) || 0;
    if (toRemove > 0 && toRemove <= medicine.quantity) {
      const newQty = medicine.quantity - toRemove;
      db.ref(`medicines/${medicine.id}/quantity`).set(newQty).then(() => {
        if (triggerHardwareSignal) triggerHardwareSignal(medicine);
        showToast(`Removed ${toRemove} tablet(s) of ${medicine.name}`);
        onClose();
      }).catch(err => {
        showToast("Error removing quantity: " + err.message, "danger");
      });
    } else {
      showToast("Invalid quantity", "danger");
    }
  };

  const handleSaveName = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showToast("Medicine name cannot be empty", "danger");
      return;
    }
    db.ref(`medicines/${medicine.id}/name`).set(cleanName).then(() => {
      showToast("Changes saved");
      onClose();
    }).catch(err => {
      showToast("Error saving name: " + err.message, "danger");
    });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${medicine.name} entirely?`)) {
      db.ref(`medicines/${medicine.id}`).remove().then(() => {
        showToast("Medicine deleted");
        onClose();
      }).catch(err => {
        showToast("Failed to delete: " + err.message, "danger");
      });
    }
  };

  return (
    <div
      className="android-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="android-dialog-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header Row with Title and Red ic_logout Exit Icon (Screenshot 2) */}
        <div className="dialog-header-row">
          <h3 className="dialog-title-blue">Edit Medicine</h3>
          <button
            type="button"
            className="dialog-exit-red-icon"
            onClick={handleDelete}
            title="Delete Medicine"
            aria-label="Delete"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>

        {/* Medicine Name Input with Material Outlined Floating Label */}
        <div className="md-outlined-group">
          <label className="md-floating-label">Medicine Name</label>
          <input
            type="text"
            className="md-outlined-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Current Quantity Badge */}
        <div>
          <div className="dialog-current-qty-badge">
            Current Quantity: {medicine.quantity}
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <div className="dialog-separator-line"></div>

        {/* -1 QUANTITY (Outlined Blue Pill Button) */}
        <button
          type="button"
          className="btn-outlined-minus-qty"
          onClick={handleMinusOne}
        >
          -1 QUANTITY
        </button>

        {/* Custom Remove Qty Section */}
        <div className="remove-qty-row">
          <input
            type="number"
            className="remove-qty-input-box"
            placeholder="Remove Qty"
            min="1"
            max={medicine.quantity}
            value={removeQty}
            onChange={(e) => setRemoveQty(e.target.value)}
          />
          <button
            type="button"
            className="btn-solid-remove-red"
            onClick={handleRemoveCustom}
          >
            REMOVE
          </button>
        </div>

        {/* SAVE CHANGES (Full Width Solid Blue Pill Button) */}
        <button
          type="button"
          className="btn-solid-save-blue"
          onClick={handleSaveName}
        >
          SAVE CHANGES
        </button>
      </div>
    </div>
  );
}

// ==============================================================================
// DIALOG 3: REFILL SLOT DIALOG (dialog_fill_slot.xml - ADMIN ONLY)
// ==============================================================================
function FillSlotDialog({ medicine, onClose, showToast }) {
  const [qtyToAdd, setQtyToAdd] = useState("");

  const handleUpdate = () => {
    const toAdd = parseInt(qtyToAdd) || 0;
    if (toAdd <= 0) {
      showToast("Please enter quantity to add", "danger");
      return;
    }
    const newQty = medicine.quantity + toAdd;
    db.ref(`medicines/${medicine.id}/quantity`).set(newQty).then(() => {
      showToast(`Stock updated for ${medicine.name}`);
      onClose();
    }).catch(err => {
      showToast("Failed to update: " + err.message, "danger");
    });
  };

  return (
    <div
      className="android-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="android-dialog-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title-blue">Refill {medicine.name}</h3>

        <div className="form-input-group" style={{ marginTop: "14px" }}>
          <label>Medicine Name</label>
          <input type="text" className="android-input-field" value={medicine.name} disabled style={{ background: "#F0F4F8", opacity: 0.85 }} />
        </div>

        <div className="form-input-group">
          <label>Add Quantity</label>
          <input
            type="number"
            className="android-input-field"
            placeholder="Enter quantity to add"
            min="1"
            value={qtyToAdd}
            onChange={e => setQtyToAdd(e.target.value)}
            required
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" }}>
          <button type="button" className="android-btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="android-btn-primary" style={{ flex: 1 }} onClick={handleUpdate}>
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// DIALOG 4: CREATE USER DIALOG (dialog_create_user.xml - ADMIN ONLY)
// ==============================================================================
function CreateUserDialog({ onClose, showToast }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("worker");
  const [color, setColor] = useState("#00FF00");
  const [loading, setLoading] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name || !email || !pass) {
      showToast("Please fill all fields", "danger");
      return;
    }
    if (pass.length < 6) {
      showToast("Password must be at least 6 characters", "danger");
      return;
    }

    setLoading(true);
    // Secondary Firebase app instance to avoid logging out the current admin
    const secondaryAppName = "UserCreator_" + Date.now();
    const secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);

    secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
      .then(cred => {
        const uid = cred.user.uid;
        return db.ref("users/" + uid).set({
          uid,
          name,
          email,
          role,
          color
        });
      })
      .then(() => {
        showToast(`User ${name} created successfully!`);
        secondaryApp.auth().signOut();
        secondaryApp.delete();
        onClose();
      })
      .catch(err => {
        showToast("Error: " + err.message, "danger");
        secondaryApp.delete();
      })
      .finally(() => setLoading(false));
  };

  return (
    <div
      className="android-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="android-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 className="dialog-title-blue">Create New User</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }} aria-label="Close">
            <AppIcon name="close" size={22} color="#94A3B8" />
          </button>
        </div>

        <form onSubmit={handleCreate} style={{ marginTop: "12px" }}>
          <div className="form-input-group">
            <label>Full Name</label>
            <input type="text" className="android-input-field" placeholder="Enter staff name" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-input-group">
            <label>Email Address</label>
            <input type="email" className="android-input-field" placeholder="staff@pharmarack.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="form-input-group">
            <label>Password (min 6 characters)</label>
            <input type="password" className="android-input-field" placeholder="Enter password" minLength={6} value={pass} onChange={e => setPass(e.target.value)} required />
          </div>

          <div className="form-input-group">
            <label>Select Role</label>
            <select className="android-select-field" value={role} onChange={e => setRole(e.target.value)}>
              <option value="worker">Worker (Only Take Medicine from Rack)</option>
              <option value="admin">Admin (Full System Access)</option>
            </select>
          </div>

          <div className="form-input-group">
            <label>Assigned LED Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: color,
                  border: "1.5px solid #CBD5E1",
                  flexShrink: 0
                }}
              />
              <select className="android-select-field" style={{ flex: 1 }} value={color} onChange={e => setColor(e.target.value)}>
                {LED_COLORS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px" }}>
            <button type="button" className="android-btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="android-btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================================================================
// COMPONENT: AUTH SCREEN (LoginActivity & SignUpActivity)
// ==============================================================================
function AuthScreen({ showToast }) {
  const [tab, setTab] = useState("login"); // "login" or "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        showToast("Login successful");
      })
      .catch(err => {
        setError(`Login failed: ${err.message}`);
        showToast("Login failed: " + err.message, "danger");
      })
      .finally(() => setLoading(false));
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password should be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    auth.createUserWithEmailAndPassword(email, password)
      .then(cred => {
        const uid = cred.user.uid;
        return db.ref("users/" + uid).set({
          uid,
          name: name.trim(),
          email: email.trim(),
          role,
          color: "#00FF00"
        });
      })
      .then(() => {
        showToast("Registration successful");
      })
      .catch(err => {
        setError(`Registration failed: ${err.message}`);
        showToast("Sign up error: " + err.message, "danger");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="auth-screen-layout">
      <div className="auth-header-curved">
        <div className="auth-logo-white-card">
          <img src="assets/logo.png" alt="Logo" />
        </div>
        <h1>PharmaRack</h1>
        <p>Smart Pharmacy Storage & LED System</p>
      </div>

      <div className="auth-card-body">
        <div className="auth-toggle-bar">
          <button
            type="button"
            className={`auth-toggle-option ${tab === "login" ? "active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-toggle-option ${tab === "signup" ? "active" : ""}`}
            onClick={() => { setTab("signup"); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div style={{ color: "#EF4444", background: "#FEF2F2", padding: "8px 12px", borderRadius: "10px", fontSize: "0.82rem", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-input-group">
              <label>Email Address</label>
              <input
                type="email"
                className="android-input-field"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <label>Password</label>
              <input
                type="password"
                className="android-input-field"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="android-btn-primary" style={{ marginTop: "10px" }} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <div className="form-input-group">
              <label>Full Name</label>
              <input
                type="text"
                className="android-input-field"
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <label>Email Address</label>
              <input
                type="email"
                className="android-input-field"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <label>Password (min 6 characters)</label>
              <input
                type="password"
                className="android-input-field"
                placeholder="Create password"
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <label>Select Role</label>
              <select
                className="android-select-field"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="worker">Worker (Only Take Medicine from Rack)</option>
                <option value="admin">Admin (Full System Access)</option>
              </select>
            </div>

            <button type="submit" className="android-btn-primary" style={{ marginTop: "10px" }} disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// COMPONENT: TOAST SHELF
// ==============================================================================
function ToastShelf({ toasts }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="toast-container-shelf">
      {toasts.map(t => (
        <div key={t.id} className="android-toast-bubble" style={{ background: t.type === "danger" ? "#EF4444" : "rgba(15, 23, 42, 0.94)" }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// Mount the React Application into the DOM
const rootElement = document.getElementById("root");
ReactDOM.createRoot(rootElement).render(<App />);

