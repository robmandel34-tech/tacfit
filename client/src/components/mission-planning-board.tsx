import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, X, Edit2, Check, Trash2, Calendar, ChevronDown, ChevronUp, Clipboard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { uploadUrl, API_BASE } from "@/lib/queryClient";

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
  const [isCollapsed, setIsCollapsed] = useState(true);
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
      const response = await fetch(`${API_BASE}/api/mission-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      // Also invalidate pending tasks for the assigned user to update notification badge
      if (newTask.assignedTo) {
        queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/user/${newTask.assignedTo}/pending`] });
      }
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
      const response = await fetch(`${API_BASE}/api/mission-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      // Invalidate pending tasks for all team members to update notification badges
      teamMembers.forEach(member => {
        if (member.user?.id) {
          queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/user/${member.user.id}/pending`] });
        }
      });
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
      const response = await fetch(`${API_BASE}/api/mission-tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
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
      // Invalidate pending tasks for all team members to update notification badges
      teamMembers.forEach(member => {
        if (member.user?.id) {
          queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/user/${member.user.id}/pending`] });
        }
      });
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
      const response = await fetch(`${API_BASE}/api/mission-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed, status: completed ? 'completed' : 'pending' }),
      });
      if (!response.ok) throw new Error('Failed to update task completion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/team/${teamId}`] });
      // Invalidate pending tasks for all team members to update notification badges
      teamMembers.forEach(member => {
        if (member.user?.id) {
          queryClient.invalidateQueries({ queryKey: [`/api/mission-tasks/user/${member.user.id}/pending`] });
        }
      });
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

  const startEditing = (task: MissionTask) => {
    setEditingTaskId(task.id);
    setEditTask({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Completed', className: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/30' };
      case 'in-progress':
        return { text: 'In Progress', className: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' };
      default:
        return { text: 'Pending', className: 'bg-white/10 text-gray-300 ring-1 ring-white/15' };
    }
  };

  // Parse a due date in the user's LOCAL timezone. "YYYY-MM-DD" strings are
  // otherwise parsed as UTC midnight, which flags tasks overdue a day early
  // for users west of UTC.
  const parseDueDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Date(value);
  };

  const isOverdue = (task: MissionTask) =>
    !!task.dueDate && !task.completed && parseDueDate(task.dueDate) < new Date(new Date().toDateString());

  const completedCount = (tasks as MissionTask[]).filter((t) => t.completed).length;

  const inputStyles =
    "rounded-lg border-white/10 bg-black/30 text-white placeholder-gray-500 focus-visible:ring-green-600";

  return (
    <Card className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-xl text-white overflow-hidden">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors py-4">
            <CardTitle className="flex items-center justify-between text-lg text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-700 to-green-900 ring-1 ring-green-500/40">
                  <Clipboard className="w-5 h-5 text-green-300" />
                </span>
                <span className="font-semibold tracking-wide">Mission Planning Board</span>
                {(tasks as MissionTask[]).length > 0 && (
                  <span
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-gray-300 ring-1 ring-white/15"
                    data-testid="badge-task-progress"
                  >
                    {completedCount}/{(tasks as MissionTask[]).length} done
                  </span>
                )}
              </div>
              {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4 border-t border-white/10 pt-4">
              {!isAddingTask && (
                <Button
                  onClick={() => setIsAddingTask(true)}
                  className="rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white shadow-md hover:from-green-500 hover:to-green-700"
                  size="sm"
                  data-testid="button-add-task"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Mission Task
                </Button>
              )}
              
              {/* Add Task Form */}
              {isAddingTask && (
                <div className="rounded-xl border border-green-500/20 bg-black/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-400">
                    New Mission Task
                  </p>
                  <div className="space-y-3">
                    <Input
                      placeholder="Task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className={inputStyles}
                      data-testid="input-task-title"
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className={inputStyles}
                    />
                    <Select
                      value={newTask.assignedTo}
                      onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
                    >
                      <SelectTrigger className={inputStyles}>
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
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                      <Input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className={inputStyles}
                        placeholder="Due date (optional)"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={handleCreateTask}
                        className="rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white shadow-md hover:from-green-500 hover:to-green-700"
                        size="sm"
                        disabled={createTaskMutation.isPending || !newTask.title.trim() || !newTask.assignedTo}
                        data-testid="button-create-task"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAddingTask(false);
                          setNewTask({ title: '', description: '', assignedTo: '', dueDate: '' });
                        }}
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Task List */}
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                      <Clipboard className="h-6 w-6 text-green-400" />
                    </span>
                    <p className="text-gray-300 font-medium">No missions on the board</p>
                    <p className="text-sm text-gray-500">Create the first task to rally your squad.</p>
                  </div>
                ) : (
                  tasks.map((task: MissionTask) => (
              <Card
                key={task.id}
                className={`rounded-xl border bg-black/30 transition-colors ${
                  task.completed
                    ? "border-white/5 opacity-60"
                    : "border-white/10 hover:border-green-500/30"
                }`}
                data-testid={`task-card-${task.id}`}
              >
                <CardContent className="p-4">
              {editingTaskId === task.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={uploadUrl(teamMembers.find(m => m.user?.id?.toString() === editTask.assignedTo)?.user?.avatar)} />
                        <AvatarFallback className="bg-green-900 text-green-300 text-[10px] font-bold">
                          {teamMembers.find(m => m.user?.id?.toString() === editTask.assignedTo)?.user?.username?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Select
                        value={editTask.assignedTo}
                        onValueChange={(value) => setEditTask({ ...editTask, assignedTo: value })}
                      >
                        <SelectTrigger className={`w-40 ${inputStyles}`}>
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
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleUpdateTask(task.id)}
                        size="icon"
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white hover:from-green-500 hover:to-green-700"
                        disabled={updateTaskMutation.isPending}
                        aria-label="Save task"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingTaskId(null)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={editTask.title}
                    onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                    className={`${inputStyles} font-medium`}
                  />
                  <Input
                    value={editTask.description}
                    onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                    placeholder="Description (optional)"
                    className={inputStyles}
                  />
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                    <Input
                      type="date"
                      value={editTask.dueDate}
                      onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                      className={inputStyles}
                      placeholder="Due date (optional)"
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.completed}
                    disabled={!canCompleteTask(task)}
                    onCheckedChange={(checked) => 
                      toggleCompletionMutation.mutate({ id: task.id, completed: !!checked })
                    }
                    className="mt-1 h-5 w-5 rounded-md border-white/30 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-medium leading-snug text-white ${task.completed ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </h4>
                      <div className="flex shrink-0 items-center">
                        <Button
                          onClick={() => startEditing(task)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-gray-500 hover:bg-white/10 hover:text-white"
                          aria-label="Edit task"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p className={`mt-0.5 text-sm text-gray-400 ${task.completed ? 'line-through' : ''}`}>
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusPill(task.status).className}`}>
                        {getStatusPill(task.status).text}
                      </span>
                      {task.dueDate && (
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                            isOverdue(task)
                              ? "bg-red-500/15 text-red-400 ring-red-500/30"
                              : "bg-white/5 text-gray-400 ring-white/10"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {isOverdue(task) ? "Overdue — " : ""}{format(parseDueDate(task.dueDate), 'MMM d')}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={uploadUrl(teamMembers.find(m => m.user?.id?.toString() === task.assignedTo)?.user?.avatar)} />
                          <AvatarFallback className="bg-green-900 text-green-300 text-[9px] font-bold">
                            {task.assignedToUsername?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-400">{task.assignedToUsername}</span>
                      </span>
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