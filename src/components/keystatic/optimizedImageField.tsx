import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fields } from '@keystatic/core';

export type CropPresetId = '3:4' | '4:3' | '16:9' | 'free';

export interface ImageFieldValue {
  data: Uint8Array;
  extension: string;
  filename: string;
}

export interface OptimizedImageFieldOptions {
  label: string;
  description?: string;
  directory?: string;
  publicPath?: string;
  validation?: {
    isRequired?: boolean;
  };
  transformFilename?: (originalFilename: string) => string;
  defaultAspect?: CropPresetId;
  maxWidth?: number;
  quality?: number;
}

interface AspectPreset {
  id: CropPresetId;
  label: string;
  hint: string;
  ratio: number | null;
}

const ASPECT_PRESETS: AspectPreset[] = [
  { id: '3:4', label: '3:4', hint: 'Персонал', ratio: 3 / 4 },
  { id: '4:3', label: '4:3', hint: 'Відділення', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', hint: 'Новини / Карусель', ratio: 16 / 9 },
  { id: 'free', label: 'Вільно', hint: 'Будь-яка область', ratio: null },
];

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function formatKB(bytes: number): string {
  const kb = bytes / 1024;
  return `${kb.toLocaleString('uk-UA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} КБ`;
}

function sanitizeBaseName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'photo';
}

function getRatioForPreset(presetId: CropPresetId): number | null {
  return ASPECT_PRESETS.find((p) => p.id === presetId)?.ratio ?? null;
}

function computeInitialCrop(imgW: number, imgH: number, ratio: number | null): CropRect {
  if (!ratio) {
    return { x: 0, y: 0, w: imgW, h: imgH };
  }
  let w = imgW;
  let h = w / ratio;
  if (h > imgH) {
    h = imgH;
    w = h * ratio;
  }
  return {
    x: (imgW - w) / 2,
    y: (imgH - h) / 2,
    w,
    h,
  };
}

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: ImageFieldValue) => void;
  currentValue: ImageFieldValue | null;
  defaultAspect: CropPresetId;
  maxWidth: number;
  defaultQuality: number;
  transformFilename?: (originalFilename: string) => string;
}

