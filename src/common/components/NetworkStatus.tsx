"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiWifiOff, FiRefreshCcw, FiCloudDrizzle } from "react-icons/fi";

type ConnectionStatus = "online" | "offline" | "slow";

export default function NetworkStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const [dismissedSlow, setDismissedSlow] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    const checkConnection = () => {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      // Check the connection via the network information API
      const nav: any = navigator;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        // Consider 2G or slow-2G to be slow connections
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          setStatus("slow");
          return;
        }
      }
      
      setStatus("online");
      setDismissedSlow(false);
    };

    // Perform initial check
    checkConnection();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const nav: any = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      connection.addEventListener("change", checkConnection);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", checkConnection);
      }
    };
  }, []);

  if (!isClient) return null;

  const showOverlay = status === "offline" || (status === "slow" && !dismissedSlow);

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-azure-50/80 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(31,117,254,0.15)] overflow-hidden border border-azure-100"
          >
            <div className="relative p-8 md:p-10 text-center overflow-hidden">
               {/* Decorative background blobs */}
               <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-azure-100 to-transparent opacity-50 pointer-events-none" />
               
               {/* Animated Background Orbs */}
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 className="absolute -top-10 -right-10 w-48 h-48 bg-azure-200 rounded-full mix-blend-multiply blur-3xl opacity-40 pointer-events-none" 
               />
               <motion.div 
                 animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
                 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                 className="absolute -top-10 -left-10 w-48 h-48 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-40 pointer-events-none" 
               />
               
               <div className="relative z-10 flex flex-col items-center">
                 <motion.div
                   animate={{ 
                     y: [0, -8, 0],
                   }}
                   transition={{ 
                     repeat: Infinity, 
                     duration: 3,
                     ease: "easeInOut"
                   }}
                   className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 bg-white shadow-[0_10px_30px_-10px_rgba(31,117,254,0.3)] text-primary border border-azure-100"
                 >
                   {status === "offline" ? (
                     <FiWifiOff className="w-10 h-10" />
                   ) : (
                     <FiCloudDrizzle className="w-10 h-10" />
                   )}
                 </motion.div>
                 
                 <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                   {status === "offline" ? "Connection Lost" : "Slow Network Detected"}
                 </h2>
                 
                 <p className="text-gray-500 mb-8 leading-relaxed text-sm">
                   {status === "offline" 
                     ? "Uh oh! It seems you've lost your internet connection. We'll automatically reconnect you when your network is back, or you can try manually."
                     : "Your internet connection seems to be exceptionally slow right now. Edumate might take longer than usual to load and sync data."
                   }
                 </p>
                 
                 <div className="w-full flex flex-col gap-3">
                   <button
                     onClick={() => window.location.reload()}
                     className="w-full py-3.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 text-white bg-primary hover:bg-azure-700 shadow-[0_8px_20px_-8px_rgba(31,117,254,0.6)] transition-all active:scale-[0.98]"
                   >
                     <FiRefreshCcw className="w-5 h-5" />
                     {status === "offline" ? "Try Reconnecting" : "Refresh Page"}
                   </button>
                   
                   {status === "slow" && (
                     <button
                       onClick={() => setDismissedSlow(true)}
                       className="w-full py-3.5 px-4 rounded-xl font-medium text-primary bg-azure-50 hover:bg-azure-100 transition-colors active:scale-[0.98]"
                     >
                       Continue Anyway
                     </button>
                   )}
                 </div>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
