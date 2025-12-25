import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type ExportFormat = 'html' | 'nextjs' | 'wordpress' | 'hostinger' | 'vercel' | 'netlify' | 'yootheme';

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onExport: (format: ExportFormat) => Promise<void>;
    isExporting: boolean;
}

export default function ExportDialog({ open, onOpenChange, onExport, isExporting }: ExportDialogProps) {
    const [format, setFormat] = useState<ExportFormat>('html');

    const handleExport = async () => {
        await onExport(format);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Project</DialogTitle>
                    <DialogDescription>
                        Choose a format to download your project code.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Export Format</label>
                        <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="html">HTML & CSS (Static)</SelectItem>
                                <SelectItem value="nextjs">Next.js Project</SelectItem>
                                <SelectItem value="wordpress">WordPress Theme</SelectItem>
                                <SelectItem value="yootheme">YOOtheme Pro (Joomla/WP)</SelectItem>
                                <SelectItem value="hostinger">Hostinger</SelectItem>
                                <SelectItem value="vercel">Vercel</SelectItem>
                                <SelectItem value="netlify">Netlify</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {format === 'yootheme'
                                ? 'Exports a JSON layout file compatible with YOOtheme Pro.'
                                : 'Exports a zip/code bundle ready for deployment.'}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
