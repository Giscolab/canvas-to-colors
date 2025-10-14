import { useEffect, useRef } from 'react';
import { useStudio } from '@/contexts/StudioContext';

const AUTO_SAVE_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useAutoSave() {
  const studio = useStudio();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');

  useEffect(() => {
    if (!studio.preferences.autoSave) return;
    if (!studio.currentProject?.name || !studio.result) return;

    // Create a unique key for current state
    const stateKey = JSON.stringify({
      projectId: studio.currentProject.id,
      settings: studio.settings,
      hasResult: !!studio.result,
    });

    // Only save if state has changed
    if (stateKey === lastSaveRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule auto-save
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const autoSaveName = `${studio.currentProject.name} (auto)`;
        studio.saveProject(autoSaveName);
        lastSaveRef.current = stateKey;
        console.log('✅ Auto-save completed');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [studio.currentProject, studio.result, studio.settings, studio.preferences.autoSave]);
}
