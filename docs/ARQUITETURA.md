# Aincrad World Studio v1.0

## Estado da entrega

MVP do editor web implementado em módulos JavaScript, sem dependências de instalação. Interface WebGL e persistência IndexedDB. O servidor Node serve somente arquivos; não é uma API de produção. Nenhuma rede Minecraft, conta de usuário, PostgreSQL ou Redis está conectada. Código planejado é identificado separadamente.

## Fluxo implementado

Configurar um dos 100 registros → gerar volume → importar referência ou construção → prévia de colagem → calcular delta conjunto de terreno e estrutura → autorizar sobreposição se necessária → aplicar → persistir → exportar Sponge v3 gzip.

O volume usa Uint16Array e uma paleta canônica com ar no índice zero. A ordem é X + Z × largura + Y × largura × comprimento. Malhas contêm somente faces expostas. A visualização usa cubos inclusive para escadas e cercas, mas o estado completo acompanha o arquivo exportado.

Importação NBT ocorre em Web Worker terminável após 15 segundos. Limites: 16 MiB de arquivo, 64 MiB expandidos, profundidade 32, um milhão de tags, 2.097.152 posições e eixo máximo de 512. O limite de 250 mil faces restringe a prévia. Materiais de mods, command blocks, jigsaw, structure blocks, entidades, block entities e biomas são recusados. Sem conversão automática de DataVersion: versões futuras são recusadas; arquivos antigos precisam de homologação externa.

Transformações discretas: translação inteira e rotações Y de 90 graus após espelhamento X/Z. O pivô é o canto mínimo da seleção já normalizada, explicitamente diferente do offset original do WorldEdit. O relatório mantém o offset como referência. Há transformação de facing, axis, rotation, conexões cardinais, dobradiças, lados de baús, escadas e trilhos. Não se declara cobertura de todo estado especial do Minecraft; homologar fixtures reais antes de produção.

Terreno: nivelar até Y escolhido, escavar o volume, fundação com limite de 24 blocos e nivelar com faixa externa de suavização de quatro blocos. A máscara inicial é retangular, não extrai apoios semânticos. Ilhas não ganham pilares até o fundo do mundo. Sem regiões protegidas configuráveis nesta etapa. Colisão identifica material existente diferente de pedra, terra e grama; é uma heurística, não rastreamento semântico de estruturas. Alterações no entorno também são verificadas.

Operações guardam os estados anterior e posterior por posição. Gerações guardam snapshots; até 12 operações e uma sequência de refazer por andar. Uma nova operação limpa o refazer. Transações IndexedDB fazem a gravação de um registro atômica; configurações e mapa usam registros separados. Não há recuperação transacional distribuída, armazenamento compartilhado nem edição multiusuário. Trabalhar em uma aba por origem.

## Contratos futuros

API `/api/v1`: projetos e andares, upload com quotas, jobs assíncronos, revisões imutáveis, previews com hash e expiração, aplicação com If-Match, histórico, exportação e publicação. Serviço interno de bosses autentica a instância Paper, valida a tentativa e grava primeira vitória, desbloqueio e outbox na mesma transação. Replay gera recompensas com chave única. Nenhum evento vindo do navegador concede uma vitória.

PostgreSQL é autoridade de configurações, conquistas, inventários e ledger. Redis coordena presença, cache e invalidação. S3 armazena originais, chunks, deltas e exportações. Java/WorldEdit homologado deve substituir o parser limitado e compilar a pasta de mundo em servidor construtor isolado 1.21.11. A publicação deve drenar mundos ativos e manter rollback.

Velocity roteia para canais Paper ou arenas; não divide uma batalha pelo tick de vários processos. Alvo de 1.200 sessões é planejado e exige benchmark com bots e combate realista. Não há qualquer medição de capacidade de jogo nesta entrega.

## Validação e próximos marcos

Testes Node cobrem determinismo, presets, leitura v2 e v3, round trip gzip, corrupção, limites, transformações, estados direcionais, com/sem ar, delta reversível, revisão obsoleta, colisões durante escavação e faces internas.

Homologação restante: conjunto de arquivos gerados por WorldEdit real; abrir a exportação em cliente e Paper 1.21.11; registro completo de estados; testes de quota e memória nos navegadores alvo; testes de fallback sem WebGL; benchmark; revisão de acessibilidade; banco/API e plugin de progressão; mundo Anvil; criação artística do primeiro andar a partir da referência original.

Referências técnicas consultadas em 29/10/2026:

- Sponge v3: https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md
- WorldEdit clipboard: https://worldedit.enginehub.org/en/latest/usage/clipboard/
- Velocity security: https://docs.papermc.io/velocity/security/
- Minecraft alvo: https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-11
