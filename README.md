# AuraFit AI

Provador virtual mobile-first que combina **inteligência artificial, moda e experiência de produto** para permitir que usuários visualizem peças em fotos, organizem resultados e construam um guarda-roupa digital.

**Demo:** https://digital-wardrobe-ai.lovable.app

## Visão geral

O AuraFit AI explora uma experiência de virtual try-on voltada tanto ao consumidor final quanto, futuramente, a lojas e operações de moda. O fluxo principal permite trabalhar com uma foto de modelo, uma peça de roupa e uma categoria para gerar e organizar experimentações visuais.

Além da interface do consumidor, a arquitetura foi preparada para evoluir para cenários B2B, como catálogo de loja, QR Code no ponto de venda e gestão de experimentações.

## Funcionalidades

- interface mobile-first e responsiva;
- upload e tratamento de imagens de modelo e vestuário;
- fluxo de geração de virtual try-on;
- integração preparada com **Fal.ai / FASHN**;
- autenticação e persistência com **Supabase**;
- guarda-roupa digital e histórico de looks;
- fluxo público de experimentação por token;
- estrutura de Studio para uso comercial;
- validação de formulários e estados de erro;
- arquitetura preparada para expansão de categorias e uso B2C/B2B.

## Stack

- React 19
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Vite
- Tailwind CSS
- Supabase
- Zod
- React Hook Form
- Recharts
- QRCode

## Arquitetura e segurança

O projeto separa interface, integrações e operações que exigem execução no servidor. Credenciais privadas não são versionadas no repositório: a configuração local é feita por variáveis de ambiente, com um `.env.example` contendo apenas os nomes esperados.

Chamadas que dependem de chaves sensíveis são mantidas no lado servidor sempre que necessário, evitando exposição direta no cliente.

## Executando localmente

```bash
git clone https://github.com/angelogabrielribeiro/digital-wardrobe-ai.git
cd digital-wardrobe-ai
npm install
cp .env.example .env
npm run dev
```

Preencha no `.env` apenas as variáveis necessárias para as integrações que deseja utilizar.

## Status

**Em desenvolvimento ativo.** A aplicação possui uma base funcional publicada e continua evoluindo em experiência de virtual try-on, integrações de IA e arquitetura para uso comercial.

## Objetivos técnicos

Este projeto é utilizado para aprofundar conhecimentos em desenvolvimento web moderno, integração com APIs de IA, autenticação, persistência de dados, segurança de credenciais, UX mobile-first e arquitetura de produto.

---

Desenvolvido por **Angelo Gabriel Ribeiro Santos**.