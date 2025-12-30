import { TonClient } from "ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { hasClaimed, markClaimed, logWithdraw } from "./db.js";

export async function getBalance(wallet) {
  // Use TON indexer / RPC to read Jetton balance
  return "0.00";
}

async function sendJetton(to, amount) {
  const client = new TonClient({ endpoint: process.env.TON_RPC });
  const key = await mnemonicToPrivateKey(
    process.env.HOT_WALLET_SEED.split(" ")
  );
  // Build and send Jetton transfer from hot wallet
  // (Implement Jetton wallet contract call here)
}

export async function claimBX(tid, wallet) {
  if (await hasClaimed(tid)) throw new Error("Already claimed");
  await sendJetton(wallet, Number(process.env.CLAIM_AMOUNT));
  await markClaimed(tid);
}

export async function withdrawBX(tid, wallet, amount) {
  await sendJetton(wallet, amount);
  await logWithdraw(tid, amount);
}
