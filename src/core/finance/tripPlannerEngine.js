const n = (value) => Math.max(0, Number(value) || 0);
const round = (value) => Math.round(value);

const MODE_META = {
  car: { label: "Drive", icon: "🚗" },
  air: { label: "Fly", icon: "✈️" },
  train: { label: "Train", icon: "🚆" },
  bus: { label: "Bus", icon: "🚌" },
  cruise: { label: "Cruise", icon: "🛳️" },
};

export const RENTAL_PROVIDERS = ["Enterprise", "Alamo", "National", "Budget", "Avis", "Hertz", "Dollar", "Thrifty", "Sixt", "Turo", "Other"];
export const LODGING_TYPES = ["Hotel", "Motel", "Airbnb / Vacation rental", "Resort", "Hostel", "Stay with family", "No lodging"];
export const CRUISE_LINES = ["Carnival", "Royal Caribbean", "Norwegian", "MSC Cruises", "Disney Cruise Line", "Celebrity Cruises", "Princess Cruises", "Holland America", "Virgin Voyages", "Other"];

export function generateTripOptions(input = {}) {
  const travelers = Math.max(1, Math.round(n(input.travelers) || 1));
  const days = Math.max(1, Math.round(n(input.days) || 1));
  const nights = Math.max(0, days - 1);
  const selected = Array.isArray(input.modes) && input.modes.length ? input.modes : ["car", "air", "train"];
  const lodging = input.lodgingType === "No lodging" ? 0 : n(input.lodgingNight) * nights;
  const food = n(input.foodDay) * travelers * days;
  const activities = n(input.activitiesDay) * travelers * days;
  const contingencyRate = n(input.contingencyPercent) / 100;

  const routes = selected.map((mode) => {
    let transport = 0;
    let details = "";
    if (mode === "car") {
      if (input.carType === "rental") {
        transport = n(input.rentalDaily) * days + n(input.rentalFees) + (n(input.distanceMiles) / Math.max(1, n(input.rentalMpg) || 28)) * n(input.gasPrice);
        details = `${input.rentalProvider || "Rental"} vehicle · estimated fees, fuel, and mileage included`;
      } else {
        transport = (n(input.distanceMiles) / Math.max(1, n(input.povMpg) || 25)) * n(input.gasPrice) + n(input.parkingTolls);
        details = "Personal vehicle · fuel, parking, and toll assumptions included";
      }
    } else if (mode === "cruise") {
      transport = n(input.cruiseFare) * travelers + n(input.cruiseFees) * travelers;
      details = `${input.cruiseLine || "Cruise"} · fare and port-fee assumptions included`;
    } else {
      transport = n(input[`${mode}Fare`]) * travelers + n(input.localTransit);
      details = `${MODE_META[mode]?.label || mode} · fare plus local transportation`;
    }
    const cruiseIncludesStay = mode === "cruise" && input.cruiseIncludesLodging;
    const stay = cruiseIncludesStay ? 0 : lodging;
    const cruiseIncludesMeals = mode === "cruise" && input.cruiseIncludesMeals;
    const meals = cruiseIncludesMeals ? food * 0.25 : food;
    const subtotal = transport + stay + meals + activities;
    const contingency = subtotal * contingencyRate;
    const total = subtotal + contingency;
    const travelHours = n(input[`${mode}Hours`]) || ({ car: 8, air: 5, train: 10, bus: 12, cruise: 24 }[mode] || 8);
    const comfort = ({ air: 82, train: 78, cruise: 88, car: input.carType === "rental" ? 72 : 68, bus: 55 }[mode] || 65);
    return {
      mode, label: MODE_META[mode]?.label || mode, icon: MODE_META[mode]?.icon || "◇", details,
      transport: round(transport), lodging: round(stay), food: round(meals), activities: round(activities), contingency: round(contingency), total: round(total),
      perTraveler: round(total / travelers), travelHours, comfort,
    };
  });

  const minCost = Math.min(...routes.map((route) => route.total || Infinity));
  const maxTime = Math.max(...routes.map((route) => route.travelHours), 1);
  const ranked = routes.map((route) => {
    const affordability = minCost / Math.max(route.total, 1);
    const speed = 1 - route.travelHours / (maxTime * 1.2);
    const score = affordability * 50 + speed * 25 + route.comfort / 100 * 25;
    return { ...route, score: round(score) };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  return ranked.map((route, index) => ({ ...route, rank: index + 1, badge: index === 0 ? "Best balanced route" : index === 1 ? "Strong alternative" : "Third-best fit" }));
}
