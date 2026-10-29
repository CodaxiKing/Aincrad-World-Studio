# Aincrad World Studio v1.0

Editor web local de mundos voxel, em português, com 100 andares independentes. A versão atual inclui blocos texturizados Minecraft, objetos movíveis, geração configurável, pincéis e importação de mapas. Inclui também mundos grandes por chunks, exportação de pasta de mundo Minecraft em ZIP, imagens técnicas e biomas de datapack. O MMORPG distribuído permanece planejado. Consulte a atualização em [docs/MUNDOS_GRANDES_E_EXPORTACAO.md](docs/MUNDOS_GRANDES_E_EXPORTACAO.md).

## Executar

Execute `Iniciar_Aincrad.cmd` ou `npm start` na pasta do projeto, com Node.js 22 ou superior. Abra http://127.0.0.1:4173 . Não é necessário executar `npm install`: a biblioteca de renderização e seus recursos estão incluídos. Não abra o HTML por `file://`; módulos, workers e persistência precisam da origem HTTP.

O servidor aceita somente conexões locais. `PORT` permite outra porta; cada origem/porta possui um projeto de navegador separado. Os andares/janelas, histórico, assets e referências são salvos em IndexedDB. Mundos grandes têm configuração e edições em disco em `.runtime/worlds`. Para guardar ou transferir o projeto, use o botão Projeto e baixe o backup `.aincrad`. O backup não contém o histórico geral de desfazer nem a extensão completa dos mundos grandes; copie a pasta correspondente em `.runtime/worlds` para transferir esses projetos editáveis. Use uma aba por origem, pois ainda não há colaboração multiusuário ou trava entre abas.

## Fundo oceânico e pilares proporcionais

A atualização mais recente está em [docs/OCEANO_E_PILARES.md](docs/OCEANO_E_PILARES.md). Ela inclui nível de água automático ou manual, fundo de bedrock/pedra/areia e colunas nas pontas com metade da altura dos pilares da borda.

## Estrutura circular de Aincrad

Todos os novos mundos/exportações incluem por padrão uma muralha circular externa com margem mínima de **1.000 blocos** em relação à área reservada ao terreno, pilares verticais até Y 319 e suportes laterais retos com coluna próxima à ponta e continuação da viga após a coluna. As dimensões X/Z configuram o terreno central; o círculo cresce automaticamente e pode ultrapassar o limite de 2048 da área central. O interior recebe fundo sólido e água até a muralha; os pilares da borda têm 320 blocos e as colunas das pontas têm 160, metade da altura. As edições e coordenadas do terreno não são deslocadas. Os novos suportes têm por padrão 512 blocos de projeção, colunas de 36 de diâmetro e vigas de 32 × 24; essas medidas são ajustáveis no painel.

Em **Mundos grandes e geração avançada**, ajuste muralha/pilares, confira a vista geral 3D e use os atalhos para abrir uma janela no terreno, na muralha ou num pilar. Janelas da estrutura têm até 320 blocos de altura e devem usar lado 32 ou 64. `.schem` exporta só a janela; **Mundo Minecraft** inclui o andar completo. Consulte [docs/ANDAR_CIRCULAR_AINCRAD.md](docs/ANDAR_CIRCULAR_AINCRAD.md).

## Blocos Minecraft

Deepslate 0.27.2 resolve modelos, variantes e estados de blocos. O editor inclui definições, atlas e modelos vanilla Java 1.21.11. Cubos, troncos, escadas, lajes, cercas e outros modelos estáticos usam suas texturas e formas reais. O material completo permanece na exportação Sponge.

O renderer não reproduz todas as funcionalidades do cliente Minecraft. Modelos de block entities, textos de placas, animações, iluminação e transparência de fluidos têm limitações. Especiais desconhecidos usam fallback visível e aparecem no status. O picking continua voxel. Consulte `docs/ATUALIZACAO_MODELOS_E_MUNDOS.md` e a procedência/licenças em `dist/assets/minecraft/PROVENIENCIA.md` e `dist/vendor`.

## Gerar e configurar andares

Cada andar possui nome, tipo, seed, largura X, comprimento Z, altura Y e relevo. Limites: X/Z de 32 a 256, Y de 48 a 192 e até 2.097.152 posições por mapa. O renderer tem limite adicional de 250 mil faces. Em **Mundos grandes e geração avançada**, X/Z chegam a 2048 por chunks, com janela de edição de até 96 × Y × 96 e minimapa navegável; não é renderização simultânea do mundo inteiro.

Escolha ilha flutuante principal, arquipélago de 2 a 7 ilhas ou terreno contínuo sem ilhas. As opções de vila, masmorra, labirinto, arena, ruínas, vegetação e lago são combináveis. A vila é um módulo de quatro casas; a masmorra contém salas conectadas; o labirinto possui 1–4 pisos, grafo conectado e escadas externas. Dimensões insuficientes geram um erro em vez de cortar módulos silenciosamente.

