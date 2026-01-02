const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

function send(action, payload = {}) {
  tg.sendData(JSON.stringify({ action, ...payload }));
}

window.App = {
  playChicken: () => send("PLAY_CHICKEN"),
  playCrash: () => send("PLAY_CRASH"),

  buyBX: () => send("BUY_BX"),
  sellBX: () => send("SELL_BX"),

  openAirdrop: () => send("OPEN_AIRDROP"),
  openMarket: () => send("OPEN_MARKET"),
  openProof: () => send("OPEN_PROOF"),
};
