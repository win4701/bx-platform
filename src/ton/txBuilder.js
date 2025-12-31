//  payload WalletConnect
export function buildStonSwapTx({
  routerAddress,
  userWallet,
  amountNano,
  minReceiveNano,
  payloadBase64
}) {
  return {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: routerAddress,
        amount: amountNano,
        payload: payloadBase64
      }
    ]
  };
      }
