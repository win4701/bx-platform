/* ==========================================================================
   BLOXIO MOMENTS — Social Experience
   Page module for /pages/mint.html
   - Photo + text publishing (maximum 10 images; video is rejected)
   - Feed tabs, post editing/deletion, likes, comments/replies, coins, sharing
   - Follow controls, creator/pioneer dashboard, notifications and challenges
   - All user content is inserted as text (no unsafe HTML interpolation)
   - API routes are centralized below and can be aligned with the backend contract
   ========================================================================== */
(() => {
  "use strict";

  if (window.BLOXIO_MOMENTS) return;

  const CONFIG = {
    maxPhotos: 10,
    maxTextLength: 2000,
    maxCommentLength: 1000,
    maxCoinsPerAction: 100000,
    endpoints: {
      feed: "/moments/feed",
      posts: "/moments/posts",
      post: id => `/moments/posts/${encodeURIComponent(id)}`,
      like: id => `/moments/posts/${encodeURIComponent(id)}/like`,
      comments: id => `/moments/posts/${encodeURIComponent(id)}/comments`,
      comment: id => `/moments/comments/${encodeURIComponent(id)}`,
      commentLike: id => `/moments/comments/${encodeURIComponent(id)}/like`,
      coins: id => `/moments/posts/${encodeURIComponent(id)}/coins`,
      follow: id => `/moments/users/${encodeURIComponent(id)}/follow`,
      profile: "/moments/me",
      creators: "/moments/creators",
      challenges: "/moments/challenges",
      notifications: "/moments/notifications",
      rewards: "/moments/rewards"
    },
    feedKeys: ["for-you", "following", "creators", "trending", "latest"]
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    initialized: false,
    busy: new Set(),
    feed: "for-you",
    posts: [],
    selectedFiles: [],
    objectUrls: new Set(),
    editingPostId: null,
    commentsOpen: new Set(),
    comments: new Map(),
    notificationCount: 0,
    profile: null,
    challenges: [],
    rewards: null,
    lastError: null
  };

  const ids = {
    form: "mintPostForm",
    text: "mintPostText",
    textCount: "mintTextCount",
    fileInput: "mintPhotoInput",
    preview: "mintImagePreview",
    uploadCount: "mintUploadCount",
    composerStatus: "mintComposerStatus",
    publish: "mintPublishButton",
    feed: "mintPostList",
    feedState: "mintFeedState",
    search: "mintSearch"
  };

  const el = id => document.getElementById(id);
  const setText = (id, value) => { const node = el(id); if (node) node.textContent = value ?? ""; };
  const notify = (message, type = "info") => {
    const target = el("mintComposerStatus");
    if (target) {
      target.textContent = message;
      target.dataset.state = type;
    }
    if (type === "error") console.warn("[BLOXIO MOMENTS]", message);
  };
  const escapeText = value => String(value ?? "");
  const safeDate = value => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  };
  const getId = item => item?.id ?? item?._id ?? item?.postId ?? "";
  const getUserId = item => item?.userId ?? item?.authorId ?? item?.user?.id ?? "";
  const getCurrentUserId = () => state.profile?.id ?? state.profile?._id ?? window.BLOXIO_USER?.id ?? "";
  const getApi = () => window.API || null;

  function normalizePayload(result) {
    if (result?.error) throw new Error(result.message || String(result.error));
    const payload = result?.data ?? result?.result ?? result;
    if (payload?.success === false) throw new Error(payload.message || "Request failed");
    return payload;
  }

  async function request(method, path, body, options = {}) {
    const api = getApi();
    if (!api || typeof api[method] !== "function") {
      throw new Error(`API.${method} is unavailable; connect the Moments API service.`);
    }
    const config = { auth: options.auth !== false, cache: false };
    let result;
    if (method === "get" || method === "delete") {
      result = await api[method](path, config);
    } else {
      result = await api[method](path, body, config);
    }
    return normalizePayload(result);
  }

  async function tryRequest(method, path, body, fallback = null) {
    try { return await request(method, path, body); }
    catch (error) {
      state.lastError = error;
      if (fallback !== null) return fallback;
      throw error;
    }
  }

  function arrayFrom(payload, keys = ["items", "posts", "comments", "data"]) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  }

  function setBusy(key, busy) {
    if (busy) state.busy.add(key); else state.busy.delete(key);
    const node = document.querySelector(`[data-mint-busy="${CSS.escape(key)}"]`);
    if (node) node.disabled = busy;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function makeButton(label, action, postId, className = "mint-action-button") {
    const button = make("button", className, label);
    button.type = "button";
    button.dataset.mintAction = action;
    button.dataset.postId = String(postId ?? "");
    return button;
  }

  function getPhotoUrl(photo) {
    if (typeof photo === "string") return photo;
    return photo?.url || photo?.src || photo?.secureUrl || "";
  }

  function validRemoteImage(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch { return false; }
  }

  function extractTags(text) {
    return [...new Set((String(text).match(/#[\p{L}\p{N}_]+/gu) || []).map(x => x.slice(1).toLowerCase()))];
  }

  function extractMentions(text) {
    return [...new Set((String(text).match(/@[\p{L}\p{N}_.-]+/gu) || []).map(x => x.slice(1)))];
  }

  function validateFiles(files) {
    const accepted = [];
    const rejected = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) rejected.push(`${file.name}: only images are allowed`);
      else if (file.size > 15 * 1024 * 1024) rejected.push(`${file.name}: image exceeds 15 MB`);
      else accepted.push(file);
    }
    const remaining = CONFIG.maxPhotos - state.selectedFiles.length;
    if (accepted.length > remaining) rejected.push(`Only ${remaining} more photo(s) can be added`);
    return { accepted: accepted.slice(0, Math.max(0, remaining)), rejected };
  }

  function clearObjectUrls() {
    state.objectUrls.forEach(url => URL.revokeObjectURL(url));
    state.objectUrls.clear();
  }

  function renderPreviews() {
    const box = el(ids.preview);
    if (!box) return;
    clearObjectUrls();
    box.replaceChildren();
    state.selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      state.objectUrls.add(url);
      const item = make("div", "mint-preview-item");
      const image = make("img");
      image.src = url;
      image.alt = `Selected photo ${index + 1}`;
      image.loading = "lazy";
      const remove = makeButton("×", "remove-photo", "", "mint-preview-remove");
      remove.dataset.index = String(index);
      remove.setAttribute("aria-label", `Remove photo ${index + 1}`);
      item.append(image, remove);
      box.append(item);
    });
    setText(ids.uploadCount, `${state.selectedFiles.length} / ${CONFIG.maxPhotos} photos`);
    const input = el(ids.fileInput);
    if (input) input.disabled = state.selectedFiles.length >= CONFIG.maxPhotos;
  }

  function updateComposerCount() {
    const value = el(ids.text)?.value || "";
    setText(ids.textCount, `${value.length} / ${CONFIG.maxTextLength}`);
  }

  function resetComposer() {
    const form = el(ids.form);
    if (form) form.reset();
    state.selectedFiles = [];
    state.editingPostId = null;
    setText(ids.publish, "Publish moment");
    renderPreviews();
    updateComposerCount();
  }

  function renderFeedState(message, title = "Your community feed is getting ready") {
    const box = el(ids.feedState);
    if (!box) return;
    box.hidden = false;
    const heading = $("h3", box);
    const paragraph = $("p", box);
    if (heading) heading.textContent = title;
    if (paragraph) paragraph.textContent = message;
  }

  function hideFeedState() {
    const box = el(ids.feedState);
    if (box) box.hidden = true;
  }

  function renderPostText(container, content) {
    const paragraph = make("p", "mint-post-caption");
    // Preserve readable line breaks while keeping content as text nodes.
    String(content || "").split(/\n/).forEach((line, index) => {
      if (index) paragraph.append(document.createElement("br"));
      paragraph.append(document.createTextNode(line));
    });
    container.append(paragraph);
  }

  function renderPost(post) {
    const postId = getId(post);
    const article = make("article", "mint-post-card");
    article.dataset.postId = String(postId);
    const header = make("header", "mint-post-header");
    const identity = make("div", "mint-post-identity");
    const avatar = make("div", "mint-post-avatar", (post.author?.name || post.username || "BX").slice(0, 2).toUpperCase());
    const userBlock = make("div", "mint-post-user");
    userBlock.append(
      make("strong", "", post.author?.displayName || post.author?.name || post.username || "BLOXIO member"),
      make("small", "", `@${post.author?.username || post.username || "member"} · ${safeDate(post.createdAt || post.publishedAt)}`)
    );
    identity.append(avatar, userBlock);
    header.append(identity);

    const authorId = getUserId(post);
    const isMine = authorId && String(authorId) === String(getCurrentUserId());
    if (isMine) {
      const tools = make("div", "mint-post-tools");
      tools.append(
        makeButton("Edit", "edit-post", postId),
        makeButton("Delete", "delete-post", postId)
      );
      header.append(tools);
    } else if (authorId) {
      const follow = makeButton(post.isFollowing ? "Following" : "Follow", "follow", postId);
      follow.dataset.userId = String(authorId);
      follow.classList.toggle("is-following", !!post.isFollowing);
      header.append(follow);
    }

    article.append(header);
    if (post.text || post.caption) renderPostText(article, post.text || post.caption);

    const photos = Array.isArray(post.photos) ? post.photos : (post.images || []);
    const validPhotos = photos.map(getPhotoUrl).filter(validRemoteImage).slice(0, CONFIG.maxPhotos);
    if (validPhotos.length) {
      const gallery = make("div", `mint-post-gallery mint-gallery-${Math.min(validPhotos.length, 4)}`);
      validPhotos.forEach((url, index) => {
        const image = make("img");
        image.src = url;
        image.alt = `Photo ${index + 1} in post`;
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => image.closest(".mint-post-photo")?.remove(), { once: true });
        const frame = make("div", "mint-post-photo");
        frame.append(image);
        gallery.append(frame);
      });
      article.append(gallery);
    }

    const tags = Array.isArray(post.hashtags) ? post.hashtags : extractTags(post.text || post.caption || "");
    if (tags.length) {
      const tagRow = make("div", "mint-post-tags");
      tags.forEach(tag => tagRow.append(make("span", "mint-hashtag", `#${String(tag).replace(/^#/, "")}`)));
      article.append(tagRow);
    }

    const metrics = make("div", "mint-post-metrics");
    metrics.append(
      make("span", "", `${Number(post.likesCount ?? post.likes ?? 0)} likes`),
      make("span", "", `${Number(post.commentsCount ?? 0)} comments`),
      make("span", "", `${Number(post.coinsCount ?? 0)} coins`)
    );
    article.append(metrics);

    const actions = make("div", "mint-post-actions");
    const like = makeButton(post.isLiked ? "♥ Liked" : "♡ Like", "like", postId);
    like.classList.toggle("is-active", !!post.isLiked);
    actions.append(
      like,
      makeButton("Comment", "toggle-comments", postId),
      makeButton("Coins", "coins", postId),
      makeButton("Share", "share", postId)
    );
    article.append(actions);

    if (state.commentsOpen.has(String(postId))) article.append(renderComments(postId));
    return article;
  }

  function renderComments(postId) {
    const wrap = make("section", "mint-comments");
    wrap.setAttribute("aria-label", "Comments");
    const list = make("div", "mint-comment-list");
    const comments = state.comments.get(String(postId)) || [];
    if (!comments.length) list.append(make("p", "mint-empty-comments", "No comments loaded yet."));
    comments.forEach(comment => {
      const item = make("article", "mint-comment");
      const name = comment.author?.displayName || comment.author?.name || comment.username || "Member";
      item.append(make("strong", "", name));
      item.append(make("p", "", comment.text || comment.body || ""));
      const reply = makeButton("Reply", "reply-comment", postId, "mint-comment-reply");
      reply.dataset.commentId = String(getId(comment));
      item.append(reply);
      const replies = Array.isArray(comment.replies) ? comment.replies : [];
      replies.forEach(child => {
        const childNode = make("div", "mint-comment-reply-item");
        childNode.append(make("strong", "", child.author?.name || child.username || "Member"));
        childNode.append(make("p", "", child.text || child.body || ""));
        item.append(childNode);
      });
      list.append(item);
    });
    const form = make("form", "mint-comment-form");
    form.dataset.mintCommentForm = String(postId);
    const input = make("input");
    input.name = "comment";
    input.maxLength = CONFIG.maxCommentLength;
    input.placeholder = "Write a comment…";
    input.required = true;
    input.setAttribute("aria-label", "Write a comment");
    const submit = make("button", "", "Send");
    submit.type = "submit";
    form.append(input, submit);
    wrap.append(list, form);
    return wrap;
  }

  function renderFeed() {
    const box = el(ids.feed);
    if (!box) return;
    box.replaceChildren();
    state.posts.forEach(post => box.append(renderPost(post)));
    if (state.posts.length) hideFeedState();
    else renderFeedState("No verified community posts are available in this feed yet.", "No moments to show");
  }

  function activateFeedTab(feed) {
    if (!CONFIG.feedKeys.includes(feed)) return;
    state.feed = feed;
    $$(".mint-feed-tab").forEach(tab => {
      const active = tab.dataset.feed === feed;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    loadFeed();
  }

  async function loadFeed() {
    renderFeedState("Loading community moments…");
    const box = el(ids.feed);
    if (box) box.setAttribute("aria-busy", "true");
    try {
      const query = `?feed=${encodeURIComponent(state.feed)}`;
      const search = el(ids.search)?.value.trim();
      const searchQuery = search ? `&q=${encodeURIComponent(search)}` : "";
      const payload = await request("get", `${CONFIG.endpoints.feed}${query}${searchQuery}`);
      state.posts = arrayFrom(payload, ["posts", "items", "results"]);
      renderFeed();
      setText("mintFeedStatus", `${state.posts.length} moments`);
    } catch (error) {
      state.posts = [];
      renderFeed();
      renderFeedState("The Moments feed service is not connected or is unavailable. No sample posts are shown.", "Feed unavailable");
      state.lastError = error;
    } finally {
      if (box) box.removeAttribute("aria-busy");
    }
  }

  function buildPostBody() {
    const content = el(ids.text)?.value.trim() || "";
    if (!content && !state.selectedFiles.length) throw new Error("Add text or at least one photo.");
    if (content.length > CONFIG.maxTextLength) throw new Error("Post text is too long.");
    const body = new FormData();
    body.append("text", content);
    body.append("hashtags", JSON.stringify(extractTags(content)));
    body.append("mentions", JSON.stringify(extractMentions(content)));
    state.selectedFiles.forEach(file => body.append("photos", file, file.name));
    return body;
  }

  async function publishPost(event) {
    event?.preventDefault();
    const button = el(ids.publish);
    if (button) button.disabled = true;
    try {
      const body = buildPostBody();
      const editing = state.editingPostId;
      const api = getApi();
      const method = editing ? "put" : "post";
      if (!api || typeof api[method] !== "function") throw new Error(`API.${method} is unavailable; publishing is not connected.`);
      const path = editing ? CONFIG.endpoints.post(editing) : CONFIG.endpoints.posts;
      const result = await api[method](path, body, { auth: true, cache: false });
      normalizePayload(result);
      notify(editing ? "Moment updated." : "Moment published.", "success");
      resetComposer();
      await loadFeed();
    } catch (error) {
      notify(error.message || "Could not publish this moment.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function editPost(postId) {
    const post = state.posts.find(item => String(getId(item)) === String(postId));
    if (!post) return;
    state.editingPostId = postId;
    const text = el(ids.text);
    if (text) text.value = post.text || post.caption || "";
    // Existing remote photos are not downloaded and re-uploaded by the editor.
    state.selectedFiles = [];
    renderPreviews();
    updateComposerCount();
    setText(ids.publish, "Save changes");
    notify("Editing text. Existing photos remain attached unless the backend supports photo replacement.");
    el(ids.text)?.focus();
    el(ids.form)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function deletePost(postId) {
    if (!window.confirm("Delete this moment? This action cannot be undone.")) return;
    const key = `delete:${postId}`;
    if (state.busy.has(key)) return;
    setBusy(key, true);
    try {
      await request("delete", CONFIG.endpoints.post(postId));
      state.posts = state.posts.filter(post => String(getId(post)) !== String(postId));
      renderFeed();
      notify("Moment deleted.", "success");
    } catch (error) { notify(error.message || "Could not delete this moment.", "error"); }
    finally { setBusy(key, false); }
  }

  async function toggleLike(postId) {
    const post = state.posts.find(item => String(getId(item)) === String(postId));
    if (!post) return;
    const wasLiked = !!post.isLiked;
    post.isLiked = !wasLiked;
    post.likesCount = Math.max(0, Number(post.likesCount ?? post.likes ?? 0) + (wasLiked ? -1 : 1));
    renderFeed();
    try {
      const result = await request("post", CONFIG.endpoints.like(postId), { liked: !wasLiked });
      if (result?.post) Object.assign(post, result.post);
    } catch (error) {
      post.isLiked = wasLiked;
      post.likesCount = Math.max(0, post.likesCount + (wasLiked ? 1 : -1));
      notify(error.message || "Like action failed.", "error");
    }
    renderFeed();
  }

  async function loadComments(postId) {
    const key = String(postId);
    state.commentsOpen.add(key);
    renderFeed();
    try {
      const payload = await request("get", CONFIG.endpoints.comments(postId));
      state.comments.set(key, arrayFrom(payload, ["comments", "items", "results"]));
      renderFeed();
    } catch (error) {
      state.comments.set(key, []);
      renderFeed();
      notify(error.message || "Comments are unavailable.", "error");
    }
  }

  async function submitComment(postId, text, parentId = null) {
    const clean = String(text || "").trim();
    if (!clean) throw new Error("Write a comment first.");
    if (clean.length > CONFIG.maxCommentLength) throw new Error("Comment is too long.");
    const body = { text: clean, ...(parentId ? { parentId } : {}) };
    await request("post", CONFIG.endpoints.comments(postId), body);
    await loadComments(postId);
    notify(parentId ? "Reply added." : "Comment added.", "success");
  }

  async function sendCoins(postId) {
    const raw = window.prompt("How many Coins would you like to send?");
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount < 1 || amount > CONFIG.maxCoinsPerAction) {
      notify(`Enter a whole number between 1 and ${CONFIG.maxCoinsPerAction}.`, "error");
      return;
    }
    try {
      await request("post", CONFIG.endpoints.coins(postId), { amount });
      notify(`${amount} Coins sent.`, "success");
      await loadFeed();
    } catch (error) { notify(error.message || "Coin transfer failed.", "error"); }
  }

  async function sharePost(postId) {
    const url = new URL(`/pages/mint.html?post=${encodeURIComponent(postId)}`, window.location.origin).href;
    const post = state.posts.find(item => String(getId(item)) === String(postId));
    const shareData = { title: "BLOXIO MOMENTS", text: post?.text || "Discover this moment on BLOXIO", url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify("Moment link copied.", "success");
      } else {
        window.prompt("Copy this moment link:", url);
      }
      // Optional server-side share event; failure must not invalidate native sharing.
      try { await request("post", `${CONFIG.endpoints.post(postId)}/share`, {}); } catch { /* analytics endpoint optional */ }
    } catch (error) {
      if (error?.name !== "AbortError") notify(error.message || "Sharing is unavailable.", "error");
    }
  }

  async function toggleFollow(userId, button) {
    if (!userId) return;
    const wasFollowing = button.textContent.trim().toLowerCase() === "following";
    button.disabled = true;
    try {
      await request("post", CONFIG.endpoints.follow(userId), { follow: !wasFollowing });
      button.textContent = wasFollowing ? "Follow" : "Following";
      button.classList.toggle("is-following", !wasFollowing);
    } catch (error) { notify(error.message || "Follow action failed.", "error"); }
    finally { button.disabled = false; }
  }

  async function loadProfileAndRewards() {
    try {
      const payload = await request("get", CONFIG.endpoints.profile);
      state.profile = payload?.profile ?? payload?.user ?? payload;
      const p = state.profile || {};
      setText("mintMyPoints", p.points ?? p.activityPoints ?? "—");
      setText("mintActivityPoints", p.activityPoints ?? p.points ?? "—");
      setText("mintPioneerStatus", p.pioneerBadge ? "Pioneer" : (p.pioneerStatus || "Not ranked"));
      setText("mintPioneerRank", p.pioneerRank ? `Rank #${p.pioneerRank}` : "Ranking based on verified activity");
      setText("mintPioneerPosition", p.pioneerRank ? `#${p.pioneerRank}` : "Not ranked");
      setText("mintCreatorLevel", p.creatorLevel || "New creator");
      setText("mintCreatorLevelSide", p.creatorLevel || "New creator");
    } catch {
      setText("mintMyPoints", "—");
      setText("mintActivityPoints", "—");
      setText("mintPioneerStatus", "Pending");
      setText("mintPioneerRank", "Rewards service unavailable");
    }

    try {
      state.rewards = await request("get", CONFIG.endpoints.rewards);
      const reward = state.rewards || {};
      if (reward.creatorLevel) {
        setText("mintCreatorLevel", reward.creatorLevel);
        setText("mintCreatorLevelSide", reward.creatorLevel);
      }
    } catch { /* reward dashboard remains in its explicit pending state */ }
  }

  async function loadChallenges() {
    try {
      const payload = await request("get", CONFIG.endpoints.challenges);
      state.challenges = arrayFrom(payload, ["challenges", "items"]);
      const first = state.challenges[0];
      setText("mintChallengeStatus", first?.title || (state.challenges.length ? `${state.challenges.length} available` : "No active challenge"));
      const box = $("#mintChallenges .mint-challenge-empty");
      if (box && first) {
        box.replaceChildren(
          make("strong", "", first.title || "Weekly challenge"),
          make("small", "", first.description || "Join the community challenge.")
        );
      }
    } catch { setText("mintChallengeStatus", "Unavailable"); }
  }

  async function loadCreators() {
    const target = el("mintCreatorList");
    if (!target) return;
    try {
      const payload = await request("get", CONFIG.endpoints.creators);
      const creators = arrayFrom(payload, ["creators", "items"]);
      target.replaceChildren();
      creators.forEach(creator => {
        const row = make("div", "mint-creator-row");
        row.append(make("strong", "", creator.displayName || creator.username || "Creator"));
        row.append(make("small", "", creator.level || creator.creatorLevel || "Creator"));
        if (creator.id || creator.userId) {
          const button = makeButton("Follow", "follow", "");
          button.dataset.userId = String(creator.id || creator.userId);
          row.append(button);
        }
        target.append(row);
      });
    } catch { /* creator panel can remain empty until API exists */ }
  }

  async function loadNotifications() {
    try {
      const payload = await request("get", CONFIG.endpoints.notifications);
      const notifications = arrayFrom(payload, ["notifications", "items"]);
      state.notificationCount = Number(payload?.unreadCount ?? notifications.filter(item => !item.readAt && !item.isRead).length);
      setText("mintNotificationCount", state.notificationCount);
    } catch { setText("mintNotificationCount", "—"); }
  }

  async function refreshAll() {
    await Promise.allSettled([loadFeed(), loadProfileAndRewards(), loadChallenges(), loadCreators(), loadNotifications()]);
  }

  function handleActionClick(event) {
    const button = event.target.closest("[data-mint-action]");
    if (!button) return;
    const action = button.dataset.mintAction;
    const postId = button.dataset.postId;
    if (action === "remove-photo") {
      const index = Number(button.dataset.index);
      if (Number.isInteger(index)) state.selectedFiles.splice(index, 1);
      renderPreviews();
      return;
    }
    if (action === "edit-post") return editPost(postId);
    if (action === "delete-post") return deletePost(postId);
    if (action === "like") return toggleLike(postId);
    if (action === "toggle-comments") {
      const key = String(postId);
      if (state.commentsOpen.has(key)) {
        state.commentsOpen.delete(key);
        renderFeed();
      } else loadComments(postId);
      return;
    }
    if (action === "coins") return sendCoins(postId);
    if (action === "share") return sharePost(postId);
    if (action === "follow") return toggleFollow(button.dataset.userId, button);
    if (action === "reply-comment") {
      const reply = window.prompt("Write your reply:");
      if (reply) submitComment(postId, reply, button.dataset.commentId).catch(error => notify(error.message, "error"));
    }
  }

  function handleCommentSubmit(event) {
    const form = event.target.closest("form[data-mint-comment-form]");
    if (!form) return;
    event.preventDefault();
    const input = $('input[name="comment"]', form);
    submitComment(form.dataset.mintCommentForm, input?.value).then(() => {
      if (input) input.value = "";
    }).catch(error => notify(error.message || "Could not add comment.", "error"));
  }

  function bindEvents() {
    el(ids.form)?.addEventListener("submit", publishPost);
    el(ids.text)?.addEventListener("input", updateComposerCount);
    el(ids.fileInput)?.addEventListener("change", event => {
      const files = [...(event.target.files || [])];
      const result = validateFiles(files);
      state.selectedFiles.push(...result.accepted);
      if (result.rejected.length) notify(result.rejected.join(". "), "error");
      else notify("Photo preview ready. Publish when you are ready.");
      event.target.value = "";
      renderPreviews();
    });

    $$(".mint-feed-tab").forEach(tab => tab.addEventListener("click", () => activateFeedTab(tab.dataset.feed)));
    el(ids.feed)?.addEventListener("click", handleActionClick);
    el(ids.feed)?.addEventListener("submit", handleCommentSubmit);
    el(ids.preview)?.addEventListener("click", handleActionClick);

    let searchTimer;
    el(ids.search)?.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(loadFeed, 350);
    });

    $$("[data-mint-discovery]").forEach(link => link.addEventListener("click", () => {
      const target = link.dataset.mintDiscovery;
      if (target === "trending" || target === "creators") activateFeedTab(target);
    }));

    el("mintRefreshButton")?.addEventListener("click", refreshAll);
    el("mintNotificationButton")?.addEventListener("click", loadNotifications);
  }

  function init() {
    if (state.initialized || !el("mintPostForm")) return;
    state.initialized = true;
    bindEvents();
    updateComposerCount();
    renderPreviews();
    refreshAll();
  }

  const publicApi = {
    init,
    refresh: refreshAll,
    loadFeed,
    getState: () => ({
      feed: state.feed,
      posts: [...state.posts],
      profile: state.profile ? { ...state.profile } : null,
      challenges: [...state.challenges],
      notificationCount: state.notificationCount,
      lastError: state.lastError?.message || null
    }),
    config: CONFIG
  };
  window.BLOXIO_MOMENTS = publicApi;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();