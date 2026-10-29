# Fundo oceânico e pilares proporcionais

Atualização de 29/10/2026. Este documento substitui as descrições anteriores de um vão vazio e de colunas externas tão altas quanto os pilares da borda.

## Duas alturas

Cada braço agora tem um pilar principal junto à borda e uma coluna perto da ponta. O pilar da borda ocupa 320 blocos, de Y 0 a 319. A coluna da ponta ocupa 160 blocos, de Y 0 a 159: exatamente metade da altura. A viga continua reta para fora e passa pela coluna da ponta, mantendo o trecho final ajustável depois dela.

Os novos padrões de dimensão permanecem: braço de 512 blocos, coluna de 36 de diâmetro e viga de 32 × 24. Comprimentos insuficientes para separar os dois pilares são recusados. As alturas são derivadas para manter a proporção de metade; não há dois campos de altura que possam se contradizer.

## Fundo e água até a muralha

Todo o interior do círculo recebe preenchimento por padrão, inclusive áreas vazias dentro do retângulo do terreno. O fundo tem seis camadas: bedrock em Y 0, pedra em Y 1–4 e areia em Y 5. A água começa em Y 6 e segue até a cota do mar. Fora da muralha, os braços e pilares continuam suspensos sobre o vazio.

O preenchimento adiciona blocos apenas em estados de ar (`air`, `cave_air` e `void_air`). Os blocos sólidos, estados e coordenadas do terreno existente são preservados. Cavidades abaixo do nível do mar podem receber água; não há uma análise hidráulica para identificar cavernas seladas ou interiores de construções.

O nível automático considera a altura, o relevo e a contribuição máxima de uma imagem de altura. Ele fica abaixo do limite inferior previsto para a superfície do terreno procedural. No padrão 512 × 512 × 128, com relevo 12 e sem heightmap, a água termina em Y 31. O painel permite informar uma cota manual. Cotas acima de terrenos ou construções baixas podem inundar os espaços de ar; use a prévia para escolher a altura. Cotas acima da dimensão do mapa ou da muralha são recusadas.

Em **Mundos grandes e geração avançada**, os controles são:

- **Preencher o interior com fundo e água**: habilitado por padrão.
- **Nível da água Y**: vazio usa a regra automática.
- **Pilar da borda** e **Coluna da ponta**: atalhos para inspecionar cada estrutura.

O tamanho X/Z continua representando a área reservada ao RPG. A faixa de mil blocos até a muralha mantém suas dimensões e passa a ser ocupada por mar e fundo. O círculo e os suportes continuam acompanhando o tamanho do terreno.

## Exportação e performance

A seleção de chunks inclui agora todo o disco interno, não apenas as ilhas e a borda. Isso aumenta o tamanho do mundo. Os chunks são gerados e gravados em sequência; não há um array do círculo inteiro na memória.

O escritor Anvil trata seções uniformes de ar e água diretamente, omite arrays de índices desnecessários e calcula o heightmap durante a leitura dos blocos. Seções parcialmente preenchidas no topo continuam respeitando a altura exata do snapshot. O renderer oculta faces internas entre blocos do mesmo fluido, inclusive estados diferentes do nível de água; a interface entre água e lava continua visível. A água da prévia tem textura estática e não reproduz o motor de fluidos do jogo.

Projetos e chunks editados anteriormente são preservados. As novas regras aparecem ao criar um mundo ou gerar chunks ainda não editados; arquivos ZIP antigos não mudam. Para adotar integralmente o novo preenchimento em um projeto antigo, gere um novo mundo a partir da configuração desejada. A exportação não apaga silenciosamente edições salvas para substituir a estrutura antiga.

## Verificação

Os testes incluem: alturas 320/160; continuidade do fundo e da água até a face interna da muralha; preservação dos blocos sólidos; cota manual inválida; paletas Anvil uniformes e seções parciais; redução de faces internas do oceano; cópia e gravação em coordenadas negativas. O teste HTTP lê os `.mca` exportados e confere bedrock, areia, água, o pilar alto e a coluna baixa.

O conjunto contém 70 testes automatizados, além dos dois testes de integração HTTP. Cliente Minecraft/Paper e iluminação final no jogo ainda precisam de homologação.

## Repositório

O código, recursos locais, atribuições e testes pertencentes ao projeto são versionados. `.runtime`, arquivos de mundo gerados, backups pessoais, `.openai`, arquivos `.env` e dependências locais ficam fora do Git. Para executar: Node.js 22 ou superior, `npm start`; para os testes de unidade: `npm test`. Os testes HTTP usam um servidor isolado em `http://127.0.0.1:4174`.
