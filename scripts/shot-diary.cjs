const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "C:/Users/Juelyn/Desktop/心理/心理/.shots";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1000"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text());
  });

  const clickByText = (txt) =>
    page.evaluate((t) => {
      const els = [...document.querySelectorAll("button, a, input")];
      const el = els.find((e) => e.textContent.trim().includes(t) || (e.placeholder || "").includes(t));
      if (el) { el.click(); return true; }
      return false;
    }, txt);

  // 1) 首次进入 -> 设密码界面
  await page.goto(BASE + "/record", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: OUT + "/diary_setup.png" });

  // 输入密码两次并设定
  const inputs = await page.$$('input[type="password"]');
  await inputs[0].type("1234");
  await inputs[1].type("1234");
  await clickByText("设定并开启");
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: OUT + "/diary_unlocked.png" });

  // 2) 写日记
  const ta = await page.$("textarea.diary-paper");
  if (ta) {
    await ta.click();
    await ta.type("今天高数模考，最后两道大题没来得及写。手心一直出汗，但考完反而松了一口气——至少我尽力了。");
  }
  await clickByText("保存这一页");
  await new Promise((r) => setTimeout(r, 600));

  // 3) 标记心情（点第一个色板按钮）
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((b) => b.querySelector("span") && b.textContent.includes("焦虑"));
    if (btns[0]) btns[0].click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: OUT + "/diary_written.png" });

  // 4) 翻到前一天
  await clickByText("前一天");
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: OUT + "/diary_prevday.png" });

  // 5) 打开心情色板
  await clickByText("心情色板");
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: OUT + "/diary_palette.png" });

  // 6) 关闭色板，上锁，再重载看锁屏
  await clickByText("完成");
  await new Promise((r) => setTimeout(r, 300));
  await clickByText("上锁");
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: OUT + "/diary_locked.png" });

  // 7) 看 localStorage 是否写入
  const store = await page.evaluate(() => ({
    pwd: !!localStorage.getItem("axk_diary_pwd"),
    entries: localStorage.getItem("axk_diary_entries"),
    moods: localStorage.getItem("axk_diary_moods"),
    colors: !!localStorage.getItem("axk_diary_colors"),
  }));
  console.log("STORAGE:", JSON.stringify(store));
  console.log("ERRORS:", errors.length ? errors.join(" | ") : "none");

  await browser.close();
})().catch((e) => {
  console.error("SCRIPT FAIL:", e);
  process.exit(1);
});
