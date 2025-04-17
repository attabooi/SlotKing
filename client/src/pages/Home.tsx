import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import UserProfile from "@/components/UserProfile";
import { Crown } from "lucide-react";

// Murgle 브랜드용 로고 컴포넌트
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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-white to-slate-100 overflow-hidden">
      {/* 배경 추상형 빛 번짐 요소 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-300 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-0 right-10 w-[300px] h-[300px] bg-blue-300 rounded-full blur-[80px] opacity-30" />
      </div>

      {/* 우측 상단 프로필 */}
      <div className="absolute top-4 right-4 z-10">
        <UserProfile />
      </div>

      {/* Hero Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.4 } },
        }}
        className="text-center z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <MurgleLogo />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-800"
        >
          End the group chat chaos.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-lg md:text-xl text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed"
        >
          Just Slot it. Vote it. Meet up.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="space-x-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/create")}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all"
          >
            Create a Meeting
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/payment")}
            className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold text-lg shadow-md hover:shadow-xl transition-all"
          >
            Upgrade Plan
          </motion.button>
          <motion.button
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.96 }}
  onClick={() => navigate("/donate")}
  className="px-6 py-3 border border-yellow-400 text-yellow-400 rounded-lg font-semibold text-base hover:bg-yellow-400 hover:text-black transition"
>
  ☕ Buy me a Coffee
</motion.button>

        </motion.div>
      </motion.div>
      
    </div>
  );
}
