'use client';

import {
	Text,
} from '@react-three/drei';
import { GetRecentlyPlayedSongRequest } from '@generated/playground/spotify';
import { useQuery }
	from '@tanstack/react-query';
import { RpcError } from 'grpc-web';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { useGrpc } from '@/providers/GrpcProvider';
import DivoomSpeakerModel from '@/models/DivoomSpeakerModel';

const REFETCH_INTERVAL = 1 * 60_000; // 1 minutes in milliseconds
const STALE_TIME = 10 * 60_000; // 10 minutes in milliseconds

const pixelateVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pixelateFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uPixelSize;
  varying vec2 vUv;
  
  void main() {
    vec2 pixelatedUv = floor(vUv * uPixelSize) / uPixelSize;
    gl_FragColor = texture2D(uTexture, pixelatedUv);
  }
`;

function AlbumArt({ url }: { url: string }) {
	// TODO: surely pixelating a jpeg can be done without custom shaders.
  const pixelMaterial = useMemo(() => {
    const texture = useLoader(THREE.TextureLoader, url);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uPixelSize: { value: 16 }
      },
      vertexShader: pixelateVertexShader,
      fragmentShader: pixelateFragmentShader,
      transparent: true
    });
  }, [url]);

	return (
    <mesh position={[0, 0.6, 0.85]}>
      <planeGeometry args={[2.7, 2.7]} />
      <primitive object={pixelMaterial} attach="material" />
    </mesh>
	);

}

export default function MusicPlayer() {

	const { spotify_client } = useGrpc();

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
		<group rotation={[0, -Math.PI / 6, 0]} position={[11.1, 0, -0.2]} scale={1.25}>

			<DivoomSpeakerModel
				rotation={[0, Math.PI / 2, 0]}
				renderOrder={1}
				customDepth={{
					depthWrite: false,
					depthTest: true
				}}
			/>

			<group position={[0, 2, -0.18]} scale={0.7} rotation={[-0.1, 0, 0]}>
				<Suspense fallback={null}>
					{isPending || isLoadingError ? (
						<Text
							color="#FF2E2E"
							scale={0.3}
							position={[0, 2, 1.05]}
							maxWidth={13}
							textAlign="center"
							anchorX="center"
							anchorY="top"
						>
							{isPending ? "Loading" : "Error"}
						</Text>
					) : (
						<>
							<Text
								color="#00FFFF"
								scale={0.3}
								position={[0, 2.6, 1.2]}
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
								position={[0, 0.05, 0.87]}
								maxWidth={13}
								textAlign="center"
								anchorX="center"
								anchorY="top"
								overflowWrap="break-word"
								whiteSpace="normal"
								font="Signika-Medium.ttf"
							>
								{isSuccess ? `${data.track}\n${data.artist}` : ''}
							</Text>
						</>
					)}
				</Suspense>
			</group>
		</group>
	)
}
