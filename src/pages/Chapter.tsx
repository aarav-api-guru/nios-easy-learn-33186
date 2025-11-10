import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { chapters, resources, subjects, type Comment } from '@/data/mockData';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, CheckCircle, MessageCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Chapter = () => {
  const { chapterId, subjectId } = useParams();
  const { toast } = useToast();
  const chapter = chapters.find(c => c.id === chapterId);
  const subject = subjects.find(s => s.id === subjectId);
  const chapterResources = resources.filter(r => r.chapterId === chapterId);
  
  // Group resources by setId
  const resourceSets = chapterResources.reduce((acc, resource) => {
    if (!acc[resource.setId]) {
      acc[resource.setId] = { year: resource.year, resources: [] };
    }
    acc[resource.setId].resources.push(resource);
    return acc;
  }, {} as Record<string, { year: string; resources: typeof chapterResources }>);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState({ name: '', email: '', text: '' });

  useEffect(() => {
    // Load comments from localStorage
    const stored = localStorage.getItem(`comments-${chapterId}`);
    if (stored) {
      setComments(JSON.parse(stored));
    }
  }, [chapterId]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.name || !newComment.text) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name and comment",
        variant: "destructive",
      });
      return;
    }

    const comment: Comment = {
      id: Date.now().toString(),
      chapterId: chapterId!,
      visitorName: newComment.name,
      visitorEmail: newComment.email,
      commentText: newComment.text,
      isApproved: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...comments, comment];
    setComments(updated);
    localStorage.setItem(`comments-${chapterId}`, JSON.stringify(updated));
    
    setNewComment({ name: '', email: '', text: '' });
    
    toast({
      title: "Comment posted!",
      description: "Your comment has been added successfully",
    });
  };

  if (!chapter) {
    return <div>Chapter not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to={`/${subjectId}`}>
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {subject?.name}
            </Button>
          </Link>

          {/* Chapter Header */}
          <div className="mb-12">
            <Badge className="mb-4">Chapter {chapter.chapterNumber}</Badge>
            <h1 className="text-4xl font-bold mb-4">{chapter.name}</h1>
            <p className="text-lg text-muted-foreground">{chapter.description}</p>
          </div>

          {/* Resources Section */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Available Resources
              </CardTitle>
              <CardDescription>Download question papers and answer keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(resourceSets).length > 0 ? (
                Object.entries(resourceSets).map(([setId, set]) => {
                  const questionPaper = set.resources.find(r => r.type === 'question_paper');
                  const answerKey = set.resources.find(r => r.type === 'answer_key');
                  
                  return (
                    <div key={setId} className="p-6 border-2 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-bold text-lg">Resource Set {set.year}</h3>
                            <p className="text-sm text-muted-foreground">
                              Question Paper & Answer Key
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-sm">{set.year}</Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {questionPaper && (
                          <div className="p-4 bg-background border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Question Paper</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              {questionPaper.fileName} • {questionPaper.fileSize}
                            </p>
                            <Button size="sm" className="w-full gap-2">
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        )}
                        
                        {answerKey && (
                          <div className="p-4 bg-background border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-secondary" />
                              <span className="font-semibold">Answer Key</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                              {answerKey.fileName} • {answerKey.fileSize}
                            </p>
                            <Button size="sm" variant="secondary" className="w-full gap-2">
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Resources coming soon for this chapter</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments & Discussion
              </CardTitle>
              <CardDescription>Ask questions or share your thoughts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Comment Form */}
              <form onSubmit={handleSubmitComment} className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Your name *"
                    value={newComment.name}
                    onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                  />
                  <Input
                    type="email"
                    placeholder="Your email (optional)"
                    value={newComment.email}
                    onChange={(e) => setNewComment({ ...newComment, email: e.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="Write your comment... *"
                  value={newComment.text}
                  onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                  rows={4}
                />
                <Button type="submit">Post Comment</Button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{comment.visitorName}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{comment.commentText}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chapter;
