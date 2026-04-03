import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface WebcamCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export function WebcamCapture({ open, onOpenChange, onCapture }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Permission caméra refusée. Autorisez l'accès dans les paramètres du navigateur.");
      } else if (err.name === "NotFoundError") {
        setError("Aucune caméra détectée sur cet appareil.");
      } else {
        setError("Impossible d'accéder à la caméra.");
      }
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setCaptured(null);
      setCapturedBlob(null);
      startCamera();
    } else {
      stopStream();
    }
    return stopStream;
  }, [open, startCamera, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setCaptured(dataUrl);
    canvas.toBlob((blob) => {
      if (blob) setCapturedBlob(blob);
    }, "image/png");
  };

  const handleRetake = () => {
    setCaptured(null);
    setCapturedBlob(null);
  };

  const handleValidate = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `webcam-${Date.now()}.png`, { type: "image/png" });
    onCapture(file);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Capture Webcam
          </DialogTitle>
        </DialogHeader>

        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          {error ? (
            <div className="flex items-center justify-center h-full text-destructive text-sm p-4 text-center">
              {error}
            </div>
          ) : captured ? (
            <img src={captured} alt="Capture" className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                  Démarrage de la caméra…
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {error ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          ) : captured ? (
            <>
              <Button variant="outline" onClick={handleRetake}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reprendre
              </Button>
              <Button onClick={handleValidate} disabled={!capturedBlob}>
                <Check className="h-4 w-4 mr-1" /> Valider
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button onClick={handleCapture} disabled={isStarting}>
                <Camera className="h-4 w-4 mr-1" /> Capturer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
