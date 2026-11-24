/*!
 * BLOXIO Central Pages Reference — /public/bx/pages.js
 * Read-only registry. No DOM changes, navigation, or API calls.
 * Browser: window.BX_PAGES / window.BX_APP.pages
 * CommonJS: module.exports
 */
(function (root) {
  "use strict";

  const VERSION = "1.0.0";
  const sharedAssets = Object.freeze({
    styles: [
      "/assets/css/base.css", "/assets/css/layout.css",
      "/assets/css/components.css", "/assets/css/pages.css",
      "/assets/css/responsive.css"
    ],
    branding: {
      logo: "/assets/images/branding/logo.png",
      logoSvg: "/assets/images/branding/logo.svg",
      wordmark: "/assets/images/branding/bloxio.png"
    },
    manifest: "/manifest.json",
    ambientMedia: [
      "/assets/video/ambient.mp4",
      "/assets/video/particles.mp4",
      "/assets/video/grid-loop.mp4"
    ]
  });

  const pages = {
    wallet: {
      id: "wallet", title: "Wallet", path: "/index",
      file: "public/index.html", group: "core",
      status: "source-observed", parent: null, children: ["p2p"],
      navigation: { desktop: true, mobile: true, label: "Wallet", order: 1 },
      summary: "المحفظة الرئيسية: الأرصدة والأصول والإيداع والسحب والتحويل والتبديل والنشاط والتحليلات.",
      features: ["portfolio", "assets", "deposit", "withdraw", "transfer", "swap", "transactions", "analytics"],
      dom: {
        root: ["app"],
        assets: ["walletAssetsContainer", "walletAssetSearch", "walletTransactions"],
        charts: ["walletAllocationChart", "walletDistributionChart", "walletActivityScore"],
        quickActions: ["walletQuickSheet", "walletQuickAssetName", "walletQuickDeposit", "walletQuickWithdraw", "walletQuickTransfer", "walletQuickSwap"],
        transfer: ["transferPanel", "transferAsset", "transferUser", "transferAmount", "submitTransferBtn", "transferStatus"],
        balances: ["bal-bx", "bal-xbc"]
      },
      styles: sharedAssets.styles,
      scripts: [{ path: "/bx/main.js", role: "global navigation/controller", evidence: "main-engine source" }]
    },

    market: {
      id: "market", title: "Market", path: "/pages/market",
      file: "public/pages/market.html", group: "trading",
      status: "source-observed", parent: null, children: [],
      navigation: { desktop: true, mobile: true, label: "Market", order: 2 },
      summary: "سوق العملات والسلع: اختيار الأزواج، الإحصاءات، الرسم البياني، التداول، دفتر الأوامر والسجل.",
      features: ["crypto", "commodities", "pair-selector", "search", "statistics", "chart", "buy-sell", "orderbook", "history", "intel"],
      dom: {
        selectors: ["marketBaseAssets", "marketPairAssets", "marketPairsTitle", "marketPairsCount", "marketSearch"],
        stats: ["marketPair", "marketPrice", "marketChange", "marketVolume", "spread"],
        chart: ["marketChart", "marketTooltip"],
        trading: ["tradeBox", "tradeTitle", "buyTab", "sellTab", "orderAmount", "orderPrice", "orderTotal", "actionBtn"],
        mobileTabs: ["trade", "book", "history", "intel"]
      },
      commoditiesPairs: ["XAU/EUBX", "XAG/EUBX", "XPT/EUBX", "XPD/EUBX", "COPPER/EUBX", "OIL/EUBX", "BRENT/EUBX", "NG/EUBX"],
      styles: sharedAssets.styles,
      scripts: [
        { path: "/bx/market-page.js", role: "market controller", evidence: "market update package" },
        { path: "/bx/data/coins.js", role: "asset registry", evidence: "market update package" }
      ],
      notes: ["أزواج السلع مدرجة وفق تحديث السوق الذي أُعد سابقًا؛ يجب مطابقة النسخة المنشورة."]
    },

    casino: {
      id: "casino", title: "Casino", path: "/pages/casino",
      file: "public/pages/casino.html", group: "play",
      status: "source-observed", parent: null, children: ["game"],
      navigation: { desktop: true, mobile: true, label: "Casino", order: 3 },
      summary: "ردهة الكازينو وكتالوج الألعاب؛ تشغيل اللعبة منفصل في صفحة Game.",
      features: ["game-catalogue", "categories", "featured-games", "launch-game"],
      dom: { knownSelectorsFromStyles: ["casinoGamesGrid", "casinoGameView", "casinoGameContainer"] },
      scripts: [
        { path: "/bx/casino.js", role: "casino core", evidence: "casino project README" },
        { path: "/bx/casino-premium.js", role: "casino UI layer", evidence: "casino project README" },
        { path: "/bx/chart.games.js", role: "game history chart", evidence: "casino project README" }
      ],
      notes: ["لا تحمّل casino.js مرتين إذا كان مستوردًا مسبقًا من مدخل التطبيق."]
    },

    game: {
      id: "game", title: "Game", path: "/pages/game",
      file: "public/pages/game.html", group: "play",
      status: "route-observed-in-main-engine", parent: "casino", children: [],
      navigation: { desktop: false, mobile: false, label: "Game" },
      query: { game: "معرّف اللعبة المطابق لكتالوج الألعاب" },
      summary: "صفحة تشغيل اللعبة المنطلقة من كتالوج Casino.",
      features: ["game-launch", "session", "controls", "history"],
      scripts: [{ path: "/bx/game.js", role: "game runtime", evidence: "project history; verify current page integration" }]
    },

    mining: {
      id: "mining", title: "Mining", path: "/pages/mining",
      file: "public/pages/mining.html", group: "earn",
      status: "source-observed", parent: null, children: [],
      navigation: { desktop: true, mobile: true, label: "Mining", order: 4 },
      summary: "لوحة التعدين: اختيار العملة والخطط والاشتراك والمركز النشط والمكافآت والسجل.",
      features: ["coin-tabs", "plans", "subscribe", "active-position", "yield", "progress", "claim", "history"],
      supportedCoinTabs: ["BX", "ETC", "LTC", "TRX", "BNB", "SOL", "XRP", "USDC", "DOGE", "TON"],
      dom: {
        grid: ["miningGrid", "miningTabs", "miningStatus", "miningToast"],
        active: ["miningActivePanel", "miningActiveBadge", "miningActiveName", "miningActiveHash", "miningActiveDaily", "miningPendingReward", "miningTotalClaimed", "miningProgressText", "miningProgressFill", "miningProgressHint"],
        subscribe: ["miningSubscribePanel", "miningSelectedPlanTitle", "miningSelectedPlanMeta", "miningAvailableBalance", "miningAmountInput", "miningSubSummary", "confirmMiningSubscribeBtn", "closeMiningSubscribePanel"],
        actions: ["claimMiningRewardBtn", "cancelMiningPlanBtn", "miningRefreshBtn"],
        history: ["miningHistoryList"]
      },
      styles: sharedAssets.styles,
      scripts: [{ path: "/bx/mining.js", role: "mining controller", evidence: "expected path; verify in current repository" }]
    },

    airdrop: {
      id: "airdrop", title: "Airdrop", path: "/pages/airdrop",
      file: "public/pages/airdrop.html", group: "earn",
      status: "source-observed", parent: null, children: ["reward"],
      navigation: { desktop: false, mobile: false, label: "Airdrop" },
      summary: "مركز BX Airdrop للمهام والإحالة والمطالبة بالمكافآت.",
      features: ["task-center", "claim-reward", "referral-link", "invite-stats", "earned-bx", "rank", "whitepaper"],
      dom: {
        claim: ["claimAirdropBtn", "airdropReward", "airdrop-ref-stats", "taskCounter"],
        tasks: ["airdropTasks"],
        referral: ["ref-link-airdrop", "copyRefBtn", "refCount", "earnedBX", "refRank"]
      },
      styles: sharedAssets.styles,
      scripts: [{ path: "/bx/airdrop.js", role: "airdrop controller", evidence: "expected path; verify in current repository" }]
    },

    reward: {
      id: "reward", title: "Rewards", path: "/pages/reward",
      file: "public/pages/reward.html", group: "earn",
      status: "planned-route-from-project-structure", parent: "airdrop", children: [],
      navigation: { desktop: false, mobile: false, label: "Rewards" },
      summary: "صفحة فرعية للمكافآت وسجلها وأهلية الاستحقاق.",
      features: ["reward-overview", "reward-history", "eligibility"],
      notes: ["المسار ضمن هيكل المشروع المتفق عليه؛ يلزم التأكد من وجود الملف المنشور."]
    },

    mint: {
      id: "mint", title: "Mint", path: "/pages/mint",
      file: "public/pages/mint.html", group: "community",
      status: "planned-route-after-news-renaming", parent: null, children: [],
      navigation: { desktop: true, mobile: true, label: "Mint", order: 5 },
      summary: "Mint Moments: مساحة اجتماعية تركز على المنشورات النصية والصور والتفاعل والمبدعين والمكافآت.",
      features: ["text-posts", "photo-upload-up-to-10", "captions", "hashtags", "mentions", "edit-delete", "likes", "comments-replies", "coins", "share", "follow", "for-you", "following", "creators", "trending", "latest", "pioneer-rewards", "creator-rewards", "notifications"],
      restrictions: ["لا فيديو", "لا سوق", "لا إعادة نشر", "لا حفظ منشورات"],
      scripts: [{ path: "/bx/mint.js", role: "Mint Moments frontend", evidence: "previously prepared module; backend unverified" }],
      api: {
        status: "proposed-unverified",
        endpoints: [
          "GET /moments/feed", "POST /moments/posts", "PUT /moments/posts/:id", "DELETE /moments/posts/:id",
          "POST /moments/posts/:id/like", "GET /moments/posts/:id/comments",
          "POST /moments/posts/:id/comments", "POST /moments/comments/:id",
          "POST /moments/posts/:id/coins", "POST /moments/users/:id/follow",
          "GET /moments/me", "GET /moments/creators", "GET /moments/challenges",
          "GET /moments/notifications", "GET /moments/rewards"
        ]
      },
      notes: [
        "Mint هو الاسم الجديد لقسم News وفق خطة المشروع.",
        "محرك main.js الذي تمت معاينته ما زال يحتوي مسار news القديم؛ يجب تحديث المحرك وروابط HTML معًا عند النشر.",
        "مكافحة التلاعب بالمكافآت يجب أن تتم في الخادم، وليست مسؤولية هذا المرجع."
      ]
    },

    p2p: {
      id: "p2p", title: "P2P", path: "/pages/p2p",
      file: "public/pages/p2p.html", group: "wallet-services",
      status: "planned-route-from-project-structure", parent: "wallet", children: [],
      navigation: { desktop: false, mobile: false, label: "P2P" },
      summary: "خدمة تداول بين المستخدمين مرتبطة بالمحفظة.",
      features: ["offers", "buy-sell", "order-status", "payment-instructions"],
      notes: ["P2P قسم فرعي للمحفظة وليس عنصر تنقل رئيسيًا مستقلًا في الخطة الحالية."]
    },

    profile: {
      id: "profile", title: "Profile", path: "/pages/profile",
      file: "public/pages/profile.html", group: "account",
      status: "planned-route-from-project-structure", parent: null, children: [],
      navigation: { desktop: false, mobile: false, label: "Profile" },
      summary: "ملف المستخدم ومعلومات الحساب.",
      features: ["identity", "profile-details", "account-activity"],
      notes: ["المسار ضمن مخطط الصفحات؛ تحقق من وجود الصفحة قبل ربطها."]
    },

    settings: {
      id: "settings", title: "Settings", path: "/pages/settings",
      file: "public/pages/settings.html", group: "account",
      status: "source-observed", parent: null, children: [],
      navigation: { desktop: true, mobile: false, label: "Settings", order: 7 },
      summary: "إعدادات المظهر واللغة والأمان والأداء وحالة النظام.",
      features: ["theme", "motion", "sound", "compact-mode", "language", "security", "pwa", "system-status"],
      dom: {
        status: ["appVersion", "systemEnvironment", "systemHealth"],
        appearance: ["themeToggle", "motionToggle", "soundToggle", "compactToggle"],
        locale: ["localeTrigger", "currentLocale", "localeMenu"]
      },
      styles: sharedAssets.styles
    },

    more: {
      id: "more", title: "More", path: "/pages/more",
      file: "public/pages/more.html", group: "navigation",
      status: "planned-route-from-project-structure", parent: null, children: [],
      navigation: { desktop: false, mobile: false, label: "More" },
      summary: "قائمة تنقل إضافية لصفحات الهاتف والاختصارات الثانوية.",
      features: ["secondary-navigation", "account-shortcuts", "section-links"],
      notes: ["المسار ظهر في خريطة main.js؛ تحقق من ملف الصفحة المنشور."]
    }
  };

  const navigation = Object.freeze({
    desktop: ["wallet", "market", "casino", "mining", "mint"],
    mobile: ["wallet", "market", "casino", "mining", "mint"],
    walletChildren: ["p2p"],
    airdropChildren: ["reward"],
    casinoChildren: ["game"]
  });

  const legacy = Object.freeze({
    news: {
      previousPath: "/pages/news.html",
      replacement: "mint",
      status: "legacy-route-observed-in-main-engine",
      note: "تحديث main.js وروابط data-view='news' إلى Mint مطلوب عند دمج صفحة Mint."
    }
  });

  const api = Object.freeze({
    wallet: { status: "not-verified", note: "يلزم فحص محرك المحفظة لتوثيق المسارات بدقة." },
    market: { status: "not-verified", note: "لم يتم تأكيد مزود الأسعار ومسارات التداول من الخادم." },
    mining: { status: "not-verified", note: "مسارات الخطط والاشتراك والمطالبة تحتاج فحص backend." },
    casino: { status: "partially-documented", endpoints: ["GET /api/casino/history"] },
    mint: { status: "proposed-unverified", endpoints: pages.mint.api.endpoints }
  });

  function get(id) { return pages[id] || null; }
  function url(id, query) {
    const page = get(id);
    if (!page) return null;
    return page.path + (query ? (String(query).startsWith("?") ? query : "?" + query) : "");
  }
  function list(options) {
    const opts = options || {};
    return Object.values(pages).filter(page => {
      if (opts.group && page.group !== opts.group) return false;
      if (opts.status && page.status !== opts.status) return false;
      if (opts.navigation === "desktop" && !page.navigation?.desktop) return false;
      if (opts.navigation === "mobile" && !page.navigation?.mobile) return false;
      return true;
    });
  }
  function resolve(path) {
    if (!path) return null;
    const clean = String(path).split("?")[0].replace(/\/+$/, "") || "/";
    return Object.values(pages).find(page => page.path.replace(/\/+$/, "") === clean) || null;
  }

  const registry = Object.freeze({
    version: VERSION, app: "BLOXIO", basePath: "/",
    sharedAssets, pages: Object.freeze(pages), navigation, legacy, api,
    get, url, list, resolve
  });

  root.BX_PAGES = registry;
  root.BX_APP = root.BX_APP || {};
  root.BX_APP.pages = registry;
  if (typeof module !== "undefined" && module.exports) module.exports = registry;
})(typeof window !== "undefined" ? window : globalThis);
