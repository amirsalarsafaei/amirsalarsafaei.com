
import { Metadata } from 'next';
import { blogs_client } from "@/clients/grpc";
import { GetBlogRequest } from "@generated/blogs/blogs";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const req = GetBlogRequest.create({ id: params.id });
    const data = await blogs_client.GetBlog(req);
    
    if (!data?.blog) {
      return {
        title: 'Blog Not Found',
        description: 'The requested blog post could not be found.',
      };
    }

    const firstParagraph = data.blog.content.split('\n')[0] || '';
    const description = firstParagraph.slice(0, 160) + (firstParagraph.length > 160 ? '...' : '');

    return {
      title: data.blog.title,
      description: description,
      openGraph: {
        title: data.blog.title,
        description: description,
        type: 'article',
        publishedTime: data.blog.createdAt?.toISOString(),
        tags: data.blog.tags,
      },
      twitter: {
        card: 'summary_large_image',
        title: data.blog.title,
        description: description,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Blog',
      description: 'Read our latest blog posts',
    };
  }
}
