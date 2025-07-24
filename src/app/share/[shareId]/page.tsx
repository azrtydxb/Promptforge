import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getShareLink, recordShareView } from "@/app/actions/prompt-share.actions";
import { PublicShareView } from "@/components/share/public-share-view";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ 
  params 
}: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  const shareData = await getShareLink(shareId);
  
  if (!shareData || "expired" in shareData || "viewLimitReached" in shareData) {
    return {
      title: "Shared Prompt - PromptForge",
      description: "View and use shared AI prompts"
    };
  }
  
  return {
    title: `${shareData.title} - PromptForge`,
    description: shareData.description || "A shared AI prompt on PromptForge",
    openGraph: {
      title: shareData.title,
      description: shareData.description || "A shared AI prompt on PromptForge",
      type: "article",
      authors: shareData.settings.showAuthor ? [shareData.user.name || shareData.user.username] : undefined,
    },
    twitter: {
      card: "summary",
      title: shareData.title,
      description: shareData.description || "A shared AI prompt on PromptForge",
    }
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  const shareData = await getShareLink(shareId);
  
  if (!shareData) {
    notFound();
  }
  
  // Record view (async, don't await)
  recordShareView(shareId);
  
  // Handle special cases
  if ("expired" in shareData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Link Expired</h1>
          <p className="text-muted-foreground mb-8">
            This share link has expired and is no longer available.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
          >
            Go to PromptForge
          </Link>
        </div>
      </div>
    );
  }
  
  if ("viewLimitReached" in shareData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">View Limit Reached</h1>
          <p className="text-muted-foreground mb-8">
            This share link has reached its maximum number of views.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
          >
            Go to PromptForge
          </Link>
        </div>
      </div>
    );
  }
  
  return <PublicShareView shareData={shareData} shareId={shareId} />;
}