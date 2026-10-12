import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useContext } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import ProductGrid from '../components/ProductGrid';
import { AuthContext } from '../context/AuthContext';
import AuthModal from './AuthModal';
import PromoAnnouncements from '../components/PromoAnnouncements';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import '../assets/style/menu.css';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const defaultCenter = { lat: 15.268023, lng: 73.967102 };

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      setPosition({ lat, lng });
    },
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
            lng: parseFloat(lng.toFixed(6)),
          });
        },
      }}
    />
  ) : null;
}

export default function Menu() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('freshbite_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedCategories, setSelectedCategories] = useState(['All']);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ id: '', title: '', quantity: 1, notes: '' });
  const [itemMeta, setItemMeta] = useState({ price: 0, category: 'None' });
  const [formFeedback, setFormFeedback] = useState('');
  const [orderType, setOrderType] = useState('Dine In');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [promotionCode, setPromotionCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [promotionMessage, setPromotionMessage] = useState('');
  const [rushStatus, setRushStatus] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [duplicateDish, setDuplicateDish] = useState('');
  const formRef = useRef(null);
  const summaryRef = useRef(null);

  const [picks, setPicks] = useState([]);
  const [picksOpen, setPicksOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [activePickId, setActivePickId] = useState(null);
  const totalPicks = picks.reduce((sum, p) => sum + p.count, 0);

  const findCartDuplicate = (title, exceptId = null) => cart.find((item) =>
    item.id !== exceptId && item.title.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase()
  );

  const addToPicks = (item) => {
    if (findCartDuplicate(item.title)) {
      setDuplicateDish(item.title);
      return;
    }
    setPicks((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) {
        return prev.map((p) => (p.id === item.id ? { ...p, count: p.count + 1 } : p));
      }
      return [
        ...prev,
        {
          id: item.id,
          title: item.title,
          price: Number(item.price),
          category: item.category,
          count: 1,
        },
      ];
    });
    setBump((b) => b + 1);
  };

  const addRecommendedItem = (item) => {
    const alreadyInOrder = findCartDuplicate(item.title);
    addToPicks(item);
    if (!alreadyInOrder) openPicks();
  };

  const removePick = (id) => {
    const next = picks.filter((p) => p.id !== id);
    setPicks(next);
    if (activePickId === id) setActivePickId(null);
    if (next.length === 0) setPicksOpen(false);
  };

  const selectPick = (pick) => {
    setFormData({ id: '', title: pick.title, quantity: pick.count, notes: '' });
    setItemMeta({ price: pick.price, category: pick.category || 'None' });
    setFormFeedback('');
    setActivePickId(pick.id);
  };

  const openPicks = () => {
    setPicksOpen(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!user || !token) { setRecommendations(null); return; }
    fetch('/api/users/recommendations', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setRecommendations)
      .catch(() => setRecommendations(null));
  }, [user, token]);

  useEffect(() => {
    localStorage.setItem('freshbite_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const id = location.state?.scrollToId;
    if (!id || menuItems.length === 0) return;

    setSelectedCategories(['All']);
    setSearchQuery('');

    const t = setTimeout(() => {
      const el = document.getElementById(`dish-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash-highlight');
        setTimeout(() => el.classList.remove('flash-highlight'), 2500);
      }
      navigate(location.pathname, { replace: true, state: null });
    }, 150);

    return () => clearTimeout(t);
  }, [location.state, menuItems]);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) setMenuItems(await res.json());
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setDeliveryCoordinates({
          lat: parseFloat(parseFloat(lat).toFixed(6)),
          lng: parseFloat(parseFloat(lon).toFixed(6)),
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
    setActivePickId(null);
  };

  const handleCategoryToggle = (category) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
      return;
    }
    let updated = selectedCategories.filter((cat) => cat !== 'All');
    if (updated.includes(category)) {
      updated = updated.filter((cat) => cat !== category);
    } else {
      if (category === 'Vegetarian') {
        updated = updated.filter((cat) => cat !== 'Non-Veg' && cat !== 'Vegan');
      } else if (category === 'Vegan') {
        updated = updated.filter((cat) => cat !== 'Vegetarian' && cat !== 'Non-Veg');
      } else if (category === 'Non-Veg') {
        updated = updated.filter((cat) => cat !== 'Vegetarian' && cat !== 'Vegan');
      }
      updated.push(category);
    }
    setSelectedCategories(updated.length === 0 ? ['All'] : updated);
  };

  const filteredMenu = menuItems.filter((item) => {
    const itemTags = item.category ? item.category.split(',').map((c) => c.trim()) : [];
    const matchCategory =
      selectedCategories.includes('All') ||
      selectedCategories.every((selected) => itemTags.includes(selected));
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const totalBill = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    setPromotion(null);
    setPromotionMessage('');
  }, [totalBill]);

  useEffect(() => {
    const loadRush = async () => {
      try {
        const response = await fetch('/api/rush');
        if (response.ok) setRushStatus(await response.json());
      } catch (error) { console.error('Failed to load rush status:', error); }
    };
    loadRush();
    const timer = setInterval(loadRush, 60000);
    return () => clearInterval(timer);
  }, []);

  const applyPromotion = async () => {
    setPromotionMessage('');
    setPromotion(null);
    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promo_code: promotionCode, cart_total: totalBill, user_id: user?.id || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not validate code.');
      setPromotion(result);
      setPromotionMessage(`Code applied. You save ₹${result.discount.toFixed(2)}.`);
    } catch (error) { setPromotionMessage(error.message); }
  };

  const handlePlaceOrderClick = async () => {
    if (cart.length === 0) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (promotionCode.trim()) {
      try {
        const response = await fetch('/api/promotions/validate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promo_code: promotionCode, cart_total: totalBill, user_id: user.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not validate promotion.');
        setPromotion(result);
        setPromotionMessage(`Code applied. You save ₹${result.discount_amount.toFixed(2)}.`);
      } catch (error) {
        setPromotion(null);
        setPromotionMessage(error.message);
        return;
      }
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
            : null,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload, promo_code: promotion?.code || '' }),
      });
      if (res.ok) {
        setPromotion(null);
        setPromotionCode('');
        setCart([]);
        localStorage.removeItem('freshbite_cart');
        setLastOrderId(groupOrderId);
        fetchOrders();
        setShowSuccessModal(true);
      } else {
        const result = await res.json();
        alert(result.error || 'Order could not be placed. Please try again.');
      }
    } catch (err) {
      console.error('Failed to place order:', err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormFeedback('');
    if (!formData.title) return setFormFeedback('Please select or enter a valid dish name.');
    if (itemMeta.price === 0) return setFormFeedback('Please select a valid dish from the menu.');
    if (formData.quantity < 1) return setFormFeedback('Quantity must be at least 1.');
    if (findCartDuplicate(formData.title, formData.id || null)) {
      setDuplicateDish(formData.title);
      return;
    }

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
                notes: formData.notes,
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
        completed: 0,
      };
      setCart([...cart, newItem]);
      if (activePickId) {
        const remaining = picks.filter((p) => p.id !== activePickId);
        setPicks(remaining);
        if (remaining.length === 0) setPicksOpen(false);
      }
    }
    resetForm();
  };

  return (
    <main className="menu-main">
      {rushStatus && <p className="rush-status" role="status">Restaurant is {rushStatus.level} · estimated wait {rushStatus.wait}</p>}
      <PromoAnnouncements location="hero_section" />
      {recommendations?.items?.length > 0 && (
        <section className="catalog-section recommendations-section">
          <div className="recommendations-heading">
            <h2>Recommended Items</h2>
            <p>{recommendations.basis}</p>
          </div>
          <ProductGrid
            items={recommendations.items}
            onSelectDish={addRecommendedItem}
            onReviewSubmitted={fetchMenuItems}
          />
        </section>
      )}
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
                {['All', 'Vegetarian', 'Non-Veg', 'Vegan', 'Gluten-Free'].map((cat) => {
                  const isActive = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      className={`filter-btn ${isActive ? 'active' : ''}`}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                    >
                      {cat}
                    </button>
                  );
                })}
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
            onSelectDish={addToPicks}
            onReviewSubmitted={fetchMenuItems}
          />
        </section>

        <aside className="order-sidebar">
          <div className="sidebar-card" ref={formRef}>
            <h2>{formData.id ? 'Edit Cart Item' : 'Add Custom Dish/Order'}</h2>

            {picks.length > 0 && (
              <div className={`picks-panel ${picksOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="picks-toggle"
                  aria-expanded={picksOpen}
                  onClick={() => setPicksOpen((o) => !o)}
                >
                  <span>
                    Selected Items<span className="picks-count">{totalPicks}</span>
                  </span>
                  <span className="picks-chevron">▾</span>
                </button>
                <div className="picks-body">
                  <div className="picks-body-inner">
                    <ul className="picks-list">
                      {picks.map((p) => (
                        <li
                          key={p.id}
                          className={`pick-item ${activePickId === p.id ? 'active' : ''}`}
                        >
                          <button
                            type="button"
                            className="pick-select"
                            onClick={() => selectPick(p)}
                          >
                            <span className="pick-title">{p.title}</span>
                            <span className="pick-meta">
                              ₹{p.price} × {p.count}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="pick-remove"
                            aria-label={`Remove ${p.title}`}
                            onClick={() => removePick(p.id)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="picks-hint">Tap an item to load it into the form below.</p>
                  </div>
                </div>
              </div>
            )}

            {formFeedback && <div className="feedback-container">{formFeedback}</div>}

            <form onSubmit={handleFormSubmit} noValidate>
              <div className="form-group">
                <label>Dish Name</label>
                <span className={`value dish-name-display ${formData.title ? '' : 'empty'}`}>
                  {formData.title || 'No dish selected'}
                </span>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <span className="value category-value">{itemMeta.category}</span>
                </div>
                <div className="form-group flex-1">
                  <label>Price (₹)</label>
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

          <div className="sidebar-card orders-summary-card" ref={summaryRef}>
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
                  Your cart is empty. Click "+Add to Order" on any menu item above or add via the
                  form.
                </p>
              ) : (
                <>
                  <ol className="summary-ol">
                    {cart.map((item) => (
                      <li id={`summary-${item.id}`} key={item.id} className="summary-li">
                        <div className="order-item-header">
                          <p className="order-item-title">{item.title}</p>
                          <span className="category-tag">{item.category}</span>
                        </div>
                        <div className="order-item-meta">
                          Price: <strong>₹{item.price}</strong> | Qty:{' '}
                          <strong>{item.quantity}</strong> | Item Total:{' '}
                          <strong>₹{item.price * item.quantity}</strong>
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
                                  notes: item.notes || '',
                                });
                                setItemMeta({
                                  price: Number(item.price),
                                  category: item.category || 'None',
                                });
                                setActivePickId(null);
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
                  <div className="promotion-checkout">
                    <label htmlFor="promotionCode">Promotion code</label>
                    <div className="promotion-input-row">
                      <input id="promotionCode" value={promotionCode} onChange={(event) => { setPromotionCode(event.target.value); setPromotion(null); }} placeholder="Enter code" />
                      <button type="button" className="btn-secondary" onClick={applyPromotion} disabled={!promotionCode.trim()}>Apply</button>
                    </div>
                    {promotionMessage && <p role="status">{promotionMessage}</p>}
                    {promotion && <p>Discount: ₹{promotion.discount.toFixed(2)}</p>}
                  </div>
                  {promotion && <p className="promotion-total">Total after discount: ₹{promotion.total.toFixed(2)}</p>}
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

      {picks.length > 0 && (
        <button
          type="button"
          className="picks-bubble"
          aria-label={`${totalPicks} selected items. View selection`}
          onClick={openPicks}
        >
          <span aria-hidden="true">🍽️</span>
          <span key={bump} className="picks-badge">
            {totalPicks}
          </span>
        </button>
      )}

      {duplicateDish && (
        <div className="modal-backdrop" onClick={() => setDuplicateDish('')}>
          <div className="modal-content duplicate-dish-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-dish-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="duplicate-dish-title">Dish already in your order</h3>
            <p>This dish is already added to your order. Edit the quantity if needed.</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => {
                const existing = findCartDuplicate(duplicateDish);
                setDuplicateDish('');
                (existing && document.getElementById(`summary-${existing.id}`) || summaryRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}>Go to Order Summary</button>
              <button className="btn-secondary" onClick={() => setDuplicateDish('')}>Close</button>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {showLocationModal && (
        <div className="modal-backdrop">
          <div className="modal-content location-modal">
            <h3>Delivery Location</h3>

            <div className="form-group location-address-group">
              <label htmlFor="addressInput">Street Address/Landmark:</label>
              <div className="address-input-row">
                <textarea
                  id="addressInput"
                  rows="2"
                  className="address-input"
                  placeholder="e.g. Margao, Goa"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary btn-find-map"
                  onClick={() => searchAddressCoordinates(deliveryAddress)}
                  disabled={isGeocoding}
                >
                  {isGeocoding ? 'Locating...' : 'Find on Map'}
                </button>
              </div>
              {geocodingError && <span className="geocoding-error">{geocodingError}</span>}
            </div>

            <label className="map-label">Pinpoint on Map (Click or Drag Marker):</label>
            <MapContainer
              className="location-map"
              center={[deliveryCoordinates.lat, deliveryCoordinates.lng]}
              zoom={13}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={deliveryCoordinates} setPosition={setDeliveryCoordinates} />
            </MapContainer>
            <p className="map-coords">
              Selected Coordinates: {deliveryCoordinates.lat}, {deliveryCoordinates.lng}
            </p>

            <div className="modal-actions">
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
                Save &amp; Proceed
              </button>
              <button className="btn-secondary" onClick={() => setShowLocationModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Confirm Order</h3>
            <p>
              Are you sure you want to place this <strong>{orderType}</strong> order amounting to{' '}
              <strong>₹{promotion?.total ?? totalBill}</strong>?
            </p>
            {orderType === 'Delivery' && (
              <p className="confirm-address">
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

      {showSuccessModal && (
        <div className="modal-backdrop">
          <div className="modal-content success-modal">
            <h3>Order Placed! 🎉</h3>
            <p>Your order has been placed successfully and is being prepared.</p>
            <div className="modal-actions">
              {lastOrderId && (
                <Link
                  className="btn-primary"
                  to={`/track/${lastOrderId}`}
                  onClick={() => setShowSuccessModal(false)}
                >
                  📍 Track My Order
                </Link>
              )}
              <button className="btn-secondary" onClick={() => setShowSuccessModal(false)}>
                Continue Ordering
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
