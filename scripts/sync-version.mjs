#!/usr/bin/env node
import fs from "node:fs";

const check = process.argv.includes("--check");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!match) throw new Error(`Unsupported package version: ${pkg.version}`);

const [, major, minorRaw, patchRaw] = match;
const minor = minorRaw.padStart(2, "0");
const patch = Number(patchRaw);
const releaseVersion = `${major}.${minor}${patch ? `.${patch}` : ""}`;
const releaseLabel = `v${releaseVersion}`;
const buildNumber = String(
  Number(major) * 10000 + Number(minorRaw) * 100 + patch,
);

const projectPath = "ios/App/App.xcodeproj/project.pbxproj";
const readmePath = "README.md";
const project = fs.readFileSync(projectPath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");

const marketingMatches = project.match(/MARKETING_VERSION = [^;]+;/g) ?? [];
const buildMatches = project.match(/CURRENT_PROJECT_VERSION = [^;]+;/g) ?? [];
if (marketingMatches.length !== 2 || buildMatches.length !== 2)
  throw new Error("Unexpected Xcode version-setting layout.");

const nextProject = project
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${releaseVersion};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);

const currentHeading = readme.match(/## Current v[^\n]+/);
if (!currentHeading) throw new Error("README current-version heading is missing.");
const nextReadme = readme.replace(currentHeading[0], `## Current ${releaseLabel}`);

if (check) {
  const errors = [];
  if (project !== nextProject)
    errors.push(`Xcode version must be ${releaseVersion} (build ${buildNumber}).`);
  if (readme !== nextReadme)
    errors.push(`README current version must be ${releaseLabel}.`);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Version aligned: ${releaseLabel} / iOS ${releaseVersion} (${buildNumber}) / package ${pkg.version}`);
} else {
  fs.writeFileSync(projectPath, nextProject);
  fs.writeFileSync(readmePath, nextReadme);
  console.log(`Synced ${releaseLabel} / iOS ${releaseVersion} (${buildNumber}) from package ${pkg.version}`);
}
