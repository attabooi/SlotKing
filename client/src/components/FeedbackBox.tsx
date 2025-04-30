import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp, 
  updateDoc, 
  deleteDoc, 
  doc, 
  where 
} from 'firebase/firestore';
import { getCurrentUser } from '@/lib/user';

type Comment = {
  id: string;
  text: string;
  userName: string;
  userPhotoURL: string;
  userId: string;
  createdAt: Timestamp;
};

type FeedbackItem = {
  id: string;
  emoji: '😊' | '😐' | '😞';
  comment: string;
  userName: string;
  userPhotoURL: string;
  userId: string;
  createdAt: Timestamp;
  comments: Comment[];
};

const ADMIN_USERS = ['joon choi', 'Joon Choi'];

const FeedbackBox: React.FC = () => {
  const [newFeedback, setNewFeedback] = useState({
    emoji: null as ('😊' | '😐' | '😞' | null),
    comment: '',
  });
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Comment states
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{feedbackId: string, commentId: string} | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => Promise.resolve());
  const [confirmMessage, setConfirmMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.uid || '';
  const isAdmin = currentUser && ADMIN_USERS.includes(currentUser.displayName || '');

  // Fetch all feedback comments when component mounts
  useEffect(() => {
    fetchFeedback();
  }, []);
  
  // Handle click outside of modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowConfirmModal(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchFeedback = async () => {
    try {
      const q = query(
        collection(db, 'feedback'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const feedbacks: FeedbackItem[] = [];
      for (const docSnap of querySnapshot.docs) {
        // Get comments for this feedback
        const commentsQuery = query(
          collection(db, 'feedback', docSnap.id, 'comments'),
          orderBy('createdAt', 'asc')
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const comments: Comment[] = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...commentDoc.data()
        } as Comment));
        
        feedbacks.push({
          id: docSnap.id,
          ...docSnap.data(),
          comments
        } as FeedbackItem);
      }
      
      setFeedbackList(feedbacks);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const handleEmojiSelect = (emoji: '😊' | '😐' | '😞') => {
    setNewFeedback((prev) => ({ ...prev, emoji }));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewFeedback((prev) => ({ ...prev, comment: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!newFeedback.emoji || !newFeedback.comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Get current user
      const currentUser = getCurrentUser();
      
      // If no current user, use anonymous
      const userName = currentUser?.displayName || 'Anonymous';
      const userPhotoURL = currentUser?.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${Date.now()}`;
      const userId = currentUser?.uid || 'anonymous';
      
      // Save to Firebase
      const feedbackData = {
        emoji: newFeedback.emoji,
        comment: newFeedback.comment.trim(),
        userName,
        userPhotoURL,
        userId,
        createdAt: serverTimestamp(),
        comments: []
      };
      
      const docRef = await addDoc(collection(db, 'feedback'), feedbackData);
      
      // Add to local state with temporary timestamp for immediate display
      const newFeedbackItem: FeedbackItem = {
        id: docRef.id,
        ...feedbackData,
        createdAt: Timestamp.now(),
        comments: []
      };
      
      setFeedbackList((prev) => [newFeedbackItem, ...prev]);
      
      // Reset form and show thank you message
      setNewFeedback({ emoji: null, comment: '' });
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editing feedback
  const startEditFeedback = (feedbackId: string, currentText: string) => {
    setEditingFeedback(feedbackId);
    setEditText(currentText);
  };

  const cancelEditFeedback = () => {
    setEditingFeedback(null);
    setEditText('');
  };

  const saveFeedbackEdit = async (feedbackId: string) => {
    if (!editText.trim()) return;
    
    try {
      const feedbackRef = doc(db, 'feedback', feedbackId);
      await updateDoc(feedbackRef, {
        comment: editText.trim()
      });
      
      // Update local state
      setFeedbackList(prev => 
        prev.map(item => 
          item.id === feedbackId 
            ? { ...item, comment: editText.trim() } 
            : item
        )
      );
      
      cancelEditFeedback();
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  // Deleting feedback
  const deleteFeedback = async (feedbackId: string) => {
    setConfirmMessage('Are you sure you want to delete this feedback?');
    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, 'feedback', feedbackId));
        
        // Update local state
        setFeedbackList(prev => prev.filter(item => item.id !== feedbackId));
        setShowConfirmModal(false);
      } catch (error) {
        console.error('Error deleting feedback:', error);
      }
    });
    setShowConfirmModal(true);
  };

  // Comment functions
  const handleNewCommentChange = (feedbackId: string, text: string) => {
    setNewComments(prev => ({
      ...prev,
      [feedbackId]: text
    }));
  };

  const addComment = async (feedbackId: string) => {
    const commentText = newComments[feedbackId];
    if (!commentText?.trim()) return;
    
    try {
      const currentUser = getCurrentUser();
      const userName = currentUser?.displayName || 'Anonymous';
      const userPhotoURL = currentUser?.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${Date.now()}`;
      const userId = currentUser?.uid || 'anonymous';
      
      const commentData = {
        text: commentText.trim(),
        userName,
        userPhotoURL,
        userId,
        createdAt: serverTimestamp()
      };
      
      const commentsRef = collection(db, 'feedback', feedbackId, 'comments');
      const docRef = await addDoc(commentsRef, commentData);
      
      // Update local state
      const newComment: Comment = {
        id: docRef.id,
        ...commentData,
        createdAt: Timestamp.now()
      };
      
      setFeedbackList(prev => 
        prev.map(item => 
          item.id === feedbackId 
            ? { ...item, comments: [...item.comments, newComment] } 
            : item
        )
      );
      
      // Clear comment input
      setNewComments(prev => ({
        ...prev,
        [feedbackId]: ''
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Edit comment
  const startEditComment = (feedbackId: string, commentId: string, currentText: string) => {
    setEditingComment({ feedbackId, commentId });
    setEditCommentText(currentText);
  };

  const cancelEditComment = () => {
    setEditingComment(null);
    setEditCommentText('');
  };

  const saveCommentEdit = async (feedbackId: string, commentId: string) => {
    if (!editCommentText.trim()) return;
    
    try {
      const commentRef = doc(db, 'feedback', feedbackId, 'comments', commentId);
      await updateDoc(commentRef, {
        text: editCommentText.trim()
      });
      
      // Update local state
      setFeedbackList(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { 
                ...feedback, 
                comments: feedback.comments.map(comment => 
                  comment.id === commentId 
                    ? { ...comment, text: editCommentText.trim() } 
                    : comment
                ) 
              } 
            : feedback
        )
      );
      
      cancelEditComment();
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // Delete comment
  const deleteComment = async (feedbackId: string, commentId: string) => {
    setConfirmMessage('Are you sure you want to delete this comment?');
    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, 'feedback', feedbackId, 'comments', commentId));
        
        // Update local state
        setFeedbackList(prev => 
          prev.map(feedback => 
            feedback.id === feedbackId 
              ? { 
                  ...feedback, 
                  comments: feedback.comments.filter(comment => comment.id !== commentId) 
                } 
              : feedback
          )
        );
        setShowConfirmModal(false);
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    });
    setShowConfirmModal(true);
  };

  // Format timestamp
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const canEditContent = (contentUserId: string) => {
    return currentUserId === contentUserId || isAdmin;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Feedback Input Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 mb-6 relative"
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4">Share Your Thoughts</h3>
        
        {/* Emoji Selection */}
        <div className="flex items-center gap-4 mb-4">
          <div className="text-sm font-medium text-gray-700">How was it?</div>
          <div className="flex gap-2">
            {(['😊', '😐', '😞'] as const).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className={`text-2xl p-1.5 rounded-full transition-all ${
                  newFeedback.emoji === emoji 
                    ? 'bg-indigo-100 scale-110 ring-2 ring-indigo-300' 
                    : 'hover:bg-gray-100'
                }`}
                aria-label={`Rate as ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        
        {/* Comment Input */}
        <div className="mb-4">
          <textarea
            value={newFeedback.comment}
            onChange={handleCommentChange}
            placeholder="Share a comment or suggestion..."
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={2}
          />
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!newFeedback.emoji || !newFeedback.comment.trim() || isSubmitting}
            className={`px-4 py-2 rounded-lg transition-all text-sm ${
              !newFeedback.emoji || !newFeedback.comment.trim() || isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-md active:scale-95'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
        
        {/* Thank You Message Overlay */}
        <AnimatePresence>
          {showThankYou && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-xl z-10"
            >
              <div className="text-center p-4">
                <img 
                  src="/ghost-write.png" 
                  alt="Thank You Ghost"
                  className="w-16 h-16 mx-auto mb-2"
                  style={{ imageRendering: "pixelated" }}
                />
                <p className="text-indigo-600 font-medium">Thanks for your feedback!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Previous Feedback Comments */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Community Feedback</h3>
        
        {feedbackList.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Be the first to leave feedback!</p>
        ) : (
          <div className="space-y-6">
            {feedbackList.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {/* Feedback Item */}
                <div className="flex gap-3 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                  <img 
                    src={item.userPhotoURL} 
                    alt={item.userName}
                    className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-gray-900">{item.userName}</span>
                        {ADMIN_USERS.includes(item.userName) && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 rounded-md shadow-sm font-mono">
                            Dev
                          </span>
                        )}
                      </div>
                      <span className="text-xl flex-shrink-0">{item.emoji}</span>
                      <span className="text-xs text-gray-500 ml-auto flex-shrink-0">{formatDate(item.createdAt)}</span>
                    </div>
                    
                    {/* Editable feedback */}
                    {editingFeedback === item.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button 
                            onClick={cancelEditFeedback}
                            className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => saveFeedbackEdit(item.id)}
                            className="px-3 py-1 text-xs text-white bg-indigo-500 rounded-md hover:bg-indigo-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 mt-1">{item.comment}</p>
                    )}
                    
                    {/* Edit/Delete buttons */}
                    {!editingFeedback && canEditContent(item.userId) && (
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => startEditFeedback(item.id, item.comment)}
                          className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-0.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteFeedback(item.id)}
                          className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-0.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Comments Section */}
                <div className="pl-6 space-y-2">
                  {/* Existing comments */}
                  {item.comments.length > 0 && (
                    <div className="space-y-2 border-l-2 border-gray-200 pl-4">
                      {item.comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <img 
                              src={comment.userPhotoURL} 
                              alt={comment.userName}
                              className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-200"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-xs text-gray-900">{comment.userName}</span>
                              {ADMIN_USERS.includes(comment.userName) && (
                                <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-indigo-50 text-indigo-600 rounded font-mono">
                                  Dev
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 ml-auto">{formatDate(comment.createdAt)}</span>
                          </div>
                          
                          {/* Editable comment */}
                          {editingComment && editingComment.feedbackId === item.id && editingComment.commentId === comment.id ? (
                            <div className="mt-2">
                              <textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2 mt-1">
                                <button 
                                  onClick={cancelEditComment}
                                  className="px-2 py-0.5 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => saveCommentEdit(item.id, comment.id)}
                                  className="px-2 py-0.5 text-xs text-white bg-indigo-500 rounded-md hover:bg-indigo-600"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-700 mt-1 ml-8">{comment.text}</p>
                          )}
                          
                          {/* Comment Edit/Delete buttons */}
                          {!editingComment && canEditContent(comment.userId) && (
                            <div className="flex gap-2 mt-1 ml-8">
                              <button 
                                onClick={() => startEditComment(item.id, comment.id, comment.text)}
                                className="text-[10px] text-gray-500 hover:text-indigo-600 flex items-center gap-0.5"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-2.5 h-2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
                              </button>
                              <button 
                                onClick={() => deleteComment(item.id, comment.id)}
                                className="text-[10px] text-gray-500 hover:text-red-600 flex items-center gap-0.5"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-2.5 h-2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add new comment */}
                  <div className="flex gap-2 mt-2">
                    <textarea
                      value={newComments[item.id] || ''}
                      onChange={(e) => handleNewCommentChange(item.id, e.target.value)}
                      placeholder="Add a reply..."
                      className="flex-1 px-3 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={1}
                    />
                    <button
                      onClick={() => addComment(item.id)}
                      disabled={!newComments[item.id]?.trim()}
                      className={`self-end px-3 py-1 rounded-lg transition-all text-xs ${
                        !newComments[item.id]?.trim()
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modern Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-lg max-w-md w-full mx-auto overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-center text-gray-900 mb-2">Confirm Action</h3>
                <p className="text-center text-gray-600 mb-6">{confirmMessage}</p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => confirmAction()}
                    className="px-4 py-2 text-sm text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:shadow-md transition-shadow"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackBox; 