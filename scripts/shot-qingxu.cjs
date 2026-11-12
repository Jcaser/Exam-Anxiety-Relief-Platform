/* 清绪之屿全流程验证：登录 → 伙伴设定 → 对话 → 日记 → 明信片 */
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const SHOTS = "C:/Users/Juelyn/Desktop/心理/心理/.shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("favicon")) errors.push("CONSOLE: " + m.text());
  });

  /* 1) 登录门 */
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);
  await page.screenshot({ path: SHOTS + "/gate_login.png" });
  const nick = await page.$("input[placeholder='你的昵称']");
  console.log("登录门出现:", !!nick);
  if (nick) {
    await nick.type("黄豆", { delay: 30 });
    await page.click("button[class*='from-[#ffcfa2]']");
    await sleep(1200);
  }
  const authed = await page.evaluate(() => !!sessionStorage.getItem("axk_session"));
  console.log("登录成功(session):", authed);

  /* 2) 对话页：伙伴设定 */
  await page.goto(BASE + "/chat", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);
  await page.screenshot({ path: SHOTS + "/companion_setup.png" });
  const nameInput = await page.$("input[placeholder*='小屿']");
  if (nameInput) {
    await nameInput.type("小屿", { delay: 30 });
    // 选「元气鼓励型」
    const btns = await page.$$("button");
    for (const b of btns) {
      const t = await b.evaluate((el) => el.textContent);
      if (t && t.includes("元气鼓励型")) { await b.click(); break; }
    }
    await sleep(300);
    for (const b of btns) {
      const t = await b.evaluate((el) => el.textContent);
      if (t && t.includes("就这样，开始聊吧")) { await b.click(); break; }
    }
    await sleep(1200);
  }
  await page.screenshot({ path: SHOTS + "/companion_greet.png" });
  const comp = await page.evaluate(() => localStorage.getItem("axk_companion"));
  console.log("伙伴已保存:", comp);

  /* 3) 发一条消息，等回复 */
  const msgInput = await page.$("input[placeholder*='念头']");
  if (msgInput) {
    await msgInput.type("我一想到下周的考试就睡不着", { delay: 20 });
    await msgInput.press("Enter");
    await sleep(9000);
  }
  await page.screenshot({ path: SHOTS + "/companion_reply.png" });
  const hasMic = await page.evaluate(() => !!document.querySelector("button[title*='语音输入']"));
  const hasCall = await page.evaluate(() => !!document.querySelector("button[title*='语音电话']"));
  console.log("语音输入按钮:", hasMic, "| 语音通话按钮:", hasCall);

  /* 4) 打开语音通话界面 */
  if (hasCall) {
    await page.click("button[title*='语音电话']");
    await sleep(1500);
    await page.screenshot({ path: SHOTS + "/call_overlay.png" });
    const hang = await page.$("button");
    const hangBtns = await page.$$("button");
    for (const b of hangBtns) {
      const t = await b.evaluate((el) => el.textContent);
      if (t && t.includes("挂断")) { await b.click(); break; }
    }
    await sleep(600);
  }

  /* 5) 日记：解锁/设密 → 写日记 → 保存 → 明信片 */
  await page.goto(BASE + "/record", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);
  // 可能是设密（新会话空存储）或解锁
  const setPwd = await page.$("input[placeholder*='设置密码']");
  const unlockPwd = await page.$("input[placeholder='输入密码']");
  if (setPwd) {
    await setPwd.type("1234");
    await page.keyboard.press("Tab");
    await page.keyboard.type("1234");
    await sleep(200);
    const setupBtn = await page.$("button[class*='btn-primary']");
    if (setupBtn) await setupBtn.click();
  } else if (unlockPwd) {
    await unlockPwd.type("1234");
    await unlockPwd.press("Enter");
  }
  await sleep(1500);
  await page.screenshot({ path: SHOTS + "/diary_ready.png" });

  const paper = await page.$("textarea");
  if (paper) {
    await paper.type("今天复习到很晚，一想到下周的考试就慌，怕自己考砸，对不起家人的期待。不过写出来之后，好像没那么紧绷了。", { delay: 8 });
    await sleep(300);
    // 点保存
    const btns2 = await page.$$("button");
    for (const b of btns2) {
      const t = await b.evaluate((el) => el.textContent);
      if (t && t.includes("保存这一页")) { await b.click(); break; }
    }
    await sleep(5000); // 等明信片（含检索）
    await page.screenshot({ path: SHOTS + "/diary_postcard.png" });
  }
  const card = await page.evaluate(() => JSON.parse(localStorage.getItem("axk_diary_cards") || "{}"));
  const firstKey = Object.keys(card)[0];
  console.log("明信片已生成:", !!firstKey, firstKey ? card[firstKey].text.slice(0, 80) + "…" : "");
  console.log("明信片引用:", firstKey ? card[firstKey].book || "(无)" : "");

  console.log("\n=== 页面错误 ===");
  console.log(errors.length ? errors.join("\n") : "(无)");
  await browser.close();
})();
