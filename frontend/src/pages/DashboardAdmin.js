import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/dashboard.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config"; // ✅ NEW

function DashboardAdmin() {
  const navigate = useNavigate();

  // Stats States
  const [orders, setOrders] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);

  // Inventory States
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Range Filter
  const [range, setRange] = useState(1);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // ✅ FIX 1: Use config URL
        const statsRes = await fetch(
          `${API_BASE_URL}/dashboard/stats?range=${range}`
        );

        if (!statsRes.ok) throw new Error("Stats fetch failed");

        const statsData = await statsRes.json();

        setTotalSales(statsData.total_revenue || 0);
        setTotalOrders(statsData.total_orders || 0);
        setItemsSold(statsData.items_sold || 0);
        setLowStockCount(statsData.alerts || 0);
        setOrders(statsData.recent_orders || []);

        // ✅ FIX 2: Inventory API also uses config
        const invRes = await fetch(`${API_BASE_URL}/inventory/`);

        if (!invRes.ok) throw new Error("Inventory fetch failed");

        const invData = await invRes.json();

        const alerts = invData.filter(
          (item) =>
            item.status === "Low" ||
            item.status === "Critical" ||
            item.status === "Out of Stock"
        );

        setLowStockItems(alerts);

      } catch (err) {
        console.error("Dashboard fetch error:", err);

        setOrders([]);
        setTotalSales(0);
        setTotalOrders(0);
        setItemsSold(0);
        setLowStockCount(0);
        setLowStockItems([]);
      }
    }

    fetchDashboardData();
  }, [range]);

  return (
    <div className="app-body">
      <div className="app-shell">

        <Sidebar role="Admin" />

        <main className="main-content">

          <header className="topbar">
            <div>
              <h2 className="page-title">Dashboard</h2>
              <p className="page-subtitle">
                Overview of daily orders, sales, and inventory status.
              </p>
            </div>

            <div className="topbar-right">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: "#081F1A",
                  color: "white",
                  border: "1px solid #23372f"
                }}
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={15}>15 Days</option>
                <option value={30}>1 Month</option>
              </select>

              <span className="topbar-date">
                Today · {new Date().toLocaleTimeString()}
              </span>

              <div className="user-pill">
                <span className="user-avatar">AD</span>
                <span className="user-name">Admin</span>
              </div>
            </div>
          </header>

          {/* KPI CARDS */}
          <section className="kpi-grid">

            <div className="kpi-card">
              <span className="kpi-label">Total Sales</span>
              <span className="kpi-value" style={{ color: '#4ade80' }}>
                ₱ {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="kpi-extra">From monthly records</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Orders</span>
              <span className="kpi-value">{totalOrders}</span>
              <span className="kpi-extra">Unique transactions</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Items Sold</span>
              <span className="kpi-value">{itemsSold}</span>
              <span className="kpi-extra">Total beverages sold</span>
            </div>

            <div className="kpi-card warning">
              <span className="kpi-label">Low Stock Items</span>
              <span className="kpi-value">{lowStockCount}</span>
              <span className="kpi-extra">Automatic RPA reorder pending</span>
            </div>

          </section>

          {/* LOWER SECTION */}
          <section className="grid-two">

            {/* RECENT ORDERS */}
            <div className="panel">
              <div className="panel-header">
                <h3>Recent Orders</h3>
                <button 
                  className="btn-small" 
                  onClick={() => navigate("/reports")}
                >
                  View all
                </button>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Order ID</th>
                    <th>Item(s)</th>
                    <th>Total</th>
                    <th>Payment</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center" }}>
                        No data available
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 'bold' }}>{order.datetime}</td>
                        <td>#{order.order_id}</td>
                        <td>{order.item_name} <span style={{color: '#888'}}>x{order.qty}</span></td>
                        <td style={{ color: '#4ade80' }}>
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

            {/* LOW STOCK */}
            <div className="panel">
              <div className="panel-header">
                <h3>Low Stock Alerts</h3>
                <button 
                  className="btn-small btn-outline"
                  onClick={() => navigate("/inventory")}
                >
                  Open inventory
                </button>
              </div>

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
                        All stock levels normal
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.slice(0, 7).map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.item_name}</strong></td>
                        <td>{item.category}</td>
                        <td style={{ fontWeight: 'bold' }}>
                          {item.current_stock} {item.unit}
                        </td>
                        <td>
                          <span className={`badge badge-${item.status === 'Low' ? 'warning' : 'danger'}`}>
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

        </main>
      </div>
    </div>
  );
}

export default DashboardAdmin;