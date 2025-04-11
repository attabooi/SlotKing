import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getCurrentUser, UserProfile as UserInfo } from '@/lib/user';
import EditGuestProfileModal from './EditGuestProfileModal';
import { PencilIcon } from 'lucide-react';

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [firebaseUser, loading] = useAuthState(auth);
  const [guestUser, setGuestUser] = useState<UserInfo | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Refresh user data
  const refreshUserData = () => {
    if (!firebaseUser) {
      const currentUser = getCurrentUser();
      setGuestUser(currentUser);
    } else {
      setGuestUser(null);
    }
  };
  
  useEffect(() => {
    // If no Firebase user, check for guest user
    refreshUserData();
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
  
  const handleEditProfileComplete = (updatedProfile: UserInfo) => {
    setShowEditModal(false);
    setGuestUser(updatedProfile);
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
    <>
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="relative group">
          <img
            src={user.photoURL ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.displayName ?? "user"}`}
            alt="avatar"
            className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
          />
          
          {/* Edit profile button (for guest users only) */}
          {'isGuest' in user && user.isGuest && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              title="Edit profile"
            >
              <PencilIcon className="w-3 h-3 text-indigo-600" />
            </button>
          )}
        </div>
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
      
      {/* Guest Profile Edit Modal */}
      {showEditModal && (
        <EditGuestProfileModal
          onComplete={handleEditProfileComplete}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
};

export default UserProfile; 