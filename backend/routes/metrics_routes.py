from flask import Blueprint, request, jsonify
from db import get_db_connection, is_postgres
import datetime

metrics_bp = Blueprint("metrics", __name__)


def ensure_metrics_table_exists(conn, cursor):
    if is_postgres(conn):
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS order_metrics (
                id SERIAL PRIMARY KEY,
                order_id INTEGER,
                timestamp TEXT,
                processing_time_ms REAL,
                item_count INTEGER,
                total_amount REAL,
                payment_method TEXT,
                table_no TEXT
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS order_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                timestamp TEXT,
                processing_time_ms REAL,
                item_count INTEGER,
                total_amount REAL,
                payment_method TEXT,
                table_no TEXT
            )
        """)
    conn.commit()


def ensure_hwmonitor_table_exists(conn, cursor):
    if is_postgres(conn):
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hwmonitor_logs (
                id SERIAL PRIMARY KEY,
                timestamp TEXT,
                power_watts REAL,
                temperature_celsius REAL,
                tasks_count INTEGER,
                notes TEXT
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hwmonitor_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                power_watts REAL,
                temperature_celsius REAL,
                tasks_count INTEGER,
                notes TEXT
            )
        """)
    conn.commit()


# ── Employee: record order processing time ───────────────────────────────────

@metrics_bp.route("/record", methods=["POST"])
def record_metric():
    conn = None
    try:
        data = request.get_json(silent=True) or {}
        order_id = data.get("order_id")
        timestamp = data.get("timestamp")
        processing_time_ms = float(data.get("processing_time_ms", 0))
        item_count = int(data.get("item_count", 0))
        total_amount = float(data.get("total_amount", 0))
        payment_method = str(data.get("payment_method", "Cash"))
        table_no = str(data.get("table_no", "Walk-in"))

        if not order_id or processing_time_ms <= 0:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)

        if is_postgres(conn):
            cursor.execute("""
                INSERT INTO order_metrics
                    (order_id, timestamp, processing_time_ms, item_count, total_amount, payment_method, table_no)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (order_id, timestamp, processing_time_ms, item_count, total_amount, payment_method, table_no))
        else:
            cursor.execute("""
                INSERT INTO order_metrics
                    (order_id, timestamp, processing_time_ms, item_count, total_amount, payment_method, table_no)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (order_id, timestamp, processing_time_ms, item_count, total_amount, payment_method, table_no))

        conn.commit()
        return jsonify({"success": True}), 201

    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


# ── Employee: order metrics summary + history + chart ────────────────────────

