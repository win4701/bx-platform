import { MerkleTree } from "merkletreejs";
import crypto from "crypto";

export function buildMerkle(users) {
  const leaves = users.map(u =>
    crypto.createHash("sha256")
      .update(u.wallet + u.amount)
      .digest()
  );

  const tree = new MerkleTree(leaves, crypto.createHash);
  return {
    root: tree.getRoot().toString("hex"),
    proof: (wallet, amount) =>
      tree.getProof(
        crypto.createHash("sha256")
          .update(wallet + amount)
          .digest()
      )
  };
}
