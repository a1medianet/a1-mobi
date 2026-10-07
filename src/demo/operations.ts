export const demoRepairs = [
  { number:"REP-1042", customerAr:"لينا مصطفى", customerEn:"Lina Mustafa", device:"iPhone 15 Pro", issueAr:"تبديل بطارية وفحص حرارة", issueEn:"Battery replacement and thermal check", status:"IN_PROGRESS", estimate:95, paid:40, technicianAr:"فني الصيانة", technicianEn:"Repair Technician" },
  { number:"REP-1041", customerAr:"نور حمود", customerEn:"Nour Hammoud", device:"Samsung Galaxy S24", issueAr:"شاشة مكسورة", issueEn:"Broken display", status:"READY", estimate:165, paid:165, technicianAr:"فني الصيانة", technicianEn:"Repair Technician" },
  { number:"REP-1040", customerAr:"أحمد ديب", customerEn:"Ahmad Deeb", device:"Redmi Note 13 Pro", issueAr:"منفذ شحن لا يعمل", issueEn:"Charging port failure", status:"DIAGNOSIS", estimate:45, paid:0, technicianAr:"فني الصيانة", technicianEn:"Repair Technician" },
  { number:"REP-1039", customerAr:"جنى المصري", customerEn:"Jana El Masri", device:"iPhone 14", issueAr:"استبدال زجاج خلفي", issueEn:"Back glass replacement", status:"APPROVED", estimate:110, paid:50, technicianAr:"فني الصيانة", technicianEn:"Repair Technician" },
] as const;

export const demoCustomers = [
  { nameAr:"رامي درويش", nameEn:"Rami Darwish", phone:"+961 70 000 101", devices:2, balance:0, lastAr:"اليوم", lastEn:"Today" },
  { nameAr:"لينا مصطفى", nameEn:"Lina Mustafa", phone:"+961 71 000 202", devices:3, balance:55, lastAr:"اليوم", lastEn:"Today" },
  { nameAr:"نور حمود", nameEn:"Nour Hammoud", phone:"+961 76 000 303", devices:1, balance:0, lastAr:"اليوم", lastEn:"Today" },
  { nameAr:"أحمد ديب", nameEn:"Ahmad Deeb", phone:"+961 81 000 404", devices:2, balance:45, lastAr:"أمس", lastEn:"Yesterday" },
  { nameAr:"جنى المصري", nameEn:"Jana El Masri", phone:"+961 03 000 505", devices:1, balance:60, lastAr:"أمس", lastEn:"Yesterday" },
] as const;

export const demoCash = {
  openedAt:"09:00",
  openingUsd:500,
  expectedUsd:2384,
  countedUsd:2384,
  openingLbp:15000000,
  expectedLbp:42650000,
  countedLbp:42650000,
  expensesUsd:72,
  cardUsd:413,
  transfersUsd:215,
} as const;

export const demoCashMovements = [
  { ref:"CSH-0841", kindAr:"بيع نقدي", kindEn:"Cash sale", currency:"USD", amount:1199, time:"18:42" },
  { ref:"CSH-0840", kindAr:"دفعة صيانة", kindEn:"Repair payment", currency:"USD", amount:40, time:"17:55" },
  { ref:"CSH-0839", kindAr:"مصروف توصيل", kindEn:"Delivery expense", currency:"USD", amount:-12, time:"17:08" },
  { ref:"CSH-0838", kindAr:"بيع نقدي", kindEn:"Cash sale", currency:"LBP", amount:17900000, time:"16:21" },
  { ref:"CSH-0837", kindAr:"مصروف قطع", kindEn:"Parts expense", currency:"USD", amount:-60, time:"15:32" },
] as const;

export const demoTopups = [
  { ref:"TOP-1258", provider:"Alfa", serviceAr:"تعبئة $20", serviceEn:"$20 recharge", phone:"03 000 811", sell:20, cost:19.2, status:"COMPLETED", time:"15:48" },
  { ref:"TOP-1257", provider:"touch", serviceAr:"تعبئة $10", serviceEn:"$10 recharge", phone:"70 000 922", sell:10, cost:9.6, status:"COMPLETED", time:"14:21" },
  { ref:"TOP-1256", provider:"Alfa", serviceAr:"حزمة بيانات تجريبية", serviceEn:"Demo data bundle", phone:"71 000 733", sell:8, cost:7.6, status:"COMPLETED", time:"12:15" },
] as const;

export const demoInventoryMovements = [
  { ref:"PO-407", typeAr:"استلام شراء", typeEn:"Purchase receipt", product:"Samsung Galaxy A56 5G 256GB", qty:4, time:"11:30" },
  { ref:"INV-3108", typeAr:"بيع", typeEn:"Sale", product:"iPhone 16 Pro 256GB", qty:-1, time:"18:42" },
  { ref:"REP-1042", typeAr:"استخدام صيانة", typeEn:"Repair use", product:"iPhone 15 Pro Service Battery", qty:-1, time:"17:52" },
  { ref:"ADJ-029", typeAr:"تسوية جرد", typeEn:"Count adjustment", product:"Tempered Glass for iPhone 16 Pro", qty:2, time:"13:05" },
] as const;

export const demoReports = {
  salesUsd:2284,
  grossMarginUsd:612.4,
  repairsRevenueUsd:320,
  outstandingDebtUsd:160,
  topupRevenueUsd:38,
  topupMarginUsd:1.6,
  inventoryRetailUsd:9341,
  inventoryAlerts:4,
  cashVarianceUsd:0,
  completedSales:6,
  openRepairs:9,
} as const;
