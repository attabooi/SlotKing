import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={SimpleCalendarPage} />
      <Route path="/create" component={CreateMeeting} />
      <Route path="/meeting/:id" component={OrganizerView} />
      <Route path="/join/:id" component={JoinMeeting} />
      <Route path="/participate/:id" component={ParticipantView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
