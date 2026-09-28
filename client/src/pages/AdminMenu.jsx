import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../assets/style/menu.css";

export default function AdminMenu() {
  const { token, user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Vegetarian",
    description: "",
    price: "",
    img: ""
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/menu");
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
      category: "Vegetarian",
      description: "",
      price: "",
      img: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingItem
      ? `http://localhost:5000/api/menu/${editingItem.id}`
      : "http://localhost:5000/api/menu";
    const method = editingItem ? "PUT" : "POST";

    const data = new FormData();
    data.append("title", formData.title);
    data.append("category", formData.category);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("currentImg", formData.img);
    if (file) {
      data.append("image", file);
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: data
    });

    if (res.ok) {
      fetchMenuItems();
      handleReset();
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      description: item.description,
      price: item.price,
      img: item.img
    });
    setFile(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    const res = await fetch(`http://localhost:5000/api/menu/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      fetchMenuItems();
    }
  };

  if (user?.role !== "admin") {
    return <p className="menu-main">Access Denied. Admins only.</p>;
  }

  return (
    <main className="menu-main">
      <div className="menu-header" style={{ marginBottom: "1.5rem" }}>
        <h1>Admin Menu Management</h1>
      </div>

      <div className="sidebar-card" style={{ marginBottom: "2rem" }}>
        <h2>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h2>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "1fr 1fr"
            }}
          >
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                placeholder="Item Title"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                style={{
                  padding: "0.5rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  fontSize: "0.9rem"
                }}
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Gluten-Free">Gluten-Free</option>
                <option value="None">None</option>
              </select>
            </div>

            <div className="form-group">
              <label>Price (₹)</label>
              <input
                placeholder="0.00"
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>
                {editingItem ? "Upload New Image (Optional)" : "Upload Image"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Description</label>
            <textarea
              placeholder="Item Description"
              rows="3"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div style={{ marginTop: "1.25rem", display: "flex", gap: "1rem" }}>
            <button className="btn-primary" type="submit" style={{ width: "auto" }}>
              {editingItem ? "Update Item" : "Add Item"}
            </button>
            {editingItem && (
              <button
                className="btn-secondary"
                type="button"
                onClick={handleReset}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="sidebar-card">
        <h2>Current Menu Items</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "2px solid var(--border-color)",
                textAlign: "left"
              }}
            >
              <th style={{ padding: "0.5rem" }}>Image</th>
              <th style={{ padding: "0.5rem" }}>Title</th>
              <th style={{ padding: "0.5rem" }}>Category</th>
              <th style={{ padding: "0.5rem" }}>Price</th>
              <th style={{ padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                <td style={{ padding: "0.5rem" }}>
                  <img
                    src={`http://localhost:5000/${item.img}`}
                    alt={item.title}
                    style={{
                      width: "48px",
                      height: "48px",
                      objectFit: "cover",
                      borderRadius: "6px"
                    }}
                    onError={(e) => {
                      e.target.src = "/assets/images/placeholder.png";
                    }}
                  />
                </td>
                <td style={{ padding: "0.5rem", fontWeight: "bold" }}>
                  {item.title}
                </td>
                <td style={{ padding: "0.5rem" }}>
                  <span className="category-tag">{item.category}</span>
                </td>
                <td style={{ padding: "0.5rem", fontWeight: "bold" }}>
                  ₹{item.price}
                </td>
                <td style={{ padding: "0.5rem" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handleEdit(item)}
                    style={{ marginRight: "0.5rem" }}
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
    </main>
  );
}