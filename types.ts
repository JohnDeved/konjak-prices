interface PriceSpecification {
  "@type": "UnitPriceSpecification";
  priceType: string;
  price: number;
  priceCurrency: string;
}

export interface Offer {
  "@type": "Offer";
  sku: string;
  url: string;
  gtin: string;
  image: string;
  availability: "OutOfStock" | "InStock";
  price: number;
  priceCurrency: string;
  itemCondition: string;
  priceValidUntil: string;
  priceSpecification: PriceSpecification;
}

export type OfferData = Record<string, {
  price_200g: number;
  price_6x200g: number;
  price_per_200g_in_box: number;
  cheapest_per_200g: number;
  price_valid_until?: string;
  fetched_at: string;
  single_in_stock: boolean;
  box_in_stock: boolean;
}>
