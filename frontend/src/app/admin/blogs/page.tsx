'use client';

import { useInfiniteQuery } from "@tanstack/react-query";
import { Blog, GrpcWebError, ListBlogsRequest } from "@generated/blogs/blogs";
import { useSearchParams } from "next/navigation";
import BlogsList from "@/components/BlogsList/BlogsList";
import { useGrpc } from "@/providers/GrpcProvider";
import { useAuth } from "@/hooks/useAuth";
import { grpc } from '@improbable-eng/grpc-web';
import { Button } from "@/components/Button/Button";
import styles from './page.module.scss';

export default function BlogsListClient() {
	const searchParams = useSearchParams();
	const { blogs_client } = useGrpc();
	const { token } = useAuth();

	const getBlogs = async ({ pageParam = "" }) => {
		const req = ListBlogsRequest.create({
			pageSize: Number(searchParams.get("page-size")) || 10,
			pageToken: pageParam,
		});

		try {
			return await blogs_client.ListBlogs(req, new grpc.Metadata({ ...(token && { authorization: token }) }));
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
		queryKey: ["blogs", searchParams.get("page-size")],
		queryFn: getBlogs,
		getNextPageParam: (lastPage) => {
			if (lastPage.nextPageToken.length == 0) {
				return undefined;
			}
			return lastPage.nextPageToken
		},
		initialPageParam: "",
	});

	return (
		<>
			<div className={styles.toolbar}>
				<Button variant="primary" href={'/admin/blogs/new'} >
					New
				</Button>
			</div>
			<BlogsList
				blogs={data?.pages?.reduce((collected, page) => [...collected, ...page.blogs], [] as Blog[]) ?? []}
				isLoadingError={isLoadingError}
				isFetching={isFetching}
				isAdmin
			/>
		</>
	);
}
