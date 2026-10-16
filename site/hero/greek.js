// Greeks a post for the E2 canvas, the way Figma does when you zoom far out: every run of text below the
// title becomes a rounded bar, line by line, at its real position. The title, images and SVG figures stay.
// Run in the page (e.g. Playwright evaluate) on examples/*/post.html at 880 px wide, then take a full-page shot.
(() => {
  const st = document.createElement('style');
  st.textContent = '.gk{color:transparent!important;-webkit-text-fill-color:transparent!important;background:linear-gradient(transparent 30%,var(--gk) 30% 74%,transparent 74%);border-radius:3px;' +
    '-webkit-box-decoration-break:clone;box-decoration-break:clone;text-decoration:none!important;text-shadow:none!important}';
  document.head.appendChild(st);
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walk.nextNode()) {
    const n = walk.currentNode, p = n.parentElement;
    if (!n.nodeValue.trim() || !p || p.closest('h1, svg, script, style, canvas, noscript')) continue;
    nodes.push(n);
  }
  for (const n of nodes) {
    const p = n.parentElement, s = document.createElement('span');
    s.className = 'gk';
    s.style.setProperty('--gk',
      p.closest('h2, h3, h4') ? 'rgba(31,31,29,.62)' :
      p.closest('a') ? 'rgba(51,88,212,.38)' :
      p.closest('strong, b, th') ? 'rgba(31,31,29,.34)' :
      p.closest('code, pre, kbd') ? 'rgba(31,31,29,.16)' :
      'rgba(31,31,29,.2)');
    n.replaceWith(s);
    s.appendChild(n);
  }
  return nodes.length;
})();
