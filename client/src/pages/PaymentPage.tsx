import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Basic',
      price: '$9.99',
      features: [
        'Up to 5 meetings per month',
        'Basic calendar integration',
        'Email support'
      ]
    },
    {
      name: 'Pro',
      price: '$19.99',
      features: [
        'Unlimited meetings',
        'Advanced calendar integration',
        'Priority support',
        'Custom branding'
      ]
    },
    {
      name: 'Enterprise',
      price: '$49.99',
      features: [
        'Everything in Pro',
        'Dedicated support',
        'Custom integrations',
        'Team management',
        'Advanced analytics'
      ]
    }
  ];

  const handleSubscribe = (plan: string) => {
    // TODO: Implement payment processing
    console.log(`Subscribing to ${plan} plan`);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose your plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your needs
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-base font-medium text-gray-500">/mo</span>
                </p>
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  className="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-indigo-700"
                >
                  Subscribe
                </button>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                  What's included
                </h4>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage; 