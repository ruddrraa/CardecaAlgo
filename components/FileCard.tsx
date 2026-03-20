'use client';

import { motion } from 'framer-motion';
import { UploadedFile, useUploadStore } from '@/store/useUploadStore';
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { ResultViewer } from './ResultViewer';
import { useState } from 'react';

export function FileCard({ file }: { file: UploadedFile }) {
  const removeFile = useUploadStore(state => state.removeFile);
  const [showResults, setShowResults] = useState(false);

  const buildAnnotatedCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!file.results || file.results.length === 0) return null;

    const sourceUrl = file.resultImageUrl || file.previewUrl;
    const image = new Image();
    image.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to load image for annotation'));
      image.src = sourceUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2563eb';
    ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textBaseline = 'middle';

    for (const result of file.results) {
      const x = Math.max(0, result.box.x);
      const y = Math.max(0, result.box.y);
      const width = Math.max(1, result.box.width);
      const height = Math.max(1, result.box.height);
      const label = `${result.label} ${(result.confidence * 100).toFixed(1)}%`;

      ctx.strokeRect(x, y, width, height);

      const textWidth = ctx.measureText(label).width;
      const labelHeight = 34;
      const labelX = x;
      const labelY = Math.max(0, y - labelHeight);

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(labelX, labelY, textWidth + 20, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX + 10, labelY + labelHeight / 2);
    }

    return canvas;
  };

  const handleDownloadAnnotatedImage = async () => {
    const canvas = await buildAnnotatedCanvas();
    if (!canvas) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = canvas.toDataURL('image/png');
    downloadLink.download = `${file.file.name.replace(/\.[^/.]+$/, '')}_annotated.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  };

  const handleDownloadResultPdf = async () => {
    if (!file.results || file.results.length === 0) return;

    const canvas = await buildAnnotatedCanvas();
    if (!canvas) return;

    const jspdfModule = await import('jspdf/dist/jspdf.umd.min.js');
    const { jsPDF } = jspdfModule;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 14;
    const headerHeight = 72;
    let cursorY = 0;
    let currentPage = 1;

    const drawPageHeader = () => {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.line(0, headerHeight, pageWidth, headerHeight);

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(25);
      pdf.text('Cardeca', margin, 30);

      const cardecaWidth = pdf.getTextWidth('Cardeca');

      pdf.setTextColor(107, 114, 128);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(17);
      pdf.text('AlgoritHM', margin + cardecaWidth + 8, 30);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text('AI Vehicle Detection & Classification Report', margin, 45);

      pdf.setTextColor(71, 85, 105);
      pdf.text(`Page ${currentPage}`, pageWidth - margin, 24, { align: 'right' });

      cursorY = headerHeight + 18;
    };

    const ensureSpace = (required: number) => {
      if (cursorY + required <= pageHeight - margin) return;
      pdf.addPage();
      currentPage += 1;
      drawPageHeader();
    };

    const drawConfidenceBadge = (confidence: number, x: number, y: number) => {
      let fill: [number, number, number] = [220, 38, 38];
      let text: [number, number, number] = [255, 255, 255];

      if (confidence >= 0.85) {
        fill = [22, 163, 74];
      } else if (confidence >= 0.7) {
        fill = [37, 99, 235];
      } else if (confidence >= 0.5) {
        fill = [202, 138, 4];
        text = [17, 24, 39];
      }

      const label = `${(confidence * 100).toFixed(1)}%`;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      const badgeWidth = pdf.getTextWidth(label) + 14;

      pdf.setFillColor(fill[0], fill[1], fill[2]);
      pdf.roundedRect(x, y - 9, badgeWidth, 14, 4, 4, 'F');
      pdf.setTextColor(text[0], text[1], text[2]);
      pdf.text(label, x + 7, y + 1);
      pdf.setTextColor(17, 24, 39);
    };

    drawPageHeader();

    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Prediction Summary', margin, cursorY);
    cursorY += 18;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Filename: ${file.file.name}`, margin, cursorY);
    cursorY += lineHeight;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
    cursorY += lineHeight;
    pdf.text(`Total Detections: ${file.results.length}`, margin, cursorY);
    cursorY += 20;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Detections', margin, cursorY);
    cursorY += 12;

    for (let i = 0; i < file.results.length; i += 1) {
      const result = file.results[i];
      ensureSpace(58);

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, cursorY, contentWidth, 52, 6, 6, 'F');

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`${i + 1}. ${result.label}`, margin + 10, cursorY + 17);

      drawConfidenceBadge(result.confidence, pageWidth - margin - 85, cursorY + 17);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(10);
      pdf.text(
        `Bounding Box: x=${Math.round(result.box.x)}, y=${Math.round(result.box.y)}, w=${Math.round(result.box.width)}, h=${Math.round(result.box.height)}`,
        margin + 10,
        cursorY + 35,
      );

      cursorY += 60;
    }

    ensureSpace(40);
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Annotated Image', margin, cursorY);
    cursorY += 14;

    const imgData = canvas.toDataURL('image/png');
    let targetWidth = contentWidth;
    let targetHeight = (canvas.height / canvas.width) * targetWidth;
    if (targetHeight > pageHeight - cursorY - margin) {
      targetHeight = pageHeight - cursorY - margin;
      targetWidth = (canvas.width / canvas.height) * targetHeight;
    }

    if (targetHeight <= 0 || targetWidth <= 0) {
      pdf.addPage();
      currentPage += 1;
      drawPageHeader();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Annotated Image', margin, cursorY);
      cursorY += 14;

      targetWidth = contentWidth;
      targetHeight = (canvas.height / canvas.width) * targetWidth;
      if (targetHeight > pageHeight - cursorY - margin) {
        targetHeight = pageHeight - cursorY - margin;
        targetWidth = (canvas.width / canvas.height) * targetHeight;
      }
    }

    pdf.addImage(imgData, 'PNG', margin, cursorY, targetWidth, targetHeight, undefined, 'FAST');

    pdf.save(`${file.file.name.replace(/\.[^/.]+$/, '')}_result.pdf`);
  };

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
                  onClick={handleDownloadAnnotatedImage}
                >
                  Download Annotated Image
                </button>
                <button
                  className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors text-slate-700 w-full sm:w-auto"
                  onClick={handleDownloadResultPdf}
                >
                  Download PDF
                </button>
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