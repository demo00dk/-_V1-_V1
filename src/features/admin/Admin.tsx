import { useEffect, useState } from "react";
import { Field } from "../../components/forms";
import { clone } from "../../domain/text";
import type { Page, SiteData } from "../../domain/types";
import { saveSite, StaleSiteError } from "../../lib/api";
import { ContentEditor } from "./ContentEditor";
import { MajorGroupManager } from "./MajorGroupManager";
import { RuleEditor } from "./RuleEditor";
import { SchoolEditor } from "./SchoolEditor";

export function Admin({
  site,
  setSite,
  navigate,
}: {
  site: SiteData;
  setSite: (site: SiteData) => void;
  navigate: (page: Page) => void;
}) {
  const [draft, setDraft] = useState<SiteData>(() => clone(site));
  const [tab, setTab] = useState<
    | "overview"
    | "brand"
    | "schools"
    | "majorGroups"
    | "rules"
    | "content"
    | "leads"
    | "all"
  >("overview");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<SiteData | null>(null);
  const [raw, setRaw] = useState(() => JSON.stringify(site, null, 2));
  useEffect(() => {
    setDraft(clone(site));
    setRaw(JSON.stringify(site, null, 2));
  }, [site]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setStatus("保存中…");
    try {
      const next = await saveSite(draft);
      setSite(next);
      setConflict(null);
      setStatus(
        `已保存，前台已于 ${new Date(next.meta.updatedAt).toLocaleTimeString()} 同步。`,
      );
    } catch (e) {
      if (e instanceof StaleSiteError) {
        setConflict(e.latest);
        setStatus(
          "服务器已有更新，本地草稿已保留且没有覆盖新数据。请先导出草稿，再载入最新内容。",
        );
      } else setStatus(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };
  const upload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as SiteData;
        setDraft(next);
        setRaw(JSON.stringify(next, null, 2));
        setStatus("已载入文件，点击“保存全部变更”后同步前台。");
      } catch {
        setStatus("文件不是有效的内容 JSON。");
      }
    };
    reader.readAsText(file);
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `demo-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const setBrand = (key: keyof SiteData["brand"], value: string) =>
    setDraft({ ...draft, brand: { ...draft.brand, [key]: value } });
  const setConsultant = (key: keyof SiteData["consultant"], value: string) =>
    setDraft({ ...draft, consultant: { ...draft.consultant, [key]: value } });
  return (
    <section className="admin">
      <header className="admin-top">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark">D</span>
          <span>
            demo后台<small>CONTENT CONTROL ROOM</small>
          </span>
        </button>
        <div>
          <button className="button ghost" onClick={download}>
            导出全部内容
          </button>
          <label className="button ghost file-button">
            导入内容
            <input
              type="file"
              accept="application/json"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <button className="button red" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存全部变更"}
          </button>
        </div>
      </header>
      <div className="admin-layout">
        <aside>
          <p>内容中台</p>
          {(
            [
              ["overview", "概览"],
              ["brand", "品牌与顾问"],
              ["schools", "院校管理"],
              ["majorGroups", "专业关联"],
              ["rules", "匹配规则"],
              ["content", "流程与资料"],
              ["leads", "咨询线索"],
              ["all", "完整内容 JSON"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "selected" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
          <small>演示环境：所有保存操作会立即写入 API 数据源，并同步前台。</small>
        </aside>
        <div className="admin-work">
          <div className="admin-status">
            <span role="status">
              {status || "当前为草稿状态；保存后前后台即刻联动。"}
            </span>
            {conflict && (
              <button
                className="button ghost"
                onClick={() => {
                  setSite(conflict);
                  setConflict(null);
                  setStatus("已载入最新内容，可以继续编辑。");
                }}
              >
                载入最新内容
              </button>
            )}
            <button className="underlined" onClick={() => navigate("home")}>
              前台预览 →
            </button>
          </div>
          {tab === "overview" && <AdminOverview draft={draft} />}
          {tab === "brand" && (
            <section className="editor-section">
              <h1>品牌与咨询入口</h1>
              <p>这里修改的主标题、公告和二维码跳转，会在全部前台页面同步显示。</p>
              <div className="form-grid">
                <Field label="品牌名称">
                  <input
                    value={draft.brand.name}
                    onChange={(e) => setBrand("name", e.target.value)}
                  />
                </Field>
                <Field label="顶部说明">
                  <input
                    value={draft.brand.eyebrow}
                    onChange={(e) => setBrand("eyebrow", e.target.value)}
                  />
                </Field>
                <Field label="首页主标题">
                  <textarea
                    value={draft.brand.heroTitle}
                    onChange={(e) => setBrand("heroTitle", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label="首页摘要">
                  <textarea
                    value={draft.brand.heroSummary}
                    onChange={(e) => setBrand("heroSummary", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label="合规提示">
                  <textarea
                    value={draft.brand.notice}
                    onChange={(e) => setBrand("notice", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label="顾问名称">
                  <input
                    value={draft.consultant.name}
                    onChange={(e) => setConsultant("name", e.target.value)}
                  />
                </Field>
                <Field label="微信号">
                  <input
                    value={draft.consultant.wechat}
                    onChange={(e) => setConsultant("wechat", e.target.value)}
                  />
                </Field>
                <Field label="服务时间">
                  <input
                    value={draft.consultant.availability}
                    onChange={(e) => setConsultant("availability", e.target.value)}
                  />
                </Field>
                <Field label="二维码跳转地址">
                  <input
                    value={draft.consultant.qrTarget}
                    onChange={(e) => setConsultant("qrTarget", e.target.value)}
                  />
                </Field>
                <Field label="二维码旁的说明">
                  <textarea
                    value={draft.consultant.note}
                    onChange={(e) => setConsultant("note", e.target.value)}
                    rows={2}
                  />
                </Field>
              </div>
            </section>
          )}
          {tab === "schools" && (
            <SchoolEditor
              schools={draft.schools}
              setSchools={(schools) => setDraft({ ...draft, schools })}
            />
          )}
          {tab === "majorGroups" && (
            <MajorGroupManager
              schools={draft.schools}
              groups={draft.majorGroups || []}
              setGroups={(majorGroups) => setDraft({ ...draft, majorGroups })}
            />
          )}
          {tab === "rules" && (
            <RuleEditor
              rules={draft.recommendationRules}
              schools={draft.schools}
              setRules={(recommendationRules) =>
                setDraft({ ...draft, recommendationRules })
              }
            />
          )}
          {tab === "content" && <ContentEditor draft={draft} setDraft={setDraft} />}
          {tab === "leads" && (
            <section className="editor-section">
              <h1>咨询线索</h1>
              <p>来自前台“提交给顾问”的测试/真实表单线索会存放在这里。</p>
              <div className="lead-table">
                {draft.leads.length ? (
                  draft.leads.map((lead) => (
                    <article key={lead.id}>
                      <b>{lead.name || "未署名"}</b>
                      <span>{lead.contact || "未填写联系方式"}</span>
                      <p>{lead.intent || "未填写咨询意图"}</p>
                      <small>{new Date(lead.createdAt).toLocaleString()}</small>
                    </article>
                  ))
                ) : (
                  <div className="empty">还没有咨询线索。</div>
                )}
              </div>
            </section>
          )}
          {tab === "all" && (
            <section className="editor-section">
              <h1>完整内容 JSON</h1>
              <p>
                这是全站唯一内容源的完整副本。适合批量调整、迁移或通过模板批量导入；修改后点击应用，再保存。
              </p>
              <textarea
                className="json-editor"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={26}
              />
              <button
                className="button dark"
                onClick={() => {
                  try {
                    const next = JSON.parse(raw) as SiteData;
                    setDraft(next);
                    setStatus("JSON 已应用到草稿。");
                  } catch {
                    setStatus("JSON 格式不正确，未应用。");
                  }
                }}
              >
                应用 JSON 到草稿
              </button>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

export function AdminOverview({ draft }: { draft: SiteData }) {
  return (
    <section className="admin-overview">
      <p className="eyebrow">内容健康度</p>
      <h1>所有页面使用同一份内容源。</h1>
      <div>
        {[
          ["院校", draft.schools.length],
          ["专业关联组", (draft.majorGroups || []).length],
          ["推荐规则", draft.recommendationRules.length],
          ["流程节点", draft.serviceSteps.length],
          ["公益资料", draft.resources.length],
          ["咨询线索", draft.leads.length],
        ].map(([label, value]) => (
          <article key={String(label)}>
            <b>{value}</b>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <section>
        <h2>维护建议</h2>
        <p>
          每次招生季前依次更新：院校信息 → 专业关联 → 规则门槛 → 材料/流程 →
          二维码和顾问值班信息。前台不存重复内容，因此保存一次即可同步。
        </p>
      </section>
    </section>
  );
}
