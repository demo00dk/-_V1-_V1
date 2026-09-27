import type { Page } from "../domain/types";

export const pages: { key: Page; text: string }[] = [
  { key: "home", text: "首页" },
  { key: "schools", text: "院校库" },
  { key: "majors", text: "专业库" },
  { key: "matcher", text: "智能匹配" },
  { key: "journey", text: "申请流程" },
  { key: "arrival", text: "抵韩安顿" },
  { key: "resources", text: "公益工具" },
];

export function pageFromHash(): Page {
  const key = window.location.hash.replace("#", "") as Page;
  return [...pages.map((item) => item.key), "faq", "admin"].includes(key) ? key : "home";
}
