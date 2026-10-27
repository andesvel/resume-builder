import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { REPO_URL } from "~/components/layout/site-header";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

import type { Route } from "./+types/agents";

export function meta() {
  return [
    { title: "AI agents (MCP) · Resume Builder" },
    { name: "description", content: "Connect Claude Code, Codex or OpenCode to Resume Builder over MCP to write, edit and export resumes." },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  return { endpoint: `${new URL(request.url).origin}/mcp` };
}

const TOOLS = [
  "describe_options",
  "list_resumes",
  "create_resume",
  "get_resume",
  "update_resume",
  "add_entry",
  "update_entry",
  "remove_entry",
  "move_entry",
  "duplicate_resume",
  "delete_resume",
  "import_resume_json",
  "import_linkedin_export",
  "export_json",
  "export_pdf",
  "get_import_link",
] as const;

function Snippet({ label, code }: { label: string; code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <Button
          variant="ghost"
          size="xs"
          onClick={() =>
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? t("agents.copied") : t("agents.copy")}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Agents({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const { endpoint } = loaderData;

  const snippets = [
    {
      label: "Claude Code",
      code: `claude mcp add --transport http --scope user resume-builder ${endpoint} --header "Authorization: Bearer $RESUME_BUILDER_TOKEN"`,
    },
    {
      label: "Codex (~/.codex/config.toml)",
      code: `[mcp_servers.resume-builder]\nurl = "${endpoint}"\nbearer_token_env_var = "RESUME_BUILDER_TOKEN"`,
    },
    {
      label: "OpenCode (opencode.json)",
      code: JSON.stringify(
        { mcp: { "resume-builder": { type: "remote", url: endpoint, headers: { Authorization: "Bearer {env:RESUME_BUILDER_TOKEN}" } } } },
        null,
        2,
      ),
    },
  ];

  return (
    <main className="mx-auto grid max-w-3xl gap-12 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("agents.title")}</h1>
        <p className="text-lg text-pretty text-muted-foreground">{t("agents.intro")}</p>
      </header>

      <section aria-labelledby="how-title" className="grid gap-3">
        <h2 id="how-title" className="text-xl font-semibold tracking-tight">{t("agents.howTitle")}</h2>
        <ul className="grid list-disc gap-2 pl-5 text-sm leading-relaxed">
          <li>{t("agents.how1")}</li>
          <li>{t("agents.how2")}</li>
          <li>{t("agents.how3")}</li>
        </ul>
      </section>

      <section aria-labelledby="setup-title" className="grid gap-4">
        <h2 id="setup-title" className="text-xl font-semibold tracking-tight">{t("agents.setupTitle")}</h2>
        <div className="grid gap-1 text-sm">
          <p className="font-medium">{t("agents.tokenTitle")}</p>
          <p className="text-muted-foreground">{t("agents.tokenBody")}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t("agents.setupHint")}</p>
        {snippets.map((s) => (
          <Snippet key={s.label} {...s} />
        ))}
        <a href={`${REPO_URL}#use-it-from-an-ai-agent-mcp`} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
          {t("agents.readme")}
        </a>
      </section>

      <section aria-labelledby="tools-title" className="grid gap-3">
        <h2 id="tools-title" className="text-xl font-semibold tracking-tight">{t("agents.toolsTitle")}</h2>
        <dl className="divide-y border-y text-sm">
          {TOOLS.map((tool) => (
            <div key={tool} className="grid gap-1 py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="font-mono text-xs">{tool}</dt>
              <dd className="text-muted-foreground">{t(`agents.tools.${tool}`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="privacy-title" className="grid gap-2">
        <h2 id="privacy-title" className="text-xl font-semibold tracking-tight">{t("agents.privacyTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("agents.privacyBody")}</p>
      </section>
    </main>
  );
}
