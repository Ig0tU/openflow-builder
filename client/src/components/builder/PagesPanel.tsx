import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Home } from "lucide-react";
import type { Page } from "../../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PagesPanelProps = {
  projectId: number;
  pages: Page[];
  currentPageId: number | null;
  onPageSelect: (pageId: number) => void;
  onPagesChange: () => void;
};

export default function PagesPanel({
  projectId,
  pages,
  currentPageId,
  onPageSelect,
  onPagesChange,
}: PagesPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");

  const createPage = trpc.pages.create.useMutation({
    onSuccess: (page) => {
      toast.success("Page created!");
      setCreateDialogOpen(false);
      setNewPageName("");
      setNewPageSlug("");
      onPagesChange();
      onPageSelect(page.id);
    },
    onError: (error) => {
      toast.error(`Failed to create page: ${error.message}`);
    },
  });

  const handleCreatePage = () => {
    if (!newPageName.trim()) {
      toast.error("Page name is required");
      return;
    }
    const slug = newPageSlug.trim() || newPageName.toLowerCase().replace(/\s+/g, '-');
    createPage.mutate({
      projectId,
      name: newPageName,
      slug,
    });
  };

  return (
    <div className="flex flex-col h-64 border-b border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Pages</h3>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Create New Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="page-name" className="text-gray-700">Page Name</Label>
                <Input
                  id="page-name"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="About Us"
                  className="bg-white border-gray-300 text-gray-900 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="page-slug" className="text-gray-700">Slug (Optional)</Label>
                <Input
                  id="page-slug"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder="about-us"
                  className="bg-white border-gray-300 text-gray-900 mt-2"
                />
              </div>
              <Button 
                onClick={handleCreatePage} 
                disabled={createPage.isPending}
                className="w-full shadow-sm"
              >
                {createPage.isPending ? "Creating..." : "Create Page"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onPageSelect(page.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                page.id === currentPageId
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page.isHomePage ? (
                <Home className="w-4 h-4 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate font-medium">{page.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
