/**
 * P7-3 / DS-8. The one outbound port for telling the shop something happened.
 *
 * Business code never talks to a mail server. It builds a `NotificationMessage`
 * and hands it to a `NotificationSender`; which sender exists is a validated
 * configuration decision (`NOTIFICATION_TRANSPORT`), exactly like the provider
 * mode switch on the studio adapters in `./studio.ts`.
 *
 * Two senders ship:
 *   - `LogNotificationSender` (`log`, the default): writes the whole message to
 *     the job log and sends nothing. This is the honest state of the shop
 *     today - the Supabase project has no custom SMTP host configured, so there
 *     is no account to send from. It is not a silent drop: the message is
 *     readable in the DigitalOcean runtime log, and the durable truth stays the
 *     operator queue row.
 *   - `SmtpNotificationSender` (`smtp`): a minimal SMTP submission client on
 *     `node:net` / `node:tls`. Deliberately no new dependency - nodemailer
 *     would be a transitive tree for one plain-text message a day.
 *
 * This module lives behind its own package export (`@jewelo/ai/notification`)
 * rather than in the barrel, so the Node built-ins it lazily imports never
 * enter a browser module graph.
 */

import type { Socket } from "node:net";

import type {
  PreviewRequestContact,
  PreviewRequestSpecification,
} from "@jewelo/contracts";
import type { NotificationConfig } from "@jewelo/config";

/** One plain-text message. No HTML, no attachments, no templating engine. */
export interface NotificationMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export interface NotificationResult {
  readonly transport: "log" | "smtp";
  /** False for the log sender: it recorded the message and sent nothing. */
  readonly delivered: boolean;
}

export interface NotificationSender {
  send(message: NotificationMessage): Promise<NotificationResult>;
}

/**
 * Addresses are checked here and not only in configuration, because both the
 * envelope and the headers are built from them: a value carrying CR or LF would
 * be header injection, and a value carrying no `@` would be a rejected envelope
 * discovered at send time instead of at boot.
 */
