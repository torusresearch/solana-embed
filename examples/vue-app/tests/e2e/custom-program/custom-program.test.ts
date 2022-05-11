import { test, expect, Page } from "@playwright/test"
import { login } from "../helpers";
import { wait } from "../utils";

test.describe("Custom Program (Lookup) Tests", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await login(browser);
  });

  test("Mint token success", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=MintToken")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    const consoleData = await page.locator("#console > p").innerText();
    expect(consoleData.length).toBeGreaterThan(1);
    expect(consoleData.includes("fail")).toBe(false);
  });

  test.skip("Deposit SPL success", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Deposit SPL")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    const consoleData = await page.locator("#console > p").innerText();
    expect(consoleData.length).toBeGreaterThan(1);
    expect(consoleData.includes("fail")).toBe(false);
  });

  test.skip("Redeem SPL success", async () => {
    await wait(10_000); // Wait for more confirmations
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Redeem SPL")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    const consoleData = await page.locator("#console > p").innerText();
    expect(consoleData.length).toBeGreaterThan(1);
    expect(consoleData.includes("fail")).toBe(false);
  });

});
