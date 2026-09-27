import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

// API interception keeps all test writes in memory, never in the real content store.
const base = JSON.parse(readFileSync("data/site.seed.json", "utf8"));
function fixture() {
  const site = structuredClone(base);
  site.leads = [];
  site.majorGroups = [];
  site.schools = Array.from({ length: 27 }, (_, i) => ({
    ...site.schools[0],
    id: `test-${i}`,
    name: `测试院校${String(i + 1).padStart(2, "0")}`,
    nameKr: `학교 ${i + 1}`,
    city: i % 2 ? "首尔" : "釜山",
    type: "私立",
    homeVisible: i !== 26,
    rank: i < 20 ? i + 10 : 0,
    worldQsRank: i < 20 ? String(i + 10) : "",
    asiaQsRank: i === 20 ? "20" : "",
    intro: "面向学生的院校独立简介。",
    degrees: ["本科新入", "硕士"],
    majors: [i % 2 ? "计算机科学" : "经营学"],
    majorDetails: [
      {
        name: i % 2 ? "计算机科学" : "经营学",
        college: i % 2 ? "工学院" : "商学院",
        degrees: ["硕士"],
      },
    ],
  }));
  return site;
}
async function mockSite(page: Page) {
  let site = fixture();
  await page.route("**/api/site", async (route) => {
    if (route.request().method() === "PUT")
      site = {
        ...route.request().postDataJSON(),
        meta: { ...site.meta, updatedAt: new Date().toISOString() },
      };
    await route.fulfill({ json: site });
  });
  await page.route("**/api/lead", (route) =>
    route.fulfill({ status: 500, json: { message: "test failure" } }),
  );
  await page.route("**/api/auth/**", (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: {
        token: "test-token",
        user: {
          username: body?.username || "student",
          role: body?.username === "test-admin" ? "admin" : "user",
        },
      },
    });
  });
}
test.beforeEach(async ({ page }) => {
  await mockSite(page);
});

