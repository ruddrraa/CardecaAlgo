'use client';

import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useUploadStore } from '@/store/useUploadStore';
import { uploadImage, pollJobStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function UploadBox() {
  const addFiles = useUploadStore((state) => state.addFiles);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
    
    // Automatically start processing
    const currentFiles = useUploadStore.getState().files;
    const addedFiles = currentFiles.slice(-acceptedFiles.length); // get the recently added files
    
    addedFiles.forEach(async (f) => {
      try {
        const response: any = await uploadImage(f.id, f.file);
        if (response.jobId) {
          pollJobStatus(f.id, response.jobId);
        }
      } catch (e) {
        console.error("Failed to upload file", e);
      }
    });
  }, [addFiles]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    if (event.defaultPrevented) return;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
      return target.isContentEditable;
    };

    if (isTypingTarget(event.target)) return;

    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;

    const pastedFiles: File[] = [];
    for (const item of items) {
      if (!item.type?.startsWith('image/')) continue;
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'].includes(item.type)) continue;

      const blob = item.getAsFile();
      if (!blob) continue;

      const ext = blob.type.split('/')[1] || 'png';
      const name = `pasted-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
      const file = new File([blob], name, { type: blob.type });
      pastedFiles.push(file);
    }

    if (pastedFiles.length === 0) return;
    event.preventDefault();
    onDrop(pastedFiles);
  }, [onDrop]);

  useEffect(() => {
    const listener = (e: ClipboardEvent) => handlePaste(e);
    window.addEventListener('paste', listener);
    return () => window.removeEventListener('paste', listener);
  }, [handlePaste]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        {...getRootProps()}
        tabIndex={0}
        onPaste={(e) => handlePaste(e.nativeEvent)}
        className={cn(
          "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-colors duration-200 bg-white shadow-sm",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50 hover:border-slate-400"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <UploadCloud className="w-8 h-8 text-slate-500" />
          </div>
          <p className="mb-2 text-sm text-slate-700 font-medium">
            <span className="text-blue-600 font-semibold">Click to upload</span>, drag and drop, or paste an image
          </p>
          <p className="text-xs text-slate-500">
            JPG, PNG, WEBP (and more). Multiple images supported.
          </p>
        </div>
      </div>
    </motion.div>
  );
}