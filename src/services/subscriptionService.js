import db from "../server/db/sqlite.js";
import SubscriptionStore from "../core/subscription/SubscriptionStore.js";
export const subscriptionStore = new SubscriptionStore(db);
export default subscriptionStore;
