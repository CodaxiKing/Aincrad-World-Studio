# Aincrad World Studio v1.0 — mundos grandes e exportação

Atualização de 29/10/2026. A estrutura circular externa e as referências recebidas estão detalhadas na atualização mais recente `ANDAR_CIRCULAR_AINCRAD.md`; ela substitui os trechos históricos deste documento sobre a ausência da imagem e a extensão externa do mundo. Este documento substitui afirmações antigas de que a exportação Anvil ou o uso de imagens na geração ainda não existem. Não representa homologação no cliente Minecraft.

## Recursos entregues

| Frente | Implementado | Limites e pendências |
|---|---|---|
| Mundos grandes | Geração determinística por chunks 16 × 16; configurações e edições em disco; janela navegável; visão geral clicável | X/Z 64–2048, múltiplos de 16; Y 64–192, múltiplos de 16. Janela 32/64/96. Sem mundo infinito nem renderização de tudo simultaneamente |
| Exportação Minecraft | ZIP com level.dat gzip, regiões Anvil, paletas de estados, heightmaps, spawn e datapack | Alvo 1.21.11/DataVersion 4671. Iluminação delegada ao jogo. Sem jogadores, entidades, inventários ou plugins. Teste no jogo pendente |
| Geração avançada | Cidade circular, muralha com acessos, praça, fonte, ruas, casas com interiores simples, masmorra de salas, cavernas e pontes | Módulos reutilizados; cavernas não têm garantia de rota jogável. Nem toda ponte/escada foi homologada no jogo. Espaço/altura insuficientes produzem erro |
| Aincrad | Composição inspirada em cidade murada, praça e terras suspensas, materiais vanilla e cinco temas | Não é reprodução certificada de Echoes of Aincrad. A imagem original do primeiro andar ainda não foi recebida |
| Imagens e biomas | Heightmap de luminância, máscara colorida de temas, cinco biomas `aincrad:*` em datapack | Imagens vistas de cima. Não reconstrói arquitetura de uma captura em perspectiva. Máscara reduzida a 128 × 128, sem edição individual de parâmetros de clima pelo painel |
| Construções | Seleção explícita por dois cantos, cópia para biblioteca, registro de original como objeto e desagrupamento, com histórico | Até 500 mil posições por seleção. Não seleciona cantos pelo clique 3D ainda. Objetos conhecidos não podem ser sobrepostos por novo registro sem desagrupar |

## Usar mundos grandes

1. Inicie `Iniciar_Aincrad.cmd` e abra `http://127.0.0.1:4173`.
2. No andar desejado, clique em **Mundos grandes e geração avançada**.
3. Defina dimensões, seed, topologia, tema e conteúdo. Para todos os módulos juntos, comece com 512 × 512 × 128. Para labirintos com muitos pisos, aumente Y.
4. Opcionalmente, carregue um heightmap ou máscara. Clique em **Criar mundo e abrir centro**.
5. Edite com os pincéis e construções existentes. As coordenadas do editor são locais à janela; o selo no 3D informa a origem global X/Z.
6. Use **Salvar janela** para gravar as alterações no mundo em disco. Abrir outra janela salva a atual automaticamente. O painel mantém uma revisão e recusa gravações desatualizadas.
7. No diálogo, escolha um mundo existente, a origem X/Z (múltiplos de 16) e o lado da janela. A visão geral ajuda a navegar. Ela mostra o terreno procedural e módulos planejados; alterações manuais aparecem no 3D, não no minimapa.
8. **Exportar mundo .zip** salva a janela vinculada e gera todas as regiões do mundo escolhido. Acompanhe progresso ou cancele. Exportações prontas reaparecem no diálogo após reiniciar o servidor.

O botão **Mundo Minecraft** do editor comum exporta o mapa atualmente aberto. Quando há vínculo com mundo grande, abre seu diálogo para exportar a extensão completa. `.schem` continua disponível e exporta somente o volume da janela/mapa em memória.

Uma janela é uma área finita: uma construção maior que ela precisa ser dividida ou editada em uma janela maior. Objetos e histórico ficam no andar do navegador; ao carregar outra área, os blocos persistem em disco, mas os vínculos dos objetos daquela outra área não são reconstruídos automaticamente. Registre a seleção novamente para mover uma construção inteira.

## Imagens técnicas

PNG/JPEG/WebP de até 10 MiB e 20 megapixels; processamento local. As imagens são reduzidas para 128 × 128. Norte fica no topo; X cresce à direita e Z para baixo. O tamanho da imagem é esticado para a extensão X/Z configurada.

Heightmap: preto reduz a cota, branco aumenta. A luminância se soma ao relevo procedural, com intensidade padrão de 65%; não é uma conversão para cotas absolutas nem recorta automaticamente o contorno da ilha.

Máscara de biomas: verde predominante → bosque; azul → gelo; vermelho → ígneo; cinza → ruínas; demais cores → início. As regras são aproximadas e não segmentação por IA. Os materiais do terreno/vegetação e as paletas de biomas dos chunks seguem essa máscara.

Referências adicionadas na seção **Referências visuais** continuam sendo moodboards do andar. Carregá-las não ativa o heightmap. Uma imagem de paisagem em perspectiva precisa ser interpretada e transformada em planejamento/topografia antes de servir como mapa técnico.

## Exportação e instalação

O ZIP contém uma pasta `Aincrad/`. Extraia essa pasta para `.minecraft/saves` para testar localmente, ou configure uma cópia em Paper compatível. Não substitua um mundo em uso. Fora da extensão criada, a dimensão principal usa um gerador plano vazio; Nether e End mantêm geradores vanilla se forem acessados.

