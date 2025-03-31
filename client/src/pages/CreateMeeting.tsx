import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMeetingFormSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CreateMeeting = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [_, navigate] = useLocation();

  const form = useForm({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: {
      meetingTitle: "",
      organizer: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      startTime: "9",
      endTime: "17",
      timeSlotDuration: "30",
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/meetings", data);
      const meeting = await response.json();
      
      toast({
        title: "Meeting created",
        description: "Your meeting has been created successfully!",
      });
      
      navigate(`/meeting/${meeting.uniqueId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="pt-6">
        <h1 className="text-2xl font-bold text-primary mb-4">Create a New Tab</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="meetingTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly Team Meeting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="organizer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel className="block text-sm font-medium mb-1">Time Range</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500">Start Time</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="9">9:00 AM</SelectItem>
                          <SelectItem value="10">10:00 AM</SelectItem>
                          <SelectItem value="11">11:00 AM</SelectItem>
                          <SelectItem value="12">12:00 PM</SelectItem>
                          <SelectItem value="13">1:00 PM</SelectItem>
                          <SelectItem value="14">2:00 PM</SelectItem>
                          <SelectItem value="15">3:00 PM</SelectItem>
                          <SelectItem value="16">4:00 PM</SelectItem>
                          <SelectItem value="17">5:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500">End Time</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="10">10:00 AM</SelectItem>
                          <SelectItem value="11">11:00 AM</SelectItem>
                          <SelectItem value="12">12:00 PM</SelectItem>
                          <SelectItem value="13">1:00 PM</SelectItem>
                          <SelectItem value="14">2:00 PM</SelectItem>
                          <SelectItem value="15">3:00 PM</SelectItem>
                          <SelectItem value="16">4:00 PM</SelectItem>
                          <SelectItem value="17">5:00 PM</SelectItem>
                          <SelectItem value="18">6:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="timeSlotDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Slot Duration</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full py-6 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Tab"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateMeeting;
