/* ==========================================================
   BLOXIO SWAP ENGINE
   BX <-> XBC
   Fee: 0.30%
   Slippage: 0.50%
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    /* ------------------------------------------------------
       1. CONFIGURATION
    ------------------------------------------------------ */

    const CONFIG = {
        fee: 0.003,       // 0.30%
        slippage: 0.005,  // 0.50%

        prices: {
            BX: 45,
            XBC: 0.15
        },

        symbols: ["BX", "XBC"]
    };

    /* ------------------------------------------------------
       2. DOM ELEMENTS
    ------------------------------------------------------ */

    const elements = {
        amount: document.getElementById("swapAmount"),
        receive: document.getElementById("swapReceive"),

        fromCurrency: document.getElementById("fromCurrency"),
        toCurrency: document.getElementById("toCurrency"),

        fromUsdValue: document.getElementById("fromUsdValue"),
        toUsdValue: document.getElementById("toUsdValue"),

        rate: document.getElementById("swapRate"),
        deduction: document.getElementById("swapDeduction"),
        minimum: document.getElementById("swapMinimum"),

        execute: document.getElementById("executeSwap"),
        message: document.getElementById("swapMessage"),
        toast: document.getElementById("swapToast")
    };

    /* ------------------------------------------------------
       3. FORMATTERS
    ------------------------------------------------------ */

    const formatNumber = (value, maximumDigits = 8) => {
        if (!Number.isFinite(value)) return "0";

        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: maximumDigits
        }).format(value);
    };

    const formatUSD = value => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number.isFinite(value) ? value : 0);
    };

    /* ------------------------------------------------------
       4. GET SELECTED TOKENS
    ------------------------------------------------------ */

    function getSelectedTokens() {

        const from = document.querySelector(
            'input[name="swapFrom"]:checked'
        );

        const to = document.querySelector(
            'input[name="swapTo"]:checked'
        );

        return {
            from: from ? from.value : null,
            to: to ? to.value : null
        };
    }

    /* ------------------------------------------------------
       5. MESSAGE HANDLER
    ------------------------------------------------------ */

    function showMessage(message, type = "error") {

        if (!elements.message) return;

        elements.message.textContent = message;
        elements.message.className = "swap-message";

        if (type === "success") {
            elements.message.classList.add("success");
        }

        elements.message.hidden = false;
    }

    function clearMessage() {

        if (!elements.message) return;

        elements.message.hidden = true;
        elements.message.textContent = "";
        elements.message.className = "swap-message";
    }

    /* ------------------------------------------------------
       6. TOAST NOTIFICATION
    ------------------------------------------------------ */

    let toastTimer;

    function showToast(message) {

        if (!elements.toast) return;

        elements.toast.textContent = message;
        elements.toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            elements.toast.classList.remove("show");
        }, 3000);
    }

    /* ------------------------------------------------------
       7. UPDATE TOKEN LABELS
    ------------------------------------------------------ */

    function updateTokenLabels() {

        const { from, to } = getSelectedTokens();

        if (!from || !to) return;

        elements.fromCurrency.textContent = from;
        elements.toCurrency.textContent = to;
    }

    /* ------------------------------------------------------
       8. CALCULATE SWAP
    ------------------------------------------------------ */

    function calculateSwap() {

        const { from, to } = getSelectedTokens();

        const amount = Number(elements.amount.value);

        // Validate selected tokens.
        if (
            !from ||
            !to ||
            !CONFIG.symbols.includes(from) ||
            !CONFIG.symbols.includes(to)
        ) {
            return {
                valid: false,
                error: "Please select valid tokens."
            };
        }

        // Prevent swapping a token into itself.
        if (from === to) {
            return {
                valid: false,
                error: "Invalid Pair: Select two different tokens."
            };
        }

        // Validate amount.
        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                valid: false,
                error: "Enter a valid amount greater than zero."
            };
        }

        const fromPrice = CONFIG.prices[from];
        const toPrice = CONFIG.prices[to];

        if (
            !Number.isFinite(fromPrice) ||
            !Number.isFinite(toPrice) ||
            fromPrice <= 0 ||
            toPrice <= 0
        ) {
            return {
                valid: false,
                error: "Token price is currently unavailable."
            };
        }

        // Convert the input amount to its USD value.
        const usdValue = amount * fromPrice;

        // Calculate the output before deductions.
        const grossReceive = usdValue / toPrice;

        // Apply the 0.30% swap fee.
        const afterFee = grossReceive * (1 - CONFIG.fee);

        // Apply the 0.50% slippage deduction.
        const netReceive = afterFee * (1 - CONFIG.slippage);

        // Effective exchange rate after deductions.
        const effectiveRate = netReceive / amount;

        // Total deduction percentage, applied sequentially.
        const totalDeduction =
            1 - ((1 - CONFIG.fee) * (1 - CONFIG.slippage));

        return {
            valid: true,

            from,
            to,
            amount,

            fromPrice,
            toPrice,

            usdValue,
            grossReceive,
            afterFee,
            netReceive,

            effectiveRate,
            totalDeduction
        };
    }

    /* ------------------------------------------------------
       9. UPDATE SWAP INTERFACE
    ------------------------------------------------------ */

    function updateSwap() {

        clearMessage();
        updateTokenLabels();

        const result = calculateSwap();

        if (!result.valid) {

            if (result.error.startsWith("Invalid Pair")) {
                showMessage(result.error);
            }

            elements.receive.value = "";
            elements.fromUsdValue.textContent = "$0.00";
            elements.toUsdValue.textContent = "$0.00";
            elements.minimum.textContent = "0.00";

            const { from, to } = getSelectedTokens();

            if (from && to && from !== to) {
                const rate = CONFIG.prices[from] / CONFIG.prices[to];

                elements.rate.textContent =
                    `1 ${from} = ${formatNumber(rate)} ${to}`;
            } else {
                elements.rate.textContent = "Invalid Pair";
            }

            elements.deduction.textContent = "0.80%";
            elements.execute.disabled = true;

            return;
        }

        // Display estimated receive amount.
        elements.receive.value = formatNumber(result.netReceive);

        // Display input value in USD.
        elements.fromUsdValue.textContent =
            formatUSD(result.usdValue);

        // Display estimated output value in USD,
        // after fee and slippage.
        elements.toUsdValue.textContent =
            formatUSD(result.netReceive * result.toPrice);

        // Display effective exchange rate.
        elements.rate.textContent =
            `1 ${result.from} = ${formatNumber(result.effectiveRate)} ${result.to}`;

        // Display total deduction.
        elements.deduction.textContent =
            `${(result.totalDeduction * 100).toFixed(4)}%`;

        // Display minimum estimated receive.
        elements.minimum.textContent =
            `${formatNumber(result.netReceive)} ${result.to}`;

        elements.execute.disabled = false;
    }

    /* ------------------------------------------------------
       10. EXECUTE SWAP
       Frontend simulation only.
       No blockchain transaction is submitted here.
    ------------------------------------------------------ */

    function executeSwap() {

        const result = calculateSwap();

        if (!result.valid) {
            showMessage(result.error);
            return;
        }

        // Prevent duplicate clicks.
        if (elements.execute.disabled) return;

        elements.execute.disabled = true;

        const originalButton = elements.execute.innerHTML;

        elements.execute.textContent = "Processing...";

        // Simulated execution delay.
        setTimeout(() => {

            const successMessage =
                `Swap preview successful: ${formatNumber(result.amount)} ` +
                `${result.from} → ${formatNumber(result.netReceive)} ${result.to}`;

            showMessage(successMessage, "success");
            showToast("Swap preview completed successfully.");

            // Reset amount and calculated fields.
            elements.amount.value = "";

            elements.receive.value = "";
            elements.fromUsdValue.textContent = "$0.00";
            elements.toUsdValue.textContent = "$0.00";
            elements.minimum.textContent = "0.00";

            elements.execute.innerHTML = originalButton;
            elements.execute.disabled = true;

            // Keep the selected token pair unchanged.
            updateTokenLabels();

            const { from, to } = getSelectedTokens();

            if (from && to && from !== to) {
                const rate = CONFIG.prices[from] / CONFIG.prices[to];

                elements.rate.textContent =
                    `1 ${from} = ${formatNumber(rate)} ${to}`;
            }

        }, 700);
    }

    /* ------------------------------------------------------
       11. EVENT LISTENERS
    ------------------------------------------------------ */

    // Recalculate when the amount changes.
    elements.amount.addEventListener("input", updateSwap);

    elements.amount.addEventListener("change", updateSwap);

    // Recalculate when the sending token changes.
    document.querySelectorAll(
        'input[name="swapFrom"]'
    ).forEach(input => {
        input.addEventListener("change", updateSwap);
    });

    // Recalculate when the receiving token changes.
    document.querySelectorAll(
        'input[name="swapTo"]'
    ).forEach(input => {
        input.addEventListener("change", updateSwap);
    });

    // Execute the swap preview.
    elements.execute.addEventListener("click", executeSwap);

    /* ------------------------------------------------------
       12. INITIALIZE ENGINE
    ------------------------------------------------------ */

    updateSwap();

});
