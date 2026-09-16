<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'a-dataset-repo', name: 'A dataset repo' },
    { id: 'checks-on-every-pull-request', name: 'Checks on every pull request' },
    { id: 'holding-a-version', name: 'Holding a version' },
    { id: 'working-on-compile', name: 'Working on Compile' }
]
</script>

<script setup>
// /compile/install
import CodeBlock from '@/part/code-block.vue'

const pyproject = `
[build-system]
requires = ["setuptools"]
build-backend = "setuptools.build_meta"

[project]
name = "ptcg-dataset"
version = "0.0.0"
requires-python = ">=3.10"

dependencies = [
    "cardcarp-compile @ git+https://github.com/cardcarp/compile.git",
]

# A data repo, not a library: there is no Python here to package.
[tool.setuptools]
packages = []
`

const run = `
pip install .
cardcarp-compile
`

const ci = `
name: Validate Data

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.10'
    - run: pip install .
    - run: cardcarp-compile
`

const pin = `
dependencies = [
    "cardcarp-compile @ git+https://github.com/cardcarp/compile.git@v0.1.0",
]
`

const local = `
pip install -e ../compile     # an editable install of your checkout
cardcarp-compile              # the dataset now builds with your working copy

cd ../compile
python util.test.py           # Compile's own tests
`
</script>

<template lang="pug">
.page
    p Compile is installed by a dataset repo, never by an app. It isn't published to a package registry: a dataset names it as a git dependency, so there's no account to keep and no release step. The repository is the release.

    h2#a-dataset-repo A dataset repo
    p The dataset's #[span(class="font-mono text-neutral-300") pyproject.toml] names Compile as its one dependency. Compile brings its own requirements, ruamel.yaml and cerberus, with it.

    CodeBlock(:code="pyproject" label="pyproject.toml")

    p Don't drop the setuptools block at the end. A dataset repo has #[span(class="font-mono text-neutral-300") data/] and #[span(class="font-mono text-neutral-300") schema/] folders and no Python of its own, and without a block declaring no packages, setuptools takes those folders for packages and refuses to build.

    CodeBlock(:code="run" label="shell")

    p That's the whole local setup a contributor needs, and it's what each dataset's CONTRIBUTING tells them to run.

    h2#checks-on-every-pull-request Checks on every pull request
    p Most edits to a dataset are a single card changed in GitHub's web editor, by someone who never runs anything locally. The workflow runs the same two steps on every pull request, so a malformed file, or a card pointing at a set that doesn't exist, fails the check before anyone merges it.

    CodeBlock(:code="ci" label=".github/workflows/validate.yml")

    h2#holding-a-version Holding a version
    p Without a ref, the dependency follows Compile's default branch, and every run picks up its newest commit. To keep a dataset on a known build, add a tag or a commit to the URL.

    CodeBlock(:code="pin" label="pyproject.toml")

    h2#working-on-compile Working on Compile
    p To change the pipeline, install your checkout of Compile in editable mode inside a dataset repo. The dataset's commands then run your working copy, so a change can be tried against real data before it's pushed.

    CodeBlock(:code="local" label="shell")
</template>
