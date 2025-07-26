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
          <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
            <video
              key={`video-${media.url}`}
              src={media.url}
              className="w-full h-full object-cover"
              controls
              preload="metadata"
              playsInline
              muted
              onError={(e) => {
                console.error("Video playback failed for:", media.url);
                const videoElement = e.currentTarget as HTMLVideoElement;
                console.error("Video error code:", videoElement.error?.code);
                // Hide video and show fallback
                videoElement.style.display = 'none';
                const fallback = videoElement.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoadStart={() => console.log("✓ Video load started:", media.url)}
              onCanPlay={() => console.log("✓ Video can play:", media.url)}
            />
            {/* Fallback UI for when video fails to play */}
            <div 
              className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center text-white p-4 rounded hidden"
              style={{ display: 'none' }}
            >
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-1 0V1.5a.5.5 0 00-.5-.5h-7a.5.5 0 00-.5.5V4m-6 4h16l-1 10H4L3 8z" />
                </svg>
                <p className="text-sm text-gray-300 mb-3">Video preview unavailable</p>
                <button 
                  onClick={() => {
                    // Create a temporary anchor element to trigger download
                    const link = document.createElement('a');
                    link.href = media.url;
                    link.download = media.url.split('/').pop() || 'video';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="inline-flex items-center px-3 py-2 bg-military-green text-white rounded-md text-sm hover:bg-military-green/80 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Video
                </button>
              </div>
            </div>
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
        <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
          <video
            key={`video-${currentMedia.url}`}
            src={currentMedia.url}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
            playsInline
            muted
            onError={(e) => {
              console.error("Video playback failed for:", currentMedia.url);
              const videoElement = e.currentTarget as HTMLVideoElement;
              console.error("Video error code:", videoElement.error?.code);
              // Hide video and show fallback
              videoElement.style.display = 'none';
              const fallback = videoElement.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
            onLoadStart={() => console.log("✓ Video load started:", currentMedia.url)}
            onCanPlay={() => console.log("✓ Video can play:", currentMedia.url)}
          />
          {/* Fallback UI for when video fails to play */}
          <div 
            className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center text-white p-4 rounded hidden"
            style={{ display: 'none' }}
          >
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-300 mb-4">Video preview unavailable</p>
              <button 
                onClick={() => {
                  // Create a temporary anchor element to trigger download
                  const link = document.createElement('a');
                  link.href = currentMedia.url;
                  link.download = currentMedia.url.split('/').pop() || 'video';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center px-4 py-2 bg-military-green text-white rounded-md hover:bg-military-green/80 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Video
              </button>
            </div>
          </div>
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