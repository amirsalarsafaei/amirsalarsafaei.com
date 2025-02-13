import BlogContent from './BlogContent';
import { GetBlogRequest } from "@generated/blogs/blogs";
import { createGrpcClients } from '@/clients/grpc';

export { generateMetadata } from './page.metadata';

export default async function BlogPage({ params }: { params: { id: string } }) {
	const {blogs_client} = createGrpcClients();
  const req = GetBlogRequest.create({ id: params.id });
  const data = await blogs_client.GetBlog(req);
  
  return <BlogContent initialData={data} />;
}