for (const [route, title] of [
  ["home", "韩国"],
  ["schools", "找到适合你的下一站"],
  ["majors", "先看专业"],
  ["matcher", "用八个条件"],
  ["journey", "重要节点"],
  ["arrival", "抵达不是结束"],
  ["resources", "先给能解决问题"],
  ["faq", "把容易踩坑"],
]) {
  test(`页面可访问：${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1")).toContainText(title);
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("院校按 QS 分页、隐藏学校不出现，筛选后回第一页并可重置", async ({ page }) => {
  await page.goto("/#schools");
  const cards = page.locator(".compact-school-card");
  await expect(cards).toHaveCount(12);
  await expect(cards.first()).toContainText("测试院校01");
  await expect(page.getByRole("status")).toContainText("26");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(cards.first()).toContainText("测试院校13");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole("button", { name: "下一页", exact: true })).toBeDisabled();
  await expect(page.locator("main")).not.toContainText("暂无QS排名");
  await expect(page.locator("main")).not.toContainText("测试院校27");
  await page.getByLabel("搜索院校").fill("  测试院校21  ");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("亚洲QS 20");
  await page.getByLabel("搜索院校").fill("没有这个学校");
  await expect(cards).toHaveCount(0);
  await page.getByRole("button", { name: "清空条件，查看全部院校" }).click();
  await expect(cards).toHaveCount(12);
  await expect(page.getByRole("button", { name: "上一页", exact: true })).toBeDisabled();
  await page.getByLabel("所在城市").selectOption("首尔");
  await expect(page.getByRole("status")).toContainText("13");
  await page.getByLabel("申请学历").selectOption("博士");
  await expect(cards).toHaveCount(0);
});

test("专业切换后再搜索，不保留已被筛掉的右侧结果", async ({ page }) => {
  await page.goto("/#majors");
  await page.locator(".major-catalog>button").filter({ hasText: "计算机科学" }).click();
  await expect(page.locator(".major-school-results h2")).toHaveText("计算机科学");
  await page.getByPlaceholder("专业、学院或学校名称").fill("经营学");
  await expect(page.locator(".major-school-results h2")).toHaveText("经营学");
  await page.getByPlaceholder("专业、学院或学校名称").fill("完全不存在的专业");
  await expect(page.locator(".major-school-list-public article")).toHaveCount(0);
  await expect(page.locator(".major-school-results")).not.toContainText("计算机科学");
});

test("登录弹窗键盘闭环、Esc 关闭并恢复触发按钮焦点", async ({ page }) => {
  await page.goto("/");
  const trigger = page
    .locator(".nav-actions")
    .getByRole("button", { name: "登录 / 注册" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "关闭" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "登录并继续" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "关闭" })).toBeFocused();
  await dialog.getByRole("button", { name: "注册", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "注册并进入首页" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

for (const role of ["student", "test-admin"]) {
  test(`登录角色界面：${role}`, async ({ page }) => {
    await page.goto("/#schools");
    await page
      .locator(".nav-actions")
      .getByRole("button", { name: "登录 / 注册" })
      .click();
    await page.getByLabel("账号", { exact: true }).fill(role);
    await page.getByLabel("密码", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "登录并继续" }).click();
    await expect(page).toHaveURL(/#home$/);
    await expect(page.getByRole("button", { name: "后台管理", exact: true })).toHaveCount(
      role === "test-admin" ? 1 : 0,
    );
  });
}

test("顾问提交失败保留表单并明确反馈，不假报成功", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "找顾问聊聊" }).click();
  await page.getByLabel("称呼", { exact: true }).fill("测试学生");
  await page.getByLabel("微信 / 手机").fill("test-contact");
  await page.getByRole("button", { name: "提交给顾问" }).click();
  await expect(page.getByRole("alert")).toContainText("提交未成功");
  await expect(page.getByLabel("称呼", { exact: true })).toHaveValue("测试学生");
  await expect(page.getByRole("dialog")).not.toContainText("已收到你的信息");
});

test("六个签证路径逐字保留当前后台材料，复制拒绝后自动下载 PNG", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: () => Promise.reject(new DOMException("Not allowed", "NotAllowedError")),
      },
    }),
  );
  await page.goto("/#resources");
  await page.locator(".featured-tool").getByRole("button").click();
  for (const [category, id] of [
    ["本科", "bachelor-high"],
    ["硕士", "master"],
    ["博士", "doctor"],
    ["语学院", "language"],
  ]) {
    const button = page
      .getByRole("navigation", { name: "签证课程类型" })
      .getByRole("button")
      .filter({ hasText: category });
    await expect(button).toHaveCount(1);
    await button.click();
    await expect(page.locator(".visa-check-card>ol li p")).toHaveText(
      base.visaGuides.find((guide: { id: string }) => guide.id === id).materials,
    );
  }
  await page
    .getByRole("navigation", { name: "签证课程类型" })
    .getByRole("button")
    .filter({ hasText: "本科" })
    .click();
  const paths = page
    .getByRole("navigation", { name: "本科申请学历类型" })
    .getByRole("button");
  await expect(paths).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    await paths.nth(index).click();
    await expect(paths.nth(index)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".visa-check-card>ol li p")).toHaveText(
      base.visaGuides.filter((guide: { group?: string }) => guide.group === "bachelor")[
        index
      ].materials,
    );
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "复制卡片截图" }).click();
  expect((await download).suggestedFilename()).toMatch(/专升本.*\.png$/);
  await expect(page.getByRole("status")).toContainText("已自动下载");
});

test("后台修改品牌后保存，前台同步（隔离 API）", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "test-admin", role: "admin" } }),
    ),
  );
  await page.goto("/#admin");
  await page.getByRole("button", { name: "品牌与顾问", exact: true }).click();
  await page.getByLabel("首页主标题").fill("测试同步标题");
  await page.getByRole("button", { name: "保存全部变更" }).click();
  await expect(page.locator(".admin-status")).toContainText("已保存");
  await page.getByRole("button", { name: "前台预览" }).click();
  await expect(page.locator("main h1")).toHaveText("测试同步标题");
});

test("智能匹配生成三档结果，缺少对应学历时显示空态", async ({ page }) => {
  await page.goto("/#matcher");
  await page.getByRole("button", { name: "立即生成三档方案" }).click();
  await expect(page.locator(".tier-column")).toHaveCount(3);
  await expect(page.locator(".plan-school-card").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "联系老师精修方案" })).toBeVisible();
  await page.getByRole("button", { name: "博士", exact: true }).click();
  await page.getByRole("button", { name: "立即生成三档方案" }).click();
  await expect(page.locator(".plan-school-card")).toHaveCount(0);
  await expect(page.locator(".tier-empty")).toHaveCount(3);
});

test("专业连续编辑不丢焦点，备注与来源一起保存", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "test-admin", role: "admin" } }),
    ),
  );
  await page.goto("/#admin");
  await page.getByRole("button", { name: "院校管理", exact: true }).click();
  await page.getByRole("button", { name: "专业管理", exact: true }).click();
  const name = page
    .locator(".major-manager tbody tr")
    .first()
    .locator("textarea")
    .first();
  await name.fill("");
  await name.pressSequentially("连续编辑专业", { delay: 30 });
  await expect(name).toHaveValue("连续编辑专业");
  await expect(name).toBeFocused();
  const note = page.locator(".major-manager tbody tr").first().locator("textarea").last();
  await note.fill("备注同时修改\n来源：测试来源");
  await page.getByRole("button", { name: "保存全部变更" }).click();
  await expect(page.locator(".admin-status")).toContainText("已保存");
  await expect(note).toHaveValue("备注同时修改\n来源：测试来源");
});

test("后台批量隐藏后前台减少对应院校", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "test-admin", role: "admin" } }),
    ),
  );
  await page.goto("/#admin");
  await page.getByRole("button", { name: "院校管理", exact: true }).click();
  await page.getByRole("checkbox", { name: "选择测试院校01", exact: true }).check();
  await page.getByRole("checkbox", { name: "选择测试院校02", exact: true }).check();
  await page.getByRole("button", { name: "批量隐藏主页" }).click();
  await page.getByRole("button", { name: "保存全部变更" }).click();
  await expect(page.locator(".admin-status")).toContainText("已保存");
  await page.getByRole("button", { name: "前台预览" }).click();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "院校库", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("24");
  await expect(page.locator(".compact-school-card").first()).toContainText("测试院校03");
});

function excelBuffer(rows: unknown[][]) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "数据");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
test("院校 Excel 同名更新简介，不重复新增；导出的文件可读取", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "test-admin", role: "admin" } }),
    ),
  );
  await page.goto("/#admin");
  await page.getByRole("button", { name: "院校管理", exact: true }).click();
  await page.locator(".excel-actions input[type=file]").setInputFiles({
    name: "schools.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: excelBuffer([
      ["学校中文名称", "院校简介"],
      ["测试院校01", "同名学校更新后的新简介"],
    ]),
  });
  await expect(page.locator(".import-status")).toContainText("更新 1");
  await expect(page.locator(".table-wrap tbody tr")).toHaveCount(27);
  await page.getByRole("button", { name: "保存全部变更" }).click();
  await expect(page.locator(".admin-status")).toContainText("已保存");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出现有数据" }).click();
  const workbook = XLSX.read(readFileSync((await (await downloaded).path())!), {
    type: "buffer",
  });
  expect(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]])).toContain(
    "同名学校更新后的新简介",
  );
});
test("单校专业导入兼容历史 ID，同名校可导入但跨学校必须阻止", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "test-admin", role: "admin" } }),
    ),
  );
  await page.goto("/#admin");
  await page.getByRole("button", { name: "院校管理", exact: true }).click();
  await page.getByRole("button", { name: "专业管理", exact: true }).click();
  const upload = async (name: string) =>
    page.locator(".excel-actions input[type=file]").setInputFiles({
      name: "majors.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: excelBuffer([
        ["学校ID", "old-id"],
        ["学校中文名称", name],
        [],
        ["专业名称*（中文或 中文（韩文））", "所属学院", "适用学历"],
        ["人工智能（인공지능）", "工学院", "硕士"],
      ]),
    });
  await upload("测试院校01");
  await expect(page.locator(".import-status")).toContainText("新增 1");
  await expect(page.locator(".major-manager tbody tr")).toHaveCount(2);
  await upload("完全不同的学校");
  await expect(page.locator(".import-status")).toContainText("导入已停止");
  await expect(page.locator(".major-manager tbody tr")).toHaveCount(2);
});

test("损坏的登录缓存不会阻断页面，未登录直接打开后台返回首页", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("demo-session", '{"token":"broken","user":null}'),
  );
  await page.goto("/#admin");
  await expect(page).toHaveURL(/#home$/);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByRole("button", { name: "后台管理", exact: true })).toHaveCount(
    0,
  );
});
test("保存遇到版本冲突时保留草稿，由管理员主动载入新版本", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "demo-session",
      JSON.stringify({ token: "test", user: { username: "test-admin", role: "admin" } }),
    ),
  );
  await page.route("**/api/site", (route) =>
    route.fulfill(
      route.request().method() === "PUT"
        ? {
            status: 409,
            json: {
              message: "版本冲突",
              latest: {
                ...fixture(),
                brand: { ...base.brand, heroTitle: "服务器更新标题" },
              },
            },
          }
        : { json: fixture() },
    ),
  );
  await page.goto("/#admin");
  await page.getByRole("button", { name: "品牌与顾问", exact: true }).click();
  await page.getByLabel("首页主标题").fill("我的未保存草稿");
  await page.getByRole("button", { name: "保存全部变更" }).click();
  await expect(page.locator(".admin-status")).toContainText("草稿已保留");
  await expect(page.getByLabel("首页主标题")).toHaveValue("我的未保存草稿");
  await page.getByRole("button", { name: "载入最新内容" }).click();
  await expect(page.getByLabel("首页主标题")).toHaveValue("服务器更新标题");
});

test("图片剪贴板成功时反馈复制完成，不触发下载", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async (items: ClipboardItem[]) => {
          const blob = await items[0].getType("image/png");
          if (blob.size < 1000) throw new Error("empty card");
        },
      },
    }),
  );
  await page.goto("/#resources");
  await page.locator(".featured-tool").getByRole("button").click();
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  await page.getByRole("button", { name: "复制卡片截图" }).click();
  await expect(page.getByRole("status")).toContainText("卡片截图已复制");
  expect(downloads).toEqual([]);
});

for (const width of [390, 768, 1440]) {
  test(`布局及导航 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["home", "schools", "majors", "matcher", "resources"]) {
      await page.goto(`/#${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      if (route === "resources")
        await page.locator(".featured-tool").getByRole("button").click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBeTruthy();
      await expect(
        page.locator(".nav-actions").getByRole("button", { name: "登录 / 注册" }),
      ).toBeVisible();
      if (route !== "matcher")
        await expect(
          page.getByRole("button", { name: "联系留学顾问", exact: true }),
        ).toBeVisible();
      await page.screenshot({
        path: `output/playwright/${route}-${width}.png`,
        fullPage: false,
      });
    }
  });
}
