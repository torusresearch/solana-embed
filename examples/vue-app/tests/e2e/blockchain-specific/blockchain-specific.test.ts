import { test, expect, Page } from "@playwright/test"
import { login } from "../helpers";
import { wait } from "../utils";

test.describe("Blockchain Specific API", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await login(browser);
  });

  test("Send Transaction API returns transaction hash", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Send Transaction")
    ]);

    await page1.waitForSelector("text=Payment Confirmation");
    await page1.click("button >> text=Confirm")
    await wait(1500);

    expect((await page.locator("#console > p").innerText()).length).toBeGreaterThan(0);
  });

  test("Send SPL Transaction API returns a transaction hash", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Send SPL Transaction")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    expect((await page.locator("#console > p").innerText()).length).toBeGreaterThan(0);
  });

  test("Sign Transaction API returns signed transaction data", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Sign Transaction")
    ]);

    await page1.waitForSelector("text=Payment Confirmation");
    await page1.click("button >> text=Confirm")
    await wait(2000);

    const consoleData = JSON.parse(await page.locator("#console > p").innerText());
    expect(consoleData).toHaveProperty(["instructions", "0", "data"]);
  });

  test("Sign All Transactions API returns multiple signed transaction data ", async () => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Sign All Transactions")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    const consoleData = JSON.parse(await page.locator("#console > p").innerText());
    expect(consoleData).toHaveLength(3);
  });

  test("Multiple instruction + multisig transaction returns success", async() => {
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Multiple Instruction tx")
    ]);

    await page1.waitForSelector("text=Confirm Permission");
    await page1.click("button >> text=Approve")
    await wait(1500);

    const consoleData = await page.locator("#console > p").innerText();
    expect(consoleData.length).toBeGreaterThan(1);
    expect(consoleData.includes("fail")).toBe(false);
  });

  test("Sign Message API returns signed data", async() => {
    await wait(1000);
    const [page1] = await Promise.all([
      page.waitForEvent("popup"),
      page.click("button >> text=Sign Message")
    ]);

    await page1.waitForSelector("text=Permission");
    await page1.click("button >> text=Approve")
    await wait(1000);

    const consoleData = JSON.parse(await page.locator("#console > p").innerText());
    expect(Object.keys(consoleData).length).toBeGreaterThan(32);
  });

});