import fs from 'node:fs';

const file = new URL('../index.html', import.meta.url);
let html = fs.readFileSync(file, 'utf8');

const marker = 'id="seller-os-critical-render-fallback"';
if (!html.includes(marker)) {
  const fallback = `<style id="seller-os-critical-render-fallback">
/* Production safety: above-the-fold content must never depend on JS animation startup */
.hero-copy>h1,
.hero-copy>p,
.hero-copy>.hero-actions,
.hero-copy>.reassurance,
.hero-product>div{
  opacity:1!important;
  transform:none!important;
}
</style>`;

  if (!html.includes('</head>')) {
    throw new Error('Seller OS landing: closing </head> not found');
  }

  html = html.replace('</head>', fallback + '</head>');
  console.log('Seller OS landing critical render fallback applied');
} else {
  console.log('Seller OS landing critical render fallback already present');
}

/*
 * The landing already contains complete server-rendered markup.
 * The old inline React hydration bundle is ~2.7 MB and is not required
 * to display the commercial page. Removing it avoids blocking the HTML
 * parser/main thread while keeping the lightweight production scripts
 * for analytics motion, legal pages and checkout.
 */
const scriptRe = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
let removedHydration = false;
html = html.replace(scriptRe, block => {
  if (
    !removedHydration &&
    block.includes('hydrateRoot') &&
    block.includes('getElementById("root")')
  ) {
    removedHydration = true;
    console.log(`Seller OS landing React hydration bundle removed (${block.length} chars)`);
    return '';
  }
  return block;
});

if (!removedHydration) {
  throw new Error('Seller OS landing: React hydration bundle not found');
}

fs.writeFileSync(file, html, 'utf8');
console.log(`Seller OS landing production HTML ready (${html.length} chars)`);
