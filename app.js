/* مُنجز — UI. Data, dates, parsing and sheets live in core.js. */
(function () {
  'use strict';
  const { store, D, TYPES, PRIORITY, PALETTE, MONTHS, DAYS, icon, esc, toast, sheet, confirmSheet, toICS, saveFile, scheduleReminders, parseQuick } = Munjiz;
  const $ = (s, r = document) => r.querySelector(s);
  const VERSION = '1.2.1';

  const now = new Date();
  const ui = {
    tab: sessionStorage.getItem('munjiz.tab') || 'agenda',
    y: now.getFullYear(), m: now.getMonth(), selected: D.todayKey(),
    showDone: false, showLater: false,
  };
  const view = () => store.settings().view || 'month';
  const dismissed = (w) => { try { return localStorage.getItem('munjiz.dismiss.' + w) === '1'; } catch (e) { return false; } };
  const dismiss = (w) => { try { localStorage.setItem('munjiz.dismiss.' + w, '1'); } catch (e) {} };

  // ---------- theme ----------
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const th = store.settings().theme || 'auto';
    const mode = th === 'auto' ? (darkMQ.matches ? 'dark' : 'light') : th;
    document.documentElement.dataset.theme = mode;
    $('#themeColor').content = mode === 'dark' ? '#1A2030' : '#FFFCF5';
    $('#themeBtn').innerHTML = mode === 'dark' ? `${icon('sun', 17)}نهاري` : `${icon('moon', 17)}ليلي`;
    $('#themeBtn').setAttribute('aria-label', mode === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي');
  }
  darkMQ.addEventListener('change', applyTheme);

  // ---------- static chrome ----------
  $('#menuBtn').innerHTML = icon('menu', 22);
  $('#pv').innerHTML = icon('chev-right', 20);
  $('#nx').innerHTML = icon('chev-left', 20);
  $('#addBtn').innerHTML = icon('plus', 28, 'stroke-width="2.4"');
  document.querySelectorAll('.qa .qi').forEach((e) => (e.innerHTML = icon('plus', 20)));
  document.querySelectorAll('.qa [data-more]').forEach((e) => (e.innerHTML = icon('note', 19)));
  $('#wd').innerHTML = D.weekdayNames(true).map((n) => `<div>${n}</div>`).join('');

  // ---------- task row (shared by every list) ----------
  function rowHTML(t, { showDate = false } = {}) {
    const s = store.subject(t.subject), today = D.todayKey();
    const late = !t.done && t.date < today;
    const when = showDate ? `<span class="${late ? 'late' : 'when'}">${D.relative(t.date)}</span>` : '';
    return `<li class="row p${t.priority || 0} ${t.done ? 'done' : ''} ${t.type === 'exam' ? 'exam' : ''}" data-id="${t.id}">
      <span class="rv rv-done">${icon('check', 18)}تم</span><span class="rv rv-later">بكرة${icon('arrow-left', 18)}</span>
      <div class="row-in">
        <button class="ck" data-act="toggle" data-id="${t.id}" aria-pressed="${t.done}" aria-label="${t.done ? 'إلغاء الإنجاز' : 'إنجاز'}: ${esc(t.title)}"><i>${icon('check', 14, 'stroke-width="3"')}</i></button>
        <button class="rb" data-act="edit" data-id="${t.id}"><span class="tt">${esc(t.title)}</span>
          <span class="mt">${when}${t.type === 'exam' ? '<span class="ex">اختبار</span>' : ''}${t.time ? `<span>${D.fmtTime(t.time)}</span>` : ''}${t.subject ? `<span class="sd"><i style="background:${s.color}"></i>${esc(s.name)}</span>` : ''}${t.type !== 'exam' && t.type !== 'task' ? `<span>${TYPES[t.type].label}</span>` : ''}${t.series ? icon('repeat', 13) : ''}${t.notes ? icon('note', 13) : ''}</span></button>
        <button class="pf" data-act="prio" data-id="${t.id}" aria-label="الأولوية: ${PRIORITY[t.priority || 0].label} — اضغط للتغيير">${t.priority ? `<span class="stamp">${PRIORITY[t.priority].label}</span>` : icon('flag', 18)}</button>
      </div></li>`;
  }
  const listHTML = (arr, opt) => `<ul class="list">${arr.map((t) => rowHTML(t, opt)).join('')}</ul>`;

  // ---------- render ----------
  function render() {
    const a = document.activeElement;
    const refocus = a && a.dataset && a.dataset.act && !a.closest('dialog') ? `[data-act="${a.dataset.act}"]${a.dataset.id ? `[data-id="${a.dataset.id}"]` : a.dataset.key ? `[data-key="${a.dataset.key}"]` : a.dataset.t ? `[data-t="${a.dataset.t}"]` : ''}` : null;
    applyTheme();
    document.body.dataset.tab = ui.tab;
    renderTabs(); renderAgenda(); renderCal();
    holdHeight();
    $('#recent').innerHTML = store.recentTitles().map((t) => `<option value="${esc(t)}">`).join('');
    if (refocus && !document.querySelector('dialog[open]')) { const el = document.querySelector(refocus); if (el) el.focus({ preventScroll: true }); }
  }

  // Tapping between days (or ticking tasks off) changes how long the page is; when it gets shorter
  // the browser yanks the scroll position and the screen seems to jump. Let the visible pane only grow,
  // and start over when the tab, view or month changes.
  function holdHeight(reset) {
    const pane = ui.tab === 'cal' ? $('#calPane') : $('#agendaPane');
    if (reset || matchMedia('(min-width:900px)').matches) { $('#calPane').style.minHeight = $('#agendaPane').style.minHeight = ''; if (reset) return; }
    pane.style.minHeight = Math.max(pane.offsetHeight, parseFloat(pane.style.minHeight) || 0) + 'px';
  }

  function renderTabs() {
    const open = store.on(D.todayKey()).filter((t) => !t.done).length + store.overdue().length;
    $('#tAgenda').innerHTML = `<span class="tw">${icon('check-square', 22)}${open ? `<span class="b">${open}</span>` : ''}</span><span class="tl">مهامي</span>`;
    $('#tCal').innerHTML = `${icon('calendar', 22)}<span class="tl">التقويم</span>`;
    $('#tAgenda').setAttribute('aria-current', ui.tab === 'agenda' ? 'page' : 'false');
    $('#tCal').setAttribute('aria-current', ui.tab === 'cal' ? 'page' : 'false');
  }

  function renderAgenda() {
    const t = D.todayKey(), dt = D.parse(t);
    const todayAll = store.on(t), todayOpen = todayAll.filter((x) => !x.done), todayDone = todayAll.filter((x) => x.done);
    const over = store.overdue(), ex = store.nextExam(), streak = store.streak();
    const tomorrow = store.on(D.addDays(t, 1)).filter((x) => !x.done);
    const week = store.range(D.addDays(t, 2), D.addDays(t, 7)).filter((x) => !x.done);
    const later = store.range(D.addDays(t, 8), D.addDays(t, 400)).filter((x) => !x.done);

    // glance: one line answers "how's today?"
    const left = todayOpen.length;
    const line = !todayAll.length ? 'يومك فاضي — سجّل أول مهمة' : left ? `باقي ${left === 1 ? 'مهمة واحدة' : left === 2 ? 'مهمتان' : `${left} مهام`} من ${todayAll.length}` : 'أنجزت كل مهام اليوم';
    let stamps = '';
    if (streak >= 2) stamps += `<span class="stampx streak">${icon('flame', 14)}سلسلة ${streak} أيام</span>`;
    if (todayAll.length && !left) stamps += `<span class="stampx done">${icon('check', 14)}يومك مكتمل</span>`;
    let sticky = '';
    if (ex) {
      const n = D.diffDays(t, ex.date);
      sticky = `<button class="sticky" data-act="edit" data-id="${ex.id}"><div class="cd">${n === 0 ? 'اليوم!' : D.relative(ex.date)}</div><span class="h">أقرب اختبار</span>
        <div class="t">${esc(ex.title)}</div><div class="s">${D.fmtDay(ex.date)}${ex.time ? ' · ' + D.fmtTime(ex.time) : ''}</div></button>`;
    }
    $('#glance').innerHTML = `<div class="glance"><span class="num">${dt.getDate()}</span><div><h1>${DAYS[dt.getDay()]}</h1><p>${MONTHS[dt.getMonth()]} · ${line}</p></div></div>
      ${todayAll.length ? `<div class="tally" aria-hidden="true">${todayAll.map((x) => `<i class="${x.done ? 'on' : ''}"></i>`).join('')}<span>${todayDone.length}/${todayAll.length}</span></div>` : ''}
      ${stamps ? `<div class="stamps">${stamps}</div>` : ''}`;
    $('#examNote').innerHTML = sticky;

    if (!store.all().length) {
      $('#agenda').innerHTML = `<div class="welcome"><h2>سجّل بجملة واحدة</h2>
        <p>اكتب مثل ما تتكلم، ومُنجز يفهم اليوم والساعة والمادة والنوع:</p>
        <div class="ex">${['اختبار فيزياء بكرة الساعة 10', 'واجب رياضيات الخميس', 'مذاكرة برمجة بعد بكرة 4م'].map((e) => `<button data-act="try" data-text="${e}">«${e}»</button>`).join('')}</div>
        <button class="lbtn" data-act="sample">${icon('sparkle', 18)}جرّب ببيانات تجريبية</button></div>`;
      return;
    }

    let h = '';
    if (over.length) h += `<div class="sec over"><div class="sec-h">${icon('alert', 18)}<b>متأخرة</b> <span class="n">${over.length}</span><button class="act" data-act="move-overdue">انقلها لليوم</button></div>${listHTML(over, { showDate: true })}</div>`;
    h += `<div class="sec"><div class="sec-h"><b>اليوم</b> <span class="n">${todayOpen.length ? todayOpen.length + ' باقية' : ''}</span></div>`;
    if (todayOpen.length || todayDone.length) {
      h += `<ul class="list">${todayOpen.map((x) => rowHTML(x)).join('')}${todayDone.length ? `<li><button class="fold" data-act="fold-done" aria-expanded="${ui.showDone}">${icon('chev-down', 16)}منجزة اليوم (${todayDone.length})</button></li>${ui.showDone ? todayDone.map((x) => rowHTML(x)).join('') : ''}` : ''}</ul>`;
    } else h += `<div class="list"><div class="empty-day">لا مهام اليوم — اكتب في السطر فوق لتضيف.</div></div>`;
    h += '</div>';
    if (tomorrow.length) h += `<div class="sec"><div class="sec-h"><b>غدًا</b> <span class="n">${tomorrow.length}</span></div>${listHTML(tomorrow)}</div>`;
    if (week.length) h += `<div class="sec"><div class="sec-h"><b>هذا الأسبوع</b> <span class="n">${week.length}</span></div>${listHTML(week, { showDate: true })}</div>`;
    if (later.length) {
      h += `<div class="sec"><div class="sec-h"><b>لاحقًا</b> <span class="n">${later.length}</span></div>${ui.showLater ? listHTML(later, { showDate: true }) : `<div class="list"><button class="fold" data-act="fold-later" aria-expanded="false">${icon('chev-down', 16)}عرض ${later.length} ${later.length <= 10 ? 'مهام' : 'مهمة'}</button></div>`}</div>`;
    }
    if (!dismissed('swipe')) h += `<div class="tip">${icon('sparkle', 18)}<p>اسحب أي مهمة لليسار لتنجزها، ولليمين لتأجيلها لبكرة. واضغط العلم لتغيير أولويتها.</p><button class="x" data-act="dismiss" data-what="swipe" aria-label="إخفاء">${icon('x', 16)}</button></div>`;
    if (!isStandalone() && !dismissed('install')) h += `<div class="tip">${icon('phone', 18)}<p><b>ثبّت مُنجز على شاشتك الرئيسية</b> ليفتح كتطبيق ويعمل بدون إنترنت.</p><button class="lbtn" data-act="install" style="min-height:36px;padding:0 10px">كيف؟</button><button class="x" data-act="dismiss" data-what="install" aria-label="إخفاء">${icon('x', 16)}</button></div>`;
    $('#agenda').innerHTML = h;
  }

  function dotsHTML(k, max = 3) {
    const d = store.dots(k, max);
    return d.items.map((x) => `<i class="dot ${x.done ? 'done' : ''} ${x.type === 'exam' ? 'exam' : ''}" style="background:${x.color};color:${x.color}"></i>`).join('') + (d.extra ? `<span class="pl">+${d.extra}</span>` : '');
  }

  function renderCal() {
    const wk = view() === 'week', k = ui.selected, t = D.todayKey();
    $('#vMonth').setAttribute('aria-pressed', !wk); $('#vWeek').setAttribute('aria-pressed', wk);
    $('#wd').hidden = wk;
    let from, to;
    if (wk) {
      const keys = D.weekKeys(k); from = keys[0]; to = keys[6];
      const a = D.parse(from), b = D.parse(to);
      $('#mt').innerHTML = a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]}<small>${a.getFullYear()}</small>` : `${MONTHS[a.getMonth()]}–${MONTHS[b.getMonth()]}<small>${b.getFullYear()}</small>`;
      const names = D.weekdayNames(true);
      $('#grid').className = 'wstrip';
      $('#grid').innerHTML = keys.map((key, i) => {
        const d = store.dots(key), dn = D.parse(key).getDate();
        return `<button class="w ${key === t ? 'today' : ''} ${key === k ? 'sel' : ''}" role="gridcell" data-act="day" data-key="${key}" aria-selected="${key === k}" aria-label="${D.fmtDay(key)}${d.total ? `، ${d.open} مفتوحة من ${d.total}` : ''}">
          <span class="wn">${names[i]}</span><span class="dn">${dn}</span><span class="dd">${dotsHTML(key)}</span></button>`;
      }).join('');
    } else {
      from = D.keyOf(new Date(ui.y, ui.m, 1)); to = D.keyOf(new Date(ui.y, ui.m + 1, 0));
      $('#mt').innerHTML = `${MONTHS[ui.m]}<small>${ui.y}</small>`;
      $('#grid').className = 'mgrid';
      $('#grid').innerHTML = D.monthGrid(ui.y, ui.m).map((c) => {
        const d = store.dots(c.key);
        return `<button class="d ${c.inMonth ? '' : 'out'} ${c.isToday ? 'today' : ''} ${c.key === k ? 'sel' : ''}" role="gridcell" data-act="day" data-key="${c.key}" aria-selected="${c.key === k}" aria-label="${D.fmtDay(c.key)}${d.total ? `، ${d.open} مفتوحة من ${d.total}` : ''}" ${c.key === k ? '' : 'tabindex="-1"'}>
          <span class="dn">${c.day}</span><span class="dd">${dotsHTML(c.key)}</span></button>`;
      }).join('');
    }
    const used = new Set(store.range(from, to).map((x) => x.subject).filter(Boolean));
    const subs = store.subjects().filter((s) => used.has(s.id));
    $('#legend').innerHTML = subs.length ? subs.map((s) => `<span><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('') + `<span><i class="dot exam" style="background:var(--muted)"></i>اختبار</span>` : '';
    $('#legend').hidden = !subs.length;

    const list = store.on(k), dt = D.parse(k);
    $('#dayHead').innerHTML = `<span class="num">${dt.getDate()}</span><div><h2>${DAYS[dt.getDay()]}</h2><span class="r">${MONTHS[dt.getMonth()]} · ${D.relative(k)}</span></div>${list.length ? `<span class="c">${list.filter((x) => x.done).length}/${list.length} منجزة</span>` : ''}`;
    $('#dayList').innerHTML = list.length ? listHTML(list) : '';
    $('#qaDayIn').placeholder = list.length ? 'أضف لهذا اليوم…' : `لا مهام ${k === t ? 'اليوم' : 'في هذا اليوم'} — اكتب هنا لتضيف`;
  }

  // ---------- navigation ----------
  function setTab(t) { ui.tab = t; try { sessionStorage.setItem('munjiz.tab', t); } catch (e) {} holdHeight(true); render(); scrollTo({ top: 0 }); }
  function select(k) { ui.selected = k; const d = D.parse(k); ui.y = d.getFullYear(); ui.m = d.getMonth(); render(); }
  function step(dir) {
    holdHeight(true);
    if (view() === 'week') { select(D.addDays(ui.selected, dir * 7)); return; }
    const d = new Date(ui.y, ui.m + dir, 1); ui.y = d.getFullYear(); ui.m = d.getMonth();
    const td = new Date();
    ui.selected = td.getFullYear() === ui.y && td.getMonth() === ui.m ? D.todayKey() : D.keyOf(d);
    render();
  }
  function goToday() { select(D.todayKey()); }

  // ---------- adding: one sentence is enough ----------
  function afterAdd(task) {
    const where = task.date === D.todayKey() ? 'اليوم' : D.relative(task.date);
    if (task.type === 'exam' && store.settings().examCal !== false) {
      toast(`أُضيف الاختبار (${where})`, { label: 'للتقويم', icon: 'calendar-plus', run: () => exportICS([task], `munjiz-${task.date}.ics`) });
    } else toast(`أُضيفت إلى ${where}${task.time ? ' ' + D.fmtTime(task.time) : ''}`, { label: 'تعديل', icon: 'edit', run: () => openTask({ id: task.id }) });
  }

  function heardHTML(p, base) {
    const bits = [];
    if (p.date !== base) bits.push(`${icon('calendar', 13)}${D.relative(p.date)}`);
    if (p.time) bits.push(`${icon('clock', 13)}${D.fmtTime(p.time)}`);
    if (p.subject) { const s = store.subject(p.subject); bits.push(`<i class="dot" style="background:${s.color}"></i>${esc(s.name)}`); }
    if (p.type) bits.push(TYPES[p.type].label);
    if (p.priority) bits.push(`${icon('flag', 13)}${PRIORITY[p.priority].label}`);
    return bits.map((b) => `<span class="chip-s">${b}</span>`).join('');
  }

  function wireQuick(form) {
    const inp = $('input', form), go = $('.go', form), prev = $('.qprev', form);
    const base = () => (form.dataset.default === 'selected' ? ui.selected : D.todayKey());
    const update = () => {
      const v = inp.value.trim(); go.hidden = !v;
      const p = v ? parseQuick(v, base()) : null;
      prev.hidden = !(p && p.found);
      if (p && p.found) prev.innerHTML = heardHTML(p, base());
    };
    inp.addEventListener('input', update);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      const p = parseQuick(v, base());
      const task = store.add({ title: p.title || v, date: p.date, time: p.time || '', subject: p.subject || '', type: p.type || 'task', priority: p.priority || 0 });
      inp.value = ''; update(); inp.focus();
      afterAdd(task);
    });
    $('[data-more]', form).addEventListener('click', () => { const v = inp.value; inp.value = ''; update(); openTask({ text: v, date: base() }); });
  }
  wireQuick($('#qaAgenda')); wireQuick($('#qaDay'));

  // ---------- task sheet: big title field + one-line choice rows ----------
  function openTask({ id, date, text } = {}) {
    const editing = id ? store.get(id) : null;
    const base = date || ui.selected;
    const t = editing ? { ...editing } : { title: '', date: base, time: '', type: 'task', subject: '', priority: 0, notes: '' };
    const n = store.seriesCount(editing);
    const touched = new Set(); // fields the user picked by hand win over what the parser hears
    const T0 = D.todayKey();
    const opt = (grp, val, label, on, cls = '') => `<button type="button" class="opt ${cls}" data-g="${grp}" data-v="${val}" aria-pressed="${on}">${label}</button>`;

    const { dlg, close } = sheet(`<form novalidate>
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head"><h2>${editing ? 'تعديل المهمة' : 'مهمة جديدة'}</h2><button type="button" class="ibtn" data-close aria-label="إغلاق">${icon('x', 22)}</button></div>
      <div class="sh-body">
        <div class="field"><label class="sr" for="f-title">المهمة</label>
          <input class="big-in" id="f-title" list="recent" maxlength="140" autocomplete="off" enterkeyhint="done" placeholder="مثل: اختبار فيزياء بكرة الساعة 10" value="${esc(editing ? t.title : '')}">
          <div class="heard" id="f-heard"></div><div class="err" id="f-err" role="alert"></div></div>
        <div class="field"><span class="lab">متى</span><div class="scroller" id="r-date"></div>
          <div class="trow"><label class="lab" for="f-time">الساعة</label><input class="in sm" type="time" id="f-time" value="${t.time || ''}"><button type="button" class="clr" data-clrtime aria-label="بدون وقت">${icon('x', 16)}</button><span class="hint">اختياري</span></div></div>
        <div class="field"><span class="lab">المادة</span><div class="scroller" id="r-subject"></div></div>
        <div class="field"><span class="lab">النوع</span><div class="scroller">${Object.entries(TYPES).map(([k, v]) => opt('type', k, icon(v.icon, 16) + v.label, t.type === k)).join('')}</div></div>
        <div class="field"><span class="lab">الأولوية</span><div class="scroller">${PRIORITY.map((p, i) => opt('priority', i, (i ? icon('flag', 15, 'fill="currentColor"') : '') + p.label, (t.priority || 0) === i, 'p' + i)).join('')}</div></div>
        <details class="more" ${editing && (t.notes || n > 1) ? 'open' : ''}><summary>${icon('chev-down', 16)}ملاحظات${editing ? '' : ' وتكرار'}</summary><div class="inner">
          <textarea class="in" id="f-notes" placeholder="القاعة، الصفحات، رابط…">${esc(t.notes)}</textarea>
          ${editing ? '' : `<div class="field"><span class="lab">التكرار</span><div class="scroller">${opt('repeat', 'none', 'مرة واحدة', true)}${opt('repeat', 'weekly', icon('repeat', 14) + 'كل أسبوع', false)}${opt('repeat', 'daily', 'كل يوم', false)}</div>
            <div id="f-untilw" hidden style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="lab">حتى</span><input class="in sm" type="date" id="f-until"><span class="hint" id="f-ucount"></span></div></div>`}
          ${n > 1 ? `<label class="check"><input type="checkbox" id="f-all" checked> طبّق على هذه و${n - 1 === 1 ? 'المرة القادمة' : `الـ ${n - 1} القادمة`} من التكرار</label>` : ''}
        </div></details>
      </div>
      <div class="sh-foot">
        ${editing ? `<button type="button" class="btn danger" data-del aria-label="حذف">${icon('trash', 19)}</button>
          <button type="button" class="btn ghost" data-later>${icon('arrow-left', 17)}بكرة</button>
          <button type="button" class="btn ghost" data-ics aria-label="أضف لتقويم الجوال">${icon('calendar-plus', 18)}</button>` : `<button type="button" class="btn ghost" data-again>${icon('plus', 17)}وأخرى</button>`}
        <span class="sp"></span>
        <button type="submit" class="btn primary">${icon('check', 18)}${editing ? 'حفظ' : 'إضافة'}</button>
      </div></form>`, { label: editing ? 'تعديل المهمة' : 'مهمة جديدة' });

    const f = $('form', dlg), title = $('#f-title', dlg);
    let repeat = 'none';

    const drawDate = () => {
      const quick = [[T0, 'اليوم'], [D.addDays(T0, 1), 'غدًا'], [D.addDays(T0, 2), 'بعد غد']];
      const isQuick = quick.some(([k]) => k === t.date);
      $('#r-date', dlg).innerHTML = quick.map(([k, l]) => opt('date', k, l, t.date === k)).join('') +
        `<input class="in sm" type="date" id="f-date" value="${t.date}" aria-label="تاريخ آخر" style="${isQuick ? '' : 'border-color:var(--sel);font-weight:700'}">`;
      const ti = $('#f-time', dlg); if (ti && ti.value !== (t.time || '')) ti.value = t.time || '';
    };
    const drawSubjects = () => {
      $('#r-subject', dlg).innerHTML = opt('subject', '', 'بدون', !t.subject) + store.subjects().map((s) => opt('subject', s.id, `<span class="sw" style="background:${s.color}"></span>${esc(s.name)}`, t.subject === s.id)).join('') +
        `<button type="button" class="opt" data-addsubj>${icon('plus', 15)}مادة</button>`;
    };
    const syncPressed = (g) => dlg.querySelectorAll(`[data-g="${g}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v) === String(t[g] ?? '')));
    drawDate(); drawSubjects();

    // live: what the parser understood flows into the choices (unless picked by hand)
    const heard = () => {
      if (editing) return;
      const p = parseQuick(title.value, base);
      if (!touched.has('date')) t.date = p.date;
      if (!touched.has('time')) t.time = p.time || '';
      if (!touched.has('subject')) t.subject = p.subject || '';
      if (!touched.has('type')) t.type = p.type || 'task';
      if (!touched.has('priority')) t.priority = p.priority || 0;
      drawDate(); syncPressed('subject'); syncPressed('type'); syncPressed('priority');
      $('#f-heard', dlg).innerHTML = p.found && title.value.trim() ? `فهمت: ${heardHTML(p, '')}` : '';
      updUntil();
    };
    title.addEventListener('input', () => { $('#f-err', dlg).textContent = ''; heard(); });

    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (b) {
        const g = b.dataset.g;
        if (g === 'repeat') { repeat = b.dataset.v; dlg.querySelectorAll('[data-g=repeat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); updUntil(); return; }
        touched.add(g);
        t[g] = g === 'priority' ? Number(b.dataset.v) : b.dataset.v;
        if (g === 'date') drawDate(); else syncPressed(g);
        return;
      }
      if (e.target.closest('[data-clrtime]')) { t.time = ''; touched.add('time'); $('#f-time', dlg).value = ''; return; }
      if (e.target.closest('[data-addsubj]')) {
        const btn = e.target.closest('[data-addsubj]'), inp = document.createElement('input');
        inp.className = 'in sm'; inp.placeholder = 'اسم المادة'; inp.style.width = '140px'; inp.enterKeyHint = 'done'; inp.setAttribute('aria-label', 'اسم المادة الجديدة');
        btn.replaceWith(inp); inp.focus();
        let done = false;
        const commit = () => { if (done) return; done = true; const s = store.addSubject(inp.value); if (s) { t.subject = s.id; touched.add('subject'); } drawSubjects(); };
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done = true; drawSubjects(); } });
        inp.addEventListener('blur', commit);
      }
    });
    dlg.addEventListener('change', (e) => {
      if (e.target.id === 'f-date' && e.target.value) { t.date = e.target.value; touched.add('date'); drawDate(); updUntil(); }
      if (e.target.id === 'f-time') { t.time = e.target.value; touched.add('time'); }
      if (e.target.id === 'f-until') updUntil(true);
    });

    function updUntil(keep) {
      const w = $('#f-untilw', dlg); if (!w) return;
      w.hidden = repeat === 'none'; w.style.display = repeat === 'none' ? 'none' : 'flex';
      if (repeat === 'none') return;
      const u = $('#f-until', dlg);
      if (!keep || !u.value || u.value <= t.date) u.value = D.addDays(t.date, repeat === 'daily' ? 6 : 7 * 11);
      const cnt = Math.min(120, Math.floor(D.diffDays(t.date, u.value) / (repeat === 'daily' ? 1 : 7)) + 1);
      $('#f-ucount', dlg).textContent = `${cnt} ${cnt <= 10 ? 'مرات' : 'مرة'}`;
    }

    function collect() {
      const raw = title.value.trim();
      if (!raw) { $('#f-err', dlg).textContent = 'اكتب المهمة أولًا.'; title.focus(); return null; }
      const p = editing ? null : parseQuick(raw, base);
      return { title: (p && p.title) || raw, date: t.date, time: t.time || '', type: t.type, subject: t.subject || '', priority: Number(t.priority || 0), notes: ($('#f-notes', dlg).value || '').trim() };
    }
    function save(again) {
      const data = collect(); if (!data) return;
      if (editing) {
        if ($('#f-all', dlg) && $('#f-all', dlg).checked) store.updateSeries(editing.id, data); else store.update(editing.id, data);
        toast('حُفظت التعديلات'); close(); return;
      }
      const u = $('#f-until', dlg);
      if (repeat !== 'none' && u && u.value > data.date) {
        const out = store.addSeries(data, repeat, u.value);
        toast(`أُضيفت ${out.length} ${out.length <= 10 ? 'مرات' : 'مرة'} متكررة`, { label: 'تراجع', run: () => out.forEach((x) => store.remove(x.id)) });
      } else afterAdd(store.add(data));
      if (again) {
        // keep date/subject/type for a burst of similar entries; clear only the text
        title.value = ''; touched.add('date'); touched.add('subject'); touched.add('type'); $('#f-heard', dlg).innerHTML = ''; title.focus();
      } else close();
    }
    f.addEventListener('submit', (e) => { e.preventDefault(); save(false); });
    const again = $('[data-again]', dlg); if (again) again.onclick = () => save(true);

    const del = $('[data-del]', dlg);
    if (del) del.onclick = async () => {
      let removed;
      if (n > 1) {
        const all = await confirmSheet(`مهمة متكررة. حذف هذه فقط أم هذه والـ ${n - 1} القادمة؟`, { ok: 'حذف كل القادمة', danger: true });
        removed = all ? store.removeSeriesFrom(editing.id) : store.remove(editing.id);
      } else removed = store.remove(editing.id);
      close();
      toast(removed.length > 1 ? `حُذفت ${removed.length} مهام` : 'حُذفت المهمة', { label: 'تراجع', run: () => store.restore(removed) });
    };
    const later = $('[data-later]', dlg);
    if (later) later.onclick = () => { postpone(editing.id); close(); };
    const ics = $('[data-ics]', dlg);
    if (ics) ics.onclick = () => exportICS([store.get(editing.id)], `munjiz-${editing.date}.ics`);

    if (text) { title.value = text; heard(); }
    if (!editing) setTimeout(() => { title.focus(); const l = title.value.length; title.setSelectionRange(l, l); }, 60);
  }

  function postpone(id) {
    const from = store.postpone(id, 1); if (!from) return;
    const t = store.get(id);
    toast(`أُجّلت إلى ${D.relative(t.date)}`, { label: 'تراجع', run: () => store.update(id, { date: from }) });
  }

  function exportICS(tasks, name) {
    if (!tasks.length) { toast('لا توجد مهام قادمة'); return; }
    saveFile(name, toICS(tasks), 'text/calendar').then((r) => { if (r === 'downloaded') toast('افتح الملف المنزّل ليُضاف لتقويم جوالك مع التنبيه'); });
  }

  // ---------- swipe a row: left = done, right = tomorrow ----------
  let sw = null;
  document.addEventListener('touchstart', (e) => {
    const inr = e.target.closest('.row-in'); if (!inr || e.touches.length > 1) return;
    const row = inr.parentElement; if (row.classList.contains('done')) return;
    sw = { row, inr, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, on: false };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!sw) return;
    const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (Math.abs(dx) < 12) return; sw.on = true; sw.row.classList.add('dragging'); }
    sw.dx = Math.max(-140, Math.min(140, dx));
    sw.inr.style.transform = `translateX(${sw.dx}px)`;
    sw.row.classList.toggle('sw-done', sw.dx < -20); sw.row.classList.toggle('sw-later', sw.dx > 20);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!sw) return;
    const { row, inr, dx, on } = sw; sw = null;
    row.classList.remove('dragging'); inr.style.transform = '';
    setTimeout(() => row.classList.remove('sw-done', 'sw-later'), 180);
    if (!on) return;
    row.dataset.swiped = '1'; setTimeout(() => delete row.dataset.swiped, 400); // swallow the click that follows
    const id = row.dataset.id;
    if (dx <= -80) { complete(id); dismiss('swipe'); }
    else if (dx >= 80) { postpone(id); dismiss('swipe'); }
  });

  function complete(id) {
    const t = store.toggle(id); if (!t) return;
    if (!t.done) return;
    navigator.vibrate && navigator.vibrate(12);
    const left = store.on(D.todayKey()).filter((x) => !x.done).length;
    const msg = t.date === D.todayKey() && left === 0 ? 'يومك مكتمل — أحسنت!' : 'أحسنت! أُنجزت';
    toast(msg, { label: 'تراجع', run: () => store.toggle(t.id) });
  }

  // ---------- settings ----------
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('ثُبّت مُنجز على جهازك'); render(); });
  function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function installHTML() {
    if (isStandalone()) return `<p class="status"><i></i>مُنجز مثبّت ويعمل كتطبيق.</p>`;
    if (installEvt) return `<button class="btn primary wide" data-x="install">${icon('download', 18)}تثبيت التطبيق</button>`;
    if (isIOS()) return `<ol class="steps"><li>افتح الرابط في <b>Safari</b>.</li><li>اضغط زر <b>المشاركة</b> (مربع وسهم للأعلى).</li><li>اختر <b>إضافة إلى الشاشة الرئيسية</b> ← <b>إضافة</b>.</li></ol>`;
    return `<ol class="steps"><li>افتح الرابط في <b>Chrome</b>.</li><li>اضغط ⋮ أعلى الشاشة.</li><li>اختر <b>تثبيت التطبيق</b>.</li></ol>`;
  }

  function openMenu(focus) {
    const s = store.settings();
    const offline = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    const th = s.theme || 'auto';
    const { dlg, close } = sheet(`<div class="wrapf">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head"><h2>الإعدادات</h2><button type="button" class="ibtn" data-close aria-label="إغلاق">${icon('x', 22)}</button></div>
      <div class="sh-body set">
        <section><h3>${icon('moon', 19)}المظهر</h3>
          <div class="seg" role="group" aria-label="المظهر">${[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']].map(([v, l]) => `<button data-x="theme" data-v="${v}" aria-pressed="${th === v}">${l}</button>`).join('')}</div>
          <p class="hint">التلقائي يتبع وضع جوالك (فاتح بالنهار، داكن بالليل).</p></section>

        <section id="s-remind"><h3>${icon('bell', 19)}التنبيهات</h3>
          <div class="note"><b>على الآيفون:</b> أضمن تنبيه الآن هو <b>تقويم الآيفون</b>. اضغط زر التقويم في أي مهمة (أو الزر تحت لكل القادم)، ويطلع لك تنبيه حتى لو مُنجز مقفل.</div>
          <div class="field" style="margin:10px 0"><span class="lab">التنبيه قبل الموعد</span>
            <select class="in" id="s-remind-min">${[10, 30, 60, 120, 1440].map((m) => `<option value="${m}" ${s.remind === m ? 'selected' : ''}>${m === 1440 ? 'قبلها بيوم' : m === 60 ? 'قبلها بساعة' : m === 120 ? 'قبلها بساعتين' : `قبلها بـ ${m} دقيقة`}</option>`).join('')}</select></div>
          <button class="btn wide" data-x="ics-all">${icon('calendar-plus', 18)}أضف كل المهام القادمة للتقويم</button>
          <label class="check"><input type="checkbox" id="s-examcal" ${s.examCal !== false ? 'checked' : ''}> اقترح إضافة كل اختبار جديد للتقويم</label>
          ${'Notification' in window ? `<label class="check"><input type="checkbox" id="s-notify" ${s.notify && Notification.permission === 'granted' ? 'checked' : ''}> تنبيهات من مُنجز نفسه (تعمل وهو مفتوح)</label>` : ''}
        </section>

        <section id="s-install"><h3>${icon('phone', 19)}التثبيت على الجوال</h3>${installHTML()}
          <p class="status ${offline ? '' : 'off'}"><i></i>${offline ? 'جاهز للعمل بدون إنترنت' : 'العمل بدون إنترنت يتفعّل بعد أول فتح من الرابط'}</p></section>

        <section><h3>${icon('tag', 19)}المواد</h3><div id="s-subj"></div>
          <form id="s-addsubj" class="subj" style="grid-template-columns:1fr auto"><input class="in" placeholder="مادة جديدة" aria-label="اسم مادة جديدة" enterkeyhint="done"><button class="btn" type="submit">${icon('plus', 18)}أضف</button></form>
          <p class="hint">اكتب اسم المادة في المهمة (مثل «واجب ${esc(store.subjects()[0]?.name || 'رياضيات')}») ويختارها مُنجز تلقائيًا.</p></section>

        <section><h3>${icon('download', 19)}نسخة احتياطية</h3>
          <p class="hint">مهامك محفوظة على هذا الجهاز فقط. احفظ نسخة في Drive أو أرسلها لنفسك.</p>
          <div class="btns" style="margin-top:8px"><button class="btn" data-x="export">${icon('download', 18)}حفظ نسخة</button>
            <button class="btn" data-x="import">${icon('upload', 18)}استرجاع</button><input type="file" id="s-file" accept=".json,application/json" hidden></div>
          ${s.lastBackup ? `<p class="hint" style="margin-top:6px">آخر نسخة: ${D.fmtDay(s.lastBackup)}</p>` : ''}</section>

        <section><h3>${icon('trash', 19)}البيانات</h3>
          <div class="btns">${store.all().length ? '' : `<button class="btn" data-x="sample">بيانات تجريبية</button>`}<button class="btn danger" data-x="clear" style="border:1px solid var(--danger)">مسح كل المهام</button></div>
          <p class="hint" style="margin-top:10px">مُنجز ${VERSION} · ${store.all().length} مهمة</p></section>
      </div></div>`, { label: 'الإعدادات' });

    function drawSubjects() {
      $('#s-subj', dlg).innerHTML = store.subjects().map((x) => `<div class="subj" data-sid="${x.id}">
        <button type="button" class="swb" data-x="color" aria-label="لون ${esc(x.name)}"><i style="background:${x.color}"></i></button>
        <input class="in" value="${esc(x.name)}" aria-label="اسم المادة" data-x="rename">
        <button type="button" class="ibtn" data-x="del-subj" aria-label="حذف ${esc(x.name)}">${icon('trash', 18)}</button>
        <div class="palette" hidden style="grid-column:1/-1">${PALETTE.map((c) => `<button type="button" data-x="pick" data-c="${c}" style="background:${c}" aria-label="لون" aria-pressed="${c === x.color}"></button>`).join('')}</div></div>`).join('');
    }
    drawSubjects();

    dlg.addEventListener('change', async (e) => {
      const id = e.target.id;
      if (id === 's-remind-min') { store.setSetting('remind', Number(e.target.value)); toast('حُفظ'); }
      if (id === 's-examcal') store.setSetting('examCal', e.target.checked);
      if (e.target.dataset.x === 'rename') { const sid = e.target.closest('[data-sid]').dataset.sid, v = e.target.value.trim(); if (v) store.updateSubject(sid, { name: v }); }
      if (id === 's-notify') {
        if (e.target.checked) {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') { e.target.checked = false; toast('لم يُسمح بالإشعارات من الجوال'); return; }
          store.setSetting('notify', true);
        } else store.setSetting('notify', false);
      }
      if (id === 's-file' && e.target.files[0]) {
        const text = await e.target.files[0].text();
        if (!(await confirmSheet('استبدال كل مهامك الحالية بهذه النسخة؟', { ok: 'استرجاع', danger: true }))) return;
        try { const c = store.importJSON(text); close(); toast(`استُرجعت ${c} مهمة`); } catch (err) { toast('الملف غير صالح — اختر نسخة مُنجز (.json)'); }
      }
    });
    dlg.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x, row = b.closest('[data-sid]');
      if (x === 'theme') { store.setSetting('theme', b.dataset.v); dlg.querySelectorAll('[data-x=theme]').forEach((y) => y.setAttribute('aria-pressed', y === b)); }
      else if (x === 'install') doInstall();
      else if (x === 'color') { const p = $('.palette', row); p.hidden = !p.hidden; }
      else if (x === 'pick') { store.updateSubject(row.dataset.sid, { color: b.dataset.c }); drawSubjects(); }
      else if (x === 'del-subj') {
        const used = store.subjectUse(row.dataset.sid);
        if (await confirmSheet(`حذف مادة «${$('input', row).value}»؟${used ? ` ستبقى مهامها (${used}) بدون مادة.` : ''}`, { ok: 'حذف', danger: true })) { store.removeSubject(row.dataset.sid); drawSubjects(); }
      }
      else if (x === 'ics-all') exportICS(store.range(D.todayKey(), D.addDays(D.todayKey(), 365)).filter((t) => !t.done), 'munjiz-tasks.ics');
      else if (x === 'export') {
        const r = await saveFile(`munjiz-backup-${D.todayKey()}.json`, store.exportJSON(), 'application/json');
        if (r !== 'cancelled') { store.setSetting('lastBackup', D.todayKey()); toast(r === 'shared' ? 'أُرسلت النسخة' : 'حُفظت النسخة في التنزيلات'); }
      }
      else if (x === 'import') $('#s-file', dlg).click();
      else if (x === 'sample') { store.loadSample(); close(); goToday(); }
      else if (x === 'clear') {
        if (await confirmSheet('مسح كل المهام؟ احفظ نسخة احتياطية أولًا إن كنت تحتاجها.', { ok: 'مسح الكل', danger: true })) { const bk = store.all().slice(); store.clearTasks(); close(); toast('مُسحت كل المهام', { label: 'تراجع', run: () => store.restore(bk) }); }
      }
    });
    $('#s-addsubj', dlg).addEventListener('submit', (e) => { e.preventDefault(); const inp = $('input', e.target); if (store.addSubject(inp.value)) { inp.value = ''; drawSubjects(); } });
    if (focus) $('#s-' + focus, dlg)?.scrollIntoView({ block: 'start' });
  }

  async function doInstall() {
    if (!installEvt) { openMenu('install'); return; }
    installEvt.prompt();
    const r = await installEvt.userChoice; installEvt = null;
    if (r.outcome === 'accepted') toast('جارٍ التثبيت…');
    document.querySelector('dialog.sheet[open]')?.close();
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.closest('dialog')) return;
    if (el.closest('.row') && el.closest('.row').dataset.swiped) { e.preventDefault(); return; }
    const a = el.dataset.act, id = el.dataset.id;
    if (a === 'tab') setTab(el.dataset.t);
    else if (a === 'prev') step(-1);
    else if (a === 'next') step(1);
    else if (a === 'today') goToday();
    else if (a === 'day') select(el.dataset.key);
    else if (a === 'view') { holdHeight(true); store.setSetting('view', el.dataset.v); }
    else if (a === 'new') openTask({ date: ui.tab === 'cal' ? ui.selected : D.todayKey() });
    else if (a === 'edit') openTask({ id });
    else if (a === 'toggle') { const t = store.get(id); if (t && !t.done) complete(id); else store.toggle(id); }
    else if (a === 'prio') { const t = store.cyclePriority(id); toast(`الأولوية: ${PRIORITY[t.priority].label}`); }
    else if (a === 'fold-done') { ui.showDone = !ui.showDone; render(); }
    else if (a === 'fold-later') { ui.showLater = true; render(); }
    else if (a === 'move-overdue') { const moved = store.moveOverdueToToday(); toast(`نُقلت ${moved.length} إلى اليوم`, { label: 'تراجع', run: () => store.undoMove(moved) }); }
    else if (a === 'theme') { const dark = document.documentElement.dataset.theme === 'dark'; store.setSetting('theme', dark ? 'light' : 'dark'); }
    else if (a === 'menu') openMenu();
    else if (a === 'install') { if (installEvt) doInstall(); else openMenu('install'); }
    else if (a === 'dismiss') { dismiss(el.dataset.what); render(); }
    else if (a === 'sample') { store.loadSample(); goToday(); }
    else if (a === 'try') { const i = $('#qaAgendaIn'); i.value = el.dataset.text; i.dispatchEvent(new Event('input')); i.focus(); }
  });

  // swipe the calendar to change month/week (finger right = next, RTL)
  let cs = null;
  $('#calbox').addEventListener('touchstart', (e) => { const t = e.touches[0]; cs = { x: t.clientX, y: t.clientY, at: Date.now() }; }, { passive: true });
  $('#calbox').addEventListener('touchend', (e) => {
    if (!cs) return; const t = e.changedTouches[0], dx = t.clientX - cs.x, dy = t.clientY - cs.y, quick = Date.now() - cs.at < 700; cs = null;
    if (quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx > 0 ? 1 : -1);
  }, { passive: true });

  // keyboard (desktop)
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const mv = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
    if (mv) { e.preventDefault(); select(D.addDays(ui.selected, mv)); return; }
    if (e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.code === 'KeyN') { e.preventDefault(); openTask({}); }
    else if (e.code === 'KeyT') { e.preventDefault(); goToday(); }
    else if (e.key === '/') { e.preventDefault(); $('#qaAgendaIn').focus(); }
  });

  // phones keep the app suspended for days: re-check "today" whenever it comes back
  let lastDay = D.todayKey();
  function dayCheck() {
    if (D.todayKey() === lastDay) return;
    const wasToday = ui.selected === lastDay; lastDay = D.todayKey();
    if (wasToday) goToday(); else render();
    scheduleReminders();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) dayCheck(); });
  setInterval(dayCheck, 60000);

  store.onChange(render);
  render();
  scheduleReminders();
  if (new URLSearchParams(location.search).has('new')) { history.replaceState(null, '', location.pathname); openTask({}); }

  // ---------- offline: service worker + persistent storage ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // first visit: the new worker just claims the page — only an accepted update reloads
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('يتوفر تحديث لمُنجز', { label: 'تحديث', icon: 'download', run: () => nw.postMessage('skip') });
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
