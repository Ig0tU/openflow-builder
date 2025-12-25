import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Element } from "../../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type PropertyPanelProps = {
  selectedElementId: number | null;
  elements: Element[];
  onElementUpdate: () => void;
};

export default function PropertyPanel({
  selectedElementId,
  elements,
  onElementUpdate,
}: PropertyPanelProps) {
  const selectedElement = elements.find(e => e.id === selectedElementId);
  const [content, setContent] = useState("");
  const [styles, setStyles] = useState<Record<string, string>>({});

  const updateElement = trpc.elements.update.useMutation({
    onSuccess: () => {
      toast.success("Element updated!");
      onElementUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteElement = trpc.elements.delete.useMutation({
    onSuccess: () => {
      toast.success("Element deleted!");
      onElementUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  useEffect(() => {
    if (selectedElement) {
      setContent(selectedElement.content || "");
      setStyles(selectedElement.styles as Record<string, string> || {});
    }
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <Settings className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Element Selected</h3>
        <p className="text-sm text-gray-500">
          Select an element on the canvas to edit its properties
        </p>
      </div>
    );
  }

  const handleSave = () => {
    updateElement.mutate({
      id: selectedElement.id,
      content,
      styles,
    });
  };

  const handleDelete = () => {
    if (confirm("Delete this element?")) {
      deleteElement.mutate({ id: selectedElement.id });
    }
  };

  const handleStyleChange = (key: string, value: string) => {
    setStyles({ ...styles, [key]: value });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
          <p className="text-xs text-gray-500 mt-1 capitalize">{selectedElement.elementType}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Content */}
          {['text', 'paragraph', 'heading', 'button', 'link'].includes(selectedElement.elementType) && (
            <div>
              <Label className="text-gray-700 font-medium">Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 mt-2"
                rows={3}
              />
            </div>
          )}

          {selectedElement.elementType === 'image' && (
            <div>
              <Label className="text-gray-700 font-medium">Image URL</Label>
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://..."
                className="bg-white border-gray-300 text-gray-900 mt-2"
              />
            </div>
          )}

          {/* Common Styles */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Layout</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">Width</Label>
                  <Input
                    value={styles.width || ''}
                    onChange={(e) => handleStyleChange('width', e.target.value)}
                    placeholder="auto"
                    className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Height</Label>
                  <Input
                    value={styles.height || ''}
                    onChange={(e) => handleStyleChange('height', e.target.value)}
                    placeholder="auto"
                    className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">Display</Label>
                  <Input
                    value={styles.display || ''}
                    onChange={(e) => handleStyleChange('display', e.target.value)}
                    placeholder="block"
                    className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Position</Label>
                  <Input
                    value={styles.position || ''}
                    onChange={(e) => handleStyleChange('position', e.target.value)}
                    placeholder="static"
                    className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spacing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Spacing</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">Margin</Label>
                  <Input
                    value={styles.margin || ''}
                    onChange={(e) => handleStyleChange('margin', e.target.value)}
                    placeholder="0"
                    className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Padding</Label>
                  <Input
                    value={styles.padding || ''}
                    onChange={(e) => handleStyleChange('padding', e.target.value)}
                    placeholder="0"
                    className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Typography</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Font Size</Label>
                <Input
                  value={styles.fontSize || ''}
                  onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                  placeholder="16px"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Font Weight</Label>
                <Input
                  value={styles.fontWeight || ''}
                  onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                  placeholder="normal"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Color</Label>
                <Input
                  value={styles.color || ''}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  placeholder="#000000"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Background */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Background</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Background Color</Label>
                <Input
                  value={styles.backgroundColor || ''}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  placeholder="transparent"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Border */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Border</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Border</Label>
                <Input
                  value={styles.border || ''}
                  onChange={(e) => handleStyleChange('border', e.target.value)}
                  placeholder="1px solid #000"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Border Radius</Label>
                <Input
                  value={styles.borderRadius || ''}
                  onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                  placeholder="0"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-8 mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={handleSave}
          disabled={updateElement.isPending}
          className="w-full shadow-sm"
        >
          {updateElement.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
