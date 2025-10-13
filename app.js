// NotiNote – PWA sencilla con recordatorios locales
// Almacena notas en localStorage y agenda recordatorios con Notification API.
// Nota: los 'timers' funcionan cuando la app está abierta. Para recordatorios 100% en segundo plano se requiere push server.
// Aun así, la app es instalable, offline y pide permiso de notificaciones.

const $ = (sel) => document.querySelector(sel);
const listEl = $("#list");
const modal = $("#modal");
const titleInput = $("#noteTitle");
const dateInput = $("#noteDate");
const timeInput = $("#noteTime");
const saveBtn = $("#saveNote");
const cancelBtn = $("#cancelNote");
const closeBtn = $("#closeModal");
const fab = $("#fab");
const search = $("#search");
const modalTitle = $("#modalTitle");

let editingId = null;
let timers = {}; // id -> timerId

const WEEKDAYS = ["DOMINGO","LUNES","MARTES","MIÉRCOLES","JUEVES","VIERNES","SÁBADO"];

function fmtDateLabel(isoDate){
  const d = new Date(isoDate + 'T00:00:00');
  return WEEKDAYS[d.getDay()] + ' ' + d.getDate();
}

function loadNotes(){
  try { return JSON.parse(localStorage.getItem('notinote_notes')||'[]'); } catch(e){ return []; }
}
function saveNotes(arr){
  localStorage.setItem('notinote_notes', JSON.stringify(arr));
}

function render(){
  const q = (search.value || '').toLowerCase();
  const notes = loadNotes().sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time));
  listEl.innerHTML = '';
  for(const n of notes){
    if(q && !n.title.toLowerCase().includes(q)) continue;
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="row">
        <span class="square"></span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="title">${n.title}</div>
            <div class="alarm">🕑</div>
          </div>
          <div class="sub">${fmtDateLabel(n.date)} - A LAS ${n.time} HRS</div>
        </div>
        <div class="actions">
          <button class="iconbtn" title="Editar">✎</button>
          <button class="iconbtn" title="Eliminar">🗑</button>
        </div>
      </div>
    `;
    const [editBtn, delBtn] = el.querySelectorAll('.iconbtn');
    editBtn.onclick = ()=> openModal(n);
    delBtn.onclick = ()=> removeNote(n.id);
    listEl.appendChild(el);
  }
}

function openModal(note){
  modal.classList.remove('hidden');
  if(note){
    modalTitle.textContent = 'Editar nota';
    editingId = note.id;
    titleInput.value = note.title;
    dateInput.value = note.date;
    timeInput.value = note.time;
  } else {
    modalTitle.textContent = 'Nueva nota';
    editingId = null;
    titleInput.value = '';
    dateInput.value = '';
    timeInput.value = '';
  }
  setTimeout(()=> titleInput.focus(), 50);
}
function closeModal(){ modal.classList.add('hidden'); }

function removeNote(id){
  const notes = loadNotes().filter(n=> n.id !== id);
  saveNotes(notes);
  if(timers[id]){ clearTimeout(timers[id]); delete timers[id]; }
  render();
}

function upsertNote(){ // validar y guardar
  const title = titleInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  if(!title || !date || !time){ alert('Completá título, fecha y hora.'); return; }
  const notes = loadNotes();
  if(editingId){
    const i = notes.findIndex(n=> n.id === editingId);
    if(i>=0) notes[i] = { ...notes[i], title, date, time };
  } else {
    notes.unshift({ id: String(Date.now()), title, date, time });
  }
  saveNotes(notes);
  scheduleTimers(); // reagendar
  render();
  closeModal();
}

// --- Notificaciones y SW ---
async function ensureSW(){
  if('serviceWorker' in navigator){
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      return reg;
    } catch(e){ console.warn('SW fail', e); }
  }
  return null;
}
async function askNotificationPermission(){
  if(!('Notification' in window)) return false;
  if(Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

async function scheduleTimers(){
  // Cancela existentes
  for(const id in timers){ clearTimeout(timers[id]); }
  timers = {};
  const reg = await navigator.serviceWorker.getRegistration();
  const canNotify = reg && (Notification.permission === 'granted');
  const now = Date.now();
  const notes = loadNotes();
  for(const n of notes){
    const when = new Date(n.date + 'T' + n.time + ':00').getTime();
    const delay = when - now;
    if(delay > 0 && delay < 1000 * 60 * 60 * 24 * 30){ // < 30 días
      timers[n.id] = setTimeout(()=>{
        if(canNotify){
          reg.showNotification('Recordatorio', {
            body: n.title + ' — ' + n.time + ' hrs',
            tag: 'notinote-' + n.id,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png'
          });
        } else {
          alert('Recordatorio: ' + n.title + ' (' + n.time + ' hrs)');
        }
      }, delay);
    }
  }
}

// --- Eventos UI ---
fab.onclick = ()=> openModal();
cancelBtn.onclick = closeModal;
closeBtn.onclick = closeModal;
saveBtn.onclick = upsertNote;
search.oninput = render;

// Inicialización
(async () => {
  await ensureSW();
  await askNotificationPermission();
  render();
  scheduleTimers();
})();