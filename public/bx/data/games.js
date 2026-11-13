/* =========================================================
   CASINO GAMES 2026
   TOTAL = 18 GAMES
   ========================================================= */

export const CASINO_GAMES = [

    /* =========================================================
       ORIGINALS (9 ألعاب)
       ========================================================= */
    { id: "crash", name: "Crash", provider: "Bloxio Originals", image: "/assets/images/casino/crash.webp", currency: ["BX", "XBC"], status: "active", category: "original" },
    { id: "dice", name: "Dice", provider: "Bloxio Originals", image: "/assets/images/casino/dice.webp", currency: ["BX", "XBC"], status: "active", category: "original" },
    { id: "limbo", name: "Limbo", provider: "Bloxio Originals", image: "/assets/images/casino/limbo.webp", currency: ["BX", "XBC"], status: "active", category: "original" },
    { id: "mines", name: "Mines", provider: "Bloxio Originals", image: "/assets/images/casino/mines.webp", currency: ["BX", "XBC"], status: "active", category: "original" },
    { id: "hilo", name: "HiLo", provider: "Bloxio Originals", image: "/assets/images/casino/hilo.webp", currency: ["BX", "XBC"], status: "active", category: "original" },
    { id: "coinflip", name: "Coin Flip", provider: "Bloxio Originals", image: "/assets/images/casino/coinflip.webp", currency: ["BX", "XBC"], status: "active", category: "original" },
    { id: "plinko", name: "Plinko", provider: "Bloxio Originals", image: "/assets/images/casino/plinko.webp", currency: ["BX", "XBC"], status: "active", category: "original" }, // تحتاج صورة
    { id: "wheel", name: "wheel", provider: "Bloxio Originals", image: "/assets/images/casino/wheel.webp", currency: ["BX", "XBC"], status: "active", category: "original" }, // تحتاج صورة
    { id: "keno", name: "Keno", provider: "Bloxio Originals", image: "/assets/images/casino/keno.webp", currency: ["BX", "XBC"], status: "active", category: "original" }, // تحتاج صورة

    /* =========================================================
       CARDS (2 ألعاب)
       ========================================================= */
    { id: "blackjack", name: "Blackjack", provider: "Bloxio Originals", image: "/assets/images/casino/blackjack.webp", currency: ["BX", "XBC"], status: "active", category: "card" },
    { id: "baccarat", name: "Baccarat", provider: "Bloxio Originals", image: "/assets/images/casino/baccarat.webp", currency: ["BX", "XBC"], status: "active", category: "card" }, // تحتاج صورة

    /* =========================================================
       ROULETTE (1 لعبة)
       ========================================================= */
    { id: "roulette", name: "Roulette", provider: "Bloxio Originals", image: "/assets/images/casino/roulette.webp", currency: ["BX", "XBC"], status: "active", category: "roulette" }, // تحتاج صورة

    /* =========================================================
       ARCADE (4 ألعاب)
       ========================================================= */
    { id: "airboss", name: "Air Boss", provider: "Bloxio Arcade", image: "/assets/images/casino/airboss.webp", currency: ["BX", "XBC"], status: "active", category: "arcade" },
    { id: "birds-party", name: "Birds Party", provider: "Bloxio Arcade", image: "/assets/images/casino/birdsparty.webp", currency: ["BX", "XBC"], status: "active", category: "arcade" },
    { id: "tower-rush", name: "Tower Rush", provider: "Bloxio Arcade", image: "/assets/images/casino/tower.webp", currency: ["BX", "XBC"], status: "active", category: "arcade" }, // تحتاج صورة
    { id: "chicken-road", name: "Chicken Road", provider: "Bloxio Arcade", image: "/assets/images/casino/chicken.webp", currency: ["BX", "XBC"], status: "active", category: "arcade" }, // تحتاج صورة

    /* =========================================================
       SLOTS (2 ألعاب)
       ========================================================= */
    { id: "bananafarm", name: "Banana Farm", provider: "Bloxio Slots", image: "/assets/images/casino/bananafarm.webp", currency: ["BX", "XBC"], status: "active", category: "slot" },
    { id: "fruitparty", name: "Fruit Party", provider: "Bloxio Slots", image: "/assets/images/casino/fruitparty.webp", currency: ["BX", "XBC"], status: "active", category: "slot" }
];

/* ترتيب ظهور الألعاب في الصفحة الرئيسية */
export const CASINO_HOME_ORDER = [
    "crash", "mines", "plinko", "tower-rush", "chicken-road", 
    "dice", "limbo", "roulette", "wheel", "keno", "hilo", 
    "blackjack", "baccarat", "coinflip", "airboss", 
    "birds-party", "bananafarm", "fruitparty"
];

/* التصنيفات (تستخدم صيغة المفرد لتطابق الكود) */
export const CASINO_CATEGORIES = [
    { id: "all", name: "All Games" },
    { id: "original", name: "Originals" },
    { id: "arcade", name: "Arcade" },
    { id: "slot", name: "Slots" },
    { id: "card", name: "Cards" },
    { id: "roulette", name: "Roulette" }
];

export const CASINO_CURRENCIES = ["BX", "XBC"];

export const CASINO_LIMITS = {
    BX: { min: 0.1, max: 1000 },
    XBC: { min: 10, max: 500000 }
};
