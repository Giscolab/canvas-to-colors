# Manual test scenarios for image processing

## Large uniform color segmentation

1. Create or load a solid-color image of at least 1200×1200 pixels (for example, generate a PNG filled with a single color in any graphics editor).
2. Run the image through the "Canvas to Colors" processing pipeline (either locally via the application UI or by invoking the `processImage` flow in `src/lib/imageProcessing.ts`).
3. Confirm that processing completes without console warnings about queue capacity exhaustion.
4. Inspect the resulting zones: the single-color area should be reported as one contiguous region covering all pixels (check `zones.length === 1`, the zone `area` equals `width * height`, and labels within `ProcessedResult.labels` are all set to the same value).
5. Repeat with a slightly larger canvas (e.g., 1500×1500) to verify that the dynamic queue continues to expand without warnings or missed pixels.
