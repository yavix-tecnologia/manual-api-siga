import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Obrigatório a partir do Starlight 0.32: sem esta declaração as páginas
// carregam sem os metadados do tema e o build quebra na rota 404, com um erro
// que não menciona este arquivo ("Cannot read properties of undefined").
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
