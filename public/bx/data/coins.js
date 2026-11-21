/* =========================================================
   FILE: public/bx/data/coins.js
   BLOXIO COINS REGISTRY 2026
========================================================= */

export const COINS = [

/* =========================================================
   PLATFORM ASSETS
========================================================= */

{
symbol:"BX",
name:"Bloxio",
category:"main",
type:"platform",
price:45,
decimals:18,
minBet:0.1,
swap:true,
casino:true,
wallet:true,
market:true,
icon:"/assets/images/coins/bx.png"
},
   
{
symbol:"EUBX",
name:"Bloxio euro",
category:"main",
type:"platform",
price:1,
fixedPrice:true,
referenceCurrency:"EUR",
referencePrice:1,
decimals:18,
minBet:0.2,
swap:true,
casino:true,
wallet:true,
market:true,
icon:"/assets/images/coins/eubx.png"
},



/* =========================================================
   SWAP & CASINO GAME ASSETS
   These assets are enabled for Swap and Casino only.
   They are intentionally excluded from MARKET_COINS / MARKET_PAIRS.
========================================================= */

{
symbol:"STR",
name:"STR",
category:"main",
type:"game",
price:0.05,
decimals:18,
minBet:1,
swap:true,
casino:true,
wallet:true,
market:false,
icon:"/assets/images/coins/str.png"
},

{
symbol:"XBC",
name:"Bloxio Casino",
category:"main",
type:"casino",
price:0.08,
fixedPrice:true,
supply:20000000000,
decimals:18,
minBet:10,
swap:true,
casino:true,
wallet:true,
market:false,
icon:"/assets/images/coins/xbc.png"
},

/* =========================================================
   STABLECOINS
========================================================= */

{
symbol:"USDT",
name:"Tether",
category:"main",
type:"stable",
price:1,
decimals:6,
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/usdt.png"
},


   
{
symbol:"USDC",
name:"USD Coin",
category:"main",
type:"stable",
price:1,
decimals:6,
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/usdc.png"
},

{
symbol:"TUSD",
name:"TrueUSD",
category:"secondary",
type:"stable",
price:1,
decimals:18,
swap:true,
wallet:true,
market:false,
icon:"/assets/images/coins/tusd.png"
},

{
symbol:"DAI",
name:"Dai",
category:"secondary",
type:"stable",
price:1,
decimals:18,
swap:true,
wallet:true,
market:false,
icon:"/assets/images/coins/dai.png"
},

/* =========================================================
   MARKET ASSETS
========================================================= */

{
symbol:"BTC",
name:"Bitcoin",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/btc.png"
},

{
symbol:"ETH",
name:"Ethereum",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/eth.png"
},

{
symbol:"BNB",
name:"BNB",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/bnb.png"
},

{
symbol:"SOL",
name:"Solana",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/sol.png"
},

{
symbol:"PI",
name:"Pi Network",
category:"main",
swap:true,
wallet:true,
market:false,
icon:"/assets/images/coins/pi.png"
},




{
symbol:"TON",
name:"Toncoin",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/ton.png"
},

{
symbol:"LTC",
name:"Litecoin",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/ltc.png"
},

{
symbol:"BCH",
name:"Bitcoin Cash",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/bch.png"
},

{
symbol:"ZEC",
name:"Zcash",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/zec.png"
},

{
symbol:"AAVE",
name:"Aave",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/aave.png"
},

{
symbol:"AVAX",
name:"Avalanche",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/avax.png"
},

{
symbol:"DOT",
name:"Polkadot",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/dot.png"
},

{
symbol:"LINK",
name:"Chainlink",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/link.png"
},

{
symbol:"DASH",
name:"Dash",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/dash.png"
},

{
symbol:"XMR",
name:"Monero",
category:"main",
swap:true,
wallet:true,
market:true,
icon:"/assets/images/coins/xmr.png"
},

{
symbol:"XRP",
name:"XRP",
category:"main",
swap:true,
wallet:true,
market:false,
icon:"/assets/images/coins/xrp.png"
},

{
symbol:"TRX",
name:"TRON",
category:"main",
swap:true,
wallet:true,
market:false,
icon:"/assets/images/coins/trx.png"
},

{
symbol:"DOGE",
name:"Dogecoin",
category:"main",
swap:true,
wallet:true,
market:false,
icon:"/assets/images/coins/doge.png"
},


/* =========================================================
   COMMODITIES — QUOTED IN EUBX
   Prices intentionally omitted until a verified market feed is connected.
========================================================= */

{
    symbol: "XAU",
    name: "Gold",
    category: "secondary",
    type: "commodity",
    commodityType: "precious_metal",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/xau.png"
},

{
    symbol: "XAG",
    name: "Silver",
    category: "secondary",
    type: "commodity",
    commodityType: "precious_metal",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/xag.png"
},

{
    symbol: "XPT",
    name: "Platinum",
    category: "secondary",
    type: "commodity",
    commodityType: "precious_metal",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/xpt.png"
},

{
    symbol: "XPD",
    name: "Palladium",
    category: "secondary",
    type: "commodity",
    commodityType: "precious_metal",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/xpd.png"
},

{
    symbol: "COPPER",
    name: "Copper",
    category: "secondary",
    type: "commodity",
    commodityType: "industrial_metal",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/copper.png"
},

{
    symbol: "OIL",
    name: "Crude Oil",
    category: "secondary",
    type: "commodity",
    commodityType: "energy",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/oil.png"
},

{
    symbol: "BRENT",
    name: "Brent Oil",
    category: "secondary",
    type: "commodity",
    commodityType: "energy",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/brent.png"
},

{
    symbol: "NG",
    name: "Natural Gas",
    category: "secondary",
    type: "commodity",
    commodityType: "energy",
    quoteAsset: "EUBX",
    market: true,
    wallet: false,
    swap: false,
    icon: "/assets/images/commodities/ng.png"
},

/* =========================================================
   SECONDARY ASSETS
========================================================= */

{
symbol:"ADA",
name:"Cardano",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/ada.png"
},

{
symbol:"ATOM",
name:"Cosmos",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/atom.png"
},

{
symbol:"ARB",
name:"Arbitrum",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/arb.png"
},

{
symbol:"APT",
name:"Aptos",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/apt.png"
},

{
symbol:"FIL",
name:"Filecoin",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/fil.png"
},

{
symbol:"HBAR",
name:"Hedera",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/hbar.png"
},

{
symbol:"ICP",
name:"Internet Computer",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/icp.png"
},

{
symbol:"NEAR",
name:"Near",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/near.png"
},

{
symbol:"NEO",
name:"Neo",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/neo.png"
},

{
symbol:"OP",
name:"Optimism",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/op.png"
},

{
symbol:"POL",
name:"Polygon",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/pol.png"
},

{
symbol:"SUI",
name:"Sui",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/sui.png"
},

{
symbol:"VET",
name:"VeChain",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/vet.png"
},

{
symbol:"ETC",
name:"Ethereum Classic",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/etc.png"
},

{
symbol:"XLM",
name:"Stellar",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/xlm.png"
},

{
symbol:"ALGO",
name:"Algorand",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/algo.png"
},

{
symbol:"XTZ",
name:"Tezos",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/xtz.png"
},

{
symbol:"FLOW",
name:"Flow",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/flow.png"
},

{
symbol:"WAVES",
name:"Waves",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/waves.png"
},

{
symbol:"KCS",
name:"KuCoin Token",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/kcs.png"
},

{
symbol:"CAKE",
name:"PancakeSwap",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/cake.png"
},

{
symbol:"UNI",
name:"Uniswap",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/uni.png"
},

{
symbol:"MKR",
name:"Maker",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/mkr.png"
},

{
symbol:"SNX",
name:"Synthetix",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/snx.png"
},

{
symbol:"1INCH",
name:"1inch",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/1inch.png"
},

{
symbol:"YFI",
name:"Yearn Finance",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/yfi.png"
},

{
symbol:"KSM",
name:"Kusama",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/ksm.png"
},

{
symbol:"CHZ",
name:"Chiliz",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/chz.png"
},

{
symbol:"APE",
name:"ApeCoin",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/ape.png"
},

{
symbol:"PEPE",
name:"Pepe",
category:"secondary",
swap:true,
wallet:true,
casino:true,
icon:"/assets/images/coins/pepe.png"
},

{
symbol:"SHIB",
name:"Shiba Inu",
category:"secondary",
swap:true,
wallet:true,
casino:true,
icon:"/assets/images/coins/shib.png"
},

{
symbol:"BONK",
name:"Bonk",
category:"secondary",
swap:true,
wallet:true,
casino:true,
icon:"/assets/images/coins/bonk.png"
},

{
symbol:"BAT",
name:"Basic Attention Token",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/bat.png"
},

{
symbol:"ENJ",
name:"Enjin",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/enj.png"
},

{
symbol:"INJ",
name:"Injective",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/inj.png"
},

{
symbol:"MASK",
name:"Mask Network",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/mask.png"
},

{
symbol:"GMX",
name:"GMX",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/gmx.png"
},

{
symbol:"ICX",
name:"ICON",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/icx.png"
},

{
symbol:"QTUM",
name:"Qtum",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/qtum.png"
},

{
symbol:"HT",
name:"HTX Token",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/ht.png"
},

{
symbol:"BGB",
name:"Bitget",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/bgb.png"
}

];

