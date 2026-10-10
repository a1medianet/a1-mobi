from pathlib import Path
p=Path(r"C:\Dev\A1-Launch-Candidates\mobi")
def change(rel, replacements):
 f=p/rel
 text=f.read_text(encoding="utf8")
 for a,b in replacements:
  n=text.count(a)
  if n!=1: raise RuntimeError(f"{rel}: expected 1 match got {n} for {a[:85]!r}")
  text=text.replace(a,b,1)
 f.write_text(text,encoding="utf8")
 print("UPDATED",rel)
change("src/app/product/[locale]/page.tsx",[
 ("primary:\"ابدأ تجربة 7 أيام\",secondary:\"شاهد المتجر التجريبي\",","primary:\"أنشئ حسابًا للتجربة\",secondary:\"شاهد جولة تعريفية\","),
 ("proof:\"تجربة جاهزة وليست شاشة فارغة\",proofText:\"ادخل إلى مساحة تجريبية تحتوي منتجات ومخزون وصيانة وعملاء وحركات فعلية للاختبار.\",","proof:\"نظرة عملية قبل التسجيل\",proofText:\"اطّلع على أمثلة للمنتجات والمخزون والصيانة والعملاء لتتعرف على طريقة عمل النظام.\","),
 ("plansSub:\"الحساب التجاري يفصل الجهة عن الفروع والمستخدمين، والاشتراك يأتي من A1 Billing Core.\",","plansSub:\"ابدأ بمتجر واحد، وأضف فروعك وموظفيك حسب احتياج العمل، مع صلاحيات واضحة لكل مستخدم.\","),
 ("cta:\"جرّب النظام ببيانات واقعية\",ctaSub:\"لا تحتاج لإدخال منتجات أو عملاء من الصفر حتى تفهم التجربة.\",","cta:\"تعرّف على النظام ثم ابدأ متجرك\",ctaSub:\"استعرض الجولة التعريفية، ثم أنشئ حسابك لتبدأ إدارة أعمالك.\","),
 ("primary:\"Start 7-day trial\",secondary:\"Open live demo\",","primary:\"Create a trial account\",secondary:\"Explore the guided tour\","),
 ("proof:\"A ready experience, not an empty dashboard\",proofText:\"Enter a populated workspace with products, stock, repairs, customers and operational activity.\",","proof:\"See the workflow before signing up\",proofText:\"Explore sample products, stock, repairs and customers to understand how the system works.\","),
 ("plansSub:\"Commercial accounts separate organization, branches and members; subscription state comes from A1 Billing Core.\",","plansSub:\"Start with one store and add branches and staff as your business grows, with clear permissions for every role.\","),
 ("cta:\"Try the system with realistic data\",ctaSub:\"You do not need to enter products or customers from scratch to understand the workflow.\",","cta:\"Get to know the system, then open your store\",ctaSub:\"Explore the guided tour before creating your store account.\","),
 ("{ar?\"فرع طرابلس التجريبي\":\"Tripoli Pilot Store\"}","{ar?\"مثال توضيحي لمتجر\":\"Sample store preview\"}"),
 ("{ar?\"تجربة 7 أيام\":\"7-day trial\"}","{ar?\"حساب خاص بمتجرك\":\"Your own store account\"}"),
 ("ar?[\"3\",\"ابدأ Trial\",\"A1 Billing Core يمنح الصلاحيات لمدة 7 أيام.\"]:[\"3\",\"Start trial\",\"A1 Billing Core grants seven-day entitlements.\"]","ar?[\"3\",\"ابدأ التجربة\",\"اختر خطة مناسبة وفعّل تجربة حسابك.\"]:[\"3\",\"Start your trial\",\"Choose a suitable plan and activate your trial account.\"]"),
 ("<span className=\"product-eyebrow\">ACCOUNT → ORGANIZATION → TENANT → BRANCH</span>","<span className=\"product-eyebrow\">{ar?\"لمتجر واحد أو عدة فروع\":\"ONE STORE · MULTIPLE BRANCHES\"}</span>"),
 ("<span className=\"product-eyebrow\">A1 MOBI PILOT</span>","<span className=\"product-eyebrow\">{ar?\"ابدأ بثقة\":\"GET STARTED\"}</span>"),
 ("{ar?\"منتجًا حقيقي الاسم\":\"real-world products\"}","{ar?\"منتجًا نموذجيًا\":\"sample products\"}"),
])
change("src/components/login-form.tsx",[
 ('title: "الدخول إلى المتجر",','title: "تسجيل الدخول إلى إدارة المتجر",'),
 ('intro: "استخدم رمز متجرك والبريد المسجل للوصول إلى جلسة العمل.",','intro: "أدخل معرّف متجرك والبريد الإلكتروني وكلمة المرور للمتابعة إلى لوحة الإدارة.",'),
 ('tenant: "رمز المتجر",','tenant: "معرّف المتجر",\n    tenantHint: "تجده عند إنشاء الحساب، أو تحصل عليه من مسؤول المتجر.",'),
 ('note: "مساحة الـPilot تعرض بيانات تجريبية جاهزة، بينما الحسابات المنشأة حديثًا تبقى معزولة ببياناتها وصلاحياتها.",','note: "ليس لديك حساب بعد؟ أنشئ حسابًا لتبدأ إدارة متجرك.",'),
 ('title: "Sign in to your store",','title: "Sign in to store management",'),
 ('tenant: "Store code",','tenant: "Store ID",\n    tenantHint: "Your Store ID is provided during signup or by your store administrator.",'),
 ('note: "The Pilot workspace includes ready sample data, while newly provisioned accounts remain isolated by tenant and permissions.",','note: "New here? Create an account to get started with your store.",'),
 ('<input name="tenant" defaultValue={initialTenant} autoComplete="organization" required maxLength={80}\n          pattern="[a-zA-Z0-9-]+" dir="ltr" style={inputStyle} />','<input name="tenant" defaultValue={initialTenant} autoComplete="organization" required maxLength={80}\n          pattern="[a-zA-Z0-9-]+" dir="ltr" style={inputStyle} />\n        <small className="mobi-field-hint">{t.tenantHint}</small>'),
])
change("src/components/app-shell.tsx",[
 ('<span className="environment-label pilot-label">PILOT</span>','<span className="environment-label pilot-label">{ar?"بيئة تجربة":"Demo mode"}</span>'),
 ('<div><b>{ar ? "بيئة التجربة" : "Pilot workspace"}</b>','<div><b>{ar ? "بيئة تدريب" : "Practice workspace"}</b>'),
 ('"منتجات وعمليات واقعية للتجربة · ليست بيانات إنتاجية" : "Realistic catalog and operations · not production data"','"أمثلة للتدريب فقط · ليست مبيعات حقيقية" : "Samples only · not real sales"'),
])
change("src/app/[locale]/page.tsx",[
 ('demo: "PILOT DEMO",','demo: "وضع التدريب",'),
 ('demo: "PILOT DEMO",','demo: "Practice mode",'),
 ('store: "المتجر التجريبي",','store: "متجر نموذجي",'),
 ('store: "Pilot store",','store: "Sample store",'),
 ('activity: "آخر حركة تجريبية",','activity: "أمثلة على حركة المتجر",'),
 ('activity: "Recent pilot activity",','activity: "Sample store activity",'),
 ('<footer><span>A1 Mobi · Pilot Store Experience</span>','<footer><span>A1 Mobi · {t.demo}</span>'),
])
change("src/app/[locale]/pos/page.tsx",[
 ('preview:"Pilot Demo — الإكمال هنا يحفظ إيصالًا تجريبيًا في هذا المتصفح فقط ولا ينشئ قيدًا محاسبيًا أو حركة مخزون إنتاجية.",','preview:"وضع تدريب فقط: يمكنك تجربة السلة والإيصال دون تسجيل بيع حقيقي أو تغيير مخزون متجرك.",'),
 ('cart:"السلة الحالية", pilot:"Pilot Demo",','cart:"سلة التدريب", pilot:"وضع التدريب",'),
 ('preview:"Pilot Demo — completion stores a demo receipt in this browser only; it does not create production accounting or inventory movements.",','preview:"Practice mode: explore the cart and receipt without recording a real sale or changing your store inventory.",'),
 ('cart:"Current cart", pilot:"Pilot Demo",','cart:"Practice cart", pilot:"Practice mode",'),
 ('subtitle:"تجربة بيع كاملة محليًا بمنتجات ومخزون وأسعار تجريبية واقعية",','subtitle:"جرّب اختيار المنتجات وإتمام العملية في وضع التدريب.",'),
 ('subtitle:"Complete a local pilot sale using realistic demo products, stock, and prices",','subtitle:"Practice selecting products and completing a sample checkout.",'),
])
change("src/app/[locale]/products/page.tsx",[
 ('notice:"Pilot Demo — أسماء المنتجات واقعية، لكن الأسعار والمخزون قيم تجريبية وليست تسعير سوق ملزم.",','notice:"كتالوج تدريبي: الأسعار والكميات المعروضة أمثلة للتوضيح فقط.",'),
 ('notice:"Pilot Demo — product names are real-world items; prices and stock are demo values, not live market quotes.",','notice:"Sample catalog: prices and quantities are examples, not live store offers.",'),
])
change("src/app/product/[locale]/signup/page.tsx",[
 ('<span className="product-eyebrow">7-DAY PILOT</span>','<span className="product-eyebrow">{ar?"ابدأ متجرك":"CREATE YOUR STORE"}</span>'),
 ('ننشئ Tenant معزولًا، أول فرع، Owner role، ثم نطلب صلاحيات التجربة من A1 Billing Core.','أنشئ حساب متجرك وحدد الفرع الأول والمستخدم المسؤول، ثم ابدأ في إعداد أعمالك.'),
 ('We provision an isolated tenant, first branch and Owner role, then request trial entitlements from A1 Billing Core.','Create your store account, set up your first branch and choose the person responsible for managing it.'),
 ('<span className="product-eyebrow">WHAT YOU GET</span>','<span className="product-eyebrow">{ar?"ماذا ستحصل عليه؟":"WHAT YOU GET"}</span>'),
 ('<li>POS {ar?"تفاعلي":"interactive"}</li>','<li>{ar?"تجربة لعمليات البيع":"Explore sample sales workflows"}</li>'),
])
change("src/app/product/[locale]/demo/page.tsx",[
 ('<span className="product-eyebrow">LIVE PILOT EXPERIENCE</span>','<span className="product-eyebrow">{ar?"جولة تعريفية":"PRODUCT WALKTHROUGH"}</span>'),
 ('تجربة ممتلئة بالبيانات، لا Dashboard فارغ.','شاهد طريقة عمل المتجر قبل إنشاء الحساب.'),
 ('A populated experience, not an empty dashboard.','Explore the store workflow before signing up.'),
 ('هذه المساحة معدّة لتجربة رحلة متجر موبايل حقيقية دون التأثير على بيانات إنتاجية.','هذه الجولة تعرض بيانات نموذجية لفهم المبيعات والمخزون والصيانة؛ ليست متجرًا للبيع عبر الإنترنت.'),
 ('This workspace is prepared to test a realistic mobile-store journey without touching production data.','This walkthrough uses sample products and activities. It is not a public online shop or a real checkout.'),
 ('<Link className="product-cta" href={"/"+locale}>{ar?"ادخل المتجر التجريبي":"Enter demo workspace"}</Link>','<Link className="product-cta" href={"/product/"+locale+"/signup"}>{ar?"أنشئ حساب متجرك":"Create your store account"}</Link>'),
 ('<Link className="product-secondary" href={"/product/"+locale+"/signup"}>{ar?"أنشئ متجرك التجريبي":"Create your trial store"}</Link>','<Link className="product-secondary" href={"/"+locale+"/login"}>{ar?"لديك حساب؟ سجّل الدخول":"Already registered? Sign in"}</Link>'),
 ('{ar?"منتجات يمكن البحث وبيعها":"Products ready to search and sell"}','{ar?"أمثلة على المنتجات":"Sample product catalog"}'),
 ('{ar?"جرّب نقطة البيع":"Try POS"','{ar?"نقطة البيع داخل الإدارة":"Point of sale in your account"'),
 ('{ar?"راجع المنتجات":"Browse products"','{ar?"كتالوج إدارة المتجر":"Store management catalog"'),
 ('{ar?"شاهد المخزون":"See inventory"','{ar?"المخزون داخل الإدارة":"Inventory in your account"'),
 ('{ar?"افتح الصيانة":"Open repairs"','{ar?"إدارة الصيانة":"Manage repairs"'),
 ('{ar?"راجع الإدارة":"Owner admin"','{ar?"لوحة الإدارة":"Admin workspace"'),
 ('<Link href={"/"+locale+path} key={path}>','<Link href={"/"+locale+"/login"} key={path}>'),
 ('{ar?"فتح التجربة":"Open demo"} →','{ar?"يتطلب تسجيل الدخول":"Sign in to continue"} →'),
])
print("CUSTOMER_COPY_PATCH_DONE")
