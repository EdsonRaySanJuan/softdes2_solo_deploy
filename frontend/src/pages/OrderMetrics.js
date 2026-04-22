import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import API_BASE_URL from "../config";
import "../styles/order_metrics.css";

function LineChart({ data }) {
  if (!data || data.length < 2) {
    return <div className="chart-empty">Not enough data yet — process more orders to see the chart.</div>;
  }
  const W = 720, H = 180, PAD = { top: 16, right: 24, bottom: 36, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const vals = data.map((d) => d.processing_time_ms);
  const minVal = Math.min(...vals), maxVal = Math.max(...vals), range = maxVal - minVal || 1;
  const toX = (i) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (v) => PAD.top + innerH - ((v - minVal) / range) * innerH;
  const polyline = data.map((d, i) => `${toX(i)},${toY(d.processing_time_ms)}`).join(" ");
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
  const avgY = toY(avgVal);
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({ y: toY(v), label: Math.round(v) + "ms" }));
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d) => {
    const i = data.indexOf(d);
    return { x: toX(i), label: `#${d.order_id}` };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="line-chart-svg">
      {yTicks.map((t, i) => <line key={i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} className="grid-line" />)}
      <line x1={PAD.left} y1={avgY} x2={W - PAD.right} y2={avgY} className="avg-line" strokeDasharray="6 4" />
      <text x={W - PAD.right + 4} y={avgY + 4} className="avg-label">avg</text>
      <polygon points={[`${PAD.left},${PAD.top + innerH}`, ...data.map((d, i) => `${toX(i)},${toY(d.processing_time_ms)}`), `${W - PAD.right},${PAD.top + innerH}`].join(" ")} className="chart-area" />
      <polyline points={polyline} className="chart-line" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.processing_time_ms)} r={3} className="chart-dot">
          <title>Order #{d.order_id}: {d.processing_time_ms}ms</title>
        </circle>
      ))}
      {yTicks.map((t, i) => <text key={i} x={PAD.left - 6} y={t.y + 4} className="axis-label y-label">{t.label}</text>)}
      {xLabels.map((l, i) => <text key={i} x={l.x} y={H - 6} className="axis-label x-label">{l.label}</text>)}
    </svg>
  );
}

function SpeedBadge({ ms }) {
  if (ms == null) return null;
  let cls = "badge-fast", label = "Fast";
  if (ms > 3000) { cls = "badge-slow"; label = "Slow"; }
  else if (ms > 1500) { cls = "badge-ok"; label = "OK"; }
  return <span className={`speed-badge ${cls}`}>{label}</span>;
}

