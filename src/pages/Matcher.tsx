import QRCode from "qrcode";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Field } from "../components/forms";
import { degreeOptions, languageScore } from "../domain/catalog";
import type { MatchTier } from "../domain/matching";
import { matchSchools, tierOrder } from "../domain/matching";
import { publicSchoolQsLabel } from "../domain/rankings";
import type { SiteData } from "../domain/types";

export function Matcher({ site, onContact }: { site: SiteData; onContact: () => void }) {
  const [form, setForm] = useState({
    degree: "硕士",
    background: "普通本科",
    gpa: "78",
    language: "TOPIK 4",
    budget: "中",
    city: "不限",
    major: "计算机",
    experience: "有课程或项目",
  });
  const [submitted, setSubmitted] = useState(false);
  const [qr, setQr] = useState("");
  const input = {
    ...form,
    gpa: Math.max(0, Math.min(100, Number(form.gpa) || 0)),
  };
  const plan = useMemo(() => matchSchools(site, input), [site, form]);
  useEffect(() => {
    QRCode.toDataURL(site.consultant.qrTarget, {
      width: 190,
      margin: 1,
      color: { dark: "#17312d", light: "#fffdf8" },
    }).then(setQr);
  }, [site.consultant.qrTarget]);
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    window.setTimeout(
      () =>
        document
          .getElementById("match-plan")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      40,
    );
  };
  const tierMeta: Record<MatchTier, { number: string; className: string; note: string }> =
    {
      冲刺: { number: "01", className: "reach", note: "突破上限" },
      稳妥: { number: "02", className: "target", note: "重点申请" },
      保底: { number: "03", className: "safe", note: "平衡风险" },
    };
  return (
    <section className="page matcher-page">
      <div className="section-shell">
        <header className="matcher-hero">
          <div>
            <p className="eyebrow">30 SEC / SCHOOL PLAN</p>
            <h1>
              用八个条件，排出你的
              <br />
              <em>冲刺、稳妥、保底。</em>
            </h1>
            <p>
              覆盖本科新入、本科插班（两年制专升本）、一年制专升本、硕士与博士。结果来自后台院校和匹配规则，填写过程不收集姓名与联系方式。
            </p>
          </div>
          <ol>
            <li>
              <b>01</b>
              <span>填写背景</span>
            </li>
            <li>
              <b>02</b>
              <span>生成梯度</span>
            </li>
            <li>
              <b>03</b>
              <span>顾问精修</span>
            </li>
          </ol>
        </header>
        <div className="matcher-workbench">
          <form className="match-form-v2" onSubmit={submit}>
            <div className="form-counter">
              <span>PROFILE CARD</span>
              <b>8 项条件 · 约 30 秒</b>
            </div>
            <fieldset>
              <legend>01 / 申请方向</legend>
              <div className="choice-grid degree-choices">
                {degreeOptions.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={form.degree === item ? "selected" : ""}
                    onClick={() => update("degree", item)}
                    aria-pressed={form.degree === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Field label="意向专业 / 方向">
                <input
                  value={form.major}
                  onChange={(e) => update("major", e.target.value)}
                  placeholder="如：计算机、设计、经营"
                  required
                />
              </Field>
            </fieldset>
            <fieldset>
              <legend>02 / 学术背景</legend>
              <div className="form-pair">
                <Field label="目前学历背景">
                  <select
                    value={form.background}
                    onChange={(e) => update("background", e.target.value)}
                  >
                    <option>重点本科</option>
                    <option>普通本科</option>
                    <option>专科</option>
                    <option>高中 / 中专</option>
                    <option>其他</option>
                  </select>
                </Field>
                <Field label="平均分（百分制）">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.gpa}
                    onChange={(e) => update("gpa", e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="语言情况">
                <select
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                >
                  {Object.keys(languageScore).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </fieldset>
            <fieldset>
              <legend>03 / 个人偏好</legend>
              <div className="form-pair">
                <Field label="预算倾向">
                  <select
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
                  >
                    <option>低</option>
                    <option>中</option>
                    <option>高</option>
                  </select>
                </Field>
                <Field label="地区偏好">
                  <select
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  >
                    <option>不限</option>
                    <option>首尔圈</option>
                    <option>地方城市</option>
                  </select>
                </Field>
              </div>
              <Field label="经历准备">
                <select
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value)}
                >
                  <option>暂未准备</option>
                  <option>有课程或项目</option>
                  <option>有实习 / 科研 / 作品集</option>
                </select>
              </Field>
            </fieldset>
            <button className="button dark full match-submit">
              立即生成三档方案 <b>→</b>
            </button>
            <p className="privacy-line">
              <span>✓</span>不保存输入，不用手机号，结果即时生成
            </p>
          </form>
          <section className={`match-plan ${submitted ? "ready" : ""}`} id="match-plan">
            <div className="plan-heading">
              <div>
                <span>YOUR SCHOOL PLAN</span>
                <h2>
                  {submitted ? `${form.degree} · ${form.major}方向` : "你的三档选校方案"}
                </h2>
              </div>
              {submitted && (
                <small>
                  {input.gpa}分 · {form.language} · {form.city}
                </small>
              )}
            </div>
            {!submitted ? (
              <div className="plan-placeholder">
                <div className="placeholder-orbit">
                  <b>30</b>
                  <span>SEC</span>
                </div>
                <h3>完成左侧信息，立即生成结果。</h3>
                <p>
                  系统会根据学历路径、成绩、语言、专业、预算和地区偏好，将可用院校排成三个梯度。
                </p>
                <div>
                  {tierOrder.map((tier) => (
                    <span key={tier}>
                      {tierMeta[tier].number}
                      <b>{tier}</b>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="tier-grid">
                  {tierOrder.map((tier) => (
                    <section
                      className={`tier-column ${tierMeta[tier].className}`}
                      key={tier}
                    >
                      <header>
                        <span>{tierMeta[tier].number}</span>
                        <div>
                          <h3>{tier}</h3>
                          <small>
                            {tierMeta[tier].note} · {plan[tier].length} 所
                          </small>
                        </div>
                      </header>
                      <div className="tier-list">
                        {plan[tier].length ? (
                          plan[tier].map((entry) => (
                            <article className="plan-school-card" key={entry.school.id}>
                              <div className="school-card-top">
                                {publicSchoolQsLabel(entry.school) && (
                                  <span>{publicSchoolQsLabel(entry.school)}</span>
                                )}
                                <b>
                                  {entry.score}
                                  <small>综合匹配</small>
                                </b>
                              </div>
                              <h4>
                                {entry.school.name}
                                <small>{entry.school.nameKr}</small>
                              </h4>
                              <p className="major-line">推荐方向：{entry.major}</p>
                              <p>{entry.reason}</p>
                              <ul>
                                {entry.bullets.map((bullet) => (
                                  <li key={bullet}>{bullet}</li>
                                ))}
                              </ul>
                              {entry.gap && (
                                <div className="gap-note">
                                  <span>关注</span>
                                  {entry.gap}
                                </div>
                              )}
                            </article>
                          ))
                        ) : (
                          <div className="tier-empty">
                            该学历暂时没有足够的后台预设院校，顾问可继续补充。
                          </div>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
                <aside className="plan-consultant">
                  <div>
                    <span>TEACHER REVIEW</span>
                    <h3>机器先筛，老师再把关。</h3>
                    <p>
                      把这份结果发给{site.consultant.name}
                      ，继续确认当期招生专业、申请批次与材料安排。
                    </p>
                    <button className="button red" onClick={onContact}>
                      联系老师精修方案
                    </button>
                  </div>
                  {qr && (
                    <figure>
                      <img src={qr} alt="扫码联系留学顾问" />
                      <figcaption>
                        微信 {site.consultant.wechat}
                        <small>{site.consultant.availability}</small>
                      </figcaption>
                    </figure>
                  )}
                </aside>
              </>
            )}
          </section>
        </div>
        <section className="matching-principles">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>不是随机列学校，而是先过路径，再做梯度。</h2>
          </div>
          <div>
            <article>
              <span>01</span>
              <b>学历先行</b>
              <p>
                先区分本科新入、本科插班、一年制专升本、硕士和博士，避免不同入学路径共用一套规则。
              </p>
            </article>
            <article>
              <span>02</span>
              <b>专业落点</b>
              <p>
                优先选择后台已有专业数据的院校；没有可靠专业信息时，不为了凑数量编造推荐。
              </p>
            </article>
            <article>
              <span>03</span>
              <b>组合平衡</b>
              <p>
                依据院校层级和当前条件形成相对梯度。三档结果用于制定清单，不代表录取承诺。
              </p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
