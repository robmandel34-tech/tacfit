import { routeMapService } from './route-map-service';

export async function generateRouteMapForWorkout(workoutId: number, routeData: any): Promise<string | null> {
  try {
    // Parse the route coordinates
    const coordinates = routeMapService.parseHealthKitRoute(routeData);
    
    if (coordinates.length === 0) {
      console.log(`No valid coordinates found for workout ${workoutId}`);
      return null;
    }

    // Process the route and get the map
    const result = await routeMapService.processWorkoutRoute(workoutId, coordinates);
    
    // Return the local image URL if available, otherwise the remote map URL
    return result.localImageUrl || result.mapUrl;
  } catch (error) {
    console.error('Error generating route map for workout:', error);
    return null;
  }
}