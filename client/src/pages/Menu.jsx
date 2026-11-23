import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useContext } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import ProductGrid from '../components/ProductGrid';
import { AuthContext } from '../context/AuthContext';
import AuthModal from './AuthModal';
import PromoAnnouncements from '../components/PromoAnnouncements';
import ReservationFloorMap from '../components/ReservationFloorMap';
import { formatReservationSlot, RESERVATION_TIME_SLOTS } from '../utils/reservationSlots';
import '../assets/style/menu.css';

const defaultCenter = { lat: 15.268023, lng: 73.967102 };
const miramarLocation = { lat: 15.4800, lng: 73.8080 };
const toRadians = (degrees) => degrees * Math.PI / 180;

function getDeliveryDistanceKm(destination) {
  const deltaLat = toRadians(destination.lat - miramarLocation.lat);
  const deltaLng = toRadians(destination.lng - miramarLocation.lng);
  const rawA = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(miramarLocation.lat)) * Math.cos(toRadians(destination.lat)) * Math.sin(deltaLng / 2) ** 2;
  const a = Math.min(1, Math.max(0, rawA));
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const getDefaultReservationDate = () => {
  const date = new Date();
  if (date.getHours() > 21 || (date.getHours() === 21 && date.getMinutes() > 0)) date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDefaultReservationSlot = () => {
  const now = new Date();
  const nextHour = now.getHours() + (now.getMinutes() > 0 ? 1 : 0);
  return RESERVATION_TIME_SLOTS.find((slot) => slot >= `${String(nextHour).padStart(2, '0')}:00`) || RESERVATION_TIME_SLOTS[0];
};

export default function Menu() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

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
  const [tipPercent, setTipPercent] = useState(0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuestCheckoutChoice, setShowGuestCheckoutChoice] = useState(false);
  const [guestDineInCheckout, setGuestDineInCheckout] = useState(false);
  const [resumeOrderAfterAuth, setResumeOrderAfterAuth] = useState(false);
  const [showDineSeatingModal, setShowDineSeatingModal] = useState(false);
  const [showDineReservationModal, setShowDineReservationModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [promotionCode, setPromotionCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [promotionMessage, setPromotionMessage] = useState('');
  const [rushStatus, setRushStatus] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [duplicateDish, setDuplicateDish] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [seatingTables, setSeatingTables] = useState([]);
  const [dineInTable, setDineInTable] = useState(null);
  const [dineInMode, setDineInMode] = useState('');
  const [seatedTableId, setSeatedTableId] = useState('');
  const [reservationDate, setReservationDate] = useState(getDefaultReservationDate);
  const [reservationSlot, setReservationSlot] = useState(getDefaultReservationSlot);
  const [reservationGuests, setReservationGuests] = useState(1);
  const [guestReservationName, setGuestReservationName] = useState('');
  const [guestReservationEmail, setGuestReservationEmail] = useState('');
  const [selectedReservationTable, setSelectedReservationTable] = useState(null);
  const [loadingDineTables, setLoadingDineTables] = useState(false);
  const [dineInFeedback, setDineInFeedback] = useState('');
  const formRef = useRef(null);
  const summaryRef = useRef(null);
  const recScrollRef = useRef(null);
  const resumeAfterAuthRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
          menu_item_id: item.id,
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

  const syncRecScrollBtns = () => {
    const el = recScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollRecsBy = (direction) => {
    const el = recScrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.catalog-card')?.offsetWidth || 280;
    el.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
  };

  useEffect(() => {
    const el = recScrollRef.current;
    if (!el) return undefined;
    syncRecScrollBtns();
    el.addEventListener('scroll', syncRecScrollBtns);
    window.addEventListener('resize', syncRecScrollBtns);
    return () => {
      el.removeEventListener('scroll', syncRecScrollBtns);
      window.removeEventListener('resize', syncRecScrollBtns);
    };
  }, [recommendations]);

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
  }, []);

  useEffect(() => {
    const refreshAvailability = setInterval(fetchMenuItems, 10000);
    return () => clearInterval(refreshAvailability);
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
      if (res.ok) {
        const latestItems = await res.json();
        setMenuItems(latestItems);
        const availabilityById = new Map(latestItems.map((item) => [item.id, item.is_available]));
        setRecommendations((current) => current ? {
          ...current,
          items: (current.items || []).map((item) => availabilityById.has(item.id)
            ? { ...item, is_available: availabilityById.get(item.id) }
            : item),
        } : current);
      }
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
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
  const deliveryDistanceKm = getDeliveryDistanceKm(deliveryCoordinates);
  const deliveryFee = orderType === 'Delivery'
    ? Number((30 + Math.max(0, deliveryDistanceKm - 3) * 5).toFixed(2)) : 0;
  const tipAmount = orderType === 'Delivery' ? Number((totalBill * tipPercent / 100).toFixed(2)) : 0;
  const discountedFoodTotal = promotion?.total ?? totalBill;
  const payableTotal = Number((discountedFoodTotal + deliveryFee + tipAmount).toFixed(2));

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

  useEffect(() => {
    if (!showDineSeatingModal) return undefined;
    let cancelled = false;
    setLoadingDineTables(true);
    fetch('/api/tables')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load tables.');
        if (!cancelled) setSeatingTables(data.tables || []);
      })
      .catch((error) => { if (!cancelled) setDineInFeedback(error.message); })
      .finally(() => { if (!cancelled) setLoadingDineTables(false); });
    return () => { cancelled = true; };
  }, [showDineSeatingModal]);

  useEffect(() => {
    if (!showDineReservationModal || !reservationDate || !reservationSlot) return undefined;
    let cancelled = false;
    let firstLoad = true;
    setLoadingDineTables(true);
    const loadTables = async () => {
      try {
        const query = new URLSearchParams({ date: reservationDate, time_slot: reservationSlot });
        const response = await fetch(`/api/tables/availability?${query}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load table availability.');
        if (!cancelled) {
          const tables = data.tables || [];
          setAvailableTables(tables);
          setSelectedReservationTable((current) => current && tables.some((table) => table.id === current.id && table.table_status === 'Free') ? current : null);
        }
      } catch (error) {
        if (!cancelled) setDineInFeedback(error.message);
      } finally {
        if (!cancelled && firstLoad) setLoadingDineTables(false);
        firstLoad = false;
      }
    };
    loadTables();
    const timer = setInterval(loadTables, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [showDineReservationModal, reservationDate, reservationSlot]);

  const handleOrderTypeChange = (type) => {
    setOrderType(type);
    if (type === 'Dine In') {
      setDineInFeedback('');
      setShowDineSeatingModal(true);
    } else {
      setGuestDineInCheckout(false);
      setDineInMode('');
      setDineInTable(null);
      setSelectedReservationTable(null);
    }
  };

  const handlePlaceOrderClick = async ({ asGuest = false } = {}) => {
    if (cart.length === 0) return;
    if ((!user || !token) && orderType === 'Dine In' && !asGuest && !guestDineInCheckout) {
      setShowGuestCheckoutChoice(true);
      return;
    }
    if ((!user || !token) && orderType !== 'Dine In') {
      setShowAuthModal(true);
      return;
    }
    if (orderType === 'Dine In' && !dineInTable) {
      setDineInFeedback('');
      setShowDineSeatingModal(true);
      return;
    }
    if (promotionCode.trim()) {
      try {
        const response = await fetch('/api/promotions/validate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promo_code: promotionCode, cart_total: totalBill, user_id: user?.id || null }),
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

  useEffect(() => {
    if (!resumeOrderAfterAuth || !user || !token) return;
    setResumeOrderAfterAuth(false);
    handlePlaceOrderClick();
  }, [resumeOrderAfterAuth, user, token]);

  const executeOrderPlacement = async () => {
    setShowConfirmModal(false);
    setIsPlacingOrder(true);
    let reservationId = null;
    try {
      if (orderType === 'Dine In' && dineInMode === 'reserve') {
        const guestName = user?.name || guestReservationName.trim();
        const guestEmail = user?.email || guestReservationEmail.trim();
        if (!guestName || !guestEmail) throw new Error('Enter your name and email to reserve a table as a guest.');
        const reservationResponse = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(user && token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            guest_name: guestName,
            guest_email: guestEmail,
            reservation_date: reservationDate,
            time_slot: reservationSlot,
            party_size: reservationGuests,
            special_requests: 'Dine-in order',
            table_id: dineInTable.id,
          }),
        });
        const reservationResult = await reservationResponse.json();
        if (!reservationResponse.ok) throw new Error(reservationResult.error || 'Could not reserve the selected table.');
        reservationId = reservationResult.reservation.id;
      }

      const groupOrderId = `group-${Date.now()}`;
      const payload = cart.map((item) => ({
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        order_id: groupOrderId,
        title: item.title,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        menu_item_id: item.menu_item_id || null,
        completed: 0,
        order_type: orderType,
        address: orderType === 'Delivery' ? deliveryAddress : null,
        coordinates:
          orderType === 'Delivery'
            ? `${deliveryCoordinates.lat},${deliveryCoordinates.lng}`
            : null,
        table_id: orderType === 'Dine In' ? dineInTable?.id || null : null,
        table_number: orderType === 'Dine In' ? dineInTable?.table_number || null : null,
        table_zone: orderType === 'Dine In' ? dineInTable?.zone || null : null,
        party_size: orderType === 'Dine In' && dineInMode === 'reserve' ? Number(reservationGuests) : null,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user && token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ items: payload, promo_code: promotion?.code || '',
          delivery_fee: deliveryFee, tip_percent: orderType === 'Delivery' ? tipPercent : 0,
          tip_amount: orderType === 'Delivery' ? tipAmount : 0 }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Order could not be placed. Please try again.');
      setPromotion(null);
      setPromotionCode('');
      setTipPercent(0);
      setCart([]);
      setDineInMode('');
      setDineInTable(null);
      setSelectedReservationTable(null);
      setGuestDineInCheckout(false);
      localStorage.removeItem('freshbite_cart');
      setLastOrderId(groupOrderId);
      fetchOrders();
      setShowSuccessModal(true);
    } catch (err) {
      if (reservationId && user && token) {
        try {
          await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/cancel`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch { /* Preserve the order error; reservation cancellation can be handled from the profile. */ }
      }
      alert(err.message || 'Order could not be placed. Please try again.');
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
        menu_item_id: activePickId || null,
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
          <div className="recommendations-scroll-wrapper">
            <button
              type="button"
              className={`rec-nav-btn rec-nav-btn--left${!canScrollLeft ? ' rec-nav-btn--hidden' : ''}`}
              aria-label="Scroll recommendations left"
              disabled={!canScrollLeft}
              onClick={() => scrollRecsBy(-1)}
            >
              ‹
            </button>
            <div className="rec-scroll-viewport">
              <ProductGrid
                items={recommendations.items}
                onSelectDish={addRecommendedItem}
                onReviewSubmitted={fetchMenuItems}
                horizontal
                gridRef={recScrollRef}
              />
            </div>
            <button
              type="button"
              className={`rec-nav-btn rec-nav-btn--right${!canScrollRight ? ' rec-nav-btn--hidden' : ''}`}
              aria-label="Scroll recommendations right"
              disabled={!canScrollRight}
              onClick={() => scrollRecsBy(1)}
            >
              ›
            </button>
          </div>
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
                    onClick={() => handleOrderTypeChange(type)}
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
                    <span>Food Subtotal:</span>
                    <span>₹{totalBill.toFixed(2)}</span>
                  </div>
                  {orderType === 'Delivery' && <>
                    <div className="delivery-charge-row"><span>Delivery distance</span><strong>{deliveryDistanceKm.toFixed(1)} km</strong></div>
                    <div className="delivery-charge-row"><span>Delivery fee</span><strong>₹{deliveryFee.toFixed(2)}</strong></div>
                    <fieldset className="delivery-tip-options">
                      <legend>Tip your delivery driver</legend>
                      <p>Your full tip goes to your driver.</p>
                      <div>{[0, 10, 20].map(percent => <label key={percent} className={tipPercent === percent ? 'selected' : ''}>
                        <input type="radio" name="delivery-tip" value={percent} checked={tipPercent === percent} onChange={() => setTipPercent(percent)} />
                        <span>{percent === 0 ? 'None' : `${percent}%`}</span>
                        {percent > 0 && <small>₹{(totalBill * percent / 100).toFixed(2)}</small>}
                      </label>)}</div>
                    </fieldset>
                  </>}
                  <div className="promotion-checkout">
                    <label htmlFor="promotionCode">Promotion code</label>
                    <div className="promotion-input-row">
                      <input id="promotionCode" value={promotionCode} onChange={(event) => { setPromotionCode(event.target.value); setPromotion(null); }} placeholder="Enter code" />
                      <button type="button" className="btn-secondary" onClick={applyPromotion} disabled={!promotionCode.trim()}>Apply</button>
                    </div>
                    {promotionMessage && !promotion && (
                      <p className="promotion-feedback error" role="status">{promotionMessage}</p>
                    )}
                    {promotion && (
                      <div className="promotion-summary-card" role="status">
                        <p className="promotion-feedback success">{promotionMessage}</p>
                        <p className="promotion-discount">
                          <span>Discount</span><strong>−₹{promotion.discount.toFixed(2)}</strong>
                        </p>
                        <p className="promotion-total">
                          <span>Total after discount</span><strong>₹{promotion.total.toFixed(2)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="checkout-charge-summary" aria-live="polite">
                    <p><span>Food total{promotion ? ' after discount' : ''}</span><strong>₹{discountedFoodTotal.toFixed(2)}</strong></p>
                    {orderType === 'Delivery' && <>
                      <p><span>Delivery fee</span><strong>₹{deliveryFee.toFixed(2)}</strong></p>
                      <p><span>Driver tip</span><strong>₹{tipAmount.toFixed(2)}</strong></p>
                    </>}
                    <p className="checkout-charge-total"><span>Total</span><strong>₹{payableTotal.toFixed(2)}</strong></p>
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); resumeAfterAuthRef.current = false; }}
        onAuthenticated={() => {
          setShowAuthModal(false);
          if (resumeAfterAuthRef.current) setResumeOrderAfterAuth(true);
          resumeAfterAuthRef.current = false;
        }}
      />

      {showGuestCheckoutChoice && (
        <div className="modal-backdrop guest-checkout-backdrop" onClick={() => setShowGuestCheckoutChoice(false)}>
          <div className="modal-content guest-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="guest-checkout-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="guest-checkout-title">How would you like to continue?</h3>
            <p>You can place this dine-in order as a guest or sign in to your account.</p>
            <div className="modal-actions guest-checkout-actions">
              <button type="button" className="btn-primary" onClick={() => { setGuestDineInCheckout(true); setShowGuestCheckoutChoice(false); handlePlaceOrderClick({ asGuest: true }); }}>Continue as Guest</button>
              <button type="button" className="btn-secondary" onClick={() => { resumeAfterAuthRef.current = true; setShowGuestCheckoutChoice(false); setShowAuthModal(true); }}>Log In / Sign Up</button>
            </div>
          </div>
        </div>
      )}

      {showDineSeatingModal && (
        <div className="modal-backdrop dine-seating-backdrop">
          <div className="modal-content dine-seating-modal" role="dialog" aria-modal="true" aria-labelledby="dine-seating-title">
            <h3 id="dine-seating-title">Are you already seated at a table or do you need to reserve one?</h3>
            <div className="dine-seating-choice">
              <label htmlFor="seated-table-select">I’m already seated / have a table</label>
              <select
                id="seated-table-select"
                value={seatedTableId}
                onChange={(event) => setSeatedTableId(event.target.value)}
                disabled={loadingDineTables}
              >
                <option value="">{loadingDineTables ? 'Loading tables…' : 'Select your current table'}</option>
                {seatingTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.zone === 'Bar' ? `Bar ${table.table_number}` : `Table ${table.table_number}`} · {table.zone}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary"
                disabled={!seatedTableId || loadingDineTables}
                onClick={() => {
                  const table = seatingTables.find((item) => String(item.id) === seatedTableId);
                  if (!table) return;
                  setDineInTable(table);
                  setDineInMode('seated');
                  setShowDineSeatingModal(false);
                  setDineInFeedback('');
                  if (guestDineInCheckout) setShowConfirmModal(true);
                }}
              >
                Use this table
              </button>
            </div>
            <div className="dine-seating-divider"><span>or</span></div>
            <button
              type="button"
              className="btn-secondary dine-reserve-choice"
              onClick={() => {
                setDineInFeedback('');
                setSelectedReservationTable(null);
                setShowDineSeatingModal(false);
                setShowDineReservationModal(true);
              }}
            >
              I need to reserve a table
            </button>
            {dineInFeedback && <p className="dine-seating-feedback" role="alert">{dineInFeedback}</p>}
            <button type="button" className="dine-seating-close" onClick={() => setShowDineSeatingModal(false)}>Close</button>
          </div>
        </div>
      )}

      {showDineReservationModal && (
        <div className="modal-backdrop dine-map-backdrop">
          <div className="modal-content dine-map-modal" role="dialog" aria-modal="true" aria-labelledby="dine-map-title">
            <h3 id="dine-map-title">Reserve a table for your dine-in order</h3>
            <div className="dine-reservation-fields">
              {!user && <>
                <label>
                  Your name
                  <input type="text" value={guestReservationName} onChange={(event) => setGuestReservationName(event.target.value)} autoComplete="name" required />
                </label>
                <label>
                  Your email
                  <input type="email" value={guestReservationEmail} onChange={(event) => setGuestReservationEmail(event.target.value)} autoComplete="email" required />
                </label>
              </>}
              <label>
                Reservation date
                <input
                  type="date"
                  min={(() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; })()}
                  value={reservationDate}
                  onChange={(event) => { setReservationDate(event.target.value); setSelectedReservationTable(null); }}
                />
              </label>
              <label>
                One-hour time slot
                <select value={reservationSlot} onChange={(event) => { setReservationSlot(event.target.value); setSelectedReservationTable(null); }}>
                  {RESERVATION_TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{formatReservationSlot(slot)}</option>)}
                </select>
              </label>
              {selectedReservationTable && (
                <label>
                  Guests (maximum {selectedReservationTable.capacity})
                  <input
                    type="number"
                    min="1"
                    max={selectedReservationTable.capacity}
                    value={reservationGuests}
                    onChange={(event) => setReservationGuests(event.target.value === '' ? '' : Math.min(Number(event.target.value), selectedReservationTable.capacity))}
                  />
                </label>
              )}
            </div>
            {loadingDineTables ? <p role="status">Loading table availability…</p> : (
              <ReservationFloorMap
                tables={availableTables}
                selectedId={selectedReservationTable?.id}
                onSelect={(table) => { setSelectedReservationTable(table); setReservationGuests(1); }}
              />
            )}
            {dineInFeedback && <p className="dine-seating-feedback" role="alert">{dineInFeedback}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!selectedReservationTable || !reservationGuests || reservationGuests < 1 || reservationGuests > (selectedReservationTable?.capacity || 0) || loadingDineTables}
                onClick={() => {
                  if (!user && (!guestReservationName.trim() || !guestReservationEmail.trim())) {
                    setDineInFeedback('Enter your name and email to reserve a table as a guest.');
                    return;
                  }
                  setDineInTable(selectedReservationTable);
                  setDineInMode('reserve');
                  setShowDineReservationModal(false);
                  setShowConfirmModal(true);
                }}
              >
                Continue with this table
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowDineReservationModal(false); setShowDineSeatingModal(true); }}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

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
            {googleMapsError ? (
              <p className="map-load-error">Google Maps could not be loaded.</p>
            ) : isGoogleMapsLoaded ? (
              <GoogleMap
                mapContainerClassName="location-map"
                center={deliveryCoordinates}
                zoom={13}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                onClick={(event) => {
                  if (!event.latLng) return;
                  setDeliveryCoordinates({ lat: Number(event.latLng.lat().toFixed(6)), lng: Number(event.latLng.lng().toFixed(6)) });
                }}
              >
                <Marker
                  position={deliveryCoordinates}
                  draggable
                  onDragEnd={(event) => {
                    if (!event.latLng) return;
                    setDeliveryCoordinates({ lat: Number(event.latLng.lat().toFixed(6)), lng: Number(event.latLng.lng().toFixed(6)) });
                  }}
                />
              </GoogleMap>
            ) : <div className="location-map map-loading" role="status">Loading map…</div>}
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
              <strong>₹{payableTotal.toFixed(2)}</strong>?
            </p>
            {orderType === 'Delivery' && (
              <div className="confirm-address">
                <p><strong>Address:</strong> {deliveryAddress}</p>
                <p><strong>Delivery fee:</strong> ₹{deliveryFee.toFixed(2)} · <strong>Driver tip:</strong> ₹{tipAmount.toFixed(2)}</p>
              </div>
            )}
            {orderType === 'Dine In' && dineInTable && (
              <p className="confirm-address">
                <strong>Table:</strong> {dineInTable.zone === 'Bar' ? `Bar ${dineInTable.table_number}` : `Table ${dineInTable.table_number}`} · {dineInTable.zone}
                {dineInMode === 'reserve' && <> · {reservationGuests} guest{Number(reservationGuests) === 1 ? '' : 's'} · {reservationDate} · {formatReservationSlot(reservationSlot)}</>}
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
