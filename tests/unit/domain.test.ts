import { describe, expect, it } from "vitest";
import seed from "../../data/site.seed.json";
import {
  compareAdminSchools,
  compareSchoolsByQs,
  publicSchoolQsLabel,
  qsRankStart,
  schoolQsLabel,
} from "../../src/domain/rankings";
import {
  buildMajorCatalog,
  getAllMajorNames,
  getMajorDetails,
  majorSimilarity,
} from "../../src/domain/majors";
import { matchSchools, relatedMajor, schoolChallenge } from "../../src/domain/matching";
import {
  cleanCell,
  clone,
  normalKey,
  normalizeDegreeValues,
  splitDegrees,
  splitValues,
} from "../../src/domain/text";
import { formatUpdateMonth, localDateText, updateMonth } from "../../src/domain/dates";
import type { School, SiteData } from "../../src/domain/types";

const site = seed as SiteData;
const school = (changes: Partial<School> = {}): School => ({
  id: "school",
  name: "测试学校",
  nameKr: "학교",
  city: "首尔",
  type: "私立",
  rank: 0,
  degrees: ["硕士"],
  majors: ["计算机科学"],
  tags: [],
  intro: "",
  ...changes,
});

describe("rank ordering and public labels", () => {
  it("places every world-ranked school before Asia-only and unranked schools", () => {
    const records = [
      school({ id: "none" }),
      school({ id: "asia", asiaQsRank: "1" }),
      school({ id: "world", worldQsRank: "1401+" }),
      school({ id: "both", worldQsRank: "=42", asiaQsRank: "1" }),
    ];
    expect(records.sort(compareSchoolsByQs).map((s) => s.id)).toEqual([
      "both",
      "world",
      "asia",
      "none",
    ]);
    expect(publicSchoolQsLabel(records[0])).toBe("QS 42");
    expect(publicSchoolQsLabel(records[3])).toBe("");
    expect(schoolQsLabel(records[3])).toBe("暂无QS排名");
    expect(publicSchoolQsLabel(records[2])).toBe("亚洲QS 1");
    expect(qsRankStart(" # 801-850 ")).toBe(801);
    expect(qsRankStart("")).toBe(Infinity);
  });
  it("keeps visible schools first in admin without mutating visibility", () => {
    const records = [
      school({ id: "hidden", rank: 1, homeVisible: false }),
      school({ id: "shown", rank: 1000 }),
    ];
    expect(records.sort(compareAdminSchools)[0].id).toBe("shown");
  });
});

