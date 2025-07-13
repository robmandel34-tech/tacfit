import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, X, Edit2, Check, Trash2, Calendar, ChevronDown, ChevronUp, Clipboard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MissionTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToUsername: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
  completed: boolean;
  teamId: number;
}

interface MissionPlanningBoardProps {
  teamId: number;
  teamMembers: any[];
}

export default function MissionPlanningBoard({ teamId, teamMembers }: MissionPlanningBoardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Check if current user can complete a task (assigned user or team captain)
  const canCompleteTask = (task: MissionTask) => {
    if (!user) return false;
    
    // Check if user is assigned to the task
    if (task.assignedTo === user.id.toString()) return true;
    
    // Check if user is team captain
    const currentUserMember = teamMembers.find(m => m.user?.id === user.id);
    return currentUserMember?.role === 'captain';
  };
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
  });
  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
  });

  // Get mission tasks
  const { data: tasks = [] } = useQuery({
    queryKey: [`/api/mission-tasks/team/${teamId}`],
    enabled: !!teamId,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<MissionTask, 'id'>) => {
      const response = await fetch('/api/mission-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "Mission task has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/team/${teamId}`] });
      setIsAddingTask(false);
      setNewTask({ title: '', description: '', assignedTo: '', dueDate: '' });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; assignedTo?: string; status?: string }) => {
      const response = await fetch(`/api/mission-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "Mission task has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/team/${teamId}`] });
      setEditingTaskId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/mission-tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "Mission task has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/team/${teamId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const response = await fetch(`/api/mission-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, status: completed ? 'completed' : 'pending' }),
      });
      if (!response.ok) throw new Error('Failed to update task completion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/team/${teamId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task completion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim() || !newTask.assignedTo) return;
    
    const assignedMember = teamMembers.find(m => m.user?.id?.toString() === newTask.assignedTo);
    
    createTaskMutation.mutate({
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo,
      assignedToUsername: assignedMember?.user?.username || 'Unknown',
      status: 'pending',
      dueDate: newTask.dueDate || undefined,
      completed: false,
      teamId,
    });
  };

  const handleUpdateTask = (taskId: string) => {
    if (!editTask.title.trim() || !editTask.assignedTo) return;
    
    const assignedMember = teamMembers.find(m => m.user?.id?.toString() === editTask.assignedTo);
    
    updateTaskMutation.mutate({
      id: taskId,
      title: editTask.title,
      description: editTask.description,
      assignedTo: editTask.assignedTo,
      assignedToUsername: assignedMember?.user?.username || 'Unknown',
      dueDate: editTask.dueDate || undefined,
    });
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      status: newStatus,
    });
  };

  const startEditing = (task: MissionTask) => {
    setEditingTaskId(task.id);
    setEditTask({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-military-green';
      case 'in-progress': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      default: return 'Pending';
    }
  };

  return (
    <Card className="bg-tactical-gray-light border-tactical-gray text-white">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-tactical-gray-lighter transition-colors">
            <CardTitle className="flex items-center justify-between text-lg text-white">
              <div className="flex items-center space-x-2">
                <Clipboard className="w-5 h-5" />
                <span>Mission Planning Board</span>
              </div>
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              <div className="flex justify-start">
                <Button
                  onClick={() => setIsAddingTask(true)}
                  className="bg-military-green hover:bg-military-green-dark text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
              
              {/* Add Task Form */}
              {isAddingTask && (
                <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Create New Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Select
                  value={newTask.assignedTo}
                  onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Assign to team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user?.id} value={member.user?.id?.toString()}>
                        {member.user?.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Due date (optional)"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCreateTask}
                    className="bg-military-green hover:bg-military-green-dark text-white"
                    size="sm"
                    disabled={createTaskMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingTask(false);
                      setNewTask({ title: '', description: '', assignedTo: '', dueDate: '' });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
                </Card>
              )}

              {/* Task List */}
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No tasks assigned yet</p>
                    <p className="text-sm">Create your first mission task to get started</p>
                  </div>
                ) : (
                  tasks.map((task: MissionTask) => (
              <Card key={task.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
              {editingTaskId === task.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-white border-gray-600">
                        TASK
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={teamMembers.find(m => m.user?.id?.toString() === editTask.assignedTo)?.user?.avatar ? `/uploads/${teamMembers.find(m => m.user?.id?.toString() === editTask.assignedTo)?.user?.avatar}` : undefined} />
                          <AvatarFallback className="bg-military-green text-white text-xs">
                            {teamMembers.find(m => m.user?.id?.toString() === editTask.assignedTo)?.user?.username?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Select
                          value={editTask.assignedTo}
                          onValueChange={(value) => setEditTask({ ...editTask, assignedTo: value })}
                        >
                          <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.user?.id} value={member.user?.id?.toString()}>
                                {member.user?.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleUpdateTask(task.id)}
                        size="sm"
                        className="bg-military-green hover:bg-military-green-dark text-white"
                        disabled={updateTaskMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingTaskId(null)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={editTask.title}
                    onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white font-medium"
                  />
                  <Input
                    value={editTask.description}
                    onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={editTask.dueDate}
                      onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Due date (optional)"
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={task.completed}
                        disabled={!canCompleteTask(task)}
                        onCheckedChange={(checked) => 
                          toggleCompletionMutation.mutate({ id: task.id, completed: !!checked })
                        }
                        className="data-[state=checked]:bg-military-green data-[state=checked]:border-military-green disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center space-x-0.5">
                        <Badge variant="outline" className="text-white border-gray-600">
                          TASK
                        </Badge>
                        <Button
                          onClick={() => startEditing(task)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-slate-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={teamMembers.find(m => m.user?.id?.toString() === task.assignedTo)?.user?.avatar ? `/uploads/${teamMembers.find(m => m.user?.id?.toString() === task.assignedTo)?.user?.avatar}` : undefined} />
                        <AvatarFallback className="bg-military-green text-white text-xs">
                          {task.assignedToUsername?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-gray-300 text-sm">{task.assignedToUsername}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <h4 className={`text-white font-medium ${task.completed ? 'line-through opacity-75' : ''}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className={`text-gray-300 text-sm mt-1 ${task.completed ? 'line-through opacity-75' : ''}`}>
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                        <span className="text-gray-400 text-sm">{getStatusText(task.status)}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-400 text-sm">
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-slate-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
                  </CardContent>
                    </Card>
                    ))
                  )}
                </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}