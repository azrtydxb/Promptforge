import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FollowingLoading() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Avatar */}
                  <Skeleton className="h-20 w-20 rounded-full" />

                  {/* User Info */}
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-5 w-32 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 justify-center w-full">
                    <div className="text-center space-y-1">
                      <Skeleton className="h-6 w-12 mx-auto" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="text-center space-y-1">
                      <Skeleton className="h-6 w-12 mx-auto" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="text-center space-y-1">
                      <Skeleton className="h-6 w-12 mx-auto" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>

                  {/* Action Button */}
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
