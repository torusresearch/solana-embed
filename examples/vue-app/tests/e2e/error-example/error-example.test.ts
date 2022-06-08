import { test, expect, Page } from "@playwright/test"
import { login } from "../helpers";
import { wait } from "../utils";

test.describe("Error Tests", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await login(browser);
  });

  test("Transfer exceed balance returns error", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Transfer error")
    ]);

    await page1.waitForSelector("text=Payment Confirmation");
    await page1.click("button >> text=Confirm")
    await wait(1500);

    const consoleData = await page.locator("#console > p").innerText();
    expect(consoleData.length).toBeGreaterThan(0);
    expect(JSON.parse(consoleData)).toHaveProperty("data.originalError");
  });

  test("Custom program transfer exceed balance returns error", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Custom program error (Testnet)")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    const consoleData = await page.locator("#console > p").innerText();
    expect(consoleData.length).toBeGreaterThan(0);
    expect(consoleData.includes("Error: insufficient funds")).toBe(true);
  });

});
