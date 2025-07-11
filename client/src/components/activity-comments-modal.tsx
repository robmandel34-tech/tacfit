import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";

interface ActivityCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: number;
  activityTitle: string;
}

export default function ActivityCommentsModal({
  isOpen,
  onClose,
  activityId,
  activityTitle,
}: ActivityCommentsModalProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: [`/api/activities/${activityId}/comments`],
    enabled: isOpen,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Must be logged in to comment");
      
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, userId: user.id }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add comment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activityId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/competition"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/team"] });
      setNewComment("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addComment.mutate(newComment.trim());
    }
  };

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tactical-gray-light border-tactical-gray-lighter max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments - {activityTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading comments...</div>
              </div>
            ) : !comments || comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                <p className="text-gray-400">No comments yet</p>
                <p className="text-sm text-gray-500">Be the first to comment on this activity!</p>
              </div>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3 p-3 bg-tactical-gray rounded-lg">
                  <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">
                      {getInitials(comment.user?.username || "U")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-sm">
                        {comment.user?.username || "Unknown"}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-tactical-gray border-tactical-gray-lighter text-white placeholder-gray-400 resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!newComment.trim() || addComment.isPending}
                  className="bg-military-green hover:bg-military-green-light text-white"
                >
                  {addComment.isPending ? (
                    "Posting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}