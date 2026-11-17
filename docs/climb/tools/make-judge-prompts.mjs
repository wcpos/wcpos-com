// Writes one prompt file per judge persona from judge-brief.md.
// Usage: node docs/climb/tools/make-judge-prompts.mjs <roundDirAbs> <repoAbs> <outDir>
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [roundDir, repo, outDir] = process.argv.slice(2);
const brief = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'judge-brief.md'), 'utf8');

export const PERSONAS = {
  'shop-owner': ['shop owner comparing POS plugins',
    'You run a WooCommerce gift shop with one physical counter and a weekend market stall. You have shortlisted Square for WooCommerce, the WooCommerce POS app and FooSales, and you are deciding which to try this week. You are not technical; you skim, you look for price, proof that it works for shops like yours, and what to click next.'],
  'woo-dev': ['WooCommerce developer',
    'You are a WooCommerce developer at a small agency choosing a POS for a client with two stores. You care about how it hooks into WooCommerce (orders, stock, taxes, multi-store), what is free versus Pro, hardware support, documentation, and whether the site gives you enough detail to recommend it without a sales call.'],
  'designer': ['product designer',
    'You are a senior product and visual designer. You judge hierarchy, typography, spacing rhythm, alignment, colour use, image quality, consistency between pages, and how the layout holds at phone width and with long Dutch and German words.'],
  'seo': ['SEO specialist',
    'You are a technical and content SEO specialist. You judge titles, meta descriptions, heading structure (one H1, logical H2s), structured data, internal linking between home, Pro, compare and downloads, hreflang and canonical, Lighthouse SEO and performance, and whether pages target the queries a WooCommerce shop owner searches (e.g. "WooCommerce POS", "point of sale for WooCommerce").'],
  'sceptic': ['competitor-aware sceptic',
    'You are a sceptical buyer who knows the WooCommerce POS market well (Square, the official WooCommerce POS, FooSales, Jovvie, Oliver POS, YITH POS). You hunt for vague or overstated claims, missing proof, claims that do not match the product facts, and anything that makes WCPOS look like the weaker option.'],
};

await mkdir(outDir, { recursive: true });
for (const [id, [short, persona]] of Object.entries(PERSONAS)) {
  const body = brief.replaceAll('{ROUND_DIR}', roundDir).replaceAll('{REPO}', repo)
    .replaceAll('{JUDGE_ID}', id).replaceAll('{PERSONA_SHORT}', short);
  await writeFile(join(outDir, `${id}.md`),
    `## Your persona\n\n${persona}\n\nRound folder (ROUND_DIR): ${roundDir}\nRepo: ${repo}\n\n${body}`);
}
console.log(Object.keys(PERSONAS).join(' '));
