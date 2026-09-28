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
  fs.writeFileSync(file, html, 'utf8');
  console.log('Seller OS landing critical render fallback applied');
} else {
  console.log('Seller OS landing critical render fallback already present');
}
