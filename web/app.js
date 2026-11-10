/**
 * ==============================================================================
 * PHARMARACK WEB APPLICATION - CLIENT LOGIC & IoT CONTROLLER
 * Full 1:1 Implementation of PharmaRack Android Application Architecture
 * 
 * Activities Replicated:
 * 1. LoginActivity (com.simats.pharmaRack.LoginActivity)
 * 2. SignUpActivity (com.simats.pharmaRack.SignUpActivity)
 * 3. MainActivity (com.simats.pharmaRack.MainActivity)
 * 4. RackDetailsActivity (com.simats.pharmaRack.RackDetailsActivity)
 * 5. AddMedicineActivity (com.simats.pharmaRack.AddMedicineActivity)
 * 6. EmptySlotsActivity (com.simats.pharmaRack.EmptySlotsActivity)
 * 7. ManageUsersActivity (com.simats.pharmaRack.ManageUsersActivity)
 * 
 * Role Permissions:
 * - Worker: ONLY takes medicine from the rack (Pick 1 / Pick Custom Qty).
 *   Cannot access Add Medicine, Empty Slots, or Users. Bottom nav is hidden.
 * - Admin: Full system access (Add, Edit, Delete, Low Stock Refill, Users).
 * ==============================================================================
 */

// 1. FIREBASE CONFIGURATION (Matches Android google-services.json)
const firebaseConfig = {
  apiKey: "AIzaSyD2woTELcOFNesVLWtNaqgimq0FlPKvaKA",
  authDomain: "smartpharmarack.firebaseapp.com",
  databaseURL: "https://smartpharmarack-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartpharmarack",
  storageBucket: "smartpharmarack.firebasestorage.app",
  messagingSenderId: "438675377207",
  appId: "1:438675377207:web:smartpharmarack"
};

// Initialize Primary Firebase Instance
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();

// 2. RACK UTILS (com.simats.pharmaRack.utils.RackUtils)
const RackUtils = {
  // Returns List of 25 Racks: Rack 1 (A) to Rack 24 (X), plus Rack 25 (Y, Z)
  getRacks: function () {
    const racks = [];
    for (let i = 0; i < 24; i++) {
      const letter = String.fromCharCode(65 + i);
      racks.push(`Rack ${i + 1} (${letter})`);
    }
    racks.push("Rack 25 (Y, Z)");
    return racks;
  },

  // Extracts rack integer number (1 to 25)
  getRackNumber: function (rackName) {
    if (!rackName) return 0;
    const str = String(rackName);
    if (!str.includes("Rack ")) {
      const parsed = parseInt(str);
      return isNaN(parsed) ? 0 : parsed;
    }
    const after = str.substring(str.indexOf("Rack ") + 5);
    const numPart = after.split(" ")[0].split("(")[0].trim();
    return parseInt(numPart) || 0;
  },

  // Returns allowed first letters for this rack
  getAllowedLetters: function (rackName) {
    if (!rackName) return [];
    const str = String(rackName);
    if (!str.includes("(") || !str.includes(")")) return [];
    const inside = str.substring(str.indexOf("(") + 1, str.indexOf(")"));
    return inside.split(",").map(s => s.trim().toUpperCase());
  },

  // Formats display string: "Rack 1 (A)"
  formatRackDisplay: function (rack, rackNumber) {
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
  }
};

// 3. APPLICATION RUNTIME STATE
let currentUser = null;          // Firebase Auth User
let currentProfile = {           // Profile record from /users/{uid}
  name: "User",
  email: "",
  role: "worker"                 // 'worker' or 'admin'
};

let allMedicines = [];           // Real-time synced array of Medicine models
let allUsers = [];               // Real-time synced array of User models
let currentActiveScreen = "screen-login";
let activeRackDetailsName = null; // Currently viewed rack in RackDetailsActivity
let activeDialogMedicine = null;  // Medicine referenced in Pick or Edit dialogs
let activeSlotRefillMedicine = null; // Medicine referenced in Fill Slot dialog
let activeRackBeaconNum = 0;
let beaconTimer = null;

// 4. APPLICATION INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  populateAddMedicineRacks();
  renderRacksGridView();
  initConnectionMonitor();
  initAuthObserver();
});

