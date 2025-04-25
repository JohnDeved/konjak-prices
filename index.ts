import { writeFile } from "bun";
import cheerio from "cheerio";

const urls = [
  "https://www.bulk.com/at/products/diat-udon-nudeln/bpf-duno",
  "https://www.bulk.com/at/products/diatnudeln/bpf-dnoo",
];

const results = [];
for (const url of urls) {
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);
  const ldjson = JSON.parse($('script[type="application/ld+json"]').first().html());
  const offers = Object.fromEntries(ldjson.offers.map(x => [x.sku, x]));
  const s = offers["BPF-DUNO-ORIG-200G"] || offers["BPF-DNOO-ORIG-200G"];
  const b = offers["BPF-DUNO-ORIG-BX06"] || offers["BPF-DNOO-ORIG-BX06"];
  if (!s || !b) continue;
  const per = +(b.price / 6).toFixed(2);
  const cheapest = Math.min(s.price, per);
  results.push({
    product: ldjson.name,
    "200g_price_eur": s.price,
    "6x200g_price_eur": b.price,
    "per_200g_in_box_eur": per,
    "cheapest_per_200g_eur": cheapest,
    price_valid_until: s.priceValidUntil || b.priceValidUntil,
  });
}

await writeFile("bulk_prices.json", JSON.stringify(results, null, 2));
