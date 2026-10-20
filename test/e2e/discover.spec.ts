import { expect, test, type Page } from "@playwright/test";
import { completeFixture } from "../fixtures/discover";

async function capture(page: Page, name: string) {
  if (!process.env.DISCOVER_CAPTURE_DIR) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${process.env.DISCOVER_CAPTURE_DIR}/${name}.png`, fullPage: true, animations: "disabled" });
}

async function fillProfile(page: Page) {
  await page.getByLabel("Amount to allocate", { exact: false }).fill("1,000.00");
  await page.getByLabel("Additional preferences", { exact: false }).fill("Focus on infrastructure research.");
  await page.getByRole("radio", { name: "3–5 years", exact: true }).check();
  await page.getByRole("group", { name: /Would losing/ }).getByRole("radio", { name: "No", exact: true }).check();
  await page.getByRole("radio", { name: "Hold and reassess", exact: true }).check();
  await page.getByRole("radio", { name: "Basic", exact: true }).check();
  await page.getByRole("group", { name: /What investments do you already hold/ }).getByRole("radio", { name: "None", exact: true }).check();
}

test("Discover validates, preserves inputs, and displays real unavailable-service state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Generate allocation" })).toBeEnabled();
  await capture(page, "desktop");
  await page.getByRole("button", { name: "Generate allocation" }).click();
  const errors = page.getByRole("alert").filter({ hasText: "Check 6 answers" });
  await expect(errors).toBeVisible();
  await expect(errors).toBeFocused();
  await capture(page, "validation");
  await fillProfile(page);
  await expect(page.getByRole("complementary", { name: "Your request" })).toContainText("$1,000.00");
  await page.getByRole("button", { name: "Generate allocation" }).click();
  await expect(page).toHaveURL(/\/discover\/results\?request=/);
  await expect(page.getByRole("heading", { name: "Your request is ready. Analysis isn’t available yet." })).toBeVisible();
  await capture(page, "unavailable");
  await page.getByRole("button", { name: "Edit inputs", exact: true }).first().click();
  await expect(page.getByLabel("Amount to allocate", { exact: false })).toHaveValue("1,000.00");
  await expect(page.getByRole("radio", { name: "3–5 years", exact: true })).toBeChecked();
});

test("verified fixture renders allocations, evidence, saves and follows without recording holdings", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/allocation", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(completeFixture()) }));
  await page.goto("/"); await fillProfile(page);
  await page.getByRole("button", { name: "Generate allocation" }).click();
  await expect(page.getByRole("heading", { name: "Your allocation proposal" })).toBeVisible();
  await expect(page.getByText("100% of your entered budget")).toBeVisible();
  await capture(page, "results-synthetic");
  await page.getByText("Risks & supporting evidence", { exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Bitcoin documentation (test source link)" })).toHaveAttribute("href", "https://bitcoin.org/en/");
  await capture(page, "evidence-synthetic");
  await page.getByRole("button", { name: "Follow asset" }).first().click();
  await expect(page.getByRole("button", { name: "Following" })).toBeDisabled();
  await page.getByRole("button", { name: "Save proposal on this device" }).click();
  await expect(page.getByRole("button", { name: "Saved on this device" })).toBeDisabled();
  await page.getByRole("link", { name: "Watchlist", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bitcoin", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Unfollow", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little space for your research." })).toBeVisible();
  await page.getByRole("link", { name: "Invested", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Your investments, kept separate." })).toBeVisible();
});

test("mobile form stays within the viewport, cancels requests, and opens the profile menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/allocation", async (route) => { await new Promise((resolve) => setTimeout(resolve, 1000)); await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ status: "unavailable", code: "test_unavailable", message: "Synthetic service unavailable.", retryable: true }) }).catch(() => {}); });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Generate allocation" })).toBeEnabled();
  await capture(page, "mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await fillProfile(page); await page.getByRole("button", { name: "Generate allocation" }).click();
  await expect(page.getByRole("button", { name: "Request in progress" })).toBeDisabled();
  await capture(page, "loading-mobile");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Request cancelled. Your inputs are unchanged.")).toBeVisible();
  await page.getByLabel("Open profile menu").click();
  await expect(page.getByText("Accounts are not available yet.", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Accounts are not available yet.", { exact: false })).not.toBeVisible();
});

test("empty result URL offers a recoverable entry point", async ({ page }) => {
  await page.goto("/discover/results");
  await expect(page.getByRole("heading", { name: "No request in this tab yet." })).toBeVisible();
  await page.getByRole("link", { name: "Build an allocation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Find an allocation that fits you." })).toBeVisible();
});
