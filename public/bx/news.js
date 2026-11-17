/* BLOXIO NEWS FRONTEND
   Displays only articles returned by the configured editorial API.
   No synthetic headlines or external feed scraping.
*/
(function () {
  "use strict";
  if (window.BLOXIO_NEWS) return;

  const CONFIG = { endpoint: "/news/articles", refreshMs: 60000, pageSize: 20 };
  const $ = (id) => document.getElementById(id);
  const state = { articles: [], loading: false, error: null, timer: null };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function unwrap(response) {
    return response?.data !== undefined ? response.data : response;
  }

  function setStatus(message, kind) {
    const status = $("newsStatus");
    if (status) {
      status.textContent = message;
      status.dataset.state = kind || "info";
    }
  }

  function render() {
    const list = $("newsArticles");
    const empty = $("newsEmptyState");
    if (!list) return;
    list.innerHTML = state.articles.map((article) => {
      const title = escapeHTML(article.title || "Untitled article");
      const summary = escapeHTML(article.summary || article.excerpt || "");
      const category = escapeHTML(article.category || "Update");
      const dateValue = article.publishedAt || article.createdAt;
      const date = dateValue && !Number.isNaN(Date.parse(dateValue))
        ? new Date(dateValue).toLocaleString() : "";
      const url = typeof article.url === "string" && /^https?:\/\//i.test(article.url)
        ? article.url : "";
      return `<article class="card news-article">
        <div class="news-article-meta"><span>${category}</span><time>${escapeHTML(date)}</time></div>
        <h2>${title}</h2><p>${summary}</p>
        ${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Read source</a>` : ""}
      </article>`;
    }).join("");
    if (empty) empty.hidden = state.articles.length > 0;
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    try {
      if (!window.API?.get) throw new Error("BLOXIO API service is not loaded.");
      const query = new URLSearchParams({ limit: String(CONFIG.pageSize) });
      const response = unwrap(await window.API.get(`${CONFIG.endpoint}?${query}`, { auth: false, cache: false }));
      const articles = Array.isArray(response) ? response : (response?.articles || response?.items || []);
      if (!Array.isArray(articles)) throw new Error("Unexpected news response format.");
      state.articles = articles;
      render();
      setStatus(articles.length ? `${articles.length} verified item(s) loaded.` : "The editorial feed returned no published articles.", "success");
    } catch (error) {
      state.error = error;
      setStatus(`News feed unavailable: ${error.message}`, "error");
      render();
    } finally {
      state.loading = false;
    }
  }

  function init() {
    $("newsRefreshBtn")?.addEventListener("click", load);
    load();
    state.timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, CONFIG.refreshMs);
  }

  window.BLOXIO_NEWS = { init, load, get state() { return state; }, config: CONFIG };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
