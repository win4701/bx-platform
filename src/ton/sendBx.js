import {
  Address,
  beginCell,
  toNano,
} from "@ton/core";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { ADMIN_TON_WALLET } from "./constants.js";

/**
 * Send BX Jetton from admin wallet to user
 */
export async function sendBx({
  client,
  adminWallet,
  adminKey,
  jettonMaster,
  toAddress,
  amountBx,
}) {
  const recipient = Address.parse(toAddress);

  const jettonWallet = await jettonMaster.getWallet(
    Address.parse(ADMIN_TON_WALLET)
  );

  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)        // Jetton transfer opcode
    .storeUint(0, 64)                // query_id
    .storeCoins(amountBx)            // BX amount (in nano)
    .storeAddress(recipient)          // destination
    .storeAddress(adminWallet.address) // response destination
    .storeBit(0)                      // no custom payload
    .storeCoins(toNano("0.01"))       // forward TON
    .storeBit(0)
    .endCell();

  await adminWallet.sendTransfer({
    seqno: await adminWallet.getSeqno(),
    secretKey: adminKey,
    messages: [
      {
        to: jettonWallet.address,
        value: toNano("0.05"),
        body,
      },
    ],
  });

  return true;
}
