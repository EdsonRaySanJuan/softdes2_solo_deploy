import React, { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/orders.css";
import API_BASE_URL from "../config";

const ADDON_PRICES = {
  Yakult: 10,
  Dutchmill: 10,
  Nata: 5,
  "Chia Seeds": 5,
  "Boba Pearl": 10,
  "Coffee Jelly": 10,
  Oreo: 10,
  "Salty Cream": 15,
  "Cream Cheese": 15,
  "Extra Shot": 20,
  Milk: 10,
  "Whip Cream": 10,
  "Sugar Jelly": 10,
  "Premium Upgrade": 20,
  "Extra Bag": 10,
  "Lemon Grass Oolong Upgrade": 15,
};

const menuData = {
  lemonade: {
    label: "Lemonade",
    description: "22oz drinks",
    items: [
      { name: "Lemonade (Regular)", prices: { Regular: 40 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Green Apple Lemonade", prices: { Regular: 50 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Strawberry Lemonade", prices: { Regular: 50 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Blueberry Lemonade", prices: { Regular: 50 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Peach Lemonade", prices: { Regular: 50 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Lychee Lemonade", prices: { Regular: 50 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Strawberry Lemon", prices: { Regular: 60 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Blue Lemonade", prices: { Regular: 60 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Red Fizz Lemonade", prices: { Regular: 60 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Cucumber Lemonade", prices: { Regular: 60 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
      { name: "Honey Ginger", prices: { Regular: 65 }, addons: ["Yakult", "Dutchmill", "Nata", "Chia Seeds"] },
    ],
  },
  yogurtSmoothies: {
    label: "Yogurt Smoothies",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry", prices: { Grande: 60, Venti: 70 }, addons: [] },
      { name: "Blueberry", prices: { Grande: 60, Venti: 70 }, addons: [] },
      { name: "Passion Fruit", prices: { Grande: 60, Venti: 70 }, addons: [] },
      { name: "Biscoff", prices: { Grande: 70, Venti: 80 }, addons: [] },
    ],
  },
  fruitSoda: {
    label: "Fruit Soda",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Green Apple", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
      { name: "Strawberry", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
      { name: "Blueberry", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
      { name: "Peach", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
      { name: "Lychee", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
      { name: "Lemon", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
      { name: "Ginger Ale", prices: { Grande: 58, Venti: 68 }, addons: ["Yakult"] },
    ],
  },
  hotCoffee: {
    label: "Hot Coffee",
    description: "12oz hot coffee",
    items: [
      { name: "Americano", prices: { Regular: 58 }, addons: ["Premium Upgrade"] },
      { name: "Cà Phê Español", prices: { Regular: 58 }, addons: ["Premium Upgrade"] },
      { name: "Hot Latte", prices: { Regular: 58 }, addons: ["Premium Upgrade"] },
      { name: "Caramel Macchiato", prices: { Regular: 58 }, addons: ["Premium Upgrade"] },
      { name: "Salted Caramel", prices: { Regular: 58 }, addons: ["Premium Upgrade"] },
      { name: "Matcha Espresso", prices: { Regular: 58 }, addons: ["Premium Upgrade"] },
    ],
  },
  hotTea: {
    label: "Hot Tea",
    description: "12oz hot tea",
    items: [
      { name: "Green Tea", prices: { Regular: 50 }, addons: ["Extra Bag"] },
      { name: "Spearmint Tea", prices: { Regular: 50 }, addons: ["Extra Bag"] },
      { name: "Chamomile Tea", prices: { Regular: 50 }, addons: ["Extra Bag"] },
      { name: "Hibiscus Tea", prices: { Regular: 50 }, addons: ["Extra Bag"] },
      { name: "Butterfly Pea Tea", prices: { Regular: 50 }, addons: ["Extra Bag"] },
    ],
  },
  milkTea: {
    label: "Milk Tea",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Matcha", prices: { Grande: 38, Venti: 48 }, addons: ["Salty Cream", "Cream Cheese", "Oreo", "Coffee Jelly", "Boba Pearl", "Sugar Jelly", "Nata"] },
      { name: "Wintermelon", prices: { Grande: 38, Venti: 48 }, addons: ["Salty Cream", "Cream Cheese", "Oreo", "Coffee Jelly", "Boba Pearl", "Sugar Jelly", "Nata"] },
      { name: "Oreo", prices: { Grande: 38, Venti: 48 }, addons: ["Salty Cream", "Cream Cheese", "Coffee Jelly", "Boba Pearl", "Sugar Jelly", "Nata"] },
      { name: "Red Velvet", prices: { Grande: 38, Venti: 48 }, addons: ["Salty Cream", "Cream Cheese", "Oreo", "Coffee Jelly", "Boba Pearl", "Sugar Jelly", "Nata"] },
      { name: "Dark Choco", prices: { Grande: 38, Venti: 48 }, addons: ["Salty Cream", "Cream Cheese", "Oreo", "Coffee Jelly", "Boba Pearl", "Sugar Jelly", "Nata"] },
      { name: "Sugar Jelly Milk Tea", prices: { Grande: 38, Venti: 48 }, addons: ["Salty Cream", "Cream Cheese", "Oreo", "Coffee Jelly", "Boba Pearl", "Nata"] },
    ],
  },
  oolongTea: {
    label: "Oolong Tea",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Lychee", prices: { Grande: 45, Venti: 55 }, addons: ["Lemon Grass Oolong Upgrade"] },
      { name: "Peach", prices: { Grande: 45, Venti: 55 }, addons: ["Lemon Grass Oolong Upgrade"] },
      { name: "Lemon", prices: { Grande: 45, Venti: 55 }, addons: ["Lemon Grass Oolong Upgrade"] },
      { name: "Calamansi", prices: { Grande: 45, Venti: 55 }, addons: ["Lemon Grass Oolong Upgrade"] },
      { name: "Passion Fruit", prices: { Grande: 45, Venti: 55 }, addons: ["Lemon Grass Oolong Upgrade"] },
    ],
  },
  greenTea: {
    label: "Green Tea",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry Lychee", prices: { Grande: 55, Venti: 65 }, addons: [] },
      { name: "Strawberry", prices: { Grande: 55, Venti: 65 }, addons: [] },
      { name: "Lychee", prices: { Grande: 55, Venti: 65 }, addons: [] },
      { name: "Peach", prices: { Grande: 55, Venti: 65 }, addons: [] },
      { name: "Calamansi", prices: { Grande: 55, Venti: 65 }, addons: [] },
      { name: "Passion Fruit", prices: { Grande: 55, Venti: 65 }, addons: [] },
    ],
  },
  nonCoffee: {
    label: "Non-Coffee",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry Milk", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Blueberry Milk", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Oreo Milk", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Swissmiss", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Strawberry Oreo", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Strawberry Matcha", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Ube Milk", prices: { Grande: 38, Venti: 48 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Sea Salt Cocoa", prices: { Grande: 65, Venti: 75 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Choco Salt Cocoa", prices: { Grande: 65, Venti: 75 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Choco-Berry", prices: { Grande: 65, Venti: 75 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Milky Biscoff", prices: { Grande: 65, Venti: 75 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Nutella", prices: { Grande: 65, Venti: 75 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
    ],
  },
  frappuccino: {
    label: "Frappuccino",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Macchiato", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Caramel", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Dark Mocha", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Coffee Crumble", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Coffee Fudge", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Almond Fudge", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Mocha Jelly", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Coffee Jelly", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Nutella", prices: { Grande: 75, Venti: 85 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
    ],
  },
  nonCoffeeFrappe: {
    label: "Non-Coffee Frappe",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Cookies & Cream", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Milo Cream", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Strawberry", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Blueberry", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Purple Yam", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Matcha Oreo", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Matcha Strawberry", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Ube Oreo", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Chocolate Chip Cream", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
      { name: "Nutella Cream", prices: { Grande: 70, Venti: 80 }, addons: ["Oreo", "Coffee Jelly", "Extra Shot", "Boba Pearl", "Sugar Jelly", "Nata", "Milk", "Whip Cream", "Salty Cream"] },
    ],
  },
  vietnameseCoffee: {
    label: "Cà Phê Espresso",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Americano", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Cà Phê Español", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Iced Latte", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Matcha Latte", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Salted Caramel", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Oreo Latte", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Dark Mocha Latte", prices: { Grande: 38, Venti: 48 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
    ],
  },
  premium: {
    label: "Premium",
    description: "Grande 16oz / Venti 22oz",
    items: [
      { name: "Strawberry Latte", prices: { Grande: 45, Venti: 55 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Matcha Espresso", prices: { Grande: 45, Venti: 55 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Salty Cream Latte", prices: { Grande: 45, Venti: 55 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Sea Salt Latte", prices: { Grande: 45, Venti: 55 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Barista's Drink", prices: { Grande: 45, Venti: 55 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Dulce De Leche", prices: { Grande: 55, Venti: 65 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Velvet Cream Latte", prices: { Grande: 55, Venti: 65 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "White Mocha Latte", prices: { Grande: 55, Venti: 65 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Vanilla Sweet Cream", prices: { Grande: 55, Venti: 65 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Toffee Nut Latte", prices: { Grande: 55, Venti: 65 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Almond Latte", prices: { Grande: 55, Venti: 65 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Peanut Butter Latte", prices: { Grande: 70, Venti: 80 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Biscoff Latte", prices: { Grande: 70, Venti: 80 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
      { name: "Nutella Latte", prices: { Grande: 70, Venti: 80 }, addons: ["Extra Shot", "Milk", "Whip Cream", "Salty Cream", "Coffee Jelly", "Oreo"] },
    ],
  },
};

const computeAddonTotal = (addonNames) =>
  addonNames.reduce((sum, name) => sum + (ADDON_PRICES[name] || 0), 0);

export default function Orders() {
  const [selectedCategory, setSelectedCategory] = useState("lemonade");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [cart, setCart] = useState([]);
  const [cash, setCash] = useState("");
  const [table, setTable] = useState("Walk-in");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCategory = menuData[selectedCategory];
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.line_total, 0), [cart]);
  const cashValue = Number(cash) || 0;
  const change = cashValue - total;

  const openItemModal = (item) => {
    setSelectedItem({ ...item, category: currentCategory.label });
    setSelectedSize(Object.keys(item.prices)[0]);
    setSelectedAddons([]);
  };

  const closeItemModal = () => {
    setSelectedItem(null);
    setSelectedSize("");
    setSelectedAddons([]);
  };

  const toggleAddon = (addon) =>
    setSelectedAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );

  const addToCart = () => {
    if (!selectedItem || !selectedSize) return;
    const basePrice = selectedItem.prices[selectedSize];
    const addonsCopy = [...selectedAddons];
    const addonTotal = computeAddonTotal(addonsCopy);
    const unitPrice = basePrice + addonTotal;
    setCart((prev) => [...prev, {
      category: selectedItem.category,
      item_name: selectedItem.name,
      size: selectedSize,
      qty: 1,
      base_price: basePrice,
      addon_total: addonTotal,
      unit_price: unitPrice,
      addons: addonsCopy,
      addons_text: addonsCopy.length ? addonsCopy.join(", ") : "None",
      line_total: unitPrice,
    }]);
    closeItemModal();
  };

  const updateCartQty = (index, delta) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        return { ...item, qty: newQty, line_total: item.unit_price * newQty };
      }).filter(Boolean)
    );
  };

  const removeCartItem = (index) => setCart((prev) => prev.filter((_, i) => i !== index));
  const clearCart = () => { setCart([]); setCash(""); setTable("Walk-in"); };

  const handlePayAndPrint = async () => {
    if (cart.length === 0) { alert("Cart is empty."); return; }
    if (cashValue < total) { alert("Insufficient cash."); return; }
    setIsSubmitting(true);

    const t0 = performance.now();

    try {
      const token = localStorage.getItem("token");
      const payload = {
        items: cart.map((item) => ({
          name: item.item_name,
          category: item.category,
          size: item.size,
          qty: item.qty,
          unitPrice: item.unit_price,
          addons: item.addons.map((addonName) => ({ name: addonName })),
        })),
        total, cash: cashValue, change, table, payment_method: "Cash",
      };

      const response = await fetch(`${API_BASE_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });

      const processingTimeMs = parseFloat((performance.now() - t0).toFixed(2));
      const data = await response.json();

      if (!response.ok) {
        if (data.stock_errors?.length > 0) {
          alert("Hindi ma-process ang order:\n\n" + data.stock_errors.map((e) => `• ${e}`).join("\n"));
        } else {
          alert(data.error || "Failed to process order.");
        }
        return;
      }

      // Fire-and-forget metric recording
      fetch(`${API_BASE_URL}/metrics/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          order_id: data.order_id,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          processing_time_ms: processingTimeMs,
          item_count: cart.reduce((sum, i) => sum + i.qty, 0),
          total_amount: total,
          payment_method: "Cash",
          table_no: table,
        }),
      }).catch((err) => console.warn("Metrics record failed (non-critical):", err));

      let message = `Order #${data.order_id} processed successfully.\nProcessing time: ${processingTimeMs}ms`;
      if (data.inventory_warnings?.length > 0) {
        message += `\n\nInventory warnings:\n- ${data.inventory_warnings.join("\n- ")}`;
      }
      alert(message);
      clearCart();
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Network error while processing order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowestPrice = (prices) => Math.min(...Object.values(prices));
  const modalPreviewPrice = selectedItem && selectedSize
    ? selectedItem.prices[selectedSize] + computeAddonTotal(selectedAddons)
    : 0;

  return (
    <div className="app-body">
      <div className="app-shell">
        <Sidebar role="Employee" />
        <main className="main-content">
          <div className="orders-layout">
            <div className="menu-panel">
              <div className="menu-panel-top">
                <p className="panel-title">Menu</p>
                <p className="panel-subtitle">Select a category then tap an item to add it</p>
              </div>
              <div className="menu-tabs">
                {Object.entries(menuData).map(([key, category]) => (
                  <button key={key} className={`tab${selectedCategory === key ? " active" : ""}`} onClick={() => setSelectedCategory(key)}>
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="category-banner">
                <div>
                  <div className="category-label">{currentCategory.label}</div>
                  <div className="category-description">{currentCategory.description}</div>
                </div>
                <span className="category-count">{currentCategory.items.length} items</span>
              </div>
              <div className="menu-grid">
                {currentCategory.items.map((item, index) => (
                  <button key={index} className="menu-item" onClick={() => openItemModal(item)}>
                    <div className="menu-item-top">
                      <span className="menu-name">{item.name}</span>
                      <span className="menu-price">from ₱{lowestPrice(item.prices)}</span>
                      <span className="menu-meta">{currentCategory.description}</span>
                    </div>
                    {item.addons.length > 0 && <span className="menu-addon-note">+ add-ons available</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="cart-panel">
              <div className="panel-header">
                <div>
                  <h3>Cart</h3>
                  <span className="order-id">Current Order</span>
                </div>
                <span className="cart-badge">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="cart-scroll">
                <table className="table">
                  <thead>
                    <tr><th>Item</th><th>Qty</th><th className="num-cell">Total</th><th></th></tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan={4} className="empty-cart">No items yet — tap a menu item to add</td></tr>
                    ) : (
                      cart.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="cart-item-name">{item.item_name}</div>
                            <div className="cart-item-meta">
                              {item.size} · ₱{item.base_price.toFixed(2)}
                              {item.addon_total > 0 && <span className="addon-price-tag"> +₱{item.addon_total.toFixed(2)} add-ons</span>}
                            </div>
                            {item.addons.length > 0 && <div className="cart-item-addons">+{item.addons_text}</div>}
                          </td>
                          <td>
                            <div className="qty-control">
                              <button onClick={() => updateCartQty(index, -1)}>−</button>
                              <span>{item.qty}</span>
                              <button onClick={() => updateCartQty(index, 1)}>+</button>
                            </div>
                          </td>
                          <td className="num-cell">₱{item.line_total.toFixed(2)}</td>
                          <td><button className="remove-btn" onClick={() => removeCartItem(index)}>×</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cart-footer">
                <div className="totals">
                  <div className="totals-row"><span>Subtotal</span><span>₱{total.toFixed(2)}</span></div>
                  <div className="totals-row"><span>Cash</span><span>₱{cashValue.toFixed(2)}</span></div>
                  <div className="totals-row grand">
                    <span>Change</span>
                    <span className={change < 0 ? "error-text" : ""}>₱{change >= 0 ? change.toFixed(2) : "0.00"}</span>
                  </div>
                </div>
                <div className="payment-actions">
                  <div className="cash-input">
                    <label>Table / Type</label>
                    <select value={table} onChange={(e) => setTable(e.target.value)}>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Takeout">Takeout</option>
                    </select>
                  </div>
                  <div className="cash-input">
                    <label>Cash Received</label>
                    <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Enter cash amount" />
                  </div>
                  <button className="btn-cancel" onClick={clearCart}>Cancel Order</button>
                  <button className="btn-pay" onClick={handlePayAndPrint} disabled={isSubmitting}>
                    {isSubmitting ? "Processing…" : "Pay & Print Receipt"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedItem && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-head">
              <div>
                <h3>{selectedItem.name}</h3>
                <span className="modal-subtitle">{selectedItem.category}</span>
              </div>
              <button className="modal-close" onClick={closeItemModal}>×</button>
            </div>
            <div>
              <p className="modal-section-title">Size</p>
              <div className="size-list">
                {Object.entries(selectedItem.prices).map(([size, price]) => (
                  <button key={size} className={`size-chip${selectedSize === size ? " selected" : ""}`} onClick={() => setSelectedSize(size)}>
                    {size} <span className="price">₱{price}</span>
                  </button>
                ))}
              </div>
            </div>
            {selectedItem.addons.length > 0 ? (
              <div>
                <p className="modal-section-title">Add-ons</p>
                <div className="addons-list">
                  {selectedItem.addons.map((addon, index) => (
                    <div key={index} className="addon-row">
                      <label>
                        <input type="checkbox" checked={selectedAddons.includes(addon)} onChange={() => toggleAddon(addon)} />
                        {addon}
                        {ADDON_PRICES[addon] != null && <span className="addon-price"> +₱{ADDON_PRICES[addon]}</span>}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="empty-addon">No add-ons available for this item.</p>
            )}
            <div className="modal-summary">
              <span>{selectedSize}{selectedAddons.length > 0 && ` + ${selectedAddons.length} add-on${selectedAddons.length > 1 ? "s" : ""}`}</span>
              <span>₱{modalPreviewPrice}</span>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeItemModal}>Cancel</button>
              <button className="btn-primary" onClick={addToCart}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}