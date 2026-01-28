// ston.js
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// العنوان و ABI للعقد الذكي
const contractAddress = "EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a"; 
const contractABI = [
  "function swapTokens(address fromToken, address toToken, uint256 amount) external returns (bool)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (bool)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 amount) external returns (bool)"
];

// العقد الذكي
const contract = new ethers.Contract(contractAddress, contractABI, signer);

async function swapTokens(fromToken, toToken, amount) {
  try {
    const transaction = await contract.swapTokens(
      fromToken, 
      toToken,   
      ethers.utils.parseUnits(amount.toString(), 18)
    );
    console.log("Transaction sent:", transaction);
    const receipt = await transaction.wait();
    console.log("Transaction confirmed:", receipt);
    // تحديث واجهة السوق بعد المعاملة
    updateMarketData(receipt);
  } catch (error) {
    console.error("Error during swap:", error);
  }
}

function updateMarketData(receipt) {
  const marketData = getMarketData(receipt);

  // تحديث السعر في واجهة المستخدم
  const priceDisplay = document.getElementById("lastPrice");
  priceDisplay.textContent = marketData.price;

  // إضافة المعاملة إلى سجل المعاملات
  const transactionHistory = document.getElementById("transactionHistory");
  const newTransaction = document.createElement("div");
  newTransaction.classList.add("transaction-row");
  newTransaction.textContent = `Transaction: ${receipt.transactionHash}`;
  transactionHistory.appendChild(newTransaction);
}

function getMarketData(receipt) {
  return { price: "1.2345" }; // سعر محدث بعد المعاملة (محاكاة)
}

document.getElementById("buyBtn").addEventListener("click", () => {
  const amountBX = parseFloat(document.getElementById("tradeAmount").value);
  if (amountBX > 0) {
    swapTokens("BX", "TON", amountBX);  // تنفيذ عملية شراء BX مقابل TON
  } else {
    alert("يرجى إدخال مبلغ صالح للتبديل");
  }
});

document.getElementById("sellBtn").addEventListener("click", () => {
  const amountBX = parseFloat(document.getElementById("tradeAmount").value);
  if (amountBX > 0) {
    swapTokens("BX", "USDT", amountBX);  // تنفيذ عملية بيع BX مقابل USDT
  } else {
    alert("يرجى إدخال مبلغ صالح للتبديل");
  }
});
