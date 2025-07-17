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
import { Plus, Edit2, Trash2, Users, Trophy, Calendar, Settings } from "lucide-react";
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

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'competitions' | 'users' | 'settings'>('competitions');
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

  // Competition form state
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    maxTeams: 10,
    requiredActivities: ['cardio', 'strength', 'flexibility'],
    targetGoals: ['1500 minutes of cardio', '5000 reps of strength', '1000 minutes of flexibility']
  });

  // Create competition mutation
  const createCompetition = useMutation({
    mutationFn: async (data: typeof competitionForm) => {
      return apiRequest("/api/competitions", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          createdBy: user?.id
        })
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
      return apiRequest(`/api/competitions/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.updates)
      });
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
      return apiRequest(`/api/competitions/${id}`, {
        method: "DELETE"
      });
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
      return apiRequest(`/api/users/${data.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ isAdmin: data.isAdmin })
      });
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

  const resetCompetitionForm = () => {
    setCompetitionForm({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      maxTeams: 10,
      requiredActivities: ['cardio', 'strength', 'flexibility'],
      targetGoals: ['1500 minutes of cardio', '5000 reps of strength', '1000 minutes of flexibility']
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompetition) {
      updateCompetition.mutate({
        id: editingCompetition.id,
        updates: competitionForm
      });
    } else {
      createCompetition.mutate(competitionForm);
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
      requiredActivities: competition.requiredActivities || ['cardio', 'strength', 'flexibility'],
      targetGoals: competition.targetGoals || ['1500 minutes of cardio', '5000 reps of strength', '1000 minutes of flexibility']
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
                  <Button className="bg-military-green hover:bg-military-green-light">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Competition
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-tactical-dark border-tactical-gray max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                          value={competitionForm.maxTeams}
                          onChange={(e) => setCompetitionForm(prev => ({ ...prev, maxTeams: parseInt(e.target.value) }))}
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