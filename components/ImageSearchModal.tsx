import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<{ url: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const searchImages = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&format=json&origin=*`);
      const data = await res.json();
      
      if (data.query && data.query.pages) {
        const fetchedImages = Object.values(data.query.pages).map((page: any) => ({
          url: page.imageinfo[0].url,
          title: page.title.replace('File:', '').split('.')[0]
        })).filter(img => img.url.match(/\.(jpeg|jpg|gif|png|svg)$/i));
        
        setImages(fetchedImages);
        if (fetchedImages.length === 0) {
          setError('Nenhuma imagem encontrada.');
        }
      } else {
        setImages([]);
        setError('Nenhuma imagem encontrada.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao buscar imagens.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                Pesquisar Imagem na Internet
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchImages()}
                placeholder="Digite o que deseja buscar (ex: Cachorro, Planeta Terra)..."
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <Button onClick={searchImages} disabled={isLoading || !query.trim()}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
              {error && <p className="text-red-500 text-center py-4">{error}</p>}
              
              {!isLoading && images.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                  <p>Pesquise por imagens gratuitas do Wikimedia Commons</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 cursor-pointer border-2 border-transparent hover:border-indigo-500 transition-colors"
                    onClick={() => {
                      onSelect(img.url);
                      onClose();
                    }}
                  >
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 font-medium px-2 text-center text-sm drop-shadow-md">
                        Selecionar
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
