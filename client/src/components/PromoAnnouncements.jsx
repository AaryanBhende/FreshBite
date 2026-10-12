import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PromoAnnouncements({ location }) {
  const { pathname } = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let active = true;
    if (pathname !== '/menu') {
      setAnnouncements([]);
      return () => { active = false; };
    }
    fetch(`/api/promotions/announcements?location=${encodeURIComponent(location)}`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => { if (active) setAnnouncements(items); })
      .catch(() => { if (active) setAnnouncements([]); });
    return () => { active = false; };
  }, [location, pathname]);

  const copyCode = async (id, code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  if (pathname !== '/menu' || !announcements.length) return null;
  const visibleAnnouncements = announcements.filter((item) => !dismissed.includes(item.id));
  if (!visibleAnnouncements.length) return null;

  return (
    <div className={`promo-announcements promo-announcements--${location}`}>
      {visibleAnnouncements.map((item) => {
        const expiry = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : null;
        return (
          <aside className={`promo-announcement ${item.background_image_url ? 'has-background-image' : ''}`} key={item.id}>
            {item.background_image_url && <img className="promo-announcement-image" src={item.background_image_url} alt="" aria-hidden="true" />}
            <div className="promo-announcement-overlay" />
            <div className="promo-announcement-copy">
              <strong className="promo-announcement-title">{item.title}</strong>
              <span className="promo-announcement-message">{item.message}</span>
              {expiry && <span className="promo-announcement-expiry">Ends {expiry}</span>}
            </div>
            <button type="button" className="promo-announcement-code" onClick={() => copyCode(item.id, item.code)} aria-label={`Copy promotion code ${item.code}`}>
              <span>{item.code}</span><small>{copiedId === item.id ? 'Copied' : 'Copy code'}</small>
            </button>
            <button type="button" className="promo-announcement-dismiss" onClick={() => setDismissed((items) => [...items, item.id])} aria-label="Dismiss promotion">×</button>
          </aside>
        );
      })}
    </div>
  );
}
