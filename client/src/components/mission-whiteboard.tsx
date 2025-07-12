import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Target, 
  Plus, 
  Edit2, 
  Trash2, 
  Flag, 
  Clock, 
  CheckCircle,
  Circle,
  User,
  Calendar,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MissionItem {
  id: number;
  type: 'note' | 'task' | 'goal' | 'strategy';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
  assignedTo?: number;
  dueDate?: string;
  positionX: number;
  positionY: number;
  createdBy: number;
  createdAt: string;
}

interface MissionWhiteboardProps {
  teamId: number;
  competitionId: number;
}

export default function MissionWhiteboard({ teamId, competitionId }: MissionWhiteboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MissionItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const whiteboardRef = useRef<HTMLDivElement>(null);
  
  // New item form state
  const [newItem, setNewItem] = useState({
    type: 'note' as MissionItem['type'],
    title: '',
    description: '',
    priority: 'medium' as MissionItem['priority'],
    assignedTo: 0,
    dueDate: '',
  });

  // Get whiteboard items
  const { data: whiteboardItems = [] } = useQuery({
    queryKey: [`/api/teams/${teamId}/whiteboard`],
    enabled: !!teamId,
  });

  // Get team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: [`/api/team-members/team/${teamId}`],
    enabled: !!teamId,
  });

  // Create whiteboard item mutation
  const createItem = useMutation({
    mutationFn: async (item: Omit<MissionItem, 'id' | 'createdAt'>) => {
      const payload = {
        type: item.type,
        title: item.title,
        description: item.description,
        priority: item.priority,
        assignedTo: item.assignedTo || null,
        dueDate: item.dueDate || null,
        position: { x: item.positionX, y: item.positionY },
        createdBy: item.createdBy,
      };
      const response = await fetch(`/api/teams/${teamId}/whiteboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/whiteboard`] });
      setIsAddingItem(false);
      setNewItem({
        type: 'note',
        title: '',
        description: '',
        priority: 'medium',
        assignedTo: 0,
        dueDate: '',
      });
      toast({
        title: "Item added",
        description: "Mission item has been added to the whiteboard.",
      });
    },
  });

  // Update item position mutation
  const updateItemPosition = useMutation({
    mutationFn: async ({ id, position }: { id: number; position: { x: number; y: number } }) => {
      const response = await fetch(`/api/teams/${teamId}/whiteboard/${id}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      if (!response.ok) throw new Error('Failed to update position');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/whiteboard`] });
    },
  });

  // Update item status mutation
  const updateItemStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MissionItem['status'] }) => {
      const response = await fetch(`/api/teams/${teamId}/whiteboard/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/whiteboard`] });
    },
  });

  // Delete item mutation
  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/teams/${teamId}/whiteboard/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/whiteboard`] });
      setSelectedItem(null);
      toast({
        title: "Item deleted",
        description: "Mission item has been removed from the whiteboard.",
      });
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    const whiteboardRect = whiteboardRef.current?.getBoundingClientRect();
    const centerX = whiteboardRect ? whiteboardRect.width / 2 : 300;
    const centerY = whiteboardRect ? whiteboardRect.height / 2 : 200;

    createItem.mutate({
      ...newItem,
      positionX: centerX,
      positionY: centerY,
      createdBy: 10, // This would come from auth context
    });
  };

  const handleMouseDown = (e: React.MouseEvent, item: MissionItem) => {
    e.preventDefault();
    setIsDragging(true);
    setSelectedItem(item);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedItem) return;

    const whiteboardRect = whiteboardRef.current?.getBoundingClientRect();
    if (!whiteboardRect) return;

    const newX = e.clientX - whiteboardRect.left - dragOffset.x;
    const newY = e.clientY - whiteboardRect.top - dragOffset.y;

    // Update position immediately for smooth dragging
    const updatedItems = whiteboardItems.map((item: MissionItem) =>
      item.id === selectedItem.id
        ? { ...item, positionX: Math.max(0, newX), positionY: Math.max(0, newY) }
        : item
    );
    
    queryClient.setQueryData([`/api/teams/${teamId}/whiteboard`], updatedItems);
  };

  const handleMouseUp = () => {
    if (isDragging && selectedItem) {
      // Get the current position from the updated query data
      const currentItems = queryClient.getQueryData([`/api/teams/${teamId}/whiteboard`]) as MissionItem[] || [];
      const currentItem = currentItems.find(item => item.id === selectedItem.id);
      
      if (currentItem) {
        // Save position to backend
        updateItemPosition.mutate({
          id: selectedItem.id,
          position: { x: currentItem.positionX, y: currentItem.positionY },
        });
      }
    }
    setIsDragging(false);
    setSelectedItem(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const getItemIcon = (type: MissionItem['type']) => {
    switch (type) {
      case 'goal': return <Target className="h-4 w-4" />;
      case 'strategy': return <MapPin className="h-4 w-4" />;
      case 'task': return <Flag className="h-4 w-4" />;
      case 'note': return <Circle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getItemColor = (type: MissionItem['type'], priority: MissionItem['priority']) => {
    const baseColors = {
      goal: 'bg-military-green',
      strategy: 'bg-blue-600',
      task: 'bg-yellow-600',
      note: 'bg-gray-600',
    };
    
    const priorityIntensity = {
      high: 'ring-2 ring-red-500',
      medium: 'ring-1 ring-yellow-500',
      low: 'ring-1 ring-green-500',
    };

    return `${baseColors[type]} ${priorityIntensity[priority]}`;
  };

  const getStatusIcon = (status: MissionItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'todo': return <Circle className="h-4 w-4 text-gray-500" />;
      default: return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="sharp-card bg-tactical-gray-light border-tactical-gray">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center">
          <Target className="mr-2 h-5 w-5 text-military-green" />
          Mission Planning Whiteboard
        </CardTitle>
        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-military-green hover:bg-military-green-light">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-tactical-gray border-tactical-gray">
            <DialogHeader>
              <DialogTitle className="text-white">Add Mission Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Type</label>
                <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value as MissionItem['type']})}>
                  <SelectTrigger className="bg-tactical-gray text-white border-tactical-gray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-tactical-gray border-tactical-gray">
                    <SelectItem value="note" className="text-white hover:bg-tactical-gray-light">Note</SelectItem>
                    <SelectItem value="task" className="text-white hover:bg-tactical-gray-light">Task</SelectItem>
                    <SelectItem value="goal" className="text-white hover:bg-tactical-gray-light">Goal</SelectItem>
                    <SelectItem value="strategy" className="text-white hover:bg-tactical-gray-light">Strategy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Title</label>
                <Input
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  placeholder="Enter item title..."
                  className="bg-tactical-gray text-white border-tactical-gray"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Enter description..."
                  className="bg-tactical-gray text-white border-tactical-gray"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Priority</label>
                  <Select value={newItem.priority} onValueChange={(value) => setNewItem({...newItem, priority: value as MissionItem['priority']})}>
                    <SelectTrigger className="bg-tactical-gray text-white border-tactical-gray">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-tactical-gray border-tactical-gray">
                      <SelectItem value="high" className="text-white hover:bg-tactical-gray-light">High</SelectItem>
                      <SelectItem value="medium" className="text-white hover:bg-tactical-gray-light">Medium</SelectItem>
                      <SelectItem value="low" className="text-white hover:bg-tactical-gray-light">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Assign To</label>
                  <Select value={newItem.assignedTo?.toString()} onValueChange={(value) => setNewItem({...newItem, assignedTo: parseInt(value) || 0})}>
                    <SelectTrigger className="bg-tactical-gray text-white border-tactical-gray">
                      <SelectValue placeholder="Select member..." />
                    </SelectTrigger>
                    <SelectContent className="bg-tactical-gray border-tactical-gray">
                      {teamMembers.map((member: any) => (
                        <SelectItem key={member.id} value={member.userId?.toString() || ''} className="text-white hover:bg-tactical-gray-light">
                          {member.user?.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Due Date</label>
                <Input
                  type="date"
                  value={newItem.dueDate}
                  onChange={(e) => setNewItem({...newItem, dueDate: e.target.value})}
                  className="bg-tactical-gray text-white border-tactical-gray [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddingItem(false)} className="text-gray-300 border-gray-600 hover:bg-tactical-gray-light">
                  Cancel
                </Button>
                <Button type="submit" className="bg-military-green hover:bg-military-green-light text-white">
                  Add Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div 
          ref={whiteboardRef}
          className="relative bg-tactical-gray rounded-lg border-2 border-dashed border-tactical-gray-light min-h-[500px] overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {whiteboardItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Target className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                <p className="text-gray-400">No mission items yet</p>
                <p className="text-sm text-gray-500">Add your first objective to get started!</p>
              </div>
            </div>
          ) : (
            whiteboardItems.map((item: MissionItem) => (
              <div
                key={item.id}
                className={`absolute cursor-move select-none ${getItemColor(item.type, item.priority)} rounded-lg p-3 shadow-lg max-w-xs transition-none ${isDragging && selectedItem?.id === item.id ? 'opacity-90 shadow-xl' : ''}`}
                style={{
                  left: `${item.positionX}px`,
                  top: `${item.positionY}px`,
                  zIndex: selectedItem?.id === item.id ? 50 : 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, item)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getItemIcon(item.type)}
                    <span className="text-white font-medium text-sm">{item.title}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(item.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-black/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                </div>
                
                {item.description && (
                  <p className="text-white/90 text-xs mb-2">{item.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {item.assignedTo && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3 text-white/70" />
                        <span className="text-white/70 text-xs">{item.assignedTo}</span>
                      </div>
                    )}
                    {item.dueDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-white/70" />
                        <span className="text-white/70 text-xs">
                          {format(new Date(item.dueDate), 'MMM d')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-black/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newStatus = item.status === 'completed' ? 'todo' : 
                                        item.status === 'todo' ? 'in_progress' : 'completed';
                        updateItemStatus.mutate({ id: item.id, status: newStatus });
                      }}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <Circle className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {whiteboardItems.length > 0 && (
          <div className="mt-4 text-xs text-gray-400">
            <p>Drag items to reposition • Click status icons to update progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}