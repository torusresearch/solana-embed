import { test, expect } from "@playwright/test"
import { TESTING_PRIVATE_KEY } from "../constants"

test.describe("Login", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("http://localhost:3000");
    await page.selectOption('select[name="buildEnv"]', "testing");
  });

  test("Iframe embedded in window", async ({page}) => {
    await page.click("button >> text=Login")
    let torusIframe = await page.waitForSelector("#torusIframe:visible", {timeout: 5_000});
    expect(torusIframe).toBeTruthy();
  });

  test("Log in successfully", async({page}) => {
    await page.fill("input[placeholder='Enter private keyf from web3auth to login']", TESTING_PRIVATE_KEY);
    await page.click("button >> text=Login With Private Key");
    let logoutButton = await page.waitForSelector("button >> text=Logout", {timeout: 5_000});
    expect(logoutButton).toBeTruthy();
  })
});