'use client'

import { useInfiniteQuery } from "@tanstack/react-query";
import { Blog, GrpcWebError, ListPublishedBlogsRequest, ListPublishedBlogsResponse } from "@generated/blogs/blogs";
import { useSearchParams } from "next/navigation";
import BlogsList from "@/components/BlogsList/BlogsList";
import { useGrpc } from "@/providers/GrpcProvider";

export default function BlogsListClient({ 
  initialData, initialDataUpdatedAt
}: { 
  initialData: Awaited<ListPublishedBlogsResponse>, initialDataUpdatedAt: number
}) {
  const searchParams = useSearchParams();
  const {blogs_client} = useGrpc();
  
  const getPublishedBlogs = async ({ pageParam = "" }) => {
    const req = ListPublishedBlogsRequest.create({
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
    initialDataUpdatedAt: initialDataUpdatedAt,
    initialPageParam: "",
    initialData: {
      pages: [initialData],
      pageParams: [""]
    },
    refetchOnMount: true,
  });

  return BlogsList({
    blogs: data?.pages?.reduce((collected, page) => [...collected, ...page.blogs], [] as Blog[]) ?? [],
    isLoadingError,
    isFetching,
    isAdmin: false,
  });
}
