import fs from 'fs';
import path from 'path';

export function createDemoRouteMapSVG(workoutId: number): string {
  // Create a simple SVG route map for demonstration
  const svg = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #f0f9ff; }
      .route { stroke: #4CAF50; stroke-width: 5; fill: none; }
      .marker { fill: #ff4444; }
      .start { fill: #4CAF50; }
      .text { font-family: Arial, sans-serif; font-size: 14px; fill: #333; }
      .title { font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #333; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="600" class="bg"/>
  
  <!-- Grid lines -->
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#grid)" opacity="0.3"/>
  
  <!-- Route path -->
  <path d="M 100 300 Q 200 250 300 280 Q 400 320 500 300 Q 600 280 700 320" class="route"/>
  
  <!-- Start marker -->
  <circle cx="100" cy="300" r="8" class="start"/>
  <text x="100" y="285" text-anchor="middle" class="text">START</text>
  
  <!-- End marker -->
  <circle cx="700" cy="320" r="8" class="marker"/>
  <text x="700" y="305" text-anchor="middle" class="text">FINISH</text>
  
  <!-- Title and info -->
  <text x="400" y="50" text-anchor="middle" class="title">GPS Route Map</text>
  <text x="400" y="80" text-anchor="middle" class="text">Running Workout - 5.2 km</text>
  <text x="400" y="100" text-anchor="middle" class="text">Elevation Gain: 45m</text>
  
  <!-- TacFit branding -->
  <text x="50" y="580" class="text" opacity="0.6">TacFit Route Tracking</text>
</svg>`.trim();

  // Save SVG to uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `route_map_${workoutId}.svg`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, svg);

  return `/uploads/${filename}`;
}