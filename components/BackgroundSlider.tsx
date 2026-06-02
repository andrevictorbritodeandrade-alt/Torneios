import React, { useState, useEffect } from 'react';
import { BACKGROUND_IMAGES } from '../constants';

export const BackgroundSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
      {BACKGROUND_IMAGES.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(6px) brightness(0.6)', // Blur effect and darkened for readability
            transform: 'scale(1.05)', // Slight scale to avoid blurred edges showing
          }}
        />
      ))}
      <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-[2px]" />
    </div>
  );
};