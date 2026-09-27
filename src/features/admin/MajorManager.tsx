import { useEffect, useState } from "react";
import { formatUpdateMonth, localDateText, updateMonth } from "../../domain/dates";
import { getMajorDetails } from "../../domain/majors";
import { compareAdminSchools, isHomeVisible, schoolQsLabel } from "../../domain/rankings";
import {
  cleanCell,
  normalizeDegreeValues,
  normalKey,
  splitDegrees,
} from "../../domain/text";
import type { Major, School } from "../../domain/types";
import { downloadWorkbook, majorColumns, readExcelRows, valueOf } from "../../lib/excel";
import { ImportActions } from "./ImportActions";

export function MajorManager({
  schools,
  setSchools,
  onStatus,
  status,
}: {
  schools: School[];
  setSchools: (value: School[]) => void;
  onStatus: (value: string) => void;
  status: string;
}) {
  const orderedSchools = [...schools].sort(compareAdminSchools);
  const [schoolId, setSchoolId] = useState(orderedSchools[0]?.id || "");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [majorQuery, setMajorQuery] = useState("");
  useEffect(() => {
    if (!schools.some((school) => school.id === schoolId))
      setSchoolId(orderedSchools[0]?.id || "");
  }, [schools, schoolId]);
  const selected = schools.find((school) => school.id === schoolId);
  const rows = selected ? getMajorDetails(selected) : [];
  const filteredSchools = orderedSchools.filter((school) =>
    `${school.id} ${school.name} ${school.nameKr} ${school.city} ${schoolQsLabel(school)}`
      .toLowerCase()
      .includes(schoolQuery.trim().toLowerCase()),
  );
  const filteredRows = rows.filter((major) =>
    `${major.name} ${major.college || ""} ${major.note || ""}`
      .toLowerCase()
      .includes(majorQuery.trim().toLowerCase()),
  );
  const replaceDetails = (id: string, details: Major[]) =>
    setSchools(
      schools.map((school) =>
        school.id === id
          ? {
              ...school,
              majorDetails: details,
              majors: details.map((item) => item.name).filter(Boolean),
              updatedAt: updateMonth(),
            }
          : school,
      ),
    );
  const updateMajor = (index: number, key: keyof Major, value: string) => {
    if (!selected) return;
    const next = rows.map((major, itemIndex) =>
      itemIndex === index
        ? {
            ...major,
            [key]: key === "degrees" ? splitDegrees(value) : value,
            updatedAt:
              key === "updatedAt"
                ? formatUpdateMonth(value, major.updatedAt || updateMonth())
                : updateMonth(),
          }
        : major,
    );
    replaceDetails(selected.id, next);
  };
  const safeName = (value: string) =>
    value.replace(/[\\/:*?"<>|]/g, "").trim() || "未命名院校";
  const schoolPreface = selected
    ? [
        ["学校ID", selected.id],
        ["学校中文名称", selected.name],
        ["学校韩文名称", selected.nameKr || ""],
      ]
    : [];
  const downloadMajorTemplate = () => {
    if (selected)
      downloadWorkbook(
        `demo-${safeName(selected.name)}-专业模板.xlsx`,
        `${safeName(selected.name).slice(0, 25)}专业`,
        majorColumns,
        [],
        schoolPreface,
      );
  };
  const exportMajors = () => {
    if (selected)
      downloadWorkbook(
        `demo-${safeName(selected.name)}-专业数据-${localDateText()}.xlsx`,
        `${safeName(selected.name).slice(0, 25)}专业`,
        majorColumns,
        rows.map((major) => [
          major.name,
          major.updatedAt || selected.updatedAt || updateMonth(),
          major.college || "",
          (major.degrees || selected.degrees).join("|"),
          major.note || "",
          major.source || "",
        ]),
        schoolPreface,
      );
  };
  const importMajors = async (file: File) => {
    if (!selected) return;
    try {
      const imported = await readExcelRows(file);
      const workbookSchoolId = imported.metadata[normalKey("学校ID")] || "";
      const workbookSchoolName = imported.metadata[normalKey("学校中文名称")] || "";
      const workbookSchoolNameKr = imported.metadata[normalKey("学校韩文名称")] || "";
      const idMatches = Boolean(workbookSchoolId && workbookSchoolId === selected.id);
      const nameMatches = Boolean(
        workbookSchoolName && normalKey(workbookSchoolName) === normalKey(selected.name),
      );
      const koreanNameMatches = Boolean(
        workbookSchoolNameKr &&
        selected.nameKr &&
        normalKey(workbookSchoolNameKr) === normalKey(selected.nameKr),
      );
      if (
        (workbookSchoolId || workbookSchoolName || workbookSchoolNameKr) &&
        !idMatches &&
        !nameMatches &&
        !koreanNameMatches
      ) {
        onStatus(
          `导入已停止：此 Excel 属于「${workbookSchoolName || workbookSchoolNameKr || workbookSchoolId}」，当前后台选中的是「${selected.name}」。请切换到对应学校后再导入。`,
        );
        return;
      }
      const legacyIdNote =
        workbookSchoolId && !idMatches && (nameMatches || koreanNameMatches)
          ? `；已按校名匹配并兼容历史学校ID ${workbookSchoolId}`
          : "";
      const next = [...schools];
      const targetIndex = next.findIndex((school) => school.id === selected.id);
      const target = next[targetIndex];
      const details = getMajorDetails(target);
      const importedNameCounts = imported.rows.reduce((counts, row) => {
        const name = valueOf(row, [
          "专业名称",
          "专业",
          "专业名称中文或中文韩文",
          "major",
          "majorname",
        ]);
        if (name) {
          const key = normalKey(name);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        return counts;
      }, new Map<string, number>());
      const importedIdentityCounts = imported.rows.reduce((counts, row) => {
        const name = valueOf(row, [
          "专业名称",
          "专业",
          "专业名称中文或中文韩文",
          "major",
          "majorname",
        ]);
        if (name) {
          const college = valueOf(row, ["所属学院", "学院", "college", "faculty"]);
          const key = `${normalKey(name)}|${normalKey(college)}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        return counts;
      }, new Map<string, number>());
      let added = 0;
      let updated = 0;
      let unchanged = 0;
      let skipped = 0;
      let otherSchool = 0;
      for (const row of imported.rows) {
        const schoolRef = valueOf(row, [
          "院校ID或学校中文名称",
          "院校ID",
          "学校中文名称",
          "学校名称",
          "院校",
          "学校",
          "schoolid",
          "schoolname",
        ]);
        const name = valueOf(row, [
          "专业名称",
          "专业",
          "专业名称中文或中文韩文",
          "major",
          "majorname",
        ]);
        if (
          schoolRef &&
          schoolRef !== selected.id &&
          normalKey(schoolRef) !== normalKey(selected.name)
        ) {
          otherSchool++;
          continue;
        }
        if (!name) {
          skipped++;
          continue;
        }
        const nameKey = normalKey(name);
        const incomingCollege = valueOf(row, ["所属学院", "学院", "college", "faculty"]);
        const identityKey = `${nameKey}|${normalKey(incomingCollege)}`;
        const repeatedIdentity = (importedIdentityCounts.get(identityKey) || 0) > 1;
        const sameNameIndexes = details
          .map((major, index) => (normalKey(major.name) === nameKey ? index : -1))
          .filter((index) => index >= 0);
        const exactCollegeIndex = incomingCollege
          ? sameNameIndexes.find(
              (index) =>
                normalKey(details[index].college || "") === normalKey(incomingCollege),
            )
          : undefined;
        const index =
          exactCollegeIndex !== undefined
            ? exactCollegeIndex
            : importedNameCounts.get(nameKey) === 1 && sameNameIndexes.length <= 1
              ? (sameNameIndexes[0] ?? -1)
              : -1;
        const previous = index >= 0 ? details[index] : undefined;
        const degreeValues = splitDegrees(
          valueOf(row, ["适用学历", "学历", "degrees", "degree"]),
        );
        const incomingNote = valueOf(row, ["备注", "说明", "note"]);
        const incomingSource = valueOf(row, ["信息来源", "来源", "source"]);
        const mergeText = (current = "", incoming = "") =>
          Array.from(
            new Set(
              [current, incoming]
                .flatMap((value) => cleanCell(value).split(/[；\n]+/))
                .map((value) => value.trim())
                .filter(Boolean),
            ),
          ).join("；");
        const base: Major = {
          name,
          college: incomingCollege || previous?.college || "",
          degrees:
            repeatedIdentity && previous
              ? normalizeDegreeValues([...(previous.degrees || []), ...degreeValues])
              : degreeValues.length
                ? degreeValues
                : previous?.degrees || target.degrees,
          note:
            repeatedIdentity && previous
              ? mergeText(previous.note, incomingNote)
              : incomingNote || previous?.note || "",
          source:
            repeatedIdentity && previous
              ? mergeText(previous.source, incomingSource)
              : incomingSource || previous?.source || "",
        };
        const changed =
          !previous ||
          JSON.stringify({ ...previous, updatedAt: undefined }) !==
            JSON.stringify({ ...base, updatedAt: undefined });
        const incoming = {
          ...base,
          updatedAt: changed
            ? formatUpdateMonth(
                valueOf(row, [
                  "最后更新时间",
                  "更新时间",
                  "更新日期",
                  "updatedat",
                  "updated",
                ]),
              )
            : previous?.updatedAt || updateMonth(),
        };
        if (index >= 0) {
          details[index] = incoming;
          changed ? updated++ : unchanged++;
        } else {
          details.push(incoming);
          added++;
        }
      }
      next[targetIndex] = {
        ...target,
        majorDetails: details,
        majors: details.map((major) => major.name),
        updatedAt: added || updated ? updateMonth() : target.updatedAt,
      };
      setSchools(next);
      onStatus(
        `「${selected.name}」单校导入完成：新增 ${added} 个，更新 ${updated} 个，无变化 ${unchanged} 个，空白跳过 ${skipped} 行${otherSchool ? `，拦截其他学校 ${otherSchool} 行` : ""}${legacyIdNote}。没有改动其他学校；请保存全部变更。`,
      );
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "导入失败，请检查文件格式。");
    }
  };
  return (
    <div className="major-workspace">
      <aside className="major-school-index">
        <div>
          <span className="eyebrow">按学校管理</span>
          <h2>选择一所院校</h2>
          <input
            value={schoolQuery}
            onChange={(event) => setSchoolQuery(event.target.value)}
            placeholder="搜索学校、排名、韩文名或 ID"
            aria-label="查找学校"
          />
        </div>
        <p>{filteredSchools.length} 所结果 · 主页显示优先，其后按 QS 排序</p>
        <div className="major-school-list">
          {filteredSchools.map((school) => (
            <button
              key={school.id}
              className={school.id === schoolId ? "active" : ""}
              onClick={() => {
                setSchoolId(school.id);
                setMajorQuery("");
                onStatus("");
              }}
            >
              <b>
                {isHomeVisible(school) && (
                  <span
                    className="home-visible-check"
                    title="已显示在主页"
                    aria-label="已显示在主页"
                  >
                    ✓
                  </span>
                )}
                {school.name}
              </b>
              <small>{school.nameKr || school.id}</small>
              <span>
                {schoolQsLabel(school)}
                <i>{getMajorDetails(school).length} 专业</i>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="major-manager">
        {selected ? (
          <>
            <header className="major-detail-head">
              <div>
                <span className="eyebrow">专业管理 / {selected.id}</span>
                <h2>
                  {selected.name}
                  <small>{selected.nameKr}</small>
                </h2>
              </div>
              <span className="school-update">
                {schoolQsLabel(selected)} · 院校更新 {selected.updatedAt || updateMonth()}
              </span>
            </header>
            <div className="major-file-scope">
              <div>
                <span>当前 Excel 归属学校</span>
                <b>{selected.name}</b>
                <small>模板、导入和导出均锁定此校，不会混入其他学校。</small>
              </div>
              <strong>
                {rows.length}
                <small>个专业</small>
              </strong>
            </div>
            <div className="manager-actions">
              <ImportActions
                onTemplate={downloadMajorTemplate}
                onImport={importMajors}
                onExport={exportMajors}
                labels={{
                  template: "下载本校模板",
                  export: "导出本校专业",
                  import: "导入本校 Excel",
                }}
              />
              <label className="manager-search">
                <span>查找专业</span>
                <input
                  value={majorQuery}
                  onChange={(event) => setMajorQuery(event.target.value)}
                  placeholder="专业名、学院或备注"
                />
              </label>
            </div>
            {status && <p className="import-status">{status}</p>}
            <p className="search-summary">
              显示 {filteredRows.length} / {rows.length} 个专业
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>专业名称（单格显示）</th>
                    <th className="updated-column">最后更新时间</th>
                    <th>所属学院</th>
                    <th>适用学历</th>
                    <th>备注 / 来源</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((major) => {
                    const index = rows.indexOf(major);
                    return (
                      <tr key={index}>
                        <td>
                          <textarea
                            value={major.name}
                            onChange={(event) =>
                              updateMajor(index, "name", event.target.value)
                            }
                            rows={2}
                          />
                        </td>
                        <td className="updated-column">
                          <input
                            className="month-input"
                            value={major.updatedAt || selected.updatedAt || updateMonth()}
                            onChange={(event) =>
                              updateMajor(index, "updatedAt", event.target.value)
                            }
                            aria-label={`${major.name}最后更新时间`}
                          />
                        </td>
                        <td>
                          <input
                            value={major.college || ""}
                            onChange={(event) =>
                              updateMajor(index, "college", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={(major.degrees || selected.degrees || []).join("|")}
                            onChange={(event) =>
                              updateMajor(index, "degrees", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <textarea
                            value={`${major.note || ""}${major.source ? `${major.note ? "\n" : ""}来源：${major.source}` : ""}`}
                            onChange={(event) => {
                              const [note, ...sourceParts] =
                                event.target.value.split("\n来源：");
                              replaceDetails(
                                selected.id,
                                rows.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        note,
                                        source: sourceParts.join("\n来源："),
                                        updatedAt: updateMonth(),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            rows={2}
                          />
                        </td>
                        <td>
                          <button
                            className="danger"
                            onClick={() =>
                              replaceDetails(
                                selected.id,
                                rows.filter((_, itemIndex) => itemIndex !== index),
                              )
                            }
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              className="button dark add-major"
              onClick={() =>
                replaceDetails(selected.id, [
                  ...rows,
                  {
                    name: "新专业",
                    degrees: selected.degrees,
                    updatedAt: updateMonth(),
                  },
                ])
              }
            >
              + 新增专业
            </button>
          </>
        ) : (
          <div className="empty">没有匹配的院校，请调整左侧搜索条件。</div>
        )}
      </section>
    </div>
  );
}
