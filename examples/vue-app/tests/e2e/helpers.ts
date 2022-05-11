import { Page, Browser, BrowserContext } from "@playwright/test"
import { DOMAIN, TESTING_PRIVATE_KEY } from "./constants"

export async function login(browser: Browser, browserName: "chromium"|"webkit"|"firefox"): Promise<Page> {
  const context = await browser.newContext();
  let page = await context.newPage();

  await page.goto(DOMAIN);
  await page.selectOption('select[name="buildEnv"]', "testing");
  await page.fill("input[placeholder='Enter private keyf from web3auth to login']",   TESTING_PRIVATE_KEY);
  await page.click("button >> text=Login With Private Key");
  // await page.click("button >> text=Login");

  return page;
}