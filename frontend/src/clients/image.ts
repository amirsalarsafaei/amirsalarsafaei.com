const GRPC_WEB_URL = process.env.NEXT_PUBLIC_IMAGE_SERVER_WEB_URL || 'http://localhost:3001';


export interface ImageClient {
	UploadImage(file: File, authorization: string): Promise<string>
}

class ImageClientImpl implements ImageClient {
	async UploadImage(file: File, authorization: string): Promise<string> {
		try {
			const response = await fetch(`${GRPC_WEB_URL}/upload`, {
				method: 'POST',
				headers: {
					'Content-Type': file.type || 'application/octet-stream',
					'Content-Length': file.size.toString(),
					'Authorization': authorization
				},
				body: await file.arrayBuffer(),
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			const name = await response.text();
			return `${GRPC_WEB_URL}/images/${name}`;
		} catch (error) {
			console.error('Error uploading image:', error);
			throw error;
		}
	}
}
const image_client: ImageClient = new ImageClientImpl();

export default image_client;