@metrics_bp.route("/summary", methods=["GET"])
def get_summary():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)

        cursor.execute("""
            SELECT
                COUNT(*) AS total_orders,
                AVG(processing_time_ms) AS avg_ms,
                MIN(processing_time_ms) AS min_ms,
                MAX(processing_time_ms) AS max_ms,
                AVG(item_count) AS avg_items,
                AVG(total_amount) AS avg_amount
            FROM order_metrics
        """)

        row = cursor.fetchone()

        if not row:
            summary = {
                "total_orders": 0,
                "avg_ms": 0,
                "min_ms": 0,
                "max_ms": 0,
                "avg_items": 0,
                "avg_amount": 0
            }

        # 🔥 HANDLE BOTH TYPES
        elif isinstance(row, dict):
            summary = {
                "total_orders": int(row.get("total_orders") or 0),
                "avg_ms": float(row.get("avg_ms") or 0),
                "min_ms": float(row.get("min_ms") or 0),
                "max_ms": float(row.get("max_ms") or 0),
                "avg_items": float(row.get("avg_items") or 0),
                "avg_amount": float(row.get("avg_amount") or 0),
            }
        else:
            summary = {
                "total_orders": int(row[0] or 0),
                "avg_ms": float(row[1] or 0),
                "min_ms": float(row[2] or 0),
                "max_ms": float(row[3] or 0),
                "avg_items": float(row[4] or 0),
                "avg_amount": float(row[5] or 0),
            }

        print("SUMMARY FIXED:", summary)

        return jsonify({"success": True, "summary": summary}), 200

    except Exception as e:
        print("SUMMARY ERROR:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if conn:
            conn.close()


@metrics_bp.route("/history", methods=["GET"])
def get_history():
    conn = None
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)

        if is_postgres(conn):
            cursor.execute("""
                SELECT id, order_id, timestamp, processing_time_ms,
                       item_count, total_amount, payment_method, table_no
                FROM order_metrics ORDER BY id DESC LIMIT %s OFFSET %s
            """, (limit, offset))
        else:
            cursor.execute("""
                SELECT id, order_id, timestamp, processing_time_ms,
                       item_count, total_amount, payment_method, table_no
                FROM order_metrics ORDER BY id DESC LIMIT ? OFFSET ?
            """, (limit, offset))

        rows = cursor.fetchall()
        result = [r if isinstance(r, dict) else dict(r) for r in rows]
        cursor.execute("SELECT COUNT(*) AS cnt FROM order_metrics")
        count_row = cursor.fetchone()
        total = (count_row["cnt"] if isinstance(count_row, dict) else count_row[0]) or 0
        return jsonify({"success": True, "total": total, "history": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


@metrics_bp.route("/chart", methods=["GET"])
def get_chart_data():
    conn = None
    try:
        n = int(request.args.get("n", 30))
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)

        if is_postgres(conn):
            cursor.execute("""
                SELECT order_id, timestamp, processing_time_ms
                FROM (
                    SELECT id, order_id, timestamp, processing_time_ms
                    FROM order_metrics ORDER BY id DESC LIMIT %s
                ) sub ORDER BY id ASC
            """, (n,))
        else:
            cursor.execute("""
                SELECT order_id, timestamp, processing_time_ms
                FROM (
                    SELECT id, order_id, timestamp, processing_time_ms
                    FROM order_metrics ORDER BY id DESC LIMIT ?
                ) sub ORDER BY id ASC
            """, (n,))

        rows = cursor.fetchall()

        result = [
            dict(r) if isinstance(r, dict)
            else dict(zip(["order_id", "timestamp", "processing_time_ms"], r))
            for r in rows
        ]

        return jsonify({"success": True, "data": result}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ── Admin: full performance summary ──────────────────────────────────────────

@metrics_bp.route("/admin/summary", methods=["GET"])
def get_admin_summary():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)
        ensure_hwmonitor_table_exists(conn, cursor)

        cursor.execute("""
            SELECT
                COUNT(*)                                     AS total_orders,
                ROUND(AVG(processing_time_ms) / 1000.0, 4)  AS avg_processing_s,
                ROUND(MIN(processing_time_ms) / 1000.0, 4)  AS min_processing_s,
                ROUND(MAX(processing_time_ms) / 1000.0, 4)  AS max_processing_s,
                ROUND(AVG(processing_time_ms) / 1000.0, 4)  AS aht_s,
                ROUND(AVG(item_count), 2)                    AS avg_items,
                ROUND(AVG(total_amount), 2)                  AS avg_amount
            FROM order_metrics
        """)
        row = cursor.fetchone()
        perf = row if isinstance(row, dict) else dict(zip(
            ["total_orders", "avg_processing_s", "min_processing_s",
             "max_processing_s", "aht_s", "avg_items", "avg_amount"], row
        ))

        # Latest HWMonitor reading
        cursor.execute("""
            SELECT power_watts, temperature_celsius, tasks_count, timestamp
            FROM hwmonitor_logs ORDER BY id DESC LIMIT 1
        """)
        hw_row = cursor.fetchone()
        hw = None
        if hw_row:
            hw = hw_row if isinstance(hw_row, dict) else dict(zip(
                ["power_watts", "temperature_celsius", "tasks_count", "timestamp"], hw_row
            ))
            if hw.get("power_watts") and float(hw["power_watts"]) > 0 and hw.get("tasks_count"):
                hw["tasks_per_watt"] = round(float(hw["tasks_count"]) / float(hw["power_watts"]), 4)
            else:
                hw["tasks_per_watt"] = None

        # HWMonitor averages
        cursor.execute("""
            SELECT
                ROUND(AVG(power_watts), 2)        AS avg_watts,
                ROUND(AVG(temperature_celsius), 2) AS avg_temp,
                COUNT(*)                           AS hw_readings
            FROM hwmonitor_logs
        """)
        hw_agg_row = cursor.fetchone()
        hw_agg = hw_agg_row if isinstance(hw_agg_row, dict) else dict(zip(
            ["avg_watts", "avg_temp", "hw_readings"], hw_agg_row
        ))

        return jsonify({
            "success": True,
            "performance": perf,
            "hwmonitor": hw,
            "hwmonitor_avg": hw_agg
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


@metrics_bp.route("/admin/history", methods=["GET"])
def get_admin_history():
    conn = None
    try:
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)

        if is_postgres(conn):
            cursor.execute("""
                SELECT id, order_id, timestamp,
                       ROUND(processing_time_ms / 1000.0, 4) AS processing_s,
                       processing_time_ms, item_count, total_amount, table_no
                FROM order_metrics ORDER BY id DESC LIMIT %s OFFSET %s
            """, (limit, offset))
        else:
            cursor.execute("""
                SELECT id, order_id, timestamp,
                       ROUND(processing_time_ms / 1000.0, 4) AS processing_s,
                       processing_time_ms, item_count, total_amount, table_no
                FROM order_metrics ORDER BY id DESC LIMIT ? OFFSET ?
            """, (limit, offset))

        rows = cursor.fetchall()
        result = [r if isinstance(r, dict) else dict(r) for r in rows]
        cursor.execute("SELECT COUNT(*) AS cnt FROM order_metrics")
        count_row = cursor.fetchone()
        total = (count_row["cnt"] if isinstance(count_row, dict) else count_row[0]) or 0
        return jsonify({"success": True, "total": total, "history": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


@metrics_bp.route("/admin/hwmonitor", methods=["POST"])
def log_hwmonitor():
    conn = None
    try:
        data = request.get_json(silent=True) or {}
        power_watts = float(data.get("power_watts", 0) or 0)
        temperature_celsius = float(data.get("temperature_celsius", 0) or 0)
        tasks_count = int(data.get("tasks_count", 0) or 0)
        notes = str(data.get("notes", "")).strip()
        timestamp = data.get("timestamp") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_hwmonitor_table_exists(conn, cursor)

        if is_postgres(conn):
            cursor.execute("""
                INSERT INTO hwmonitor_logs (timestamp, power_watts, temperature_celsius, tasks_count, notes)
                VALUES (%s, %s, %s, %s, %s)
            """, (timestamp, power_watts, temperature_celsius, tasks_count, notes))
        else:
            cursor.execute("""
                INSERT INTO hwmonitor_logs (timestamp, power_watts, temperature_celsius, tasks_count, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (timestamp, power_watts, temperature_celsius, tasks_count, notes))

        conn.commit()
        return jsonify({"success": True, "message": "HWMonitor reading logged."}), 201
    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


@metrics_bp.route("/admin/hwmonitor/history", methods=["GET"])
def get_hwmonitor_history():
    conn = None
    try:
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_hwmonitor_table_exists(conn, cursor)

        if is_postgres(conn):
            cursor.execute("""
                SELECT id, timestamp, power_watts, temperature_celsius, tasks_count, notes
                FROM hwmonitor_logs ORDER BY id DESC LIMIT %s OFFSET %s
            """, (limit, offset))
        else:
            cursor.execute("""
                SELECT id, timestamp, power_watts, temperature_celsius, tasks_count, notes
                FROM hwmonitor_logs ORDER BY id DESC LIMIT ? OFFSET ?
            """, (limit, offset))

        rows = cursor.fetchall()
        result = [r if isinstance(r, dict) else dict(r) for r in rows]
        cursor.execute("SELECT COUNT(*) AS cnt FROM hwmonitor_logs")
        count_row = cursor.fetchone()
        total = (count_row["cnt"] if isinstance(count_row, dict) else count_row[0]) or 0
        return jsonify({"success": True, "total": total, "history": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


@metrics_bp.route("/clear", methods=["DELETE"])
def clear_metrics():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # ⚠️ Delete all data
        cursor.execute("DELETE FROM order_metrics")

        conn.commit()

        return jsonify({
            "success": True,
            "message": "All metrics cleared."
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if conn:
            conn.close()