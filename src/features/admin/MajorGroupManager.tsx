import { useEffect, useMemo, useState } from "react";
import { updateMonth } from "../../domain/dates";
import { getAllMajorNames, majorNameKey, majorSimilarity } from "../../domain/majors";
import { newId } from "../../domain/text";
import type { MajorGroup, School } from "../../domain/types";

export function MajorGroupManager({
  schools,
  groups,
  setGroups,
}: {
  schools: School[];
  groups: MajorGroup[];
  setGroups: (groups: MajorGroup[]) => void;
}) {
  const names = useMemo(() => getAllMajorNames(schools), [schools]);
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [groupQuery, setGroupQuery] = useState("");
  const [createQuery, setCreateQuery] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  useEffect(() => {
    if (!groups.some((group) => group.id === groupId)) setGroupId(groups[0]?.id || "");
  }, [groups, groupId]);
  useEffect(() => setSelectedNames([]), [groupId]);
  const current = groups.find((group) => group.id === groupId);
  const linkedKeys = new Set(groups.flatMap((group) => group.aliases.map(majorNameKey)));
  const available = names.filter((name) => !linkedKeys.has(majorNameKey(name)));
  const visibleGroups = groups.filter((group) =>
    `${group.name} ${group.aliases.join(" ")}`
      .toLowerCase()
      .includes(groupQuery.trim().toLowerCase()),
  );
  const suggestions = current
    ? available
        .map((name) => ({
          name,
          score: Math.max(
            majorSimilarity(current.name, name),
            ...current.aliases.map((alias) => majorSimilarity(alias, name)),
          ),
        }))
        .filter((item) => item.score >= 0.38)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "zh-CN"))
        .slice(0, 80)
    : [];
  const manualResults = manualQuery.trim()
    ? available
        .filter((name) => name.toLowerCase().includes(manualQuery.trim().toLowerCase()))
        .slice(0, 100)
    : [];
  const createResults = createQuery.trim()
    ? available
        .filter((name) => name.toLowerCase().includes(createQuery.trim().toLowerCase()))
        .slice(0, 60)
    : available.slice(0, 30);
  const toggle = (name: string) =>
    setSelectedNames((currentNames) =>
      currentNames.includes(name)
        ? currentNames.filter((item) => item !== name)
        : [...currentNames, name],
    );
  const createGroup = (name: string) => {
    const next: MajorGroup = {
      id: newId("major-group"),
      name,
      aliases: [name],
      updatedAt: updateMonth(),
    };
    setGroups([...groups, next]);
    setGroupId(next.id);
    setCreateQuery("");
    setSelectedNames([]);
  };
  const updateCurrent = (patch: Partial<MajorGroup>) => {
    if (current)
      setGroups(
        groups.map((group) =>
          group.id === current.id
            ? { ...group, ...patch, updatedAt: updateMonth() }
            : group,
        ),
      );
  };
  const addSelected = () => {
    if (!current || !selectedNames.length) return;
    const aliases = Array.from(
      new Map(
        [...current.aliases, ...selectedNames].map((name) => [majorNameKey(name), name]),
      ).values(),
    );
    updateCurrent({ aliases });
    setSelectedNames([]);
  };
  const selectAllSuggestions = () =>
    setSelectedNames((currentNames) =>
      Array.from(new Set([...currentNames, ...suggestions.map((item) => item.name)])),
    );
  return (
    <section className="editor-section major-group-editor">
      <div className="section-action">
        <div>
          <h1>专业关联</h1>
          <p>
            系统只给出名称相似候选，不会自动合并。勾选确认后，前台才会把这些名称归到同一个专业入口。
          </p>
        </div>
        <div className="major-group-summary">
          <b>{groups.length}</b>
          <span>个关联组</span>
          <small>{names.length - linkedKeys.size} 个名称待整理</small>
        </div>
      </div>
      <div className="major-group-workspace">
        <aside className="major-group-index">
          <div>
            <label>
              查找关联组
              <input
                value={groupQuery}
                onChange={(event) => setGroupQuery(event.target.value)}
                placeholder="组名或已关联名称"
              />
            </label>
          </div>
          <div className="major-group-list">
            {visibleGroups.map((group) => (
              <button
                type="button"
                key={group.id}
                className={group.id === groupId ? "active" : ""}
                onClick={() => setGroupId(group.id)}
              >
                <b>{group.name}</b>
                <span>{group.aliases.length} 个名称</span>
                <small>{group.aliases.slice(0, 2).join(" · ")}</small>
              </button>
            ))}
            {!visibleGroups.length && <p>暂无关联组</p>}
          </div>
          <div className="major-group-create">
            <b>新建关联组</b>
            <input
              value={createQuery}
              onChange={(event) => setCreateQuery(event.target.value)}
              placeholder="搜索一个主专业名称"
            />
            <div>
              {createResults.map((name) => (
                <button type="button" key={name} onClick={() => createGroup(name)}>
                  <span>＋</span>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="major-group-detail">
          {current ? (
            <>
              <header>
                <div>
                  <span className="eyebrow">人工确认关联</span>
                  <input
                    aria-label="关联组展示名称"
                    value={current.name}
                    onChange={(event) => updateCurrent({ name: event.target.value })}
                  />
                </div>
                <button
                  className="danger"
                  onClick={() => {
                    setGroups(groups.filter((group) => group.id !== current.id));
                    setGroupId("");
                  }}
                >
                  解除整个关联组
                </button>
              </header>
              <section className="linked-major-names">
                <div>
                  <b>已关联名称</b>
                  <small>
                    前台会以“{current.name}
                    ”统一展示，下列原始名称仍保留在各校数据中。
                  </small>
                </div>
                <div>
                  {current.aliases.map((alias, index) => (
                    <span key={alias}>
                      {alias}
                      {index > 0 && (
                        <button
                          type="button"
                          aria-label={`解除关联：${alias}`}
                          onClick={() =>
                            updateCurrent({
                              aliases: current.aliases.filter((item) => item !== alias),
                            })
                          }
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </section>
              <section className="similar-major-panel">
                <header>
                  <div>
                    <b>名称相似候选</b>
                    <small>仅供筛选，当前没有任何自动关联。</small>
                  </div>
                  <button
                    type="button"
                    onClick={selectAllSuggestions}
                    disabled={!suggestions.length}
                  >
                    全选当前候选
                  </button>
                </header>
                <div className="major-candidate-list">
                  {suggestions.map((item) => (
                    <label key={item.name}>
                      <input
                        type="checkbox"
                        checked={selectedNames.includes(item.name)}
                        onChange={() => toggle(item.name)}
                      />
                      <span>{item.name}</span>
                      <b>{Math.round(item.score * 100)}%</b>
                    </label>
                  ))}
                  {!suggestions.length && (
                    <p>暂未发现名称相似项，可以在下方手动搜索关联。</p>
                  )}
                </div>
              </section>
              <section className="manual-major-panel">
                <header>
                  <div>
                    <b>手动查找其他专业</b>
                    <small>可关联未进入相似候选的任意专业名称。</small>
                  </div>
                  <input
                    value={manualQuery}
                    onChange={(event) => setManualQuery(event.target.value)}
                    placeholder="输入专业名称关键词"
                  />
                </header>
                <div className="major-candidate-list manual">
                  {manualResults.map((name) => (
                    <label key={name}>
                      <input
                        type="checkbox"
                        checked={selectedNames.includes(name)}
                        onChange={() => toggle(name)}
                      />
                      <span>{name}</span>
                      <b>手动</b>
                    </label>
                  ))}
                  {manualQuery && !manualResults.length && <p>没有找到可关联的名称。</p>}
                </div>
              </section>
              <footer>
                <span>已选择 {selectedNames.length} 项</span>
                <button
                  className="button dark"
                  disabled={!selectedNames.length}
                  onClick={addSelected}
                >
                  关联选中专业
                </button>
              </footer>
            </>
          ) : (
            <div className="major-group-empty">
              <span>01</span>
              <h2>先建立一个关联组</h2>
              <p>
                在左侧搜索主专业名称并点击创建。创建后，系统会列出相似候选，也可以搜索任意专业手动加入。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
