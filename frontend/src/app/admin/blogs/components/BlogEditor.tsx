'use client';

import { useState, useRef } from 'react';
import styles from './BlogEditor.module.scss';
import Markdown from '@/components/Markdown/Markdown';
import { CreateTagRequest, DeleteTagRequest } from '@generated/blogs/blogs';
import image_client from '@/clients/image';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button/Button';
import { ListTagsRequest, Tag } from '@generated/blogs/blogs';
import { useGrpc } from '@/providers/GrpcProvider';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Chip } from '@/components/Chip/Chip';
import { grpc } from '@improbable-eng/grpc-web';

export interface SubmitBlogProps {
	title: string;
	content: string;
	imageUrl: string | undefined;
	tags: string[];
}

interface CustomButton {
	label: string;
	onClick: () => void;
	disabled?: boolean;
}

interface BlogEditorProps {
	onSubmit: (blog: SubmitBlogProps) => Promise<void>;
	buttonLabel: string;
	isSubmiting: boolean;
	initialContent: string;
	initialTitle: string;
	initialImageUrl: string | undefined;
	initialTags: Tag[];
	headerButtons?: CustomButton[];
}

export default function BlogEditor({
	onSubmit,
	buttonLabel,
	isSubmiting = false,
	initialTitle = '',
	initialContent = '',
	initialImageUrl = undefined,
	initialTags = [],
	headerButtons = [],
}: BlogEditorProps) {
	const [markdown, setMarkdown] = useState(initialContent);
	const [title, setTitle] = useState(initialTitle);
	const [imageUrl, setImageUrl] = useState(initialImageUrl);
	const [tags, setTags] = useState(initialTags);
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const blogImageInputRef = useRef<HTMLInputElement>(null);
	const { token } = useAuth();


	const { tags_client } = useGrpc();

	const { data: availableTags = [], refetch: refetchTags } = useQuery({
		queryKey: ['tags'],
		queryFn: async () => {
			const response = await tags_client.ListTags(ListTagsRequest.create(), new grpc.Metadata({ ...(token && { authorization: token }) }));
			console.log(initialTags);
			return response.tags;
		}
	});

	const createTagMutation = useMutation({
		mutationFn: async (tagName: string) => {
			const request = CreateTagRequest.create({ name: tagName });
			const response = await tags_client.CreateTag(request, new grpc.Metadata({ ...(token && { authorization: token }) }));
			return response;
		},
		onSuccess: () => {
			refetchTags();
		},
	});

	const deleteTagMutation = useMutation({
		mutationFn: async (tagId: string) => {
			const request = DeleteTagRequest.create({ id: tagId });
			await tags_client.DeleteTag(request, new grpc.Metadata({ ...(token && { authorization: token }) }));
			return tagId;
		},
		onSuccess: (deletedTagId) => {
			// Remove the deleted tag from selected tags if it was selected
			setTags(tags.filter(t => t.id !== deletedTagId));
			refetchTags();
		},
	});

	const handleCreateTag = async () => {
		const tagName = prompt('Enter new tag name:');
		if (!tagName) return;

		try {
			await createTagMutation.mutateAsync(tagName);
		} catch (error) {
			console.error('Failed to create tag:', error);
			alert('Failed to create tag. Please try again.');
		}
	};

	const handleDeleteTag = async (tagId: string) => {
		if (!confirm('Are you sure you want to delete this tag?')) return;

		try {
			await deleteTagMutation.mutateAsync(tagId);
		} catch (error) {
			console.error('Failed to delete tag:', error);
			alert('Failed to delete tag. Please try again.');
		}
	};

	const handleTagToggle = (tag: Tag) => {
		const isSelected = tags.some(t => t.id === tag.id);
		if (isSelected) {
			setTags(tags.filter(t => t.id !== tag.id));
		} else {
			setTags([...tags, tag]);
		}
	};

	const handleSubmit = () => {
		onSubmit({
			content: markdown,
			title,
			imageUrl,
			tags: tags.map(t => t.id)
		})
	};

	const insertTextAtCursor = (text: string) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const newContent = markdown.substring(0, start) + text + markdown.substring(end);

		setMarkdown(newContent);

		// Reset cursor position after React updates the textarea
		setTimeout(() => {
			textarea.focus();
			textarea.selectionStart = start + text.length;
			textarea.selectionEnd = start + text.length;
		}, 0);
	};


	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file || !token) return;

		try {
			const imageUrl = await image_client.UploadImage(file, token);
			const markdownImage = `![${file.name}](${imageUrl})`;
			insertTextAtCursor(markdownImage);
		} catch (error) {
			console.error('Failed to upload image:', error);
			alert('Failed to upload image. Please try again.');
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleBlogImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file || !token) return;

		try {
			const imageUrl = await image_client.UploadImage(file, token);
			setImageUrl(imageUrl);
		} catch (error) {
			console.error('Failed to upload image:', error);
			alert('Failed to upload image. Please try again.');
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};


	return (
		<div className={styles.upsertContainer}>
			<div className={styles.upsertHeader}>
				<input
					type="text"
					placeholder="Enter blog title..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className={styles.titleInput}
				/>

				<div className={styles.tagsSection}>
					<div className={styles.tagsHeader}>
						<h3>Tags</h3>
						<Button
							onClick={handleCreateTag}
							variant="terminal"
							size="sm"
						>
							Add Tag
						</Button>
					</div>
					<div className={styles.tagsContainer}>
						{availableTags.map((tag) => (
							<div key={tag.id} className={styles.tagWrapper}>
								<Chip
									label={tag.name}
									onClick={() => handleTagToggle(tag)}
									selected={tags.some(t => t.id === tag.id)}
								/>
								<button
									className={styles.deleteTagButton}
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteTag(tag.id);
									}}
									title="Delete tag"
								>
									×
								</button>
							</div>
						))}
					</div>
				</div>
				<div className={styles.headerButtons}>
					{headerButtons.map((btn, index) => (
						<Button
							key={`header-btn-${index}`}
							onClick={btn.onClick}
							disabled={btn.disabled}
							variant='terminal'
						>
							{btn.label}
						</Button>
					))}
					<div className={styles.blogImageContainer}>
						<input
							type="file"
							ref={blogImageInputRef}
							onChange={handleBlogImageUpload}
							accept="image/*"
							style={{ display: 'none' }}
						/>
						<Button
							onClick={() => blogImageInputRef.current?.click()}
							variant='terminal'
						>
							Set Blog Image
						</Button>
						{imageUrl && (
							<div className={styles.blogImagePreview}>
								<img src={imageUrl} alt="Blog header" />
								<button 
									className={styles.removeImage} 
									onClick={() => setImageUrl(undefined)}
									title="Remove image"
								>
									×
								</button>
							</div>
						)}
					</div>
					<Button
						onClick={handleSubmit}
						disabled={isSubmiting}
					>
						{buttonLabel}
					</Button>
				</div>
			</div>
			<div style={{ flexGrow: 1 }}>
				<div className={styles.editorContainer}>
					<div className={styles.toolbar}>
						<button
							className={styles.toolbarButton}
							onClick={() => setIsPreviewMode(!isPreviewMode)}
							title="Toggle Preview"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							{isPreviewMode ? 'Edit' : 'Preview'}
						</button>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleImageUpload}
							accept="image/*"
							style={{ display: 'none' }}
						/>
						<button
							className={styles.toolbarButton}
							onClick={() => fileInputRef.current?.click()}
							title="Upload Image"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
								<circle cx="8.5" cy="8.5" r="1.5" />
								<polyline points="21 15 16 10 5 21" />
							</svg>
							Image
						</button>
					</div>
					<div className={`${styles.editorPane} ${isPreviewMode ? styles.hidden : ''}`}>
						<textarea
							ref={textareaRef}
							value={markdown}
							onChange={(e) => {
								setMarkdown(e.target.value);
							}}
							placeholder="Write your markdown here..."
							className={styles.markdownInput}
						/>
					</div>
					<div className={`${styles.previewPane} ${isPreviewMode ? styles.visible : ''}`}>
						<Markdown content={markdown} />
					</div>
				</div>
			</div>
		</div>
	);
}
