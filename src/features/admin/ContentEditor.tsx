import { Field } from "../../components/forms";
import { updateMonth } from "../../domain/dates";
import type { JourneyMapNode, SiteData, Step, VisaGuide } from "../../domain/types";
import { getVisaGuides } from "../../domain/visa";

export function ContentEditor({
  draft,
  setDraft,
}: {
  draft: SiteData;
  setDraft: (value: SiteData) => void;
}) {
  const updateStep = (id: string, key: keyof Step, value: string) =>
    setDraft({
      ...draft,
      serviceSteps: draft.serviceSteps.map((step) =>
        step.id === id ? ({ ...step, [key]: value } as Step) : step,
      ),
    });
  const updateMap = (id: string, key: keyof JourneyMapNode, value: string) =>
    setDraft({
      ...draft,
      journeyMap: draft.journeyMap.map((node) =>
        node.id === id ? ({ ...node, [key]: value } as JourneyMapNode) : node,
      ),
    });
  const updateFaq = (id: string, key: "q" | "a", value: string) =>
    setDraft({
      ...draft,
      faqs: draft.faqs.map((faq) => (faq.id === id ? { ...faq, [key]: value } : faq)),
    });
  const visaGuides = getVisaGuides(draft);
  const updateVisaGuide = (id: string, key: keyof VisaGuide, value: string | string[]) =>
    setDraft({
      ...draft,
      visaGuides: visaGuides.map((guide) =>
        guide.id === id
          ? ({
              ...guide,
              [key]: value,
              updatedAt: key === "updatedAt" ? String(value) : updateMonth(),
            } as VisaGuide)
          : guide,
      ),
    });
  return (
    <section className="editor-section">
      <h1>流程、资料与 FAQ</h1>
      <p>
        主页、行动地图、申请流程、抵韩安顿与公益工具都从此处读取。复杂批量变更可使用完整
        JSON 编辑器。
      </p>
      <h2>首页行动地图</h2>
      <div className="content-list map-content-list">
        {draft.journeyMap.map((node) => (
          <article key={node.id}>
            <input
              aria-label="阶段"
              value={node.stage}
              onChange={(e) => updateMap(node.id, "stage", e.target.value)}
            />
            <textarea
              aria-label="地图标题（支持换行）"
              value={node.title}
              onChange={(e) => updateMap(node.id, "title", e.target.value)}
              rows={3}
            />
            <textarea
              aria-label="地图说明"
              value={node.summary}
              onChange={(e) => updateMap(node.id, "summary", e.target.value)}
              rows={2}
            />
          </article>
        ))}
      </div>
      <h2>主页服务入口</h2>
      <div className="content-list">
        {draft.serviceSteps.map((step) => (
          <article key={step.id}>
            <input
              value={step.index}
              onChange={(e) => updateStep(step.id, "index", e.target.value)}
            />
            <input
              value={step.title}
              onChange={(e) => updateStep(step.id, "title", e.target.value)}
            />
            <textarea
              value={step.summary}
              onChange={(e) => updateStep(step.id, "summary", e.target.value)}
              rows={2}
            />
          </article>
        ))}
      </div>
      <h2>D-2 / D-4 材料卡</h2>
      <p>每行填写一项材料或提醒。保存后，前台卡片和用户复制的分享图片会一起更新。</p>
      <div className="visa-guide-editor">
        {visaGuides.map((guide) => (
          <article key={guide.id}>
            <header>
              <b>{guide.label}</b>
              <span>{guide.visa}</span>
              <input
                aria-label={`${guide.label}更新时间`}
                value={guide.updatedAt}
                onChange={(event) =>
                  updateVisaGuide(guide.id, "updatedAt", event.target.value)
                }
              />
            </header>
            <div>
              <Field label="卡片标题">
                <input
                  value={guide.title}
                  onChange={(event) =>
                    updateVisaGuide(guide.id, "title", event.target.value)
                  }
                />
              </Field>
              <Field label="适用课程">
                <input
                  value={guide.qualification}
                  onChange={(event) =>
                    updateVisaGuide(guide.id, "qualification", event.target.value)
                  }
                />
              </Field>
              <Field label="卡片说明">
                <textarea
                  rows={2}
                  value={guide.intro}
                  onChange={(event) =>
                    updateVisaGuide(guide.id, "intro", event.target.value)
                  }
                />
              </Field>
              <Field label="材料清单（每行一项）">
                <textarea
                  rows={11}
                  value={guide.materials.join("\n")}
                  onChange={(event) =>
                    updateVisaGuide(
                      guide.id,
                      "materials",
                      event.target.value
                        .split(/\r?\n/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
              <Field label="提交前提醒（每行一项）">
                <textarea
                  rows={4}
                  value={guide.reminders.join("\n")}
                  onChange={(event) =>
                    updateVisaGuide(
                      guide.id,
                      "reminders",
                      event.target.value
                        .split(/\r?\n/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
            </div>
          </article>
        ))}
      </div>
      <h2>FAQ</h2>
      <div className="content-list">
        {draft.faqs.map((faq) => (
          <article key={faq.id}>
            <input
              value={faq.q}
              onChange={(e) => updateFaq(faq.id, "q", e.target.value)}
            />
            <textarea
              value={faq.a}
              onChange={(e) => updateFaq(faq.id, "a", e.target.value)}
              rows={3}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
