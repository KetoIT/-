/** Все картинки/гифки из папки meme (относительно корня проекта) */
const modules = import.meta.glob<string>('../../meme/**/*.{gif,webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const MEME_ASSET_URLS: string[] = Object.values(modules);
