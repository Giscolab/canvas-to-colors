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
  type: 'success' | 'error' | 'progress';
  payload?: any;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  if (type === 'process') {
    try {
      const { imageFile, numColors, minRegionSize, smoothness } = payload;
      
      // Process image
      const result = await processImage(imageFile, numColors, minRegionSize, smoothness);
      
      // Send success response
      const response: WorkerResponse = {
        type: 'success',
        payload: result
      };
      self.postMessage(response);
    } catch (error) {
      // Send error response
      const response: WorkerResponse = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during processing'
      };
      self.postMessage(response);
    }
  }
};
