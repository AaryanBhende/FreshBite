import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import AdminReservations from "../components/AdminReservations";
import AdminReviews from "../components/AdminReviews";
import "../assets/style/menu.css";

const AVAILABLE_TAGS = ["Vegetarian", "Non-Veg", "Vegan", "Gluten-Free"];

export default function AdminMenu() {
  const { token, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("menu");
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
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);

  // Ref used to scroll up to the "Edit Menu Item" heading
  const formRef = useRef(null);

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
    if (activeTab === "menu") {
      fetchMenuItems();
    } else if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.role !== "admin" || !token) return;

    fetchMailtrapMessages();
    const interval = setInterval(fetchMailtrapMessages, 10000);
    return () => clearInterval(interval);
  }, [token, user, readMessageIds]);

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

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server error:${res.status}`);
      }
      const data = await res.json();
      groupOrdersByGroupId(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  const groupOrdersByGroupId = (flatOrders) => {
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
          address: item.address,
          completed: item.completed,
          items: [],
          totalAmount: 0,
        };
      }
      const itemTotal = Number(item.price) * Number(item.quantity);
      groups[groupKey].totalAmount += itemTotal;
      groups[groupKey].items.push(item);
    });

    const groupList = Object.values(groups).sort((a, b) => a.createdAt - b.createdAt);
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
    setGroupedOrders(formattedGroups.reverse());
  };

  const toggleExpandOrder = (orderId) => {
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
      await Promise.all(
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
        <h1>Admin Control Panel</h1>
        <div className="admin-tabs">
          <button
            className={`btn-primary ${activeTab === "menu" ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab("menu")}
          >
            Menu Management
          </button>
          <button
            className={`btn-primary ${activeTab === "orders" ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab("orders")}
          >
            Order Management
          </button>
          <button
            className={`btn-primary ${activeTab === "reservations" ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab("reservations")}
          >
            Reservations
          </button>
          <button
            className={`btn-primary ${activeTab === "reviews" ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab("reviews")}
          >
            Reviews &amp; Moderation
          </button>
        </div>
      </div>

      {activeTab === "menu" && (
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

      {activeTab === "orders" && (
        <div className="sidebar-card admin-card-orders">
          <h2>Order Management</h2>
          {groupedOrders.length === 0 ? (
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
                        onClick={() => toggleExpandOrder(group.order_id)}
                        className={`admin-order-row ${isExpanded ? "admin-order-row--expanded" : ""}`}
                      >
                        <td className="admin-order-id-cell">
                          <span className="admin-order-arrow">{isExpanded ? "▼" : "▶"}</span>
                          <strong>{group.displayId}</strong>
                        </td>
                        <td className="admin-cell-bold">
                          {group.username}
                          {group.address && (
                            <div className="admin-order-address">Address: {group.address}</div>
                          )}
                        </td>
                        <td>
                          <span className="category-tag">{group.order_type}</span>
                        </td>
                        <td className="admin-cell-bold">₹{group.totalAmount.toFixed(2)}</td>
                        <td>
                          <span
                            className={`admin-status ${
                              group.completed ? "admin-status--completed" : "admin-status--pending"
                            }`}
                          >
                            {group.completed ? "Completed" : "Pending"}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-secondary admin-btn-sm admin-btn-mark"
                            onClick={() => handleToggleGroupCompleted(group)}
                          >
                            Mark as {group.completed ? "Pending" : "Completed"}
                          </button>
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
        </div>
      )}

      {activeTab === "reservations" && (
        <AdminReservations token={token} />
      )}

      {activeTab === "reviews" && (
        <AdminReviews token={token} />
      )}

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