// Monitor Hardware Connection Status
function initConnectionMonitor() {
  db.ref(".info/connected").on("value", (snap) => {
    const isOnline = snap.val() === true;
    const dot = document.getElementById("hw-dot");
    const label = document.getElementById("hw-status-label");
    if (dot && label) {
      dot.style.background = isOnline ? "#10B981" : "#EF4444";
      label.innerText = isOnline ? "ONLINE" : "OFFLINE";
    }
  });

  // Listen to active_rack for real-time hardware LED indication
  db.ref("active_rack").on("value", (snap) => {
    const rackNum = parseInt(snap.val()) || 0;
    activeRackBeaconNum = rackNum;
    updateRackCardsBeaconGlow();
  });
}

// 5. AUTH OBSERVER (LoginActivity onCreate lines 22-42)
function initAuthObserver() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      // Load user profile from /users/{uid}
      db.ref("users/" + user.uid).on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
          currentProfile = {
            uid: user.uid,
            name: data.name || (user.email ? user.email.split("@")[0] : "User"),
            email: data.email || user.email || "",
            role: (data.role || "worker").toLowerCase()
          };
        } else {
          currentProfile = {
            uid: user.uid,
            name: user.email ? user.email.split("@")[0] : "User",
            email: user.email || "",
            role: "worker"
          };
        }

        // Cache session locally (matching Android PharmaRackPrefs)
        localStorage.setItem("USER_NAME", currentProfile.name);
        localStorage.setItem("USER_ROLE", currentProfile.role);

        applyRolePermissions();
        attachDataListeners();
        navigateToScreen("screen-main");
      });
    } else {
      currentUser = null;
      currentProfile = { name: "User", email: "", role: "worker" };
      localStorage.removeItem("USER_NAME");
      localStorage.removeItem("USER_ROLE");
      applyRolePermissions();
      navigateToScreen("screen-login");
    }
  });
}

// Role-Based UI Configuration (MainActivity.kt lines 71-81)
function applyRolePermissions() {
  const isAdmin = currentProfile.role === "admin";
  const bottomNav = document.getElementById("bottomNav");
  const welcomeText = document.getElementById("main-user-welcome");

  if (welcomeText) {
    const capitalizedRole = currentProfile.role.charAt(0).toUpperCase() + currentProfile.role.slice(1);
    welcomeText.innerText = `Welcome, ${currentProfile.name} (${capitalizedRole})`;
  }

  // MainActivity.kt:
  // if (userRole.equals("admin", ignoreCase = true)) { bottomNav.visibility = View.VISIBLE }
  // else { bottomNav.visibility = View.GONE }
  if (bottomNav) {
    bottomNav.style.display = (isAdmin && currentActiveScreen !== "screen-login" && currentActiveScreen !== "screen-signup") ? "flex" : "none";
  }
}

// 6. SCREEN NAVIGATION ROUTER
function navigateToScreen(targetScreenId) {
  // Security guard for worker role
  if (currentProfile.role !== "admin") {
    if (targetScreenId === "screen-add-medicine" || targetScreenId === "screen-empty-slots" || targetScreenId === "screen-manage-users") {
      showToast("Access Restricted: Staff/Worker account", "danger");
      targetScreenId = "screen-main";
    }
  }

  document.querySelectorAll(".screen-view").forEach((view) => {
    view.classList.remove("active");
  });

  const targetView = document.getElementById(targetScreenId);
  if (targetView) {
    targetView.classList.add("active");
    currentActiveScreen = targetScreenId;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Update bottom nav active state and visibility
  const bottomNav = document.getElementById("bottomNav");
  const isAdmin = currentProfile.role === "admin";
  const isAuthScreen = targetScreenId === "screen-login" || targetScreenId === "screen-signup";

  if (bottomNav) {
    bottomNav.style.display = (isAdmin && !isAuthScreen) ? "flex" : "none";
  }

  document.querySelectorAll(".bottom-nav-action").forEach((btn) => btn.classList.remove("active"));
  if (targetScreenId === "screen-main") document.getElementById("nav-item-racks")?.classList.add("active");
  if (targetScreenId === "screen-add-medicine") document.getElementById("nav-item-add")?.classList.add("active");
  if (targetScreenId === "screen-empty-slots") document.getElementById("nav-item-slots")?.classList.add("active");
  if (targetScreenId === "screen-manage-users") document.getElementById("nav-item-users")?.classList.add("active");
}

// 7. LOGIN ACTIVITY IMPLEMENTATION (LoginActivity.kt)
function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const btn = document.getElementById("btn-login");
  const errorText = document.getElementById("login-error-text");

  btn.disabled = true;
  btn.innerText = "Logging in...";
  errorText.style.display = "none";

  // auth.signInWithEmailAndPassword(email, password) - LoginActivity.kt line 60
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showToast("Login successful");
      document.getElementById("form-login").reset();
    })
    .catch((err) => {
      // LoginActivity.kt lines 68-70: "Login failed: ${task.exception?.message}"
      errorText.innerText = `Login failed: ${err.message}`;
      errorText.style.display = "block";
      showToast("Login failed: " + err.message, "danger");
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerText = "Login";
    });
}

