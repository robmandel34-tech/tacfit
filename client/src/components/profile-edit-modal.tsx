import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Edit, Save, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface ProfileEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ user, isOpen, onClose }: ProfileEditModalProps) {
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [username, setUsername] = useState(user.username);
  const [motto, setMotto] = useState((user as any)?.motto || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  // Image preview state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Avatar upload mutation
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append("avatar", file);
      
      const response = await fetch(`/api/users/${user.id}/avatar`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload profile picture");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been successfully updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      updateUser({ avatar: data.avatar });
      setIsUploadingAvatar(false);
    },
    onError: (error) => {
      let errorMessage = "Failed to upload profile picture. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsUploadingAvatar(false);
    },
  });

  // Cover photo upload mutation
  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      setIsUploadingCover(true);
      const formData = new FormData();
      formData.append("coverPhoto", file);
      
      const response = await fetch(`/api/users/${user.id}/cover`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload cover photo");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cover Photo Updated",
        description: "Your cover photo has been successfully updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      updateUser({ coverPhoto: data.coverPhoto });
      setIsUploadingCover(false);
    },
    onError: (error) => {
      let errorMessage = "Failed to upload cover photo. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsUploadingCover(false);
    },
  });

  // Update username mutation
  const updateUsername = useMutation({
    mutationFn: async (newUsername: string) => {
      return apiRequest("PUT", `/api/users/${user.id}`, {
        username: newUsername.trim(),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Username Updated",
        description: "Your username has been successfully updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      // updateUser({ username: data.username });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update username",
        variant: "destructive",
      });
    },
  });

  // Update motto mutation
  const updateMottoMutation = useMutation({
    mutationFn: async (newMotto: string) => {
      return apiRequest("PUT", `/api/users/${user.id}`, {
        motto: newMotto.trim(),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Motto Updated",
        description: "Your motto has been successfully updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      // updateUser({ motto: data.motto });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update motto",
        variant: "destructive",
      });
    },
  });

  // File upload handlers
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission handler
  const handleSave = async () => {
    try {
      const updates = [];
      
      // Upload avatar if changed
      if (avatarFile) {
        updates.push(uploadAvatar.mutateAsync(avatarFile));
      }
      
      // Upload cover if changed
      if (coverFile) {
        updates.push(uploadCover.mutateAsync(coverFile));
      }
      
      // Update username if changed
      if (username.trim() !== user.username && username.trim()) {
        updates.push(updateUsername.mutateAsync(username.trim()));
      }
      
      // Update motto if changed
      if (motto.trim() !== ((user as any)?.motto || '')) {
        updates.push(updateMottoMutation.mutateAsync(motto.trim()));
      }
      
      if (updates.length > 0) {
        await Promise.all(updates);
      }
      
      // Reset file states and close modal
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview(null);
      setCoverPreview(null);
      onClose();
    } catch (error) {
      // Individual errors are handled by mutations
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setUsername(user.username);
    setMotto((user as any)?.motto || '');
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarPreview(null);
    setCoverPreview(null);
    onClose();
  };

  const isLoading = updateUsername.isPending || updateMottoMutation.isPending || isUploadingAvatar || isUploadingCover;
  const hasChanges = username.trim() !== user.username || motto.trim() !== ((user as any)?.motto || '') || avatarFile || coverFile;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-md bg-white/5 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Cover Photo Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">Cover Photo</Label>
            <div className="relative">
              <div className="w-full h-24 bg-gradient-to-r from-military-green to-steel-blue rounded-lg overflow-hidden">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover Preview"
                    className="w-full h-full object-cover"
                  />
                ) : user.coverPhoto ? (
                  <img
                    src={`/api/uploads/${user.coverPhoto}`}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white text-sm opacity-70">No cover photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
                id="edit-cover-upload"
              />
              <label
                htmlFor="edit-cover-upload"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-all"
              >
                {isUploadingCover ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </label>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">Profile Picture</Label>
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-military-green flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : user.avatar ? (
                    <img
                      src={`/api/uploads/${user.avatar}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="edit-avatar-upload"
                />
                <label
                  htmlFor="edit-avatar-upload"
                  className="absolute -bottom-1 -right-1 bg-steel-blue hover:bg-blue-600 text-white p-1.5 rounded-full cursor-pointer transition-all"
                >
                  {isUploadingAvatar ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <Label htmlFor="edit-username" className="text-sm font-medium text-gray-300">
              Username
            </Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="bg-white/5 border-white/10 text-white placeholder-gray-400"
              maxLength={50}
            />
          </div>

          {/* Motto Section */}
          <div className="space-y-2">
            <Label htmlFor="edit-motto" className="text-sm font-medium text-gray-300">
              Motto
            </Label>
            <Textarea
              id="edit-motto"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="Enter your motto..."
              className="bg-white/5 border-white/10 text-white placeholder-gray-400 resize-none"
              maxLength={100}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="flex-1 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className="flex-1 bg-military-green hover:bg-military-green/80 text-white"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}