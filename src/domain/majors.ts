import { updateMonth } from "./dates";
import { isHomeVisible } from "./rankings";
import { cleanCell, normalKey } from "./text";
import type { Major, MajorCatalogEntry, School, SiteData } from "./types";

export function getMajorDetails(school: School): Major[] {
  return school.majorDetails?.length
    ? school.majorDetails
    : school.majors.map((name) => ({
        name,
        degrees: school.degrees,
        updatedAt: school.updatedAt || updateMonth(),
      }));
}

export const majorNameKey = (value: string) =>
  normalKey(value).replace(/[·•・.，,。/\\-]/g, "");

export const majorCoreName = (value: string) =>
  cleanCell(value)
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/(?:专业|学科|学部|系|专攻|方向|전공|학과|학부)$/gi, "")
    .replace(/[\s·•・.，,。/\\_-]/g, "")
    .toLowerCase();

export function majorSimilarity(left: string, right: string) {
  const a = majorCoreName(left);
  const b = majorCoreName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (Math.min(a.length, b.length) >= 2 && (a.includes(b) || b.includes(a))) return 0.84;
  const pairs = (value: string) => {
    const result = new Set<string>();
    for (let index = 0; index < value.length - 1; index++)
      result.add(value.slice(index, index + 2));
    return result;
  };
  const ap = pairs(a);
  const bp = pairs(b);
  if (!ap.size || !bp.size) return 0;
  const overlap = [...ap].filter((pair) => bp.has(pair)).length;
  return (2 * overlap) / (ap.size + bp.size);
}

export function getAllMajorNames(schools: School[]) {
  return Array.from(
    new Map(
      schools
        .flatMap((school) => getMajorDetails(school))
        .filter((major) => major.name.trim())
        .map((major) => [majorNameKey(major.name), major.name]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function buildMajorCatalog(site: SiteData): MajorCatalogEntry[] {
  const records = site.schools.filter(isHomeVisible).flatMap((school) =>
    getMajorDetails(school)
      .filter((major) => major.name.trim())
      .map((major) => ({ school, major })),
  );
  const groups = site.majorGroups || [];
  // Index each alias once. A record belongs to one group even if old imports
  // accidentally assigned its alias twice; the first configured group wins.
  const aliasOwners = new Map<string, string>();
  const groupedEntries = new Map<string, MajorCatalogEntry>();
  for (const group of groups) {
    groupedEntries.set(group.id, {
      id: `group:${group.id}`,
      name: group.name,
      aliases: group.aliases,
      grouped: true,
      records: [],
    });
    for (const alias of group.aliases) {
      const key = majorNameKey(alias);
      if (!aliasOwners.has(key)) aliasOwners.set(key, group.id);
    }
  }
  const ungrouped = new Map<string, MajorCatalogEntry>();
  records.forEach((record) => {
    const key = majorNameKey(record.major.name);
    const owner = aliasOwners.get(key);
    if (owner) {
      groupedEntries.get(owner)!.records.push(record);
      return;
    }
    const current = ungrouped.get(key);
    if (current) current.records.push(record);
    else
      ungrouped.set(key, {
        id: `major:${key}`,
        name: record.major.name,
        aliases: [record.major.name],
        records: [record],
        grouped: false,
      });
  });
  return [...groupedEntries.values(), ...ungrouped.values()]
    .filter((entry) => entry.records.length)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}
