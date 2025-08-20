import fs from 'fs';
import path from 'path';

interface RouteCoordinate {
  latitude: number;
  longitude: number;
  timestamp?: string;
  altitude?: number;
}

interface MapGenerationOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpg';
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
  strokeColor?: string;
  strokeWeight?: number;
}

export class RouteMapService {
  private static instance: RouteMapService;
  private googleMapsApiKey: string;

  constructor() {
    // For development, we'll use a placeholder key
    // In production, this should be set via environment variable
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'PLACEHOLDER_KEY';
  }

  static getInstance(): RouteMapService {
    if (!RouteMapService.instance) {
      RouteMapService.instance = new RouteMapService();
    }
    return RouteMapService.instance;
  }

  /**
   * Generate a static map image URL from route coordinates
   */
  async generateStaticMapUrl(
    coordinates: RouteCoordinate[],
    options: MapGenerationOptions = {}
  ): Promise<string | null> {
    try {
      if (!coordinates || coordinates.length < 2) {
        console.log('Insufficient coordinates for route map generation');
        return null;
      }

      const {
        width = 600,
        height = 400,
        format = 'png',
        mapType = 'roadmap',
        strokeColor = '0x0000FF',
        strokeWeight = 4
      } = options;

      // For demo purposes, we'll create a mock map URL
      // In production, this would use the actual Google Maps Static API
      if (this.googleMapsApiKey === 'PLACEHOLDER_KEY') {
        return this.generateMockMapUrl(coordinates, width, height);
      }

      // Encode coordinates as polyline for Google Maps
      const polyline = this.encodePolyline(coordinates);
      
      const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
      const params = new URLSearchParams({
        size: `${width}x${height}`,
        format,
        maptype: mapType,
        path: `weight:${strokeWeight}|color:${strokeColor}|enc:${polyline}`,
        key: this.googleMapsApiKey
      });

      // Add start and end markers
      if (coordinates.length > 0) {
        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];
        params.append('markers', `color:green|label:S|${start.latitude},${start.longitude}`);
        params.append('markers', `color:red|label:E|${end.latitude},${end.longitude}`);
      }

      return `${baseUrl}?${params.toString()}`;
    } catch (error) {
      console.error('Error generating static map URL:', error);
      return null;
    }
  }

  /**
   * Generate a mock map URL for demonstration
   */
  private generateMockMapUrl(coordinates: RouteCoordinate[], width: number, height: number): string {
    const center = this.calculateCenter(coordinates);
    const distance = this.calculateTotalDistance(coordinates);
    
    // Create a demo map URL that shows route information
    const baseUrl = 'https://via.placeholder.com';
    const text = `Route+Map+${distance.toFixed(1)}km`;
    return `${baseUrl}/${width}x${height}/4CAF50/FFFFFF?text=${text}`;
  }

  /**
   * Download and save map image to local storage
   */
  async downloadAndSaveMapImage(mapUrl: string, filename: string): Promise<string | null> {
    try {
      const response = await fetch(mapUrl);
      if (!response.ok) {
        throw new Error(`Failed to download map: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, Buffer.from(buffer));

      // Return the relative URL for the saved image
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error downloading and saving map image:', error);
      return null;
    }
  }

  /**
   * Process HealthKit route data and generate map image
   */
  async processWorkoutRoute(
    workoutId: number,
    routeCoordinates: RouteCoordinate[]
  ): Promise<{ mapUrl: string | null; localImageUrl: string | null; elevationGain: number }> {
    try {
      console.log(`Processing route for workout ${workoutId} with ${routeCoordinates.length} coordinates`);

      // Generate static map URL
      const mapUrl = await this.generateStaticMapUrl(routeCoordinates, {
        width: 800,
        height: 600,
        strokeColor: '0x4CAF50', // Green color for TacFit theme
        strokeWeight: 5
      });

      let localImageUrl: string | null = null;

      // Download and save map image locally
      if (mapUrl) {
        const filename = `route_map_${workoutId}_${Date.now()}.png`;
        localImageUrl = await this.downloadAndSaveMapImage(mapUrl, filename);
      }

      // Calculate elevation gain
      const elevationGain = this.calculateElevationGain(routeCoordinates);

      return {
        mapUrl,
        localImageUrl,
        elevationGain
      };
    } catch (error) {
      console.error('Error processing workout route:', error);
      return {
        mapUrl: null,
        localImageUrl: null,
        elevationGain: 0
      };
    }
  }

  /**
   * Encode coordinates as Google Maps polyline
   */
  private encodePolyline(coordinates: RouteCoordinate[]): string {
    // Simplified polyline encoding (in production, use a proper library)
    const points = coordinates.map(coord => `${coord.latitude},${coord.longitude}`);
    return points.join('|');
  }

  /**
   * Calculate the center point of route coordinates
   */
  private calculateCenter(coordinates: RouteCoordinate[]): { latitude: number; longitude: number } {
    const sum = coordinates.reduce(
      (acc, coord) => ({
        latitude: acc.latitude + coord.latitude,
        longitude: acc.longitude + coord.longitude
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: sum.latitude / coordinates.length,
      longitude: sum.longitude / coordinates.length
    };
  }

  /**
   * Calculate total distance of the route
   */
  private calculateTotalDistance(coordinates: RouteCoordinate[]): number {
    let totalDistance = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      totalDistance += this.calculateHaversineDistance(prev, curr);
    }

    return totalDistance;
  }

  /**
   * Calculate elevation gain from route coordinates
   */
  private calculateElevationGain(coordinates: RouteCoordinate[]): number {
    let elevationGain = 0;
    let previousAltitude: number | null = null;

    for (const coord of coordinates) {
      if (coord.altitude !== undefined && previousAltitude !== null) {
        const gain = coord.altitude - previousAltitude;
        if (gain > 0) {
          elevationGain += gain;
        }
      }
      if (coord.altitude !== undefined) {
        previousAltitude = coord.altitude;
      }
    }

    return Math.round(elevationGain);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateHaversineDistance(
    coord1: RouteCoordinate,
    coord2: RouteCoordinate
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
      Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Parse route data from HealthKit format
   */
  parseHealthKitRoute(routeData: any): RouteCoordinate[] {
    try {
      if (!routeData || !Array.isArray(routeData)) {
        return [];
      }

      return routeData.map(point => ({
        latitude: parseFloat(point.latitude || point.lat || 0),
        longitude: parseFloat(point.longitude || point.lng || point.lon || 0),
        timestamp: point.timestamp,
        altitude: point.altitude ? parseFloat(point.altitude) : undefined
      })).filter(coord => coord.latitude !== 0 && coord.longitude !== 0);
    } catch (error) {
      console.error('Error parsing HealthKit route data:', error);
      return [];
    }
  }
}

export const routeMapService = RouteMapService.getInstance();