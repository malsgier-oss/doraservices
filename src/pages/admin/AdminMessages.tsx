import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send, Users, Store, Globe } from "lucide-react";
import { usePlatformMessages, useMessageMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminMessages() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");

  const { data: messages, isLoading } = usePlatformMessages();
  const { sendMessage } = useMessageMutations();
  const { toast } = useToast();

  const handleSend = () => {
    if (!title || !content) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    sendMessage.mutate(
      { title, content, targetAudience },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setTargetAudience("all");
        },
      }
    );
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case "all":
        return <Globe className="h-4 w-4" />;
      case "users":
        return <Users className="h-4 w-4" />;
      case "businesses":
        return <Store className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Platform Messages</h1>
        <p className="text-muted-foreground mt-1">Send announcements to platform users</p>
      </div>

      {/* Compose Message */}
      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
          <CardDescription>Compose and send a platform-wide announcement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Message title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="users">Regular Users Only</SelectItem>
                  <SelectItem value="businesses">Business Users Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              placeholder="Write your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleSend} disabled={sendMessage.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            ) : messages?.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-muted-foreground">
                No messages sent yet
              </div>
            ) : (
              messages?.map((message) => (
                <div key={message.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{message.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(message.created_at), "MMM d, yyyy HH:mm")}
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1 shrink-0">
                      {getAudienceIcon(message.target_audience)}
                      {message.target_audience}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : messages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No messages sent yet
                    </TableCell>
                  </TableRow>
                ) : (
                  messages?.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.title}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {message.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getAudienceIcon(message.target_audience)}
                          {message.target_audience}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(message.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
