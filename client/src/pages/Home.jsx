import { useEffect } from 'react';
import Hero from '../components/Hero';
import About from './About';
import Favorites from './Favorites';

export default function Home() {
  useEffect(() => {
    window.scrollTo({ top: 30, behavior: 'smooth' });
  }, []);

  return (
    <main>
      <Hero />
      <About storyOnly={true} />
      <Favorites />
    </main>
  );
}