// The sidebar filter's index: every page of every tree, as plain text split at
// its h2s, built from the rendered Markdown at build time (and rebuilt in dev
// when a page changes).
//
//   { [pkg]: [{ slug, name, sections: [{ id, heading, text }] }] }
//
// Pages come in tree order, so results read in the order the sidebar lists them.
// Every tree entry is here, including pages with no Markdown yet (not converted,
// or a draft): those have no sections, but their name still matches, so a
// search never loses a page just because its prose has not moved over.
//
// Split at h2s because those are the anchors a result can link to. The text
// before the first h2 is a section with an empty id, which links to the page.
//
// Loaded on demand by DocSearch.vue rather than imported statically — a data
// loader's output is inlined as JSON into whatever imports it, and this is the
// full text of the docs.

import { createContentLoader } from 'vitepress'

import { packages, pages } from '../../src/view/doc/tree.js'

export default createContentLoader(packages.map((pkg) => `${pkg}/*.md`), {
    render: true,

    transform(files) {
        const html = new Map(files.map((file) => [file.url, file.html]))

        return Object.fromEntries(packages.map((pkg) => [
            pkg,
            pages(pkg).map((page) => {
                const body = html.get(page.slug ? `/${pkg}/${page.slug}` : `/${pkg}`)
                return { slug: page.slug, name: page.name, sections: body ? sections(body) : [] }
            })
        ]))
    }
})

function sections(html) {
    // The capture group keeps each h2 in the split, so parts alternate:
    // body, heading, body, heading, body…
    const parts = html.split(/(<h2 id="[^"]*"[^>]*>[\s\S]*?<\/h2>)/)
    const out = [{ id: '', heading: '', text: text(parts[0]) }]

    for (let i = 1; i < parts.length; i += 2) {
        out.push({
            id: parts[i].match(/id="([^"]*)"/)[1],
            heading: text(parts[i]),
            text: text(parts[i + 1] ?? '')
        })
    }

    return out.filter((section) => section.heading || section.text)
}

function text(html) {
    return decode(html
        // Chrome that is not the page's words: the permalink inside each heading,
        // and a code block's copy button and label.
        .replace(/<a class="header-anchor"[\s\S]*?<\/a>/g, '')
        .replace(/<button[^>]*class="copy"[^>]*><\/button>/g, '')
        .replace(/<span class="lang">[\s\S]*?<\/span>/g, '')

        // Block tags become a space and inline tags become nothing, so
        // "<code>dist/</code>," stays "dist/," rather than "dist/ ,".
        .replace(/<\/?(p|li|ul|ol|pre|div|h\d|br|hr|table|thead|tbody|tr|td|th|blockquote)\b[^>]*>/g, ' ')
        .replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim()
}

function decode(value) {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}
