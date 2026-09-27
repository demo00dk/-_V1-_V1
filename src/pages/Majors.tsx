import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "../components/content";
import { degreeOptions } from "../domain/catalog";
import { buildMajorCatalog } from "../domain/majors";
import { compareSchoolsByQs, publicSchoolQsLabel } from "../domain/rankings";
import type { MajorCatalogRecord, SiteData } from "../domain/types";
import { Pagination } from "../ui/Pagination";

export function Majors({ site }: { site: SiteData }) {
  const catalog = useMemo(() => buildMajorCatalog(site), [site]);
  const [query, setQuery] = useState("");
  const [degree, setDegree] = useState("全部");
  const [city, setCity] = useState("全部");
  const [college, setCollege] = useState("全部");
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
    setSelectedId("");
  }, [query, degree, city, college]);
  const cities = [
    "全部",
    ...Array.from(
      new Set(
        catalog.flatMap((entry) => entry.records.map((record) => record.school.city)),
      ),
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-CN")),
  ];
  const colleges = [
    "全部",
    ...Array.from(
      new Set(
        catalog.flatMap((entry) =>
          entry.records.map((record) => record.major.college || ""),
        ),
      ),
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-CN")),
  ];
  const recordMatches = (record: MajorCatalogRecord) =>
    (degree === "全部" ||
      (record.major.degrees || record.school.degrees).includes(degree)) &&
    (city === "全部" || record.school.city === city) &&
    (college === "全部" || record.major.college === college);
  const data = catalog.filter(
    (entry) =>
      entry.records.some(recordMatches) &&
      `${entry.name} ${entry.aliases.join(" ")} ${entry.records.map((record) => `${record.school.name} ${record.school.nameKr} ${record.major.college || ""}`).join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(data.length / 30));
  const currentPage = Math.min(page, pageCount - 1);
  const entries = data.slice(currentPage * 30, (currentPage + 1) * 30);
  const selected = entries.find((entry) => entry.id === selectedId) || entries[0];
  const selectedRecords = selected ? selected.records.filter(recordMatches) : [];
  const selectedSchools = selected
    ? Array.from(
        new Map(
          selectedRecords.map((record) => [record.school.id, record.school]),
        ).values(),
      ).sort(compareSchoolsByQs)
    : [];
  return (
    <section className="page section-shell major-library-page">
      <PageTitle
        overline="专业与院校交叉索引"
        title="先看专业，再反查开设院校。"
        text="按专业方向了解开设院校，结合学历、地区和学院筛选，比较各校的具体专业名称。"
      />
      <div className="filter-bar major-filter-bar">
        <label>
          搜索
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="专业、学院或学校名称"
          />
        </label>
        <label>
          学历
          <select value={degree} onChange={(event) => setDegree(event.target.value)}>
            <option>全部</option>
            {degreeOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          城市
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            {cities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          学院
          <select value={college} onChange={(event) => setCollege(event.target.value)}>
            {colleges.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <span>当前 {data.length} 个专业</span>
      </div>
      <div className="major-library-layout">
        <div className="major-catalog">
          <div className="catalog-heading">
            <span>专业目录</span>
            <small>点击专业查看院校</small>
          </div>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={data.length}
            label="专业分页"
            unit="个专业"
            onChange={(next) => {
              setPage(next);
              setSelectedId("");
              document.querySelector(".major-catalog")?.scrollTo({ top: 0 });
            }}
          />
          {entries.map((entry, index) => {
            const schoolCount = new Set(
              entry.records.filter(recordMatches).map((record) => record.school.id),
            ).size;
            const degrees = degreeOptions.filter((item) =>
              entry.records.some((record) =>
                (record.major.degrees || record.school.degrees).includes(item),
              ),
            );
            return (
              <button
                type="button"
                key={entry.id}
                className={selected?.id === entry.id ? "active" : ""}
                onClick={() => setSelectedId(entry.id)}
              >
                <span>{String(currentPage * 30 + index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{entry.name}</b>
                  <small>
                    {entry.grouped
                      ? `包含 ${entry.aliases.length} 种专业名称`
                      : entry.records.length > 1
                        ? "同名专业已汇总"
                        : "查看开设院校"}
                  </small>
                  <div>
                    {degrees.map((item) => (
                      <i key={item}>{item}</i>
                    ))}
                  </div>
                </div>
                <strong>
                  {schoolCount}
                  <small>所院校</small>
                </strong>
              </button>
            );
          })}
          {!data.length && (
            <div className="empty">没有符合当前条件的专业，请调整搜索或筛选条件。</div>
          )}
        </div>
        <aside className="major-school-results">
          {selected ? (
            <>
              <header>
                <span>{selected.grouped ? "MANUALLY LINKED" : "MAJOR INDEX"}</span>
                <h2>{selected.name}</h2>
                <p>{selected.aliases.join(" · ")}</p>
                <div>
                  <b>{selectedSchools.length}</b>
                  <small>所院校开设</small>
                </div>
              </header>
              <div className="major-school-list-public">
                {selectedSchools.map((school) => {
                  const names = selectedRecords
                    .filter((record) => record.school.id === school.id)
                    .map((record) => record.major.name);
                  return (
                    <article key={school.id}>
                      <div>
                        <span>
                          {school.type} · {school.city}
                        </span>
                        {publicSchoolQsLabel(school) && (
                          <b>{publicSchoolQsLabel(school)}</b>
                        )}
                      </div>
                      <h3>
                        {school.name}
                        <small>{school.nameKr}</small>
                      </h3>
                      <p>{Array.from(new Set(names)).join(" · ")}</p>
                    </article>
                  );
                })}
              </div>
              {!selectedSchools.length && (
                <div className="empty">当前筛选条件下暂无开设院校。</div>
              )}
            </>
          ) : (
            <div className="major-detail-empty">
              <span>MAJOR / SCHOOL</span>
              <h2>选择一个专业</h2>
              <p>右侧将显示开设院校、排名和该校采用的具体专业名称。</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
