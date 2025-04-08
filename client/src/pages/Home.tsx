import { useNavigate } from "react-router-dom";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

export default function Home() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Top Right Login/Logout/Profile */}
      <div className="absolute top-4 right-4 space-x-4 flex items-center">
        {!loading && user ? (
          <>
            <img
              src={
                user.photoURL ??
                `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.displayName ?? "user"}`
              }
              alt="avatar"
              className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
            />
            <span className="text-sm font-medium text-gray-800">
              {user.displayName}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => auth.signOut()}
              className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-semibold shadow hover:shadow-md transition"
            >
              Logout
            </motion.button>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            Login
          </motion.button>
        )}
      </div>

      {/* Main Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-12">
          <SlotKingLogo />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Schedule Meetings with Ease
        </h1>

        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-xl mx-auto">
          Find the perfect time for everyone. Create a meeting, share the link,
          and let your team vote on the best time slots.
        </p>

        <div className="space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/create")}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            Create a Meeting
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/payment")}
            className="px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            Upgrade Plan
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
