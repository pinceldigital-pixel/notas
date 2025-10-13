// NotiNote v3 – PWA con recordatorios opcionales y mejoras visuales
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
const addTop = $("#addTop");
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
    const sub = (n.date && n.time) ? `<div class="sub">${fmtDateLabel(n.date)} - A LAS ${n.time} HRS</div>` : '';
    el.innerHTML = `
      <div class="row">
        <span class="square"></span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="title">${n.title}</div>
          </div>
          ${sub}
        </div>
        <div class="actions">
          <button class="iconbtn" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" stroke-width="1.5" fill="currentColor"/><path d="M14.06 6.19l3.75 3.75" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
          <button class="iconbtn" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16" stroke="currentColor" stroke-width="2"/><path d="M10 4h4a2 2 0 0 1 2 2v1H8V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/><path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" stroke="currentColor" stroke-width="2"/></svg>
          </button>
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
    dateInput.value = note.date || '';
    timeInput.value = note.time || '';
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
  try{ closeModal(); }catch(e){}
}

async function upsertNote(){ // validar y guardar
  const title = titleInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  if(!title){ alert('Completá el título.'); return; }
  const notes = loadNotes();
  const hasReminder = !!(date && time);
  if(hasReminder && 'Notification' in window && Notification.permission==='default'){
    try{ await Notification.requestPermission(); }catch(e){}
  }
  if(editingId){
    const i = notes.findIndex(n=> n.id === editingId);
    if(i>=0){
      notes[i] = { ...notes[i], title, date: hasReminder?date:'', time: hasReminder?time:'' };
    }
  } else {
    notes.unshift({ id: String(Date.now()), title, date: hasReminder?date:'', time: hasReminder?time:'' });
  }
  saveNotes(notes);
  scheduleTimers(); // reagendar
  render();
  try{ closeModal(); }catch(e){}
  closeModal();
}

// --- SW & notifications ---
async function ensureSW(){
  if('serviceWorker' in navigator){
    try { return await navigator.serviceWorker.register('./sw-v7.js'); } catch(e){}
  }
  return null;
}

async function scheduleTimers(){
  for(const id in timers){ clearTimeout(timers[id]); }
  timers = {};
  const reg = await navigator.serviceWorker.getRegistration();
  const canNotify = reg && (Notification.permission === 'granted');
  const now = Date.now();
  const notes = loadNotes();
  for(const n of notes){
    if(!(n.date && n.time)) continue; // sólo si hay recordatorio
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

// UI events
fab.onclick = ()=> openModal();
if(addTop) addTop.onclick = ()=> openModal();
cancelBtn.onclick = closeModal;
closeBtn.onclick = closeModal;
saveBtn.onclick = upsertNote;
search.oninput = render;

// init
(async () => {
  await ensureSW();
  closeModal();
  render();
  try{ closeModal(); }catch(e){}
  scheduleTimers();
})();
// Extra: cerrar con ESC y click en overlay
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closeModal();
});
// Cerrar al click en overlay (fuera de la hoja)
document.addEventListener('click', (e)=>{
  const m = document.getElementById('modal');
  if(!m) return;
  if(m.classList.contains('hidden')) return;
  const sheet = m.querySelector('.sheet');
  if(!sheet) return;
  if(!sheet.contains(e.target)) closeModal();
});
