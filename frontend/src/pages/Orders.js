import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/orders.css";
import API_BASE_URL from "../config";

function commonSinkers() {
  return [
    { name: "Oreo", price: 10 },
    { name: "Coffee Jelly", price: 10 },
    { name: "Extra Shot", price: 10 },
    { name: "Boba Pearl", price: 10 },
    { name: "Sugar Jelly", price: 10 },
    { name: "Nata", price: 10 },
    { name: "Milk", price: 10 },
    { name: "Whip Cream", price: 10 },
    { name: "Salty Cream", price: 10 },
  ];
}

function coffeeAddons() {
  return [
    { name: "Extra Shot", price: 10 },
    { name: "Milk", price: 10 },
    { name: "Whip Cream", price: 10 },
    { name: "Salty Cream", price: 10 },
    { name: "Coffee Jelly", price: 10 },
    { name: "Oreo", price: 10 },
  ];
}

const MENU = {
  lemonade: {
    label: "Lemonade",
    description: "22oz drinks",
    items: [
      {
        name: "Lemonade (Regular)",
        sizes: { regular: 40 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Green Apple Lemonade",
        sizes: { regular: 50 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Strawberry Lemonade",
        sizes: { regular: 50 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Blueberry Lemonade",
        sizes: { regular: 50 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Peach Lemonade",
        sizes: { regular: 50 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Lychee Lemonade",
        sizes: { regular: 50 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Strawberry Lemon",
        sizes: { regular: 60 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Blue Lemonade",
        sizes: { regular: 60 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Red Fizz Lemonade",
        sizes: { regular: 60 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Cucumber Lemonade",
        sizes: { regular: 60 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
      {
        name: "Honey Ginger",
        sizes: { regular: 65 },
        addons: [
          { name: "Yakult", price: 15 },
          { name: "Dutchmill", price: 25 },
          { name: "Nata", price: 15 },
          { name: "Chia Seeds", price: 15 },
        ],
      },
    ],
  },

  yogurtSmoothies: {
    label: "Yogurt Smoothies",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry", sizes: { grande: 60, venti: 70 }, addons: [] },
      { name: "Blueberry", sizes: { grande: 60, venti: 70 }, addons: [] },
      { name: "Passion Fruit", sizes: { grande: 60, venti: 70 }, addons: [] },
      { name: "Biscoff", sizes: { grande: 70, venti: 80 }, addons: [] },
    ],
  },

  fruitSoda: {
    label: "Fruit Soda",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Green Apple", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
      { name: "Strawberry", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
      { name: "Blueberry", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
      { name: "Peach", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
      { name: "Lychee", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
      { name: "Lemon", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
      { name: "Ginger Ale", sizes: { grande: 58, venti: 68 }, addons: [{ name: "Yakult", price: 15 }] },
    ],
  },

  hotCoffee: {
    label: "Hot Coffee",
    description: "12oz hot coffee",
    items: [
      { name: "Americano", sizes: { regular: 58 }, addons: [{ name: "Premium Upgrade", price: 10 }] },
      { name: "Cà Phê Español", sizes: { regular: 58 }, addons: [{ name: "Premium Upgrade", price: 10 }] },
      { name: "Hot Latte", sizes: { regular: 58 }, addons: [{ name: "Premium Upgrade", price: 10 }] },
      { name: "Caramel Macchiato", sizes: { regular: 58 }, addons: [{ name: "Premium Upgrade", price: 10 }] },
      { name: "Salted Caramel", sizes: { regular: 58 }, addons: [{ name: "Premium Upgrade", price: 10 }] },
      { name: "Matcha Espresso", sizes: { regular: 58 }, addons: [{ name: "Premium Upgrade", price: 10 }] },
    ],
  },

  hotTea: {
    label: "Hot Tea",
    description: "12oz hot tea",
    items: [
      { name: "Green Tea", sizes: { regular: 50 }, addons: [{ name: "Extra Bag", price: 25 }] },
      { name: "Spearmint Tea", sizes: { regular: 50 }, addons: [{ name: "Extra Bag", price: 25 }] },
      { name: "Chamomile Tea", sizes: { regular: 50 }, addons: [{ name: "Extra Bag", price: 25 }] },
      { name: "Hibiscus Tea", sizes: { regular: 50 }, addons: [{ name: "Extra Bag", price: 25 }] },
      { name: "Butterfly Pea Tea", sizes: { regular: 50 }, addons: [{ name: "Extra Bag", price: 25 }] },
    ],
  },

  milkTea: {
    label: "Milk Tea",
    description: "Grande 16oz / Venti 22oz",
    items: [
      {
        name: "Matcha",
        sizes: { grande: 38, venti: 48 },
        addons: [
          { name: "Salty Cream", price: 45 },
          { name: "Cream Cheese", price: 55 },
          { name: "Oreo", price: 10 },
          { name: "Coffee Jelly", price: 10 },
          { name: "Boba Pearl", price: 10 },
          { name: "Sugar Jelly", price: 10 },
          { name: "Nata", price: 10 },
        ],
      },
      {
        name: "Wintermelon",
        sizes: { grande: 38, venti: 48 },
        addons: [
          { name: "Salty Cream", price: 45 },
          { name: "Cream Cheese", price: 55 },
          { name: "Oreo", price: 10 },
          { name: "Coffee Jelly", price: 10 },
          { name: "Boba Pearl", price: 10 },
          { name: "Sugar Jelly", price: 10 },
          { name: "Nata", price: 10 },
        ],
      },
      {
        name: "Oreo",
        sizes: { grande: 38, venti: 48 },
        addons: [
          { name: "Salty Cream", price: 45 },
          { name: "Cream Cheese", price: 55 },
          { name: "Coffee Jelly", price: 10 },
          { name: "Boba Pearl", price: 10 },
          { name: "Sugar Jelly", price: 10 },
          { name: "Nata", price: 10 },
        ],
      },
      {
        name: "Red Velvet",
        sizes: { grande: 38, venti: 48 },
        addons: [
          { name: "Salty Cream", price: 45 },
          { name: "Cream Cheese", price: 55 },
          { name: "Oreo", price: 10 },
          { name: "Coffee Jelly", price: 10 },
          { name: "Boba Pearl", price: 10 },
          { name: "Sugar Jelly", price: 10 },
          { name: "Nata", price: 10 },
        ],
      },
      {
        name: "Dark Choco",
        sizes: { grande: 38, venti: 48 },
        addons: [
          { name: "Salty Cream", price: 45 },
          { name: "Cream Cheese", price: 55 },
          { name: "Oreo", price: 10 },
          { name: "Coffee Jelly", price: 10 },
          { name: "Boba Pearl", price: 10 },
          { name: "Sugar Jelly", price: 10 },
          { name: "Nata", price: 10 },
        ],
      },
      {
        name: "Sugar Jelly Milk Tea",
        sizes: { grande: 38, venti: 48 },
        addons: [
          { name: "Salty Cream", price: 45 },
          { name: "Cream Cheese", price: 55 },
          { name: "Oreo", price: 10 },
          { name: "Coffee Jelly", price: 10 },
          { name: "Boba Pearl", price: 10 },
          { name: "Nata", price: 10 },
        ],
      },
    ],
  },

  oolongTea: {
    label: "Oolong Tea",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Lychee", sizes: { grande: 45, venti: 55 }, addons: [{ name: "Lemon Grass Oolong Upgrade", price: 15 }] },
      { name: "Peach", sizes: { grande: 45, venti: 55 }, addons: [{ name: "Lemon Grass Oolong Upgrade", price: 15 }] },
      { name: "Lemon", sizes: { grande: 45, venti: 55 }, addons: [{ name: "Lemon Grass Oolong Upgrade", price: 15 }] },
      { name: "Calamansi", sizes: { grande: 45, venti: 55 }, addons: [{ name: "Lemon Grass Oolong Upgrade", price: 15 }] },
      { name: "Passion Fruit", sizes: { grande: 45, venti: 55 }, addons: [{ name: "Lemon Grass Oolong Upgrade", price: 15 }] },
    ],
  },

  greenTea: {
    label: "Green Tea",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry Lychee", sizes: { grande: 55, venti: 65 }, addons: [] },
      { name: "Strawberry", sizes: { grande: 55, venti: 65 }, addons: [] },
      { name: "Lychee", sizes: { grande: 55, venti: 65 }, addons: [] },
      { name: "Peach", sizes: { grande: 55, venti: 65 }, addons: [] },
      { name: "Calamansi", sizes: { grande: 55, venti: 65 }, addons: [] },
      { name: "Passion Fruit", sizes: { grande: 55, venti: 65 }, addons: [] },
    ],
  },

  nonCoffee: {
    label: "Non-Coffee",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry Milk", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Blueberry Milk", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Oreo Milk", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Swissmiss", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Strawberry Oreo", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Strawberry Matcha", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Ube Milk", sizes: { grande: 38, venti: 48 }, addons: commonSinkers() },
      { name: "Sea Salt Cocoa", sizes: { grande: 65, venti: 75 }, addons: commonSinkers() },
      { name: "Choco Salt Cocoa", sizes: { grande: 65, venti: 75 }, addons: commonSinkers() },
      { name: "Choco-Berry", sizes: { grande: 65, venti: 75 }, addons: commonSinkers() },
      { name: "Milky Biscoff", sizes: { grande: 65, venti: 75 }, addons: commonSinkers() },
      { name: "Nutella", sizes: { grande: 65, venti: 75 }, addons: commonSinkers() },
    ],
  },

  frappuccino: {
    label: "Frappuccino",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Macchiato", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Caramel", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Dark Mocha", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Coffee Crumble", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Coffee Fudge", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Almond Fudge", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Mocha Jelly", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Coffee Jelly", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
      { name: "Nutella", sizes: { grande: 75, venti: 85 }, addons: commonSinkers() },
    ],
  },

  nonCoffeeFrappe: {
    label: "Non-Coffee Frappe",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Cookies & Cream", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Milo Cream", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Strawberry", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Blueberry", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Purple Yam", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Matcha Oreo", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Matcha Strawberry", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Ube Oreo", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Chocolate Chip Cream", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
      { name: "Nutella Cream", sizes: { grande: 70, venti: 80 }, addons: commonSinkers() },
    ],
  },

  vietnameseCoffee: {
    label: "Cà Phê Espresso",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Americano", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
      { name: "Cà Phê Español", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
      { name: "Iced Latte", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
      { name: "Matcha Latte", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
      { name: "Salted Caramel", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
      { name: "Oreo Latte", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
      { name: "Dark Mocha Latte", sizes: { grande: 38, venti: 48 }, addons: coffeeAddons() },
    ],
  },

  premium: {
    label: "Premium",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry Latte", sizes: { grande: 45, venti: 55 }, addons: coffeeAddons() },
      { name: "Matcha Espresso", sizes: { grande: 45, venti: 55 }, addons: coffeeAddons() },
      { name: "Salty Cream Latte", sizes: { grande: 45, venti: 55 }, addons: coffeeAddons() },
      { name: "Sea Salt Latte", sizes: { grande: 45, venti: 55 }, addons: coffeeAddons() },
      { name: "Barista’s Drink", sizes: { grande: 45, venti: 55 }, addons: coffeeAddons() },
      { name: "Dulce De Leche", sizes: { grande: 55, venti: 65 }, addons: coffeeAddons() },
      { name: "Velvet Cream Latte", sizes: { grande: 55, venti: 65 }, addons: coffeeAddons() },
      { name: "White Mocha Latte", sizes: { grande: 55, venti: 65 }, addons: coffeeAddons() },
      { name: "Vanilla Sweet Cream", sizes: { grande: 55, venti: 65 }, addons: coffeeAddons() },
      { name: "Toffee Nut Latte", sizes: { grande: 55, venti: 65 }, addons: coffeeAddons() },
      { name: "Almond Latte", sizes: { grande: 55, venti: 65 }, addons: coffeeAddons() },
      { name: "Peanut Butter Latte", sizes: { grande: 70, venti: 80 }, addons: coffeeAddons() },
      { name: "Biscoff Latte", sizes: { grande: 70, venti: 80 }, addons: coffeeAddons() },
      { name: "Nutella Latte", sizes: { grande: 70, venti: 80 }, addons: coffeeAddons() },
    ],
  },
};

function formatSizeLabel(sizeKey) {
  const labels = {
    regular: "Regular",
    grande: "Grande 16oz",
    venti: "Venti 22oz",
    small: "Small",
    medium: "Medium",
    large: "Large",
  };
  return labels[sizeKey] || sizeKey;
}

function Orders() {
  const categoryKeys = Object.keys(MENU);
  const [activeCategory, setActiveCategory] = useState(categoryKeys[0]);
  const [cart, setCart] = useState([]);
  const [cash, setCash] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [table, setTable] = useState("Walk-in");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategoryData = MENU[activeCategory];

  const openItem = (item) => {
    setSelectedItem(item);
    const sizeKeys = Object.keys(item.sizes);
    setSelectedSize(sizeKeys.length === 1 ? sizeKeys[0] : "");
    setSelectedAddons([]);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedSize("");
    setSelectedAddons([]);
  };

  const toggleAddon = (addon) => {
    const exists = selectedAddons.some((a) => a.name === addon.name);
    if (exists) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // 🔥 UPDATED: Packages the items perfectly for your SQLite backend and Recipe logic
  const confirmAddToCart = () => {
    if (!selectedItem || !selectedSize) return;

    const basePrice = selectedItem.sizes[selectedSize];
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

    const newItem = {
      id: `${selectedItem.name}-${selectedSize}-${Date.now()}`,
      item_name: selectedItem.name,                 // Matches Python expected key
      category: activeCategoryData.label,           // Now tracks the category for your Sales DB
      size: formatSizeLabel(selectedSize),
      addons: selectedAddons.length > 0 ? selectedAddons.map(a => a.name).join(", ") : "None", // Saves as a clean string!
      addons_total: addonsTotal,                    // Added for your DB
      unit_price: basePrice,                        // Matches Python expected key
      line_total: basePrice + addonsTotal,          // Matches Python expected key
      qty: 1,
    };

    setCart((prev) => [...prev, newItem]);
    closeModal();
  };

  const updateQty = (id, change) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, qty: Math.max(1, item.qty + change) }
          : item
      )
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.line_total * item.qty, 0),
    [cart]
  );

  const cashValue = parseFloat(cash || "0");
  const change = Math.max(0, cashValue - total);
  const insufficientCash = cash !== "" && cashValue < total;

  const cancelOrder = () => {
    setCart([]);
    setCash("");
  };

  const handlePayAndPrint = async () => {
    if (cart.length === 0 || cashValue < total) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            name: item.item_name,          // ✅ map correctly
            qty: item.qty,
            unitPrice: item.unit_price,    // ✅ map correctly
          })),
          total,
          cash: cashValue,
          change,
          table,
          payment_method: "Cash",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Order error:", data);
        alert(data.error || "Failed to save order");
        return;
      }

      console.log("Order saved:", data);
      alert(`Order #${data.order_id} completed! Inventory Deducted!`);

      setCart([]);
      setCash("");
      setTable("Walk-in");
    } catch (err) {
      console.error("Order request failed:", err);
      alert("Network error while saving order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-body">
      <div className="app-shell">
        <Sidebar role="Employee" />

        <main className="main-content">
          <header className="topbar">
            <div>
              <h2 className="page-title">New Order</h2>
              <p className="page-subtitle">
                Employees can create and complete cash orders.
              </p>
            </div>

            <div className="topbar-right">
              <div className="order-meta">
                <span>Table</span>
                <select value={table} onChange={(e) => setTable(e.target.value)}>
                  <option>Walk-in</option>
                  <option>Table 1</option>
                  <option>Table 2</option>
                  <option>Table 3</option>
                </select>
              </div>

              <div className="user-pill">
                <span className="user-avatar">EM</span>
                <span className="user-name">Employee</span>
              </div>
            </div>
          </header>

          <section className="orders-layout">
            <div className="menu-panel">
              <div className="menu-panel-top">
                <div>
                  <h3 className="panel-title">Menu</h3>
                  <p className="panel-subtitle">
                    Select a category, then choose an item.
                  </p>
                </div>
              </div>

              <div className="menu-tabs">
                {categoryKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`tab ${activeCategory === key ? "active" : ""}`}
                    onClick={() => setActiveCategory(key)}
                  >
                    {MENU[key].label}
                  </button>
                ))}
              </div>

              <div className="category-banner">
                <div>
                  <div className="category-label">{activeCategoryData.label}</div>
                  <div className="category-description">
                    {activeCategoryData.description}
                  </div>
                </div>
                <div className="category-count">
                  {activeCategoryData.items.length} items
                </div>
              </div>

              <div className="menu-grid">
                {activeCategoryData.items.map((item) => {
                  const sizeValues = Object.values(item.sizes);
                  const minPrice = Math.min(...sizeValues);
                  const maxPrice = Math.max(...sizeValues);

                  return (
                    <button
                      key={item.name}
                      type="button"
                      className="menu-item"
                      onClick={() => openItem(item)}
                    >
                      <div className="menu-item-top">
                        <span className="menu-name">{item.name}</span>
                        <span className="menu-price">
                          ₱{minPrice}
                          {minPrice !== maxPrice ? ` - ₱${maxPrice}` : ""}
                        </span>
                      </div>

                      <div className="menu-meta">
                        {Object.keys(item.sizes)
                          .map((size) => formatSizeLabel(size))
                          .join(" • ")}
                      </div>

                      {item.addons?.length > 0 && (
                        <div className="menu-addon-note">
                          + {item.addons.length} add-ons available
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="cart-panel">
              <div className="panel-header">
                <div>
                  <h3>Current Order</h3>
                  <span className="order-id">Live ticket</span>
                </div>
                <span className="cart-badge">{totalItems} items</span>
              </div>

              <div className="cart-scroll">
                <table className="table cart-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th className="num-cell">Price</th>
                      <th className="num-cell">Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-cart">
                          No items yet.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="cart-item-head">
                              {/* 🔥 Render the new item_name */}
                              <div className="cart-item-name">{item.item_name}</div>
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeItem(item.id)}
                                aria-label={`Remove ${item.item_name}`}
                                title="Remove item"
                              >
                                ×
                              </button>
                            </div>

                            <div className="cart-item-meta">
                              {item.size}
                            </div>

                            {item.addons !== "None" && (
                              <div className="cart-item-addons">
                                + {item.addons}
                              </div>
                            )}
                          </td>

                          <td>
                            <div className="qty-control">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, -1)}
                              >
                                -
                              </button>
                              <span>{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="num-cell">₱ {item.line_total}</td>
                          <td className="num-cell">₱ {item.line_total * item.qty}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="cart-footer">
                <div className="totals">
                  <div className="totals-row">
                    <span>Items</span>
                    <span>{totalItems}</span>
                  </div>

                  <div className="totals-row">
                    <span>Subtotal</span>
                    <span>₱ {total}</span>
                  </div>

                  <div className="totals-row grand">
                    <span>Total</span>
                    <span>₱ {total}</span>
                  </div>
                </div>

                <div className="payment-actions">
                  <div className="cash-input">
                    <label htmlFor="cash">Cash received</label>
                    <input
                      id="cash"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cash}
                      onChange={(e) => setCash(e.target.value)}
                      placeholder="Enter amount"
                    />
                    <span className={`change-label ${insufficientCash ? "error-text" : ""}`}>
                      {insufficientCash
                        ? `Insufficient cash: ₱ ${Math.abs(cashValue - total).toFixed(2)} short`
                        : `Change: ₱ ${change.toFixed(2)}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-pay"
                    disabled={cart.length === 0 || cashValue < total || isSubmitting}
                    onClick={handlePayAndPrint}
                  >
                    {isSubmitting ? "Processing..." : "Pay and Print Receipt"}
                  </button>

                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={cancelOrder}
                    disabled={isSubmitting}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            </aside>
          </section>

          {selectedItem && (
            <div className="modal" onClick={closeModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <h3>{selectedItem.name}</h3>
                    <p className="modal-subtitle">
                      Choose size and optional add-ons.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={closeModal}
                  >
                    ×
                  </button>
                </div>

                <div>
                  <div className="modal-section-title">Size</div>
                  <div className="size-list">
                    {Object.keys(selectedItem.sizes).map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`size-chip ${selectedSize === size ? "selected" : ""}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        <span>{formatSizeLabel(size)}</span>
                        <span className="price">₱{selectedItem.sizes[size]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="modal-section-title">Add-ons</div>
                  <div className="addons-list">
                    {selectedItem.addons?.length > 0 ? (
                      selectedItem.addons.map((addon) => {
                        const checked = selectedAddons.some(
                          (a) => a.name === addon.name
                        );

                        return (
                          <div className="addon-row" key={addon.name}>
                            <label>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAddon(addon)}
                              />
                              <span>{addon.name}</span>
                            </label>
                            <span className="addon-price">+₱{addon.price}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-addon">No add-ons available.</div>
                    )}
                  </div>
                </div>

                <div className="modal-summary">
                  <span>Selected total</span>
                  <strong>
                    ₱
                    {selectedSize
                      ? selectedItem.sizes[selectedSize] +
                        selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
                      : 0}
                  </strong>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={confirmAddToCart}
                    disabled={!selectedSize}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Orders;
