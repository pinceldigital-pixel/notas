const COLORS = {
  cream: "#FFFCF2",
  softGray: "#CCC5B9",
  darkGray: "#403D39",
  nearBlack: "#252422",
  accent: "#EB5E28",
};
const SEED_COLORS = [COLORS.accent, "#54D262", "#4DA3FF", "#B084F6", "#FFC857"];

const LS_KEY = "notes_pwa_daniel";

let notes = [];
let editing = null;
let deferredPrompt = null;
const scheduled = new Set();

function load() {
  try {
    notes = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { notes = []; }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(notes));
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff/1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h/24);
  return `${d}d`;
}

function byId(id){ return document.getElementById(id); }

function render() {
  notes.sort((a,b)=> b.updatedAt - a.updatedAt);
  const list = byId("list");
  const empty = byId("empty");
  list.innerHTML = "";
  if (notes.length === 0) {
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  for (const n of notes) {
    const card = document.createElement("div");
    card.className = "card";

    const h3 = document.createElement("h3");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = n.color;
    h3.appendChild(dot);
    const t = document.createElement("span");
    t.textContent = n.title || "(Sin título)";
    h3.appendChild(t);
    card.appendChild(h3);

    const p = document.createElement("p");
    p.style.color = "color-mix(in oklab, var(--soft) 90%, transparent)";
    p.style.minHeight = "3.6em";
    p.textContent = (n.body || "Sin contenido").length > 100 ? (n.body.slice(0,100)+"…") : (n.body || "Sin contenido");
    card.appendChild(p);

    const meta = document.createElement("div");
    meta.className = "meta";

    const left = document.createElement("span");
    left.textContent = `Mod: ${timeAgo(n.updatedAt)}`;
    if (n.remindAt && n.remindAt > Date.now()) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `🔔 ${timeAgo(n.remindAt)}`;
      left.appendChild(document.createTextNode(" "));
      left.appendChild(badge);
    }
    meta.appendChild(left);

    const actions = document.createElement("div");
    actions.className = "actions";
    const editBtn = document.createElement("button");
    editBtn.title = "Editar";
    editBtn.textContent = "✏️";
    editBtn.onclick = () => openEditor(n);
    const delBtn = document.createElement("button");
    delBtn.title = "Eliminar";
    delBtn.textContent = "🗑️";
    delBtn.onclick = () => { notes = notes.filter(x => x.id !== n.id); save(); render(); };
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    meta.appendChild(actions);

    card.appendChild(meta);
    list.appendChild(card);
  }
}

function openEditor(note) {
  editing = note || null;
  byId("editorTitle").textContent = editing ? "Editar nota" : "Nueva nota";
  byId("title").value = editing?.title || "";
  const body = byId("body");
  body.value = editing?.body || "";
  body.style.color = COLORS.cream;
  body.style.caretColor = COLORS.cream;

  const colorRow = byId("colorRow");
  colorRow.innerHTML = "";
  const current = editing?.color || SEED_COLORS[Math.floor(Math.random()*SEED_COLORS.length)];
  let selected = current;
  for (const c of SEED_COLORS) {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "color-swatch" + (c === current ? " selected" : "");
    sw.style.background = c;
    sw.onclick = () => {
      selected = c;
      [...colorRow.children].forEach(ch => ch.classList.remove("selected"));
      sw.classList.add("selected");
    };
    colorRow.appendChild(sw);
  }

  const useReminder = byId("useReminder");
  const reminderDT = byId("reminderDT");
  if (editing?.remindAt) {
    useReminder.checked = true;
    const dt = new Date(editing.remindAt);
    const iso = new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
    reminderDT.value = iso;
    reminderDT.style.display = "";
  } else {
    useReminder.checked = false;
    reminderDT.value = "";
    reminderDT.style.display = "none";
  }
  useReminder.onchange = () => {
    reminderDT.style.display = useReminder.checked ? "" : "none";
  };

  byId("cancelBtn").onclick = () => byId("editor").close();
  byId("saveBtn").onclick = () => {
    const payload = {
      id: editing?.id || crypto.randomUUID(),
      title: byId("title").value.trim() || "(Sin título)",
      body: byId("body").value,
      color: selected,
      createdAt: editing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      remindAt: (useReminder.checked && reminderDT.value) ? new Date(reminderDT.value).getTime() : undefined
    };
    const i = notes.findIndex(x => x.id === payload.id);
    if (i >= 0) notes[i] = payload; else notes.unshift(payload);
    save();
    scheduleAll();
    render();
    byId("editor").close();
  };

  byId("editor").showModal();
}

function scheduleReminder(n) {
  if (!n.remindAt || n.remindAt <= Date.now()) return;
  if (scheduled.has(n.id)) return;
  scheduled.add(n.id);
  const delay = Math.min(n.remindAt - Date.now(), 2147483647);
  setTimeout(async () => {
    try {
      if ("Notification" in window) {
        const show = async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            reg.showNotification(n.title || "Recordatorio", { body: (n.body || "Tocá para abrir la nota").slice(0, 140), tag: n.id });
          } else {
            alert(`Recordatorio: ${n.title}`);
          }
        };
        if (Notification.permission === "granted") await show();
        else if (Notification.permission === "default") {
          const p = await Notification.requestPermission();
          if (p === "granted") await show(); else alert(`Recordatorio: ${n.title}`);
        } else {
          alert(`Recordatorio: ${n.title}`);
        }
      } else {
        alert(`Recordatorio: ${n.title}`);
      }
    } catch {}
  }, Math.max(0, delay));
}

function scheduleAll() {
  notes.forEach(n => scheduleReminder(n));
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById("install");
  btn.style.display = "";
  btn.onclick = async () => {
    btn.style.display = "none";
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  };
});

// Init
load();
registerSW();
scheduleAll();
render();

document.getElementById("add").onclick = () => openEditor(null);

// Simple "tests" in console to validate core functions
console.groupCollapsed("SELF TESTS");
try {
  const id = "test-id";
  const now = Date.now();
  const sample = { id, title:"t", body:"b", color: SEED_COLORS[0], createdAt: now, updatedAt: now };
  notes.unshift(sample);
  save();
  const loaded = JSON.parse(localStorage.getItem(LS_KEY));
  console.assert(Array.isArray(loaded), "LS should be array");
  console.assert(loaded[0].id === id, "Saved note should be first");
  // cleanup
  notes = notes.filter(n => n.id !== id);
  save();
  console.log("LocalStorage tests: OK");
} catch (e) {
  console.error("LocalStorage tests FAILED", e);
}
console.groupEnd();