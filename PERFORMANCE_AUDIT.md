# Auditoria e refatoração de performance — Spozzer

**Escopo:** otimizar carregamento, memória e execução no navegador, preservando a identidade visual, a geometria mobile e a lógica/timing das timelines existentes. A única modificação visual intencional é unir o aviso de cookies ao fundo claro do rodapé.

**Método:** inspeção integral dos arquivos relevantes, comparação com o ZIP original, verificação das mídias (`ffprobe`/`ffmpeg`), checagem sintática de JavaScript e testes unitários de gestos, inicialização e referências aos assets. **Não é uma medição de FPS ou Core Web Vitals:** a instalação das dependências e o build de produção ficaram indisponíveis neste ambiente por ausência de acesso ao registro npm. O resultado precisa de teste visual e perfilamento reais no aparelho de destino.

## Diagnóstico e intervenções

### 1. Vídeo do Hero continuava rodando fora da tela

**Origem:** `src/scripts/introExperience.js`, `initHeroVideoPlayback()`. O `IntersectionObserver` existente chamava `attemptPlay()` quando o vídeo entrava na viewport, mas não executava a ação inversa quando saía dela. O `pointerdown` global e o retorno da aba também podiam acionar novamente a reprodução. Ao avançar até o Processo, o navegador podia decodificar o Hero e o vídeo do Processo ao mesmo tempo.

**Correção:** o vídeo é pausado ao ficar fora da viewport ou quando a aba está oculta e pode retomar a reprodução ao retornar à área visível. Não alterei os parâmetros, estágios ou duração das animações; somente o ciclo de vida da mídia.

### 2. Fotografia desproporcional no portfólio

**Origem:** `public/assets/imgs/portfolio/paula.webp` tinha **4000 × 6000 px (24 MP, 2.555.432 bytes)**, enquanto a maioria das outras fotos do portfólio tinha 1600 × 2400 px.

**Correção:** mantida a mesma fotografia e proporção, convertida para **1600 × 2400 px (3,84 MP, 363.718 bytes)** com WebP qualidade 90 e filtro Lanczos. Comparada à imagem original redimensionada à mesma resolução, a versão gerada apresentou PSNR aproximado de **42,19 dB**. A memória teórica de um bitmap RGBA decodificado cai de ~96 MB para ~15,4 MB. A redução do arquivo individual foi de ~85,8%. A nova codificação não é pixel a pixel idêntica, portanto a revisão visual da foto continua recomendada.

### 3. Pico de inicialização de experiências não críticas

**Origem:** `src/scripts/pageAnimations.js` importava `testimonials`, `service`, `process` e `contact` em um único `Promise.all` e em seguida executava os quatro inicializadores consecutivamente. Isso pode concentrar parsing, setup de observers, medições e criação de ScrollTriggers perto do primeiro contato com o site.

**Correção:** cada módulo é carregado/inicializado em uma tarefa de idle independente. Um `IntersectionObserver` com margem antecipada prioriza imediatamente uma seção que estiver próxima, inclusive no salto pela âncora do formulário. O Hero e seu GSAP continuam sendo inicializados primeiro e de forma síncrona. Nenhuma função de timeline das seções foi reescrita.

### 4. Renderizações redundantes durante o arrasto

**Origem:** `src/lib/interactions/horizontalDrag.js` propagava todos os eventos `pointermove`; a seção de depoimentos recalculava os estilos 3D de todos os cartões para cada evento, inclusive quando vários eventos chegavam antes do mesmo frame.

**Correção:** agrupamento via `requestAnimationFrame`: a última posição de cada frame é aplicada uma vez, e o último movimento pendente é obrigatoriamente aplicado antes do `pointerup` para preservar a posição de destino. Gestos verticais não são capturados. Em `src/scripts/testimonials.js`, alterações redundantes de `aria-hidden`, `pointer-events` e `disabled` foram condicionadas ao valor efetivamente mudar. Easing, fórmulas 3D, timings e timeline do slider foram mantidos.

### 5. Atualizações redundantes com a barra do navegador mobile

**Origem:** `initStableIntroViewport()` escrevia a variável `--intro-viewport-extension` sempre que chegavam eventos de resize, mesmo que o número de pixels calculado fosse igual.

**Correção:** cache da última extensão aplicada. A geometria, a captura inicial, a atualização no `requestAnimationFrame` e os critérios para distinguir mudanças de largura/altura permanecem os mesmos. Apenas evitamos invalidar estilos sem mudança real.

### 6. Mídias publicadas mas não utilizadas

O diretório `public/` é copiado integralmente para a publicação. Foram removidas **nove mídias não consumidas pelo site**: seis JPG originais de depoimentos, duas JPG alternativas do About e um WebM mobile que estava declarado nos dados, mas não era a fonte usada pelo vídeo do Hero. Os WebP efetivamente renderizados e o MP4 mobile selecionado permanecem intactos. A declaração não utilizada em `heroData.js` também foi removida.

