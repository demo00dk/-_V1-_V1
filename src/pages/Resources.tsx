import { useRef, useState } from "react";
import { PageTitle } from "../components/content";
import type { Page, SiteData } from "../domain/types";
import {
  getVisaGuides,
  visaCategoryMeta,
  visaCategoryOrder,
  visaGuideBadge,
  visaGuideCategory,
} from "../domain/visa";
import { createVisaShareCard, downloadBlob } from "../lib/share-card";

export function Resources({
  site,
  navigate,
}: {
  site: SiteData;
  navigate: (page: Page) => void;
}) {
  const guides = getVisaGuides(site);
  const [visaOpen, setVisaOpen] = useState(false);
  const [guideId, setGuideId] = useState(guides[0]?.id || "bachelor-high");
  const [shareStatus, setShareStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const visaRef = useRef<HTMLElement>(null);
  const guide = guides.find((item) => item.id === guideId) || guides[0];
  const categories = visaCategoryOrder
    .map((id) => ({
      id,
      ...visaCategoryMeta[id],
      guide: guides.find((item) => visaGuideCategory(item) === id),
    }))
    .filter((item) => item.guide);
  const activeCategory = visaGuideCategory(guide);
  const bachelorGuides = guides.filter((item) => visaGuideCategory(item) === "bachelor");
  const openVisa = () => {
    setVisaOpen(true);
    setTimeout(
      () => visaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20,
    );
  };
  const makeCard = async (mode: "copy" | "download") => {
    if (!guide || sharing) return;
    setSharing(true);
    setShareStatus("正在生成分享卡…");
    try {
      const fileName = `demo-${guide.visa}-${guide.label}材料清单.png`;
      const blobPromise = createVisaShareCard(
        guide,
        site.brand.name,
        site.consultant.wechat,
      );
      // Start clipboard access during the click event; browsers may expire user activation after canvas rendering.
      if (mode === "copy" && navigator.clipboard?.write && "ClipboardItem" in window) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blobPromise }),
          ]);
          setShareStatus("卡片截图已复制，打开微信粘贴即可。");
          return;
        } catch {
          const blob = await blobPromise;
          downloadBlob(blob, fileName);
          setShareStatus("浏览器未允许复制图片，已自动下载，可直接发送到微信。");
          return;
        }
      }
      const blob = await blobPromise;
      const file = new File([blob], fileName, { type: "image/png" });
      if (mode === "copy" && navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${guide.visa} ${guide.label}材料清单`,
          });
          setShareStatus("已打开系统分享。");
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            setShareStatus("已取消分享，仍可下载图片备用。");
            return;
          }
        }
      }
      downloadBlob(blob, fileName);
      setShareStatus(
        mode === "download"
          ? "图片已下载，可以发送到微信。"
          : "当前设备不支持复制图片，已自动下载作为备用。",
      );
    } catch {
      setShareStatus("图片生成失败，请重试或联系顾问获取清单。");
    } finally {
      setSharing(false);
    }
  };
  const chooseGuide = (id: string) => {
    if (sharing) return;
    setGuideId(id);
    setShareStatus("");
  };
  return (
    <section className="page section-shell resources-page">
      <PageTitle
        overline="公开工具与资料"
        title="先给能解决问题的资料，再谈服务。"
        text="每份资料都是可复用的行动框架，帮助你更快识别下一步要准备什么。"
      />
      <div className="tool-grid">
        {site.resources.map((resource) => (
          <article
            key={resource.id}
            className={resource.id === "visa" ? "featured-tool" : ""}
          >
            <span>{resource.type}</span>
            <h2>{resource.title}</h2>
            <p>{resource.desc}</p>
            <button
              className="underlined"
              onClick={() =>
                resource.id === "visa"
                  ? openVisa()
                  : navigate(
                      resource.id === "arrival"
                        ? "arrival"
                        : resource.id === "schedule"
                          ? "journey"
                          : "faq",
                    )
              }
            >
              打开工具 →
            </button>
          </article>
        ))}
      </div>
      {visaOpen && guide && (
        <section className="visa-tool" ref={visaRef}>
          <header className="visa-tool-head">
            <div>
              <span>FREE VISA CHECKLIST</span>
              <h2>选择你的课程，生成对应材料卡。</h2>
              <p>先按签证小类核对基础材料，再向学校和所属领区确认金额、时效及追加项。</p>
            </div>
            <strong>
              D-2<small>/ D-4</small>
            </strong>
          </header>
          <nav className="visa-degree-tabs" aria-label="签证课程类型">
            {categories.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={item.id === activeCategory ? "active" : ""}
                aria-pressed={item.id === activeCategory}
                onClick={() => chooseGuide(item.guide!.id)}
              >
                <span>0{index + 1}</span>
                <b>{item.label}</b>
                <small>{item.visa}</small>
              </button>
            ))}
          </nav>
          {activeCategory === "bachelor" && bachelorGuides.length > 1 && (
            <nav className="visa-bachelor-tabs" aria-label="本科申请学历类型">
              <span>选择本科路径</span>
              {bachelorGuides.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={item.id === guide.id ? "active" : ""}
                  aria-pressed={item.id === guide.id}
                  onClick={() => chooseGuide(item.id)}
                >
                  {item.label}
                  <small>{item.visa}</small>
                </button>
              ))}
            </nav>
          )}
          <div className="visa-workspace">
            <article className="visa-check-card">
              <header>
                <div>
                  <span>{guide.visa}</span>
                  <small>{guide.qualification}</small>
                </div>
                <p>更新 {guide.updatedAt}</p>
              </header>
              <div className="visa-card-title">
                <span>{visaGuideBadge(guide)}</span>
                <div>
                  <h3>{guide.title}</h3>
                  <p>{guide.intro}</p>
                </div>
              </div>
              <ol>
                {guide.materials.map((item, index) => (
                  <li key={`${guide.id}-${item}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{item}</p>
                  </li>
                ))}
              </ol>
              <aside>
                <b>提交前再核对</b>
                {guide.reminders.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </aside>
              <footer>
                <span>demo · 免费公开资料</span>
                <small>不替代使领馆、签证中心或学校的当期通知</small>
              </footer>
            </article>
            <aside className="visa-share-panel">
              <span className="eyebrow">SHARE TO WECHAT</span>
              <h3>把清单带走，准备时逐项核对。</h3>
              <p>
                点击后自动生成竖版材料卡，并尝试复制图片到剪贴板。电脑端可直接在微信粘贴，移动设备会在不支持复制时打开系统分享或下载图片。
              </p>
              <button
                className="button red full"
                disabled={sharing}
                onClick={() => makeCard("copy")}
              >
                {sharing ? "正在生成…" : "复制卡片截图"}
              </button>
              <button
                className="button ghost full"
                disabled={sharing}
                onClick={() => makeCard("download")}
              >
                下载图片备用
              </button>
              {shareStatus && (
                <p className="visa-share-status" role="status">
                  {shareStatus}
                </p>
              )}
              <div className="visa-source">
                <b>使用前确认</b>
                <p>
                  材料要求会因学校认证情况、户籍或最终学历所在地、申请领区及个人经历而变化。
                </p>
                <a
                  href="https://overseas.mofa.go.kr/cn-zh/brd/m_1201/view.do?page=1&amp;seq=695439"
                  target="_blank"
                  rel="noreferrer"
                >
                  查看韩国驻华使馆最新材料页 ↗
                </a>
              </div>
            </aside>
          </div>
        </section>
      )}
      <section className="faq-preview">
        <p className="eyebrow">常见疑问</p>
        {site.faqs.slice(0, 2).map((faq) => (
          <details key={faq.id}>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
        <button className="button ghost" onClick={() => navigate("faq")}>
          查看全部 FAQ
        </button>
      </section>
    </section>
  );
}