Paisagens temáticas: Planícies do Início, Bosque de Aincrad, Ruínas da Névoa, Cordilheira de Gelo e Planalto Ígneo. No editor comum são presets de materiais, terreno e vegetação. A exportação de mundo inclui definições de biomas `aincrad:*` em datapack. Não são uma reprodução canônica de SAO/Echoes of Aincrad. PNG/JPEG/WebP podem ser anexados como referência visual. O gerador de mundos grandes aceita heightmap e máscara colorida de biomas, carregados separadamente. Reconstrução arquitetônica a partir de imagem em perspectiva continua pendente.

Os módulos são básicos e precisam de revisão artística. Mundos grandes acrescenta cidade circular murada, praça, ruas e interiores simples, cavernas, pontes e até 12 pisos de labirinto. Ainda não existem cidades artesanais completas, puzzles, encontros, NPCs funcionais ou validação de todas as rotas no Minecraft. As imagens originais fornecidas estão no painel. A reconstrução detalhada do terreno do primeiro andar ainda está em desenvolvimento.

## Selecionar e mover construções

Novas colagens e os módulos gerados são objetos com identidade. Clique na construção no 3D ou em Construções no mapa. Arraste para mudar sua posição: a origem fica oculta na prévia e somente a nova posição é mostrada. Soltar confirma uma posição válida; também é possível usar Confirmar movimento. Esc ou Limpar seleção cancela a prévia. Desfazer/refazer restaura voxels e metadados juntos; mover não cria outra cópia.

Para inserir uma nova cópia, selecione um asset na Biblioteca. Isso é uma operação diferente de selecionar um objeto já presente no mapa.

Construções de mapas antigos podem ser identificadas por grupos de materiais conectados. Esse reconhecimento é aproximado: uma casa inteira de pedra natural pode se confundir com terreno, e edifícios conectados podem virar um único grupo. Não há reconhecimento arquitetônico por IA. A opção **Selecionar área / agrupar construção** permite definir dois cantos, copiar a seleção para a biblioteca ou registrar o original para mover; desagrupar mantém os blocos e tem desfazer. Isso permite selecionar explicitamente estruturas de pedra natural. Se os blocos do objeto foram editados depois da colagem ou sobrepostos por objetos posteriores, o movimento pode ser bloqueado para proteger o trabalho existente.

## Colagem e adaptação do terreno

Importe Sponge `.schem` v2/v3 ou escolha os modelos incluídos. Ajuste translação XYZ, rotação Y em 90 graus, espelhamento X/Z, modo com/sem ar e altura. Os pivôs usam o canto mínimo da seleção, não o offset WorldEdit original.

Automática · integrar ao terreno usa os apoios inferiores, uma faixa de transição de 1–16 blocos e até seis passagens. A prévia mostra construção e terreno juntos. Acompanhar altura do solo sugere a cota por mediana; desative para manter Y manual. A prévia sempre parte da revisão original e não deixa aterros ao longo do arrasto. Aplicar confirma construção e entorno como uma operação única de desfazer.

Há também modos sem adaptação, nivelar, escavar, fundação e nivelamento simples com suavização. Terreno, vegetação e estruturas vizinhas têm proteção por heurística de materiais; permitir sobreposição retira essa proteção. Apoios suspensos complexos, pontes e terrenos extremos podem exigir correção manual. Cavernas e espessura das ilhas são considerados no modo automático, mas não há análise arquitetônica completa.

## Pincéis

Abra Pincéis, escolha preset, operação, forma, material e máscara e ative o pincel. Arraste com o botão esquerdo; soltar confirma um traço e Esc cancela o traço ainda em andamento. Alt + arraste orbita; Shift + arraste move a câmera. O botão de seta volta ao modo de câmera.

Operações: elevar, rebaixar, nivelar, suavizar, erosão leve, adicionar, escavar e pintar a superfície. Formas volumétricas: esfera, cubo, cilindro e esfera oca. O preset Construir bloco a bloco usa raio zero e somente ar. Máscaras permitem trabalhar em terreno, vazio, sólidos ou todos os materiais. Pincéis de relevo usam Terreno ou Todos.

Limites: raio 0–12, força/passagens 1–6, até 128 amostras e 200 mil posições por traço, com desfazer/refazer persistente de até 12 operações por andar. Suavização e erosão são operações de superfície, não simulação hidráulica. São ferramentas nativas inspiradas em WorldEdit/VoxelSniper, sem execução de plugins ou importação de scripts de pincéis.

## Copiar de outros mapas

Em Construções, use Copiar de outro mapa. Abra a pasta de um mundo Java descompactado ou arquivos `.mca` da pasta `region`. Escolha dimensão, região, chunk e os dois cantos inclusivos X/Y/Z. Visualize a seleção e copie para a biblioteca; depois posicione no seu andar. A leitura não modifica o original. Fontes precisam ser selecionadas novamente em outra sessão; estruturas copiadas ficam no projeto e no backup.

Aceitos chunks modernos de Java 1.18 a 1.21.11, gzip/zlib/raw; sem migração de DataVersion, LZ4, `.mcc`, Bedrock ou ZIP direto. Descompacte ZIP primeiro. Limites: região de 256 MiB, chunk expandido de 8 MiB, 256 chunks e 2.097.152 posições por recorte, Y entre -64 e 319. A seleção precisa caber no andar de destino.

