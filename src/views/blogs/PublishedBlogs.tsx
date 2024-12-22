import { useInfiniteQuery } from "@tanstack/react-query";
import { blogs_client } from "@/clients/grpc";
import { Blog, GrpcWebError, ListBlogsRequest } from "@generated/blogs/blogs";
import { useSearchParams } from "react-router-dom";

import BlogsList from "./BlogsList";

export default function PublishedBlogs() {

	const [params, _] = useSearchParams();

	const getPublishedBlogs = async ({ pageParam = "" }) => {
		let req = ListBlogsRequest.create({
			pageSize: Number(params.get("page-size")) || 0,
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
		queryKey: ["published-blogs", params.get("page-size")],
		queryFn: getPublishedBlogs,
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

