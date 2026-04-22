from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from db import get_db_connection, is_postgres
from rpa_agent import run_automation_cycle
import time

rpa_bp = Blueprint("rpa", __name__)


def rows_to_dicts(rows):
    result = []
    for row in rows:
        if isinstance(row, dict):
            result.append(row)
        else:
            result.append(dict(row))
    return result


def ensure_bot_metrics_table(conn, cursor):
    """Separate table for bot run performance metrics."""
    if is_postgres(conn):
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bot_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TEXT,
                bot_name TEXT,
                processing_time_ms REAL,
                processing_time_s REAL,
                checked_items INTEGER,
                processed_items INTEGER,
                logs_sent INTEGER,
                status TEXT
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bot_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                bot_name TEXT,
                processing_time_ms REAL,
                processing_time_s REAL,
                checked_items INTEGER,
                processed_items INTEGER,
                logs_sent INTEGER,
                status TEXT
            )
        """)
    conn.commit()


# =====================================================
# RUN BOT — now records processing time
# =====================================================
@rpa_bp.route("/run-bot", methods=["POST", "OPTIONS"])
def run_bot():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        current_app.logger.info("RUN BOT: route entered")

        conn = get_db_connection()
        print("🔥 USING POSTGRES:", is_postgres(conn))
        conn.close()

        # ── START timing ─────────────────────────────
        t0 = time.perf_counter()
        # ─────────────────────────────────────────────

        result = run_automation_cycle()

        # ── STOP timing ──────────────────────────────
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        elapsed_s  = round((time.perf_counter() - t0), 4)
        # ─────────────────────────────────────────────

        current_app.logger.info(f"RUN BOT: function returned: {result}")

        # ── Save bot metric to bot_metrics table ─────
        try:
            conn2 = get_db_connection()
            cursor2 = conn2.cursor()
            ensure_bot_metrics_table(conn2, cursor2)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            bot_name = result.get("bot_name", "inventory_bot")
            status = "completed" if result.get("success") else "failed"

            if is_postgres(conn2):
                cursor2.execute("""
                    INSERT INTO bot_metrics
                        (timestamp, bot_name, processing_time_ms, processing_time_s,
                         checked_items, processed_items, logs_sent, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    timestamp, bot_name, elapsed_ms, elapsed_s,
                    result.get("checked_items", 0),
                    result.get("processed_items", 0),
                    result.get("logs_sent", 0),
                    status
                ))
            else:
                cursor2.execute("""
                    INSERT INTO bot_metrics
                        (timestamp, bot_name, processing_time_ms, processing_time_s,
                         checked_items, processed_items, logs_sent, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    timestamp, bot_name, elapsed_ms, elapsed_s,
                    result.get("checked_items", 0),
                    result.get("processed_items", 0),
                    result.get("logs_sent", 0),
                    status
                ))
            conn2.commit()
            conn2.close()
        except Exception as metric_err:
            current_app.logger.warning(f"Bot metric save failed (non-critical): {metric_err}")
        # ─────────────────────────────────────────────

        return jsonify({
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "bot_name": result.get("bot_name", "Unknown Bot"),
            "checked_items": result.get("checked_items", 0),
            "processed_items": result.get("processed_items", 0),
            "logs_sent": result.get("logs_sent", 0),
            "items": result.get("items", []),
            # ── NEW: return timing to frontend ──
            "processing_time_ms": elapsed_ms,
            "processing_time_s": elapsed_s,
        }), 200 if result.get("success") else 500

    except Exception as e:
        current_app.logger.exception(f"RUN BOT ERROR: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =====================================================
# GET BOT METRICS — for admin automation page
# =====================================================
@rpa_bp.route("/metrics", methods=["GET"])
def get_bot_metrics():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_bot_metrics_table(conn, cursor)

        # Summary
        cursor.execute("""
            SELECT
                COUNT(*)                                AS total_runs,
                ROUND(AVG(processing_time_ms), 2)       AS avg_ms,
                ROUND(MIN(processing_time_ms), 2)       AS min_ms,
                ROUND(MAX(processing_time_ms), 2)       AS max_ms,
                ROUND(AVG(processing_time_s), 4)        AS avg_s,
                ROUND(MIN(processing_time_s), 4)        AS min_s,
                ROUND(MAX(processing_time_s), 4)        AS max_s,
                ROUND(AVG(checked_items), 2)            AS avg_checked,
                ROUND(AVG(processed_items), 2)          AS avg_processed
            FROM bot_metrics
        """)
        row = cursor.fetchone()
        summary = row if isinstance(row, dict) else dict(zip(
            ["total_runs", "avg_ms", "min_ms", "max_ms",
             "avg_s", "min_s", "max_s", "avg_checked", "avg_processed"], row
        ))

        # AHT = avg_s (same formula: total time / number of runs)
        summary["aht_s"] = summary.get("avg_s")

        # History (last 30)
        limit = int(request.args.get("limit", 30))
        offset = int(request.args.get("offset", 0))

        if is_postgres(conn):
            cursor.execute("""
                SELECT id, timestamp, bot_name, processing_time_ms, processing_time_s,
                       checked_items, processed_items, logs_sent, status
                FROM bot_metrics
                ORDER BY id DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
        else:
            cursor.execute("""
                SELECT id, timestamp, bot_name, processing_time_ms, processing_time_s,
                       checked_items, processed_items, logs_sent, status
                FROM bot_metrics
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))

        history = rows_to_dicts(cursor.fetchall())

        cursor.execute("SELECT COUNT(*) AS cnt FROM bot_metrics")
        count_row = cursor.fetchone()
        total = (count_row["cnt"] if isinstance(count_row, dict) else count_row[0]) or 0

        return jsonify({
            "success": True,
            "summary": summary,
            "total": total,
            "history": history
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()


# =====================================================
# ADD LOG
# =====================================================
@rpa_bp.route("/log", methods=["POST", "OPTIONS"])
def add_log():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json() or {}
    bot_name = str(data.get("bot_name", "Unknown Bot")).strip()
    task = str(data.get("task_description", "No description")).strip()
    status = str(data.get("status", "Info")).strip()

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if is_postgres(conn):
            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                VALUES (%s, %s, %s, %s)
            """, (timestamp, bot_name, task, status))
        else:
            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                VALUES (?, ?, ?, ?)
            """, (timestamp, bot_name, task, status))

        conn.commit()
        return jsonify({"success": True}), 201

    except Exception as e:
        current_app.logger.exception(f"ADD LOG ERROR: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()


# =====================================================
# GET LOGS
# =====================================================
@rpa_bp.route("/logs", methods=["GET"])
def get_logs():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT item_name, current_stock, reorder_level
            FROM inventory
            WHERE current_stock <= reorder_level
        """)
        low_items = cursor.fetchall()

        for row in low_items:
            item_name     = row["item_name"]     if isinstance(row, dict) else row[0]
            current_stock = row["current_stock"] if isinstance(row, dict) else row[1]
            reorder_level = row["reorder_level"] if isinstance(row, dict) else row[2]

            msg = f"{item_name} is low on stock ({current_stock} <= reorder level {reorder_level})"

            if is_postgres(conn):
                cursor.execute("""
                    SELECT 1 FROM rpa_logs
                    WHERE task_description = %s AND status = %s LIMIT 1
                """, (msg, "LOW_STOCK_ALERT"))
            else:
                cursor.execute("""
                    SELECT 1 FROM rpa_logs
                    WHERE task_description = ? AND status = ? LIMIT 1
                """, (msg, "LOW_STOCK_ALERT"))

            if not cursor.fetchone():
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if is_postgres(conn):
                    cursor.execute("""
                        INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                        VALUES (%s, %s, %s, %s)
                    """, (timestamp, "inventory_bot", msg, "LOW_STOCK_ALERT"))
                else:
                    cursor.execute("""
                        INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                        VALUES (?, ?, ?, ?)
                    """, (timestamp, "inventory_bot", msg, "LOW_STOCK_ALERT"))

        conn.commit()

        cursor.execute("""
            SELECT id, timestamp, bot_name, task_description, status
            FROM rpa_logs
            ORDER BY id DESC
            LIMIT 50
        """)
        logs = rows_to_dicts(cursor.fetchall())

        return jsonify({"success": True, "count": len(logs), "logs": logs}), 200

    except Exception as e:
        current_app.logger.exception(f"GET LOGS ERROR: {e}")
        return jsonify({"success": False, "error": str(e), "logs": []}), 500
    finally:
        if conn:
            conn.close()


# =====================================================
# CLEAR LOGS
# =====================================================
@rpa_bp.route("/logs/clear", methods=["DELETE"])
def clear_logs():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM rpa_logs")
        conn.commit()
        return jsonify({"success": True, "message": "All automation logs cleared."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()