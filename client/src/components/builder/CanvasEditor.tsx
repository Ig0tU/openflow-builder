import { useState } from "react";
import type { Element } from "../../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type CanvasEditorProps = {
  pageId: number | null;
  elements: Element[];
  selectedElementId: number | null;
  onElementSelect: (id: number | null) => void;
  onElementsChange: () => void;
  viewportMode: 'desktop' | 'tablet' | 'mobile';
};

export default function CanvasEditor({
  pageId,
  elements,
  selectedElementId,
  onElementSelect,
  onElementsChange,
  viewportMode,
}: CanvasEditorProps) {
  const [dragOver, setDragOver] = useState(false);

  // All hooks must be called before any conditional returns
  const createElement = trpc.elements.create.useMutation({
    onSuccess: () => {
      toast.success('Element added!');
      onElementsChange();
    },
    onError: (error) => {
      toast.error(`Failed to add element: ${error.message}`);
    },
  });

  if (!pageId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">
        <div className="text-center">
          <p className="text-lg mb-2">No page selected</p>
          <p className="text-sm">Select or create a page to start building</p>
        </div>
      </div>
    );
  }

  const getDefaultContent = (type: string): string => {
    switch (type) {
      case 'heading': return 'Heading';
      case 'text': return 'Text content';
      case 'button': return 'Button';
      case 'link': return 'Link';
      case 'image': return 'https://via.placeholder.com/400x300';
      default: return '';
    }
  };

  const getDefaultStyles = (type: string): Record<string, string> => {
    const base: Record<string, string> = {
      position: 'absolute',
      minWidth: '100px',
      minHeight: '40px',
    };

    switch (type) {
      case 'container':
        return { ...base, width: '400px', height: '300px', backgroundColor: '#f3f4f6', border: '2px dashed #d1d5db', padding: '20px' };
      case 'heading':
        return { ...base, fontSize: '32px', fontWeight: 'bold', color: '#1f2937' };
      case 'text':
        return { ...base, fontSize: '16px', color: '#4b5563' };
      case 'button':
        return { ...base, backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer' };
      case 'image':
        return { ...base, width: '400px', height: '300px' };
      case 'input':
        return { ...base, width: '300px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px' };
      default:
        return base;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const elementType = e.dataTransfer.getData('elementType');
    if (!elementType || !pageId) return;

    // Calculate position relative to canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    createElement.mutate({
      pageId,
      elementType,
      order: elements.length,
      content: getDefaultContent(elementType),
      styles: { ...getDefaultStyles(elementType), left: `${x}px`, top: `${y}px` },
      attributes: {},
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const renderElement = (element: Element) => {
    const isSelected = element.id === selectedElementId;
    const styles = element.styles || {};
    const attributes = element.attributes || {};

    const commonProps = {
      key: element.id,
      className: `${attributes.class || ''} ${isSelected ? 'ring-2 ring-blue-500' : ''} cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all`,
      style: styles,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onElementSelect(element.id);
      },
    };

    switch (element.elementType) {
      case 'container':
        return (
          <div {...commonProps}>
            {elements
              .filter(e => e.parentId === element.id)
              .sort((a, b) => a.order - b.order)
              .map(renderElement)}
          </div>
        );

      case 'text':
      case 'paragraph':
        return (
          <p {...commonProps} dangerouslySetInnerHTML={{ __html: element.content || 'Text content' }} />
        );

      case 'heading':
        const level = attributes.level || '1';
        const headingContent = element.content || `Heading ${level}`;
        switch (level) {
          case '1': return <h1 {...commonProps}>{headingContent}</h1>;
          case '2': return <h2 {...commonProps}>{headingContent}</h2>;
          case '3': return <h3 {...commonProps}>{headingContent}</h3>;
          case '4': return <h4 {...commonProps}>{headingContent}</h4>;
          case '5': return <h5 {...commonProps}>{headingContent}</h5>;
          case '6': return <h6 {...commonProps}>{headingContent}</h6>;
          default: return <h1 {...commonProps}>{headingContent}</h1>;
        }

      case 'image':
        return (
          <img {...commonProps} src={element.content || 'https://via.placeholder.com/400x300'} alt={attributes.alt || 'Image'} />
        );

      case 'button':
        return (
          <button {...commonProps}>{element.content || 'Button'}</button>
        );

      case 'link':
        return (
          <a {...commonProps} href={attributes.href || '#'}>{element.content || 'Link'}</a>
        );

      case 'input':
        return (
          <input {...commonProps} type={attributes.type || 'text'} placeholder={attributes.placeholder || 'Input'} />
        );

      case 'textarea':
        return (
          <textarea {...commonProps} placeholder={attributes.placeholder || 'Textarea'} />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        );

      default:
        return (
          <div {...commonProps}>
            <span className="text-slate-400 text-sm">{element.elementType}</span>
          </div>
        );
    }
  };

  const rootElements = elements.filter(e => !e.parentId).sort((a, b) => a.order - b.order);

  return (
    <div
      className={`min-h-screen p-4 ${dragOver ? 'bg-blue-50' : 'bg-white'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => onElementSelect(null)}
    >
      {rootElements.length > 0 ? (
        rootElements.map(renderElement)
      ) : (
        <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg">
          <div className="text-center text-slate-400">
            <p className="text-lg mb-2">Empty canvas</p>
            <p className="text-sm">Drag elements from the library or use AI to generate content</p>
          </div>
        </div>
      )}
    </div>
  );
}
