import React, { useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import "../styles/React2.css"; // Ensure this path is correct

// Register all chart components
Chart.register(...registerables);

const React2 = () => {
  const [toggle, setToggle] = useState(false);

  // Sample Data for Charts
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Growth Rate",
        data: [10, 20, 30, 40, 50, 60],
        backgroundColor: "rgba(255, 206, 86, 0.6)",
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className={`react2-container ${toggle ? "expanded" : ""}`}>
      <div className="react2-header">
        <h2>📊 React2 Component</h2>
        <p>Experimenting with React UI enhancements & Charts</p>
      </div>

      <button className="toggle-btn" onClick={() => setToggle(!toggle)}>
        {toggle ? "Collapse" : "Expand"}
      </button>

      {toggle && (
        <div className="react2-content">
          <p>This is a test area for UI components & animations.</p>

          <div className="react2-chart-container">
            <h3>📈 Growth Chart</h3>
            <div className="chart-box">
              <Line data={data} options={options} />
            </div>
          </div>

          <div className="react2-chart-container">
            <h3>📊 Bar Chart Representation</h3>
            <div className="chart-box">
              <Bar data={data} options={options} />
            </div>
          </div>

          <div className="react2-chart-container">
            <h3>🍕 Pie Chart</h3>
            <div className="chart-box">
              <Pie data={data} options={options} />
            </div>
          </div>

          <div className="react2-box">📌 Box 1</div>
          <div className="react2-box">📌 Box 2</div>
          <div className="react2-box">📌 Box 3</div>
        </div>
      )}
    </div>
  );
};

export default React2;
