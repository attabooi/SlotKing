import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Crown, CheckCircle2, X, Smartphone, CreditCard } from 'lucide-react';
import { SlotKingLogo } from '@/components/ui/SlotKingLogo';
import UserProfile from "@/components/UserProfile";


const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/js/iamport.payment-1.2.0.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setShowPaymentMethods(true);
  };

  const handlePayment = async (method: string) => {
    if (!user || !scriptLoaded) return;

    const { IMP } = window as any;
    IMP.init('imp56132302');

    IMP.request_pay({
      pg: method,
      pay_method: 'card',
      merchant_uid: `mid_${new Date().getTime()}`,
      name: 'SlotKing Premium',
      amount: 5,
      buyer_email: user.email,
      buyer_name: user.displayName || 'Anonymous',
      buyer_tel: '010-1234-5678',
    }, async (rsp: any) => {
      if (rsp.success) {
        await setDoc(doc(db, 'users', user.uid), {
          isPremium: true,
          premiumSince: new Date().toISOString(),
          paymentId: rsp.imp_uid,
        }, { merge: true });

        alert('Premium subscription completed!');
        navigate('/');
      } else {
        alert(`Payment failed: ${rsp.error_msg}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-6">
          <SlotKingLogo />
          <UserProfile />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-100 max-w-md mx-auto"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Premium Plan</h2>
                <p className="text-xs text-gray-500 mt-0.5">Unlock advanced features</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">$5</span>
                <span className="text-xs text-gray-500">/month</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start">
                <CheckCircle2 className="flex-shrink-0 h-4 w-4 text-green-500 mt-0.5" />
                <span className="ml-2 text-sm text-gray-700">
                  Vote with more than 10 users per poll
                </span>
              </div>
            </div>

            <button
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
            >
              {user ? 'Subscribe Now' : 'Log in to Subscribe'}
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showPaymentMethods && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg shadow-lg max-w-sm w-full p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-gray-900">Select Payment Method</h3>
                <button
                  onClick={() => setShowPaymentMethods(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handlePayment('kakaopay')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-yellow-600">KakaoPay</span>
                </button>
                <button
                  onClick={() => handlePayment('alipay')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Alipay</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentPage;