São escritos estados completos dos blocos, seções de -64 a 319, biomas por resolução de quatro blocos, heightmaps e cabeçalhos/setores Anvil. O status dos chunks é `minecraft:features` com `isLightOn=0`: o Minecraft deve executar as etapas de iluminação e finalização ao carregar. O editor não fabrica dados de luz e não implementa o motor de iluminação do jogo. Isso exige conferência em 1.21.11 antes de usar o mundo em produção.

O datapack declara formatos mínimo/máximo `[94,1]`. Inclui cinco definições de bioma, derivadas do esquema vanilla da versão e com cores temáticas. Não implementa monstros ou recompensas de MMORPG. Os spawners dos biomas exportados estão vazios.

## Arquitetura e persistência

- `dist/advanced-generation.js`: planejador global e geração em coordenadas absolutas, sem um array do mundo inteiro.
- `dist/large-world-ui.js`: configuração, imagens, minimapa, navegação, gravação e jobs.
- `dist/regions.js`: seleção explícita e registro/desagrupamento de objetos.
- `lib/local-api.mjs`: API HTTP apenas local, validação de origem/Host, quotas e revisões.
- `lib/export-worker.mjs`: job em worker separado; geração sequencial por região/chunk, sem bloquear a exportação com uma alocação global.
- `lib/world-export.mjs`: NBT tipado, paletas compactadas, Anvil, level.dat, datapack e ZIP por fluxo.
- `.runtime/worlds/<id>/project.json`: configuração e ponteiros das versões de chunks. Cada salvamento escreve um lote novo; o manifesto é substituído depois que todos os chunks foram gravados. Lotes antigos são preservados, sem limpeza automática.
- `.runtime/worlds/<id>/exports/<job>/`: mundo exportado; `<job>.zip` contém a entrega.

O backup `.aincrad` do navegador inclui a janela atual, assets e referências; **não inclui o mundo grande inteiro de `.runtime`**. Para transferir o projeto grande editável, feche o servidor e copie sua pasta em `.runtime/worlds`. Para transferir só o mundo jogável, baixe o ZIP. Preserve IndexedDB/backup para manter histórico e objetos locais. O pacote do código não contém os dados pessoais de `.runtime`.

Uma exportação ocorre de cada vez. O job usa um chunk denso mais a biblioteca de módulos e buffers de compressão. A janela 3D permanece limitada a 2.097.152 posições e 250 mil faces. O tempo depende da área, altura, conteúdo e disco; 2048² é o limite configurável, não uma garantia de FPS ou um benchmark concluído. Exportações repetidas e lotes históricos ocupam espaço; não há coleta automática ou quota total de disco.

## API local

| Rota | Função |
|---|---|
| `GET /api/worlds` | Listar mundos locais |
| `POST /api/worlds` | Criar configuração validada `{config}` |
| `GET /api/worlds/:id` | Configuração e revisão |
| `GET /api/worlds/:id/window?x=&z=&size=` | Carregar janela em coordenadas globais |
| `PUT /api/worlds/:id/window` | Gravar `{x,z,revision,world}`; revisão obrigatória |
| `POST /api/worlds/:id/export` | Iniciar exportação; snapshot opcional do editor comum |
| `GET /api/worlds/:id/jobs/:job` | Progresso/erro |
| `DELETE /api/worlds/:id/jobs/:job` | Cancelar job ativo |
| `GET /api/worlds/:id/jobs/:job/download` | ZIP pronto |
| `GET /api/worlds/:id/exports` | Exportações prontas, inclusive de sessões anteriores |

O servidor continua ligado a `127.0.0.1`. A API recusa Origin diferente e Host fora de loopback, aceita somente JSON nas gravações, limita corpo a 32 MiB e usa identificadores UUID no armazenamento. Não aceita caminhos arbitrários. Não é um serviço autenticado para a internet; não publique essa API nem faça port forwarding. Uso recomendado: uma aba ativa por projeto.

## Evidências de validação

`npm test`: testes do núcleo anterior mais testes de chunks, imagens, biomas, NBT/Anvil e seleção explícita. O teste de integração separado é executado com um servidor isolado na porta 4174:

```powershell
$env:PORT='4174'
node server.mjs
# Em outro terminal:
node tests/local-api.integration.mjs
```

Foi exportado pelo painel um mundo 512 × 512 × 128 com 1024 chunks. O teste de integração exportou 132 chunks em duas regiões, atravessou X=512, salvou um bloco de ouro, reabriu outra janela e verificou sua presença no Anvil exportado. Cabeçalhos, paletas, DataVersion, spawn, CRC do ZIP, proteção de origem e recusa de revisão obsoleta foram conferidos. O navegador confirmou importação de heightmap/máscara, paisagem resultante, persistência do vínculo, seleção e exportação. Esses testes não incluem cliente Minecraft ou Paper reais.

Critérios pendentes antes de produção: abrir em Java 1.21.11 sem erros de codecs, conferir spawn e recalcular luz, caminhar pelas pontes/portas/escadas de cada configuração, revisar cavernas e spawn de criaturas, validar fidelidade após receber a imagem e realizar testes de carga do MMORPG quando ele existir. Não há capacidade de mil jogadores demonstrada nesta versão.

## Referências técnicas

- [Minecraft 1.21.11: datapack 94.1 e mudanças de biomas](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-11).
- [Minecraft 1.21.9: min_format/max_format e versões de packs](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9).
- [Definição vanilla de plains, versão 1.21.11](https://github.com/misode/mcmeta/blob/1.21.11-data/data/minecraft/worldgen/biome/plains.json), copiada em `dist/assets/minecraft/biome-plains.json` como base de esquema.
