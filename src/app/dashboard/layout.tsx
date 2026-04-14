import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/ui/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <DashboardNav user={user} />
      <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
