'use client';

import dynamic from 'next/dynamic';
const GadgetMusic = dynamic(() => import('@/models/GadgetMusic'), { ssr: false });
import {
	Text,
} from '@react-three/drei';
import { spotify_client } from '@/clients/grpc';
import { GetRecentlyPlayedSongRequest } from '@generated/playground/spotify';
import { useQuery }
	from '@tanstack/react-query';
import { RpcError } from 'grpc-web';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { Suspense } from 'react';

const REFETCH_INTERVAL = 1 * 60_000; // 1 minutes in milliseconds
const STALE_TIME = 10 * 60_000; // 10 minutes in milliseconds

function AlbumArt({ url }: { url: string }) {
	const texture = useLoader(THREE.TextureLoader, url);

	return (
		<mesh position={[0, 0.6, 1.05]}>
			<planeGeometry args={[3, 3]} />
			<meshBasicMaterial
				map={texture}
				transparent
			/>
		</mesh>
	);
}

export default function MusicPlayer() {

	const fetchLastSong = async () => {
		const request = GetRecentlyPlayedSongRequest.create();

		try {
			return await spotify_client.GetRecentlyPlayedSong(request);
		} catch (error) {
			if (error instanceof RpcError) {
				console.error('gRPC Error: ', error.message, error.code);
				throw error;
			}
			throw error;
		}
	}

	const { data, isLoadingError, isPending, isSuccess } = useQuery({
		queryKey: ["spotify", "last-song"],
		queryFn: fetchLastSong,
		refetchInterval: REFETCH_INTERVAL,
		staleTime: STALE_TIME,
	})



	return (
		<group rotation={[0, -Math.PI / 6, 0]} position={[17, 3.7, 10]} >
			<GadgetMusic rotation={[0, Math.PI, 0]} scale={50} />

			<Suspense fallback={null}>
				{isPending || isLoadingError ? (
					<Text
						color="#FF2E2E"
						scale={0.5}
						position={[0, 2, 1.05]}
						maxWidth={13}
						textAlign="center"
						anchorX="center"
						anchorY="top"
					>
						{isPending ? "Loading" : "Error"}
					</Text>
				) : (
					<group>
						<Text
							color="#00FFFF"
							scale={0.5}
							position={[0, 2.8, 1.05]}
							maxWidth={13}
							textAlign="center"
							anchorX="center"
							anchorY="top"
							font="Signika-Medium.ttf"
						>
							{data.playing ? "Playing on Spotify" : "Last played on Spotify"}
						</Text>
						{data.albumArtUrl &&
							(
								<AlbumArt url={data.albumArtUrl} />
							)
						}
						<Text
							color="#00FFFF"
							scale={0.3}
							position={[0, -1.1, 1.07]}
							maxWidth={13}
							textAlign="center"
							anchorX="center"
							anchorY="top"
							overflowWrap="break-word"
							whiteSpace="normal"
							font="Signika-Medium.ttf"
						>
							{isSuccess ? `${data.track}\n${data.artist}` : ''}
							{"\n"}
							{data.playing ? "| |" : "▶"}
						</Text>
					</group>
				)}
			</Suspense>
		</group>
	)
}
