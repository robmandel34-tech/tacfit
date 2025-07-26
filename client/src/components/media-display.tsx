import { useState } from 'react';
import * as React from 'react';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface MediaDisplayProps {
  imageUrls: string[];
  videoUrl?: string;
}

interface ImageGalleryModalProps {
  images: string[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  onClose: () => void;
}

function ImageGalleryModal({ images, currentIndex, setCurrentIndex, onClose }: ImageGalleryModalProps) {
  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main Image */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <img
            src={images[currentIndex]}
            alt={`Evidence image ${currentIndex + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain"
            onError={(e) => {
              console.error("Gallery image failed to load:", images[currentIndex]);
              e.currentTarget.style.display = 'none';
            }}
          />

          {/* Navigation Arrows (only show if multiple images) */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip (only show if multiple images) */}
        {images.length > 1 && (
          <div className="flex justify-center mt-4 space-x-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex ? 'border-military-green' : 'border-transparent hover:border-gray-400'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaDisplay({ imageUrls, videoUrl }: MediaDisplayProps) {
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // If we have a video, show it as the main content with image overlay
  if (videoUrl) {
    return (
      <div className="relative w-full h-64 bg-tactical-gray-light rounded-lg overflow-hidden">
        {/* Main Video Display */}
        <video
          key={`video-${videoUrl}`}
          src={videoUrl}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
          playsInline
          muted
          onError={(e) => {
            console.error("Video playback failed for:", videoUrl);
            const videoElement = e.currentTarget as HTMLVideoElement;
            console.error("Video error code:", videoElement.error?.code);
            // Hide video and show fallback
            videoElement.style.display = 'none';
            const fallback = videoElement.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
          onLoadStart={() => console.log("✓ Video load started:", videoUrl)}
          onCanPlay={() => console.log("✓ Video can play:", videoUrl)}
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
                link.href = videoUrl;
                link.download = videoUrl.split('/').pop() || 'video';
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

        {/* Image Gallery Button (if images exist) */}
        {imageUrls.length > 0 && (
          <button
            onClick={() => setIsImageGalleryOpen(true)}
            className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
            title={`View ${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''}`}
          >
            <Images className="w-5 h-5" />
            {imageUrls.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-military-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {imageUrls.length}
              </span>
            )}
          </button>
        )}

        {/* Image Gallery Modal */}
        {isImageGalleryOpen && imageUrls.length > 0 && (
          <ImageGalleryModal
            images={imageUrls}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
            onClose={() => setIsImageGalleryOpen(false)}
          />
        )}
      </div>
    );
  }

  // If no video but we have images, show the first image with gallery button
  if (imageUrls.length > 0) {
    return (
      <div className="relative w-full h-64 bg-tactical-gray-light rounded-lg overflow-hidden">
        <img
          src={imageUrls[0]}
          alt="Activity evidence"
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error("Evidence image failed to load:", imageUrls[0]);
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Gallery Button (if multiple images) */}
        {imageUrls.length > 1 && (
          <button
            onClick={() => setIsImageGalleryOpen(true)}
            className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
            title={`View all ${imageUrls.length} images`}
          >
            <Images className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-military-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {imageUrls.length}
            </span>
          </button>
        )}

        {/* Image Gallery Modal */}
        {isImageGalleryOpen && (
          <ImageGalleryModal
            images={imageUrls}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
            onClose={() => setIsImageGalleryOpen(false)}
          />
        )}
      </div>
    );
  }

  // No media at all
  return null;
}

// Keep the old export name for compatibility
export { MediaDisplay as MediaSlideshow };