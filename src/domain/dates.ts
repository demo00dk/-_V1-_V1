import { cleanCell } from "./text";

export const updateMonth = (value = new Date()) =>
  `${String(value.getFullYear()).slice(-2)}.${value.getMonth() + 1}`;

export const localDateText = (value = new Date()) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

export const formatUpdateMonth = (value: unknown, fallback = updateMonth()) => {
  const text = cleanCell(value);
  const match =
    text.match(/(?:20)?(\d{2})\D+(\d{1,2})/) || text.match(/^(\d{2})\.(\d{1,2})$/);
  const month = match ? Number(match[2]) : 0;
  return month >= 1 && month <= 12 ? `${match![1]}.${month}` : fallback;
};
