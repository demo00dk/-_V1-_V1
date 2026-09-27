import { fileAccept } from "../../lib/excel";

export function ImportActions({
  templateUrl,
  onTemplate,
  onImport,
  onExport,
  labels,
}: {
  templateUrl?: string;
  onTemplate?: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  labels?: { template: string; export: string; import: string };
}) {
  const text = labels || {
    template: "下载标准模板",
    export: "导出现有数据",
    import: "导入 Excel",
  };
  return (
    <div className="excel-actions">
      {onTemplate ? (
        <button className="button ghost" onClick={onTemplate}>
          {text.template}
        </button>
      ) : (
        <a className="button ghost" href={templateUrl} download>
          {text.template}
        </a>
      )}
      <button className="button ghost" onClick={onExport}>
        {text.export}
      </button>
      <label className="button dark file-button">
        {text.import}
        <input
          type="file"
          accept={fileAccept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}
