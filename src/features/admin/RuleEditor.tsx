import { Field } from "../../components/forms";
import { degreeOptions, languageScore } from "../../domain/catalog";
import { compareSchoolsByQs, schoolQsLabel } from "../../domain/rankings";
import { newId } from "../../domain/text";
import type { Rule, School } from "../../domain/types";

export function RuleEditor({
  rules,
  schools,
  setRules,
}: {
  rules: Rule[];
  schools: School[];
  setRules: (value: Rule[]) => void;
}) {
  const orderedSchools = [...schools].sort(compareSchoolsByQs);
  const update = (id: string, key: keyof Rule, value: string | number | string[]) =>
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, [key]: value } : rule)));
  const add = () =>
    setRules([
      ...rules,
      {
        id: newId("rule"),
        name: "新匹配规则",
        degree: "本科新入",
        majorKeywords: [],
        minGpa: 60,
        language: "不限",
        budget: "中",
        schoolIds: orderedSchools.slice(0, 2).map((school) => school.id),
        reason: "请补充规则说明。",
      },
    ]);
  return (
    <section className="editor-section">
      <div className="section-action">
        <div>
          <h1>院校专业匹配规则</h1>
          <p>
            系统根据这里的规则计算初筛结果。每条规则都能明确显示给用户，人工可随招生政策更新。
          </p>
        </div>
        <button className="button dark" onClick={add}>
          + 新增规则
        </button>
      </div>
      <div className="rules-edit">
        {rules.map((rule) => (
          <article key={rule.id}>
            <header>
              <input
                value={rule.name}
                onChange={(e) => update(rule.id, "name", e.target.value)}
              />
              <button
                className="danger"
                onClick={() => setRules(rules.filter((item) => item.id !== rule.id))}
              >
                删除
              </button>
            </header>
            <div className="form-grid compact">
              <Field label="学历">
                <select
                  value={rule.degree}
                  onChange={(e) => update(rule.id, "degree", e.target.value)}
                >
                  <option>通用</option>
                  {degreeOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="最低成绩">
                <input
                  type="number"
                  value={rule.minGpa}
                  onChange={(e) => update(rule.id, "minGpa", Number(e.target.value))}
                />
              </Field>
              <Field label="语言">
                <select
                  value={rule.language}
                  onChange={(e) => update(rule.id, "language", e.target.value)}
                >
                  {Object.keys(languageScore).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="预算">
                <select
                  value={rule.budget}
                  onChange={(e) => update(rule.id, "budget", e.target.value)}
                >
                  <option>低</option>
                  <option>中</option>
                  <option>高</option>
                </select>
              </Field>
              <Field label="专业关键词（英文逗号分隔）">
                <input
                  value={rule.majorKeywords.join(",")}
                  onChange={(e) =>
                    update(
                      rule.id,
                      "majorKeywords",
                      e.target.value.split(",").filter(Boolean),
                    )
                  }
                />
              </Field>
              <Field label="匹配院校（按 QS 排序）">
                <div className="school-checks">
                  {orderedSchools.map((school) => (
                    <label key={school.id}>
                      <input
                        type="checkbox"
                        checked={rule.schoolIds.includes(school.id)}
                        onChange={(e) =>
                          update(
                            rule.id,
                            "schoolIds",
                            e.target.checked
                              ? [...rule.schoolIds, school.id]
                              : rule.schoolIds.filter((id) => id !== school.id),
                          )
                        }
                      />
                      {school.name} · {schoolQsLabel(school)}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="向用户展示的匹配理由">
                <textarea
                  value={rule.reason}
                  onChange={(e) => update(rule.id, "reason", e.target.value)}
                  rows={3}
                />
              </Field>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
