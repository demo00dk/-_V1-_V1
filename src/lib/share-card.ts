import type { VisaGuide } from "../domain/types";

export function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  let line = "";
  for (const character of text) {
    const next = line + character;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = character;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function createVisaShareCard(
  guide: VisaGuide,
  brand: string,
  wechat: string,
) {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成图片。");
  context.font = '32px "Microsoft YaHei", sans-serif';
  const itemLines = guide.materials.map((item) => wrapCanvasText(context, item, 780));
  const reminderLines = guide.reminders.flatMap((item) =>
    wrapCanvasText(context, `• ${item}`, 850),
  );
  const height =
    580 +
    itemLines.reduce((sum, lines) => sum + Math.max(64, lines.length * 43 + 18), 0) +
    reminderLines.length * 40 +
    210;
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#f1ede2";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#173f38";
  context.fillRect(0, 0, width, 300);
  context.fillStyle = "#e0b75e";
  context.fillRect(72, 58, 76, 8);
  context.fillStyle = "#f9f5e9";
  context.font = '700 30px "Microsoft YaHei", sans-serif';
  context.fillText(brand, 72, 115);
  context.font = "800 98px Georgia, serif";
  context.fillText(guide.visa, 70, 224);
  context.fillStyle = "#d7e8de";
  context.font = '30px "Microsoft YaHei", sans-serif';
  wrapCanvasText(context, `${guide.label} · ${guide.qualification}`, 490).forEach(
    (line, index) => context.fillText(line, 500, 155 + index * 38),
  );
  context.fillStyle = "#fffdf7";
  context.fillRect(50, 270, width - 100, height - 330);
  context.fillStyle = "#183a34";
  context.font = '800 48px "Microsoft YaHei", sans-serif';
  context.fillText(guide.title, 88, 370);
  context.fillStyle = "#66756d";
  context.font = '26px "Microsoft YaHei", sans-serif';
  wrapCanvasText(context, guide.intro, 850).forEach((line, index) =>
    context.fillText(line, 88, 425 + index * 38),
  );
  let y = 505;
  context.font = '28px "Microsoft YaHei", sans-serif';
  itemLines.forEach((lines, index) => {
    context.fillStyle = "#d95c48";
    context.font = "700 25px Georgia, serif";
    context.fillText(String(index + 1).padStart(2, "0"), 92, y + 34);
    context.fillStyle = "#173f38";
    context.font = '28px "Microsoft YaHei", sans-serif';
    lines.forEach((line, lineIndex) =>
      context.fillText(line, 158, y + 34 + lineIndex * 43),
    );
    y += Math.max(64, lines.length * 43 + 18);
    context.fillStyle = "#dde3db";
    context.fillRect(88, y - 4, 850, 1);
  });
  y += 28;
  context.fillStyle = "#f2e7ce";
  context.fillRect(80, y, 880, reminderLines.length * 40 + 110);
  context.fillStyle = "#9c4a3d";
  context.font = '800 27px "Microsoft YaHei", sans-serif';
  context.fillText("提交前再核对", 110, y + 48);
  context.fillStyle = "#4e5e56";
  context.font = '24px "Microsoft YaHei", sans-serif';
  reminderLines.forEach((line, index) =>
    context.fillText(line, 110, y + 92 + index * 40),
  );
  context.fillStyle = "#687970";
  context.font = '22px "Microsoft YaHei", sans-serif';
  context.fillText(
    `更新 ${guide.updatedAt} · 以学校、所属领区及当期官方通知为准`,
    80,
    height - 92,
  );
  context.textAlign = "right";
  context.fillStyle = "#173f38";
  context.font = '700 23px "Microsoft YaHei", sans-serif';
  context.fillText(`微信咨询 ${wechat}`, width - 80, height - 65);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片生成失败。"))),
      "image/png",
    ),
  );
}

export function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
