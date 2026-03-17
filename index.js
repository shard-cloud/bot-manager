const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  REST,
  Routes,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  LabelBuilder,
  FileUploadBuilder,
  MessageFlags,
} = require("discord.js");
const Database = require("better-sqlite3");
require("dotenv").config();
const SHARD_API = "https://shardcloud.app/api";
const db = new Database("apps.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS user_apps (
    discord_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_name TEXT DEFAULT 'Unnamed',
    PRIMARY KEY (discord_id, app_id)
  )
`);

const stmts = {
  getByUser: db.prepare("SELECT * FROM user_apps WHERE discord_id = ?"),
  insert: db.prepare(
    "INSERT OR REPLACE INTO user_apps (discord_id, app_id, app_name) VALUES (?, ?, ?)",
  ),
  deleteApp: db.prepare("DELETE FROM user_apps WHERE app_id = ?"),
  deleteAllUser: db.prepare("DELETE FROM user_apps WHERE discord_id = ?"),
};

async function shard(path, opts = {}) {
  const res = await fetch(`${SHARD_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.SHARD_API_KEY}`,
      ...opts.headers,
    },
  });
  return res;
}

async function getApps() {
  const r = await shard("/apps");
  if (!r.ok) return [];
  return r.json();
}

async function setAppStatus(appId, status) {
  const r = await shard(`/apps/${appId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return r.json();
}

async function deleteApp(appId) {
  const r = await shard(`/apps/${appId}`, { method: "DELETE" });
  return r.json();
}

async function createApp(zipBuf) {
  const form = new FormData();
  form.append(
    "project",
    new Blob([zipBuf], { type: "application/zip" }),
    "project.zip",
  );
  const r = await shard("/apps", { method: "POST", body: form });
  return r.json();
}

async function commitApp(appId, zipBuf) {
  const form = new FormData();
  form.append(
    "project",
    new Blob([zipBuf], { type: "application/zip" }),
    "project.zip",
  );
  const r = await shard(`/apps/${appId}/file`, { method: "PUT", body: form });
  return r.json();
}

async function downloadAttachment(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download attachment");
  return Buffer.from(await res.arrayBuffer());
}

function parseConfigName(zipBuf) {
  const JSZip = require("jszip");
  return JSZip.loadAsync(zipBuf)
    .then(async (zip) => {
      const shardFile = zip.file(".shardcloud");
      if (!shardFile) return null;
      const content = await shardFile.async("string");
      const match = content.match(/DISPLAY_NAME=(.+)/);
      return match ? match[1].trim() : null;
    })
    .catch(() => null);
}

const STATUS_ICON = {
  running: "🟢",
  stopped: "🔴",
  pending: "🟡",
  not_found: "⚫",
};
const icon = (s) => STATUS_ICON[s] || "⚪";

function appLine(a) {
  const name = a.app?.name || "Unnamed";
  const status = a.status || "unknown";
  const ram = a.app?.ram || "?";
  const lang = a.app?.language || "?";
  const id = a.app?.id || "?";
  return `${icon(status)} **${name}**\n-# \`${id}\`\n-# ${lang} · ${ram}MB · ${status}`;
}

function projectUploadModal(customId, title) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Project ZIP")
        .setDescription(
          "Upload a .zip with your code and .shardcloud config inside",
        )
        .setFileUploadComponent(
          new FileUploadBuilder().setCustomId("project_zip").setRequired(true),
        ),
    );
}

