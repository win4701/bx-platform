/*================= CONNECTION TYPE ================= */

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

/* ================= CONNECTION STATUS ================= */

function renderWalletConnections() {
  renderConnectionButton(
    "walletConnectBtn",
    CONNECTIONS.walletconnect
  );

  renderConnectionButton(
    "binanceConnectBtn",
    CONNECTIONS.binance
  );
}

function renderConnectionButton(id, state) {
  const btn = $(id);
  if (!btn) return;

  // reset
  btn.classList.remove("connected", "disconnected");
  btn.disabled = false;

  // unavailable
  if (!state.available) {
    btn.textContent = `${state.label} (Coming Soon)`;
    btn.disabled = true;
    btn.classList.add("disconnected");
    return;
  }

  // connected
  if (state.connected) {
    btn.textContent = `${state.label} Connected`;
    btn.classList.add("connected");
    return;
  }

  // available but not connected
  btn.textContent = `Connect ${state.label}`;
  btn.classList.add("disconnected");
}

/* ================= CONNECTION  Handlers.  ================ */

function bindWalletConnections() {
  const wc = $("walletConnectBtn");
  const binance = $("binanceConnectBtn");

  if (wc) {
    wc.onclick = () => {
      CONNECTIONS.walletconnect.connected = true;
      renderWalletConnections();
      log.info("WalletConnect connected (mock)");
    };
  }

  if (binance) {
    binance.onclick = () => {
      alert("Binance Pay coming soon");
    };
     
   if (typeof bindWalletConnections === "function") {
  bindWalletConnections();
  }
}
