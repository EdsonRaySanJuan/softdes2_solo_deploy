import os
import csv
import io
import sqlite3

from flask import Blueprint, jsonify, request, Response
from db import get_db_connection, is_postgres

inventory_bp = Blueprint("inventory", __name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, "data")


def rows_to_dicts(rows):
    result = []
    for row in rows:
        if isinstance(row, dict):
            result.append(row)
        else:
            result.append(dict(row))
    return result


def csv_file_path(filename):
    safe_name = os.path.basename(filename)
    return os.path.join(DATA_DIR, safe_name)


def compute_status(current_stock, reorder_level):
    status = "Normal"
    if current_stock <= 0:
        status = "Out of Stock"
    elif current_stock <= (reorder_level * 0.25):
        status = "Critical"
    elif current_stock <= reorder_level:
        status = "Low"
    return status


@inventory_bp.route("/", methods=["GET"])
def get_inventory():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        search = str(request.args.get("search", "")).strip()
        category = str(request.args.get("category", "")).strip()
        status = str(request.args.get("status", "")).strip()

        using_pg = is_postgres(conn)

        query = """
            SELECT
                id,
                item_name,
                category,
                unit,
                current_stock,
                reorder_level,
                reorder_qty,
                COALESCE(
                    status,
                    CASE
                        WHEN current_stock <= 0 THEN 'Out of Stock'
                        WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
                        WHEN current_stock <= reorder_level THEN 'Low'
                        ELSE 'Normal'
                    END
                ) AS status,
                COALESCE(supplier, 'N/A') AS supplier
            FROM inventory
            WHERE 1=1
        """
        params = []

        if search:
            if using_pg:
                query += " AND LOWER(item_name) LIKE %s"
            else:
                query += " AND LOWER(item_name) LIKE ?"
            params.append(f"%{search.lower()}%")

        if category:
            if using_pg:
                query += " AND LOWER(category) = %s"
            else:
                query += " AND LOWER(category) = ?"
            params.append(category.lower())

        if status:
            if using_pg:
                query += """
                    AND LOWER(
                        COALESCE(
                            status,
                            CASE
                                WHEN current_stock <= 0 THEN 'Out of Stock'
                                WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
                                WHEN current_stock <= reorder_level THEN 'Low'
                                ELSE 'Normal'
                            END
                        )
                    ) = %s
                """
            else:
                query += """
                    AND LOWER(
                        COALESCE(
                            status,
                            CASE
                                WHEN current_stock <= 0 THEN 'Out of Stock'
                                WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
                                WHEN current_stock <= reorder_level THEN 'Low'
                                ELSE 'Normal'
                            END
                        )
                    ) = ?
                """
            params.append(status.lower())

        query += " ORDER BY category ASC, item_name ASC"

        cursor.execute(query, tuple(params) if using_pg else params)
        items = rows_to_dicts(cursor.fetchall())

        return jsonify({
            "success": True,
            "count": len(items),
            "items": items
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/recalculate-status", methods=["POST"])
def recalculate_inventory_status():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE inventory
            SET status = CASE
                WHEN current_stock <= 0 THEN 'Out of Stock'
                WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
                WHEN current_stock <= reorder_level THEN 'Low'
                ELSE 'Normal'
            END
        """)

        conn.commit()

        cursor.execute("""
            SELECT
                id,
                item_name,
                category,
                unit,
                current_stock,
                reorder_level,
                reorder_qty,
                status,
                COALESCE(supplier, 'N/A') AS supplier
            FROM inventory
            ORDER BY category ASC, item_name ASC
        """)
        items = rows_to_dicts(cursor.fetchall())

        low_stock_items = [
            item for item in items
            if item["status"] in ["Low", "Critical", "Out of Stock"]
        ]

        return jsonify({
            "success": True,
            "message": "Inventory statuses recalculated successfully",
            "count": len(items),
            "low_stock_count": len(low_stock_items),
            "items": items,
            "low_stock_items": low_stock_items
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/csv-list", methods=["GET"])
def get_csv_list():
    try:
        if not os.path.exists(DATA_DIR):
            return jsonify({
                "success": True,
                "files": []
            }), 200

        files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(".csv")]
        files.sort()

        return jsonify({
            "success": True,
            "count": len(files),
            "files": files
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@inventory_bp.route("/csv-view/<path:filename>", methods=["GET"])
def view_csv_file(filename):
    try:
        file_path = csv_file_path(filename)

        if not os.path.exists(file_path):
            return jsonify({"success": False, "error": f"{filename} not found"}), 404

        with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))

        return jsonify({
            "success": True,
            "filename": os.path.basename(filename),
            "count": len(rows),
            "rows": rows
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@inventory_bp.route("/export-db-csv", methods=["GET"])
def export_inventory_db_to_csv():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT *
            FROM inventory
            ORDER BY category ASC, item_name ASC
        """)
        rows = cursor.fetchall()

        if not rows:
            return jsonify({"success": False, "error": "No inventory data found"}), 404

        rows = rows_to_dicts(rows)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

        csv_data = output.getvalue()
        output.close()

        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=inventory_export.csv"}
        )

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/", methods=["POST"])
def add_item():
    conn = None
    try:
        data = request.get_json(force=True)

        item_name = str(data.get("item_name", "")).strip()
        category = str(data.get("category", "")).strip()
        unit = str(data.get("unit", "pcs")).strip()
        current_stock = float(data.get("current_stock", 0) or 0)
        reorder_level = float(data.get("reorder_level", 10) or 10)
        reorder_qty = float(data.get("reorder_qty", 0) or 0)
        supplier = str(data.get("supplier", "N/A")).strip()

        if not item_name or not category:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        status = compute_status(current_stock, reorder_level)

        conn = get_db_connection()
        cursor = conn.cursor()

        if is_postgres(conn):
            cursor.execute("""
                INSERT INTO inventory (
                    item_name, category, unit, current_stock,
                    reorder_level, reorder_qty, status, supplier
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item_name, category, unit, current_stock,
                reorder_level, reorder_qty, status, supplier
            ))
        else:
            cursor.execute("""
                INSERT INTO inventory (
                    item_name, category, unit, current_stock,
                    reorder_level, reorder_qty, status, supplier
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item_name, category, unit, current_stock,
                reorder_level, reorder_qty, status, supplier
            ))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Item added successfully!"
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({
            "success": False,
            "error": "Item already exists in inventory"
        }), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/<int:item_id>", methods=["PUT"])
