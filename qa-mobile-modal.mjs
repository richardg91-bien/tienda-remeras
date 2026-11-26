export default async function run(page, ui) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:5173/login");
  await page.waitForTimeout(2000);
  await page.waitForSelector(
    "input[type='email'], input[name='email'], input",
    { timeout: 10000 },
  );
  const snap = await ui.snapshot();
  const boxes = snap.match(/@(e\d+) textbox/g) || [];
  const email = boxes[0]?.match(/@(e\d+)/)?.[1];
  const pass = boxes[1]?.match(/@(e\d+)/)?.[1];
  const btn = snap.match(
    /@(e\d+) button[^\n]*(?:iniciar|ingresar|login|sesi)/i,
  )?.[1];
  if (!email || !pass || !btn)
    return { error: "no login form", snapshot: snap.slice(0, 500) };

  await ui.fill(email, "test@test.com");
  await ui.fill(pass, "test1234");
  await ui.click(btn);
  await page.waitForTimeout(6000);

  await page.goto("http://localhost:5173/disenar");
  await page.waitForTimeout(5000);

  const before = await page.evaluate(() =>
    document.body.innerText.slice(0, 500),
  );

  // Tocar el botón flotante "Agregar al carrito" real
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const target = btns.find((b) =>
      b.innerText.toUpperCase().includes("AGREGAR AL CARRITO"),
    );
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(1500);

  const modalInfo = await page.evaluate(() => {
    const h3 = [...document.querySelectorAll("h3")].find((h) =>
      h.textContent.includes("Elegí tu talle"),
    );
    if (!h3) return { modalExists: false };
    const card = h3.closest("[class*='fixed']");
    const r = card.getBoundingClientRect();
    return {
      modalExists: true,
      inBody: card.parentElement === document.body,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  });

  await page.screenshot({ path: "qa-mobile-modal.png" });
  return { clicked, before: before.slice(0, 300), modalInfo };
}
