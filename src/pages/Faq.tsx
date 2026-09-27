import { PageTitle } from "../components/content";
import type { SiteData } from "../domain/types";

export function Faq({ site }: { site: SiteData }) {
  return (
    <section className="page section-shell">
      <PageTitle
        overline="FAQ"
        title="把容易踩坑的地方，先说清楚。"
        text="重要的招生、签证和入境信息都应以当期主管机关及学校通知为准。"
      />
      <div className="faq-list">
        {site.faqs.map((faq) => (
          <details key={faq.id}>
            <summary>
              {faq.q}
              <span>+</span>
            </summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
