import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import API_BASE_URL from "../config";
import "../styles/inventory.css";

function Inventory() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "Coffee Base",
    unit: "g",
    current_stock: "",
    reorder_level: "",
    supplier: ""
  });

  const normalizeArray = (payload, key) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload[key])) return payload[key];
    return [];
  };

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/`);

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Inventory API response:", data);

      const normalizedItems = normalizeArray(data, "items");
      setItems(normalizedItems);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        alert("Item added!");
        setNewItem({
          item_name: "",
          category: "Coffee Base",
          unit: "g",
          current_stock: "",
          reorder_level: "",
          supplier: ""
        });
        fetchInventory();
      } else {
        alert("Error: " + (data.error || "Failed to add item"));
      }
    } catch (err) {
      console.error("Add item failed:", err);
      alert("Backend connection failed!");
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        alert("Item deleted successfully!");
        fetchInventory();
      } else {
        alert("Error deleting item: " + (data.error || "Delete failed"));
      }
    } catch (err) {
      console.error("Delete request failed:", err);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditFormData(item);
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setEditingId(null);
        fetchInventory();
      } else {
        alert("Failed to update: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];

  const filteredItems = safeItems.filter((item) =>
    String(item.item_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeClass = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "low") return "badge-warning";
    if (normalized === "critical" || normalized === "out of stock") return "badge-danger";
    return "badge-ok";
  };

  return (
    <div className="app-body">
      <div className="app-shell">
        <Sidebar role="Admin" />

        <main className="main-content">
          <header className="topbar">
            <div>
              <h2 className="page-title">Inventory Management</h2>
              <p className="page-subtitle">Track and manage your cafe ingredients.</p>
            </div>
          </header>

          <section className="inventory-grid">
            <div className="panel add-item-form">
              <h3>Add New Ingredient</h3>
              <form onSubmit={handleAddItem}>
                <input
                  type="text"
                  placeholder="Name"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                  required
                />
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  <option>Coffee Base</option>
                  <option>Milk/Dairy</option>
                  <option>Syrups</option>
                  <option>Powders</option>
                  <option>Add-ons/Sinkers</option>
                  <option>Fruit/Lemonade</option>
                </select>
                <input
                  type="text"
                  placeholder="Unit (g, ml, pcs)"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Initial Stock"
                  value={newItem.current_stock}
                  onChange={(e) => setNewItem({ ...newItem, current_stock: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Reorder Level"
                  value={newItem.reorder_level}
                  onChange={(e) => setNewItem({ ...newItem, reorder_level: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Supplier"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                />
                <button type="submit" className="btn-primary">Add Ingredient</button>
              </form>
            </div>

            <div className="panel inventory-table-container">
              <div className="panel-header">
                <h3>Current Stock</h3>
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  className="search-input"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Stock</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Supplier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        {editingId === item.id ? (
                          <>
                            <td>
                              <input
                                className="edit-input"
                                value={editFormData.item_name || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, item_name: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                className="edit-input"
                                type="number"
                                value={editFormData.current_stock || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, current_stock: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                className="edit-input"
                                type="number"
                                value={editFormData.reorder_level || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, reorder_level: e.target.value })}
                              />
                            </td>
                            <td><span className="badge">Editing...</span></td>
                            <td>
                              <input
                                className="edit-input"
                                value={editFormData.supplier || ""}
                                onChange={(e) => setEditFormData({ ...editFormData, supplier: e.target.value })}
                              />
                            </td>
                            <td className="actions-cell">
                              <button className="btn-save" onClick={() => handleSaveEdit(item.id)}>Save</button>
                              <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td><strong>{item.item_name}</strong></td>
                            <td>{item.current_stock} {item.unit}</td>
                            <td>{item.reorder_level}</td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                {item.status || "N/A"}
                              </span>
                            </td>
                            <td style={{ color: "#888", fontSize: "0.85rem" }}>
                              {item.supplier || "N/A"}
                            </td>
                            <td className="actions-cell">
                              <button className="btn-edit" onClick={() => startEdit(item)}>Edit</button>
                              <button
                                className="btn-danger-small"
                                onClick={() => handleDeleteItem(item.id, item.item_name)}
                              >
                                Delete
                              </button>
                            </td>
                          </>
                        )}
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

export default Inventory;