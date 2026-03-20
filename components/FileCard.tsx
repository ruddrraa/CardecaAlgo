'use client';

import { motion } from 'framer-motion';
import { UploadedFile, useUploadStore } from '@/store/useUploadStore';
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { ResultViewer } from './ResultViewer';
import { useState } from 'react';

export function FileCard({ file }: { file: UploadedFile }) {
  const removeFile = useUploadStore(state => state.removeFile);
  const [showResults, setShowResults] = useState(false);

  const getStatusIcon = () => {
    switch (file.status) {
      case 'Queued':
        return <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />;
      case 'Processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'Done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4">
        {/* Thumbnail Preview */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200 shadow-sm">
          <img
            src={file.previewUrl}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-slate-800 truncate pr-4">
              {file.file.name}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 capitalize flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                {getStatusIcon()}
                {file.status}
              </span>
            </div>
          </div>
          
          <div className="flex items-center text-xs text-slate-500 mb-2.5 font-medium">
            {(file.file.size / 1024 / 1024).toFixed(2)} MB • {(file.file.type || 'image/unknown').split('/')[1]?.toUpperCase()}
          </div>

          {/* Progress Bar */}
          {(file.status === 'Queued' || file.status === 'Processing') && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50 shadow-inner">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${file.progress}%` }}
              ></div>
            </div>
          )}

          {/* Error Message */}
          {file.status === 'Error' && (
            <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Failed to process image.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-2 shrink-0 ml-auto sm:ml-0 self-center">
          <button
            onClick={() => removeFile(file.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-xl transition-colors ring-1 ring-inset ring-transparent hover:ring-red-100"
            title="Remove file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {file.status === 'Done' && file.results && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="px-4 py-3 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                Analysis Complete 
                <span className="text-slate-300 hidden sm:inline">•</span>
                <button
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold transition-colors bg-blue-50 px-2 py-0.5 rounded sm:bg-transparent sm:px-0 sm:py-0"
                  onClick={() => setShowResults(!showResults)}
                >
                  {showResults ? 'Hide Results' : 'View Results'}
                </button>
              </p>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors text-slate-700 w-full sm:w-auto"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(file.results, null, 2));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", file.file.name.replace(/\.[^/.]+$/, "") + "_results.json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                  }}
                >
                  Download JSON
                </button>
              </div>
            </div>
            
            {showResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200"
              >
                <div className="p-3">
                  <ResultViewer file={file} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}