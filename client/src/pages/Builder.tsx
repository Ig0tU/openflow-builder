import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Layout, Save, Download, Sparkles, Undo2, Redo2, Monitor, Tablet, Smartphone, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import CanvasEditor from "@/components/builder/CanvasEditor";
import ElementLibrary from "@/components/builder/ElementLibrary";
import PropertyPanel from "@/components/builder/PropertyPanel";
import AIAssistant from "@/components/builder/AIAssistant";
import PagesPanel from "@/components/builder/PagesPanel";

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export default function Builder() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: parseInt(projectId!) },
    { enabled: isAuthenticated && !!projectId }
  );

  const { data: pages, isLoading: pagesLoading, refetch: refetchPages } = trpc.pages.list.useQuery(
    { projectId: parseInt(projectId!) },
    { enabled: isAuthenticated && !!projectId }
  );

  const { data: elements, isLoading: elementsLoading, refetch: refetchElements } = trpc.elements.list.useQuery(
    { pageId: currentPageId! },
    { enabled: isAuthenticated && currentPageId !== null }
  );

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Set initial page when pages load
  useEffect(() => {
    if (pages && pages.length > 0 && !currentPageId) {
      const homePage = pages.find(p => p.isHomePage) || pages[0];
      setCurrentPageId(homePage!.id);
    }
  }, [pages, currentPageId]);

  if (loading || projectLoading || pagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to continue</h2>
          <a href={getLoginUrl()}>
            <Button>Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project not found</h2>
          <Link href="/projects">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateProject.mutate({
      id: project.id,
      name: project.name,
    });
  };

  const handleExport = async () => {
    const format = prompt('Export format:\n- html\n- nextjs\n- wordpress\n- hostinger\n- vercel\n- netlify', 'html') as 'html' | 'nextjs' | 'wordpress' | 'hostinger' | 'vercel' | 'netlify' | null;
    if (!format) return;

    try {
      const result = await utils.projects.export.fetch({ id: parseInt(projectId!), format });

      for (const file of result.files) {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.path.replace(/\//g, '_');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${result.files.length} file(s) for ${format}!`);
    } catch (error) {
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      toast.info("Undo");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      toast.info("Redo");
    }
  };

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top Toolbar */}
      <header className="border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <Layout className="w-4 h-4 mr-2" />
                Projects
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">{project.name}</span>
              <span className="text-xs text-gray-500">
                {pages?.find(p => p.id === currentPageId)?.name || 'Loading...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="text-gray-600 hover:text-gray-900"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="text-gray-600 hover:text-gray-900"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2" />

            {/* Viewport Modes */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewportMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('desktop')}
                className={viewportMode === 'desktop' ? '' : 'text-gray-600 hover:text-gray-900'}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={viewportMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('tablet')}
                className={viewportMode === 'tablet' ? '' : 'text-gray-600 hover:text-gray-900'}
                title="Tablet view"
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={viewportMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('mobile')}
                className={viewportMode === 'mobile' ? '' : 'text-gray-600 hover:text-gray-900'}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2" />

            {/* AI Assistant Toggle */}
            <Button
              variant={showAIAssistant ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className="shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assistant
            </Button>

            <div className="h-6 w-px bg-gray-200 mx-2" />

            {/* Save & Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={updateProject.isPending}
              className="border-gray-300 shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              className="shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Pages & Elements */}
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <PagesPanel
            projectId={parseInt(projectId!)}
            pages={pages || []}
            currentPageId={currentPageId}
            onPageSelect={setCurrentPageId}
            onPagesChange={refetchPages}
          />
          <div className="h-px bg-gray-200" />
          <ElementLibrary
            onElementSelect={(elementType) => {
              toast.info(`Add ${elementType} to canvas`);
            }}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          <div className="flex-1 overflow-auto p-8">
            <div
              className="mx-auto bg-white transition-all duration-300 shadow-lg"
              style={{
                width: viewportWidths[viewportMode],
                minHeight: '100%',
                border: '1px solid rgb(229, 231, 235)',
              }}
            >
              <CanvasEditor
                pageId={currentPageId}
                elements={elements || []}
                selectedElementId={selectedElementId}
                onElementSelect={setSelectedElementId}
                onElementsChange={refetchElements}
                viewportMode={viewportMode}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties or AI */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-hidden">
          {showAIAssistant ? (
            <AIAssistant
              projectId={parseInt(projectId!)}
              currentPageId={currentPageId}
              onClose={() => setShowAIAssistant(false)}
              onElementsGenerated={refetchElements}
            />
          ) : (
            <PropertyPanel
              selectedElementId={selectedElementId}
              elements={elements || []}
              onElementUpdate={refetchElements}
            />
          )}
        </div>
      </div>
    </div>
  );
}
