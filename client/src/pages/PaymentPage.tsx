import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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
    if (!user) return alert('로그인이 필요합니다.');
    if (!scriptLoaded) return alert('결제 모듈이 아직 로드되지 않았습니다.');

    const { IMP } = window as any;
    IMP.init('imp56132302'); // 아임포트 고객사 식별코드

    IMP.request_pay({
      pg: 'kakaopay',
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

        alert('프리미엄 구독이 완료되었습니다.');
        navigate('/');
      } else {
        alert(`결제 실패: ${rsp.error_msg}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Upgrade to Premium</h2>
        <p className="mt-4 text-xl text-gray-600">Enjoy unlimited access and features with our Premium plan.</p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-12 border border-gray-200 rounded-lg shadow-sm bg-white p-6"
        >
          <h3 className="text-lg font-medium text-gray-900">Premium Plan</h3>
          <p className="mt-4">
            <span className="text-4xl font-extrabold text-gray-900">$5</span>
            <span className="text-base font-medium text-gray-500"> / month</span>
          </p>
          <ul className="mt-6 space-y-4 text-left">
            <li className="flex items-center space-x-2 text-gray-700">
              <span>✓</span> <span>Unlimited meetings</span>
            </li>
            <li className="flex items-center space-x-2 text-gray-700">
              <span>✓</span> <span>Advanced scheduling features</span>
            </li>
            <li className="flex items-center space-x-2 text-gray-700">
              <span>✓</span> <span>Priority support</span>
            </li>
          </ul>

          <button
            onClick={handleSubscribe}
            className="mt-8 w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 transition"
          >
            Subscribe Now
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentPage;
