"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ImmersiveVideoGallery } from "@/components/design/ImmersiveVideoGallery";

export default function VideosPage() {
  const params = useParams();
  const router = useRouter();
  const designId = params.id as Id<"designs">;

  const design = useQuery(
    api.designs.getWithVideos,
    designId ? { designId } : "skip"
  );

  const selectVariation = useMutation(api.designs.selectVariation);

  if (!design) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brown border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSelect = async (variationIndex: number) => {
    await selectVariation({ designId, index: variationIndex });
    router.push(`/en/design/engraving/${designId}`);
  };

  return (
    <ImmersiveVideoGallery
      videoUrls={design.videoUrls || []}
      videoStatuses={design.videoStatuses || []}
      posterUrls={design.productImageUrls || []}
      onSelect={handleSelect}
      onBack={() => router.back()}
    />
  );
}
