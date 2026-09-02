export default async function run(page, ui) {
  const failures = [];
  page.on("requestfailed", (r) => failures.push({ url: r.url(), err: r.failure()?.errorText }));
  page.on("response", (r) => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });

  await ui.fill("@e2", "test@test.com");
  await ui.fill("@e3", "test1234");
  await ui.click("@e5");
  await page.waitForTimeout(5000);

  const body = await page.evaluate(() => document.body.innerText.slice(0, 500));
  return { url: page.url(), failures, body };
}