function PhotoCropModal({
  isOpen,
  onClose,
  onApply,
  currentValue,
  defaultAspect,
  maxWidth,
  defaultQuality,
  transformFilename,
}: CropModalProps) {
  const [aspect, setAspect] = useState<CropPresetId>(defaultAspect);
  const [qualityPct, setQualityPct] = useState<number>(Math.round(defaultQuality * 100));
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('photo');
  const [origBytes, setOrigBytes] = useState<number>(0);
  const [origDims, setOrigDims] = useState<{ w: number; h: number } | null>(null);

  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [displayScale, setDisplayScale] = useState<number>(1);

  const [webpBlob, setWebpBlob] = useState<Blob | null>(null);
  const [webpPreviewUrl, setWebpPreviewUrl] = useState<string | null>(null);
  const [outDims, setOutDims] = useState<{ w: number; h: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const cropBoxRef = useRef<HTMLDivElement | null>(null);
  const encodeTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    mode: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  // Очищення ObjectURL при закритті або розмонтуванні
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  useEffect(() => {
    return () => {
      if (webpPreviewUrl) URL.revokeObjectURL(webpPreviewUrl);
    };
  }, [webpPreviewUrl]);

  const recalcDisplayScale = useCallback(() => {
    const imgEl = previewImgRef.current;
    const nat = loadedImageRef.current;
    if (!imgEl || !nat || !nat.naturalWidth) return;
    const rect = imgEl.getBoundingClientRect();
    if (rect.width > 0) {
      setDisplayScale(rect.width / nat.naturalWidth);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => recalcDisplayScale();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, recalcDisplayScale]);

  const loadBlob = useCallback(
    (blob: Blob, filename: string) => {
      setErrorMsg('');
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        loadedImageRef.current = img;
        setSourceUrl(url);
        setSourceName(filename || 'photo');
        setOrigBytes(blob.size);
        setOrigDims({ w: img.naturalWidth, h: img.naturalHeight });
        const initial = computeInitialCrop(
          img.naturalWidth,
          img.naturalHeight,
          getRatioForPreset(aspect)
        );
        setCrop(initial);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            recalcDisplayScale();
          });
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setErrorMsg('Не вдалося прочитати зображення. Оберіть інший файл (JPG, PNG або WebP).');
      };
      img.src = url;
    },
    [aspect, recalcDisplayScale]
  );

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Будь ласка, оберіть зображення (JPG, PNG або WebP).');
        return;
      }
      loadBlob(file, file.name);
    },
    [loadBlob]
  );

  const loadCurrentFieldImage = useCallback(() => {
    if (!currentValue?.data) return;
    const mime =
      currentValue.extension === 'png'
        ? 'image/png'
        : currentValue.extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    const bytes = new Uint8Array(currentValue.data.byteLength);
    bytes.set(currentValue.data);
    const blob = new Blob([bytes.buffer], { type: mime });
    loadBlob(blob, currentValue.filename || 'photo');
  }, [currentValue, loadBlob]);

  // Підтримка Ctrl+V та Escape поки модалка відкрита
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const pasted = item.getAsFile();
          if (pasted) {
            e.preventDefault();
            handleFile(pasted);
            break;
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, handleFile, onClose]);

  // Перерахунок WebP при зміні області або якості
  const encodeWebPNow = useCallback(
    (targetCrop: CropRect, qPct: number) => {
      const img = loadedImageRef.current;
      if (!img || targetCrop.w < 2 || targetCrop.h < 2) return;

      const scale = targetCrop.w > maxWidth ? maxWidth / targetCrop.w : 1;
      const outW = Math.max(1, Math.round(targetCrop.w * scale));
      const outH = Math.max(1, Math.round(targetCrop.h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        Math.round(targetCrop.x),
        Math.round(targetCrop.y),
        Math.round(targetCrop.w),
        Math.round(targetCrop.h),
        0,
        0,
        outW,
        outH
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setWebpBlob(blob);
          setOutDims({ w: outW, h: outH });
          const preview = URL.createObjectURL(blob);
          setWebpPreviewUrl(preview);
        },
        'image/webp',
        clamp(qPct, 10, 100) / 100
      );
    },
    [maxWidth]
  );

  useEffect(() => {
    if (!isOpen || !loadedImageRef.current || crop.w < 2 || crop.h < 2) return;
    if (encodeTimerRef.current !== null) {
      window.clearTimeout(encodeTimerRef.current);
    }
    encodeTimerRef.current = window.setTimeout(() => {
      encodeWebPNow(crop, qualityPct);
    }, 65);
    return () => {
      if (encodeTimerRef.current !== null) {
        window.clearTimeout(encodeTimerRef.current);
      }
    };
  }, [isOpen, crop, qualityPct, encodeWebPNow]);

  const handleAspectChange = (nextAspect: CropPresetId) => {
    setAspect(nextAspect);
    const img = loadedImageRef.current;
    if (img) {
      setCrop(
        computeInitialCrop(img.naturalWidth, img.naturalHeight, getRatioForPreset(nextAspect))
      );
    }
  };

  const handlePointerDownCrop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loadedImageRef.current) return;
    const target = e.target as HTMLElement;
    const handle = (target.dataset.handle as DragHandle | undefined) || 'move';
    dragStateRef.current = {
      mode: handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
    cropBoxRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePointerMoveCrop = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const img = loadedImageRef.current;
    if (!drag || !img || !displayScale) return;

    const dx = (e.clientX - drag.startX) / displayScale;
    const dy = (e.clientY - drag.startY) / displayScale;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const R = getRatioForPreset(aspect);
    const s = drag.startCrop;
    const minSide = Math.min(60, Math.min(imgW, imgH) * 0.2);

    if (drag.mode === 'move') {
      setCrop({
        x: clamp(s.x + dx, 0, imgW - s.w),
        y: clamp(s.y + dy, 0, imgH - s.h),
        w: s.w,
        h: s.h,
      });
      return;
    }

    if (R === null) {
      // Вільне виділення без фіксованих пропорцій
      let x = s.x;
      let y = s.y;
      let w = s.w;
      let h = s.h;

      if (drag.mode === 'se') {
        w = clamp(s.w + dx, minSide, imgW - s.x);
        h = clamp(s.h + dy, minSide, imgH - s.y);
      } else if (drag.mode === 'sw') {
        const right = s.x + s.w;
        w = clamp(s.w - dx, minSide, right);
        x = right - w;
        h = clamp(s.h + dy, minSide, imgH - s.y);
      } else if (drag.mode === 'ne') {
        const bottom = s.y + s.h;
        w = clamp(s.w + dx, minSide, imgW - s.x);
        h = clamp(s.h - dy, minSide, bottom);
        y = bottom - h;
      } else if (drag.mode === 'nw') {
        const right = s.x + s.w;
        const bottom = s.y + s.h;
        w = clamp(s.w - dx, minSide, right);
        h = clamp(s.h - dy, minSide, bottom);
        x = right - w;
        y = bottom - h;
      }
      setCrop({ x, y, w, h });
      return;
    }

    // Пропорційне масштабування (3:4, 4:3, 16:9)
    const minW = Math.min(80, Math.min(imgW, imgH * R) * 0.25);
    if (drag.mode === 'se') {
      const maxW = Math.min(imgW - s.x, (imgH - s.y) * R);
      const deltaW = Math.abs(dx) >= Math.abs(dy * R) ? dx : dy * R;
      const newW = clamp(s.w + deltaW, minW, maxW);
      setCrop({ x: s.x, y: s.y, w: newW, h: newW / R });
    } else if (drag.mode === 'sw') {
      const anchorX = s.x + s.w;
      const maxW = Math.min(anchorX, (imgH - s.y) * R);
      const deltaW = Math.abs(dx) >= Math.abs(dy * R) ? -dx : dy * R;
      const newW = clamp(s.w + deltaW, minW, maxW);
      setCrop({ x: anchorX - newW, y: s.y, w: newW, h: newW / R });
    } else if (drag.mode === 'ne') {
      const anchorY = s.y + s.h;
      const maxW = Math.min(imgW - s.x, anchorY * R);
      const deltaW = Math.abs(dx) >= Math.abs(dy * R) ? dx : -dy * R;
      const newW = clamp(s.w + deltaW, minW, maxW);
      const newH = newW / R;
      setCrop({ x: s.x, y: anchorY - newH, w: newW, h: newH });
    } else if (drag.mode === 'nw') {
      const anchorX = s.x + s.w;
      const anchorY = s.y + s.h;
      const maxW = Math.min(anchorX, anchorY * R);
      const deltaW = Math.abs(dx) >= Math.abs(dy * R) ? -dx : -dy * R;
      const newW = clamp(s.w + deltaW, minW, maxW);
      const newH = newW / R;
      setCrop({ x: anchorX - newW, y: anchorY - newH, w: newW, h: newH });
    }
  };

  const handlePointerUpCrop = () => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    encodeWebPNow(crop, qualityPct);
  };

  const handleApply = async () => {
    if (!webpBlob || isApplying) return;
    setIsApplying(true);
    try {
      const buffer = await webpBlob.arrayBuffer();
      const data = new Uint8Array(buffer);
      const rawName = `${sanitizeBaseName(sourceName)}.webp`;
      const finalFilename = transformFilename ? transformFilename(rawName) : rawName;
      onApply({
        data,
        extension: 'webp',
        filename: finalFilename.endsWith('.webp') ? finalFilename : `${finalFilename}.webp`,
      });
      onClose();
    } catch {
      setErrorMsg('Не вдалося застосувати оптимізоване фото. Спробуйте ще раз.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetSource = () => {
    loadedImageRef.current = null;
    setSourceUrl(null);
    setWebpPreviewUrl(null);
    setWebpBlob(null);
    setOutDims(null);
    setOrigDims(null);
    setOrigBytes(0);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const savedBytes = webpBlob ? origBytes - webpBlob.size : 0;
  const savingsPct = origBytes > 0 && webpBlob ? (savedBytes / origBytes) * 100 : 0;

  const modalContent = (
    <div
      data-react-aria-top-layer="true"
      data-knt-photo-modal="true"
      role="dialog"
      aria-modal="true"
      aria-label="Обрізка та стиснення фото у WebP"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.68)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: '20px',
          border: '1px solid #bae6fd',
          boxShadow: '0 25px 70px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Шапка модалки */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 22px',
            background: 'linear-gradient(90deg, #f0f9ff 0%, #eff6ff 100%)',
            borderBottom: '1px solid #e0f2fe',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2,
              }}
            >
              Обрізка та стиснення фото (WebP)
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
              Рекомендовано для цього поля: <strong>{defaultAspect}</strong> • макс. ширина{' '}
              <strong>{maxWidth} px</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити вікно"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Тіло модалки */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {errorMsg && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {errorMsg}
            </div>
          )}

          {!sourceUrl ? (
            /* Екран вибору / перетягування фото */
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              style={{
                border: `2px dashed ${isDragOver ? '#2563eb' : '#7dd3fc'}`,
                backgroundColor: isDragOver ? '#e0f2fe' : '#f8fafc',
                borderRadius: '18px',
                padding: '44px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 14px',
                  borderRadius: '16px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                }}
              >
                🖼️
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Перетягніть фото сюди або натисніть для вибору
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                Підтримуються JPG, PNG, WebP • можна вставити з буфера (Ctrl+V)
              </div>

              <div
                style={{
                  marginTop: '18px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  Обрати файл
                </span>

                {currentValue?.data && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadCurrentFieldImage();
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #93c5fd',
                      color: '#1d4ed8',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Обрізати поточне фото з поля
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Робоча область кропу + статистика */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '18px',
                alignItems: 'start',
              }}
            >
              {/* Ліва частина: вибір пропорції + область обрізки */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ASPECT_PRESETS.map((preset) => {
                      const active = aspect === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-modal-aspect={preset.id}
                          onClick={() => handleAspectChange(preset.id)}
                          style={{
                            padding: '6px 11px',
                            borderRadius: '10px',
                            border: `1.5px solid ${active ? '#2563eb' : '#cbd5e1'}`,
                            backgroundColor: active ? '#2563eb' : '#f8fafc',
                            color: active ? '#ffffff' : '#334155',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title={preset.hint}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const img = loadedImageRef.current;
                        if (img) {
                          setCrop(
                            computeInitialCrop(
                              img.naturalWidth,
                              img.naturalHeight,
                              getRatioForPreset(aspect)
                            )
                          );
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #bae6fd',
                        backgroundColor: '#f0f9ff',
                        color: '#0369a1',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Макс. область
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSource}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Інше фото
                    </button>
                  </div>
                </div>

                {/* Контейнер зображення з інтерактивною рамкою */}
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: '#0f172a',
                    borderRadius: '14px',
                    padding: '12px',
                    minHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      overflow: 'hidden',
                      userSelect: 'none',
                      touchAction: 'none',
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      ref={previewImgRef}
                      src={sourceUrl}
                      alt="Попередній перегляд для обрізки"
                      draggable={false}
                      onLoad={recalcDisplayScale}
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '46vh',
                        width: 'auto',
                        height: 'auto',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    />

                    {/* Інтерактивна рамка обрізки */}
                    <div
                      ref={cropBoxRef}
                      onPointerDown={handlePointerDownCrop}
                      onPointerMove={handlePointerMoveCrop}
                      onPointerUp={handlePointerUpCrop}
                      onPointerCancel={handlePointerUpCrop}
                      style={{
                        position: 'absolute',
                        left: `${crop.x * displayScale}px`,
                        top: `${crop.y * displayScale}px`,
                        width: `${crop.w * displayScale}px`,
                        height: `${crop.h * displayScale}px`,
                        border: '2px solid #38bdf8',
                        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
                        cursor: 'move',
                        boxSizing: 'border-box',
                        touchAction: 'none',
                      }}
                    >
                      {/* Сітка третин */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gridTemplateRows: 'repeat(3, 1fr)',
                        }}
                      >
                        {Array.from({ length: 9 }).map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              borderRight:
                                idx % 3 !== 2 ? '1px solid rgba(255,255,255,0.35)' : undefined,
                              borderBottom:
                                idx < 6 ? '1px solid rgba(255,255,255,0.35)' : undefined,
                            }}
                          />
                        ))}
                      </div>

                      {/* 4 кутові маркери */}
                      {(
                        [
                          { id: 'nw', top: -8, left: -8, cursor: 'nwse-resize' },
                          { id: 'ne', top: -8, right: -8, cursor: 'nesw-resize' },
                          { id: 'sw', bottom: -8, left: -8, cursor: 'nesw-resize' },
                          { id: 'se', bottom: -8, right: -8, cursor: 'nwse-resize' },
                        ] as const
                      ).map((h) => (
                        <div
                          key={h.id}
                          data-handle={h.id}
                          style={{
                            position: 'absolute',
                            top: 'top' in h ? h.top : undefined,
                            bottom: 'bottom' in h ? h.bottom : undefined,
                            left: 'left' in h ? h.left : undefined,
                            right: 'right' in h ? h.right : undefined,
                            width: '16px',
                            height: '16px',
                            borderRadius: '999px',
                            backgroundColor: '#ffffff',
                            border: '3px solid #2563eb',
                            boxShadow: '0 2px 6px rgba(15,23,42,0.4)',
                            cursor: h.cursor,
                            touchAction: 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Права частина: статистика, якість і прев'ю WebP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Картка статистики */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#64748b',
                      }}
                    >
                      Оригінал
                    </div>
                    <div
                      data-modal-stat-orig
                      style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}
                    >
                      {formatKB(origBytes)}
                    </div>
                    {origDims && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {origDims.w} × {origDims.h} px
                      </div>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#0369a1',
                      }}
                    >
                      Після стиснення (WebP)
                    </div>
                    <div
                      data-modal-stat-webp
                      style={{ fontSize: '16px', fontWeight: 800, color: '#1d4ed8' }}
                    >
                      {webpBlob ? formatKB(webpBlob.size) : '…'}
                    </div>
                    <div
                      data-modal-stat-dims
                      style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}
                    >
                      {outDims ? `${outDims.w} × ${outDims.h} px` : '—'}
                    </div>
                  </div>

                  <div
                    style={{
                      gridColumn: '1 / -1',
                      paddingTop: '8px',
                      borderTop: '1px solid #dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: '#334155' }}>Економія розміру:</span>
                    <span
                      data-modal-stat-savings
                      style={{
                        color: savingsPct >= 0 ? '#047857' : '#b45309',
                        fontSize: '14px',
                        fontWeight: 800,
                      }}
                    >
                      {webpBlob
                        ? savingsPct >= 0
                          ? `-${savingsPct.toFixed(1)}% (${formatKB(savedBytes)})`
                          : `+${Math.abs(savingsPct).toFixed(1)}%`
                        : '…'}
                    </span>
                  </div>
                </div>

                {/* Повзунок якості */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    <span>Якість WebP</span>
                    <span style={{ color: '#2563eb' }}>{qualityPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={qualityPct}
                    onChange={(e) => setQualityPct(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                </div>

                {/* Попередній перегляд WebP */}
                {webpPreviewUrl && (
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #e0f2fe',
                      backgroundColor: '#f8fafc',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxHeight: '160px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={webpPreviewUrl}
                      alt="Результат WebP"
                      style={{
                        maxHeight: '144px',
                        maxWidth: '100%',
                        borderRadius: '8px',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Нижня панель дій */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '14px 22px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Скасувати
          </button>

          <button
            type="button"
            data-modal-apply
            disabled={!webpBlob || isApplying}
            onClick={handleApply}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: !webpBlob || isApplying ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: !webpBlob || isApplying ? 'not-allowed' : 'pointer',
              boxShadow:
                !webpBlob || isApplying ? 'none' : '0 6px 18px rgba(37, 99, 235, 0.25)',
            }}
          >
            {isApplying ? 'Застосовуємо…' : 'Застосувати фото'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface WrappedInputProps {
  baseField: ReturnType<typeof fields.image>;
  fieldProps: any;
  defaultAspect: CropPresetId;
  maxWidth: number;
  quality: number;
  transformFilename?: (originalFilename: string) => string;
}

function OptimizedImageInput({
  baseField,
  fieldProps,
  defaultAspect,
  maxWidth,
  quality,
  transformFilename,
}: WrappedInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const BaseInput = baseField.Input;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <BaseInput {...fieldProps} />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          data-open-photo-cropper="true"
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 13px',
            borderRadius: '8px',
            border: '1px solid #38bdf8',
            backgroundColor: '#f0f9ff',
            color: '#0369a1',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            lineHeight: 1.2,
          }}
        >
          <span aria-hidden="true">✂️</span>
          <span>Обрізати та стиснути (WebP)</span>
        </button>

        <span style={{ fontSize: '11px', color: '#64748b' }}>
          Формат {defaultAspect} • до {maxWidth} px
        </span>
      </div>

      {isModalOpen && (
        <PhotoCropModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onApply={(nextVal) => fieldProps.onChange(nextVal)}
          currentValue={fieldProps.value ?? null}
          defaultAspect={defaultAspect}
          maxWidth={maxWidth}
          defaultQuality={quality}
          transformFilename={transformFilename}
        />
      )}
    </div>
  );
}

/**
 * Обгортка над стандартним fields.image() Keystatic із вбудованою модалкою обрізки та стиснення в WebP.
 * Зберігає 100% сумісність із локальним і GitHub-режимом Keystatic, залишаючи стандартну кнопку завантаження.
 */
export function optimizedImageField(options: OptimizedImageFieldOptions) {
  const {
    defaultAspect = '16:9',
    maxWidth = 1200,
    quality = 0.8,
    label,
    description,
    directory,
    publicPath,
    validation,
    transformFilename,
  } = options;

  const baseField = fields.image({
    label,
    description,
    directory,
    publicPath,
    validation,
    transformFilename,
  });

  return {
    ...baseField,
    Input(props: any) {
      return (
        <OptimizedImageInput
          baseField={baseField}
          fieldProps={props}
          defaultAspect={defaultAspect}
          maxWidth={maxWidth}
          quality={quality}
          transformFilename={transformFilename}
        />
      );
    },
  };
}

/**
 * Компактний знак у шапці Keystatic (ui.brand.mark) із швидким посиланням на окрему сторінку підготовки фото.
 */
export function KeystaticBrandMark({ colorScheme }: { colorScheme: 'light' | 'dark' }) {
  const isDark = colorScheme === 'dark';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '7px',
          background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        +
      </span>
      <a
        href="/tools/photo-prep"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Відкрити утиліту підготовки та обрізки фото у новій вкладці"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '999px',
          border: `1px solid ${isDark ? '#0284c7' : '#7dd3fc'}`,
          backgroundColor: isDark ? 'rgba(14, 165, 233, 0.16)' : '#f0f9ff',
          color: isDark ? '#7dd3fc' : '#0369a1',
          fontSize: '11px',
          fontWeight: 700,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden="true">✂️</span>
        <span>Фото WebP</span>
      </a>
    </span>
  );
}
