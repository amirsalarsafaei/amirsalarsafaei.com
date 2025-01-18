import { Metadata } from 'next'
import { ListPublishedBlogsRequest } from "@generated/blogs/blogs";
import BlogsListClient from './components/PublishedBlogs'
import { getGrpcClients } from '@/clients/grpc';

export const metadata: Metadata = {
  title: 'Blogs | AmirSalar Safaei',
  description: 'Browse my published blogs about software engineering'
}

async function getInitialBlogs() {
  const {blogs_client} = getGrpcClients();

  const req = ListPublishedBlogsRequest.create({
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
  
  return <BlogsListClient initialData={initialData} initialDataUpdatedAt={Date.now()} />;
}

