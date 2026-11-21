function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function formatInlineMarkdown(raw: string): string {
  if (!raw) return '';
  let html = escapeHtml(raw);

  // Links: [label](url)
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    const safeHref = escapeHtml(sanitizeUrl(url));
    const isExternal = /^https?:\/\//i.test(safeHref);
    const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safeHref}"${externalAttrs} class="underline font-bold text-blue-600 hover:text-blue-800">${label}</a>`;
  });

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');

  // Italic: *text*
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

  return html;
}

export function formatRichText(raw: string): string {
  if (!raw) return '';
  const lines = String(raw).replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(
        `<ul class="list-disc pl-5 space-y-1.5 my-2">${listItems
          .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
          .join('')}</ul>`
      );
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      blocks.push(
        `<h4 class="font-black text-base sm:text-lg mt-4 mb-2">${formatInlineMarkdown(line.slice(4))}</h4>`
      );
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(line.slice(2).trim());
    } else {
      flushList();
      blocks.push(`<p class="mb-2 last:mb-0">${formatInlineMarkdown(line)}</p>`);
    }
  }

  flushList();
  return blocks.join('');
}
