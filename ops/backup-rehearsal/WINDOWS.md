# Guia manual Windows — preparação, não autorização de produção

O ensaio automatizado é Linux. Este roteiro Windows ainda exige validação na máquina do operador. Não executar contra o projeto principal sem aprovação específica. Se não houver operador com experiência em restauração, solicitar acompanhamento técnico.

## 1. Preparar o computador

- Usar Windows atualizado, disco com BitLocker e conta individual protegida.
- Instalar Docker Desktop com WSL2, Supabase CLI na versão aprovada e cliente PostgreSQL compatível. Verificar requisitos de licença do Docker para a organização.
- Criar pasta de trabalho fora do repositório e fora de sincronização automática desprotegida. Separar duas subpastas: origem e destino.
- Não copiar `.env` da aplicação. Não executar `supabase link` nem selecionar projeto hospedado durante o ensaio local.
- Não ativar transcrição PowerShell, depuração da CLI ou gravação de tela durante operações com segredos.

## 2. Repetir primeiro com dados sintéticos

O workflow do PR é o executor validado. Para acompanhar o resultado, abrir GitHub → Actions → Synthetic backup and restore → execução → Summary. Não é necessário fornecer credenciais Supabase.

A repetição manual local requer os mesmos serviços, fixture e sequência descritos no README. Criar ambientes com IDs diferentes; parar origem antes de reutilizar suas portas no destino. Nunca usar `db reset` para restaurar sobre origem.

## 3. Produzir arquivos sem corromper acentos

Preferir `--file` da CLI em vez de `>` ou pipelines PowerShell, especialmente no Windows PowerShell 5.1. Exemplos exclusivamente locais, executados na pasta de origem já preparada:

```powershell
supabase db dump --local --role-only --file C:\JA-Backup\roles.sql
supabase db dump --local --schema public,ja_private,supabase_migrations --file C:\JA-Backup\schema.sql
supabase db dump --local --schema auth,public,ja_private,supabase_migrations --data-only --use-copy --file C:\JA-Backup\data.sql
```

Não são um backup completo sozinhos: faltam definição do trigger personalizado de Auth, inventário, configurações externas e Storage quando existente. A seleção de schemas precisa ser revista conforme evolução da aplicação. O operador deverá fornecer o arquivo do trigger obtido do catálogo, preservando UTF-8, e conferir dependências.

Conferir o código de saída após cada comando. Se diferente de zero, parar; não considerar arquivo parcial como backup.

Para conferir integridade dos arquivos:

```powershell
Get-FileHash C:\JA-Backup\roles.sql -Algorithm SHA256
Get-FileHash C:\JA-Backup\schema.sql -Algorithm SHA256
Get-FileHash C:\JA-Backup\data.sql -Algorithm SHA256
```

Incluir também os arquivos adicionais no inventário. Guardar os hashes com o manifesto protegido. Hash não substitui restauração.

## 4. Restaurar somente no destino isolado

O operador confirma nome/ID e banco vazio, compara os hashes e segue o executor revisado: defaults restritos, papéis, estrutura, dados, retorno a replication role origin e trigger Auth. Usar `psql -X` com `ON_ERROR_STOP` e uma transação única. Preferir argumentos `--file`, evitando canalizar SQL pelo PowerShell e alterar sua codificação.

Não importar schemas internos inteiros por tentativa, não ignorar erros e não executar os comandos em produção para “ver se funciona”. Auth nativo deverá ter sido inicializado pela mesma versão do Supabase.

Após a carga, comparar contagens/relacionamentos, conferir RLS/grants, fazer login apenas com contas sintéticas e cadastrar uma nova conta sintética para verificar o trigger. Registrar duração e resultado. Parar e apagar os ambientes descartáveis ao terminar.

## 5. Quando houver autorização futura para backup real

Participação manual do proprietário no painel:

1. Confirmar organização, projeto e ambiente, versão e método no painel Connect.
2. Aprovar janela sem escritas, operador e acesso operacional. Não compartilhar credenciais no chat/GitHub.
3. Inventariar Auth, MFA, URLs, provedores, SMTP, API, extensões e Storage sem registrar valores secretos em documentos comuns.
4. Aprovar local externo, criptografia, acesso e retenção. Guardar chave de recuperação em cofre separado e testar sua disponibilidade.
5. Aprovar ambiente restrito para eventual restauração de dados reais; não usar GitHub Actions deste ensaio para isso.

Uma senha no argumento `--db-url` pode aparecer no histórico/lista de processos. A forma de conexão remota deverá ser preparada pelo operador usando mecanismo seguro compatível com a ferramenta; este guia não fornece comando remoto com credencial embutida. Não redefinir credenciais apenas para seguir o roteiro.

Backup Free não restaura pelo botão de backups gerenciados. Recuperação pode exigir novo ambiente e alterações de configuração aprovadas separadamente. Se o Supabase Free não permitir outro projeto naquele momento, usar isolamento local ou avaliar custo de projeto adicional antes de começar.
