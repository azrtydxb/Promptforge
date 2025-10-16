import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFollowing,
  getFollowers,
  getSuggestedUsers,
  getFollowStats,
} from "@/app/actions/user-follow.actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList, SuggestedUsers } from "@/components/follow/user-list";
import { FollowStats } from "@/components/follow/follow-stats";
import { Users, UserPlus } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Following | PromptForge",
  description: "Manage your following and discover new creators",
};

export default async function FollowingPage() {
  try {
    const user = await requireAuth();

    const [followingResult, followersResult, suggestedResult, statsResult] =
      await Promise.all([
        getFollowing(),
        getFollowers(),
        getSuggestedUsers(12),
        getFollowStats(user.id),
      ]);

    const following = followingResult.success ? followingResult.following : [];
    const followers = followersResult.success ? followersResult.followers : [];
    const suggested = suggestedResult.success ? suggestedResult.users : [];
    const stats = statsResult.success
      ? statsResult.stats
      : { followers: 0, following: 0 };

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Network</h1>
          <p className="text-muted-foreground mt-2">
            Connect with creators and discover new content
          </p>
        </div>

        <FollowStats
          followers={stats.followers}
          following={stats.following}
        />

        <Tabs defaultValue="following" className="space-y-6">
          <TabsList>
            <TabsTrigger value="following">
              <UserPlus className="w-4 h-4 mr-2" />
              Following ({following?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="followers">
              <Users className="w-4 h-4 mr-2" />
              Followers ({followers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="discover">
              <Users className="w-4 h-4 mr-2" />
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="space-y-4">
            <UserList
              users={following || []}
              currentUserId={user.id}
              emptyMessage="You're not following anyone yet. Discover creators in the Discover tab!"
              showFollowButton={true}
            />
          </TabsContent>

          <TabsContent value="followers" className="space-y-4">
            <UserList
              users={followers || []}
              currentUserId={user.id}
              emptyMessage="No followers yet. Share great prompts to grow your following!"
              showFollowButton={true}
            />
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <SuggestedUsers
              users={suggested || []}
              currentUserId={user.id}
              title="Suggested Creators"
              description="Popular creators you might be interested in following"
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch {
    redirect("/login");
  }
}
