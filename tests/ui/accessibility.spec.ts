import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const site = JSON.parse(readFileSync("data/site.seed.json", "utf8"));
test.beforeEach(async ({ page }) => {
  await page.route("**/api/site", (route) => route.fulfill({ json: site }));
});
for (const route of ["home", "schools", "majors", "matcher", "resources"]) {
  test(`可访问性自动检查：${route}`, async ({ page }) => {
    await page.goto("/#" + route);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}
test("登录弹窗和顾问表单有清晰标签与可访问对比度", async ({ page }) => {
  await page.goto("/");
  for (const name of ["登录 / 注册", "找顾问聊聊"]) {
    await page.locator(".nav-actions").getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.keyboard.press("Escape");
  }
});
