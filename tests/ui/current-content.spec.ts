import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("现有内容在新版页面可读，真实院校数量与分页一致", async ({ page }) => {
  const site = JSON.parse(readFileSync("data/site.seed.json", "utf8"));
  site.leads = [];
  await page.route("**/api/site", (route) => route.fulfill({ json: site }));
  const visible = site.schools.filter(
    (school: { homeVisible?: boolean }) => school.homeVisible !== false,
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ["home", "schools", "majors", "resources"]) {
      await page.goto("/#" + name);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator("main h1")).toBeVisible();
      if (name === "schools") {
        await expect(page.locator(".compact-school-card")).toHaveCount(
          Math.min(12, visible.length),
        );
        await expect(page.getByRole("status")).toContainText(String(visible.length));
      }
      if (name === "majors") {
        await expect(page.locator(".major-catalog>button")).toHaveCount(30);
        const first = await page.locator(".major-catalog>button b").first().innerText();
        await page
          .locator(".major-catalog")
          .getByRole("button", { name: "下一页", exact: true })
          .click();
        await expect(page.locator(".major-catalog>button b").first()).not.toHaveText(
          first,
        );
      }
      if (name === "resources") {
        await page.locator(".featured-tool").getByRole("button").click();
        await expect(page.locator(".visa-check-card>ol li")).toHaveCount(
          site.visaGuides[0].materials.length,
        );
        await page.locator(".visa-degree-tabs").scrollIntoViewIfNeeded();
      }
      await page.screenshot({ path: `output/playwright/current-${name}-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "UI-test", role: "admin" } }),
    ),
  );
  await page.reload();
  await page.goto("/#admin");
  await page.getByRole("button", { name: "院校管理", exact: true }).click();
  await expect(page.locator(".table-wrap tbody tr")).toHaveCount(site.schools.length);
  await page.screenshot({ path: "output/playwright/current-admin-1440.png" });
});
