import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import UserProfile from "@/components/UserProfile";
import { Crown } from "lucide-react";

// 로고
export function MurgleLogo() {
  return (
    <div className="flex items-center justify-center space-x-2">
       <Crown className="w-8 h-8 text-blue-500" />
       <span className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
        Murgle
      </span>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-white to-slate-100 overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-300 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-0 right-10 w-[300px] h-[300px] bg-blue-300 rounded-full blur-[80px] opacity-30" />
      </div>

      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-3 z-10">
        <MurgleLogo />
        <div className="flex gap-2 items-center">
          {/* ✅ 색 있는 버튼으로 변경 */}
          <button
            onClick={() => navigate("/payment")}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition"
          >
            Upgrade
          </button>
          <button
            onClick={() => navigate("/donate")}
            className="px-4 py-2 bg-yellow-400 text-black text-sm font-medium rounded-lg shadow-sm hover:bg-yellow-300 hover:shadow-md transition"
          >
            ☕ Donate
          </button>
          <UserProfile />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center flex-1 px-4 text-center z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-800"
        >
          End the group chat chaos.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-600 mb-8 max-w-md mx-auto"
        >
          Just Slot it. Vote it. Meet up.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/create")}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
        >
          Create a Meeting
        </motion.button>
      </main>

      {/* ✅ Footer 추가 */}
      <footer className="text-center text-xs text-slate-400 py-6">
        © 2025 Murgle. All rights reserved.
      </footer>
    </div>
  );
}