Mobs, biomas e iluminação não são copiados. Block entities na seleção bloqueiam a cópia por padrão; a opção explícita de copiar apenas blocos permite ignorar inventários, textos e dados equivalentes, com relatório de perdas. A importação direta `.schem` continua recusando block entities, entidades, biomas, materiais de mods e blocos de execução. Quotas `.schem`: 16 MiB de arquivo, 64 MiB expandidos, eixo até 512 e 2.097.152 posições.

## Exportação e estado do MMORPG

Exportar .schem baixa Sponge v3 gzip, DataVersion 4671. Não é uma pasta de mundo: não inclui `level.dat`, regiões Anvil, biomas, plugins, jogadores ou progressão. Carregue em WorldEdit compatível num mundo de teste. O botão **Mundo Minecraft** agora exporta ZIP com `level.dat`, regiões `.mca`, paletas de biomas e datapack. Para mundos grandes, salva a janela e exporta a área completa. A iluminação é delegada ao jogo; a homologação em cliente/Paper 1.21.11 ainda está pendente.

Velocity/Paper, PostgreSQL/Redis, contas, personagens, chefes, primeiro grupo vencedor, desbloqueio global, replay e capacidade de mais de mil jogadores continuam planejados. O SQL em docs é uma proposta não integrada. Não existem estatísticas online ou vitórias fictícias apresentadas como reais.

## Testes e arquivos

Execute `npm test`. Há 70 testes automatizados de núcleo, mapas, pincéis, modelos, objetos, geração e exportação, além de um teste de integração HTTP executado separadamente. A validação de navegador incluiu renderização local dos assets, colagem e histórico, movimento sem duplicação, projeto persistido e geração retangular com múltiplos conteúdos. Ainda é necessária homologação de mapas reais e execução no Minecraft.

- `dist`: app estático e recursos incluídos.
- `server.mjs` e `lib`: servidor/API local, worker de exportação, NBT, Anvil e ZIP, sem instalação de dependências.
- `tests`: testes e fixture Anvil sintética, sem mapas pessoais.
- `docs/OCEANO_E_PILARES.md`: atualização atual, água, fundo e pilares em duas alturas.
- `docs/ANDAR_CIRCULAR_AINCRAD.md`: atualização mais recente, margem de 1000, estrutura externa e referências recebidas.
- `docs/MUNDOS_GRANDES_E_EXPORTACAO.md`: estado atual, uso, arquitetura, API, limitações e validação.
- `docs/ATUALIZACAO_MODELOS_E_MUNDOS.md`: histórico da etapa anterior.
- Demais documentos em docs registram as etapas anteriores e podem conter limites antigos, substituídos pelo README e pela atualização atual.


## Mapas e construções por imagem

O botão **Criar mapa / construção por imagem**, nas abas Andar e Construções, aceita PNG, JPEG e WebP locais (10 MB, 20 milhões de pixels). A classificação é reduzida para até 1024 pixels por eixo e pode ser corrigida com pincel, seleção de cor semelhante e desfazer.

- **Planta / mapa superior:** contorno, ruas, água, floresta e plantas de prédios classificados. A geração produz volumes com paredes, janelas, portas e cobertura por regras; não interpreta automaticamente todos os detalhes arquitetônicos. Remova textos, legendas e molduras pintando como vazio.
- **Perspectiva:** fachada 2,5D em blocos coloridos, com profundidade configurável e fundo removível pela máscara. Não reconstrói cidade tridimensional, lados ocultos ou interiores a partir de uma única imagem.
- Prévia 3D, download Sponge v3 e inclusão na biblioteca para posicionar com as ferramentas existentes. Limite de cada peça: 2.097.152 posições; a prévia também obedece ao limite de faces do renderizador.
- **Usar traçado no mapa central:** aplica a planta à geração por chunks, com dimensões X/Z independentes de 64 a 8192, em múltiplos de 16, incluindo 4048. A opção de proporção mantém o aspecto da imagem com arredondamento para chunks. A muralha cresce com o terreno e mantém a margem mínima de 1000 blocos. O oceano e seu fundo terminam no interior da muralha; fora dela há void, atravessado somente pelos suportes estruturais.
- **Cidade em peças .schem**, dentro de Mundos grandes: ZIP com peças de até 128 × 128, deslocamentos em manifest.json e Offset Sponge relativo à mesma origem. Não inclui relevo, muralha ou oceano. A exportação de mundo continua disponível para o andar completo.

O campo Offset segue a [especificação Sponge v3](https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md). Homologação prática no WorldEdit e Minecraft 1.21.11 permanece pendente. O limite 8192 é de configuração e geração por chunks, não uma garantia de desempenho de exportação integral; exportações extensas consomem tempo e disco e o ZIP atual tem limite de 4 GiB. Não há IA de reconstrução fotogramétrica implementada. Os sistemas MMORPG continuam planejados.

Validação desta entrega: 75 testes automatizados, incluindo continuidade das peças, escala 4048/8192, classificação, orientação da fachada e leitura das peças Sponge exportadas. Teste de interface local com planta sintética, prévia 3D e troca para perspectiva.