/* =========================================================
   CASINO CURRENCIES
========================================================= */

export const CASINO_COINS = Object.freeze(["BX", "XBC", "STR", "EUBX", "SHIB", "PEPE", "BONK"]);

/* =========================================================
   MARKET COINS
========================================================= */

/* =========================================================
   MARKET COINS & PAIRS
   Core pairs remain quoted in USDT.
   Expansion crypto assets and commodities are quoted in EUBX.
========================================================= */

export const MARKET_COINS = [
    "BX", "EUBX", "BTC", "ETH", "SOL",
    "BNB", "TON", "LTC", "BCH", "XLM",
    "ZEC", "AAVE", "AVAX", "DOT", "LINK",
    "DASH", "XMR",
    "XAU", "XAG", "XPT", "XPD", "COPPER",
    "OIL", "BRENT", "NG"
];

/* Resolve the quote asset for a market base symbol */
export const getMarketPair = symbol => {
    if (!symbol) return null;
    const base = String(symbol).trim().toUpperCase();
    return MARKET_PAIRS.find(pair => (typeof pair === "string" ? pair : pair.symbol).startsWith(`${base}/`)) || null;
};

/* Resolve a pair's base and quote symbols */
export const parseMarketPair = pair => {
    if (!pair) return null;
    const [base, quote, ...extra] = String(pair).trim().toUpperCase().split("/");
    if (!base || !quote || extra.length) return null;
    return { base, quote };
};

