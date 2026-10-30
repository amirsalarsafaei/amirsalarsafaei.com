import EditBlogClient from "./EditBlogClient";

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditBlogClient id={id} />;
}