const ADDRESS = /^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[^\s@<>,;:"]+$/u;

export class InvalidNotificationAddressError extends Error {
  constructor(field: string) {
    super(`notification address is not a plain email address: ${field}`);
    this.name = "InvalidNotificationAddressError";
  }
}

function assertAddress(field: string, value: string): string {
  if (!ADDRESS.test(value)) throw new InvalidNotificationAddressError(field);
  return value;
}

/**
 * The default. Records the message where the operator can read it and reports
 * `delivered: false`, so a caller can never mistake a stub for a sent mail.
 *
 * The body carries the shopper's contact detail, which is the same detail the
 * operator queue already shows to the same operator on the same trust boundary.
 * It is never written to a customer-visible surface.
 */
export class LogNotificationSender implements NotificationSender {
  readonly #write: (line: string, payload: Record<string, unknown>) => void;

  constructor(
    write: (line: string, payload: Record<string, unknown>) => void = (
      line,
      payload,
    ) => console.info(line, payload),
  ) {
    this.#write = write;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    assertAddress("NOTIFICATION_TO", message.to);
    this.#write("notification_logged", {
      transport: "log",
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { transport: "log", delivered: false };
  }
}

export class SmtpNotificationError extends Error {
  constructor(stage: string, detail: string) {
    super(`smtp ${stage} failed: ${detail}`);
    this.name = "SmtpNotificationError";
  }
}

interface SmtpSettings {
  readonly host: string;
  readonly port: number;
  readonly security: "implicit-tls" | "starttls";
  readonly user: string;
  readonly password: string;
  readonly from: string;
  readonly timeoutMs: number;
}

/**
 * SMTP submission, RFC 5321 plus STARTTLS and AUTH, and nothing else.
 *
 * The credential never enters a log line or an error message: every failure
 * reports the stage and the server's own reply code, and the AUTH command
 * arguments are the only thing this class deliberately does not echo.
 */
export class SmtpNotificationSender implements NotificationSender {
  readonly #settings: SmtpSettings;

  constructor(settings: SmtpSettings) {
    this.#settings = {
      ...settings,
      from: assertAddress("NOTIFICATION_FROM", settings.from),
    };
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    const to = assertAddress("NOTIFICATION_TO", message.to);
    const session = await openSmtpSession(this.#settings);
    try {
      await session.command(
        `MAIL FROM:<${this.#settings.from}>`,
        [250],
        "MAIL FROM",
      );
      await session.command(`RCPT TO:<${to}>`, [250, 251], "RCPT TO");
      await session.command("DATA", [354], "DATA");
      await session.data(
        renderMessage({
          from: this.#settings.from,
          to,
          subject: message.subject,
          text: message.text,
        }),
      );
      await session.command("QUIT", [221], "QUIT").catch(() => undefined);
      return { transport: "smtp", delivered: true };
    } finally {
      session.close();
    }
  }
}

/** Chooses the sender from validated configuration. No literals, no guessing. */
export function createNotificationSender(
  config: NotificationConfig,
): NotificationSender {
  if (config.NOTIFICATION_TRANSPORT === "log") return new LogNotificationSender();
  return new SmtpNotificationSender({
    host: config.NOTIFICATION_SMTP_HOST ?? "",
    port: config.NOTIFICATION_SMTP_PORT,
    security: config.NOTIFICATION_SMTP_SECURITY,
    user: config.NOTIFICATION_SMTP_USER ?? "",
    password: config.NOTIFICATION_SMTP_PASSWORD ?? "",
    from: config.NOTIFICATION_FROM ?? "",
    timeoutMs: config.NOTIFICATION_SMTP_TIMEOUT_MS,
  });
}

/* -------------------------------------------------------------------------- */
/* What the shop is told                                                       */
/* -------------------------------------------------------------------------- */

export interface PreviewRequestNotificationInput {
  readonly requestId: string;
  readonly locale: "en" | "ar";
  readonly createdAt: string;
  readonly specification: PreviewRequestSpecification;
  readonly contact: PreviewRequestContact;
  /** Absolute link to the operator queue, built from `NEXT_PUBLIC_APP_URL`. */
  readonly queueUrl: string;
}

const CONTACT_CHANNEL_WORDS: Record<PreviewRequestContact["channel"], string> = {
  whatsapp: "WhatsApp",
  phone: "Phone",
  email: "Email",
};

/**
 * The message an operator reads on their phone in the shop. Every choice is in
 * words, never an id or an enum key, and the vocabulary is the shopper's own
 * (`docs/OMRAN-BUSINESS-CONTEXT.md`): a customer asked for a piece of gold.
 */
export function previewRequestNotificationMessage(
  input: PreviewRequestNotificationInput,
  to: string,
): NotificationMessage {
  const specification = input.specification;
  const names = specification.names.join(" and ");
  const stones =
    specification.stones.coverage === "No stones"
      ? "no stones"
      : `${specification.stones.coverage.toLowerCase()}${
          specification.stones.gemstone
            ? `, ${specification.stones.gemstone.toLowerCase()}`
            : ""
        }`;
  const lines = [
    `A new request came in from the shop screen for ${names}.`,
    "",
    `Name as typed: ${specification.names.join(" + ")}`,
    `Language: ${specification.script}`,
    `Shop screen: ${input.locale === "ar" ? "Arabic" : "English"}`,
    `Construction: ${specification.construction}`,
    `Lettering: ${specification.lettering}`,
    ...(specification.layout ? [`Layout: ${specification.layout}`] : []),
    `Gold: ${specification.gold.karat} ${specification.gold.color.toLowerCase()}`,
    `Stones: ${stones}`,
    `Width: ${specification.pendantWidthMm} mm`,
    `Chain: ${specification.chainStyle.toLowerCase()}`,
    ...(specification.engraving
      ? [`Engraving: ${specification.engraving}`]
      : []),
    ...(specification.specialRequests
      ? [`Asked for: ${specification.specialRequests}`]
      : []),
    "",
    `Contact by ${CONTACT_CHANNEL_WORDS[input.contact.channel]}: ${input.contact.value}`,
    ...(input.contact.name ? [`Customer name given: ${input.contact.name}`] : []),
    `Received: ${input.createdAt}`,
    "",
    `Open the queue: ${input.queueUrl}`,
    `Request: ${input.requestId}`,
  ];
  return {
    to,
    subject: `New request - ${specification.names.join(" + ")} - ${specification.construction}`,
    text: lines.join("\n"),
  };
}

/* -------------------------------------------------------------------------- */
/* Minimal SMTP submission                                                     */
/* -------------------------------------------------------------------------- */

interface SmtpReply {
  readonly code: number;
  readonly text: string;
}

interface SmtpSession {
  command(line: string, expected: number[], stage: string): Promise<SmtpReply>;
  data(body: string): Promise<SmtpReply>;
  close(): void;
}

/**
 * Type-only, so the `node:net` import is erased at compile time and the runtime
 * import below stays the single lazy entry point into the Node built-ins.
 */
type Duplex = Socket;

/**
 * Splits the stream into replies. A reply ends on the first line whose fourth
 * character is a space rather than a hyphen, which is the whole of the
 * multiline rule in RFC 5321 section 4.2.1.
 */
function replyReader(socket: Duplex, timeoutMs: number) {
  let buffer = "";
  let group: string[] = [];
  const ready: SmtpReply[] = [];
  let resolveNext: ((reply: SmtpReply) => void) | null = null;
  let rejectNext: ((error: Error) => void) | null = null;
  let failure: Error | null = null;

  const deliver = (reply: SmtpReply) => {
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      rejectNext = null;
      resolve(reply);
    } else ready.push(reply);
  };
  const fail = (error: Error) => {
    failure ??= error;
    if (rejectNext) {
      const reject = rejectNext;
      resolveNext = null;
      rejectNext = null;
      reject(error);
    }
  };

  socket.setEncoding("utf8");
  socket.setTimeout(timeoutMs, () =>
    fail(new SmtpNotificationError("read", `no reply within ${timeoutMs} ms`)),
  );
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    for (let index = buffer.indexOf("\r\n"); index >= 0; index = buffer.indexOf("\r\n")) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      group.push(line);
      if (/^\d{3} /u.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), text: group.join("\n") };
        group = [];
        deliver(reply);
      }
    }
  });
  socket.on("error", (error: Error) =>
    fail(new SmtpNotificationError("transport", error.message)),
  );
  socket.on("close", () =>
    fail(new SmtpNotificationError("transport", "connection closed")),
  );

  return {
    next(): Promise<SmtpReply> {
      const queued = ready.shift();
      if (queued) return Promise.resolve(queued);
      if (failure) return Promise.reject(failure);
      return new Promise<SmtpReply>((resolve, reject) => {
        resolveNext = resolve;
        rejectNext = reject;
      });
    },
  };
}

