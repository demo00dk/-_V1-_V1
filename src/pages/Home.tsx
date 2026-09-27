import React, { useMemo, useState } from "react";
import { degreeOptions } from "../domain/catalog";
import {
  compareSchoolsByQs,
  isHomeVisible,
  publicSchoolQsLabel,
} from "../domain/rankings";
import type { Page, School, SiteData } from "../domain/types";

export function Home({
  site,
  navigate,
  onContact,
}: {
  site: SiteData;
  navigate: (page: Page) => void;
  onContact: () => void;
}) {
  const heroLines = site.brand.heroTitle.split("\n");
  const visibleSchoolCount = site.schools.filter(isHomeVisible).length;
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">{site.brand.eyebrow}</p>
          <h1>
            {heroLines.map((line, i) => (
              <span key={line}>
                {line}
                {i < heroLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="hero-summary">{site.brand.heroSummary}</p>
          <div className="hero-actions">
            <button className="button dark" onClick={() => navigate("matcher")}>
              30 秒生成初筛方案 <b>→</b>
            </button>
            <button className="button ghost" onClick={() => navigate("resources")}>
              先领公开工具
            </button>
          </div>
          <p className="micro-note">规则可见 · 顾问可校正 · 不用先留下联系方式</p>
        </div>
        <div className="hero-map" aria-label="从准备到抵达的韩国留学行程图">
          <div className="route-head">
            <div>
              <span className="route-kicker">KOREA STUDY ROUTE</span>
              <b>你的韩国留学行程单</b>
            </div>
            <span className="route-destination">
              中国出发 <i>→</i> 韩国抵达
            </span>
          </div>
          <div className="route-guide">
            {site.journeyMap.map((node, index) => (
              <button
                className={`route-step step-${index + 1}`}
                key={node.id}
                onClick={() => navigate(node.link)}
              >
                <span className="route-count">0{index + 1}</span>
                <span className="route-dot" aria-hidden="true" />
                <div className="route-copy">
                  <small>{node.stage}</small>
                  <b>
                    {node.title.split("\n").map((line, lineIndex) => (
                      <React.Fragment key={`${node.id}-${lineIndex}`}>
                        {line}
                        {lineIndex < node.title.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </b>
                  <p>{node.summary}</p>
                </div>
                <span className="route-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
          <div className="route-footer">
            <span>从选择到落地，每一步都有清楚的下一项。</span>
            <button onClick={() => navigate("matcher")}>
              先做院校匹配 <b>→</b>
            </button>
          </div>
        </div>
      </section>
      <section className="quick-start section-shell" aria-label="快速开始">
        <div className="quick-start-heading">
          <span>从这里开始</span>
          <p>你现在想了解什么？</p>
        </div>
        {(
          [
            ["schools", "01", "了解院校", "地区、排名与学校特色"],
            ["majors", "02", "找到专业", "从兴趣反查开设院校"],
            ["matcher", "03", "生成方案", "结合你的背景做初筛"],
            ["resources", "04", "准备材料", "可分享的签证清单"],
          ] as const
        ).map(([target, number, title, subtitle]) => (
          <button key={target} onClick={() => navigate(target)}>
            <span className="quick-index">{number}</span>
            <span>
              <b>{title}</b>
              <small>{subtitle}</small>
            </span>
            <i aria-hidden="true">↗</i>
          </button>
        ))}
      </section>
      <section className="stats-strip section-shell">
        <div>
          <b>{visibleSchoolCount}</b>
          <span>所精选院校</span>
        </div>
        <div>
          <b>
            {new Set(site.schools.filter(isHomeVisible).flatMap((s) => s.majors)).size}
          </b>
          <span>个专业方向</span>
        </div>
        <div>
          <b>{degreeOptions.length}</b>
          <span>个学历入口</span>
        </div>
        <div>
          <b>1</b>
          <span>份清楚行动单</span>
        </div>
      </section>
      <HomeSchoolShelf schools={site.schools} navigate={navigate} onContact={onContact} />
      <section className="section-shell section-intro">
        <p className="eyebrow">从信息到行动</p>
        <div className="split-heading">
          <h2>
            申请路上的每一步，
            <br />
            <em>都能心里有数。</em>
          </h2>
          <p>
            先让你自己看懂院校、专业和时间节点；在需要判断、材料复核或跨境协调时，再决定要不要让顾问介入。
          </p>
        </div>
      </section>
      <section className="section-shell service-grid">
        {site.serviceSteps.map((step) => (
          <button
            className="service-card"
            key={step.id}
            onClick={() => navigate(step.link)}
          >
            <span>{step.index}</span>
            <h3>{step.title}</h3>
            <p>{step.summary}</p>
            <b>进入 →</b>
          </button>
        ))}
      </section>
      <section className="section-shell feature-split">
        <div className="feature-paper">
          <p className="eyebrow">核心产品</p>
          <h2>
            先匹配，再咨询。
            <br />
            理由也一并给你。
          </h2>
          <p>
            综合学历、GPA、语言、预算和意向专业，为你整理有依据的选校清单。每条推荐都能看到适用原因与适用边界。
          </p>
          <button className="button red" onClick={() => navigate("matcher")}>
            开始匹配 <b>→</b>
          </button>
        </div>
        <div className="feature-rule">
          <span className="rule-kicker">demo MATCH / 01</span>
          <h3>本科插班 / 一年制专升本 · 计算机方向</h3>
          <div className="rule-bar">
            <i style={{ width: "87%" }} />
          </div>
          <dl>
            <div>
              <dt>匹配依据</dt>
              <dd>前置专业、语言、成绩、预算</dd>
            </div>
            <div>
              <dt>输出内容</dt>
              <dd>冲刺 / 稳妥 / 保底院校与专业</dd>
            </div>
          </dl>
          <button onClick={onContact} className="underlined">
            让顾问按真实材料校正 →
          </button>
        </div>
      </section>
      <section className="section-shell resource-panel">
        <div>
          <p className="eyebrow">建立信任的公开工具</p>
          <h2>不用咨询，也能拿走。</h2>
        </div>
        <div className="resource-list">
          {site.resources.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                navigate(
                  item.id === "arrival"
                    ? "arrival"
                    : item.id === "schedule"
                      ? "journey"
                      : "resources",
                )
              }
            >
              <span>{item.label}</span>
              <b>{item.title}</b>
              <small>{item.desc}</small>
              <em>→</em>
            </button>
          ))}
        </div>
      </section>
      <p className="compliance-note section-shell">{site.brand.notice}</p>
    </>
  );
}

export function HomeSchoolShelf({
  schools,
  navigate,
  onContact,
}: {
  schools: School[];
  navigate: (page: Page) => void;
  onContact: () => void;
}) {
  const [page, setPage] = useState(0);
  const visibleSchools = useMemo(
    () => schools.filter(isHomeVisible).sort(compareSchoolsByQs),
    [schools],
  );
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(visibleSchools.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const records = visibleSchools.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );
  return (
    <section className="section-shell home-school-shelf">
      <header>
        <div>
          <p className="eyebrow">EXPLORE / 探索韩国院校</p>
          <h2>从 {visibleSchools.length} 所院校，找到你的方向</h2>
          <p>了解学校，再比较专业。全球 QS 优先排序，亚洲 QS 作为补充参考。</p>
        </div>
        <button
          type="button"
          className="button ghost"
          onClick={() => navigate("schools")}
        >
          进入完整院校库 →
        </button>
      </header>
      <div className="home-school-grid">
        {records.map((school) => (
          <article key={school.id}>
            <div className="home-school-meta">
              <small>
                {school.type} · {school.city}
              </small>
              {publicSchoolQsLabel(school) && <b>{publicSchoolQsLabel(school)}</b>}
            </div>
            <h3>{school.name}</h3>
            <span>{school.nameKr}</span>
            <p>
              {school.majors.length
                ? school.majors.slice(0, 3).join(" · ")
                : "了解课程、申请要求与校园生活"}
            </p>
            <button type="button" onClick={onContact}>
              咨询该校方案 →
            </button>
          </article>
        ))}
      </div>
      <footer>
        <span>
          第 {safePage + 1} / {pageCount} 页 · 每页 {pageSize} 所
        </span>
        <div>
          <button
            type="button"
            className="button ghost"
            disabled={safePage === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            上一页
          </button>
          <button
            type="button"
            className="button dark"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            下一页
          </button>
        </div>
      </footer>
    </section>
  );
}
