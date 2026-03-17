## O que é este template?

O **Manager Bot** é um bot para Discord que permite gerenciar suas aplicações hospedadas na [ShardCloud](https://shardcloud.app) diretamente pelo chat. Desenvolvido com **Discord.js v14**, **SQLite** e **Discord Components V2**, ele oferece uma interface limpa e interativa para criar, atualizar e controlar seus apps sem sair do Discord.

## O que este bot faz?

Com dois slash commands e botões interativos, o bot cobre todo o ciclo de vida de uma aplicação na ShardCloud:

1. **Criar apps** — envia um `.zip` com seu código + arquivo `.shardcloud` via modal com upload de arquivo
2. **Listar apps** — visualiza seus apps com status em tempo real, paginados com setas
3. **Controlar apps** — botões para iniciar, parar, reiniciar e deletar
4. **Fazer commit** — atualiza o código de um app existente enviando um novo `.zip` pelo modal

### Fluxo de funcionamento

```
/create → Modal abre → Usuário envia .zip → App criado na ShardCloud
                                                    ↓
/apps → Lista paginada de apps → Seleciona um app via setas
                                                    ↓
                              Botões: Start | Stop | Restart | Commit | Delete
                                                    ↓
                              Commit → Modal abre → Usuário envia .zip → Código atualizado
```

## Comandos

| Comando    | Descrição                                                  |
| ---------- | ---------------------------------------------------------- |
| `/apps`    | Lista seus apps com status, paginação e botões de controle |
| `/create`  | Abre um modal para criar um novo app via upload de `.zip`  |

## Botões (dentro do `/apps`)

| Botão     | Ação                                                         |
| --------- | ------------------------------------------------------------ |
| **Start** | Inicia o app (`POST /apps/{id}/status` com `run`)            |
| **Stop**  | Para o app (`POST /apps/{id}/status` com `stop`)             |
| **Restart** | Reinicia o app (`POST /apps/{id}/status` com `restart`)    |
| **Commit** | Abre modal para enviar novo `.zip` (`PUT /apps/{id}/file`)  |
| **Delete** | Deleta o app permanentemente (`DELETE /apps/{id}`)          |
| **◀ / ▶** | Navega entre apps (paginação)                               |

## Tecnologias

| Tecnologia           | Uso                                        |
| -------------------- | ------------------------------------------ |
| **Node.js**          | Runtime                                    |
| **Discord.js v14**   | Interação com a API do Discord             |
| **SQLite**           | Armazena vínculo entre usuário Discord e apps |
| **JSZip**            | Leitura do `.zip` para extrair o nome do app |
| **Components V2**    | Containers, TextDisplay, Separators, FileUpload em modals |

## Como funciona por baixo

- A **ShardCloud API** é autenticada com um token Bearer definido no `.env` (`SHARD_API_KEY`).
- O bot usa um **banco SQLite local** (`apps.db`) para rastrear qual usuário do Discord criou qual app. Cada usuário só vê seus próprios apps.
- Ao criar ou fazer commit, o bot baixa o `.zip` que o usuário enviou pelo modal do Discord e encaminha diretamente para a API da ShardCloud como `multipart/form-data`.
- O nome do app é extraído automaticamente do campo `DISPLAY_NAME` dentro do arquivo `.shardcloud` que está no `.zip`.

## Estrutura do projeto

```
manager/
├── index.js              ← Código principal do bot
├── package.json          ← Dependências
├── .env                  ← Tokens (Discord + ShardCloud)
├── .shardcloud.example   ← Exemplo de config para deploy
├── .gitignore
└── docs/
    ├── _manifest.json
    ├── intro.md          ← Esta página
    └── config.md         ← Configuração
```

## Próximos passos

1. **[Configurar o bot](config.md)** — Como preencher o `.env` e preparar tudo para rodar
