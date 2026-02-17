import { useState, useCallback, useRef, useEffect } from "react";

interface UseFotoProfiloProps {
  onFileChange: (file: File | null) => void;
}

export const useFotoProfilo = ({ onFileChange }: UseFotoProfiloProps) => {
  const [fotoProfiloPreviewUrl, setFotoProfiloPreviewUrl] = useState<string | null>(null);
  const [isDraggingFoto, setIsDraggingFoto] = useState(false);
  const [fotoProfiloOffset, setFotoProfiloOffset] = useState({ offsetX: 0, offsetY: 0 });
  const [fotoProfiloPanLimits, setFotoProfiloPanLimits] = useState<{ 
    coverWidth: string; 
    coverHeight: string; 
    maxX: number; 
    maxY: number 
  } | null>(null);
  const [showDragHint, setShowDragHint] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFotoProfiloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const url = URL.createObjectURL(file);
      setFotoProfiloPreviewUrl(url);
      onFileChange(file);
    }
  };

  const onFotoPanStart = (clientX: number, clientY: number) => {
    setIsDraggingFoto(true);
    dragStartRef.current = { x: clientX, y: clientY };
    setShowDragHint(false);
  };

  const onFotoPanMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingFoto || !dragStartRef.current || !fotoProfiloPanLimits) return;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    setFotoProfiloOffset(prev => {
      const newOffsetX = Math.max(-fotoProfiloPanLimits.maxX, Math.min(fotoProfiloPanLimits.maxX, prev.offsetX + deltaX));
      const newOffsetY = Math.max(-fotoProfiloPanLimits.maxY, Math.min(fotoProfiloPanLimits.maxY, prev.offsetY + deltaY));
      return { offsetX: newOffsetX, offsetY: newOffsetY };
    });

    dragStartRef.current = { x: clientX, y: clientY };
  }, [isDraggingFoto, fotoProfiloPanLimits]);

  const onFotoPanEnd = useCallback(() => {
    setIsDraggingFoto(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDraggingFoto) {
      const handleMouseMove = (e: MouseEvent) => onFotoPanMove(e.clientX, e.clientY);
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) onFotoPanMove(e.touches[0].clientX, e.touches[0].clientY);
      };
      const handleEnd = () => onFotoPanEnd();

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('touchcancel', handleEnd);
      };
    }
  }, [isDraggingFoto, onFotoPanMove, onFotoPanEnd]);

  const onFotoImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    const container = img.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      
      if (imgRect.width > containerRect.width || imgRect.height > containerRect.height) {
        const maxX = (imgRect.width - containerRect.width) / 2;
        const maxY = (imgRect.height - containerRect.height) / 2;
        setFotoProfiloPanLimits({
          coverWidth: `${imgRect.width}px`,
          coverHeight: `${imgRect.height}px`,
          maxX,
          maxY,
        });
        setShowDragHint(true);
      } else {
        setFotoProfiloPanLimits(null);
        setShowDragHint(false);
      }
    }
  };

  const resetFotoPan = () => {
    setFotoProfiloOffset({ offsetX: 0, offsetY: 0 });
  };

  const removeFotoProfilo = () => {
    setFotoProfiloPreviewUrl(null);
    setFotoProfiloOffset({ offsetX: 0, offsetY: 0 });
    setFotoProfiloPanLimits(null);
    onFileChange(null);
  };

  return {
    fotoProfiloPreviewUrl,
    isDraggingFoto,
    fotoProfiloOffset,
    fotoProfiloPanLimits,
    showDragHint,
    handleFotoProfiloChange,
    onFotoPanStart,
    onFotoImageLoad,
    resetFotoPan,
    removeFotoProfilo,
  };
};