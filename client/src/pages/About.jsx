import React from 'react';

export default function About() {
  return (
    <main style={{ paddingTop: '4.5rem' }}>
      <section className="Our-Story" id="our-story">
      <figure className="story-image-container">
        <img alt="Interior of Fresh Bite Cafe" src="/assets/images/Fresh-Bite-Interior.png" />
      </figure>
      <article>
        <h2>Our Story</h2>
        <p>
          At FreshBite, we believe that healthy food should be delicious and accessible. 
          Since our opening, we have been dedicated to serving vibrant dishes that energize and inspire.
        </p>
        <p>
          Every ingredient is chosen with care, partnering with local farmers to bring the 
          freshest flavors directly to your table in the heart of the city.
        </p>
      </article>
    </section>
    </main>
  );
}