import { useState } from "react";
import { motion } from "framer-motion";
import { createGuestUser, UserProfile } from "@/lib/user";

interface GuestUserModalProps {
  onComplete: (guestProfile: UserProfile) => void;
  onClose: () => void;
}

export default function GuestUserModal({ onComplete, onClose }: GuestUserModalProps) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      // Create a guest user with the entered nickname
      const guestProfile = createGuestUser(nickname.trim());
      onComplete(guestProfile);
    } catch (error) {
      console.error("Error creating guest user:", error);
      setError("Failed to create guest profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            Continue as a Guest
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Enter a nickname to identify yourself to other voters. You can vote without creating an account.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
              Nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your nickname"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded-md font-medium shadow-md hover:shadow-lg transition-shadow disabled:opacity-70"
            >
              {isLoading ? "Creating..." : "Continue as Guest"}
            </button>
          </div>
        </form>
        
        <p className="mt-4 text-xs text-gray-500 text-center">
          Your guest profile will be stored locally on this device.
        </p>
      </motion.div>
    </div>
  );
} 