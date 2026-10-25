# مُنجز — دفتر الدراسة

تطبيق ويب عربي لتنظيم الدراسة: مهامك واختباراتك بنظرة، وتسجيل سريع بجملة واحدة، ويعمل بدون إنترنت.

**افتحه:** https://4swed.github.io/munjiz/

## التثبيت على الجوال
- **آيفون (Safari):** افتح الرابط ← زر المشاركة ← **إضافة إلى الشاشة الرئيسية**.
- **أندرويد (Chrome):** افتح الرابط ← ⋮ ← **تثبيت التطبيق**.

بعد أول فتح يشتغل بدون إنترنت.

## المميزات
- **سجّل بجملة:** «اختبار فيزياء بكرة الساعة 10» ← يفهم اليوم والساعة والمادة والنوع.
- **مهامي:** متأخرة / اليوم / غدًا / هذا الأسبوع، مرتبة حسب الأولوية.
- اسحب المهمة لليسار لإنجازها، ولليمين لتأجيلها لبكرة. اضغط العلم لتغيير الأولوية.
- تقويم شهري وأسبوعي بنقاط ملونة لكل مادة.
- تكرار أسبوعي أو يومي، ونقل المتأخر لليوم بضغطة.
- إضافة المهام لتقويم الجوال مع تنبيه.
- وضع فاتح وداكن، ونسخة احتياطية.

## الخصوصية
كل مهامك محفوظة على جهازك فقط (في المتصفح). لا يوجد حساب ولا سيرفر.

---

Munjiz is an Arabic (RTL) study planner PWA: a calendar plus a prioritised task list, with Arabic natural-language quick-add. Vanilla HTML/JS with no build step. It works offline through a service worker. Data stays in `localStorage` on the device.

When you change a file, bump `VERSION` in both `sw.js` and `app.js` so installed copies pick up the update.
