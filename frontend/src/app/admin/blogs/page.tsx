'use client';

import { useInfiniteQuery } from "@tanstack/react-query";
import { blogs_client } from "@/clients/grpc";
import { Blog, GrpcWebError, ListBlogsRequest } from "@generated/blogs/blogs";
import { useSearchParams } from "next/navigation";
import { grpc } from "@improbable-eng/grpc-web";

import { useAuth } from "@/hooks/useAuth";
import BlogsList from "@/components/BlogsList/BlogsList";

export default function Blogs() {

	const params = useSearchParams();
	const { token } = useAuth();

	const getAllBlogs = async ({ pageParam = "" }) => {
		let req = ListBlogsRequest.create({
			pageSize: Number(params.get("page-size")) || 0,
			pageToken: pageParam,
		});

		try {
			return await blogs_client.ListBlogs(req, new grpc.Metadata({ ...(token && {"authorization": [token]}) }));
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
		queryKey: ["all-blogs", params.get("page-size")],
		queryFn: getAllBlogs,
		getNextPageParam: (lastPage) => {
			if (lastPage.nextPageToken.length == 0) {
				return undefined;
			}
			return lastPage.nextPageToken
		},
		initialPageParam: "",
	});

	return BlogsList({
		blogs: data?.pages?.reduce((collected, page) => [...collected, ...page.blogs], [] as Blog[]) ?? [],
		isLoadingError,
		isFetching
	});

}


