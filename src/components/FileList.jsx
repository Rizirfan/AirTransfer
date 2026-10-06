import React from 'react';
import { formatBytes } from '../utils/formatBytes.js';
import { FileText, Image, Video, Music, Archive, File, X, Download } from 'lucide-react';

function getFileIcon(mime, filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  if (mime?.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return <Video className="w-5 h-5 text-purple-500" />;
  }
  if (mime?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <Music className="w-5 h-5 text-amber-500" />;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <Archive className="w-5 h-5 text-orange-500" />;
  }
  if (mime?.includes('pdf') || ['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
    return <FileText className="w-5 h-5 text-emerald-500" />;
  }
  return <File className="w-5 h-5 text-gray-500" />;
}

export function FileList({ files, onRemoveFile, isDownloadable = false }) {
  if (!files || files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 my-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">
          {files.length} {files.length === 1 ? 'file' : 'files'} selected
        </h4>
        <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Total: {formatBytes(totalSize)}
        </span>
      </div>

      <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
        {files.map((file, idx) => (
          <div key={idx} className="py-2.5 flex items-center justify-between text-sm group hover:bg-gray-50 px-2 rounded-lg transition-colors">
            <div className="flex items-center space-x-3 truncate">
              {getFileIcon(file.type || file.mime, file.name)}
              <div className="truncate">
                <p className="font-medium text-gray-800 truncate text-xs sm:text-sm">
                  {file.name}
                </p>
                <p className="text-[11px] text-gray-400 font-mono">
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isDownloadable && file.blobUrl ? (
                <a
                  href={file.blobUrl}
                  download={file.name}
                  className="inline-flex items-center space-x-1 bg-black hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              ) : onRemoveFile ? (
                <button
                  type="button"
                  onClick={() => onRemoveFile(idx)}
                  className="text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
