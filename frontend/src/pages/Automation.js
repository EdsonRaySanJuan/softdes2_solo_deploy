import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import API_BASE_URL from "../config";
import "../styles/automation.css";

// ── Mini SVG spark chart ──────────────────────────────────────────────────────
function SparkLine({ data, color = "#f97316" }) {
  if (!data || data.length < 2) return <span style={{ color: "#444", fontSize: "0.75rem" }}>No data</span>;
  const W = 200, H = 48;
  const vals = data.map((d) => d.processing_time_ms || 0);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const toX = (i) => (i / (vals.length - 1)) * W;
  const toY = (v) => H - 4 - ((v - min) / range) * (H - 8);
  const pts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 200, height: 48 }}>
      <polygon
        points={`0,${H} ${pts} ${W},${H}`}
        fill={color} fillOpacity="0.15"
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Speed badge ───────────────────────────────────────────────────────────────
function SpeedBadge({ ms }) {
  if (ms == null) return null;
  if (ms <= 1000) return <span className="auto-badge auto-badge-fast">Fast</span>;
  if (ms <= 3000) return <span className="auto-badge auto-badge-ok">OK</span>;
  return <span className="auto-badge auto-badge-slow">Slow</span>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Automation() {
  const [logs, setLogs] = useState([]);
  const [botMetrics, setBotMetrics] = useState(null);
  const [botHistory, setBotHistory] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningBot, setIsRunningBot] = useState(false);
  const [lastRunMetric, setLastRunMetric] = useState(null); // stores last run's timing

  const normalizeArray = (payload, key) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload[key])) return payload[key];
    return [];
  };

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rpa/logs`);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setLogs(normalizeArray(data, "logs"));
    } catch (err) {
      console.error("Error fetching RPA logs:", err);
      setLogs([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchBotMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rpa/metrics`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setBotMetrics(data.summary);
        setBotHistory(data.history || []);
      }
    } catch (err) {
      console.error("Error fetching bot metrics:", err);
    }
  }, []);

  const runBotNow = async () => {
    setIsRunningBot(true);
    setLastRunMetric(null);

    // ── Frontend timing (round-trip including network) ──
    const t0 = performance.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`${API_BASE_URL}/rpa/run-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // ── Stop frontend timer ──
      const frontendMs = parseFloat((performance.now() - t0).toFixed(2));

      const data = await res.json();
      console.log("RUN BOT RESPONSE:", data);

      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to run bot");
      }

      // ── Save timing result for display ──
      const metric = {
        frontend_ms: frontendMs,                          // total round-trip
        backend_ms: data.processing_time_ms ?? null,      // actual bot execution
        backend_s: data.processing_time_s ?? null,
        checked_items: data.checked_items ?? 0,
        processed_items: data.processed_items ?? 0,
        logs_sent: data.logs_sent ?? 0,
        bot_name: data.bot_name ?? "inventory_bot",
      };
      setLastRunMetric(metric);

      alert(
        `✅ ${data.message || "Bot executed successfully"}\n\n` +
        `⏱ Bot execution time: ${data.processing_time_ms != null ? data.processing_time_ms + "ms (" + data.processing_time_s + "s)" : "N/A"}\n` +
        `🌐 Total round-trip: ${frontendMs}ms\n` +
        `📦 Checked: ${data.checked_items} | Processed: ${data.processed_items}`
      );

      fetchLogs();
      fetchBotMetrics();
    } catch (err) {
      if (err.name === "AbortError") {
        alert("Server is waking up. Please try again in 30 seconds.");
      } else {
        alert(`Bot run failed: ${err.message}`);
      }
      console.error("Error running bot:", err);
    } finally {
      setIsRunningBot(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchBotMetrics();
    const interval = setInterval(() => { fetchLogs(); fetchBotMetrics(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs, fetchBotMetrics]);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const completedLogs = safeLogs.filter((l) => String(l.status).toLowerCase() === "completed");
  const fmtMs = (v) => v != null ? `${Number(v).toFixed(2)}ms` : "—";
  const fmtS  = (v) => v != null ? `${Number(v).toFixed(4)}s` : "—";

  return (
    <div className="app-body">
      <div className="app-shell">
        <Sidebar role="Admin" />
        <main className="main-content auto-page">

          {/* ── Header ── */}
          <div className="auto-header">
            <div>
              <h1 className="auto-title">Robotic Process Automation</h1>
              <p className="auto-subtitle">Monitor bot activity, performance metrics, and automated inventory tasks.</p>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={runBotNow} disabled={isRunningBot}>
                {isRunningBot ? "Running Bot…" : "▶ Run Bot Now"}
              </button>
              <button className="btn-ghost" onClick={() => { fetchLogs(); fetchBotMetrics(); }} disabled={isRefreshing}>
                {isRefreshing ? "Refreshing…" : "↻ Refresh"}
              </button>
              <button className="btn-danger" onClick={async () => {
                if (!window.confirm("Clear all automation logs?")) return;
                try {
                  const res = await fetch(`${API_BASE_URL}/rpa/logs/clear`, { method: "DELETE" });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed");
                  alert(data.message || "Logs cleared");
                  fetchLogs();
                } catch (err) {
                  alert("Failed to clear logs");
                }
              }}>
                Clear Logs
              </button>
            </div>
          </div>

          {/* ── Last Run Result banner ── */}
          {lastRunMetric && (
            <div className="last-run-banner">
              <div className="last-run-title">✅ Last Bot Run — Performance</div>
              <div className="last-run-grid">
                <div className="last-run-item">
                  <div className="last-run-label">Bot Execution</div>
                  <div className="last-run-value">{fmtMs(lastRunMetric.backend_ms)}</div>
                  <div className="last-run-sub">{fmtS(lastRunMetric.backend_s)}</div>
                </div>
                <div className="last-run-item">
                  <div className="last-run-label">Round-trip (Frontend)</div>
                  <div className="last-run-value">{fmtMs(lastRunMetric.frontend_ms)}</div>
                  <div className="last-run-sub">incl. network latency</div>
                </div>
                <div className="last-run-item">
                  <div className="last-run-label">Latency</div>
                  <div className="last-run-value">
                    {lastRunMetric.frontend_ms != null && lastRunMetric.backend_ms != null
                      ? fmtMs(lastRunMetric.frontend_ms - lastRunMetric.backend_ms)
                      : "—"}
                  </div>
                  <div className="last-run-sub">round-trip − execution</div>
                </div>
                <div className="last-run-item">
                  <div className="last-run-label">Items Checked</div>
                  <div className="last-run-value">{lastRunMetric.checked_items}</div>
                </div>
                <div className="last-run-item">
                  <div className="last-run-label">Items Processed</div>
                  <div className="last-run-value">{lastRunMetric.processed_items}</div>
                </div>
                <div className="last-run-item">
                  <div className="last-run-label">Speed</div>
                  <div className="last-run-value"><SpeedBadge ms={lastRunMetric.backend_ms} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ── KPI cards ── */}
          <div className="auto-kpi-row">
            <div className="auto-kpi">
              <div className="auto-kpi-label">Active Bots</div>
              <div className="auto-kpi-value">1</div>
              <div className="auto-kpi-sub">Inventory-Master-V1</div>
            </div>
            <div className="auto-kpi">
              <div className="auto-kpi-label">Total Bot Runs</div>
              <div className="auto-kpi-value">{botMetrics?.total_runs ?? "—"}</div>
              <div className="auto-kpi-sub">all time</div>
            </div>
            <div className="auto-kpi">
              <div className="auto-kpi-label">Completed Tasks</div>
              <div className="auto-kpi-value">{completedLogs.length}</div>
              <div className="auto-kpi-sub">from logs</div>
            </div>
            <div className="auto-kpi">
              <div className="auto-kpi-label">Avg Bot Speed</div>
              <div className="auto-kpi-value">{fmtMs(botMetrics?.avg_ms)}</div>
              <div className="auto-kpi-sub">{fmtS(botMetrics?.avg_s)}</div>
            </div>
            <div className="auto-kpi">
              <div className="auto-kpi-label">AHT (Bot)</div>
              <div className="auto-kpi-value">{fmtS(botMetrics?.aht_s)}</div>
              <div className="auto-kpi-sub">avg handling time</div>
            </div>
            <div className="auto-kpi auto-kpi-green">
              <div className="auto-kpi-label">Fastest Run</div>
              <div className="auto-kpi-value">{fmtMs(botMetrics?.min_ms)}</div>
              <div className="auto-kpi-sub">{fmtS(botMetrics?.min_s)}</div>
            </div>
            <div className="auto-kpi auto-kpi-red">
              <div className="auto-kpi-label">Slowest Run</div>
              <div className="auto-kpi-value">{fmtMs(botMetrics?.max_ms)}</div>
              <div className="auto-kpi-sub">{fmtS(botMetrics?.max_s)}</div>
            </div>
          </div>

          {/* ── Bot Run History table ── */}
          {botHistory.length > 0 && (
            <div className="auto-panel">
              <div className="auto-panel-header">
                <span>Bot Run Metrics History</span>
                <span className="auto-panel-count">{botHistory.length} runs</span>
              </div>
              <div className="table-wrap">
                <table className="auto-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Bot</th>
                      <th>Time (ms)</th>
                      <th>Time (s)</th>
                      <th>Speed</th>
                      <th>Checked</th>
                      <th>Processed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {botHistory.map((row, i) => (
                      <tr key={row.id} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                        <td className="cell-mono">{row.timestamp}</td>
                        <td className="cell-bold">{row.bot_name}</td>
                        <td className="cell-mono">{fmtMs(row.processing_time_ms)}</td>
                        <td className="cell-mono">{fmtS(row.processing_time_s)}</td>
                        <td><SpeedBadge ms={row.processing_time_ms} /></td>
                        <td className="cell-center">{row.checked_items}</td>
                        <td className="cell-center">{row.processed_items}</td>
                        <td>
                          <span className={`auto-status ${row.status === "completed" ? "status-ok" : "status-fail"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Live Bot Activity (existing logs) ── */}
          <div className="auto-panel" style={{ marginTop: "1.5rem" }}>
            <div className="auto-panel-header">
              <span>Live Bot Activity</span>
              <span className="auto-badge auto-badge-fast">Bot Online</span>
            </div>
            <div className="table-wrap">
              <table className="auto-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Bot Name</th>
                    <th>Task Performed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="auto-empty">
                        No automation logs yet. Run the bot to see activity.
                      </td>
                    </tr>
                  ) : (
                    safeLogs
                      .filter((log) => String(log.status).toLowerCase() === "completed")
                      .map((log, index) => (
                        <tr key={log.id || index} className={index % 2 === 0 ? "row-even" : "row-odd"}>
                          <td className="cell-mono">{log.timestamp || "—"}</td>
                          <td className="cell-bold">{log.bot_name || "Unknown Bot"}</td>
                          <td>{log.task_description || "No description"}</td>
                          <td>
                            <span className={`auto-status ${
                              String(log.status || "").toLowerCase() === "completed"
                                ? "status-ok" : "status-warn"
                            }`}>
                              {log.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}