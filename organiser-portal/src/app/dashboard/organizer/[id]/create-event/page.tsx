"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { CreateEventForm } from "@/components/dashboard/CreateEventForm";
import "../../../organizer-dashboard.css";
import { useState } from "react"; 
// import { showToast } from "@/components/Toast";
import { Toast, useToast } from "@/components/ui/Toast";

export default function CreateEventPage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const organiserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const [lastEvent, setLastEvent] = useState<any>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lastEvent") : null;
    return saved ? JSON.parse(saved) : null;
  }); 

  const {showToast,toast,hideToast } = useToast();

  useAuthGuard({
    requiredRole: "organiser",
    routeUserId: organiserId,
    redirectTo: "/login?role=organiser",
  });

  const handleSuccess = () => {
    router.push(`/dashboard/organizer/${organiserId}`);
  };

  return (
    <div className="organizer-dashboard-container"> 
        {toast && <Toast type={toast.type} title={toast.title} subtitle={toast.subtitle} onClose={hideToast} />}


        <div className="dashboard-header-section">
          <div className="header-left">
            <h1  className="dashboard-title">Create Event</h1>
            <p className="dashboard-subtitle">Fill the event details and you will be redirected to the dashboard when it is created.</p>
          </div>
        </div>
        <CreateEventForm
         lastEvent={lastEvent}   
         onClose={()=>{router.push(`/dashboard/organizer/${organiserId}`)}}
         onCreate={() => {showToast("success", "Game Created!", "Your event is now live.")}}
         onSuccess={handleSuccess}/> 
    </div>
  );
}
