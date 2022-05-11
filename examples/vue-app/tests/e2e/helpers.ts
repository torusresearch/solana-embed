import { Page, Browser } from "@playwright/test"
import { DOMAIN, TESTING_PRIVATE_KEY } from "./constants"
import { wait } from "./utils";

export async function login(browser: Browser, dontSwitchNetwork?: boolean): Promise<Page> {
  const context = await browser.newContext();
  let page = await context.newPage();

  await page.goto(DOMAIN);
  await page.selectOption('select[name="buildEnv"]', "testing");
  await page.fill("input[placeholder='Enter private keyf from web3auth to login']",   TESTING_PRIVATE_KEY);
  await page.click("button >> text=Login With Private Key");

  if (!dontSwitchNetwork) {
    const [page1] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button >> text=Change Provider')
    ]);
    await page1.waitForEvent("load", {timeout: 5_000});

    // Click confirm on the popup
    await page1.waitForSelector("text=/testnet/i");
    await Promise.all([
      page1.waitForEvent("close"), 
      page1.click("button >> text=Confirm"),
    ]);
    await wait(500);
  }
  return page;
}