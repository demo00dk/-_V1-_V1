import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import * as codepages from "xlsx/dist/cpexcel.full.mjs";
import {
  majorColumns,
  readExcelRows,
  schoolColumns,
  toSchoolId,
  valueOf,
} from "../../src/lib/excel";

XLSX.set_cptable(codepages);

function workbookFile(bookType: XLSX.BookType = "xlsx", rows: unknown[][] = []) {
  const book = XLSX.utils.book_new();
  if (bookType !== "csv" && bookType !== "txt")
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([["填写说明"], ["请勿修改专业原名"]]),
      "说明",
    );
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "专业数据");
  return new File([XLSX.write(book, { type: "array", bookType })], `test.${bookType}`);
}

describe("spreadsheet compatibility", () => {
  for (const format of ["xlsx", "xls", "xlsm", "csv", "txt", "ods"] as const) {
    it(`reads ${format} and keeps Chinese + Korean in a single cell`, async () => {
      const result = await readExcelRows(
        workbookFile(format, [
          ["模板版本", "2"],
          ["学校名称", "高丽大学"],
          ["院校ID", "korea"],
          [],
          majorColumns,
          ["经营学（경영학）", "26.8", "经营学院", "硕士|博士", "备注", "招生简章"],
        ]),
      );
      expect(result.rows).toHaveLength(1);
      expect(valueOf(result.rows[0], ["专业名称"])).toBe("经营学（경영학）");
      expect(valueOf(result.rows[0], ["适用学历"])).toBe("硕士|博士");
      expect(result.metadata["学校名称"]).toBe("高丽大学");
    });
  }
  it("accepts reordered columns, optional markers, and blank columns", async () => {
    const result = await readExcelRows(
      workbookFile("xlsx", [
        ["模板说明"],
        [],
        ["  学校性质 ", "", "学校中文名称 *", "城市"],
        ["私立", "not a field", "延世大学", "首尔"],
        [],
      ]),
    );
    expect(valueOf(result.rows[0], ["学校中文名称"])).toBe("延世大学");
    expect(valueOf(result.rows[0], ["不存在"])).toBe("");
    expect(result.rows).toHaveLength(1);
  });
  it("recognizes exported school headers and explicitly rejects an empty or unrecognizable workbook", async () => {
    const result = await readExcelRows(
      workbookFile("xlsx", [schoolColumns, ["s", "学校", "학교", "26.8", "是", "首尔"]]),
    );
    expect(valueOf(result.rows[0], ["学校中文名称"])).toBe("学校");
    expect(
      (
        await readExcelRows(
          workbookFile("xlsx", [
            ["学校中文名称", "院校简介"],
            ["学校", "修改简介"],
          ]),
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      readExcelRows(workbookFile("xlsx", [["随手记录"], ["没有表头"]])),
    ).rejects.toThrow("未识别");
    await expect(readExcelRows(workbookFile("xlsx", [majorColumns]))).rejects.toThrow(
      "未识别",
    );
  });
  it("uses exact aliases before prefix aliases, and creates collision-free IDs", () => {
    expect(valueOf({ 专业名称中文或中文韩文: "a", 专业名称: "b" }, ["专业名称"])).toBe(
      "b",
    );
    expect(valueOf({ schoolname: " Seoul " }, ["School Name"])).toBe("Seoul");
    expect(toSchoolId("ABC", new Set(["abc", "abc-2"]))).toBe("abc-3");
    const used = new Set<string>();
    for (let i = 0; i < 200; i++) used.add(toSchoolId("新增院校", used));
    expect(used.size).toBe(200);
  });
  it("reads UTF-8 and legacy Chinese CSV files", async () => {
    const text = "专业名称,所属学院\n计算机科学,工学院";
    for (const bytes of [
      new TextEncoder().encode(text),
      new Uint8Array(codepages.utils.encode(936, text)),
    ]) {
      const result = await readExcelRows(new File([bytes], "专业.csv"));
      expect(valueOf(result.rows[0], ["专业名称"])).toBe("计算机科学");
    }
  });
});
