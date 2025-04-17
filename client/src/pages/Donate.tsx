import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import UserProfile from "@/components/UserProfile";

const coffeeMenu = [
  { amount: 1, name: "Espresso", description: "Strong & tiny.", emoji: "☕" },
  { amount: 3, name: "Americano", description: "Smooth & classic.", emoji: "🫖" },
  { amount: 5, name: "Latte", description: "Milky & soft.", emoji: "🥛" },
  { amount: 10, name: "Cappuccino", description: "Foamy & rich.", emoji: "🍮" },
];

export default function Donate() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(coffeeMenu[2]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasDonated, setHasDonated] = useState(false);

  const handleDonate = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    confetti({ particleCount: 60, spread: 100, origin: { y: 0.6 } });
    setTimeout(() => {
      setHasDonated(true);
      setIsProcessing(false);
    }, 800);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 overflow-hidden text-slate-900">
      {/* 라디얼 배경 */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-cyan-200 opacity-30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-blue-200 opacity-20 rounded-full blur-2xl" />

      {/* 상단 바 */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <SlotKingLogo />
          <span className="text-lg font-bold">Murgle</span>
        </div>
        <UserProfile />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center px-6 gap-10 min-h-[calc(100vh-100px)]">
        {/* 픽셀 캐릭터 */}
        <div className="w-64 h-64">
          <img
            src="/assets/coffee-thirsty.gif"
            alt="Coffee Character"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>

        {/* 메뉴 카드 */}
        <div className="w-64 bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-xl shadow-md space-y-4 text-sm text-slate-900">
          <h2 className="text-base font-semibold border-b border-slate-300 pb-2">
            ☕ Menu
          </h2>
          <ul className="space-y-2">
            {coffeeMenu.map((item) => (
              <li
                key={item.amount}
                onClick={() => setSelected(item)}
                className={`flex justify-between items-start p-2 rounded-md cursor-pointer border transition ${
                  selected.amount === item.amount
                    ? "border-yellow-400 bg-yellow-100 text-black"
                    : "border-transparent hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span>{item.emoji}</span>
                    {item.name}
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <span className="font-bold text-xs">${item.amount}</span>
              </li>
            ))}
          </ul>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDonate}
            disabled={isProcessing || hasDonated}
            className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {isProcessing
              ? "Processing..."
              : hasDonated
              ? "Thank you!"
              : `Buy ${selected.name} - $${selected.amount}`}
          </motion.button>

          <button
            onClick={() => navigate("/")}
            className="block text-[11px] text-slate-500 mt-2 hover:underline mx-auto"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
