import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Create from "./pages/Create";
import Vote from "./pages/Vote";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import CreateMeeting from "@/pages/CreateMeeting";
import OrganizerView from "@/pages/OrganizerView";
import JoinMeeting from "@/pages/JoinMeeting";
import ParticipantView from "@/pages/ParticipantView";
import SimpleCalendarPage from "@/pages/SimpleCalendarPage";
import Layout from "@/components/Layout";
import I18nProvider from "@/components/I18nProvider";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/vote/:meetingId" element={<Vote />} />
          </Routes>
        </Router>
        <Layout>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/meeting/:id" element={<OrganizerView />} />
              <Route path="/join/:id" element={<JoinMeeting />} />
              <Route path="/participate/:id" element={<ParticipantView />} />
              <Route path="/simple-calendar" element={<SimpleCalendarPage />} />
              <Route path="/not-found" element={<NotFound />} />
            </Routes>
          </Router>
        </Layout>
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}
