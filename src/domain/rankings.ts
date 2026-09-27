import { cleanCell } from "./text";
import type { School } from "./types";

export const isHomeVisible = (school: School) => school.homeVisible !== false;

export const cleanQsRank = (value: unknown) =>
  cleanCell(value).replace(/^#/, "").replace(/^=/, "").replace(/\s+/g, "");

export const qsRankStart = (value: unknown) => {
  const match = cleanQsRank(value).match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

export const effectiveWorldQsRank = (school: School) =>
  cleanQsRank(school.worldQsRank || (school.rank > 0 ? school.rank : ""));

export const schoolQsLabel = (school: School) =>
  effectiveWorldQsRank(school)
    ? `QS ${effectiveWorldQsRank(school)}`
    : cleanQsRank(school.asiaQsRank)
      ? `亚洲QS ${cleanQsRank(school.asiaQsRank)}`
      : "暂无QS排名";

export const publicSchoolQsLabel = (school: School) =>
  effectiveWorldQsRank(school)
    ? `QS ${effectiveWorldQsRank(school)}`
    : cleanQsRank(school.asiaQsRank)
      ? `亚洲QS ${cleanQsRank(school.asiaQsRank)}`
      : "";

export const compareSchoolsByQs = (a: School, b: School) => {
  const aWorld = effectiveWorldQsRank(a);
  const bWorld = effectiveWorldQsRank(b);
  const aAsia = cleanQsRank(a.asiaQsRank);
  const bAsia = cleanQsRank(b.asiaQsRank);
  const aTier = aWorld ? 0 : aAsia ? 1 : 2;
  const bTier = bWorld ? 0 : bAsia ? 1 : 2;
  return (
    aTier - bTier ||
    qsRankStart(aWorld || aAsia) - qsRankStart(bWorld || bAsia) ||
    a.name.localeCompare(b.name, "zh-CN")
  );
};

export const compareAdminSchools = (a: School, b: School) =>
  Number(isHomeVisible(b)) - Number(isHomeVisible(a)) || compareSchoolsByQs(a, b);
