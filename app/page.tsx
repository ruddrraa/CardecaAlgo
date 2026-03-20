'use client';

import { UploadBox } from '@/components/UploadBox';
import { FileCard } from '@/components/FileCard';
import { useUploadStore } from '@/store/useUploadStore';
import { Camera, RefreshCw, Cannabis } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const { files, clearFiles } = useUploadStore();

  return (
    <div className="min-h-screen bg-[#ffffff] text-white pb-20 font-sans">
      {/* Header */}
      <header className="bg-[#ffffff] border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md ">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm shadow-blue-200">
              <Cannabis className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[25px] tracking-tight text-slate-800">
  Cardeca <span className="text-[#7e7e7e] text-[17px] font-serif">AlgoritHM</span>
</h1>
          </div>
          
          {files.length > 0 && (
            <button
              onClick={clearFiles}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 mt-12">
        <div className="space-y-4 mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-black">
            Vehicle Detection & Classification
          </h2>
          <p className="text-[#7e7e7e] max-w-xl mx-auto text-lg leading-relaxed font-medium">
            Upload images to automatically detect vehicles, classify their types, and retrieve bounding box coordinates.
          </p>
        </div>

        <UploadBox />

        {/* File List */}
        <div className="mt-12 space-y-4 relative z-0">
          <AnimatePresence>
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </AnimatePresence>
          
          {files.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center text-slate-400 font-medium"
            >
              <p>No files uploaded yet. Drag some images above.</p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}