O vídeo `process.webm` possuía áudio Opus apesar de sempre ser reproduzido com `muted`. Removi somente essa faixa por *remux*, sem recodificar o vídeo. O hash SHA-256 da sequência de vídeo é idêntico antes/depois:

`dac7849434d7463b841ed42f7431b9ae5c89df453dba5c84d86467e6bd83c9ed`

O arquivo passou de **7.504.825** para **6.788.589 bytes**. O vídeo do Processo também agora é pausado com a aba oculta, preservando a retomada ao retornar.

### 7. Bloqueio de boot aplicado incorretamente à página de agradecimento

**Origem:** o script `BOOT GUARD` era incluído pelo `BaseLayout` nas duas páginas. A página `/obrigado` não executa `initPageAnimations()` para limpar essa proteção, deixando o bloqueio de scroll ativo até o fallback de 3,5 segundos.

**Correção:** `introGuard` passa a ser habilitado somente em `index.astro`; a página `/obrigado` carrega sem esse bloqueio. O comportamento de proteção visual do Hero continua igual.

### 8. Limpeza de recursos e rodapé

`initSessionTracking()` agora fornece `cleanup()` para desconectar o observer e remover listeners caso a página seja reinicializada; os beacons normais de `visibilitychange` e `pagehide` permanecem com a mesma lógica.

O aviso de cookies está dentro de um `<footer>` em largura total com `background: var(--color-light)`, exatamente a cor no final da seção `Contact`; o próprio parágrafo tem fundo transparente. O texto menciona cookies e preferências do navegador sem afirmar que continuar navegando equivale a consentir.

## Verificações de integridade

- Os **seis arquivos `src/sections/*.astro`** são idênticos aos do ZIP original.
- O trecho completo da timeline/contexto GSAP da **Intro** é idêntico ao original.
- As declarações de matchMedia/timelines GSAP do **Processo** são idênticas ao original.
- A função de tween `animateTo()` dos **Depoimentos** é idêntica ao original.
- A sequência codificada de vídeo de `process.webm` é idêntica antes/depois (streamhash SHA-256).
- Foram adicionados **oito testes Node.js**, todos aprovados, abrangendo coalescência de arrasto, último movimento, scroll vertical, limpeza, assets referenciados, rodapé, guard da página de agradecimento e orquestração das inicializações.

### Inventário de assets

| Medida | Original | Refatorado |
|---|---:|---:|
| Quantidade de arquivos em `public/assets` | 30 | 21 |
| Soma dos tamanhos dos assets | 42.736.690 bytes | 26.894.978 bytes |
| Redução | — | **15.841.712 bytes (37,1%)** |

Essa redução se refere aos **arquivos publicados**, não necessariamente aos bytes transferidos no primeiro acesso: parte dos arquivos já tinha `preload=none` ou `loading=lazy`.

## Fora do escopo por solicitação

- **GSAP/ScrollTrigger**: não alterados blur, máscaras, transforms, pin, scrub, distâncias, velocidades, stagger nem transições entre layers. Esses efeitos ainda podem exigir GPU significativa em dispositivos fracos; removê-los ou simplificá-los mudaria a experiência visual.
- **Google Tag Manager e tags de terceiros**: mantidos; alterar seu momento de execução pode afetar métricas e atribuição. O custo real deles depende das tags ativas, extensões e rede e requer perfilamento independente.
- **Consentimento:** a alteração do texto/estilo do rodapé não implementa um gerenciador de consentimento nem modifica as tags de terceiros. Se houver exigência de controle granular de cookies, é uma tarefa separada de conformidade.

## Como validar localmente

```bash
npm ci
npm run test:performance
npm run build
npm run preview
```

Depois, comparar versão anterior e refatorada em uma **build de produção**, com cache/rede equivalentes: gravar Chrome DevTools Performance durante o carregamento, arrasto dos depoimentos, scroll rápido do Hero ao About/Processo, e monitorar em Performance Monitor a atividade das threads e memória. Testar iPhone Safari com barras de endereço visíveis/ocultas, rotação de tela e salto direto para `#contato`, verificando a reprodução/pausa dos vídeos e ausência de deslocamento. Registrar mediana de pelo menos três execuções por cenário; Lighthouse isoladamente não captura toda a fluidez de GSAP e decodificação de vídeo.

**Limitação do ambiente desta auditoria:** o ZIP original não incluía `node_modules`. `npm ci --offline` encontrou um pacote ausente do cache (`zwitch`), e o registro npm não estava acessível via DNS. Por isso não houve `astro build`, Lighthouse, teste E2E no Safari nem medição comparativa de frame times. Os testes de unidade/sintaxe e as verificações dos arquivos passaram, mas o teste final em produção é essencial.
