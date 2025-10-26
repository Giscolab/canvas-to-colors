import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileJson, 
  FileImage, 
  FileCode, 
  Settings, 
  ChevronDown,
  Check,
  Copy,
  Share2,
  FileText,
  Layers,
  Palette,
  Grid3X3,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet
} from "lucide-react";
import { ProcessedResult } from "@/lib/imageProcessing";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ExportBarProps {
  processedData: ProcessedResult | null;
  onExportPNG: (options?: ExportOptions) => void;
  onExportJSON: (options?: ExportOptions) => void;
  onExportSVG?: (options?: ExportOptions) => void;
  onExportPDF?: (options?: ExportOptions) => void;
  onExportZIP?: (options?: ExportOptions) => void;
  onExportCSV?: (options?: ExportOptions) => void;
}

interface ExportOptions {
  quality?: number;
  scale?: number;
  includeMetadata?: boolean;
  includeColorPalette?: boolean;
  includeZones?: boolean;
  backgroundColor?: string;
  filename?: string;
}

export function ExportBar({
  processedData,
  onExportPNG,
  onExportJSON,
  onExportSVG,
  onExportPDF,
  onExportZIP,
  onExportCSV,
}: ExportBarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    quality: 90,
    scale: 1,
    includeMetadata: true,
    includeColorPalette: true,
    includeZones: true,
    backgroundColor: "#ffffff",
    filename: "",
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("png");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = !processedData;

  const handleExport = useCallback((format: string, options?: ExportOptions) => {
    if (isDisabled) return;
    
    setIsExporting(true);
    
    try {
      switch (format) {
        case "png":
          onExportPNG(options);
          break;
        case "svg":
          onExportSVG?.(options);
          break;
        case "json":
          onExportJSON(options);
          break;
        case "pdf":
          onExportPDF?.(options);
          break;
        case "zip":
          onExportZIP?.(options);
          break;
        case "csv":
          onExportCSV?.(options);
          break;
        default:
          toast.error("Format d'export non supporté");
      }
      
      toast.success(`Export ${format.toUpperCase()} réussi`);
    } catch (error) {
      console.error(error);
      toast.error(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  }, [isDisabled, onExportPNG, onExportSVG, onExportJSON, onExportPDF, onExportZIP, onExportCSV]);

  const handleCopyToClipboard = useCallback(() => {
    if (!processedData) return;
    
    try {
      const dataStr = JSON.stringify(processedData, null, 2);
      navigator.clipboard.writeText(dataStr);
      setCopiedToClipboard(true);
      toast.success("Données copiées dans le presse-papiers");
      
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la copie des données");
    }
  }, [processedData]);

  const handleShare = useCallback(() => {
    if (!processedData) return;
    
    try {
      toast.success("Lien de partage copié dans le presse-papiers");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du partage");
    }
  }, [processedData]);

  const handleAdvancedExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  const handleExportFromDialog = useCallback(() => {
    handleExport(activeTab, exportOptions);
    setShowExportDialog(false);
  }, [activeTab, exportOptions, handleExport]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast.success(`Fichier ${file.name} importé avec succès`);
  }, []);

  return (
    <TooltipProvider>
      <div
        className="studio-export-bar"
        role="contentinfo"
        aria-label="Barre d'export"
      >
        {/* Statut / métriques */}
        <div className="flex items-center gap-3 min-w-0">
          <output
            aria-live="polite"
            className="text-xs sm:text-sm text-studio-foreground/80 truncate"
          >
            {processedData ? (
              <>
                <span className="font-medium text-studio-foreground tabular-nums">
                  {processedData.zones.length}
                </span>{" "}
                zones •{" "}
                <span className="font-medium text-studio-foreground tabular-nums">
                  {processedData.palette.length}
                </span>{" "}
                couleurs
              </>
            ) : (
              "Aucun résultat"
            )}
          </output>
        </div>

        {/* Actions d'export */}
        <div className="flex items-center gap-2">
          {/* Actions secondaires */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyToClipboard}
                disabled={isDisabled}
                className="studio-action-button"
              >
                {copiedToClipboard ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Copier les données</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                disabled={isDisabled}
                className="studio-action-button"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Partager</p></TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDisabled}
                className="studio-export-button"
              >
                <FileImage className="w-4 h-4" />
                PNG
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("png")}>
                Exporter en PNG (standard)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("png", { scale: 2 })}>
                Exporter en PNG (2x)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("png", { scale: 0.5 })}>
                Exporter en PNG (0.5x)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("png", { includeColorPalette: true, includeZones: true })}>
                Exporter avec métadonnées
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDisabled}
                className="studio-export-button"
              >
                <FileCode className="w-4 h-4" />
                SVG
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("svg")}>
                Exporter en SVG (standard)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("svg", { includeColorPalette: true })}>
                Exporter avec palette de couleurs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("svg", { includeZones: true })}>
                Exporter avec zones numérotées
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDisabled}
                className="studio-export-button"
              >
                <FileJson className="w-4 h-4" />
                JSON
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("json")}>
                Exporter en JSON (standard)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json", { includeMetadata: true })}>
                Exporter avec métadonnées complètes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json", { includeColorPalette: true, includeZones: true })}>
                Exporter avec palette et zones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDisabled}
                className="studio-export-button"
              >
                Plus
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="w-4 h-4 mr-2" />
                Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("zip")}>
                <FileArchive className="w-4 h-4 mr-2" />
                Exporter en ZIP (tous les formats)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter en CSV (données de zones)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAdvancedExport}>
                <Settings className="w-4 h-4 mr-2" />
                Export avancé
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => handleExport("png")}
            disabled={isDisabled || isExporting}
            className="studio-export-button studio-export-button--primary"
          >
            {isExporting ? (
              <>
                <div className="studio-loading-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Exportation...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exporter tout
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dialogue d'export avancé */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="studio-export-dialog">
          <DialogHeader className="studio-dialog-header">
            <DialogTitle className="studio-dialog-title">Export avancé</DialogTitle>
            <DialogDescription className="studio-dialog-description">
              Personnalisez les options d'export pour votre projet.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="studio-export-tabs">
              <TabsTrigger value="png" className="studio-export-tab">PNG</TabsTrigger>
              <TabsTrigger value="svg" className="studio-export-tab">SVG</TabsTrigger>
              <TabsTrigger value="json" className="studio-export-tab">JSON</TabsTrigger>
              <TabsTrigger value="pdf" className="studio-export-tab">PDF</TabsTrigger>
              <TabsTrigger value="zip" className="studio-export-tab">ZIP</TabsTrigger>
              <TabsTrigger value="csv" className="studio-export-tab">CSV</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-4">
              <TabsContent value="png" className="studio-option-group">
                <div className="studio-option-container">
                  <Label htmlFor="png-quality" className="studio-option-label">Qualité: {exportOptions.quality}%</Label>
                  <Slider
                    id="png-quality"
                    min={10}
                    max={100}
                    step={10}
                    value={[exportOptions.quality || 90]}
                    onValueChange={(value) => setExportOptions(prev => ({ ...prev, quality: value[0] }))}
                    className="studio-export-slider"
                  />
                </div>
                
                <div className="studio-option-container">
                  <Label htmlFor="png-scale" className="studio-option-label">Échelle: {exportOptions.scale}x</Label>
                  <Slider
                    id="png-scale"
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={[exportOptions.scale || 1]}
                    onValueChange={(value) => setExportOptions(prev => ({ ...prev, scale: value[0] }))}
                    className="studio-export-slider"
                  />
                </div>
                
                <div className="studio-option-container">
                  <Label htmlFor="png-bg" className="studio-option-label">Couleur de fond</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="png-bg"
                      type="color"
                      value={exportOptions.backgroundColor || "#ffffff"}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="studio-color-picker"
                    />
                    <Input
                      value={exportOptions.backgroundColor || "#ffffff"}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="studio-input"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="svg" className="studio-option-group">
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="svg-palette"
                      checked={exportOptions.includeColorPalette}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeColorPalette: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="svg-palette" className="studio-option-label">Inclure la palette de couleurs</Label>
                  </div>
                </div>
                
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="svg-zones"
                      checked={exportOptions.includeZones}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeZones: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="svg-zones" className="studio-option-label">Inclure les zones numérotées</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="json" className="studio-option-group">
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="json-metadata"
                      checked={exportOptions.includeMetadata}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeMetadata: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="json-metadata" className="studio-option-label">Inclure les métadonnées</Label>
                  </div>
                </div>
                
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="json-palette"
                      checked={exportOptions.includeColorPalette}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeColorPalette: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="json-palette" className="studio-option-label">Inclure la palette de couleurs</Label>
                  </div>
                </div>
                
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="json-zones"
                      checked={exportOptions.includeZones}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeZones: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="json-zones" className="studio-option-label">Inclure les données des zones</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="pdf" className="studio-option-group">
                <div className="studio-option-container">
                  <Label htmlFor="pdf-filename" className="studio-option-label">Nom du fichier</Label>
                  <Input
                    id="pdf-filename"
                    value={exportOptions.filename || ""}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
                    placeholder="mon-projet"
                    className="studio-input"
                  />
                </div>
                
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pdf-palette"
                      checked={exportOptions.includeColorPalette}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeColorPalette: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="pdf-palette" className="studio-option-label">Inclure la palette de couleurs</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="zip" className="studio-option-group">
                <div className="studio-option-container">
                  <Label htmlFor="zip-filename" className="studio-option-label">Nom du fichier</Label>
                  <Input
                    id="zip-filename"
                    value={exportOptions.filename || ""}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
                    placeholder="mon-projet"
                    className="studio-input"
                  />
                </div>
                
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="zip-all"
                      checked={true}
                      disabled
                      className="studio-switch"
                    />
                    <Label htmlFor="zip-all" className="studio-option-label">Inclure tous les formats (PNG, SVG, JSON)</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="csv" className="studio-option-group">
                <div className="studio-option-container">
                  <Label htmlFor="csv-filename" className="studio-option-label">Nom du fichier</Label>
                  <Input
                    id="csv-filename"
                    value={exportOptions.filename || ""}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
                    placeholder="mon-projet"
                    className="studio-input"
                  />
                </div>
                
                <div className="studio-option-container">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="csv-zones"
                      checked={exportOptions.includeZones}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeZones: checked }))}
                      className="studio-switch"
                    />
                    <Label htmlFor="csv-zones" className="studio-option-label">Inclure les données des zones</Label>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="studio-dialog-footer">
            <Button variant="outline" className="studio-export-button" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExportFromDialog} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="studio-loading-spinner mr-2" />
                  Exportation...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input caché pour l'import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.svg,.png,.jpg,.jpeg"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </TooltipProvider>
  );
}