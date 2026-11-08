/* 交互验证：滚动到 #empathy，截两个状态的图（默认标签 & 点击第三个标签后） */
const puppeteer = require("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1.5 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));

  await page.evaluate(() => {
    document.querySelector("#empathy").scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: "C:/Users/Juelyn/Desktop/心理/心理/.shots/empathy_state0.png" });

  await page.evaluate(() => {
    document.querySelectorAll('#empathy [role="tab"]')[2].click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: "C:/Users/Juelyn/Desktop/心理/心理/.shots/empathy_state2.png" });

  await browser.close();
  console.log("ok");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
