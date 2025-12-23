import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Layers, Check, AlertTriangle } from 'lucide-react';

interface ScannerProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  batchMode?: boolean;
  batchCount?: number;
  onToggleBatch?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ 
  onCapture, 
  onClose, 
  batchMode = false, 
  batchCount = 0,
  onToggleBatch 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Kamera erişimi reddedildi veya cihaz desteklemiyor.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        
        onCapture(base64);

        if (batchMode) {
          setFlashMessage("Eklendi!");
          setTimeout(() => setFlashMessage(null), 1000);
        } else {
          stopCamera();
        }
      }
    }
  };

  if (!hasPermission) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="bg-gray-900 p-8 rounded-2xl max-w-sm w-full shadow-2xl border border-gray-800">
           <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
             <Camera size={32} className="text-library-400" />
           </div>
           
           <h3 className="text-xl font-bold mb-2">Kamera Erişimi</h3>
           <p className="text-gray-400 mb-8 text-sm leading-relaxed">
             Kitap barkodlarını ve kapaklarını tarayabilmek için kameranızı kullanmamız gerekiyor.
           </p>

           {error && (
             <div className="bg-red-900/50 border border-red-800 p-3 rounded-lg mb-6 flex items-center gap-2 text-red-200 text-xs text-left">
               <AlertTriangle size={16} className="shrink-0" />
               {error}
             </div>
           )}

           <div className="flex flex-col gap-3">
             <button 
              onClick={() => startCamera()}
              className="w-full py-3 bg-library-600 hover:bg-library-500 rounded-xl font-semibold transition-colors"
             >
               Kamerayı Başlat
             </button>
             <button 
              onClick={onClose}
              className="w-full py-3 text-gray-500 hover:text-white transition-colors"
             >
               Vazgeç
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-8 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            {onToggleBatch && (
              <button 
                onClick={onToggleBatch}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors backdrop-blur-md ${
                  batchMode ? 'bg-library-500/90 text-white shadow-lg shadow-library-500/20' : 'bg-gray-800/60 text-gray-300'
                }`}
              >
                <Layers size={14} />
                {batchMode ? 'Çoklu Mod Açık' : 'Çoklu Mod'}
              </button>
            )}
            {batchMode && batchCount > 0 && (
              <span className="bg-white text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce-short">
                {batchCount}
              </span>
            )}
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="text-white bg-gray-800/60 p-2 rounded-full hover:bg-gray-700 backdrop-blur-md"
          >
            <X size={24} />
          </button>
        </div>

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Feedback Overlay */}
        {flashMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 animate-fade-in">
            <div className="bg-green-500 text-white p-6 rounded-full shadow-2xl transform scale-110">
              <Check size={48} strokeWidth={3} />
            </div>
          </div>
        )}

        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center z-10 gap-4">
          <button 
            onClick={handleCapture}
            className="bg-white p-1 rounded-full shadow-lg transform active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <div className="w-14 h-14 bg-white rounded-full border-2 border-gray-300"></div>
            </div>
          </button>
          
           <span className="bg-black/60 backdrop-blur-md text-white text-xs px-4 py-1.5 rounded-full shadow-lg">
            {batchMode ? "Sıradaki kitabı gösterin" : "Barkodu veya Kapağı Hizalayın"}
           </span>
        </div>
      </div>
    </div>
  );
};