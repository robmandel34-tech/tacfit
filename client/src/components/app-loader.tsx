import { useState, useEffect } from 'react';

interface AppLoaderProps {
  children: React.ReactNode;
}

export function AppLoader({ children }: AppLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simple load check for native Replit app stability
    const timer = setTimeout(() => {
      try {
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize app');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-red-400 text-xl font-bold mb-4">Loading Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-military-green hover:bg-military-green-light text-white px-4 py-2 rounded"
          >
            Refresh App
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-green mx-auto mb-4"></div>
          <p className="text-gray-300">Loading TacFit...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}