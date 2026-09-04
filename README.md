# AuraFit AI

Provador virtual mobile-first que usa inteligência artificial para aplicar peças de roupa em fotos e organizar looks em um guarda-roupa digital.

🔗 **Demo:** https://digital-wardrobe-ai.lovable.app

## Sobre o projeto

O AuraFit nasceu como um experimento de produto na interseção entre moda, IA e experiência mobile. A proposta é permitir que uma pessoa envie sua foto e a imagem de uma peça, gere uma visualização de virtual try-on e mantenha os resultados organizados para comparação.

O projeto também explora uma futura versão B2B para lojas físicas e e-commerces.

## Principais recursos

- Experiência mobile-first
- Upload de modelo e peça de roupa
- Fluxo de geração de virtual try-on
- Integração preparada com Fal.ai/FASHN
- Autenticação e persistência com Supabase
- Guarda-roupa e histórico de looks
- Interface responsiva com foco em experiência premium
- Estrutura preparada para expansão de categorias e uso comercial

## Stack

- React 19
- TypeScript
- TanStack Start / Router / Query
- Vite
- Tailwind CSS
- Supabase
- Zod
- React Hook Form
- Recharts
- QRCode

## Arquitetura e segurança

As credenciais privadas não ficam versionadas. O projeto usa variáveis de ambiente e inclui apenas um `.env.example` com os nomes necessários para configuração local.

Chamadas que dependem de chaves sensíveis são tratadas no lado servidor sempre que necessário, evitando expor segredos no cliente.

## Rodando localmente

```bash
git clone <url-do-repositorio>
cd digital-wardrobe-ai
npm install
cp .env.example .env
npm run dev
```

Preencha as variáveis necessárias no `.env` antes de usar integrações externas.

## Status

🚧 **Em desenvolvimento.** O produto já possui uma base funcional e continua evoluindo em experiência, integrações de IA e arquitetura para uso B2C/B2B.

## Objetivos técnicos do projeto

Este projeto é usado para aprofundar conhecimentos em desenvolvimento web moderno, integração com APIs de IA, autenticação, persistência de dados, UX mobile-first e arquitetura de produto.
