import { cleanCell, newId, normalKey } from "../domain/text";

export const fileAccept = ".xlsx,.xls,.xlsm,.csv,.txt,.ods";

export const schoolColumns = [
  "院校ID",
  "学校中文名称*",
  "学校韩文名称",
  "最后更新时间（YY.M）",
  "主页显示（是/否）",
  "城市",
  "学校性质",
  "全球QS排名（2027）",
  "亚洲QS排名（2026）",
  "标签（用 | 分隔）",
  "院校简介",
  "官网链接",
  "适用学历（用 | 分隔）",
  "专业名称（用 | 分隔）",
];

export const majorColumns = [
  "专业名称*（中文或 中文（韩文））",
  "最后更新时间（YY.M）",
  "所属学院",
  "适用学历（用 | 分隔）",
  "备注",
  "信息来源",
];

export async function readExcelRows(file: File) {
  const XLSX = await import("xlsx");
  const codepages = await import("xlsx/dist/cpexcel.full.mjs");
  XLSX.set_cptable(codepages);
  const bytes = await file.arrayBuffer();
  // Excel's TXT export is usually UTF-16. Never force UTF-8 over a BOM.
  let source: ArrayBuffer | string = bytes;
  if (/\.(csv|txt)$/i.test(file.name)) {
    const prefix = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
    if (prefix[0] === 0xff && prefix[1] === 0xfe)
      source = new TextDecoder("utf-16le").decode(bytes);
    else if (prefix[0] === 0xfe && prefix[1] === 0xff)
      source = new TextDecoder("utf-16be").decode(bytes);
    else {
      try {
        source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        source = new TextDecoder("gb18030").decode(bytes);
      }
    }
  }
  const workbook = XLSX.read(source, {
    type: typeof source === "string" ? "string" : "array",
    raw: false,
    cellDates: true,
  });
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
    const headerIndex = rows.findIndex((row) => {
      const fields = new Set(
        row
          .map((cell) => {
            const key = normalKey(cell);
            if (/^(专业名称|专业名|majorname|major)/i.test(key)) return "major-name";
            if (/^(学校中文名称|院校中文名称|学校名称|院校名称|schoolname)/i.test(key))
              return "school-name";
            if (/^(最后更新时间|更新时间|updatedat)/i.test(key)) return "updated-at";
            if (/^(所属学院|学院|college|faculty)/i.test(key)) return "college";
            if (/^(适用学历|学历|degrees|degree)/i.test(key)) return "degrees";
            if (/^(备注|说明|note)/i.test(key)) return "note";
            if (/^(信息来源|来源|source)/i.test(key)) return "source";
            if (
              /^(城市|city|学校性质|院校性质|类型|type|全球qs|亚洲qs|排名|rank|标签|tags|(?:学校|院校)?简介|intro|(?:学校|院校)?官网|website|主页显示|前台显示|学校id|院校id)/i.test(
                key,
              )
            )
              return "school-field";
            return "";
          })
          .filter(Boolean),
      );
      return (fields.has("major-name") || fields.has("school-name")) && fields.size >= 2;
    });
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex].map(normalKey);
    const data = rows
      .slice(headerIndex + 1)
      .map((cells) =>
        Object.fromEntries(
          headers.map((header, index) => [header, cleanCell(cells[index])]),
        ),
      )
      .filter((row) => Object.values(row).some(Boolean));
    const metadata = Object.fromEntries(
      rows
        .slice(0, headerIndex)
        .filter((row) => cleanCell(row[0]) && cleanCell(row[1]))
        .map((row) => [normalKey(row[0]), cleanCell(row[1])]),
    );
    if (data.length) return { sheetName, rows: data, metadata };
  }
  throw new Error(
    "未识别到可导入的数据表。请使用下载的标准模板，或确认首个有效工作表包含表头。",
  );
}

export function valueOf(row: Record<string, string>, aliases: string[]) {
  const keys = Object.keys(row);
  const normalizedAliases = aliases.map(normalKey);
  const exact = keys.find((item) => normalizedAliases.includes(normalKey(item)));
  const compatible =
    exact ||
    keys.find((item) => {
      const key = normalKey(item);
      return normalizedAliases.some(
        (alias) =>
          key.length >= 2 &&
          alias.length >= 2 &&
          (key.startsWith(alias) || alias.startsWith(key)),
      );
    });
  return compatible ? cleanCell(row[compatible]) : "";
}

export function toSchoolId(value: string, used: Set<string>) {
  const base = value.toLowerCase().replace(/[^a-z0-9_-]/g, "") || newId("school");
  let id = base;
  let count = 2;
  while (used.has(id)) {
    id = `${base}-${count++}`;
  }
  return id;
}

export async function downloadWorkbook(
  fileName: string,
  sheetName: string,
  columns: string[],
  rows: string[][],
  preface: string[][] = [],
) {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();
  const spacer = preface.length ? [[]] : [];
  const sheet = XLSX.utils.aoa_to_sheet([...preface, ...spacer, columns, ...rows]);
  const headerRow = preface.length + spacer.length + 1;
  sheet["!autofilter"] = {
    ref: `A${headerRow}:${XLSX.utils.encode_col(columns.length - 1)}${headerRow}`,
  };
  sheet["!cols"] = columns.map((column, index) => ({
    wch: Math.max(
      14,
      Math.min(
        42,
        Math.max(
          column.length + 2,
          ...rows.map((row) => String(row[index] || "").length + 2),
        ),
      ),
    ),
  }));
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, fileName, { compression: true });
}
