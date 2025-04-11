import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  voteUrl: string;
}

export default function ShareModal({ isOpen, onClose, voteUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const { t } = useI18n();
  
  // Check if share API is available (mostly on mobile)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  
  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(voteUrl);
      setCopied(true);
      
      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };
  
  // Use native share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my SlotKing schedule!',
          text: 'Pick your available times!',
          url: voteUrl
        });
      } catch (err) {
        console.error("Error sharing: ", err);
      }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('scheduleCreated')}
          </h2>
          <p className="text-gray-600">
            {t('shareToCollectVotes')}
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Vote URL display */}
          <div className="relative">
            <input
              type="text"
              value={voteUrl}
              readOnly
              className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-600 hover:text-indigo-800 transition-colors"
              aria-label="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Copy URL button */}
            <button
              onClick={copyToClipboard}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? t('copied') : t('copyLink')}
            </button>
            
            {/* Share button (mobile only) */}
            {canShare && (
              <button
                onClick={handleShare}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t('share')}
              </button>
            )}
          </div>
          
          {/* QR code generation button */}
          <button
            onClick={() => setShowQrCode(!showQrCode)}
            className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            {showQrCode ? t('hideQRCode') : t('generateQRCode')}
          </button>
          
          {/* QR code display */}
          {showQrCode && (
            <motion.div 
              className="flex justify-center p-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white p-4 rounded-lg shadow-md">
                <QRCodeSVG value={voteUrl} size={200} />
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Close button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-800 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </motion.div>
      
      {/* Copy success toast */}
      <div
        className={`fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
          copied ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {t('linkCopiedToClipboard')}
      </div>
    </div>
  );
} 