async function buildAppPage(userId, page) {
  const rows = stmts.getByUser.all(userId);
  if (!rows.length) {
    return v2Msg(
      new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "You have no apps yet. Use `/create` to get started.",
          ),
        ),
    );
  }

  const allApps = await getApps();
  const ownedIds = new Set(rows.map((r) => r.app_id));
  const filtered = allApps.filter((a) => ownedIds.has(a.app?.id));

  if (!filtered.length) {
    stmts.deleteAllUser.run(userId);
    return v2Msg(
      new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "No apps found on ShardCloud. They may have been deleted externally.",
          ),
        ),
    );
  }

  const total = filtered.length;
  const idx = Math.max(0, Math.min(page, total - 1));
  const app = filtered[idx];
  const appId = app.app.id;

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`start:${appId}`)
      .setLabel("Start")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`stop:${appId}`)
      .setLabel("Stop")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`restart:${appId}`)
      .setLabel("Restart")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`commit:${appId}`)
      .setLabel("Commit")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`delete:${appId}`)
      .setLabel("Delete")
      .setStyle(ButtonStyle.Danger),
  );

  const pagination = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`page:${idx - 1}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === 0),
    new ButtonBuilder()
      .setCustomId("page_indicator")
      .setLabel(`${idx + 1} / ${total}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`page:${idx + 1}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === total - 1),
  );

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## ☁️ Your ShardCloud Apps"),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(appLine(app)))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(actions)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(pagination);

  return v2Msg(container);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("apps")
      .setDescription("View and manage your ShardCloud apps"),

    new SlashCommandBuilder()
      .setName("create")
      .setDescription("Create a new ShardCloud app"),
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands,
  });
  console.log("Slash commands registered.");
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand())
      return await handleCommand(interaction);
    if (interaction.isButton()) return await handleButton(interaction);
    if (interaction.isModalSubmit()) return await handleModal(interaction);
  } catch (err) {
    console.error(err);
    const msg = `Something went wrong: ${err.message}`;
    if (interaction.deferred || interaction.replied) {
      await interaction
        .editReply(v2Msg(resultContainer(msg, false)))
        .catch(() => {});
    } else {
      await interaction
        .reply({
          ...v2Msg(resultContainer(msg, false)),
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        })
        .catch(() => {});
    }
  }
});

async function handleCommand(interaction) {
  if (interaction.commandName === "apps") return cmdApps(interaction);
  if (interaction.commandName === "create") return cmdCreate(interaction);
}

async function cmdApps(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  const payload = await buildAppPage(interaction.user.id, 0);
  await interaction.editReply(payload);
}

async function cmdCreate(interaction) {
  await interaction.showModal(
    projectUploadModal("modal_create", "Create New App"),
  );
}

async function handleButton(interaction) {
  const [action, value] = interaction.customId.split(":");

  if (action === "page") {
    await interaction.deferUpdate();
    const page = parseInt(value, 10);
    const payload = await buildAppPage(interaction.user.id, page);
    return interaction.editReply(payload);
  }

  if (action === "commit") {
    return interaction.showModal(
      projectUploadModal(`modal_commit:${value}`, "Commit Code"),
    );
  }

  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  if (action === "start") {
    const res = await setAppStatus(value, "run");
    return interaction.editReply(
      v2Msg(resultContainer(res.message || res.error, !res.error)),
    );
  }

  if (action === "stop") {
    const res = await setAppStatus(value, "stop");
    return interaction.editReply(
      v2Msg(resultContainer(res.message || res.error, !res.error)),
    );
  }

  if (action === "restart") {
    const res = await setAppStatus(value, "restart");
    return interaction.editReply(
      v2Msg(resultContainer(res.message || res.error, !res.error)),
    );
  }

  if (action === "delete") {
    const res = await deleteApp(value);
    if (!res.error) stmts.deleteApp.run(value);
    return interaction.editReply(
      v2Msg(
        resultContainer(res.message || res.error || "App deleted.", !res.error),
      ),
    );
  }
}

async function handleModal(interaction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const fileField = interaction.fields.getField("project_zip");
  const attachment = fileField.attachments?.first?.() ?? fileField.files?.[0];

  if (!attachment?.url) {
    return interaction.editReply(
      v2Msg(resultContainer("No file uploaded.", false)),
    );
  }

  const zipBuf = await downloadAttachment(attachment.url);

  if (interaction.customId === "modal_create") {
    const appName = (await parseConfigName(zipBuf)) || "Unnamed";
    const res = await createApp(zipBuf);

    if (res.id) {
      stmts.insert.run(interaction.user.id, res.id, appName);
      return interaction.editReply(
        v2Msg(
          new ContainerBuilder()
            .setAccentColor(0x57f287)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### ✅ App Created\n**${appName}**\n-# \`${res.id}\``,
              ),
            ),
        ),
      );
    }

    return interaction.editReply(
      v2Msg(resultContainer(res.error || "Failed to create app.", false)),
    );
  }

  if (interaction.customId.startsWith("modal_commit:")) {
    const appId = interaction.customId.replace("modal_commit:", "");
    const res = await commitApp(appId, zipBuf);
    return interaction.editReply(
      v2Msg(
        resultContainer(
          res.message || res.error || "Commit failed.",
          !res.error,
        ),
      ),
    );
  }
}

function v2Msg(container) {
  return { components: [container], flags: [MessageFlags.IsComponentsV2] };
}

function resultContainer(text, success = true) {
  return new ContainerBuilder()
    .setAccentColor(success ? 0x57f287 : 0xed4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${success ? "✅" : "❌"} ${text}`),
    );
}

client.login(process.env.DISCORD_TOKEN);
