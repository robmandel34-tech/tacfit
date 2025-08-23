import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePullToRefreshOptions {
  queryKeys?: string[][];
  onRefresh?: () => void;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({
  queryKeys = [],
  onRefresh,
  threshold = 80,
  resistance = 2.5
}: UsePullToRefreshOptions = {}) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Invalidate specified query keys
      if (queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map(queryKey => 
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }
      
      // Call custom refresh function if provided
      if (onRefresh) {
        await onRefresh();
      }
      
      // Wait a bit for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (container.scrollTop > 0 || isRefreshing) return;
      
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY.current;
      
      if (deltaY > 0) {
        e.preventDefault();
        const distance = Math.min(deltaY / resistance, threshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= threshold && !isRefreshing) {
        refresh();
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, resistance, isRefreshing]);

  const refreshIndicatorStyle = {
    transform: `translateY(${Math.max(pullDistance - threshold, -threshold)}px)`,
    opacity: pullDistance > 0 ? Math.min(pullDistance / threshold, 1) : 0,
  };

  const RefreshIndicator = () => (
    <div
      className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-200 pointer-events-none"
      style={refreshIndicatorStyle}
    >
      <div className="bg-steel-blue text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}></div>
        <span className="text-sm font-medium">
          {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );

  return {
    containerRef,
    RefreshIndicator,
    isRefreshing,
    pullDistance,
    refresh
  };
}