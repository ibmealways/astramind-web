export function calculateFinance(transactions) {
  let income = 0;
  let expenses = 0;

  transactions.forEach(t => {
    if (t.type === "income") income += t.amount;
    if (t.type === "expense") expenses += t.amount;
  });

  return {
    income,
    expenses,
    savings: income - expenses,
  };
}

export async function getWatchlist() {
  return [
    { symbol: "AAPL", name: "Apple Inc.", price: 150.25 },
    { symbol: "GOOGL", name: "Alphabet Inc.", price: 2800.50 },
    { symbol: "AMZN", name: "Amazon.com Inc.", price: 3400.75 },
  ];
}