async function openSmtpSession(settings: SmtpSettings): Promise<SmtpSession> {
  const net = await import("node:net");
  const tls = await import("node:tls");

  const connect = (): Promise<Duplex> =>
    new Promise((resolve, reject) => {
      const socket =
        settings.security === "implicit-tls"
          ? tls.connect({
              host: settings.host,
              port: settings.port,
              servername: settings.host,
            })
          : net.createConnection({ host: settings.host, port: settings.port });
      const onError = (error: Error) =>
        reject(new SmtpNotificationError("connect", error.message));
      socket.once("error", onError);
      socket.once(
        settings.security === "implicit-tls" ? "secureConnect" : "connect",
        () => {
          socket.removeListener("error", onError);
          resolve(socket as Duplex);
        },
      );
    });

  let socket = await connect();
  let reader = replyReader(socket, settings.timeoutMs);

  const expect = async (
    expected: number[],
    stage: string,
  ): Promise<SmtpReply> => {
    const reply = await reader.next();
    if (!expected.includes(reply.code))
      throw new SmtpNotificationError(stage, `server replied ${reply.code}`);
    return reply;
  };
  const write = (line: string) =>
    new Promise<void>((resolve, reject) => {
      socket.write(`${line}\r\n`, (error) =>
        error
          ? reject(new SmtpNotificationError("write", error.message))
          : resolve(),
      );
    });
  const command = async (line: string, expected: number[], stage: string) => {
    await write(line);
    return expect(expected, stage);
  };

  await expect([220], "greeting");
  const hostname = "jewelo";
  let greeting = await command(`EHLO ${hostname}`, [250], "EHLO");

  if (settings.security === "starttls") {
    await command("STARTTLS", [220], "STARTTLS");
    const plain = socket;
    socket = await new Promise<Duplex>((resolve, reject) => {
      const secure = tls.connect(
        { socket: plain, servername: settings.host },
        () => resolve(secure as unknown as Duplex),
      );
      secure.once("error", (error: Error) =>
        reject(new SmtpNotificationError("STARTTLS", error.message)),
      );
    });
    reader = replyReader(socket, settings.timeoutMs);
    greeting = await command(`EHLO ${hostname}`, [250], "EHLO");
  }

  // AUTH PLAIN when the server offers it, AUTH LOGIN otherwise. The arguments
  // are never logged and never appear in an error.
  const offersPlain = /AUTH[ =][^\n]*PLAIN/iu.test(greeting.text);
  if (offersPlain) {
    const token = Buffer.from(
      `\0${settings.user}\0${settings.password}`,
      "utf8",
    ).toString("base64");
    await command(`AUTH PLAIN ${token}`, [235], "AUTH");
  } else {
    await command("AUTH LOGIN", [334], "AUTH");
    await command(
      Buffer.from(settings.user, "utf8").toString("base64"),
      [334],
      "AUTH",
    );
    await command(
      Buffer.from(settings.password, "utf8").toString("base64"),
      [235],
      "AUTH",
    );
  }

  return {
    command,
    async data(body: string) {
      await write(body);
      return command(".", [250], "message");
    },
    close() {
      socket.destroy();
    },
  };
}

/** RFC 2047 encoded word, so an Arabic name survives a subject header. */
function encodeHeader(value: string): string {
  const plain = value.replace(/[\r\n]/gu, " ");
  return /^[\x20-\x7e]*$/u.test(plain)
    ? plain
    : `=?utf-8?B?${Buffer.from(plain, "utf8").toString("base64")}?=`;
}

/**
 * The body is base64, not 8-bit: an Arabic name is multi-byte, a shopper's
 * special request can exceed the 998-octet line limit, and no base64 line can
 * begin with the dot that would end the DATA block.
 */
function renderMessage(message: {
  from: string;
  to: string;
  subject: string;
  text: string;
}): string {
  const normalized = `${message.text}\n`.replace(/\r?\n/gu, "\r\n");
  const body = Buffer.from(normalized, "utf8")
    .toString("base64")
    .replace(/(.{76})/gu, "$1\r\n");
  return [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}
