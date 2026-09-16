<script>
// A code sample in a doc page.
//
// The source comes in as a prop rather than a slot on purpose. Pug strips and
// re-indents the markup it compiles, and a slot's whitespace is exactly the part
// of a code sample that carries meaning — a nested object would come out flat.
// A prop holds a plain JS template literal, which pug never touches.
//
// `label` is the language or filename shown in the corner. If no explicit `lang`
// is provided, the highlighter infers the syntax language from `label`.

import hljs from 'highlight.js/lib/core'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', js)
hljs.registerLanguage('typescript', ts)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('plaintext', plaintext)

function resolveLanguage(lang, label) {
    if (lang && hljs.getLanguage(lang)) return lang
    if (!label) return 'plaintext'

    const clean = label.toLowerCase().trim()

    if (/\.(vue|html?|xml)$/.test(clean) || clean === 'vue' || clean === 'html') return 'xml'
    if (/\.(js|mjs|cjs)$/.test(clean) || clean.includes('.js ') || clean === 'javascript' || clean === 'js') return 'javascript'
    if (/\.(ts|mts|cts)$/.test(clean) || clean === 'typescript' || clean === 'ts') return 'typescript'
    if (/\.(json)$/.test(clean) || clean.includes('.json ') || clean === 'json') return 'json'
    if (/\.(ya?ml)$/.test(clean) || clean.includes('.yml ') || clean.includes('.yaml ') || clean === 'yaml' || clean === 'yml') return 'yaml'
    if (/\.(toml|ini)$/.test(clean) || clean.includes('.toml ') || clean === 'toml' || clean === 'ini') return 'ini'
    if (/\.(css)$/.test(clean) || clean === 'css') return 'css'
    if (/\.(sh|bash|zsh)$/.test(clean) || ['shell', 'bash', 'sh', 'zsh', 'terminal', '.env'].some(k => clean.includes(k))) return 'bash'
    if (/\.(py)$/.test(clean) || clean === 'python' || clean === 'py') return 'python'

    return 'plaintext'
}
</script>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    code: { type: String, required: true },
    label: { type: String, default: '' },
    lang: { type: String, default: '' }
})

// Template literals in a page component are written indented to match the code
// around them, so every sample would otherwise carry that indentation into the
// <pre>. Strip the common leading whitespace and the outer blank lines, which
// lets a page author write the literal wherever it reads best in the file.
const body = computed(() => {
    const lines = props.code.replace(/\t/g, '    ').split('\n')

    while (lines.length && !lines[0].trim()) lines.shift()
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop()

    const indent = lines
        .filter((line) => line.trim())
        .reduce((min, line) => Math.min(min, line.match(/^ */)[0].length), Infinity)

    return lines.map((line) => line.slice(indent)).join('\n')
})

const highlightedHtml = computed(() => {
    const language = resolveLanguage(props.lang, props.label)
    try {
        return hljs.highlight(body.value, { language, ignoreIllegals: true }).value
    } catch {
        return hljs.highlight(body.value, { language: 'plaintext' }).value
    }
})
</script>

<template lang="pug">
//- `not-prose` because these sit inside a doc page's prose styles, which would
//- otherwise put their own font, quotes and margins on the <pre> and <code>.
.code-block(
    class="not-prose relative my-6 bg-neutral-950 rounded-lg"
    style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
)
    .label(v-if="label" class="absolute top-0 right-0 px-3 py-2 font-mono text-2.5 text-white/20 leading-none") {{ label }}

    //- The sample scrolls in its own box. The doc column is a flex item with
    //- `min-w-0`, so without this a long line would be the thing that decides
    //- the column's width and push the page sideways.
    pre(class="px-4 py-4 overflow-x-auto")
        code(
            class="hljs font-mono text-3 text-neutral-400 leading-relaxed whitespace-pre"
            v-html="highlightedHtml"
        )
</template>

<style>
@import 'highlight.js/styles/github-dark.css';

.code-block pre code.hljs {
    background: transparent;
    padding: 0;
}
</style>
