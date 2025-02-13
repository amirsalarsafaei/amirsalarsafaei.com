
import { Metadata } from 'next';
import { GetBlogRequest } from "@generated/blogs/blogs";
import { createGrpcClients } from '@/clients/grpc';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const {blogs_client} = createGrpcClients();

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amirsalarsafaei.com';
    const logoUrl = `${siteUrl}/logo.png`;

    return {
      title: data.blog.title,
      description: description,
      metadataBase: new URL(siteUrl),
      openGraph: {
        title: data.blog.title,
        description: description,
        type: 'article',
        publishedTime: data.blog.createdAt?.toISOString(),
        tags: data.blog.tags.map((t) => t.name),
        images: data.blog.imageUrl ? [
          {
            url: data.blog.imageUrl,
            width: 1200,
            height: 630,
            alt: data.blog.title,
          }
        ] : [],
        siteName: 'Amirsalar Safaei',
        url: `${siteUrl}/blogs/${params.id}`,
        locale: 'en_US',
      },
      other: {
        'telegram-channel': '@amirsalarsafaei',
        'telegram:card': 'summary_large_image',
        'telegram:image': data.blog.imageUrl ?? '',
        'telegram:title': data.blog.title,
        'telegram:description': description,
        'telegram:site': '@amirsalarsafaei',
      },
      twitter: {
        card: 'summary_large_image',
        title: data.blog.title,
        description: description,
        images: data.blog.imageUrl ? [data.blog.imageUrl] : [],
      },
      alternates: {
        canonical: `${siteUrl}/blogs/${params.id}`,
      },
      icons: {
        icon: logoUrl,
        apple: logoUrl,
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
