// client/src/lib/user.ts

import { auth } from './firebase';

export interface UserInfo {
  uid: string;
  displayName: string;
  photoURL: string;
}

export function getCurrentUser(): UserInfo | null {
  const fbUser = auth.currentUser;
  if (fbUser) {
    return {
      uid: fbUser.uid,
      displayName: fbUser.displayName || "Anonymous",
      photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${fbUser.uid}`
    };
  }

  const guestStr = localStorage.getItem("guestUser");
  if (guestStr) {
    try {
      return JSON.parse(guestStr);
    } catch (error) {
      console.error("Error parsing guest user data:", error);
      return null;
    }
  }

  return null;
}

export function isGuestUser(): boolean {
  const user = getCurrentUser();
  return user?.uid.startsWith("guest-") || false;
}

export function createGuestUser(): UserInfo {
  const randomId = Math.random().toString(36).substring(2, 10);
  const nickname = `Guest-${randomId}`;
  const photoURL = `https://api.dicebear.com/7.x/thumbs/svg?seed=${nickname}`;

  const guest: UserInfo = {
    uid: `guest-${randomId}`,
    displayName: nickname,
    photoURL
  };

  localStorage.setItem("guestUser", JSON.stringify(guest));
  return guest;
}

export function logoutUser(): void {
  localStorage.removeItem("guestUser");
  auth.signOut();
}
