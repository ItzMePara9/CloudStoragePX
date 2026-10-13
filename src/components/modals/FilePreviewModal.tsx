import React, { useState } from 'react';
import {
  X,
  Download,
  Star,
  FileText,
  FileCode,
  ShieldCheck,
  Calendar,
  HardDrive,
  Copy,
  Check,
  Maximize2,
} from 'lucide-react';
import { FileItem } from '../../types';
import { formatBytes, formatDate } from '../../utils/format';

interface FilePreviewModalProps {
  isOpen: boolean;
  file: FileItem | null;
  onClose: () => void;
  onToggleStar?: (id: string) => void;
}

export function FilePreviewModal({ isOpen, file, onClose, onToggleStar }: FilePreviewModalProps) {
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  if (!isOpen || !file) return null;

  const previewUrl = `/api/files/${file.id}/preview`;
  const downloadUrl = `/api/files/${file.id}/download`;

  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type.includes('pdf');
  const isText =
    file.mime_type.startsWith('text/') ||
    file.mime_type.includes('json') ||
    file.mime_type.includes('javascript') ||
    file.mime_type.includes('typescript');

  const copyChecksum = () => {
    navigator.clipboard.writeText(file.checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 truncate max-w-xl">
            <h3 className="text-base font-semibold text-white truncate">{file.name}</h3>
            <span className="text-xs text-slate-400 font-mono shrink-0 tabular-nums">
              {formatBytes(file.size)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleStar && (
              <button
                onClick={() => onToggleStar(file.id)}
                className={`p-2 rounded-xl transition-colors ${
                  file.is_favorite
                    ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={file.is_favorite ? 'Remove favorite' : 'Add to favorites'}
              >
                <Star className={`w-4 h-4 ${file.is_favorite ? 'fill-amber-400' : ''}`} />
              </button>
            )}

            <a
              href={downloadUrl}
              download={file.name}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Content and Details */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Preview Frame */}
          <div className="flex-1 bg-black/40 flex items-center justify-center p-4 overflow-auto">
            {isImage && (
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
              />
            )}

            {isVideo && (
              <video
                src={previewUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg shadow-lg"
              />
            )}

            {isAudio && (
              <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{file.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{file.mime_type}</p>
                </div>
                <audio src={previewUrl} controls className="w-full mt-4" />
              </div>
            )}

            {isPdf && (
              <iframe
                src={previewUrl}
                title={file.name}
                className="w-full h-full rounded-lg border border-slate-800"
              />
            )}

            {isText && (
              <iframe
                src={previewUrl}
                title={file.name}
                className="w-full h-full bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800"
              />
            )}

            {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
              <div className="text-center p-8 max-w-sm space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center">
                  <FileCode className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-white">Preview Not Available</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This file format ({file.mime_type}) cannot be previewed in the browser directly.
                  Download the file to inspect its content safely.
                </p>
                <div className="pt-2">
                  <a
                    href={downloadUrl}
                    download={file.name}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800/80 bg-slate-900/40 p-5 overflow-y-auto space-y-5 shrink-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              File Details
            </h4>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">MIME Type</span>
                <span className="font-mono text-slate-200 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 inline-block">
                  {file.mime_type}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">File Size</span>
                <div className="flex items-center gap-2 text-slate-200 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{formatBytes(file.size)}</span>
                  <span className="text-slate-400 text-[11px]">({file.size.toLocaleString()} bytes)</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Uploaded Date</span>
                <div className="flex items-center gap-2 text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Last Modified</span>
                <div className="flex items-center gap-2 text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{formatDate(file.updated_at)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Encryption Protocol</span>
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">AES-256-GCM (At Rest)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">SHA-256 Integrity Checksum</span>
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="font-mono text-[11px] text-slate-400 truncate select-all">
                    {file.checksum}
                  </span>
                  <button
                    onClick={copyChecksum}
                    className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                    title="Copy Checksum"
                  >
                    {copiedChecksum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
