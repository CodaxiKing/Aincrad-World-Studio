# Andar circular de Aincrad — atualização de 29/10/2026

A atualização mais recente em `OCEANO_E_PILARES.md` substitui os trechos históricos sobre vão vazio e alturas dos pilares.

O terreno do RPG ocupa a área central. Uma estrutura circular independente envolve essa área, com muralha monumental, pilares verticais e suportes laterais radiais. A estrutura acompanha automaticamente o tamanho de cada mapa e faz parte da exportação Minecraft, sem deslocar os blocos e as construções existentes.

## Medidas e margem

As dimensões X/Z do gerador continuam representando **somente a área reservada ao terreno do RPG**. A extensão total exportada é maior.

O centro permanece em `X = largura / 2`, `Z = comprimento / 2`. O raio da face interna da muralha é calculado por:

```text
raio reservado ao terreno = √((largura / 2)² + (comprimento / 2)²)
raio interno da muralha = arredondar_para_cima(raio reservado) + 1000
diâmetro interno = 2 × raio interno
```

Isso garante uma **margem mínima de 1.000 blocos**, inclusive nos cantos de mapas retangulares. Em ilhas ou terrenos recortados, algumas costas ficam mais distantes da muralha: o cálculo reserva toda a área X/Z para futuras construções. A base anelar e os pilares não avançam sobre essa margem.

Exemplo: terreno de 512 × 512 → círculo interno com diâmetro de 2.726 blocos; a extensão total, considerando os suportes padrão e o alinhamento de chunks, fica em aproximadamente 3.840 × 3.840 com os novos suportes de 512 blocos. Um terreno de 2048 × 2048 tem círculo interno de 4.898 blocos. A margem é um vão vazio nesta versão, sem oceano ou disco sólido preenchendo todo o círculo.

## Estrutura entregue

- Muralha circular contínua, com altura padrão de 256 blocos, ajustável de 128 a 300.
- Espessura padrão de oito blocos, com faixas de pedra/deepslate, acabamento e iluminação pontual.
- Base anelar externa; ela começa na mesma distância mínima da muralha.
- Dezesseis pilares verticais por padrão, ajustáveis de oito a 32. Eles ocupam Y 0 até 319, dentro da altura da dimensão vanilla utilizada.
- Suportes laterais distribuídos radialmente, com uma viga horizontal reta e uma coluna vertical que a atravessa próxima à ponta. A viga continua por 16 blocos após a face externa da coluna, por padrão; esse trecho é ajustável de oito a 64 blocos. Comprimento padrão de 512 blocos, ajustável de 32 a 2048.
- Terreno central preservado nas coordenadas anteriores; não é movido para abrir espaço para a muralha.

As medidas são físicas no Minecraft. A vista geral do painel usa uma representação simplificada proporcional. O exemplo não inclui um teto fechando o andar nem ligação automática ao andar superior; os pilares se elevam até o limite de altura disponível. Dimensões com alturas especiais ainda não são implementadas.

## Usar no painel

Abra **Mundos grandes e geração avançada**. Configure o terreno e, em **Estrutura externa de Aincrad**, ajuste altura da muralha, quantidade de pilares e comprimento dos suportes. A margem aparece fixa em 1.000 blocos. O painel informa o diâmetro calculado e a extensão total aproximada.

A vista geral 3D mostra o conjunto em proporção real; o minimapa permite escolher uma área. Os atalhos **Terreno central**, **Muralha leste** e **Pilar leste** posicionam a janela. Clique em **Abrir janela** para inspecionar os blocos reais no editor.

Ao navegar para a borda, use janelas de 32 ou 64 blocos: elas incluem os 320 blocos de altura. A janela de 96 não cabe nessa altura dentro da quota de 2.097.152 posições e produz uma orientação para reduzir o lado. As coordenadas globais da estrutura podem ser negativas; as coordenadas das ferramentas dentro da janela permanecem locais.

**Salvar janela** persiste também edições na muralha, pilares e margem. A exportação inclui chunks editados mesmo quando eles estão no vão. A configuração e as edições dos projetos grandes continuam em `.runtime/worlds`; o backup `.aincrad` do navegador guarda somente a janela atual, assets e referências.

## Exportação e compatibilidade

O exportador percorre a área central e os chunks que interceptam a estrutura externa. Os espaços vazios não recebem milhões de voxels em um array global: fora dos chunks escritos, o gerador vazio do Minecraft mantém o vão. A seleção é conservadora nas fronteiras, portanto alguns chunks de ar podem ser incluídos.

