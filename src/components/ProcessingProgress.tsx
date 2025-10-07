import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ProcessingProgressProps {
  stage: string;
  progress: number;
  isVisible: boolean;
}

export function ProcessingProgress({ stage, progress, isVisible }: ProcessingProgressProps) {
  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-24 left-1/2 -translate-x-1/2 p-6 bg-background/95 backdrop-blur-lg border-primary/20 shadow-2xl z-50 min-w-[320px]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{stage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complété
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </Card>
  );
}
