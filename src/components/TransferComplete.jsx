import React from 'react';
import { FileList } from './FileList.jsx';
import { CheckCircle2, RefreshCw, Send, Download } from 'lucide-react';

export function TransferComplete({
  files,
  isSender = false,
  onReset
}) {
  const downloadAll = () => {
    if (!files) return;
    files.forEach((file) => {
      if (file.blobUrl) {
        const a = document.createElement('a');
        a.href = file.blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-center shadow-sm my-4">
      <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-1">
        {isSender ? 'Transfer Completed!' : 'Files Received Successfully!'}
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {isSender
          ? 'All files were transferred directly to the receiver browser.'
          : 'Files are stored in your browser memory and ready for download.'}
      </p>

      {/* Render received/sent file list */}
      <div className="text-left max-w-md mx-auto">
        <FileList files={files} isDownloadable={!isSender} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {!isSender && files && files.length > 1 && (
          <button
            onClick={downloadAll}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download All ({files.length})</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="inline-flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Start New Transfer</span>
        </button>
      </div>
    </div>
  );
}
