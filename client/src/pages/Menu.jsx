import React, { useState, useEffect, useRef } from 'react';
import ProductGrid from '../components/ProductGrid';
import '../assets/style/menu.css';

export default function Menu() {
  const [catalogDishes, setCatalogDishes] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('freshbite_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOrder, setFormOrder] = useState({ id: '', title: '', quantity: 1, notes: '' });
  const [selectedMeta, setSelectedMeta] = useState({ price: 0, category: 'None' });
  const [feedback, setFeedback] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orderFormRef = useRef(null);

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
  }, []);

  useEffect(() => {
    localStorage.setItem('freshbite_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/menu');
      if (res.ok) {
        const data = await res.json();
        setCatalogDishes(data);
      }
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/orders');
      if (res.ok) {
        const data = await res.json();
        setUserOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setFormOrder({ ...formOrder, title: val });
    const found = catalogDishes.find((d) => d.title === val);
    if (found) {
      setSelectedMeta({ price: Number(found.price), category: found.category });
    } else {
      setSelectedMeta({ price: 0, category: 'None' });
    }
  };

  const selectDishForOrder = (dish) => {
    setFormOrder({ id: '', title: dish.title, quantity: 1, notes: '' });
    setSelectedMeta({ price: Number(dish.price), category: dish.category });
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormOrder({ id: '', title: '', quantity: 1, notes: '' });
    setSelectedMeta({ price: 0, category: 'None' });
    setFeedback('');
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    setFeedback('');
    if (!formOrder.title) {
      setFeedback('Please select or enter a valid dish name.');
      return;
    }
    if (selectedMeta.price === 0) {
      setFeedback('Please select a valid dish from the menu.');
      return;
    }
    if (formOrder.quantity < 1) {
      setFeedback('Quantity must be at least 1.');
      return;
    }

    if (formOrder.id) {
      setCartItems(
        cartItems.map((item) =>
          item.id === formOrder.id
            ? {
                ...item,
                title: formOrder.title,
                category: selectedMeta.category,
                price: selectedMeta.price,
                quantity: Number(formOrder.quantity),
                notes: formOrder.notes,
              }
            : item
        )
      );
    } else {
      const newItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: formOrder.title,
        category: selectedMeta.category,
        price: selectedMeta.price,
        quantity: Number(formOrder.quantity),
        notes: formOrder.notes,
        completed: 0,
      };
      setCartItems([...cartItems, newItem]);
    }
    resetForm();
  };

  const handleEditCartItem = (item) => {
    setFormOrder({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      notes: item.notes || '',
    });
    setSelectedMeta({ price: Number(item.price), category: item.category || 'None' });
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteCartItem = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    if (formOrder.id === id) {
      resetForm();
    }
  };

  const handlePlaceOrderClick = () => {
    if (cartItems.length === 0) return;
    setShowConfirmModal(true);
  };

  const confirmPlaceOrder = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const orderGroupId = `group-${Date.now()}`;
      const payload = cartItems.map((item) => ({
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        order_id: orderGroupId,
        title: item.title,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        completed: 0,
      }));
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCartItems([]);
        localStorage.removeItem('freshbite_cart');
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to place order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDishes = catalogDishes.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalBill = cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <main className="menu-main">
      <section className="menu-layout">
        <section className="catalog-section">
          <div className="catalog-top-bar">
            <div className="menu-header">
              <h1>
                Our Seasonal<span>Menu</span>
              </h1>
            </div>
            <div className="controls-wrapper">
              <div className="category-filters">
                {['All', 'Vegetarian', 'Vegan', 'Gluten-Free'].map((cat) => (
                  <button
                    key={cat}
                    className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search menu by title or ingredient..."
                  aria-label="Search Menu"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <h2>Browse Dishes</h2>
          <ProductGrid items={filteredDishes} onSelectDish={selectDishForOrder} />
        </section>

        <aside className="order-sidebar">
          <div className="sidebar-card" ref={orderFormRef}>
            <h2>{formOrder.id ? 'Edit Cart Item' : 'Add Custom Dish/Order'}</h2>
            {feedback && <div className="feedback-container">{feedback}</div>}
            <form onSubmit={handleAddToCart} noValidate>
              <div className="form-group">
                <label htmlFor="itemName">Dish Name*</label>
                <input
                  id="itemName"
                  placeholder="Select or type item name"
                  list="menuOptions"
                  required
                  value={formOrder.title}
                  onChange={handleTitleChange}
                />
                <datalist id="menuOptions">
                  {catalogDishes.map((dish) => (
                    <option key={dish.id} value={dish.title} />
                  ))}
                </datalist>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <span className="value">{selectedMeta.category}</span>
                </div>
                <div className="form-group flex-1">
                  <label>Price(₹)</label>
                  <span className="value">₹{selectedMeta.price}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="itemQuantity">Qty*</label>
                <input
                  id="itemQuantity"
                  type="number"
                  required
                  min="1"
                  value={formOrder.quantity}
                  onChange={(e) => setFormOrder({ ...formOrder, quantity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="itemNotes">Customization Notes</label>
                <textarea
                  id="itemNotes"
                  placeholder="e.g. Extra dressing, no onions..."
                  rows="2"
                  value={formOrder.notes}
                  onChange={(e) => setFormOrder({ ...formOrder, notes: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button className="btn-primary" type="submit">
                  {formOrder.id ? 'Update Cart Item' : 'Add to Order'}
                </button>
                {formOrder.id && (
                  <button className="btn-secondary" type="button" onClick={resetForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="sidebar-card orders-summary-card">
            <h2>Your Order Summary</h2>
            <div className="orders-list">
              {cartItems.length === 0 ? (
                <p className="no-items">
                  Your cart is empty. Click "+Add to Order" on any menu item above or add via the form.
                </p>
              ) : (
                <>
                  <ol className="summary-ol">
                    {cartItems.map((item) => {
                      const itemTotal = item.price * item.quantity;
                      return (
                        <li key={item.id} className="summary-li">
                          <p className="order-item-title">
                            {item.title}
                            <span className="category-tag">{item.category}</span>
                          </p>
                          <div className="order-item-meta">
                            Price:<strong>₹{item.price}</strong>|Qty:<strong>{item.quantity}</strong>|Item Total:<strong>₹{itemTotal}</strong>
                            <br />
                            {item.notes ? <em>Custom Note: {item.notes}</em> : <em>Custom Note: None</em>}
                          </div>
                          <div className="order-item-controls">
                            <div className="item-action-btns">
                              <button className="btn-secondary" onClick={() => handleEditCartItem(item)}>
                                Edit
                              </button>
                              <button className="btn-danger" onClick={() => handleDeleteCartItem(item.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <div className="total-bill-container">
                    <span>Total Bill:</span>
                    <span>₹{totalBill}</span>
                  </div>
                  <button
                    className="btn-primary place-order-btn"
                    onClick={handlePlaceOrderClick}
                    disabled={submitting}
                  >
                    {submitting ? 'Placing Order...' : 'Place Order'}
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      </section>

      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Confirm Order</h3>
            <p>
              Are you sure you want to place this order group amounting to <strong>₹{totalBill}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={confirmPlaceOrder}>
                Yes, Place Order
              </button>
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}