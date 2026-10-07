export type DemoProductType = "DEVICE" | "ACCESSORY" | "PART";

export type DemoProduct = {
  id: string;
  sku: string;
  barcode: string;
  brand: string;
  nameAr: string;
  nameEn: string;
  type: DemoProductType;
  price: number;
  stock: number;
  reorderAt: number;
  serialized: boolean;
  storage?: string;
  color?: string;
};

export const demoStore = {
  nameAr: "Mobi Line — فرع التجربة",
  nameEn: "Mobi Line — Pilot Store",
  branchAr: "طرابلس · الفرع الرئيسي التجريبي",
  branchEn: "Tripoli · Pilot Main Branch",
  currency: "USD",
  lbpRate: 89500,
  status: "PILOT_DEMO",
} as const;

export const demoProducts: DemoProduct[] = [
  { id:"p-iphone16pro", sku:"APL-IP16P-256-BLK", barcode:"0195949774001", brand:"Apple", nameAr:"iPhone 16 Pro 256GB — Black Titanium", nameEn:"iPhone 16 Pro 256GB — Black Titanium", type:"DEVICE", price:1199, stock:3, reorderAt:2, serialized:true, storage:"256GB", color:"Black Titanium" },
  { id:"p-s25u", sku:"SAM-S25U-256-BLK", barcode:"8806095857701", brand:"Samsung", nameAr:"Samsung Galaxy S25 Ultra 256GB — Titanium Black", nameEn:"Samsung Galaxy S25 Ultra 256GB — Titanium Black", type:"DEVICE", price:1099, stock:2, reorderAt:2, serialized:true, storage:"256GB", color:"Titanium Black" },
  { id:"p-a56", sku:"SAM-A56-256-GRY", barcode:"8806095981123", brand:"Samsung", nameAr:"Samsung Galaxy A56 5G 256GB — Graphite", nameEn:"Samsung Galaxy A56 5G 256GB — Graphite", type:"DEVICE", price:389, stock:6, reorderAt:3, serialized:true, storage:"256GB", color:"Graphite" },
  { id:"p-rn14p", sku:"XIA-RN14P5G-256-BLK", barcode:"6941812791106", brand:"Xiaomi", nameAr:"Redmi Note 14 Pro 5G 256GB — Midnight Black", nameEn:"Redmi Note 14 Pro 5G 256GB — Midnight Black", type:"DEVICE", price:349, stock:5, reorderAt:3, serialized:true, storage:"256GB", color:"Midnight Black" },
  { id:"p-airpods4", sku:"APL-AIRPODS4-ANC", barcode:"0195949689305", brand:"Apple", nameAr:"AirPods 4 مع عزل ضوضاء نشط", nameEn:"AirPods 4 with Active Noise Cancellation", type:"ACCESSORY", price:179, stock:7, reorderAt:3, serialized:false },
  { id:"p-sam25w", sku:"SAM-CHG-25W-USBC", barcode:"8806094912067", brand:"Samsung", nameAr:"شاحن Samsung USB-C بقدرة 25W", nameEn:"Samsung 25W USB-C Power Adapter", type:"ACCESSORY", price:24, stock:12, reorderAt:5, serialized:false },
  { id:"p-anker30w", sku:"ANK-NANO-30W", barcode:"194644126421", brand:"Anker", nameAr:"شاحن Anker Nano USB-C بقدرة 30W", nameEn:"Anker Nano 30W USB-C Charger", type:"ACCESSORY", price:29, stock:8, reorderAt:4, serialized:false },
  { id:"p-baseus20k", sku:"BAS-PB-20K-20W", barcode:"6953156201764", brand:"Baseus", nameAr:"بطارية Baseus 20000mAh بقدرة 20W", nameEn:"Baseus 20000mAh 20W Power Bank", type:"ACCESSORY", price:39, stock:4, reorderAt:3, serialized:false },
  { id:"p-sp16p", sku:"ACC-SP-IP16P-GLS", barcode:"A1-1000016", brand:"A1 Select", nameAr:"واقي شاشة زجاجي لـ iPhone 16 Pro", nameEn:"Tempered Glass for iPhone 16 Pro", type:"ACCESSORY", price:8, stock:22, reorderAt:8, serialized:false },
  { id:"p-case-a56", sku:"ACC-CASE-A56-CLR", barcode:"A1-1000056", brand:"A1 Select", nameAr:"غطاء شفاف لـ Galaxy A56", nameEn:"Clear Case for Galaxy A56", type:"ACCESSORY", price:10, stock:14, reorderAt:6, serialized:false },
  { id:"p-s25-screen", sku:"PART-S25U-OLED", barcode:"A1-2000025", brand:"Service Stock", nameAr:"شاشة OLED بديلة لـ Galaxy S25 Ultra", nameEn:"Galaxy S25 Ultra OLED Service Display", type:"PART", price:239, stock:1, reorderAt:2, serialized:false },
  { id:"p-ip15p-batt", sku:"PART-IP15P-BATT", barcode:"A1-2000015", brand:"Service Stock", nameAr:"بطارية صيانة لـ iPhone 15 Pro", nameEn:"iPhone 15 Pro Service Battery", type:"PART", price:69, stock:2, reorderAt:2, serialized:false },
];

export const demoTransactions = [
  { id:"INV-3108", kind:"sale", customerAr:"رامي درويش", customerEn:"Rami Darwish", time:"18:42", amount:1199, status:"COMPLETED" },
  { id:"REP-1042", kind:"repair", customerAr:"لينا مصطفى", customerEn:"Lina Mustafa", time:"17:55", amount:85, status:"IN_REPAIR" },
  { id:"INV-3107", kind:"sale", customerAr:"عميل نقدي", customerEn:"Walk-in customer", time:"16:21", amount:413, status:"COMPLETED" },
  { id:"TOP-1258", kind:"topup", customerAr:"محمد خليل", customerEn:"Mohammad Khalil", time:"15:48", amount:20, status:"COMPLETED" },
  { id:"REP-1041", kind:"repair", customerAr:"نور حمود", customerEn:"Nour Hammoud", time:"14:17", amount:110, status:"READY" },
] as const;

export const demoStaff = [
  { nameAr:"مدير المتجر", nameEn:"Store Manager", email:"manager@demo.a1mobi.local", roleAr:"مدير", roleEn:"Manager", status:"ACTIVE" },
  { nameAr:"موظف المبيعات", nameEn:"Sales Counter", email:"sales@demo.a1mobi.local", roleAr:"بائع", roleEn:"Seller", status:"ACTIVE" },
  { nameAr:"فني الصيانة", nameEn:"Repair Technician", email:"repair@demo.a1mobi.local", roleAr:"فني", roleEn:"Technician", status:"ACTIVE" },
  { nameAr:"المحاسبة", nameEn:"Accounting", email:"accounts@demo.a1mobi.local", roleAr:"محاسب", roleEn:"Accountant", status:"ACTIVE" },
] as const;

export function demoLowStock() {
  return demoProducts.filter(product => product.stock <= product.reorderAt);
}

export function demoCatalogCounts() {
  return {
    total: demoProducts.length,
    devices: demoProducts.filter(product => product.type === "DEVICE").length,
    accessories: demoProducts.filter(product => product.type === "ACCESSORY").length,
    parts: demoProducts.filter(product => product.type === "PART").length,
    serializedUnits: demoProducts.filter(product => product.serialized).reduce((sum, product) => sum + product.stock, 0),
    lowStock: demoLowStock().length,
  };
}
