import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Edit2, Trash2, Users, Trophy, Calendar, Settings, X, Activity, AlertTriangle, MessageSquare, BarChart3, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Competition {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  joinStartDate?: string;
  joinEndDate?: string;
  maxTeams: number;
  isActive: boolean;
  requiredActivities: string[];
  targetGoals: string[];
  isCompleted?: boolean;
  completedAt?: string;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  isAdmin: boolean;
  isSuspended?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  competitionsEntered: number;
  createdAt: string;
}

interface ActivityType {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  measurementUnit: string;
  defaultQuantity: number;
  isActive: boolean;
  createdAt: string;
}

interface AdminPost {
  id: number;
  title: string;
  content: string;
  postImageUrl?: string;
  type: 'announcement' | 'alert' | 'news' | 'competition_update' | 'maintenance' | 'promotion';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  authorId: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MoodLog {
  id: number;
  userId: number;
  mood: string;
  note?: string;
  loggedAt: string;
}

interface ActivityPost {
  id: number;
  userId: number;
  competitionId: number;
  teamId: number;
  type: string;
  description: string;
  quantity: string;
  evidenceType: string;
  evidenceUrl?: string;
  thumbnailUrl?: string;
  imageUrls: string[];
  points: number;
  isFlagged: boolean;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    avatar?: string;
  };
  team?: {
    id: number;
    name: string;
  };
  competition?: {
    id: number;
    name: string;
  };
  likesCount: number;
  commentsCount: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'competitions' | 'users' | 'activity-types' | 'activity-posts' | 'posts' | 'settings'>('competitions');
  const [isCreateCompetitionOpen, setIsCreateCompetitionOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [pointsAdjustmentUser, setPointsAdjustmentUser] = useState<User | null>(null);
  const [pointsForm, setPointsForm] = useState({ points: '', operation: 'add' as 'add' | 'set' });
  const [suspensionUser, setSuspensionUser] = useState<User | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [viewCheckInsUser, setViewCheckInsUser] = useState<User | null>(null);

  // Session refresh mutation - always define hooks at top level
  const refreshSession = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/refresh-session");
    },
    onSuccess: (userData) => {
      toast({
        title: "Session refreshed",
        description: `Admin status: ${userData.isAdmin ? 'Active' : 'Not active'}`,
      });
      // Invalidate queries to refetch with updated session
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      console.log("Session refresh failed:", error);
      // If session refresh fails, the user needs to log out and back in
      const message = error && typeof error === 'object' && 'message' in error ? (error as any).message : 'Unknown error';
      if (message.includes("Not logged in")) {
        toast({
          title: "Session expired",
          description: "Please log out and log back in to refresh your admin privileges.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to refresh session",
          description: message,
          variant: "destructive"
        });
      }
    }
  });

  // Fetch competitions
  const { data: competitions = [], isLoading: competitionsLoading } = useQuery({
    queryKey: ["/api/competitions"],
    select: (data: Competition[]) => data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    select: (data: User[]) => data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });

  // Fetch activity types
  const { data: activityTypes = [], isLoading: activityTypesLoading } = useQuery({
    queryKey: ["/api/activity-types"],
    select: (data: ActivityType[]) => data.sort((a, b) => a.name.localeCompare(b.name))
  });

  // Fetch admin posts
  const { data: adminPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["/api/admin-posts"],
    select: (data: AdminPost[]) => data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });

  // Fetch mood logs for selected user
  const { data: userMoodLogs = [], isLoading: moodLogsLoading } = useQuery<MoodLog[]>({
    queryKey: ["/api/admin/mood-logs/user", viewCheckInsUser?.id],
    enabled: !!viewCheckInsUser?.id
  });

  // Fetch only flagged activity posts for admin management
  const { data: activityPosts = [], isLoading: activityPostsLoading } = useQuery<(ActivityPost & { flagCount?: number })[]>({
    queryKey: ["/api/activities", "flagged-with-counts"],
    queryFn: async () => {
      const activities = await fetch('/api/activities').then(res => res.json()) as ActivityPost[];
      const flaggedActivities = activities.filter(activity => activity.isFlagged);
      
      // Fetch flag counts for each flagged activity
      const activitiesWithFlags = await Promise.all(
        flaggedActivities.map(async (activity) => {
          const flags = await fetch(`/api/activities/${activity.id}/flags`).then(res => res.json());
          return { ...activity, flagCount: flags.length };
        })
      );
      
      return activitiesWithFlags.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  });

  // Competition form state
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    description: '',
    joinStartDate: '',
    joinEndDate: '',
    startDate: '',
    endDate: '',
    maxTeams: 10,
    requiredActivities: [] as string[],
    targetGoals: [] as string[]
  });

  // Activity type form state
  const [activityTypeForm, setActivityTypeForm] = useState({
    name: '',
    displayName: '',
    description: '',
    measurementUnit: '',
    defaultQuantity: 1,
    isActive: true
  });

  const [editingActivityType, setEditingActivityType] = useState<ActivityType | null>(null);
  const [isCreateActivityTypeOpen, setIsCreateActivityTypeOpen] = useState(false);

  // Admin post form state
  const [adminPostForm, setAdminPostForm] = useState({
    title: '',
    content: '',
    type: 'announcement' as AdminPost['type'],
    priority: 'medium' as AdminPost['priority'],
    isActive: true,
    expiresAt: ''
  });
  
  const [adminPostImage, setAdminPostImage] = useState<File | null>(null);
  const [adminPostImagePreview, setAdminPostImagePreview] = useState<string | null>(null);

  const [editingAdminPost, setEditingAdminPost] = useState<AdminPost | null>(null);
  const [isCreateAdminPostOpen, setIsCreateAdminPostOpen] = useState(false);

  // Create competition mutation
  const createCompetition = useMutation({
    mutationFn: async (data: typeof competitionForm) => {
      return apiRequest("POST", "/api/competitions", {
        ...data,
        createdBy: user?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Competition created successfully",
        description: "The new competition is now live.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      setIsCreateCompetitionOpen(false);
      resetCompetitionForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create competition",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update competition mutation
  const updateCompetition = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Competition> }) => {
      return apiRequest("PATCH", `/api/competitions/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Competition updated",
        description: "Changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      setEditingCompetition(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update competition",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete competition mutation
  const deleteCompetition = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/competitions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Competition deleted",
        description: "The competition has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete competition",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Complete competition mutation
  const completeCompetition = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/competitions/${id}/complete`);
    },
    onSuccess: () => {
      toast({
        title: "Competition completed",
        description: "Rewards have been distributed to winning teams.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to complete competition",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Toggle admin status mutation
  const toggleAdminStatus = useMutation({
    mutationFn: async (data: { userId: number; isAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/users/${data.userId}`, { isAdmin: data.isAdmin });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "Admin status has been changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Adjust user points mutation
  const adjustUserPoints = useMutation({
    mutationFn: async (data: { userId: number; points: number; operation: 'add' | 'set' }) => {
      return apiRequest("POST", `/api/users/${data.userId}/adjust-points`, { 
        points: data.points, 
        operation: data.operation 
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Points updated",
        description: `User points have been ${variables.operation === 'add' ? 'increased' : 'set'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update points",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Suspend/unsuspend user mutation
  const suspendUser = useMutation({
    mutationFn: async (data: { userId: number; isSuspended: boolean; suspensionReason?: string }) => {
      return apiRequest("POST", `/api/users/${data.userId}/suspend`, { 
        isSuspended: data.isSuspended,
        suspensionReason: data.suspensionReason 
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: `User ${variables.isSuspended ? 'suspended' : 'unsuspended'}`,
        description: `User has been ${variables.isSuspended ? 'suspended' : 'reactivated'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSuspensionUser(null);
      setSuspensionReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update suspension status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/users/${userId}`, {
        adminUserId: user?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user and all associated data have been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Activity type mutations
  const createActivityType = useMutation({
    mutationFn: async (data: typeof activityTypeForm) => {
      return apiRequest("POST", "/api/activity-types", data);
    },
    onSuccess: () => {
      toast({
        title: "Activity type created",
        description: "The new activity type is now available.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-types"] });
      setIsCreateActivityTypeOpen(false);
      resetActivityTypeForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create activity type",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateActivityType = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<ActivityType> }) => {
      return apiRequest("PUT", `/api/activity-types/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Activity type updated",
        description: "Changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-types"] });
      setEditingActivityType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update activity type",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteActivityType = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/activity-types/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity type deleted",
        description: "The activity type has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-types"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete activity type",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetCompetitionForm = () => {
    setCompetitionForm({
      name: '',
      description: '',
      joinStartDate: '',
      joinEndDate: '',
      startDate: '',
      endDate: '',
      maxTeams: 10,
      requiredActivities: [],
      targetGoals: []
    });
  };

  const resetActivityTypeForm = () => {
    setActivityTypeForm({
      name: '',
      displayName: '',
      description: '',
      measurementUnit: '',
      defaultQuantity: 1,
      isActive: true
    });
  };

  // Admin post mutations
  const createAdminPost = useMutation({
    mutationFn: async (data: typeof adminPostForm) => {
      return apiRequest("POST", "/api/admin-posts", data);
    },
    onSuccess: () => {
      toast({
        title: "Admin post created successfully",
        description: "The new post is now active.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts/active"] });
      setIsCreateAdminPostOpen(false);
      resetAdminPostForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create admin post",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateAdminPost = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<AdminPost> }) => {
      return apiRequest("PATCH", `/api/admin-posts/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Admin post updated",
        description: "Changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts/active"] });
      setEditingAdminPost(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update admin post",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteAdminPost = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin-posts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Admin post deleted",
        description: "The post has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-posts/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete admin post",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Activity post deletion mutation
  const deleteActivityPost = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/activities/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity deleted successfully",
        description: "Points have been deducted from user and team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete activity",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetAdminPostForm = () => {
    setAdminPostForm({
      title: '',
      content: '',
      type: 'announcement',
      priority: 'medium',
      isActive: true,
      expiresAt: ''
    });
    setAdminPostImage(null);
    setAdminPostImagePreview(null);
  };

  const handleAdminPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl: string | null = null;
    
    // Upload image if provided
    if (adminPostImage) {
      const formData = new FormData();
      formData.append('image', adminPostImage);
      
      try {
        const response = await fetch('/api/admin-posts/upload-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        
        const uploadResponse = await response.json();
        imageUrl = uploadResponse.imageUrl;
      } catch (error: any) {
        toast({
          title: "Failed to upload image",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
    }
    
    const postData = {
      ...adminPostForm,
      ...(imageUrl && { postImageUrl: imageUrl })
    };
    
    if (editingAdminPost) {
      updateAdminPost.mutate({
        id: editingAdminPost.id,
        updates: postData
      });
    } else {
      createAdminPost.mutate(postData);
    }
  };

  const handleEditAdminPost = (post: AdminPost) => {
    setEditingAdminPost(post);
    setAdminPostForm({
      title: post.title,
      content: post.content,
      type: post.type,
      priority: post.priority,
      isActive: post.isActive,
      expiresAt: post.expiresAt ? format(new Date(post.expiresAt), 'yyyy-MM-dd') : ''
    });
    setAdminPostImage(null);
    setAdminPostImagePreview(null);
    setIsCreateAdminPostOpen(true);
  };

  const handleActivityTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingActivityType) {
      updateActivityType.mutate({
        id: editingActivityType.id,
        updates: activityTypeForm
      });
    } else {
      createActivityType.mutate(activityTypeForm);
    }
  };

  const handleEditActivityType = (activityType: ActivityType) => {
    setEditingActivityType(activityType);
    setActivityTypeForm({
      name: activityType.name,
      displayName: activityType.displayName,
      description: activityType.description || '',
      measurementUnit: activityType.measurementUnit,
      defaultQuantity: activityType.defaultQuantity,
      isActive: activityType.isActive
    });
    setIsCreateActivityTypeOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one activity is selected
    if (competitionForm.requiredActivities.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one required activity.",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure maxTeams is a valid number
    const formData = {
      ...competitionForm,
      maxTeams: typeof competitionForm.maxTeams === 'string' ? 10 : Number(competitionForm.maxTeams)
    };
    
    if (editingCompetition) {
      updateCompetition.mutate({
        id: editingCompetition.id,
        updates: formData
      });
    } else {
      createCompetition.mutate(formData);
    }
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setCompetitionForm({
      name: competition.name,
      description: competition.description || '',
      joinStartDate: competition.joinStartDate ? format(new Date(competition.joinStartDate), 'yyyy-MM-dd') : '',
      joinEndDate: competition.joinEndDate ? format(new Date(competition.joinEndDate), 'yyyy-MM-dd') : '',
      startDate: competition.startDate ? format(new Date(competition.startDate), 'yyyy-MM-dd') : '',
      endDate: competition.endDate ? format(new Date(competition.endDate), 'yyyy-MM-dd') : '',
      maxTeams: competition.maxTeams,
      requiredActivities: competition.requiredActivities || [],
      targetGoals: competition.targetGoals || []
    });
    setIsCreateCompetitionOpen(true);
  };

  // Check if user is admin - after all hooks are defined
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-tactical-dark flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-400">Access Denied</CardTitle>
            <CardDescription>You don't have administrative privileges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => refreshSession.mutate()}
              disabled={refreshSession.isPending}
              className="w-full bg-military-green hover:bg-military-green-light"
            >
              {refreshSession.isPending ? 'Refreshing...' : 'Refresh Admin Status'}
            </Button>
            <Button onClick={() => navigate("/")} className="w-full" variant="outline">
              Return to Command Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Command Center</h1>
          <p className="text-gray-400">Manage competitions, users, and system settings</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-8">
          <Button
            variant={activeTab === 'competitions' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('competitions')}
            className="flex items-center space-x-2"
          >
            <Trophy className="h-4 w-4" />
            <span>Competitions</span>
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Users</span>
          </Button>
          <Button
            variant={activeTab === 'activity-types' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('activity-types')}
            className="flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Activity Types</span>
          </Button>
          <Button
            variant={activeTab === 'activity-posts' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('activity-posts')}
            className="flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Activity Posts</span>
          </Button>
          <Button
            variant={activeTab === 'posts' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('posts')}
            className="flex items-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Intel Posts</span>
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('settings')}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>

        {/* Competitions Tab */}
        {activeTab === 'competitions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Competition Management</h2>
              <Dialog open={isCreateCompetitionOpen} onOpenChange={setIsCreateCompetitionOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-military-green hover:bg-military-green-light"
                    onClick={() => {
                      setEditingCompetition(null);
                      resetCompetitionForm();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Competition
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-tactical-dark border-tactical-gray max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="competition-dialog-description">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
                    </DialogTitle>
                  </DialogHeader>
                  <div id="competition-dialog-description" className="sr-only">
                    {editingCompetition ? 'Edit existing competition details and settings' : 'Create a new competition with activities and target goals'}
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4 pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-gray-300">Competition Name</Label>
                        <Input
                          id="name"
                          value={competitionForm.name}
                          onChange={(e) => setCompetitionForm(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxTeams" className="text-gray-300">Max Teams</Label>
                        <Input
                          id="maxTeams"
                          type="number"
                          min="1"
                          max="50"
                          value={competitionForm.maxTeams || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setCompetitionForm(prev => ({ ...prev, maxTeams: value }));
                          }}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        value={competitionForm.description}
                        onChange={(e) => setCompetitionForm(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="joinStartDate" className="text-gray-300">Join Window Start</Label>
                        <Input
                          id="joinStartDate"
                          type="date"
                          value={competitionForm.joinStartDate || ''}
                          onChange={(e) => setCompetitionForm(prev => ({ ...prev, joinStartDate: e.target.value }))}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="joinEndDate" className="text-gray-300">Join Window End</Label>
                        <Input
                          id="joinEndDate"
                          type="date"
                          value={competitionForm.joinEndDate || ''}
                          onChange={(e) => setCompetitionForm(prev => ({ ...prev, joinEndDate: e.target.value }))}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-gray-300">Competition Start</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={competitionForm.startDate}
                          onChange={(e) => setCompetitionForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-gray-300">Competition End</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={competitionForm.endDate}
                          onChange={(e) => setCompetitionForm(prev => ({ ...prev, endDate: e.target.value }))}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Activity Selection */}
                    <div className="space-y-4">
                      <Label className="text-gray-300 text-lg font-semibold">Required Activities</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {activityTypes.filter(at => at.isActive).map((activityType) => (
                          <div key={activityType.name} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={activityType.name}
                              checked={competitionForm.requiredActivities.includes(activityType.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCompetitionForm(prev => {
                                    const newActivities = [...prev.requiredActivities, activityType.name];
                                    const newGoals = [...prev.targetGoals];
                                    const defaultValue = activityType.defaultQuantity;
                                    newGoals[newActivities.length - 1] = `${defaultValue} ${activityType.measurementUnit} of ${activityType.displayName.toLowerCase()}`;
                                    return {
                                      ...prev,
                                      requiredActivities: newActivities,
                                      targetGoals: newGoals
                                    };
                                  });
                                } else {
                                  setCompetitionForm(prev => {
                                    const activityIndex = prev.requiredActivities.indexOf(activityType.name);
                                    const newActivities = prev.requiredActivities.filter(a => a !== activityType.name);
                                    const newGoals = prev.targetGoals.filter((_, index) => index !== activityIndex);
                                    return {
                                      ...prev,
                                      requiredActivities: newActivities,
                                      targetGoals: newGoals
                                    };
                                  });
                                }
                              }}
                              className="w-4 h-4 text-military-green bg-tactical-gray-lighter border-tactical-gray rounded focus:ring-military-green"
                            />
                            <Label htmlFor={activityType.name} className="text-gray-300">
                              {activityType.displayName}
                            </Label>
                          </div>
                        ))}
                      </div>
                      
                      {/* Target Goals */}
                      <div className="space-y-3">
                        <Label className="text-gray-300 font-semibold">Target Goals</Label>
                        {competitionForm.requiredActivities.map((activity, index) => {
                          const activityType = activityTypes.find(at => at.name === activity);
                          if (!activityType) return null;
                          
                          return (
                            <div key={activity} className="flex items-center space-x-2">
                              <Label className="text-gray-300 w-32 capitalize">
                                {activityType.displayName}:
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Enter target quantity"
                                value={competitionForm.targetGoals[index]?.split(' ')[0] || ''}
                                onChange={(e) => {
                                  const newGoals = [...competitionForm.targetGoals];
                                  const activityIndex = competitionForm.requiredActivities.indexOf(activity);
                                  newGoals[activityIndex] = `${e.target.value} ${activityType.measurementUnit} of ${activityType.displayName.toLowerCase()}`;
                                  setCompetitionForm(prev => ({
                                    ...prev,
                                    targetGoals: newGoals
                                  }));
                                }}
                                className="bg-tactical-gray-lighter border-tactical-gray text-white flex-1"
                                required
                              />
                              <span className="text-gray-400 text-sm w-20">
                                {activityType.measurementUnit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex space-x-4 pt-4">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                          setIsCreateCompetitionOpen(false);
                          setEditingCompetition(null);
                          resetCompetitionForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCompetition.isPending || updateCompetition.isPending}
                        className="flex-1 bg-military-green hover:bg-military-green-light"
                      >
                        {editingCompetition ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Competitions Table */}
            <Card className="bg-tactical-gray-lighter border-tactical-gray">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-tactical-gray">
                      <TableHead className="text-gray-300">Name</TableHead>
                      <TableHead className="text-gray-300">Duration</TableHead>
                      <TableHead className="text-gray-300">Teams</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitions.map((competition) => (
                      <TableRow key={competition.id} className="border-tactical-gray">
                        <TableCell className="text-white font-medium">{competition.name}</TableCell>
                        <TableCell className="text-gray-300">
                          {format(new Date(competition.startDate), 'MMM d')} - {format(new Date(competition.endDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-gray-300">Max {competition.maxTeams}</TableCell>
                        <TableCell>
                          <Badge variant={competition.isActive ? 'default' : 'secondary'}>
                            {competition.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(competition)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {!competition.isCompleted && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => completeCompetition.mutate(competition.id)}
                                className="h-8 w-8 p-0 text-yellow-400 hover:text-yellow-300"
                                disabled={completeCompetition.isPending}
                              >
                                <Trophy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCompetition.mutate(competition.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">User Management</h2>
            
            <Card className="bg-tactical-gray-lighter border-tactical-gray">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-tactical-gray">
                      <TableHead className="text-gray-300">Username</TableHead>
                      <TableHead className="text-gray-300">Email</TableHead>
                      <TableHead className="text-gray-300">Points</TableHead>
                      <TableHead className="text-gray-300">Competitions</TableHead>
                      <TableHead className="text-gray-300">Admin</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                      <TableHead className="text-gray-300">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="border-tactical-gray">
                        <TableCell className="text-white font-medium">{u.username}</TableCell>
                        <TableCell className="text-gray-300">{u.email}</TableCell>
                        <TableCell className="text-gray-300">{u.points}</TableCell>
                        <TableCell className="text-gray-300">{u.competitionsEntered}</TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isAdmin}
                            onCheckedChange={(checked) => toggleAdminStatus.mutate({ userId: u.id, isAdmin: checked })}
                            disabled={u.id === user?.id} // Can't change own admin status
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isSuspended ? 'destructive' : 'default'}>
                            {u.isSuspended ? 'Suspended' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPointsAdjustmentUser(u);
                                setPointsForm({ points: '', operation: 'add' });
                              }}
                              className="h-8 px-2 text-military-green hover:text-military-green-light"
                            >
                              Adjust Points
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewCheckInsUser(u)}
                              className="h-8 px-2 text-blue-400 hover:text-blue-300"
                            >
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Check-ins
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSuspensionUser(u);
                                setSuspensionReason('');
                              }}
                              className="h-8 px-2 text-red-400 hover:text-red-300"
                            >
                              {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                            </Button>
                            {!u.isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteUser(u)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-500"
                                disabled={u.id === user?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Points Adjustment Modal */}
            <Dialog open={!!pointsAdjustmentUser} onOpenChange={() => setPointsAdjustmentUser(null)}>
              <DialogContent className="bg-tactical-dark border-tactical-gray max-w-md" aria-describedby="points-dialog-description">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Adjust Points - {pointsAdjustmentUser?.username}
                  </DialogTitle>
                </DialogHeader>
                <div id="points-dialog-description" className="sr-only">
                  Adjust tactical points for user account management
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (pointsAdjustmentUser && pointsForm.points !== '') {
                    adjustUserPoints.mutate({
                      userId: pointsAdjustmentUser.id,
                      points: parseInt(pointsForm.points) || 0,
                      operation: pointsForm.operation
                    });
                    setPointsAdjustmentUser(null);
                  }
                }} className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Current Points: {pointsAdjustmentUser?.points || 0}</Label>
                  </div>
                  <div>
                    <Label htmlFor="operation" className="text-gray-300">Operation</Label>
                    <select
                      id="operation"
                      value={pointsForm.operation}
                      onChange={(e) => setPointsForm(prev => ({ ...prev, operation: e.target.value as 'add' | 'set' }))}
                      className="w-full p-2 bg-tactical-gray-lighter border border-tactical-gray text-white rounded"
                    >
                      <option value="add">Add Points</option>
                      <option value="set">Set Total Points</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="points" className="text-gray-300">
                      {pointsForm.operation === 'add' ? 'Points to Add' : 'New Total Points'}
                    </Label>
                    <Input
                      id="points"
                      type="number"
                      min="0"
                      value={pointsForm.points}
                      onChange={(e) => setPointsForm(prev => ({ ...prev, points: e.target.value }))}
                      className="bg-tactical-gray-lighter border-tactical-gray text-white"
                      placeholder="Enter points amount"
                      required
                    />
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="submit"
                      className="bg-military-green hover:bg-military-green-light flex-1"
                      disabled={adjustUserPoints.isPending}
                    >
                      {pointsForm.operation === 'add' ? 'Add Points' : 'Set Points'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPointsAdjustmentUser(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Suspension Modal */}
            <Dialog open={!!suspensionUser} onOpenChange={() => setSuspensionUser(null)}>
              <DialogContent className="bg-tactical-dark border-tactical-gray max-w-md" aria-describedby="suspension-dialog-description">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {suspensionUser?.isSuspended ? 'Unsuspend' : 'Suspend'} User - {suspensionUser?.username}
                  </DialogTitle>
                </DialogHeader>
                <div id="suspension-dialog-description" className="sr-only">
                  Manage user suspension status for account moderation
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (suspensionUser) {
                    suspendUser.mutate({
                      userId: suspensionUser.id,
                      isSuspended: !suspensionUser.isSuspended,
                      suspensionReason: !suspensionUser.isSuspended ? suspensionReason : undefined
                    });
                  }
                }} className="space-y-4">
                  {!suspensionUser?.isSuspended && (
                    <div>
                      <Label htmlFor="suspensionReason" className="text-gray-300">
                        Suspension Reason (Optional)
                      </Label>
                      <Textarea
                        id="suspensionReason"
                        value={suspensionReason}
                        onChange={(e) => setSuspensionReason(e.target.value)}
                        placeholder="Enter reason for suspension..."
                        className="bg-tactical-gray-lighter border-tactical-gray text-white mt-2"
                        rows={3}
                      />
                    </div>
                  )}
                  
                  {suspensionUser?.isSuspended && suspensionUser.suspensionReason && (
                    <div>
                      <Label className="text-gray-300">Current Suspension Reason:</Label>
                      <p className="text-gray-400 mt-1 p-2 bg-tactical-gray-lighter rounded border border-tactical-gray">
                        {suspensionUser.suspensionReason}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-4 pt-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setSuspensionUser(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={suspendUser.isPending}
                      variant={suspensionUser?.isSuspended ? "default" : "destructive"}
                      className="flex-1"
                    >
                      {suspensionUser?.isSuspended ? 'Unsuspend' : 'Suspend'} User
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete User Confirmation Modal */}
            <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
              <DialogContent className="bg-tactical-dark border-tactical-gray max-w-md" aria-describedby="delete-user-dialog-description">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>Delete User - {deleteUser?.username}</span>
                  </DialogTitle>
                </DialogHeader>
                <div id="delete-user-dialog-description" className="sr-only">
                  Permanently delete user account and all associated data
                </div>
                <div className="space-y-4">
                  <div className="bg-red-950/50 border border-red-800 rounded-lg p-4">
                    <p className="text-red-200 text-sm">
                      <strong>Warning:</strong> This action is permanent and cannot be undone. 
                      All user data, activities, and associated content will be permanently deleted.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-gray-300 text-sm">User Details:</p>
                    <div className="bg-tactical-gray-lighter rounded p-3 space-y-1">
                      <p className="text-white"><strong>Username:</strong> {deleteUser?.username}</p>
                      <p className="text-gray-300"><strong>Email:</strong> {deleteUser?.email}</p>
                      <p className="text-gray-300"><strong>Points:</strong> {deleteUser?.points}</p>
                      <p className="text-gray-300"><strong>Competitions:</strong> {deleteUser?.competitionsEntered}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4 pt-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setDeleteUser(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => deleteUser && deleteUserMutation.mutate(deleteUser.id)}
                      disabled={deleteUserMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* View Check-ins Modal */}
            <Dialog open={!!viewCheckInsUser} onOpenChange={() => setViewCheckInsUser(null)}>
              <DialogContent className="bg-tactical-dark border-tactical-gray max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="checkins-dialog-description">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    <span>Daily Check-ins - {viewCheckInsUser?.username}</span>
                  </DialogTitle>
                </DialogHeader>
                <div id="checkins-dialog-description" className="sr-only">
                  View user's daily wellness check-in history and mood tracking
                </div>
                <div className="space-y-4">
                  {moodLogsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-gray-400">Loading check-ins...</div>
                    </div>
                  ) : userMoodLogs.length === 0 ? (
                    <div className="text-center p-8">
                      <div className="text-gray-400 mb-2">No daily check-ins found</div>
                      <div className="text-gray-500 text-sm">This user hasn't completed any daily wellness check-ins yet.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Check-in History</h3>
                        <div className="text-sm text-gray-400">{userMoodLogs.length} total check-ins</div>
                      </div>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {userMoodLogs.map((log: MoodLog) => (
                          <div key={log.id} className="bg-tactical-gray-lighter border border-tactical-gray rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Badge 
                                    variant={
                                      log.mood === 'excellent' ? 'default' : 
                                      log.mood === 'good' ? 'default' : 
                                      log.mood === 'okay' ? 'secondary' : 
                                      'destructive'
                                    }
                                    className={
                                      log.mood === 'excellent' ? 'bg-green-600 hover:bg-green-700' :
                                      log.mood === 'good' ? 'bg-blue-600 hover:bg-blue-700' :
                                      log.mood === 'okay' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                      log.mood === 'stressed' ? 'bg-orange-600 hover:bg-orange-700' :
                                      'bg-red-600 hover:bg-red-700'
                                    }
                                  >
                                    {log.mood.charAt(0).toUpperCase() + log.mood.slice(1)}
                                  </Badge>
                                  <span className="text-sm text-gray-400">
                                    {format(new Date(log.loggedAt), 'MMM d, yyyy h:mm a')}
                                  </span>
                                </div>
                                {log.note && (
                                  <p className="text-gray-300 text-sm bg-tactical-gray rounded p-2 mt-2">
                                    "{log.note}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setViewCheckInsUser(null)}
                      className="bg-military-green hover:bg-military-green-light"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Activity Types Tab */}
        {activeTab === 'activity-types' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Activity Types Management</h2>
              <Dialog open={isCreateActivityTypeOpen} onOpenChange={setIsCreateActivityTypeOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-military-green hover:bg-military-green-light"
                    onClick={() => {
                      setEditingActivityType(null);
                      resetActivityTypeForm();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Activity Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-tactical-dark border-tactical-gray max-w-md" aria-describedby="activity-type-dialog-description">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingActivityType ? 'Edit Activity Type' : 'Create New Activity Type'}
                    </DialogTitle>
                  </DialogHeader>
                  <div id="activity-type-dialog-description" className="sr-only">
                    {editingActivityType ? 'Edit existing activity type settings and measurement units' : 'Create a new activity type with custom measurement units'}
                  </div>
                  <form onSubmit={handleActivityTypeSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-300">Activity Name (System Key)</Label>
                      <Input
                        id="name"
                        value={activityTypeForm.name}
                        onChange={(e) => setActivityTypeForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        placeholder="e.g., cardio, strength, flexibility"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                      <Input
                        id="displayName"
                        value={activityTypeForm.displayName}
                        onChange={(e) => setActivityTypeForm(prev => ({ ...prev, displayName: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        placeholder="e.g., Cardio Training, Strength Operations"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        value={activityTypeForm.description}
                        onChange={(e) => setActivityTypeForm(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        placeholder="e.g., Cardiovascular exercises to improve heart health"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="measurementUnit" className="text-gray-300">Measurement Unit</Label>
                      <Input
                        id="measurementUnit"
                        value={activityTypeForm.measurementUnit}
                        onChange={(e) => setActivityTypeForm(prev => ({ ...prev, measurementUnit: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        placeholder="e.g., minutes, reps, sets, miles"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultQuantity" className="text-gray-300">Default Quantity</Label>
                      <Input
                        id="defaultQuantity"
                        type="number"
                        min="1"
                        value={activityTypeForm.defaultQuantity}
                        onChange={(e) => setActivityTypeForm(prev => ({ ...prev, defaultQuantity: parseInt(e.target.value) }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={activityTypeForm.isActive}
                        onChange={(e) => setActivityTypeForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-tactical-gray"
                      />
                      <Label htmlFor="isActive" className="text-gray-300">Active</Label>
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        type="submit"
                        className="bg-military-green hover:bg-military-green-light flex-1"
                        disabled={createActivityType.isPending || updateActivityType.isPending}
                      >
                        {editingActivityType ? 'Update' : 'Create'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateActivityTypeOpen(false);
                          setEditingActivityType(null);
                          resetActivityTypeForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-tactical-gray-lighter border-tactical-gray">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-tactical-gray">
                      <TableHead className="text-gray-300">Name</TableHead>
                      <TableHead className="text-gray-300">Display Name</TableHead>
                      <TableHead className="text-gray-300">Unit</TableHead>
                      <TableHead className="text-gray-300">Default</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityTypes.map((activityType) => (
                      <TableRow key={activityType.id} className="border-tactical-gray">
                        <TableCell className="text-white font-medium">{activityType.name}</TableCell>
                        <TableCell className="text-gray-300">{activityType.displayName}</TableCell>
                        <TableCell className="text-gray-300">{activityType.measurementUnit}</TableCell>
                        <TableCell className="text-gray-300">{activityType.defaultQuantity}</TableCell>
                        <TableCell>
                          <Badge variant={activityType.isActive ? "default" : "secondary"}>
                            {activityType.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditActivityType(activityType)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteActivityType.mutate(activityType.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Intel Posts Management</h2>
              <Dialog open={isCreateAdminPostOpen} onOpenChange={setIsCreateAdminPostOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-military-green hover:bg-military-green-light"
                    onClick={() => {
                      setEditingAdminPost(null);
                      resetAdminPostForm();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Intel Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-tactical-dark border-tactical-gray max-w-2xl" aria-describedby="admin-post-dialog-description">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingAdminPost ? 'Edit Intel Post' : 'Create New Intel Post'}
                    </DialogTitle>
                  </DialogHeader>
                  <div id="admin-post-dialog-description" className="sr-only">
                    {editingAdminPost ? 'Edit existing admin announcement post' : 'Create a new admin announcement for the Intel Feed'}
                  </div>
                  <form onSubmit={handleAdminPostSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <Label htmlFor="title" className="text-gray-300">Post Title</Label>
                      <Input
                        id="title"
                        value={adminPostForm.title}
                        onChange={(e) => setAdminPostForm(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                        placeholder="Enter post title..."
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="content" className="text-gray-300">Post Content</Label>
                      <Textarea
                        id="content"
                        value={adminPostForm.content}
                        onChange={(e) => setAdminPostForm(prev => ({ ...prev, content: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white min-h-[120px]"
                        placeholder="Enter post content..."
                        required
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <Label htmlFor="postImage" className="text-gray-300">Post Image (Optional)</Label>
                      <div className="space-y-2">
                        <Input
                          id="postImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAdminPostImage(file);
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setAdminPostImagePreview(e.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="bg-tactical-gray-lighter border-tactical-gray text-white file:bg-military-green file:text-white file:border-0 file:rounded-md file:px-3 file:py-1"
                        />
                        {adminPostImagePreview && (
                          <div className="relative">
                            <img 
                              src={adminPostImagePreview} 
                              alt="Preview" 
                              className="w-full max-w-xs h-32 object-cover rounded-md border border-tactical-gray"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAdminPostImage(null);
                                setAdminPostImagePreview(null);
                              }}
                              className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type" className="text-gray-300">Post Type</Label>
                        <select
                          id="type"
                          value={adminPostForm.type}
                          onChange={(e) => setAdminPostForm(prev => ({ ...prev, type: e.target.value as AdminPost['type'] }))}
                          className="w-full px-3 py-2 bg-tactical-gray-lighter border border-tactical-gray text-white rounded-md focus:outline-none focus:ring-2 focus:ring-military-green"
                        >
                          <option value="announcement">📢 Announcement</option>
                          <option value="alert">⚠️ Alert</option>
                          <option value="news">📰 News</option>
                          <option value="competition_update">🏆 Competition Update</option>
                          <option value="maintenance">🔧 Maintenance</option>
                          <option value="promotion">🎉 Promotion</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="priority" className="text-gray-300">Priority Level</Label>
                        <select
                          id="priority"
                          value={adminPostForm.priority}
                          onChange={(e) => setAdminPostForm(prev => ({ ...prev, priority: e.target.value as AdminPost['priority'] }))}
                          className="w-full px-3 py-2 bg-tactical-gray-lighter border border-tactical-gray text-white rounded-md focus:outline-none focus:ring-2 focus:ring-military-green"
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🟠 High</option>
                          <option value="urgent">🔴 Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="expiresAt" className="text-gray-300">Expiration Date (Optional)</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={adminPostForm.expiresAt}
                        onChange={(e) => setAdminPostForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                        className="bg-tactical-gray-lighter border-tactical-gray text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty for posts that never expire</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={adminPostForm.isActive}
                        onCheckedChange={(checked) => setAdminPostForm(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive" className="text-gray-300">Post is Active</Label>
                    </div>

                    <div className="flex space-x-4 pt-4">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setIsCreateAdminPostOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createAdminPost.isPending || updateAdminPost.isPending}
                        className="flex-1 bg-military-green hover:bg-military-green-light"
                      >
                        {createAdminPost.isPending || updateAdminPost.isPending ? 'Saving...' : (editingAdminPost ? 'Update Post' : 'Create Post')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Admin Posts Table */}
            <Card className="bg-tactical-gray border-tactical-gray-light">
              <CardHeader>
                <CardTitle className="text-white">Intel Posts</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage announcement posts for the Intel Feed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Loading posts...</div>
                  </div>
                ) : adminPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">No admin posts created yet</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-tactical-gray hover:bg-tactical-gray-lighter">
                        <TableHead className="text-gray-300">Title</TableHead>
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300">Priority</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Created</TableHead>
                        <TableHead className="text-gray-300">Expires</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminPosts.map((post) => (
                        <TableRow key={post.id} className="border-tactical-gray hover:bg-tactical-gray-lighter">
                          <TableCell className="text-white font-medium">{post.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {post.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={post.priority === 'urgent' ? 'destructive' : 
                                     post.priority === 'high' ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {post.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={post.isActive ? 'default' : 'secondary'} className="text-xs">
                              {post.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {format(new Date(post.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {post.expiresAt ? format(new Date(post.expiresAt), 'MMM d, yyyy') : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditAdminPost(post)}
                                className="h-8 w-8 p-0 hover:bg-tactical-gray-lighter"
                              >
                                <Edit2 className="h-4 w-4 text-gray-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteAdminPost.mutate(post.id)}
                                disabled={deleteAdminPost.isPending}
                                className="h-8 w-8 p-0 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Posts Tab */}
        {activeTab === 'activity-posts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Flagged Activity Posts</h2>
              <div className="text-gray-400 text-sm">
                Manage flagged activities - removal automatically deducts points
              </div>
            </div>

            {/* Activity Posts Table */}
            <Card className="bg-tactical-gray border-tactical-gray-light">
              <CardHeader>
                <CardTitle className="text-white">Flagged Activity Submissions</CardTitle>
                <CardDescription className="text-gray-400">
                  Review and manage flagged activities. Deleting activities will automatically reduce points from users and teams.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityPostsLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Loading activities...</div>
                  </div>
                ) : activityPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">No flagged activities found</div>
                    <div className="text-gray-500 text-sm mt-2">Activities appear here when users flag them for review</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-tactical-gray hover:bg-tactical-gray-lighter">
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Activity</TableHead>
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300">Quantity</TableHead>
                        <TableHead className="text-gray-300">Points</TableHead>
                        <TableHead className="text-gray-300">Team</TableHead>
                        <TableHead className="text-gray-300">Flag Count</TableHead>
                        <TableHead className="text-gray-300">Created</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityPosts.map((activity) => (
                        <TableRow key={activity.id} className="border-tactical-gray hover:bg-tactical-gray-lighter">
                          <TableCell className="text-white font-medium">
                            {activity.user?.username || `User ${activity.userId}`}
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-xs truncate">
                            {activity.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-gray-500 text-white">
                              {activity.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {activity.quantity || '-'}
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            {activity.points}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {activity.team?.name || `Team ${activity.teamId}`}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="destructive" 
                              className="text-xs bg-red-600/20 text-red-300 border-red-500/30 font-semibold"
                            >
                              {activity.flagCount || 0} flags
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(`/activity-feed#activity-${activity.id}`, '_blank')}
                                className="h-8 w-8 p-0 hover:bg-blue-900/20"
                                title="View full activity post"
                              >
                                <Eye className="h-4 w-4 text-blue-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Delete this activity? This will deduct ${activity.points} points from the user and team. This action cannot be undone.`)) {
                                    deleteActivityPost.mutate(activity.id);
                                  }
                                }}
                                disabled={deleteActivityPost.isPending}
                                className="h-8 w-8 p-0 hover:bg-red-900/20"
                                title="Delete activity and deduct points"
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">System Settings</h2>
            <Card className="bg-tactical-gray-lighter border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white">System Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure global system settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Settings panel coming soon...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}