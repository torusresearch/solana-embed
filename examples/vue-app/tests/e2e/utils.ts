import {expect, Page} from "@playwright/test"
import { DOMAIN, BACKEND_DOMAIN, STATE_DOMAIN } from "./constants"

export async function ensureTextualElementExists(page: Page, text: string) {
  expect(await page.locator(`text=${text}`)?.allInnerTexts()).toContain(text);
}

export async function getInnerText(page: Page, selector: string): Promise<string | undefined> {
  return page.locator(selector)?.first()?.innerText();
}

export function wait(milliSeconds: number = 1000) {
  return new Promise(resolve => setTimeout(resolve, milliSeconds));
}
//getBackendDomain, getDomain, getStateDomain,
export function getDomain(): string {
  return DOMAIN;
}

export function getBackendDomain(): string {
  return BACKEND_DOMAIN;
}

export function getStateDomain(): string {
  return STATE_DOMAIN;
}