import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Plus, Layout, Settings, Trash2, Copy, ExternalLink, Key, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function ProjectsDashboard() {
  const { user, loading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const { data: projects, isLoading: projectsLoading, refetch } = trpc.projects.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      toast.success("Project created successfully!");
      setCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      refetch();
      setLocation(`/builder/${project.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  const duplicateProject = trpc.projects.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Project duplicated!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to duplicate project: ${error.message}`);
    },
  });

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in to continue</h2>
          <a href={getLoginUrl()}>
            <Button>Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    createProject.mutate({
      name: newProjectName,
      description: newProjectDescription,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Premium Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <Layout className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-semibold tracking-tight text-gray-900">OpenFlow</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/api-settings">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Key className="w-4 h-4 mr-2" />
                  API Keys
                </Button>
              </Link>
              <div className="text-sm text-gray-600 px-3 py-1.5 bg-gray-50 rounded-lg">
                {user?.name || user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-2">Projects</h1>
            <p className="text-lg text-gray-600">Create and manage your website projects</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm h-11">
                <Plus className="w-5 h-5 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-gray-900 text-xl font-semibold">Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-4">
                <div>
                  <Label htmlFor="name" className="text-gray-700 font-medium">Project Name</Label>
                  <Input
                    id="name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Website"
                    className="bg-white border-gray-300 text-gray-900 mt-2 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-gray-700 font-medium">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    className="bg-white border-gray-300 text-gray-900 mt-2"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={createProject.isPending}
                  className="w-full h-11 shadow-sm"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-white border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 group"
              >
                {/* Project Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-200">
                  {project.thumbnail ? (
                    <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                  ) : (
                    <Layout className="w-16 h-16 text-gray-300" />
                  )}
                </div>

                {/* Project Info */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mb-5">
                    Updated {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/builder/${project.id}`} className="flex-1">
                      <Button size="sm" className="w-full shadow-sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Duplicate this project?")) {
                          duplicateProject.mutate({ id: project.id });
                        }
                      }}
                      className="border-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this project?")) {
                          deleteProject.mutate({ id: project.id });
                        }
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Layout className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No projects yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your first project to start building beautiful websites with AI
            </p>
            <Button size="lg" onClick={() => setCreateDialogOpen(true)} className="shadow-sm h-11">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
