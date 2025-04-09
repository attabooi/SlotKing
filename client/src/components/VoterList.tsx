import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Voter {
  id: string;
  displayName: string;
  photoURL: string;
}

interface VoterListProps {
  voters: Voter[];
  maxDisplay?: number;
}

const VoterList: React.FC<VoterListProps> = ({ voters, maxDisplay = 3 }) => {
  const [showModal, setShowModal] = useState(false);
  
  const displayedVoters = voters.slice(0, maxDisplay);
  const remainingCount = voters.length - maxDisplay;
  
  if (voters.length === 0) return null;
  
  return (
    <div className="relative">
      <div className="flex items-center">
        {displayedVoters.map((voter, index) => (
          <div 
            key={voter.id} 
            className="relative"
            style={{ marginLeft: index > 0 ? '-8px' : '0' }}
          >
            <img 
              src={voter.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${voter.displayName || 'user'}`} 
              alt={voter.displayName || '사용자'} 
              className="w-6 h-6 rounded-full border-2 border-white"
              title={voter.displayName || '사용자'}
            />
          </div>
        ))}
        
        {remainingCount > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="ml-1 flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-700 border-2 border-white"
          >
            +{remainingCount}
          </button>
        )}
      </div>
      
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">투표자 목록</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {voters.map((voter) => (
                  <div key={voter.id} className="flex items-center space-x-3">
                    <img 
                      src={voter.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${voter.displayName || 'user'}`} 
                      alt={voter.displayName || '사용자'} 
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-900">{voter.displayName || '사용자'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoterList; 