import { listItems } from "../core/marketplace/marketplaceAPI.js";

export default function MarketplaceUI() {
  const items = listItems();

  return (
    <div>
      <h2>🛒 AstraMind Marketplace</h2>
      {items.map((item, i) => (
        <div key={i}>
          <strong>{item.name}</strong> — {item.description}
        </div>
      ))}
    </div>
  );
}
