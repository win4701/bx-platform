function switchView(view){

  if (!view) return;

  // 🛑 منع إعادة نفس الصفحة
  if (APP.view === view) return;

  console.log("Switching to:", view);

  const views = document.querySelectorAll(".view");
  const buttons = document.querySelectorAll(".bottom-nav button");

  // 🔴 STEP 1: إخفاء الكل (مهم مع !important)
  views.forEach(v => {
    v.classList.remove("active");
  });

  // 🔴 STEP 2: انتظار frame (حل مشاكل CSS)
  requestAnimationFrame(() => {

    const target = document.getElementById(view);

    if (!target){
      console.error("View not found:", view);
      return;
    }
    
/*=========================== BND view =====================*/

function bindNavigation(){

  const buttons = document.querySelectorAll(".bottom-nav button");

  if (!buttons.length){
    console.warn("Navigation not found");
    return;
  }

  buttons.forEach(btn => {

    // 🛑 إزالة أي events قديمة (منع duplication)
    btn.onclick = null;

    btn.onclick = (e) => {

      e.preventDefault();
      e.stopPropagation();

      const view = btn.dataset.view;

      if (!view){
        console.warn("Missing data-view");
        return;
      }

      switchView(view);

    };

  });

}
    target.classList.add("active");

    // ✅ تحديث الحالة
    APP.view = view;
    CURRENT_VIEW = view;

    // ✅ Scroll داخل القسم
    target.scrollTop = 0;

  });

  // 🔴 STEP 3: تحديث الأزرار
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  // 🔴 STEP 4: lifecycle (مهم لنظامك)
  handleViewLifecycle(view);

  // 🔴 STEP 5: event system
  document.dispatchEvent(
    new CustomEvent("view:change", { detail: view })
  );

}
