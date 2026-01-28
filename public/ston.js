// تهيئة ethers.js للتفاعل مع العقد الذكي في ston.fi
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// عنوان العقد الذكي لـ BX و TON أو BX و USDT
const contractAddress = "EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a"; // استبدل بعنوان العقد الفعلي
const contractABI = [
  "function swapTokens(address fromToken, address toToken, uint256 amount) external returns (bool)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (bool)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 amount) external returns (bool)"
];

// العقد الذكي
const contract = new ethers.Contract(contractAddress, contractABI, signer);

// دالة لتنفيذ التبديل بين BX و TON أو BX و USDT
async function swapTokens(fromToken, toToken, amount) {
  try {
    const transaction = await contract.swapTokens(
      fromToken, // العملة المصدر (مثل BX)
      toToken,   // العملة الهدف (مثل TON أو USDT)
      ethers.utils.parseUnits(amount.toString(), 18) // تحويل المبلغ إلى وحدة مناسبة
    );
    console.log("Transaction sent:", transaction);
    const receipt = await transaction.wait();
    console.log("Transaction confirmed:", receipt);
    
    // بعد إتمام المعاملة، تحديث بيانات السوق
    updateMarketData(receipt);
  } catch (error) {
    console.error("Error during swap:", error);
  }
}

// دالة لتحديث بيانات السوق بعد المعاملة
function updateMarketData(receipt) {
  const marketData = getMarketData(receipt);

  // تحديث السعر في واجهة المستخدم
  const priceDisplay = document.getElementById("lastPrice");
  priceDisplay.textContent = marketData.price;  // سعر محدث بعد المعاملة

  // إضافة المعاملة إلى سجل المعاملات
  const transactionHistory = document.getElementById("transactionHistory");
  const newTransaction = document.createElement("div");
  newTransaction.classList.add("transaction-row");
  newTransaction.textContent = `Transaction: ${receipt.transactionHash}`;
  transactionHistory.appendChild(newTransaction);
}

// محاكاة للحصول على بيانات السوق المحدثة
function getMarketData(receipt) {
  return {
    price: "1.2345"  // سعر محدث بعد المعاملة (محاكاة)
  };
}

// ربط الأزرار في HTML مع الوظائف في JavaScript

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

// تحديث واجهة المستخدم للعرض التفاعلي
function renderUpdatedUI() {
  const amountBX = document.getElementById("tradeAmount").value;
  document.getElementById("actionBtn").innerText = `Buy ${amountBX} BX`; // تحديث نص الزر
}

// مثال على تحديث واجهة السوق عند التبديل
function updateUIForMarket() {
  const currentPair = document.getElementById("pairDisplay");
  const newPair = currentPair.textContent === "BX / USDT" ? "BX / TON" : "BX / USDT";
  currentPair.textContent = newPair;
}

// تخصيص بيانات حية للمخطط في Market Section
function initMarketChart() {
  const ctx = document.getElementById("priceChart").getContext("2d");
  const priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["January", "February", "March", "April", "May", "June"],
      datasets: [{
        label: "BX/USDT Price",
        data: [0.9, 1.1, 1.2, 1.3, 1.5, 1.6],  // بيانات الأسعار الفعلية
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      }
    }
  });
}

// ربط البيانات الخاصة بالـ Pair (BX/USDT، BX/TON)
document.getElementById("pairScroll").addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    const pair = e.target.dataset.pair;
    document.getElementById("pairDisplay").textContent = pair;
    updateUIForMarket();
  }
});