def update_item(item_id):
    conn = None
    try:
        data = request.get_json()

        conn = get_db_connection()
        cursor = conn.cursor()

        if is_postgres(conn):
            cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
        else:
            cursor.execute("SELECT * FROM inventory WHERE id = ?", (item_id,))

        item = cursor.fetchone()
        if not item:
            return jsonify({"success": False, "error": "Item not found"}), 404

        item = item if isinstance(item, dict) else dict(item)

        new_name = str(data.get("item_name", item["item_name"])).strip()
        new_cat = str(data.get("category", item["category"])).strip()
        new_unit = str(data.get("unit", item["unit"])).strip()
        new_stock = float(data.get("current_stock", item["current_stock"]))
        new_reorder_lvl = float(data.get("reorder_level", item["reorder_level"]))
        new_reorder_qty = float(data.get("reorder_qty", item.get("reorder_qty", 0)))
        new_supplier = str(data.get("supplier", item.get("supplier", "N/A") or "N/A")).strip()

        status = compute_status(new_stock, new_reorder_lvl)

        if is_postgres(conn):
            cursor.execute("""
                UPDATE inventory
                SET item_name = %s,
                    category = %s,
                    unit = %s,
                    current_stock = %s,
                    reorder_level = %s,
                    reorder_qty = %s,
                    supplier = %s,
                    status = %s
                WHERE id = %s
            """, (
                new_name, new_cat, new_unit, new_stock,
                new_reorder_lvl, new_reorder_qty, new_supplier, status, item_id
            ))
        else:
            cursor.execute("""
                UPDATE inventory
                SET item_name = ?,
                    category = ?,
                    unit = ?,
                    current_stock = ?,
                    reorder_level = ?,
                    reorder_qty = ?,
                    supplier = ?,
                    status = ?
                WHERE id = ?
            """, (
                new_name, new_cat, new_unit, new_stock,
                new_reorder_lvl, new_reorder_qty, new_supplier, status, item_id
            ))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Item updated successfully!"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if is_postgres(conn):
            cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
        else:
            cursor.execute("SELECT * FROM inventory WHERE id = ?", (item_id,))

        item = cursor.fetchone()
        if not item:
            return jsonify({"success": False, "error": "Item not found"}), 404

        if is_postgres(conn):
            cursor.execute("DELETE FROM inventory WHERE id = %s", (item_id,))
        else:
            cursor.execute("DELETE FROM inventory WHERE id = ?", (item_id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Item deleted successfully!"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/reorder-list", methods=["GET"])
def get_reorder_list():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                id,
                item_name,
                category,
                unit,
                current_stock,
                reorder_level,
                reorder_qty,
                COALESCE(
                    status,
                    CASE
                        WHEN current_stock <= 0 THEN 'Out of Stock'
                        WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
                        WHEN current_stock <= reorder_level THEN 'Low'
                        ELSE 'Normal'
                    END
                ) AS status,
                COALESCE(supplier, 'N/A') AS supplier
            FROM inventory
            WHERE COALESCE(
                status,
                CASE
                    WHEN current_stock <= 0 THEN 'Out of Stock'
                    WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
                    WHEN current_stock <= reorder_level THEN 'Low'
                    ELSE 'Normal'
                END
            ) IN ('Critical', 'Low', 'Out of Stock')
            ORDER BY current_stock ASC, item_name ASC
        """)

        items = rows_to_dicts(cursor.fetchall())

        return jsonify({
            "success": True,
            "count": len(items),
            "items": items
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()


@inventory_bp.route("/debug/seed-inventory", methods=["GET"])
def seed_inventory():
    conn = None
    try:
        addon_path = os.path.join(DATA_DIR, "addon_recipes.csv")

        if not os.path.exists(addon_path):
            return jsonify({
                "success": False,
                "error": f"CSV not found at {addon_path}"
            }), 404

        with open(addon_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        conn = get_db_connection()
        cursor = conn.cursor()

        processed = 0
        seen_ingredients = set()

        for row in rows:
            item_name = str(row.get("ingredient_name", "")).strip()
            if not item_name:
                continue

            normalized_name = item_name.lower()
            if normalized_name in seen_ingredients:
                continue
            seen_ingredients.add(normalized_name)

            unit = str(row.get("unit", "pcs")).strip()

            stocks_value = str(row.get("stocks", "")).strip()
            current_stock = float(stocks_value) if stocks_value else 1000.0

            reorder_level = max(current_stock * 0.2, 1)
            reorder_qty = max(current_stock * 0.3, 1)
            category = "general"
            supplier = "auto"
            status = compute_status(current_stock, reorder_level)

            if is_postgres(conn):
                cursor.execute("""
                    INSERT INTO inventory (
                        item_name, category, unit, current_stock,
                        reorder_level, reorder_qty, status, supplier
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (item_name)
                    DO UPDATE SET
                        current_stock = EXCLUDED.current_stock,
                        reorder_level = EXCLUDED.reorder_level,
                        reorder_qty = EXCLUDED.reorder_qty,
                        status = EXCLUDED.status,
                        unit = EXCLUDED.unit,
                        category = EXCLUDED.category,
                        supplier = EXCLUDED.supplier
                """, (
                    item_name, category, unit, current_stock,
                    reorder_level, reorder_qty, status, supplier
                ))
            else:
                cursor.execute("""
                    INSERT OR REPLACE INTO inventory (
                        item_name, category, unit, current_stock,
                        reorder_level, reorder_qty, status, supplier
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item_name, category, unit, current_stock,
                    reorder_level, reorder_qty, status, supplier
                ))

            processed += 1

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Inventory seeded successfully",
            "processed": processed
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()