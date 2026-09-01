// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

/**
 * Manual de integração do SIGA.
 *
 * Starlight, e não Jekyll: o repositório é publicado no Netlify, que roda
 * qualquer build — a limitação do GitHub Pages (Jekyll + remote_theme) deixou de
 * existir. O que se ganha e o material usa: abas de linguagem como componente,
 * busca offline (Pagefind), modo escuro, e a página de referência da API em
 * tela cheia fora do layout de documentação.
 *
 * Sem `base`: o site mora na raiz do domínio do Netlify. O `baseurl` da versão
 * anterior era o do GitHub Pages de projeto, e foi o que quebrou todo o CSS lá.
 */
export default defineConfig({
  site: 'https://manual-siga-api.netlify.app',
  integrations: [
    starlight({
      title: 'Manual de Integração — SIGA',
      description:
        'Integre seu sistema ao SIGA: onboarding de colaborador e agendamento de exame ocupacional, do primeiro curl à guia em PDF.',
      defaultLocale: 'root',
      locales: { root: { label: 'Português (Brasil)', lang: 'pt-BR' } },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/yavix-tecnologia/manual-api-siga',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/yavix-tecnologia/manual-api-siga/edit/main/',
      },
      customCss: ['./src/styles/custom.css'],
      lastUpdated: true,
      components: {
        // Rodapé com o contato de suporte em todas as páginas.
        Footer: './src/components/Footer.astro',
      },
      sidebar: [
        { label: 'Início', link: '/' },
        {
          label: 'Comece aqui',
          items: [
            { label: 'Autenticação', link: '/autenticacao/' },
            { label: 'Tutorial de 10 minutos', link: '/tutorial/' },
          ],
        },
        {
          label: 'Referência',
          items: [
            { label: 'Erros', link: '/erros/' },
            { label: 'Todos os endpoints', link: '/api/', attrs: { target: '_blank' } },
          ],
        },
      ],
    }),
  ],
});
