import HotelDetailClient from "@/components/HotelDetailClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [
    { id: "test" }, // 例
    // 実運用では ID リストを返す (または [] でビルド通す)
  ];
}

export default function HotelDetailPage() {
  return <HotelDetailClient />;
}