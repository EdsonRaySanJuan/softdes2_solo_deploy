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

ADDON_CSV_PATH = os.path.join(DATA_DIR, "addon_recipes.csv")


def rows_to_dicts(rows):
    return [row if isinstance(row, dict) else dict(row) for row in rows]


def compute_status(current_stock, reorder_level):
    if current_stock <= 0:
        return "Out of Stock"
    elif current_stock <= (reorder_level * 0.25):
        return "Critical"
    elif current_stock <= reorder_level:
        return "Low"
    return "Normal"


# ===============================
# 🔥 NEW: SEED INVENTORY FROM ADDON CSV
# ===============================
@inventory_bp.route("/seed-from-addon", methods=["GET"])
def seed_from_addon_csv():
    try:
        if not os.path.exists(ADDON_CSV_PATH):
            return jsonify({
                "success": False,
                "error": f"addon_recipes.csv not found at {ADDON_CSV_PATH}"
            }), 404

        with open(ADDON_CSV_PATH, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        conn = get_db_connection()
        cursor = conn.cursor()

        processed = 0

        for row in rows:
            item_name = str(row["ingredient_name"]).strip()
            unit = str(row.get("unit", "pcs")).strip()

            # 🔥 CORE FIX: use stocks column
            current_stock = int(float(row.get("stocks", 1000)))

            # auto compute
            reorder_level = int(current_stock * 0.2)
            reorder_qty = int(current_stock * 0.3)

            category = "general"
            supplier = "auto"

            status = compute_status(current_stock, reorder_level)

            if is_postgres():
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
                        status = EXCLUDED.status
                """, (
                    item_name, category, unit,
                    current_stock, reorder_level,
                    reorder_qty, status, supplier
                ))
            else:
                cursor.execute("""
                    INSERT OR REPLACE INTO inventory (
                        item_name, category, unit, current_stock,
                        reorder_level, reorder_qty, status, supplier
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item_name, category, unit,
                    current_stock, reorder_level,
                    reorder_qty, status, supplier
                ))

            processed += 1

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Inventory seeded from addon_recipes.csv",
            "processed": processed
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ===============================
# EXISTING ROUTES (UNCHANGED)
# ===============================

@inventory_bp.route("/", methods=["GET"])
def get_inventory():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM inventory
            ORDER BY category ASC, item_name ASC
        """)

        items = rows_to_dicts(cursor.fetchall())
        conn.close()

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


@inventory_bp.route("/reorder-list", methods=["GET"])
def get_reorder_list():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM inventory
            WHERE status IN ('Critical', 'Low', 'Out of Stock')
            ORDER BY current_stock ASC
        """)

        items = rows_to_dicts(cursor.fetchall())
        conn.close()

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