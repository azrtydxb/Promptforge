import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const ProfileLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden ml-[260px]">
        <Header />
        <main id="main-content" className="flex-1 overflow-y-auto bg-[#fafbfe] p-6">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default ProfileLayout;