// 8. SIGN UP ACTIVITY IMPLEMENTATION (SignUpActivity.kt)
function handleSignUpSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const role = document.getElementById("signup-role").value.toLowerCase();
  const btn = document.getElementById("btn-signup");
  const errorText = document.getElementById("signup-error-text");

  if (password.length < 6) {
    errorText.innerText = "Password should be at least 6 characters";
    errorText.style.display = "block";
    return;
  }

  btn.disabled = true;
  btn.innerText = "Creating account...";
  errorText.style.display = "none";

  // SignUpActivity.kt line 52: auth.createUserWithEmailAndPassword(email, password)
  auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      const uid = cred.user.uid;
      const newUser = {
        uid: uid,
        name: name,
        email: email,
        role: role
      };
      // SignUpActivity.kt line 64: FirebaseDatabase.getInstance().getReference("users").child(userId).setValue(user)
      return db.ref("users/" + uid).setValue(newUser);
    })
    .then(() => {
      showToast("Registration successful");
      document.getElementById("form-signup").reset();
    })
    .catch((err) => {
      // SignUpActivity.kt line 85: "Registration failed: ${task.exception?.message}"
      errorText.innerText = `Registration failed: ${err.message}`;
      errorText.style.display = "block";
      showToast("Registration failed: " + err.message, "danger");
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerText = "Sign Up";
    });
}

// Logout (MainActivity.kt lines 131-140)
function executeLogout() {
  auth.signOut().then(() => {
    localStorage.clear();
    showToast("Signed out");
    navigateToScreen("screen-login");
  });
}

// 9. HARDWARE LED SIGNAL (Matches PHARMACYFINAL.ino + selectRack protocol)
function triggerHardwareSignal(rackNameOrNumber, colorOverride) {
  const rackNum = typeof rackNameOrNumber === "number"
    ? rackNameOrNumber
    : RackUtils.getRackNumber(String(rackNameOrNumber));
  if (isNaN(rackNum) || rackNum < 0 || rackNum > 25) return;

  const finalColor = rackNum === 0
    ? "#000000"
    : (colorOverride || (typeof userProfile !== "undefined" && userProfile && userProfile.color) || "#00FF00");
  const rackName = rackNum === 0 ? "All Racks" : `Rack ${rackNum}`;

  Promise.all([
    db.ref("active_rack").set(parseInt(rackNum, 10)),
    db.ref("active_color").set(finalColor),
    db.ref("blink_trigger").set(parseInt(rackNum, 10)),
    db.ref("last_click_time").set(Date.now())
  ]).then(() => {
    return db.ref("command_id").transaction((v) => (v || 0) + 1);
  }).catch(() => {});

  if (rackNum > 0) {
    const rackRef = db.ref(`racks/rack_${rackNum}`);
    rackRef.child("rackNumber").set(rackNum);
    rackRef.child("opened").set(true);
    showToast(`Signal sent to ${rackName}`);

    const beaconBox = document.getElementById("active-beacon-box");
    const beaconText = document.getElementById("active-beacon-text");
    if (beaconBox && beaconText) {
      beaconText.innerText = `Signal sent to ${rackName} (LED Active)`;
      beaconBox.style.display = "flex";
    }

    if (beaconTimer) clearTimeout(beaconTimer);
    beaconTimer = setTimeout(() => {
      rackRef.child("opened").set(false);
      if (beaconBox) beaconBox.style.display = "none";
    }, 4000);
  }
}

// 10. REAL-TIME DATABASE LISTENERS
function attachDataListeners() {
  // Listen to /medicines (MainActivity.kt lines 159-174)
  db.ref("medicines").on("value", (snapshot) => {
    allMedicines = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const val = child.val();
        if (val) {
          allMedicines.push({
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

    updateRacksGridCounts();

    // Refresh active views
    const searchVal = (document.getElementById("etSearch")?.value || "").trim();
    if (searchVal.length > 0) {
      performSearch(searchVal);
    } else if (activeRackDetailsName && currentActiveScreen === "screen-rack-details") {
      renderRackMedicines(activeRackDetailsName);
    }

    if (currentActiveScreen === "screen-empty-slots") {
      renderEmptySlotsScreen();
    }
  });

  // Listen to /users (ManageUsersActivity.kt lines 84-112)
  db.ref("users").on("value", (snapshot) => {
    allUsers = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const val = child.val();
        if (val) {
          allUsers.push({
            uid: child.key,
            name: val.name || "User",
            email: val.email || "",
            role: (val.role || "worker").toLowerCase()
          });
        }
      });
    }
    renderManageUsersScreen();
  });
}