/* =========================================================
   BX REFERENCE PRICE
========================================================= */

export const STR_PRICE = 0.05;
export const XBC_PRICE = 0.08;
export const BX_PRICE = 45;
export const EUBX_PRICE = 1;
export const EUBX_REFERENCE_CURRENCY = "EUR";
export const EUBX_FIXED_PRICE = true;

/* =========================================================
   CASINO MINIMUM BETS
========================================================= */

export const MIN_BETS = Object.freeze({
    BX: 0.1, XBC: 10, STR: 1, EUBX: 0.2,
    SHIB: 0.1, PEPE: 0.1, BONK: 0.1
});

/* =========================================================
   BLOXIO COINS REGISTRY — EXTENDED API
   Compatible with existing exports
========================================================= */

/* ASSET GROUPS */

export const MAIN_ASSETS = COINS.filter(
    coin => coin.category === "main"
);

export const SECONDARY_ASSETS = COINS.filter(
    coin => coin.category === "secondary"
);

/* Compatibility alias:
   Extended assets are the secondary asset collection. */

export const EXTENDED_ASSETS = SECONDARY_ASSETS;

/* WALLET ASSETS */

export const WALLET_COINS = COINS.filter(
    coin => coin.wallet === true
);

/* SWAP ASSETS */

export const SWAP_COINS = COINS.filter(
    coin => coin.swap === true
);

/* COMMODITY ASSETS */
export const COMMODITY_ASSETS = COINS.filter(coin => coin.type === "commodity");

/* MARKET ASSETS */

export const MARKET_ASSETS = COINS.filter(
    coin => coin.market === true
);

/* =========================================================
   MARKET PAIRS
   Core quote assets: USDT and EUBX.
   Commodity instruments are quoted in EUBX.
========================================================= */

