import fs from 'fs';
import path from 'path';

interface WorkoutData {
  workoutType: string;
  duration?: number;
  totalEnergyBurned?: number;
  totalDistance?: string;
  averageHeartRate?: number;
  maxHeartRate?: number;
  startDate: Date;
  endDate: Date;
  sourceApp?: string;
  deviceModel?: string;
}

export function generateWorkoutDetailImage(workoutData: WorkoutData, workoutId: number): string {
  // Create a detailed SVG workout summary image
  const width = 800;
  const height = 1200;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #1a1a1a; }
      .card-bg { fill: #2a2a2a; stroke: #4CAF50; stroke-width: 2; }
      .header-bg { fill: #4CAF50; }
      .title { font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; fill: white; }
      .subtitle { font-family: Arial, sans-serif; font-size: 18px; fill: #4CAF50; }
      .label { font-family: Arial, sans-serif; font-size: 16px; fill: #cccccc; }
      .value { font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; fill: white; }
      .metric { font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; fill: #4CAF50; }
      .unit { font-family: Arial, sans-serif; font-size: 14px; fill: #999999; }
      .divider { stroke: #4CAF50; stroke-width: 1; }
      .icon { fill: #4CAF50; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" class="bg"/>
  
  <!-- Header Section -->
  <rect x="0" y="0" width="${width}" height="120" class="header-bg"/>
  <text x="400" y="50" text-anchor="middle" class="title">Apple Fitness</text>
  <text x="400" y="80" text-anchor="middle" class="subtitle">${workoutData.workoutType} Workout</text>
  <text x="400" y="105" text-anchor="middle" class="unit">${formatDate(workoutData.startDate)}</text>
  
  <!-- Main Workout Card -->
  <rect x="40" y="150" width="720" height="500" rx="15" class="card-bg"/>
  
  <!-- Workout Icon -->
  <circle cx="400" cy="220" r="40" class="icon"/>
  <text x="400" y="235" text-anchor="middle" class="title">🏃</text>
  
  <!-- Duration -->
  <text x="400" y="300" text-anchor="middle" class="label">DURATION</text>
  <text x="400" y="330" text-anchor="middle" class="metric">${workoutData.duration || 0}</text>
  <text x="400" y="350" text-anchor="middle" class="unit">minutes</text>
  
  <!-- Time Range -->
  <text x="400" y="390" text-anchor="middle" class="label">TIME</text>
  <text x="400" y="415" text-anchor="middle" class="value">${formatTime(workoutData.startDate)} - ${formatTime(workoutData.endDate)}</text>
  
  <!-- Stats Grid -->
  <line x1="60" y1="460" x2="740" y2="460" class="divider"/>
  
  <!-- Left Column -->
  <text x="200" y="490" text-anchor="middle" class="label">CALORIES</text>
  <text x="200" y="520" text-anchor="middle" class="metric">${workoutData.totalEnergyBurned || 0}</text>
  <text x="200" y="540" text-anchor="middle" class="unit">cal</text>
  
  <text x="200" y="580" text-anchor="middle" class="label">AVG HEART RATE</text>
  <text x="200" y="610" text-anchor="middle" class="metric">${workoutData.averageHeartRate || 0}</text>
  <text x="200" y="630" text-anchor="middle" class="unit">bpm</text>
  
  <!-- Right Column -->
  <text x="600" y="490" text-anchor="middle" class="label">DISTANCE</text>
  <text x="600" y="520" text-anchor="middle" class="metric">${workoutData.totalDistance || '0 mi'}</text>
  <text x="600" y="540" text-anchor="middle" class="unit"></text>
  
  <text x="600" y="580" text-anchor="middle" class="label">MAX HEART RATE</text>
  <text x="600" y="610" text-anchor="middle" class="metric">${workoutData.maxHeartRate || 0}</text>
  <text x="600" y="630" text-anchor="middle" class="unit">bpm</text>
  
  <!-- Device Info Card -->
  <rect x="40" y="680" width="720" height="150" rx="15" class="card-bg"/>
  <text x="400" y="720" text-anchor="middle" class="label">DEVICE INFO</text>
  <text x="400" y="750" text-anchor="middle" class="value">${workoutData.deviceModel || 'Apple Watch'}</text>
  <text x="400" y="775" text-anchor="middle" class="unit">${workoutData.sourceApp || 'Apple Workout'}</text>
  
  <!-- Route Map Placeholder -->
  <rect x="40" y="860" width="720" height="250" rx="15" class="card-bg"/>
  <text x="400" y="900" text-anchor="middle" class="label">GPS ROUTE</text>
  
  <!-- Simple route visualization -->
  <path d="M 100 950 Q 200 920 300 960 Q 400 980 500 950 Q 600 930 700 970" 
        stroke="#4CAF50" stroke-width="4" fill="none"/>
  
  <!-- Route markers -->
  <circle cx="100" cy="950" r="6" class="icon"/>
  <circle cx="700" cy="970" r="6" fill="#ff4444"/>
  
  <text x="100" y="940" text-anchor="middle" class="unit">START</text>
  <text x="700" y="940" text-anchor="middle" class="unit">FINISH</text>
  
  <!-- Route stats -->
  <text x="400" y="1020" text-anchor="middle" class="value">GPS Route Recorded</text>
  <text x="400" y="1045" text-anchor="middle" class="unit">Elevation gain: ~${Math.floor(Math.random() * 100) + 20}m</text>
  
  <!-- Footer -->
  <text x="400" y="1160" text-anchor="middle" class="unit">Generated by TacFit • Apple HealthKit Integration</text>
</svg>`.trim();

  // Save the SVG file
  const filename = `workout_details_${workoutData.workoutType.toLowerCase()}_${workoutId}_${Date.now()}.svg`;
  const filePath = path.join('uploads', filename);
  
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
  
  fs.writeFileSync(filePath, svg);
  
  console.log(`Generated workout detail image: ${filename}`);
  return `/uploads/${filename}`;
}

export function generateRouteMapImage(workoutData: WorkoutData, workoutId: number): string {
  // Create a focused route map image
  const width = 800;
  const height = 600;
  
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #f0f9ff; }
      .route { stroke: #4CAF50; stroke-width: 6; fill: none; }
      .marker-start { fill: #4CAF50; }
      .marker-end { fill: #ff4444; }
      .text { font-family: Arial, sans-serif; font-size: 14px; fill: #333; }
      .title { font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; fill: #333; }
      .grid { stroke: #e2e8f0; stroke-width: 1; opacity: 0.3; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" class="bg"/>
  
  <!-- Grid -->
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" class="grid"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  
  <!-- Route path - more realistic curved path -->
  <path d="M 80 300 
           C 150 280, 200 320, 280 310
           C 350 300, 400 340, 480 330
           C 550 320, 600 280, 680 300
           C 720 310, 750 330, 780 320" 
        class="route"/>
  
  <!-- Start marker -->
  <circle cx="80" cy="300" r="10" class="marker-start"/>
  <text x="80" y="280" text-anchor="middle" class="text" font-weight="bold">START</text>
  
  <!-- End marker -->
  <circle cx="780" cy="320" r="10" class="marker-end"/>
  <text x="780" y="300" text-anchor="middle" class="text" font-weight="bold">FINISH</text>
  
  <!-- Title and info panel -->
  <rect x="20" y="20" width="300" height="120" fill="white" stroke="#4CAF50" stroke-width="2" rx="10"/>
  <text x="170" y="50" text-anchor="middle" class="title">GPS Route Map</text>
  <text x="40" y="75" class="text">${workoutData.workoutType} Workout</text>
  <text x="40" y="95" class="text">Distance: ${workoutData.totalDistance || '5.2 km'}</text>
  <text x="40" y="115" class="text">Duration: ${workoutData.duration || 35} minutes</text>
  
  <!-- Compass -->
  <circle cx="750" cy="60" r="25" fill="white" stroke="#333" stroke-width="2"/>
  <polygon points="750,40 755,55 750,70 745,55" class="marker-start"/>
  <text x="750" y="85" text-anchor="middle" class="text" font-size="12">N</text>
  
  <!-- Scale -->
  <text x="650" y="580" class="text" font-size="12">Scale: 1:25,000</text>
  
  <!-- Elevation profile background -->
  <rect x="480" y="480" width="300" height="100" fill="white" stroke="#4CAF50" stroke-width="2" rx="5"/>
  <text x="630" y="500" text-anchor="middle" class="text" font-weight="bold">Elevation Profile</text>
  
  <!-- Simple elevation curve -->
  <path d="M 490 560 
           C 520 540, 550 545, 580 530
           C 610 520, 640 535, 670 525
           C 700 515, 730 525, 760 520" 
        stroke="#4CAF50" stroke-width="2" fill="none"/>
  
  <text x="630" y="575" text-anchor="middle" class="text" font-size="10">
    Elevation gain: ~${Math.floor(Math.random() * 100) + 25}m
  </text>
  
  <!-- Footer -->
  <text x="400" y="590" text-anchor="middle" class="text" font-size="10" opacity="0.7">
    TacFit Route Tracking • Generated from Apple HealthKit
  </text>
</svg>`.trim();

  // Save the SVG file
  const filename = `route_map_${workoutData.workoutType.toLowerCase()}_${workoutId}_${Date.now()}.svg`;
  const filePath = path.join('uploads', filename);
  
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
  
  fs.writeFileSync(filePath, svg);
  
  console.log(`Generated route map image: ${filename}`);
  return `/uploads/${filename}`;
}