# Cópia entre mapas

Implementação local em 29 de outubro de 2026, sem publicação externa.

`anvil.js` lê o índice de setores Anvil, verifica limites e sobreposições e descomprime apenas chunks necessários. `map-worker.js` isola leitura/NBT com timeout de 30 segundos. `map-library.js` apresenta fontes por dimensão, seleção inclusiva por coordenadas, prévia orbital e cópia persistente de assets. Um mapa é um conjunto de referências read-only a arquivos escolhidos pelo usuário; não é enviada uma cópia a servidor externo. Fontes são temporárias; seleções copiadas sobrevivem no IndexedDB e nos backups.

São aceitos chunks modernos com DataVersion de 2860 a 4671, `sections` e `block_states`, paletas de estados e longs com padding por entrada. A ordem local é X, Z, Y. A cópia remapeia coordenadas absolutas do original para um volume local começando em zero, guardando a origem no offset. Cada região é resolvida pelo piso da coordenada do chunk dividido por 32, inclusive valores negativos. Chunks não fornecidos ou não gerados causam erro, em vez de serem convertidos silenciosamente em ar.

Sem escrita em mundos de origem, migração de DataVersion, suporte a chunk externo `.mcc`, LZ4, Bedrock, ZIP direto ou reconstrução de `level.dat`. O importador usa as pastas para separar dimensões e exclui `entities`/`poi`; não lê dados pessoais de jogadores. Copia estados de blocos, sem mobs, biomas ou iluminação. Block entities no recorte exigem opt-in para perda de dados, ou fazem a operação falhar. Comandos e materiais de mods são recusados. A detecção só considera a seleção, não blocos fora dela.

Prévia não implementa minimapa global nem seleção livre por arrasto no mapa inteiro. A caixa é definida por coordenadas, com sugestão inicial de chunk e faixa de altura; a revisão visual é feita sobre o recorte carregado. A geometria usa as mesmas limitações de cubos do editor.

Testes automatizados: leitura e cópia atravessando chunks/regiões, gzip/zlib/raw, coordenadas negativas, Y negativo, bits de paleta com padding, setores sobrepostos, chunks ausentes, bloqueio e descarte explícito de block entities, versão futura, quotas e round trip copiar → transformar → colar → exportar → reimportar → desfazer. Suite total com o núcleo anterior: 25 testes aprovados.

Teste no navegador: abriu `r.0.0.mca` sintético, indexou dois chunks, extraiu a caixa X14..18 Y64..70 Z3..7, exibiu 121 blocos sólidos e prévia 3D, salvou na biblioteca e colou com rotação de 90 graus e adaptação. O andar resultante e a estrutura copiada foram recuperados após recarregar. Logs consultados sem erros/avisos JavaScript. Não foi usado um mapa real de terceiros nem executado Minecraft nesta verificação.

Referências de implementação do ecossistema Anvil consultadas: https://github.com/Querz/mcaselector e https://github.com/PrismarineJS/prismarine-provider-anvil . A implementação local não incorpora código dessas bibliotecas.
