const DANGEROUS_TAG_NAMES = ['script', 'iframe', 'object', 'embed', 'link', 'style'];

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizeHref(value: string): string {
  const trimmedValue = value.trim();

  if (/^javascript:/i.test(trimmedValue)) {
    return '#';
  }

  return trimmedValue;
}

export function sanitizeLegacyGuideHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  DANGEROUS_TAG_NAMES.forEach((tagName) => {
    doc.querySelectorAll(tagName).forEach((element) => element.remove());
  });

  doc.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attribute.name === 'href' || attribute.name === 'src') {
        element.setAttribute(attribute.name, sanitizeHref(attribute.value));
      }
    });
  });

  return doc.body.innerHTML;
}

export function extractGuideArticleHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const article = doc.querySelector('.guide-article');

  if (!article) {
    return '';
  }

  return sanitizeLegacyGuideHtml(article.innerHTML);
}
