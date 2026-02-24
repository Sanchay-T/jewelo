"use client";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { api } from "../../../../convex/_generated/api";
import { Package, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const recentOrders = useQuery(api.orders.getRecent);
  const savedDesigns = useQuery(api.gallery.getRecentCompleted);

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="px-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-brown flex items-center justify-center">
            <span className="text-cream text-xl font-bold font-display">G</span>
          </div>
          <div>
            <h1 className="font-display text-2xl text-text-primary">Guest</h1>
            <p className="text-text-tertiary text-sm">Dubai, UAE</p>
          </div>
        </div>

        {/* Orders */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium">
              Your Orders
            </p>
            {recentOrders && recentOrders.length > 0 && (
              <span className="text-text-tertiary text-[10px]">
                {recentOrders.length} order{recentOrders.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {!recentOrders || recentOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-warm text-center">
              <Package className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-text-secondary text-sm">No orders yet</p>
              <p className="text-text-tertiary text-xs mt-1">
                Your orders will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, i) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/en/design/confirmed/${order._id}`}
                    className="flex items-center gap-3 bg-white rounded-xl p-3 border border-warm hover:bg-sand/30 transition"
                  >
                    <div className="w-12 h-12 rounded-lg bg-sand flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {order.imageUrl ? (
                        <img
                          src={order.imageUrl}
                          alt={order.designName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display italic text-gold text-sm">
                          {order.designName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">
                        &ldquo;{order.designName}&rdquo; pendant
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            order.status === "confirmed"
                              ? "bg-green-50 text-green-600"
                              : order.status === "in_production"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-sand text-text-tertiary"
                          }`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                        <span className="text-text-tertiary text-[10px] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-sm font-semibold text-brown">
                        AED {order.totalPrice.toLocaleString()}
                      </p>
                      <ChevronRight className="w-4 h-4 text-text-tertiary ml-auto" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Designs */}
        {savedDesigns && savedDesigns.length > 0 && (
          <div className="mb-8">
            <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-3">
              Saved Designs
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {savedDesigns.map((d) => (
                <div
                  key={d._id}
                  className="flex-shrink-0 w-24 h-24 rounded-xl border border-warm overflow-hidden bg-sand"
                >
                  <img
                    src={d.imageUrl}
                    alt={d.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings stub */}
        <div>
          <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-3">
            Settings
          </p>
          <div className="bg-white rounded-xl border border-warm divide-y divide-warm">
            <div className="flex items-center justify-between p-4">
              <span className="text-text-primary text-sm">Language</span>
              <span className="text-text-tertiary text-sm">English</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-text-primary text-sm">Currency</span>
              <span className="text-text-tertiary text-sm">AED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
