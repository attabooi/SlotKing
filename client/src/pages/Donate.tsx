import { useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import UserProfile from "@/components/UserProfile";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";

export default function DonatePage() {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background blur */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-300 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-0 right-10 w-[300px] h-[300px] bg-blue-300 rounded-full blur-[80px] opacity-30" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full flex justify-between items-center px-6 py-3">
        <SlotKingLogo />
        <UserProfile />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4">
        <div className="bg-white shadow-md rounded-2xl p-8 max-w-md w-full text-center space-y-5">
          {/* .gif 캐릭터 */}
          <img
            src="/Sprite-0002.gif"
            alt="Golem Coffee Animation"
            className="w-48 h-48 mx-auto image-render-pixel"
          />
          <style>{`
            .image-render-pixel {
              image-rendering: pixelated;
            }
          `}</style>

          {/* 멘트 */}
          <p className="inline-block bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-md font-mono tracking-tight">
            coffee = hope
          </p>

          {/* 버튼 그룹 */}
          <div className="flex justify-center gap-3">
            {/* BuyMeACoffee 버튼 */}
            <a
              href="https://www.buymeacoffee.com/Jaggiesbit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-sm rounded-md transition"
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
                alt="BMC"
                className="w-4 h-4"
              />
              Revive me
            </a>

            {/* QR 버튼 */}
            <button
              onClick={() => {
                confetti({ particleCount: 60, spread: 100, origin: { y: 0.6 } });
                setShowQR(true);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-medium text-sm rounded-md transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h3v3H3V4zm3 13H3v3h3v-3zM18 4h3v3h-3V4zM18 17h3v3h-3v-3zM7 7h10v10H7V7z" />
              </svg>
              Show QR
            </button>
          </div>

          {/* 뒤로 가기 */}
          <button
            onClick={() => navigate("/")}
            className="text-xs text-slate-400 hover:underline"
          >
            
          </button>
        </div>
      </main>

      <Footer />

      {/* QR 모달 */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
          >
            <motion.div
              className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xs text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Scan to support ☕
              </h3>
              <img
                src="/bmc_qr.png"
                alt="Buy Me a Coffee QR"
                className="w-48 h-48 mx-auto rounded-lg shadow"
              />
              <button
                onClick={() => setShowQR(false)}
                className="mt-4 text-xs text-slate-400 hover:underline"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
