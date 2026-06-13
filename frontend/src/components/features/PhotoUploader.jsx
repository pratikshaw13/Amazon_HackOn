'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera, X, ImagePlus } from 'lucide-react'

export default function PhotoUploader({ onAnalyse, isLoading = false }) {
  const [files, setFiles] = useState([])

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.slice(0, 5 - files.length).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    setFiles(prev => [...prev, ...newFiles].slice(0, 5))
  }, [files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5
  })

  const removeFile = (index) => {
    setFiles(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleAnalyse = () => {
    if (files.length > 0 && onAnalyse) {
      onAnalyse(files.map(f => f.file))
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-brand-green bg-brand-green-light'
            : 'border-gray-200 hover:border-brand-green hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-brand-green-light flex items-center justify-center">
            <ImagePlus className="h-8 w-8 text-brand-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? 'Drop your photos here' : 'Drag & drop product photos here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse (max 5 photos, 10MB each)</p>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-green bg-brand-green-light rounded-lg hover:bg-brand-green/20"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue bg-brand-blue-light rounded-lg hover:bg-brand-blue/20"
            >
              <Camera className="h-3.5 w-3.5" /> Take Photo
            </button>
          </div>
        </div>
      </div>

      {/* Preview thumbnails */}
      {files.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {files.map((fileObj, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={fileObj.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Analyse button */}
      {files.length > 0 && (
        <button
          onClick={handleAnalyse}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analysing with AI...
            </>
          ) : (
            <>✨ Analyse with AI ({files.length} photo{files.length !== 1 ? 's' : ''})</>
          )}
        </button>
      )}
    </div>
  )
}