export const CORE_MARKET_PAIRS = Object.freeze([
    { symbol: "BX/USDT", baseAsset: "BX", quoteAsset: "USDT", group: "platform" },
    { symbol: "EUBX/EUR", baseAsset: "EUBX", quoteAsset: "EUR", group: "platform", fixedPrice: true, referencePrice: 1 },
    { symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", group: "crypto" },
    { symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", group: "crypto" },
    { symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", group: "crypto" }
]);

const CORE_PAIR_SYMBOLS = new Set(
    CORE_MARKET_PAIRS.map(pair => pair.baseAsset)
);

export const MARKET_PAIRS = Object.freeze([
    ...CORE_MARKET_PAIRS,
    ...MARKET_ASSETS
        .filter(coin => coin.symbol !== "USDT" && !CORE_PAIR_SYMBOLS.has(coin.symbol))
        .map(coin => ({
            symbol: `${coin.symbol}/${coin.quoteAsset || "USDT"}`,
            baseAsset: coin.symbol,
            quoteAsset: coin.quoteAsset || "USDT",
            group: coin.type === "commodity" ? "commodities" : "crypto",
            assetType: coin.type || "crypto"
        }))
]);

/* CASINO ASSETS */

export const CASINO_ASSETS = COINS.filter(
    coin => coin.casino === true
);

/* STABLECOINS */

export const STABLECOINS = COINS.filter(
    coin => coin.type === "stable"
);

/* PLATFORM ASSETS */

export const PLATFORM_ASSETS = COINS.filter(
    coin =>
        coin.type === "platform" ||
        coin.type === "casino"
);

/* =========================================================
   COIN LOOKUP
========================================================= */

export const getCoin = symbol => {
    if (!symbol) return null;

    const key = String(symbol).trim().toUpperCase();

    return COINS.find(
        coin => coin.symbol === key
    ) || null;
};

/* =========================================================
   FILTER HELPERS
========================================================= */

export const getCoinsByCategory = category => {
    return COINS.filter(
        coin => coin.category === category
    );
};

export const getCoinsByType = type => {
    return COINS.filter(
        coin => coin.type === type
    );
};

export const getWalletCoins = () => WALLET_COINS;

export const getMarketCoins = () => MARKET_ASSETS;

export const getSwapCoins = () => SWAP_COINS;

export const getCasinoCoins = () => CASINO_ASSETS;

/* =========================================================
   PRICE HELPERS
========================================================= */

export const getCoinPrice = symbol => {
    const coin = getCoin(symbol);

    if (!coin || !Number.isFinite(Number(coin.price))) {
        return null;
    }

    return Number(coin.price);
};

export const getMinimumBet = symbol => {
    const key = String(symbol || "").trim().toUpperCase();

    return Number(MIN_BETS[key] || getCoin(key)?.minBet || 0);
};

/* =========================================================
   REGISTRY INDEX
========================================================= */

export const COIN_INDEX = Object.freeze(
    Object.fromEntries(
        COINS.map(coin => [coin.symbol, coin])
    )
);

/* =========================================================
   REGISTRY METADATA
========================================================= */

export const COIN_STATS = Object.freeze({
    total: COINS.length,
    wallet: WALLET_COINS.length,
    market: MARKET_ASSETS.length,
    marketPairs: MARKET_PAIRS.length,
    commodities: COMMODITY_ASSETS.length,
    swap: SWAP_COINS.length,
    casino: CASINO_ASSETS.length,
    stablecoins: STABLECOINS.length,
    main: MAIN_ASSETS.length,
    secondary: SECONDARY_ASSETS.length
});

/* =========================================================
   REGISTRY VALIDATION
========================================================= */

export const validateCoins = () => {
    const symbols = new Set();
    const errors = [];

    COINS.forEach((coin, index) => {
        if (!coin.symbol) {
            errors.push(`Coin at index ${index} has no symbol`);
            return;
        }

        if (symbols.has(coin.symbol)) {
            errors.push(`Duplicate coin: ${coin.symbol}`);
        }

        symbols.add(coin.symbol);

        if (!coin.name) {
            errors.push(`${coin.symbol} has no name`);
        }

        if (!["main", "secondary"].includes(coin.category)) {
            errors.push(`${coin.symbol} has invalid category`);
        }

        if (
            coin.price !== undefined &&
            (!Number.isFinite(Number(coin.price)) ||
             Number(coin.price) < 0)
        ) {
            errors.push(`${coin.symbol} has invalid price`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        total: COINS.length
    };
};
