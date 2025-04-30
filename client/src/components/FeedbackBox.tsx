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
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{
    feedbackId: string;
    commentId: string;
  } | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(
    () => Promise.resolve()
  );
  const [confirmMessage, setConfirmMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.uid || '';
  const isAdmin =
    currentUser && ADMIN_USERS.includes(currentUser.displayName || '');

  useEffect(() => {
    fetchFeedback();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowConfirmModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFeedback = async () => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const snaps = await getDocs(q);
    const items: FeedbackItem[] = [];
    for (const docSnap of snaps.docs) {
      const commentsQ = query(
        collection(db, 'feedback', docSnap.id, 'comments'),
        orderBy('createdAt', 'asc')
      );
      const cSnaps = await getDocs(commentsQ);
      const comments = cSnaps.docs.map((c) => ({
        id: c.id,
        ...c.data(),
      })) as Comment[];
      items.push({ id: docSnap.id, ...(docSnap.data() as any), comments });
    }
    setFeedbackList(items);
  };

  const handleEmojiSelect = (emoji: '😊' | '😐' | '😞') =>
    setNewFeedback((p) => ({ ...p, emoji }));
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setNewFeedback((p) => ({ ...p, comment: e.target.value }));

  const handleSubmit = async () => {
    if (!newFeedback.emoji || !newFeedback.comment.trim()) return;
    setIsSubmitting(true);
    const user = getCurrentUser();
    const feedbackData = {
      emoji: newFeedback.emoji,
      comment: newFeedback.comment.trim(),
      userName: user?.displayName || 'Anonymous',
      userPhotoURL:
        user?.photoURL ||
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${Date.now()}`,
      userId: user?.uid || 'anonymous',
      createdAt: serverTimestamp(),
      comments: [],
    };
    const ref = await addDoc(collection(db, 'feedback'), feedbackData);
    setFeedbackList((p) => [
      { id: ref.id, ...feedbackData, createdAt: Timestamp.now() },
      ...p,
    ]);
    setNewFeedback({ emoji: null, comment: '' });
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 3000);
    setIsSubmitting(false);
  };

  const startEditFeedback = (id: string, txt: string) => {
    setEditingFeedback(id);
    setEditText(txt);
  };
  const cancelEditFeedback = () => {
    setEditingFeedback(null);
    setEditText('');
  };
  const saveFeedbackEdit = async (id: string) => {
    if (!editText.trim()) return;
    const ref = doc(db, 'feedback', id);
    await updateDoc(ref, { comment: editText.trim() });
    setFeedbackList((p) =>
      p.map((f) =>
        f.id === id ? { ...f, comment: editText.trim() } : f
      )
    );
    cancelEditFeedback();
  };
  const deleteFeedback = (id: string) => {
    setConfirmMessage('Delete this feedback?');
    setConfirmAction(async () => {
      await deleteDoc(doc(db, 'feedback', id));
      setFeedbackList((p) => p.filter((f) => f.id !== id));
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleNewCommentChange = (fid: string, txt: string) =>
    setNewComments((p) => ({ ...p, [fid]: txt }));
  const addComment = async (fid: string) => {
    const txt = newComments[fid];
    if (!txt?.trim()) return;
    const user = getCurrentUser();
    const commentData = {
      text: txt.trim(),
      userName: user?.displayName || 'Anonymous',
      userPhotoURL:
        user?.photoURL ||
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${Date.now()}`,
      userId: user?.uid || 'anonymous',
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(
      collection(db, 'feedback', fid, 'comments'),
      commentData
    );
    setFeedbackList((p) =>
      p.map((f) =>
        f.id === fid
          ? {
              ...f,
              comments: [...f.comments, { id: ref.id, ...commentData, createdAt: Timestamp.now() }],
            }
          : f
      )
    );
    setNewComments((p) => ({ ...p, [fid]: '' }));
  };

  const startEditComment = (
    fid: string,
    cid: string,
    txt: string
  ) => {
    setEditingComment({ feedbackId: fid, commentId: cid });
    setEditCommentText(txt);
  };
  const cancelEditComment = () => {
    setEditingComment(null);
    setEditCommentText('');
  };
  const saveCommentEdit = async (fid: string, cid: string) => {
    if (!editCommentText.trim()) return;
    const ref = doc(db, 'feedback', fid, 'comments', cid);
    await updateDoc(ref, { text: editCommentText.trim() });
    setFeedbackList((p) =>
      p.map((f) =>
        f.id === fid
          ? {
              ...f,
              comments: f.comments.map((c) =>
                c.id === cid ? { ...c, text: editCommentText.trim() } : c
              ),
            }
          : f
      )
    );
    cancelEditComment();
  };
  const deleteComment = (fid: string, cid: string) => {
    setConfirmMessage('Delete this comment?');
    setConfirmAction(async () => {
      await deleteDoc(doc(db, 'feedback', fid, 'comments', cid));
      setFeedbackList((p) =>
        p.map((f) =>
          f.id === fid
            ? { ...f, comments: f.comments.filter((c) => c.id !== cid) }
            : f
        )
      );
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const formatDate = (ts: Timestamp) => {
    const d = ts.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const canEditContent = (uid: string) =>
    currentUserId === uid || isAdmin;

  return (
    <div className="max-w-2xl mx-auto">
      {/* 입력 섹션 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-4 mb-4 relative"
      >
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          Share Your Thoughts
        </h3>

        {/* 이모지 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="text-sm font-medium text-gray-700">
            How was it?
          </div>
          <div className="flex gap-2">
            {(['😊', '😐', '😞'] as const).map((emo) => (
              <button
                key={emo}
                onClick={() => handleEmojiSelect(emo)}
                className={`text-2xl p-1.5 rounded-full transition-all ${
                  newFeedback.emoji === emo
                    ? 'bg-indigo-100 scale-110 ring-2 ring-indigo-300'
                    : 'hover:bg-gray-100'
                }`}
              >
                {emo}
              </button>
            ))}
          </div>
        </div>

        {/* 코멘트 입력 */}
        <div className="mb-4">
          <textarea
            value={newFeedback.comment}
            onChange={handleCommentChange}
            placeholder="Share a comment or suggestion..."
            rows={2}
            className="w-full px-2 py-1 text-[13px] text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={
              !newFeedback.emoji || !newFeedback.comment.trim() || isSubmitting
            }
            className={`px-3 py-1 rounded-md text-[13px] transition-all ${
              !newFeedback.emoji || !newFeedback.comment.trim() || isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-md active:scale-95'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>

        {/* 감사 메시지 */}
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
                  alt="Thanks"
                  className="w-16 h-16 mx-auto mb-2"
                  style={{ imageRendering: 'pixelated' }}
                />
                <p className="text-indigo-600 font-medium">
                  Thanks for your feedback!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 댓글 리스트 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          Community Feedback
        </h3>

        {feedbackList.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Be the first to leave feedback!
          </p>
        ) : (
          <div className="space-y-1">
            {feedbackList.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                {/* 단일 피드백 */}
                <div className="flex gap-1 p-2 border border-gray-200 rounded-md bg-white">
                  <img
                    src={item.userPhotoURL}
                    alt={item.userName}
                    className="w-8 h-8 rounded-full border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap text-xs leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-gray-900">
                          {item.userName}
                        </span>
                        {ADMIN_USERS.includes(item.userName) && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 rounded-md">
                            Dev
                          </span>
                        )}
                      </div>
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {editingFeedback === item.id ? (
                      <div className="mt-1">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-[13px] text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end gap-1 mt-1">
                          <button
                            onClick={cancelEditFeedback}
                            className="px-2 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveFeedbackEdit(item.id)}
                            className="px-2 py-0.5 text-[10px] text-white bg-indigo-500 rounded-md hover:bg-indigo-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-700 mt-0.5">
                        {item.comment}
                      </p>
                    )}
                    {!editingFeedback && canEditContent(item.userId) && (
                      <div className="flex gap-1 mt-1 text-[10px]">
                        <button
                          onClick={() =>
                            startEditFeedback(item.id, item.comment)
                          }
                          className="text-gray-500 hover:text-indigo-600 flex items-center gap-0.5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteFeedback(item.id)}
                          className="text-gray-500 hover:text-red-600 flex items-center gap-0.5"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 대댓글(Reply) */}
                <div className="pl-5 space-y-1">
                  {item.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-1 p-1 border-l border-gray-200"
                    >
                      <img
                        src={c.userPhotoURL}
                        alt={c.userName}
                        className="w-6 h-6 rounded-full border border-gray-200"
                      />
                      <div className="flex-1">
                        <p className="text-[11px] text-gray-700">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Reply 입력 */}
                  <div className="flex gap-1 mt-1">
                    <textarea
                      value={newComments[item.id] || ''}
                      onChange={(e) =>
                        handleNewCommentChange(item.id, e.target.value)
                      }
                      placeholder="Add a reply..."
                      rows={1}
                      className="flex-1 px-2 py-1 text-[11px] text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => addComment(item.id)}
                      disabled={!newComments[item.id]?.trim()}
                      className={`self-end px-2 py-0.5 rounded-md text-[10px] transition-all ${
                        newComments[item.id]?.trim()
                          ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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

      {/* Confirm 모달 */}
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
              className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden"
            >
              <div className="p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2 text-center">
                  Confirm
                </h3>
                <p className="text-center text-gray-600 mb-4">
                  {confirmMessage}
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-3 py-1 text-[13px] text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmAction()}
                    className="px-3 py-1 text-[13px] text-white bg-red-500 rounded-md hover:bg-red-600"
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
