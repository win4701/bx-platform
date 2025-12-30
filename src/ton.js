// src/ton.js

// ⚠️ هذه نسخة منطقية (Mock)
// يمكنك ربطها لاحقًا بـ ton-core / tonweb

export async function getBalance(walletAddress) {
  // TODO: Query Jetton wallet
  return "100.00";
}

export async function claimBX(userId, walletAddress) {
  // TODO: Send Jetton from distributor wallet
  console.log(`Claim BX → user=${userId} wallet=${walletAddress}`);
  return true;
}

export async function withdrawBX(userId, walletAddress, amount) {
  // TODO: Send Jetton transfer
  console.log(
    `Withdraw BX → user=${userId} wallet=${walletAddress} amount=${amount}`
  );
  return true;
}
