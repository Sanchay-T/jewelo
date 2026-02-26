"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useDesignFlow } from "@/lib/DesignFlowContext";
import { Check } from "lucide-react";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function ConfirmedPage() {
  const params = useParams();
  const orderId = params.id as Id<"orders">;
  const order = useQuery(api.orders.get, orderId ? { orderId } : "skip");
  const { clearDesign } = useDesignFlow();

  // Clear the active design so the "Continue Design" banner stops showing
  useEffect(() => {
    clearDesign();
  }, [clearDesign]);

  return (
    <div className="min-h-screen bg-cream px-6 pt-4 pb-24 flex flex-col items-center lg:pt-20 lg:pb-8">
      <div className="w-full max-w-lg">
      <div className="flex flex-col items-center">
      <div className="h-4" />
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mt-8 mb-6">
        <Check className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="font-display text-2xl mb-2">Order Confirmed</h2>
      <p className="text-text-tertiary text-sm font-mono mb-6">
        #{orderId?.toString().slice(-8).toUpperCase() || "--------"}
      </p>

      <div className="w-full bg-white rounded-xl p-4 border border-warm mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-sand flex items-center justify-center">
            <p className="font-display italic text-gold">
              {order?.design?.name?.charAt(0) || "?"}
            </p>
          </div>
          <div>
            <p className="font-medium">
              &ldquo;{order?.design?.name || "..."}&rdquo; pendant
            </p>
            <p className="text-text-tertiary text-xs">
              {order?.design?.karat} · {order?.design?.size}
            </p>
            <p className="font-mono text-brown font-semibold mt-1">
              AED {order?.totalPrice?.toLocaleString() || "---"}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4 mb-8">
        <p className="text-text-secondary text-xs uppercase tracking-wider font-medium">
          What&apos;s next
        </p>
        {[
          {
            step: 1,
            title: "Design Review",
            desc: "Within 2 hours",
            active: true,
          },
          {
            step: 2,
            title: "3D Model",
            desc: "CAD production file",
            active: false,
          },
          {
            step: 3,
            title: "Production",
            desc: "Casting & finishing (2-3 days)",
            active: false,
          },
        ].map((item) => (
          <div key={item.step} className="flex gap-3 items-start">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.active ? "bg-brown/10" : "bg-sand"
              }`}
            >
              <span
                className={`text-xs font-mono font-bold ${
                  item.active ? "text-brown" : "text-text-tertiary"
                }`}
              >
                {item.step}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-text-tertiary text-xs">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/en"
        className="w-full bg-brown text-cream font-semibold py-4 rounded-xl text-center mb-3"
      >
        Design Another
      </Link>
      </div>
      </div>
    </div>
  );
}
