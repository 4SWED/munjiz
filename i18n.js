/* مُنجز — interface language. Arabic (RTL) is the default; English (LTR) is a full alternative.
   The choice lives in settings.lang; switching reloads the page so every string and direction updates at once.
   t('key', ...args): plain strings, or functions for anything with numbers/plurals. */
(function () {
  'use strict';

  let lang = 'ar';
  try { lang = (JSON.parse(localStorage.getItem('munjiz.data') || '{}').settings || {}).lang || 'ar'; } catch (e) {}
  if (lang !== 'en') lang = 'ar';

  // Arabic plural for "task(s)": 1 مهمة واحدة, 2 مهمتان, 3–10 مهام, 11+ مهمة
  const arTasks = (n) => (n === 1 ? 'مهمة واحدة' : n === 2 ? 'مهمتان' : n <= 10 ? `${n} مهام` : `${n} مهمة`);
  const arDays = (n) => (n <= 10 ? 'أيام' : 'يومًا');
  const enS = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const ar = {
    // dates
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    daysShort: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
    fmtDay: (wd, d, m) => `${wd} ${d} ${m}`,
    fmtShort: (d, m) => `${d} ${m}`,
    rel: (n) => (n === 0 ? 'اليوم' : n === 1 ? 'غدًا' : n === -1 ? 'أمس' : n === 2 ? 'بعد يومين' : n === -2 ? 'قبل يومين' : n > 2 ? `بعد ${n} ${arDays(n)}` : `قبل ${-n} ${arDays(-n)}`),
    am: 'ص', pm: 'م',
    // vocabulary
    types: { task: 'مهمة', homework: 'واجب', study: 'مذاكرة', exam: 'اختبار' },
    prio: ['عادي', 'مهم', 'عاجل'],
    defaultSubjects: { math: 'رياضيات', phys: 'فيزياء', prog: 'برمجة', eng: 'إنجليزي', stat: 'ستاتيك', self: 'شخصي' },
    noSubject: 'بدون مادة',
    sample: [
      [0, 'حل تمارين الفصل 3 — التكامل بالتجزئة', 'التمارين 3.1 إلى 3.4'], [0, 'مراجعة قوانين نيوتن الثلاثة'], [0, 'رفع واجب المختبر على E-Learning'],
      [1, 'اختبار قصير — Free Body Diagram', 'القاعة 204'], [1, 'تسليم تقرير مختبر الفيزياء'], [2, 'اجتماع مجموعة الدراسة'], [3, 'مذاكرة مفردات Chapter 5'],
      [5, 'اختبار منتصف الفصل — رياضيات'], [8, 'مشروع البرمجة — المرحلة الأولى'], [-1, 'قراءة الفصل 4 — العزوم'], [-2, 'واجب فيزياء رقم 3'],
    ],
    saveFailed: 'تعذّر الحفظ — مساحة المتصفح ممتلئة أو محظورة',
    cancel: 'إلغاء', confirm: 'تأكيد',
    icsExam: 'اختبار: ', icsTomorrow: 'غدًا: ',

    // chrome
    brand: 'مُنجز', menu: 'الإعدادات', prev: 'السابق', next: 'التالي', month: 'شهر', week: 'أسبوع', viewMode: 'طريقة العرض', daysGrid: 'الأيام', nav: 'التنقل',
    agendaAria: 'مهامي', calAria: 'التقويم', addTaskSr: 'أضف مهمة', addThisDaySr: 'أضف مهمة لهذا اليوم', details: 'تفاصيل', go: 'أضف',
    qaPlaceholder: 'اكتب مهمة… مثل: واجب رياضيات بكرة',
    themeDay: 'نهاري', themeNight: 'ليلي', themeToDay: 'التبديل إلى الوضع النهاري', themeToNight: 'التبديل إلى الوضع الليلي',
    myTasks: 'مهامي', calendar: 'التقويم', today: 'اليوم',

    // rows
    swDone: 'تم', swLater: 'بكرة', markDone: 'إنجاز', unmarkDone: 'إلغاء الإنجاز', exam: 'اختبار',
    prioAria: (l) => `الأولوية: ${l} — اضغط للتغيير`,

    // agenda
    lineEmpty: 'يومك فاضي — سجّل أول مهمة',
    lineLeft: (left, total) => `باقي ${arTasks(left)} من ${total}`,
    lineAllDone: 'أنجزت كل مهام اليوم',
    streak: (n) => `سلسلة ${n} ${arDays(n)}`,
    dayComplete: 'يومك مكتمل',
    todayExcl: 'اليوم!', nextExam: 'أقرب اختبار',
    welcomeTitle: 'سجّل بجملة واحدة',
    welcomeText: 'اكتب مثل ما تتكلم، ومُنجز يفهم اليوم والساعة والمادة والنوع:',
    examples: ['اختبار فيزياء بكرة الساعة 10', 'واجب رياضيات الخميس', 'مذاكرة برمجة بعد بكرة 4م'],
    trySample: 'جرّب ببيانات تجريبية',
    overdue: 'متأخرة', moveToday: 'انقلها لليوم', nLeft: (n) => `${n} باقية`,
    doneToday: (n) => `منجزة اليوم (${n})`,
    noTasksToday: 'لا مهام اليوم — اكتب في السطر فوق لتضيف.',
    tomorrow: 'غدًا', thisWeek: 'هذا الأسبوع', later: 'لاحقًا',
    showN: (n) => `عرض ${n} ${n <= 10 ? 'مهام' : 'مهمة'}`,
    swipeTip: 'اسحب أي مهمة لليسار لتنجزها، ولليمين لتأجيلها لبكرة. واضغط العلم لتغيير أولويتها.',
    installTip: '<b>ثبّت مُنجز على شاشتك الرئيسية</b> ليفتح كتطبيق ويعمل بدون إنترنت.',
    how: 'كيف؟', hide: 'إخفاء',

    // calendar
    openOf: (o, t) => `، ${o} مفتوحة من ${t}`,
    doneCount: (d, t) => `${d}/${t} منجزة`,
    addThisDay: 'أضف لهذا اليوم…',
    noTasksHere: (isToday) => `لا مهام ${isToday ? 'اليوم' : 'في هذا اليوم'} — اكتب هنا لتضيف`,

    // adding
    addedExam: (w) => `أُضيف الاختبار (${w})`, toCal: 'للتقويم',
    addedTo: (w, time) => `أُضيفت إلى ${w}${time ? ' ' + time : ''}`, edit: 'تعديل',
    heard: 'فهمت:',

    // task sheet
    newTask: 'مهمة جديدة', editTask: 'تعديل المهمة', close: 'إغلاق', taskLabel: 'المهمة',
    titlePh: 'مثل: اختبار فيزياء بكرة الساعة 10',
    when: 'متى', time: 'الساعة', noTime: 'بدون وقت', optional: 'اختياري',
    subject: 'المادة', type: 'النوع', priority: 'الأولوية',
    notesOnly: 'ملاحظات', notesRepeat: 'ملاحظات وتكرار', notesPh: 'القاعة، الصفحات، رابط…',
    repeat: 'التكرار', once: 'مرة واحدة', weekly: 'كل أسبوع', daily: 'كل يوم', until: 'حتى',
    applyAll: (n) => `طبّق على هذه و${n === 1 ? 'المرة القادمة' : `الـ ${n} القادمة`} من التكرار`,
    del: 'حذف', addToPhoneCal: 'أضف لتقويم الجوال', andAnother: 'وأخرى', save: 'حفظ', add: 'إضافة',
    dayAfter: 'بعد غد', otherDate: 'تاريخ آخر', none: 'بدون', subjectBtn: 'مادة', subjectNamePh: 'اسم المادة', newSubjectAria: 'اسم المادة الجديدة',
    times: (n) => `${n} ${n <= 10 ? 'مرات' : 'مرة'}`,
    writeFirst: 'اكتب المهمة أولًا.', saved: 'حُفظت التعديلات',
    addedRepeat: (n) => `أُضيفت ${n} ${n <= 10 ? 'مرات' : 'مرة'} متكررة`, undo: 'تراجع',
    deleteSeriesQ: (n) => `مهمة متكررة. حذف هذه فقط أم هذه والـ ${n} القادمة؟`, deleteAllNext: 'حذف كل القادمة',
    deletedN: (n) => `حُذفت ${n} مهام`, deletedOne: 'حُذفت المهمة',
    postponedTo: (r) => `أُجّلت إلى ${r}`,
    noUpcoming: 'لا توجد مهام قادمة',
    icsHint: 'افتح الملف المنزّل ليُضاف لتقويم جوالك مع التنبيه',
    dayCompleteMsg: 'يومك مكتمل — أحسنت!', wellDone: 'أحسنت! أُنجزت',
    prioToast: (l) => `الأولوية: ${l}`, movedN: (n) => `نُقلت ${n} إلى اليوم`,

    // install
    installed: 'ثُبّت مُنجز على جهازك', installedStatus: 'مُنجز مثبّت ويعمل كتطبيق.', installApp: 'تثبيت التطبيق', installing: 'جارٍ التثبيت…',
    iosSteps: '<ol class="steps"><li>افتح الرابط في <b>Safari</b>.</li><li>اضغط زر <b>المشاركة</b> (مربع وسهم للأعلى).</li><li>اختر <b>إضافة إلى الشاشة الرئيسية</b> ← <b>إضافة</b>.</li></ol>',
    androidSteps: '<ol class="steps"><li>افتح الرابط في <b>Chrome</b>.</li><li>اضغط ⋮ أعلى الشاشة.</li><li>اختر <b>تثبيت التطبيق</b>.</li></ol>',

    // settings
    settings: 'الإعدادات', language: 'اللغة', appearance: 'المظهر', auto: 'تلقائي', light: 'فاتح', dark: 'داكن',
    autoHint: 'التلقائي يتبع وضع جوالك (فاتح بالنهار، داكن بالليل).',
    reminders: 'التنبيهات',
    iphoneNote: '<b>على الآيفون:</b> أضمن تنبيه الآن هو <b>تقويم الآيفون</b>. اضغط زر التقويم في أي مهمة (أو الزر تحت لكل القادم)، ويطلع لك تنبيه حتى لو مُنجز مقفل.',
    remindBefore: 'التنبيه قبل الموعد',
    remindOpt: (m) => (m === 1440 ? 'قبلها بيوم' : m === 60 ? 'قبلها بساعة' : m === 120 ? 'قبلها بساعتين' : `قبلها بـ ${m} دقيقة`),
    icsAll: 'أضف كل المهام القادمة للتقويم', examCalOpt: 'اقترح إضافة كل اختبار جديد للتقويم', inAppNotify: 'تنبيهات من مُنجز نفسه (تعمل وهو مفتوح)',
    installSection: 'التثبيت على الجوال', offlineReady: 'جاهز للعمل بدون إنترنت', offlineLater: 'العمل بدون إنترنت يتفعّل بعد أول فتح من الرابط',
    subjects: 'المواد', newSubjectPh: 'مادة جديدة', newSubjectAria2: 'اسم مادة جديدة', addBtn: 'أضف',
    subjectHint: (name) => `اكتب اسم المادة في المهمة (مثل «واجب ${name}») ويختارها مُنجز تلقائيًا.`,
    backup: 'نسخة احتياطية', backupHint: 'مهامك محفوظة على هذا الجهاز فقط. احفظ نسخة في Drive أو أرسلها لنفسك.',
    saveCopy: 'حفظ نسخة', restore: 'استرجاع', lastBackup: (d) => `آخر نسخة: ${d}`,
    data: 'البيانات', sampleData: 'بيانات تجريبية', clearAll: 'مسح كل المهام', versionLine: (v, n) => `مُنجز ${v} · ${n} مهمة`,
    colorOf: (n) => `لون ${n}`, subjectNameAria: 'اسم المادة', deleteX: (n) => `حذف ${n}`, color: 'لون',
    savedShort: 'حُفظ', notifDenied: 'لم يُسمح بالإشعارات من الجوال',
    replaceQ: 'استبدال كل مهامك الحالية بهذه النسخة؟', restoredN: (c) => `استُرجعت ${c} مهمة`, badFile: 'الملف غير صالح — اختر نسخة مُنجز (.json)',
    deleteSubjectQ: (n, used) => `حذف مادة «${n}»؟${used ? ` ستبقى مهامها (${used}) بدون مادة.` : ''}`,
    sentCopy: 'أُرسلت النسخة', savedCopy: 'حُفظت النسخة في التنزيلات',
    clearQ: 'مسح كل المهام؟ احفظ نسخة احتياطية أولًا إن كنت تحتاجها.', clearAllBtn: 'مسح الكل', clearedAll: 'مُسحت كل المهام',
    updateAvail: 'يتوفر تحديث لمُنجز', update: 'تحديث',
  };

  const en = {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    fmtDay: (wd, d, m) => `${wd}, ${d} ${m}`,
    fmtShort: (d, m) => `${d} ${m.slice(0, 3)}`,
    rel: (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 1 ? `In ${n} days` : `${-n} days ago`),
    am: 'AM', pm: 'PM',
    types: { task: 'Task', homework: 'Homework', study: 'Study', exam: 'Exam' },
    prio: ['Normal', 'Important', 'Urgent'],
    defaultSubjects: { math: 'Math', phys: 'Physics', prog: 'Programming', eng: 'English', stat: 'Statics', self: 'Personal' },
    noSubject: 'No subject',
    sample: [
      [0, 'Chapter 3 exercises — integration by parts', 'Exercises 3.1 to 3.4'], [0, "Review Newton's three laws"], [0, 'Upload the lab assignment to E-Learning'],
      [1, 'Quiz — Free Body Diagram', 'Room 204'], [1, 'Hand in the physics lab report'], [2, 'Study group meeting'], [3, 'Learn Chapter 5 vocabulary'],
      [5, 'Math midterm'], [8, 'Programming project — phase 1'], [-1, 'Read chapter 4 — moments'], [-2, 'Physics homework #3'],
    ],
    saveFailed: "Couldn't save — browser storage is full or blocked",
    cancel: 'Cancel', confirm: 'Confirm',
    icsExam: 'Exam: ', icsTomorrow: 'Tomorrow: ',

    brand: 'Munjiz', menu: 'Settings', prev: 'Previous', next: 'Next', month: 'Month', week: 'Week', viewMode: 'View', daysGrid: 'Days', nav: 'Navigation',
    agendaAria: 'My tasks', calAria: 'Calendar', addTaskSr: 'Add a task', addThisDaySr: 'Add a task to this day', details: 'Details', go: 'Add',
    qaPlaceholder: 'Write a task… e.g. math homework tomorrow',
    themeDay: 'Day', themeNight: 'Night', themeToDay: 'Switch to day mode', themeToNight: 'Switch to night mode',
    myTasks: 'My tasks', calendar: 'Calendar', today: 'Today',

    swDone: 'Done', swLater: 'Tomorrow', markDone: 'Complete', unmarkDone: 'Mark not done', exam: 'Exam',
    prioAria: (l) => `Priority: ${l} — tap to change`,

    lineEmpty: 'Nothing planned — add your first task',
    lineLeft: (left, total) => `${left} of ${total} left`,
    lineAllDone: 'Everything done for today',
    streak: (n) => `${n}-day streak`,
    dayComplete: 'Day complete',
    todayExcl: 'Today!', nextExam: 'Next exam',
    welcomeTitle: 'Add a task in one sentence',
    welcomeText: "Type it the way you'd say it — Munjiz picks out the day, time, subject and type:",
    examples: ['Physics exam tomorrow at 10', 'Math homework Thursday', 'Study programming in 2 days at 4pm'],
    trySample: 'Try with sample data',
    overdue: 'Overdue', moveToday: 'Move to today', nLeft: (n) => `${n} left`,
    doneToday: (n) => `Done today (${n})`,
    noTasksToday: 'No tasks today — write one on the line above.',
    tomorrow: 'Tomorrow', thisWeek: 'This week', later: 'Later',
    showN: (n) => `Show ${enS(n, 'task')}`,
    swipeTip: 'Swipe a task left to complete it, right to push it to tomorrow. Tap the flag to change its priority.',
    installTip: '<b>Add Munjiz to your home screen</b> so it opens like an app and works offline.',
    how: 'How?', hide: 'Hide',

    openOf: (o, t) => `, ${o} of ${t} open`,
    doneCount: (d, t) => `${d}/${t} done`,
    addThisDay: 'Add to this day…',
    noTasksHere: (isToday) => `Nothing ${isToday ? 'today' : 'on this day'} — write here to add`,

    addedExam: (w) => `Exam added · ${w}`, toCal: 'Calendar',
    addedTo: (w, time) => `Added · ${w}${time ? ', ' + time : ''}`, edit: 'Edit',
    heard: 'Understood:',

    newTask: 'New task', editTask: 'Edit task', close: 'Close', taskLabel: 'Task',
    titlePh: 'e.g. Physics exam tomorrow at 10',
    when: 'When', time: 'Time', noTime: 'No time', optional: 'optional',
    subject: 'Subject', type: 'Type', priority: 'Priority',
    notesOnly: 'Notes', notesRepeat: 'Notes & repeat', notesPh: 'Room, pages, link…',
    repeat: 'Repeat', once: 'Once', weekly: 'Every week', daily: 'Every day', until: 'Until',
    applyAll: (n) => `Apply to this and the next ${n === 1 ? 'one' : n} in the series`,
    del: 'Delete', addToPhoneCal: 'Add to phone calendar', andAnother: 'Add another', save: 'Save', add: 'Add',
    dayAfter: 'Day after', otherDate: 'Other date', none: 'None', subjectBtn: 'Subject', subjectNamePh: 'Subject name', newSubjectAria: 'New subject name',
    times: (n) => enS(n, 'time'),
    writeFirst: 'Write the task first.', saved: 'Changes saved',
    addedRepeat: (n) => `Added ${enS(n, 'repeat')}`, undo: 'Undo',
    deleteSeriesQ: (n) => `This task repeats. Delete just this one, or this and the next ${n}?`, deleteAllNext: 'Delete all upcoming',
    deletedN: (n) => `Deleted ${n} tasks`, deletedOne: 'Task deleted',
    postponedTo: (r) => `Moved · ${r}`,
    noUpcoming: 'No upcoming tasks',
    icsHint: 'Open the downloaded file to add it to your calendar with an alert',
    dayCompleteMsg: 'Day complete — well done!', wellDone: 'Nice! Done',
    prioToast: (l) => `Priority: ${l}`, movedN: (n) => `Moved ${n} to today`,

    installed: 'Munjiz is installed', installedStatus: 'Munjiz is installed and runs as an app.', installApp: 'Install the app', installing: 'Installing…',
    iosSteps: '<ol class="steps"><li>Open the link in <b>Safari</b>.</li><li>Tap <b>Share</b> (the square with an arrow).</li><li>Choose <b>Add to Home Screen</b> → <b>Add</b>.</li></ol>',
    androidSteps: '<ol class="steps"><li>Open the link in <b>Chrome</b>.</li><li>Tap ⋮ at the top.</li><li>Choose <b>Install app</b>.</li></ol>',

    settings: 'Settings', language: 'Language', appearance: 'Appearance', auto: 'Auto', light: 'Light', dark: 'Dark',
    autoHint: 'Auto follows your phone (light by day, dark at night).',
    reminders: 'Reminders',
    iphoneNote: "<b>On iPhone:</b> the surest reminder today is the <b>iPhone Calendar</b>. Tap the calendar button on any task (or the button below for everything upcoming) and you'll get an alert even when Munjiz is closed.",
    remindBefore: 'Remind me',
    remindOpt: (m) => (m === 1440 ? '1 day before' : m === 60 ? '1 hour before' : m === 120 ? '2 hours before' : `${m} minutes before`),
    icsAll: 'Add all upcoming tasks to the calendar', examCalOpt: 'Offer to add every new exam to the calendar', inAppNotify: 'Notifications from Munjiz itself (while it is open)',
    installSection: 'Install on your phone', offlineReady: 'Ready to work offline', offlineLater: 'Offline mode turns on after the first visit from the link',
    subjects: 'Subjects', newSubjectPh: 'New subject', newSubjectAria2: 'New subject name', addBtn: 'Add',
    subjectHint: (name) => `Mention a subject in a task (like “${name} homework”) and Munjiz picks it automatically.`,
    backup: 'Backup', backupHint: 'Your tasks live on this device only. Save a copy to Drive or send it to yourself.',
    saveCopy: 'Save a copy', restore: 'Restore', lastBackup: (d) => `Last backup: ${d}`,
    data: 'Data', sampleData: 'Sample data', clearAll: 'Delete all tasks', versionLine: (v, n) => `Munjiz ${v} · ${enS(n, 'task')}`,
    colorOf: (n) => `Colour of ${n}`, subjectNameAria: 'Subject name', deleteX: (n) => `Delete ${n}`, color: 'Colour',
    savedShort: 'Saved', notifDenied: 'Notifications were not allowed',
    replaceQ: 'Replace all your current tasks with this backup?', restoredN: (c) => `Restored ${enS(c, 'task')}`, badFile: "That file isn't valid — choose a Munjiz backup (.json)",
    deleteSubjectQ: (n, used) => `Delete the subject “${n}”?${used ? ` Its ${enS(used, 'task')} will keep no subject.` : ''}`,
    sentCopy: 'Backup sent', savedCopy: 'Backup saved to Downloads',
    clearQ: 'Delete all tasks? Save a backup first if you might need them.', clearAllBtn: 'Delete all', clearedAll: 'All tasks deleted',
    updateAvail: 'A Munjiz update is ready', update: 'Update',
  };

  const dict = { ar, en };
  function t(key, ...args) {
    const v = dict[lang][key] ?? dict.ar[key];
    return typeof v === 'function' ? v(...args) : v;
  }
  window.MunjizI18n = { lang, t, rtl: lang === 'ar', dict };
})();
