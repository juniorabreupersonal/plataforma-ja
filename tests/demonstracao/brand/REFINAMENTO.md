# Cópias técnicas autorizadas — comparação, não ativação

Escopo autorizado pelo proprietário: cópias com ajuste de margens e remoção somente de resíduos comprovados de transparência; sem redesenho/recoloração ou alteração do lettering. Os originais em `public/brand/propostas/` e a prancha de referência continuam byte a byte idênticos, conforme os hashes anteriores.

## Operações realizadas

Processamento estritamente técnico, sem geração de imagem, desenho, interpolação, nitidez artificial, vetorização, correção de cor ou substituição de detalhes:

1. Ler o PNG RGBA original e conferir seu SHA-256 contra o manifesto da entrega anterior.
2. Identificar componentes conexos de pixels visíveis com conectividade de 8 vizinhos.
3. Remover **somente** componentes cujo alfa máximo é exatamente **1/255 (0,39%)**, e cuja distância mínima de qualquer pixel com alfa maior que 1 é de pelo menos **24 pixels**. Altera-se somente o alfa desses resíduos para zero; seus valores RGB também são preservados.
4. Preservar todos os pixels com alfa maior que 1, todos os componentes ligados a eles e os componentes de alfa 1 próximos. Não se aplica limiar global sobre a imagem. Sombras, contornos, acentos e detalhes conectados à marca permanecem intactos.
5. Ajustar a tela ao conjunto restante de pixels não transparentes, adicionando margem transparente igual em quatro lados: **5% da maior dimensão útil, arredondada para cima, mínimo 12 px**. É uma área técnica proposta para revisão, não um manual oficial da marca.
6. Não redimensionar a arte. Se a margem precisar ultrapassar a tela original, adicionar apenas pixels transparentes; isso explica as pequenas ampliações de largura das cópias vertical/símbolo.
7. Salvar um PNG RGBA sem perdas em diretório separado. Os pixels da marca são uma translação inteira dos originais, não uma reamostragem. Os arquivos novos naturalmente têm hashes diferentes; os originais não mudam.

A remoção é limitada aos componentes quase invisíveis, desconectados e afastados do desenho. Não há limpeza agressiva das bordas da marca. O mapa de remoção tem hash e pode ser reconstituído pelo script.

## Antes e depois

| Versão | Original | Cópia técnica | Margem por lado | Pixels de alfa 1 removidos | Componentes |
|---|---|---|---:|---:|---:|
| Horizontal | 1448 × 1086 | 1411 × 414 | 65 px | 3.035 | 878 |
| Vertical | 1122 × 1402 | 1131 × 765 | 52 px | 2.682 | 764 |
| Símbolo | 1254 × 1254 | 1267 × 585 | 58 px | 4.637 | 968 |

A proporção da **marca** não muda; a proporção da tela vazia muda porque as margens foram ajustadas. A diferença útil é o encaixe/altura, não a criação de detalhes ou aumento de resolução. Em largura fixa, o desenho pode manter tamanho parecido com o original, ocupando uma caixa menos alta.

Dados completos: `src/components/demonstracao/technical-copies.json` registra janelas de origem, dimensões, margens, contagens, hashes originais/revisados e hash do mapa de remoção.

## Garantias verificadas

`python3 tests/demonstracao/refine_brand.py` verifica sem reescrever arquivos:

- hashes originais iguais aos do RAR recebido;
- RGB de todos os pixels copiados permanece idêntico;
- alfa de todos os pixels mantidos permanece idêntico;
- nenhum pixel com alfa maior que 1 é alterado;
- os pixels removidos satisfazem isolamento, alfa 1 e distância mínima;
- nenhum pixel visível restante é cortado;
- cópias decodificadas iguais, pixel a pixel, ao resultado dessas operações e às informações do manifesto.

`--write` gera apenas cópias/manifesto, nunca originais. Dependências em `image-review-requirements.txt`; CI usa o modo de verificação. O script não lê credenciais, não acessa rede/Supabase e não gera imagens por IA.

## Comparação visual e tamanhos reais

Em `/demonstracao/identidade`, cada versão apresenta original/cópia lado a lado sobre preto e sobre branco. Imagens servidas sem otimização/recompressão pelo Next.js, com proporções e textos alternativos. As capturas têm o fundo claro expandido para comparar ambos os casos.

Também há ensaios isolados de cabeçalho com até 320 px, apresentação com até 240 px e caixas de menu 32/48/64 px. Em telas estreitas, as imagens maiores se reduzem proporcionalmente. Os ensaios não substituem o cabeçalho/menu real dos painéis.

- [Comparação desktop](../previews/identidade-refinamento-desktop.png)
- [Comparação em viewport de celular](../previews/identidade-refinamento-celular.png)
- [Tamanhos de interface — desktop](../previews/marca-tamanhos-reais.png)

## Diferenças que permanecem

- Halos claros/cianos aderentes, serrilhado e acabamento metálico da arte original não foram removidos: separá-los de sombras/detalhes legítimos exigiria intervenção gráfica além do ajuste autorizado.
- Espessura/acabamento do lettering frente à prancha não é corrigível por recorte ou transparência sem modificar a marca. Nada foi redesenhado automaticamente.
- O símbolo com barra/anilhas é largo e detalhado: em caixa de menu de 32 px sua altura útil é pequena. Transformá-lo em ícone quadrado simplificado exigiria novo desenho aprovado; não foi feito.
- Não existe matriz vetorial/editável fornecida. Estas cópias mantêm a nitidez raster original, sem promessa de equivalência vetorial ou reconstrução da prancha.

## Estado para aprovação

Cópias em `public/brand/revisadas/`, **somente para comparação**. Originais, identidade textual dos painéis, telas reais de acesso e favicon preservados. Os testes conferem que os três painéis continuam sem ativar imagens nos cabeçalhos. Não houve merge, deploy, publicação de aplicação, alteração de permissões ou acesso ao Supabase.

## Resultado local

Build de produção aprovado; 22 testes Auth/arquivos originais aprovados; verificação das três cópias pixel a pixel aprovada; 221 assertivas Chromium aprovadas, incluindo imagens originais/revisadas, integridade HTTP, proporções, tamanhos de menu, responsividade e ausência de ativação nos cabeçalhos. Lint sem erros, mantendo somente o aviso preexistente em `/teste-supabase`. As capturas foram revistas visualmente. Safari/Firefox, aparelhos físicos e auditoria completa de acessibilidade não foram executados.
