import { Square, Heading1, Type, Image, MousePointer2, Link2, FormInput, Grid3x3, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type ElementLibraryProps = {
  onElementSelect: (elementType: string) => void;
};

const ELEMENT_TYPES = [
  { type: 'container', label: 'Container', icon: Square, description: 'Div/Section' },
  { type: 'heading', label: 'Heading', icon: Heading1, description: 'H1-H6' },
  { type: 'text', label: 'Text', icon: Type, description: 'Paragraph' },
  { type: 'image', label: 'Image', icon: Image, description: 'Image' },
  { type: 'button', label: 'Button', icon: MousePointer2, description: 'Button' },
  { type: 'link', label: 'Link', icon: Link2, description: 'Anchor' },
  { type: 'input', label: 'Input', icon: FormInput, description: 'Text Input' },
  { type: 'textarea', label: 'Textarea', icon: FormInput, description: 'Text Area' },
  { type: 'select', label: 'Select', icon: FormInput, description: 'Dropdown' },
  { type: 'grid', label: 'Grid', icon: Grid3x3, description: 'Grid Layout' },
  { type: 'video', label: 'Video', icon: Video, description: 'Video/Iframe' },
];

export default function ElementLibrary({ onElementSelect }: ElementLibraryProps) {
  const handleDragStart = (e: React.DragEvent, elementType: string) => {
    e.dataTransfer.setData('elementType', elementType);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Elements</h3>
        <p className="text-xs text-gray-500 mt-1">Drag to canvas</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {ELEMENT_TYPES.map((element) => {
            const Icon = element.icon;
            return (
              <div
                key={element.type}
                draggable
                onDragStart={(e) => handleDragStart(e, element.type)}
                onClick={() => onElementSelect(element.type)}
                className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 cursor-move transition-colors border border-gray-200 hover:border-blue-300 hover:shadow-sm"
              >
                <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{element.label}</div>
                  <div className="text-xs text-gray-500">{element.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
