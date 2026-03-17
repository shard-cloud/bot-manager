## Pré-requisitos

- Uma **conta na ShardCloud** com API key gerada
- Um **bot do Discord** criado no [Developer Portal](https://discord.com/developers/applications)

## 1. Criar o bot no Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em **New Application** e dê um nome
3. Vá em **Bot** no menu lateral e clique em **Reset Token** para copiar o token
4. Em **OAuth2 → URL Generator**, marque `bot` e `applications.commands`
5. Selecione as permissões necessárias (Send Messages, Use Slash Commands)
6. Use a URL gerada para adicionar o bot ao seu servidor

## 2. Obter a API Key da ShardCloud

1. Acesse o [Dashboard da ShardCloud](https://shardcloud.app/dash)
2. Vá em **Config → Integrations**
3. Gere um novo API token e copie

## 3. Configurar o `.env`

Renomeie ou edite o arquivo `.env` na raiz do projeto com seus tokens:

```env
DISCORD_TOKEN=seu_token_do_discord_aqui
SHARD_API_KEY=sua_api_key_da_shardcloud_aqui
```

| Variável        | Descrição                                       |
| --------------- | ----------------------------------------------- |
| `DISCORD_TOKEN` | Token do bot obtido no Discord Developer Portal |
| `SHARD_API_KEY` | API key gerada no dashboard da ShardCloud       |

## 4. Instalar dependências

```bash
npm install
```

Isso instala:

- `discord.js` — Biblioteca do Discord
- `better-sqlite3` — Banco de dados SQLite
- `dotenv` — Carrega variáveis do `.env`
- `jszip` — Leitura de arquivos `.zip`

## 5. Rodar o bot

```bash
npm start
```

Na primeira execução o bot vai:

1. Criar o banco `apps.db` automaticamente
2. Registrar os slash commands (`/apps` e `/create`)
3. Conectar ao Discord

## Arquivo `.shardcloud`

Para criar ou fazer commit de um app, o usuário precisa enviar um `.zip` contendo:

- O código do app (ex: `index.js`)
- Um arquivo `.shardcloud` na raiz do zip

O `.shardcloud` é um arquivo de texto simples com a configuração do deploy. Exemplo:

```
DISPLAY_NAME=Meu Bot
MAIN=index.js
MEMORY=512
VERSION=recommended
```

### Parâmetros disponíveis

| Parâmetro        | Obrigatório | Descrição                                        |
| ---------------- | ----------- | ------------------------------------------------ |
| `DISPLAY_NAME`   | Sim         | Nome do app (máx. 50 caracteres)                 |
| `MAIN`           | Condicional | Arquivo principal (ignorado se `CUSTOM_COMMAND`) |
| `MEMORY`         | Sim         | RAM em MB (ex: `256`, `512`, `1024`)             |
| `VERSION`        | Sim         | `recommended` ou `latest`                        |
| `LANGUAGE`       | Não         | `node`, `python`, `java`, `go`, `static`, `php`  |
| `DESCRIPTION`    | Não         | Descrição do app (máx. 1024 caracteres)          |
| `SUBDOMAIN`      | Não         | Subdomínio para web apps (`xyz.shardweb.app`)    |
| `CUSTOM_COMMAND` | Não         | Comando customizado de inicialização             |

### Exemplos de configuração

**Bot Node.js simples:**

```
DISPLAY_NAME=Meu Discord Bot
MAIN=index.js
MEMORY=512
VERSION=recommended
```

**App Python com comando customizado:**

```
DISPLAY_NAME=API Flask
LANGUAGE=python
MEMORY=1024
VERSION=latest
CUSTOM_COMMAND=pip install -r requirements.txt && python app.py
```

**Website estático:**

```
DISPLAY_NAME=Meu Site
LANGUAGE=static
MEMORY=256
VERSION=recommended
SUBDOMAIN=meusite
```

## Deploy deste bot na ShardCloud

Para hospedar este próprio bot na ShardCloud, veja o arquivo `.shardcloud.example` na raiz do projeto. Basta:

1. Criar um `.zip` com `index.js`, `package.json`, `.env` e `.shardcloud`
2. Usar o dashboard ou CLI da ShardCloud para fazer o deploy

Ou use o próprio bot para se auto-hospedar via `/create`.
