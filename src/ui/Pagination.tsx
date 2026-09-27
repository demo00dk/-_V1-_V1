type Props = {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
  label?: string;
  unit?: string;
};

export function Pagination({
  page,
  pageCount,
  total,
  onChange,
  label = "院校分页",
  unit = "所",
}: Props) {
  return (
    <div className="pagination" aria-label={label}>
      <span>
        共 {total} {unit} · 第 {page + 1} / {pageCount} 页
      </span>
      <div>
        <button
          className="button ghost"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </button>
        <button
          className="button dark"
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
