/* مُنجز — data, dates and shared widgets. The UI lives in app.js. */
(function () {
  'use strict';

  const KEY = 'munjiz.data';

  // ---------- dates ----------
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const WEEK_START = 0; // Sunday — the Omani study week

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5); // b - a

  function monthGrid(y, m) {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() - WEEK_START + 7) % 7;
    const today = todayKey();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m, 1 - offset + i);
      const k = keyOf(d);
      cells.push({ key: k, day: d.getDate(), dow: d.getDay(), inMonth: d.getMonth() === m, isToday: k === today });
    }
    if (!cells[35].inMonth) cells.length = 35;
    return cells;
  }

  function weekKeys(k) {
    const offset = (parse(k).getDay() - WEEK_START + 7) % 7;
    const start = addDays(k, -offset);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  const weekdayNames = (short) => Array.from({ length: 7 }, (_, i) => (short ? DAYS_SHORT : DAYS)[(i + WEEK_START) % 7]);
  const fmtDay = (k) => { const d = parse(k); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const fmtShort = (k) => { const d = parse(k); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

  function relative(k) {
    const n = diffDays(todayKey(), k);
    if (n === 0) return 'اليوم';
    if (n === 1) return 'غدًا';
    if (n === -1) return 'أمس';
    if (n === 2) return 'بعد يومين';
    if (n === -2) return 'قبل يومين';
    if (n > 2) return `بعد ${n} ${n <= 10 ? 'أيام' : 'يومًا'}`;
    return `قبل ${-n} ${-n <= 10 ? 'أيام' : 'يومًا'}`;
  }

  function fmtTime(t) {
    if (!t) return '';
    let [h, m] = t.split(':').map(Number);
    const s = h < 12 ? 'ص' : 'م';
    h = h % 12 || 12;
    return `${h}:${pad(m)} ${s}`;
  }

  // ---------- vocabulary ----------
  const TYPES = {
    task: { label: 'مهمة', icon: 'check-square' },
    homework: { label: 'واجب', icon: 'file' },
    study: { label: 'مذاكرة', icon: 'book' },
    exam: { label: 'اختبار', icon: 'target' },
  };
  const PRIORITY = [{ label: 'عادي' }, { label: 'مهم' }, { label: 'عاجل' }];
  const PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#65A30D', '#64748B', '#1F2A44'];

  // ---------- store ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const listeners = new Set();
  let state = null;

  const DEFAULT_SETTINGS = { view: 'month', remind: 30, notify: false, theme: 'auto', examCal: true };

  function fresh() {
    return {
      v: 1,
      subjects: [
        { id: 'math', name: 'رياضيات', color: '#2563EB' },
        { id: 'phys', name: 'فيزياء', color: '#7C3AED' },
        { id: 'prog', name: 'برمجة', color: '#059669' },
        { id: 'eng', name: 'إنجليزي', color: '#D97706' },
        { id: 'self', name: 'شخصي', color: '#64748B' },
      ],
      tasks: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  function sample() {
    const t = todayKey(), s = fresh();
    s.subjects.splice(4, 0, { id: 'stat', name: 'ستاتيك', color: '#DC2626' });
    const T = (off, title, subject, type, extra = {}) => ({ id: uid(), title, date: addDays(t, off), time: '', subject, type, priority: 0, notes: '', done: false, createdAt: Date.now(), ...extra });
    s.tasks = [
      T(0, 'حل تمارين الفصل 3 — التكامل بالتجزئة', 'math', 'homework', { time: '16:00', priority: 1, notes: 'التمارين 3.1 إلى 3.4' }),
      T(0, 'مراجعة قوانين نيوتن الثلاثة', 'phys', 'study', { time: '20:00', done: true }),
      T(0, 'رفع واجب المختبر على E-Learning', 'prog', 'homework', { time: '23:30', priority: 2 }),
      T(1, 'اختبار قصير — Free Body Diagram', 'stat', 'exam', { time: '10:00', priority: 2, notes: 'القاعة 204' }),
      T(1, 'تسليم تقرير مختبر الفيزياء', 'phys', 'homework', { time: '14:00', priority: 1 }),
      T(2, 'اجتماع مجموعة الدراسة', 'self', 'task', { time: '18:00' }),
      T(3, 'مذاكرة مفردات Chapter 5', 'eng', 'study'),
      T(5, 'اختبار منتصف الفصل — رياضيات', 'math', 'exam', { time: '08:00', priority: 2 }),
      T(8, 'مشروع البرمجة — المرحلة الأولى', 'prog', 'homework', { priority: 1 }),
      T(-1, 'قراءة الفصل 4 — العزوم', 'stat', 'study', { done: true }),
      T(-2, 'واجب فيزياء رقم 3', 'phys', 'homework', { priority: 1 }),
    ];
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
        state.subjects ||= []; state.tasks ||= [];
        return;
      }
    } catch (e) { /* corrupt or blocked → start fresh */ }
    state = fresh();
    persist(false);
  }

  function persist(notify = true) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('تعذّر الحفظ — مساحة المتصفح ممتلئة أو محظورة'); }
    if (notify) listeners.forEach((fn) => fn());
  }

  window.addEventListener('storage', (e) => { if (e.key === KEY) { load(); listeners.forEach((fn) => fn()); } });

  const cmpTime = (a, b) => ((a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0);
  // open first, then most important (an exam counts half a step up), then by time
  const rank = (t) => (t.priority || 0) + (t.type === 'exam' ? 0.5 : 0);
  const byOrder = (a, b) => (a.done - b.done) || (rank(b) - rank(a)) || cmpTime(a, b) || (a.createdAt - b.createdAt);
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : byOrder(a, b));

  const store = {
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    all: () => state.tasks,
    get: (id) => state.tasks.find((t) => t.id === id),
    settings: () => state.settings,
    setSetting(k, v) { state.settings[k] = v; persist(); },

    add(t) {
      const task = { id: uid(), time: '', type: 'task', subject: '', priority: 0, notes: '', done: false, createdAt: Date.now(), ...t };
      state.tasks.push(task); persist(); return task;
    },
    /** repeat: 'daily' | 'weekly'; creates one task per occurrence from t.date through `until` (max 120) */
    addSeries(t, repeat, until) {
      const series = uid(), step = repeat === 'daily' ? 1 : 7, out = [];
      for (let k = t.date; k <= until && out.length < 120; k = addDays(k, step)) {
        out.push({ id: uid(), time: '', type: 'task', subject: '', priority: 0, notes: '', done: false, createdAt: Date.now(), ...t, date: k, series });
      }
      state.tasks.push(...out); persist(); return out;
    },
    update(id, patch) { const t = store.get(id); if (t) { Object.assign(t, patch); persist(); } return t; },
    /** apply the same field changes to this and every later task of its series */
    updateSeries(id, patch) {
      const t = store.get(id); if (!t) return;
      const { date, ...rest } = patch; // dates stay per-occurrence
      state.tasks.filter((x) => x.series && x.series === t.series && x.date >= t.date).forEach((x) => Object.assign(x, rest));
      if (date) t.date = date;
      persist();
    },
    remove(id) {
      const i = state.tasks.findIndex((t) => t.id === id);
      if (i < 0) return [];
      const removed = state.tasks.splice(i, 1); persist(); return removed;
    },
    removeSeriesFrom(id) {
      const t = store.get(id); if (!t) return [];
      const removed = state.tasks.filter((x) => x.series === t.series && x.date >= t.date);
      state.tasks = state.tasks.filter((x) => !removed.includes(x)); persist(); return removed;
    },
    restore(list) { state.tasks.push(...list); persist(); },
    postpone(id, days = 1) { const t = store.get(id); if (!t) return null; const from = t.date; t.date = addDays(t.date < todayKey() ? todayKey() : t.date, days); persist(); return from; },
    cyclePriority(id) { const t = store.get(id); if (!t) return null; t.priority = ((t.priority || 0) + 1) % 3; persist(); return t; },
    /** last distinct titles, for the input suggestions */
    recentTitles(n = 12) { const seen = new Set(), out = []; for (const t of [...state.tasks].sort((a, b) => b.createdAt - a.createdAt)) { if (!seen.has(t.title)) { seen.add(t.title); out.push(t.title); } if (out.length >= n) break; } return out; },
    toggle(id) { const t = store.get(id); if (!t) return null; t.done = !t.done; t.doneAt = t.done ? Date.now() : null; persist(); return t; },
    seriesCount: (t) => (t && t.series ? state.tasks.filter((x) => x.series === t.series && x.date >= t.date).length : 0),
    moveOverdueToToday() {
      const t = todayKey(), moved = store.overdue().map((x) => ({ id: x.id, date: x.date }));
      moved.forEach((m) => { store.get(m.id).date = t; });
      persist(); return moved;
    },
    undoMove(moved) { moved.forEach((m) => { const x = store.get(m.id); if (x) x.date = m.date; }); persist(); },

    subjects: () => state.subjects,
    subject: (id) => state.subjects.find((s) => s.id === id) || { id: '', name: 'بدون مادة', color: '#9A958A' },
    addSubject(name, color) {
      name = (name || '').trim(); if (!name) return null;
      const found = state.subjects.find((s) => s.name === name); if (found) return found;
      const used = new Set(state.subjects.map((s) => s.color));
      const s = { id: uid(), name, color: color || PALETTE.find((c) => !used.has(c)) || PALETTE[state.subjects.length % PALETTE.length] };
      state.subjects.push(s); persist(); return s;
    },
    updateSubject(id, patch) { const s = state.subjects.find((x) => x.id === id); if (s) { Object.assign(s, patch); persist(); } },
    removeSubject(id) {
      state.subjects = state.subjects.filter((s) => s.id !== id);
      state.tasks.forEach((t) => { if (t.subject === id) t.subject = ''; });
      persist();
    },
    subjectUse: (id) => state.tasks.filter((t) => t.subject === id).length,

    // backup
    exportJSON: () => JSON.stringify({ app: 'munjiz', exportedAt: new Date().toISOString(), ...state }, null, 1),
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.tasks) || !Array.isArray(d.subjects)) throw new Error('bad file');
      state = { v: 1, subjects: d.subjects, tasks: d.tasks, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
      persist(); return state.tasks.length;
    },
    loadSample() { const keep = state.settings; state = sample(); state.settings = keep; persist(); },
    clearTasks() { state.tasks = []; persist(); },

    // queries
    on: (k) => state.tasks.filter((t) => t.date === k).sort(byOrder),
    range: (from, to) => state.tasks.filter((t) => t.date >= from && t.date <= to).sort(byDate),
    upcoming(days = 10) { const t = todayKey(); return store.range(addDays(t, 1), addDays(t, days)).filter((x) => !x.done); },
    overdue() { const t = todayKey(); return state.tasks.filter((x) => !x.done && x.date < t).sort(byDate); },
    nextExam() { const t = todayKey(); return state.tasks.filter((x) => x.type === 'exam' && !x.done && x.date >= t).sort(byDate)[0] || null; },
    progress(from, to) { const l = store.range(from, to), d = l.filter((x) => x.done).length; return { done: d, total: l.length, pct: l.length ? Math.round((d / l.length) * 100) : 0 }; },
    streak() {
      let k = todayKey(), n = 0;
      const doneOn = (d) => state.tasks.some((x) => x.done && x.date === d);
      if (!doneOn(k)) k = addDays(k, -1);
      while (doneOn(k)) { n++; k = addDays(k, -1); }
      return n;
    },
    dots(k, max = 4) {
      const list = store.on(k);
      return { items: list.slice(0, max).map((t) => ({ color: store.subject(t.subject).color, done: t.done, type: t.type })), extra: Math.max(0, list.length - max), total: list.length, open: list.filter((t) => !t.done).length };
    },
  };

  // ---------- calendar (.ics) export: lets the phone's own calendar app do the reminding ----------
  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsFold(line) {
    // fold at 73 bytes (RFC 5545 says 75 octets); Arabic is 2 bytes per letter
    const enc = new TextEncoder(); let out = '', cur = '', bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; }
      cur += ch; bytes += b;
    }
    return out + cur;
  }
  function toICS(tasks) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const remind = state.settings.remind || 30;
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Munjiz//Study Planner//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    tasks.forEach((t) => {
      const s = store.subject(t.subject), d = t.date.replace(/-/g, '');
      L.push('BEGIN:VEVENT', `UID:${t.id}@munjiz`, `DTSTAMP:${stamp}`);
      if (t.time) {
        const [h, m] = t.time.split(':').map(Number);
        const end = new Date(2000, 0, 1, h + 1, m);
        const endDay = h + 1 >= 24 ? addDays(t.date, 1).replace(/-/g, '') : d;
        L.push(`DTSTART:${d}T${pad(h)}${pad(m)}00`, `DTEND:${endDay}T${pad(end.getHours())}${pad(end.getMinutes())}00`);
      } else {
        L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(t.date, 1).replace(/-/g, '')}`);
      }
      L.push(`SUMMARY:${icsEscape((t.type === 'exam' ? 'اختبار: ' : '') + t.title)}`);
      L.push(`DESCRIPTION:${icsEscape([s.name, TYPES[t.type].label, t.notes].filter(Boolean).join(' — '))}`);
      // alarm: N minutes before a timed task, 8 AM on the day for an all-day one
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(t.title)}`, t.time ? `TRIGGER:-PT${remind}M` : 'TRIGGER;RELATED=START:PT8H', 'END:VALARM');
      if (t.type === 'exam') L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape('غدًا: ' + t.title)}`, 'TRIGGER:-P1D', 'END:VALARM');
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(icsFold).join('\r\n') + '\r\n';
  }

  /** hand a file to the phone: share sheet when available (lets you pick Calendar/Drive/WhatsApp), download otherwise */
  async function saveFile(name, text, type) {
    const blob = new Blob([text], { type });
    try {
      const file = new File([blob], name, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
  }

  // ---------- in-app reminders (fire while the app is open or in the background tab) ----------
  let timers = [];
  function scheduleReminders() {
    timers.forEach(clearTimeout); timers = [];
    if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = Date.now(), remind = (state.settings.remind || 30) * 60000;
    store.range(todayKey(), addDays(todayKey(), 1)).filter((t) => !t.done && t.time).forEach((t) => {
      const [h, m] = t.time.split(':').map(Number), at = parse(t.date).setHours(h, m) - remind;
      if (at > now && at - now < 864e5 * 2) timers.push(setTimeout(() => notify(t), at - now));
    });
  }
  async function notify(t) {
    const body = `${t.time ? D.fmtTime(t.time) + ' — ' : ''}${store.subject(t.subject).name}`;
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) reg.showNotification(t.title, { body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: t.id, lang: 'ar', dir: 'rtl' });
      else new Notification(t.title, { body, icon: 'icons/icon-192.png', tag: t.id });
    } catch (e) { /* notifications unavailable */ }
  }
  listeners.add(scheduleReminders);

  // ---------- icons (Lucide paths) ----------
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'chev-right': '<path d="m9 18 6-6-6-6"/>',
    'chev-left': '<path d="m15 18-6-6 6-6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    'check-square': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    flag: '<path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5"/>',
    note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4M8 9h8M8 13h5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    rows: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    'arrow-down': '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.6 1.2 2.8 2.5 2.8Z"/>',
    'chev-down': '<path d="m6 9 6 6 6-6"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  };
  const icon = (name, size = 18, extra = '') =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] || ''}</svg>`;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- toast ----------
  let toastEl, toastTimer;
  function toast(msg, action) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${icon(action.icon || 'undo', 16)}${esc(action.label)}</button>` : '');
    const hide = () => toastEl.classList.remove('show');
    if (action) toastEl.querySelector('button').onclick = () => { action.run(); hide(); };
    clearTimeout(toastTimer);
    toastEl.classList.add('show');
    toastTimer = setTimeout(hide, action ? 5500 : 3000);
  }

  // ---------- bottom sheet (a <dialog> styled as a sheet on phones, a card on desktop) ----------
  function sheet(html, { label, onClose } = {}) {
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet';
    if (label) dlg.setAttribute('aria-label', label);
    dlg.innerHTML = html;
    document.body.appendChild(dlg);
    const close = () => { if (dlg.open) dlg.close(); };
    dlg.addEventListener('close', () => { dlg.remove(); onClose && onClose(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    dlg.showModal();
    // land focus on the title (read out by screen readers) rather than ringing the ✕ button
    const h = dlg.querySelector('h2');
    if (h && !dlg.querySelector('[autofocus]')) { h.tabIndex = -1; h.style.outline = 'none'; h.focus({ preventScroll: true }); }
    return { dlg, close };
  }

  function confirmSheet(msg, { ok = 'تأكيد', danger = false } = {}) {
    return new Promise((res) => {
      let answer = false;
      const { dlg, close } = sheet(`<div class="sh-body" style="padding-top:22px"><p style="margin:0 0 4px;font-size:1.05rem">${esc(msg)}</p></div>
        <div class="sh-foot"><span class="sp"></span><button type="button" class="btn ghost" data-close>إلغاء</button><button type="button" class="btn ${danger ? 'danger-fill' : 'primary'}" data-ok>${esc(ok)}</button></div>`, { onClose: () => res(answer) });
      dlg.querySelector('[data-ok]').onclick = () => { answer = true; close(); };
    });
  }

  // ---------- smart quick-add: "اختبار فيزياء بكرة الساعة 10" → title + date + time + subject + type ----------
  // Matching runs on a length-preserving normalised copy (أإآ→ا ة→ه ى→ي) so found spans can be cut from the original.
  const normAr = (s) => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  const WD = [['احد', 0], ['اثنين', 1], ['ثلاثاء', 2], ['ثلاثا', 2], ['اربعاء', 3], ['اربعا', 3], ['خميس', 4], ['جمعه', 5], ['سبت', 6]];
  const B = '(?<=^|\\s)', E = '(?=\\s|$)';
  const PM = ['م', 'مساء', 'العصر', 'عصر', 'المغرب', 'مغرب', 'العشاء', 'بالليل', 'الليل', 'ليل', 'الظهر', 'ظهر'];
  const AM = ['ص', 'صباحا', 'الصبح', 'صبح', 'الصباح', 'الفجر', 'فجر'];
  const SUF = `(${[...PM, ...AM].sort((a, b) => b.length - a.length).join('|')})`;

  function parseQuick(raw, baseDate) {
    let t = String(raw || '').replace(/[ً-ْـ]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, ' ').trim();
    const n = normAr(t), cut = [], out = { date: null, time: null, subject: null, type: null, priority: null };
    const take = (re, fn) => { const m = re.exec(n); if (!m) return false; if (fn(m) === false) return false; cut.push([m.index, m.index + m[0].length]); return true; };
    const today = todayKey();

    // dates, most specific first
    take(new RegExp(`${B}بعد (?:بكره|بكرا|باكر|غد)${E}`), () => { out.date = addDays(today, 2); }) ||
    take(new RegExp(`${B}بعد (\\d{1,2}) (?:يوم|ايام)${E}`), (m) => { out.date = addDays(today, +m[1]); }) ||
    take(new RegExp(`${B}(?:بكره|بكرا|باكر|غدا|الغد)${E}`), () => { out.date = addDays(today, 1); }) ||
    take(new RegExp(`${B}(?:اليوم|الليله)${E}`), () => { out.date = today; }) ||
    take(new RegExp(`${B}الاسبوع (?:الجاي|القادم|الياي)${E}`), () => { out.date = addDays(today, 7); }) ||
    take(new RegExp(`${B}(\\d{1,2}) ?[/\\-.] ?(\\d{1,2})${E}`), (m) => {
      const d = +m[1], mo = +m[2];
      if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
      const y = new Date().getFullYear();
      let k = `${y}-${pad(mo)}-${pad(d)}`;
      if (diffDays(today, k) < -30) k = `${y + 1}-${pad(mo)}-${pad(d)}`;
      out.date = k;
    }) ||
    take(new RegExp(`${B}(?:يوم )?(?:ال)?(${WD.map((w) => w[0]).join('|')})${E}`), (m) => {
      const target = WD.find((w) => w[0] === m[1])[1];
      let off = (target - parse(today).getDay() + 7) % 7;
      if (off === 0) off = 7; // "الأحد" said on a Sunday means next Sunday
      out.date = addDays(today, off);
    });

    // time needs "الساعة", a colon, or ص/م — so "الفصل 3" stays part of the title
    const setTime = (h, mi, suf) => {
      h = +h; mi = +(mi || 0);
      if (h > 23 || mi > 59) return false;
      if (suf && PM.includes(suf)) { if (h < 12 && !(suf.includes('ظهر') && h >= 11)) h += 12; }
      else if (suf && AM.includes(suf)) { if (h === 12) h = 0; }
      else if (h >= 1 && h <= 7) h += 12; // a student's "الساعة 4" is the afternoon
      out.time = `${pad(h)}:${pad(mi)}`;
    };
    take(new RegExp(`${B}(?:ال)?ساعه (\\d{1,2})(?::(\\d{2}))?(?: ?${SUF})?${E}`), (m) => setTime(m[1], m[2], m[3])) ||
    take(new RegExp(`${B}(\\d{1,2}):(\\d{2})(?: ?${SUF})?${E}`), (m) => setTime(m[1], m[2], m[3])) ||
    take(new RegExp(`${B}(\\d{1,2}) ?(ص|م)${E}`), (m) => setTime(m[1], 0, m[2]));

    // type and subject stay in the title — they read naturally there
    if (/(اختبار|امتحان|كويز|ميد|فاينل|نهائي|quiz|exam|midterm|final)/i.test(n)) out.type = 'exam';
    else if (/(واجب|تقرير|تسليم|مشروع|لاب|assignment|homework|report|project)/i.test(n)) out.type = 'homework';
    else if (/(مذاكر|مراجع|ذاكر|راجع|حفظ|قراءه|اقرا|study|review)/i.test(n)) out.type = 'study';
    for (const s of state.subjects) {
      const nm = normAr(s.name.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (nm && new RegExp(`(?<=^|\\s|ال)${nm}(?=\\s|$)`, 'i').test(n)) { out.subject = s.id; break; }
    }
    // priority: "!!" or عاجل → urgent, "!" or مهم → important
    const bangs = (t.match(/!/g) || []).length;
    if (bangs >= 2 || /(?<=^|\s)عاجل(?=\s|$)/.test(n)) out.priority = 2;
    else if (bangs === 1 || /(?<=^|\s)مهم(?=\s|$)/.test(n)) out.priority = 1;

    // drop the date/time words, then tidy dangling glue words
    cut.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { t = t.slice(0, a) + ' ' + t.slice(b); });
    t = t.replace(/!/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/(?:^|\s)(?:يوم|في|الساعة|الساعه|على)$/, '').replace(/^(?:يوم|في)\s/, '').trim();
    out.title = t;
    out.found = cut.length > 0 || !!(out.type || out.subject || out.priority);
    out.date = out.date || baseDate || today;
    return out;
  }

  const D = { keyOf, parse, todayKey, addDays, diffDays, monthGrid, weekKeys, weekdayNames, fmtDay, fmtShort, relative, fmtTime };
  load();
  window.Munjiz = { parseQuick, store, D, TYPES, PRIORITY, PALETTE, MONTHS, DAYS, icon, esc, toast, sheet, confirmSheet, toICS, saveFile, scheduleReminders };
})();
