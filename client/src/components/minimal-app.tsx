import { useState, useEffect } from 'react';

export function MinimalApp() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('MinimalApp mounted');
    return () => console.log('MinimalApp unmounted');
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8 text-military-green">TacFit Minimal Test</h1>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md text-center">
        <p className="mb-4">Testing app stability in native Replit app</p>
        <p className="mb-4">Count: {count}</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="bg-military-green hover:bg-military-green-light text-white px-4 py-2 rounded mr-2"
        >
          Increment
        </button>
        <button
          onClick={() => setCount(0)}
          className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
        >
          Reset
        </button>
        <div className="mt-4 text-sm text-gray-400">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}