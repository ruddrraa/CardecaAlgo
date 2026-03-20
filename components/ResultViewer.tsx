'use client';

import { UploadedFile } from '@/store/useUploadStore';
import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image, Rect, Text, Group } from 'react-konva';

export function ResultViewer({ file }: { file: UploadedFile }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showBoxes, setShowBoxes] = useState(true);

  useEffect(() => {
    const img = new window.Image();
    img.src = file.previewUrl;
    img.onload = () => {
      setImage(img);
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / img.width;
        setDimensions({
          width: containerWidth,
          height: img.height * scale
        });
      }
    };
  }, [file.previewUrl]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && image) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / image.width;
        setDimensions({
          width: containerWidth,
          height: image.height * scale
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image]);

  if (!image) return <div className="animate-pulse h-64 bg-slate-200 rounded-lg" />;

  const scale = dimensions.width / image.width;

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

      <div ref={containerRef} className="relative rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-100/50 flex justify-center w-full">
        {dimensions.width > 0 && (
          <Stage width={dimensions.width} height={dimensions.height} className="max-w-full">
            <Layer>
              <Image
                image={image}
                width={dimensions.width}
                height={dimensions.height}
                alt="Original file"
              />
              
              {showBoxes && file.results?.map((res, i) => (
                <Group key={i}>
                  <Rect
                    x={res.box.x * scale}
                    y={res.box.y * scale}
                    width={res.box.width * scale}
                    height={res.box.height * scale}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    cornerRadius={4}
                  />
                  <Rect
                    x={res.box.x * scale}
                    y={(res.box.y * scale) - 24}
                    width={res.box.width * scale}
                    height={24}
                    fill="#3b82f6"
                    cornerRadius={[4, 4, 0, 0]}
                  />
                  <Text
                    text={`${res.label} ${(res.confidence * 100).toFixed(1)}%`}
                    x={(res.box.x * scale) + 6}
                    y={(res.box.y * scale) - 18}
                    fill="white"
                    fontSize={12}
                    fontFamily="Inter, sans-serif"
                    fontStyle="bold"
                  />
                </Group>
              ))}
            </Layer>
          </Stage>
        )}
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