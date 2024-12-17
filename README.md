<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./src/assets/atlas-logo-dark.svg">
  <img align="right" src="./src/assets/atlas-logo-light.svg" alt="Atlas Explorer" height="70" title="Atlas Explorer">
</picture>

[![Project Inactive - moving to Network Graph prototype](https://img.shields.io/badge/Moved:-Network%20Graph%20WIP-red)](#prototype-atlas-explorer)
[![Project Status: Suspended – Initial development has started, but there has not yet been a stable, usable release; work has been stopped for the time being but the author(s) intend on resuming work.](https://www.repostatus.org/badges/latest/suspended.svg)](https://www.repostatus.org/#suspended)

<br/>
<br/>

# Prototype: Atlas Explorer

> [!CAUTION]
> - This implementation has been suspended in favour of the network graph prototype

## 1. Overview

> [!IMPORTANT]
> - This experiment was developed on the instruction of [HDRUK](https://www.hdruk.ac.uk/)'s [Disease Atlas](https://www.ucl.ac.uk/health-informatics/research/disease-atlas) team, a project being built alongside the [BHF Data Science Centre](https://bhfdatasciencecentre.org/) and [NHS Digital](https://digital.nhs.uk/)

This repository implements a 3d data explorer to allow users to navigate through each of the diseases defined within the Disease Atlas.

## 2. Technology & Implementation

This application was developed with:

| Type       | Details            |
|------------|--------------------|
| Tech Stack | [SolidJS](https://www.solidjs.com/) & [Three.JS](https://github.com/mrdoob/three.js) |
| Languages  | [TypeScript](https://www.typescriptlang.org/) & [GLSL](https://learnopengl.com/Getting-started/Shaders)  |
| Tooling    | [Vite](https://vite.dev/)               |


## 3. Usage

> [!CAUTION]
> Please note that you will need the Atlas dataset to use this app:
>   - This app requires the pre-processed `explorer-data.json` file to display datapoints
>   - See `.processing/create_data.R` to process & produce the `json` data output file

### 3.1. Prerequisites

1. Install [git](https://git-scm.com/)
    - Instructions on installing `git` for different platforms can be found [here](https://github.com/git-guides/install-git)

2. Download the Javascript runtime
    - Install [Node.JS](https://nodejs.org/en) and [npm](https://www.npmjs.com/) - note that installing `node` would usually install `npm` alongside it
    - Either download the prebuilt installer [here](https://nodejs.org/en/download/prebuilt-installer) or consider downloading [nvm](https://github.com/nvm-sh/nvm) instead to manage your `node` install

### 3.2. Cloning

1. Open a terminal and navigate to a directory in which you'd like to install the app, _e.g._ `cd /some/path/to/folder`

2. Enter the following into your terminal to clone the repository:
```bash
$ git clone https://github.com/JackScanlon/atlas-explorer.git
```

### 3.3. Local Development

1. Open a terminal and navigate to the project directory, e.g. `cd /path/to/atlas-explorer`

2. Install the application dependencies first by running the following:
```bash
$ npm install
```

3. To host the app locally enter the following:
```bash
$ npm run dev
```

3. The application will now be accessible at [http://localhost:8000](http://localhost:8000/)

### 3.4. Building for Production

1. The following command builds/bundles the app for production into the `dist` folder:
```bash
$ npm run build
```

2. Enter the following to preview the `prod` build, and then visit [http://localhost:4173](http://localhost:4173)
```bash
$ npm run preview
```


## 4. Notes & Changelog

> [!NOTE]
> - The following describes the changes & decisions made to the implementation across meeting(s)

### 4.1. Initial Plan & Implementation

1. [x] Implement base site

2. [x] Implement base renderer & scene

3. [x] Parse R data
    - Column processing
        - Add: `[ORGAN]`, `[CATEGORY]`, `[SEX]` _etc_
    - Output targets
        - Json: jsonify as `explorer-data.json`
        - Zip: create encrypted archive

4. [x] Parse the JSON data
    - Create clusters of points from categories; need to fake the rotation on cat
    - X / Y is age / prev etc

5. [x] Add three UI/UX buttons

    | Button       | Functionality                                         |
    |--------------|-------------------------------------------------------|
    | Search       | Search available phenotypes, retarget scene to object |
    | Camera Reset | Reset camera to scene origin                          |
    | Theme Switch | Toggle Light / Dark themes for accessibility          |

6. [x] Add in ability to interact with objects
    - [x] project 3d->2d
    - [x] hover tooltip render
    - [x] object click to info panel

7. [x] Impl. search functionality
    - [x] Allow search by name, show list of results
    - [x] Selection should zoom + open new panel

8. [x] Camera tween on focus
    - Click world object to zoom (zoom btn also on the panel in case they move away) - need to tween cam towards object

9. [x] Impl. axes
    - Implement basic axes with intention to update later

10. [x] Finalise design
    - [x] Impl. version component
    - [x] Impl. hover effect for button(s)?

### 4.2. First Meeting & Plan

> [!TIP]
> - Implementation was discussed & reviewed on 11th November 2024
> - It was agreed that changes would be implemented by 19th November 2024; follow-up meeting at 11am on the same date

1. [x] Attempt to render SMR prev / Mortality measure(s)
    - [x] Determine whether incl. in current dataset; if not, send Harry an e-mail
    - [x] Await access to data after discussing with Harry

2. [x] Change branding
    - [x] Remove current branding & apply "Atlas Explorer" title
    - [x] Create new temporary logo in Inkscape

3. [x] UX changes
    - [x] Improve camera tween interp & easing
    - [x] Improve input handling

4. [x] Render step improvements
    - [x] Update tooltip position when tweening if pointer isn't moved

5. [x] Update Tooltip / Version / Search CSS
    - [x] No selection
    - [x] No pointer clickthrough on elements above canvas
    - [x] Ensure context menu & wheel scrolling functions in select / card components
    - [x] Thin scrollbar & theme on searchbar

6. [x] Apply animation to presentation card on display

7. [x] Tween improvements
    - [x] Allow cancellation
    - [x] Camera focus tween dependent on distance travelled

8. [x] Use Hovercard-like interface instead of Tooltip
    - [x] Fix Z-fighting of elements
    - [x] Improve style reactivity
    - [x] Display subset of card information on hover
    - [x] Mini/Maximisable

9. [x] Dataset loading changes
    - [x] Implement spreading
        - Revisit data loader
        - Impl. spreading across angle interval

    - [x] Compute domain & intervals:
        - Intervals for `Age`
        - Log10 intervals for `Frequency`

10. [x] Implement new axes
    - [x] Base axes
        - [x] Compute interval
        - [x] Render radial axes in reference to `Age` field, i.e. 2d circle (line) geometry for each interval
        - [x] Render vertical axes in reference to `Frequency` field, i.e. 2d line geometry

    - [x] Interaction
        - [x] Use `closestPointOnRay` instead of `closestPointOnCircle` - better UX flow on linear axis than radial
        - [x] Track axes intersection to display `(x, y)` at coordinate along the line on both horizontal & vertical plane(s)

11. [x] Implement header:
    - [x] Await resources for search

    - [x] Filter controls
      - [x] Dropdown component design & responsivity
      - [x] Impl. UI to toggle visibility by Speciality
      - [x] Update shaders to incl. an alpha channel for those toggled
      - [x] Add button to user controls to allow each axes to be toggle individually

12. [x] Update presentation card:
    - [x] Improve card responsivity & layout
    - [x] URL to disease atlas website using slug
    - [x] Add virtualised lists that displays related Phecodes e.g. related organ target

13. [x] Start-up animation
    - [x] Tween scene transform on start-up
    - [x] Welcome banner

14. [x] Mobile UX
    - [x] Touch input(s)
        - [x] `ShortPress` event to open node menu on touch devices
        - [x] `LongPress` event to replace `Hover` behaviour on touch devices

    - [x] User-controls changes...
        - [x] DollyPan / Rotate fixes on touch device
        - [x] Fix viewport issues on iOS
        - [x] Add option to toggle visibility of axis label(s)

15. [x] Iterate point frag shader
    - [x] Improve scaling
    - [x] Selection border color

### 4.3. Post-review Plan

> [!TIP]
> - Demonstration on the 19th November with a follow-up meeting planned for early December

1. [x] Text content changes
    | Current Text                   | Replacement Text                    |
    |--------------------------------|-------------------------------------|
    | 'Phecode'                      | 'Disease'                           |
    | 'Age'                          | 'Median age at first record'        |
    | 'Standardised Mortality Ratio' | 'Excess Mortality at one year'      |
    | 'Visit Disease Atlas'          | 'View features in Atlas for Health' |
    | 'View related Phecodes'        | 'View related diseases by Organ'    |

2. [x] Card changes
    - [x] Reorder Speciality/Organ/Category at top of card

    - [x] Unminimise when clicking filter button in minimised state

    - [x] Changes to relationship rendering:
        - [x] Alphabetical sort relationships
        - [x] Hide current Phecode in relationship panel

3. [x] Make relationship filter more obvious by adding feature popover?

4. [x] Interaction improvements
    - [x] Fix pointer events on app header
    - [x] No user selection & events on tooltip

6. [x] Add mortality measure to tooltip hover

5. [x] Outline on object when focusing / some other way to highlight it

7. [x] Add axes labels, _e.g._ `(A: 0, F: 0)` _etc_

### 4.4. Improvements & Fixes

1. [x] `gl_points` max size varies across implementations, e.g. reference @ [here](https://webglreport.com/?v=2)
    - [x] Reimplement points to use instanced plane geometry instead of `gl_points`
    - [x] Initial raycasting for instanced geometry

2. [x] Use interleaved `offset` & `scale` buffer to improve data access on instanced geometry

3. [x] Frustum culling of instanced geometry
    > [!NOTE]
    > - BVH frustum culling is likely over kill and would require a dynamic buffer; instead we'll implement a basic sphere intersection test

    - [x] Compute world-space bounding box & sphere
    - [x] Implement basic bounding sphere frustum culling

4. [x] Reimplement size attenuation to emulate `gl_points` behaviour
    - [x] Implement attenuation in vertex shader
    - [x] Implement attenuation in `InstancedPoints` class

5. [x] Project cleanup
    - [x] Cleanup const. usage across project
    - [x] Cleanup documentation

### 4.5. Scatter Plot & Improvements

1. [x] Initial work for scatter
    - [x] Data extraction
    - [x] Rework explorer & assoc. instances

2. [x] Impl. scatter plot view
    - [x] Tween points between views via vertex shader
    - [x] Improve data access

3. [x] Impl. base scatter axes via frag; drawing grid on backface of box

4. [x] Impl. spring on tween banner; current impl. isn't very smooth & we can easily reduce a dependency here

5. [ ] Add labels to scatter axes
    - [ ] Paint crosshair target on selection
    - [ ] Scaled axes labels on X/Y/Z
    - [ ] Select edges of box on the near plane of camera for each axis

### 4.6. Thoughts, issues & the future

1. Consider reimplmenting points:
    - Mac devices clamps `GL_POINT` size much more than other platforms so points look many times smaller; attenuation is much more pronounced when the viewport is close to the subject - see reference @ [here](https://webglreport.com/?v=2)
    - Will probably need to render the points to a quad before applying the shader

2. Consider object partitioning, _e.g._ bounding volume hierarchy, for non-naive instanced point raycasting in `InstancedPoints`

3. Possible additions during future development
    - Impl. post-process outline for selected objects?
    - Depth of Field for nodes instead of fog? Or maybe just custom fog / blur built into shaders? Unsure

4. Node graph, attempt was made to allow user(s) to view connections by organ / some other categorical data (similar to force directed graph)
    - Issue:
        - Examined the feasibility of using organ targets & other categorical tags to build a connectivity graph;
        - Unfortunately there are far too many connections and they're mostly clustered within their own speciality

    - Future:
        - Need to discuss with HDRUK - there may be other data points not yet available to me that we could use for weights in a FDG
        - Based on my examination, I think it would be better to either (a) display this as an FDG using weights generated from shared symptomatology and/or SNOMED codes; or (b) display the data in a 3D scatter plot +/- some clustering visualisation (e.g. convex hull etc)
