import React, { useEffect, useRef } from 'react';

function ValueCard({ imageSrc, fallbackSrc, title, text }) {
  return (
    <div className="value-card">
      <img
        className="value-card-img"
        src={imageSrc}
        alt={title}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = fallbackSrc;
        }}
      />
      <div className="value-card-overlay">
        <h3 className="value-card-title">{title}</h3>
        <p className="value-card-text">{text}</p>
      </div>
    </div>
  );
}

export default function About({ storyOnly = false }) {
  const storyRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slide-in');
          }
        });
      },
      { threshold: 0.2 }
    );

    if (storyRef.current) {
      observer.observe(storyRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <main className={`about-page${storyOnly ? ' about-page--story-only' : ''}`}>
      <section className="Our-Story" id="our-story" ref={storyRef}>
        <figure className="story-image-container">
          <img alt="Interior of Fresh Bite Cafe" src="/assets/images/Fresh-Bite-Interior.jpg" />
        </figure>
        <article>
          <h2>Our Story</h2>
          <p>
            At FreshBite, we believe that healthy food should be delicious and accessible. Since
            our opening, we have been dedicated to serving vibrant dishes that energize and inspire.
          </p>
          <p>
            Every ingredient is chosen with care, partnering with local farmers to bring the
            freshest flavors directly to your table in the heart of the city.
          </p>
        </article>
      </section>

      {!storyOnly && (
        <React.Fragment>
          <section className="about-values">
            <h2>Driven by Freshness, Powered by Quality</h2>
            <p className="about-values-desc">
              We don't just cook food; we craft experiences that nourish your mind, body, and soul.
            </p>
            <div className="about-values-grid">
              <ValueCard
                imageSrc="/assets/images/value-organic.jpg"
                fallbackSrc="https://via.placeholder.com/400x500/1e3a1e/ffffff?text=Organic+Sourcing"
                title="🌱 100% Organic Sourcing"
                text="We work directly with certified regional farms to guarantee pesticide-free, nutrient-dense produce."
              />
              <ValueCard
                imageSrc="/assets/images/value-nutrition.jpg"
                fallbackSrc="https://via.placeholder.com/400x500/1b3320/ffffff?text=Balanced+Nutrition"
                title="🥗 Balanced Nutrition"
                text="Every dish is crafted alongside culinary experts to ensure optimal macronutrient balance."
              />
              <ValueCard
                imageSrc="/assets/images/value-packaging.jpg"
                fallbackSrc="https://via.placeholder.com/400x500/142918/ffffff?text=Eco+Packaging"
                title="♻ Eco-Friendly Packaging"
                text="From kitchen to delivery, we prioritize 100% biodegradable and recyclable materials."
              />
            </div>
          </section>

          <section className="about-philosophy">
            <div className="about-philosophy-inner">
              <div className="about-philosophy-img-wrap">
                <img
                  className="about-philosophy-img"
                  src="/assets/images/culinary-philosophy.jpg"
                  alt="Fresh organic ingredients prepared by chefs"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      'https://via.placeholder.com/1200x500/2e7d32/ffffff?text=Our+Culinary+Philosophy';
                  }}
                />
              </div>
              <h2 className="about-philosophy-title">Our Culinary Philosophy</h2>
              <p className="about-philosophy-text">
                Eating clean should never mean sacrificing taste. At FreshBite Cafe, our culinary
                team combines global flavors with modern wellness cooking techniques. We eliminate
                artificial preservatives, refined sugars, and processed oils, letting whole
                ingredients take center stage.
              </p>
            </div>
          </section>

          <section className="about-team">
            <h2>Meet the Visionaries</h2>
            <div className="about-team-grid">
              <div className="team-member">
                <div className="team-photo">
                  <img
                    src="/assets/images/team-chef.jpg"
                    alt="Chef Elena Rostova"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x400?text=Chef+Elena';
                    }}
                  />
                </div>
                <h3>Chef Elena Rostova</h3>
                <p className="team-role">Head Culinary Officer</p>
                <p className="team-bio">
                  15+ years of plant-forward culinary experience across farm-to-table kitchens
                  worldwide.
                </p>
              </div>

              <div className="team-member">
                <div className="team-photo">
                  <img
                    src="/assets/images/team-nutritionist.jpg"
                    alt="Chef Marcus Vance"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x400?text=Chef+Marcus';
                    }}
                  />
                </div>
                <h3>Chef Marcus Vance</h3>
                <p className="team-role">Executive Nutritional Chef</p>
                <p className="team-bio">
                  Specializes in macro-balanced culinary design, fusing high-gastronomy with
                  precision nutritional science.
                </p>
              </div>
            </div>
          </section>
        </React.Fragment>
      )}
    </main>
  );
}
