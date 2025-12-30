// src/swap.js

// استبدل القيم بعناوينك الحقيقية
const TON_ADDRESS = "TON";
const BX_JETTON_ADDRESS = "EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a";

export function tonToBX() {
  return (
    "https://ston.fi/swap" +
    `?ft=${TON_ADDRESS}` +
    `&tt=${BX_JETTON_ADDRESS}`
  );
}

export function bxToTON() {
  return (
    "https://ston.fi/swap" +
    `?ft=${BX_JETTON_ADDRESS}` +
    `&tt=${TON_ADDRESS}`
  );
}
