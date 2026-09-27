import React from "react";
import { degreeOptions } from "../domain/catalog";
import { normalizeDegreeValues } from "../domain/text";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function DegreeTabs({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const selected = normalizeDegreeValues(values);
  const toggle = (degree: string) =>
    onChange(
      degreeOptions.filter((item) =>
        item === degree ? !selected.includes(item) : selected.includes(item),
      ),
    );
  return (
    <div className="degree-tabs" role="group" aria-label="适用学历">
      {degreeOptions.map((degree) => (
        <button
          type="button"
          key={degree}
          className={selected.includes(degree) ? "selected" : ""}
          aria-pressed={selected.includes(degree)}
          onClick={() => toggle(degree)}
        >
          {selected.includes(degree) && <span aria-hidden="true">✓</span>}
          {degree}
        </button>
      ))}
    </div>
  );
}
