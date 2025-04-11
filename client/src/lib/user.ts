// client/src/lib/user.ts

import { auth } from './firebase';
import { v4 as uuidv4 } from "uuid";

export type UserProfile = {
  uid: string;        // example: 'guest-xyz123' or Firebase UID
  displayName: string;  // Using displayName to maintain consistency with Firebase Auth
  photoURL: string;
  isGuest: boolean;
};

const USER_STORAGE_KEY = "slotking_guest_user";

/**
 * Get current user profile from either Firebase Auth or localStorage
 */
export function getCurrentUser(): UserProfile | null {
  // First check Firebase auth
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "Anonymous",
      photoURL: firebaseUser.photoURL || generateAvatarUrl(firebaseUser.uid),
      isGuest: false
    };
  }

  // If no Firebase user, check localStorage for guest user
  try {
    const guestDataStr = localStorage.getItem(USER_STORAGE_KEY);
    if (guestDataStr) {
      return JSON.parse(guestDataStr) as UserProfile;
    }
  } catch (error) {
    console.error("Error reading guest user data:", error);
  }

  return null;
}

/**
 * Generate a new guest user profile and save to localStorage
 * @param nickname 사용자 닉네임 (옵션)
 * @param customPhotoURL 사용자 정의 프로필 이미지 URL (옵션)
 */
export function createGuestUser(nickname?: string, customPhotoURL?: string): UserProfile {
  const guestId = `guest-${uuidv4().slice(0, 8)}`;
  // 닉네임이 없으면 기본값 사용
  const userNickname = nickname?.trim() || `User-${guestId.slice(6, 10)}`;
  // Guest- 접두사 추가 (이미 있는 경우 건너뜀)
  const displayName = userNickname.startsWith('Guest-') ? userNickname : `Guest-${userNickname}`;
  
  const guestUser: UserProfile = {
    uid: guestId,
    displayName: displayName,
    photoURL: customPhotoURL || generateAvatarUrl(displayName), // 커스텀 URL 또는 기본 아바타
    isGuest: true
  };

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser));
  return guestUser;
}

/**
 * Check if current user is a guest
 */
export function isGuestUser(): boolean {
  const user = getCurrentUser();
  return user?.isGuest || false;
}

/**
 * Check if user has a guest profile saved
 */
export function hasGuestProfile(): boolean {
  return localStorage.getItem(USER_STORAGE_KEY) !== null;
}

/**
 * Clear guest user data
 */
export function clearGuestUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Generate avatar URL using DiceBear API
 */
export function generateAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Update an existing guest user profile
 */
export function updateGuestUser(userData: UserProfile): UserProfile {
  if (!userData.isGuest) {
    throw new Error("Cannot update non-guest user");
  }
  
  // Save updated user data to localStorage
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  return userData;
}
