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
symbol:"XBC",
name:"Bloxio Casino",
category:"main",
type:"casino",
price:0.15,
fixedPrice:true,
supply:10000000000,
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
icon:"/assets/images/coins/pepe.png"
},

{
symbol:"SHIB",
name:"Shiba Inu",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/shib.png"
},

{
symbol:"BONK",
name:"Bonk",
category:"secondary",
swap:true,
wallet:true,
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
symbol:"GBG",
name:"GBG",
category:"secondary",
swap:true,
wallet:true,
icon:"/assets/images/coins/gbg.png"
}

];

/* =========================================================
   CASINO CURRENCIES
========================================================= */

export const CASINO_COINS=[
"BX",
"XBC"
];

/* =========================================================
   MARKET COINS
========================================================= */

export const MARKET_COINS=[

"BTC",
"ETH",
"BNB",
"SOL",
"TON",
"LTC",
"BCH",
"USDT",
"USDC",
"ZEC",
"AAVE",
"AVAX",
"DOT",
"LINK",
"DASH",
"XMR"

];

/* =========================================================
   XBC FIXED PRICE
========================================================= */

export const XBC_PRICE = 0.15;

/* =========================================================
   BX REFERENCE PRICE
========================================================= */

export const BX_PRICE = 45;

/* =========================================================
   CASINO MINIMUM BETS
========================================================= */

export const MIN_BETS={

BX:0.1,

XBC:10

};
