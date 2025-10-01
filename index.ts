import * as cheerio from "npm:cheerio";
import { $ } from "npm:zx";
import { Offer, OfferData } from "./types.ts";

const urls = [
  "https://www.bulk.com/at/products/diat-udon-nudeln/bpf-duno",
  "https://www.bulk.com/at/products/diatnudeln/bpf-dnoo",
];

const outputFile = "prices.jsonl";
const newData: OfferData = {};

for (const url of urls) {
  const html = await fetch(url).then((res) => res.text());
  const $c = cheerio.load(html);
  const jsonLd = JSON.parse($c('script[type="application/ld+json"]').text());
  
  // Handle JSON-LD @graph structure (new format) or direct object (old format)
  let data = jsonLd;
  if (jsonLd["@graph"]) {
    // Find the Product object in the @graph array
    data = jsonLd["@graph"].find((item: any) => item["@type"] === "Product");
    if (!data) {
      console.log(`Skipping ${url}: No Product found in @graph`);
      continue;
    }
  }
  
  if (!data.offers) {
    console.log(`Skipping ${url}: No offers found`);
    continue;
  }
  
  // Handle both single offer object and array of offers
  const offersArray = Array.isArray(data.offers) ? data.offers : [data.offers];
  const offers = Object.fromEntries((offersArray as Offer[]).map((o) => [o.sku, o]));
  const single = Object.values(offers).find((o: Offer) => o.sku.endsWith("-200G"));
  const box = Object.values(offers).find((o: Offer) => o.sku.endsWith("-BX06"));

  if (!single || !box) continue;
  const perBox = +(box.price / 6).toFixed(2);
  newData[data.name] = {
    price_200g: single.price,
    price_6x200g: box.price,
    price_per_200g_in_box: perBox,
    cheapest_per_200g: Math.min(single.price, perBox),
    price_valid_until: single.priceValidUntil || box.priceValidUntil,
    fetched_at: new Date().toISOString().slice(0, 10),
    single_in_stock: single.availability === "InStock",
    box_in_stock: box.availability === "InStock",
  };
}

async function getLastLine(file: string): Promise<string | null> {
  const res = await $`tail -n 1 ${file}`.catch(() => null);
  if (res === null) return null;
  return res.stdout.trim();
}

const lastLine = await getLastLine(outputFile);
const lastData: OfferData | null = lastLine ? JSON.parse(lastLine) : null;

// check if any price or stock has changed
const hasChanged = Object.entries(newData).some(([key, newValue]) => {
  const oldValue = lastData?.[key];
  if (!oldValue) return true;
  return (
    newValue.price_200g !== oldValue.price_200g ||
    newValue.price_6x200g !== oldValue.price_6x200g ||
    newValue.single_in_stock !== oldValue.single_in_stock ||
    newValue.box_in_stock !== oldValue.box_in_stock
  );
});

if (!hasChanged) {
  console.log("No changes detected, exiting.");
  Deno.exit(0);
}

console.log("Changes detected, writing to file...");
Deno.writeTextFileSync(outputFile, JSON.stringify(newData) + "\n", { append: true },);
