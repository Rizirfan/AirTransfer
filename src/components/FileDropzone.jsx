import React, { useState, useRef } from 'react';
import { UploadCloud, FilePlus } from 'lucide-react';

export function FileDropzone({ onFilesSelected, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-black bg-gray-50 scale-[1.01]'
          : 'border-gray-300 hover:border-gray-400 bg-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
        disabled={disabled}
      />

      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-700">
        <UploadCloud className="w-8 h-8 stroke-[1.5]" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Drop files here to send
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        or click to browse from your device
      </p>

      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
      >
        <FilePlus className="w-4 h-4" />
        <span>Select Files</span>
      </button>

      <p className="text-[11px] text-gray-400 mt-4 font-mono">
        Supports any file format • Multi-file support • No size limit
      </p>
    </div>
  );
}
