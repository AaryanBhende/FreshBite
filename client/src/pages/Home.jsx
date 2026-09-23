import React from 'react';
import Hero from '../components/Hero';
import About from './About';
import Favorites from './Favorites';
import Contact from './Contact';

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Favorites />
      <Contact />
    </main>
  );
}