import React, { useState } from 'react';
import { GameItem } from '../types';

const rarityColors = {
  basic: 'bg-gray-900 border-purple-500/30',
  uncommon: 'bg-gray-900 border-blue-500/30',
  rare: 'bg-gray-900 border-green-500/30',
  epic: 'bg-gray-900 border-purple-500/30',
  legendary: 'bg-gray-900 border-orange-500',
  Collector: 'bg-gray-900 border-blue-500',
  ultimate: 'bg-gray-900 border-black',
  mad: 'bg-gray-900 border-red-500',
  mythical: 'bg-gray-900 border-indigo-500'
};

const rarityTextColors = {
  basic: 'text-purple-400',
  uncommon: 'text-blue-400',
  rare: 'text-green-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
  Collector: 'text-blue-400',
  ultimate: 'text-black',
  mad: 'text-red-400',
  mythical: 'text-indigo-400'
};

const formatValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(3)}m`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
};

interface ItemCardProps {
  item: GameItem;
  isSelected?: boolean;
}

export function ItemCard({ item, isSelected = false }: ItemCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const toggleMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowVideo(!showVideo);
    setVideoError(false); // Reset error state when toggling
  };

  const getVideoSource = () => {
    // Check for v1 version first
    const v1Path = `/videos/${item.name.toLowerCase().replace(/\s+/g, '_')}v1.mp4`;
    const regularPath = `/videos/${item.name.toLowerCase().replace(/\s+/g, '_')}.mp4`;
    const effectPath = item.effect && item.effect !== 'None' 
      ? `/videos/${item.effect.toLowerCase().replace(/\s+/g, '_')}.mp4`
      : null;
      
    // Try to load v1 version first, then regular version, then effect
    return v1Path || regularPath || effectPath;
  };

  const isEarlyVariant = item.name.toLowerCase().includes('v1') || 
                        getVideoSource()?.includes('v1.mp4');

  const shouldShowButton = (item.effect && item.effect !== 'None' && item.type !== 'Pet') || !videoError;

  const handleVideoError = () => {
    setVideoError(true);
    setShowVideo(false);
  };

  return (
    <div className={`rounded-2xl border-4 shadow-xl overflow-hidden ${rarityColors[item.rarity]} font-flashy ${isSelected ? 'ring-4 ring-purple-500' : ''} bg-gradient-to-br from-gray-900 to-purple-900/50`}>
      <div className="relative">
        <div className="w-full h-48 sm:h-56 bg-gradient-to-br from-gray-800 to-purple-900/30 relative overflow-hidden">
          {showVideo && !videoError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <video 
                autoPlay 
                loop
                controls
                playsInline
                className="w-full h-full object-cover"
                src={getVideoSource()}
                onError={handleVideoError}
              />
            </div>
          ) : (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-contain p-6 animate-float"
              loading="lazy"
            />
          )}
          {shouldShowButton && (
            <button 
              onClick={toggleMedia}
              className="absolute bottom-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold py-1 px-2 rounded-full shadow-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200 z-10"
            >
              {showVideo ? 'Show Image' : 'Show Effect'}
            </button>
          )}
        </div>
        {isEarlyVariant && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full px-3 py-1 shadow-md">
            <span className="font-bold text-white text-sm">Early Variant</span>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-full px-3 py-1 shadow-md border border-purple-500/30">
          <span className="font-bold text-white text-sm">{formatValue(item.value)}</span>
        </div>
      </div>
      <div className="p-5 bg-gradient-to-br from-gray-900 to-purple-900/30">
        <h3 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{item.name}</h3>
        <div className="space-y-3">
          <p className="text-sm text-purple-300 italic">{item.description}</p>
          <div className="bg-purple-900/30 rounded-lg p-4 shadow-inner space-y-2 text-sm border border-purple-500/30">
            <p><span className="font-bold text-purple-300">Type:</span> <span className="text-purple-400">{item.type}</span></p>
            <p><span className="font-bold text-purple-300">Origin:</span> <span className="text-purple-400">{item.origin}</span></p>
            {item.effect && item.effect !== 'None' && <p><span className="font-bold text-purple-300">Effect:</span> <span className="text-purple-400">{item.effect}</span></p>}
          </div>
        </div>
        <div className="mt-4">
          <span className={`inline-block ${rarityTextColors[item.rarity]} capitalize font-bold px-4 py-1.5 rounded-full bg-purple-900/30 border border-current text-sm`}>
            {item.rarity}
          </span>
        </div>
      </div>
    </div>
  );
}