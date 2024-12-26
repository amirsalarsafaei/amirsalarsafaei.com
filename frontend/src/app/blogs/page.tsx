import { Metadata } from 'next'
import { blogs_client } from "@/clients/grpc";
import { ListBlogsRequest } from "@generated/blogs/blogs";
import BlogsListClient from './components/PublishedBlogs'

export const metadata: Metadata = {
  title: 'Blogs',
  description: 'Browse our published blogs'
}

async function getInitialBlogs() {
  const req = ListBlogsRequest.create({
    pageSize: 10,
    pageToken: "",
  });

	try {
	  const response = await blogs_client.ListPublishedBlogs(req);
	  return response;
	} catch (error) {
	  console.error('Failed to fetch initial blogs:', error);
	  throw error;
	}
}

export default async function PublishedBlogs() {
  const initialData = await getInitialBlogs();
  
  return <BlogsListClient initialData={initialData} />;
}

