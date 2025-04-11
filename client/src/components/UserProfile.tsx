import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getCurrentUser, UserProfile as UserInfo } from '@/lib/user';

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [firebaseUser, loading] = useAuthState(auth);
  const [guestUser, setGuestUser] = useState<UserInfo | null>(null);
  
  useEffect(() => {
    // If no Firebase user, check for guest user
    if (!firebaseUser && !loading) {
      const currentUser = getCurrentUser();
      setGuestUser(currentUser);
    } else {
      setGuestUser(null);
    }
  }, [firebaseUser, loading]);

  const handleLogout = async () => {
    try {
      // Clear guest user data from localStorage if present
      localStorage.removeItem("slotking_guest_user");
      // Sign out from Firebase
      await signOut(auth);
      // Update local state to remove guest user
      setGuestUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse w-8 h-8 bg-gray-200 rounded-full"></div>;
  }

  // Use Firebase user or guest user
  const user = firebaseUser || guestUser;
  
  if (!user) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/login")}
        className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-shadow"
      >
        Login
      </motion.button>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
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
        onClick={handleLogout}
        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-semibold shadow hover:shadow-md transition"
      >
        Logout
      </motion.button>
    </div>
  );
};

export default UserProfile; 