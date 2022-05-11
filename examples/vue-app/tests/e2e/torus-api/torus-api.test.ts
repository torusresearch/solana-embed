import { test, expect, Page } from "@playwright/test"
import { login } from "../helpers";
import { ensureTextualElementExists } from "../utils";

test.describe("Torus specific API", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await login(browser, false);
  });

  test("User Info should be logged", async () => {
    await page.click("button >> text=Get UserInfo");
    expect(await page.locator("#console>p:has-text('test')").elementHandles()).toHaveLength(1);
  });

  test("Change provider to testnet", async () => {
    // Click the "Change provider" button
    const [page1] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button >> text=Change Provider')
    ]);
    await page1.waitForEvent("load", {timeout: 5_000});

    // Click confirm on the popup
    await page1.waitForSelector("text=/testnet/i");
    const targetNetwork = await page1.locator(":nth-match(input[disabled], 2)").inputValue(); 
    // expect(targetNetwork).toEqual("Solana Testnet");
    await Promise.all([
      page1.waitForEvent("close"), 
      page1.click("button >> text=Confirm"),
    ]);

    // Assert current network is testnet
    const isTestnet = (await page.locator('p:has-text("Solana Network")').innerText()).toLowerCase().endsWith("testnet");
    expect(isTestnet).toBe(true);
  });

  test("Wallet hover frame is visible", async () => {
    let frame = await page.locator("#torusIframe");

    await page.click("button >> text=Toggle Show");
    expect(await frame.isVisible()).toBe(true);
  });

  test("Top up popup is visible", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> Top Up")
    ]);

    ensureTextualElementExists(page1, "Buy Crypto");
    await page1.close();
  })
});