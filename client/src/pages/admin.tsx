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
import { Plus, Edit2, Trash2, Users, Trophy, Calendar, Settings, X, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Competition {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxTeams: number;
  isActive: boolean;
  requiredActivities: string[];
  targetGoals: string[];
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  points: number;
  isAdmin: boolean;
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

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'competitions' | 'users' | 'activities' | 'settings'>('competitions');
  const [isCreateCompetitionOpen, setIsCreateCompetitionOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-tactical-dark flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-400">Access Denied</CardTitle>
            <CardDescription>You don't have administrative privileges.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Return to Command Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Competition form state
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    maxTeams: 10,
    requiredActivities: [],
    targetGoals: []
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
      maxTeams: competitionForm.maxTeams === '' ? 10 : Number(competitionForm.maxTeams)
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
      startDate: competition.startDate ? format(new Date(competition.startDate), 'yyyy-MM-dd') : '',
      endDate: competition.endDate ? format(new Date(competition.endDate), 'yyyy-MM-dd') : '',
      maxTeams: competition.maxTeams,
      requiredActivities: competition.requiredActivities || [],
      targetGoals: competition.targetGoals || []
    });
    setIsCreateCompetitionOpen(true);
  };

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
            variant={activeTab === 'activities' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('activities')}
            className="flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Activity Types</span>
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
                            const value = e.target.value === '' ? '' : parseInt(e.target.value);
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
                        <Label htmlFor="startDate" className="text-gray-300">Start Date</Label>
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
                        <Label htmlFor="endDate" className="text-gray-300">End Date</Label>
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
                        <TableCell className="text-gray-300">
                          {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Types Tab */}
        {activeTab === 'activities' && (
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