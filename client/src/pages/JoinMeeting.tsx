import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { participantFormSchema } from "@shared/schema";
import { formatDateRange } from "@/lib/date-utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const JoinMeeting = () => {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch meeting data
  const { data: meetingData, isLoading, error } = useQuery({ 
    queryKey: [`/api/meetings/${params.id}`],
  });
  
  const form = useForm({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      name: "",
    },
  });

  // Create participant mutation
  const createParticipant = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/meetings/${params.id}/participants`, 
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Navigate to the participant view with the participant ID
      navigate(`/participate/${params.id}?participantId=${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not join the meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: { name: string }) => {
    createParticipant.mutate(data);
  };

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto mb-2" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !meetingData) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Could not load meeting details. Please check the URL and try again.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go to homepage
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { meeting } = meetingData;
  const dateRange = formatDateRange(meeting.startDate, meeting.endDate);

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{meeting.title}</h1>
          <p className="text-gray-600">Organized by: {meeting.organizer}</p>
          <p className="text-gray-600">{dateRange}</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your name" 
                      {...field} 
                      className="p-3" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full py-6 mt-4"
              disabled={createParticipant.isPending}
            >
              {createParticipant.isPending 
                ? "Joining..." 
                : "Continue to Select Availability"
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default JoinMeeting;
