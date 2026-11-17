# Andar de Aincrad em disco e miniatura do andar inteiro

## Por que "o mundo não aparecia"

Em **Mundos grandes**, o andar é gerado por chunks sob demanda. O editor 3D mostra apenas uma **janela** de 32 a 96 blocos; antes desta atualização, criar um mundo de milhares de blocos abria só um cubo de terreno no centro e fechava o diálogo, o que parecia que nada tinha sido gerado. O mundo em resolução total só é gravado em **Exportar mundo .zip**.

Agora, ao criar um mundo, o diálogo permanece aberto com uma **miniatura 3D do andar inteiro** (orbitável; cada cubo representa vários blocos), a lista de locais com coordenadas e uma mensagem no console. A janela 3D é aberta na praça da cidade inicial.

## Topologia "Andar de Aincrad · disco completo"

Opção padrão de **Terreno** em Mundos grandes (`topology: 'aincrad'`, `dist/aincrad-floor.js`). Norte = Z negativo.

- Terreno em **disco** ocupando toda a área X/Z (mínimo 256 × 256; recomendado 1024+).
- **Cidade inicial** murada ao sul: muralha com ameias, torreões, quatro portões, avenidas em cruz, rua em anel, praça com fonte, quarteirões com casas, torres e jardins e, em cidades maiores, um palácio escuro ao norte da praça. O spawn da exportação fica na praça.
- **Torre-labirinto** ao norte, do chão até o topo do volume do andar: casca de deepslate, pisos a cada 12 blocos, rampa helicoidal interna e porta ao sul.
- **Cordilheira** ao norte com rocha exposta e neve nos picos; vale ao longo da estrada principal.
- **Lago central**, rio que nasce nas montanhas, atravessa o lago e cai pela borda leste; pontes onde a estrada cruza a água.
- **Florestas** a leste e oeste, **estradas** ligando cidade, vilas e torre, duas **vilas** e a masmorra opcional.

Os interruptores Cidade, Labirinto, Masmorra, Vegetação e Cavernas continuam valendo. Arena e Pontes entre ilhas não se aplicam a esta topologia. Heightmap e máscara de biomas não são aplicados ao disco; uma planta de referência ativa tem prioridade sobre o disco.

## Limitações

- O layout é procedural e próprio, inspirado na descrição geral de Aincrad. Não reproduz o mapa de nenhum jogo; a imagem de referência do primeiro andar não é copiada.
- A torre termina no topo do volume do andar (Y até 191), não em Y 319.
- A miniatura é uma amostragem: estradas estreitas e casas podem não aparecer em andares muito grandes.
- As folhas das árvores agora são exportadas com `persistent=true` para não decaírem no jogo.
- A abertura do ZIP no Minecraft 1.21.11 continua sem homologação em jogo.

## Testes

`tests/aincrad-floor.test.mjs`: forma circular e determinismo, muralha/portão/fonte da cidade, torre até o teto, lago/rio/estradas/florestas/montanhas, estados exportáveis e miniatura.
