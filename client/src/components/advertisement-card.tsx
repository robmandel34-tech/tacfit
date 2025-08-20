import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Target } from "lucide-react";

interface AdvertisementCardProps {
  advertisement: {
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
    targetUrl?: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    currentImpressions: number;
    maxImpressions?: number;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  };
}

export default function AdvertisementCard({ advertisement }: AdvertisementCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Record impression when card is viewed
  useEffect(() => {
    const recordImpression = async () => {
      try {
        await fetch(`/api/advertisements/${advertisement.id}/impression`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to record advertisement impression:', error);
      }
    };

    recordImpression();
  }, [advertisement.id]);

  const handleClick = () => {
    if (advertisement.targetUrl) {
      window.open(advertisement.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="tile-card border-2 border-yellow-600/30 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 mb-6 hover:border-yellow-500/50 transition-colors duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-yellow-400" />
              <Badge variant="outline" className="bg-yellow-900/30 border-yellow-600/50 text-yellow-300 text-xs">
                Sponsored
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{advertisement.title}</h3>
            <p className="text-gray-300 leading-relaxed">{advertisement.content}</p>
          </div>

          {advertisement.imageUrl && (
            <div className="rounded-lg overflow-hidden bg-tactical-gray-lighter">
              <img
                src={advertisement.imageUrl}
                alt={advertisement.title}
                className="w-full h-48 object-cover"
                onLoad={() => {
                  setImageLoaded(true);
                  console.log("Advertisement image loaded successfully:", advertisement.imageUrl);
                }}
                onError={() => {
                  console.error("Advertisement image failed to load:", advertisement.imageUrl);
                }}
              />
            </div>
          )}

          {advertisement.targetUrl && (
            <Button
              onClick={handleClick}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-medium"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Learn More
            </Button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-tactical-gray flex items-center justify-between text-xs text-gray-500">
          <span>Advertisement</span>
          <span>{advertisement.currentImpressions} views</span>
        </div>
      </CardContent>
    </Card>
  );
}