import bundled from '../data/articles.json';
export type Article = {
  slug: string;
  title: string;
  category: string;
  body: string;
  source: string;
  stats: Record<string, string>;
  translations?: { zh?: { title: string; body: string; stats: Record<string, string> } };
};
const api = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE;
export async function getArticles(): Promise<Article[]> {
  if (!api) return bundled as Article[];
  const response = await fetch(`${api.replace(/\/$/, '')}/articles/`);
  if (!response.ok) throw new Error('The archive could not be loaded. Check that the Django server is available.');
  return response.json();
}
export const sourceMode = api ? 'Connected archive' : 'Archive edition';
