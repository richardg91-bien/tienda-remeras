export default async function run(page, ui) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:5173/disenar");
  await page.waitForTimeout(5000);

  // Abrir modal
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    btns
      .find((b) => b.innerText.toUpperCase().includes("AGREGAR AL CARRITO"))
      ?.click();
  });
  await page.waitForTimeout(1500);

  // Elegir talle M y confirmar
  const clickedSize = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const m = btns.find(
      (b) => b.innerText.trim() === "M" && b.closest("[class*='fixed']"),
    );
    if (m) {
      m.click();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(500);

  const confirmLabel = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const c = btns.find((b) =>
      b.innerText.toUpperCase().includes("AGREGAR TALLE"),
    );
    return c ? c.innerText : null;
  });
  if (confirmLabel) {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button")];
      btns
        .find((b) => b.innerText.toUpperCase().includes("AGREGAR TALLE"))
        ?.click();
    });
  }
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => ({
    modalStillOpen: [...document.querySelectorAll("h3")].some((h) =>
      h.textContent.includes("Elegí tu talle"),
    ),
    bodyText: document.body.innerText.slice(0, 200),
    cartBadge:
      document.querySelector("[aria-label*='Carrito']")?.innerText || null,
  }));

  await page.screenshot({ path: "qa-mobile-cart.png" });
  return { clickedSize, confirmLabel, after };
}