export default function OrderMetrics() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const LIMIT = 15;

  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchAll = useCallback(async (pageNum = 0) => {
    setLoading(true); setError(null);
    try {
      const [sumRes, histRes, chartRes] = await Promise.all([
        fetch(`${API_BASE_URL}/metrics/summary`, { headers }),
        fetch(`${API_BASE_URL}/metrics/history?limit=${LIMIT}&offset=${pageNum * LIMIT}`, { headers }),
        fetch(`${API_BASE_URL}/metrics/chart?n=30`, { headers }),
      ]);

      const [sumData, histData, chartData] = await Promise.all([
        sumRes.json(),
        histRes.json(),
        chartRes.json()
      ]);

      if (sumData.success) setSummary(sumData.summary);
      if (histData.success) {
        setHistory(histData.history);
        setTotal(histData.total);
      }
      if (chartData.success) setChartData(chartData.data);

    } catch {
      setError("Failed to load metrics. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(page); }, [page]);

  // 🔥 CLEAR DATA FUNCTION
  const handleClearData = async () => {
    const confirmClear = window.confirm("Are you sure you want to delete all metrics data?");
    if (!confirmClear) return;

    try {
      const res = await fetch(`${API_BASE_URL}/metrics/clear`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();

      if (data.success) {
        alert("Metrics cleared successfully!");
        fetchAll(0);
      } else {
        alert("Failed to clear data");
      }
    } catch (err) {
      alert("Error clearing data");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const fmtMs = (ms) => ms != null ? `${Number(ms).toFixed(0)}ms` : "—";
  const fmtS  = (ms) => ms != null ? `${(ms / 1000).toFixed(4)}s` : "—";

  return (
    <div className="app-body">
      <div className="app-shell">
        <Sidebar role="Employee" />
        <main className="main-content metrics-page">

          <div className="metrics-header">
            <div>
              <h1 className="metrics-title">Order Processing Metrics</h1>
              <p className="metrics-subtitle">Processing speed & average handling time per transaction</p>
            </div>

            {/* 🔥 BUTTONS */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="refresh-btn" onClick={() => fetchAll(page)} disabled={loading}>
                {loading ? "Loading…" : "↻ Refresh"}
              </button>

              <button className="clear-btn" onClick={handleClearData} disabled={loading}>
                🗑 Clear Data
              </button>
            </div>
          </div>

          {error && <div className="metrics-error">{error}</div>}

          {/* Summary cards */}
          <div className="summary-cards">
            <div className="metric-card card-total">
              <div className="card-label">Total Orders Tracked</div>
              <div className="card-value">{summary?.total_orders ?? "—"}</div>
            </div>
            <div className="metric-card card-avg">
              <div className="card-label">Avg Processing Speed</div>
              <div className="card-value">{fmtMs(summary?.avg_ms)}</div>
              <div className="card-sub">{fmtS(summary?.avg_ms)}</div>
            </div>
            <div className="metric-card card-avg" style={{ "--accent": "#10b981" }}>
              <div className="card-label">AHT (Avg Handling Time)</div>
              <div className="card-value">{fmtS(summary?.avg_ms)}</div>
              <div className="card-sub">Total Time ÷ No. of Orders</div>
            </div>
            <div className="metric-card card-fast">
              <div className="card-label">Fastest Order</div>
              <div className="card-value">{fmtMs(summary?.min_ms)}</div>
              <div className="card-sub">{fmtS(summary?.min_ms)}</div>
            </div>
            <div className="metric-card card-slow">
              <div className="card-label">Slowest Order</div>
              <div className="card-value">{fmtMs(summary?.max_ms)}</div>
              <div className="card-sub">{fmtS(summary?.max_ms)}</div>
            </div>
            <div className="metric-card card-items">
              <div className="card-label">Avg Items / Order</div>
              <div className="card-value">{summary?.avg_items ?? "—"}</div>
            </div>
            <div className="metric-card card-amount">
              <div className="card-label">Avg Order Total</div>
              <div className="card-value">
                {summary?.avg_amount != null ? `₱${Number(summary.avg_amount).toFixed(2)}` : "—"}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-title">Processing Speed — Last 30 Orders</span>
              <span className="chart-legend">
                <span className="legend-line" /> actual &nbsp;
                <span className="legend-avg" /> average
              </span>
            </div>
            <div className="chart-wrap"><LineChart data={chartData} /></div>
          </div>

          {/* History table */}
          <div className="history-card">
            <div className="history-header">
              <span className="history-title">Transaction History</span>
              <span className="history-count">{total} records</span>
            </div>

            {loading ? (
              <div className="history-loading">Loading…</div>
            ) : history.length === 0 ? (
              <div className="history-empty">No data yet. Process an order to see metrics.</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="metrics-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Order ID</th><th>Timestamp</th>
                        <th>Time (ms)</th><th>Time (s)</th><th>Speed</th>
                        <th>Items</th><th>Total</th><th>Table</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                          <td className="cell-muted">{page * LIMIT + i + 1}</td>
                          <td className="cell-order">#{row.order_id}</td>
                          <td className="cell-time">{row.timestamp}</td>
                          <td className="cell-ms">
                            <span className="ms-bar-wrap">
                              <span className="ms-bar" style={{ width: `${Math.min((row.processing_time_ms / (summary?.max_ms || 1)) * 100, 100)}%` }} />
                              <span className="ms-value">{fmtMs(row.processing_time_ms)}</span>
                            </span>
                          </td>
                          <td className="cell-time">{fmtS(row.processing_time_ms)}</td>
                          <td><SpeedBadge ms={row.processing_time_ms} /></td>
                          <td className="cell-center">{row.item_count}</td>
                          <td className="cell-amount">₱{Number(row.total_amount).toFixed(2)}</td>
                          <td className="cell-muted">{row.table_no}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="page-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    <span className="page-info">Page {page + 1} of {totalPages}</span>
                    <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}