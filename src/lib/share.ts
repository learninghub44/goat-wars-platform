export const debateUrl = (siteUrl: string, slug: string) => `${siteUrl}/#${slug}`;

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareOrCopy(opts: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share(opts);
      return 'shared';
    }
    await navigator.clipboard.writeText(`${opts.text} ${opts.url}`);
    return 'copied';
  } catch (e) {
    return (e as Error)?.name === 'AbortError' ? 'shared' : 'failed';
  }
}
