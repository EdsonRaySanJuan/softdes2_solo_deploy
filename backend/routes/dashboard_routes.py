import os
import pandas as pd
from flask import Blueprint, jsonify, request
from datetime import timedelta, datetime

dashboard_bp = Blueprint('dashboard', __name__)

def load_data():
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    csv_path = os.path.join(basedir, "data", "monthly_Sales.csv")
    
    try:
        df = pd.read_csv(csv_path)

        # 🔥 FIX 1: Handle BOTH date formats safely
        df["datetime"] = pd.to_datetime(
            df["datetime"],
            format="mixed",   # 🔥 THIS IS THE FIX
            errors="coerce"
        )

        df = df.dropna(subset=['datetime'])

        # 🔥 NEW: ensure numeric fields are correct
        df["line_total"] = pd.to_numeric(df["line_total"], errors="coerce").fillna(0)
        df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0)
        df["order_id"] = pd.to_numeric(df["order_id"], errors="coerce")

        return df

    except Exception as e:
        print(f"Error loading dashboard data: {e}")
        return pd.DataFrame()


@dashboard_bp.route("/stats", methods=["GET"])
def get_stats():
    try:
        range_days = int(request.args.get("range", 1))
        df = load_data()
        print("===== LAST 5 ROWS FROM CSV =====")
        print(df.tail(5))

        if df.empty:
            return jsonify({
                "total_revenue": 0,
                "total_orders": 0,
                "items_sold": 0,
                "alerts": 0,
                "recent_orders": []
            })

        df["date_only"] = df["datetime"].dt.date

        # 🔥 FIX 2: Smart date handling (won’t hide new orders)
        today = datetime.now().date()
        latest_csv_date = df["date_only"].max()

        # Use whichever is newer
        latest_date = max(today, latest_csv_date)

        start_date = latest_date - timedelta(days=range_days - 1)

        filtered_df = df[df["date_only"] >= start_date]

        # 🔥 SAFETY: if filter removes everything, fallback to all data
        if filtered_df.empty:
            filtered_df = df

        # KPIs
        total_revenue = filtered_df["line_total"].sum()
        total_orders = filtered_df["order_id"].nunique()
        items_sold = filtered_df["qty"].sum()

        # Recent Orders
        recent = filtered_df.sort_values(by="datetime", ascending=False).head(5)

        recent_list = []
        for _, row in recent.iterrows():
            recent_list.append({
                "datetime": row["datetime"].strftime("%Y-%m-%d %H:%M"),
                "order_id": int(row["order_id"]) if not pd.isna(row["order_id"]) else 0,
                "item_name": row["item_name"],
                "qty": int(row["qty"]),
                "line_total": float(row["line_total"]),
                "payment_method": row["payment_method"]
            })

        return jsonify({
            "total_revenue": float(total_revenue),
            "total_orders": int(total_orders),
            "items_sold": int(items_sold),
            "alerts": 0,
            "recent_orders": recent_list
        })

    except Exception as e:
        print(f"Dashboard Error: {e}")
        return jsonify({"error": str(e)}), 500