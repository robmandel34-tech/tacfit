import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivitySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivitySubmissionModal({ isOpen, onClose }: ActivitySubmissionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submitActivity = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/activities", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        throw new Error("Failed to submit activity");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Activity submitted!",
        description: "Your activity has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error("Activity submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your activity.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setType("");
    setDescription("");
    setQuantity("");
    setFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate required fields
    if (!type || !description || !quantity) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("userId", user.id.toString());
    formData.append("type", type);
    formData.append("description", description);
    formData.append("quantity", quantity);
    
    if (file) {
      formData.append("evidence", file);
    }

    submitActivity.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tactical-gray-light border-tactical-gray text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Submit Activity</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300 font-medium mb-2">Activity Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-tactical-gray-lighter border-tactical-gray text-white">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent className="bg-tactical-gray-light border-tactical-gray">
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="strength">Strength Training</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-gray-300 font-medium mb-2">Description</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-tactical-gray-lighter border-tactical-gray text-white h-24"
              placeholder="Describe your activity..."
              required
            />
          </div>
          
          <div>
            <Label className="text-gray-300 font-medium mb-2">Quantity</Label>
            <Input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-tactical-gray-lighter border-tactical-gray text-white"
              placeholder="e.g., 30 minutes, 50 push-ups, 3 miles"
              required
            />
          </div>
          
          <div>
            <Label className="text-gray-300 font-medium mb-2">Evidence (Photo or Video)</Label>
            <div className="border-2 border-dashed border-tactical-gray rounded-lg p-4 text-center">
              {file ? (
                <div className="space-y-2">
                  <p className="text-green-400">✓ {file.name}</p>
                  <p className="text-gray-400 text-sm">
                    {file.type.startsWith('image/') ? 'Image' : 'Video'} • {Math.round(file.size / 1024)}KB
                  </p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFile(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-400 mb-2">Upload photo or video evidence</p>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="evidence-upload"
                  />
                  <Label 
                    htmlFor="evidence-upload"
                    className="cursor-pointer text-military-green hover:text-military-green-light"
                  >
                    Choose File
                  </Label>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="ghost"
              onClick={onClose}
              className="flex-1 bg-tactical-gray-lighter hover:bg-tactical-gray-lightest text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitActivity.isPending || !type || !description}
              className="flex-1 bg-military-green hover:bg-military-green-light text-white"
            >
              {submitActivity.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
