import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaSlideshowProps {
  images: string[];
  videoUrl?: string;
}

export default function MediaSlideshow({ images, videoUrl }: MediaSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Combine all media (images + video) into one array
  const allMedia = [
    ...images.map((url) => ({ type: 'image', url })),
    ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])
  ];

  const totalMedia = allMedia.length;

  if (totalMedia === 0) {
    return null;
  }

  // If only one media item, don't show navigation
  if (totalMedia === 1) {
    const media = allMedia[0];
    return (
      <div className="relative w-full h-64 bg-tactical-gray-light rounded-lg overflow-hidden">
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt="Activity evidence"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error("Evidence image failed to load:", media.url);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full relative">
            <video
              className="w-full h-full object-cover"
              controls
              preload="metadata"
              playsInline
              onError={(e) => {
                console.error("Evidence video failed to load:", media.url);
                console.error("Video error details:", e);
                // Show fallback instead of hiding
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full bg-tactical-gray-light flex flex-col items-center justify-center">
                      <div class="text-4xl mb-2">🎥</div>
                      <div class="text-white text-sm mb-2">Video Available</div>
                      <div class="text-gray-400 text-xs mb-3">Browser doesn't support this format</div>
                      <a href="${media.url}" target="_blank" class="bg-military-green hover:bg-military-green-light text-white px-3 py-1 rounded text-sm">
                        Download Video
                      </a>
                    </div>
                  `;
                }
              }}
              onLoadStart={() => console.log("Video load started:", media.url)}
              onCanPlay={() => console.log("Video can play:", media.url)}
            >
              <source src={media.url} type="video/quicktime" />
              <source src={media.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? totalMedia - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === totalMedia - 1 ? 0 : prevIndex + 1
    );
  };

  const currentMedia = allMedia[currentIndex];

  return (
    <div className="relative w-full h-64 bg-tactical-gray-light rounded-lg overflow-hidden group">
      {/* Main Media Display */}
      {currentMedia.type === 'image' ? (
        <img
          src={currentMedia.url}
          alt={`Activity evidence ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={(e) => {
            console.error("Evidence image failed to load:", currentMedia.url);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full relative">
          <video
            className="w-full h-full object-cover"
            controls
            preload="metadata"
            playsInline
            onError={(e) => {
              console.error("Evidence video failed to load:", currentMedia.url);
              console.error("Video error details:", e);
              // Show fallback instead of hiding
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full bg-tactical-gray-light flex flex-col items-center justify-center">
                    <div class="text-4xl mb-2">🎥</div>
                    <div class="text-white text-sm mb-2">Video Available</div>
                    <div class="text-gray-400 text-xs mb-3">Browser doesn't support this format</div>
                    <a href="${currentMedia.url}" target="_blank" class="bg-military-green hover:bg-military-green-light text-white px-3 py-1 rounded text-sm">
                      Download Video
                    </a>
                  </div>
                `;
              }
            }}
            onLoadStart={() => console.log("Video load started:", currentMedia.url)}
            onCanPlay={() => console.log("Video can play:", currentMedia.url)}
          >
            <source src={currentMedia.url} type="video/quicktime" />
            <source src={currentMedia.url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Navigation Arrows */}
      <Button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        size="sm"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        size="sm"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Media Counter */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
        {currentIndex + 1} / {totalMedia}
      </div>

      {/* Media Type Indicator */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
        {currentMedia.type === 'video' ? '🎥 Video' : '📷 Image'}
      </div>

      {/* Slide Indicators */}
      {totalMedia > 1 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-1 p-2">
          {allMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                index === currentIndex 
                  ? 'bg-white' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Touch/Swipe Support for Mobile */}
      <div 
        className="absolute inset-0 z-0"
        onTouchStart={(e) => {
          const touchStart = e.touches[0].clientX;
          const handleTouchEnd = (endEvent: TouchEvent) => {
            const touchEnd = endEvent.changedTouches[0].clientX;
            const diff = touchStart - touchEnd;
            
            if (Math.abs(diff) > 50) { // Minimum swipe distance
              if (diff > 0) {
                goToNext();
              } else {
                goToPrevious();
              }
            }
            
            document.removeEventListener('touchend', handleTouchEnd);
          };
          
          document.addEventListener('touchend', handleTouchEnd, { once: true });
        }}
      />
    </div>
  );
}