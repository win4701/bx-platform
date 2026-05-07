function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* =========================================================
     6 PLANS PER COIN
  ========================================================= */
  const PLANS = [
    {
      id: 'starter',
      name: 'Starter ',
      hash: '18 GH/s',
      daily: 1.15,
      days: 10,
      boost: 0.29,
      min: { BX: 50,  BNB: 0.1, SOL: 0.3 }
    },
    {
      id: 'basic',
      name: 'Basic ',
      hash: '42 GH/s',
      daily: 1.21,
      days: 21,
      boost: 0.30,
      min: { BX: 200,  BNB: 0.5, SOL: 1.5 }
    },
    {
      id: 'pro',
      name: 'Pro ',
      hash: '90 GH/s',
      daily: 1.45,
      days: 30,
      boost: 0.32,
      min: { BX: 500,  BNB: 2, SOL: 5 }
    },
    {
      id: 'elite',
      name: 'Elite ',
      hash: '240 GH/s',
      daily: 1.55,
      days: 45,
      boost: 0.35,
      min: { BX: 1200, BNB: 5, SOL: 20 }
    },
    {
      id: 'ultra',
      name: 'Ultra ',
      hash: '540 GH/s',
      daily: 1.85,
      days: 60,
      boost: 0.40,
      min: { BX: 2500, BNB: 15, SOL: 40 }
    },
    {
      id: 'legend',
      name: 'Legend ',
      hash: '1200 GH/s',
      daily: 2.05,
      days: 90,
      boost: 0.48,
      min: { BX: 4500, BNB: 50, SOL: 100 }
    }
  ];

  function getPlanVisual(plan) {
    const map = {
      starter: {
        badge: 'ENTRY',
        badgeClass: 'is-entry',
        subtitle: 'Perfect for first-time miners',
        highlight: 'Easy start'
      },
      basic: {
        badge: 'POPULAR',
        badgeClass: 'is-popular',
        subtitle: 'Balanced plan for steady growth',
        highlight: 'Best starter ROI'
      },
      pro: {
        badge: 'BOOST',
        badgeClass: 'is-boost',
        subtitle: 'More hash power, stronger returns',
        highlight: 'Mid-tier performance'
      },
      elite: {
        badge: 'PRO',
        badgeClass: 'is-pro',
        subtitle: 'Built for serious passive mining',
        highlight: 'Strong daily rewards'
      },
      ultra: {
        badge: 'HIGH ROI',
        badgeClass: 'is-ultra',
        subtitle: 'Premium mining with larger exposure',
        highlight: 'Advanced yield'
      },
      legend: {
        badge: 'WHALE',
        badgeClass: 'is-whale',
        subtitle: 'Maximum mining capacity',
        highlight: 'Top-tier mining'
      }
    };

    return map[plan.id] || {
      badge: 'PLAN',
      badgeClass: '',
      subtitle: 'Mining subscription',
      highlight: 'Flexible rewards'
    };
  }

  /* =========================================================
     STATE
  ========================================================= */
  const defaultState = {
    selectedCoin: 'BX',
    selectedPlanId: null,

    activePlanId: null,
    activeCoin: null,
    subscriptionAmount: 0,

    activeSince: null,
    expiresAt: null,
    lastClaimAt: null,

    pendingReward: 0,
    totalClaimed: 0,

    history: []
  };

  const state = {
    ...defaultState,
    ...loadState()
  };
