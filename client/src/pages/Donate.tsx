import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";

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
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center px-4">
      <div className="flex flex-col md:flex-row items-center gap-10">
        {/* 중앙 캐릭터 */}
        <div className="w-60 h-60">
          <img
            src="/assets/coffee-thirsty.gif"
            alt="Coffee Character"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>

        {/* 우측 메뉴판 */}
        <div className="w-64 bg-neutral-800 p-4 rounded-xl shadow-md space-y-4 text-white text-xs">
          <h2 className="text-sm font-semibold border-b border-neutral-700 pb-2">
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
                    : "border-transparent hover:border-neutral-600"
                }`}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span>{item.emoji}</span>
                    {item.name}
                  </div>
                  <p className="text-[11px] text-neutral-400">{item.description}</p>
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
            className="w-full bg-yellow-400 text-black font-medium py-2 rounded-lg transition disabled:opacity-50 text-sm"
          >
            {isProcessing
              ? "Processing..."
              : hasDonated
              ? "Thank you!"
              : `Buy ${selected.name} - $${selected.amount}`}
          </motion.button>

          <button
            onClick={() => navigate("/")}
            className="block text-[11px] text-neutral-400 mt-2 hover:underline mx-auto"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
