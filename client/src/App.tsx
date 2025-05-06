import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Create from "./pages/Create";
import Vote from "./pages/Vote";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import I18nProvider from "@/components/I18nProvider";
import LoginPage from "./pages/LoginPage";
import PaymentPage from "./pages/PaymentPage";
import SignUpPage from "./pages/SignUpPage";
import Donate from "./pages/Donate";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function App() {
  const [user] = useAuthState(auth);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Router>
          <LayoutWrapper>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/vote/:meetingId" element={<Vote />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/donate" element={<Donate />} />
            </Routes>
          </LayoutWrapper>
        </Router>
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}
