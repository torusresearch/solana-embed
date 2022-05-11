import { FullConfig, Page, chromium } from "@playwright/test"
import { DOMAIN, TESTING_PRIVATE_KEY } from "./constants"
import * as path from "path"

async function loginWithPrivateKey(page: Page) {
  await page.fill("input[placeholder='Enter private keyf from web3auth to login']", TESTING_PRIVATE_KEY);
  await page.click("button >> text=Login With Private Key");
  await page.waitForSelector("button >> text=Logout");
}

async function saveBrowserLoginState(page: Page) {
  const storageStatePath = path.resolve(__dirname, "_artifacts", `state-testing.json`);
  let state = await page.context().storageState({
    path: storageStatePath
  });
}

export default async function setup(config: FullConfig) {
  const browser = await chromium.launch({headless: false});
  const context = await browser.newContext();
  let page = await context.newPage();

  await page.goto(DOMAIN);
  await page.selectOption('select[name="buildEnv"]', "testing");
  await loginWithPrivateKey(page);
  await saveBrowserLoginState(page);
  await page.close();
}
