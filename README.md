<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:689AF9,100:4ADE9F&amp;height=105&amp;section=header" width="100%" alt="" />

  <img src="./assets/wcag-tester-wide.svg" width="750" alt="Toon's WCAG Tester" />

  <br />

  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=18&duration=3000&pause=1500&color=689AF9&center=true&vCenter=true&width=620&lines=Accessibility.+Automated.;One+framework.+Multiple+projects.;WCAG+2.2+%E2%80%94+A+%2F+AA+%2F+AAA." alt="Accessibility. Automated. One framework. Multiple projects. WCAG 2.2 — A / AA / AAA." />

  <br />

  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js_22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![WCAG](https://img.shields.io/badge/WCAG_2.2-689AF9?style=for-the-badge)
  ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

  [About](#about) ·
  [WCAG Coverage](#wcag-coverage) ·
  [Getting Started](#getting-started) ·
  [CI/CD](#cicd) ·
  [Roadmap](#roadmap)

</div>

---

## About

Toon's WCAG Tester is a modular, framework-independent accessibility testing framework built to evaluate websites against the **Web Content Accessibility Guidelines (WCAG) 2.2**.

Part of a larger Quality Control ecosystem, the project aims to replace duplicated, repository-specific accessibility checks with one centralized testing framework that can be reused across websites and applications.

The goal is to make accessibility a measurable, transparent and continuous part of software development — from local testing to automated CI/CD quality gates.

> [!NOTE]
> This project is under active development. The audit architecture, configuration, CLI, reporting and GitHub Actions workflow are in place. Individual accessibility rules and browser-based testing are not yet implemented as a complete testing suite.

## WCAG Coverage

The framework targets all 86 active WCAG 2.2 success criteria, organized into four principles and 13 guidelines.

| Level | Success criteria | Cumulative criteria |
| :--- | ---: | ---: |
| A | 31 | 31 |
| AA | 24 | 55 |
| AAA | 31 | 86 |

| Principle | Focus |
| :--- | :--- |
| Perceivable | Content that users can perceive |
| Operable | Interfaces that users can operate |
| Understandable | Content and interactions that users can understand |
| Robust | Compatibility with user agents and assistive technologies |

See the [complete criteria reference](docs/WCAG-2.2.md) or the [categorized reference](docs/WCAG-2.2-categorized.md).

> [!IMPORTANT]
> Automated checks alone cannot establish WCAG conformance. The selected target level is not a certification or a confirmed conformance result. Manual verification and the official conformance requirements remain essential.

## Architecture

The framework separates WCAG criteria from their individual testing rules, allowing new checks to be added independently without changing the audit infrastructure.

The audit runner loads project configuration, evaluates enabled categories and success criteria through registered rules, and aggregates results into console and JSON reports.

The framework defines four testing methods: automated, heuristic, assisted and manual. The intent is to automate reliable checks while explicitly identifying requirements that need human judgment.

<details>
<summary><b>Result statuses</b></summary>

<br />

| Status | Meaning |
| :--- | :--- |
| `pass` | Implemented checks passed |
| `fail` | An issue was detected |
| `warning` | A potential issue was identified |
| `review_required` | Human verification is required |
| `not_applicable` | The requirement does not apply |
| `not_tested` | The requirement has not been sufficiently evaluated |
| `disabled` | Excluded by configuration |
| `error` | An execution error occurred |

</details>

## Getting Started

### Requirements

- Node.js 22 or newer
- pnpm

### Installation

```bash
git clone https://github.com/toon-van-berkel/toons-wcag-tester.git
cd toons-wcag-tester
pnpm install
pnpm build
```

### Run an audit

```bash
pnpm start --url https://example.com --target AA
```

Run a specific category:

```bash
pnpm start --url https://example.com --category keyboard-accessible
```

These commands execute the current audit framework. Criteria without registered rules are reported as `not_tested`.

<details>
<summary><b>Available development commands</b></summary>

<br />

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Run the TypeScript entry point |
| `pnpm build` | Compile the framework |
| `pnpm start` | Run the compiled CLI |
| `pnpm check` | Type-check the codebase |
| `pnpm test` | Run the test suite |
| `pnpm test:watch` | Run tests in watch mode |

</details>

## CI/CD

The reusable GitHub Actions workflow enables other repositories to run the centralized tester without maintaining their own accessibility testing infrastructure.

The workflow generates a category matrix, runs enabled categories in parallel, collects their JSON reports and evaluates the CI quality gate.

<details>
<summary><b>Example reusable workflow</b></summary>

<br />

```yaml
name: Accessibility Audit

on:
  workflow_dispatch:

jobs:
  wcag:
    uses: toon-van-berkel/toons-wcag-tester/.github/workflows/wcag.yml@main
    with:
      url: https://example.com
```

Projects can also supply a repository-specific configuration through `config-path`. For stable production workflows, pin the workflow and `tester-ref` to a reviewed version instead of tracking `main`.

</details>

## Project Structure

```text
toons-wcag-tester/
├── .github/workflows/   # Reusable CI workflows
├── assets/              # Visual assets
├── config/              # Default configuration and JSON schema
├── docs/                # WCAG 2.2 references
├── src/
│   ├── categories/      # WCAG guideline modules
│   ├── cli/             # Command-line interface
│   ├── config/          # Configuration resolution and validation
│   ├── core/            # Audit, category, criterion and rule runners
│   ├── registry/        # WCAG and rule registries
│   ├── reporting/       # Console and JSON output
│   └── types/           # Shared TypeScript types
└── tests/               # Framework tests
```

## Roadmap

| Foundation | Status |
| :--- | :---: |
| WCAG criteria and category registries | Implemented |
| Modular audit runners | Implemented |
| Configuration and CLI | Implemented |
| JSON and console reporting | Implemented |
| Reusable CI workflow | Implemented |
| Automated accessibility rules | Planned |
| Browser-based and multi-page testing | Planned |
| Assisted and manual review workflows | Planned |
| A / AA / AAA coverage and conformance assessment | Planned |
| Visual reports and regression tracking | Planned |
| Central Quality Control integration | Planned |

## References

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [WCAG 2.2 Techniques](https://www.w3.org/WAI/WCAG22/Techniques/)

## Contributors

<div align="center">

  <a href="https://github.com/toon-van-berkel/toons-wcag-tester/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=toon-van-berkel/toons-wcag-tester" alt="Contributors" />
  </a>

</div>

---

<div align="center">

  <img src="./assets/toons-wcag-tester-logo-animated.svg" width="60" alt="Toon's WCAG Tester" />

  <br />

  **Accessibility. Automated.**

  Part of the Quality Control ecosystem · [toonvb.com](https://toonvb.com/)

  <img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:689AF9,100:4ADE9F&amp;height=90&amp;section=footer" width="100%" alt="" />

</div>
