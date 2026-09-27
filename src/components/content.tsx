import { useState } from "react";
import type { Checklist } from "../domain/types";

export function PageTitle({
  overline,
  title,
  text,
}: {
  overline: string;
  title: string;
  text: string;
}) {
  return (
    <header className="page-title">
      <p className="eyebrow">{overline}</p>
      <h1>{title}</h1>
      <p>{text}</p>
    </header>
  );
}

export function ChecklistCard({ list }: { list: Checklist }) {
  const [done, setDone] = useState<number[]>([]);
  return (
    <article className="checklist-card">
      <h3>{list.title}</h3>
      <ol>
        {list.items.map((item, index) => (
          <li key={item}>
            <button
              onClick={() =>
                setDone((current) =>
                  current.includes(index)
                    ? current.filter((value) => value !== index)
                    : [...current, index],
                )
              }
              className={done.includes(index) ? "done" : ""}
              aria-label={`完成：${item}`}
            >
              {done.includes(index) ? "✓" : ""}
            </button>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
