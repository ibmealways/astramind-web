import { subscriptionStore } from "../../services/subscriptionService.js";

function sendAccessError(res, error) {
  const status = error?.code === "INSUFFICIENT_CREDITS" ? 402 : 500;
  return res.status(status).json({
    ok: false,
    code: error?.code || "SUBSCRIPTION_ACCESS_FAILED",
    error: error?.message || "Subscription access could not be verified.",
  });
}

export function requireEntitlement(entitlement, message) {
  return (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", error: "Authentication is required." });
      }
      const subscription = subscriptionStore.ensure(req.user.id);
      if (!subscription.plan.entitlements?.[entitlement]) {
        return res.status(403).json({
          ok: false,
          code: "PLAN_UPGRADE_REQUIRED",
          requiredEntitlement: entitlement,
          error: message || `Your plan does not include ${entitlement}.`,
        });
      }
      req.subscription = subscription;
      next();
    } catch (error) {
      return sendAccessError(res, error);
    }
  };
}

export function meterOperation({ operation, amount = 1, entitlement = null, methods = ["POST"], paths = null }) {
  const allowedMethods = new Set(methods.map((method) => String(method).toUpperCase()));
  const allowedPaths = paths ? new Set(paths) : null;

  return (req, res, next) => {
    if (!allowedMethods.has(req.method) || (allowedPaths && !allowedPaths.has(req.path))) return next();
    if (!req.user?.id) return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", error: "Authentication is required." });

    let reservation;
    try {
      const subscription = subscriptionStore.ensure(req.user.id);
      if (entitlement && !subscription.plan.entitlements?.[entitlement]) {
        return res.status(403).json({ ok: false, code: "PLAN_UPGRADE_REQUIRED", requiredEntitlement: entitlement, error: `Your plan does not include ${entitlement}.` });
      }
      const units = typeof amount === "function" ? amount(req) : amount;
      reservation = subscriptionStore.reserve({
        userId: req.user.id,
        operation,
        amount: units,
        referenceId: req.params?.id || req.params?.projectId || null,
        metadata: { method: req.method, path: req.originalUrl },
      });
      req.creditReservation = reservation;
    } catch (error) {
      return sendAccessError(res, error);
    }

    let settled = false;
    const settle = (success) => {
      if (settled || !reservation) return;
      settled = true;
      subscriptionStore.settle(reservation.id, { success, metadata: { statusCode: res.statusCode } });
    };
    res.once("finish", () => settle(res.statusCode < 400));
    res.once("close", () => settle(false));
    next();
  };
}

export default { requireEntitlement, meterOperation };
