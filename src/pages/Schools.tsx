import { useMemo, useState } from "react";
import { PageTitle } from "../components/content";
import { degreeOptions } from "../domain/catalog";
import {
  compareSchoolsByQs,
  isHomeVisible,
  publicSchoolQsLabel,
} from "../domain/rankings";
import type { SiteData } from "../domain/types";
import { Pagination } from "../ui/Pagination";

export function Schools({ site }: { site: SiteData }) {
  const [query, setQuery] = useState("");
  const [degree, setDegree] = useState("全部");
  const [city, setCity] = useState("全部");
  const [page, setPage] = useState(0);
  const visibleSchools = useMemo(
    () => site.schools.filter(isHomeVisible),
    [site.schools],
  );
  const cities = [
    "全部",
    ...Array.from(new Set(visibleSchools.map((school) => school.city))).filter(Boolean),
  ];
  const data = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return visibleSchools
      .filter(
        (school) =>
          (degree === "全部" || school.degrees.includes(degree)) &&
          (city === "全部" || school.city === city) &&
          `${school.name} ${school.nameKr} ${school.majors.join(" ")} ${school.tags.join(" ")}`
            .toLowerCase()
            .includes(keyword),
      )
      .sort(compareSchoolsByQs);
  }, [visibleSchools, query, degree, city]);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const reset = () => {
    setQuery("");
    setDegree("全部");
    setCity("全部");
    setPage(0);
  };
  const changePage = (next: number) => {
    setPage(next);
    document
      .getElementById("school-results")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  return (
    <section className="page section-shell school-library-page">
      <PageTitle
        overline="UNIVERSITY / 韩国院校库"
        title="找到适合你的下一站。"
        text="从地区、学历和专业方向出发，了解学校特色，建立自己的选校清单。"
      />
      <div className="filter-bar">
        <label>
          搜索院校
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="学校、专业或关键词"
          />
        </label>
        <label>
          申请学历
          <select
            value={degree}
            onChange={(e) => {
              setDegree(e.target.value);
              setPage(0);
            }}
          >
            <option>全部</option>
            {degreeOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          所在城市
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(0);
            }}
          >
            {cities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button
          className="filter-reset"
          onClick={reset}
          disabled={!query && degree === "全部" && city === "全部"}
        >
          重置筛选
        </button>
      </div>
      <div className="results-toolbar" id="school-results">
        <span role="status">
          找到 <b>{data.length}</b> 所院校
        </span>
        <small>全球 QS 优先 · 亚洲 QS 补充</small>
      </div>
      <div className="school-grid">
        {data.slice(safePage * pageSize, (safePage + 1) * pageSize).map((school) => (
          <article className="school-card compact-school-card" key={school.id}>
            <div className="school-cap">
              <span>
                {school.type} · {school.city}
              </span>
              {publicSchoolQsLabel(school) && <b>{publicSchoolQsLabel(school)}</b>}
            </div>
            <h2>
              {school.name}
              <small>{school.nameKr}</small>
            </h2>
            <p>{school.intro}</p>
          </article>
        ))}
      </div>
      {!data.length ? (
        <div className="empty">
          <b>没有找到符合条件的院校</b>
          <p>试试更简短的关键词，或放宽学历、城市条件。</p>
          <button className="button dark" onClick={reset}>
            清空条件，查看全部院校
          </button>
        </div>
      ) : (
        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={data.length}
          onChange={changePage}
        />
      )}
    </section>
  );
}
