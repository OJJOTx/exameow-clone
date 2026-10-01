// Rebuild a small formatting-only tree. No attributes, links, styles, events or active elements survive.
export function safeHtml(input: string): string {
  const parsed = new DOMParser().parseFromString(input, 'text/html')
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUB', 'SUP', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH'])
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE'])
  const output = document.createElement('div')
  function copy(node: Node, target: Node) {
    if (node.nodeType === Node.TEXT_NODE) { target.appendChild(document.createTextNode(node.textContent ?? '')); return }
    if (!(node instanceof Element) || blocked.has(node.tagName)) return
    const next = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : target
    if (next !== target) target.appendChild(next)
    for (const child of node.childNodes) copy(child, next)
  }
  for (const child of parsed.body.childNodes) copy(child, output)
  return output.innerHTML
}
