import Tesseract from "tesseract.js";

export async function parseReceipt(imageUrl) {
  const { data } = await Tesseract.recognize(imageUrl, "eng", {
    logger: () => {}
  });

  const text = data.text.toUpperCase();

  // محاولات استخراج مرجع ومبلغ
  const amountMatch = text.match(/(USD|USDT)\s?(\d+(\.\d+)?)/);
  const refMatch = text.match(/(TXID|REFERENCE|ORDER)[^\w]?([A-Z0-9\-]{6,})/);

  return {
    amount: amountMatch ? Number(amountMatch[2]) : null,
    reference: refMatch ? refMatch[2] : null,
    raw: text.slice(0, 500)
  };
    }