Os arquivos Anvil usam regiões e chunks negativos quando necessário. A escrita é ordenada por região para preservar os arquivos já escritos. O número de chunks e o progresso consideram a estrutura completa. O manifesto `aincrad-project.json` contém a configuração, as medidas do círculo e a contagem de chunks.

Novos projetos e exportações normais recebem a estrutura por padrão. Projetos locais anteriores sem campo `shell` também passam a gerá-la ao reexportar. Arquivos ZIP já baixados não são modificados. O parâmetro técnico `shell.enabled=false` continua disponível para fixtures e projetos explicitamente legados; não é o padrão do painel.

`.schem` continua exportando somente o volume atualmente aberto. Para obter o andar inteiro com o círculo e a margem, use **Mundo Minecraft / Exportar mundo .zip**. O mapa central continua limitado a 2048 × 2048 nesta versão; esse limite não se aplica ao diâmetro externo calculado.

## Referências recebidas

As imagens fornecidas pelo usuário foram incluídas no painel e em `dist/assets/references`:

- `aincrad-first-floor.png`: mapa de referência do primeiro andar, com título e créditos visíveis preservados.
- `aincrad-shell.png`: referência da organização circular e dos suportes.
- `aincrad-external-supports.png`: nova referência dos braços retos, com coluna próxima à ponta e continuação da viga.

São referências visuais, não instruções executáveis. A distribuição detalhada das terras, estradas e localidades do mapa de Echoes of Aincrad **não foi reconstruída automaticamente**. O terreno demonstrativo continua procedural. O novo círculo e seus suportes são geometria implementada e exportável; a fidelidade artística completa do terreno é uma etapa separada.

## Verificação

- Testes de margem nos quatro cantos, aumento do raio com mapas retangulares, geometria da muralha, pilares em Y 319, vigas laterais e vazio entre terreno e borda.
- Comparação do terreno central com a estrutura ligada/desligada para confirmar que suas coordenadas e blocos não mudam.
- Janelas negativas com altura 320 e recusa de volumes acima da quota.
- Exportação esparsa em ordem de região e inclusão de edições no vão.
- Integração HTTP: janela negativa na muralha, gravação de um bloco de ouro e leitura independente do Anvil exportado; conferência de um pilar em Y 319.
- Verificação no navegador da vista geral, dos atalhos, da janela 3D de muralha e das referências incorporadas.

Não foi executado cliente Minecraft/Paper nesta etapa. A iluminação continua delegada ao jogo, e o mundo exportado precisa dessa homologação antes de uso em produção.


## Nova referência dos suportes externos

A imagem `aincrad-external-supports.png` foi recebida e incluída no painel. Os suportes agora são braços retos, radiais, com uma única viga à altura aproximada do terreno. A coluna vertical fica perto da ponta e atravessa essa viga, indo até Y 319. O braço continua após a coluna; não há outra coluna fechando a extremidade. O parâmetro **Viga depois da coluna** controla o trecho final. Os campos **Largura do terreno interno X** e **Comprimento do terreno interno Z** determinam a área gerada e recalculam automaticamente círculo e posição dos suportes.


## Suportes mais longos e grossos

Os novos padrões são: projeção para fora de **512 blocos** (antes 128), colunas com **36 blocos de diâmetro** (antes 12) e vigas com seção de **32 × 24 blocos** (antes aproximadamente 10 × 8). A coluna continua próxima à ponta e sobram 16 blocos de viga depois dela. A margem interna de 1.000 blocos permanece igual.

No painel, a projeção lateral pode ser ajustada de 32 a 2048 blocos; o diâmetro das colunas de 12 a 128; a largura das vigas de oito a 128 (números pares); a altura das vigas de quatro a 64. Comprimentos muito curtos para comportar coluna e ponta são recusados. A extensão total do andar cresce automaticamente para incluir esses suportes.

Os novos padrões se aplicam ao criar um mundo. Projetos com dimensões de suporte já gravadas preservam seus valores. ZIPs antigos não são alterados. Para obter a nova estrutura, crie um novo mundo com as medidas desejadas e exporte novamente. Chunks que foram editados manualmente continuam preservados; o gerador não os substitui silenciosamente. O maior volume de blocos e a extensão dos braços aumentam o tamanho e o tempo da exportação.
