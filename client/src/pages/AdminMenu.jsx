import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AdminReservations from "../components/AdminReservations";
import AdminReviews from "../components/AdminReviews";
import AdminPromotions from "../components/AdminPromotions";
import AdminCRM from "../components/AdminCRM";
import AdminEmployees from "../components/AdminEmployees";
import "../assets/style/menu.css";

const AVAILABLE_TAGS = ["Vegetarian", "Non-Veg", "Vegan", "Gluten-Free"];

export default function AdminMenu() {
  const { token, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname === "/admin" ? "overview" : ({
    "/admin/operations": "orders",
    "/admin/marketing": "promotions",
    "/admin/management": "menu",
  }[location.pathname] || "overview");
  const setActiveTab = (tab) => {
    const section = { overview: "/admin", orders: "/admin/operations", reservations: "/admin/operations", promotions: "/admin/marketing", crm: "/admin/marketing", menu: "/admin/management", reviews: "/admin/management", employees: "/admin/management", rush: "/admin" };
    const destination = ['menu', 'reviews', 'employees'].includes(tab)
      ? `/admin/management?view=${tab}`
      : section[tab] || "/admin";
    navigate(destination);
    if (tab === "reservations") setFeatureTab("reservations");
    else if (tab === "orders") setFeatureTab("orders");
    else if (tab === "crm") setFeatureTab("crm");
    else if (tab === "promotions") setFeatureTab("promotions");
    else if (tab === "reviews") setFeatureTab("reviews");
    else if (tab === "employees") setFeatureTab("employees");
    else if (tab === "menu") setFeatureTab("menu");
    else if (tab === "rush") setFeatureTab("rush");
  };
  const [featureTab, setFeatureTab] = useState(() => {
    const requestedView = new URLSearchParams(location.search).get('view');
    return location.pathname === '/admin/management' && ['menu', 'reviews', 'employees'].includes(requestedView)
      ? requestedView : 'orders';
  });
  useEffect(() => {
    if (location.pathname !== '/admin/management') return;
    const requestedView = new URLSearchParams(location.search).get('view');
    setFeatureTab(['menu', 'reviews', 'employees'].includes(requestedView) ? requestedView : 'menu');
  }, [location.pathname, location.search]);
  const sectionTab = location.pathname === "/admin/operations"
    ? (featureTab === "reservations" ? "reservations" : "orders")
    : location.pathname === "/admin/marketing"
      ? (featureTab === "crm" ? "crm" : "promotions")
      : location.pathname === "/admin/management"
      ? (featureTab === "employees" ? "employees" : featureTab === "reviews" ? "reviews" : "menu")
        : activeTab;
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    categories: ["Vegetarian"],
    description: "",
    price: "",
    img: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    fibre: "",
  });
  const [groupedOrders, setGroupedOrders] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [unreadDeliveryFailureCount, setUnreadDeliveryFailureCount] = useState(0);
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [rushOverride, setRushOverride] = useState('automatic');
  const [rushMessage, setRushMessage] = useState('');

  // Ref used to scroll up to the "Edit Menu Item" heading
  const formRef = useRef(null);
  const ordersEndRef = useRef(null);
  const ordersRequestInFlight = useRef(false);

  // Mailtrap Notifications State with localStorage persistence
  const [mailtrapMessages, setMailtrapMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestPopupMsg, setLatestPopupMsg] = useState(null);
  const [isPopupExpanded, setIsPopupExpanded] = useState(false);

  // Read IDs persisted across reloads
  const [readMessageIds, setReadMessageIds] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_read_msg_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (sectionTab === "overview") {
      fetchMenuItems();
      fetch('/api/rush').then((res) => res.json()).then((data) => setRushOverride(data.rushOverride || 'automatic')).catch(() => {});
    } else if (sectionTab === "menu") {
      fetchMenuItems();
    } else if (sectionTab === "rush") {
      fetch('/api/rush').then((res) => res.json()).then((data) => setRushOverride(data.rushOverride || 'automatic')).catch(() => {});
    }
  }, [sectionTab]);

  useEffect(() => {
    if (user?.role !== 'admin' || !token) return undefined;
    fetchOrders({ mode: 'replace' });
    const interval = setInterval(() => fetchOrders({ mode: 'refresh' }), 10000);
    return () => clearInterval(interval);
  }, [sectionTab, token, user?.role]);

  useEffect(() => {
    if (user?.role !== "admin" || !token) return;

    fetchMailtrapMessages();
    const interval = setInterval(fetchMailtrapMessages, 10000);
    return () => clearInterval(interval);
  }, [token, user, readMessageIds]);

  useEffect(() => {
    if (sectionTab !== 'orders' || !ordersHasMore || groupedOrders.length >= ordersTotalCount || ordersLoading || ordersLoadingMore || !ordersEndRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchOrders({ page: ordersPage + 1, mode: 'append' });
    }, { rootMargin: '300px' });
    observer.observe(ordersEndRef.current);
    return () => observer.disconnect();
  }, [sectionTab, ordersHasMore, ordersTotalCount, ordersLoading, ordersLoadingMore, ordersPage, groupedOrders.length]);

  const fetchMailtrapMessages = async () => {
    try {
      const res = await fetch("/api/contact/mailtrap", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const messages = await res.json();
      setMailtrapMessages(messages);

      // Filter only unread messages
      const unreadMsgs = messages.filter((m) => !readMessageIds.includes(m.id));
      setUnreadCount(unreadMsgs.length);

      // Only display the popup if there are unread messages
      if (unreadMsgs.length > 0) {
        if (!latestPopupMsg || !unreadMsgs.some((m) => m.id === latestPopupMsg.id)) {
          setLatestPopupMsg(unreadMsgs[0]);
          setIsPopupExpanded(false);
        }
      } else {
        setLatestPopupMsg(null);
      }
    } catch (err) {
      console.error("Failed to fetch messages from Mailtrap:", err);
    }
  };

  const saveRushOverride = async (value) => {
    setRushOverride(value);
    setRushMessage('');
    try {
      const response = await fetch('/api/rush/override', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rush_override: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save setting.');
      setRushMessage('Rush status updated.');
    } catch (error) { setRushMessage(error.message); }
  };

  const markAsRead = (msgId) => {
    const updatedReadIds = [...readMessageIds, msgId];
    setReadMessageIds(updatedReadIds);

    // 1. Save to localStorage
    localStorage.setItem("admin_read_msg_ids", JSON.stringify(updatedReadIds));

    // 2. Dispatch custom event so Navbar updates instantly
    window.dispatchEvent(new Event("adminReadMessagesUpdated"));

    // 3. Update unread count in AdminMenu state
    const remainingUnread = mailtrapMessages.filter((m) => !updatedReadIds.includes(m.id));
    setUnreadCount(remainingUnread.length);

    // 4. Clear or update current popup
    if (latestPopupMsg?.id === msgId) {
      setLatestPopupMsg(remainingUnread.length > 0 ? remainingUnread[0] : null);
      setIsPopupExpanded(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    }
  };

  const handleReset = () => {
    setEditingItem(null);
    setFile(null);
    setFormData({
      title: "",
      categories: ["Vegetarian"],
      description: "",
      price: "",
      img: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      fibre: "",
    });
  };

  const handleTagToggle = (tag) => {
    let updated = [...formData.categories];
    if (updated.includes(tag)) {
      updated = updated.filter((t) => t !== tag);
    } else {
      if (tag === "Vegetarian") {
        updated = updated.filter((t) => t !== "Non-Veg" && t !== "Vegan");
      } else if (tag === "Vegan") {
        updated = updated.filter((t) => t !== "Vegetarian" && t !== "Non-Veg");
      } else if (tag === "Non-Veg") {
        updated = updated.filter((t) => t !== "Vegetarian" && t !== "Vegan");
      }
      updated.push(tag);
    }
    setFormData({ ...formData, categories: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.categories.length === 0) {
      alert("Please select at least one tag for the category.");
      return;
    }
    const endpoint = editingItem ? `/api/menu/${editingItem.id}` : "/api/menu";
    const method = editingItem ? "PUT" : "POST";

    const data = new FormData();
    data.append("title", formData.title);
    data.append("category", formData.categories.join(","));
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("currentImg", formData.img);

    data.append("calories", formData.calories);
    data.append("protein", formData.protein);
    data.append("carbs", formData.carbs);
    data.append("fats", formData.fats);
    data.append("fibre", formData.fibre);

    if (file) {
      data.append("image", file);
    }

    const res = await fetch(endpoint, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) {
      fetchMenuItems();
      handleReset();
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    const parsedCategories = item.category
      ? item.category.split(",").map((cat) => cat.trim())
      : ["Vegetarian"];
    setFormData({
      title: item.title,
      categories: parsedCategories,
      description: item.description,
      price: item.price,
      img: item.img,
      calories: item.calories || "",
      protein: item.protein || "",
      carbs: item.carbs || "",
      fats: item.fats || "",
      fibre: item.fibre || "",
    });
    setFile(null);

    // Scroll up to the edit form
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    const res = await fetch(`/api/menu/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchMenuItems();
    }
  };

  const fetchOrders = async ({ page = 1, mode = 'refresh' } = {}) => {
    if (!token || ordersRequestInFlight.current) return;
    ordersRequestInFlight.current = true;
    if (mode === 'append') setOrdersLoadingMore(true);
    else if (mode === 'replace') setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server error:${res.status}`);
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.orders || [];
      groupOrdersByGroupId(rows, mode);
      const pagination = data.pagination || {};
      setOrdersHasMore(Boolean(pagination.hasMore));
      if (typeof pagination.total === 'number') setOrdersTotalCount(pagination.total);
      if (typeof data.unreadFailureCount === 'number') setUnreadDeliveryFailureCount(data.unreadFailureCount);
      if (mode !== 'refresh') setOrdersPage(page);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      ordersRequestInFlight.current = false;
      setOrdersLoading(false);
      setOrdersLoadingMore(false);
    }
  };

  const groupOrdersByGroupId = (flatOrders, mode = 'refresh') => {
    const groups = {};
    flatOrders.forEach((item) => {
      const groupKey = item.order_id || `single_${item.id}`;
      const rawDate = item.created_at ? new Date(item.created_at) : new Date();
      if (!groups[groupKey]) {
        groups[groupKey] = {
          order_id: groupKey,
          createdAt: rawDate,
          dateString: rawDate.toLocaleDateString("en-CA"),
          formattedDate: rawDate.toLocaleDateString(),
          username: item.username || "Guest/Unknown",
          order_type: item.order_type || "Dine In",
          table_id: item.table_id,
          table_number: item.table_number,
          table_zone: item.table_zone,
          address: item.address,
          completed: item.completed,
          kitchen_status: item.kitchen_status || 'pending',
          delivery_status: item.delivery_status,
          driver_id: item.driver_id,
          driver_name: item.driver_name,
          delivery_failure_reason: item.delivery_failure_reason,
          delivery_failure_details: item.delivery_failure_details,
          delivery_failure_read_at: item.delivery_failure_read_at,
          items: [],
          totalAmount: 0,
        };
      }
      const itemTotal = Number(item.price) * Number(item.quantity);
      groups[groupKey].totalAmount += itemTotal;
      if (item.kitchen_status === 'ready' || groups[groupKey].kitchen_status !== 'ready' && item.kitchen_status === 'preparing') {
        groups[groupKey].kitchen_status = item.kitchen_status;
      }
      groups[groupKey].items.push(item);
    });

    const incoming = Object.values(groups);
    setGroupedOrders((current) => {
      let combined;
      if (mode === 'append') {
        const knownIds = new Set(current.map((group) => group.order_id));
        combined = [...current, ...incoming.filter((group) => !knownIds.has(group.order_id))];
      } else if (mode === 'refresh') {
        const freshIds = new Set(incoming.map((group) => group.order_id));
        combined = [...incoming, ...current.filter((group) => !freshIds.has(group.order_id))];
      } else {
        combined = incoming;
      }
      const groupList = combined.sort((a, b) => a.createdAt - b.createdAt);
    const dailyCounters = {};
    const formattedGroups = groupList.map((group) => {
      const day = group.dateString;
      dailyCounters[day] = (dailyCounters[day] || 0) + 1;
      const orderNum = String(dailyCounters[day]).padStart(3, "0");
      return {
        ...group,
        displayId: `${group.formattedDate}-${orderNum}`,
      };
    });
      return formattedGroups.reverse();
    });
  };

  const toggleExpandOrder = async (group) => {
    const orderId = group.order_id;
    const isOpening = !expandedOrderIds.includes(orderId);
    if (isOpening && group.delivery_status === 'failed' && !group.delivery_failure_read_at) {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/failure-read`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setGroupedOrders((orders) => orders.map((order) => order.order_id === orderId
            ? { ...order, delivery_failure_read_at: new Date().toISOString() } : order));
          setUnreadDeliveryFailureCount((count) => Math.max(0, count - 1));
        }
      } catch (error) { console.error('Could not mark delivery failure as read:', error); }
    }
    setExpandedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleFavorite = async (item) => {
    const next = !item.is_favorite;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_favorite: next ? 1 : 0 } : i))
    );
    try {
      const res = await fetch(`/api/menu/${item.id}/favorite`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch (err) {
      console.error("Failed to update favorite:", err);
      fetchMenuItems(); // revert to server state
    }
  };

  const handleToggleGroupCompleted = async (group) => {
    try {
      const newStatus = !group.completed;
      const responses = await Promise.all(
        group.items.map((item) =>
          fetch(`/api/orders/${item.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...item, completed: newStatus ? 1 : 0 }),
          })
        )
      );
      if (responses.some((response) => !response.ok)) {
        throw new Error("One or more order items could not be updated.");
      }
      fetchOrders();
    } catch (error) {
      console.error("Failed to update group status:", error);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm("Are you sure you want to delete this complete order group?")) return;
    try {
      await Promise.all(
        group.items.map((item) =>
          fetch(`/api/orders/${item.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      fetchOrders();
    } catch (error) {
      console.error("Failed to delete order group:", error);
    }
  };

  if (user?.role !== "admin") {
    return <p className="menu-main">Access Denied. Admins only.</p>;
  }

  return (
    <main className="menu-main admin-main">
      <div className="menu-header admin-header">
        <h1>{location.pathname === "/admin" ? "Admin Dashboard" : location.pathname.endsWith("operations") ? "Operations" : location.pathname.endsWith("marketing") ? "Marketing" : "Management"}</h1>
        {location.pathname !== "/admin" && <div className="admin-tabs" role="tablist" aria-label="Admin section views">
          {(location.pathname.endsWith("operations") ? [["orders", "Order Management"], ["reservations", "Reservations"]] : location.pathname.endsWith("marketing") ? [["promotions", "Promotions"], ["crm", "Customer CRM"]] : [["menu", "Menu Management"], ["reviews", "Reviews & Moderation"], ["employees", "Employee Management"]]).map(([tab, label]) =>
            <button key={tab} type="button" role="tab" aria-selected={sectionTab === tab} className={`btn-primary ${sectionTab === tab ? "" : "btn-secondary"}`} onClick={() => setActiveTab(tab)}>{label}</button>
          )}
        </div>}
      </div>

      {unreadDeliveryFailureCount > 0 && <button type="button" className="admin-failure-notice" onClick={() => setActiveTab('orders')}>
        <strong>{unreadDeliveryFailureCount} unread delivery {unreadDeliveryFailureCount === 1 ? 'failure' : 'failures'}</strong>
        <span>Open Order Management to review the driver’s reason.</span>
      </button>}

      {sectionTab === "overview" && (
        <section className="admin-dashboard" aria-label="Admin dashboard overview">
          <div className="admin-dashboard-summary">
            <article className="sidebar-card admin-dashboard-card">
              <span>Menu items</span><strong>{items.length}</strong>
              <p>Items on your cafe menu</p>
            </article>
            <article className="sidebar-card admin-dashboard-card">
              <span>Orders</span><strong>{groupedOrders.length}</strong>
              <p>Stay on top of every order</p>
            </article>
            <article className="sidebar-card admin-dashboard-card">
              <span>Restaurant Rush</span><strong>{rushOverride === "automatic" ? "Automatic" : rushOverride}</strong>
              <p>Rush status is managed automatically</p>
              <label className="admin-rush-control" htmlFor="dashboardRushOverride">Change rush mode</label>
              <select className="admin-control-select" id="dashboardRushOverride" value={rushOverride} onChange={(event) => saveRushOverride(event.target.value)}>
                <option value="automatic">Automatic</option>
                <option value="Quiet">Quiet (10–15 min)</option>
                <option value="Moderate">Moderate (20–30 min)</option>
                <option value="Busy/Peak">Busy/Peak (45+ min)</option>
              </select>
              {rushMessage && <small role="status">{rushMessage}</small>}
            </article>
          </div>
          <div className="sidebar-card admin-dashboard-links">
            <h2>Your workspace</h2>
            <p>Everything you need, organized around the way you work.</p>
            <div className="admin-dashboard-actions">
              <button type="button" className="admin-workspace-card" onClick={() => setActiveTab("orders")}>
                <strong>⚡ Operations</strong><span>Order Management · Reservations</span>
              </button>
              <button type="button" className="admin-workspace-card" onClick={() => setActiveTab("promotions")}>
                <strong>📢 Marketing</strong><span>Promotions · Customer CRM</span>
              </button>
              <button type="button" className="admin-workspace-card" onClick={() => setActiveTab("menu")}>
                <strong>🛠️ Management</strong><span>Menu Management · Reviews &amp; Moderation</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {sectionTab === "menu" && (
        <div className="sidebar-card admin-card">
          <h2 ref={formRef}>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Item Title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Price(₹)</label>
                <input
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="form-group span-2">
                <label className="admin-nutrition-title">Nutritional Info (Per Serving)</label>
                <div className="admin-nutrition-grid">
                  <div>
                    <label>Calories (kcal)</label>
                    <input
                      type="number"
                      placeholder="e.g. 450"
                      value={formData.calories}
                      onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 20.5"
                      value={formData.protein}
                      onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 50.0"
                      value={formData.carbs}
                      onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Fats (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 12.0"
                      value={formData.fats}
                      onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Fibre (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.0"
                      value={formData.fibre}
                      onChange={(e) => setFormData({ ...formData, fibre: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group span-2">
                <label>Categories/Tags (Select all that apply)</label>
                <div className="admin-tag-list">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isActive = formData.categories.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`filter-btn admin-tag-btn ${isActive ? "active" : ""}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group span-2">
                <label>{editingItem ? "Upload New Image (Optional)" : "Upload Image"}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
              <div className="form-group span-2">
                <label>Description</label>
                <textarea
                  rows="3"
                  placeholder="Short description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-form-actions">
              <button type="submit" className="btn-primary">
                {editingItem ? "Update Item" : "Save Item"}
              </button>
              {editingItem && (
                <button type="button" className="btn-secondary" onClick={handleReset}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h2 className="admin-list-title">Menu Items List</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Nutrition(Cal/P/C/F/Fib)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-item-cell">
                        <button
                          type="button"
                          className={`admin-fav-btn ${item.is_favorite ? 'active' : ''}`}
                          onClick={() => handleToggleFavorite(item)}
                          title={item.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          ★
                        </button>
                        <strong>{item.title}</strong>
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>₹{Number(item.price).toFixed(2)}</td>
                    <td className="admin-nutrition-cell">
                      {item.calories ?? "-"}kcal|{item.protein ?? "-"}g P|{item.carbs ?? "-"}g C|{item.fats ?? "-"}g F|{item.fibre ?? "-"}g Fib
                    </td>
                    <td>
                      <button
                        className="btn-secondary admin-btn-gap"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sectionTab === "employees" && <AdminEmployees token={token} />}

      {sectionTab === "orders" && (
        <div className="sidebar-card admin-card-orders">
          <h2>Order Management{unreadDeliveryFailureCount > 0 && <span className="admin-failure-count">{unreadDeliveryFailureCount} new delivery {unreadDeliveryFailureCount === 1 ? 'issue' : 'issues'}</span>}</h2>
          {groupedOrders.length === 0 ? (
            ordersLoading ? <p className="admin-empty">Loading orders…</p> :
            <p className="admin-empty">No orders placed yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Order #</th>
                  <th>Username</th>
                  <th>Type</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedOrders.map((group) => {
                  const isExpanded = expandedOrderIds.includes(group.order_id);
                  return (
                    <React.Fragment key={group.order_id}>
                      <tr
                        onClick={() => toggleExpandOrder(group)}
                        className={`admin-order-row ${isExpanded ? "admin-order-row--expanded" : ""}`}
                      >
                        <td className="admin-order-id-cell">
                          <span className="admin-order-arrow">{isExpanded ? "▼" : "▶"}</span>
                          <strong>{group.displayId}</strong>
                          {group.delivery_status === 'failed' && !group.delivery_failure_read_at && <span className="admin-failure-unread">New failure</span>}
                        </td>
                        <td className="admin-cell-bold">
                          {group.username}
                        </td>
                        <td>
                          <span className="category-tag">{group.order_type}</span>
                          {group.table_number && (
                            <div className="admin-order-address">
                              {group.table_zone === "Bar" ? "Bar" : "Table"} {group.table_number} · {group.table_zone}
                            </div>
                          )}
                        </td>
                        <td className="admin-cell-bold">₹{group.totalAmount.toFixed(2)}</td>
                        <td>
                          <span
                            className={`admin-status ${
                              group.delivery_status === 'failed' ? "admin-status--failed" : group.completed || group.kitchen_status === 'ready' ? "admin-status--completed" : "admin-status--pending"
                            }`}
                          >
                            {group.order_type === 'Delivery' ? (group.delivery_status || (group.kitchen_status === 'ready' ? 'Ready' : group.kitchen_status === 'preparing' ? 'Preparing' : 'Pending')) : group.completed ? "Completed" : group.kitchen_status === 'ready' ? 'Ready' : group.kitchen_status === 'preparing' ? 'Preparing' : 'Pending'}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {group.order_type !== 'Delivery' && <button
                            className="btn-secondary admin-btn-sm admin-btn-mark"
                            onClick={() => handleToggleGroupCompleted(group)}
                          >
                            {`Mark as ${group.completed ? "Pending" : "Completed"}`}
                          </button>}
                          <button
                            className="btn-danger admin-btn-sm"
                            onClick={() => handleDeleteGroup(group)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="admin-order-details-row">
                          <td colSpan="6" className="admin-order-details">
                            {(group.driver_name || group.address) && (
                              <div className="admin-order-meta">
                                {group.driver_name && <div><strong>Driver:</strong> {group.driver_name}</div>}
                                {group.address && <div><strong>Address:</strong> {group.address}</div>}
                              </div>
                            )}
                            {group.delivery_status === 'failed' && <div className="admin-order-failure">
                              <div><strong>Failure tag:</strong> {group.delivery_failure_reason || 'Reason not provided.'}</div>
                              {group.delivery_failure_details && <div className="admin-order-failure-details"><strong>Driver details:</strong> {group.delivery_failure_details}</div>}
                            </div>}
                            <strong className="admin-order-details-title">
                              Items & Customization Notes:
                            </strong>
                            <ol className="admin-order-items">
                              {group.items.map((item, idx) => (
                                <li key={item.id || idx} className="admin-order-item">
                                  <span>
                                    <strong>{item.title}</strong> (x{item.quantity}) — ₹
                                    {Number(item.price).toFixed(2)}
                                  </span>
                                  {item.notes && (
                                    <div className="admin-order-note">Note: {item.notes}</div>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
          <div ref={ordersEndRef} className="admin-orders-list-end" aria-hidden="true" />
          {ordersLoadingMore && <p className="admin-orders-loading" role="status">Loading more orders…</p>}
          {groupedOrders.length > 0 && groupedOrders.length >= ordersTotalCount && <p className="admin-orders-loading">All orders loaded.</p>}
        </div>
      )}

      {sectionTab === "reservations" && (
        <AdminReservations token={token} />
      )}

      {sectionTab === "reviews" && (
        <AdminReviews token={token} />
      )}

      {sectionTab === "rush" && (
        <div className="sidebar-card admin-card">
          <h2>Restaurant rush status</h2>
          <p>Choose automatic order-based estimates or set the status manually.</p>
          <label htmlFor="rushOverride">Rush mode</label>
          <select className="admin-control-select" id="rushOverride" value={rushOverride} onChange={(event) => saveRushOverride(event.target.value)}>
            <option value="automatic">Automatic</option>
            <option value="Quiet">Quiet (10–15 min)</option>
            <option value="Moderate">Moderate (20–30 min)</option>
            <option value="Busy/Peak">Busy/Peak (45+ min)</option>
          </select>
          {rushMessage && <p role="status">{rushMessage}</p>}
        </div>
      )}

      {sectionTab === "promotions" && <AdminPromotions token={token} />}

      {sectionTab === "crm" && <AdminCRM token={token} />}

      {/* Floating Notification Bubble Icon */}
      <div className="admin-mail-fab">
        <button
          className="admin-mail-btn"
          onClick={() => {
            const unreadMsgs = mailtrapMessages.filter((m) => !readMessageIds.includes(m.id));
            if (unreadMsgs.length > 0) {
              setLatestPopupMsg(unreadMsgs[0]);
              setIsPopupExpanded(true);
            } else if (mailtrapMessages.length > 0) {
              setLatestPopupMsg(mailtrapMessages[0]);
              setIsPopupExpanded(true);
            }
          }}
          title="Notification Messages"
        >
          ✉
          {unreadCount > 0 && <span className="admin-mail-badge">{unreadCount}</span>}
        </button>
      </div>

      {/* Pop-up Banner Notification */}
      {latestPopupMsg && unreadCount > 0 && (
        <div className="admin-popup" onClick={() => setIsPopupExpanded(!isPopupExpanded)}>
          <div className="admin-popup-header">
            <span className="admin-popup-title">🔔 New Contact Message</span>
            <button
              className="admin-popup-close"
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(latestPopupMsg.id);
              }}
            >
              ✕
            </button>
          </div>
          <p className="admin-popup-text">
            You have an email from {latestPopupMsg.from_name || latestPopupMsg.from_email}.
          </p>
          {!isPopupExpanded ? (
            <span className="admin-popup-hint">Click to view email details...</span>
          ) : (
            <div className="admin-popup-details" onClick={(e) => e.stopPropagation()}>
              <p className="admin-popup-line">
                <strong>Subject:</strong> {latestPopupMsg.subject}
              </p>
              <p className="admin-popup-line admin-popup-line--last">
                <strong>Email:</strong> {latestPopupMsg.from_email}
              </p>
              <button
                className="admin-popup-markread"
                onClick={() => markAsRead(latestPopupMsg.id)}
              >
                Mark as Read
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
