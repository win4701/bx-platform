/*================= CONNECTION STATE (SSOT) ================= */

const CONNECTIONS = {
  walletconnect: {
    available: true,
    connected: false,
    label: "WalletConnect"
  },
  binance: {
    available: false,
    connected: false,
    label: "Binance Pay"
  }
};

/* ================= CONNECTION RENDER ================= */

function renderWalletConnections() {
  renderConnectionButton("walletConnectBtn", CONNECTIONS.walletconnect);
  renderConnectionButton("binanceConnectBtn", CONNECTIONS.binance);
}

function renderConnectionButton(id, state) {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.classList.remove("connected", "disconnected");
  btn.disabled = false;

  if (!state.available) {
    btn.textContent = `${state.label} (Coming Soon)`;
    btn.disabled = true;
    btn.classList.add("disconnected");
    return;
  }

  if (state.connected) {
    btn.textContent = `${state.label} Connected`;
    btn.classList.add("connected");
    return;
  }

  btn.textContent = `Connect ${state.label}`;
  btn.classList.add("disconnected");
}

/* ================= CONNECTION HANDLERS ================= */

function bindWalletConnections() {
  const wc = document.getElementById("walletConnectBtn");
  const binance = document.getElementById("binanceConnectBtn");

  if (wc) {
    wc.addEventListener("click", onWalletConnect);
  }

  if (binance) {
    binance.addEventListener("click", onBinancePay);
  }
}

function onWalletConnect() {
  // mock connect (جاهز للربط الحقيقي)
  CONNECTIONS.walletconnect.connected = true;
  renderWalletConnections();

  console.log("WalletConnect connected (mock)");
}

function onBinancePay() {
  alert("Binance Pay coming soon");
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  bindWalletConnections();
  renderWalletConnections();
});
