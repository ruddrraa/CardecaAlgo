'use client';

import { UploadedFile } from '@/store/useUploadStore';
import { useRef, useEffect, useState } from 'react';

export function ResultViewer({ file }: { file: UploadedFile }) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, scale: 1 });
  const [showBoxes, setShowBoxes] = useState(true);

  useEffect(() => {
    setNaturalSize({ width: 0, height: 0 });
    setImageSrc(file.previewUrl || file.resultImageUrl || '');
  }, [file.previewUrl, file.resultImageUrl]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current || !naturalSize.width || !naturalSize.height) {
        return;
      }
      const containerWidth = containerRef.current.clientWidth;
      const scale = containerWidth / naturalSize.width;
      setDimensions({
        width: containerWidth,
        height: naturalSize.height * scale,
        scale,
      });
    };

    updateDimensions();

    const observer = new ResizeObserver(() => updateDimensions());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [naturalSize]);

  if (!imageSrc) return <div className="animate-pulse h-64 bg-slate-200 rounded-lg" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={showBoxes}
            onChange={(e) => setShowBoxes(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-slate-300"
          />
          Show Bounding Boxes
        </label>
        <div className="text-xs text-slate-500">
          {file.results?.length} {file.results?.length === 1 ? 'Object' : 'Objects'} Detected
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-100/50 w-full"
        style={{ minHeight: '240px' }}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Detected vehicle"
          className="w-full h-auto block"
          onLoad={() => {
            if (!imageRef.current) return;
            setNaturalSize({
              width: imageRef.current.naturalWidth,
              height: imageRef.current.naturalHeight,
            });
          }}
          onError={() => {
            // Switch to alternate source if current image fails.
            if (imageSrc === file.previewUrl && file.resultImageUrl && file.resultImageUrl !== file.previewUrl) {
              setNaturalSize({ width: 0, height: 0 });
              setImageSrc(file.resultImageUrl);
              return;
            }

            if (imageSrc === file.resultImageUrl && file.previewUrl && file.previewUrl !== file.resultImageUrl) {
              setNaturalSize({ width: 0, height: 0 });
              setImageSrc(file.previewUrl);
            }
          }}
        />

        {showBoxes && dimensions.width > 0 && file.results?.map((res, i) => {
          const x = Math.max(0, Math.min(res.box.x * dimensions.scale, dimensions.width - 1));
          const y = Math.max(0, Math.min(res.box.y * dimensions.scale, dimensions.height - 1));
          const width = Math.max(1, Math.min(res.box.width * dimensions.scale, dimensions.width - x));
          const height = Math.max(1, Math.min(res.box.height * dimensions.scale, dimensions.height - y));
          const labelY = Math.max(0, y - 24);

          return (
            <div key={i} className="absolute inset-0 pointer-events-none">
              <div
                className="absolute border-2 border-blue-500 rounded"
                style={{ left: x, top: y, width, height }}
              />
              <div
                className="absolute bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-t"
                style={{ left: x, top: labelY }}
              >
                {res.label} {(res.confidence * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend / Detailed List */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
        {file.results?.map((res, i) => (
          <div key={i} className="bg-white px-3 py-2 rounded-md border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-semibold text-slate-700">{res.label}</span>
            </div>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
              {(res.confidence * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
