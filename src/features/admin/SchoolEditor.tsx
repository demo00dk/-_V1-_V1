import { useState } from "react";
import { DegreeTabs } from "../../components/forms";
import { formatUpdateMonth, updateMonth } from "../../domain/dates";
import {
  cleanQsRank,
  compareAdminSchools,
  compareSchoolsByQs,
  effectiveWorldQsRank,
  isHomeVisible,
  qsRankStart,
  schoolQsLabel,
} from "../../domain/rankings";
import { newId, normalKey, splitDegrees, splitValues } from "../../domain/text";
import type { School } from "../../domain/types";
import {
  downloadWorkbook,
  readExcelRows,
  schoolColumns,
  toSchoolId,
  valueOf,
} from "../../lib/excel";
import { ImportActions } from "./ImportActions";
import { MajorManager } from "./MajorManager";

export function SchoolEditor({
  schools,
  setSchools,
}: {
  schools: School[];
  setSchools: (value: School[]) => void;
}) {
  const [view, setView] = useState<"schools" | "majors">("schools");
  const [status, setStatus] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const update = (id: string, key: keyof School, value: string | number | string[]) =>
    setSchools(
      schools.map((school) =>
        school.id === id
          ? {
              ...school,
              [key]: value,
              updatedAt:
                key === "updatedAt"
                  ? formatUpdateMonth(value, school.updatedAt || updateMonth())
                  : updateMonth(),
            }
          : school,
      ),
    );
  const add = () =>
    setSchools([
      ...schools,
      {
        id: newId("school"),
        name: "新院校",
        nameKr: "",
        city: "首尔",
        type: "私立",
        rank: 0,
        tags: ["待补充"],
        intro: "请完善院校介绍。",
        degrees: ["本科新入"],
        majors: [],
        updatedAt: updateMonth(),
        homeVisible: true,
      },
    ]);
  const filteredSchools = schools
    .filter((school) =>
      `${school.id} ${school.name} ${school.nameKr} ${school.city} ${school.tags.join(" ")} ${schoolQsLabel(school)}`
        .toLowerCase()
        .includes(schoolQuery.trim().toLowerCase()),
    )
    .sort(compareAdminSchools);
  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  const toggleAllFiltered = () =>
    setSelectedIds((current) =>
      filteredSchools.length &&
      filteredSchools.every((school) => current.includes(school.id))
        ? current.filter((id) => !filteredSchools.some((school) => school.id === id))
        : Array.from(
            new Set([...current, ...filteredSchools.map((school) => school.id)]),
          ),
    );
  const setBatchVisibility = (homeVisible: boolean) => {
    if (!selectedIds.length) return;
    setSchools(
      schools.map((school) =>
        selectedIds.includes(school.id)
          ? { ...school, homeVisible, updatedAt: updateMonth() }
          : school,
      ),
    );
    setStatus(
      `已将 ${selectedIds.length} 所选中院校设为${homeVisible ? "前台显示" : "前台隐藏"}；点击页面顶部“保存全部变更”后立即同步。`,
    );
  };
  const downloadSchoolTemplate = () =>
    downloadWorkbook("demo-院校管理标准模板.xlsx", "院校数据", schoolColumns, [
      [
        "hanyang-example",
        "汉阳大学",
        "한양대학교",
        updateMonth(),
        "是",
        "首尔",
        "私立",
        "155",
        "20",
        "工科优势|就业导向",
        "示例行：可修改或删除。",
        "https://www.hanyang.ac.kr/",
        "本科新入|本科插班（两年制专升本）|一年制专升本|硕士|博士",
        "计算机科学|人工智能|经营学",
      ],
      [
        "",
        "示例大学",
        "예시대학교",
        updateMonth(),
        "是",
        "首尔",
        "私立",
        "",
        "201-250",
        "综合大学|待补充",
        "请填写院校简介。",
        "https://example.edu.kr/",
        "本科新入|硕士",
        "专业 A|专业 B",
      ],
    ]);
  const exportSchools = () =>
    downloadWorkbook(
      `demo-院校数据-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "院校数据",
      schoolColumns,
      [...schools]
        .sort(compareSchoolsByQs)
        .map((school) => [
          school.id,
          school.name,
          school.nameKr,
          school.updatedAt || updateMonth(),
          isHomeVisible(school) ? "是" : "否",
          school.city,
          school.type,
          effectiveWorldQsRank(school),
          cleanQsRank(school.asiaQsRank),
          school.tags.join("|"),
          school.intro,
          school.website || "",
          school.degrees.join("|"),
          school.majors.join("|"),
        ]),
    );
  const importSchools = async (file: File) => {
    try {
      const imported = await readExcelRows(file);
      let added = 0;
      let updated = 0;
      let unchanged = 0;
      let skipped = 0;
      const next = [...schools];
      const used = new Set(next.map((school) => school.id));
      for (const row of imported.rows) {
        const name = valueOf(row, [
          "学校中文名称",
          "中文名称",
          "学校名称",
          "院校名称",
          "name",
          "schoolname",
        ]);
        if (!name) {
          skipped++;
          continue;
        }
        const suppliedId = valueOf(row, ["院校ID", "学校ID", "教育部院校ID", "id"]);
        const matchIndex = next.findIndex(
          (school) =>
            school.id === suppliedId || normalKey(school.name) === normalKey(name),
        );
        const previous = matchIndex >= 0 ? next[matchIndex] : undefined;
        const id = previous?.id || toSchoolId(suppliedId || name, used);
        used.add(id);
        const incomingMajors = splitValues(
          valueOf(row, ["专业名称", "专业", "专业名称用分隔", "majors", "major"]),
        );
        const incomingTags = splitValues(valueOf(row, ["标签", "标签用分隔", "tags"]));
        const incomingDegrees = splitDegrees(
          valueOf(row, ["适用学历", "学历", "degrees", "degree"]),
        );
        const worldRankValue = valueOf(row, [
          "全球QS排名",
          "世界QS排名",
          "QS排名",
          "排名",
          "worldqs",
          "qsworld",
          "qs",
          "rank",
        ]);
        const asiaRankValue = valueOf(row, [
          "亚洲QS排名",
          "QS亚洲排名",
          "asiaqs",
          "qsasia",
        ]);
        const visibilityValue = valueOf(row, [
          "主页显示",
          "前台显示",
          "显示状态",
          "homevisible",
          "visible",
          "show",
        ]);
        const worldQsRank =
          worldRankValue === ""
            ? effectiveWorldQsRank(previous || ({} as School))
            : cleanQsRank(worldRankValue);
        const rankStart = qsRankStart(worldQsRank);
        const base: School = {
          id,
          name,
          nameKr:
            valueOf(row, [
              "学校韩文名称",
              "韩文名称",
              "韩语名称",
              "namekr",
              "koreanname",
            ]) ||
            previous?.nameKr ||
            "",
          city: valueOf(row, ["城市", "地区", "city"]) || previous?.city || "待补充",
          type:
            valueOf(row, ["学校性质", "院校性质", "类型", "type"]) ||
            previous?.type ||
            "待补充",
          rank: Number.isFinite(rankStart) ? rankStart : 0,
          worldQsRank,
          asiaQsRank:
            asiaRankValue === ""
              ? cleanQsRank(previous?.asiaQsRank)
              : cleanQsRank(asiaRankValue),
          tags: incomingTags.length ? incomingTags : previous?.tags || [],
          intro:
            valueOf(row, ["院校简介", "简介", "介绍", "intro", "description"]) ||
            previous?.intro ||
            "",
          website:
            valueOf(row, [
              "官网链接",
              "院校链接",
              "学校链接",
              "官网",
              "网站",
              "website",
              "url",
              "link",
            ]) ||
            previous?.website ||
            "",
          degrees: incomingDegrees.length
            ? incomingDegrees
            : previous?.degrees || ["本科新入"],
          majors: incomingMajors.length ? incomingMajors : previous?.majors || [],
          majorDetails: incomingMajors.length
            ? incomingMajors.map((major) => ({
                name: major,
                degrees: incomingDegrees.length
                  ? incomingDegrees
                  : previous?.degrees || ["本科新入"],
                updatedAt: updateMonth(),
              }))
            : previous?.majorDetails,
          homeVisible: visibilityValue
            ? !/^(否|no|n|false|0|隐藏)$/i.test(visibilityValue)
            : (previous?.homeVisible ?? true),
        };
        const changed =
          !previous ||
          JSON.stringify({ ...previous, updatedAt: undefined }) !==
            JSON.stringify({ ...base, updatedAt: undefined });
        const nextSchool = {
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
        if (previous) {
          next[matchIndex] = nextSchool;
          changed ? updated++ : unchanged++;
        } else {
          next.push(nextSchool);
          added++;
        }
      }
      setSchools(next);
      setStatus(
        `已读取「${imported.sheetName}」：新增 ${added} 所，更新 ${updated} 所，无变化 ${unchanged} 所，跳过 ${skipped} 行。已匹配院校会逐项覆盖表内非空新值；请点击页面顶部“保存全部变更”后同步前台。`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "导入失败，请检查文件格式。");
    }
  };
  return (
    <section className="editor-section">
      <div className="section-action">
        <div>
          <h1>院校管理</h1>
          <p>
            院校与专业共用同一套数据。全球 QS 优先、亚洲 QS 补位；支持
            XLSX、XLS、XLSM、CSV、TXT、ODS，系统按表头识别。
          </p>
        </div>
        {view === "schools" && (
          <button className="button dark" onClick={add}>
            + 新增院校
          </button>
        )}
      </div>
      <div className="nested-tabs">
        <button
          className={view === "schools" ? "selected" : ""}
          onClick={() => setView("schools")}
        >
          院校列表
        </button>
        <button
          className={view === "majors" ? "selected" : ""}
          onClick={() => setView("majors")}
        >
          专业管理
        </button>
      </div>
      {view === "schools" ? (
        <>
          <div className="manager-actions">
            <ImportActions
              onTemplate={downloadSchoolTemplate}
              onImport={importSchools}
              onExport={exportSchools}
            />
            <label className="manager-search">
              <span>查找院校</span>
              <input
                value={schoolQuery}
                onChange={(event) => setSchoolQuery(event.target.value)}
                placeholder="学校名、韩文名、城市、排名或 ID"
              />
            </label>
          </div>
          <div className="bulk-school-actions">
            <span>已选 {selectedIds.length} 所</span>
            <button
              className="button dark"
              disabled={!selectedIds.length}
              onClick={() => setBatchVisibility(true)}
            >
              批量显示主页
            </button>
            <button
              className="button ghost"
              disabled={!selectedIds.length}
              onClick={() => setBatchVisibility(false)}
            >
              批量隐藏主页
            </button>
          </div>
          {status && <p className="import-status">{status}</p>}
          <p className="search-summary">
            显示 {filteredSchools.length} / {schools.length} 所院校；排序：主页显示优先 →
            全球 QS → 亚洲 QS → 暂无排名。
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="select-column">
                    <input
                      type="checkbox"
                      checked={
                        filteredSchools.length > 0 &&
                        filteredSchools.every((school) => selectedIds.includes(school.id))
                      }
                      onChange={toggleAllFiltered}
                      aria-label="全选当前筛选结果"
                    />
                  </th>
                  <th>院校</th>
                  <th className="qs-column">QS 排名</th>
                  <th className="updated-column">最后更新时间</th>
                  <th>主页</th>
                  <th>城市 / 类型</th>
                  <th>适用学历</th>
                  <th>专业</th>
                  <th>简介 / 官网</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => (
                  <tr key={school.id}>
                    <td className="select-column">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(school.id)}
                        onChange={() => toggleSelected(school.id)}
                        aria-label={`选择${school.name}`}
                      />
                    </td>
                    <td>
                      <small>ID：{school.id}</small>
                      <div className="school-name-line">
                        {isHomeVisible(school) && (
                          <span
                            className="home-visible-check"
                            title="已显示在主页"
                            aria-label="已显示在主页"
                          >
                            ✓
                          </span>
                        )}
                        <input
                          value={school.name}
                          onChange={(e) => update(school.id, "name", e.target.value)}
                        />
                      </div>
                      <small>{school.nameKr}</small>
                      <input
                        value={school.nameKr}
                        onChange={(e) => update(school.id, "nameKr", e.target.value)}
                      />
                    </td>
                    <td className="qs-column">
                      <b className="qs-admin-label">{schoolQsLabel(school)}</b>
                      <label>
                        <span>全球</span>
                        <input
                          value={effectiveWorldQsRank(school)}
                          onChange={(e) => {
                            const value = cleanQsRank(e.target.value);
                            setSchools(
                              schools.map((item) =>
                                item.id === school.id
                                  ? {
                                      ...item,
                                      worldQsRank: value,
                                      rank:
                                        qsRankStart(value) === Number.POSITIVE_INFINITY
                                          ? 0
                                          : qsRankStart(value),
                                      updatedAt: updateMonth(),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          placeholder="如 42"
                        />
                      </label>
                      <label>
                        <span>亚洲</span>
                        <input
                          value={cleanQsRank(school.asiaQsRank)}
                          onChange={(e) =>
                            update(school.id, "asiaQsRank", cleanQsRank(e.target.value))
                          }
                          placeholder="如 201-250"
                        />
                      </label>
                    </td>
                    <td className="updated-column">
                      <input
                        className="month-input"
                        value={school.updatedAt || updateMonth()}
                        onChange={(e) => update(school.id, "updatedAt", e.target.value)}
                        aria-label={`${school.name}最后更新时间`}
                      />
                    </td>
                    <td>
                      <button
                        className={`visibility-pill ${isHomeVisible(school) ? "showing" : "hidden"}`}
                        onClick={() =>
                          setSchools(
                            schools.map((item) =>
                              item.id === school.id
                                ? {
                                    ...item,
                                    homeVisible: !isHomeVisible(item),
                                    updatedAt: updateMonth(),
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {isHomeVisible(school) ? "显示" : "隐藏"}
                      </button>
                    </td>
                    <td>
                      <input
                        value={school.city}
                        onChange={(e) => update(school.id, "city", e.target.value)}
                      />
                      <input
                        value={school.type}
                        onChange={(e) => update(school.id, "type", e.target.value)}
                      />
                    </td>
                    <td>
                      <DegreeTabs
                        values={school.degrees}
                        onChange={(values) => update(school.id, "degrees", values)}
                      />
                    </td>
                    <td>
                      <input
                        value={school.majors.join("|")}
                        onChange={(e) =>
                          update(school.id, "majors", splitValues(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={school.intro}
                        onChange={(e) => update(school.id, "intro", e.target.value)}
                        rows={3}
                      />
                      <input
                        placeholder="官网链接（可选）"
                        value={school.website || ""}
                        onChange={(e) => update(school.id, "website", e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className="danger"
                        onClick={() => {
                          setSelectedIds((current) =>
                            current.filter((id) => id !== school.id),
                          );
                          setSchools(schools.filter((item) => item.id !== school.id));
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <MajorManager
          schools={schools}
          setSchools={setSchools}
          onStatus={setStatus}
          status={status}
        />
      )}
    </section>
  );
}
