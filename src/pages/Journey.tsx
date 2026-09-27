import { ChecklistCard, PageTitle } from "../components/content";
import type { Page, SiteData } from "../domain/types";

export function Journey({
  site,
  navigate,
}: {
  site: SiteData;
  navigate: (page: Page) => void;
}) {
  return (
    <section className="page section-shell">
      <PageTitle
        overline="申请到签证"
        title="重要节点，先变成可执行的待办。"
        text="公开版提供材料整理框架；每所学校、使领馆和个人身份的实际要求可能不同。"
      />
      <div className="journey-line">
        {site.serviceSteps.slice(0, 3).map((step) => (
          <button key={step.id} onClick={() => navigate(step.link)}>
            <span>{step.index}</span>
            <b>{step.title}</b>
            <p>{step.summary}</p>
          </button>
        ))}
      </div>
      <div className="checklist-grid">
        {site.checklists.slice(0, 2).map((list) => (
          <ChecklistCard key={list.id} list={list} />
        ))}
      </div>
      <div className="notice-box">
        <span>重要提示</span>
        <p>{site.brand.notice}</p>
        <button className="button ghost" onClick={() => navigate("faq")}>
          查看常见问题
        </button>
      </div>
    </section>
  );
}
