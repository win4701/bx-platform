/**
 * AutoNav.jsx
 * ---------------------------------------
 * Dynamic Bottom Navigation (React)
 * Mirrors Vanilla Tabs UX exactly
 * ---------------------------------------
 */

import { useState } from "react";

/**
 * tabsConfig
 * يمكن لاحقًا جلبها من /state (Admin / A-B Testing)
 */
const tabsConfig = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "trade", label: "Trade", icon: "💱" },
  { key: "casino", label: "Casino", icon: "🎰" },
  { key: "withdraw", label: "Withdraw", icon: "💸" },
];

/**
 * AutoNav Component
 */
export default function AutoNav({ onChange }) {
  const [active, setActive] = useState("home");

  function select(tab) {
    setActive(tab);
    if (onChange) onChange(tab);
  }

  return (
    <nav style={styles.nav}>
      {tabsConfig.map((t) => (
        <button
          key={t.key}
          onClick={() => select(t.key)}
          style={{
            ...styles.btn,
            ...(active === t.key ? styles.active : {}),
          }}
        >
          <div style={styles.icon}>{t.icon}</div>
          <div style={styles.label}>{t.label}</div>
        </button>
      ))}
    </nav>
  );
}

/* =========================
   Styles (Inline – No CSS deps)
========================= */
const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    gap: "6px",
    padding: "8px",
    background: "#0f1530",
    zIndex: 50,
  },
  btn: {
    flex: 1,
    background: "#141b33",
    color: "#cfd6ff",
    border: 0,
    borderRadius: "12px",
    padding: "10px 6px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontWeight: 600,
    transition: "0.15s",
  },
  active: {
    background: "#5b7cff",
    color: "#fff",
  },
  icon: {
    fontSize: "18px",
    lineHeight: 1,
  },
  label: {
    fontSize: "12px",
    marginTop: "4px",
  },
};
