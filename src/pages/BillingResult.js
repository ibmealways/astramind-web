import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "../context/SubscriptionContext.js";
import "../styles/pricing-realm.css";

export default function BillingResult({ cancelled = false }) {
  const { refresh, subscription } = useSubscription();
  const [checking, setChecking] = useState(!cancelled);
  useEffect(() => {
    if (cancelled) return undefined;
    let attempts = 0;
    const poll = async () => { attempts += 1; await refresh(); if (attempts >= 5) setChecking(false); };
    poll();
    const timer = setInterval(poll, 1800);
    return () => clearInterval(timer);
  }, [cancelled, refresh]);
  return <main className="pricing-realm billing-result"><div className="pricing-stars"/><section><div className={`result-orb ${cancelled ? "cancelled" : ""}`}>{cancelled ? "×" : "✦"}</div><small>{cancelled ? "PORTAL CLOSED" : "CHECKOUT COMPLETE"}</small><h1>{cancelled ? "No changes were made." : "Welcome to your expanded realm."}</h1><p>{cancelled ? "Your existing AstraMind plan and credits remain unchanged." : checking ? "Stripe is confirming your subscription with AstraMind..." : `${subscription?.plan?.name || "Your"} access is ready with ${subscription?.creditsBalance || 0} credits.`}</p><div><Link to="/pricing">View plans</Link><Link to="/">Enter AstraMind</Link></div></section></main>;
}
