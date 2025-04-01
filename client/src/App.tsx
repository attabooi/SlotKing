import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import CreateMeeting from "@/pages/CreateMeeting";
import OrganizerView from "@/pages/OrganizerView";
import JoinMeeting from "@/pages/JoinMeeting";
import ParticipantView from "@/pages/ParticipantView";
import Dashboard from "@/pages/Dashboard";
import SimpleCalendarPage from "@/pages/SimpleCalendarPage";
import Layout from "@/components/Layout";
import I18nProvider from "@/components/I18nProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/create" component={CreateMeeting} />
      <Route path="/meeting/:id" component={OrganizerView} />
      <Route path="/join/:id" component={JoinMeeting} />
      <Route path="/participate/:id" component={ParticipantView} />
      <Route path="/calendar" component={SimpleCalendarPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
