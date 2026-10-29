# Modelos Minecraft e configuração de mundos

Atualização de 29 de outubro de 2026. Esta descrição é o estado atual e substitui os limites antigos de tamanho, modelos por cubos e geração exclusiva por tipo encontrados nos documentos iniciais.

## Renderização com biblioteca Minecraft

Integração local de Deepslate 0.27.2, biblioteca MIT de Misode. Dados vanilla fixados em Java 1.21.11: definições de blockstates, modelos, valores padrão e atlas de texturas. A biblioteca resolve herança de modelos, variantes, multipart e transformações. O Studio converte as malhas para seus buffers WebGL, mantém UVs, tintas e estados e aplica oclusão de faces em cubos sólidos. Escadas, lajes e cercas usam suas geometrias reais, não um cubo genérico. O atlas usa filtragem pixelada com mipmaps e recorte alfa; não é o pipeline de iluminação ou transparência completo do jogo.

Os arquivos ficam em `dist/vendor` e `dist/assets/minecraft`; não é necessário baixar recursos pela rede ao executar o Studio. A licença da biblioteca e a procedência dos assets acompanham a distribuição. Recursos gráficos Minecraft pertencem aos seus respectivos titulares. O teste utiliza dados extraídos da versão alvo, não texturas desenhadas por IA.

Limites: modelos de entidades e block entities, texto de placas, animações e efeitos de fluidos exigem trabalho adicional. Modelos especiais ou desconhecidos podem usar um marcador aproximado e são listados no status do renderer. O picking permanece voxel, embora a geometria visual de lajes e cercas seja parcial. Não se declara reprodução perfeita do cliente Minecraft nem homologação de todos os estados.

## Objetos e movimento

O mundo contém `placements`: ID, nome, snapshot do asset, transformação, delta de colagem e índices de blocos sólidos. Novas colagens e módulos do gerador registram objetos automaticamente. Clique em uma construção no 3D ou na lista de objetos para selecioná-la. A prévia restaura o que havia na posição anterior e apresenta somente a nova posição. Soltar o mouse em posição válida confirma o movimento; colisões bloqueantes mantêm a prévia para correção. Também existe o botão Confirmar movimento. Esc ou cancelar restaura a visualização original.

Mover usa uma transação composta: restauração da origem e colocação no destino. O ID é preservado; o objeto não é duplicado. Desfazer/refazer modifica voxels e metadados juntos. Os registros são persistidos no IndexedDB e incluídos no backup de projeto. A exportação Sponge contém os blocos, não os objetos do editor.

Modificações posteriores em blocos pertencentes ao objeto bloqueiam sua retirada automática, evitando apagar trabalho manual. Sobreposição de um objeto mais recente exige movê-lo primeiro. Alterações independentes no terreno são preservadas quando não podem ser restauradas com segurança. Esse controle usa deltas e ordem de edição; não é um scene graph completo com objetos sobrepostos editáveis de modo independente.

Mapas antigos sem registro podem ter grupos detectados por conectividade de materiais não naturais. A seleção é aproximada e identificada como tal. Casas inteiramente de pedra natural podem se confundir com terreno, e grupos conectados podem reunir várias construções. Não há reconhecimento arquitetônico universal ou IA de segmentação de edifícios.

## Configuração de geração

Cada andar guarda largura X, comprimento Z, altura Y, seed, relevo, topologia, paisagem e conteúdo. X/Z aceitam inteiros entre 32 e 256; Y entre 48 e 192; o produto é limitado a 2.097.152 posições por mapa, além do limite de malha de 250 mil faces. Não é suporte a mundos ilimitados: geração em streaming de mapas grandes continua pendente.

Topologias: terreno contínuo sem ilhas flutuantes, ilha principal e arquipélago de 2 a 7 ilhas. A ilha tem volume inferior e bordas de ar; o terreno contínuo cobre a área do mapa até a base. Presets visuais: Planícies do Início, Bosque de Aincrad, Ruínas da Névoa, Cordilheira de Gelo e Planalto Ígneo. Eles mudam materiais, relevo e vegetação; são inspirações artísticas, não uma lista de locais canônicos de SAO.

São combináveis vila modular com quatro casas, masmorra de salas, labirinto vertical, arena, torre em ruínas, vegetação e pequeno lago. Os módulos viram objetos movíveis. O labirinto tem grafo conectado por piso e escadas externas para ligar os níveis, de 1 a 4 pisos. Dimensões insuficientes provocam erro; não se corta silenciosamente a estrutura. Combinações podem exigir X/Z maiores que 64 e cinco módulos exigem pelo menos 112 por eixo horizontal.

Esses módulos são conteúdo procedural básico. Cidades artísticas completas, interiores semânticos avançados, puzzles, combate de boss e solver completo do movimento do jogador no Minecraft ainda não estão entregues. Os pisos e as escadas precisam de homologação no jogo.

Os presets não criam biomas de datapack nem os escrevem no arquivo Sponge, cuja exportação continua sendo apenas de blocos. Importar PNG/JPEG/WebP e revisar referências já funciona; imagem não condiciona automaticamente o terreno, ruas ou geometria. Reconstrução de mapas a partir de imagem continua não implementada.

## Validação

15 testes adicionados para modelos, UV, rotação, lajes, oclusão, fallback, identidade de objetos, restauração da origem, undo/redo de movimento, conflitos posteriores, detecção de grupos antigos, persistência por snapshots, dimensões retangulares, temas, topologias, módulos combinados, grafo do labirinto e quotas. Total da suíte com os testes anteriores: 54.

No navegador: carregamento local dos recursos 1.21.11 sem erros de JavaScript; seleção de casa antiga por grupo conectado com ocultação da origem; colisão detectada no destino; em origem local isolada, geração de mapa X96 Y96 Z80 com tema de gelo, terreno contínuo, vila, masmorra e labirinto de dois pisos. Três objetos foram listados. Arrastar a vila e soltar confirmou o movimento sem aumentar a contagem de objetos ou blocos. Desfazer restaurou X15/Z11. O projeto foi recarregado com conteúdo e configurações persistidos. Não houve execução de Minecraft/Paper nesta validação.

Fontes:

- Deepslate e licença: https://github.com/misode/deepslate
- Recursos e metadados por versão: https://github.com/misode/mcmeta
- Assets 1.21.11: branches `1.21.11-summary` e `1.21.11-atlas` desse repositório.
