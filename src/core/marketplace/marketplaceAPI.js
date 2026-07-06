import { MARKETPLACE } from "./marketplaceRegistry.js";

export function publishItem(item) {
  MARKETPLACE.push(item);
}

export function listItems() {
  return MARKETPLACE;
}
