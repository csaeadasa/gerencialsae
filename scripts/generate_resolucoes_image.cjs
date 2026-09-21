const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Exact canvas proportions: 600 x 840
const width = 600;
const height = 840;

const svgContent = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
  <!-- Clean Institutional Navy Blue Background -->
  <rect width="${width}" height="${height}" fill="#0A2552" />

  <!-- Subtle Border Frame -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="16" fill="none" stroke="#1E4976" stroke-width="2" />

  <!-- White Circle (Center: 300, 310 | Radius: 180) -->
  <circle cx="300" cy="310" r="180" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" />

  <!-- ======================================================== -->
  <!-- ORIGINAL ADASA LOGO (100% ENCLOSED INSIDE THE CIRCLE)    -->
  <!-- ======================================================== -->
  <g id="logo-adasa-original">
    <!-- Official ADASA Droplet Symbol (Exact official paths, scale 0.46) -->
    <g transform="translate(185.5, 176) scale(0.46)">
      <!-- 1. Left Dark Blue Shape -->
      <path
        d="M 236 36 C 236 36, 115 175, 104 315 C 95 380, 175 428, 273 430 C 180 415, 170 320, 185 270 C 205 180, 228 85, 236 36 Z"
        fill="#0A3982"
      />
      <!-- 2. Middle Blue Shape -->
      <path
        d="M 290 204 L 348 270 C 275 345, 278 395, 314 430 C 238 360, 240 275, 290 204 Z"
        fill="#0080D8"
      />
      <!-- 3. Light Cyan Shape -->
      <path
        d="M 320 304 L 376 340 C 335 385, 332 415, 342 430 C 285 365, 295 410, 342 430 C 300 380, 290 355, 320 304 Z"
        fill="#52C4F8"
      />
      <!-- 4. Green Circle -->
      <circle cx="372" cy="392" r="31" fill="#009647" />
    </g>

    <!-- Official Wordmark: Adasa -->
    <text x="300" y="420" text-anchor="middle" font-size="50" font-weight="900" fill="#0A3982" letter-spacing="-0.5">Adasa</text>
  </g>

  <!-- ======================================================== -->
  <!-- TITLE: RESOLUÇÃO ADASA                                   -->
  <!-- ======================================================== -->
  <g transform="translate(300, 625)">
    <text y="0" text-anchor="middle" font-size="44" font-weight="900" fill="#FFFFFF" letter-spacing="3">
      RESOLUÇÃO
    </text>
    <text y="60" text-anchor="middle" font-size="52" font-weight="900" fill="#38BDF8" letter-spacing="5">
      ADASA
    </text>
    <line x1="-120" y1="95" x2="120" y2="95" stroke="#0080D8" stroke-width="3" stroke-linecap="round" />
  </g>
</svg>
`;

async function generate() {
  const brandDir = path.join(process.cwd(), 'public', 'brand');
  const publicDir = path.join(process.cwd(), 'public');

  if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

  const svgPathBrand = path.join(brandDir, 'adasa-resolucoes.svg');
  const pngPathBrand = path.join(brandDir, 'adasa-resolucoes.png');
  const svgPathPublic = path.join(publicDir, 'adasa-resolucoes.svg');
  const pngPathPublic = path.join(publicDir, 'adasa-resolucoes.png');

  // Save SVG
  fs.writeFileSync(svgPathBrand, svgContent, 'utf8');
  fs.writeFileSync(svgPathPublic, svgContent, 'utf8');

  // Generate sharp PNG
  await sharp(Buffer.from(svgContent))
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(pngPathBrand);

  await sharp(Buffer.from(svgContent))
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(pngPathPublic);

  console.log('Successfully generated clean official Adasa resolution image.');
}

generate().catch(console.error);
