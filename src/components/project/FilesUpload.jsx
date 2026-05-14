import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle, Image, FileArchive, FileSpreadsheet } from 'lucide-react';

/**
 * Drag-and-drop file picker for the create-project flow.
 *
 * Holds File objects in component state (controlled via props).
 * Files aren't uploaded until project creation: after the project
 * is created, the parent loops these files through
 * projects.uploadFile(projectId, file) one at a time.
 */

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg,.zip';

export default function FilesUpload({ files = [], onChange }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const addFiles = (incoming) => {
    setError('');
    const list = Array.from(incoming);
    const accepted = [];
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`الملف "${f.name}" يتجاوز الحد الأقصى (${MAX_FILE_SIZE_MB} ميغابايت).`);
        continue;
      }
      // Avoid duplicates by name+size
      if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
      accepted.push(f);
    }
    if (accepted.length) {
      onChange([...files, ...accepted]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const remove = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="w-full text-center transition-all"
        style={{
          padding: '32px 24px',
          borderRadius: 14,
          border: `2px dashed ${isDragging ? '#136d4a' : '#cfcdc4'}`,
          background: isDragging ? 'rgba(19,109,74,0.04)' : '#fafaf6',
          cursor: 'pointer',
        }}
      >
        <div
          className="flex items-center justify-center mx-auto mb-3"
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'white',
            border: '1px solid #efece4',
            color: isDragging ? '#136d4a' : '#7a7a8c',
            transition: 'color 0.2s',
          }}
        >
          <UploadCloud size={24} strokeWidth={1.7} />
        </div>
        <div
          className="font-semibold mb-1"
          style={{ fontSize: 14, color: '#0f1129' }}
        >
          اسحب الملفات هنا أو اضغط للاختيار
        </div>
        <div style={{ fontSize: 12.5, color: '#7a7a8c' }}>
          PDF · DOC · XLS · صور · DWG · ZIP — حتى {MAX_FILE_SIZE_MB} ميغابايت لكل ملف
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = ''; // allow re-selecting same file
          }}
          style={{ display: 'none' }}
        />
      </button>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 mt-3 p-3 rounded-[10px]"
          style={{
            background: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.18)',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} strokeWidth={1.8} />
          {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="m-0 p-0 mt-4 flex flex-col gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="list-none flex items-center gap-3 px-4 py-3 rounded-[11px] animate-fade-up"
              style={{ background: 'white', border: '1px solid #e5e3dc' }}
            >
              <FileTypeIcon name={file.name} />
              <div className="min-w-0 flex-1">
                <div
                  className="font-semibold truncate"
                  style={{ fontSize: 13.5, color: '#0f1129' }}
                >
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: '#7a7a8c' }}>
                  {formatSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`إزالة ${file.name}`}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'transparent',
                  border: '1px solid #e5e3dc',
                  color: '#7a7a8c',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(185,28,28,0.3)';
                  e.currentTarget.style.color = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e3dc';
                  e.currentTarget.style.color = '#7a7a8c';
                }}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function FileTypeIcon({ name }) {
  const ext = name.split('.').pop()?.toLowerCase();
  let Icon = FileText;
  let color = '#7a7a8c';
  let bg = '#f4f1e9';

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    Icon = Image;
    color = '#2c2f7c';
    bg = 'rgba(44,47,124,0.08)';
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    Icon = FileSpreadsheet;
    color = '#136d4a';
    bg = 'rgba(19,109,74,0.08)';
  } else if (ext === 'zip' || ext === 'rar') {
    Icon = FileArchive;
    color = '#3a3d99';
    bg = 'rgba(58,61,153,0.08)';
  } else if (ext === 'pdf') {
    color = '#b91c1c';
    bg = 'rgba(185,28,28,0.06)';
  }

  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: bg,
        color: color,
      }}
    >
      <Icon size={18} strokeWidth={1.7} />
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