describe("major catalog ownership", () => {
  it("suggests similar names without merging them", () => {
    expect(majorSimilarity("计算机科学（컴퓨터과학）", "计算机科学专业")).toBe(1);
    expect(majorSimilarity("计算机", "计算机科学")).toBeGreaterThan(0.8);
    expect(majorSimilarity("", "")).toBe(0);
    expect(majorSimilarity("计算机科学", "经营学")).toBeLessThan(0.5);
    expect(majorSimilarity("计算机工程", "计算机科学")).toBeGreaterThan(0);
    expect(majorSimilarity("A", "B")).toBe(0);
    const result = buildMajorCatalog({
      ...site,
      schools: [school(), school({ id: "b", majors: ["计算机科学专业"] })],
      majorGroups: [],
    });
    expect(result).toHaveLength(2);
  });
  it("merges only confirmed aliases, removes hidden schools, and owns each record once", () => {
    const result = buildMajorCatalog({
      ...site,
      schools: [
        school(),
        school({ id: "b", majors: ["软件工程"] }),
        school({ id: "hidden", homeVisible: false }),
      ],
      majorGroups: [
        { id: "g", name: "计算机方向", aliases: ["计算机科学", "软件工程"] },
        { id: "duplicate", name: "重复分组", aliases: ["计算机科学"] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].records.map((r) => r.school.id)).toEqual(["school", "b"]);
    expect(getAllMajorNames([school(), school()])).toEqual(["计算机科学"]);
    expect(getMajorDetails(school({ majorDetails: [{ name: "软件" }] }))[0].name).toBe(
      "软件",
    );
  });
});

describe("matching rules", () => {
  const input = {
    degree: "硕士",
    background: "普通本科",
    gpa: 80,
    language: "TOPIK 4",
    budget: "中",
    city: "不限",
    major: "计算机",
    experience: "有课程或项目",
  };
  it("does not treat an empty keyword as a major match", () => {
    expect(relatedMajor(" ", ["计算机"])).toBeUndefined();
    expect(relatedMajor("AI", ["软件工程"])).toBe("软件工程");
    expect(relatedMajor("商科", ["经营学"])).toBe("经营学");
    expect(relatedMajor("未知专业", ["经营学"])).toBeUndefined();
  });
  it("excludes hidden and incompatible degree records and returns each eligible school once", () => {
    const schools = [
      school({ id: "a", rank: 50 }),
      school({ id: "b", rank: 300 }),
      school({ id: "c" }),
      school({ id: "hidden", homeVisible: false }),
      school({ id: "doctor", degrees: ["博士"] }),
    ];
    const plan = matchSchools({ ...site, schools, recommendationRules: [] }, input);
    expect(
      Object.values(plan)
        .flat()
        .map((r) => r.school.id)
        .sort(),
    ).toEqual(["a", "b", "c"]);
    expect(
      Object.values(plan)
        .flat()
        .every((r) => r.score >= 48 && r.score <= 96),
    ).toBe(true);
  });
  it("honors configured candidates and explains academic/language/region gaps", () => {
    const plan = matchSchools(
      {
        ...site,
        schools: [school(), school({ id: "other" })],
        recommendationRules: [
          {
            id: "r",
            name: "test",
            degree: "硕士",
            schoolIds: ["school"],
            majorKeywords: [],
            minGpa: 90,
            language: "TOPIK 5+",
            budget: "高",
            reason: "test",
          },
        ],
      },
      {
        ...input,
        gpa: 60,
        language: "无语言成绩",
        city: "地方城市",
        major: "设计",
        budget: "低",
      },
    );
    const results = Object.values(plan).flat();
    expect(results).toHaveLength(1);
    expect(results[0].gap).toContain("30");
    expect(results[0].gap).toContain("语言");
    expect(results[0].gap).toContain("地区");
    expect(
      matchSchools({ ...site, schools: [], recommendationRules: [] }, input),
    ).toEqual({ 冲刺: [], 稳妥: [], 保底: [] });
  });
  it("supports all ranking bands without a NaN challenge", () => {
    for (const rank of [50, 150, 400, 800, 1400])
      expect(Number.isFinite(schoolChallenge(school({ rank })))).toBe(true);
    for (const asiaQsRank of ["50", "250", "500", ""])
      expect(Number.isFinite(schoolChallenge(school({ asiaQsRank })))).toBe(true);
  });
});

describe("spreadsheet normalizers", () => {
  it("handles mixed separators, aliases and legacy degree labels", () => {
    expect(splitValues("a｜ b；c、d\ne")).toEqual(["a", "b", "c", "d", "e"]);
    expect(cleanCell("\uFEFF abc ")).toBe("abc");
    expect(cleanCell(null)).toBe("");
    expect(normalKey("学校中文名称*（中文）")).toBe("学校中文名称中文");
    expect(normalizeDegreeValues(["本科", "专升本", "硕博连读", "未知"])).toEqual([
      "本科新入",
      "本科插班（两年制专升本）",
      "一年制专升本",
      "硕士",
      "博士",
    ]);
    expect(splitDegrees("一年制专升本|本科插班|硕士研究生|博士研究生")).toHaveLength(4);
    expect(clone(site)).not.toBe(site);
  });
  it("formats dates without converting local months to UTC", () => {
    const date = new Date(2026, 8, 27);
    expect(updateMonth(date)).toBe("26.9");
    expect(localDateText(date)).toBe("2026-09-27");
    expect(formatUpdateMonth("2026/09/27")).toBe("26.9");
    expect(formatUpdateMonth("bad", "26.8")).toBe("26.8");
  });
});
