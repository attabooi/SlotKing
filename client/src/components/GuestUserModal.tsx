import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createGuestUser, UserProfile, generateAvatarUrl } from "@/lib/user";

interface GuestUserModalProps {
  onComplete: (guestProfile: UserProfile) => void;
  onClose: () => void;
}

export default function GuestUserModal({ onComplete, onClose }: GuestUserModalProps) {
  const [nickname, setNickname] = useState("");
  const [customProfileUrl, setCustomProfileUrl] = useState("");
  const [useCustomProfile, setUseCustomProfile] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 프로필 이미지 미리보기 URL
  const previewImageUrl = useCustomProfile && customProfileUrl 
    ? customProfileUrl 
    : generateAvatarUrl(nickname || "User");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setError("");
    setIsLoading(true);
    
    try {
      // 프로필 이미지 URL 결정
      const photoURL = useCustomProfile && customProfileUrl 
        ? customProfileUrl 
        : undefined; // 기본 아바타 사용
        
      // 게스트 사용자 생성 (유효한 닉네임이 있는 경우만)
      const guestProfile = createGuestUser(nickname.trim() || undefined, photoURL);
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
          {/* Profile Preview */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative">
              <img 
                src={previewImageUrl} 
                alt="Profile Preview" 
                className="w-24 h-24 rounded-full border-2 border-indigo-100 mb-2"
              />
            </div>
            <p className="text-sm text-gray-500">Profile Preview</p>
          </div>
          
          {/* Nickname Input */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
              Nickname
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                Guest-
              </span>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="text-black flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter a name (e.g. Alex)"
                autoFocus
              />
            </div>
          </div>
          
          {/* Custom Profile URL Toggle */}
          <div className="flex items-center">
            <input
              id="useCustomProfile"
              type="checkbox"
              checked={useCustomProfile}
              onChange={(e) => setUseCustomProfile(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="useCustomProfile" className="ml-2 block text-sm text-gray-700">
              Use custom profile image URL
            </label>
          </div>
          
          {/* Custom Profile URL Input */}
          {useCustomProfile && (
            <div>
              <label htmlFor="profileUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Profile Image URL
              </label>
              <input
                type="url"
                id="profileUrl"
                value={customProfileUrl}
                onChange={(e) => setCustomProfileUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://example.com/profile.jpg"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a valid image URL or leave blank to use a generated avatar
              </p>
            </div>
          )}
          
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          
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