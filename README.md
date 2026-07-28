# AuraFit AI

Crie um web app mobile-first em React + Tailwind chamado “AuraFit AI”.

Conceito:

Um provador virtual premium com inteligência artificial. O app permite que qualquer pessoa teste roupas de qualquer site ou imagem própria em um modelo real, criando uma experiência parecida com styling profissional, editorial de moda e tecnologia de luxo.

O produto não deve parecer um provador genérico de varejo. Deve parecer uma ferramenta premium, moderna e desejável, com estética de marca de moda, próxima de streetwear sofisticado, luxury tech e editorial digital.

Público:

Pessoas que compram roupas online e querem visualizar o caimento antes de comprar.

Também pode atender criadores de conteúdo, vendedores de moda, stylists e donos de loja.

Visual:

- Dark mode premium

- Mobile-first

- Fundo preto profundo

- Cards em cinza grafite

- Detalhes em verde neon ou roxo elétrico

- Tipografia moderna e elegante

- Visual limpo, caro e tecnológico

- Nada infantil, nada colorido demais

- Sensação de app pago/profissional

- Inspiração estética: luxury streetwear, Apple, Arc, Nothing, Farfetch, SSENSE, Prime Culture

Nome do app:

AuraFit AI

Tom de marca:

- Premium

- Direto

- Aspiracional

- Minimalista

- Tecnológico

- Nada apelativo

Telas:

1. Splash Screen

Criar uma abertura impactante com:

- Logo tipográfico “AuraFit AI”

- Frase: “Veja o look antes de comprar.”

- Subfrase: “Teste roupas em modelos reais com inteligência artificial.”

- Botão: “Começar”

- Fundo escuro com glow sutil neon

- Visual editorial premium

2. Onboarding rápido

Criar 3 cards/slides:

- “Teste qualquer peça”

  Texto: “Use imagem de lojas como Zara, Shopee, SHEIN ou qualquer outro site.”

- “Visualize no corpo”

  Texto: “Envie sua foto ou escolha um modelo padrão.”

- “Monte looks melhores”

  Texto: “Compare peças, salve combinações e compre com mais confiança.”

3. Home / Dashboard

Criar uma tela com:

- Saudação premium: “Seu provador inteligente”

- Card principal: “Gerar novo look”

- Mini cards:

  - “Tops”

  - “Bottoms”

  - “Looks salvos”

- Área “Últimos testes”

- Estado vazio elegante quando não houver imagens

4. Provador IA

Tela principal:

- Upload 1: “Foto do modelo”

  Descrição: “Envie uma foto sua ou de um modelo.”

- Upload 2: “Foto da peça”

  Descrição: “Use upload ou cole a URL da roupa.”

- Campo para URL da roupa

- Dropdown de categoria:

  - Top

  - Bottom

- Botão premium grande:

  “Gerar Look IA”

- Texto de apoio:

  “A IA aplica a peça ao corpo mantendo pose, proporção e estilo visual.”

5. Loading

Enquanto gera:

- Skeleton/shimmer premium

- Texto: “Construindo seu look...”

- Subtexto: “Ajustando tecido, proporção e caimento.”

- Animação discreta com glow

6. Resultado

Mostrar:

- Imagem gerada grande

- Botão “Salvar look”

- Botão “Testar outra peça”

- Botão “Comparar”

- Tag da categoria

- Data de criação

- Layout limpo e premium

7. Guarda-Roupa Virtual

Criar uma galeria com abas:

- Todos

- Tops

- Bottoms

- Looks

Cada item deve aparecer em card elegante com imagem, categoria e data.

8. Navegação inferior mobile

Criar bottom navigation com:

- Home

- Provador

- Guarda-Roupa

- Perfil

Estados React necessários:

- currentScreen

- onboardingCompleted

- modelImage

- garmentImage

- modelImageUrl

- garmentImageUrl

- category

- isLoading

- generatedImage

- savedLooks

- errorMessage

Integração API:

Criar uma função async chamada generateTryOnLook.

Endpoint:

https://queue.fal.run/fal-ai/fashn/tryon/v1.6

Método:

POST

Headers:

Authorization: Bearer import.meta.env.VITE_FAL_KEY

Content-Type: application/json

Payload:

{

  "model_image": modelImage,

  "garment_image": garmentImage,

  "category": category

}

A função deve:

- Validar se existe imagem do modelo

- Validar se existe imagem da roupa

- Ativar isLoading

- Limpar errorMessage

- Fazer a requisição

- Receber a resposta

- Extrair a URL da imagem gerada

- Salvar em generatedImage

- Tratar erros com mensagem amigável

- Desativar isLoading

Segurança:

Não deixar a chave de API hardcoded.

Usar variável de ambiente VITE_FAL_KEY.

Adicionar comentário explicando que, em produção, a chamada deve ser feita por backend/API route para proteger a chave.

Design técnico:

- React + Tailwind CSS

- Componentes organizados

- Código limpo

- Mobile-first

- Layout responsivo

- Botões com active state

- Cards com glassmorphism discreto

- Gradientes escuros

- Glow neon sutil

- Bordas arredondadas

- Ícones modernos

- Nenhum layout genérico

Detalhes premium:

- Usar frases curtas e elegantes

- Evitar textos longos

- Interface com cara de app pago

- Criar sensação de produto real, não landing page simples

- Valorizar imagem gerada como peça central

- A experiência deve parecer mais próxima de um stylist digital do que de um provador comum

Resultado esperado:

Um MVP visualmente forte, funcional e pronto para integração real com FASHN AI/Fal.ai.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://digital-wardrobe-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1799764f-dd57-46fd-9a35-3d361f490bf1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
