import React from 'react';
import { formatBytes } from '../utils/formatBytes.js';
import { formatSpeed, formatETA } from '../utils/formatSpeed.js';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export function TransferProgress({
  progressData,
  isSender = true,
  onCancel
}) {
  if (!progressData) return null;

  const {
    fileName,
    fileSize,
    fileBytesTransferred,
    fileProgress,
    overallProgress,
    overallBytesTransferred,
    totalBytesAllFiles,
    totalFiles,
    fileIndex = 0,
    speed,
    bytesRemaining
  } = progressData;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm my-4">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isSender ? (
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          )}
          <div>
            <span className="text-xs uppercase font-mono text-gray-400 font-semibold block">
              {isSender ? 'Sending File' : 'Receiving File'} ({fileIndex + 1} of {totalFiles})
            </span>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate max-w-xs sm:max-w-md">
              {fileName}
            </h3>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="inline-flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-md font-medium transition-colors border border-rose-200"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 mb-3">
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-black h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-mono text-gray-500 pt-1">
          <span>{overallProgress}%</span>
          <span>
            {formatBytes(overallBytesTransferred)} / {formatBytes(totalBytesAllFiles)}
          </span>
        </div>
      </div>

      {/* Speed & ETA Grid */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          <span className="text-gray-400 block font-mono text-[10px] uppercase">Transfer Speed</span>
          <span className="font-semibold font-mono text-gray-800 text-sm">
            {formatSpeed(speed)}
          </span>
        </div>

        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          <span className="text-gray-400 block font-mono text-[10px] uppercase">Time Remaining</span>
          <span className="font-semibold font-mono text-gray-800 text-sm">
            {formatETA(bytesRemaining, speed)}
          </span>
        </div>
      </div>
    </div>
  );
}
