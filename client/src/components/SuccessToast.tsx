import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";

type SuccessToastProps = {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
};

const SuccessToast = ({ message, visible, onClose, duration = 3000 }: SuccessToastProps) => {
  const [isVisible, setIsVisible] = useState(visible);
  
  useEffect(() => {
    setIsVisible(visible);
    
    if (visible) {
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to finish
      }, duration);
      
      return () => clearTimeout(timeout);
    }
  }, [visible, duration, onClose]);
  
  return (
    <div 
      className={`fixed right-0 bottom-0 m-4 p-4 bg-green-500 rounded-lg shadow-lg transform transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center">
        <CheckCircle className="h-6 w-6 text-white mr-2" />
        <p className="text-white font-medium">{message}</p>
      </div>
    </div>
  );
};

export default SuccessToast;
