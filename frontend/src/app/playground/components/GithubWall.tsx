
import { Text, RoundedBox } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Repository {
    author: string;
    name: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
}

const mockData: Repository[] = [
    {"author":"amirsalarsafaei","name":"sqlc-pgx-monitoring","description":"A database monitoring/metrics library for pgx and sqlc. Trace, log and monitor your sqlc query performance using open telemetry","language":"Go","stars":13,"forks":0},
    {"author":"amirsalarsafaei","name":"Gitlab-Tele-Bot","description":"Gitlab Telegram Bot","language":"Go","stars":12,"forks":0},
    {"author":"divar-ir","name":"kenar-docs","description":"مستندات کنارِ دیوار","language":"","stars":83,"forks":14},
    {"author":"amirsalarsafaei","name":"dotfiles","description":"","language":"Nix","stars":0,"forks":0},
    {"author":"amirsalarsafaei","name":"amirsalarsafaei.com","description":"Personal website","language":"Rust","stars":0,"forks":0},
    {"author":"amirsalarsafaei","name":"llm-lsp.nvim","description":"🧠 A Neovim plugin combining LLM and LSP suggestions using probabilistic token selection for robust code generation.","language":"Lua","stars":2,"forks":0}
];

const RepoCard = ({ repo, position }: { repo: Repository; position: [number, number, number] }) => {
    const cardWidth = 14;
    const cardHeight = 6;
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);

    
    const material = useMemo(() => new THREE.MeshStandardMaterial({ 
        color: '#0a2a1a',
        metalness: 0.3,
        roughness: 0.7,
        transparent: true,
        opacity: 0.95,
    }), []);

    useFrame((state) => {
        if (meshRef.current) {
            if (hovered) {
                meshRef.current.scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.1);
                material.emissive.setHex(0x114411);
            } else {
                meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                material.emissive.setHex(0x000000);
            }
        }
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        window.open(`https://github.com/${repo.author}/${repo.name}`, '_blank');
    };

    return (
        <group position={position}>
            <RoundedBox
                ref={meshRef}
                args={[cardWidth, cardHeight, 0.2]} // Width, height, depth
                radius={0.2} // Border radius
                smoothness={4} // Optional: Number of curve segments
                material={material}
                renderOrder={-1}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHovered(false);
                    document.body.style.cursor = 'default';
                }}
                onClick={handleClick}
            >
                <Text
                    position={[-cardWidth/2 + 0.4, cardHeight/2 - 0.6, 0.11]}
                    fontSize={0.7}
                    color={hovered ? "#4eff91" : "#3cff7c"}
                    anchorX="left"
                    anchorY="top"
                    maxWidth={cardWidth - 0.8}
                >
                    {repo.name}
                </Text>
                <Text
                    position={[-cardWidth/2 + 0.4, cardHeight/2 - 1.7, 0.11]}
                    fontSize={0.4}
                    color={hovered ? "#cccccc" : "#999999"}
                    anchorX="left"
                    anchorY="top"
                    maxWidth={cardWidth - 0.8}
                font="/fonts/JetBrainsMono-Regular.ttf"
                >
                    {repo.description}
                </Text>
                <Text
                    position={[-cardWidth/2 + 0.4, -cardHeight/2 + 0.6, 0.11]}
                    fontSize={0.35}
                    color={hovered ? "#4eff91" : "#3cff7c"}
                    anchorX="left"
                    anchorY="bottom"
                font="/fonts/JetBrainsMono-Regular.ttf"
                >
                    {repo.language || 'No language'} • ⭐ {repo.stars} • 🍴 {repo.forks}
                </Text>
            </RoundedBox>
        </group>
    );
};

export default function GithubWall() {
    const wallWidth = 50;  // Fixed width
    const wallHeight = 35; // Fixed height

    const wallGeometry = useMemo(() => new THREE.BoxGeometry(wallWidth, wallHeight, 1), []);
    const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
        color: '#041a0f',
        metalness: 0.2,
        roughness: 0.9,
        transparent: false,
        opacity: 1,
    }), []);

    return (
        <group position={[0, wallHeight/2, -20]} rotation={[0, 0, 0]}>
            <mesh geometry={wallGeometry} material={wallMaterial} receiveShadow>
                <Text
                    position={[0, wallHeight/2 - 2.5, 0.51]}
                    fontSize={2.5}
                    color="#4eff91"
                font="/fonts/JetBrainsMono-Bold.ttf"
                >
                    GitHub Repositories
                </Text>
            </mesh>
            {mockData.map((repo, index) => {
                const row = Math.floor(index / 2);
                const col = index % 2;
                return (
                    <RepoCard
                        key={repo.name}
                        repo={repo}
                        position={[
                            col * 15 - 7.5,
                            wallHeight/2 - 8 - row * 7,
                            0.6
                        ]}
                    />
                );
            })}
        </group>
    );
}
