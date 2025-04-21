import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Crown, CheckCircle2, X, Smartphone, CreditCard } from 'lucide-react';
import { SlotKingLogo } from '@/components/ui/SlotKingLogo';
import UserProfile from '@/components/UserProfile';
import confetti from 'canvas-confetti';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import Footer from '@/components/Footer';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const { toast } = useToast();

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

    const merchant_uid = `mid_${new Date().getTime()}`;

    IMP.request_pay({
      pg: method,
      pay_method: 'card',
      merchant_uid,
      name: 'SlotKing Premium',
      amount: 5000,
      buyer_email: user.email,
      buyer_name: user.displayName || 'Anonymous',
      buyer_tel: '010-1234-5678',
    }, async (rsp: any) => {
      if (rsp.success) {
        try {
          const verifyRes = await axios.post('/api/verify-payment', {
            imp_uid: rsp.imp_uid,
            uid: user.uid,
          });

          if (verifyRes.data.success) {
            toast({
              title: "🎉 Welcome to Premium!",
              description: "You now have access to unlimited voters and more features.",
              duration: 5000,
            });
            confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
            setTimeout(() => navigate('/'), 1000);
          } else {
            toast({
              variant: 'destructive',
              title: 'Verification failed',
              description: verifyRes.data.reason || 'Payment could not be verified.',
            });
          }
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Server Error',
            description: 'An error occurred during payment verification.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: rsp.error_msg,
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-white to-slate-100 overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-300 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-0 right-10 w-[300px] h-[300px] bg-blue-300 rounded-full blur-[80px] opacity-30" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full flex justify-between items-center px-6 py-3">
        <SlotKingLogo />
        <UserProfile />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md max-w-md mx-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">Premium Plan</h2>
                <p className="text-xs text-slate-500 mt-0.5">Unlock advanced features</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-800">$5</span>
                <span className="text-xs text-slate-500">/month</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start">
                <CheckCircle2 className="flex-shrink-0 h-4 w-4 text-teal-500 mt-0.5" />
                <span className="ml-2 text-sm text-slate-600">
                  Vote with more than 10 users per poll
                </span>
              </div>
            </div>

            <button
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white font-medium py-2 px-4 rounded-lg hover:shadow-md transition-all duration-200 text-sm"
            >
              {user ? 'Subscribe Now' : 'Log in to Subscribe'}
            </button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentPage;