// 11. MAIN ACTIVITY: 25 RACKS GRID (RackUtils.getRacks & RackAdapter.kt)
function renderRacksGridView() {
  const container = document.getElementById("container-rvRacks");
  if (!container) return;
  container.innerHTML = "";

  const racks = RackUtils.getRacks();
  racks.forEach((rackName, index) => {
    const rackNumber = index + 1;
    const card = document.createElement("div");
    card.className = "rack-card";
    card.id = `rack-item-${rackNumber}`;
    card.dataset.rack = rackNumber;

    card.innerHTML = `
      <div class="rack-card-name">${rackName}</div>
      <div class="rack-card-count" id="rack-count-${rackNumber}">0 Medicines</div>
    `;

    // MainActivity.kt line 95: openRackDetails(rackName)
    card.onclick = () => openRackDetailsScreen(rackName);
    container.appendChild(card);
  });
}

function updateRacksGridCounts() {
  for (let i = 1; i <= 25; i++) {
    const countEl = document.getElementById(`rack-count-${i}`);
    if (!countEl) continue;

    const count = allMedicines.filter((m) => {
      const num = RackUtils.getRackNumber(m.rack) || m.rackNumber;
      return num === i;
    }).length;

    countEl.innerText = `${count} ${count === 1 ? "Medicine" : "Medicines"}`;
  }
}

function updateRackCardsBeaconGlow() {
  for (let i = 1; i <= 25; i++) {
    const card = document.getElementById(`rack-item-${i}`);
    if (!card) continue;
    if (activeRackBeaconNum === i) {
      card.classList.add("is-active-light");
    } else {
      card.classList.remove("is-active-light");
    }
  }
}

// 12. MAIN ACTIVITY: SEARCH FILTER (MainActivity.kt lines 117-129, 176-189)
function handleSearchTextChanged() {
  const input = document.getElementById("etSearch");
  const clearBtn = document.getElementById("btn-clear-search");
  const query = (input?.value || "").trim();

  if (clearBtn) clearBtn.style.display = query.length > 0 ? "block" : "none";

  const rvRacks = document.getElementById("container-rvRacks");
  const rvSearch = document.getElementById("container-rvSearch");

  // MainActivity.kt lines 122-126:
  // if (currentQuery.isEmpty()) { showRacks() } else { performSearch(currentQuery) }
  if (query.length === 0) {
    if (rvRacks) rvRacks.style.display = "grid";
    if (rvSearch) rvSearch.style.display = "none";
  } else {
    if (rvRacks) rvRacks.style.display = "none";
    if (rvSearch) rvSearch.style.display = "flex";
    performSearch(query);
  }
}

function clearSearchText() {
  const input = document.getElementById("etSearch");
  if (input) input.value = "";
  handleSearchTextChanged();
}

