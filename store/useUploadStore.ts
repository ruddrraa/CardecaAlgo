import { create } from 'zustand';

export type JobStatus = 'Queued' | 'Processing' | 'Done' | 'Error';

export interface DetectionResult {
  box: { x: number; y: number; width: number; height: number };
  label: string;
  confidence: number;
}

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: JobStatus;
  jobId?: string;
  results?: DetectionResult[];
}

export interface UploadStore {
  files: UploadedFile[];
  addFiles: (newFiles: File[]) => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (id: string, status: JobStatus, jobId?: string) => void;
  setResults: (id: string, results: DetectionResult[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (files: UploadedFile[]) => void;
  clearFiles: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  files: [],
  addFiles: (newFiles) => set((state) => {
    const files = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'Queued' as JobStatus,
    }));
    return { files: [...state.files, ...files] };
  }),
  updateFileProgress: (id, progress) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, progress } : f)
  })),
  updateFileStatus: (id, status, jobId) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, status, ...(jobId ? { jobId } : {}) } : f)
  })),
  setResults: (id, results) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, results, status: 'Done' as JobStatus } : f)
  })),
  removeFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id);
    if (file) URL.revokeObjectURL(file.previewUrl);
    return { files: state.files.filter(f => f.id !== id) };
  }),
  reorderFiles: (files) => set({ files }),
  clearFiles: () => set((state) => {
    state.files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    return { files: [] };
  }),
}));