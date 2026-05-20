/** Chuyển ghi chú hợp đồng (notes) thành danh sách mục hiển thị. */
export function parseContractNotesToRules(notes) {
  const raw = String(notes ?? '').trim();
  if (!raw) return [];

  const parts = raw.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1 && !/^\d+[\.\)]\s/.test(parts[0])) {
    return [{ id: 1, title: 'Ghi chú hợp đồng', desc: parts[0] }];
  }

  return parts.map((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const first = lines[0] || '';
    const numbered = first.match(/^(\d+)[\.\)]\s*(.+)$/);
    if (numbered) {
      const rest = lines.slice(1).join(' ').trim();
      return {
        id: i + 1,
        title: `${numbered[1]}. ${numbered[2]}`,
        desc: rest || numbered[2],
      };
    }
    return { id: i + 1, title: `Mục ${i + 1}`, desc: block };
  });
}
