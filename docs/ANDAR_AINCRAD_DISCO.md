# Andar de Aincrad em disco, geração inteligente e miniatura do andar inteiro

## O editor mostra uma janela; a miniatura mostra o andar

Em **Mundos grandes**, o andar é gerado por chunks sob demanda. O editor 3D mostra uma **janela** de 32 a 96 blocos; o mundo em resolução total é gravado em **Exportar mundo .zip**. O diálogo traz uma **miniatura 3D do andar inteiro** (orbitável; cada cubo representa vários blocos):

- **Pré-visualização antes de criar:** a miniatura é refeita ao mudar tamanho, seed, tema ou qualquer controle.
- **Clique na miniatura** para posicionar a janela de edição naquele ponto; depois use **Abrir janela**.
- Ao criar, a janela abre na praça da cidade inicial e os locais são listados com coordenadas.

## Topologia "Andar de Aincrad · disco completo"

Opção padrão de **Terreno** (`topology: 'aincrad'`; código em `dist/aincrad-floor.js` e `dist/aincrad-assets.js`). Mínimo 256 × 256; recomendado 1024 ou mais.

### Terreno
- **Praias:** faixa de areia de largura variável no lago, nos rios e em trechos da borda do disco que descem até o oceano; fundo de areia, cascalho e argila; juncos na margem, vitórias-régias e algas no lago.
- **Superfície pela inclinação:** encostas íngremes e a borda do disco viram rocha; topos altos viram neve.
- **Rios pelo relevo:** nascem na cordilheira, seguem o caminho de menor custo até o lago, com afluentes, e o lago escoa até a borda. O nível da água só desce, em degraus de um bloco.
- **Biomas por altitude e umidade:** planície, campo de flores, bosque de bétulas, floresta, pântano, serra com pinheiros e neve, com transição pontilhada entre eles.
- **Vegetação:** árvores de portes e espécies diferentes, arbustos, capim, samambaias, flores, cogumelos, pedras e troncos caídos.
- **Borda e fundo:** falésia na borda e parte de baixo em cone de rocha com estalactites.

### Estruturas
- **Estradas por pathfinding:** evitam ladeiras e água, se juntam em troncos comuns e cruzam rios em pontes de pedra com mureta.
- **Cidade inicial:** muralha, torreões, portões, praça com fonte e barracas de mercado, 24 modelos de casa (um a três pisos, lojas com toldo, chaminés, interiores, escada entre pisos) com a porta para a rua, igreja com torre do sino, postes de luz, jardins, parques e palácio.
- **Torre-labirinto jogável:** porta voltada para a cidade, um labirinto diferente por piso, escada de mão central nos pisos ímpares, rampa em meios-degraus no anel externo nos pares e salão do chefe no último piso.
- **Pontos de interesse:** vilas com poço, fazendas junto às vilas, ruínas, acampamentos, torres de vigia e a masmorra.

### Os 100 andares
O campo **Andar nº** e o botão **Aplicar tema do andar** preenchem seed, bioma, relevo, conteúdo e tamanho sugeridos (`floorTheme(n)`). O castelo afunila: o 100º andar tem cerca de 40% do diâmetro do 1º. Do 2º andar em diante o layout é girado, então a cidade e a torre mudam de posição. Cada tema troca blocos do terreno, espécies de árvore e materiais da cidade (lago congelado no gelo, pedra negra no ígneo).

### Controles
Tamanho da cidade (50–200%), número de vilas (0–5), florestas, montanhas, lago e rios e pontos de interesse (0–200%). Os interruptores Cidade, Labirinto, Masmorra, Vegetação e Cavernas continuam valendo. Arena e Pontes entre ilhas não se aplicam. Heightmap e máscara de biomas não são aplicados ao disco; uma planta de referência ativa tem prioridade.

## Exportação em paralelo

`lib/export-worker.mjs` distribui lotes de chunks entre vários núcleos (`lib/chunk-worker.mjs`, até 8) e grava em ordem. Em 4 núcleos, um andar de 1024 × 1024 exporta em cerca de 30 s.

## Limitações

- O layout é procedural e próprio, inspirado na descrição geral de Aincrad. Não reproduz o mapa de nenhum jogo.
- Mundos criados antes desta atualização com a topologia de disco são regenerados com o terreno novo; janelas já salvas em disco são preservadas, mas podem não casar com o entorno.
- Os rios são traçados numa grade de 128 × 128 células; não há simulação de erosão.
- A torre termina no topo do volume do andar (Y até 191), não em Y 319. Torres com raio menor que 18 não têm labirinto.
- Não há baús, camas nem sinos funcionais (o exportador não grava block entities) nem NPCs e chefes.
- A abertura do ZIP no Minecraft 1.21.11 continua sem homologação em jogo.

## Testes

`tests/aincrad-floor.test.mjs`: disco e determinismo, cidade e modelos, torre (porta, labirinto, escada e rampa), praias, biomas, rios que só descem, estradas e pontes, pontos de interesse, os cinco temas, temas por andar, opções e miniatura.
