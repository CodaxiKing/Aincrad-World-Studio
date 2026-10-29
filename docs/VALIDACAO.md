# Validação do MVP

Data: 29 de outubro de 2026. Ambiente: Windows, Node.js do runtime local do Codex e navegador integrado Chromium. Resultados de desenvolvimento, sem certificação de produção.

## Testes automatizados

`node --test tests/core.test.mjs`: 13 testes aprovados. Inclui todos os presets de ambiente, round trip Sponge v3 comprimido, adaptação v2 com paleta não canônica, arquivos inválidos, translação/rotação/espelhamento, estados direcionais, modos de ar, adaptação reversível, limites, prévia obsoleta, colisões durante escavação e malha de faces visíveis.

## Exercícios no navegador

- Página inicial: 100 andares presentes; cena gerada com 66.430 blocos sólidos.
- Casa medieval selecionada: prévia, relatório e bloqueio por colisão exibidos.
- Nivelamento com suavização e autorização de sobreposição: casa aplicada; total passou a 67.206 blocos.
- Desfazer restaurou 66.430 blocos; refazer restaurou 67.206.
- Recarregamento e troca entre andares: mapa preservado, andar 002 permaneceu sem terreno.
- Exportação no navegador: arquivo gzip `.schem` de 10.489 bytes.
- Reimportação pelo seletor de arquivo e worker: 512.000 posições, formato Sponge v3, DataVersion 4671; asset entrou na biblioteca.
- Nenhum erro ou aviso JavaScript nas consultas de log feitas após os fluxos testados.
- Inspeção visual da interface, viewport, controles, painel de propriedades e console.

## Atualização da cópia entre mapas

Adicionado leitor Anvil e navegador de fontes locais. Suite atual: 25 testes aprovados. Foram testados no navegador tanto a abertura direta de `.mca` quanto a abertura da pasta contendo a região. Uma estrutura sintética atravessando dois chunks foi visualizada, copiada, colada com adaptação e recuperada após recarregar. Consulte `COPIA_ENTRE_MAPAS.md` para cobertura e limitações específicas.

## Não verificado

A atualização de pincéis e adaptação automática adiciona 14 testes, totalizando 39, e verificações de traço, suavização, bloco unitário, prévia de arrasto e reversão conjunta no navegador. Detalhes em `PINCEIS_E_ADAPTACAO.md`.

Não houve execução de Minecraft, Paper, Velocity ou WorldEdit. Não houve teste com o arquivo de um construtor externo, benchmark com muitos usuários, homologação de todos os estados de bloco, teste em todos os navegadores nem auditoria de segurança. Backup/restauração possui validação de schema e transação IndexedDB, mas o fluxo completo ainda requer teste dedicado.

Publicação no Sites não foi realizada: a sincronização de código externo foi bloqueada por revisão automática por falta de autorização explícita do usuário para esse destino. O código local e o pacote portátil são a entrega disponível.
