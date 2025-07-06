import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { enhancedScheduler } from "@/services/enhancedScheduler";
import { supabase } from "@/integrations/supabase/client";
import { formatISTTime } from "@/utils/timeUtils";

const DashboardCards = () => {
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);

  const loadUpcomingPosts = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: posts } = await supabase
        .from('content_posts')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true })
        .limit(5);

      setUpcomingPosts(posts || []);
    } catch (error) {
      console.error('Failed to load upcoming posts:', error);
    }
  };

  const checkSchedulerStatus = async () => {
    try {
      const status = await enhancedScheduler.getStatus();
      setSchedulerStatus(status);
    } catch (error) {
      console.error('Failed to check scheduler status:', error);
    }
  };

  useEffect(() => {
    loadUpcomingPosts();
    checkSchedulerStatus();

    const intervalId = setInterval(() => {
      checkSchedulerStatus();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else {
      return formatISTTime(timestamp);
    }
  };

  const handleGenerateContent = async () => {
    try {
      console.log('🚀 Manual content generation triggered');
      await enhancedScheduler.forceGenerateContent();
      console.log('✅ Manual content generation completed');
      
      // Refresh the data
      setTimeout(() => {
        loadUpcomingPosts();
      }, 2000);
    } catch (error) {
      console.error('❌ Manual content generation failed:', error);
    }
  };

  const handleStartScheduler = async () => {
    try {
      console.log('🎯 Starting scheduler...');
      await enhancedScheduler.start();
      console.log('✅ Scheduler started successfully');
      
      // Refresh status after a delay
      setTimeout(() => {
        checkSchedulerStatus();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to start scheduler:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Scheduler Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduler Status
          </CardTitle>
          <CardDescription>
            {schedulerStatus?.isRunning ? 'Active and monitoring' : 'Stopped'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status:</span>
              <span className={schedulerStatus?.isRunning ? 'text-green-600' : 'text-red-600'}>
                {schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Jobs:</span>
              <span>{schedulerStatus?.jobQueue?.total || 0} total</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Processing:</span>
              <span>{schedulerStatus?.jobQueue?.processing || 0}</span>
            </div>
            <div className="pt-2 space-y-2">
              <Button
                onClick={handleStartScheduler}
                className="w-full"
                disabled={schedulerStatus?.isRunning}
                size="sm"
              >
                {schedulerStatus?.isRunning ? 'Running' : 'Start Scheduler'}
              </Button>
              <Button
                onClick={handleGenerateContent}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Generate Content Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Posts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Posts
          </CardTitle>
          <CardDescription>
            Scheduled content for the next few days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingPosts.length > 0 ? (
            upcomingPosts.map(post => (
              <div key={post.id} className="border-b pb-2 last:border-none">
                <div className="flex justify-between">
                  <span className="font-semibold">{post.title}</span>
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(post.scheduled_for)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Platform: {post.platform_name}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500">
              No upcoming posts scheduled.
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Overview of system performance and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uptime:</span>
            <span>{schedulerStatus?.uptime || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Content Generation:</span>
            <span>{schedulerStatus?.lastContentGenerationDate || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Analytics Retrieval:</span>
            <span>{schedulerStatus?.lastAnalyticsRetrievalDate || 'N/A'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCards;
