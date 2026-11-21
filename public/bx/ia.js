/* BLOXIO IA PAGE GUARD
 * Keeps the IA workspace honest until an authorized backend is configured.
 * This file does not fabricate assistant responses or send prompts to unknown endpoints.
 */
"use strict";

(() => {
  function initIA() {
    if (document.body?.dataset.page !== "ia") return;
    const form = document.getElementById("iaPromptForm");
    if (!form || form.dataset.iaGuardReady === "1") return;
    form.dataset.iaGuardReady = "1";

    const submit = form.querySelector('button[type="submit"]');
    const prompt = document.getElementById("iaPrompt");
    const conversation = document.getElementById("iaConversation");
    if (submit) {
      submit.disabled = true;
      submit.setAttribute("aria-disabled", "true");
      submit.textContent = "AI service not connected";
    }
    if (prompt) prompt.setAttribute("aria-describedby", "iaServiceStatus");

    let status = document.getElementById("iaServiceStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "iaServiceStatus";
      status.className = "text-metadata";
      status.setAttribute("role", "status");
      status.textContent = "Connect an authorized IA backend to enable responses. Your message is not sent.";
      form.insertAdjacentElement("afterend", status);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (conversation) {
        const notice = document.createElement("p");
        notice.className = "ia-empty-state";
        notice.textContent = "IA is currently unavailable because no authorized service is connected. Your message was not sent.";
        conversation.appendChild(notice);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIA, { once: true });
  } else {
    initIA();
  }
})();
