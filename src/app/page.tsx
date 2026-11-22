import BriefingCard from "@/components/dashboard/BriefingCard";
import PriorityTasksCard from "@/components/dashboard/PriorityTasksCard";
import QuickCaptureCard from "@/components/dashboard/QuickCaptureCard";
import StandardHomeGrid from "@/components/dashboard/StandardHomeGrid";
import SystemHealthCard from "@/components/dashboard/SystemHealthCard";
import { getPortalMode } from "@/lib/portalModeServer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const mode = await getPortalMode();

  if (mode === "standard") {
    return <StandardHomeGrid />;
  }

  return (
    <div className="space-y-6">
      <SystemHealthCard />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BriefingCard />
        <PriorityTasksCard />
        <QuickCaptureCard />
      </div>
    </div>
  );
}
