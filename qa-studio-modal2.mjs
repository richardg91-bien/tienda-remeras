export default async function run(page, ui) {
  await page.goto("http://localhost:5173/login");
  await page.waitForTimeout(2000);
  const snap = await ui.snapshot();
  const boxes = snap.match(/@(e\d+) textbox/g) || [];
  const email = boxes[0]?.match(/@(e\d+)/)?.[1];
  const pass = boxes[1]?.match(/@(e\d+)/)?.[1];
  const btn = snap.match(
    /@(e\d+) button[^\n]*(?:iniciar|ingresar|login|sesi)/i,
  )?.[1];
  if (!email || !pass || !btn)
    return { error: "no login form", snapshot: snap.slice(0, 800) };

  await ui.fill(email, "test@test.com");
  await ui.fill(pass, "test1234");
  await ui.click(btn);
  await page.waitForTimeout(4000);

  await page.goto("http://localhost:5173/disenar");
  await page.waitForTimeout(5000);

  const step1 = await page.evaluate(() =>
    document.body.innerText.slice(0, 400),
  );

  // Disparar el modal de talle
  await page.evaluate(() =>
    document.dispatchEvent(new CustomEvent("studio:addToCart")),
  );
  await page.waitForTimeout(1500);

  const modalInfo = await page.evaluate(() => {
    const modal = [...document.querySelectorAll("h3")].find((h) =>
      h.textContent.includes("Elegí tu talle"),
    );
    if (!modal) return { modalExists: false };
    const card = modal.closest("[class*='fixed']");
    return {
      modalExists: true,
      inBody: !!card && card.parentElement === document.body,
      text: card?.innerText.slice(0, 250),
      rect: card
        ? JSON.parse(JSON.stringify(card.getBoundingClientRect()))
        : null,
    };
  });

  await page.screenshot({ path: "qa-studio-modal.png" });
  return { step1, modalInfo };
}
