# Pincéis e adaptação de construções

Implementado em 29 de outubro de 2026. Ferramentas locais do Studio, inspiradas nos fluxos de pincéis WorldEdit e VoxelSniper. Não há execução de plugins no navegador, conexão a servidor de jogo ou importação de presets/scripts desses plugins.

## Representação e operações

`brushes.js` produz deltas puros de edição a partir de parâmetros validados. `brush-editor.js` cria uma cópia de trabalho por traço, aplica amostras interpoladas e agrega cada posição mantendo o estado original e o último estado proposto. A revisão canônica só muda ao soltar o botão. Um traço inteiro vira uma única operação persistente no histórico. As interseções do cursor usam a revisão original do traço, evitando atingir os próprios blocos recém-criados no mesmo clique.

Raio zero permite edição unitária. Esfera, cubo, cilindro e esfera oca afetam volume nas operações de adição e escavação. Pintura trabalha em camadas superiores. Elevar, rebaixar, nivelar, suavizar e erosão leve trabalham com alturas locais, não com relaxação de densidade volumétrica. Não há simulação de erosão hidráulica ou suporte genérico a comandos de console.

Máscaras: terreno e ar apropriado para adição; somente ar; somente sólidos; todos. A máscara de terreno utiliza uma lista explícita de materiais naturais. Ela não sabe se uma parede feita inteiramente de pedra natural foi construída manualmente. Madeira, blocos decorativos e similares são tratados como obstáculos; o sistema não substitui regiões protegidas semânticas, ainda planejadas.

Limites por traço: 128 amostras úteis, 200 mil posições únicas, raio 0–12, força/passagens 1–6, quotas do mesher mantidas. Atualizações do pincel são espaçadas por pelo menos 75 ms, sem promessa de FPS. Uma malha que exceder o limite cancela a prévia e conserva a revisão base. Esc cancela o traço em andamento; as operações já confirmadas usam Desfazer.

## Adaptação automática

`terrain.js` classifica materiais de terreno, identifica a superfície e a camada contínua de apoio, e produz mudanças por coluna. Cortes preservam cavernas abaixo da superfície. A espessura de apoio é preservada em até três blocos ou a espessura originalmente existente quando menor. Não são criados pilares até o fundo do mundo e apoios sobre o vazio geram erro no modo automático.

A base da construção é inferida pelo primeiro sólido de cada coluna, retendo os apoios até dois blocos acima do ponto mais baixo. A transformação dos apoios acompanha espelhamento e rotação. Um campo aproximado de vizinhança projeta a altura dos apoios no entorno. Interpolação suave e até seis passagens locais conectam a cota de fundação ao terreno original. A faixa externa é limitada a 1–16 blocos, com borda distante fixa e corte/aterro máximo de 24 blocos por coluna. Materiais superficiais são reaproveitados, incluindo acabamento com grama e subsolo de terra/pedra quando apropriado.

Construções/vegetação sobre apoios bloqueiam a operação protegida; no entorno, colunas com obstáculos são preservadas e reportadas. Autorizar sobreposição retira essa proteção. Essa é uma heurística de materiais e apoios, não análise semântica de castelos ou pontes; estruturas complexas exigem ajuste manual.

`previewPlacement` combina o delta de terreno com o delta de colagem e calcula colisões. O navegador mostra uma cópia temporária da revisão com esse resultado. Durante o arrasto, o picking usa o mapa canônico, e a atualização é limitada por aproximadamente 100 ms mais o custo do cálculo/meshing. Cada posição parte da mesma base, sem acumular aterro de posições anteriores. A altura automática usa a mediana dos apoios e pode ser desativada para conservar Y manual. Aplicar revalida e grava terreno e construção como uma operação; cancelar não grava a cópia temporária.

## Validação

14 novos testes do núcleo verificam formas e raio zero, máscaras, profundidade de pintura, redução de picos, proteção de vizinhos, elevação/rebaixamento, merge e desfazer de traço, parâmetros inválidos, erosão, transição natural, repetibilidade das prévias, apoios irregulares, cavernas, espessura mínima e reversão conjunta. Suite total: 39 testes.

No navegador, um traço de elevação alterou 1.495 posições e foi desfeito/refeito como uma unidade. O arrasto de uma casa exibiu 1.479 posições de prévia e 312 colunas adaptadas sem mudar a contagem canônica de blocos antes de aplicar. Aplicar e desfazer restauraram terreno e construção juntos; o mapa foi recuperado após recarregar. O modo raio zero foi corrigido durante QA e depois acrescentou exatamente um bloco por clique. Um traço de suavização alterou 252 posições. Nenhum erro/aviso JavaScript foi encontrado nas consultas de logs desses fluxos.

Validação de Minecraft, performance de produção, todos os estados vanilla e integração com plugins reais continuam pendentes.

Referências técnicas: https://worldedit.enginehub.org/en/latest/usage/tools/brushes/ e https://ore.spongepowered.org/VoxelBox/VoxelSniper/pages/Home . Os algoritmos do Studio são implementações próprias com semântica e limites documentados acima.
