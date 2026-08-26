#!/usr/bin/env node
import process from "node:process";

const productionMarker = /(^|[-_ ])(prod|production)($|[-_ ])/;
const targetMarkers = {
  development: /(^|[-_ ])(dev|development)($|[-_ ])/,
  preview: /(^|[-_ ])(preview|branch|pr)($|[-_ ])/,
};

export function verifySupabaseProject(projects, projectRef, target) {
  const project = projects.find((candidate) => candidate.id === projectRef);
  if (!project) {
    throw new Error(
      `Supabase project ref ${projectRef} is not visible to the authenticated account`,
    );
  }
  if (project.region !== "ap-south-1") {
    throw new Error(
      `Supabase project must be in Mumbai (ap-south-1), received ${project.region}`,
    );
  }

  const name = String(project.name ?? "").toLowerCase();
  if (productionMarker.test(name)) {
    throw new Error(
      `Refusing ${target} command: authenticated project name '${project.name}' contains a production marker`,
    );
  }

  const marker = targetMarkers[target];
  if (!marker) throw new Error(`Unsupported Supabase target: ${target}`);
  if (!marker.test(name)) {
    throw new Error(
      `Refusing ${target} command: authenticated project name '${project.name}' lacks an explicit ${target} safety marker`,
    );
  }
}

function proveNegativeFixtures() {
  const project = (name, region = "ap-south-1") => [
    { id: "fixture-ref", name, region },
  ];
  const rejected = [
    [project("jewelo-production-dev"), "fixture-ref", "development"],
    [project("jewelo-prod-preview"), "fixture-ref", "preview"],
    [project("jewelo-development", "us-east-1"), "fixture-ref", "development"],
    [project("jewelo-development"), "missing-ref", "development"],
  ];

  for (const fixture of rejected) {
    let failed = false;
    try {
      verifySupabaseProject(...fixture);
    } catch {
      failed = true;
    }
    if (!failed)
      throw new Error(
        `Unsafe Supabase fixture was accepted: ${fixture[0][0].name}`,
      );
  }

  verifySupabaseProject(
    project("jewelo-development"),
    "fixture-ref",
    "development",
  );
  verifySupabaseProject(project("jewelo-pr-42"), "fixture-ref", "preview");
  console.log("Supabase remote-target negative fixtures passed.");
}

if (process.argv[2] === "--prove-negative") {
  proveNegativeFixtures();
} else {
  const projects = JSON.parse(process.env.JEWELO_PROJECTS_JSON ?? "[]");
  verifySupabaseProject(projects, process.argv[2], process.argv[3]);
}
