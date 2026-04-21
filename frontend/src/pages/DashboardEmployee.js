import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/dashboard.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

function DashboardEmployee() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const statsRes = await fetch(`${API_BASE_URL}/dashboard/stats`);
        const statsData = await statsRes.json();

        const lowRes = await fetch(`${API_BASE_URL}/inventory/reorder-list`);
        const lowData = await lowRes.json();

        setTotalSales(statsData.total_revenue || 0);
        setTotalOrders(statsData.total_orders || 0);
        setItemsSold(statsData.items_sold || 0);
        setOrders(statsData.recent_orders || []);

        setLowStockItems(lowData.items || []);
        setLowStockCount(lowData.items?.length || 0);

      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setOrders([]);
        setLowStockItems([]);
      }
    }

    fetchDashboardData();
  }, []);

  // 🔥 FORMAT DATE SAFELY
  const formatDate = (order) => {
    if (order.datetime) return order.datetime;

    if (order.timestamp) {
      return new Date(order.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    }

    if (order.created_at) {
      return new Date(order.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    }

    return "N/A";
  };

  return (
    <div className="app-body">
      <div className="app-shell">
        <Sidebar role="Employee" />

        <main className="main-content">
          {/* HEADER */}
          <header className="topbar">
            <div>
              <h2 className="page-title">Employee Dashboard</h2>
              <p className="page-subtitle">
                Overview of daily orders and cafe status.
              </p>
            </div>

            <div className="topbar-right">
              <span className="topbar-date">
                Today · {new Date().toLocaleTimeString()}
              </span>

              <div className="user-pill">
                <span className="user-avatar">EM</span>
                <span className="user-name">
                  {localStorage.getItem("full_name") || "Employee"}
                </span>
              </div>
            </div>
          </header>

          {/* KPI */}
          <section className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Sales</span>
              <span className="kpi-value" style={{ color: "#4ade80" }}>
                ₱ {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Orders</span>
              <span className="kpi-value">{totalOrders}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Items Sold</span>
              <span className="kpi-value">{itemsSold}</span>
            </div>

            <div className="kpi-card warning">
              <span className="kpi-label">Low Stock Alerts</span>
              <span className="kpi-value">{lowStockCount}</span>
            </div>
          </section>

          {/* PANELS */}
          <div className="dashboard-row">

            {/* RECENT ORDERS */}
            <section className="panel half panel-scroll">
              <div className="panel-header">
                <h3>Recent Orders</h3>
                <button className="btn-small" onClick={() => navigate("/orders")}>
                  New Order
                </button>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Order ID</th>
                      <th>Item Sold</th>
                      <th>Qty</th>
                      <th>Total Amount</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center" }}>
                          No recent transactions found.
                        </td>
                      </tr>
                    ) : (
                      orders.slice(0, 5).map((order, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: "bold" }}>
                            {formatDate(order)}
                          </td>
                          <td>#{order.order_id}</td>
                          <td>{order.item_name}</td>
                          <td>{order.qty}</td>
                          <td style={{ color: "#4ade80" }}>
                            ₱ {order.line_total.toFixed(2)}
                          </td>
                          <td>
                            <span className="badge badge-ok">
                              {order.payment_method}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* LOW STOCK */}
            <section className="panel half panel-scroll">
              <div className="panel-header">
                <h3>Low Stock Alerts</h3>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center" }}>
                          No low stock items.
                        </td>
                      </tr>
                    ) : (
                      lowStockItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.item_name}</td>
                          <td>{item.category}</td>
                          <td>{item.current_stock}</td>
                          <td>
                            <span
                              className={`badge ${
                                item.status === "Out of Stock"
                                  ? "badge-danger"
                                  : item.status === "Critical"
                                  ? "badge-warning"
                                  : "badge-low"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardEmployee;