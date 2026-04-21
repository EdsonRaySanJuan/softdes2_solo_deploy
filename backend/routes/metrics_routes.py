from flask import Blueprint, request, jsonify
from db import get_db_connection, is_postgres

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
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@metrics_bp.route("/summary", methods=["GET"])
def get_summary():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ensure_metrics_table_exists(conn, cursor)

        cursor.execute("""
            SELECT
                COUNT(*)                          AS total_orders,
                ROUND(AVG(processing_time_ms), 2) AS avg_ms,
                ROUND(MIN(processing_time_ms), 2) AS min_ms,
                ROUND(MAX(processing_time_ms), 2) AS max_ms,
                ROUND(AVG(item_count), 2)          AS avg_items,
                ROUND(AVG(total_amount), 2)        AS avg_amount
            FROM order_metrics
        """)
        row = cursor.fetchone()
        summary = row if isinstance(row, dict) else dict(zip(
            ["total_orders", "avg_ms", "min_ms", "max_ms", "avg_items", "avg_amount"], row
        ))
        return jsonify({"success": True, "summary": summary}), 200

    except Exception as e:
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
                FROM order_metrics
                ORDER BY id DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
        else:
            cursor.execute("""
                SELECT id, order_id, timestamp, processing_time_ms,
                       item_count, total_amount, payment_method, table_no
                FROM order_metrics
                ORDER BY id DESC
                LIMIT ? OFFSET ?
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
        if conn:
            conn.close()


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
                    SELECT order_id, timestamp, processing_time_ms
                    FROM order_metrics
                    ORDER BY id DESC
                    LIMIT %s
                ) sub
                ORDER BY id ASC
            """, (n,))
        else:
            cursor.execute("""
                SELECT order_id, timestamp, processing_time_ms
                FROM (
                    SELECT id, order_id, timestamp, processing_time_ms
                    FROM order_metrics
                    ORDER BY id DESC
                    LIMIT ?
                ) sub
                ORDER BY id ASC
            """, (n,))

        rows = cursor.fetchall()
        result = [r if isinstance(r, dict) else dict(zip(["order_id", "timestamp", "processing_time_ms"], r)) for r in rows]
        return jsonify({"success": True, "data": result}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()