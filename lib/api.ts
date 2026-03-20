import axios from 'axios';
import { useUploadStore } from '../store/useUploadStore';

const MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';

export const uploadImage = async (fileId: string, file: File) => {
  const store = useUploadStore.getState();
  
  if (MOCK_API) {
    // Simulate upload progress
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        store.updateFileProgress(fileId, progress);
        if (progress >= 100) {
          clearInterval(interval);
          const jobId = `job_${Math.random().toString(36).substring(7)}`;
          store.updateFileStatus(fileId, 'Processing', jobId);
          resolve({ jobId });
        }
      }, 500);
    });
  }

  // Real API integration
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await axios.post(`${BACKEND_URL}/predict`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        store.updateFileProgress(fileId, percentCompleted);
      }
    });

    const prediction = res.data;
    store.updateFileProgress(fileId, 100);
    if (prediction.image_url) {
      store.setResultImageUrl(fileId, prediction.image_url);
    }
    store.setResults(fileId, [
      {
        box: {
          x: prediction.bounding_box.x1,
          y: prediction.bounding_box.y1,
          width: prediction.bounding_box.x2 - prediction.bounding_box.x1,
          height: prediction.bounding_box.y2 - prediction.bounding_box.y1,
        },
        label: prediction.car_model,
        confidence: prediction.confidence,
      },
    ]);
    return res.data;
  } catch (error) {
    store.updateFileStatus(fileId, 'Error');
    throw error;
  }
};

export const pollJobStatus = async (fileId: string, jobId: string) => {
  const store = useUploadStore.getState();

  if (MOCK_API) {
    // Simulate processing time
    setTimeout(() => {
      store.setResults(fileId, [
        { box: { x: 50, y: 50, width: 250, height: 180 }, label: 'Car', confidence: 0.95 },
        { box: { x: 350, y: 150, width: 200, height: 160 }, label: 'Truck', confidence: 0.88 },
        { box: { x: 10, y: 300, width: 100, height: 60 }, label: 'Motorcycle', confidence: 0.72 }
      ]);
    }, 3000);
    return;
  }

  // The current backend returns direct prediction from /predict.
  // This method is kept for compatibility with the existing UI flow.
  void fileId;
  void jobId;
  void store;
};