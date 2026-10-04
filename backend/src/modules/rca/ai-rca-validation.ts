export function normalizeAiSwissLayer(value: string): string {
  const text = value.toLowerCase().trim();
  if (['org', 'supervision', 'precondition', 'act'].includes(text)) return text;
  if (/unsafe|การกระทำ/.test(text)) return 'act';
  if (/precondition|สภาพแวดล้อม|เงื่อนไข/.test(text)) return 'precondition';
  if (/supervis|นิเทศ|กำกับ/.test(text)) return 'supervision';
  if (/organi|องค์กร/.test(text)) return 'org';
  return '';
}
