import { languageScore } from "./catalog";
import {
  compareSchoolsByQs,
  effectiveWorldQsRank,
  isHomeVisible,
  qsRankStart,
} from "./rankings";
import type { Rule, School, SiteData } from "./types";

export const tierOrder = ["冲刺", "稳妥", "保底"] as const;

export type MatchTier = (typeof tierOrder)[number];

export type MatchInput = {
  degree: string;
  background: string;
  gpa: number;
  language: string;
  budget: string;
  city: string;
  major: string;
  experience: string;
};

export type MatchEntry = {
  school: School;
  score: number;
  major: string;
  reason: string;
  bullets: string[];
  gap: string;
  challenge: number;
};

export const relatedMajor = (input: string, majors: string[]) => {
  input = input.trim();
  if (!input) return undefined;
  const exact = majors.find((major) => major.includes(input) || input.includes(major));
  if (exact) return exact;
  const majorGroups: [RegExp, RegExp][] = [
    [/计算机|软件|人工智能|AI|数据/i, /计算机|软件|人工智能|数据|电子/],
    [/经营|商科|金融|经济|贸易/i, /经营|金融|经济|贸易/],
    [/设计|传媒|新闻/i, /设计|传媒|新闻/],
    [/工程|机械/i, /工程|机械|电子/],
  ];
  const family = majorGroups.find(([intent]) => intent.test(input));
  return family ? majors.find((major) => family[1].test(major)) : undefined;
};

export const schoolChallenge = (school: School) => {
  const world = qsRankStart(effectiveWorldQsRank(school));
  if (Number.isFinite(world))
    return world <= 100
      ? 96
      : world <= 200
        ? 89
        : world <= 500
          ? 79
          : world <= 1000
            ? 69
            : 60;
  const asia = qsRankStart(school.asiaQsRank);
  return Number.isFinite(asia) ? (asia <= 100 ? 76 : asia <= 300 ? 65 : 57) : 52;
};

export function matchSchools(
  site: SiteData,
  input: MatchInput,
): Record<MatchTier, MatchEntry[]> {
  const applicable = site.recommendationRules.filter(
    (rule) => rule.degree === input.degree || rule.degree === "通用",
  );
  const ruleBySchool = new Map<string, Rule>();
  for (const rule of applicable) {
    for (const schoolId of rule.schoolIds) {
      if (!ruleBySchool.has(schoolId)) ruleBySchool.set(schoolId, rule);
    }
  }
  let candidates = site.schools.filter(
    (school) =>
      isHomeVisible(school) &&
      school.degrees.includes(input.degree) &&
      ruleBySchool.has(school.id) &&
      school.majors.length,
  );
  if (!candidates.length)
    candidates = site.schools.filter(
      (school) =>
        isHomeVisible(school) &&
        school.degrees.includes(input.degree) &&
        school.majors.length,
    );
  const backgroundScore: Record<string, number> = {
    重点本科: 6,
    普通本科: 2,
    专科: -2,
    "高中 / 中专": 0,
    其他: 0,
  };
  const experienceScore: Record<string, number> = {
    暂未准备: 0,
    有课程或项目: 3,
    "有实习 / 科研 / 作品集": 6,
  };
  const profileStrength = Math.min(
    98,
    input.gpa +
      (languageScore[input.language] || 0) * 2 +
      (backgroundScore[input.background] || 0) +
      (experienceScore[input.experience] || 0),
  );
  const entries = candidates
    .map((school): MatchEntry => {
      const rule = ruleBySchool.get(school.id);
      const matchedMajor = relatedMajor(input.major, school.majors);
      const major = matchedMajor || school.majors[0];
      const majorHit = Boolean(matchedMajor);
      const cityMatch =
        input.city === "不限" ||
        (input.city === "首尔圈"
          ? /首尔|仁川|京畿/.test(school.city)
          : !/首尔|仁川|京畿/.test(school.city));
      const budgetFit =
        input.budget === "高" ||
        input.budget === "中" ||
        /国立|公立/.test(school.type) ||
        !/首尔/.test(school.city);
      const minGpa = rule?.minGpa ?? 70;
      const requiredLanguage = rule?.language || "不限";
      const langPass =
        requiredLanguage === "不限" ||
        (languageScore[input.language] || 0) >= (languageScore[requiredLanguage] || 0);
      const score = Math.max(
        48,
        Math.min(
          96,
          Math.round(
            42 +
              (majorHit ? 16 : 5) +
              (input.gpa >= minGpa ? 10 : Math.max(0, 10 - (minGpa - input.gpa))) +
              (langPass ? 8 : 2) +
              (cityMatch ? 5 : 0) +
              (budgetFit ? 4 : 0) +
              Math.max(-4, Math.min(5, (profileStrength - schoolChallenge(school)) / 4)),
          ),
        ),
      );
      const gaps = [
        input.gpa < minGpa ? `平均分距离当前参考线约 ${minGpa - input.gpa} 分` : "",
        !langPass ? `语言建议提升至 ${requiredLanguage}` : "",
        !majorHit ? "需要进一步核对专业名称与课程方向" : "",
        !cityMatch ? "所在地区与当前偏好不同" : "",
      ].filter(Boolean);
      return {
        school,
        score,
        major,
        challenge: schoolChallenge(school),
        reason: majorHit
          ? `${major}与“${input.major}”方向接近，可进一步比较课程和申请要求。`
          : `学历路径符合，先作为${input.degree}阶段的组合院校进行比较。`,
        bullets: [
          `${input.degree}路径可用`,
          `${school.city} · ${school.type}`,
          `参考：${minGpa}+ / ${requiredLanguage}`,
        ],
        gap: gaps.join("；") || "当前核心条件没有明显缺口，仍需核对当期专业要求",
      };
    })
    .sort(
      (a, b) =>
        b.challenge - a.challenge ||
        b.score - a.score ||
        compareSchoolsByQs(a.school, b.school),
    );
  const reachCount = entries.length ? Math.max(1, Math.round(entries.length / 3)) : 0;
  const targetCount =
    entries.length > 1 ? Math.max(1, Math.floor((entries.length - reachCount) / 2)) : 0;
  const plan: Record<MatchTier, MatchEntry[]> = {
    冲刺: entries.slice(0, reachCount),
    稳妥: entries.slice(reachCount, reachCount + targetCount),
    保底: entries.slice(reachCount + targetCount),
  };
  tierOrder.forEach((tier) =>
    plan[tier].sort(
      (a, b) => b.score - a.score || compareSchoolsByQs(a.school, b.school),
    ),
  );
  return plan;
}