function performSearch(query) {
  const rvSearch = document.getElementById("container-rvSearch");
  if (!rvSearch) return;
  rvSearch.innerHTML = "";

  const q = query.toLowerCase();
  // MainActivity.kt lines 177-179: allMedicines.filter { it.name.contains(query, ignoreCase = true) }
  const filtered = allMedicines.filter((m) => {
    return (
      m.name.toLowerCase().includes(q) ||
      String(m.rack).toLowerCase().includes(q) ||
      String(m.slot).toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    rvSearch.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No medicines found matching "${escapeHtml(query)}"</div>
      </div>
    `;
    return;
  }

  filtered.forEach((med) => {
    rvSearch.appendChild(buildMedicineItemCard(med));
  });
}

// 13. RACK DETAILS ACTIVITY (RackDetailsActivity.kt)
function openRackDetailsScreen(rackName) {
  activeRackDetailsName = rackName;
  const rackTitle = document.getElementById("rack-details-header-title");
  if (rackTitle) rackTitle.innerText = rackName;

  // RackDetailsActivity lines 50-56: Trigger Firebase when rack is opened
  triggerHardwareSignal(rackName);

  renderRackMedicines(rackName);
  navigateToScreen("screen-rack-details");
}

function triggerRackSignalFromDetails() {
  if (activeRackDetailsName) {
    triggerHardwareSignal(activeRackDetailsName);
  }
}

function renderRackMedicines(rackName) {
  const container = document.getElementById("container-rack-medicines");
  if (!container) return;
  container.innerHTML = "";

  const rackNum = RackUtils.getRackNumber(rackName);
  // RackDetailsActivity lines 80-92: medicinesRef.orderByChild("rack").equalTo(rackName)
  const matches = allMedicines.filter((m) => {
    const mNum = RackUtils.getRackNumber(m.rack) || m.rackNumber;
    return mNum === rackNum || m.rack === rackName;
  });

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">📦</div>
        <div class="empty-title">No medicines in ${escapeHtml(rackName)}</div>
        <div style="font-size: 0.8rem; color: var(--text-gray); margin-top: 4px;">
          ${currentProfile.role === "admin" ? 'Click "+ Add Medicine" to stock this shelf.' : 'Shelf is vacant.'}
        </div>
      </div>
    `;
    return;
  }

  matches.forEach((med) => {
    container.appendChild(buildMedicineItemCard(med));
  });
}

// 14. MEDICINE CARD BUILDER (MedicineAdapter.kt + MainActivity.kt lines 103-109)
function buildMedicineItemCard(med) {
  const card = document.createElement("div");
  card.className = "medicine-item-card";

  const rackDisplay = RackUtils.formatRackDisplay(med.rack, med.rackNumber);
  const slotDisplay = med.slot || "N/A";
  const isLow = med.quantity < 10;

  // item_medicine.xml layout
  card.innerHTML = `
    <div>
      <div class="med-card-title">${escapeHtml(med.name)}</div>
      <div class="med-card-slot">Rack: ${escapeHtml(rackDisplay)}, Slot: ${escapeHtml(String(slotDisplay))}</div>
    </div>
    <div class="med-card-qty-badge ${isLow ? "low" : ""}">
      ${isLow ? "⚠️ " : ""}Qty: ${med.quantity}
    </div>
  `;

  // MainActivity.kt lines 103-109 & RackDetailsActivity.kt lines 65-71:
  // if (userRole.equals("admin", ignoreCase = true)) {
  //     triggerHardwareSignal(medicine.getRackDisplay())
  //     showEditDialog(medicine)
  // } else {
  //     showPickDialog(medicine)
  // }
  card.onclick = () => {
    triggerHardwareSignal(med.rack || med.rackNumber);
    if (currentProfile.role === "admin") {
      openEditMedicineDialog(med);
    } else {
      openPickTabletDialog(med);
    }
  };

  return card;
}

// 15. PICK TABLET DIALOG (dialog_pick_tablet.xml & MainActivity.kt lines 208-260)
// WORKER MAIN WORKING PROCESS: ONLY TAKING MEDICINE FROM THE RACK
function openPickTabletDialog(med) {
  activeDialogMedicine = med;
  const rackDisplay = RackUtils.formatRackDisplay(med.rack, med.rackNumber);
  const slotDisplay = med.slot || "N/A";

  document.getElementById("tvPickMedicineName").innerText = med.name;
  document.getElementById("tvPickSlotInfo").innerText = `Rack: ${rackDisplay}, Slot: ${slotDisplay}`;
  document.getElementById("tvPickCurrentQty").innerText = `Available Quantity: ${med.quantity}`;
  document.getElementById("etPickQuantity").value = "";

  document.getElementById("dialog-pick-tablet").classList.add("open");
}

function closePickTabletDialog() {
  document.getElementById("dialog-pick-tablet").classList.remove("open");
  activeDialogMedicine = null;
}

// btnPickOne: Decrement 1 tablet (MainActivity.kt lines 229-239)
function executePickOneAction() {
  if (!activeDialogMedicine) return;
  if (activeDialogMedicine.quantity <= 0) {
    showToast("Out of stock!", "danger");
    return;
  }

  const med = activeDialogMedicine;
  const newQty = med.quantity - 1;

  db.ref(`medicines/${med.id}/quantity`).setValue(newQty)
    .then(() => {
      triggerHardwareSignal(med.rack || med.rackNumber);
      showToast(`Picked 1 tablet of ${med.name}`);
      closePickTabletDialog();
    })
    .catch((err) => {
      showToast(`Error: ${err.message}`, "danger");
    });
}

// btnPickCustom: Decrement custom quantity (MainActivity.kt lines 241-252)
function executePickCustomAction() {
  if (!activeDialogMedicine) return;
  const input = document.getElementById("etPickQuantity");
  const toPick = parseInt(input.value) || 0;

  if (toPick <= 0 || toPick > activeDialogMedicine.quantity) {
    showToast("Invalid quantity", "danger");
    return;
  }

  const med = activeDialogMedicine;
  const newQty = med.quantity - toPick;

  db.ref(`medicines/${med.id}/quantity`).setValue(newQty)
    .then(() => {
      triggerHardwareSignal(med.rack || med.rackNumber);
      showToast(`Picked ${toPick} tablets of ${med.name}`);
      closePickTabletDialog();
    })
    .catch((err) => {
      showToast(`Error: ${err.message}`, "danger");
    });
}

// 16. EDIT MEDICINE DIALOG (dialog_edit_medicine.xml & MainActivity.kt lines 262-323)
// ADMIN ONLY: EDIT NAME, -1 QUANTITY, REMOVE CUSTOM QUANTITY, DELETE MEDICINE
function openEditMedicineDialog(med) {
  activeDialogMedicine = med;
  document.getElementById("etEditName").value = med.name;
  document.getElementById("tvCurrentQty").innerText = `Current Quantity: ${med.quantity}`;
  document.getElementById("etRemoveQty").value = "";

  document.getElementById("dialog-edit-medicine").classList.add("open");
}

function closeEditMedicineDialog() {
  document.getElementById("dialog-edit-medicine").classList.remove("open");
  activeDialogMedicine = null;
}

function switchToPickFromEditDialog() {
  const med = activeDialogMedicine;
  closeEditMedicineDialog();
  if (med) openPickTabletDialog(med);
}

// btnMinusOne (MainActivity.kt lines 282-287)
function executeMinusOneAction() {
  if (!activeDialogMedicine) return;
  if (activeDialogMedicine.quantity <= 0) {
    showToast("Quantity is already 0", "danger");
    return;
  }

  const newQty = activeDialogMedicine.quantity - 1;
  db.ref(`medicines/${activeDialogMedicine.id}/quantity`).setValue(newQty)
    .then(() => {
      showToast(`Quantity reduced to ${newQty}`);
      closeEditMedicineDialog();
    });
}

// btnRemoveCustom (MainActivity.kt lines 289-297)
function executeRemoveCustomAction() {
  if (!activeDialogMedicine) return;
  const input = document.getElementById("etRemoveQty");
  const toRemove = parseInt(input.value) || 0;

  if (toRemove <= 0 || toRemove > activeDialogMedicine.quantity) {
    showToast("Invalid quantity", "danger");
    return;
  }

  const newQty = activeDialogMedicine.quantity - toRemove;
  db.ref(`medicines/${activeDialogMedicine.id}/quantity`).setValue(newQty)
    .then(() => {
      showToast(`Removed ${toRemove} units. Left: ${newQty}`);
      closeEditMedicineDialog();
    });
}

// btnSaveName (MainActivity.kt lines 299-305)
function executeSaveMedicineName() {
  if (!activeDialogMedicine) return;
  const newName = document.getElementById("etEditName").value.trim();
  if (newName.length === 0) {
    showToast("Medicine name cannot be empty", "danger");
    return;
  }

  db.ref(`medicines/${activeDialogMedicine.id}/name`).setValue(newName)
    .then(() => {
      showToast("Changes saved");
      closeEditMedicineDialog();
    });
}

// btnDeleteMedicine (MainActivity.kt lines 307-319)
function executeDeleteMedicineConfirm() {
  if (!activeDialogMedicine) return;
  const med = activeDialogMedicine;

  if (confirm(`Are you sure you want to delete ${med.name} entirely?`)) {
    db.ref(`medicines/${med.id}`).remove()
      .then(() => {
        showToast("Medicine deleted");
        closeEditMedicineDialog();
      });
  }
}

// 17. ADD MEDICINE ACTIVITY (activity_add_medicine.xml & AddMedicineActivity.kt)
// ADMIN ONLY: WITH FIRST-LETTER RACK VALIDATION
function populateAddMedicineRacks() {
  const select = document.getElementById("spinnerRack");
  if (!select) return;
  select.innerHTML = "";

  const racks = RackUtils.getRacks();
  racks.forEach((rackName) => {
    const opt = document.createElement("option");
    opt.value = rackName;
    opt.innerText = rackName;
    select.appendChild(opt);
  });

  validateRackLetterHint();
}

function validateRackLetterHint() {
  const rackSelect = document.getElementById("spinnerRack");
  const hintEl = document.getElementById("rack-allowed-letter-hint");
  if (!rackSelect || !hintEl) return;

  const rackName = rackSelect.value;
  const allowed = RackUtils.getAllowedLetters(rackName);
  hintEl.innerText = `This rack only stores medicines starting with ${allowed.join(", ")}`;
}

function executeAddMedicineSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("etMedicineName").value.trim();
  const rackName = document.getElementById("spinnerRack").value;
  const slotStr = document.getElementById("etSlotNumber").value.trim();
  const qtyStr = document.getElementById("etQuantity").value.trim();

  if (!name || !slotStr || !qtyStr) {
    showToast("Please fill all fields", "danger");
    return;
  }

  const slot = parseInt(slotStr) || slotStr;
  const quantity = parseInt(qtyStr) || 0;
  const rackNumber = RackUtils.getRackNumber(rackName);

  // AddMedicineActivity.kt lines 76-81:
  // Check if medicine starts with correct letter for the rack
  const allowedLetters = RackUtils.getAllowedLetters(rackName);
  const firstLetter = name.charAt(0).toUpperCase();

  if (allowedLetters.includes(firstLetter)) {
    const newRef = db.ref("medicines").push();
    const medicine = {
      id: newRef.key,
      name: name,
      rack: rackName,
      rackNumber: rackNumber,
      slot: slot,
      quantity: quantity,
      status: "Available"
    };

    newRef.setValue(medicine)
      .then(() => {
        showToast("Medicine added successfully");
        document.getElementById("form-add-medicine").reset();
        validateRackLetterHint();
        navigateToScreen("screen-main");
      })
      .catch((err) => {
        showToast("Failed to add medicine: " + err.message, "danger");
      });
  } else {
    // AddMedicineActivity.kt line 100
    alert(`This rack only stores medicines starting with ${allowedLetters.join(", ")}`);
  }
}

// 18. EMPTY SLOTS ACTIVITY (activity_empty_slots.xml & EmptySlotsActivity.kt)
// ADMIN ONLY: LISTS MEDICINES WITH QUANTITY < 10 AND PROVIDES REFILL DIALOG
function renderEmptySlotsScreen() {
  const container = document.getElementById("container-empty-slots");
  if (!container) return;
  container.innerHTML = "";

  // EmptySlotsActivity.kt line 81: if (medicine != null && medicine.quantity < 10)
  const lowStockList = allMedicines.filter((m) => m.quantity < 10);

  if (lowStockList.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">✅</div>
        <div class="empty-title" style="color: var(--success-green);">All medicines adequately stocked</div>
        <div style="font-size: 0.8rem; color: var(--text-gray); margin-top: 4px;">No items currently below 10 units threshold.</div>
      </div>
    `;
    return;
  }

  lowStockList.forEach((medicine) => {
    const card = document.createElement("div");
    card.className = "empty-slot-card";

    const rackDisplay = RackUtils.formatRackDisplay(medicine.rack, medicine.rackNumber);

    // item_empty_slot.xml
    card.innerHTML = `
      <div>
        <div class="empty-slot-title">${escapeHtml(medicine.name)} (${escapeHtml(rackDisplay)})</div>
        <div class="empty-slot-qty">Current Qty: ${medicine.quantity}</div>
      </div>
      <button type="button" class="btn-slot-refill">Refill</button>
    `;

    // EmptySlotsActivity.kt lines 63-65: showUpdateStockDialog(medicine)
    card.querySelector(".btn-slot-refill").onclick = () => openFillSlotDialog(medicine);
    container.appendChild(card);
  });
}

// dialog_fill_slot.xml (EmptySlotsActivity.kt lines 97-144)
function openFillSlotDialog(medicine) {
  activeSlotRefillMedicine = medicine;
  document.getElementById("tvDialogTitle").innerText = `Refill ${medicine.name}`;
  document.getElementById("etDialogMedicineName").value = medicine.name;
  document.getElementById("etDialogQuantity").value = "";

  document.getElementById("dialog-fill-slot").classList.add("open");
}

function closeFillSlotDialog() {
  document.getElementById("dialog-fill-slot").classList.remove("open");
  activeSlotRefillMedicine = null;
}

function executeUpdateStockFromSlotDialog() {
  if (!activeSlotRefillMedicine) return;
  const addedQtyStr = document.getElementById("etDialogQuantity").value.trim();

  if (!addedQtyStr) {
    showToast("Please enter quantity", "danger");
    return;
  }

  const addedQty = parseInt(addedQtyStr) || 0;
  const newQty = activeSlotRefillMedicine.quantity + addedQty;
  const medId = activeSlotRefillMedicine.id;
  const medName = activeSlotRefillMedicine.name;

  db.ref(`medicines/${medId}/quantity`).setValue(newQty)
    .then(() => {
      showToast(`Stock updated for ${medName}`);
      closeFillSlotDialog();
      renderEmptySlotsScreen();
    })
    .catch((err) => {
      showToast("Failed to update stock: " + err.message, "danger");
    });
}

// 19. MANAGE USERS ACTIVITY (activity_manage_users.xml & ManageUsersActivity.kt)
// ADMIN ONLY: LIST USERS, PROVISION USERS VIA DIALOG, DELETE USERS
function renderManageUsersScreen() {
  const container = document.getElementById("container-rvUsers");
  if (!container) return;
  container.innerHTML = "";

  if (allUsers.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No users found</div>
      </div>
    `;
    return;
  }

  allUsers.forEach((user) => {
    const card = document.createElement("div");
    card.className = "user-row-card";

    const isSelf = currentUser && currentUser.uid === user.uid;
    const roleCapitalized = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    // item_user.xml
    card.innerHTML = `
      <div style="display: flex; align-items: center; flex: 1;">
        <div class="user-avatar-circle">👤</div>
        <div class="user-text-info">
          <div class="user-name-title">${escapeHtml(user.name)} ${isSelf ? "(You)" : ""}</div>
          <div class="user-email-subtitle">${escapeHtml(user.email || "No email")}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <span class="user-role-badge ${user.role}">${roleCapitalized}</span>
        ${!isSelf ? `
          <button type="button" class="btn-user-delete-icon" title="Delete User">
            🗑️
          </button>
        ` : ""}
      </div>
    `;

    // ManageUsersActivity.kt lines 196-208: confirmDeleteUser(user)
    const deleteBtn = card.querySelector(".btn-user-delete-icon");
    if (deleteBtn) {
      deleteBtn.onclick = () => executeDeleteUserConfirm(user);
    }

    container.appendChild(card);
  });
}

// dialog_create_user.xml (ManageUsersActivity.kt lines 114-194)
function openCreateUserDialog() {
  document.getElementById("form-create-new-user").reset();
  document.getElementById("dialog-create-user").classList.add("open");
}

function closeCreateUserDialog() {
  document.getElementById("dialog-create-user").classList.remove("open");
}

function executeCreateUserSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("etNewUserName").value.trim();
  const email = document.getElementById("etNewUserEmail").value.trim();
  const password = document.getElementById("etNewUserPassword").value.trim();
  const role = document.getElementById("spinnerRole").value.toLowerCase();
  const btn = document.getElementById("btnSaveNewUser");

  if (!name || !email || !password) {
    showToast("Please fill all fields", "danger");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "danger");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Creating...";

  // ManageUsersActivity.kt lines 162-170:
  // Uses a secondary Firebase app instance to create the account without logging out the admin
  const secondaryAppName = "UserCreatorApp_" + Date.now();
  const secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);

  secondaryApp.auth().createUserWithEmailAndPassword(email, password)
    .then((task) => {
      const uid = task.user.uid;
      const newUser = {
        uid: uid,
        name: name,
        email: email,
        role: role
      };
      // ManageUsersActivity.kt line 176
      return db.ref("users/" + uid).setValue(newUser);
    })
    .then(() => {
      showToast("User created successfully!");
      secondaryApp.auth().signOut();
      secondaryApp.delete();
      closeCreateUserDialog();
    })
    .catch((err) => {
      showToast("Error: " + err.message, "danger");
      secondaryApp.delete();
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerText = "Create User";
    });
}

// ManageUsersActivity.kt lines 196-208
function executeDeleteUserConfirm(user) {
  if (confirm(`Are you sure you want to remove ${user.name} (${user.email})?`)) {
    db.ref("users/" + user.uid).remove()
      .then(() => {
        showToast("User deleted");
      })
      .catch((err) => {
        showToast("Error deleting user: " + err.message, "danger");
      });
  }
}

// 20. ANDROID STYLE TOAST NOTIFICATION UTILITY
function showToast(message, type = "normal") {
  const shelf = document.getElementById("toast-shelf");
  if (!shelf) return;

  const bubble = document.createElement("div");
  bubble.className = "android-toast-bubble";
  if (type === "danger") {
    bubble.style.background = "#EF4444";
  }

  bubble.innerText = message;
  shelf.appendChild(bubble);

  setTimeout(() => {
    bubble.style.opacity = "0";
    bubble.style.transform = "translateY(8px)";
    bubble.style.transition = "all 0.22s ease";
    setTimeout(() => bubble.remove(), 220);
  }, 2200);
}

// XSS Sanitizer Helper
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
