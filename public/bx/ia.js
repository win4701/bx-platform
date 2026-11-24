/* BLOXIO IA workspace interactions.
 * No external provider is called. Connect an authorized backend before enabling live answers.
 */
"use strict";
(() => {
  /* BLOXIO SVG icon adapter — gracefully falls back when the shared library is unavailable. */
  const BLOXIO_ICON = (() => {
    const resolve = (kind, code, fallback = "") => {
      const api = window.BLOXIO_ICONS;
      try {
        const fn = api && api[kind];
        return typeof fn === "function" ? (fn.call(api, code) || fallback) : fallback;
      } catch (_) { return fallback; }
    };
    const apply = (button, name, label) => {
      if (!button || button.querySelector(".bloxio-js-icon")) return;
      const src = resolve("action", name);
      if (!src) return;
      const img = document.createElement("img");
      img.className = "bloxio-js-icon";
      img.src = src;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.width = 18;
      img.height = 18;
      img.style.cssText = "width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-inline-end:8px";
      button.prepend(img);
      if (label) button.setAttribute("aria-label", label);
    };
    return Object.freeze({ resolve, apply });
  })();

  const init = () => {
    if (document.body?.dataset.page !== "ia") return;
    const form = document.getElementById("iaPromptForm");
    if (!form || form.dataset.iaReady === "1") return;
    form.dataset.iaReady = "1";

    const prompt = document.getElementById("iaPrompt");
    const send = document.getElementById("iaSendBtn");
    const count = document.getElementById("iaCharCount");
    const conversation = document.getElementById("iaConversation");
    const modeLabel = document.getElementById("iaModeLabel");
    BLOXIO_ICON.apply(send, "send", "Send prompt");
    BLOXIO_ICON.apply(document.getElementById("iaClearBtn"), "trash", "Clear workspace");
    const modeNames = {
      general: "General assistance",
      markets: "Market intelligence",
      portfolio: "Portfolio context",
      bloxio: "BLOXIO platform guidance"
    };
    let activeMode = "general";

    const updateComposer = () => {
      const length = prompt.value.length;
      count.textContent = `${length} / 6000`;
      // Keep submission disabled until a backend is explicitly configured.
      send.disabled = true;
      send.setAttribute("aria-disabled", "true");
    };

    document.querySelectorAll("[data-ia-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        activeMode = button.dataset.iaMode || "general";
        document.querySelectorAll("[data-ia-mode]").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("active", selected);
          item.setAttribute("aria-selected", String(selected));
        });
        modeLabel.textContent = modeNames[activeMode] || modeNames.general;
        prompt.focus();
      });
    });

    document.querySelectorAll("[data-ia-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        prompt.value = button.dataset.iaPrompt || "";
        updateComposer();
        prompt.focus();
        document.getElementById("iaWorkspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    prompt.addEventListener("input", updateComposer);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      // Intentionally do not transmit user content or fabricate a response.
      const value = prompt.value.trim();
      if (!value) return;
      const draft = document.createElement("div");
      draft.className = "ia-user-draft";
      const text = document.createElement("span");
      text.textContent = value;
      draft.appendChild(text);
      conversation.appendChild(draft);

      const notice = document.createElement("div");
      notice.className = "ia-connection-notice";
      notice.setAttribute("role", "status");
      const icon = document.createElement("span");
      icon.textContent = "i";
      const content = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = "Request saved in this view only";
      const detail = document.createElement("p");
      detail.textContent = `Mode: ${modeNames[activeMode]}. No AI backend is connected, so this request was not sent and no answer was generated.`;
      content.append(heading, detail);
      notice.append(icon, content);
      conversation.appendChild(notice);
      prompt.value = "";
      updateComposer();
      conversation.scrollTop = conversation.scrollHeight;
    });

    document.getElementById("iaClearBtn")?.addEventListener("click", () => {
      prompt.value = "";
      conversation.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "ia-welcome-message";
      const avatar = document.createElement("div");
      avatar.className = "ia-message-avatar";
      avatar.textContent = "✦";
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = "Workspace cleared";
      const description = document.createElement("p");
      description.textContent = "Start a new request. Live responses remain unavailable until an authorized AI backend is connected.";
      content.append(title, description);
      empty.append(avatar, content);
      conversation.appendChild(empty);
      updateComposer();
    });

    updateComposer();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
