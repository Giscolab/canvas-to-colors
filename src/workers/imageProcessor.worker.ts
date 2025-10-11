/**
 * Web Worker for image processing
 * Offloads heavy computation from main thread
 */

import { processImage } from '@/lib/imageProcessing';

interface WorkerMessage {
  type: 'process';
  payload: {
    imageFile: File;
    numColors: number;
    minRegionSize: number;
    smoothness: number;
  };
}

interface WorkerResponse {
  type: 'success' | 'error' | 'progress' | 'done';
  payload?: any;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  // Validate message type
  if (type !== 'process') {
    const response: WorkerResponse = {
      type: 'error',
      error: `Unknown message type: ${type}`
    };
    self.postMessage(response);
    return;
  }

  try {
    const { imageFile, numColors, minRegionSize, smoothness } = payload;
    
    // Validate payload
    if (!imageFile || !numColors || minRegionSize === undefined || smoothness === undefined) {
      throw new Error('Invalid payload: missing required parameters');
    }
    
    // Send progress updates
    const progressCallback = (stage: string, percent: number) => {
      const progressResponse: WorkerResponse = {
        type: 'progress',
        payload: { stage, progress: percent }
      };
      self.postMessage(progressResponse);
    };
    
    // Process image with progress callback
    const result = await processImage(
      imageFile, 
      numColors, 
      minRegionSize, 
      smoothness,
      progressCallback
    );
    
    // Send success response
    const response: WorkerResponse = {
      type: 'success',
      payload: result
    };
    self.postMessage(response);
    
    // Send done signal (ensures proper sequencing)
    const doneResponse: WorkerResponse = {
      type: 'done'
    };
    self.postMessage(doneResponse);
  } catch (error) {
    // Send error response
    const response: WorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error during processing'
    };
    self.postMessage(response);
    
    // Send done signal even on error
    const doneResponse: WorkerResponse = {
      type: 'done'
    };
    self.postMessage(doneResponse);
  }
};
