import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!(key in process.env)) {
            process.env[key] = val;
        }
    }
}

loadEnvFile(path.join(rootDir, '.env'));

const STORE_ID = process.env.TIENDANUBE_STORE_ID;
const ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;

if (!STORE_ID || !ACCESS_TOKEN) {
    console.error('Error: TIENDANUBE_STORE_ID y TIENDANUBE_ACCESS_TOKEN son requeridos.');
    process.exit(1);
}

function getLocalizedText(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj.es || obj.pt || obj.en || Object.values(obj)[0] || '';
}

function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function parsePrice(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
}

async function fetchAllProducts() {
    const allProducts = [];
    let page = 1;
    const perPage = 200;

    while (true) {
        const url = `https://api.tiendanube.com/v1/${STORE_ID}/products?per_page=${perPage}&page=${page}`;
        const res = await fetch(url, {
            headers: {
                'Authentication': `bearer ${ACCESS_TOKEN}`,
                'User-Agent': 'ShurianWeb (contacto@shurian.store)',
                'Content-Type': 'application/json'
            }
        });

        if (res.status === 404) {
            break;
        }
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Error Tiendanube API (${res.status}): ${body}`);
        }

        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) {
            break;
        }

        allProducts.push(...batch);
        if (batch.length < perPage) {
            break;
        }
        page++;
    }

    return allProducts;
}

async function main() {
    console.log(`Sincronizando catálogo de Tiendanube (Store ID: ${STORE_ID})...`);
    const rawProducts = await fetchAllProducts();

    const products = rawProducts
        .filter((p) => p.published && p.visibility !== 'hidden')
        .map((p) => {
            const visibleVariants = (p.variants || []).filter((v) => v.visible !== false);
            const mainVariant = visibleVariants[0] || (p.variants && p.variants[0]) || null;

            const price = mainVariant ? parsePrice(mainVariant.price) : null;
            const promotionalPrice = mainVariant ? parsePrice(mainVariant.promotional_price) : null;

            const hasStock = Boolean(p.has_stock) || visibleVariants.some(
                (v) => v.stock_management === false || Number(v.stock) > 0
            );

            const categories = (p.categories || [])
                .map((c) => getLocalizedText(c.name))
                .filter(Boolean);

            const description = stripHtml(getLocalizedText(p.description));

            return {
                id: p.id,
                name: getLocalizedText(p.name).trim(),
                description,
                price,
                promotional_price: promotionalPrice,
                has_stock: hasStock,
                image: p.images && p.images.length > 0 ? p.images[0].src : null,
                categories,
                url: p.canonical_url || null
            };
        })
        .sort((a, b) => {
            if (a.has_stock !== b.has_stock) return a.has_stock ? -1 : 1;
            const aHasImg = Boolean(a.image);
            const bHasImg = Boolean(b.image);
            if (aHasImg !== bHasImg) return aHasImg ? -1 : 1;
            return a.name.localeCompare(b.name, 'es');
        });

    const outDir = path.join(rootDir, 'data');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'catalogo.json');

    const payload = {
        updated_at: new Date().toISOString(),
        total: products.length,
        products
    };

    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`Listo: ${products.length} productos guardados en data/catalogo.json`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
