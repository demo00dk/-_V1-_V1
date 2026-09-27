import { degreeOptions } from "./catalog";
import type { SiteData } from "./types";

export const cleanCell = (value: unknown) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

export const normalKey = (value: unknown) =>
  cleanCell(value)
    .toLowerCase()
    .replace(/[\s_\-*（）()【】\[\]：:]/g, "");

export const splitValues = (value: unknown) =>
  cleanCell(value)
    .split(/[|｜;；,，、\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeDegreeValues = (values: string[]) =>
  Array.from(
    new Set(
      values.flatMap((value) => {
        const text = cleanCell(value);
        if (/^(本科|本科新生|本科新入|本科一年级)$/.test(text)) return ["本科新入"];
        if (text === "专升本") return ["本科插班（两年制专升本）", "一年制专升本"];
        if (/一年制/.test(text)) return ["一年制专升本"];
        if (/本科插班|两年制|插班/.test(text)) return ["本科插班（两年制专升本）"];
        if (/硕士.*博士|硕博连读/.test(text)) return ["硕士", "博士"];
        if (/^(硕士|硕士研究生)$/.test(text)) return ["硕士"];
        if (/^(博士|博士研究生)$/.test(text)) return ["博士"];
        return degreeOptions.includes(text) ? [text] : [];
      }),
    ),
  );

export const splitDegrees = (value: unknown) => normalizeDegreeValues(splitValues(value));

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const clone = (value: SiteData): SiteData =>
  JSON.parse(JSON.stringify(value)) as SiteData;
