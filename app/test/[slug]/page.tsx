export async function generateStaticParams() {
  return [{ slug: "x" }];
}

export default function TestSlugPage() {
  return <div>test slug</div>;
}
