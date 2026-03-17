import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PostImageGridProps {
  images: string[];
}

const PostImageGrid = ({ images }: PostImageGridProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
      ? "grid-cols-2"
      : images.length === 3
      ? "grid-cols-2"
      : "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClass} gap-1 mx-4 mb-2 rounded-lg overflow-hidden`}>
        {images.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={`relative cursor-pointer overflow-hidden bg-muted ${
              images.length === 1 ? "max-h-[400px]" :
              images.length === 3 && i === 0 ? "row-span-2 max-h-[300px]" : "max-h-[200px]"
            }`}
            onClick={() => openLightbox(i)}
          >
            <img
              src={url}
              alt={`Foto ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            {i === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">+{images.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center justify-center min-h-[60vh] relative">
            {images.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-4 z-50 text-white/80 hover:text-white"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
            <img
              src={images[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain"
            />
            {images.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-4 z-50 text-white/80 hover:text-white"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>
          {images.length > 1 && (
            <div className="text-center text-white/60 text-sm pb-4">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostImageGrid;
