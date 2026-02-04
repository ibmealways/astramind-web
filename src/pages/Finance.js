// src/pages/Finance.js
import React from "react";

const Finance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-6">
      <div className="max-w-5xl mx-auto bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-green-400">
        <h1 className="text-4xl font-extrabold text-green-400 mb-4 drop-shadow">
          💰 Finance Dashboard
        </h1>
        <p className="text-lg text-gray-300 mb-6">
          Track your assets, expenses, and financial progress.
        </p>

        {/* Finance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">💸 Total Income</h2>
            <p className="text-3xl font-bold text-green-300">$12,500</p>
          </div>
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">📉 Expenses</h2>
            <p className="text-3xl font-bold text-red-400">$6,800</p>
          </div>
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">📊 Net Savings</h2>
            <p className="text-3xl font-bold text-yellow-300">$5,700</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-black/20 border border-gray-700 text-white rounded-lg">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-left">Category</th>
                <th className="py-3 px-4 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-600">
                <td className="py-2 px-4">2025-06-01</td>
                <td className="py-2 px-4">Freelance Payment</td>
                <td className="py-2 px-4">Income</td>
                <td className="py-2 px-4 text-green-400">+$2,000</td>
              </tr>
              <tr className="border-t border-gray-600">
                <td className="py-2 px-4">2025-06-01</td>
                <td className="py-2 px-4">Software Subscription</td>
                <td className="py-2 px-4">Expense</td>
                <td className="py-2 px-4 text-red-400">- $150</td>
              </tr>
              {/* Add more rows as needed */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
