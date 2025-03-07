<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.assets/atlas-logo-dark.svg">
  <img align="right" src="./.assets/atlas-logo-light.svg" alt="Atlas Explorer" height="70" title="Atlas Explorer">
</picture>

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://www.tldrlegal.com/license/mit-license)
[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)

<br/>
<br/>

# Graph Prototype: Atlas Explorer

## 1. Overview

> [!IMPORTANT]
> - This experiment was developed on the instruction of [HDRUK](https://www.hdruk.ac.uk/)'s [Disease Atlas](https://www.ucl.ac.uk/health-informatics/research/disease-atlas) team, a project being built alongside the [BHF Data Science Centre](https://bhfdatasciencecentre.org/) and [NHS Digital](https://digital.nhs.uk/)

This repository implements a WebGl2-based FDG graph to enable users to navigate each of the diseases/medications defined within the Human Atlas of Disease; both drawing and graph layout is handled on the GPU.

## 2. TODO

1. Data ingress
    - [ ] Discuss with web team as to which method of data fetching they would prefer, _e.g._ iterative API queries supported by some endpoint to retrieve node/edge/disease/medication data, or would we prefer to serialise & compress data before streaming to client via IPC?
    - [ ] Fetching methods & processing will need to be updated once a decision is realised

2. Finalise implementation
    - [ ] Review current functionality, iterate on design & interactivity guided by feedback from HDRUK _et al_
    - [ ] Complete gpu implementation required for production, _e.g._ state management & caching shaders
    - [ ] Merge Python data processor with this monorepo

3. Finalise package
    - [ ] Inquire about bundler & test framework preference of downstream consumers:
        - [ ] Add bundler, set up publication GH action
        - [ ] Consider adding e2e testing and unit tests,
    - [ ] Cleanup project _incl._ finalising documentation
    - [ ] Add CI/CD, storybook +/- docusaurus/TSdoc _etc_

## 3. Project

### 3.1. Structure & Content

The project structure is composed as a monorepo, or [turborepo](https://turbo.build/), such that:

```mermaid
graph TD
    A[@atlas-explorer] --> B[apps]
    B --> C[docs]
    B --> D[web]
    A --> E[packages]
    E --> F[@atlas-explorer/graphs]
    E --> G[@atlas-explorer/force-graph]
```

The project is broadly divided into the following directories:

1. `apps` - example integration(s) and/or a generated documentation app

2. `packages` - component packages


### 3.2. Technology & Implementation

This application was developed with:

| Type       | Details            |
|------------|--------------------|
| Stack      | [NextJS](https://www.solidjs.com/) & [React](https://react.dev/) |
| Languages  | [TypeScript](https://www.typescriptlang.org/) & [GLSL](https://learnopengl.com/Getting-started/Shaders) |
| Tooling    | [Turbo](https://turbo.build/), [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) |


## 4. Usage

> [!CAUTION]
> Please note that you will need the Atlas dataset to use this app:
>   - This app requires the pre-processed `state.explorer.json` file to display datapoints (or 3x input data files when simulating)
>   - For BHF/HDRUK users, please find a pre-prepared example in the _assoc._ files accessible via the Citrix VM

### 4.1. Prerequisites

1. Install [git](https://git-scm.com/)
    - Instructions on installing `git` for different platforms can be found [here](https://github.com/git-guides/install-git)

2. Download the Javascript runtime
    - Install [Node.JS](https://nodejs.org/en) and [npm](https://www.npmjs.com/) - note that installing `node` would usually install `npm` alongside it
    - Either download the prebuilt installer [here](https://nodejs.org/en/download/prebuilt-installer) or consider downloading [nvm](https://github.com/nvm-sh/nvm) instead to manage your `node` install

### 4.2. Cloning

1. Open a terminal and navigate to a directory in which you'd like to install the app, _e.g._ `cd /some/path/to/folder`

2. Enter the following into your terminal to clone the repository:
```bash
$ git clone https://github.com/JackScanlon/atlas-explorer.git
```

### 4.3. Local Development

> [!CAUTION]
> - Production build instructions TBC, need to determine which build & bundlers tools are most familiar to the downstream consumers

1. Open a terminal and navigate to the project directory, e.g. `cd /path/to/atlas-explorer`

2. Install the application dependencies first by running the following:
```bash
$ npm install
```

3. To host the app locally enter the following:
```bash
$ npm run dev
```

3. The application will now be accessible at [http://localhost:3000](http://localhost:3000/)
