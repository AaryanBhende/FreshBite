import React, { useState, useEffect, useRef, useContext } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import ProductGrid from '../components/ProductGrid';
import { AuthContext } from '../context/AuthContext';
import AuthModal from './AuthModal';

import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import '../assets/style/menu.css';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const defaultCenter = { lat: 15.268023, lng: 73.967102 };

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      setPosition({ lat, lng });
    }
  });

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 15);
    }
  }, [position, map]);

  return position ? (
    <Marker
      position={[position.lat, position.lng]}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const { lat, lng } = marker.getLatLng();
          setPosition({
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6))
          });
        }
      }}
    />
  ) : null;
}

export default function Menu() {
  const { user } = useContext(AuthContext);

  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('freshbite_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({ id: '', title: '', quantity: 1, notes: '' });
  const [itemMeta, setItemMeta] = useState({ price: 0, category: 'None' });
  const [formFeedback, setFormFeedback] = useState('');

  // Order option & address states
  const [orderType, setOrderType] = useState('Dine In');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');

  // Modal display states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const formRef = useRef(null);

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
  }, []);

  useEffect(() => {
    localStorage.setItem('freshbite_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/menu');
      if (res.ok) setMenuItems(await res.json());
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const searchAddressCoordinates = async (addressQuery) => {
    if (!addressQuery || addressQuery.trim().length < 3) return;
    setIsGeocoding(true);
    setGeocodingError('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addressQuery
        )}`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setDeliveryCoordinates({
          lat: parseFloat(parseFloat(lat).toFixed(6)),
          lng: parseFloat(parseFloat(lon).toFixed(6))
        });
      } else {
        setGeocodingError('Address not found. Please click or drag the pin manually.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setGeocodingError('Could not locate address automatically.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', quantity: 1, notes: '' });
    setItemMeta({ price: 0, category: 'None' });
    setFormFeedback('');
  };

  const filteredMenu = menuItems.filter((item) => {
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const totalBill = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (orderType === 'Delivery' && !deliveryAddress) {
      setShowLocationModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const executeOrderPlacement = async () => {
    setShowConfirmModal(false);
    setIsPlacingOrder(true);

    try {
      const groupOrderId = `group-${Date.now()}`;
      const payload = cart.map((item) => ({
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        order_id: groupOrderId,
        user_id: user ? user.id : 'Guest',
        title: item.title,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        completed: 0,
        order_type: orderType,
        address: orderType === 'Delivery' ? deliveryAddress : null,
        coordinates:
          orderType === 'Delivery'
            ? `${deliveryCoordinates.lat},${deliveryCoordinates.lng}`
            : null
      }));

      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCart([]);
        localStorage.removeItem('freshbite_cart');
        fetchOrders();
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Failed to place order:', err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <main className="menu-main">
      <section className="menu-layout">
        <section className="catalog-section">
          <div className="catalog-top-bar">
            <div className="menu-header">
              <h1>
                Our Seasonal <span>Menu</span>
              </h1>
            </div>
            <div className="controls-wrapper">
              <div className="category-filters">
                {['All', 'Vegetarian', 'Vegan', 'Gluten-Free'].map((cat) => (
                  <button
                    key={cat}
                    className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
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
          <ProductGrid
            items={filteredMenu}
            onSelectDish={(item) => {
              setFormData({ id: '', title: item.title, quantity: 1, notes: '' });
              setItemMeta({ price: Number(item.price), category: item.category });
              formRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </section>

        {/* Sidebar Order Section */}
        <aside className="order-sidebar">
          <div className="sidebar-card" ref={formRef}>
            <h2>{formData.id ? 'Edit Cart Item' : 'Add Custom Dish/Order'}</h2>
            {formFeedback && <div className="feedback-container">{formFeedback}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormFeedback('');
                if (!formData.title) return setFormFeedback('Please select or enter a valid dish name.');
                if (itemMeta.price === 0) return setFormFeedback('Please select a valid dish from the menu.');
                if (formData.quantity < 1) return setFormFeedback('Quantity must be at least 1.');

                if (formData.id) {
                  setCart(
                    cart.map((item) =>
                      item.id === formData.id
                        ? {
                            ...item,
                            title: formData.title,
                            category: itemMeta.category,
                            price: itemMeta.price,
                            quantity: Number(formData.quantity),
                            notes: formData.notes
                          }
                        : item
                    )
                  );
                } else {
                  const newItem = {
                    id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    title: formData.title,
                    category: itemMeta.category,
                    price: itemMeta.price,
                    quantity: Number(formData.quantity),
                    notes: formData.notes,
                    completed: 0
                  };
                  setCart([...cart, newItem]);
                }
                resetForm();
              }}
              noValidate
            >
              <div className="form-group">
                <label htmlFor="itemName">Dish Name*</label>
                <input
                  id="itemName"
                  placeholder="Select or type item name"
                  list="menuOptions"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, title: val });
                    const match = menuItems.find((m) => m.title === val);
                    setItemMeta(
                      match
                        ? { price: Number(match.price), category: match.category }
                        : { price: 0, category: 'None' }
                    );
                  }}
                />
                <datalist id="menuOptions">
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.title} />
                  ))}
                </datalist>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <span className="value">{itemMeta.category}</span>
                </div>
                <div className="form-group flex-1">
                  <label>Price(₹)</label>
                  <span className="value">₹{itemMeta.price}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="itemQuantity">Qty*</label>
                <input
                  id="itemQuantity"
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="itemNotes">Customization Notes</label>
                <textarea
                  id="itemNotes"
                  placeholder="e.g. Extra dressing, no onions..."
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button className="btn-primary" type="submit">
                  {formData.id ? 'Update Cart Item' : 'Add to Order'}
                </button>
                {formData.id && (
                  <button className="btn-secondary" type="button" onClick={resetForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="sidebar-card orders-summary-card">
            <h2>Your Order Summary</h2>

            <div className="form-group order-type-group">
              <label>
                <strong>Order Type:</strong>
              </label>
              <div className="order-type-options">
                {['Dine In', 'Takeout', 'Delivery'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`btn-type ${orderType === type ? 'active' : ''}`}
                    onClick={() => setOrderType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {orderType === 'Delivery' && deliveryAddress && (
                <div className="delivery-address-info">
                  <span className="delivery-address-text">
                    <strong>Deliver to:</strong> {deliveryAddress}
                  </span>
                  <button
                    type="button"
                    className="btn-edit-link"
                    onClick={() => setShowLocationModal(true)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="orders-list">
              {cart.length === 0 ? (
                <p className="no-items">
                  Your cart is empty. Click "+Add to Order" on any menu item above or add via the form.
                </p>
              ) : (
                <>
                  <ol className="summary-ol">
                    {cart.map((item) => (
                      <li key={item.id} className="summary-li">
                        <p className="order-item-title">
                          {item.title}
                          <span className="category-tag">{item.category}</span>
                        </p>
                        <div className="order-item-meta">
                          Price: <strong>₹{item.price}</strong> | Qty: <strong>{item.quantity}</strong> | Item Total: <strong>₹{item.price * item.quantity}</strong>
                          <br />
                          {item.notes ? (
                            <em>Custom Note: {item.notes}</em>
                          ) : (
                            <em>Custom Note: None</em>
                          )}
                        </div>
                        <div className="order-item-controls">
                          <div className="item-action-btns">
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setFormData({
                                  id: item.id,
                                  title: item.title,
                                  quantity: item.quantity,
                                  notes: item.notes || ''
                                });
                                setItemMeta({
                                  price: Number(item.price),
                                  category: item.category || 'None'
                                });
                                formRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => {
                                setCart(cart.filter((c) => c.id !== item.id));
                                if (formData.id === item.id) resetForm();
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="total-bill-container">
                    <span>Total Bill:</span>
                    <span>₹{totalBill}</span>
                  </div>

                  <button
                    className="btn-primary place-order-btn"
                    onClick={handlePlaceOrderClick}
                    disabled={isPlacingOrder}
                  >
                    {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Location Modal */}
      {showLocationModal && (
        <div className="modal-backdrop">
          <div className="modal-content location-modal" style={{ maxWidth: '500px', width: '90%' }}>
            <h3>Delivery Location</h3>
            <div className="form-group" style={{ margin: '15px 0' }}>
              <label htmlFor="addressInput">Street Address / Landmark:</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                <textarea
                  id="addressInput"
                  rows="2"
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="e.g. Margao, Goa"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0 12px', height: 'fit-content', alignSelf: 'center' }}
                  onClick={() => searchAddressCoordinates(deliveryAddress)}
                  disabled={isGeocoding}
                >
                  {isGeocoding ? 'Locating...' : 'Find on Map'}
                </button>
              </div>
              {geocodingError && (
                <span style={{ color: '#d32f2f', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  {geocodingError}
                </span>
              )}
            </div>

            <label style={{ display: 'block', marginBottom: '5px' }}>
              Pinpoint on Map (Click or Drag Marker):
            </label>

            <MapContainer
              center={[deliveryCoordinates.lat, deliveryCoordinates.lng]}
              zoom={13}
              style={{ height: '220px', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker
                position={deliveryCoordinates}
                setPosition={setDeliveryCoordinates}
              />
            </MapContainer>

            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
              Selected Coordinates: {deliveryCoordinates.lat}, {deliveryCoordinates.lng}
            </p>

            <div className="modal-actions" style={{ marginTop: '15px' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!deliveryAddress.trim()) {
                    alert('Please enter a delivery address.');
                    return;
                  }
                  setShowLocationModal(false);
                  setShowConfirmModal(true);
                }}
              >
                Save & Proceed
              </button>
              <button className="btn-secondary" onClick={() => setShowLocationModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Order Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Confirm Order</h3>
            <p>
              Are you sure you want to place this <strong>{orderType}</strong> order amounting to{' '}
              <strong>₹{totalBill}</strong>?
            </p>
            {orderType === 'Delivery' && (
              <p style={{ fontSize: '0.9rem', color: '#555' }}>
                <strong>Address:</strong> {deliveryAddress}
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-primary" onClick={executeOrderPlacement}>
                Yes, Place Order
              </button>
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#2e7d32', marginBottom: '10px' }}>Order Placed!</h3>
            <p>Your order has been placed successfully and is being prepared.</p>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '15px' }}>
              <button className="btn-primary" onClick={() => setShowSuccessModal(false)}>
                Great!
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}