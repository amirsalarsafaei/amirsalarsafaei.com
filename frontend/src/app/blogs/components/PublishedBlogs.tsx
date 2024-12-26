'use client'

import { useInfiniteQuery } from "@tanstack/react-query";
import { blogs_client } from "@/clients/grpc";
import { Blog, GrpcWebError, ListBlogsRequest } from "@generated/blogs/blogs";
import { useSearchParams } from "next/navigation";
import BlogsList from "@/components/BlogsList/BlogsList";

export default function BlogsListClient({ 
  initialData 
}: { 
  initialData: Awaited<ReturnType<typeof blogs_client.ListPublishedBlogs>> 
}) {
  const searchParams = useSearchParams();
  
  const getPublishedBlogs = async ({ pageParam = "" }) => {
    const req = ListBlogsRequest.create({
      pageSize: Number(searchParams.get("page-size")) || 10,
      pageToken: pageParam,
    });

    try {
      return await blogs_client.ListPublishedBlogs(req);
    } catch (error) {
      console.log(error);
      if (error instanceof GrpcWebError) {
        console.error('gRPC Error: ', error.message, error.code);
        throw error;
      }
      throw error;
    }
  };

  const { isFetching, data, isLoadingError } = useInfiniteQuery({
    queryKey: ["published-blogs", searchParams.get("page-size")],
    queryFn: getPublishedBlogs,
    getNextPageParam: (lastPage) => {
      if (lastPage.nextPageToken.length == 0) {
        return undefined;
      }
      return lastPage.nextPageToken
    },
    initialPageParam: "",
    initialData: {
      pages: [initialData],
      pageParams: [""]
    }
  });

  return BlogsList({
    blogs: data?.pages?.reduce((collected, page) => [...collected, ...page.blogs], [] as Blog[]) ?? [],
    isLoadingError,
    isFetching
  });
}