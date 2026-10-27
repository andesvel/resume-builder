import type { Locale } from "~/i18n/config";

import { type Resume, type ResumeInput, resumeSchema } from "./schema";

export function createResume(input: ResumeInput = {}): Resume {
  return resumeSchema.parse(input);
}

/** Parse untrusted data (imports, storage) into a resume, or `null` if it is not one. */
export function parseResume(data: unknown): Resume | null {
  const result = resumeSchema.safeParse(data);
  return result.success ? result.data : null;
}

/** Copy a resume under a new identity (used by import and duplicate). */
export function cloneResume(resume: Resume, overrides: Partial<Resume> = {}): Resume {
  const now = new Date().toISOString();
  return { ...structuredClone(resume), id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...overrides };
}

export function createSampleResume(locale: Locale): Resume {
  const es = locale === "es";
  return createResume({
    title: es ? "CV de ejemplo" : "Sample resume",
    locale,
    basics: {
      name: "Jane Doe",
      headline: es ? "Ingeniera de software sénior" : "Senior Software Engineer",
      email: "jane.doe@example.com",
      phone: "+1 555 000 1234",
      location: "Austin, TX",
      summary: es
        ? "Ingeniera de software con más de 8 años construyendo sistemas distribuidos, herramientas para desarrolladores y pipelines de datos. Lidero equipos multidisciplinarios y me motiva la experiencia de desarrollo."
        : "Software engineer with 8+ years building distributed systems, developer tools and data pipelines. Leads cross-functional teams and cares deeply about developer experience.",
      links: [
        { label: "LinkedIn", url: "linkedin.com/in/example" },
        { label: "GitHub", url: "github.com/example" },
      ],
    },
    experience: [
      {
        company: "Horizon Technologies",
        role: es ? "Ingeniera de software Staff" : "Staff Software Engineer",
        location: "Austin, TX",
        startDate: "2023-01",
        current: true,
        highlights: es
          ? [
              "Diseñé un pipeline de ingesta orientado a eventos que procesa más de 12M de eventos/día con latencia p99 menor a 100 ms",
              "Lideré un equipo de 5 personas para lanzar una plataforma de feature flags adoptada por más de 40 equipos",
            ]
          : [
              "Architected an event-driven ingestion pipeline processing 12M+ events/day with sub-100ms p99 latency",
              "Led a team of 5 to ship a self-service feature-flag platform adopted by 40+ internal teams",
            ],
      },
      {
        company: "Nimbus Cloud",
        role: es ? "Ingeniera de software sénior" : "Senior Software Engineer",
        location: "Remote",
        startDate: "2020-04",
        endDate: "2022-12",
        highlights: es
          ? ["Construí un API gateway multi-tenant que atiende más de 5M de solicitudes/día con 99,95 % de disponibilidad"]
          : ["Built a multi-tenant API gateway serving 5M+ requests/day at 99.95% uptime"],
      },
    ],
    education: [
      {
        institution: "University of Texas at Austin",
        degree: es ? "Licenciatura" : "B.S.",
        field: es ? "Ciencias de la Computación" : "Computer Science",
        startDate: "2013",
        endDate: "2017",
      },
    ],
    skills: [
      { name: es ? "Lenguajes" : "Languages", keywords: ["TypeScript", "Go", "Python", "SQL"] },
      { name: es ? "Infraestructura" : "Infrastructure", keywords: ["AWS", "Kubernetes", "Terraform", "PostgreSQL"] },
    ],
    languages: [
      { language: es ? "Inglés" : "English", fluency: es ? "Nativo" : "Native" },
      { language: es ? "Español" : "Spanish", fluency: es ? "Profesional" : "Professional" },
    ],
  });
}
